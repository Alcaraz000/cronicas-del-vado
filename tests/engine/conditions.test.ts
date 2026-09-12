import { describe, expect, it } from 'vitest';
import { hasFlag } from '@/engine/conditions';
import { makeState } from '../fixtures/state';

describe('hasFlag', () => {
  it('run: se busca en run.flags', () => {
    const state = makeState({ run: { flags: ['run:puerta_abierta'] } });
    expect(hasFlag(state, 'run:puerta_abierta')).toBe(true);
    expect(hasFlag(state, 'run:otra_cosa')).toBe(false);
  });

  it('run: NO se lee de run.stagedFlags ni de character.flags ni de world.flags', () => {
    const state = makeState({
      run: { stagedFlags: ['run:apostado'] },
      character: { flags: ['run:en_personaje'] },
      world: { flags: ['run:en_mundo'] },
    });
    expect(hasFlag(state, 'run:apostado')).toBe(false);
    expect(hasFlag(state, 'run:en_personaje')).toBe(false);
    expect(hasFlag(state, 'run:en_mundo')).toBe(false);
  });

  it('char: se lee de character.flags', () => {
    const state = makeState({ character: { flags: ['char:m.secreto'] } });
    expect(hasFlag(state, 'char:m.secreto')).toBe(true);
    expect(hasFlag(state, 'char:m.otro')).toBe(false);
  });

  it('char: también se lee de run.stagedFlags (apostado en esta partida)', () => {
    const state = makeState({ run: { stagedFlags: ['char:m.apostado'] } });
    expect(hasFlag(state, 'char:m.apostado')).toBe(true);
  });

  it('world: se lee de world.flags', () => {
    const state = makeState({ world: { flags: ['world:m.inundada'] } });
    expect(hasFlag(state, 'world:m.inundada')).toBe(true);
    expect(hasFlag(state, 'world:m.seca')).toBe(false);
  });

  it('world: también se lee de run.stagedFlags', () => {
    const state = makeState({ run: { stagedFlags: ['world:m.apostado'] } });
    expect(hasFlag(state, 'world:m.apostado')).toBe(true);
  });

  it('char: y world: no se leen de run.flags (los alcances no se mezclan)', () => {
    const state = makeState({ run: { flags: ['char:m.colado', 'world:m.colado'] } });
    expect(hasFlag(state, 'char:m.colado')).toBe(false);
    expect(hasFlag(state, 'world:m.colado')).toBe(false);
  });

  it('un flag con prefijo desconocido nunca está', () => {
    const state = makeState({
      run: { flags: ['sin_prefijo'], stagedFlags: ['sin_prefijo'] },
      character: { flags: ['sin_prefijo'] },
      world: { flags: ['sin_prefijo'] },
    });
    expect(hasFlag(state, 'sin_prefijo')).toBe(false);
  });
});
