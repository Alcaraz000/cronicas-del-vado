import type { Campaign } from '@/content/schema';
import type { Character, EvalContext, GameState, Run, SeenMap, WorldState } from '@/engine/types';
import { minimal } from './campaigns/minimal';

/**
 * Sobrescrituras parciales por capa. Cada capa acepta un objeto parcial
 * (o uno completo, que también es válido como parcial).
 */
export interface StateOverrides {
  world?: Partial<WorldState>;
  character?: Partial<Character>;
  run?: Partial<Run>;
  seen?: SeenMap;
}

export function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    flags: [],
    fallen: [],
    ...overrides,
  };
}

/** Personaje de prueba del contrato: 'Prueba', mago nivel 3. */
export function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'pj_prueba',
    name: 'Prueba',
    portrait: 'mago_01',
    classId: 'mago',
    attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
    traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
    skills: [],
    level: 3,
    xp: 120,
    flags: [],
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
    ...overrides,
  };
}

/** Partida recién empezada en la campaña `minimal`. */
export function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    campaignId: minimal.id,
    contentVersion: minimal.contentVersion,
    sceneId: minimal.start,
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
    rngSeed: 12345,
    ...overrides,
  };
}

export function makeState(overrides: StateOverrides = {}): GameState {
  const world = makeWorld(overrides.world);
  const run = makeRun(overrides.run);
  // character.run apunta al mismo run para que el estado sea coherente;
  // una sobrescritura explícita de character.run gana.
  const character = makeCharacter({ run, ...overrides.character });
  return { world, character, run, seen: overrides.seen ?? {} };
}

export function makeCtx(campaign: Campaign = minimal, stateOverrides: StateOverrides = {}): EvalContext {
  const state = makeState({
    ...stateOverrides,
    run: {
      campaignId: campaign.id,
      contentVersion: campaign.contentVersion,
      sceneId: campaign.start,
      ...stateOverrides.run,
    },
  });
  return { campaign, state };
}
