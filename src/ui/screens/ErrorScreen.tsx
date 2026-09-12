import { useStore } from '@/state/store';
import { S } from '@/ui/strings.es';
import styles from './ErrorScreen.module.css';

export function ErrorScreen() {
  const error = useStore((s) => s.ui.error);
  const retry = useStore((s) => s.retry);
  return (
    <div className={styles.pantalla} role="alert">
      <h1 className={styles.titulo}>{S.error.titulo}</h1>
      <p className={styles.mensaje}>{error ?? S.error.generico}</p>
      <button type="button" className={styles.boton} onClick={retry}>
        {S.error.reintentar}
      </button>
    </div>
  );
}
