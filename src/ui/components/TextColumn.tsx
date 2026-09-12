import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/engine/types';
import { Parrafos } from '@/ui/components/Parrafos';
import { S } from '@/ui/strings.es';
import styles from './TextColumn.module.css';

export interface TextColumnProps {
  log: LogEntry[];
}

function Entrada({ entry }: { entry: LogEntry }) {
  switch (entry.kind) {
    case 'scene':
      return (
        <section className={styles.escena} data-scene={entry.sceneId}>
          <Parrafos parrafos={entry.paragraphs} />
        </section>
      );
    case 'choice':
      return <p className={styles.eleccion}>{`› ${entry.label}`}</p>;
    case 'roll': {
      const extras: string[] = [];
      if (entry.fortuneSpent > 0) extras.push(S.log.fortunaGastada(entry.fortuneSpent));
      if (entry.powerUsed) extras.push(S.log.poderUsado);
      const cola = extras.length > 0 ? ` (${extras.join(', ')})` : '';
      return (
        <p className={styles.tirada} data-banda={entry.band}>
          {`${S.log.dados}: ${entry.dice.join(' · ')} → ${S.log.total} ${entry.total} · ${S.tirada.banda[entry.band]}${cola}`}
        </p>
      );
    }
    case 'outcome':
      return (
        <section className={styles.resultado}>
          <Parrafos parrafos={entry.paragraphs} />
        </section>
      );
  }
}

export function TextColumn({ log }: TextColumnProps) {
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fin.current;
    if (el !== null && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end' });
  }, [log.length]);

  return (
    <div className={styles.columna}>
      {log.map((entry, i) => (
        <Entrada key={i} entry={entry} />
      ))}
      <div ref={fin} />
    </div>
  );
}
