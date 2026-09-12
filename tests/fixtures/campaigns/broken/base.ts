import type { Campaign, Choice, Scene, WorldContent } from '@/content/schema';

export const mundoDePrueba: WorldContent = {
  npcs: { viajero: { id: 'viajero', name: 'El viajero', portrait: 'viajero', voice: 'Cansado y amable.', canonPrompt: 'Hombre mayor con capa gris.' } },
  places: {},
  items: { reliquia_de_prueba: { id: 'reliquia_de_prueba', name: 'Reliquia de prueba', icon: 'reliquia', description: 'Un objeto que persiste entre campañas.', relic: true } },
  flags: { 'char:met.*': 'PNJ conocidos', 'char:place.*': 'Lugares conocidos', 'char:origen.*': 'Rasgos de origen', 'char:leyenda': 'Nivel 10', 'world:caido.*': 'Personajes caídos' },
};

export const b_inicio: Scene = {
  id: 'b_inicio', kind: 'hub', place: 'b_plaza', npcs: ['b_guia'],
  onEnter: [{ milestone: 'b_llegar' }],
  text: [
    'Llegás a la plaza con la lluvia en la nuca.',
    { variants: [
      { when: { visited: 'b_inicio', min: 1 }, text: 'Otra vez la plaza.' },
      { when: { knows: 'b_plaza' }, text: 'Conocés esta plaza de otra crónica.' },
      { text: 'La plaza está vacía.' } ] },
    { speaker: 'b_guia', variants: [
      { when: { trait: 'desertor' }, text: '—Un soldado. Se nota en cómo parás.' },
      { text: '—Bienvenido. No te quedes bajo el agua.' } ] },
  ],
  choices: [
    { id: 'pelear', label: 'Encarar al guía', outcome: { next: 'b_ronda1' } },
    { id: 'bajar', label: 'Bajar a la cripta', outcome: { next: 'b_cripta' } },
    { id: 'hablar', label: 'Hablar con el guía', roll: { attr: 'presencia', difficulty: 'normal', tags: ['social'], outcomes: {
      success: { text: ['El guía te entrega una llave.'], effects: [{ set: 'run:b_hablo' }, { give: 'b_llave' }], next: 'b_fin_a' },
      partial: { effects: [{ addCondition: 'asustado' }], next: 'b_fin_a' },
      failure: { text: ['Te da la espalda.'], next: 'b_inicio' } } } },
    { id: 'descansar', label: 'Buscar refugio', outcome: { next: 'b_descanso' } },
    { id: 'recordar', label: 'Ir directo al final que recordás', requires: { flag: 'char:base.recuerdo' }, lockedHint: 'No recordás nada todavía', outcome: { next: 'b_fin_a' } },
  ],
};

const golpe = (next: string): Choice => ({ id: 'golpear', label: 'Golpear', roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: {
  success: { effects: [{ clock: 'b_pelea', delta: 1 }], next },
  partial: { effects: [{ clock: 'b_pelea', delta: 1 }, { wound: 1 }], next },
  failure: { effects: [{ wound: 1 }], next } } } });

const engano = (next: string): Choice => ({ id: 'enganar', label: 'Engañar', roll: { attr: 'astucia', difficulty: 'normal', tags: ['engano'], outcomes: {
  success: { effects: [{ clock: 'b_pelea', delta: 1 }], next },
  partial: { effects: [{ clock: 'b_pelea', delta: 1 }, { addCondition: 'asustado' }], next },
  failure: { effects: [{ wound: 1 }], next } } } });

const huida = (next: string): Choice => ({ id: 'huir', label: 'Huir', roll: { attr: 'astucia', difficulty: 'normal', tags: ['huida'], outcomes: {
  success: { next: 'b_descanso' },
  partial: { effects: [{ wound: 1 }], next: 'b_descanso' },
  failure: { effects: [{ wound: 1 }], next } } } });

export const b_ronda1: Scene = {
  id: 'b_ronda1', kind: 'encounter', place: 'b_plaza',
  text: ['El guía saca un cuchillo.'],
  choices: [golpe('b_ronda2'), engano('b_ronda2'), { id: 'ceder', label: 'Ceder', outcome: { next: 'b_descanso' } }, huida('b_ronda2')],
};

export const b_ronda2: Scene = {
  id: 'b_ronda2', kind: 'encounter', place: 'b_plaza',
  redirect: [{ when: { clock: 'b_pelea', gte: 2 }, to: 'b_fin_a' }],
  text: ['Sangra, pero no suelta el cuchillo.'],
  choices: [
    { id: 'rematar', label: 'Rematar', requires: { clock: 'b_pelea', gte: 1 }, lockedHint: 'Todavía está entero', roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: {
      success: { effects: [{ clock: 'b_pelea', delta: 1 }], next: 'b_ronda2' },
      partial: { effects: [{ clock: 'b_pelea', delta: 1 }, { wound: 1 }], next: 'b_ronda2' },
      failure: { effects: [{ wound: 1 }], next: 'b_ronda2' } } } },
    golpe('b_ronda2'), engano('b_ronda2'),
    { id: 'ceder', label: 'Ceder', outcome: { next: 'b_descanso' } },
    huida('b_ronda2'),
  ],
};

export const b_descanso: Scene = {
  id: 'b_descanso', kind: 'rest', place: 'b_plaza', npcs: ['viajero'],
  onEnter: [{ heal: 1 }, { removeCondition: 'all' }],
  text: [
    { speaker: 'viajero', variants: [
      { when: { met: 'viajero' }, text: '—Otra vez vos. Sentate.' },
      { text: '—Sentate. El fuego alcanza para dos.' } ] },
  ],
  choices: [
    { id: 'volver', label: 'Volver a la plaza', outcome: { next: 'b_inicio' } },
    { id: 'pelear', label: 'Buscar al guía', outcome: { next: 'b_ronda1' } },
    { id: 'bajar', label: 'Bajar a la cripta', outcome: { next: 'b_cripta' } },
    { id: 'irse', label: 'Irse del pueblo', outcome: { next: 'b_fin_b' } },
    { id: 'mirar', label: 'Mirar el fuego', outcome: { text: ['El fuego sigue.'], next: 'b_descanso' } },
    { id: 'abrir', label: 'Abrir el cofre del viajero', requires: { item: 'b_llave' }, lockedHint: 'Falta la llave', outcome: { next: 'b_fin_a' } },
  ],
};

export const b_cripta: Scene = {
  id: 'b_cripta', kind: 'normal', lethal: true, place: 'b_plaza',
  text: ['La cripta huele a agua vieja. Un fallo acá te puede matar.'],
  choices: [
    { id: 'cruzar', label: 'Cruzar a la fuerza', roll: { attr: 'vigor', difficulty: 'muy_dificil', tags: ['fisico'], outcomes: {
      success: { next: 'b_fin_a' }, partial: { effects: [{ wound: 1 }], next: 'b_fin_a' }, failure: { effects: [{ lethal: true }], next: 'b_fin_b' } } } },
    { id: 'conjurar', label: 'Conjurar una luz', roll: { attr: 'saber', difficulty: 'dificil', tags: ['magia'], outcomes: {
      success: { effects: [{ set: 'char:base.recuerdo' }], next: 'b_fin_a' }, partial: { effects: [{ addCondition: 'agotado' }], next: 'b_fin_a' }, failure: { effects: [{ lethal: true }], next: 'b_fin_b' } } } },
    { id: 'tantear', label: 'Tantear el suelo', roll: { attr: 'astucia', difficulty: 'normal', tags: ['percepcion'], outcomes: {
      success: { next: 'b_fin_a' }, partial: { effects: [{ wound: 1 }], next: 'b_fin_a' }, failure: { effects: [{ wound: 1 }], next: 'b_descanso' } } } },
    { id: 'retroceder', label: 'Retroceder', outcome: { next: 'b_descanso' } },
  ],
};

export const b_fin_a: Scene = { id: 'b_fin_a', kind: 'ending', place: 'b_plaza', text: ['Termina.'], choices: [], ending: { id: 'fin_a', epilogue: ['Ganaste.'] } };
export const b_fin_b: Scene = { id: 'b_fin_b', kind: 'ending', place: 'b_plaza', text: ['Termina.'], choices: [], ending: { id: 'fin_b', epilogue: ['Sobreviviste.'] } };

export const campanaBase: Campaign = {
  id: 'base', contentVersion: 1, title: 'Campaña base de fixtures', premise: 'Una campaña mínima válida para probar el validador.', cover: 'base',
  levelRange: [1, 3], durationMin: [5, 10], lethalScenes: 1, lintProfile: 'release', start: 'b_inicio',
  scenes: { b_inicio, b_ronda1, b_ronda2, b_descanso, b_cripta, b_fin_a, b_fin_b },
  npcs: { b_guia: { id: 'b_guia', name: 'El guía', portrait: 'b_guia', voice: 'Seco.', canonPrompt: 'Hombre delgado con farol.' } },
  places: { b_plaza: { id: 'b_plaza', name: 'La plaza', background: 'b_plaza', canonPrompt: 'Plaza empedrada bajo la lluvia.' } },
  items: { b_llave: { id: 'b_llave', name: 'Llave del guía', icon: 'llave', description: 'Abre un cofre.', advantageTags: ['sigilo'] } },
  flags: { 'run:b_hablo': 'Hablaste con el guía', 'char:base.recuerdo': 'Viste la luz de la cripta' },
  milestones: { b_llegar: { label: 'Llegar a la plaza' } },
  clocks: { b_pelea: { max: 2, label: 'Pelea' } },
  endings: { fin_a: { title: 'Final A' }, fin_b: { title: 'Final B', hidden: true } },
};

export function conEscena(base: Campaign, scene: Scene): Campaign {
  return { ...base, scenes: { ...base.scenes, [scene.id]: scene } };
}

export function opcion(scene: Scene, id: string): Choice {
  const found = scene.choices.find((c) => c.id === id);
  if (!found) throw new Error(`Fixture: la escena ${scene.id} no tiene la opción ${id}`);
  return found;
}

export function conOpcion(scene: Scene, choice: Choice): Scene {
  return { ...scene, choices: scene.choices.map((c) => (c.id === choice.id ? choice : c)) };
}

export function sinOpcion(scene: Scene, id: string): Scene {
  return { ...scene, choices: scene.choices.filter((c) => c.id !== id) };
}
