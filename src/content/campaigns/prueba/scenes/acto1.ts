import type { Scene } from '@/content/schema';

/**
 * Acto 1 de la campaña de humo: entrada a la torre, el centinela, el patio (dos rondas), la victoria y la capilla.
 * Convenciones de prosa: segunda persona, presente, voseo en diálogos; variantes de memoria solo en el narrador.
 *
 * Invariante del centinela (la lee `p_victoria` para elegir si narra la pelea o el patio vacío):
 * 1. TODO desenlace que suma al reloj `pelea` fija además `run:centinela_abatido` — en las dos rondas
 *    del encuentro (`p_patio` y `p_patio_2`), porque las dos comparten el reloj y se puede volver a la
 *    ronda 1 desde la capilla y llenarlo ahí.
 * 2. TODA resolución pacífica que fija `run:centinela_vencido` (`p_biblioteca.hablar.success` y
 *    `p_patio_2.llave`) limpia `run:centinela_abatido`: los golpes previos dejan de contar.
 * 3. `p_victoria.onEnter` solo reafirma `run:centinela_vencido` y nunca toca `run:centinela_abatido`.
 * Al agregar o mover un desenlace de combate hay que respetar 1 y 2; `tests/content/prueba.test.ts` las
 * comprueba sobre toda la campaña (describe "ronda de arreglo 4"), no escena por escena.
 */

export const p_umbral = {
  id: 'p_umbral',
  kind: 'hub',
  place: 'torre_abandonada',
  variant: 'noche',
  onEnter: [{ milestone: 'entrar_a_la_torre' }],
  redirect: [{ when: { flag: 'run:centinela_vencido' }, to: 'p_escalera' }],
  text: [
    {
      variants: [
        {
          when: { visited: 'p_umbral', min: 1 },
          text: 'Otra vez el umbral. La puerta de hierro sigue entornada y el viento que baja por la escalera trae el mismo olor a cera vieja y a piedra mojada. La torre no te va a recibir mejor por volver.',
        },
        {
          text: 'La torre abandonada se levanta contra la noche como un diente roto. La puerta de hierro está entornada y, del otro lado, un vestíbulo de losas hundidas reparte tres caminos: una escalera que sube hacia lo oscuro detrás de una puerta cerrada, un pasillo a la izquierda con olor a cera y un arco bajo a la derecha.',
        },
      ],
    },
    {
      variants: [
        {
          when: { knows: 'torre_abandonada' },
          text: 'Conocés este lugar de otra crónica. Recordás la inscripción sobre el dintel, la biblioteca vacía al final del pasillo y que el patio, detrás del arco, nunca está tan solo como parece.',
        },
        {
          text: 'Sobre el dintel hay una inscripción tallada que la lluvia casi borró. El pasillo de la izquierda lleva a lo que fue una biblioteca y, más allá, a una capilla; el arco de la derecha da a un patio en sombras.',
        },
      ],
    },
    'Nadie te espera y nadie te mandó. El tesoro del que hablan en la aldea está arriba, al final de la escalera, o no está en ningún lado.',
  ],
  choices: [
    {
      id: 'leer_inscripcion',
      label: 'Leer la inscripción del dintel',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber'],
        outcomes: {
          success: {
            text: [
              'Las letras se dejan leer cuando dejás de mirarlas de frente: «La llave duerme bajo la piedra que llora». A la derecha del dintel una piedra suelta suda humedad; detrás, envuelta en un trapo, hay una llave de hierro. Con ella en la mano seguís por el pasillo hacia la biblioteca.',
            ],
            effects: [{ give: 'llave_de_hierro' }, { set: 'run:tiene_pista' }],
            next: 'p_biblioteca',
          },
          partial: {
            text: [
              'Entendés la mitad: algo sobre una llave y algo sobre alguien que «no duerme». Lo segundo te queda dando vueltas mientras avanzás por el pasillo, y cada crujido te suena a un paso.',
            ],
            effects: [{ addCondition: 'asustado' }],
            next: 'p_biblioteca',
          },
          failure: {
            text: [
              'Las letras son ruido. Perdés un rato largo frotando musgo y no sacás nada en limpio, salvo que hace frío. Seguís por el pasillo hacia la biblioteca.',
            ],
            effects: [{ clock: 'pelea', delta: 0 }],
            next: 'p_biblioteca',
          },
        },
      },
    },
    {
      id: 'forzar_puerta',
      label: 'Forzar a hombros la puerta interior',
      roll: {
        attr: 'vigor',
        difficulty: 'dificil',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: [
              'La madera cede al segundo empujón con un estruendo que retumba por toda la torre. Entrás de golpe en la biblioteca, con el hombro dolorido pero entero.',
            ],
            next: 'p_biblioteca',
          },
          partial: {
            text: [
              'La puerta cede, pero una bisagra suelta te abre la frente al caer. Entrás en la biblioteca limpiándote la sangre de los ojos.',
            ],
            effects: [{ wound: 1 }],
            next: 'p_biblioteca',
          },
          failure: {
            text: [
              'La puerta no se mueve; vos sí. Rebotás contra el marco, te doblás una muñeca y, cuando levantás la vista, hay alguien parado en el arco del patio, mirándote.',
            ],
            effects: [{ wound: 1 }],
            next: 'p_patio',
          },
        },
      },
    },
    {
      id: 'rodear_patio',
      label: 'Rodear por el patio',
      outcome: {
        text: ['Elegís el arco bajo y salís al aire frío del patio.'],
        next: 'p_patio',
      },
    },
    {
      id: 'descansar_capilla',
      label: 'Refugiarte en la capilla',
      outcome: {
        text: ['Seguís el olor a cera por el pasillo, pasás de largo la biblioteca y empujás la puerta de la capilla.'],
        next: 'p_capilla',
      },
    },
  ],
} satisfies Scene;

export const p_biblioteca = {
  id: 'p_biblioteca',
  kind: 'normal',
  place: 'torre_abandonada',
  variant: 'noche',
  npcs: ['centinela'],
  text: [
    'La biblioteca es un cascarón: estantes vacíos, un atril volcado y un candil que alguien encendió hace poco. Demasiado poco.',
    {
      variants: [
        {
          when: { flag: 'run:centinela_vencido' },
          text: 'Del fondo no sale nadie a cortarte el paso esta vez. El centinela ya no tiene nada que reclamarte, y vos nada que temer de este rincón.',
        },
        {
          when: { flag: 'run:tiene_pista' },
          text: 'Sabés, por la inscripción, que la llave que llevás abre la puerta de la escalera. Lo que no sabías es que la escalera tiene dueño: del fondo sale un hombre con una lanza corta y una cota que le queda grande.',
        },
        {
          text: 'Del fondo sale un hombre con una lanza corta y una cota que le queda grande. No parece un ladrón; parece alguien a quien le pagan por quedarse.',
        },
      ],
    },
    {
      speaker: 'centinela',
      variants: [
        {
          when: { flag: 'run:centinela_vencido' },
          text: '—Ya está, ¿no? Andá. No tengo nada más para decirte.',
        },
        {
          when: { class: 'mago' },
          text: '—Otro de túnica. Los de túnica siempre quieren subir. Nadie sube, y menos de noche. Date la vuelta.',
        },
        {
          text: '—Nadie sube. Me pagan por eso y no me pagan poco. Date la vuelta o vas a tener que pasar por encima mío.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'hablar',
      label: 'Convencer al centinela de que te deje subir',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: {
            text: [
              '—Está bien —dice, después de un silencio largo—. Pero yo no te vi. —Se hace a un lado y te señala la puerta de la escalera con el mentón.',
            ],
            effects: [{ set: 'run:centinela_vencido' }, { clear: 'run:centinela_abatido' }],
            next: 'p_escalera',
          },
          partial: {
            text: ['Duda. Baja la lanza, la vuelve a levantar. —Afuera. Hablamos afuera. —Y te empuja por el pasillo hasta el patio.'],
            next: 'p_patio',
          },
          failure: {
            text: [
              '—Ya te dije. —No espera a que termines: te corre por el pasillo hasta el patio, y con él no viene solo la lanza, viene el silbato.',
            ],
            effects: [{ addCondition: 'perseguido' }],
            next: 'p_patio',
          },
        },
      },
    },
    {
      id: 'esconderse',
      label: 'Esconderte entre los estantes y esperar a que se vaya',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo'],
        outcomes: {
          success: {
            text: [
              'Te hacés uno con la sombra del estante caído. El centinela pasa a dos palmos, revisa el atril, putea por lo bajo y vuelve a su rincón. Cuando se duerme apoyado en la lanza, te escurrís hasta la escalera.',
            ],
            next: 'p_escalera',
          },
          partial: {
            text: [
              'Te asomás por la ventana rota y bajás por el canalón, que se desprende cuando vas por la mitad. Caés en la cisterna. Llegás a la escalera chorreando agua y con los dientes apretados.',
            ],
            effects: [{ addCondition: 'empapado' }],
            next: 'p_escalera',
          },
          failure: {
            text: ['Un libro cae del estante y el ruido te delata. —Ahí estás. —Salís corriendo por donde podés: al patio.'],
            next: 'p_patio',
          },
        },
      },
    },
    {
      id: 'volver',
      label: 'Volver al umbral',
      outcome: {
        text: ['Retrocedés por el pasillo sin darle la espalda del todo, hasta el umbral.'],
        next: 'p_umbral',
      },
    },
    {
      id: 'capilla',
      label: 'Retirarte a la capilla',
      outcome: {
        text: ['Te retirás despacio, con las manos a la vista, y empujás la puerta de la capilla.'],
        next: 'p_capilla',
      },
    },
  ],
} satisfies Scene;

export const p_patio = {
  id: 'p_patio',
  kind: 'encounter',
  place: 'torre_abandonada',
  variant: 'noche',
  npcs: ['centinela'],
  redirect: [{ when: { flag: 'run:centinela_vencido' }, to: 'p_victoria' }],
  text: [
    'El patio es un cuadrado de losas rotas con un aljibe seco en el medio. El centinela te sigue hasta acá, o ya estaba: la lanza baja, la cota suena.',
    {
      speaker: 'centinela',
      variants: [{ text: '—Te lo dije por las buenas. Ahora es a mi manera.' }],
    },
    'No hay más que una salida: el arco por donde entraste. Él lo sabe tanto como vos.',
  ],
  choices: [
    {
      id: 'golpear',
      label: 'Golpear primero',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: ['Le entrás por debajo de la lanza y le cruzás la cara con el puño cerrado. Cae contra el aljibe y escupe un diente.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Le das, y él también: la lanza te abre el brazo mientras tu golpe le parte la ceja.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }, { wound: 1 }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['Amagás, él no. La punta de la lanza te encuentra el muslo antes de que llegues a tocarlo.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'enganar',
      label: 'Fingir que te rendís y atacar a traición',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['engano'],
        outcomes: {
          success: {
            text: ['Levantás las manos. Se acerca a atarte y, cuando está a un paso, le metés la rodilla en el estómago. Se dobla sin aire.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Baja la guardia lo justo: le pegás, pero el brillo de sus ojos cuando se recupera te hiela la sangre.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }, { addCondition: 'asustado' }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['—Ese truco lo hacen todos. —No baja la guardia, y la lanza te encuentra el costado.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'rendirse',
      label: 'Rendirte y dejar las manos a la vista',
      outcome: {
        text: [
          'Bajás las manos y las dejás donde las vea. Él no se relaja. —A la capilla. Y no salgas hasta que amanezca. —Entrás con las piernas temblando.',
        ],
        effects: [{ addCondition: 'asustado' }],
        next: 'p_capilla',
      },
    },
    {
      id: 'huir',
      label: 'Escapar por el arco',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['huida'],
        outcomes: {
          success: {
            text: ['Fintás hacia el aljibe, girás y pasás el arco antes de que reaccione. Ya no te sigue: te metés en la capilla.'],
            next: 'p_capilla',
          },
          partial: {
            text: ['Cruzás el arco con la lanza rozándote la espalda: te llevás un tajo de recuerdo hasta la capilla.'],
            effects: [{ wound: 1 }],
            next: 'p_capilla',
          },
          failure: {
            text: ['El arco está más lejos de lo que parecía. Te alcanza y te tira al suelo de un golpe en la nuca.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
  ],
} satisfies Scene;

export const p_patio_2 = {
  id: 'p_patio_2',
  kind: 'encounter',
  place: 'torre_abandonada',
  variant: 'noche',
  npcs: ['centinela'],
  redirect: [{ when: { clock: 'pelea', gte: 2 }, to: 'p_victoria' }],
  text: [
    {
      variants: [
        {
          when: { clock: 'pelea', gte: 1 },
          text: 'El centinela sangra por la ceja y respira con la boca abierta. Retrocede un paso hacia el aljibe: lo tenés cerca de las cuerdas.',
        },
        {
          text: 'El centinela ni se despeinó. Gira la lanza con la calma de quien hizo esto muchas veces y avanza para cerrarte el arco.',
        },
      ],
    },
    {
      variants: [
        { when: { wounds: { gte: 1 } }, text: 'Vos también sangrás. Cada movimiento cuesta un poco más que el anterior.' },
        { text: 'Todavía estás entero. No va a durar si esto sigue.' },
      ],
    },
    {
      speaker: 'centinela',
      variants: [{ text: '—Podés irte. Todavía podés irte.' }],
    },
  ],
  choices: [
    {
      id: 'rematar',
      label: 'Rematarlo contra el aljibe',
      requires: { clock: 'pelea', gte: 1 },
      lockedHint: 'Todavía no lo tenés contra las cuerdas',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: ['Lo agarrás de la cota y lo estrellás contra el brocal. Se queda quieto.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Lo tirás al suelo, pero te lleva con él y su codo te encuentra las costillas.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }, { wound: 1 }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['Te tirás encima y esquiva: caés contra el brocal y él remata desde arriba.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'llave',
      label: 'Cruzar la puerta de la escalera y trabarla con la llave',
      requires: { item: 'llave_de_hierro' },
      lockedHint: 'Necesitás algo con qué trabar la puerta',
      outcome: {
        text: [
          'Retrocedés hasta la puerta de la escalera, entrás y girás la llave de hierro por dentro. Del otro lado el centinela golpea, putea y golpea. La puerta aguanta.',
        ],
        effects: [{ set: 'run:centinela_vencido' }, { clear: 'run:centinela_abatido' }],
        next: 'p_escalera',
      },
    },
    {
      id: 'golpear',
      label: 'Golpear otra vez',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: ['Esta vez no amagás: el puño le entra por debajo de la mandíbula y se le doblan las rodillas.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Cambian golpe por golpe: él escupe sangre, vos también.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }, { wound: 1 }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['Te lee el golpe antes de que salga y te castiga con el asta en las costillas.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'provocar',
      label: 'Provocarlo para que se descuide',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: {
            text: ['—¿Eso es todo lo que te pagan? —Se le va la calma: viene de frente, sin cubrirse, y le entrás por el costado.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Se enfurece, y la furia lo hace rápido: te alcanza antes de que aproveches la abertura, pero deja la guardia abierta y la pagás con creces.'],
            effects: [{ clock: 'pelea', delta: 1 }, { set: 'run:centinela_abatido' }, { addCondition: 'asustado' }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['Se ríe. —Hablás mucho. —Y te pega.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'rendirse',
      label: 'Rendirte y dejar las manos a la vista',
      outcome: {
        text: ['Levantás las manos. Él baja la lanza un dedo, no más. —A la capilla. Ya. —Obedecés.'],
        effects: [{ addCondition: 'asustado' }],
        next: 'p_capilla',
      },
    },
    {
      id: 'huir',
      label: 'Escapar por el arco',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['huida'],
        outcomes: {
          success: {
            text: ['Le tirás una losa suelta a los pies y pasás el arco mientras la esquiva. No te sigue: te metés en la capilla.'],
            next: 'p_capilla',
          },
          partial: {
            text: ['Llegás al arco con la punta de la lanza clavada en el hombro. La capilla te recibe con la sangre goteando.'],
            effects: [{ wound: 1 }],
            next: 'p_capilla',
          },
          failure: {
            text: ['Te corta el paso antes de que llegues al arco y te devuelve al patio de un lanzazo.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
  ],
} satisfies Scene;

export const p_victoria = {
  id: 'p_victoria',
  kind: 'normal',
  place: 'torre_abandonada',
  variant: 'noche',
  npcs: ['centinela'],
  onEnter: [{ set: 'run:centinela_vencido' }],
  text: [
    {
      variants: [
        {
          when: { visited: 'p_victoria', min: 1 },
          text: 'El patio sigue como lo dejaste: el aljibe seco, las losas frías, ni un alma. Ya no hay nada acá que valga la pena mirar dos veces.',
        },
        {
          when: { flag: 'run:centinela_abatido' },
          text: 'El centinela queda tirado contra el aljibe, respirando con un silbido. No lo mataste. Le sacás la lanza de la mano y la tirás dentro del aljibe seco: cae sin ruido.',
        },
        {
          text: 'El patio está tranquilo, casi vacío. Del centinela no hay rastro: como haya sido, ya no tiene nada que reclamarte.',
        },
      ],
    },
    {
      speaker: 'centinela',
      variants: [
        {
          when: { visited: 'p_victoria', min: 1 },
          text: '—¿Otra vez vos? —Ni te mira—. Ya no tengo nada que agregar.',
        },
        {
          when: { flag: 'run:centinela_abatido' },
          text: '—Andá. Andá y que te sirva. —Cierra los ojos.',
        },
        {
          text: '—Andá. No tengo ganas de discutirlo de nuevo.',
        },
      ],
    },
    'La puerta de la escalera está a diez pasos. Nada te la cierra ahora, salvo lo que decidas.',
  ],
  choices: [
    {
      id: 'subir',
      label: 'Subir por la escalera',
      outcome: { text: ['Abrís la puerta de la escalera y el frío te sale al encuentro.'], next: 'p_escalera' },
    },
    {
      id: 'descansar',
      label: 'Curarte en la capilla antes de seguir',
      outcome: { text: ['Cruzás el arco y te metés en la capilla arrastrando los pies.'], next: 'p_capilla' },
    },
    {
      id: 'registrar',
      label: 'Registrar la biblioteca',
      outcome: { text: ['Volvés a la biblioteca con el candil del centinela en la mano.'], next: 'p_biblioteca' },
    },
    {
      id: 'salir',
      label: 'Salir de la torre con lo puesto',
      outcome: { text: ['Ya tuviste suficiente. Cruzás el umbral hacia la noche y no mirás atrás.'], next: 'p_fin_huida' },
    },
  ],
} satisfies Scene;

export const p_capilla = {
  id: 'p_capilla',
  kind: 'rest',
  place: 'torre_abandonada',
  variant: 'noche',
  onEnter: [{ heal: 1 }, { removeCondition: 'all' }],
  text: [
    {
      variants: [
        { when: { visited: 'p_capilla', min: 1 }, text: 'La capilla, otra vez. El banco donde te sentaste sigue tibio, o eso te parece.' },
        {
          text: 'La capilla es una sala estrecha con un altar sin santo y dos velas que alguien mantiene encendidas. Acá no llega el viento ni, por lo visto, el centinela.',
        },
      ],
    },
    'Te sentás en el banco, respirás hondo y dejás que la sangre se seque. Cuando te levantás, el cuerpo protesta menos.',
  ],
  choices: [
    {
      id: 'volver_umbral',
      label: 'Volver al umbral',
      outcome: { text: ['Salís de la capilla y desandás el pasillo hasta el umbral.'], next: 'p_umbral' },
    },
    {
      id: 'ir_biblioteca',
      label: 'Ir a la biblioteca',
      outcome: { text: ['Tomás el pasillo hacia la biblioteca, con el olor a cera pegado a la ropa.'], next: 'p_biblioteca' },
    },
    {
      id: 'subir',
      label: 'Subir por la escalera',
      requires: { flag: 'run:centinela_vencido' },
      lockedHint: 'El centinela sigue en el patio',
      outcome: { text: ['Con el camino libre, cruzás hasta la puerta de la escalera y entrás.'], next: 'p_escalera' },
    },
    {
      id: 'salir',
      label: 'Salir de la torre y volver a la aldea',
      outcome: { text: ['Apagás una de las velas por costumbre y salís de la torre. La noche está más tibia afuera.'], next: 'p_fin_huida' },
    },
    {
      id: 'salir_al_patio',
      label: 'Salir al patio',
      outcome: { text: ['Abrís la puerta lateral de la capilla y salís al patio.'], next: 'p_patio' },
    },
  ],
} satisfies Scene;
