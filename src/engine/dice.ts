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

const FACES: readonly number[] = [1, 2, 3, 4, 5, 6];

/** Todas las combinaciones ordenadas de `count` dados: 36 para 2, 216 para 3. */
function allCombos(count: number): number[][] {
  if (count === 0) return [[]];
  const shorter = allCombos(count - 1);
  return FACES.flatMap((face) => shorter.map((rest) => [face, ...rest]));
}

/** Enumeración exhaustiva: cuenta en qué banda cae cada combinación posible. */
export function bandOdds(totalMod: number, mode: RollMode): BandOdds {
  const count = mode === 'advantage' || mode === 'disadvantage' ? 3 : 2;
  const combos = allCombos(count);
  const counts: Record<Band, number> = { crit: 0, success: 0, partial: 0, failure: 0, fumble: 0 };
  for (const dice of combos) {
    const kept = keepDice(dice, mode).map((i) => dice[i] ?? 0);
    counts[classify(kept, totalMod)] += 1;
  }
  const total = combos.length;
  return {
    crit: counts.crit / total,
    success: counts.success / total,
    partial: counts.partial / total,
    failure: counts.failure / total,
    fumble: counts.fumble / total,
  };
}

/** Las tres bandas visibles: success incluye crit; failure incluye fumble. */
export function odds(totalMod: number, mode: RollMode): Odds {
  const b = bandOdds(totalMod, mode);
  return { success: b.crit + b.success, partial: b.partial, failure: b.failure + b.fumble };
}

/**
 * seguro: fallo ≤ 20 % Y éxito ≥ 40 %; si no, arriesgado: fallo ≤ 45 %; si no, peligroso.
 * Los bordes son inclusivos.
 */
export function riskLabel(o: Odds): Risk {
  if (o.failure <= 0.2 && o.success >= 0.4) return 'seguro';
  if (o.failure <= 0.45) return 'arriesgado';
  return 'peligroso';
}

/** Objetivo expresado en los dados: con modificador m hace falta 10-m para éxito y 7-m con costo. */
export function targetLine(totalMod: number): string {
  const success = 10 - totalMod;
  const partial = 7 - totalMod;
  return `Necesitás ${success}+ en los dados para éxito, ${partial}+ con costo · doble 1 siempre falla · doble 6 siempre crítico`;
}
