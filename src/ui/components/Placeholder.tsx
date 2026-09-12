import styles from './Placeholder.module.css';

export interface PlaceholderProps {
  label: string;
  aspect: '16:9' | '3:4';
}

export function Placeholder({ label, aspect }: PlaceholderProps) {
  return (
    <div className={styles.caja} data-aspect={aspect} role="img" aria-label={label}>
      <span className={styles.etiqueta}>{label}</span>
    </div>
  );
}
