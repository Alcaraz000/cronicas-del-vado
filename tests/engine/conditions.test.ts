import { describe, expect, it } from 'vitest';
import type { Condition } from '@/content/schema';
import { evaluate, hasFlag } from '@/engine/conditions';
import { minimal } from '../fixtures/campaigns/minimal';
import { makeCtx, makeState } from '../fixtures/state';

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

describe('evaluate: casos base y combinadores', () => {
  it('undefined → true (una opción o variante sin condición siempre aplica)', () => {
    expect(evaluate(undefined, makeCtx())).toBe(true);
  });

  it('flag run: lee run.flags', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:tiene_pista'] } });
    expect(evaluate({ flag: 'run:tiene_pista' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'run:centinela_vencido' }, ctx)).toBe(false);
  });

  it('flag char: lee character.flags y run.stagedFlags', () => {
    const ctx = makeCtx(minimal, {
      character: { flags: ['char:m.de_antes'] },
      run: { stagedFlags: ['char:m.de_ahora'] },
    });
    expect(evaluate({ flag: 'char:m.de_antes' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'char:m.de_ahora' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'char:m.nunca' }, ctx)).toBe(false);
  });

  it('flag world: lee world.flags y run.stagedFlags', () => {
    const ctx = makeCtx(minimal, {
      world: { flags: ['world:m.de_antes'] },
      run: { stagedFlags: ['world:m.de_ahora'] },
    });
    expect(evaluate({ flag: 'world:m.de_antes' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'world:m.de_ahora' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'world:m.nunca' }, ctx)).toBe(false);
  });

  it('not invierte el resultado', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:a'] } });
    expect(evaluate({ not: { flag: 'run:a' } }, ctx)).toBe(false);
    expect(evaluate({ not: { flag: 'run:b' } }, ctx)).toBe(true);
  });

  it('all: vacío es true; todas verdaderas es true', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:a', 'run:b'] } });
    expect(evaluate({ all: [] }, ctx)).toBe(true);
    expect(evaluate({ all: [{ flag: 'run:a' }, { flag: 'run:b' }] }, ctx)).toBe(true);
  });

  it('all: con una falsa es false', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:a'] } });
    expect(evaluate({ all: [{ flag: 'run:a' }, { flag: 'run:b' }] }, ctx)).toBe(false);
  });

  it('any: vacío es false; con una verdadera es true', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:b'] } });
    expect(evaluate({ any: [] }, ctx)).toBe(false);
    expect(evaluate({ any: [{ flag: 'run:a' }, { flag: 'run:b' }] }, ctx)).toBe(true);
  });

  it('any: con todas falsas es false', () => {
    const ctx = makeCtx();
    expect(evaluate({ any: [{ flag: 'run:a' }, { flag: 'run:b' }] }, ctx)).toBe(false);
  });

  it('combinadores anidados: all → not → any', () => {
    // Verdadero cuando hay run:a y NO hay (run:b o run:c).
    const cond: Condition = { all: [{ flag: 'run:a' }, { not: { any: [{ flag: 'run:b' }, { flag: 'run:c' }] } }] };
    expect(evaluate(cond, makeCtx(minimal, { run: { flags: ['run:a'] } }))).toBe(true);
    expect(evaluate(cond, makeCtx(minimal, { run: { flags: ['run:a', 'run:c'] } }))).toBe(false);
    expect(evaluate(cond, makeCtx(minimal, { run: { flags: [] } }))).toBe(false);
  });
});
