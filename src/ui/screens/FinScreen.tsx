import { useShallow } from 'zustand/react/shallow';
import type { LogEntry, ResolvedParagraph, RunOutcome } from '@/engine/types';
import { selectGameState } from '@/state/selectors';
import { useStore } from '@/state/store';
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

export function FinScreen() {
  const gs = useStore(useShallow(selectGameState));
  const campaign = useStore((s) => s.ui.campaign);
  const endSummary = useStore((s) => s.ui.endSummary);
  const finishRun = useStore((s) => s.finishRun);

  const outcome: RunOutcome | null = gs?.run.outcome ?? endSummary?.outcome ?? null;

  let titulo: string;
  // El párrafo del final ya viene armado por el motor: `enter()` concatena el
  // texto de la escena con `ending.epilogue` UNA sola vez en el LogEntry
  // 'scene' (run.log). Por eso acá se lee de ahí y no se vuelve a pedir
  // `ending.epilogue` a `render()`: hacerlo mostraría el epílogo duplicado.
  let parrafos: ResolvedParagraph[] = [];
  if (outcome === null || outcome.kind === 'defeat') {
    titulo = S.fin.derrota;
  } else if (outcome.kind === 'death') {
    titulo = S.fin.muerte;
  } else {
    titulo = campaign?.endings[outcome.endingId]?.title ?? outcome.endingId;
    const escena = gs === null ? null : ultimaEscena(gs.run.log);
    parrafos = escena === null ? [] : escena.paragraphs;
  }

  return (
    <div className={styles.pantalla} data-outcome={outcome?.kind ?? 'defeat'}>
      <p className={styles.etiqueta}>{S.fin.final}</p>
      <h1 className={styles.titulo}>{titulo}</h1>
      <div className={styles.epilogo}>
        {parrafos.map((p, i) => (
          <p key={i}>
            {p.speaker !== undefined && <strong>{p.speaker}: </strong>}
            <span>{p.text}</span>
          </p>
        ))}
      </div>
      <button type="button" className={styles.boton} onClick={finishRun}>
        {S.fin.volver}
      </button>
    </div>
  );
}
