import type { Scene } from '@/content/schema';

/**
 * Esqueleto (Fase C) de la rama B del acto 2 —"Contra la ley"— y del cuello 2 de
 * "El vado de Aldamar". Diez escenas: `a2_fuera_fuga`, `a2_fuera_sotano`, `a2_fuera_sello`,
 * `a2_fuera_medallon`, `a2_fuera_ilse`, `a2_fuera_refugio`, `c2_anochece`, `c2_orilla`,
 * `c2_vado_crecido` y `c2_otra_orilla`.
 *
 * **Toda la prosa es `TODO`**: `text`, los `outcome.text` se omiten (son opcionales) y los
 * `lockedHint` son de trabajo. Lo que NO es provisional: ids, `kind`, `place`, `variant`, `npcs`,
 * `redirect`, `onEnter`, `requires`, `effects`, dificultades y destinos. Las cuentas de opciones y
 * de tiradas son las de la columna `opc` / `tir` de `design/01-outline.md` §2:
 *
 * | escena | opc (total/libres) | tir |
 * |---|---|---|
 * | `a2_fuera_fuga` | 6/4 | 0 |
 * | `a2_fuera_sotano` | 7/4 | 1 |
 * | `a2_fuera_sello` | 7/4 | 1 |
 * | `a2_fuera_medallon` | 5/4 | 1 |
 * | `a2_fuera_ilse` | 4/4 | 1 |
 * | `a2_fuera_refugio` (rest) | 5/4 | 0 |
 * | `c2_anochece` | 6/5 | 0 |
 * | `c2_orilla` | 5/4 | 0 |
 * | `c2_vado_crecido` (**lethal**) | 5/4 | 3 |
 * | `c2_otra_orilla` | 4/4 | 1 |
 *
 * **Invariantes de este archivo que ningún lote posterior puede romper:**
 * 1. `c2_vado_crecido` es la ÚNICA escena `lethal` de la campaña y tiene UNA SOLA arista de
 *    entrada: `c2_orilla.bajar_al_vado`, opción con `outcome` y sin `roll` (r05). Ningún
 *    `redirect` y ningún desenlace de tirada pueden apuntarle nunca.
 * 2. `{ lethal: true }` aparece en exactamente tres desenlaces, los tres de tirada y los tres en
 *    esa escena: `cruzar_de_frente.failure`, `cruzar_de_frente.fumble` y
 *    `cruzar_por_las_piedras.failure`. Su `onEnter` va vacío a propósito (el hito
 *    `cruzar_el_vado_crecido` vive en `c2_otra_orilla.onEnter`, outline §7 conflicto 6).
 * 3. `muy_dificil` solo en las dos tiradas letales; `extrema` en ninguna (r09).
 * 4. El cruce de rama de `a2_fuera_fuga` hace `clear` de `run:contra_la_ley` además del `set` de
 *    `run:con_la_ley`, y lleva `requires: { not: { flag: 'run:cruzo_de_rama' } }` (contrato §8.13).
 * 5. `a2_fuera_sello.leer_la_piedra` es tirada de PUERTA: enciende `run:piedra_leida` en las
 *    CUATRO bandas que declara y lleva `requires: { not: { flag: 'run:piedra_leida' } }`. No se
 *    puede repetir, y el sótano se recorre hacia adelante (`a2_fuera_medallon` no vuelve acá).
 * 6. Ningún `set`/`clear` sobre `char:met.*`, `char:place.*`, `char:origen.*`, `char:leyenda` ni
 *    `world:caido.*`: esos se LEEN nada más.
 */

// ---------------------------------------------------------------------------
// Acto 2 · rama B — "Contra la ley"
// ---------------------------------------------------------------------------

/**
 * `a2_fuera_fuga` — la plaza al filo del día, Ilse te saca del pueblo.
 * Sin tiradas (outline §9.6: es una de las 13 escenas sin dados). `onEnter` enciende
 * `run:con_ilse`. Contiene uno de los tres cruces de rama de la campaña.
 */
export const a2_fuera_fuga = {
  id: 'a2_fuera_fuga',
  kind: 'normal',
  place: 'aldamar_plaza',
  npcs: ['ilse'],
  onEnter: [{ set: 'run:con_ilse' }],
  text: ['TODO'],
  choices: [
    {
      id: 'seguirla_por_el_caz',
      label: 'Seguir a Ilse por el caz hasta el sótano',
      outcome: { next: 'a2_fuera_sotano' },
    },
    {
      id: 'preguntarle_que_sabe',
      label: 'Preguntarle qué sabe antes de moverte',
      outcome: { next: 'a2_fuera_sotano' },
    },
    {
      id: 'esconderte_en_el_molino',
      label: 'Esconderte con ella en el molino hasta la noche',
      outcome: { next: 'a2_fuera_refugio' },
    },
    {
      id: 'salir_por_los_techos',
      label: 'Salir por los techos y perderte en la vega',
      outcome: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'a2_fuera_refugio' },
    },
    // Cruce de rama B → A. Único en la partida, cuesta +1 de sospecha y hace `clear` del bando viejo.
    {
      id: 'volver_con_la_guardia',
      label: 'Dejarla y volver a la torre con la guardia',
      requires: { not: { flag: 'run:cruzo_de_rama' } },
      lockedHint: 'Ya elegiste de qué lado estás, y no hay vuelta.',
      outcome: {
        effects: [
          { set: 'run:cruzo_de_rama' },
          { set: 'run:con_la_ley' },
          { clear: 'run:contra_la_ley' },
          { clock: 'sospecha', delta: 1 },
        ],
        next: 'a2_ley_orell',
      },
    },
    {
      id: 'nombrarle_la_mentira_de_berta',
      label: 'Nombrarle la mentira de su madre',
      requires: { flag: 'run:berta_miente' },
      lockedHint: 'No tenés con qué probar que la madre miente.',
      outcome: { next: 'a2_fuera_sotano' },
    },
  ],
} satisfies Scene;

/**
 * `a2_fuera_sotano` — el sótano del sello. Tomé habla acá, y solo acá, por el cuaderno
 * (`speaker: 'tome'`, y por eso está en `npcs`).
 * `onEnter` saca el farol y la palanca (biblia §5: la mochila está por desbordar), enciende
 * `run:vio_el_sello` y escribe el hito `ver_el_sello`. Peor caso de ranuras al salir: 2 de 6.
 */
export const a2_fuera_sotano = {
  id: 'a2_fuera_sotano',
  kind: 'normal',
  place: 'sotano_del_sello',
  npcs: ['ilse', 'tome'],
  onEnter: [
    { take: 'farol_de_sebo' },
    { take: 'palanca_de_molino' },
    { set: 'run:vio_el_sello' },
    { milestone: 'ver_el_sello' },
  ],
  text: ['TODO'],
  choices: [
    {
      id: 'abrir_el_cuaderno',
      label: 'Abrir el cuaderno de Tomé',
      outcome: { effects: [{ give: 'cuaderno_de_tome' }], next: 'a2_fuera_sello' },
    },
    {
      id: 'escuchar_a_ilse',
      label: 'Escuchar lo que Ilse no termina de decir',
      outcome: { effects: [{ set: 'run:ilse_confia' }], next: 'a2_fuera_medallon' },
    },
    {
      id: 'meter_las_manos_en_el_zocalo',
      label: 'Meter las manos en el agua del zócalo',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion', 'supervivencia'],
        outcomes: {
          success: { next: 'a2_fuera_sello' },
          partial: { effects: [{ wound: 1 }], next: 'a2_fuera_sello' },
          failure: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'a2_fuera_ilse' },
        },
      },
    },
    {
      id: 'subir_a_descansar',
      label: 'Subir a descansar al piso del molino',
      outcome: { next: 'a2_fuera_refugio' },
    },
    // [Explorador] — sabor y atajo, nunca llave (biblia §9.5): evita la Herida de perderse al volver.
    {
      id: 'marcar_con_tiza',
      label: 'Marcar con tiza el camino de vuelta',
      requires: { class: 'explorador' },
      lockedHint: 'Solo un Explorador marca un camino sin perderlo.',
      outcome: { next: 'a2_fuera_sello' },
    },
    {
      id: 'pedirle_que_te_muestre_el_medallon',
      label: 'Pedirle a Ilse que te muestre el medallón',
      requires: { flag: 'run:ilse_confia' },
      lockedHint: 'Ilse todavía no te muestra lo que guarda.',
      outcome: { next: 'a2_fuera_medallon' },
    },
    {
      id: 'reconocer_las_marcas_del_pilar',
      label: 'Reconocer las marcas que viste en el pilar',
      requires: { flag: 'run:vio_runas' },
      lockedHint: 'No viste nunca esas marcas.',
      outcome: { next: 'a2_fuera_ilse' },
    },
  ],
} satisfies Scene;

/**
 * `a2_fuera_sello` — la piedra en su hueco. Es la puerta de la rama B al final oculto.
 *
 * `leer_la_piedra` es el **camino A** de biblia §9.4: Saber · `dificil` · `['saber','magia']`,
 * ventaja para el Mago y para `vista_arcana`, con `fumble` (uno de los 4 de la campaña). Enciende
 * `run:piedra_leida` en sus cuatro bandas y lleva `requires: { not: { flag } }`: un intento por
 * partida. El fallo empuja hacia adelante, a `a2_fuera_medallon`.
 * `releer_las_runas` es el **camino B** (rasgo o habilidad, sin tirada) y no consume el intento.
 */
export const a2_fuera_sello = {
  id: 'a2_fuera_sello',
  kind: 'normal',
  place: 'sotano_del_sello',
  text: ['TODO'],
  choices: [
    {
      id: 'leer_la_piedra',
      label: 'Leer la piedra hasta entenderla',
      requires: { not: { flag: 'run:piedra_leida' } },
      lockedHint: 'Esa piedra ya te dijo todo lo que iba a decirte.',
      roll: {
        attr: 'saber',
        difficulty: 'dificil',
        tags: ['saber', 'magia'],
        advantageIf: { any: [{ class: 'mago' }, { skill: 'vista_arcana' }] },
        outcomes: {
          success: {
            effects: [{ set: 'run:piedra_leida' }, { set: 'char:vado.sabe_del_sello' }],
            next: 'a2_fuera_ilse',
          },
          partial: {
            effects: [{ set: 'run:piedra_leida' }, { set: 'char:vado.sabe_del_sello' }, { wound: 1 }],
            next: 'a2_fuera_medallon',
          },
          failure: {
            effects: [{ set: 'run:piedra_leida' }],
            next: 'a2_fuera_medallon',
          },
          fumble: {
            effects: [{ set: 'run:piedra_leida' }, { addCondition: 'agotado' }],
            next: 'a2_fuera_medallon',
          },
        },
      },
    },
    {
      id: 'releer_las_runas',
      label: 'Releer la segunda línea de las runas',
      requires: {
        all: [
          { flag: 'run:vio_runas' },
          { any: [{ trait: 'aprendiz_de_escriba' }, { skill: 'erudito_de_runas' }] },
        ],
      },
      lockedHint: 'No viste esas runas, o no sabrías leerlas.',
      outcome: { effects: [{ set: 'char:vado.sabe_del_sello' }], next: 'a2_fuera_medallon' },
    },
    // [Mago] — párrafo exclusivo: la piedra contesta. No escribe canon ni entrega objeto.
    {
      id: 'escuchar_el_sello',
      label: 'Escuchar lo que la piedra contesta',
      requires: { class: 'mago' },
      lockedHint: 'Solo un Mago escucha lo que contesta una piedra.',
      outcome: { next: 'a2_fuera_ilse' },
    },
    {
      id: 'levantar_el_sello_con_cuidado',
      label: 'Levantar el sello con las dos manos',
      outcome: { effects: [{ give: 'sello_del_vado' }], next: 'a2_fuera_medallon' },
    },
    // Burnt Bridge: la única cosa que se quema acá es la confianza de Ilse.
    {
      id: 'arrancar_el_sello_de_una',
      label: 'Arrancar el sello de una y cargarlo',
      outcome: {
        effects: [
          { give: 'sello_del_vado' },
          { clear: 'run:ilse_confia' },
          { wound: 1 },
          { clock: 'sospecha', delta: 1 },
        ],
        next: 'a2_fuera_ilse',
      },
    },
    {
      id: 'dejar_la_piedra_en_su_hueco',
      label: 'Dejar la piedra en su hueco y no tocarla',
      outcome: { next: 'a2_fuera_ilse' },
    },
    {
      id: 'volver_arriba',
      label: 'Volver arriba antes de que aclare',
      outcome: { next: 'a2_fuera_refugio' },
    },
  ],
} satisfies Scene;

/**
 * `a2_fuera_medallon` — Ilse y la esquirla que le falta al sello.
 * Entrega el `medallon_de_tome` (precio, nunca llave: `cl_desenlace` lo lee con `advantageIf`).
 * `rezar_por_tome` escribe `char:vado.tome_enterrado`, igual que `c1_cuerpo.enterrarlo`.
 * El sótano se recorre hacia adelante: esta escena NO vuelve a `a2_fuera_sello`.
 */
export const a2_fuera_medallon = {
  id: 'a2_fuera_medallon',
  kind: 'normal',
  place: 'sotano_del_sello',
  npcs: ['ilse'],
  text: ['TODO'],
  choices: [
    {
      id: 'pedirle_la_esquirla',
      label: 'Pedirle a Ilse la esquirla que guarda',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        advantageIf: { flag: 'run:ilse_confia' },
        outcomes: {
          success: {
            effects: [{ give: 'medallon_de_tome' }, { milestone: 'la_verdad_de_tome' }],
            next: 'a2_fuera_ilse',
          },
          partial: {
            effects: [
              { give: 'medallon_de_tome' },
              { milestone: 'la_verdad_de_tome' },
              { clock: 'sospecha', delta: 1 },
            ],
            next: 'a2_fuera_ilse',
          },
          failure: {
            effects: [{ clear: 'run:ilse_confia' }],
            next: 'a2_fuera_ilse',
          },
        },
      },
    },
    {
      id: 'rezar_por_tome',
      label: 'Rezar por Tomé con lo que te quede de voz',
      outcome: { effects: [{ set: 'char:vado.tome_enterrado' }], next: 'a2_fuera_ilse' },
    },
    {
      id: 'contarle_lo_del_vado',
      label: 'Contarle cómo encontraste a Tomé en el vado',
      outcome: { next: 'a2_fuera_ilse' },
    },
    {
      id: 'subir_con_ella',
      label: 'Subir con ella antes de que aclare',
      outcome: { next: 'a2_fuera_refugio' },
    },
    {
      id: 'mostrarle_el_cuaderno',
      label: 'Mostrarle el cuaderno de su molinero',
      requires: { item: 'cuaderno_de_tome' },
      lockedHint: 'No tenés el cuaderno de Tomé encima.',
      outcome: { effects: [{ set: 'run:ilse_confia' }], next: 'a2_fuera_ilse' },
    },
  ],
} satisfies Scene;

/**
 * `a2_fuera_ilse` — la confesión. Cuatro opciones, las cuatro libres, un solo destino.
 * `onEnter` escribe el hito `la_verdad_de_tome` (biblia §7.4).
 * `presionarla` es el Burnt Bridge de la escena: sus TRES bandas limpian `run:ilse_confia` (lo
 * quemado es la confianza) y solo cambia el precio.
 */
export const a2_fuera_ilse = {
  id: 'a2_fuera_ilse',
  kind: 'normal',
  place: 'sotano_del_sello',
  npcs: ['ilse'],
  onEnter: [{ milestone: 'la_verdad_de_tome' }],
  text: ['TODO'],
  choices: [
    {
      id: 'presionarla',
      label: 'Presionarla hasta que diga el nombre',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: {
            effects: [{ clear: 'run:ilse_confia' }],
            next: 'a2_fuera_refugio',
          },
          partial: {
            effects: [{ clear: 'run:ilse_confia' }, { clear: 'run:con_ilse' }],
            next: 'a2_fuera_refugio',
          },
          failure: {
            effects: [
              { clear: 'run:ilse_confia' },
              { clear: 'run:con_ilse' },
              { clock: 'sospecha', delta: 1 },
            ],
            next: 'a2_fuera_refugio',
          },
        },
      },
    },
    {
      id: 'pedirle_que_te_acompane',
      label: 'Pedirle que te acompañe hasta el final',
      outcome: { effects: [{ set: 'run:con_ilse' }], next: 'a2_fuera_refugio' },
    },
    {
      id: 'escucharla_hasta_el_final',
      label: 'Escucharla hasta que se le acabe',
      outcome: { effects: [{ set: 'run:ilse_confia' }], next: 'a2_fuera_refugio' },
    },
    {
      id: 'dejarla_en_paz',
      label: 'Dejarla en paz y subir al molino',
      outcome: { next: 'a2_fuera_refugio' },
    },
  ],
} satisfies Scene;

/**
 * `a2_fuera_refugio` — la `rest` de la rama B, en el molino vacío.
 * `redirect` se evalúa ANTES de `onEnter` (schema.ts, orden fijo del motor): con `sospecha` llena
 * se acaba el descanso y con él el farmeo de `heal`, y la partida sale directo a `c2_anochece`.
 * Las dos `rest` del acto 2 curan 1 Herida a cambio de +1 de `sospecha` (biblia §9.6).
 */
export const a2_fuera_refugio = {
  id: 'a2_fuera_refugio',
  kind: 'rest',
  place: 'molino_de_tome',
  redirect: [{ when: { clock: 'sospecha', gte: 4 }, to: 'c2_anochece' }],
  onEnter: [{ clock: 'sospecha', delta: 1 }, { heal: 1 }],
  text: ['TODO'],
  choices: [
    {
      id: 'dormir_hasta_la_noche',
      label: 'Dormir hasta que caiga la tercera noche',
      outcome: { next: 'c2_anochece' },
    },
    {
      id: 'bajar_otra_vez_al_sotano',
      label: 'Bajar otra vez al sótano mientras hay tiempo',
      outcome: { next: 'a2_fuera_sotano' },
    },
    {
      id: 'buscar_a_ilse_entre_las_bolsas',
      label: 'Buscar a Ilse entre las bolsas de harina',
      outcome: { next: 'a2_fuera_ilse' },
    },
    {
      id: 'secarte_junto_al_horno',
      label: 'Secarte junto al horno del molino',
      outcome: { effects: [{ removeCondition: 'all' }], next: 'c2_anochece' },
    },
    {
      id: 'repasar_el_cuaderno',
      label: 'Repasar las últimas hojas del cuaderno',
      requires: { item: 'cuaderno_de_tome' },
      lockedHint: 'No tenés el cuaderno de Tomé encima.',
      outcome: { next: 'a2_fuera_ilse' },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// Transición B y cuello 2 — la tormenta
// ---------------------------------------------------------------------------

/**
 * `c2_anochece` — tercera noche, la plaza bajo la tormenta. **Convergencia**: las dos ramas pasan
 * por acá, incluidas las que llegan por `redirect` de `sospecha` desde las dos `rest`.
 *
 * **T−2 del anuncio de muerte** (biblia §11): el texto base dice, sin metáfora, cuántas piedras
 * del vado tapa el agua, y `buscar_una_cuerda` entrega la `cuerda_de_molinero` — el aviso viene con
 * la herramienta, que después es la ventaja de `c2_vado_crecido.cruzar_de_frente`.
 * Sin tiradas: es escena de aviso, no de habilidad.
 */
export const c2_anochece = {
  id: 'c2_anochece',
  kind: 'normal',
  place: 'aldamar_plaza',
  variant: 'tormenta',
  text: ['TODO'],
  choices: [
    {
      id: 'buscar_una_cuerda',
      label: 'Buscar una cuerda de sirga en el molino',
      outcome: { effects: [{ give: 'cuerda_de_molinero' }], next: 'c2_orilla' },
    },
    {
      id: 'mirar_cuantas_piedras_quedan',
      label: 'Mirar cuántas piedras del vado quedan',
      outcome: { next: 'c2_orilla' },
    },
    {
      id: 'escuchar_a_la_gente',
      label: 'Escuchar lo que grita la gente en la plaza',
      outcome: { next: 'c2_orilla' },
    },
    {
      id: 'cerrar_los_postigos',
      label: 'Cerrar los postigos con los vecinos',
      outcome: { next: 'c2_orilla' },
    },
    {
      id: 'salir_ya_hacia_la_orilla',
      label: 'Salir ya mismo hacia la orilla',
      outcome: { next: 'c2_orilla' },
    },
    {
      id: 'avisarle_a_orell',
      label: 'Avisarle a Orell que vas a cruzar',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell todavía no te debe nada.',
      outcome: { next: 'c2_orilla' },
    },
  ],
} satisfies Scene;

/**
 * `c2_orilla` — **T−1 del anuncio de muerte** y la puerta única de la escena mortal.
 *
 * `bajar_al_vado` es la ÚNICA arista de entrada a `c2_vado_crecido`, va **sin `roll`** y su `label`
 * nombra el vado y el verbo de cruzar sin eufemismo (r05 + biblia §11). Las otras cuatro son
 * maneras de **no** bajar; las tres libres encienden `run:dravos_sabe` (llegás con el trato ya
 * cerrado) y solo la de Orell no lo hace.
 * Sin tiradas a propósito: es escena de decisión, no de habilidad (outline §7, conflicto 1).
 * `c2_orilla` ya no vuelve a sí misma.
 */
export const c2_orilla = {
  id: 'c2_orilla',
  kind: 'normal',
  place: 'vado_oculto',
  variant: 'crecido',
  onEnter: [{ milestone: 'la_tormenta' }],
  text: ['TODO'],
  choices: [
    {
      id: 'bajar_al_vado',
      label: 'Bajar al vado',
      outcome: { next: 'c2_vado_crecido' },
    },
    {
      id: 'remar_en_la_barca_de_tome',
      label: 'Remar hasta la isla en la barca de Tomé',
      outcome: { effects: [{ set: 'run:dravos_sabe' }], next: 'c2_otra_orilla' },
    },
    {
      id: 'esperar_a_que_el_agua_baje',
      label: 'Esperar a que el agua baje un dedo',
      outcome: {
        effects: [{ set: 'run:dravos_sabe' }, { clock: 'sospecha', delta: 1 }],
        next: 'c2_otra_orilla',
      },
    },
    {
      id: 'subir_por_el_azud',
      label: 'Subir por el azud y pasar por arriba',
      outcome: {
        effects: [{ set: 'run:dravos_sabe' }, { wound: 1 }],
        next: 'c2_otra_orilla',
      },
    },
    {
      id: 'cruzar_con_orell',
      label: 'Cruzar con Orell y su farol',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no va a cruzar el vado por vos.',
      outcome: { next: 'c2_otra_orilla' },
    },
  ],
} satisfies Scene;

/**
 * `c2_vado_crecido` — **LA ESCENA MORTAL. La única de la campaña (`lethalScenes: 1`).**
 *
 * NO TOCAR SIN LEER biblia §11 y outline §5/r05:
 * - `npcs` va **vacío**: a Orell lo nombra el narrador en la opción 5, y ningún párrafo lleva
 *   `speaker: 'orell'`. Declararlo derivaría `char:met.orell` en una escena donde no está.
 * - `onEnter` va **vacío** (no se declara): el hito `cruzar_el_vado_crecido` vive en
 *   `c2_otra_orilla.onEnter`. Es la forma más limpia de cumplir el primer chequeo de r05.
 * - Entrada única: `c2_orilla.bajar_al_vado`, opción sin `roll`. Nada más puede apuntar acá.
 * - `{ lethal: true }` solo en `cruzar_de_frente.failure`, `cruzar_de_frente.fumble` y
 *   `cruzar_por_las_piedras.failure`. Nunca en una opción sin tirada ni en `onEnter`.
 * - Las opciones 3, 4 y 5 NO pueden matar y tienen que **leerse** como más seguras: prohibido el
 *   vocabulario de muerte en su prosa, o la calavera deja de informar.
 * - Las dos únicas `muy_dificil` de la campaña están acá, y las dos son opcionales.
 * - `cruzar_por_las_piedras` NO lleva `disadvantageIf: { condition: 'empapado' }`: `empapado` ya es
 *   `sigilo` y el motor no apila dos fuentes.
 * - Las opciones 1 y 2 son las únicas que **no** encienden `run:dravos_sabe`: son las únicas que te
 *   ponen en el molino antes de que el trato se cierre (abren `cl_molino.interrumpir_antes_de_que_firmen`).
 * - Los cinco desenlaces van a `c2_otra_orilla`: la escena mortal cambia el estado, no el grafo.
 */
export const c2_vado_crecido = {
  id: 'c2_vado_crecido',
  kind: 'normal',
  lethal: true,
  place: 'vado_oculto',
  variant: 'crecido',
  npcs: [],
  text: ['TODO'],
  choices: [
    {
      id: 'cruzar_de_frente',
      label: 'Cruzar de frente, con el agua en el pecho',
      roll: {
        attr: 'vigor',
        difficulty: 'muy_dificil',
        tags: ['fisico', 'supervivencia'],
        advantageIf: { item: 'cuerda_de_molinero' },
        outcomes: {
          success: { next: 'c2_otra_orilla' },
          partial: {
            effects: [{ addCondition: 'empapado' }, { take: 'carta_lacrada' }],
            next: 'c2_otra_orilla',
          },
          failure: {
            effects: [{ lethal: true }, { addCondition: 'empapado' }],
            next: 'c2_otra_orilla',
          },
          fumble: {
            effects: [{ lethal: true }, { addCondition: 'empapado' }, { take: 'carta_lacrada' }],
            next: 'c2_otra_orilla',
          },
        },
      },
    },
    {
      id: 'cruzar_por_las_piedras',
      label: 'Pisar de piedra en piedra, sin apurarte',
      roll: {
        attr: 'astucia',
        difficulty: 'muy_dificil',
        tags: ['sigilo', 'supervivencia'],
        outcomes: {
          success: { next: 'c2_otra_orilla' },
          partial: { effects: [{ addCondition: 'empapado' }], next: 'c2_otra_orilla' },
          failure: {
            effects: [{ lethal: true }, { addCondition: 'empapado' }],
            next: 'c2_otra_orilla',
          },
        },
      },
    },
    // Burnt Bridge, sin tirada: se entrega la piedra y con ella el bando.
    {
      id: 'entregar_lo_que_llevas',
      label: 'Entregar lo que llevás y que te pasen',
      outcome: {
        effects: [
          { take: 'sello_del_vado' },
          { set: 'run:trato_con_halvar' },
          { set: 'run:dravos_sabe' },
        ],
        next: 'c2_otra_orilla',
      },
    },
    // No puede matar. Su precio es tiempo: llegás con el trato ya cerrado, y recuperar la piedra
    // desde la isla (`c2_otra_orilla.levantar_la_cadena`) es una tirada que puede fallar.
    {
      id: 'atar_lo_que_llevas_a_la_cadena',
      label: 'Atar el bulto a la cadena del azud',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['engano', 'supervivencia'],
        outcomes: {
          success: {
            effects: [{ set: 'run:sello_escondido' }, { set: 'run:dravos_sabe' }],
            next: 'c2_otra_orilla',
          },
          partial: {
            effects: [
              { set: 'run:sello_escondido' },
              { set: 'run:dravos_sabe' },
              { addCondition: 'empapado' },
            ],
            next: 'c2_otra_orilla',
          },
          failure: {
            effects: [
              { set: 'run:sello_escondido' },
              { set: 'run:dravos_sabe' },
              { clock: 'sospecha', delta: 1 },
            ],
            next: 'c2_otra_orilla',
          },
        },
      },
    },
    {
      id: 'esperar_a_orell',
      label: 'Esperar a que Orell baje con la soga',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Nadie va a bajar a buscarte.',
      outcome: { next: 'c2_otra_orilla' },
    },
  ],
} satisfies Scene;

/**
 * `c2_otra_orilla` — la isla del molino. **Convergencia 3**: toda ruta pasa por acá.
 * `orell` va en `npcs` porque la guardia está del lado de la isla en toda ruta (outline §7,
 * conflicto 12), y acá sí puede hablar.
 * `onEnter` escribe el hito `cruzar_el_vado_crecido` — etiqueta "Llegar a la isla del molino" —,
 * que es lo que hace toda ruta y no solo la que bajó al vado.
 * `levantar_la_cadena` no lleva `requires`: el candado es de ficción (`run:sello_escondido`), y el
 * éxito lo limpia. El fallo corta la cadena y la piedra se queda en el agua: los cuatro epílogos
 * leen ese flag.
 */
export const c2_otra_orilla = {
  id: 'c2_otra_orilla',
  kind: 'normal',
  place: 'molino_de_tome',
  variant: 'inundado',
  npcs: ['orell'],
  onEnter: [{ milestone: 'cruzar_el_vado_crecido' }],
  text: ['TODO'],
  choices: [
    {
      id: 'levantar_la_cadena',
      label: 'Levantar la cadena del azud',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['fisico', 'supervivencia'],
        outcomes: {
          success: {
            effects: [{ give: 'sello_del_vado' }, { clear: 'run:sello_escondido' }],
            next: 'cl_molino',
          },
          partial: {
            effects: [
              { give: 'sello_del_vado' },
              { clear: 'run:sello_escondido' },
              { wound: 1 },
            ],
            next: 'cl_molino',
          },
          failure: { next: 'cl_molino' },
        },
      },
    },
    // Burnt Bridge, sin tirada: la piedra se queda en el agua y los cuatro epílogos lo dicen.
    {
      id: 'dejar_el_sello_en_la_cadena',
      label: 'Dejar el sello donde está y no volver',
      outcome: {
        effects: [{ take: 'sello_del_vado' }, { set: 'run:sello_escondido' }],
        next: 'cl_molino',
      },
    },
    {
      id: 'subir_al_molino_de_una',
      label: 'Subir al molino de una',
      outcome: { next: 'cl_molino' },
    },
    {
      id: 'esperar_a_que_pase_la_ronda',
      label: 'Esperar junto al horno a que pase la ronda',
      outcome: {
        effects: [
          { removeCondition: 'empapado' },
          { set: 'run:dravos_sabe' },
          { clock: 'sospecha', delta: 1 },
        ],
        next: 'cl_molino',
      },
    },
  ],
} satisfies Scene;
