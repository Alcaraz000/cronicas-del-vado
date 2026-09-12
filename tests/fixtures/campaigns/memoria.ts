import type { Campaign, Scene } from '@/content/schema';
import type { Character, GameState, Run, SeenMap, WorldState } from '@/engine/types';

export const m_puerta = {
  id: 'm_puerta',
  kind: 'hub',
  place: 'torre_vieja',
  npcs: ['guardiana'],
  onEnter: [{ milestone: 'llegar_a_la_puerta' }],
  redirect: [{ when: { flag: 'run:puerta_abierta' }, to: 'm_sala' }],
  text: [
    {
      variants: [
        { when: { visited: 'm_puerta', min: 1 }, text: 'La puerta de la torre, otra vez. La guardiana no se movió de su sitio.' },
        { text: 'La puerta de la torre vieja está cerrada. Una guardiana de capa gris te mira desde el umbral.' },
      ],
    },
    {
      variants: [
        { when: { knows: 'torre_vieja' }, text: 'Conocés esta torre de otra crónica: sabés que la piedra del dintel está floja.' },
        { text: 'Nunca estuviste acá. La torre parece más alta de lo que debería.' },
      ],
    },
    { speaker: 'guardiana', variants: [{ text: '—Nadie pasa sin la llave. Ni vos ni nadie.' }] },
  ],
  choices: [
    { id: 'entrar_cripta', label: 'Bajar a la cripta por la trampilla', outcome: { next: 'm_cripta' } },
    { id: 'abrir', label: 'Abrir la puerta con cuidado', outcome: { effects: [{ set: 'run:puerta_abierta' }], next: 'm_sala' } },
    { id: 'esperar', label: 'Esperar junto a la puerta', outcome: { next: 'm_puerta' } },
    { id: 'irse', label: 'Irse de la torre', outcome: { next: 'm_fin_huida' } },
    {
      id: 'forzar',
      label: 'Forzar la puerta a golpes',
      roll: {
        attr: 'vigor',
        difficulty: 'dificil',
        tags: ['fisico'],
        outcomes: {
          success: { text: ['La puerta cede con un crujido.'], next: 'm_sala' },
          partial: { text: ['La puerta cede, pero te llevás una astilla en el hombro.'], effects: [{ wound: 1 }], next: 'm_sala' },
          failure: { text: ['La puerta no se mueve y vos sí: al suelo.'], effects: [{ wound: 1 }], next: 'm_puerta' },
        },
      },
    },
    {
      id: 'recuerdo',
      label: 'Empujar la piedra floja del dintel',
      requires: { knows: 'torre_vieja' },
      lockedHint: 'No conocés esta torre lo suficiente',
      outcome: { next: 'm_sala' },
    },
    {
      id: 'cronica',
      label: 'Bajar por el camino que ya conocés',
      requires: { flag: 'char:memoria.vio_la_cripta' },
      lockedHint: 'Todavía no viste la cripta',
      outcome: { next: 'm_sala' },
    },
    { id: 'secreto', label: 'Usar el pasadizo secreto', requires: { flag: 'run:secreto' }, outcome: { next: 'm_sala' } },
  ],
} satisfies Scene;

export const m_sala = {
  id: 'm_sala',
  kind: 'normal',
  place: 'torre_vieja',
  variant: 'interior',
  npcs: ['guardiana'],
  onEnter: [{ clock: 'ronda', delta: 1 }],
  redirect: [{ when: { flag: 'run:tesoro_a_la_vista' }, to: 'm_fin_tesoro' }],
  text: [
    'La sala huele a polvo y a cera vieja. La guardiana te siguió hasta adentro sin decir palabra.',
    'Hay una escalera que baja y otra que sube. En el muro, runas gastadas y un cofre cerrado.',
  ],
  choices: [
    { id: 'volver', label: 'Volver a la puerta', outcome: { next: 'm_puerta' } },
    { id: 'salir', label: 'Salir de la torre', outcome: { next: 'm_fin_huida' } },
    { id: 'bajar', label: 'Bajar a la cripta', outcome: { next: 'm_cripta' } },
    { id: 'mirar', label: 'Mirar alrededor', outcome: { next: 'm_sala' } },
    { id: 'magia', label: 'Leer las runas del muro', requires: { class: 'mago' }, lockedHint: 'Solo un mago lee estas runas', outcome: { next: 'm_sala' } },
    {
      id: 'escriba',
      label: 'Descifrar la inscripción del cofre',
      requires: { trait: 'aprendiz_de_escriba' },
      lockedHint: 'Necesitás saber leer escritura antigua',
      outcome: { next: 'm_sala' },
    },
    { id: 'rastrear', label: 'Seguir las huellas del polvo', requires: { skill: 'rastreador' }, lockedHint: 'No sabés leer huellas', outcome: { next: 'm_sala' } },
    { id: 'llave', label: 'Abrir el cofre con la llave', requires: { item: 'llave_vieja' }, lockedHint: 'Necesitás una llave', outcome: { next: 'm_sala' } },
    {
      id: 'combinado',
      label: 'Preguntarle a la guardiana por la última vez',
      requires: { all: [{ wounds: { lte: 2 } }, { met: 'guardiana' }] },
      lockedHint: 'La guardiana no te conoce',
      outcome: { next: 'm_sala' },
    },
  ],
} satisfies Scene;

export const m_cripta = {
  id: 'm_cripta',
  kind: 'normal',
  lethal: true,
  place: 'torre_vieja',
  variant: 'cripta',
  text: [
    'La cripta es un pasillo de losas sueltas sobre un pozo negro. Un fallo acá te puede matar.',
    'Del otro lado brilla algo que podría ser oro.',
  ],
  choices: [
    {
      id: 'cruzar',
      label: 'Cruzar las losas a la carrera',
      roll: {
        attr: 'vigor',
        difficulty: 'muy_dificil',
        tags: ['fisico'],
        outcomes: {
          success: { text: ['Cruzás sin que una sola losa se mueva.'], next: 'm_fin_tesoro' },
          partial: { text: ['Cruzás, pero una losa te muerde el tobillo.'], effects: [{ wound: 1 }], next: 'm_fin_tesoro' },
          failure: { text: ['El suelo se abre bajo tus pies.'], effects: [{ lethal: true }], next: 'm_fin_huida' },
        },
      },
    },
    {
      id: 'tantear',
      label: 'Tantear cada losa antes de pisar',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        outcomes: {
          success: { text: ['Encontrás las losas firmes una por una.'], next: 'm_fin_tesoro' },
          partial: { text: ['Casi todas eran firmes.'], effects: [{ wound: 1 }], next: 'm_fin_tesoro' },
          failure: { text: ['Una losa cede y volvés a la sala con el brazo raspado.'], effects: [{ wound: 1 }], next: 'm_sala' },
        },
      },
    },
    {
      id: 'rezar',
      label: 'Rezar y cruzar con los ojos cerrados',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['fe'],
        outcomes: {
          success: { text: ['Alguien te escuchó. Llegás al otro lado.'], next: 'm_fin_tesoro' },
          partial: { text: ['Llegás, temblando.'], effects: [{ addCondition: 'asustado' }], next: 'm_fin_tesoro' },
          failure: { text: ['Nadie te escuchó.'], effects: [{ lethal: true }], next: 'm_fin_huida' },
        },
      },
    },
    { id: 'retroceder', label: 'Retroceder a la sala', outcome: { next: 'm_sala' } },
  ],
} satisfies Scene;

export const m_fin_tesoro = {
  id: 'm_fin_tesoro',
  kind: 'ending',
  place: 'torre_vieja',
  variant: 'cripta',
  text: ['El cofre del fondo está lleno de monedas viejas y una llave de plata.'],
  choices: [],
  ending: { id: 'fin_tesoro', epilogue: ['Salís de la torre con las mangas pesadas. La guardiana no dice nada.'] },
} satisfies Scene;

export const m_fin_huida = {
  id: 'm_fin_huida',
  kind: 'ending',
  place: 'torre_vieja',
  text: ['Bajás la cuesta sin mirar atrás. La torre queda donde estaba.'],
  choices: [],
  ending: { id: 'fin_huida', epilogue: ['Con vida y sin tesoro. Hay peores maneras de terminar una noche.'] },
} satisfies Scene;

export const memoria: Campaign = {
  id: 'memoria',
  contentVersion: 1,
  title: 'La torre vieja',
  premise: 'Una torre, una guardiana y una cripta que no perdona.',
  cover: 'memoria_portada',
  levelRange: [3, 5],
  durationMin: [2, 5],
  lethalScenes: 1,
  lintProfile: 'smoke',
  hidden: true,
  start: 'm_puerta',
  scenes: { m_puerta, m_sala, m_cripta, m_fin_tesoro, m_fin_huida },
  npcs: {
    guardiana: { id: 'guardiana', name: 'La guardiana', portrait: 'guardiana', voice: 'Seca, de pocas palabras.', canonPrompt: 'Mujer mayor de capa gris.' },
  },
  places: {
    torre_vieja: {
      id: 'torre_vieja',
      name: 'La torre vieja',
      background: 'torre_vieja',
      variants: { interior: 'torre_vieja.interior', cripta: 'torre_vieja.cripta' },
      canonPrompt: 'Torre de piedra abandonada en una colina.',
    },
  },
  items: {
    llave_vieja: { id: 'llave_vieja', name: 'Llave vieja', icon: 'llave_vieja', description: 'Una llave oxidada que abre un cofre que no conocés.' },
  },
  flags: {
    'run:puerta_abierta': 'La puerta de la torre quedó abierta.',
    'run:secreto': 'Descubriste el pasadizo secreto.',
    'run:tesoro_a_la_vista': 'Sabés dónde está el tesoro.',
    'char:memoria.vio_la_cripta': 'Este personaje vio la cripta de la torre vieja.',
  },
  milestones: { llegar_a_la_puerta: { label: 'Llegar a la puerta de la torre' } },
  clocks: { ronda: { max: 3, label: 'Rondas en la sala' } },
  endings: {
    fin_tesoro: { title: 'El tesoro de la torre vieja' },
    fin_huida: { title: 'Con vida' },
  },
};

export const personajeMemoria: Character = {
  id: 'pj_memoria',
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
};

export function crearRunMemoria(parcial: Partial<Run> = {}): Run {
  return {
    campaignId: 'memoria',
    contentVersion: 1,
    sceneId: 'm_puerta',
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
    ...parcial,
  };
}

export function crearEstadoMemoria(
  parcial: { run?: Partial<Run>; character?: Partial<Character>; world?: Partial<WorldState>; seen?: SeenMap } = {},
): GameState {
  return {
    world: { flags: [], fallen: [], ...parcial.world },
    character: { ...personajeMemoria, ...parcial.character },
    run: crearRunMemoria(parcial.run),
    seen: parcial.seen ?? {},
  };
}
