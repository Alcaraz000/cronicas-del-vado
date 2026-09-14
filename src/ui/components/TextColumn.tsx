import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/engine/types';
import { Parrafos } from '@/ui/components/Parrafos';
import type { Revelado } from '@/ui/hooks/useRevelado';
import { S } from '@/ui/strings.es';
import styles from './TextColumn.module.css';

export interface TextColumnProps {
  /**
   * El log entero de la partida, del que esta columna dibuja **lo que escribió el último paso**
   * (tarea 3): ver `entradasDelUltimoPaso`. Todo lo anterior vive en el cajón del `Historial`.
   */
  log: LogEntry[];
  /**
   * Revelado de la ÚLTIMA entrada del log (tarea 9). Sin él la entrada se dibuja entera, sin
   * animación, y sin placa que le esté repitiendo el nombre del hablante.
   * Un clic en la columna completa el párrafo en curso (o pasa al siguiente si ya estaba
   * completo); si `terminado`, no hace nada.
   */
  revelado?: Revelado;
}

export interface EntradaProps {
  entry: LogEntry;
  revelado?: Revelado;
  /**
   * true solo donde hay una placa de hablante repitiendo el nombre (o sea, en la caja de la
   * escena). El cajón del historial no la pasa: ahí el prefijo del párrafo es lo único que dice
   * quién habló. Ver `ParrafosProps.conPlaca`.
   */
  conPlaca?: boolean;
}

/**
 * Una entrada del log dibujada: prosa de escena, elección, tirada o desenlace.
 *
 * Exportada porque la dibujan DOS superficies —la caja de la escena (`TextColumn`, el tramo del
 * último paso) y el cajón del historial (`Historial`, la partida entera)— y el brief pide que se
 * vean con el mismo formato. Compartir el componente es lo que garantiza que no puedan divergir;
 * una copia en el cajón envejecería sola la primera vez que alguien tocara el formato de una
 * tirada.
 */
export function Entrada({ entry, revelado, conPlaca = false }: EntradaProps) {
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

/**
 * Las entradas que escribió el ÚLTIMO PASO del jugador: el tramo final de prosa del log, contado
 * hacia atrás hasta el primer 'choice' o 'roll' (o hasta el principio). En la práctica son dos
 * —el desenlace de la opción y la escena que ese desenlace abrió— o una sola, la escena.
 *
 * **Por qué no es "la última entrada" a secas**, que es lo que decía el plan. El desenlace de una
 * opción no queda NUNCA último: `choose` y `commitRoll` apilan el 'outcome' y en la misma acción
 * llaman a `enter()`, que apila enseguida la escena nueva (`src/engine/resolve.ts`). Con la regla
 * literal, toda la prosa de desenlaces se salteaba la pantalla y aparecía solo en el historial:
 * contados sobre la campaña publicada, **335 de 344 desenlaces tienen texto, 9.809 palabras** —o
 * sea, la consecuencia de cada cosa que el jugador decide—. Eso no es un scrollback, es el texto
 * en curso, y el propio plan lo dice cuando describe qué muestra la caja ("la prosa de la escena,
 * o el desenlace de la tirada recién resuelta").
 *
 * El tramo no puede crecer sin control: el motor escribe una 'choice' (o un 'roll') antes de cada
 * desenlace, así que entre dos marcas nunca hay más que un desenlace y una escena.
 */
function entradasDelUltimoPaso(log: LogEntry[]): LogEntry[] {
  let desde = log.length;
  while (desde > 0) {
    const kind = log[desde - 1]?.kind;
    if (kind !== 'scene' && kind !== 'outcome') break;
    desde -= 1;
  }
  return log.slice(desde);
}

export function TextColumn({ log, revelado }: TextColumnProps) {
  const fin = useRef<HTMLDivElement>(null);
  const ultima = log[log.length - 1];
  const visibles = entradasDelUltimoPaso(log);

  useEffect(() => {
    const el = fin.current;
    if (el !== null && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end' });
    // El párrafo en curso crece con `caracteresVisibles`: sin seguirlo, el texto que se está
    // revelando queda por debajo del borde apenas supera el alto visible. Con una sola entrada
    // en la caja eso pasa menos seguido que antes, pero sigue pasando: los párrafos de esta
    // campaña llegan a 160 palabras y una entrada así no entra en la caja ni a escala 1.
    //
    // La dependencia es la IDENTIDAD de `ultima` y no `log.length` (que era lo que había): el
    // motor recorta el log a `LIMITS.maxLog`, así que pasado ese tope cada entrada nueva empuja
    // a la más vieja y el largo queda constante para siempre. Es el mismo motivo por el que
    // `useRevelado` se reinicia con la referencia y no con el largo.
  }, [ultima, revelado?.caracteresVisibles]);

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
      {/* Lo que escribió el último paso, y nada más (ver `entradasDelUltimoPaso`). Ninguna novela
          visual deja la partida entera apilada en la caja, y acá encima se veía mal: la caja
          nacía scrolleada al fondo del log acumulado y el borde de arriba cortaba una línea de
          texto por la mitad. El resto vive en el cajón del `Historial`, que se abre con el botón
          del cromo o con la tecla H.

          `revelado` y `conPlaca` van SOLO en la última, que es la que el revelado está tipeando y
          la que la placa del hablante nombra (`hablanteVisible` en `EscenaScreen` mira esa misma).
          El desenlace que quedó arriba aparece entero de una —nunca se tipeó, tampoco antes— y
          conserva sus prefijos de hablante a la vista, que es lo correcto: la placa no lo está
          nombrando a él. `conPlaca` cuelga de que haya `revelado` porque es la misma condición:
          el revelado solo existe en la caja de la escena, la única superficie con placa. */}
      {visibles.map((entry, i) => (
        <Entrada
          key={i}
          entry={entry}
          revelado={i === visibles.length - 1 ? revelado : undefined}
          conPlaca={revelado !== undefined && i === visibles.length - 1}
        />
      ))}
      <div ref={fin} />
    </div>
  );
}
