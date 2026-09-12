import { useMemo } from 'react';
import type { ResolvedParagraph } from '@/engine/types';
import { useStore } from '@/state/store';
import styles from './Parrafos.module.css';

export interface ParrafosProps {
  parrafos: ResolvedParagraph[];
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
export function Parrafos({ parrafos }: ParrafosProps) {
  const nombres = useNombresDePnj();
  return (
    <>
      {parrafos.map((p, i) => (
        <p key={i} className={styles.parrafo}>
          {p.speaker !== undefined && <strong className={styles.hablante}>{nombres[p.speaker] ?? p.speaker}: </strong>}
          <span>{p.text}</span>
        </p>
      ))}
    </>
  );
}
