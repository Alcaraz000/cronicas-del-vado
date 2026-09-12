import { LIMITS } from '@/content/catalog';
import type { ConditionId } from '@/content/catalog';
import type { Effect, FlagId } from '@/content/schema';
import { fortuneMax } from '@/engine/progression';
import type { EvalContext, GameState, Run } from '@/engine/types';

type Wounds = Run['wounds'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toWounds(value: number): Wounds {
  const w = clamp(value, 0, LIMITS.maxWounds);
  if (w === 0 || w === 1 || w === 2) return w;
  return 3;
}

function addUnique(list: readonly string[], value: string): string[] {
  return list.includes(value) ? [...list] : [...list, value];
}

function setFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: addUnique(run.flags, flag) };
  }
  return { ...run, stagedFlags: addUnique(run.stagedFlags, flag) };
}

function clearFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: run.flags.filter((f) => f !== flag) };
  }
  return { ...run, stagedFlags: run.stagedFlags.filter((f) => f !== flag) };
}

function giveItem(run: Run, itemId: string): Run {
  if (run.items.length >= LIMITS.maxItems || run.items.includes(itemId)) return run;
  return { ...run, items: [...run.items, itemId] };
}

function takeItem(run: Run, itemId: string): Run {
  return { ...run, items: run.items.filter((i) => i !== itemId) };
}

function addCondition(run: Run, id: ConditionId): Run {
  if (run.conditions.includes(id)) return run;
  const base: ConditionId[] =
    run.conditions.length >= LIMITS.maxConditions ? run.conditions.slice(1) : [...run.conditions];
  return { ...run, conditions: [...base, id] };
}

function removeCondition(run: Run, id: ConditionId | 'all'): Run {
  if (id === 'all') return { ...run, conditions: [] };
  return { ...run, conditions: run.conditions.filter((c) => c !== id) };
}

function applyClock(run: Run, name: string, delta: number, ctx: EvalContext): Run {
  const def: { max: number; label: string } | undefined = ctx.campaign.clocks[name];
  if (def === undefined) return run;
  const current: number = run.clocks[name] ?? 0;
  return { ...run, clocks: { ...run.clocks, [name]: clamp(current + delta, 0, def.max) } };
}

function applyFortune(run: Run, delta: number, ctx: EvalContext): Run {
  const max = fortuneMax(ctx.state.character.level);
  return { ...run, fortune: clamp(run.fortune + delta, 0, max) };
}

// Regla de dos pasos: lethal aplica 2 Heridas. Si el personaje ya estaba Malherido
// (2 o más Heridas previas) muere de verdad; con menos, satura en 3 y la
// comprobación final de applyEffects lo marca como derrota normal.
function applyLethal(run: Run): Run {
  const previas = run.wounds;
  const herido: Run = { ...run, wounds: toWounds(previas + 2) };
  if (previas >= 2) return { ...herido, outcome: { kind: 'death' } };
  return herido;
}

function applyOne(run: Run, effect: Effect, ctx: EvalContext): Run {
  if ('set' in effect) return setFlag(run, effect.set);
  if ('clear' in effect) return clearFlag(run, effect.clear);
  if ('give' in effect) return giveItem(run, effect.give);
  if ('take' in effect) return takeItem(run, effect.take);
  if ('wound' in effect) return { ...run, wounds: toWounds(run.wounds + effect.wound) };
  if ('heal' in effect) return { ...run, wounds: toWounds(run.wounds - effect.heal) };
  if ('addCondition' in effect) return addCondition(run, effect.addCondition);
  if ('removeCondition' in effect) return removeCondition(run, effect.removeCondition);
  if ('clock' in effect) return applyClock(run, effect.clock, effect.delta, ctx);
  if ('milestone' in effect) return { ...run, milestones: addUnique(run.milestones, effect.milestone) };
  if ('fortune' in effect) return applyFortune(run, effect.fortune, ctx);
  if ('lethal' in effect) return applyLethal(run);

  // Si el tipo Effect gana una variante nueva, la asignación a `never` deja de compilar y obliga a
  // implementarla acá (mismo patrón que conditions.ts). El valor no se devuelve —de ahí el `void`—:
  // en runtime un efecto desconocido tiene que ser inocuo y dejar el run intacto, no convertirse
  // en el run y seguir viaje por el reduce hasta el guardado.
  const restante: never = effect;
  void restante;
  return run;
}

export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState {
  if (effects === undefined || effects.length === 0) return ctx.state;
  const aplicado: Run = effects.reduce<Run>((acc, effect) => applyOne(acc, effect, ctx), ctx.state.run);
  const run: Run =
    aplicado.wounds === LIMITS.maxWounds && aplicado.outcome === undefined
      ? { ...aplicado, outcome: { kind: 'defeat' } }
      : aplicado;
  return { ...ctx.state, run };
}
