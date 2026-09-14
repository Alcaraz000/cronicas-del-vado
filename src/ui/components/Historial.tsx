import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/engine/types';
import { Cajon } from '@/ui/components/Cajon';
import { Entrada } from '@/ui/components/TextColumn';
import { S } from '@/ui/strings.es';
import styles from './Historial.module.css';

export interface HistorialProps {
  /** El log entero de la partida, de la entrada más vieja a la más nueva. */
  log: LogEntry[];
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * El historial de la partida: todo lo que hasta la tarea 3 se apilaba en la caja de la escena.
 * Se abre con el botón del cromo o con la tecla H, y vive sobre el mismo `Cajon` que la Ficha,
 * así que hereda su foco atrapado, su Esc y su cuenta en `modales.ts` sin repetir nada.
 *
 * Dibuja las entradas con la misma `Entrada` que la caja —el brief pide el mismo formato, y
 * compartir el componente es lo único que garantiza que no puedan divergir— pero **sin
 * `conPlaca`**: acá no hay ninguna placa de hablante, así que el prefijo del párrafo ("Berta: ")
 * es lo único que dice quién habló y se queda entero. `Parrafos` sin esa prop ya hace eso; no
 * hay ninguna regla que copiar.
 *
 * De la más vieja a la más nueva —el orden en que se leyó— y **abierto en el final**, que es lo
 * que hace Ren'Py y lo único que tiene sentido para algo que se abre a ver lo que te perdiste:
 * con abrir arriba de todo, en una partida larga el jugador scrollea un rato para llegar a lo que
 * acaba de pasar. Medido jugando, con solo DOS escenas el cajón ya scrollea (978 px de contenido
 * contra 800 de ventana).
 *
 * El scroll se hace sobre la lista entera con `scrollIntoView({ block: 'end' })` —alinea su borde
 * de abajo con el del contenedor, o sea el final— y no tocando `scrollTop` del padre, que
 * ataría este componente a la estructura interna de `Cajon`. Y funciona sin esconder el botón
 * "Cerrar" porque `Cajon` ahora scrollea el cuerpo y deja el encabezado fijo (ver su CSS).
 */
export function Historial({ log, abierto, onCerrar }: HistorialProps) {
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const el = lista.current;
    // `Cajon` no dibuja nada mientras está cerrado, así que la ref recién existe en el commit
    // que lo abre. El `typeof` es porque jsdom no implementa `scrollIntoView`.
    if (el !== null && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end' });
  }, [abierto]);

  return (
    <Cajon titulo={S.historial.titulo} abierto={abierto} onCerrar={onCerrar}>
      {log.length === 0 ? (
        <p className={styles.vacio}>{S.historial.vacio}</p>
      ) : (
        <div ref={lista} className={styles.lista} data-testid="historial">
          {log.map((entry, i) => (
            <Entrada key={i} entry={entry} />
          ))}
        </div>
      )}
    </Cajon>
  );
}
