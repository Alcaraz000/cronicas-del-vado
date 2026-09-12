import type { Scene } from '@/content/schema';

/**
 * Acto 2 de la campaña de humo: la escalera (que anuncia la cripta), la cripta (única escena mortal) y los dos finales.
 * A `p_cripta` solo se entra por opciones sin tirada (`bajar_cripta`, `estudiar_runas`); ningún roll ni redirect apunta a ella.
 */

export const p_escalera = {
  id: 'p_escalera',
  kind: 'normal',
  place: 'torre_abandonada',
  variant: 'noche',
  text: [
    'La escalera sube en caracol y también baja: un tramo estrecho se hunde hacia una cripta de la que sube un aire frío y dulce. Arriba no hay nada; la torre termina en un techo derrumbado y cielo. Lo que hay, está abajo.',
    {
      variants: [
        {
          when: { flag: 'char:prueba.vio_la_cripta' },
          text: 'Sabés lo que hay abajo porque las runas te lo contaron una vez: un puente de piedra sobre un pozo sin fondo y, del otro lado, el arca.',
        },
        { text: 'Alguien talló runas en el primer escalón hacia abajo. No parecen una bienvenida.' },
      ],
    },
    'Un fallo acá te puede matar. Lo sabés antes de bajar: la cripta no perdona un pie en falso.',
  ],
  choices: [
    {
      id: 'bajar_cripta',
      label: 'Bajar a la cripta',
      outcome: { text: ['Bajás con una mano en la pared. El frío sube a tu encuentro.'], next: 'p_cripta' },
    },
    {
      id: 'volver',
      label: 'Volver a la capilla',
      outcome: { text: ['Todavía no. Volvés sobre tus pasos hasta la capilla.'], next: 'p_capilla' },
    },
    {
      id: 'salir',
      label: 'Salir de la torre con lo puesto',
      outcome: { text: ['Decidís que el tesoro puede esperar a otro. Cruzás el umbral hacia la noche.'], next: 'p_fin_huida' },
    },
    {
      id: 'volver_umbral',
      label: 'Volver al umbral',
      outcome: { text: ['Bajás la escalera hasta el vestíbulo y te quedás un momento bajo el dintel.'], next: 'p_umbral' },
    },
    {
      id: 'estudiar_runas',
      label: 'Estudiar las runas del escalón',
      requires: { trait: 'aprendiz_de_escriba' },
      outcome: {
        text: [
          'Las runas no son una advertencia: son un plano. Marcan un puente de piedra sobre un pozo y señalan, con un trazo más hondo, el tercer bloque. Bajás sabiendo dónde no pisar.',
        ],
        effects: [{ set: 'char:prueba.vio_la_cripta' }],
        next: 'p_cripta',
      },
    },
  ],
} satisfies Scene;

export const p_cripta = {
  id: 'p_cripta',
  kind: 'normal',
  lethal: true,
  place: 'torre_abandonada',
  variant: 'cripta',
  text: [
    'La cripta es un puente de piedra de un paso de ancho sobre un pozo que no devuelve el eco. Del otro lado, sobre un pedestal, hay un arca de hierro con el mismo sello del dintel. El aire dulce viene de abajo, y abajo no hay fondo.',
    {
      variants: [
        {
          when: { flag: 'char:prueba.vio_la_cripta' },
          text: 'Las runas no mentían: el tercer bloque del puente está suelto, lo ves desde acá. Sabés dónde no pisar.',
        },
        { text: 'Algunos bloques del puente brillan de humedad. No hay forma de saber cuál aguanta sin pisarlo.' },
      ],
    },
    'Podés volver. Nadie te lo va a reprochar.',
  ],
  choices: [
    {
      id: 'cruzar',
      label: 'Cruzar el puente corriendo',
      roll: {
        attr: 'vigor',
        difficulty: 'muy_dificil',
        tags: ['fisico'],
        advantageIf: { flag: 'char:prueba.vio_la_cripta' },
        outcomes: {
          success: {
            text: ['Cruzás en seis zancadas y el puente ni se entera. El arca está fría y pesada, y es tuya.'],
            next: 'p_fin_tesoro',
          },
          partial: {
            text: [
              'El tercer bloque cede bajo tu pie; te tirás hacia adelante y caés de rodillas del otro lado, con la pierna abierta hasta el hueso. Pero del otro lado.',
            ],
            effects: [{ wound: 1 }],
            next: 'p_fin_tesoro',
          },
          failure: {
            text: [
              'El bloque cede y vos con él. Te agarrás del borde con una mano; la piedra te muerde el pecho al subir. Salís de la cripta a rastras, sin arca y sin aire, y de la torre como podés.',
            ],
            effects: [{ lethal: true }],
            next: 'p_fin_huida',
          },
        },
      },
    },
    {
      id: 'conjurar',
      label: 'Sostener el puente con un conjuro',
      roll: {
        attr: 'saber',
        difficulty: 'dificil',
        tags: ['magia'],
        outcomes: {
          success: {
            text: ['Decís las palabras y la piedra se acuerda de ser entera. Cruzás como quien cruza un salón.'],
            next: 'p_fin_tesoro',
          },
          partial: {
            text: ['El conjuro aguanta; vos no. Llegás al arca con las piernas temblando y las manos vacías de fuerza.'],
            effects: [{ addCondition: 'agotado' }],
            next: 'p_fin_tesoro',
          },
          failure: {
            text: [
              'Las palabras se te desarman en la boca y el puente también. Caés hasta que un saliente te frena con el sonido de algo que se rompe adentro. Trepás sin saber cómo y salís de la torre sin saber cuándo.',
            ],
            effects: [{ lethal: true }],
            next: 'p_fin_huida',
          },
        },
      },
    },
    {
      id: 'tantear',
      label: 'Tantear cada bloque antes de pisar',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        advantageIf: { flag: 'char:prueba.vio_la_cripta' },
        outcomes: {
          success: {
            text: ['Vas despacio, probando cada bloque con la punta del pie. Dos se mueven; los salteás. Llegás al arca con el corazón en la garganta y las manos limpias.'],
            next: 'p_fin_tesoro',
          },
          partial: {
            text: ['Tanteás mal un bloque, se hunde, y te raspás las piernas contra el borde al saltar. Llegás del otro lado sangrando.'],
            effects: [{ wound: 1 }],
            next: 'p_fin_tesoro',
          },
          failure: {
            text: ['A mitad del puente te falla el pulso. Retrocedés a tiempo, con un tobillo torcido, y subís a la escalera con el arca todavía del otro lado.'],
            effects: [{ wound: 1 }],
            next: 'p_escalera',
          },
        },
      },
    },
    {
      id: 'retroceder',
      label: 'Retroceder a la escalera',
      outcome: { text: ['Das un paso atrás, y otro. El aire dulce se queda abajo.'], next: 'p_escalera' },
    },
  ],
} satisfies Scene;

export const p_fin_tesoro = {
  id: 'p_fin_tesoro',
  kind: 'ending',
  place: 'torre_abandonada',
  variant: 'cripta',
  text: [
    'El arca no tiene cerradura: tiene un sello, y el sello cede cuando apoyás la palma. Adentro no hay oro. Hay un libro encuadernado en cuero negro, un anillo de plata sin piedra y una bolsa de monedas viejas que en la aldea van a valer más que el oro, porque nadie las vio nunca.',
    'Cerrás el arca, te la cargás al hombro y volvés a cruzar el puente, esta vez sin apuro.',
  ],
  choices: [],
  ending: {
    id: 'fin_tesoro',
    epilogue: [
      'Volvés a la aldea al amanecer con el arca al hombro. El centinela no está en el patio cuando salís; queda su manta y una mancha oscura en el brocal.',
      {
        variants: [
          { when: { wounds: { gte: 1 } }, text: 'Te cosen las heridas en la taberna y nadie te pregunta de dónde salieron. Con lo que hay en el arca, tampoco hace falta contarlo.' },
          { text: 'Entero y con plata: en la aldea no lo van a creer. No importa. Vos lo sabés.' },
        ],
      },
    ],
  },
} satisfies Scene;

export const p_fin_huida = {
  id: 'p_fin_huida',
  kind: 'ending',
  place: 'torre_abandonada',
  variant: 'noche',
  text: [
    'Cruzás el umbral y la torre queda atrás, negra contra un cielo que empieza a aclarar. El aire del claro es distinto: huele a hierba mojada y no a cera.',
    'No trajiste nada. Trajiste el cuerpo, que ya es bastante.',
  ],
  choices: [],
  ending: {
    id: 'fin_huida',
    epilogue: [
      {
        variants: [
          { when: { wounds: { gte: 2 } }, text: 'Llegás a la aldea a rastras y te desmayás en la puerta de la taberna. Cuando despertás, alguien te vendó y alguien más ya está contando que la torre casi te mata.' },
          { when: { wounds: { gte: 1 } }, text: 'Llegás a la aldea cojeando. Nadie te pregunta por el tesoro; te miran la sangre y sacan sus propias conclusiones.' },
          { text: 'Llegás a la aldea con las primeras luces, entero y con las manos vacías. Habrá otra noche.' },
        ],
      },
      'La torre sigue ahí. Siempre va a estar ahí.',
    ],
  },
} satisfies Scene;
