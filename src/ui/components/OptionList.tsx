import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RenderedChoice, RollPreview } from '@/engine/types';
import { Chips, chipsDeTirada } from '@/ui/components/Chips';
import { Dialogo } from '@/ui/components/Dialogo';
import { hayModalAbierto } from '@/ui/modales';
import { S } from '@/ui/strings.es';
import { esCampoDeTexto } from '@/ui/teclado';
import styles from './OptionList.module.css';

export interface OptionListProps {
  choices: RenderedChoice[];
  showOdds: boolean;
  wounds: 0 | 1 | 2 | 3;
  onPick: (choiceId: string) => void;
}

/** "Éxito 42 % · Con costo 42 % · Fallo 17 %" (redondeo al entero) */
export function formatOdds(odds: RollPreview['odds']): string {
  const pct = (x: number): number => Math.round(x * 100);
  return `${S.opciones.exito} ${pct(odds.success)} % · ${S.opciones.conCosto} ${pct(odds.partial)} % · ${S.opciones.fallo} ${pct(odds.failure)} %`;
}

export function OptionList({ choices, showOdds, wounds, onPick }: OptionListProps) {
  const visibles = useMemo(() => choices.filter((c) => c.visible), [choices]);
  const habilitadas = useMemo(() => visibles.filter((c) => c.enabled), [visibles]);
  // Escena mortal: la opción queda pendiente de confirmar en el Dialogo, que se dibuja
  // una sola vez fuera del `map` (no uno por opción). onPick solo se llama si confirma.
  const [pendiente, setPendiente] = useState<string | null>(null);
  const lista = useRef<HTMLOListElement>(null);

  // `OptionList` solo existe en el DOM cuando `terminado` es verdadero (EscenaScreen no la
  // dibuja mientras el texto se revela): este montaje ES el momento en que el revelado ya
  // terminó y el jugador está esperando para elegir, así que enfocar acá no le corta la
  // lectura a nadie. Sin esto, elegir una opción desmonta el botón elegido (la escena cambia)
  // y el foco cae a `<body>`: hay que tabular desde arriba en cada escena nueva.
  //
  // `hayModalAbierto()` puede ser verdadero acá (la Ficha se puede abrir con el texto todavía
  // revelándose): si hay uno, la trampa de foco del modal manda y esto no le roba el foco.
  // Corre una sola vez al montar, no en cada cambio de `choices`: `OptionList` se remonta
  // entera con cada escena nueva (el padre la reemplaza por nada mientras se revela, y por
  // `RollPanel` mientras hay una tirada), así que "al montar" ya es "por cada escena".
  useEffect(() => {
    if (hayModalAbierto()) return;
    lista.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegir = useCallback((choice: RenderedChoice): void => {
    if (!choice.enabled) return;
    if (choice.leadsToLethal) {
      setPendiente(choice.id);
      return;
    }
    onPick(choice.id);
  }, [onPick]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (esCampoDeTexto(event.target)) return;
      // Con un modal abierto (la confirmación mortal de acá abajo, la Ficha, el abandono) un
      // dígito NO elige: el jugador está mirando otra cosa, y acá lo que se dispara es
      // irreversible. El listener vive en `window`, así que el modal no lo tapa solo.
      if (hayModalAbierto()) return;
      // Ctrl/Meta/Alt+dígito son atajos del navegador (cambiar de pestaña, etc.):
      // si los dejáramos pasar, un atajo del sistema elegiría una opción de forma
      // irreversible. Shift NO se filtra: en AZERTY el dígito se escribe con Shift.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!/^[1-9]$/.test(event.key)) return;
      const choice = habilitadas[Number(event.key) - 1];
      if (choice !== undefined) elegir(choice);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [habilitadas, elegir]);

  return (
    <>
      <ol ref={lista} className={styles.lista} aria-label={S.opciones.titulo}>
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
                  <Chips chips={chipsDeTirada(c.preview)} />
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
      <Dialogo
        titulo={S.opciones.mortalTitulo}
        cuerpo={S.opciones.confirmMortal[wounds]}
        confirmar={S.opciones.seguirIgual}
        cancelar={S.opciones.volver}
        tono="peligro"
        abierto={pendiente !== null}
        onConfirmar={() => {
          if (pendiente !== null) onPick(pendiente);
          setPendiente(null);
        }}
        onCancelar={() => setPendiente(null)}
      />
    </>
  );
}
