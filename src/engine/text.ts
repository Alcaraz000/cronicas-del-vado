import { hash32 } from '@/engine/rng';

/**
 * Hash estable de un párrafo mostrado: FNV-1a de 32 bits expresado en base36.
 * Se guarda en `seen[campaña][escena]` para saber qué párrafos ya leyó el jugador.
 */
export function hashParagraph(text: string): string {
  return hash32(text).toString(36);
}
