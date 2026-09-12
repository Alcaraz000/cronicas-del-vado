// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore, DEFAULT_PREFS, STORAGE_KEY, type PersistedSlice } from '@/state/store';
import { selectGameState, writeGameState } from '@/state/selectors';
import type { GameState, Run } from '@/engine/types';

interface SavedFile {
  state: PersistedSlice;
  version: number;
}

function readSaved(): SavedFile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) throw new Error('No hay guardado en localStorage');
  return JSON.parse(raw) as SavedFile;
}

function fakeRun(campaignId: string): Run {
  return {
    campaignId,
    contentVersion: 1,
    sceneId: 'p_umbral',
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: 3,
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: 7,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('store: valores por defecto y personajes', () => {
  it('arranca en inicio, sin personajes y con las prefs por defecto', () => {
    const store = createAppStore();
    const s = store.getState();
    expect(s.ui).toEqual({ screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null });
    expect(s.characters).toEqual([]);
    expect(s.activeCharacterId).toBeNull();
    expect(s.world).toEqual({ flags: [], fallen: [] });
    expect(s.seen).toEqual({});
    expect(s.prefs).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS).toEqual({ cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' });
  });

  it('createTestCharacter crea a Prueba (mago nivel 3) y lo activa', () => {
    const store = createAppStore();
    const id = store.getState().createTestCharacter();
    const s = store.getState();
    expect(s.activeCharacterId).toBe(id);
    expect(s.characters).toHaveLength(1);
    const ch = s.characters[0]!;
    expect(ch.id).toBe(id);
    expect(ch.name).toBe('Prueba');
    expect(ch.classId).toBe('mago');
    expect(ch.portrait).toBe('mago_01');
    expect(ch.level).toBe(3);
    expect(ch.xp).toBe(120);
    expect(ch.attrs).toEqual({ vigor: 0, astucia: 1, saber: 2, presencia: 1 });
    expect(ch.traits).toEqual(['aprendiz_de_escriba', 'cazador_furtivo']);
    expect(ch.flags).toEqual(['char:origen.aprendiz_de_escriba', 'char:origen.cazador_furtivo']);
    expect(ch.skills).toEqual([]);
    expect(ch.relics).toEqual([]);
    expect(ch.scars).toEqual([]);
    expect(ch.campaignLog).toEqual({});
    expect(ch.memoryNames).toEqual({});
    expect(ch.run).toBeNull();
  });

  it('createCharacter crea un personaje de nivel 1 con id único, lo activa y respeta el máximo de 3', () => {
    const store = createAppStore();
    const entrada = {
      name: 'Ana',
      classId: 'guerrero' as const,
      portrait: 'guerrero_02',
      traits: ['desertor' as const],
      attrs: { vigor: 2, astucia: 1, saber: 0, presencia: 1 },
    };
    const id1 = store.getState().createCharacter(entrada);
    const id2 = store.getState().createCharacter({ ...entrada, name: 'Bruno' });
    const id3 = store.getState().createCharacter({ ...entrada, name: 'Clara' });
    expect(new Set([id1, id2, id3]).size).toBe(3);
    const s = store.getState();
    expect(s.characters.map((c) => c.name)).toEqual(['Ana', 'Bruno', 'Clara']);
    expect(s.activeCharacterId).toBe(id3);
    expect(s.characters[0]!.level).toBe(1);
    expect(s.characters[0]!.xp).toBe(0);
    expect(s.characters[0]!.flags).toEqual(['char:origen.desertor']);
    expect(() => store.getState().createCharacter({ ...entrada, name: 'Dora' })).toThrow();
    expect(store.getState().characters).toHaveLength(3);
  });
});

describe('store: persistencia', () => {
  it('setPrefs actualiza y persiste en localStorage["juegorol"] sin ui ni acciones', () => {
    const store = createAppStore();
    store.getState().setPrefs({ cps: 80, fontScale: 1.25 });
    expect(store.getState().prefs).toEqual({ cps: 80, showOdds: true, fontScale: 1.25, reducedMotion: 'auto' });
    const saved = readSaved();
    expect(saved.version).toBe(1);
    expect(saved.state.prefs).toEqual({ cps: 80, showOdds: true, fontScale: 1.25, reducedMotion: 'auto' });
    expect(saved.state).not.toHaveProperty('ui');
    expect(saved.state).not.toHaveProperty('setPrefs');
    expect(saved.state).not.toHaveProperty('createCharacter');
    expect(Object.keys(saved.state).sort()).toEqual(['activeCharacterId', 'characters', 'prefs', 'seen', 'world']);
  });

  it('un store nuevo rehidrata lo guardado', async () => {
    const store1 = createAppStore();
    const id = store1.getState().createTestCharacter();
    store1.getState().setPrefs({ showOdds: false });

    const store2 = createAppStore();
    await store2.persist.rehydrate();
    const s = store2.getState();
    expect(s.activeCharacterId).toBe(id);
    expect(s.characters[0]!.name).toBe('Prueba');
    expect(s.prefs.showOdds).toBe(false);
    expect(s.ui.screen).toBe('inicio');
  });

  it('migrate aplica MIGRATIONS desde la versión guardada (v0 → v1 sin cambios)', async () => {
    const guardado: SavedFile = {
      version: 0,
      state: {
        characters: [],
        activeCharacterId: null,
        world: { flags: ['world:viejo'], fallen: [] },
        seen: {},
        prefs: { cps: 20, showOdds: false, fontScale: 1.5, reducedMotion: 'on' },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guardado));
    const store = createAppStore();
    await store.persist.rehydrate();
    expect(store.getState().prefs).toEqual({ cps: 20, showOdds: false, fontScale: 1.5, reducedMotion: 'on' });
    expect(store.getState().world.flags).toEqual(['world:viejo']);
    expect(readSaved().version).toBe(1);
  });

  it('sigue funcionando si localStorage lanza QuotaExceededError al escribir', () => {
    const store = createAppStore();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio', 'QuotaExceededError');
    });
    expect(() => store.getState().setPrefs({ cps: 10 })).not.toThrow();
    expect(store.getState().prefs.cps).toBe(10);
    expect(() => store.getState().createTestCharacter()).not.toThrow();
    expect(store.getState().characters).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
  });

  it('arranca con valores por defecto si localStorage lanza al leer', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Bloqueado', 'SecurityError');
    });
    const store = createAppStore();
    expect(store.getState().prefs).toEqual(DEFAULT_PREFS);
    expect(store.getState().characters).toEqual([]);
  });
});

describe('selectors', () => {
  it('selectGameState devuelve null sin personaje activo o sin run, y el GameState si hay run', () => {
    const store = createAppStore();
    expect(selectGameState(store.getState())).toBeNull();
    store.getState().createTestCharacter();
    expect(selectGameState(store.getState())).toBeNull();

    const s = store.getState();
    store.setState(
      writeGameState(s, { world: s.world, character: s.characters[0]!, run: fakeRun('prueba'), seen: {} }),
    );
    const gs = selectGameState(store.getState());
    expect(gs).not.toBeNull();
    expect(gs!.run.sceneId).toBe('p_umbral');
    expect(gs!.character.name).toBe('Prueba');
    expect(gs!.world).toEqual({ flags: [], fallen: [] });
    expect(gs!.seen).toEqual({});
  });

  it('writeGameState reemplaza el personaje, el mundo y seen de la campaña sin mutar el store', () => {
    const store = createAppStore();
    const id = store.getState().createTestCharacter();
    const s = store.getState();
    const ch = s.characters[0]!;
    const run = fakeRun('prueba');
    const gs: GameState = {
      world: { flags: ['world:x'], fallen: [] },
      character: { ...ch, xp: 999 },
      run,
      seen: { p_umbral: ['abc'] },
    };
    const patch = writeGameState(s, gs);
    expect(patch.world).toEqual({ flags: ['world:x'], fallen: [] });
    expect(patch.characters).toHaveLength(1);
    expect(patch.characters![0]!.id).toBe(id);
    expect(patch.characters![0]!.xp).toBe(999);
    expect(patch.characters![0]!.run).toEqual(run);
    expect(patch.seen).toEqual({ prueba: { p_umbral: ['abc'] } });
    expect(patch.characters).not.toBe(s.characters);
    expect(s.characters[0]!.xp).toBe(120);
    expect(s.characters[0]!.run).toBeNull();
    expect(s.seen).toEqual({});
  });
});

describe('store: ciclo de partida sin dados', () => {
  it('startRun("prueba") carga la campaña, crea el run y entra a la escena inicial', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    const promesa = store.getState().startRun('prueba');
    expect(store.getState().ui.screen).toBe('cargando');
    await promesa;

    const s = store.getState();
    expect(s.ui.screen).toBe('escena');
    expect(s.ui.error).toBeNull();
    expect(s.ui.pending).toBeNull();
    expect(s.ui.campaign?.id).toBe('prueba');

    const gs = selectGameState(s);
    expect(gs).not.toBeNull();
    expect(gs!.run.campaignId).toBe('prueba');
    expect(gs!.run.contentVersion).toBe(1);
    expect(gs!.run.fortune).toBe(3);
    expect(gs!.run.wounds).toBe(0);
    expect(gs!.run.powerUsed).toBe(false);
    expect(gs!.run.sceneId).toBe('p_umbral');
    expect(gs!.run.milestones).toContain('entrar_a_la_torre');
    expect(gs!.run.log).toHaveLength(1);
    expect(gs!.run.log[0]).toMatchObject({ kind: 'scene', sceneId: 'p_umbral' });
    expect(typeof gs!.run.rngSeed).toBe('number');

    expect(readSaved().state.characters[0]!.run?.sceneId).toBe('p_umbral');
  });

  it('dos partidas seguidas tienen semillas distintas', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    const seed1 = selectGameState(store.getState())!.run.rngSeed;
    await store.getState().startRun('prueba');
    const seed2 = selectGameState(store.getState())!.run.rngSeed;
    expect(seed1).not.toBe(seed2);
  });

  it('startRun con campaña desconocida va a error y retry vuelve a inicio si no hay run', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('no_existe');
    expect(store.getState().ui.screen).toBe('error');
    expect(store.getState().ui.error).toContain('no_existe');
    store.getState().retry();
    expect(store.getState().ui.screen).toBe('inicio');
    expect(store.getState().ui.error).toBeNull();
  });

  it('startRun sin personaje activo va a error', async () => {
    const store = createAppStore();
    await store.getState().startRun('prueba');
    expect(store.getState().ui.screen).toBe('error');
    expect(store.getState().ui.error).toBe('No hay personaje activo');
  });

  it('choose avanza a la escena siguiente, registra la elección y persiste', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    store.getState().choose('rodear_patio');

    const gs = selectGameState(store.getState())!;
    expect(store.getState().ui.screen).toBe('escena');
    expect(gs.run.sceneId).toBe('p_patio');
    expect(gs.run.visited).toEqual({ p_umbral: 1 });
    expect(gs.run.log.some((e) => e.kind === 'choice' && e.choiceId === 'rodear_patio')).toBe(true);
    expect(gs.run.log[gs.run.log.length - 1]).toMatchObject({ kind: 'scene', sceneId: 'p_patio' });
    expect(gs.character.flags).toContain('char:place.torre_abandonada');
    expect(readSaved().state.characters[0]!.run?.sceneId).toBe('p_patio');
    expect(Object.keys(readSaved().state.seen.prueba ?? {})).toContain('p_umbral');
  });

  it('continueRun retoma la partida guardada en un store nuevo', async () => {
    const store1 = createAppStore();
    store1.getState().createTestCharacter();
    await store1.getState().startRun('prueba');
    store1.getState().choose('rodear_patio');

    const store2 = createAppStore();
    await store2.persist.rehydrate();
    expect(store2.getState().ui.screen).toBe('inicio');
    expect(store2.getState().ui.campaign).toBeNull();
    await store2.getState().continueRun();
    const s = store2.getState();
    expect(s.ui.screen).toBe('escena');
    expect(s.ui.campaign?.id).toBe('prueba');
    expect(s.ui.pending).toBeNull();
    expect(selectGameState(s)!.run.sceneId).toBe('p_patio');
  });

  it('continueRun sin partida en curso vuelve a inicio', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().continueRun();
    expect(store.getState().ui.screen).toBe('inicio');
  });

  it('abandonRun marca derrota y finishRun deja run null, registra la partida y vuelve a inicio', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    store.getState().abandonRun();

    const s = store.getState();
    expect(s.ui.screen).toBe('inicio');
    expect(s.ui.campaign).toBeNull();
    expect(s.ui.pending).toBeNull();
    expect(s.ui.endSummary?.outcome).toEqual({ kind: 'defeat' });
    expect(s.characters[0]!.run).toBeNull();
    expect(s.characters[0]!.campaignLog.prueba).toMatchObject({ runs: 1, wins: 0 });
    expect(s.characters[0]!.campaignLog.prueba?.milestones).toContain('entrar_a_la_torre');
    expect(selectGameState(s)).toBeNull();
    expect(readSaved().state.characters[0]!.run).toBeNull();
  });
});
