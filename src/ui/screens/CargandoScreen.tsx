import { S } from '@/ui/strings.es';
import styles from './CargandoScreen.module.css';

export function CargandoScreen() {
  return (
    <div className={styles.pantalla}>
      <p role="status">{S.cargando}</p>
    </div>
  );
}
