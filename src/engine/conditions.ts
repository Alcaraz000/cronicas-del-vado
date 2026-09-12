import type { GameState } from '@/engine/types';

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
