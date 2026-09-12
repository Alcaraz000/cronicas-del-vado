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
 *
 * Semántica (sección F del contrato):
 * - visited: (run.visited[x] ?? 0) >= (min ?? 1); cuenta visitas previas COMPLETAS.
 * - met / knows: azúcar de los flags derivados `char:met.<npc>` / `char:place.<lugar>`.
 * - clock: (run.clocks[x] ?? 0) >= gte.
 * - endingSeen: character.campaignLog[campaign.id]?.endings incluye x.
 */
export function evaluate(cond: Condition | undefined, ctx: EvalContext): boolean {
  if (cond === undefined) {
    return true;
  }
  const { campaign, state } = ctx;
  const { character, run } = state;

  // Flags y combinadores lógicos.
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

  // Personaje.
  if ('class' in cond) {
    return character.classId === cond.class;
  }
  if ('trait' in cond) {
    return character.traits.includes(cond.trait);
  }
  if ('skill' in cond) {
    return character.skills.includes(cond.skill);
  }
  if ('attr' in cond) {
    return character.attrs[cond.attr] >= cond.gte;
  }

  // Partida.
  if ('item' in cond) {
    return run.items.includes(cond.item);
  }
  if ('wounds' in cond) {
    const { gte, lte } = cond.wounds;
    const cumpleMin = gte === undefined || run.wounds >= gte;
    const cumpleMax = lte === undefined || run.wounds <= lte;
    return cumpleMin && cumpleMax;
  }
  if ('condition' in cond) {
    return run.conditions.includes(cond.condition);
  }

  // Memoria y relojes.
  if ('visited' in cond) {
    const visitas = run.visited[cond.visited] ?? 0;
    return visitas >= (cond.min ?? 1);
  }
  if ('met' in cond) {
    return hasFlag(state, `char:met.${cond.met}`);
  }
  if ('knows' in cond) {
    return hasFlag(state, `char:place.${cond.knows}`);
  }
  if ('clock' in cond) {
    const valor = run.clocks[cond.clock] ?? 0;
    return valor >= cond.gte;
  }
  if ('endingSeen' in cond) {
    const registro = character.campaignLog[campaign.id];
    return registro?.endings.includes(cond.endingSeen) ?? false;
  }

  // Si el tipo Condition gana una variante nueva, esta línea deja de compilar
  // y obliga a implementarla acá.
  const restante: never = cond;
  return restante;
}
