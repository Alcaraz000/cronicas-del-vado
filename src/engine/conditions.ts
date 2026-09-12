import type { Condition } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/**
 * Busca un flag según su prefijo (alcance):
 * - `run:`   solo en run.flags (lo apostado en stagedFlags nunca es de partida).
 * - `char:`  en character.flags o en run.stagedFlags (apuestas de esta partida).
 * - `world:` en world.flags o en run.stagedFlags.
 * Cualquier otro prefijo → false.
 */
export function hasFlag(state: GameState, flag: string): boolean {
  const { run, character, world } = state;
  if (flag.startsWith('run:')) {
    return run.flags.includes(flag);
  }
  if (flag.startsWith('char:')) {
    return character.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  if (flag.startsWith('world:')) {
    return world.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  return false;
}

/**
 * Evalúa una condición de contenido contra el estado. Pura: no muta nada.
 * `undefined` significa "sin condición" y siempre es true.
 */
export function evaluate(cond: Condition | undefined, ctx: EvalContext): boolean {
  if (cond === undefined) {
    return true;
  }
  const { state } = ctx;

  if ('flag' in cond) {
    return hasFlag(state, cond.flag);
  }
  if ('not' in cond) {
    return !evaluate(cond.not, ctx);
  }
  if ('all' in cond) {
    return cond.all.every((c) => evaluate(c, ctx));
  }
  if ('any' in cond) {
    return cond.any.some((c) => evaluate(c, ctx));
  }
  // Las demás variantes se implementan en los ciclos siguientes.
  return false;
}
