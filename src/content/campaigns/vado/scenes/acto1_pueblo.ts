import type { Scene } from '@/content/schema';

/**
 * Acto 1 de "El vado de Aldamar", bloque del pueblo: el hub de la plaza, el Ancla Seca con sus dos
 * satélites, la posada y el floodgate de la ronda.
 *
 * ESQUELETO (Fase C). Todo `text` es `['TODO']` y los `outcome.text` se omiten a propósito; lo que
 * está escrito de verdad es la estructura: `kind`, `place`, `npcs`, `onEnter`, `redirect`, los
 * `label` de las opciones, sus `requires`/`lockedHint`, sus tiradas y todos los `next`.
 *
 * Contratos que este archivo sostiene (outline §8):
 * - **`a1_plaza.redirect` va en este orden y el orden importa:** `[0]` el floodgate de `sospecha`
 *   → `a1_ronda`, `[1]` las tres pistas + `visited >= 3` → `c1_cuerpo`. Con las dos condiciones
 *   ciertas gana la primera, y tiene que ganar el castigo: si no, llenar `sospecha` no se cobra.
 * - **`a1_plaza` está en 8 opciones / 6 libres: queda margen de UNA sola** antes del techo de 9 de
 *   `LIMITS.maxChoices`. Las dos opciones que vuelven al propio hub (`mirar_el_pozo`,
 *   `leer_el_poste_de_bandos`) son la única excepción declarada a "ninguna opción vuelve a su
 *   escena" (biblia §6.3) y llevan texto de outcome obligatorio cuando se escriba la prosa.
 * - **`a1_posada` no cobra `sospecha` y no cura Heridas** (biblia §7.1): limpia condiciones y hace
 *   pasar la noche. El tic de descanso existe solo en las dos `rest` del acto 2.
 * - **`a1_ronda` manda siempre a `c1_cuerpo`** y a ninguna otra escena: el floodgate cambia con qué
 *   información entrás al cuello 1, nunca te quita la escena.
 * - Ningún `set`/`clear` de acá toca un espacio compartido (`char:met.*`, `char:place.*`,
 *   `char:origen.*`, `char:leyenda`, `world:caido.*`): solo se leen, y acá solo en `{ met: 'pell' }`.
 */

/**
 * EL HUB. `kind: 'hub'`, 8 opciones / 6 libres, cero tiradas.
 * Las tres puertas del acto 1 (`a1_taberna`, `a1_alcaldesa`, `a1_molino`) fijan su `run:pista_*` en
 * su propio `onEnter`, nunca acá y nunca como premio de una tirada: el `redirect` de las tres pistas
 * tiene que ser siempre alcanzable.
 */
export const a1_plaza = {
  id: 'a1_plaza',
  kind: 'hub',
  place: 'aldamar_plaza',
  onEnter: [{ milestone: 'llegar_a_aldamar' }],
  redirect: [
    // [0] Floodgate de sospecha. Va PRIMERO: con las dos ciertas tiene que ganar el castigo.
    { when: { clock: 'sospecha', gte: 4 }, to: 'a1_ronda' },
    // [1] Cierre del acto. El `visited >= 3` le deja al jugador una vuelta más de aviso.
    {
      when: {
        all: [
          { flag: 'run:pista_taberna' },
          { flag: 'run:pista_alcaldesa' },
          { flag: 'run:pista_molino' },
          { visited: 'a1_plaza', min: 3 },
        ],
      },
      to: 'c1_cuerpo',
    },
  ],
  text: ['TODO'],
  choices: [
    {
      id: 'entrar_al_ancla_seca',
      label: 'Entrar al Ancla Seca',
      outcome: { next: 'a1_taberna' },
    },
    {
      id: 'golpear_la_puerta_de_berta',
      label: 'Golpear la puerta de la alcaldesa',
      outcome: { next: 'a1_alcaldesa' },
    },
    {
      id: 'cruzar_al_molino',
      label: 'Cruzar al molino de Tomé',
      outcome: { next: 'a1_molino' },
    },
    {
      id: 'buscar_cama_en_la_posada',
      label: 'Buscar cama para lo que queda de noche',
      outcome: { next: 'a1_posada' },
    },
    {
      // Excepción declarada 1 de 2: vuelve al hub y paga con información de mundo.
      id: 'mirar_el_pozo',
      label: 'Mirar el pozo de la plaza',
      outcome: { effects: [{ set: 'run:la_soga_cortada' }], next: 'a1_plaza' },
    },
    {
      // Excepción declarada 2 de 2: el bando de Dravos con la pena escrita.
      id: 'leer_el_poste_de_bandos',
      label: 'Leer el poste de bandos',
      outcome: { next: 'a1_plaza' },
    },
    {
      id: 'volver_al_despacho',
      label: 'Volver al despacho de Berta',
      requires: { flag: 'run:pista_alcaldesa' },
      lockedHint: 'Todavía no tenés nada que preguntarle adentro.',
      outcome: { next: 'a1_berta_despacho' },
    },
    {
      // Atajo [Recuerdo] n.º 2 de la biblia §9.3: el badge lo deriva el motor del `met`.
      id: 'entrar_al_molino_por_atras',
      label: 'Colarte al molino por atrás, en la ronda del chico',
      requires: { met: 'pell' },
      lockedHint: 'No sabés a qué hora hace la ronda el chico.',
      outcome: { next: 'a1_molino_trampilla' },
    },
  ],
} satisfies Scene;

/**
 * Puerta 1 de las tres. `onEnter` fija `run:pista_taberna`.
 * Orell está declarado porque en toda ruta que entra acá está en el salón, aunque en la celda
 * "primero" de la matriz no abra la boca.
 * Dos tiradas, dos atributos distintos (Presencia y Astucia) y tres salidas sin dado.
 */
export const a1_taberna = {
  id: 'a1_taberna',
  kind: 'normal',
  place: 'taberna_ancla_seca',
  npcs: ['mausi', 'orell'],
  onEnter: [{ set: 'run:pista_taberna' }],
  text: ['TODO'],
  choices: [
    {
      // Preguntar de frente: si sale mal, Mausi manda tu nombre a la torre al salir.
      id: 'preguntar_por_tome',
      label: 'Preguntar por Tomé de frente',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        advantageIf: { item: 'carta_lacrada' },
        outcomes: {
          success: { next: 'a1_taberna_trastienda' },
          partial: { effects: [{ set: 'run:mausi_informo' }], next: 'a1_plaza' },
          failure: {
            effects: [{ set: 'run:mausi_informo' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_plaza',
          },
        },
      },
    },
    {
      // `dificil` con tag `sigilo` (Debilidad del Guerrero): convive con `preguntar_por_tome`,
      // que es la salida de la escena para el que no puede robar nada (outline §5/r09).
      id: 'robar_el_libro',
      label: 'Robarle a Mausi el libro de fiados',
      roll: {
        attr: 'astucia',
        difficulty: 'dificil',
        tags: ['sigilo'],
        outcomes: {
          success: { effects: [{ set: 'run:sabe_de_halvar' }], next: 'a1_taberna_trastienda' },
          partial: {
            effects: [{ set: 'run:sabe_de_halvar' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_taberna_trastienda',
          },
          failure: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'a1_plaza' },
        },
      },
    },
    {
      id: 'sentarte_en_la_mesa_de_orell',
      label: 'Sentarte en la mesa de Orell',
      outcome: { next: 'a1_orell_mesa' },
    },
    {
      id: 'pedirle_a_mausi_la_trastienda',
      label: 'Pedirle a Mausi pasar a la trastienda',
      outcome: { next: 'a1_taberna_trastienda' },
    },
    {
      // Fluff con obligación de pagar: Mausi cuenta por qué el molino tuvo luz el invierno pasado.
      id: 'pagar_una_ronda',
      label: 'Pagar una ronda y escuchar',
      outcome: { next: 'a1_plaza' },
    },
    {
      // Cruce molino → taberna (biblia §9.2): Mausi reconoce el bulto que le viste a Pell.
      id: 'contarle_lo_del_bulto',
      label: 'Contarle lo que viste salir del molino',
      requires: { flag: 'run:pista_molino' },
      lockedHint: 'Todavía no viste nada que valga la pena contar.',
      outcome: { effects: [{ set: 'run:cuerpo_hallado' }], next: 'a1_plaza' },
    },
    {
      // Celda "última" de la matriz: Berta ya le pagó a alguien antes que a vos.
      id: 'mostrarle_la_carta_a_mausi',
      label: 'Mostrarle el lacre de la alcaldesa',
      requires: { all: [{ flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }] },
      lockedHint: 'Mausi no le va a dar importancia a un lacre todavía.',
      outcome: { effects: [{ set: 'run:berta_miente' }], next: 'a1_plaza' },
    },
  ],
} satisfies Scene;

/**
 * Satélite de tránsito del Ancla Seca. 4 opciones, las cuatro libres, cero tiradas.
 * Es una de las tres escenas que la biblia §2.3 marca como primeras a recortar si un lote se pasa
 * de presupuesto, así que no se le cuelga nada que otra escena necesite.
 */
export const a1_taberna_trastienda = {
  id: 'a1_taberna_trastienda',
  kind: 'normal',
  place: 'taberna_ancla_seca',
  npcs: ['mausi'],
  text: ['TODO'],
  choices: [
    {
      // Una de las dos fuentes del farol en el acto 1 (la otra es el molino).
      id: 'agarrar_el_farol_del_clavo',
      label: 'Agarrar el farol de sebo del clavo',
      outcome: { effects: [{ give: 'farol_de_sebo' }], next: 'a1_taberna' },
    },
    {
      id: 'revisar_las_barricas_vacias',
      label: 'Revisar las barricas vacías',
      outcome: { next: 'a1_taberna' },
    },
    {
      id: 'salir_por_la_puerta_de_atras',
      label: 'Salir por la puerta de atrás',
      outcome: { next: 'a1_molino' },
    },
    {
      id: 'escuchar_el_caz_antes_de_cruzar',
      label: 'Escuchar el caz antes de cruzar el patio',
      outcome: { next: 'a1_molino' },
    },
  ],
} satisfies Scene;

/**
 * La mesa de Orell. 4 opciones, las cuatro libres, cero tiradas, un solo destino.
 * `recordarle_el_puente` es el único lugar de la campaña que limpia `run:orell_humillado`, y por eso
 * hace `clear` del viejo además del `set` del nuevo: el par es mutuamente excluyente (biblia §10).
 */
export const a1_orell_mesa = {
  id: 'a1_orell_mesa',
  kind: 'normal',
  place: 'taberna_ancla_seca',
  npcs: ['orell'],
  text: ['TODO'],
  choices: [
    {
      // Celda "segundo" de la matriz: por la tercera jarra nombra a Halvar, dos escenas antes de
      // que el mercader aparezca. Es la segunda de las DOS fuentes de `run:sabe_de_halvar`.
      id: 'pagarle_la_tercera_jarra',
      label: 'Pagarle la tercera jarra',
      outcome: { effects: [{ set: 'run:sabe_de_halvar' }], next: 'a1_taberna' },
    },
    {
      id: 'recordarle_el_puente',
      label: 'Recordarle lo del puente y ofrecerle la mano',
      outcome: {
        effects: [{ clear: 'run:orell_humillado' }, { set: 'run:orell_confia' }],
        next: 'a1_taberna',
      },
    },
    {
      id: 'preguntarle_por_la_orden_de_cerrar_el_puente',
      label: 'Preguntarle quién firmó el cierre del puente',
      outcome: { next: 'a1_taberna' },
    },
    {
      id: 'dejarlo_tomar_en_paz',
      label: 'Dejarlo tomar en paz',
      outcome: { next: 'a1_taberna' },
    },
  ],
} satisfies Scene;

/**
 * La `rest` del acto 1. 5 opciones, las cinco libres, cero tiradas.
 * **No cura Heridas y no cobra `sospecha`** (biblia §7.1): limpia condiciones y hace pasar la noche.
 * Es alcanzable solo antes de la tercera pista, porque después el hub redirige a más tardar dos
 * elecciones más tarde.
 */
export const a1_posada = {
  id: 'a1_posada',
  kind: 'rest',
  place: 'taberna_ancla_seca',
  npcs: ['mausi'],
  onEnter: [{ removeCondition: 'all' }],
  text: ['TODO'],
  choices: [
    {
      id: 'dormir_hasta_que_afloje_la_lluvia',
      label: 'Dormir hasta que afloje la lluvia',
      outcome: { next: 'a1_plaza' },
    },
    {
      id: 'bajar_al_salon_otra_vez',
      label: 'Bajar al salón otra vez',
      outcome: { next: 'a1_taberna' },
    },
    {
      id: 'salir_derecho_al_molino',
      label: 'Salir derecho al molino, sin dormir',
      outcome: { next: 'a1_molino' },
    },
    {
      id: 'ir_a_lo_de_la_alcaldesa_de_madrugada',
      label: 'Ir a lo de la alcaldesa de madrugada',
      outcome: { next: 'a1_alcaldesa' },
    },
    {
      id: 'revisar_tus_cosas_antes_de_acostarte',
      label: 'Revisar tus cosas antes de acostarte',
      outcome: { next: 'a1_plaza' },
    },
  ],
} satisfies Scene;

/**
 * El floodgate de `sospecha`. Se entra SOLO por el `redirect [0]` de `a1_plaza` y se sale SIEMPRE a
 * `c1_cuerpo`: Dravos no te acusa en la plaza, te lleva al vado a mostrarte el cuerpo.
 * `onEnter` enciende `run:dravos_sabe`, que es lo que el reloj significa.
 * 5 opciones / 4 libres, una sola tirada (`dificil`, tag `social`, la Debilidad del Explorador), que
 * convive con `escaparte_entre_las_casas`, sin dado.
 */
export const a1_ronda = {
  id: 'a1_ronda',
  kind: 'normal',
  place: 'aldamar_plaza',
  npcs: ['dravos', 'orell'],
  onEnter: [{ set: 'run:dravos_sabe' }],
  text: ['TODO'],
  choices: [
    {
      id: 'mantener_la_calma',
      label: 'Mantener la calma y dejar que te pregunten',
      roll: {
        attr: 'presencia',
        difficulty: 'dificil',
        tags: ['social'],
        advantageIf: { flag: 'run:orell_confia' },
        outcomes: {
          success: { next: 'c1_cuerpo' },
          partial: { effects: [{ addCondition: 'asustado' }], next: 'c1_cuerpo' },
          failure: { effects: [{ wound: 1 }], next: 'c1_cuerpo' },
        },
      },
    },
    {
      id: 'escaparte_entre_las_casas',
      label: 'Escaparte entre las casas',
      outcome: { effects: [{ addCondition: 'perseguido' }], next: 'c1_cuerpo' },
    },
    {
      id: 'dejar_que_te_lleven',
      label: 'Dejar que te lleven sin decir nada',
      outcome: { next: 'c1_cuerpo' },
    },
    {
      id: 'preguntarle_a_dravos_por_tome',
      label: 'Preguntarle a Dravos por el molinero',
      outcome: { next: 'c1_cuerpo' },
    },
    {
      id: 'pedirle_a_orell_que_responda_por_vos',
      label: 'Pedirle a Orell que responda por vos',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell todavía no te debe nada.',
      outcome: { next: 'c1_cuerpo' },
    },
  ],
} satisfies Scene;
