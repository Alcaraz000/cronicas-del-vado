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
export function Parrafos({ parrafos, visibles, caracteres }: ParrafosProps) {
  const nombres = useNombresDePnj();
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
              nodo (las clases de un CSS Module tienen hash): la caja de la escena esconde el
              prefijo a la vista porque ahí el nombre ya vive en la placa del hablante, y lo
              deja en el árbol de accesibilidad, que es de donde lo toma su región viva.
              `FinScreen` no lo toca: sin placa, el prefijo es la única pista de quién habla. */}
          {p.speaker !== undefined && (
            <strong className={styles.hablante} data-hablante="true">
              {nombres[p.speaker] ?? p.speaker}:{' '}
            </strong>
          )}
          <span>{p.text}</span>
        </p>
      ))}
    </>
  );
}
