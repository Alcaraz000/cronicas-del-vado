import { useId, useRef } from 'react';
import { S } from '@/ui/strings.es';
import { useTrampaDeFoco } from '@/ui/hooks/useTrampaDeFoco';
import styles from './Cajon.module.css';

export interface CajonProps {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}

/**
 * Panel lateral sobre la escena. Atrapa el foco mientras está abierto, se cierra con Esc y
 * devuelve el foco a donde estaba: un cajón que se abre con una tecla tiene que poder
 * cerrarse con otra sin tocar el mouse.
 */
export function Cajon({ titulo, abierto, onCerrar, children }: CajonProps) {
  const panel = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  useTrampaDeFoco(panel, abierto, onCerrar);

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
