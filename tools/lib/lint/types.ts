import type { Campaign, WorldContent } from '@/content/schema';

/**
 * Nivel de un hallazgo del lint de texto. A diferencia del validador, acá nada bloquea por defecto:
 * `--strict` es el único modo que convierte los `error` en código de salida 1.
 *
 * - `error`: rompe una regla dura de la biblia (§2.6 palabras prohibidas, cupos, marco de memoria)
 *   o se pasa del presupuesto por encima del umbral.
 * - `aviso`: algo que el autor tiene que mirar (una escena fuera de banda, un n-grama repetido).
 * - `info`: medición sin juicio (muletillas, totales, duraciones).
 */
export type LintLevel = 'error' | 'aviso' | 'info';

export interface LintIssue {
  level: LintLevel;
  check: string;
  sceneId?: string;
  message: string;
}

export interface LintContext {
  world: WorldContent;
  /** Markdown de `design/01-outline.md`, si está. Sin él, el chequeo de presupuesto se saltea. */
  outline?: string;
  /** Semilla de las caminatas de duración. Misma semilla ⇒ mismo informe. */
  seed: number;
  /** Cuántas caminatas se hacen para estimar la duración. */
  walks: number;
  /** Cuántas muletillas se listan. */
  top: number;
}

export type LintCheck = (campaign: Campaign, ctx: LintContext) => LintIssue[];

export function issue(level: LintLevel, check: string, message: string, sceneId?: string): LintIssue {
  if (sceneId === undefined) return { level, check, message };
  return { level, check, sceneId, message };
}

export const error = (check: string, message: string, sceneId?: string): LintIssue => issue('error', check, message, sceneId);
export const aviso = (check: string, message: string, sceneId?: string): LintIssue => issue('aviso', check, message, sceneId);
export const info = (check: string, message: string, sceneId?: string): LintIssue => issue('info', check, message, sceneId);
