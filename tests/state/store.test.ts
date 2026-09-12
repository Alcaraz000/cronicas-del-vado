// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore, DEFAULT_PREFS, STORAGE_KEY, type AppStore, type PersistedSlice } from '@/state/store';
import {
  atributosParaSubir,
  habilidadesParaElegir,
  hayPremiosPorElegir,
  selectActiveCharacter,
  selectGameState,
  writeGameState,
} from '@/state/selectors';
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

/** Marca al personaje activo como muerto, como deja endRun a quien cae en una escena mortal. */
function matarAlActivo(store: AppStore): void {
  const { characters, activeCharacterId } = store.getState();
  store.setState({
    characters: characters.map((c) =>
      c.id === activeCharacterId ? { ...c, run: null, dead: { campaign: 'prueba', scene: 'p_cripta' } } : c,
    ),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('store: valores por defecto y personajes', () => {
  it('arranca en inicio, sin personajes y con las prefs por defecto', () => {
    const store = createAppStore();
    const s = store.getState();
    expect(s.ui).toEqual({
      screen: 'inicio',
      campaign: null,
      pending: null,
      error: null,
      endSummary: null,
      ganancia: null,
      subidaPendiente: null,
    });
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

  it('startRun con una partida en curso la cierra como derrota antes de empezar la nueva', async () => {
    // El motor asume que TODA partida termina por endRun: pisar character.run dejaba la partida
    // sin contar en el registro, sin derrota y sin resumen.
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    store.getState().choose('rodear_patio');
    const semillaVieja = selectGameState(store.getState())!.run.rngSeed;

    await store.getState().startRun('prueba');

    const s = store.getState();
    const registro = s.characters[0]!.campaignLog['prueba'];
    expect(registro).toMatchObject({ runs: 1, wins: 0 });
    expect(registro?.milestones).toContain('entrar_a_la_torre');
    expect(s.ui.screen).toBe('escena');
    expect(s.ui.endSummary).toBeNull();
    const gs = selectGameState(s)!;
    expect(gs.run.rngSeed).not.toBe(semillaVieja);
    expect(gs.run.sceneId).toBe('p_umbral');
    expect(gs.run.log).toHaveLength(1);
  });

  it('una partida ya terminada que no se cerró (recarga parada en el fin) conserva su desenlace', async () => {
    // Camino real: llegás a un final, te quedás en la pantalla de fin sin tocar "Volver al inicio"
    // y recargás. `ui` no se persiste, así que volvés a inicio con character.run todavía puesto,
    // con su outcome adentro. Empezar otra partida no puede convertir esa victoria en derrota.
    const store1 = createAppStore();
    store1.getState().createTestCharacter();
    await store1.getState().startRun('prueba');
    store1.getState().choose('rodear_patio');
    store1.getState().choose('rendirse');
    store1.getState().choose('salir');
    expect(store1.getState().ui.screen).toBe('fin');
    expect(selectGameState(store1.getState())!.run.outcome).toEqual({ kind: 'ending', endingId: 'fin_huida' });

    const store2 = createAppStore();
    await store2.persist.rehydrate();
    expect(store2.getState().ui.screen).toBe('inicio');

    await store2.getState().startRun('prueba');

    const s = store2.getState();
    const registro = s.characters[0]!.campaignLog['prueba'];
    expect(registro).toMatchObject({ runs: 1, wins: 1, canonEnding: 'fin_huida' });
    expect(registro?.endings).toContain('fin_huida');
    expect(s.ui.screen).toBe('escena');
    expect(selectGameState(s)!.run.sceneId).toBe('p_umbral');
  });

  it('cierra la partida en curso aunque la campaña no esté cargada en ui (recarga sin continuar)', async () => {
    const store1 = createAppStore();
    store1.getState().createTestCharacter();
    await store1.getState().startRun('prueba');

    const store2 = createAppStore();
    await store2.persist.rehydrate();
    expect(store2.getState().ui.campaign).toBeNull();
    expect(store2.getState().characters[0]!.run).not.toBeNull();

    await store2.getState().startRun('prueba');

    const s = store2.getState();
    expect(s.characters[0]!.campaignLog['prueba']).toMatchObject({ runs: 1, wins: 0 });
    expect(s.ui.screen).toBe('escena');
    expect(selectGameState(s)!.run.log).toHaveLength(1);
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

  it('startRun rechaza un personaje muerto: el muerto no vuelve', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    matarAlActivo(store);

    await store.getState().startRun('prueba');

    expect(store.getState().ui.screen).toBe('error');
    expect(store.getState().ui.error).toContain('murió');
    expect(selectGameState(store.getState())).toBeNull();
    expect(store.getState().characters[0]!.run).toBeNull();
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

  it('abandonRun marca derrota y finishRun deja run null, registra la partida y queda en la pantalla de fin', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    store.getState().abandonRun();

    const s = store.getState();
    // Queda en 'fin' para mostrar la derrota y la XP conservada; salir de ahí es cosa de goTo.
    expect(s.ui.screen).toBe('fin');
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

describe('store: tirada en dos fases y recarga', () => {
  async function enUmbral(): Promise<AppStore> {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    return store;
  }

  it('beginRoll deja ui.pending completo y run.pending mínimo persistido', async () => {
    const store = await enUmbral();
    store.getState().beginRoll('leer_inscripcion');

    const s = store.getState();
    expect(s.ui.screen).toBe('escena');
    const pending = s.ui.pending;
    expect(pending).not.toBeNull();
    expect(pending!.choiceId).toBe('leer_inscripcion');
    expect(pending!.sceneId).toBe('p_umbral');
    expect(pending!.preview.attr).toBe('saber');
    expect(pending!.preview.mode).toBe('advantage');
    expect(pending!.dice).toHaveLength(3);
    expect(pending!.kept).toHaveLength(2);
    expect(pending!.rerolls).toEqual([]);
    expect(pending!.powerUsed).toBe(false);
    expect(pending!.canReroll).toBe(true);

    const esperado = { choiceId: 'leer_inscripcion', rerolls: [], powerUsed: false };
    expect(selectGameState(s)!.run.pending).toEqual(esperado);
    expect(selectGameState(s)!.run.sceneId).toBe('p_umbral');
    expect(readSaved().state.characters[0]!.run?.pending).toEqual(esperado);
  });

  it('rerollDie repite solo ese dado y registra el índice en run.pending.rerolls', async () => {
    const store = await enUmbral();
    store.getState().beginRoll('leer_inscripcion');
    const antes = store.getState().ui.pending!;
    store.getState().rerollDie(1);

    const s = store.getState();
    const despues = s.ui.pending!;
    expect(despues.rerolls).toEqual([1]);
    expect(despues.dice[0]).toBe(antes.dice[0]);
    expect(despues.dice[2]).toBe(antes.dice[2]);
    expect(despues.canReroll).toBe(true);
    expect(selectGameState(s)!.run.pending).toEqual({ choiceId: 'leer_inscripcion', rerolls: [1], powerUsed: false });
    expect(selectGameState(s)!.run.fortune).toBe(3);
    expect(readSaved().state.characters[0]!.run?.pending?.rerolls).toEqual([1]);

    store.getState().rerollDie(0);
    expect(store.getState().ui.pending!.rerolls).toEqual([1, 0]);
    expect(selectGameState(store.getState())!.run.pending?.rerolls).toEqual([1, 0]);
  });

  it('usePower actualiza ui.pending y run.pending.powerUsed solo cuando aplica', async () => {
    const store = await enUmbral();
    store.getState().beginRoll('leer_inscripcion');
    const antes = store.getState().ui.pending!;
    store.getState().usePower();
    const despues = store.getState().ui.pending!;
    if (antes.canUsePower) {
      expect(despues.band).toBe('partial');
      expect(despues.powerUsed).toBe(true);
      expect(despues.canUsePower).toBe(false);
      expect(selectGameState(store.getState())!.run.pending?.powerUsed).toBe(true);
    } else {
      expect(despues).toEqual(antes);
      expect(selectGameState(store.getState())!.run.pending?.powerUsed).toBe(false);
    }
  });

  it('tras recargar, continueRun reconstruye el mismo pending (mismos dados y repeticiones)', async () => {
    const store1 = await enUmbral();
    store1.getState().beginRoll('leer_inscripcion');
    store1.getState().rerollDie(2);
    store1.getState().rerollDie(0);
    const antes = store1.getState().ui.pending!;
    expect(antes.rerolls).toEqual([2, 0]);

    const saved = readSaved();
    expect(saved.version).toBe(1);
    expect(saved.state.characters[0]!.run?.pending).toEqual({ choiceId: 'leer_inscripcion', rerolls: [2, 0], powerUsed: false });

    const store2 = createAppStore();
    await store2.persist.rehydrate();
    expect(store2.getState().ui.pending).toBeNull();
    await store2.getState().continueRun();

    const s = store2.getState();
    expect(s.ui.screen).toBe('escena');
    const despues = s.ui.pending;
    expect(despues).not.toBeNull();
    expect(despues!.choiceId).toBe('leer_inscripcion');
    expect(despues!.dice).toEqual(antes.dice);
    expect(despues!.kept).toEqual(antes.kept);
    expect(despues!.total).toBe(antes.total);
    expect(despues!.band).toBe(antes.band);
    expect(despues!.rerolls).toEqual([2, 0]);
    expect(despues!.canReroll).toBe(true);
    expect(despues!.preview).toEqual(antes.preview);
  });

  it('commitRoll limpia pending, gasta la Fortuna usada, registra la tirada y avanza', async () => {
    const store = await enUmbral();
    store.getState().beginRoll('leer_inscripcion');
    store.getState().rerollDie(0);
    store.getState().commitRoll();

    const s = store.getState();
    expect(s.ui.pending).toBeNull();
    expect(s.ui.screen).toBe('escena');
    const gs = selectGameState(s)!;
    expect(gs.run.pending).toBeUndefined();
    expect(gs.run.sceneId).toBe('p_biblioteca');
    expect(gs.run.fortune).toBe(2);
    const tirada = gs.run.log.find((e) => e.kind === 'roll');
    expect(tirada).toBeDefined();
    expect(tirada).toMatchObject({ kind: 'roll', fortuneSpent: 1 });
    expect(gs.run.log.some((e) => e.kind === 'choice' && e.choiceId === 'leer_inscripcion')).toBe(true);
    expect(gs.run.log[gs.run.log.length - 1]).toMatchObject({ kind: 'scene', sceneId: 'p_biblioteca' });
    expect(readSaved().state.characters[0]!.run?.pending).toBeUndefined();
    expect(readSaved().state.characters[0]!.run?.sceneId).toBe('p_biblioteca');
  });

  it('rerollDie, usePower y commitRoll no hacen nada sin pending', async () => {
    const store = await enUmbral();
    const antes = selectGameState(store.getState())!;
    store.getState().rerollDie(0);
    store.getState().usePower();
    store.getState().commitRoll();
    expect(store.getState().ui.pending).toBeNull();
    expect(selectGameState(store.getState())).toEqual(antes);
  });
});

// ---------------------------------------------------------------------------
// Fase C: navegación, personajes, XP y guardado exportable.
// ---------------------------------------------------------------------------

const ANA = {
  name: 'Ana',
  classId: 'guerrero' as const,
  portrait: 'guerrero_02',
  traits: ['desertor' as const, 'hijo_de_molinero' as const],
  attrs: { vigor: 2, astucia: 1, saber: 1, presencia: 0 },
};

/** Lleva una partida de 'prueba' hasta el final 'fin_huida' (victoria) sin tocar dados. */
async function hastaLaVictoria(store: AppStore): Promise<void> {
  await store.getState().startRun('prueba');
  store.getState().choose('rodear_patio');
  store.getState().choose('rendirse');
  store.getState().choose('salir');
}

describe('store: navegación', () => {
  it('goTo cambia de pantalla y limpia el error al salir de la pantalla de error', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('no_existe');
    expect(store.getState().ui.screen).toBe('error');

    store.getState().goTo('hub');
    expect(store.getState().ui.screen).toBe('hub');
    expect(store.getState().ui.error).toBeNull();

    store.getState().goTo('creacion');
    expect(store.getState().ui.screen).toBe('creacion');
  });

  it('selectCharacter cambia el activo y olvida la partida de la ui anterior', async () => {
    const store = createAppStore();
    const id1 = store.getState().createCharacter(ANA);
    const id2 = store.getState().createCharacter({ ...ANA, name: 'Bruno' });
    expect(store.getState().activeCharacterId).toBe(id2);

    await store.getState().startRun('prueba');
    expect(store.getState().ui.campaign?.id).toBe('prueba');

    store.getState().selectCharacter(id1);
    const s = store.getState();
    expect(s.activeCharacterId).toBe(id1);
    expect(s.ui.campaign).toBeNull();
    expect(s.ui.pending).toBeNull();
    expect(s.ui.endSummary).toBeNull();
    // La partida del otro personaje sigue guardada en él, no se pierde.
    expect(s.characters.find((c) => c.id === id2)?.run?.campaignId).toBe('prueba');
    expect(selectGameState(s)).toBeNull();
  });

  it('selectCharacter ignora un id que no existe', () => {
    const store = createAppStore();
    const id = store.getState().createCharacter(ANA);
    store.getState().selectCharacter('fantasma');
    expect(store.getState().activeCharacterId).toBe(id);
  });
});

describe('store: creación y borrado de personajes', () => {
  it('createTestCharacter también respeta el tope de 3 personajes', () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    store.getState().createTestCharacter();
    store.getState().createTestCharacter();
    expect(() => store.getState().createTestCharacter()).toThrow(/3 personajes/);
    expect(store.getState().characters).toHaveLength(3);
  });

  it('createCharacter rechaza un rasgo que choca con la Debilidad de la clase', () => {
    const store = createAppStore();
    // Guerrero tiene Debilidad `sigilo` y Cazador furtivo es un rasgo `sigilo`.
    expect(() =>
      store.getState().createCharacter({ ...ANA, traits: ['desertor', 'cazador_furtivo'] }),
    ).toThrow(/Debilidad/);
    expect(store.getState().characters).toHaveLength(0);
    expect(store.getState().activeCharacterId).toBeNull();
  });

  it('createCharacter rechaza rasgos repetidos y más de dos rasgos', () => {
    const store = createAppStore();
    expect(() => store.getState().createCharacter({ ...ANA, traits: ['desertor', 'desertor'] })).toThrow();
    expect(() =>
      store.getState().createCharacter({ ...ANA, traits: ['desertor', 'hijo_de_molinero', 'contrabandista'] }),
    ).toThrow();
    expect(store.getState().characters).toHaveLength(0);
  });

  it('createCharacter rechaza un reparto de atributos que no es 2/1/1/0', () => {
    const store = createAppStore();
    expect(() =>
      store.getState().createCharacter({ ...ANA, attrs: { vigor: 4, astucia: 0, saber: 0, presencia: 0 } }),
    ).toThrow(/2\/1\/1\/0/);
    expect(() =>
      store.getState().createCharacter({ ...ANA, attrs: { vigor: 2, astucia: 2, saber: 1, presencia: 1 } }),
    ).toThrow();
    expect(store.getState().characters).toHaveLength(0);
  });

  it('deleteCharacter borra y deja activo a otro; borrar el último deja el perfil sin activo', () => {
    const store = createAppStore();
    const id1 = store.getState().createCharacter(ANA);
    const id2 = store.getState().createCharacter({ ...ANA, name: 'Bruno' });
    expect(store.getState().activeCharacterId).toBe(id2);

    store.getState().deleteCharacter(id2);
    let s = store.getState();
    expect(s.characters.map((c) => c.name)).toEqual(['Ana']);
    expect(s.activeCharacterId).toBe(id1);
    expect(readSaved().state.characters).toHaveLength(1);

    store.getState().deleteCharacter(id1);
    s = store.getState();
    expect(s.characters).toEqual([]);
    expect(s.activeCharacterId).toBeNull();
    expect(readSaved().state.activeCharacterId).toBeNull();
  });

  it('borrar un personaje que no es el activo no cambia el activo', () => {
    const store = createAppStore();
    const id1 = store.getState().createCharacter(ANA);
    const id2 = store.getState().createCharacter({ ...ANA, name: 'Bruno' });
    store.getState().deleteCharacter(id1);
    expect(store.getState().activeCharacterId).toBe(id2);
  });

  it('borrar al activo con una partida en curso saca al jugador de la escena', async () => {
    const store = createAppStore();
    const id1 = store.getState().createCharacter(ANA);
    const id2 = store.getState().createCharacter({ ...ANA, name: 'Bruno' });
    await store.getState().startRun('prueba');
    expect(store.getState().ui.screen).toBe('escena');

    store.getState().deleteCharacter(id2);
    const s = store.getState();
    expect(s.activeCharacterId).toBe(id1);
    expect(s.ui.screen).toBe('hub');
    expect(s.ui.campaign).toBeNull();
    expect(selectGameState(s)).toBeNull();
  });

  it('borrar al único personaje durante una partida vuelve a inicio', async () => {
    const store = createAppStore();
    const id = store.getState().createCharacter(ANA);
    await store.getState().startRun('prueba');
    store.getState().deleteCharacter(id);
    expect(store.getState().ui.screen).toBe('inicio');
    expect(store.getState().activeCharacterId).toBeNull();
  });

  it('deleteCharacter con un id desconocido no hace nada', () => {
    const store = createAppStore();
    const id = store.getState().createCharacter(ANA);
    store.getState().deleteCharacter('fantasma');
    expect(store.getState().characters).toHaveLength(1);
    expect(store.getState().activeCharacterId).toBe(id);
  });

  it('un slot liberado deja volver a crear (la deuda del personaje de prueba acumulado)', () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    const id2 = store.getState().createTestCharacter();
    store.getState().createTestCharacter();
    expect(() => store.getState().createTestCharacter()).toThrow();
    store.getState().deleteCharacter(id2);
    expect(() => store.getState().createTestCharacter()).not.toThrow();
    expect(store.getState().characters).toHaveLength(3);
  });
});

describe('store: XP y subida de nivel al terminar', () => {
  it('finishRun otorga la XP, sube el nivel y deja la ganancia y la subida en ui', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter(); // mago nivel 3, 120 XP
    await hastaLaVictoria(store);
    expect(store.getState().ui.screen).toBe('fin');

    store.getState().finishRun();
    const s = store.getState();
    // 1 hito nuevo (10) + final nuevo (30) + primera victoria en 'prueba' [3,5] a nivel 3, Pareja (40).
    expect(s.ui.ganancia).not.toBeNull();
    expect(s.ui.ganancia!.total).toBe(80);
    expect(s.ui.ganancia!.detalle.length).toBeGreaterThan(0);
    expect(s.ui.endSummary?.xp.otorgada).toBe(80);
    expect(s.ui.endSummary?.xp.descartada).toBe(0);

    const ch = s.characters[0]!;
    expect(ch.xp).toBe(200);
    expect(ch.level).toBe(4);
    expect(ch.run).toBeNull();
    expect(s.ui.subidaPendiente).toEqual({ desde: 3, hasta: 4, premios: [{ kind: 'atributo' }] });
    // La pantalla de fin sigue en pie para mostrarlo.
    expect(s.ui.screen).toBe('fin');
    expect(readSaved().state.characters[0]!.xp).toBe(200);
  });

  it('repetir la campaña no vuelve a pagar hitos, final ni bono', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await hastaLaVictoria(store);
    store.getState().finishRun();
    store.getState().aplicarPremioDeNivel({ kind: 'atributo', attr: 'saber' });

    await hastaLaVictoria(store);
    store.getState().finishRun();

    const s = store.getState();
    expect(s.ui.ganancia!.total).toBe(0);
    expect(s.ui.subidaPendiente).toBeNull();
    expect(s.characters[0]!.xp).toBe(200);
    expect(s.characters[0]!.level).toBe(4);
  });

  it('el tope de la campaña descarta la XP sobrante y lo dice', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    // 'prueba' es [3, 5]: el tope es nivel 6 = 300 XP acumulados.
    const { characters } = store.getState();
    store.setState({ characters: characters.map((c) => ({ ...c, xp: 290, level: 5 })) });

    await hastaLaVictoria(store);
    store.getState().finishRun();

    const s = store.getState();
    const xp = s.ui.endSummary!.xp;
    expect(xp.ganancia.total).toBe(80);
    expect(xp.otorgada).toBe(10);
    expect(xp.descartada).toBe(70);
    expect(xp.topeNivel).toBe(6);
    expect(xp.topeAlcanzado).toBe(true);
    expect(s.characters[0]!.xp).toBe(300);
    expect(s.characters[0]!.level).toBe(6);
  });

  it('aplicarPremioDeNivel sube el atributo elegido y consume el premio', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await hastaLaVictoria(store);
    store.getState().finishRun();
    expect(store.getState().ui.subidaPendiente?.premios).toEqual([{ kind: 'atributo' }]);

    store.getState().aplicarPremioDeNivel({ kind: 'atributo', attr: 'saber' });

    const s = store.getState();
    expect(s.characters[0]!.attrs.saber).toBe(3);
    expect(s.ui.subidaPendiente).toBeNull();
    expect(readSaved().state.characters[0]!.attrs.saber).toBe(3);

    // Sin premio pendiente no vuelve a subir nada.
    store.getState().aplicarPremioDeNivel({ kind: 'atributo', attr: 'saber' });
    expect(store.getState().characters[0]!.attrs.saber).toBe(3);
  });

  it('aplicarPremioDeNivel respeta el techo del atributo y la regla de identidad', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter(); // mago: Debilidad `fisico`
    const { characters } = store.getState();
    store.setState({
      characters: characters.map((c) => ({ ...c, attrs: { ...c.attrs, saber: 5 } })),
    });
    await hastaLaVictoria(store);
    store.getState().finishRun();

    expect(() => store.getState().aplicarPremioDeNivel({ kind: 'atributo', attr: 'saber' })).toThrow(/5/);
    expect(store.getState().ui.subidaPendiente).not.toBeNull();

    // Veterano es `fisico`: prohibida para el mago aunque el premio pendiente sea de habilidad.
    store.setState({
      ui: {
        ...store.getState().ui,
        subidaPendiente: { desde: 4, hasta: 5, premios: [{ kind: 'habilidad' }, { kind: 'fortuna' }] },
      },
    });
    expect(() => store.getState().aplicarPremioDeNivel({ kind: 'habilidad', skill: 'veterano' })).toThrow(
      /Debilidad/,
    );
    store.getState().aplicarPremioDeNivel({ kind: 'habilidad', skill: 'erudito_de_runas' });
    expect(store.getState().characters[0]!.skills).toEqual(['erudito_de_runas']);
    // El premio automático queda a la vista; no hay nada más que elegir.
    expect(store.getState().ui.subidaPendiente?.premios).toEqual([{ kind: 'fortuna' }]);
  });

  it('finishRun dos veces seguidas no borra lo que la pantalla de fin está mostrando', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await hastaLaVictoria(store);
    store.getState().finishRun();
    store.getState().finishRun();
    const s = store.getState();
    expect(s.ui.screen).toBe('fin');
    expect(s.ui.endSummary).not.toBeNull();
    expect(s.ui.subidaPendiente).not.toBeNull();
    expect(s.characters[0]!.xp).toBe(200);
  });

  it('startRun limpia la ganancia y la subida pendiente de la partida anterior', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await hastaLaVictoria(store);
    store.getState().finishRun();
    expect(store.getState().ui.subidaPendiente).not.toBeNull();

    await store.getState().startRun('prueba');
    expect(store.getState().ui.subidaPendiente).toBeNull();
    expect(store.getState().ui.ganancia).toBeNull();
    expect(store.getState().ui.endSummary).toBeNull();
  });
});

describe('store: exportar e importar el guardado', () => {
  it('exportSave devuelve el wrapper { state, version } con lo mismo que localStorage', async () => {
    const store = createAppStore();
    store.getState().createCharacter(ANA);
    await store.getState().startRun('prueba');

    const json = store.getState().exportSave();
    const exportado = JSON.parse(json) as SavedFile;
    expect(exportado.version).toBe(1);
    expect(Object.keys(exportado.state).sort()).toEqual([
      'activeCharacterId',
      'characters',
      'prefs',
      'seen',
      'world',
    ]);
    expect(exportado).toEqual(readSaved());
  });

  it('importSave restaura un guardado con dos personajes y una partida en curso', async () => {
    const origen = createAppStore();
    const id1 = origen.getState().createCharacter(ANA);
    const id2 = origen.getState().createCharacter({ ...ANA, name: 'Bruno' });
    origen.getState().setPrefs({ cps: 80, fontScale: 1.5 });
    await origen.getState().startRun('prueba');
    origen.getState().choose('rodear_patio');
    const json = origen.getState().exportSave();

    localStorage.clear();
    const destino = createAppStore();
    destino.getState().createTestCharacter();
    const r = destino.getState().importSave(json);
    expect(r).toEqual({ ok: true });

    const s = destino.getState();
    expect(s.characters.map((c) => c.name)).toEqual(['Ana', 'Bruno']);
    expect(s.characters.map((c) => c.id)).toEqual([id1, id2]);
    expect(s.activeCharacterId).toBe(id2);
    expect(s.prefs).toEqual({ cps: 80, showOdds: true, fontScale: 1.5, reducedMotion: 'auto' });
    expect(s.ui.screen).toBe('inicio');
    expect(s.ui.campaign).toBeNull();
    expect(s.ui.pending).toBeNull();

    const gs = selectGameState(s)!;
    expect(gs.run.campaignId).toBe('prueba');
    expect(gs.run.sceneId).toBe('p_patio');
    expect(gs.seen).toEqual(selectGameState(origen.getState())!.seen);
    // Y queda guardado: importar es tan definitivo como jugar.
    expect(readSaved().state.characters).toHaveLength(2);

    // Ida y vuelta completa: lo exportado desde el destino es idéntico a lo importado.
    expect(JSON.parse(destino.getState().exportSave())).toEqual(JSON.parse(json));
  });

  it('la partida importada se puede continuar, con su tirada a medias incluida', async () => {
    const origen = createAppStore();
    origen.getState().createTestCharacter();
    await origen.getState().startRun('prueba');
    origen.getState().beginRoll('leer_inscripcion');
    origen.getState().rerollDie(1);
    const antes = origen.getState().ui.pending!;
    const json = origen.getState().exportSave();

    localStorage.clear();
    const destino = createAppStore();
    expect(destino.getState().importSave(json).ok).toBe(true);
    await destino.getState().continueRun();

    expect(destino.getState().ui.screen).toBe('escena');
    const despues = destino.getState().ui.pending!;
    expect(despues.dice).toEqual(antes.dice);
    expect(despues.rerolls).toEqual([1]);
  });

  it('importSave con un JSON inválido devuelve el motivo y no toca el estado', () => {
    const store = createAppStore();
    const id = store.getState().createCharacter(ANA);
    const antes = store.getState();

    const r = store.getState().importSave('{ no soy json');
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();

    const s = store.getState();
    expect(s.characters).toBe(antes.characters);
    expect(s.activeCharacterId).toBe(id);
    expect(s.prefs).toEqual(antes.prefs);
  });

  it('importSave rechaza un guardado con la forma rota y otro con 4 personajes', () => {
    const store = createAppStore();
    store.getState().createCharacter(ANA);

    expect(store.getState().importSave(JSON.stringify({ hola: 'mundo' })).ok).toBe(false);

    const sano = JSON.parse(store.getState().exportSave()) as SavedFile;
    const roto = { ...sano, state: { ...sano.state, prefs: { ...sano.state.prefs, fontScale: 7 } } };
    const r = store.getState().importSave(JSON.stringify(roto));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('fontScale');

    const ch = sano.state.characters[0]!;
    const cuatro = {
      ...sano,
      state: {
        ...sano.state,
        characters: [ch, { ...ch, id: 'b' }, { ...ch, id: 'c' }, { ...ch, id: 'd' }],
      },
    };
    expect(store.getState().importSave(JSON.stringify(cuatro)).ok).toBe(false);
    expect(store.getState().characters).toHaveLength(1);
  });

  it('importSave migra un guardado de una versión anterior', () => {
    const store = createAppStore();
    const viejo: SavedFile = {
      version: 0,
      state: {
        characters: [],
        activeCharacterId: null,
        world: { flags: ['world:viejo'], fallen: [] },
        seen: {},
        prefs: { cps: 20, showOdds: false, fontScale: 1.25, reducedMotion: 'on' },
      },
    };
    expect(store.getState().importSave(JSON.stringify(viejo)).ok).toBe(true);
    expect(store.getState().world.flags).toEqual(['world:viejo']);
    expect(readSaved().version).toBe(1);
  });
});

describe('selectors: elecciones de subida de nivel', () => {
  it('selectActiveCharacter devuelve el activo o null', () => {
    const store = createAppStore();
    expect(selectActiveCharacter(store.getState())).toBeNull();
    store.getState().createCharacter(ANA);
    expect(selectActiveCharacter(store.getState())?.name).toBe('Ana');
  });

  it('atributosParaSubir marca el techo, no lo esconde', () => {
    const store = createAppStore();
    store.getState().createCharacter(ANA);
    const ch = { ...selectActiveCharacter(store.getState())!, attrs: { vigor: 5, astucia: 1, saber: 1, presencia: 0 } };
    const opciones = atributosParaSubir(ch);
    expect(opciones).toHaveLength(4);
    expect(opciones.find((o) => o.id === 'vigor')).toEqual({ id: 'vigor', enabled: false, motivo: 'techo' });
    expect(opciones.find((o) => o.id === 'saber')).toEqual({ id: 'saber', enabled: true });
  });

  it('habilidadesParaElegir bloquea la Debilidad de la clase y las repetidas, con el motivo', () => {
    const store = createAppStore();
    store.getState().createCharacter(ANA); // guerrero: Debilidad `sigilo`
    const ch = { ...selectActiveCharacter(store.getState())!, skills: ['veterano' as const] };
    const opciones = habilidadesParaElegir(ch);
    expect(opciones).toHaveLength(12);
    // Manos ligeras es `sigilo`.
    expect(opciones.find((o) => o.id === 'manos_ligeras')).toEqual({
      id: 'manos_ligeras',
      enabled: false,
      motivo: 'debilidad',
    });
    expect(opciones.find((o) => o.id === 'veterano')).toEqual({ id: 'veterano', enabled: false, motivo: 'repetida' });
    expect(opciones.find((o) => o.id === 'orador')).toEqual({ id: 'orador', enabled: true });
  });

  it('hayPremiosPorElegir ignora los premios automáticos', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    expect(hayPremiosPorElegir(store.getState())).toBe(false);

    await hastaLaVictoria(store);
    store.getState().finishRun();
    expect(hayPremiosPorElegir(store.getState())).toBe(true);

    store.getState().aplicarPremioDeNivel({ kind: 'atributo', attr: 'saber' });
    expect(hayPremiosPorElegir(store.getState())).toBe(false);

    store.setState({
      ui: { ...store.getState().ui, subidaPendiente: { desde: 4, hasta: 5, premios: [{ kind: 'fortuna' }] } },
    });
    expect(hayPremiosPorElegir(store.getState())).toBe(false);
  });
});
