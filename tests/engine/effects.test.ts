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

describe('applyEffects: objetos', () => {
  it('give agrega el objeto a run.items', () => {
    const result = applyEffects([{ give: 'llave_de_hierro' }], contexto());
    expect(result.run.items).toEqual(['llave_de_hierro']);
  });

  it('give ignora un objeto que ya se tiene', () => {
    const ctx = contexto({ items: ['llave_de_hierro'] });
    const result = applyEffects([{ give: 'llave_de_hierro' }], ctx);
    expect(result.run.items).toEqual(['llave_de_hierro']);
  });

  it('give ignora el objeto si ya hay maxItems (6) objetos', () => {
    const seis = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'];
    const ctx = contexto({ items: seis });
    const result = applyEffects([{ give: 'o7' }], ctx);
    expect(result.run.items).toEqual(seis);
  });

  it('give con 5 objetos agrega el sexto', () => {
    const ctx = contexto({ items: ['o1', 'o2', 'o3', 'o4', 'o5'] });
    const result = applyEffects([{ give: 'o6' }], ctx);
    expect(result.run.items).toEqual(['o1', 'o2', 'o3', 'o4', 'o5', 'o6']);
  });

  it('take quita el objeto si está', () => {
    const ctx = contexto({ items: ['llave_de_hierro', 'antorcha'] });
    const result = applyEffects([{ take: 'llave_de_hierro' }], ctx);
    expect(result.run.items).toEqual(['antorcha']);
  });

  it('take de un objeto ausente deja la lista igual', () => {
    const ctx = contexto({ items: ['antorcha'] });
    const result = applyEffects([{ take: 'llave_de_hierro' }], ctx);
    expect(result.run.items).toEqual(['antorcha']);
  });

  it('give seguido de take deja la lista vacía (se aplican en orden)', () => {
    const result = applyEffects([{ give: 'llave_de_hierro' }, { take: 'llave_de_hierro' }], contexto());
    expect(result.run.items).toEqual([]);
  });
});

describe('applyEffects: hitos', () => {
  it('milestone agrega el hito a run.milestones', () => {
    const result = applyEffects([{ milestone: 'entrar' }], contexto());
    expect(result.run.milestones).toEqual(['entrar']);
  });

  it('milestone no duplica un hito ya alcanzado', () => {
    const ctx = contexto({ milestones: ['entrar'] });
    const result = applyEffects([{ milestone: 'entrar' }], ctx);
    expect(result.run.milestones).toEqual(['entrar']);
  });
});

describe('applyEffects: relojes', () => {
  it('clock suma delta partiendo de 0 si el reloj no tenía valor', () => {
    const result = applyEffects([{ clock: 'pelea', delta: 1 }], contexto());
    expect(result.run.clocks).toEqual({ pelea: 1 });
  });

  it('clock no supera el max declarado en la campaña', () => {
    const ctx = contexto({ clocks: { pelea: 1 } });
    const result = applyEffects([{ clock: 'pelea', delta: 5 }], ctx);
    expect(result.run.clocks).toEqual({ pelea: 2 });
  });

  it('clock no baja de 0', () => {
    const ctx = contexto({ clocks: { pelea: 1 } });
    const result = applyEffects([{ clock: 'pelea', delta: -3 }], ctx);
    expect(result.run.clocks).toEqual({ pelea: 0 });
  });

  it('clock con delta 0 deja el reloj en su valor (y lo crea en 0 si no existía)', () => {
    const result = applyEffects([{ clock: 'pelea', delta: 0 }], contexto());
    expect(result.run.clocks).toEqual({ pelea: 0 });
  });

  it('clock de un reloj no declarado en la campaña no cambia nada', () => {
    const result = applyEffects([{ clock: 'inexistente', delta: 1 }], contexto());
    expect(result.run.clocks).toEqual({});
  });

  it('clock no muta el objeto clocks de entrada', () => {
    const ctx = contexto({ clocks: { pelea: 1 } });
    const result = applyEffects([{ clock: 'pelea', delta: 1 }], ctx);
    expect(ctx.state.run.clocks).toEqual({ pelea: 1 });
    expect(result.run.clocks).not.toBe(ctx.state.run.clocks);
  });
});

describe('applyEffects: heridas', () => {
  it('wound 1 desde Sano deja Herido (1)', () => {
    const result = applyEffects([{ wound: 1 }], contexto({ wounds: 0 }));
    expect(result.run.wounds).toBe(1);
  });

  it('wound 2 desde Sano deja Malherido (2)', () => {
    const result = applyEffects([{ wound: 2 }], contexto({ wounds: 0 }));
    expect(result.run.wounds).toBe(2);
  });

  it('wound satura en 3 (Caído)', () => {
    const result = applyEffects([{ wound: 2 }], contexto({ wounds: 2 }));
    expect(result.run.wounds).toBe(3);
  });

  it('heal baja una Herida', () => {
    const result = applyEffects([{ heal: 1 }], contexto({ wounds: 2 }));
    expect(result.run.wounds).toBe(1);
  });

  it('heal no baja de 0', () => {
    const result = applyEffects([{ heal: 1 }], contexto({ wounds: 0 }));
    expect(result.run.wounds).toBe(0);
  });
});

describe('applyEffects: condiciones', () => {
  it('addCondition agrega la condición', () => {
    const result = applyEffects([{ addCondition: 'asustado' }], contexto());
    expect(result.run.conditions).toEqual(['asustado']);
  });

  it('addCondition no duplica una condición ya presente', () => {
    const ctx = contexto({ conditions: ['asustado'] });
    const result = applyEffects([{ addCondition: 'asustado' }], ctx);
    expect(result.run.conditions).toEqual(['asustado']);
  });

  it('addCondition con 3 condiciones reemplaza la más antigua (índice 0)', () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado', 'exhausto'] });
    const result = applyEffects([{ addCondition: 'empapado' }], ctx);
    expect(result.run.conditions).toEqual(['asustado', 'exhausto', 'empapado']);
  });

  it('addCondition con 3 condiciones y una ya presente no cambia nada', () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado', 'exhausto'] });
    const result = applyEffects([{ addCondition: 'asustado' }], ctx);
    expect(result.run.conditions).toEqual(['envenenado', 'asustado', 'exhausto']);
  });

  it('removeCondition con id quita solo esa condición', () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado'] });
    const result = applyEffects([{ removeCondition: 'asustado' }], ctx);
    expect(result.run.conditions).toEqual(['envenenado']);
  });

  it("removeCondition 'all' vacía la lista", () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado', 'exhausto'] });
    const result = applyEffects([{ removeCondition: 'all' }], ctx);
    expect(result.run.conditions).toEqual([]);
  });

  it('removeCondition de una condición ausente deja la lista igual', () => {
    const ctx = contexto({ conditions: ['envenenado'] });
    const result = applyEffects([{ removeCondition: 'perseguido' }], ctx);
    expect(result.run.conditions).toEqual(['envenenado']);
  });

  it('no muta la lista de condiciones de entrada', () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado', 'exhausto'] });
    applyEffects([{ addCondition: 'empapado' }], ctx);
    expect(ctx.state.run.conditions).toEqual(['envenenado', 'asustado', 'exhausto']);
  });
});
