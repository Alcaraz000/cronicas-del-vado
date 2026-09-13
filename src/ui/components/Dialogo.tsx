import { useId, useRef } from 'react';
import { useTrampaDeFoco } from '@/ui/hooks/useTrampaDeFoco';
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

/**
 * Confirmación modal para decisiones que no se pueden deshacer. Comparte con `Cajon` la
 * misma trampa de foco (`useTrampaDeFoco`, con Esc == cancelar). El botón cancelar se
 * marca primero en el marcado a propósito: la trampa enfoca el primer elemento enfocable
 * al abrirse, así que el foco arranca ahí y no en confirmar. Si el jugador aprieta Enter
 * sin leer, no pasa nada irreversible.
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
  const tituloId = useId();

  useTrampaDeFoco(panel, abierto, onCancelar);

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
          <button type="button" className={styles.cancelar} onClick={onCancelar}>
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
