import type { Scene } from '@/content/schema';

/**
 * ESQUELETO — Prólogo de "El vado de Aldamar" (5 escenas, primera noche bajo la lluvia).
 *
 * Estructura definitiva; la prosa entra en el **lote 1** (`01-outline.md` §6.2), que es el que fija
 * la voz de la campaña. Hasta entonces todo `text` y todo `outcome.text` es `TODO` / está omitido, y
 * `lintProfile` sigue en `'smoke'` para que r10 no lo mire.
 *
 * Contrato de este bloque (tabla §2 del outline, fila por fila):
 *
 * | escena                | kind   | lugar                   | npcs  | opc | tir |
 * |-----------------------|--------|-------------------------|-------|-----|-----|
 * | `p_camino` (START)    | normal | `puente_viejo`          | —     | 5/4 |  1  |
 * | `p_puente`            | normal | `puente_viejo`          | orell | 7/5 |  2  |
 * | `p_puente_rechazo`    | normal | `puente_viejo`          | orell | 6/4 |  1  |
 * | `p_vado_oculto`       | normal | `vado_oculto`           | —     | 6/5 |  1  |
 * | `p_puente_amanecer`   | normal | `puente_viejo`·amanecer | orell | 5/5 |  0  |
 *
 * Cinco tiradas en todo el prólogo (§5/r09): 1 `facil` (`p_camino.rodear_por_la_orilla`) y 4
 * `normal`. Ninguna `extrema` y ninguna `muy_dificil`: las dos `muy_dificil` de la campaña viven en
 * `c2_vado_crecido`. El único `crit` del tramo es `p_puente.convencer_a_la_guardia` y el único
 * `fumble` es `p_vado_oculto.leer_las_marcas_del_sauce` (§5/r04, cupo nombrado uno por uno).
 *
 * Tres cosas de este bloque que NO se pueden "arreglar" sin romper el diseño:
 * 1. **`pell` no va en `p_puente.npcs`** (biblia §3 y §9.3). En la barricada es *el chico del casco
 *    grande*, sin nombre y sin `speaker`. Declararlo derivaría `char:met.pell` en la escena 2 de la
 *    primera partida y dejaría el atajo `[Recuerdo]` de `a1_plaza` abierto para siempre.
 * 2. **`p_puente.mirar_las_runas_del_pilar` va a `p_puente_rechazo`**, no a una escena propia
 *    (outline §7, conflicto 11): mirás la piedra, Orell te ve mirándola y te saca del puente.
 * 3. **El atajo `[Recuerdo]` al vado está en `p_puente` y en `p_puente_rechazo`**, y en las dos lee
 *    `{ knows: 'vado_oculto' }` — nunca se escribe: `char:place.*` lo deriva el motor (§8, punto 10).
 *
 * Los tres párrafos de narrador con variante `met: 'orell'` (biblia §9.1) y la variante de memoria
 * de `p_camino` (`endingSeen`) y de `p_vado_oculto` (`knows: 'vado_oculto'`) son deuda del lote 1:
 * acá el `text` es `['TODO']` y no hay `Paragraph` todavía.
 *
 * Ojo en la pasada de voz (§5/r08c): Orell vive en `world/npcs.ts`, así que r08 NO frena un párrafo
 * suyo con `met`, `knows` o `endingSeen`. Las tres escenas del puente se miran a mano.
 */

// ---------------------------------------------------------------------------
// p_camino — START. La única escena que no se puede saltear.
// `onEnter` entrega la `carta_lacrada`: ranura 1 de 6 (biblia §5).
// ---------------------------------------------------------------------------

export const p_camino = {
  id: 'p_camino',
  kind: 'normal',
  place: 'puente_viejo',
  onEnter: [{ give: 'carta_lacrada' }],
  text: ['TODO'],
  choices: [
    {
      id: 'seguir_hasta_el_puente',
      label: 'Seguir el camino hasta el puente',
      outcome: { next: 'p_puente' },
    },
    {
      // La única `facil` del prólogo (§5/r09). Su rama de fallo —una Herida temprana y la vuelta al
      // puente— es exactamente lo que ahorra el atajo `[Recuerdo]` de la biblia §9.3.
      id: 'rodear_por_la_orilla',
      label: 'Rodear por la orilla buscando un paso',
      roll: {
        attr: 'astucia',
        difficulty: 'facil',
        tags: ['supervivencia', 'percepcion'],
        outcomes: {
          success: { next: 'p_vado_oculto' },
          partial: { effects: [{ addCondition: 'empapado' }], next: 'p_vado_oculto' },
          failure: { effects: [{ wound: 1 }], next: 'p_puente' },
        },
      },
    },
    {
      id: 'leer_otra_vez_la_carta',
      label: 'Leer otra vez la carta de Berta',
      outcome: { next: 'p_puente' },
    },
    {
      // Uno de los dos tics de `sospecha` del prólogo (biblia §7.1, tope de +2 en todo el tramo).
      id: 'esperar_a_que_afloje_la_lluvia',
      label: 'Esperar a que afloje la lluvia',
      outcome: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'p_puente' },
    },
    {
      // [Origen] `hijo_de_la_frontera` (biblia §9.5). Suma: las 4 libres siguen en pie.
      id: 'leer_el_cielo',
      label: 'Leer el cielo y adelantarte a la tormenta',
      requires: { trait: 'hijo_de_la_frontera' },
      lockedHint: 'Hace falta haberte criado donde el mapa se acaba.',
      outcome: { next: 'p_puente' },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// p_puente — la barricada. Hito `llegar_al_puente` (biblia §7.4).
// npcs: orell y NADIE MÁS (ver nota 1 de la cabecera).
// ---------------------------------------------------------------------------

export const p_puente = {
  id: 'p_puente',
  kind: 'normal',
  place: 'puente_viejo',
  npcs: ['orell'],
  onEnter: [{ milestone: 'llegar_al_puente' }],
  text: ['TODO'],
  choices: [
    {
      // El único `crit` del prólogo (§5/r04). Éxito con costo y Fallo pagan +1 de `sospecha`: son
      // "las sociales del puente" de la biblia §7.1.
      id: 'convencer_a_la_guardia',
      label: 'Convencer a la guardia de que te dejen pasar',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          crit: { effects: [{ set: 'run:orell_confia' }], next: 'a1_plaza' },
          success: { effects: [{ set: 'run:orell_confia' }], next: 'a1_plaza' },
          partial: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'a1_plaza' },
          failure: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'p_puente_rechazo' },
        },
      },
    },
    {
      // Segunda tirada de la escena, con OTRO atributo (Vigor): ninguna escena concentra todas sus
      // tiradas en un solo atributo (outline §7, conflicto 1).
      id: 'intimidar_al_sargento',
      label: 'Intimidar al sargento',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: { effects: [{ set: 'run:orell_humillado' }], next: 'a1_plaza' },
          partial: {
            effects: [{ set: 'run:orell_humillado' }, { clock: 'sospecha', delta: 1 }],
            next: 'p_puente_rechazo',
          },
          failure: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'p_puente_rechazo' },
        },
      },
    },
    {
      // Primera de las cuatro maneras de gastar la `carta_lacrada` (biblia §5).
      id: 'entregarle_la_carta_para_cruzar',
      label: 'Entregarle la carta lacrada para cruzar',
      outcome: { effects: [{ take: 'carta_lacrada' }], next: 'a1_plaza' },
    },
    {
      // Fuente 1 de 2 de `run:vio_runas` (la otra es `a1_molino_trampilla.leer_las_marcas`).
      // Destino `p_puente_rechazo` por el conflicto 11 del outline.
      id: 'mirar_las_runas_del_pilar',
      label: 'Mirar las runas del pilar',
      outcome: { effects: [{ set: 'run:vio_runas' }], next: 'p_puente_rechazo' },
    },
    {
      id: 'esperar_el_relevo_del_alba',
      label: 'Esperar el relevo del alba',
      outcome: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'p_puente_amanecer' },
    },
    {
      // [Explorador] (biblia §9.5): llega al vado sin tirada. Sabor y atajo, nunca llave.
      id: 'leer_la_orilla',
      label: 'Leer la orilla desde el pretil',
      requires: { class: 'explorador' },
      lockedHint: 'Solo un Explorador le saca el paso al río de una mirada.',
      outcome: { next: 'p_vado_oculto' },
    },
    {
      // Atajo [Recuerdo] 1 (biblia §9.3). `knows` se LEE, nunca se escribe.
      id: 'bajar_al_vado_que_ya_conoces',
      label: 'Bajar al vado que ya conocés',
      requires: { knows: 'vado_oculto' },
      lockedHint: 'Hay que haber estado antes en el vado.',
      outcome: { next: 'p_vado_oculto' },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// p_puente_rechazo — Orell te sacó del puente. Se entra desde `p_puente` por tres vías.
// ---------------------------------------------------------------------------

export const p_puente_rechazo = {
  id: 'p_puente_rechazo',
  kind: 'normal',
  place: 'puente_viejo',
  npcs: ['orell'],
  text: ['TODO'],
  choices: [
    {
      id: 'colarte_por_el_terraplen',
      label: 'Colarte por el terraplén',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo'],
        outcomes: {
          success: { next: 'a1_plaza' },
          partial: { effects: [{ addCondition: 'empapado' }], next: 'a1_plaza' },
          failure: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'p_puente_amanecer' },
        },
      },
    },
    {
      // La certeza cuesta una Herida: es la salida sin dado de la escena.
      id: 'cruzar_por_el_pilar_caido',
      label: 'Cruzar por el pilar caído',
      outcome: { effects: [{ wound: 1 }], next: 'a1_plaza' },
    },
    {
      id: 'buscar_el_paso_rio_abajo',
      label: 'Buscar el paso río abajo',
      outcome: { next: 'p_vado_oculto' },
    },
    {
      // Segundo y último tic de `sospecha` disponible en el prólogo (tope +2, biblia §7.1).
      id: 'acampar_hasta_el_relevo',
      label: 'Acampar hasta el relevo',
      outcome: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'p_puente_amanecer' },
    },
    {
      // [Guerrero] (biblia §9.5): enciende `run:orell_confia` sin tirada.
      id: 'reconocer_el_escudo',
      label: 'Reconocer el escudo del sargento',
      requires: { class: 'guerrero' },
      lockedHint: 'Hay que haber servido para leer un escudo así.',
      outcome: { effects: [{ set: 'run:orell_confia' }], next: 'a1_plaza' },
    },
    {
      // Atajo [Recuerdo] 1, segunda puerta (biblia §9.3).
      id: 'bajar_al_vado_que_ya_conoces',
      label: 'Bajar al vado que ya conocés',
      requires: { knows: 'vado_oculto' },
      lockedHint: 'Hay que haber estado antes en el vado.',
      outcome: { next: 'p_vado_oculto' },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// p_vado_oculto — el sauce partido y las piedras. Única salida del prólogo al molino.
// ---------------------------------------------------------------------------

export const p_vado_oculto = {
  id: 'p_vado_oculto',
  kind: 'normal',
  place: 'vado_oculto',
  text: ['TODO'],
  choices: [
    {
      id: 'cruzar_por_las_piedras',
      label: 'Cruzar por las piedras del vado',
      outcome: { effects: [{ addCondition: 'empapado' }], next: 'a1_plaza' },
    },
    {
      // El único `fumble` del prólogo (§5/r04). NO enciende `run:vio_runas`: ese flag tiene dos
      // fuentes cerradas (`p_puente.mirar_las_runas_del_pilar` y `a1_molino_trampilla`).
      id: 'leer_las_marcas_del_sauce',
      label: 'Leer las marcas del sauce partido',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber', 'percepcion'],
        outcomes: {
          success: { next: 'a1_molino_trampilla' },
          partial: { next: 'a1_molino' },
          failure: { effects: [{ wound: 1 }], next: 'a1_plaza' },
          fumble: { effects: [{ wound: 1 }, { addCondition: 'empapado' }], next: 'a1_plaza' },
        },
      },
    },
    {
      id: 'subir_por_el_caz',
      label: 'Subir por el caz hasta la trampilla',
      outcome: { next: 'a1_molino_trampilla' },
    },
    {
      id: 'rodear_hasta_la_puerta_del_molino',
      label: 'Rodear hasta la puerta del molino',
      outcome: { next: 'a1_molino' },
    },
    {
      id: 'mirar_la_luz_del_molino',
      label: 'Mirar la luz del molino antes de cruzar',
      outcome: { next: 'a1_molino' },
    },
    {
      // [Mago] (biblia §9.5): cruza sin Herida y sin quedar `empapado`.
      id: 'nombrar_el_agua',
      label: 'Nombrar el agua',
      requires: { class: 'mago' },
      lockedHint: 'Solo un Mago sabe con qué nombre se le habla a un río.',
      outcome: { next: 'a1_plaza' },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// p_puente_amanecer — convergencia del prólogo. 5 opciones, las 5 libres, cero tiradas.
// `onEnter` enciende `run:orell_confia`: esperar el relevo ES la fuente (biblia §7.2).
// ---------------------------------------------------------------------------

export const p_puente_amanecer = {
  id: 'p_puente_amanecer',
  kind: 'normal',
  place: 'puente_viejo',
  variant: 'amanecer',
  npcs: ['orell'],
  onEnter: [{ set: 'run:orell_confia' }],
  text: ['TODO'],
  choices: [
    {
      id: 'cruzar_con_el_relevo',
      label: 'Cruzar con el relevo de la mañana',
      outcome: { next: 'a1_plaza' },
    },
    {
      id: 'preguntarle_por_tome',
      label: 'Preguntarle a Orell por Tomé',
      outcome: { next: 'a1_plaza' },
    },
    {
      id: 'compartir_el_pan_con_la_guardia',
      label: 'Compartir el pan con la guardia',
      outcome: { next: 'a1_plaza' },
    },
    {
      id: 'bajar_al_vado_antes_de_que_aclare',
      label: 'Bajar al vado antes de que aclare',
      outcome: { next: 'p_vado_oculto' },
    },
    {
      id: 'seguir_la_orilla_hasta_el_sauce',
      label: 'Seguir la orilla hasta el sauce partido',
      outcome: { next: 'p_vado_oculto' },
    },
  ],
} satisfies Scene;
