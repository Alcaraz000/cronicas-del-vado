import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ATTR_NAMES, CLASSES, LIMITS, SKILLS, type Attr, type SkillId } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import type { PremioDeNivel } from '@/engine/progression';
import type { Character, GameState, LogEntry, ResolvedParagraph, RunOutcome } from '@/engine/types';
import {
  atributosParaSubir,
  habilidadesParaElegir,
  hayPremiosPorElegir,
  selectActiveCharacter,
  selectGameState,
  type MotivoBloqueo,
  type OpcionDePremio,
} from '@/state/selectors';
import { useStore } from '@/state/store';
import { Parrafos } from '@/ui/components/Parrafos';
import { S } from '@/ui/strings.es';
import styles from './FinScreen.module.css';

type SceneEntry = Extract<LogEntry, { kind: 'scene' }>;

function ultimaEscena(log: LogEntry[]): SceneEntry | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const e = log[i];
    if (e !== undefined && e.kind === 'scene') return e;
  }
  return null;
}

/**
 * Párrafos del desenlace que mató o derrotó al personaje: las entradas 'outcome'
 * finales del log (las que `choose`/`commitRoll` agregan al aplicar los efectos
 * que terminaron la partida). NO es la última escena: en una muerte a mitad de
 * partida la última entrada 'scene' es la escena en la que estabas, no el
 * desenlace. Si el desenlace no tenía texto, no hay ninguna entrada 'outcome' al
 * final y esto devuelve [] (no hay nada que mostrar, no es un error).
 */
function desenlaceFinal(log: LogEntry[]): ResolvedParagraph[] {
  const paragraphs: ResolvedParagraph[] = [];
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entry = log[i];
    if (entry === undefined || entry.kind !== 'outcome') break;
    paragraphs.unshift(...entry.paragraphs);
  }
  return paragraphs;
}

interface Desenlace {
  kind: RunOutcome['kind'];
  titulo: string;
  parrafos: ResolvedParagraph[];
}

/**
 * El título y el texto del final, leídos de la partida todavía abierta.
 *
 * El párrafo del final ya viene armado por el motor: `enter()` concatena el texto de la
 * escena con `ending.epilogue` UNA sola vez en el LogEntry 'scene' (run.log). Por eso acá
 * se lee de ahí y no se vuelve a pedir `ending.epilogue` a `render()`: hacerlo mostraría
 * el epílogo duplicado.
 */
function leerDesenlace(gs: GameState, campaign: Campaign | null): Desenlace {
  const outcome = gs.run.outcome;
  if (outcome === undefined || outcome.kind === 'defeat') {
    return { kind: 'defeat', titulo: S.fin.derrota, parrafos: desenlaceFinal(gs.run.log) };
  }
  if (outcome.kind === 'death') {
    return { kind: 'death', titulo: S.fin.muerte, parrafos: desenlaceFinal(gs.run.log) };
  }
  const escena = ultimaEscena(gs.run.log);
  return {
    kind: 'ending',
    titulo: campaign?.endings[outcome.endingId]?.title ?? outcome.endingId,
    parrafos: escena === null ? [] : escena.paragraphs,
  };
}

export function FinScreen() {
  const gs = useStore(useShallow(selectGameState));
  const campaign = useStore((s) => s.ui.campaign);
  const endSummary = useStore((s) => s.ui.endSummary);
  const ganancia = useStore((s) => s.ui.ganancia);
  const subida = useStore((s) => s.ui.subidaPendiente);
  const personaje = useStore(selectActiveCharacter);
  const faltaElegir = useStore(hayPremiosPorElegir);
  const finishRun = useStore((s) => s.finishRun);
  const aplicarPremioDeNivel = useStore((s) => s.aplicarPremioDeNivel);
  const goTo = useStore((s) => s.goTo);

  /**
   * Fase 1 de esta pantalla: cerrar la partida. `finishRun` registra el desenlace, otorga
   * la XP y deja la subida pendiente en `ui`; se llama sola al entrar para que el jugador
   * vea el resultado sin tener que pedirlo, y es idempotente (un segundo llamado no toca nada).
   */
  useEffect(() => {
    if (gs !== null && gs.run.outcome !== undefined) finishRun();
  }, [gs, finishRun]);

  /**
   * El texto del final se congela antes de cerrar: `finishRun` deja `character.run` en null
   * y `ui.campaign` en null, así que después de cerrar ya no hay log del que leerlo.
   */
  const vivo = useMemo(() => (gs === null ? null : leerDesenlace(gs, campaign)), [gs, campaign]);
  const congelado = useRef<Desenlace | null>(null);
  if (vivo !== null) congelado.current = vivo;
  const desenlace: Desenlace = congelado.current ?? {
    kind: endSummary?.outcome.kind ?? 'defeat',
    titulo: endSummary?.outcome.kind === 'death' ? S.fin.muerte : S.fin.derrota,
    parrafos: [],
  };

  const resumen = endSummary?.xp ?? null;
  const muerto = desenlace.kind === 'death';
  // El primer premio que el jugador todavía tiene que elegir; los automáticos solo se informan.
  const aElegir: PremioDeNivel | null =
    subida?.premios.find((p) => p.kind === 'atributo' || p.kind === 'habilidad') ?? null;
  const automaticos = subida?.premios.filter((p) => p.kind === 'fortuna' || p.kind === 'leyenda') ?? [];

  return (
    <div className={styles.pantalla} data-outcome={desenlace.kind}>
      <p className={styles.etiqueta}>{S.fin.final}</p>
      <h1 className={styles.titulo}>{desenlace.titulo}</h1>
      <div className={styles.epilogo}>
        <Parrafos parrafos={desenlace.parrafos} />
      </div>

      {resumen !== null && (
        <section className={styles.progreso} aria-labelledby="fin-progreso">
          <h2 id="fin-progreso" className={styles.subtitulo}>
            {S.fin.progreso}
          </h2>

          <p className={styles.xp}>{resumen.otorgada > 0 ? S.fin.xpGanada(resumen.otorgada) : S.fin.sinXp}</p>

          {ganancia !== null && ganancia.detalle.length > 0 && (
            <>
              <h3 className={styles.subtitulo3}>{S.fin.desglose}</h3>
              <ul className={styles.detalle}>
                {ganancia.detalle.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
            </>
          )}

          {resumen.descartada > 0 && (
            <p className={styles.tope}>{S.fin.descartada(resumen.descartada, resumen.topeNivel)}</p>
          )}
          {resumen.descartada === 0 && resumen.topeAlcanzado && resumen.otorgada === 0 && (
            <p className={styles.tope}>{S.fin.topeAlcanzado(resumen.topeNivel)}</p>
          )}

          <p className={styles.nivel}>
            {resumen.nivelDespues > resumen.nivelAntes
              ? S.fin.subiste(resumen.nivelAntes, resumen.nivelDespues)
              : S.fin.nivelActual(resumen.nivelDespues, resumen.xpDespues)}
          </p>

          {automaticos.map((p) => (
            <p key={p.kind} className={styles.premioAuto}>
              {p.kind === 'fortuna' ? S.fin.premioFortuna : S.fin.premioLeyenda}
            </p>
          ))}

          {aElegir !== null && personaje !== null && (
            <ElegirPremio
              premio={aElegir}
              personaje={personaje}
              onAtributo={(attr) => aplicarPremioDeNivel({ kind: 'atributo', attr })}
              onHabilidad={(skill) => aplicarPremioDeNivel({ kind: 'habilidad', skill })}
            />
          )}
        </section>
      )}

      {faltaElegir && <p className={styles.falta}>{S.fin.faltaElegirPremio}</p>}
      <button
        type="button"
        className={styles.boton}
        data-testid="volver-del-fin"
        disabled={faltaElegir}
        onClick={() => goTo(muerto ? 'inicio' : 'hub')}
      >
        {muerto ? S.fin.volverAlInicio : S.fin.volverAlHub}
      </button>
    </div>
  );
}

/** Prosa del motivo por el que una elección de premio está deshabilitada. */
function motivoEnEspanol(motivo: MotivoBloqueo, personaje: Character, tag: string): string {
  switch (motivo) {
    case 'techo':
      return S.fin.motivoTecho(LIMITS.maxAttr);
    case 'debilidad':
      return S.fin.motivoDebilidad(tag, CLASSES[personaje.classId].name);
    case 'repetida':
      return S.fin.motivoRepetida;
  }
}

interface ElegirPremioProps {
  premio: PremioDeNivel;
  personaje: Character;
  onAtributo: (attr: Attr) => void;
  onHabilidad: (skill: SkillId) => void;
}

/**
 * La elección de un premio de nivel. Qué se puede elegir lo decide el store
 * (`atributosParaSubir` / `habilidadesParaElegir`, que aplican el techo y la regla de
 * identidad): acá solo se dibuja, siempre con el motivo a la vista y nunca escondiendo
 * una opción bloqueada.
 */
function ElegirPremio({ premio, personaje, onAtributo, onHabilidad }: ElegirPremioProps) {
  if (premio.kind === 'atributo') {
    const opciones: OpcionDePremio<Attr>[] = atributosParaSubir(personaje);
    return (
      <div className={styles.premio}>
        <h3 className={styles.subtitulo3}>{S.fin.premioAtributo}</h3>
        <ul className={styles.opciones}>
          {opciones.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={styles.opcion}
                data-testid={`premio-atributo-${o.id}`}
                disabled={!o.enabled}
                aria-describedby={o.motivo !== undefined ? `premio-${o.id}-motivo` : undefined}
                onClick={() => onAtributo(o.id)}
              >
                {S.fin.atributoBoton(ATTR_NAMES[o.id], personaje.attrs[o.id], personaje.attrs[o.id] + 1)}
              </button>
              {o.motivo !== undefined && (
                <p className={styles.motivo} id={`premio-${o.id}-motivo`}>
                  {motivoEnEspanol(o.motivo, personaje, ATTR_NAMES[o.id])}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const opciones: OpcionDePremio<SkillId>[] = habilidadesParaElegir(personaje);
  return (
    <div className={styles.premio}>
      <h3 className={styles.subtitulo3}>{S.fin.premioHabilidad}</h3>
      <ul className={styles.opciones}>
        {opciones.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              className={styles.opcion}
              data-testid={`premio-habilidad-${o.id}`}
              disabled={!o.enabled}
              aria-describedby={o.motivo !== undefined ? `premio-${o.id}-motivo` : undefined}
              onClick={() => onHabilidad(o.id)}
            >
              {S.fin.habilidadBoton(SKILLS[o.id].name, S.tags[SKILLS[o.id].tag])}
            </button>
            {o.motivo !== undefined && (
              <p className={styles.motivo} id={`premio-${o.id}-motivo`}>
                {motivoEnEspanol(o.motivo, personaje, S.tags[SKILLS[o.id].tag])}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
