import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CLASSES } from '@/content/catalog';
import type { Campaign, Scene } from '@/content/schema';
import { fortuneMax } from '@/engine/progression';
import { render as renderScene } from '@/engine/resolve';
import type { RenderedScene } from '@/engine/types';
import { selectGameState } from '@/state/selectors';
import { useStore } from '@/state/store';
import { precargarImagen } from '@/ui/assets';
import { Imagen } from '@/ui/components/Imagen';
import { OptionList } from '@/ui/components/OptionList';
import { useNombresDePnj } from '@/ui/components/Parrafos';
import { RollPanel } from '@/ui/components/RollPanel';
import { StatusBar } from '@/ui/components/StatusBar';
import { TextColumn } from '@/ui/components/TextColumn';
import { S } from '@/ui/strings.es';
import { CargandoScreen } from './CargandoScreen';
import styles from './EscenaScreen.module.css';

/** Id de archivo del fondo (con la variante, si la escena declara una), resuelto vía `Place`. */
function fondoIdDe(campaign: Campaign, rendered: RenderedScene): string {
  const place = campaign.places[rendered.place];
  const base = place?.background ?? rendered.place;
  if (rendered.variant === undefined) return base;
  return place?.variants?.[rendered.variant] ?? `${base}.${rendered.variant}`;
}

/** Id de archivo del retrato de un PNJ, resuelto vía `Npc.portrait` (no siempre es el id del PNJ). */
function retratoIdDe(campaign: Campaign, npcId: string): string {
  return campaign.npcs[npcId]?.portrait ?? npcId;
}

/**
 * Fondos (con su variante) de las escenas a las que esta escena puede llevar directamente
 * desde sus opciones, para pedirlos de antemano y que el cambio de escena no parpadee.
 * Solo mira destinos directos (`outcome.next` y los `next` de cada banda de una tirada):
 * no seguimos `redirect`, que depende de evaluar condiciones, y esto es solo precarga de
 * imágenes, no una regla del juego.
 */
function proximosFondos(scene: Scene, campaign: Campaign): string[] {
  const ids = new Set<string>();
  const agregar = (sceneId: string): void => {
    const destino = campaign.scenes[sceneId];
    if (destino === undefined) return;
    const place = campaign.places[destino.place];
    const base = place?.background ?? destino.place;
    ids.add(destino.variant === undefined ? base : (place?.variants?.[destino.variant] ?? `${base}.${destino.variant}`));
  };
  for (const choice of scene.choices) {
    if (choice.outcome !== undefined) agregar(choice.outcome.next);
    if (choice.roll !== undefined) {
      const { success, partial, failure, crit, fumble } = choice.roll.outcomes;
      for (const outcome of [success, partial, failure, crit, fumble]) {
        if (outcome !== undefined) agregar(outcome.next);
      }
    }
  }
  return [...ids];
}

export function EscenaScreen() {
  const campaign = useStore((s) => s.ui.campaign);
  const pending = useStore((s) => s.ui.pending);
  const showOdds = useStore((s) => s.prefs.showOdds);
  const gs = useStore(useShallow(selectGameState));
  const choose = useStore((s) => s.choose);
  const beginRoll = useStore((s) => s.beginRoll);
  const rerollDie = useStore((s) => s.rerollDie);
  const usePower = useStore((s) => s.usePower);
  const commitRoll = useStore((s) => s.commitRoll);
  const abandonRun = useStore((s) => s.abandonRun);

  const rendered = useMemo(
    () => (campaign !== null && gs !== null ? renderScene(campaign, gs) : null),
    [campaign, gs],
  );

  const nombres = useNombresDePnj();

  // Al entrar a la escena, se piden de antemano los fondos de las escenas a las que puede
  // llevar: simple caché del navegador, sin bloquear el render ni evaluar reglas.
  useEffect(() => {
    if (campaign === null || rendered === null) return;
    const scene = campaign.scenes[rendered.sceneId];
    if (scene === undefined) return;
    for (const fondoId of proximosFondos(scene, campaign)) precargarImagen('fondo', fondoId);
  }, [campaign, rendered]);

  const onPick = useCallback(
    (choiceId: string): void => {
      if (rendered === null) return;
      const choice = rendered.choices.find((c) => c.id === choiceId);
      if (choice === undefined) return;
      if (choice.preview !== undefined) beginRoll(choiceId);
      else choose(choiceId);
    },
    [rendered, beginRoll, choose],
  );

  if (campaign === null || gs === null || rendered === null) return <CargandoScreen />;

  const placeName = campaign.places[rendered.place]?.name ?? rendered.place;
  const fondoId = fondoIdDe(campaign, rendered);
  const retrato = rendered.portraitNpc !== undefined ? (nombres[rendered.portraitNpc] ?? rendered.portraitNpc) : null;

  return (
    <div className={styles.pantalla}>
      <StatusBar
        placeName={placeName}
        wounds={gs.run.wounds}
        fortune={gs.run.fortune}
        fortuneMax={fortuneMax(gs.character.level)}
        conditions={gs.run.conditions}
        onAbandon={abandonRun}
        abandonDisabled={pending !== null}
      />
      <div className={styles.grid}>
        <aside className={styles.visual}>
          <Imagen tipo="fondo" id={fondoId} aspect="16:9" alt={`${S.placeholder.fondo}: ${placeName}`} />
          {rendered.portraitNpc !== undefined && retrato !== null && (
            <Imagen
              tipo="retrato"
              id={retratoIdDe(campaign, rendered.portraitNpc)}
              aspect="3:4"
              alt={`${S.placeholder.retrato}: ${retrato}`}
            />
          )}
        </aside>
        <main className={styles.columna}>
          <TextColumn log={gs.run.log} />
          {pending !== null ? (
            <RollPanel
              pending={pending}
              powerName={CLASSES[gs.character.classId].power.name}
              onReroll={rerollDie}
              onPower={usePower}
              onContinue={commitRoll}
            />
          ) : (
            <OptionList choices={rendered.choices} showOdds={showOdds} wounds={gs.run.wounds} onPick={onPick} />
          )}
        </main>
      </div>
    </div>
  );
}
