import { useCallback, useEffect, useId, useRef } from 'react';
import { S } from '@/ui/strings.es';
import styles from './Cajon.module.css';

export interface CajonProps {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}

const ENFOCABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Panel lateral sobre la escena. Atrapa el foco mientras está abierto, se cierra con Esc y
 * devuelve el foco a donde estaba: un cajón que se abre con una tecla tiene que poder
 * cerrarse con otra sin tocar el mouse.
 */
export function Cajon({ titulo, abierto, onCerrar, children }: CajonProps) {
  const panel = useRef<HTMLDivElement>(null);
  const anterior = useRef<HTMLElement | null>(null);
  const tituloId = useId();

  useEffect(() => {
    if (!abierto) return;
    anterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const primero = panel.current?.querySelector<HTMLElement>(ENFOCABLE);
    (primero ?? panel.current)?.focus();
    return () => {
      anterior.current?.focus();
    };
  }, [abierto]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCerrar();
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
    [onCerrar],
  );

  useEffect(() => {
    if (!abierto) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [abierto, onKeyDown]);

  if (!abierto) return null;

  return (
    <div className={styles.fondo} onClick={onCerrar}>
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.encabezado}>
          <h2 id={tituloId} className={styles.titulo}>{titulo}</h2>
          <button type="button" className={styles.cerrar} onClick={onCerrar}>
            {S.comun.cerrar}
          </button>
        </header>
        <div className={styles.cuerpo}>{children}</div>
      </div>
    </div>
  );
}
