import type { Scene } from '@/content/schema';

/**
 * Acto 1 — las dos puertas de pista que no son la taberna: **la casa de la alcaldesa**
 * (`a1_alcaldesa`, `a1_berta_despacho`, `a1_ilse_patio`) y **el molino de Tomé**
 * (`a1_molino`, `a1_molino_pell`, `a1_molino_trampilla`, `a1_molino_rueda`).
 *
 * ESQUELETO (Fase C): `text` y los epílogos van `['TODO']`, los `outcome.text` se omiten y los
 * `label` ya son definitivos. Todo lo demás —`kind`, `place`, `npcs`, `onEnter`, `requires`,
 * `roll`, `effects` y `next`— es estructura de verdad y no se toca sin volver al outline.
 *
 * Contrato de esta tanda (`design/01-outline.md` §2, columna `opc`/`tir`):
 *   a1_alcaldesa        7 opc / 5 libres / 0 tiradas
 *   a1_berta_despacho   5 / 4 / 1
 *   a1_ilse_patio       6 / 4 / 1
 *   a1_molino           8 / 5 / 1
 *   a1_molino_pell      6 / 4 / 1
 *   a1_molino_trampilla 6 / 4 / 1
 *   a1_molino_rueda     5 / 4 / 1
 *
 * Notas de diseño que un lote de prosa NO puede romper:
 * - Las dos puertas fijan su `run:pista_*` en el `onEnter`, nunca como premio de una tirada: el
 *   `redirect` de las tres pistas de `a1_plaza` tiene que ser siempre alcanzable (biblia §9.2).
 * - `a1_molino.hablar_con_el_chico` lleva `requires: { not: { all: [pista_taberna,
 *   pista_alcaldesa] } }` y en su lugar está la salida libre `entrar_por_el_caz`. El molino **no**
 *   usa `redirect` (outline §7, conflicto 5).
 * - `a1_molino_trampilla.onEnter` consume la `palanca_de_molino`: queda trabando la tapa. Por eso
 *   ninguna opción de esa escena puede llevar `requires: { item: 'palanca_de_molino' }`: el
 *   `onEnter` corre antes del render y la opción no aparecería nunca.
 * - Ninguna dificultad `extrema`, ninguna `muy_dificil` (esas dos viven solo en `c2_vado_crecido`).
 *   Las dos `facil` del acto 1 son `a1_molino_pell.hablarle_de_frente` y
 *   `a1_molino_rueda.trabar_la_rueda` (outline §5/r09).
 * - Cupo de `crit`/`fumble` gastado acá: 1 `crit` (`a1_molino_pell.hablarle_de_frente`) y
 *   1 `fumble` (`a1_molino_trampilla.bajar_la_escalera`). No hay lugar para más.
 * - Ningún `set`/`clear` sobre `char:met.*`, `char:place.*`, `char:origen.*`, `char:leyenda` ni
 *   `world:caido.*`: esos los deriva el motor y acá solo se leen.
 */

// ---------------------------------------------------------------------------
// La casa de la alcaldesa
// ---------------------------------------------------------------------------

export const a1_alcaldesa = {
  id: 'a1_alcaldesa',
  kind: 'normal',
  place: 'casa_de_berta',
  // Berta e Ilse están las dos en toda ruta que entra acá (outline §2). Declararlas deriva
  // `char:met.berta` y `char:met.ilse`.
  npcs: ['berta', 'ilse'],
  onEnter: [{ set: 'run:pista_alcaldesa' }],
  // Piso dramático (biblia §2.3): dos PNJ declarados y cero tiradas. Es un careo, no tránsito.
  text: ['TODO'],
  choices: [
    {
      id: 'preguntar_por_tome',
      label: 'Preguntarle a Berta por Tomé',
      outcome: { next: 'a1_berta_despacho' },
    },
    {
      id: 'reclamar_el_adelanto',
      label: 'Reclamar el adelanto que promete la carta',
      outcome: { next: 'a1_berta_despacho' },
    },
    {
      id: 'ayudar_a_ilse_con_los_sacos',
      label: 'Ayudar a Ilse con los sacos del zaguán',
      outcome: { next: 'a1_ilse_patio' },
    },
    {
      id: 'salir_al_patio',
      label: 'Salir al patio detrás de Ilse',
      outcome: { next: 'a1_ilse_patio' },
    },
    {
      id: 'despedirte_hasta_manana',
      label: 'Despedirte y volver a la plaza',
      outcome: { next: 'a1_plaza' },
    },
    // [Clérigo] — sabor y atajo, nunca llave: Ilse te habla aunque esta no sea la segunda pista.
    {
      id: 'bendecir_la_casa',
      label: 'Bendecir la casa antes de sentarte',
      requires: { class: 'clerigo' },
      lockedHint: 'No es tu oficio bendecir casas ajenas',
      outcome: { next: 'a1_ilse_patio' },
    },
    // [Origen] `huerfano_de_la_peste` (biblia §9.5).
    {
      id: 'mirar_la_casa_antes_de_entrar',
      label: 'Mirar la casa antes de cruzar el umbral',
      requires: { trait: 'huerfano_de_la_peste' },
      lockedHint: 'Entrás sin mirar, como todo el mundo',
      outcome: { next: 'a1_berta_despacho' },
    },
  ],
} satisfies Scene;

export const a1_berta_despacho = {
  id: 'a1_berta_despacho',
  kind: 'normal',
  place: 'casa_de_berta',
  npcs: ['berta'],
  text: ['TODO'],
  choices: [
    // La única tirada de la escena. El fallo cobra `sospecha` (biblia §7.1, "revisar el escritorio
    // de Berta y que salga mal") y AVANZA a otra escena: nunca vuelve acá.
    {
      id: 'revisar_el_escritorio',
      label: 'Revisar el escritorio mientras ella escribe',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo', 'percepcion'],
        advantageIf: { item: 'farol_de_sebo' },
        outcomes: {
          success: {
            effects: [{ set: 'run:berta_miente' }],
            next: 'a1_alcaldesa',
          },
          partial: {
            effects: [{ set: 'run:berta_miente' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_alcaldesa',
          },
          failure: {
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a1_ilse_patio',
          },
        },
      },
    },
    {
      id: 'preguntarle_por_la_carta',
      label: 'Preguntarle por la carta que te mandó',
      outcome: { next: 'a1_alcaldesa' },
    },
    {
      id: 'buscar_a_ilse_en_el_zaguan',
      label: 'Buscar a Ilse en el zaguán',
      outcome: { next: 'a1_ilse_patio' },
    },
    {
      id: 'dejarla_terminar_y_escuchar',
      label: 'Dejarla terminar y escuchar hasta el final',
      outcome: { next: 'a1_alcaldesa' },
    },
    // Floodgate que LEE lo que se averigua en el Ancla Seca (`a1_orell_mesa` o el libro de Mausi).
    {
      id: 'nombrarle_al_mercader',
      label: 'Nombrarle al mercader del otro lado',
      requires: { flag: 'run:sabe_de_halvar' },
      lockedHint: 'Todavía no tenés ningún nombre que tirarle',
      outcome: {
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'a1_alcaldesa',
      },
    },
  ],
} satisfies Scene;

export const a1_ilse_patio = {
  id: 'a1_ilse_patio',
  kind: 'normal',
  place: 'casa_de_berta',
  npcs: ['ilse'],
  text: ['TODO'],
  choices: [
    {
      id: 'mirar_lo_que_carga',
      label: 'Mirar lo que carga en la carretilla',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        advantageIf: { item: 'farol_de_sebo' },
        outcomes: {
          success: {
            effects: [{ set: 'run:pista_molino' }],
            next: 'a1_molino',
          },
          partial: {
            effects: [{ set: 'run:pista_molino' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_molino',
          },
          failure: { next: 'a1_alcaldesa' },
        },
      },
    },
    // La fuente de `run:ilse_confia` del acto 1 (biblia §7.2: una por acto).
    {
      id: 'escucharla_sin_apurarla',
      label: 'Escucharla sin apurarla',
      outcome: {
        effects: [{ set: 'run:ilse_confia' }],
        next: 'a1_alcaldesa',
      },
    },
    {
      id: 'acompanarla_hasta_el_molino',
      label: 'Acompañarla hasta el molino',
      outcome: {
        effects: [{ set: 'run:con_ilse' }],
        next: 'a1_molino',
      },
    },
    {
      id: 'volver_a_la_plaza',
      label: 'Volver a la plaza por el callejón',
      outcome: { next: 'a1_plaza' },
    },
    // Atajo [Recuerdo] 4 de la biblia §9.3: no ahorra camino, ESCRIBE información.
    // Es el camino C a `char:vado.sabe_del_sello` antes de elegir rama (biblia §9.4).
    {
      id: 'preguntarle_por_el_sello',
      label: 'Preguntarle por el sello sin rodeos',
      requires: { endingSeen: 'fin_crecida' },
      lockedHint: 'Todavía no sabés que hay algo que preguntar',
      outcome: {
        effects: [{ set: 'char:vado.sabe_del_sello' }],
        next: 'a1_alcaldesa',
      },
    },
    {
      id: 'pedirle_la_llave_del_molino',
      label: 'Pedirle la llave del molino',
      requires: { flag: 'run:ilse_confia' },
      lockedHint: 'Ilse todavía no te habla de verdad',
      outcome: {
        effects: [{ set: 'run:pista_molino' }],
        next: 'a1_molino',
      },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// El molino de Tomé
// ---------------------------------------------------------------------------

export const a1_molino = {
  id: 'a1_molino',
  kind: 'normal',
  place: 'molino_de_tome',
  npcs: ['pell'],
  onEnter: [{ set: 'run:pista_molino' }],
  text: ['TODO'],
  choices: [
    // Única tirada. El fallo es la segunda fuente de `run:pell_delato` (biblia §7.2) y cobra
    // +2 de `sospecha`: "que Pell te vea (+1) o te delate (+2)" (biblia §7.1).
    {
      id: 'mirar_por_la_ventana',
      label: 'Mirar por la ventana del caz',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo'],
        advantageIf: { item: 'farol_de_sebo' },
        outcomes: {
          success: { next: 'a1_molino_trampilla' },
          partial: {
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a1_molino_trampilla',
          },
          failure: {
            effects: [{ set: 'run:pell_delato' }, { clock: 'sospecha', delta: 2 }],
            next: 'a1_molino_rueda',
          },
        },
      },
    },
    {
      id: 'agarrar_la_palanca',
      label: 'Agarrar la palanca de la muela',
      outcome: {
        effects: [{ give: 'palanca_de_molino' }],
        next: 'a1_molino_trampilla',
      },
    },
    {
      id: 'descolgar_el_farol',
      label: 'Descolgar el farol del gancho',
      outcome: {
        effects: [{ give: 'farol_de_sebo' }],
        next: 'a1_molino_rueda',
      },
    },
    // La salida libre que reemplazó al viejo `redirect` de `a1_molino_pell` (outline §5/r03).
    {
      id: 'entrar_por_el_caz',
      label: 'Entrar por el caz, bajo el piso',
      outcome: { next: 'a1_molino_trampilla' },
    },
    {
      id: 'volver_a_la_plaza',
      label: 'Volver a la plaza',
      outcome: { next: 'a1_plaza' },
    },
    // La celda "molino último" de la matriz 3×3: con las otras dos pistas encendidas, Pell ya se
    // fue y esta opción NO aparece (biblia §9.2). Es la única entrada a `a1_molino_pell`.
    {
      id: 'hablar_con_el_chico',
      label: 'Hablarle al chico del casco grande',
      requires: { not: { all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }] } },
      lockedHint: 'El molino ya está vacío: no hay nadie a quien hablarle',
      outcome: { next: 'a1_molino_pell' },
    },
    // [Explorador] — ves la trampilla sin tocar el candado (biblia §9.5).
    {
      id: 'subir_por_la_rueda',
      label: 'Subir por la rueda hasta el desván',
      requires: { class: 'explorador' },
      lockedHint: 'Esa rueda no la sube cualquiera',
      outcome: { next: 'a1_molino_trampilla' },
    },
    // [Origen] `hijo_de_molinero` (biblia §9.5).
    {
      id: 'trabar_la_rueda_como_te_ensenaron',
      label: 'Trabar la rueda como te enseñaron de chico',
      requires: { trait: 'hijo_de_molinero' },
      lockedHint: 'Nadie te enseñó a parar una rueda de molino',
      outcome: { next: 'a1_molino_rueda' },
    },
  ],
} satisfies Scene;

export const a1_molino_pell = {
  id: 'a1_molino_pell',
  kind: 'normal',
  place: 'molino_de_tome',
  // Se entra solo por `a1_molino.hablar_con_el_chico`, así que Pell está en toda ruta que entra.
  npcs: ['pell'],
  text: ['TODO'],
  choices: [
    // La tirada `facil` del molino y uno de los 6 `crit` del cupo de campaña (outline §5/r04).
    {
      id: 'hablarle_de_frente',
      label: 'Hablarle de frente y sin rodeos',
      roll: {
        attr: 'presencia',
        difficulty: 'facil',
        tags: ['social'],
        outcomes: {
          crit: {
            effects: [{ set: 'run:pell_amigo' }, { give: 'palanca_de_molino' }],
            next: 'a1_molino_trampilla',
          },
          success: {
            effects: [{ set: 'run:pell_amigo' }],
            next: 'a1_molino_trampilla',
          },
          partial: {
            effects: [{ set: 'run:pell_amigo' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_molino',
          },
          failure: {
            effects: [{ set: 'run:pell_delato' }, { clock: 'sospecha', delta: 2 }],
            next: 'a1_molino_rueda',
          },
        },
      },
    },
    {
      id: 'preguntarle_por_el_bulto',
      label: 'Preguntarle qué lleva en la arpillera',
      outcome: { next: 'a1_molino_rueda' },
    },
    {
      id: 'dejarlo_ir_y_entrar_igual',
      label: 'Dejarlo ir y entrar igual',
      outcome: { next: 'a1_molino_trampilla' },
    },
    {
      id: 'volver_al_cuerpo_del_molino',
      label: 'Volver al cuerpo del molino',
      outcome: { next: 'a1_molino' },
    },
    // Segunda fuente de `run:pell_amigo` (biblia §7.2). Gasta credibilidad, no la carta: el
    // `take` de la `carta_lacrada` está reservado a las cuatro maneras de biblia §5.
    {
      id: 'mentirle_con_la_carta',
      label: 'Mentirle mostrando el lacre de Berta',
      requires: { item: 'carta_lacrada' },
      lockedHint: 'Ya no tenés la carta lacrada',
      outcome: {
        effects: [{ set: 'run:pell_amigo' }],
        next: 'a1_molino_trampilla',
      },
    },
    {
      id: 'pedirle_que_te_abra_la_trampilla',
      label: 'Pedirle que te abra la trampilla',
      requires: { flag: 'run:pell_amigo' },
      lockedHint: 'Pell todavía no te debe ningún silencio',
      outcome: {
        effects: [{ give: 'palanca_de_molino' }],
        next: 'a1_molino_trampilla',
      },
    },
  ],
} satisfies Scene;

export const a1_molino_trampilla = {
  id: 'a1_molino_trampilla',
  kind: 'normal',
  place: 'molino_de_tome',
  // La `palanca_de_molino` se consume al bajar por cualquier vía: queda trabando la tapa
  // (biblia §5). Un `take` de algo que no tenés es inocuo, así que va sin condición.
  onEnter: [{ take: 'palanca_de_molino' }],
  text: ['TODO'],
  choices: [
    // Único `fumble` de esta tanda (outline §5/r04).
    {
      id: 'bajar_la_escalera',
      label: 'Bajar la escalera de la trampilla',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo'],
        advantageIf: { item: 'farol_de_sebo' },
        outcomes: {
          success: {
            effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
            next: 'a1_molino_rueda',
          },
          partial: {
            effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }, { wound: 1 }],
            next: 'a1_molino_rueda',
          },
          failure: {
            effects: [{ addCondition: 'empapado' }],
            next: 'a1_molino',
          },
          fumble: {
            effects: [{ wound: 1 }, { addCondition: 'empapado' }],
            next: 'a1_molino',
          },
        },
      },
    },
    // Segunda fuente de `run:vio_runas`, el camino B a `char:vado.sabe_del_sello` (biblia §9.4).
    {
      id: 'leer_las_marcas',
      label: 'Leer las marcas talladas en la tapa',
      outcome: {
        effects: [{ set: 'run:vio_runas' }],
        next: 'a1_molino_rueda',
      },
    },
    {
      id: 'volver_al_cuerpo_del_molino',
      label: 'Volver al cuerpo del molino',
      outcome: { next: 'a1_molino' },
    },
    {
      id: 'salir_por_el_caz',
      label: 'Salir por el caz hasta la plaza',
      outcome: { next: 'a1_plaza' },
    },
    // [Origen] `cazador_furtivo` (biblia §9.5): baja sin que la escalera cante, sin tirada.
    {
      id: 'bajar_sin_que_cante',
      label: 'Pisar donde la escalera no canta',
      requires: { trait: 'cazador_furtivo' },
      lockedHint: 'La escalera canta y vos no sabés dónde pisar',
      outcome: {
        effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
        next: 'a1_molino_rueda',
      },
    },
    {
      id: 'mirar_el_hueco_del_zocalo',
      label: 'Mirar el hueco del zócalo',
      requires: { flag: 'run:vio_runas' },
      lockedHint: 'No sabrías qué estás mirando',
      outcome: {
        effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
        next: 'a1_molino_rueda',
      },
    },
  ],
} satisfies Scene;

export const a1_molino_rueda = {
  id: 'a1_molino_rueda',
  kind: 'normal',
  place: 'molino_de_tome',
  text: ['TODO'],
  choices: [
    // La segunda `facil` del acto 1. Es la fuente de `run:cuerpo_hallado` del molino: saber que
    // Tomé está muerto ANTES de encontrar el cuerpo (biblia §7.2).
    {
      id: 'trabar_la_rueda',
      label: 'Trabar la rueda con un madero',
      roll: {
        attr: 'vigor',
        difficulty: 'facil',
        tags: ['fisico'],
        advantageIf: { item: 'farol_de_sebo' },
        outcomes: {
          success: {
            effects: [{ set: 'run:cuerpo_hallado' }],
            next: 'a1_molino_trampilla',
          },
          partial: {
            effects: [{ set: 'run:cuerpo_hallado' }, { wound: 1 }],
            next: 'a1_molino_trampilla',
          },
          failure: {
            effects: [{ addCondition: 'empapado' }],
            next: 'a1_molino',
          },
        },
      },
    },
    {
      id: 'seguir_el_caz_hasta_el_azud',
      label: 'Seguir el caz hasta el azud',
      outcome: { next: 'a1_plaza' },
    },
    {
      id: 'volver_adentro',
      label: 'Volver adentro del molino',
      outcome: { next: 'a1_molino' },
    },
    {
      id: 'entrar_por_el_hueco_del_caz',
      label: 'Entrar por el hueco del caz a la trampilla',
      outcome: { next: 'a1_molino_trampilla' },
    },
    {
      id: 'pescar_lo_que_flota',
      label: 'Alumbrar lo que flota entre los álabes',
      requires: { item: 'farol_de_sebo' },
      lockedHint: 'Sin luz no ves nada en esa agua',
      outcome: {
        effects: [{ set: 'run:cuerpo_hallado' }],
        next: 'a1_molino_trampilla',
      },
    },
  ],
} satisfies Scene;
