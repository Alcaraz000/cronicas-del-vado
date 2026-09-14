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
 * De la más vieja a la más nueva, y sin autoscroll al final. El contenedor que scrollea es el
 * panel de `Cajon`, que lleva el título y "Cerrar" arriba de todo: llevarlo al fondo al abrirse
 * escondería la única forma visible de cerrar el cajón. Lo más nuevo, además, es justo lo que el
 * jugador tiene en la caja detrás de este panel.
 */
export function Historial({ log, abierto, onCerrar }: HistorialProps) {
  return (
    <Cajon titulo={S.historial.titulo} abierto={abierto} onCerrar={onCerrar}>
      {log.length === 0 ? (
        <p className={styles.vacio}>{S.historial.vacio}</p>
      ) : (
        <div className={styles.lista} data-testid="historial">
          {log.map((entry, i) => (
            <Entrada key={i} entry={entry} />
          ))}
        </div>
      )}
    </Cajon>
  );
}
