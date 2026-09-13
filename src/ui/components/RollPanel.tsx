import { useEffect, useRef, useState } from 'react';
import type { PendingRoll } from '@/engine/types';
import { useReducedMotion } from '@/ui/hooks/useReducedMotion';
import { hayModalAbierto } from '@/ui/modales';
import { S } from '@/ui/strings.es';
import { Chips, chipsDeTirada } from './Chips';
import { Dados } from './Dados';
import styles from './RollPanel.module.css';

/** Cuánto giran los dados antes de asentarse (spec: "los dados giran 700 ms y se asientan"). */
const DURACION_GIRO_MS = 700;

export interface RollPanelProps {
  pending: PendingRoll;
  powerName: string;
  onReroll: (dieIndex: number) => void;
  onPower: () => void;
  onContinue: () => void;
}

/**
 * La tirada, de punta a punta: objetivo en palabras → los dados giran y se asientan → los
 * chips que descomponen el total, con las fuentes anuladas tachadas → total y sello → recién
 * ahí, Fortuna y Poder. Es el criterio de listo número 1 de la fase: una tirada con ventaja Y
 * desventaja a la vez tiene que leerse como lo que es (se anulan, tirada normal) y no como un
 * error del juego.
 *
 * `asentado` es el único gate de la revelación: arranca en `true` si `useReducedMotion()` (ahí
 * no corre ningún temporizador) y si no pasa a `true` a los `DURACION_GIRO_MS`; un clic en el
 * panel lo fuerza. `girando` maneja el giro visual de los dados: al montar gira toda la tirada,
 * y cuando `pending.rerolls` crece (una repetición con Fortuna) vuelve a girar brevemente, pero
 * acotado al dado repetido — `Dados` es quien sabe achicar el giro a `resaltado` — sin tocar
 * `asentado`, que ya no se mueve: el resto de la tirada no se toca.
 */
export function RollPanel({ pending, powerName, onReroll, onPower, onContinue }: RollPanelProps) {
  const reducedMotion = useReducedMotion();
  const [asentado, setAsentado] = useState(reducedMotion);
  const [girando, setGirando] = useState(!reducedMotion);
  const timerRef = useRef<number | undefined>(undefined);
  const rerollsVistos = useRef(pending.rerolls.length);
  const continuarRef = useRef<HTMLButtonElement>(null);

  const limpiarTimer = (): void => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  // La tirada inicial: sin movimiento reducido, gira y se asienta sola; con movimiento
  // reducido no hace falta temporizador ninguno, `asentado` ya nació en `true`.
  useEffect(() => {
    if (reducedMotion) return;
    timerRef.current = window.setTimeout(() => {
      setAsentado(true);
      setGirando(false);
      timerRef.current = undefined;
    }, DURACION_GIRO_MS);
    return limpiarTimer;
    // Solo corre al montar: es la animación de LA tirada con la que nace este panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repetir con Fortuna: `rerolls` crece. No toca `asentado` (el total, el sello y los
  // botones, ya asentados, se quedan quietos) — solo hace girar de nuevo, brevemente, al
  // dado repetido.
  useEffect(() => {
    if (pending.rerolls.length === rerollsVistos.current) return;
    rerollsVistos.current = pending.rerolls.length;
    if (reducedMotion) return;
    setGirando(true);
    timerRef.current = window.setTimeout(() => {
      setGirando(false);
      timerRef.current = undefined;
    }, DURACION_GIRO_MS);
    return limpiarTimer;
  }, [pending.rerolls.length, reducedMotion]);

  const saltarAnimacion = (): void => {
    limpiarTimer();
    setAsentado(true);
    setGirando(false);
  };

  // Tarea 6 (Fase H), mismo criterio que `OptionList`: recién cuando la tirada se asienta el
  // total y el sello son legibles y los botones existen en el DOM (antes de `asentado` no hay
  // ninguno: ver el `{asentado && (…)}` de abajo), así que es el momento seguro para mover el
  // foco sin interrumpir nada que se esté leyendo. Sin esto, "Continuar" (o "Repetir"/el Poder)
  // se desmonta al consolidar la tirada y el foco cae a `<body>`.
  //
  // Hallazgo de la oleada final: el foco va SIEMPRE a "Continuar" (`continuarRef`), nunca al
  // primer `<button>` del DOM. Ese primero, cuando `pending.canReroll` (o sea casi siempre: un
  // personaje recién empezado tiene 3 de 3 de Fortuna), es "Repetir dado N" — un botón
  // destructivo y sin confirmación que gasta un punto de Fortuna. El jugador de teclado que
  // aprieta Enter para seguir no puede terminar gastando uno de los tres recursos que tiene en
  // toda la partida.
  //
  // `hayModalAbierto()` puede ser verdadero acá (la Ficha se puede abrir con una tirada
  // pendiente): si hay uno, la trampa de foco del modal manda y esto no le roba el foco.
  useEffect(() => {
    if (!asentado) return;
    if (hayModalAbierto()) return;
    continuarRef.current?.focus();
  }, [asentado]);

  const resaltado = pending.rerolls.length > 0 ? pending.rerolls[pending.rerolls.length - 1] : undefined;

  return (
    <section className={styles.panel} aria-label={S.tirada.titulo} onClick={saltarAnimacion}>
      <p className={styles.objetivo}>{pending.preview.targetLine}</p>
      <p className={styles.modo}>{S.tirada.modo[pending.preview.mode]}</p>

      <Dados dice={pending.dice} kept={pending.kept} girando={girando} resaltado={resaltado} />

      {asentado && (
        <>
          <Chips chips={chipsDeTirada(pending.preview)} />

          <p className={styles.total}>
            {S.tirada.total}: <strong data-testid="total">{pending.total}</strong>
          </p>
          <p className={styles.sello} data-testid="sello" data-banda={pending.band}>
            <span aria-hidden="true">{S.tirada.icono[pending.band]}</span> {S.tirada.banda[pending.band]}
          </p>

          <div className={styles.acciones}>
            {pending.canReroll &&
              pending.dice.map((_, i) => (
                <button key={i} type="button" className={styles.secundario} onClick={() => onReroll(i)}>
                  {S.tirada.repetir(i + 1)}
                </button>
              ))}
            {pending.canUsePower && (
              <button type="button" className={styles.secundario} onClick={onPower}>
                {S.tirada.poder(powerName)}
              </button>
            )}
            <button type="button" ref={continuarRef} className={styles.primario} onClick={onContinue}>
              {S.tirada.continuar}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
