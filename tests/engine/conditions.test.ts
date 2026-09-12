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

describe('evaluate: personaje y partida', () => {
  it('class compara con character.classId', () => {
    const ctx = makeCtx(minimal, { character: { classId: 'mago' } });
    expect(evaluate({ class: 'mago' }, ctx)).toBe(true);
    expect(evaluate({ class: 'guerrero' }, ctx)).toBe(false);
  });

  it('trait busca en character.traits', () => {
    const ctx = makeCtx(minimal, { character: { traits: ['aprendiz_de_escriba', 'cazador_furtivo'] } });
    expect(evaluate({ trait: 'aprendiz_de_escriba' }, ctx)).toBe(true);
    expect(evaluate({ trait: 'desertor' }, ctx)).toBe(false);
  });

  it('skill busca en character.skills', () => {
    const ctx = makeCtx(minimal, { character: { skills: ['rastreador'] } });
    expect(evaluate({ skill: 'rastreador' }, ctx)).toBe(true);
    expect(evaluate({ skill: 'orador' }, ctx)).toBe(false);
  });

  it('item busca en run.items', () => {
    const ctx = makeCtx(minimal, { run: { items: ['llave_de_hierro'] } });
    expect(evaluate({ item: 'llave_de_hierro' }, ctx)).toBe(true);
    expect(evaluate({ item: 'carta_lacrada' }, ctx)).toBe(false);
  });

  it('attr gte compara character.attrs[attr] >= gte', () => {
    const ctx = makeCtx(minimal, { character: { attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 } } });
    expect(evaluate({ attr: 'saber', gte: 2 }, ctx)).toBe(true);
    expect(evaluate({ attr: 'saber', gte: 3 }, ctx)).toBe(false);
    expect(evaluate({ attr: 'vigor', gte: 0 }, ctx)).toBe(true);
    expect(evaluate({ attr: 'vigor', gte: 1 }, ctx)).toBe(false);
  });

  it('wounds gte solo', () => {
    expect(evaluate({ wounds: { gte: 1 } }, makeCtx(minimal, { run: { wounds: 0 } }))).toBe(false);
    expect(evaluate({ wounds: { gte: 1 } }, makeCtx(minimal, { run: { wounds: 1 } }))).toBe(true);
    expect(evaluate({ wounds: { gte: 1 } }, makeCtx(minimal, { run: { wounds: 3 } }))).toBe(true);
  });

  it('wounds lte solo', () => {
    expect(evaluate({ wounds: { lte: 1 } }, makeCtx(minimal, { run: { wounds: 0 } }))).toBe(true);
    expect(evaluate({ wounds: { lte: 1 } }, makeCtx(minimal, { run: { wounds: 1 } }))).toBe(true);
    expect(evaluate({ wounds: { lte: 1 } }, makeCtx(minimal, { run: { wounds: 2 } }))).toBe(false);
  });

  it('wounds gte y lte a la vez (rango cerrado)', () => {
    const cond: Condition = { wounds: { gte: 1, lte: 2 } };
    expect(evaluate(cond, makeCtx(minimal, { run: { wounds: 0 } }))).toBe(false);
    expect(evaluate(cond, makeCtx(minimal, { run: { wounds: 1 } }))).toBe(true);
    expect(evaluate(cond, makeCtx(minimal, { run: { wounds: 2 } }))).toBe(true);
    expect(evaluate(cond, makeCtx(minimal, { run: { wounds: 3 } }))).toBe(false);
  });

  it('wounds sin gte ni lte es siempre true', () => {
    expect(evaluate({ wounds: {} }, makeCtx(minimal, { run: { wounds: 0 } }))).toBe(true);
    expect(evaluate({ wounds: {} }, makeCtx(minimal, { run: { wounds: 3 } }))).toBe(true);
  });

  it('condition busca en run.conditions', () => {
    const ctx = makeCtx(minimal, { run: { conditions: ['asustado', 'empapado'] } });
    expect(evaluate({ condition: 'asustado' }, ctx)).toBe(true);
    expect(evaluate({ condition: 'envenenado' }, ctx)).toBe(false);
  });
});
