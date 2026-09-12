import type { PendingRoll } from '@/engine/types';
import { S } from '@/ui/strings.es';
import styles from './RollPanel.module.css';

export interface RollPanelProps {
  pending: PendingRoll;
  powerName: string;
  onReroll: (dieIndex: number) => void;
  onPower: () => void;
  onContinue: () => void;
}

export function RollPanel({ pending, powerName, onReroll, onPower, onContinue }: RollPanelProps) {
  return (
    <section className={styles.panel} aria-label={S.tirada.titulo}>
      <p className={styles.objetivo}>{pending.preview.targetLine}</p>
      <p className={styles.modo}>{S.tirada.modo[pending.preview.mode]}</p>

      <div className={styles.dados}>
        {pending.dice.map((valor, i) => {
          const conservado = pending.kept.includes(i);
          return (
            <span
              key={i}
              className={styles.dado}
              data-testid={`dado-${i}`}
              data-kept={conservado ? 'true' : 'false'}
              style={{ opacity: conservado ? 1 : 0.4 }}
            >
              {valor}
            </span>
          );
        })}
      </div>

      <p className={styles.total}>
        {S.tirada.total}: <strong data-testid="total">{pending.total}</strong>
      </p>
      <p className={styles.sello} data-banda={pending.band}>
        {S.tirada.banda[pending.band]}
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
        <button type="button" className={styles.primario} onClick={onContinue}>
          {S.tirada.continuar}
        </button>
      </div>
    </section>
  );
}
