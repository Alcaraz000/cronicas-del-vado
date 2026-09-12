import { create, type Mutate, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  ATTRS,
  ATTR_NAMES,
  CLASSES,
  LIMITS,
  SKILLS,
  TRAITS,
  isSkillAllowed,
  isTraitAllowed,
  type Attr,
  type ClassId,
  type SkillId,
  type TraitId,
} from '@/content/catalog';
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
import { fortuneMax, type GananciaXp, type PremioDeNivel } from '@/engine/progression';
import { newSeed } from '@/engine/rng';
import { PERSIST_VERSION, runMigrations } from '@/state/migrations';
import { parseSave } from '@/state/saveSchema';
import { selectGameState, writeGameState } from '@/state/selectors';

export interface Prefs {
  cps: number;
  showOdds: boolean;
  fontScale: 1 | 1.25 | 1.5;
  reducedMotion: 'auto' | 'on';
}

export type Screen = 'inicio' | 'creacion' | 'hub' | 'cargando' | 'escena' | 'fin' | 'error';

export interface PersistedSlice {
  characters: Character[];
  activeCharacterId: string | null;
  world: WorldState;
  seen: Record<string, SeenMap>;
  prefs: Prefs;
}

/**
 * Niveles ganados en la última partida y lo que dan. Los premios de elección
 * (`atributo`, `habilidad`) esperan acá a que el jugador los gaste con
 * `aplicarPremioDeNivel`; `fortuna` y `leyenda` ya los aplicó el motor y solo se informan.
 */
export interface SubidaPendiente {
  desde: number;
  hasta: number;
  premios: PremioDeNivel[];
}

export interface UiSlice {
  screen: Screen;
  campaign: Campaign | null;
  pending: PendingRoll | null;
  error: string | null;
  endSummary: EndSummary | null;
  /** Desglose en prosa de la XP de la última partida cerrada (lo arma el motor). */
  ganancia: GananciaXp | null;
  subidaPendiente: SubidaPendiente | null;
}

/** Lo que el jugador elige al subir de nivel. Los premios automáticos no se piden. */
export type PremioElegido = { kind: 'atributo'; attr: Attr } | { kind: 'habilidad'; skill: SkillId };

export interface ImportResult {
  ok: boolean;
  error?: string;
}

export interface CreateCharacterInput {
  name: string;
  classId: ClassId;
  portrait: string;
  traits: TraitId[];
  attrs: Record<Attr, number>;
}

export interface Actions {
  /**
   * Crea un personaje de nivel 1 y lo activa. Devuelve su id. Lanza (con el motivo en
   * castellano) si ya hay LIMITS.maxCharacters, si el reparto de atributos no es 2/1/1/0
   * o si los rasgos rompen la regla de identidad. La UI no evalúa nada de esto: ofrece
   * lo que el catálogo permite y el store es el que dice que no.
   */
  createCharacter(input: CreateCharacterInput): string;
  /** Fase A: 'Prueba', mago de nivel 3 con Saber 2 / Astucia 1 / Presencia 1 / Vigor 0. Lo activa. */
  createTestCharacter(): string;
  /** Navegación pura entre pantallas. Saliendo de 'error' se limpia el error. */
  goTo(screen: Screen): void;
  /** Activa otro personaje. Ignora un id desconocido. La partida del anterior queda en él. */
  selectCharacter(id: string): void;
  /** Borra un personaje (y su partida). Si era el activo, activa a otro o deja el perfil sin activo. */
  deleteCharacter(id: string): void;
  /** El guardado entero como JSON, listo para descargar o copiar: el wrapper { state, version }. */
  exportSave(): string;
  /** Importa un guardado exportado: valida con zod y migra. Si falla no toca nada y devuelve el motivo. */
  importSave(json: string): ImportResult;
  /** Gasta un premio de la subida pendiente. Lanza si la elección rompe una regla. */
  aplicarPremioDeNivel(premio: PremioElegido): void;
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
  /**
   * Cierra la partida terminada: endRun → escribe world y personaje (run = null, XP y nivel
   * nuevos) y deja en `ui` el resumen, el desglose de XP y la subida pendiente. NO navega:
   * se queda en 'fin' para que la pantalla muestre todo eso y el jugador elija sus premios.
   * Salir de ahí es cosa de `goTo` ('hub', o 'inicio' si el personaje murió).
   */
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

const INITIAL_UI: UiSlice = {
  screen: 'inicio',
  campaign: null,
  pending: null,
  error: null,
  endSummary: null,
  ganancia: null,
  subidaPendiente: null,
};

/** Lo que `ui` guarda de una partida: se limpia junto al empezar otra, al cambiar de personaje o al importar. */
const SIN_PARTIDA = { campaign: null, pending: null, endSummary: null, ganancia: null, subidaPendiente: null } as const;

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

/** Reparto inicial de atributos (spec §4): 2/1/1/0, en el orden que el jugador quiera. */
const REPARTO_INICIAL = [2, 1, 1, 0] as const;

/** Rasgos de origen por personaje (spec §4: "2 de 8"). */
const RASGOS_POR_PERSONAJE = 2;

/**
 * Comprueba la entrada de creación contra las reglas del sistema y lanza con el motivo.
 * La UI no evalúa reglas: ofrece lo que el catálogo permite y esto es la última palabra.
 *
 * No se exige QUÉ atributo lleva el 2 (la spec dice que lo fija la clase, pero eso es el
 * camino de la pantalla, no una invariante del guardado); sí se exige el reparto 2/1/1/0,
 * que es lo que impide un personaje imposible.
 */
function validarCreacion(input: CreateCharacterInput): void {
  if (input.name.trim() === '') {
    throw new Error('El personaje necesita un nombre');
  }

  const valores = ATTRS.map((a) => input.attrs[a]);
  if (valores.some((v) => !Number.isInteger(v))) {
    throw new Error('Los atributos tienen que ser números enteros');
  }
  if ([...valores].sort((a, b) => b - a).join('/') !== REPARTO_INICIAL.join('/')) {
    throw new Error('El reparto inicial de atributos tiene que ser 2/1/1/0');
  }

  if (input.traits.length > RASGOS_POR_PERSONAJE) {
    throw new Error(`No se pueden elegir más de ${RASGOS_POR_PERSONAJE} rasgos de origen`);
  }
  if (new Set(input.traits).size !== input.traits.length) {
    throw new Error('No se puede elegir dos veces el mismo rasgo de origen');
  }
  const clase = CLASSES[input.classId];
  for (const trait of input.traits) {
    if (!isTraitAllowed(input.classId, trait)) {
      throw new Error(
        `${TRAITS[trait].name} no se puede elegir: su etiqueta (${TRAITS[trait].tag}) es la Debilidad de ${clase.name}`,
      );
    }
  }
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
        /** Las dos vías de creación comparten el tope: sin esto, cada muerte dejaba un personaje de más. */
        const exigirLugar = (): void => {
          if (get().characters.length >= LIMITS.maxCharacters) {
            throw new Error(`No se pueden tener más de ${LIMITS.maxCharacters} personajes`);
          }
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
        /**
         * Cierra la partida con finishRun (camino común de abandonRun y startRun). Si todavía no tenía
         * desenlace se cierra como derrota; si YA lo tenía se respeta, porque pisarlo registraría mal:
         * una partida terminada que quedó sin cerrar (recarga parada en la pantalla de fin, con el run
         * persistido y su outcome adentro) perdería la victoria, el final y el canon, o la muerte.
         */
        const terminarPartida = (campaign: Campaign, gs: GameState): void => {
          const run: Run = gs.run.outcome !== undefined ? gs.run : { ...gs.run, outcome: { kind: 'defeat' } };
          set((s) => ({
            ...writeGameState(s, { ...gs, run }),
            ui: { ...s.ui, campaign, pending: null, screen: 'fin' },
          }));
          get().finishRun();
        };
        /**
         * Cierra como derrota la partida en curso del personaje activo, si la hay.
         * El motor asume que TODA partida termina por endRun: pisar character.run la dejaría sin
         * contar en el registro, sin derrota y sin resumen. La campaña de esa partida puede no ser
         * la que está en ui (recarga sin continuar, o arranque de otra campaña): ahí se carga.
         */
        const cerrarPartidaEnCurso = async (): Promise<void> => {
          const st = get();
          const gs = selectGameState(st);
          if (!gs) return;
          const enUi = st.ui.campaign;
          const campaign = enUi !== null && enUi.id === gs.run.campaignId ? enUi : await loadCampaign(gs.run.campaignId);
          terminarPartida(campaign, gs);
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
            exigirLugar();
            validarCreacion(input);
            const character = buildCharacter(input, 1);
            addCharacter(character);
            requestPersistentStorage();
            return character.id;
          },

          createTestCharacter() {
            exigirLugar();
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

          goTo(screen) {
            setUi(screen === 'error' ? { screen } : { screen, error: null });
          },

          selectCharacter(id) {
            const st = get();
            if (st.activeCharacterId === id || !st.characters.some((c) => c.id === id)) return;
            // Lo que `ui` tenía era de la partida del personaje anterior; la suya sigue guardada en él.
            set((s) => ({ activeCharacterId: id, ui: { ...s.ui, ...SIN_PARTIDA } }));
          },

          deleteCharacter(id) {
            const st = get();
            if (!st.characters.some((c) => c.id === id)) return;
            const characters = st.characters.filter((c) => c.id !== id);
            if (st.activeCharacterId !== id) {
              set({ characters });
              return;
            }
            // Se borró al activo: hereda el primero que quede y la ui suelta su partida. Si el
            // jugador estaba en una pantalla de partida, esa partida ya no existe: hay que sacarlo.
            const activeCharacterId = characters[0]?.id ?? null;
            const enPartida = st.ui.screen === 'escena' || st.ui.screen === 'fin' || st.ui.screen === 'cargando';
            const screen: Screen = enPartida ? (activeCharacterId === null ? 'inicio' : 'hub') : st.ui.screen;
            set((s) => ({ characters, activeCharacterId, ui: { ...s.ui, ...SIN_PARTIDA, screen } }));
          },

          exportSave() {
            return JSON.stringify({ state: partialize(get()), version: PERSIST_VERSION }, null, 2);
          },

          importSave(json) {
            const leido = parseSave(json);
            if (!leido.ok) return { ok: false, error: leido.error };
            // El guardado que entra no tiene nada que ver con lo que estaba pasando en pantalla:
            // la campaña y la tirada de `ui` son del estado que se acaba de descartar.
            set({ ...leido.state, ui: { ...INITIAL_UI } });
            requestPersistentStorage();
            return { ok: true };
          },

          aplicarPremioDeNivel(premio) {
            const st = get();
            const subida = st.ui.subidaPendiente;
            const character = activeCharacter(st);
            if (!subida || !character) return;
            const indice = subida.premios.findIndex((p) => p.kind === premio.kind);
            // Sin premio de ese tipo no hay nada que gastar (un segundo clic, por ejemplo).
            if (indice === -1) return;

            let actualizado: Character;
            if (premio.kind === 'atributo') {
              if (character.attrs[premio.attr] >= LIMITS.maxAttr) {
                throw new Error(`${ATTR_NAMES[premio.attr]} ya está en el techo de ${LIMITS.maxAttr}`);
              }
              actualizado = {
                ...character,
                attrs: { ...character.attrs, [premio.attr]: character.attrs[premio.attr] + 1 },
              };
            } else {
              if (!isSkillAllowed(character.classId, premio.skill)) {
                throw new Error(
                  `${SKILLS[premio.skill].name} no se puede elegir: su etiqueta (${SKILLS[premio.skill].tag}) es la Debilidad de ${CLASSES[character.classId].name}`,
                );
              }
              if (character.skills.includes(premio.skill)) {
                throw new Error(`${SKILLS[premio.skill].name} ya la tenés`);
              }
              actualizado = { ...character, skills: [...character.skills, premio.skill] };
            }

            const premios = subida.premios.filter((_, i) => i !== indice);
            set((s) => ({
              characters: s.characters.map((c) => (c.id === actualizado.id ? actualizado : c)),
              ui: { ...s.ui, subidaPendiente: premios.length > 0 ? { ...subida, premios } : null },
            }));
          },

          async startRun(campaignId) {
            setUi({ screen: 'cargando', error: null, pending: null, endSummary: null });
            try {
              const campaign = await loadCampaign(campaignId);
              const actual = activeCharacter(get());
              if (!actual) throw new Error('No hay personaje activo');
              // El personaje muerto no vuelve (spec): endRun marca character.dead pero no cambia
              // activeCharacterId, así que sin esto el muerto podía empezar otra partida.
              if (actual.dead) throw new Error(`${actual.name} murió y no vuelve a jugar`);
              await cerrarPartidaEnCurso();

              // Se vuelve a leer el personaje: cerrar la partida anterior lo reemplaza (run en null
              // y campaignLog actualizado), así que `actual` ya quedó viejo.
              const st = get();
              const character = activeCharacter(st);
              if (!character) throw new Error('No hay personaje activo');
              const run = newRun(campaign, character);
              const seen = st.seen[campaign.id] ?? {};
              const entered = engine.enter(campaign, { world: st.world, character, run, seen }, campaign.start);
              set((s) => ({
                ...writeGameState(s, entered),
                ui: {
                  ...s.ui,
                  ...SIN_PARTIDA,
                  screen: entered.run.outcome ? 'fin' : 'escena',
                  campaign,
                  // El resumen, la XP y la subida pendiente de la partida que se acaba de cerrar
                  // no son de esta: los limpia SIN_PARTIDA.
                },
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
              // Sin partida que cerrar. Si ya se cerró (un segundo clic en la pantalla de fin)
              // no se toca nada: ahí está el resumen y la subida que el jugador todavía no gastó.
              if (get().ui.endSummary === null) setUi({ screen: 'inicio', campaign: null, pending: null });
              return;
            }
            const { world, character, summary } = engine.endRun(ctx.campaign, ctx.gs);
            const premios = summary.xp.premios;
            set((s) => ({
              world,
              characters: s.characters.map((c) => (c.id === character.id ? character : c)),
              ui: {
                ...s.ui,
                // Se queda en 'fin': ahí se muestran la XP y la subida de nivel (spec §6).
                screen: 'fin',
                campaign: null,
                pending: null,
                endSummary: summary,
                ganancia: summary.xp.ganancia,
                subidaPendiente:
                  premios.length > 0
                    ? { desde: summary.xp.nivelAntes, hasta: summary.xp.nivelDespues, premios }
                    : null,
              },
            }));
          },

          abandonRun() {
            const ctx = playing();
            if (!ctx) return;
            terminarPartida(ctx.campaign, ctx.gs);
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
