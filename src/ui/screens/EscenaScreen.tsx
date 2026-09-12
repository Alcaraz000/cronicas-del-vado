import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CLASSES } from '@/content/catalog';
import { fortuneMax } from '@/engine/progression';
import { render as renderScene } from '@/engine/resolve';
import { selectGameState } from '@/state/selectors';
import { useStore } from '@/state/store';
import { OptionList } from '@/ui/components/OptionList';
import { Placeholder } from '@/ui/components/Placeholder';
import { RollPanel } from '@/ui/components/RollPanel';
import { StatusBar } from '@/ui/components/StatusBar';
import { TextColumn } from '@/ui/components/TextColumn';
import { S } from '@/ui/strings.es';
import { CargandoScreen } from './CargandoScreen';
import styles from './EscenaScreen.module.css';

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

  // La campaña ya viene con el mundo adentro (store.conMundo): acá no hay nada que fusionar.
  const nombres = useMemo(() => {
    const mapa: Record<string, string> = {};
    if (campaign !== null) {
      for (const npc of Object.values(campaign.npcs)) mapa[npc.id] = npc.name;
    }
    return mapa;
  }, [campaign]);

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
  const fondo = rendered.variant !== undefined ? `${rendered.place}.${rendered.variant}` : rendered.place;
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
          <Placeholder label={`${S.placeholder.fondo}: ${fondo}`} aspect="16:9" />
          {retrato !== null && <Placeholder label={`${S.placeholder.retrato}: ${retrato}`} aspect="3:4" />}
        </aside>
        <main className={styles.columna}>
          <TextColumn log={gs.run.log} nombres={nombres} />
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
