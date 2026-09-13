import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/engine/types';
import { Parrafos } from '@/ui/components/Parrafos';
import type { Revelado } from '@/ui/hooks/useRevelado';
import { S } from '@/ui/strings.es';
import styles from './TextColumn.module.css';

export interface TextColumnProps {
  log: LogEntry[];
  /**
   * Revelado de la ÚLTIMA entrada del log (tarea 9). Sin él, todo el log se dibuja entero,
   * como antes: así sigue portándose FinScreen si algún día reutilizara esta columna.
   * Un clic en la columna completa el párrafo en curso (o pasa al siguiente si ya estaba
   * completo); si `terminado`, no hace nada.
   */
  revelado?: Revelado;
}

function Entrada({ entry, revelado }: { entry: LogEntry; revelado?: Revelado }) {
  switch (entry.kind) {
    case 'scene':
      return (
        <section className={styles.escena} data-scene={entry.sceneId}>
          <Parrafos parrafos={entry.paragraphs} visibles={revelado?.parrafosVisibles} caracteres={revelado?.caracteresVisibles} />
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
          <Parrafos parrafos={entry.paragraphs} visibles={revelado?.parrafosVisibles} caracteres={revelado?.caracteresVisibles} />
        </section>
      );
  }
}

export function TextColumn({ log, revelado }: TextColumnProps) {
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fin.current;
    if (el !== null && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end' });
    // El párrafo en curso crece con `caracteresVisibles`: sin seguirlo, el texto que se está
    // revelando queda por debajo del borde apenas supera el alto visible.
  }, [log.length, revelado?.caracteresVisibles]);

  return (
    <div className={styles.columna} data-testid="columna-texto" onClick={() => revelado?.avanzar()}>
      {log.map((entry, i) => (
        <Entrada key={i} entry={entry} revelado={i === log.length - 1 ? revelado : undefined} />
      ))}
      <div ref={fin} />
    </div>
  );
}
