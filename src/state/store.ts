import { create, type Mutate, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { LIMITS, type Attr, type ClassId, type TraitId } from '@/content/catalog';
import type { Campaign, WorldContent } from '@/content/schema';
import { CAMPAIGNS } from '@/content/campaigns/index';
import { WORLD } from '@/content/world';
import type {
  Character,
  EndSummary,
  GameState,
  PendingPersisted,
  PendingRoll,
  Run,
  SeenMap,
  WorldState,
} from '@/engine/types';
import * as engine from '@/engine/resolve';
import { fortuneMax } from '@/engine/progression';
import { newSeed } from '@/engine/rng';
import { PERSIST_VERSION, runMigrations } from '@/state/migrations';
import { selectGameState, writeGameState } from '@/state/selectors';

export interface Prefs {
  cps: number;
  showOdds: boolean;
  fontScale: 1 | 1.25 | 1.5;
  reducedMotion: 'auto' | 'on';
}

export type Screen = 'inicio' | 'cargando' | 'escena' | 'fin' | 'error';

export interface PersistedSlice {
  characters: Character[];
  activeCharacterId: string | null;
  world: WorldState;
  seen: Record<string, SeenMap>;
  prefs: Prefs;
}

export interface UiSlice {
  screen: Screen;
  campaign: Campaign | null;
  pending: PendingRoll | null;
  error: string | null;
  endSummary: EndSummary | null;
}

export interface CreateCharacterInput {
  name: string;
  classId: ClassId;
  portrait: string;
  traits: TraitId[];
  attrs: Record<Attr, number>;
}

export interface Actions {
  /** Crea un personaje de nivel 1 y lo activa. Devuelve su id. Lanza si ya hay LIMITS.maxCharacters. */
  createCharacter(input: CreateCharacterInput): string;
  /** Fase A: 'Prueba', mago de nivel 3 con Saber 2 / Astucia 1 / Presencia 1 / Vigor 0. Lo activa. */
  createTestCharacter(): string;
  /** 'cargando' → carga la campaña → run nuevo → enter(start) → 'escena'. Si falla: ui.error y 'error'. */
  startRun(campaignId: string): Promise<void>;
  /** Carga la campaña del run del personaje activo y reconstruye ui.pending con restorePending. */
  continueRun(): Promise<void>;
  /** Opción sin tirada. Si el run termina (outcome), pasa a 'fin'. */
  choose(choiceId: string): void;
  /** Fase 1 de la tirada: ui.pending completo y run.pending mínimo persistido. */
  beginRoll(choiceId: string): void;
  /** Gasta 1 Fortuna para repetir un dado; actualiza ui.pending y run.pending.rerolls. */
  rerollDie(dieIndex: number): void;
  /** Usa el Poder de clase si aplica; actualiza ui.pending y run.pending.powerUsed. */
  usePower(): void;
  /** Fase 2 de la tirada: consolida, limpia pending y avanza; si el run termina, 'fin'. */
  commitRoll(): void;
  /** Desde 'fin': endRun → escribe world y personaje (run = null), ui.endSummary → 'inicio'. */
  finishRun(): void;
  /** Marca el run como derrota y lo termina con finishRun. */
  abandonRun(): void;
  /** Desde 'error': si hay run en curso, continueRun; si no, 'inicio'. */
  retry(): void;
  setPrefs(p: Partial<Prefs>): void;
}

export type Store = PersistedSlice & { ui: UiSlice } & Actions;

export type AppStore = UseBoundStore<Mutate<StoreApi<Store>, [['zustand/persist', PersistedSlice]]>>;

export const STORAGE_KEY = 'juegorol';

export const DEFAULT_PREFS: Prefs = { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' };

const INITIAL_UI: UiSlice = { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null };

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** localStorage envuelto en try/catch: sin almacenamiento o sin cuota, el juego sigue en memoria. */
const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return globalThis.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      globalThis.localStorage.setItem(name, value);
    } catch (e) {
      console.warn(`No se pudo guardar la partida (${errorMessage(e)}). Exportá tu guardado desde Opciones.`);
    }
  },
  removeItem: (name: string): void => {
    try {
      globalThis.localStorage.removeItem(name);
    } catch {
      // Sin almacenamiento no hay nada que borrar.
    }
  },
};

function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildCharacter(input: CreateCharacterInput, level: number): Character {
  return {
    id: newId(),
    name: input.name,
    portrait: input.portrait,
    classId: input.classId,
    attrs: { ...input.attrs },
    traits: [...input.traits],
    skills: [],
    level,
    xp: LIMITS.xpPerLevel * (level - 1),
    flags: input.traits.map((t) => `char:origen.${t}`),
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
  };
}

/** Pide al navegador que no borre el almacenamiento; falla en silencio donde no existe. */
function requestPersistentStorage(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      void navigator.storage.persist();
    }
  } catch {
    // No disponible: no importa.
  }
}

function activeCharacter(s: PersistedSlice): Character | null {
  return s.characters.find((c) => c.id === s.activeCharacterId) ?? null;
}

/**
 * Devuelve la campaña con el contenido compartido adentro: PNJ, lugares y objetos de WORLD.
 * El motor resuelve todo contra `campaign` y nada más (`modifiers.ts`, `resolve.ts`), así que sin
 * esto una reliquia declarada solo en `world/items.ts` —que es donde el diseño manda declararlas—
 * nunca daría ventaja ni mostraría su nombre. Fusionando acá, motor, UI y validador ven lo mismo.
 *
 * Ante una colisión de id gana WORLD: r07 ya prohíbe que una campaña redefina un id de `world/`,
 * de modo que una colisión es contenido roto y el mundo es la fuente canónica.
 */
export function conMundo(campaign: Campaign, world: WorldContent): Campaign {
  return {
    ...campaign,
    npcs: { ...campaign.npcs, ...world.npcs },
    places: { ...campaign.places, ...world.places },
    items: { ...campaign.items, ...world.items },
  };
}

async function loadCampaign(campaignId: string): Promise<Campaign> {
  const entry = CAMPAIGNS[campaignId];
  if (!entry) throw new Error(`Campaña desconocida: ${campaignId}`);
  return conMundo(await entry.load(), WORLD);
}

function newRun(campaign: Campaign, character: Character): Run {
  return {
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    sceneId: campaign.start,
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: fortuneMax(character.level),
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: newSeed(`${Date.now()}|${Math.random()}`),
  };
}

/** Tupla mínima que se persiste para poder reconstruir el PendingRoll al recargar. */
function toPersisted(pending: PendingRoll): PendingPersisted {
  return { choiceId: pending.choiceId, rerolls: [...pending.rerolls], powerUsed: pending.powerUsed };
}

function partialize(s: Store): PersistedSlice {
  return {
    characters: s.characters,
    activeCharacterId: s.activeCharacterId,
    world: s.world,
    seen: s.seen,
    prefs: s.prefs,
  };
}

export function createAppStore(): AppStore {
  return create<Store>()(
    persist<Store, [], [], PersistedSlice>(
      (set, get) => {
        const addCharacter = (character: Character): void => {
          set((s) => ({ characters: [...s.characters, character], activeCharacterId: character.id }));
        };
        const setUi = (patch: Partial<UiSlice>): void => {
          set((s) => ({ ui: { ...s.ui, ...patch } }));
        };
        const fail = (e: unknown): void => {
          setUi({ screen: 'error', error: errorMessage(e) });
        };
        /** Campaña cargada y GameState del personaje activo con partida; null si falta alguno. */
        const playing = (): { campaign: Campaign; gs: GameState } | null => {
          const st = get();
          const gs = selectGameState(st);
          return st.ui.campaign && gs ? { campaign: st.ui.campaign, gs } : null;
        };
        /** Escribe un PendingRoll nuevo en ui.pending y su tupla mínima en run.pending. */
        const writePending = (gs: GameState, pending: PendingRoll): void => {
          const run: Run = { ...gs.run, pending: toPersisted(pending) };
          set((s) => ({
            ...writeGameState(s, { ...gs, run }),
            ui: { ...s.ui, pending },
          }));
        };

        return {
          characters: [],
          activeCharacterId: null,
          world: { flags: [], fallen: [] },
          seen: {},
          prefs: { ...DEFAULT_PREFS },
          ui: { ...INITIAL_UI },

          createCharacter(input) {
            if (get().characters.length >= LIMITS.maxCharacters) {
              throw new Error(`No se pueden tener más de ${LIMITS.maxCharacters} personajes`);
            }
            const character = buildCharacter(input, 1);
            addCharacter(character);
            requestPersistentStorage();
            return character.id;
          },

          createTestCharacter() {
            const character = buildCharacter(
              {
                name: 'Prueba',
                classId: 'mago',
                portrait: 'mago_01',
                traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
                attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
              },
              3,
            );
            addCharacter(character);
            return character.id;
          },

          async startRun(campaignId) {
            setUi({ screen: 'cargando', error: null, pending: null, endSummary: null });
            try {
              const campaign = await loadCampaign(campaignId);
              const st = get();
              const character = activeCharacter(st);
              if (!character) throw new Error('No hay personaje activo');
              // El personaje muerto no vuelve (spec): endRun marca character.dead pero no cambia
              // activeCharacterId, así que sin esto el muerto podía empezar otra partida.
              if (character.dead) throw new Error(`${character.name} murió y no vuelve a jugar`);
              const run = newRun(campaign, character);
              const seen = st.seen[campaign.id] ?? {};
              const entered = engine.enter(campaign, { world: st.world, character, run, seen }, campaign.start);
              set((s) => ({
                ...writeGameState(s, entered),
                ui: { ...s.ui, screen: entered.run.outcome ? 'fin' : 'escena', campaign, pending: null },
              }));
            } catch (e) {
              fail(e);
            }
          },

          async continueRun() {
            const character = activeCharacter(get());
            if (!character || !character.run) {
              setUi({ screen: 'inicio' });
              return;
            }
            setUi({ screen: 'cargando', error: null });
            try {
              const campaign = await loadCampaign(character.run.campaignId);
              const gs = selectGameState(get());
              if (!gs) throw new Error('La partida ya no existe');
              const pending = engine.restorePending(campaign, gs);
              setUi({ screen: gs.run.outcome ? 'fin' : 'escena', campaign, pending });
            } catch (e) {
              fail(e);
            }
          },

          choose(choiceId) {
            const ctx = playing();
            if (!ctx) return;
            const next = engine.choose(ctx.campaign, ctx.gs, choiceId);
            set((s) => ({
              ...writeGameState(s, next),
              ui: { ...s.ui, screen: next.run.outcome ? 'fin' : 'escena' },
            }));
          },

          beginRoll(choiceId) {
            const ctx = playing();
            if (!ctx) return;
            const pending = engine.beginRoll(ctx.campaign, ctx.gs, choiceId);
            writePending(ctx.gs, pending);
          },

          rerollDie(dieIndex) {
            const ctx = playing();
            const current = get().ui.pending;
            if (!ctx || !current || !current.canReroll) return;
            const pending = engine.rerollDie(ctx.campaign, ctx.gs, current, dieIndex);
            writePending(ctx.gs, pending);
          },

          usePower() {
            const ctx = playing();
            const current = get().ui.pending;
            if (!ctx || !current || !current.canUsePower) return;
            const pending = engine.usePower(ctx.campaign, ctx.gs, current);
            writePending(ctx.gs, pending);
          },

          commitRoll() {
            const ctx = playing();
            const current = get().ui.pending;
            if (!ctx || !current) return;
            const next = engine.commitRoll(ctx.campaign, ctx.gs, current);
            set((s) => ({
              ...writeGameState(s, next),
              ui: { ...s.ui, pending: null, screen: next.run.outcome ? 'fin' : 'escena' },
            }));
          },

          finishRun() {
            const ctx = playing();
            if (!ctx) {
              setUi({ screen: 'inicio', campaign: null, pending: null });
              return;
            }
            const { world, character, summary } = engine.endRun(ctx.campaign, ctx.gs);
            set((s) => ({
              world,
              characters: s.characters.map((c) => (c.id === character.id ? character : c)),
              ui: { ...s.ui, screen: 'inicio', campaign: null, pending: null, endSummary: summary },
            }));
          },

          abandonRun() {
            const ctx = playing();
            if (!ctx) return;
            const run: Run = { ...ctx.gs.run, outcome: { kind: 'defeat' } };
            set((s) => ({
              ...writeGameState(s, { ...ctx.gs, run }),
              ui: { ...s.ui, pending: null, screen: 'fin' },
            }));
            get().finishRun();
          },

          retry() {
            const character = activeCharacter(get());
            if (character?.run) {
              void get().continueRun();
            } else {
              setUi({ screen: 'inicio', error: null });
            }
          },

          setPrefs(p) {
            set((s) => ({ prefs: { ...s.prefs, ...p } }));
          },
        };
      },
      {
        name: STORAGE_KEY,
        version: PERSIST_VERSION,
        storage: createJSONStorage(() => safeStorage),
        partialize,
        migrate: (persisted, version) => runMigrations(persisted, version) as PersistedSlice,
      },
    ),
  );
}

export const useStore: AppStore = createAppStore();
