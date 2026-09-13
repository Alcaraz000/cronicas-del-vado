import type { Campaign } from '@/content/schema';
import type { Character, EvalContext, GameState, Run } from '@/engine/types';

/** Campaña mínima para probar fuentes de ventaja y desventaja. levelRange [3, 5] como la campaña de humo. */
export const campanaModificadores: Campaign = {
  id: 'mod_fixture',
  contentVersion: 1,
  title: 'Campaña de modificadores',
  premise: 'Fixture para probar fuentes de ventaja y desventaja.',
  cover: 'mod_fixture',
  levelRange: [3, 5],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  hidden: true,
  start: 'inicio',
  scenes: {
    inicio: {
      id: 'inicio',
      kind: 'ending',
      place: 'sala',
      text: ['Una sala vacía de piedra fría.'],
      choices: [],
      ending: { id: 'fin', epilogue: ['Y ahí termina.'] },
    },
  },
  npcs: {},
  places: {
    sala: { id: 'sala', name: 'Sala', background: 'sala', canonPrompt: 'una sala vacía de piedra' },
  },
  items: {
    llave_de_hierro: {
      id: 'llave_de_hierro',
      name: 'Llave de hierro',
      icon: 'llave_de_hierro',
      description: 'Una llave pesada y fría.',
      advantageTags: ['sigilo'],
    },
    amuleto_de_runas: {
      id: 'amuleto_de_runas',
      name: 'Amuleto de runas',
      icon: 'amuleto_de_runas',
      description: 'Un amuleto grabado con runas antiguas.',
      advantageTags: ['saber', 'magia'],
    },
    piedra_lisa: {
      id: 'piedra_lisa',
      name: 'Piedra lisa',
      icon: 'piedra_lisa',
      description: 'Una piedra de río sin ningún uso conocido.',
    },
  },
  flags: { 'run:tiene_pista': 'El personaje encontró una pista en la sala.' },
  memories: {},
  milestones: {},
  clocks: {},
  endings: { fin: { title: 'Fin' } },
};

/** El personaje de prueba del contrato: mago nivel 3, saber 2, rasgos aprendiz_de_escriba y cazador_furtivo. */
export function personajeMago(overrides: Partial<Character> = {}): Character {
  return {
    id: 'prueba',
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

/** Partida recién empezada en la campaña del fixture, sana y sin objetos. */
export function partidaBase(overrides: Partial<Run> = {}): Run {
  return {
    campaignId: campanaModificadores.id,
    contentVersion: 1,
    sceneId: 'inicio',
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
    rngSeed: 1,
    ...overrides,
  };
}

/** Arma un EvalContext completo con overrides parciales de personaje, partida y campaña. */
export function contextoPrueba(
  opts: { character?: Partial<Character>; run?: Partial<Run>; campaign?: Campaign } = {},
): EvalContext {
  const state: GameState = {
    world: { flags: [], fallen: [] },
    character: personajeMago(opts.character),
    run: partidaBase(opts.run),
    seen: {},
  };
  return { campaign: opts.campaign ?? campanaModificadores, state };
}
