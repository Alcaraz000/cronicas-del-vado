import { useCallback, useEffect, useMemo } from 'react';
import { ATTR_NAMES, DIFFICULTY_NAMES } from '@/content/catalog';
import type { RenderedChoice, RollPreview } from '@/engine/types';
import { S } from '@/ui/strings.es';
import styles from './OptionList.module.css';

export interface OptionListProps {
  choices: RenderedChoice[];
  showOdds: boolean;
  wounds: 0 | 1 | 2 | 3;
  onPick: (choiceId: string) => void;
}

/** "Saber +2 · Normal" */
export function formatAttrChip(preview: RollPreview): string {
  const signo = preview.totalMod >= 0 ? '+' : '';
  return `${ATTR_NAMES[preview.attr]} ${signo}${preview.totalMod} · ${DIFFICULTY_NAMES[preview.difficulty]}`;
}

/** "Éxito 42 % · Con costo 42 % · Fallo 17 %" (redondeo al entero) */
export function formatOdds(odds: RollPreview['odds']): string {
  const pct = (x: number): number => Math.round(x * 100);
  return `${S.opciones.exito} ${pct(odds.success)} % · ${S.opciones.conCosto} ${pct(odds.partial)} % · ${S.opciones.fallo} ${pct(odds.failure)} %`;
}

function esCampoDeTexto(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}

export function OptionList({ choices, showOdds, wounds, onPick }: OptionListProps) {
  const visibles = useMemo(() => choices.filter((c) => c.visible), [choices]);
  const habilitadas = useMemo(() => visibles.filter((c) => c.enabled), [visibles]);

  const elegir = useCallback(
    (choice: RenderedChoice): void => {
      if (!choice.enabled) return;
      if (choice.leadsToLethal && !window.confirm(S.opciones.confirmMortal[wounds])) return;
      onPick(choice.id);
    },
    [wounds, onPick],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (esCampoDeTexto(event.target)) return;
      if (!/^[1-9]$/.test(event.key)) return;
      const choice = habilitadas[Number(event.key) - 1];
      if (choice !== undefined) elegir(choice);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [habilitadas, elegir]);

  return (
    <ol className={styles.lista} aria-label={S.opciones.titulo}>
      {visibles.map((c) => {
        const numero = c.enabled ? String(habilitadas.indexOf(c) + 1) : '—';
        return (
          <li key={c.id} className={styles.fila} data-enabled={c.enabled ? 'true' : 'false'}>
            <button
              type="button"
              className={styles.boton}
              disabled={!c.enabled}
              data-testid={`opcion-${c.id}`}
              onClick={() => elegir(c)}
            >
              <span className={styles.numero}>{numero}</span>
              <span className={styles.label}>{c.label}</span>
              {c.badge !== undefined && <span className={styles.badge}>[{c.badge}]</span>}
              {c.leadsToLethal && (
                <span className={styles.mortal} title={S.opciones.mortalTitulo}>
                  {S.opciones.mortal}
                </span>
              )}
              {c.alreadySeen && <span className={styles.vista}>{S.opciones.yaElegida}</span>}
            </button>
            {c.preview !== undefined && (
              <div className={styles.detalle}>
                <span className={styles.chip}>{formatAttrChip(c.preview)}</span>
                {c.preview.sources.map((fuente, i) => (
                  <span
                    key={`${fuente.origin}-${fuente.label}-${i}`}
                    className={styles.fuente}
                    data-cancelled={fuente.cancelled ? 'true' : 'false'}
                  >
                    {`${fuente.kind === 'advantage' ? '▲' : '▼'} ${fuente.label}`}
                  </span>
                ))}
                <span className={styles.riesgo} data-riesgo={c.preview.risk}>
                  {S.opciones.riesgo[c.preview.risk]}
                </span>
                {showOdds && <span className={styles.odds}>{formatOdds(c.preview.odds)}</span>}
              </div>
            )}
            {!c.enabled && c.lockedHint !== undefined && <p className={styles.hint}>{c.lockedHint}</p>}
          </li>
        );
      })}
    </ol>
  );
}
