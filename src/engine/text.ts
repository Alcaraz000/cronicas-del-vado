import type { Text } from '@/content/schema';
import type { EvalContext, ResolvedParagraph } from '@/engine/types';
import { hash32 } from '@/engine/rng';

/**
 * Hash estable de un párrafo mostrado: FNV-1a de 32 bits expresado en base36.
 * Se guarda en `seen[campaña][escena]` para saber qué párrafos ya leyó el jugador.
 */
export function hashParagraph(text: string): string {
  return hash32(text).toString(36);
}

/**
 * Convierte el Text de una escena en párrafos listos para mostrar.
 * - string → párrafo de narrador.
 * - Paragraph → primera variante (el ciclo 3 agrega la evaluación de `when`).
 */
export function resolveText(text: Text, ctx: EvalContext): ResolvedParagraph[] {
  void ctx;
  const resultado: ResolvedParagraph[] = [];
  for (const item of text) {
    if (typeof item === 'string') {
      resultado.push({ text: item });
      continue;
    }
    const variante = item.variants[0];
    if (variante === undefined) {
      continue;
    }
    resultado.push(
      item.speaker === undefined ? { text: variante.text } : { speaker: item.speaker, text: variante.text },
    );
  }
  return resultado;
}
