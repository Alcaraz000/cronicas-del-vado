import { CONDITIONS, WOUND_LABELS, type ConditionId } from '@/content/catalog';
import { S } from '@/ui/strings.es';
import styles from './StatusBar.module.css';

export interface StatusBarProps {
  placeName: string;
  wounds: 0 | 1 | 2 | 3;
  fortune: number;
  fortuneMax: number;
  conditions: ConditionId[];
  onAbandon: () => void;
  /**
   * true mientras hay una tirada pendiente. El store no limpia `run.pending` al
   * abandonar (tarea 13), así que la UI evita ese camino: en vez de ofrecer
   * "Abandonar", lo deshabilita hasta que la tirada se consolide o se descarte.
   */
  abandonDisabled?: boolean;
}

function marcas(llenas: number, total: number, lleno: string, vacio: string): string {
  return Array.from({ length: total }, (_, i) => (i < llenas ? lleno : vacio)).join(' ');
}

export function StatusBar({
  placeName,
  wounds,
  fortune,
  fortuneMax,
  conditions,
  onAbandon,
  abandonDisabled = false,
}: StatusBarProps) {
  const nombresCondiciones =
    conditions.length === 0 ? S.barra.sinCondiciones : conditions.map((c) => CONDITIONS[c].name).join(', ');

  const abandonar = (): void => {
    if (window.confirm(S.barra.confirmarAbandono)) onAbandon();
  };

  return (
    <header className={styles.barra}>
      <span className={styles.lugar}>{placeName}</span>
      <span className={styles.dato} title={S.barra.heridas}>
        {S.barra.heridas}: <span aria-hidden="true">{marcas(wounds, 3, '●', '○')}</span> {WOUND_LABELS[wounds]}
      </span>
      <span className={styles.dato} title={S.barra.fortuna}>
        {S.barra.fortuna}: <span aria-hidden="true">{marcas(fortune, fortuneMax, '◆', '◇')}</span> {fortune}/{fortuneMax}
      </span>
      <span className={styles.dato}>
        {S.barra.condiciones}: {nombresCondiciones}
      </span>
      <button
        type="button"
        className={styles.abandonar}
        onClick={abandonar}
        disabled={abandonDisabled}
        title={abandonDisabled ? S.barra.abandonarDeshabilitado : undefined}
      >
        {S.barra.abandonar}
      </button>
    </header>
  );
}
