import { useCallback, useEffect, useId, useRef } from 'react';
import styles from './Dialogo.module.css';

export type DialogoTono = 'normal' | 'peligro';

export interface DialogoProps {
  titulo: string;
  cuerpo: string;
  confirmar: string;
  cancelar: string;
  abierto: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  /** `'peligro'` pinta el borde con `--color-peligro`: para la confirmación de una escena mortal. */
  tono?: DialogoTono;
}

const ENFOCABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Confirmación modal para decisiones que no se pueden deshacer. Misma mecánica de foco y
 * Esc que `Cajon`, con una diferencia deliberada: el foco arranca en cancelar, no en
 * confirmar. Si el jugador aprieta Enter sin leer, no pasa nada irreversible.
 */
export function Dialogo({
  titulo,
  cuerpo,
  confirmar,
  cancelar,
  abierto,
  onConfirmar,
  onCancelar,
  tono = 'normal',
}: DialogoProps) {
  const panel = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const anterior = useRef<HTMLElement | null>(null);
  const tituloId = useId();

  useEffect(() => {
    if (!abierto) return;
    anterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelarRef.current?.focus();
    return () => {
      anterior.current?.focus();
    };
  }, [abierto]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancelar();
        return;
      }
      if (event.key !== 'Tab') return;
      const enfocables = [...(panel.current?.querySelectorAll<HTMLElement>(ENFOCABLE) ?? [])];
      if (enfocables.length === 0) return;
      const primero = enfocables[0]!;
      const ultimo = enfocables[enfocables.length - 1]!;
      const activo = document.activeElement;
      if (event.shiftKey && (activo === primero || !panel.current?.contains(activo))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (activo === ultimo || !panel.current?.contains(activo))) {
        event.preventDefault();
        primero.focus();
      }
    },
    [onCancelar],
  );

  useEffect(() => {
    if (!abierto) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [abierto, onKeyDown]);

  if (!abierto) return null;

  return (
    <div className={styles.fondo}>
      <div
        ref={panel}
        className={styles.caja}
        data-tono={tono}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
      >
        <h2 id={tituloId} className={styles.titulo}>
          {titulo}
        </h2>
        <p className={styles.cuerpo}>{cuerpo}</p>
        <div className={styles.acciones}>
          <button ref={cancelarRef} type="button" className={styles.cancelar} onClick={onCancelar}>
            {cancelar}
          </button>
          <button type="button" className={styles.confirmar} onClick={onConfirmar}>
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
