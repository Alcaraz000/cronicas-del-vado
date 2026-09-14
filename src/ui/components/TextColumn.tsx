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

function Entrada({ entry, revelado, conPlaca }: { entry: LogEntry; revelado?: Revelado; conPlaca: boolean }) {
  switch (entry.kind) {
    case 'scene':
      return (
        <section className={styles.escena} data-scene={entry.sceneId}>
          <Parrafos parrafos={entry.paragraphs} visibles={revelado?.parrafosVisibles} caracteres={revelado?.caracteresVisibles} conPlaca={conPlaca} />
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
          <Parrafos parrafos={entry.paragraphs} visibles={revelado?.parrafosVisibles} caracteres={revelado?.caracteresVisibles} conPlaca={conPlaca} />
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
    <div
      className={styles.columna}
      data-testid="columna-texto"
      aria-live="polite"
      aria-atomic="false"
      /**
       * Mientras la máquina de escribir tipea, la región viva queda declarada OCUPADA.
       *
       * Con `aria-atomic="false"` el lector de pantalla reanuncia solo el nodo que cambió, y
       * el nodo del párrafo en curso cambia una vez por carácter a 40 cps: sin esto, lo que
       * se escucha es "L", "La", "La c", "La cr"… — la región viva, que estaba puesta para
       * ayudar, es justo lo que arruina la lectura. `aria-busy` le dice a la tecnología de
       * asistencia que aguante los cambios hasta que la región se estabilice: pasa a `false`
       * una sola vez, cuando el revelado termina, y ahí se anuncia la prosa entera de una.
       *
       * El texto sigue estando en el árbol de accesibilidad todo el tiempo (no se esconde con
       * `aria-hidden`), así que quien navegue el documento a mano lo puede leer igual mientras
       * aparece: lo único que se suspende es el anuncio automático.
       */
      aria-busy={revelado !== undefined && !revelado.terminado}
      onClick={() => revelado?.avanzar()}
    >
      {/* `conPlaca` va en una sola entrada: la placa del hablante nombra SIEMPRE a la última, que
          es la que el revelado está dibujando. Las anteriores conservan cada prefijo a la vista
          —es lo único que en el scrollback dice quién habló— y por eso se pide `revelado` además
          del índice: sin revelado esta columna dibuja el log entero y no hay ninguna placa a la
          que un prefijo le sobre. */}
      {log.map((entry, i) => (
        <Entrada
          key={i}
          entry={entry}
          revelado={i === log.length - 1 ? revelado : undefined}
          conPlaca={revelado !== undefined && i === log.length - 1}
        />
      ))}
      <div ref={fin} />
    </div>
  );
}
