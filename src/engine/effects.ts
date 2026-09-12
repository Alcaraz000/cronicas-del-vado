import type { Effect, FlagId } from '@/content/schema';
import type { EvalContext, GameState, Run } from '@/engine/types';

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

function applyOne(run: Run, effect: Effect): Run {
  if ('set' in effect) return setFlag(run, effect.set);
  if ('clear' in effect) return clearFlag(run, effect.clear);
  return run;
}

export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState {
  if (effects === undefined || effects.length === 0) return ctx.state;
  const run: Run = effects.reduce<Run>((acc, effect) => applyOne(acc, effect), ctx.state.run);
  return { ...ctx.state, run };
}
