import { describe, expect, it } from 'vitest';
import { deriveMemory } from '@/engine/memory';
import type { Campaign } from '@/content/schema';
import type { EvalContext, GameState, SeenMap } from '@/engine/types';

/** Campaña mínima con dos escenas: una con PNJ y otra sin PNJ. */
const campania: Campaign = {
  id: 'memoria_test',
  contentVersion: 1,
  title: 'Campaña de prueba de memoria',
  premise: 'Solo para tests.',
  cover: 'portada_test',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  start: 'plaza',
  scenes: {
    plaza: {
      id: 'plaza',
      kind: 'hub',
      place: 'plaza_mayor',
      npcs: ['orell', 'ilse'],
      text: ['La plaza de noche.'],
      choices: [],
    },
    callejon: {
      id: 'callejon',
      kind: 'normal',
      place: 'callejon_oscuro',
      text: ['El callejón huele a humedad.'],
      choices: [],
    },
  },
  npcs: {
    orell: { id: 'orell', name: 'Orell', portrait: 'orell', voice: 'Seco y cansado.', canonPrompt: 'sargento de barba gris' },
    ilse: { id: 'ilse', name: 'Ilse', portrait: 'ilse', voice: 'Rápida y directa.', canonPrompt: 'joven de pelo oscuro' },
  },
  places: {
    plaza_mayor: { id: 'plaza_mayor', name: 'Plaza mayor', background: 'plaza_mayor', canonPrompt: 'plaza medieval de noche' },
    callejon_oscuro: { id: 'callejon_oscuro', name: 'Callejón oscuro', background: 'callejon_oscuro', canonPrompt: 'callejón estrecho' },
  },
  items: {},
  flags: {},
  memories: {},
  milestones: {},
  clocks: {},
  endings: {},
};

interface StateOverrides {
  characterFlags?: string[];
  visited?: Record<string, number>;
  seen?: SeenMap;
}

function makeState(over: StateOverrides = {}): GameState {
  return {
    world: { flags: ['world:caido.otra'], fallen: [] },
    character: {
      id: 'pj_1',
      name: 'Prueba',
      portrait: 'mago_01',
      classId: 'mago',
      attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
      traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
      skills: [],
      level: 3,
      xp: 0,
      flags: over.characterFlags ?? [],
      memoryNames: {},
      relics: [],
      scars: [],
      campaignLog: {},
      run: null,
    },
    run: {
      campaignId: campania.id,
      contentVersion: 1,
      sceneId: 'plaza',
      flags: ['run:pista_a'],
      stagedFlags: ['char:memoria_test.apostado'],
      visited: over.visited ?? {},
      items: ['llave_de_hierro'],
      wounds: 1,
      conditions: ['asustado'],
      fortune: 2,
      powerUsed: false,
      clocks: { pelea: 1 },
      milestones: ['entrar'],
      log: [],
      rngSeed: 42,
    },
    seen: over.seen ?? {},
  };
}

function makeCtx(over: StateOverrides = {}): EvalContext {
  return { campaign: campania, state: makeState(over) };
}

describe('deriveMemory: PNJ conocidos y lugar', () => {
  it('agrega char:met.<npc> por cada PNJ de la escena y char:place.<lugar>', () => {
    const resultado = deriveMemory(makeCtx(), 'plaza', []);
    expect(resultado.character.flags).toEqual(
      expect.arrayContaining(['char:met.orell', 'char:met.ilse', 'char:place.plaza_mayor']),
    );
    expect(resultado.character.flags).toHaveLength(3);
  });

  it('en una escena sin PNJ solo agrega el lugar', () => {
    const resultado = deriveMemory(makeCtx(), 'callejon', []);
    expect(resultado.character.flags).toStrictEqual(['char:place.callejon_oscuro']);
  });

  it('no duplica flags que el personaje ya tenía', () => {
    const ctx = makeCtx({ characterFlags: ['char:met.orell', 'char:origen.desertor'] });
    const resultado = deriveMemory(ctx, 'plaza', []);
    expect(resultado.character.flags).toStrictEqual([
      'char:met.orell',
      'char:origen.desertor',
      'char:met.ilse',
      'char:place.plaza_mayor',
    ]);
  });

  it('derivar dos veces la misma escena deja los mismos flags', () => {
    const primera = deriveMemory(makeCtx(), 'plaza', []);
    const segunda = deriveMemory({ campaign: campania, state: primera }, 'plaza', []);
    expect(segunda.character.flags).toStrictEqual(primera.character.flags);
  });

  it('conserva el resto del personaje, el mundo y la partida', () => {
    const ctx = makeCtx();
    const resultado = deriveMemory(ctx, 'plaza', []);
    expect(resultado.world).toStrictEqual(ctx.state.world);
    expect(resultado.character.name).toBe('Prueba');
    expect(resultado.character.traits).toStrictEqual(['aprendiz_de_escriba', 'cazador_furtivo']);
    expect(resultado.run.flags).toStrictEqual(['run:pista_a']);
    expect(resultado.run.stagedFlags).toStrictEqual(['char:memoria_test.apostado']);
    expect(resultado.run.wounds).toBe(1);
    expect(resultado.run.conditions).toStrictEqual(['asustado']);
    expect(resultado.run.clocks).toStrictEqual({ pelea: 1 });
    expect(resultado.run.sceneId).toBe('plaza');
  });

  it('lanza un error en español si la escena no existe en la campaña', () => {
    expect(() => deriveMemory(makeCtx(), 'no_existe', [])).toThrow('Escena desconocida: no_existe');
  });
});

describe('deriveMemory: visitas y párrafos vistos', () => {
  it('la primera visita completa pone run.visited[sceneId] en 1', () => {
    const resultado = deriveMemory(makeCtx(), 'plaza', []);
    expect(resultado.run.visited).toStrictEqual({ plaza: 1 });
  });

  it('cada derivación incrementa el contador de esa escena y respeta las otras', () => {
    const resultado = deriveMemory(makeCtx({ visited: { plaza: 2, callejon: 1 } }), 'plaza', []);
    expect(resultado.run.visited).toStrictEqual({ plaza: 3, callejon: 1 });
  });

  it('crea seen[sceneId] con los hashes cuando la escena no estaba', () => {
    const resultado = deriveMemory(makeCtx(), 'plaza', ['h1', 'h2']);
    expect(resultado.seen).toStrictEqual({ plaza: ['h1', 'h2'] });
  });

  it('une los hashes con los ya vistos sin duplicar y conserva las otras escenas', () => {
    const ctx = makeCtx({ seen: { plaza: ['h1'], callejon: ['h9'] } });
    const resultado = deriveMemory(ctx, 'plaza', ['h1', 'h2', 'h2']);
    expect(resultado.seen).toStrictEqual({ plaza: ['h1', 'h2'], callejon: ['h9'] });
  });

  it('con hashes vacíos deja seen[sceneId] como lista vacía si no existía', () => {
    const resultado = deriveMemory(makeCtx(), 'callejon', []);
    expect(resultado.seen).toStrictEqual({ callejon: [] });
  });
});

/** Congela recursivamente: si la implementación mutara la entrada, lanzaría TypeError (los módulos ES corren en modo estricto). */
function congelar<T>(valor: T): T {
  if (valor !== null && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.freeze(valor);
    for (const clave of Object.keys(valor as Record<string, unknown>)) {
      congelar((valor as Record<string, unknown>)[clave]);
    }
  }
  return valor;
}

describe('deriveMemory: pureza y encadenado', () => {
  it('no muta el estado de entrada (congelado) y devuelve objetos nuevos', () => {
    const ctx = makeCtx({ characterFlags: ['char:met.orell'], visited: { plaza: 1 }, seen: { plaza: ['h1'] } });
    congelar(ctx);
    const foto = JSON.stringify(ctx.state);
    const resultado = deriveMemory(ctx, 'plaza', ['h2']);
    expect(JSON.stringify(ctx.state)).toBe(foto);
    expect(resultado).not.toBe(ctx.state);
    expect(resultado.character).not.toBe(ctx.state.character);
    expect(resultado.character.flags).not.toBe(ctx.state.character.flags);
    expect(resultado.run).not.toBe(ctx.state.run);
    expect(resultado.run.visited).not.toBe(ctx.state.run.visited);
    expect(resultado.seen).not.toBe(ctx.state.seen);
    expect(resultado.seen['plaza']).not.toBe(ctx.state.seen['plaza']);
  });

  it('no muta la lista de hashes que recibe', () => {
    const hashes = ['h1', 'h1'];
    deriveMemory(makeCtx(), 'plaza', hashes);
    expect(hashes).toStrictEqual(['h1', 'h1']);
  });

  it('el resultado sirve como entrada de otra derivación (encadenable)', () => {
    const primera = deriveMemory(makeCtx(), 'plaza', ['h1']);
    const segunda = deriveMemory({ campaign: campania, state: primera }, 'callejon', ['h5']);
    expect(segunda.run.visited).toStrictEqual({ plaza: 1, callejon: 1 });
    expect(segunda.seen).toStrictEqual({ plaza: ['h1'], callejon: ['h5'] });
    expect(segunda.character.flags).toStrictEqual([
      'char:met.orell',
      'char:met.ilse',
      'char:place.plaza_mayor',
      'char:place.callejon_oscuro',
    ]);
  });
});
