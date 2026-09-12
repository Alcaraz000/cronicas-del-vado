import { create, type Mutate, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { LIMITS, type Attr, type ClassId, type TraitId } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import type { Character, EndSummary, PendingRoll, SeenMap, WorldState } from '@/engine/types';
import { PERSIST_VERSION, runMigrations } from '@/state/migrations';

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
  createCharacter(input: CreateCharacterInput): string;
  createTestCharacter(): string;
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
