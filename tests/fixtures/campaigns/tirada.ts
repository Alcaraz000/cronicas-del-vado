import type { Campaign, Scene } from '@/content/schema';
import type { Band, GameState, PendingRoll } from '@/engine/types';

/**
 * Campaña mínima para probar tiradas, Poder, Fortuna, consolidación y fin de partida.
 * No pasa por el validador (es un fixture del motor), pero respeta la forma de `Campaign`.
 */
const t_inicio = {
  id: 't_inicio',
  kind: 'hub',
  place: 'plaza_de_prueba',
  npcs: ['guardia'],
  text: [
    {
      variants: [
        { when: { visited: 't_inicio', min: 1 }, text: 'La plaza de prueba, otra vez.' },
        { text: 'Una plaza empedrada bajo la lluvia. Un guardia vigila la única puerta.' },
      ],
    },
    {
      variants: [
        { when: { met: 'guardia' }, text: 'Al guardia ya lo conocés de otra noche.' },
        { text: 'Al guardia no lo viste nunca.' },
      ],
    },
  ],
  choices: [
    {
      id: 'saber',
      label: 'Leer la inscripción del dintel',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber'],
        outcomes: {
          crit: {
            text: ['Leés hasta lo que no está escrito y encontrás una llave escondida.'],
            effects: [{ give: 'llave' }],
            next: 't_sala',
          },
          success: { text: ['La inscripción cede su sentido.'], effects: [{ set: 'run:leyo' }], next: 't_sala' },
          partial: { text: ['Entendés la mitad.'], next: 't_sala' },
          failure: { text: ['Las letras no dicen nada.'], next: 't_sala' },
          fumble: { text: ['Te lastimás con el dintel.'], effects: [{ wound: 1 }], next: 't_sala' },
        },
      },
    },
    {
      id: 'fuerza',
      label: 'Forzar la puerta',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: { text: ['La puerta cede.'], next: 't_sala' },
          partial: { text: ['Cede, pero te llevás un golpe.'], effects: [{ wound: 1 }], next: 't_sala' },
          failure: { text: ['La puerta no cede y te lastimás.'], effects: [{ wound: 1 }], next: 't_sala' },
        },
      },
    },
    {
      id: 'mirar',
      label: 'Observar el patio',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        outcomes: {
          success: { next: 't_sala' },
          partial: { next: 't_sala' },
          failure: { next: 't_sala' },
        },
      },
    },
    {
      id: 'pasar',
      label: 'Cruzar la puerta sin más',
      outcome: {
        text: ['Cruzás sin mirar atrás.'],
        effects: [{ set: 'run:paso' }, { set: 'char:tirada.entro' }],
        next: 't_sala',
      },
    },
  ],
} satisfies Scene;

const t_sala = {
  id: 't_sala',
  kind: 'normal',
  place: 'sala',
  npcs: ['guardia'],
  text: [
    {
      variants: [
        { when: { flag: 'run:paso' }, text: 'Entraste sin tirar nada: la sala está en silencio.' },
        { text: 'La sala huele a aceite de lámpara.' },
      ],
    },
    {
      variants: [
        { when: { met: 'guardia' }, text: 'El guardia te sigue con la mirada; ya lo conocés.' },
        { text: 'Un guardia que no conocés te sigue con la mirada.' },
      ],
    },
  ],
  choices: [
    { id: 'volver', label: 'Volver a la plaza', outcome: { next: 't_inicio' } },
    { id: 'bajar', label: 'Bajar a la cripta', outcome: { next: 't_cripta' } },
    {
      id: 'terminar',
      label: 'Salir por la ventana',
      outcome: { effects: [{ set: 'world:tirada.alarma' }], next: 't_final' },
    },
    {
      id: 'rendirse',
      label: 'Rendirse al guardia',
      outcome: { text: ['El guardia no acepta rendiciones.'], effects: [{ wound: 2 }], next: 't_final' },
    },
  ],
} satisfies Scene;

const t_cripta = {
  id: 't_cripta',
  kind: 'normal',
  lethal: true,
  place: 'cripta',
  text: ['Un pozo negro. Un fallo acá te puede matar.'],
  choices: [
    {
      id: 'cruzar',
      label: 'Cruzar el pozo de un salto',
      roll: {
        attr: 'vigor',
        difficulty: 'dificil',
        tags: ['fisico'],
        outcomes: {
          success: { text: ['Llegás al otro lado.'], next: 't_final' },
          partial: { text: ['Llegás, con un golpe.'], effects: [{ wound: 1 }], next: 't_final' },
          failure: { text: ['Caés.'], effects: [{ lethal: true }], next: 't_sala' },
        },
      },
    },
    {
      id: 'tantear',
      label: 'Tantear el borde a oscuras',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        outcomes: {
          success: { next: 't_final' },
          partial: { effects: [{ wound: 1 }], next: 't_final' },
          failure: { effects: [{ wound: 1 }], next: 't_sala' },
        },
      },
    },
    { id: 'retroceder', label: 'Retroceder', outcome: { next: 't_sala' } },
    { id: 'esperar', label: 'Esperar a que los ojos se acostumbren', outcome: { next: 't_sala' } },
  ],
} satisfies Scene;

const t_final = {
  id: 't_final',
  kind: 'ending',
  place: 'sala',
  text: ['Se acabó la prueba.'],
  choices: [],
  ending: { id: 'fin_prueba', epilogue: ['Y eso fue todo.'] },
} satisfies Scene;

export const tirada: Campaign = {
  id: 'tirada',
  contentVersion: 1,
  title: 'Tirada de prueba',
  premise: 'Campaña mínima para probar tiradas, poderes y finales.',
  cover: 'tirada',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 1,
  lintProfile: 'smoke',
  hidden: true,
  start: 't_inicio',
  scenes: { t_inicio, t_sala, t_cripta, t_final },
  npcs: {
    guardia: {
      id: 'guardia',
      name: 'Guardia',
      portrait: 'guardia',
      voice: 'Seco, cansado.',
      canonPrompt: 'guardia de barba gris con farol',
    },
  },
  places: {
    plaza_de_prueba: {
      id: 'plaza_de_prueba',
      name: 'Plaza de prueba',
      background: 'plaza_de_prueba',
      canonPrompt: 'plaza empedrada bajo la lluvia',
    },
    sala: { id: 'sala', name: 'Sala', background: 'sala', canonPrompt: 'sala de piedra con lámparas de aceite' },
    cripta: { id: 'cripta', name: 'Cripta', background: 'cripta', canonPrompt: 'cripta con un pozo negro' },
  },
  items: {
    llave: {
      id: 'llave',
      name: 'Llave de hierro',
      icon: 'llave',
      description: 'Abre una puerta que todavía no viste.',
      advantageTags: ['sigilo'],
    },
  },
  flags: {
    'run:leyo': 'Leyó la inscripción',
    'run:paso': 'Cruzó sin tirar',
    'char:tirada.entro': 'Entró a la sala',
    'world:tirada.alarma': 'Sonó la alarma',
  },
  milestones: { hito_prueba: { label: 'Hito de prueba' } },
  clocks: {},
  endings: { fin_prueba: { title: 'Fin de la prueba' } },
};

/** Copia del estado con otra semilla de dados. */
export function withSeed(state: GameState, seed: number): GameState {
  return { ...state, run: { ...state.run, rngSeed: seed } };
}

/**
 * Busca la primera semilla (1..maxSeeds) con la que `build` produce la banda pedida.
 * Como los dados salen de un hash, el resultado es determinista entre corridas.
 */
export function findSeed(
  build: (state: GameState) => PendingRoll,
  want: Band,
  base: GameState,
  maxSeeds = 5000,
): number {
  for (let seed = 1; seed <= maxSeeds; seed += 1) {
    if (build(withSeed(base, seed)).band === want) return seed;
  }
  throw new Error(`No se encontró una semilla con banda ${want} en ${maxSeeds} intentos`);
}
