import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/content/schema';
import type { Character, EvalContext, Run } from '@/engine/types';
import { applyEffects } from '@/engine/effects';
import { makeState } from '../fixtures/state';

const campaign: Campaign = {
  id: 'fx',
  contentVersion: 1,
  title: 'Campaña de efectos',
  premise: 'Campaña mínima para probar la aplicación de efectos.',
  cover: 'fx_portada',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  hidden: true,
  start: 'inicio',
  scenes: {},
  npcs: {},
  places: {},
  items: {},
  flags: {},
  milestones: { entrar: { label: 'Entrar' } },
  clocks: { pelea: { max: 2, label: 'Pelea' } },
  endings: {},
};

function contexto(run: Partial<Run> = {}, character: Partial<Character> = {}): EvalContext {
  return { campaign, state: makeState({ run, character }) };
}

describe('applyEffects: efectos ausentes', () => {
  it('con undefined devuelve exactamente el mismo estado', () => {
    const ctx = contexto();
    expect(applyEffects(undefined, ctx)).toBe(ctx.state);
  });

  it('con una lista vacía devuelve exactamente el mismo estado', () => {
    const ctx = contexto();
    expect(applyEffects([], ctx)).toBe(ctx.state);
  });
});

describe('applyEffects: flags', () => {
  it('set run: agrega a run.flags y no a stagedFlags', () => {
    const result = applyEffects([{ set: 'run:tiene_pista' }], contexto());
    expect(result.run.flags).toEqual(['run:tiene_pista']);
    expect(result.run.stagedFlags).toEqual([]);
  });

  it('set run: no duplica un flag ya presente', () => {
    const result = applyEffects([{ set: 'run:tiene_pista' }, { set: 'run:tiene_pista' }], contexto());
    expect(result.run.flags).toEqual(['run:tiene_pista']);
  });

  it('set char: y world: van a stagedFlags, no a run.flags', () => {
    const result = applyEffects([{ set: 'char:fx.vio_la_cripta' }, { set: 'world:fx.torre_caida' }], contexto());
    expect(result.run.stagedFlags).toEqual(['char:fx.vio_la_cripta', 'world:fx.torre_caida']);
    expect(result.run.flags).toEqual([]);
  });

  it('set char: no duplica en stagedFlags', () => {
    const ctx = contexto({ stagedFlags: ['char:fx.vio_la_cripta'] });
    const result = applyEffects([{ set: 'char:fx.vio_la_cripta' }], ctx);
    expect(result.run.stagedFlags).toEqual(['char:fx.vio_la_cripta']);
  });

  it('clear run: quita el flag de run.flags', () => {
    const ctx = contexto({ flags: ['run:a', 'run:b'] });
    const result = applyEffects([{ clear: 'run:a' }], ctx);
    expect(result.run.flags).toEqual(['run:b']);
  });

  it('clear char: quita el flag de stagedFlags', () => {
    const ctx = contexto({ stagedFlags: ['char:fx.uno', 'world:fx.dos'] });
    const result = applyEffects([{ clear: 'world:fx.dos' }], ctx);
    expect(result.run.stagedFlags).toEqual(['char:fx.uno']);
  });

  it('clear de un flag ausente deja las listas iguales', () => {
    const ctx = contexto({ flags: ['run:a'] });
    const result = applyEffects([{ clear: 'run:zzz' }], ctx);
    expect(result.run.flags).toEqual(['run:a']);
  });
});

describe('applyEffects: inmutabilidad', () => {
  it('no muta el estado de entrada y devuelve objetos nuevos', () => {
    const ctx = contexto({ flags: ['run:a'] });
    const antes = structuredClone(ctx.state);
    const result = applyEffects([{ set: 'run:b' }, { clear: 'run:a' }], ctx);
    expect(ctx.state).toEqual(antes);
    expect(result).not.toBe(ctx.state);
    expect(result.run).not.toBe(ctx.state.run);
    expect(result.run.flags).not.toBe(ctx.state.run.flags);
    expect(result.run.flags).toEqual(['run:b']);
  });

  it('conserva world, character y seen del estado de entrada', () => {
    const ctx = contexto();
    const result = applyEffects([{ set: 'run:b' }], ctx);
    expect(result.world).toBe(ctx.state.world);
    expect(result.character).toBe(ctx.state.character);
    expect(result.seen).toBe(ctx.state.seen);
  });
});
