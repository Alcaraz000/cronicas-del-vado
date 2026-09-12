import type { Scene } from '@/content/schema';

/**
 * ESQUELETO (Fase C). El cuello 1, la transición que compromete la rama y la rama A del acto 2.
 *
 * Diez escenas, exactamente las de la tabla §2 de `design/01-outline.md`:
 * `c1_cuerpo`, `c1_acusacion`, `c1_refriega` (encounter) · `a2_amanecer` · `a2_ley_orell`,
 * `a2_ley_torre`, `a2_ley_cartas`, `a2_ley_halvar`, `a2_ley_berta`, `a2_ley_guardia` (rest).
 *
 * Toda la prosa es `TODO` a propósito (`lintProfile: 'smoke'`, r10 no la mira): lo que acá es
 * definitivo es la estructura — `kind`, `place`, `npcs`, `onEnter`, `redirect`, `requires`,
 * dificultades, `effects` y `next`. Los `label` sí van escritos de verdad, porque sin ellos no se
 * puede jugar ni revisar el grafo.
 *
 * Invariantes de este archivo, verificadas escena por escena contra la columna `opc`/`tir`:
 * - `c1_cuerpo` 7/5 · 1 tirada · `c1_acusacion` 7/4 · 0 · `c1_refriega` 6/4 · 3 ·
 *   `a2_amanecer` 6/4 · 0 · `a2_ley_orell` 6/4 · 1 · `a2_ley_torre` 7/4 · 1 ·
 *   `a2_ley_cartas` 7/4 · 2 · `a2_ley_halvar` 6/4 · 1 · `a2_ley_berta` 6/4 · 1 ·
 *   `a2_ley_guardia` 5/4 · 0.
 * - Ninguna dificultad `extrema` y ningún `muy_dificil`: las dos únicas viven en `c2_vado_crecido`.
 * - Ningún `set`/`clear` sobre `char:met.*`, `char:place.*`, `char:origen.*`, `char:leyenda` ni
 *   `world:caido.*`; esos cinco solo se leen (`met`, `knows`, `endingSeen`).
 * - Los dos cruces de rama de este archivo (`a2_ley_orell`, `a2_ley_berta`) llevan
 *   `requires: { not: { flag: 'run:cruzo_de_rama' } }`, encienden ese flag, hacen `set` de
 *   `run:contra_la_ley` **y `clear` de `run:con_la_ley`** (contrato §8 punto 13) y cuestan
 *   +1 de `sospecha`; el de `a2_ley_berta` cuesta además la `carta_lacrada`.
 * - `a2_ley_cartas.reconocer_el_sigilo` enciende `run:piedra_leida` en **las cuatro** bandas que
 *   declara y manda siempre a otra escena: la puerta al final oculto se intenta una vez por partida.
 *
 * Escenas de otros bloques a las que este archivo apunta y que escriben otros lotes:
 * `a2_fuera_fuga`, `a2_fuera_sotano` (`scenes/acto2_fuera.ts`) y `c2_anochece` (`scenes/desenlace.ts`).
 */

// ---------------------------------------------------------------------------
// Cuello 1 — el molinero muerto
// ---------------------------------------------------------------------------

/**
 * Convergencia 1: toda partida pasa por acá, por el hub con las tres pistas o por el floodgate de
 * `sospecha` (`a1_ronda`). `tome` va en `npcs` sin hablar —es el cuerpo—, así que toda ruta deriva
 * `char:met.tome`. Único destino: `c1_acusacion`.
 */
export const c1_cuerpo = {
  id: 'c1_cuerpo',
  kind: 'normal',
  place: 'vado_oculto',
  npcs: ['tome'],
  onEnter: [{ milestone: 'hallar_a_tome' }],
  text: ['TODO'],
  choices: [
    {
      id: 'revisar_el_cuerpo',
      label: 'Revisar lo que el río no se llevó',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        outcomes: {
          success: {
            effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
            next: 'c1_acusacion',
          },
          partial: {
            effects: [
              { set: 'run:vio_el_sello' },
              { milestone: 'ver_el_sello' },
              { addCondition: 'empapado' },
            ],
            next: 'c1_acusacion',
          },
          failure: {
            effects: [{ addCondition: 'empapado' }],
            next: 'c1_acusacion',
          },
        },
      },
    },
    {
      id: 'enterrarlo',
      label: 'Enterrarlo vos, con las manos',
      outcome: {
        effects: [{ set: 'char:vado.tome_enterrado' }, { clock: 'sospecha', delta: 1 }],
        next: 'c1_acusacion',
      },
    },
    {
      id: 'desatar_la_soga',
      label: 'Desatar la soga que lo tenía ahí',
      outcome: { next: 'c1_acusacion' },
    },
    {
      id: 'mirar_la_grava_de_la_orilla',
      label: 'Mirar la grava antes de que llueva más',
      outcome: { next: 'c1_acusacion' },
    },
    {
      id: 'taparlo_y_volver_al_pueblo',
      label: 'Taparlo y volver al pueblo a decirlo',
      outcome: { next: 'c1_acusacion' },
    },
    {
      id: 'darle_el_ultimo_rito',
      label: 'Darle el último rito acá mismo',
      requires: { class: 'clerigo' },
      lockedHint: 'No es tu oficio despedir a un muerto.',
      outcome: {
        effects: [{ set: 'char:vado.tome_enterrado' }],
        next: 'c1_acusacion',
      },
    },
    {
      id: 'cantar_el_responso',
      label: 'Cantar el responso que nadie se anima',
      requires: { trait: 'criado_en_el_templo' },
      lockedHint: 'Nadie te enseñó el responso.',
      outcome: { next: 'c1_acusacion' },
    },
  ],
} satisfies Scene;

/**
 * El Burnt Bridge de rama, con tres PNJ en escena y cero tiradas: es una escena de decisión, no de
 * habilidad (outline §7, conflicto 1). `onEnter` enciende `run:acusado`, que leen variantes de todo
 * el acto 2, los cuatro epílogos y el `requires` de `cl_molino.rendirte_de_entrada`.
 *
 * La cosa que se quema es una sola (§10): `delatar_a_orell`, que limpia `run:orell_confia` sin
 * recuperación posible.
 */
export const c1_acusacion = {
  id: 'c1_acusacion',
  kind: 'normal',
  place: 'aldamar_plaza',
  npcs: ['dravos', 'orell', 'berta'],
  onEnter: [{ set: 'run:acusado' }],
  text: ['TODO'],
  choices: [
    {
      id: 'ceder',
      label: 'Bajar la voz y dejar que te tomen nota',
      outcome: {
        effects: [{ set: 'run:con_la_ley' }, { clear: 'run:contra_la_ley' }],
        next: 'a2_amanecer',
      },
    },
    {
      id: 'correr',
      label: 'Correr antes de que te rodeen',
      outcome: {
        effects: [
          { set: 'run:contra_la_ley' },
          { clear: 'run:con_la_ley' },
          { addCondition: 'perseguido' },
        ],
        next: 'c1_refriega',
      },
    },
    {
      id: 'resistirte',
      label: 'Plantarte y no dejar que te toquen',
      outcome: {
        effects: [{ set: 'run:contra_la_ley' }, { clear: 'run:con_la_ley' }],
        next: 'c1_refriega',
      },
    },
    {
      id: 'callarte_y_escuchar',
      label: 'Callarte y escuchar quién dice qué',
      outcome: { next: 'a2_amanecer' },
    },
    {
      id: 'delatar_a_orell',
      label: 'Decir delante de todos lo que hizo Orell',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no te dio nada que usar en su contra.',
      outcome: {
        effects: [
          { clear: 'run:orell_confia' },
          { set: 'run:con_la_ley' },
          { clear: 'run:contra_la_ley' },
        ],
        next: 'a2_amanecer',
      },
    },
    {
      id: 'pedirle_a_orell_que_hable',
      label: 'Pedirle a Orell que hable por vos',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no va a hablar por un desconocido.',
      outcome: {
        effects: [{ set: 'run:con_la_ley' }, { clear: 'run:contra_la_ley' }],
        next: 'a2_amanecer',
      },
    },
    {
      id: 'mostrarle_la_carta_a_dravos',
      label: 'Mostrarle a Dravos el lacre de la alcaldesa',
      requires: { item: 'carta_lacrada' },
      lockedHint: 'Ya no tenés la carta lacrada.',
      outcome: {
        effects: [
          { take: 'carta_lacrada' },
          { set: 'run:con_la_ley' },
          { clear: 'run:contra_la_ley' },
        ],
        next: 'a2_amanecer',
      },
    },
  ],
} satisfies Scene;

/**
 * Primer `encounter` de la campaña, dos rondas. Cumple r06 con las cuatro libres solas:
 * dos atributos distintos (Vigor en `abrirse_paso`, Astucia en `confundirlos` y `huir_al_rio`),
 * una opción sin tirada (`rendirte`, y además `rematar_la_linea` y `que_orell_te_cubra`) y una
 * tirada con tag `huida` (`huir_al_rio`).
 *
 * La escena vuelve a sí misma, así que cae en el chequeo duro de la ronda posterior: lo cumple por
 * partida doble, con el `redirect` sobre `pelea >= 2` y con `rematar_la_linea`, que lleva
 * `requires: { clock: 'pelea', gte: 1 }`.
 *
 * Reloj `pelea` (biblia §7.1): Éxito +1 · Crítico +2 · Éxito con costo +1 y el enemigo te pega ·
 * Fallo 0 y el enemigo te pega · rendirse, huir o la palabra de Orell cierra el encuentro de una.
 */
export const c1_refriega = {
  id: 'c1_refriega',
  kind: 'encounter',
  place: 'aldamar_plaza',
  npcs: ['dravos', 'orell'],
  redirect: [{ when: { clock: 'pelea', gte: 2 }, to: 'a2_amanecer' }],
  text: ['TODO'],
  choices: [
    {
      id: 'abrirse_paso',
      label: 'Abrirte paso a hombros hacia el callejón',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          crit: {
            effects: [{ clock: 'pelea', delta: 2 }],
            next: 'c1_refriega',
          },
          success: {
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'c1_refriega',
          },
          partial: {
            effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
            next: 'c1_refriega',
          },
          failure: {
            effects: [{ wound: 1 }],
            next: 'c1_refriega',
          },
        },
      },
    },
    {
      id: 'confundirlos',
      label: 'Gritar una orden que no es tuya',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['engano'],
        outcomes: {
          success: {
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'c1_refriega',
          },
          partial: {
            effects: [{ clock: 'pelea', delta: 1 }, { addCondition: 'perseguido' }],
            next: 'c1_refriega',
          },
          failure: {
            effects: [{ wound: 1 }],
            next: 'c1_refriega',
          },
        },
      },
    },
    {
      id: 'huir_al_rio',
      label: 'Tirarte para el río y no mirar atrás',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['huida'],
        outcomes: {
          success: {
            effects: [
              { clock: 'pelea', delta: 2 },
              { set: 'run:contra_la_ley' },
              { clear: 'run:con_la_ley' },
            ],
            next: 'a2_amanecer',
          },
          partial: {
            effects: [
              { clock: 'pelea', delta: 2 },
              { addCondition: 'empapado' },
              { set: 'run:contra_la_ley' },
              { clear: 'run:con_la_ley' },
            ],
            next: 'a2_amanecer',
          },
          failure: {
            effects: [{ wound: 1 }],
            next: 'c1_refriega',
          },
        },
      },
    },
    {
      id: 'rendirte',
      label: 'Abrir las manos y rendirte',
      outcome: {
        effects: [
          { clock: 'pelea', delta: 3 },
          { set: 'run:con_la_ley' },
          { clear: 'run:contra_la_ley' },
        ],
        next: 'a2_amanecer',
      },
    },
    {
      id: 'rematar_la_linea',
      label: 'Rematar la línea que ya se está abriendo',
      requires: { clock: 'pelea', gte: 1 },
      lockedHint: 'La línea todavía está entera.',
      outcome: {
        effects: [
          { clock: 'pelea', delta: 2 },
          { set: 'run:contra_la_ley' },
          { clear: 'run:con_la_ley' },
        ],
        next: 'a2_amanecer',
      },
    },
    {
      id: 'que_orell_te_cubra',
      label: 'Buscarle la cara a Orell y esperar',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell todavía no te debe nada.',
      outcome: {
        effects: [
          { clock: 'pelea', delta: 3 },
          { set: 'run:con_la_ley' },
          { clear: 'run:contra_la_ley' },
        ],
        next: 'a2_amanecer',
      },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// Transición A — se compromete la rama
// ---------------------------------------------------------------------------

/**
 * Acá el Burnt Bridge **es la escena, no la opción** (outline §7, conflicto 8): se quema una sola
 * cosa —la rama que no elegiste— y se quema sí o sí. Por eso las seis opciones hacen `set` de su
 * bando y `clear` del otro.
 *
 * Las cuatro libres son **dos maneras de irse con la ley y dos de irse con Ilse**, no cuatro
 * destinos distintos: lo que se elige es el bando, no la puerta. No lleva `npcs`: el amanecer en la
 * plaza está vacío.
 */
export const a2_amanecer = {
  id: 'a2_amanecer',
  kind: 'normal',
  place: 'aldamar_plaza',
  onEnter: [{ milestone: 'elegir_bando' }],
  text: ['TODO'],
  choices: [
    {
      id: 'presentarte_en_la_torre',
      label: 'Presentarte en la torre por tu propio pie',
      outcome: {
        effects: [{ set: 'run:con_la_ley' }, { clear: 'run:contra_la_ley' }],
        next: 'a2_ley_orell',
      },
    },
    {
      id: 'esperar_el_relevo_y_entrar_con_orell',
      label: 'Esperar el relevo y entrar con Orell',
      outcome: {
        effects: [{ set: 'run:con_la_ley' }, { clear: 'run:contra_la_ley' }],
        next: 'a2_ley_orell',
      },
    },
    {
      id: 'buscar_a_ilse',
      label: 'Buscar a Ilse antes de que abran la plaza',
      outcome: {
        effects: [
          { set: 'run:contra_la_ley' },
          { clear: 'run:con_la_ley' },
          { set: 'run:con_ilse' },
        ],
        next: 'a2_fuera_fuga',
      },
    },
    {
      id: 'salir_por_el_caz_sin_avisar',
      label: 'Salir por el caz sin avisarle a nadie',
      outcome: {
        effects: [{ set: 'run:contra_la_ley' }, { clear: 'run:con_la_ley' }],
        next: 'a2_fuera_fuga',
      },
    },
    {
      id: 'ir_derecho_al_sotano',
      label: 'Ir derecho al sótano que ya conocés',
      requires: { flag: 'char:vado.sabe_del_sello' },
      lockedHint: 'Todavía no sabés que hay un sótano al que ir.',
      outcome: {
        effects: [{ set: 'run:contra_la_ley' }, { clear: 'run:con_la_ley' }],
        next: 'a2_fuera_sotano',
      },
    },
    {
      id: 'preguntarle_a_pell_por_la_orden',
      label: 'Preguntarle a Pell por la orden escrita',
      requires: { flag: 'run:pell_amigo' },
      lockedHint: 'Pell no te debe ninguna confianza.',
      outcome: {
        effects: [{ set: 'run:con_la_ley' }, { clear: 'run:contra_la_ley' }],
        next: 'a2_ley_orell',
      },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// Acto 2, rama A — "Con la ley"
// ---------------------------------------------------------------------------

/**
 * Puerta de la rama A y primera cuota de la confesión de Orell. El `onEnter` enciende
 * `run:orell_confia` (biblia §7.2: "la rama A entera") y limpia `run:orell_humillado`, que es su
 * par mutuamente excluyente.
 *
 * Lleva uno de los tres cruces de rama de la campaña, con su `requires: { not: … }`, su `clear` del
 * bando viejo y su +1 de `sospecha`.
 */
export const a2_ley_orell = {
  id: 'a2_ley_orell',
  kind: 'normal',
  place: 'torre_de_dravos',
  npcs: ['orell'],
  onEnter: [{ set: 'run:orell_confia' }, { clear: 'run:orell_humillado' }],
  text: ['TODO'],
  choices: [
    {
      id: 'entrar_con_el_a_la_torre',
      label: 'Entrar con él a la sala de mando',
      outcome: { next: 'a2_ley_torre' },
    },
    {
      id: 'pedirle_ver_las_cartas',
      label: 'Pedirle ver las cartas de la mesa',
      outcome: { next: 'a2_ley_cartas' },
    },
    {
      id: 'preguntarle_por_la_orden_escrita',
      label: 'Preguntarle por la orden que guarda',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: { next: 'a2_ley_cartas' },
          partial: {
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_cartas',
          },
          failure: {
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_guardia',
          },
        },
      },
    },
    {
      id: 'quedarte_en_el_cuerpo_de_guardia',
      label: 'Quedarte en el cuerpo de guardia',
      outcome: { next: 'a2_ley_guardia' },
    },
    {
      id: 'irte_con_ilse_y_no_volver',
      label: 'Dejar la torre e irte con Ilse, y no volver',
      requires: { not: { flag: 'run:cruzo_de_rama' } },
      lockedHint: 'Ya elegiste de qué lado estás, y no hay vuelta.',
      outcome: {
        effects: [
          { set: 'run:cruzo_de_rama' },
          { set: 'run:contra_la_ley' },
          { clear: 'run:con_la_ley' },
          { clock: 'sospecha', delta: 1 },
        ],
        next: 'a2_fuera_fuga',
      },
    },
    {
      id: 'preguntarle_por_lo_que_te_acusan',
      label: 'Preguntarle de qué te acusan exactamente',
      requires: { flag: 'run:acusado' },
      lockedHint: 'Nadie te acusó de nada todavía.',
      outcome: {
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'a2_ley_torre',
      },
    },
  ],
} satisfies Scene;

/**
 * La sala de mando, con Dravos adentro. Su única tirada es `entrar_sin_que_te_vean`
 * (Astucia · `dificil` · `sigilo`): convive con `ofrecerte_de_escolta` `[Guerrero]` —que entra sin
 * tirada de sigilo y le tapa al Guerrero su propia Debilidad— y con dos libres sin tirada, así que
 * cumple la regla de curva de la biblia §9.6.
 *
 * Es la escena que entrega la `carta_de_halvar`, el pago de toda la rama A.
 */
export const a2_ley_torre = {
  id: 'a2_ley_torre',
  kind: 'normal',
  place: 'torre_de_dravos',
  npcs: ['dravos'],
  text: ['TODO'],
  choices: [
    {
      id: 'entrar_sin_que_te_vean',
      label: 'Entrar cuando el brasero tape el ruido',
      roll: {
        attr: 'astucia',
        difficulty: 'dificil',
        tags: ['sigilo'],
        outcomes: {
          success: {
            effects: [{ give: 'carta_de_halvar' }],
            next: 'a2_ley_cartas',
          },
          partial: {
            effects: [{ give: 'carta_de_halvar' }, { clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_cartas',
          },
          failure: {
            effects: [{ clock: 'sospecha', delta: 1 }, { set: 'run:dravos_sabe' }],
            next: 'a2_ley_guardia',
          },
        },
      },
    },
    {
      id: 'leer_el_sigilo_de_la_mesa',
      label: 'Leer el sigilo lacrado de la mesa',
      outcome: {
        effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
        next: 'a2_ley_cartas',
      },
    },
    {
      id: 'pedir_licencia_para_ver_a_la_alcaldesa',
      label: 'Pedir licencia para ir a ver a la alcaldesa',
      outcome: { next: 'a2_ley_berta' },
    },
    {
      id: 'bajar_al_cuerpo_de_guardia',
      label: 'Bajar al cuerpo de guardia sin decir nada',
      outcome: { next: 'a2_ley_guardia' },
    },
    {
      id: 'encarar_a_dravos',
      label: 'Encararlo por la piedra, en su propia torre',
      requires: { flag: 'run:vio_el_sello' },
      lockedHint: 'No viste la piedra: no tenés con qué encararlo.',
      outcome: {
        effects: [{ set: 'run:dravos_sabe' }, { clock: 'sospecha', delta: 1 }],
        next: 'a2_ley_berta',
      },
    },
    {
      id: 'ofrecerte_de_escolta',
      label: 'Ofrecerte de escolta para el relevo',
      requires: { class: 'guerrero' },
      lockedHint: 'Hay que haber servido para ofrecerse a un relevo.',
      outcome: {
        effects: [{ give: 'carta_de_halvar' }],
        next: 'a2_ley_cartas',
      },
    },
    {
      id: 'nombrar_su_grado_viejo',
      label: 'Nombrarlo por el grado que tenía antes',
      requires: { trait: 'desertor' },
      lockedHint: 'No sabés qué grado tenía Dravos antes.',
      outcome: { next: 'a2_ley_cartas' },
    },
  ],
} satisfies Scene;

/**
 * Las cartas de la torre, sin PNJ: acá se lee lo que Dravos y Halvar se escribieron.
 *
 * Dos tiradas y son dos opciones distintas (biblia §7.4): `leer_las_cartas` (Saber · `normal`,
 * libre, escribe el hito `la_verdad_de_tome` en éxito y parcial) y `reconocer_el_sigilo`
 * (Saber · `dificil`, la puerta al final oculto). La segunda es **tirada de puerta**: lleva
 * `requires: { not: { flag: 'run:piedra_leida' } }`, enciende ese flag en todas sus bandas y
 * ninguna banda vuelve a esta escena. No hay repetición gratis.
 *
 * `releer_las_runas` es el camino B a `char:vado.sabe_del_sello` (biblia §9.4): sin tirada, para
 * quien vio las runas y además trae el rasgo o la habilidad que las sabe leer.
 */
export const a2_ley_cartas = {
  id: 'a2_ley_cartas',
  kind: 'normal',
  place: 'torre_de_dravos',
  text: ['TODO'],
  choices: [
    {
      id: 'leer_las_cartas',
      label: 'Leer las cartas de arriba a abajo',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber'],
        advantageIf: { flag: 'run:sabe_de_halvar' },
        outcomes: {
          success: {
            effects: [{ milestone: 'la_verdad_de_tome' }],
            next: 'a2_ley_halvar',
          },
          partial: {
            effects: [{ milestone: 'la_verdad_de_tome' }, { clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_halvar',
          },
          failure: {
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_berta',
          },
        },
      },
    },
    {
      id: 'buscar_el_mapa',
      label: 'Buscar el mapa del vado entre los rollos',
      outcome: {
        effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
        next: 'a2_ley_halvar',
      },
    },
    {
      id: 'bajar_al_vado_a_ver_al_mercader',
      label: 'Bajar al vado a verle la cara al mercader',
      outcome: { next: 'a2_ley_halvar' },
    },
    {
      id: 'llevarle_a_berta_lo_que_leiste',
      label: 'Llevarle a Berta lo que acabás de leer',
      outcome: { next: 'a2_ley_berta' },
    },
    {
      id: 'reconocer_el_sigilo',
      label: 'Reconocer el sigilo del lacre',
      requires: { not: { flag: 'run:piedra_leida' } },
      lockedHint: 'Ese lacre ya te dijo todo lo que iba a decirte.',
      roll: {
        attr: 'saber',
        difficulty: 'dificil',
        tags: ['saber', 'magia'],
        advantageIf: { any: [{ class: 'mago' }, { skill: 'vista_arcana' }] },
        outcomes: {
          crit: {
            effects: [{ set: 'run:piedra_leida' }, { set: 'char:vado.sabe_del_sello' }],
            next: 'a2_ley_halvar',
          },
          success: {
            effects: [{ set: 'run:piedra_leida' }, { set: 'char:vado.sabe_del_sello' }],
            next: 'a2_ley_halvar',
          },
          partial: {
            effects: [
              { set: 'run:piedra_leida' },
              { set: 'char:vado.sabe_del_sello' },
              { clock: 'sospecha', delta: 1 },
            ],
            next: 'a2_ley_berta',
          },
          failure: {
            effects: [{ set: 'run:piedra_leida' }],
            next: 'a2_ley_berta',
          },
        },
      },
    },
    {
      id: 'releer_las_runas',
      label: 'Volver sobre la segunda línea de las runas',
      requires: {
        all: [
          { flag: 'run:vio_runas' },
          { any: [{ trait: 'aprendiz_de_escriba' }, { skill: 'erudito_de_runas' }] },
        ],
      },
      lockedHint: 'No viste esas runas, o no sabrías leerlas.',
      outcome: {
        effects: [{ set: 'char:vado.sabe_del_sello' }],
        next: 'a2_ley_halvar',
      },
    },
    {
      id: 'leer_el_codigo_de_contrabando',
      label: 'Leer el código de contrabando del margen',
      requires: { trait: 'contrabandista' },
      lockedHint: 'Para vos esos números del margen no dicen nada.',
      outcome: { next: 'a2_ley_halvar' },
    },
  ],
} satisfies Scene;

/**
 * El banco de grava del lado norte del vado, donde amarra Halvar. Es una de las dos escenas donde
 * puede debutar (la otra es `cl_molino`, según la rama), así que lo declara en `npcs`.
 *
 * Su única tirada es `regatear_el_precio` (Presencia · `normal` · `social`), con ventaja para quien
 * ya sabía del mercader desde el acto 1.
 */
export const a2_ley_halvar = {
  id: 'a2_ley_halvar',
  kind: 'normal',
  place: 'vado_oculto',
  npcs: ['halvar'],
  text: ['TODO'],
  choices: [
    {
      id: 'escuchar_su_oferta',
      label: 'Escuchar la oferta hasta el final',
      outcome: { next: 'a2_ley_berta' },
    },
    {
      id: 'regatear_el_precio',
      label: 'Regatearle el precio del paso',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        advantageIf: { flag: 'run:sabe_de_halvar' },
        outcomes: {
          success: {
            effects: [{ set: 'run:trato_con_halvar' }],
            next: 'a2_ley_guardia',
          },
          partial: {
            effects: [{ set: 'run:trato_con_halvar' }, { clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_guardia',
          },
          failure: {
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_berta',
          },
        },
      },
    },
    {
      id: 'preguntarle_por_tome',
      label: 'Preguntarle por el molinero, de frente',
      outcome: { next: 'a2_ley_berta' },
    },
    {
      id: 'volver_sin_cerrar_nada',
      label: 'Volver a la torre sin cerrar nada',
      outcome: { next: 'a2_ley_guardia' },
    },
    {
      id: 'cerrar_el_precio_ahora',
      label: 'Cerrar el precio ahora, con la mano',
      requires: { flag: 'run:sabe_de_halvar' },
      lockedHint: 'No sabés lo suficiente de él para apurarlo.',
      outcome: {
        effects: [{ set: 'run:trato_con_halvar' }, { clock: 'sospecha', delta: 1 }],
        next: 'a2_ley_guardia',
      },
    },
    {
      id: 'mostrarle_lo_que_firmo_berta',
      label: 'Mostrarle la fecha de lo que firmó Berta',
      requires: { item: 'carta_de_halvar' },
      lockedHint: 'No tenés la carta de Halvar encima.',
      outcome: {
        effects: [{ set: 'run:trato_con_halvar' }],
        next: 'a2_ley_berta',
      },
    },
  ],
} satisfies Scene;

/**
 * El careo con la alcaldesa, con Ilse en la escalera. Piso dramático de la biblia §2.3: dos PNJ
 * declarados y una sola tirada.
 *
 * `hablarle_a_ilse_en_la_escalera` es **la entrega garantizada de la verdad de Tomé y del
 * `medallon_de_tome` para la rama A**, sin `endingSeen` y sin bajar al sótano: tirada libre de
 * Presencia con ventaja por `run:ilse_confia`, que escribe el hito en éxito y en parcial.
 *
 * Lleva el segundo cruce de rama del archivo, el más caro de los tres: además del `clear` del bando
 * viejo y del +1 de `sospecha`, Berta te arranca la `carta_lacrada` de la mano.
 */
export const a2_ley_berta = {
  id: 'a2_ley_berta',
  kind: 'normal',
  place: 'casa_de_berta',
  npcs: ['berta', 'ilse'],
  text: ['TODO'],
  choices: [
    {
      id: 'hablarle_a_ilse_en_la_escalera',
      label: 'Hablarle a Ilse en la escalera',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        advantageIf: { flag: 'run:ilse_confia' },
        outcomes: {
          success: {
            effects: [
              { give: 'medallon_de_tome' },
              { milestone: 'la_verdad_de_tome' },
              { set: 'run:ilse_confia' },
            ],
            next: 'a2_ley_guardia',
          },
          partial: {
            effects: [
              { give: 'medallon_de_tome' },
              { milestone: 'la_verdad_de_tome' },
              { clock: 'sospecha', delta: 1 },
            ],
            next: 'a2_ley_guardia',
          },
          failure: {
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_guardia',
          },
        },
      },
    },
    {
      id: 'escuchar_la_version_de_berta',
      label: 'Escuchar la versión de Berta sin cortarla',
      outcome: { next: 'a2_ley_guardia' },
    },
    {
      id: 'acusarla_en_su_casa',
      label: 'Acusarla en su propia casa, y quemarla',
      outcome: {
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'a2_ley_guardia',
      },
    },
    {
      id: 'irte_sin_decir_nada',
      label: 'Irte sin decir nada y dejarla hablando',
      outcome: { next: 'a2_ley_guardia' },
    },
    {
      id: 'bajar_al_sotano_con_ilse',
      label: 'Bajar al sótano con Ilse, y no volver',
      requires: { not: { flag: 'run:cruzo_de_rama' } },
      lockedHint: 'Ya elegiste de qué lado estás, y no hay vuelta.',
      outcome: {
        effects: [
          { set: 'run:cruzo_de_rama' },
          { set: 'run:contra_la_ley' },
          { clear: 'run:con_la_ley' },
          { take: 'carta_lacrada' },
          { clock: 'sospecha', delta: 1 },
        ],
        next: 'a2_fuera_sotano',
      },
    },
    {
      id: 'preguntarle_a_ilse_por_el_sello',
      label: 'Preguntarle a Ilse por el sello, sin rodeos',
      requires: { endingSeen: 'fin_crecida' },
      lockedHint: 'Todavía no sabés que hay algo que preguntar.',
      outcome: {
        effects: [{ set: 'char:vado.sabe_del_sello' }],
        next: 'a2_ley_guardia',
      },
    },
  ],
} satisfies Scene;

/**
 * La `rest` de la rama A. Cura una Herida a cambio de +1 de `sospecha` (biblia §7.1) y te saca el
 * `farol_de_sebo`, que dejás colgado en el poste del relevo (biblia §5): es una de las dos escenas
 * donde la mochila está por desbordar.
 *
 * Con `sospecha` llena el descanso se acaba y con él el farmeo de `heal`: el `redirect` manda a
 * `c2_anochece`, que es además la escena de aviso T−2, así que ninguna ruta llega al vado crecido
 * con menos de dos avisos.
 */
export const a2_ley_guardia = {
  id: 'a2_ley_guardia',
  kind: 'rest',
  place: 'torre_de_dravos',
  npcs: ['orell'],
  redirect: [{ when: { clock: 'sospecha', gte: 4 }, to: 'c2_anochece' }],
  onEnter: [{ take: 'farol_de_sebo' }, { heal: 1 }, { clock: 'sospecha', delta: 1 }],
  text: ['TODO'],
  choices: [
    {
      id: 'dormir_hasta_el_relevo',
      label: 'Dormir lo que queda hasta el relevo',
      outcome: { next: 'c2_anochece' },
    },
    {
      id: 'esperar_despierto_junto_al_brasero',
      label: 'Esperar despierto junto al brasero',
      outcome: { next: 'c2_anochece' },
    },
    {
      id: 'volver_a_la_torre',
      label: 'Volver a subir a la sala de mando',
      outcome: { next: 'a2_ley_torre' },
    },
    {
      id: 'volver_a_casa_de_berta',
      label: 'Volver a golpear la puerta de Berta',
      outcome: { next: 'a2_ley_berta' },
    },
    {
      id: 'pedirle_la_capa_a_orell',
      label: 'Pedirle a Orell la capa seca del perchero',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell todavía no te presta ni la hora.',
      outcome: {
        effects: [{ removeCondition: 'empapado' }],
        next: 'c2_anochece',
      },
    },
  ],
} satisfies Scene;
