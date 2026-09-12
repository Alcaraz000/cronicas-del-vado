import type { Band, Risk, RollMode } from '@/engine/types';

/** Probabilidad exacta de cada banda (fracciones sobre 36 o 216 casos). */
export interface BandOdds {
  crit: number;
  success: number;
  partial: number;
  failure: number;
  fumble: number;
}

/** Las tres bandas que ve el jugador: success = crit + success, failure = failure + fumble. */
export interface Odds {
  success: number;
  partial: number;
  failure: number;
}

/**
 * Índices de los dados que se conservan (siempre 2, ordenados de menor a mayor índice).
 * advantage → los 2 mayores; disadvantage → los 2 menores; normal/cancelled → [0, 1].
 * Empates: gana el índice menor. No muta `dice`.
 */
export function keepDice(dice: number[], mode: RollMode): number[] {
  if (mode !== 'advantage' && mode !== 'disadvantage') return [0, 1];
  const direction = mode === 'advantage' ? -1 : 1;
  const ordered = dice
    .map((_, index) => index)
    .sort((a, b) => {
      const byValue = ((dice[a] ?? 0) - (dice[b] ?? 0)) * direction;
      return byValue !== 0 ? byValue : a - b;
    });
  return ordered.slice(0, 2).sort((a, b) => a - b);
}

/**
 * Banda de una tirada. `kept` son los VALORES de los 2 dados conservados.
 * Los naturales priman: [6, 6] → crit y [1, 1] → fumble sin mirar el total.
 * Luego total = suma + totalMod: ≥ 10 success, 7-9 partial, ≤ 6 failure.
 */
export function classify(kept: number[], totalMod: number): Band {
  const isDouble = (face: number): boolean => kept.length === 2 && kept.every((d) => d === face);
  if (isDouble(6)) return 'crit';
  if (isDouble(1)) return 'fumble';
  const total = kept.reduce((sum, d) => sum + d, 0) + totalMod;
  if (total >= 10) return 'success';
  if (total >= 7) return 'partial';
  return 'failure';
}
