import type { Campaign } from '@/content/schema';

// Campaña mínima válida de 3 escenas. La reutilizan los tests de las tareas
// 5 a 13. Todo id lleva el prefijo m_ para que no choque con la campaña real.
// No la modifiques: si un test necesita otra forma, cloná y modificá el clon.
export const minimal: Campaign = {
  id: 'minimal',
  contentVersion: 1,
  title: 'Campaña mínima',
  premise: 'Un claro, un guía y un risco. Solo sirve para probar el motor.',
  cover: 'minimal',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  hidden: true,
  start: 'm_inicio',
  scenes: {
    m_inicio: {
      id: 'm_inicio',
      kind: 'normal',
      place: 'm_claro',
      npcs: ['m_guia'],
      onEnter: [{ milestone: 'm_llegar' }],
      text: [
        {
          variants: [
            { when: { visited: 'm_inicio', min: 1 }, text: 'El claro otra vez. La piedra plana sigue ahí, y el sendero que sube al risco también.' },
            { text: 'Llegás a un claro entre pinos. Hay una piedra plana en el centro y un sendero que sube hacia el risco.' },
          ],
        },
        {
          speaker: 'm_guia',
          variants: [
            { when: { trait: 'aprendiz_de_escriba' }, text: '—Vos tenés cara de haber leído más de un mapa. El risco está por ahí, si te animás.' },
            { text: '—El risco está por ahí, si te animás. Yo me quedo acá abajo.' },
          ],
        },
      ],
      choices: [
        { id: 'descansar', label: 'Sentarse junto a la piedra a descansar', outcome: { next: 'm_descanso' } },
        {
          id: 'partir',
          label: 'Partir por el sendero sin mirar atrás',
          outcome: { text: ['Dejás al guía con la palabra en la boca.'], effects: [{ set: 'run:partio' }], next: 'm_final' },
        },
        {
          id: 'recoger_piedra',
          label: 'Recoger una piedra lisa del arroyo',
          outcome: { text: ['Fría y pesada. Cabe en el puño.'], effects: [{ give: 'm_piedra' }], next: 'm_inicio' },
        },
        {
          id: 'esperar',
          label: 'Esperar a que baje el sol',
          outcome: { effects: [{ clock: 'm_noche', delta: 1 }], next: 'm_inicio' },
        },
        {
          id: 'trepar',
          label: 'Trepar el risco a pulso',
          roll: {
            attr: 'vigor',
            difficulty: 'normal',
            tags: ['fisico'],
            outcomes: {
              success: { text: ['Llegás arriba sin un rasguño y ves el camino real a lo lejos.'], effects: [{ set: 'char:minimal.trepo' }], next: 'm_final' },
              partial: { text: ['Llegás arriba, pero una laja suelta te abre la mano.'], effects: [{ wound: 1 }, { set: 'char:minimal.trepo' }], next: 'm_final' },
              failure: { text: ['Resbalás a mitad de camino y caés sobre la piedra plana.'], effects: [{ wound: 1 }], next: 'm_descanso' },
            },
          },
        },
      ],
    },
    m_descanso: {
      id: 'm_descanso',
      kind: 'rest',
      place: 'm_claro',
      variant: 'noche',
      onEnter: [{ heal: 1 }, { removeCondition: 'all' }],
      text: [
        'Te sentás contra la piedra. La noche baja fría y el guía se queda callado, mirando el fuego.',
        'Cuando abrís los ojos, el dolor es menos.',
      ],
      choices: [
        { id: 'volver', label: 'Volver al centro del claro', outcome: { next: 'm_inicio' } },
        { id: 'partir', label: 'Partir por el sendero', outcome: { effects: [{ set: 'run:partio' }], next: 'm_final' } },
        { id: 'dormir', label: 'Dormir un rato más', outcome: { effects: [{ clock: 'm_noche', delta: 1 }], next: 'm_descanso' } },
        { id: 'mirar_cielo', label: 'Mirar el cielo hasta contar diez estrellas', outcome: { text: ['Contás doce.'], next: 'm_descanso' } },
      ],
    },
    m_final: {
      id: 'm_final',
      kind: 'ending',
      place: 'm_claro',
      text: ['Dejás el claro atrás. El guía no te saluda; tampoco te lo esperabas.'],
      choices: [],
      ending: {
        id: 'm_fin',
        epilogue: ['El sendero te lleva de vuelta al camino real antes del amanecer.'],
      },
    },
  },
  npcs: {
    m_guia: {
      id: 'm_guia',
      name: 'El guía',
      portrait: 'm_guia',
      voice: 'Seco, de pocas palabras; nunca pregunta dos veces.',
      canonPrompt: 'hombre mayor de barba corta, capa de lana gris, mirada cansada',
    },
  },
  places: {
    m_claro: {
      id: 'm_claro',
      name: 'El claro',
      background: 'm_claro',
      variants: { noche: 'm_claro.noche' },
      canonPrompt: 'claro entre pinos, piedra plana en el centro, sendero hacia un risco',
    },
  },
  items: {
    m_piedra: {
      id: 'm_piedra',
      name: 'Piedra lisa',
      icon: 'm_piedra',
      description: 'Una piedra del arroyo, pulida y fría. Cabe en el puño.',
      advantageTags: ['sigilo'],
    },
  },
  flags: {
    'run:partio': 'Elegiste partir sin descansar.',
    'char:minimal.trepo': 'Trepaste el risco alguna vez.',
  },
  milestones: {
    m_llegar: { label: 'Llegar al claro' },
  },
  clocks: {
    m_noche: { max: 3, label: 'La noche avanza' },
  },
  endings: {
    m_fin: { title: 'De vuelta al camino' },
  },
};
