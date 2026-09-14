import { useMemo } from 'react';
import type { ResolvedParagraph } from '@/engine/types';
import { useStore } from '@/state/store';
import styles from './Parrafos.module.css';

export interface ParrafosProps {
  parrafos: ResolvedParagraph[];
  /**
   * Cuántos párrafos mostrar COMPLETOS. Sin esta prop (y sin `caracteres`) se muestran todos,
   * como antes de la tarea 9 — así sigue portándose igual `FinScreen`, que no anima nada.
   */
  visibles?: number;
  /**
   * Caracteres a mostrar del párrafo EN CURSO (el de índice `visibles`), contados sobre
   * `text`, no sobre el nombre del hablante: con 0 el párrafo en curso todavía no se dibuja
   * (ni su nombre); apenas hay 1, el nombre aparece entero junto con ese primer carácter.
   */
  caracteres?: number;
  /**
   * true en el bloque que la placa del hablante está nombrando, o sea la última entrada del log
   * dentro de la caja de la escena. Solo ahí un párrafo se marca `data-hablante="placa"`, que es
   * la marca que `TextColumn.module.css` esconde de la vista; todos los demás quedan en
   * `"propio"` y conservan su prefijo. Lo pone `TextColumn`, que es quien sabe cuál entrada es
   * la última; `FinScreen` y el futuro cajón de historial no lo pasan y por eso nunca pierden
   * un prefijo, sin depender de qué valor tenga el atributo.
   */
  conPlaca?: boolean;
}

/**
 * Índice del párrafo que la placa del hablante nombra: el ÚLTIMO de los que están DIBUJADOS que
 * tiene `speaker`, o `null` si no hay ninguno.
 *
 * Vive acá solo, y exportado, porque es la cuenta de la que dependen las dos puntas del mismo
 * hecho: a quién nombra la placa (`hablanteVisible`, en `EscenaScreen`) y a qué párrafo se le
 * esconde el prefijo (`Parrafos`, acá abajo). Calculadas por separado, el día que una cambiara
 * la placa nombraría a uno y el prefijo se escondería en otro —o sea, un diálogo dibujado bajo
 * el cartel de otro personaje— y nadie se enteraría. Con una sola función no pueden divergir.
 *
 * `visibles` y `caracteres` son los del revelado, con el mismo corte que usa `Parrafos` para
 * decidir qué dibuja: el párrafo en curso cuenta recién cuando tiene al menos un carácter
 * revelado, así el prefijo se apaga y la placa cambia en el mismo tic. Sin `visibles` (el fin,
 * que no anima nada) están dibujados todos.
 */
export function indiceDeLaPlaca(
  parrafos: ResolvedParagraph[],
  visibles?: number,
  caracteres?: number,
): number | null {
  const hasta = visibles === undefined ? parrafos.length : visibles + ((caracteres ?? 0) > 0 ? 1 : 0);
  for (let i = Math.min(hasta, parrafos.length) - 1; i >= 0; i--) {
    if (parrafos[i]?.speaker !== undefined) return i;
  }
  return null;
}

/**
 * id de PNJ → nombre visible. Único lugar donde se resuelve el mapa: la campaña que el store
 * entrega ya viene con el mundo adentro (store.conMundo), así que acá no hay nada que fusionar.
 */
export function useNombresDePnj(): Record<string, string> {
  const campaign = useStore((s) => s.ui.campaign);
  return useMemo(() => {
    const mapa: Record<string, string> = {};
    if (campaign !== null) {
      for (const npc of Object.values(campaign.npcs)) mapa[npc.id] = npc.name;
    }
    return mapa;
  }, [campaign]);
}

/**
 * Párrafos de texto de juego, con el nombre del hablante cuando lo hay. Lo usan las dos pantallas
 * que muestran prosa del motor (la columna de la escena y el fin), para que una línea de diálogo
 * se vea igual en las dos.
 */
export function Parrafos({ parrafos, visibles, caracteres, conPlaca = false }: ParrafosProps) {
  const nombres = useNombresDePnj();
  // Cuál es el párrafo que la placa nombra. `mostrar` comparte índices con `parrafos` (se arma
  // cortando desde el principio), así que el índice sirve tal cual en el map de abajo.
  const deLaPlaca = conPlaca ? indiceDeLaPlaca(parrafos, visibles, caracteres) : null;
  const completos = visibles === undefined ? parrafos : parrafos.slice(0, visibles);
  // El párrafo en curso solo se agrega si ya tiene al menos un carácter revelado: con 0,
  // ni el texto ni el nombre del hablante se dibujan todavía.
  const enCurso = visibles !== undefined && (caracteres ?? 0) > 0 ? parrafos[visibles] : undefined;
  const mostrar =
    enCurso === undefined ? completos : [...completos, { ...enCurso, text: enCurso.text.slice(0, caracteres ?? 0) }];
  return (
    <>
      {mostrar.map((p, i) => (
        <p key={i} className={styles.parrafo}>
          {/* `data-hablante` es la marca pública para que otro módulo pueda seleccionar este
              nodo (las clases de un CSS Module tienen hash), y su VALOR dice si este prefijo es
              el que la placa está repitiendo.

              Solo el `"placa"` se esconde a la vista, y solo él, porque solo él está dicho dos
              veces. Escondiéndolos todos —como se hacía— un bloque con dos hablantes queda
              dibujado entero bajo el cartel del último: en `cl_desenlace`, el clímax, la línea
              de Berta caía abajo de un cartel que dice "Ilse". Eso no es atribución faltante,
              es atribución equivocada, que es peor.

              Escondido de la VISTA y no del árbol de accesibilidad, en los dos casos: la región
              viva de `TextColumn` es lo único que le dice a un lector de pantalla quién habla
              (la placa es `aria-hidden` justo para no anunciar el nombre dos veces). */}
          {p.speaker !== undefined && (
            <strong className={styles.hablante} data-hablante={i === deLaPlaca ? 'placa' : 'propio'}>
              {nombres[p.speaker] ?? p.speaker}:{' '}
            </strong>
          )}
          <span>{p.text}</span>
        </p>
      ))}
    </>
  );
}
