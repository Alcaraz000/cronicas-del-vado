import type { Scene } from '@/content/schema';

/**
 * Esqueleto (Fase C) de la rama B del acto 2 —"Contra la ley"— y del cuello 2 de
 * "El vado de Aldamar". Diez escenas: `a2_fuera_fuga`, `a2_fuera_sotano`, `a2_fuera_sello`,
 * `a2_fuera_medallon`, `a2_fuera_ilse`, `a2_fuera_refugio`, `c2_anochece`, `c2_orilla`,
 * `c2_vado_crecido` y `c2_otra_orilla`.
 *
 * **(Fase C) Toda la prosa era `TODO`**: `text`, los `outcome.text` se omitían (son opcionales) y
 * los `lockedHint` eran de trabajo. **La prosa se escribió en el lote 5 de la Fase D; ver el bloque
 * "LOTE 5" más abajo.** Lo que NO es provisional: ids, `kind`, `place`, `variant`, `npcs`,
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
 *
 * ---------------------------------------------------------------------------------------------
 * LOTE 5 (Fase D) — PROSA ESCRITA. Nada de la estructura cambió: ni una `choice`, ni un `label`,
 * ni un `requires`, ni un `lockedHint`, ni un `roll`, ni un `effects`, ni un `next`, ni un
 * `redirect`, ni un `onEnter`, ni un `npcs`, ni un `place`, ni un `variant`. Entró texto y nada más.
 *
 * FASE H · TAREA 2 — "que ceder cueste algo". Lo único que cambió de estructura en este archivo son
 * tres `effects`, con sus `label`:
 *   1. `c2_orilla.remar_en_la_barca_de_tome` paga +1 de `sospecha` (primera vuelta, tabla del brief).
 *   2. `c2_vado_crecido.entregar_lo_que_llevas` → `{ addCondition: 'perseguido' }` (segunda vuelta).
 *   3. `c2_otra_orilla.dejar_el_sello_en_la_cadena` → `{ addCondition: 'empapado' }` (segunda vuelta).
 * Las dos de la segunda vuelta salen de la MEDICIÓN, no de la tabla: la traza del simulador mostró
 * que la ruta de la política prudente cruza el cuello 2 por esas dos y no pagaba nada físico en todo
 * el tramo más peligroso de la campaña. Ninguna de las dos cobra `sospecha`, a propósito: el reloj
 * llega a 4 y redirige, y la primera vuelta ya gastó un tic. La 2 sigue sin poder matar y su prosa
 * sigue sin una palabra de muerte, como pide biblia §11 para las opciones 3, 4 y 5.
 * Ninguna opción se sacó ni ganó `requires`, así que la columna `opc`/`libres` de arriba sigue
 * valiendo. `c2_anochece` NO se tocó a propósito: es escena de aviso, no de habilidad, y su
 * asimetría correcta ya existe (`buscar_una_cuerda` entrega la `cuerda_de_molinero`, que es ventaja
 * real en el vado crecido); cobrarle algo sería castigarla por hacer lo que tiene que hacer.
 *
 * DEUDA DE PROSA SALDADA
 * · Variantes de memoria de la cuota (biblia §9.1), las cuatro en párrafos de NARRADOR, sin
 *   `speaker`, y las cuatro más cortas que su base:
 *     `a2_fuera_sotano` → `{ visited: 'a2_fuera_sotano', min: 1 }`   base 30 / variante 21
 *     `a2_fuera_ilse`   → `{ visited: 'a2_fuera_ilse', min: 1 }`     base 31 / variante 24
 *     `c2_orilla`       → `{ knows: 'vado_oculto' }`                 base 28 / variante 20
 *     `c2_vado_crecido` → `{ endingSeen: 'fin_hundido' }`            base 22 / variante 19
 * · Beat de presentación de Ilse (biblia §9.1, "los tres de `world/` llevan un párrafo de narrador
 *   con variante `met` en toda escena donde puedan debutar"): `a2_fuera_fuga`, párrafo 2,
 *   `{ met: 'ilse' }`, base 33 / variante 27, narrador.
 * · PASADA DE VOZ A MANO (§5/r08c). Ilse y Orell viven en `world/npcs.ts`, así que r08 NO frena una
 *   variante de memoria en su boca. **Ningún párrafo con `speaker: 'ilse'` de este archivo lleva
 *   memoria**; el único `speaker: 'orell'` (en `c2_otra_orilla`) varía por `{ flag:
 *   'run:orell_confia' }`, que es estado de esta partida y es legal (§9.1). `speaker: 'tome'` solo
 *   aparece en `a2_fuera_sotano`, que lo declara en `npcs`.
 * · `c2_vado_crecido` tiene `npcs: []`: a Orell lo nombra el narrador en la opción 5 y su réplica va
 *   con raya dentro del párrafo de narrador, sin `speaker`. Lo mismo en `c2_anochece.avisarle_a_orell`
 *   y en `c2_orilla.cruzar_con_orell`, y lo mismo con Ilse en `a2_fuera_sello`, que no la declara.
 *
 * TELEGRAFÍA DE MUERTE (biblia §11), escrita en los tres tiempos:
 *   T−2 `c2_anochece`, párrafo 2, sin metáfora y con medida: el agua tapa **cuatro de las siete**
 *       piedras, anoche se veían seis. Y `buscar_una_cuerda` entrega la `cuerda_de_molinero`.
 *   T−1 `c2_orilla`, párrafo 2: la consecuencia nombrada (los dos carreteros de anteanoche y la
 *       mula contra el azud). El `label` de entrada es «Bajar al vado», sin eufemismo.
 *   T0  `c2_vado_crecido`: las tres formas de pasar y el precio físico de cada una, sin mecánica.
 *       Las opciones 3, 4 y 5 no llevan una sola palabra de muerte, a propósito.
 *
 * CANON RESPETADO
 * · Las piedras del vado son **siete** y la que falla es la **cuarta**, la del borde redondo
 *   (`p_vado_oculto` ×3). `c2_orilla` y `c2_vado_crecido` la nombran así.
 * · Geografía (§1.3): se cruza de la orilla sur (Aldamar) a **la isla del molino**. En este archivo
 *   nadie sale «al banco del norte» al cruzar el vado: se sale a la grava de la isla. El banco de
 *   grava del norte, donde amarra Halvar, queda más allá y no se pisa acá.
 * · Tomé mide en **dedos de agua**, se corrige y nunca culpa a nadie que no sea él. Habla dos veces:
 *   la tiza de la pared (`a2_fuera_sotano`, `speaker`) y las últimas hojas del cuaderno
 *   (`a2_fuera_refugio.repasar_el_cuaderno`, citado por el narrador entre comillas angulares
 *   porque esa escena no lo declara en `npcs`).
 * · Ilse mide en **peso** (sacos, arrobas, escalones), contesta antes de que termines, nunca ruega
 *   y, si está por llorar, cambia de tema a una tarea.
 *
 * CUPOS GASTADOS EN ESTE LOTE (para `design/cupos.md`, que todavía no existe)
 *   puteadas: **2** — `mierda` (Ilse, `a2_fuera_ilse.presionarla.failure`) y `carajo` (Tomé, última
 *   página del cuaderno, `a2_fuera_refugio.repasar_el_cuaderno`). Las dos son las únicas que la
 *   biblia §1.4 le asigna a cada uno. `usted`: 0 (Pell no aparece). Adverbios en -mente: 0.
 *   `muy`: 0. `de repente`/`de pronto`: 0. `parece que`: 0. `como si fuera`: 0. `no podés evitar`: 0.
 *   Oración sin verbo: como mucho una por escena y ninguna al final de párrafo.
 *
 * ARRANQUES (tres primeras palabras del texto base, para `design/arranques.md`)
 *   `a2_fuera_fuga` "Todavía no aclaró" · `a2_fuera_sotano` "Bajás de espaldas" ·
 *   `a2_fuera_sello` "Cabe en las" · `a2_fuera_medallon` "Ilse se sienta" ·
 *   `a2_fuera_ilse` "Tarda en empezar" · `a2_fuera_refugio` "Arriba, el molino" ·
 *   `c2_anochece` "Toda la plaza" · `c2_orilla` "Desde el banco" ·
 *   `c2_vado_crecido` "Estás metido hasta" · `c2_otra_orilla` "Salís del agua".
 *   Las diez primeras palabras son distintas entre sí y de las cinco del prólogo (Hace · Dos ·
 *   Orell · Media · Clarea), y ninguna está en la lista de quemados de §2.7. Regla local
 *   verificada dentro del lote; queda a cargo de los lotes 4 y 6 que `a2_ley_orell` no empiece con
 *   «Todavía» y que `cl_molino` no empiece con «Salís».
 *
 * DETALLES SENSORIALES (uno por escena, ninguno visual del todo, ninguno repetido, ninguno en un
 * párrafo con variante de memoria — para `design/detalles-sensoriales.md`)
 *   `a2_fuera_fuga` gusto — el agua de los techos entra en la boca y sabe a hollín.
 *   `a2_fuera_sotano` oído — la gota que cae siempre en el mismo punto del agua (FIRMA de
 *     `sotano_del_sello`, primer y único uso).
 *   `a2_fuera_sello` tacto — las yemas se entumecen antes de tocar la piedra.
 *   `a2_fuera_medallon` tacto/temperatura — lo que cuelga del cordón viene tibio.
 *   `a2_fuera_ilse` oído — la pared curva devuelve la última palabra una vez sola.
 *   `a2_fuera_refugio` gusto — la harina vieja entre los dientes, que no se va con saliva.
 *   `c2_anochece` oído — el bando despegado golpeando el poste toda la noche.
 *   `c2_orilla` oído — el vado dejó de sonar corto contra la piedra y suena hueco y parejo.
 *   `c2_vado_crecido` tacto — el agua no viene fría, viene pesada, y te corre la rodilla.
 *   `c2_otra_orilla` tacto — el tablón devuelve agua por las juntas y entra en la bota por arriba.
 *   La firma de `molino_de_tome` (el caz bajo el piso de tablones) NO se gasta acá: su primer uso
 *   es de `a1_molino`, lote 3. `a2_fuera_refugio` y `c2_otra_orilla` tiran de derivaciones.
 *   La firma de `vado_oculto` (el frío subiendo por las piernas) ya la gastó `p_vado_oculto`.
 *
 * CUATRO ANOTACIONES PARA EL DISEÑO (no se tocó nada; se anota y se sigue).
 * (a) **TRES CELDAS DEL OUTLINE §2 SON ARITMÉTICAMENTE INSATISFACIBLES**, por la misma razón que
 *     la de `p_puente_amanecer` en el lote 1. El piso de `outcome.text` de la biblia §2.3 es
 *     **20 palabras**, así que el mínimo real de una escena es `text` + 20 × (outcomes que §2.5 y
 *     §4.4 obligan a escribir). Con esa cuenta:
 *       `a2_fuera_refugio`  piso 90 + 20×4 = **170** · celda **90**  → escrito 198
 *       `a2_fuera_fuga`     piso 110 + 20×6 = **230** · celda **194** → escrito 280
 *       `c2_anochece`       piso 115 + 20×6 = **235** · celda **199** → escrito 243
 *     `a2_fuera_refugio` es el caso extremo: seis opciones, cero tiradas y **dos pares que
 *     comparten `next` sin efectos distintivos** —`dormir_hasta_la_noche` / `secarte_junto_al_horno`
 *     (a `c2_anochece`) y `buscar_a_ilse_entre_las_bolsas` / `repasar_el_cuaderno` (a
 *     `a2_fuera_ilse`)—, que §4.4 de la guía obliga a pagar con texto porque si no quedan dos
 *     botones idénticos en pantalla. **Hay que subir las tres celdas en el outline §2** (a ~180,
 *     ~240 y ~240) o colapsar opciones.
 * (b) **`c2_vado_crecido.atar_lo_que_llevas_a_la_cadena` y `c2_otra_orilla.dejar_el_sello_en_la_cadena`
 *     necesitan variante por `{ item: 'sello_del_vado' }`**, porque un jugador de rama A llega sin
 *     la piedra y el texto no le puede mentir (biblia §11 lo dice para la 4 y se olvida de la de
 *     `c2_otra_orilla`, que tiene el mismo problema al revés: hace `take` de algo que quizá no
 *     tenés). Las dos están escritas con `Paragraph` de dos variantes. **Anotar en la biblia §11.**
 * (c) **`c2_vado_crecido.cruzar_de_frente` hace `take: 'carta_lacrada'` en `partial` y en `fumble`**,
 *     y un jugador puede llegar sin la carta (se gasta de cuatro maneras, §5). El `take` es inocuo
 *     para el motor, pero el texto no: `partial` lleva variante por `{ item: 'carta_lacrada' }`.
 * (d) Presupuesto MEDIDO contra el outline §2, escena por escena (toda la prosa escrita, variantes
 *     incluidas; no se cuentan `label` ni `lockedHint`):
 *       `a2_fuera_fuga` 280/194 · `a2_fuera_sotano` 425/390 · `a2_fuera_sello` 392/339 ·
 *       `a2_fuera_medallon` 304/266 · `a2_fuera_ilse` 417/410 · `a2_fuera_refugio` 198/90 ·
 *       `c2_anochece` 243/199 · `c2_orilla` 332/300 · `c2_vado_crecido` 682/590 ·
 *       `c2_otra_orilla` 336/255.
 *     Total **3.609 contra 3.033 (+19 %)**. Descontando las tres celdas insatisfacibles de (a)
 *     —que se llevan 208 de las 576 palabras de desvío—, son 2.888 contra 2.550 (+13,3 %), el
 *     mismo desvío que midió el lote 1 y por la misma causa: opciones sin tirada cuyo único
 *     cambio posible es el texto, más las cinco variantes (memoria y objeto) que una sola partida
 *     no lee enteras (~105 palabras). **La ruta base de una partida está en ~3.500.**
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
  text: [
    'Todavía no aclaró del todo y la plaza ya tiene gente. Vas pegado a las paredes. El agua que cae de los techos te entra en la boca y sabe a hollín.',
    {
      variants: [
        {
          when: { met: 'ilse' },
          text: 'A la hija de la alcaldesa la reconocés por la trenza antes que por la cara. Esta vez no espera a que la mires: te agarra la manga y tira.',
        },
        {
          text: 'Una chica de tu altura te cierra el paso entre dos carros. Trenza colorada, delantal de cuero de hombre, harina seca hasta el codo. No pregunta: te agarra la manga y tira.',
        },
      ],
    },
    {
      speaker: 'ilse',
      variants: [
        {
          text: '—Por el caz. Abajo del azud hay una boca de piedra y se entra agachado. —Te mide de arriba abajo—. La boca es de dos sacos de ancho. Vos sos de tres. Entrás igual.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'seguirla_por_el_caz',
      label: 'Seguir a Ilse por el caz hasta el sótano',
      outcome: {
        text: [
          'Entrás atrás de ella con el agua del caz hasta la rodilla. La boca de piedra baja y se termina en una escalera de mano.',
        ],
        next: 'a2_fuera_sotano',
      },
    },
    {
      id: 'preguntarle_que_sabe',
      label: 'Preguntarle qué sabe antes de moverte',
      outcome: {
        text: [
          'Le preguntás qué hay abajo. —Lo que él encontró —dice, y no baja el paso—. Acá arriba no me vas a creer.',
        ],
        next: 'a2_fuera_sotano',
      },
    },
    {
      id: 'esconderte_en_el_molino',
      label: 'Esconderte con ella en el molino hasta la noche',
      outcome: {
        text: [
          'Cruzan por el borde del caz y suben al piso de tablones. El molino está vacío de gente y hay dónde tirarse entre las bolsas.',
        ],
        next: 'a2_fuera_refugio',
      },
    },
    {
      id: 'salir_por_los_techos',
      label: 'Salir por los techos y perderte en la vega',
      outcome: {
        text: [
          'Pasás de alero en alero hasta la última casa. El tejero que a esa hora repone pizarras te ve de cerca y no dice nada todavía.',
        ],
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'a2_fuera_refugio',
      },
    },
    // Cruce de rama B → A. Único en la partida, cuesta +1 de sospecha y hace `clear` del bando viejo.
    {
      id: 'volver_con_la_guardia',
      label: 'Dejarla y volver a la torre con la guardia',
      requires: { not: { flag: 'run:cruzo_de_rama' } },
      lockedHint: 'Ya elegiste de qué lado estás, y no hay vuelta.',
      outcome: {
        text: [
          'Le soltás la manga y volvés sobre tus pasos. Ilse no te sigue. El relevo de la torre te ve llegar solo y anota la hora.',
        ],
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
      outcome: {
        text: [
          'Le nombrás lo que su madre firmó antes de mandarte la carta. Se queda quieta en el barro y después camina más rápido. —Ya sé. Hace once días.',
        ],
        next: 'a2_fuera_sotano',
      },
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
  text: [
    'Bajás de espaldas por una escalera de mano que no llega al piso. El farol se te va en el último escalón y se apaga en el charco. Arriba queda la palanca atravesada en la tapa, para que no se cierre sola.',
    'El sótano es redondo y más viejo que el molino que tiene encima. Del borde de la trampilla baja luz gris. Cae una gota, siempre en el mismo punto del agua, y se la oye contar.',
    {
      variants: [
        {
          when: { visited: 'a2_fuera_sotano', min: 1 },
          text: 'La tiza de la pared no cambió. El agua del piso sí: la raya de mojado subió un escalón desde que te fuiste.',
        },
        {
          text: 'En la pared curva hay tiza: rayas de a cinco y, abajo, palabras que no son de las que usás. En el piso, canales en espiral bajan hasta un zócalo.',
        },
      ],
    },
    {
      speaker: 'tome',
      variants: [
        {
          text: '—Once días. Un dedo por día. La piedra no tiene la culpa, viste: la culpa es del que la tocó.',
        },
      ],
    },
    {
      speaker: 'ilse',
      variants: [{ text: '—No la toques todavía. —No baja del penúltimo escalón—. Yo bajé una vez y no dormí más.' }],
    },
  ],
  choices: [
    {
      id: 'abrir_el_cuaderno',
      label: 'Abrir el cuaderno de Tomé',
      outcome: {
        text: [
          'El cuaderno está boca abajo sobre una caja, hinchado de humedad. Las primeras hojas son cuentas de fiados. Las últimas tienen una línea sola por página. Te lo guardás.',
        ],
        effects: [{ give: 'cuaderno_de_tome' }],
        next: 'a2_fuera_sello',
      },
    },
    {
      id: 'escuchar_a_ilse',
      label: 'Escuchar lo que Ilse no termina de decir',
      outcome: {
        text: [
          'Habla del molino, del grano, del caz. Cada vez que la frase se le acerca al zócalo, cambia de tema y de tarea. Después baja dos escalones y se calla mirándote.',
        ],
        effects: [{ set: 'run:ilse_confia' }],
        next: 'a2_fuera_medallon',
      },
    },
    {
      id: 'meter_las_manos_en_el_zocalo',
      label: 'Meter las manos en el agua del zócalo',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion', 'supervivencia'],
        outcomes: {
          success: {
            text: [
              'Metés las dos manos y seguís los canales con los dedos. El agua no entra en el hueco del zócalo: sale de él, despacio y pareja, y sale tibia.',
            ],
            next: 'a2_fuera_sello',
          },
          partial: {
            text: [
              'Tanteás el borde y el canto te abre la palma de un tajo limpio. La mano se te cierra sola. Lo sentiste igual: el agua viene del hueco, no va.',
            ],
            effects: [{ wound: 1 }],
            next: 'a2_fuera_sello',
          },
          failure: {
            text: [
              'Removés el agua y el piso devuelve un ruido de olla vacía que sube por la trampilla. Arriba, en el caz, una barca de la guardia deja de remar.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_fuera_ilse',
          },
        },
      },
    },
    {
      id: 'subir_a_descansar',
      label: 'Subir a descansar al piso del molino',
      outcome: {
        text: ['Subís por donde bajaste. La palanca aguanta la tapa y la tapa no chilla al ceder.'],
        next: 'a2_fuera_refugio',
      },
    },
    // [Explorador] — sabor y atajo, nunca llave (biblia §9.5): evita la Herida de perderse al volver.
    {
      id: 'marcar_con_tiza',
      label: 'Marcar con tiza el camino de vuelta',
      requires: { class: 'explorador' },
      lockedHint: 'Solo un Explorador marca un camino sin perderlo.',
      outcome: {
        text: [
          'Agarrás la tiza de Tomé y marcás la vuelta antes de mirar nada: una raya por bloque, a la altura del hombro. El que sabe salir se queda lo que quiera.',
        ],
        next: 'a2_fuera_sello',
      },
    },
    {
      id: 'pedirle_que_te_muestre_el_medallon',
      label: 'Pedirle a Ilse que te muestre el medallón',
      requires: { flag: 'run:ilse_confia' },
      lockedHint: 'Ilse todavía no te muestra lo que guarda.',
      outcome: {
        text: [
          'Nombrás lo que guarda, sin rodeos. No dice que sí: baja los escalones que le faltaban y se sienta en el borde del agua, de espaldas a la piedra.',
        ],
        next: 'a2_fuera_medallon',
      },
    },
    {
      id: 'reconocer_las_marcas_del_pilar',
      label: 'Reconocer las marcas que viste en el pilar',
      requires: { flag: 'run:vio_runas' },
      lockedHint: 'No viste nunca esas marcas.',
      outcome: {
        text: [
          'Lo que hay debajo de la tiza es lo del pilar del puente: la misma figura que vuelve cada cinco. Quien la copió acá lo hizo de apuro, y le salió torcida siempre igual.',
        ],
        next: 'a2_fuera_ilse',
      },
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
  text: [
    'Cabe en las dos manos. Está encajada en un zócalo redondo, en el medio del piso, y los canales vienen todos a morir ahí. Antes de tocarla se te entumecen las yemas, igual que cuando agarrás hierro al aire libre en invierno.',
    'Le falta un pedazo. En el borde de arriba hay una mella fresca, del tamaño de una uña, con la piedra clara adentro: el resto está oscuro de años. Alrededor la talla sigue, apretada y pareja, y no se entiende.',
    'Ilse se quedó en la escalera. Desde ahí no se ve el zócalo, y por eso se quedó ahí.',
  ],
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
            text: [
              'Las líneas no son letras: es una frase sola repetida hasta llenar la piedra, y la frase es una medida. Alguien contó cuánta agua hay que tener quieta y dejó la cuenta en la tapa.',
            ],
            effects: [{ set: 'run:piedra_leida' }, { set: 'char:vado.sabe_del_sello' }],
            next: 'a2_fuera_ilse',
          },
          partial: {
            text: [
              'Sacás la cuenta hasta la mitad y ahí se te va la cabeza. La nuca da contra el canto. Lo entendiste igual, tirado en el agua: es un tapón y le falta un pedazo.',
            ],
            effects: [{ set: 'run:piedra_leida' }, { set: 'char:vado.sabe_del_sello' }, { wound: 1 }],
            next: 'a2_fuera_medallon',
          },
          failure: {
            text: [
              'Te quedás en la primera línea, y no termina: da la vuelta a la piedra y vuelve a empezar donde estabas. A la tercera vuelta soltás.',
            ],
            effects: [{ set: 'run:piedra_leida' }],
            next: 'a2_fuera_medallon',
          },
          fumble: {
            text: [
              'Seguís la línea con el dedo y la línea te lleva. Cuando levantás la cara, la gota cayó más veces de las que podés contar y tenés las rodillas muertas.',
            ],
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
      outcome: {
        text: [
          'La que en el pilar volvía cada cinco acá está entera, y entera no es un nombre: es una cantidad, y la cantidad es de agua.',
        ],
        effects: [{ set: 'char:vado.sabe_del_sello' }],
        next: 'a2_fuera_medallon',
      },
    },
    // [Mago] — párrafo exclusivo: la piedra contesta. No escribe canon ni entrega objeto.
    {
      id: 'escuchar_el_sello',
      label: 'Escuchar lo que la piedra contesta',
      requires: { class: 'mago' },
      lockedHint: 'Solo un Mago escucha lo que contesta una piedra.',
      outcome: {
        text: [
          'Le hablás bajo, con la frente apoyada en el canto. Contesta con lo único que sabe: ruido de agua quieta, sin río y sin lluvia. Del otro lado hay mucha.',
        ],
        next: 'a2_fuera_ilse',
      },
    },
    {
      id: 'levantar_el_sello_con_cuidado',
      label: 'Levantar el sello con las dos manos',
      outcome: {
        text: [
          'La levantás derecho para arriba, sin ladearla. El zócalo queda seco y del fondo sube olor a moneda vieja. Pesa más de lo que mide.',
        ],
        effects: [{ give: 'sello_del_vado' }],
        next: 'a2_fuera_medallon',
      },
    },
    // Burnt Bridge: la única cosa que se quema acá es la confianza de Ilse.
    {
      id: 'arrancar_el_sello_de_una',
      label: 'Arrancar el sello de una y cargarlo',
      outcome: {
        text: [
          'Metés los dedos en la mella y tirás. La piedra sale de golpe y el canto te abre los nudillos contra el zócalo. Ilse dice tu nombre desde la escalera una sola vez y no lo vuelve a decir en toda la noche. Arriba se contestan dos silbidos.',
        ],
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
      outcome: {
        text: [
          'Sacás las manos y las apoyás en las rodillas. La piedra se queda donde está. Ilse baja un escalón, después otro.',
        ],
        next: 'a2_fuera_ilse',
      },
    },
    {
      id: 'volver_arriba',
      label: 'Volver arriba antes de que aclare',
      outcome: {
        text: ['Subís sin darle la espalda del todo. La tapa aguanta. Abajo queda la gota contando sola.'],
        next: 'a2_fuera_refugio',
      },
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
  text: [
    'Ilse se sienta en el borde del agua y saca de adentro de la ropa un cordón de cuero. Lo que cuelga del cordón viene tibio: estuvo contra ella todos estos días.',
    'Es una lasca oscura del tamaño de una uña, montada en alambre de atar sacos por alguien que sabe hacer nudos y no sabe hacer joyas. Entra en la mella sin que haga falta probarlo.',
    'No te la ofrece. La sostiene con el puño cerrado contra el pecho y espera a que hables vos.',
  ],
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
            text: [
              'Se lo pedís una vez y no dos. Se saca el cordón por la cabeza y te cierra los dedos encima.',
              {
                speaker: 'ilse',
                variants: [
                  {
                    text: '—Se le cayó esa noche y yo lo junté. Once días lo tuve acá y once días subió el agua. Llevalo vos, que yo ya lo llevé bastante.',
                  },
                ],
              },
            ],
            effects: [{ give: 'medallon_de_tome' }, { milestone: 'la_verdad_de_tome' }],
            next: 'a2_fuera_ilse',
          },
          partial: {
            text: [
              'Te lo da, pero antes te hace decir en voz alta para qué lo querés. Lo decís fuerte, y en un sótano redondo lo que se dice fuerte sale por la trampilla al caz.',
            ],
            effects: [
              { give: 'medallon_de_tome' },
              { milestone: 'la_verdad_de_tome' },
              { clock: 'sospecha', delta: 1 },
            ],
            next: 'a2_fuera_ilse',
          },
          failure: {
            text: [
              'Hablás de más y le nombrás la bolsa de plata. Se guarda el cordón y se para antes de que termines. —Vos viniste por eso. Está bien. Pero esto no se paga.',
            ],
            effects: [{ clear: 'run:ilse_confia' }],
            next: 'a2_fuera_ilse',
          },
        },
      },
    },
    {
      id: 'rezar_por_tome',
      label: 'Rezar por Tomé con lo que te quede de voz',
      outcome: {
        text: [
          'No sabés el responso entero y decís el pedazo que te acordás, con las manos abiertas en el agua. Ilse no reza: espera y dice el nombre, que es otra manera.',
        ],
        effects: [{ set: 'char:vado.tome_enterrado' }],
        next: 'a2_fuera_ilse',
      },
    },
    {
      id: 'contarle_lo_del_vado',
      label: 'Contarle cómo encontraste a Tomé en el vado',
      outcome: {
        text: [
          'Le contás cómo estaba: la ropa, la postura, el sitio entre el sauce y la grava. No llora y no te para. Cuando terminás, pregunta por las manos.',
        ],
        next: 'a2_fuera_ilse',
      },
    },
    {
      id: 'subir_con_ella',
      label: 'Subir con ella antes de que aclare',
      outcome: {
        text: ['Suben los dos por la escalera. Ella va primera y no mira atrás para ver si la seguís.'],
        next: 'a2_fuera_refugio',
      },
    },
    {
      id: 'mostrarle_el_cuaderno',
      label: 'Mostrarle el cuaderno de su molinero',
      requires: { item: 'cuaderno_de_tome' },
      lockedHint: 'No tenés el cuaderno de Tomé encima.',
      outcome: {
        text: [
          'Le ponés el cuaderno en las rodillas, abierto en las últimas hojas. Lee sin tocar el papel. —Once días —dice—. Yo le llevé la cena cuatro.',
        ],
        effects: [{ set: 'run:ilse_confia' }],
        next: 'a2_fuera_ilse',
      },
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
  text: [
    'Tarda en empezar. Se agarra las rodillas y habla mirando el zócalo, no a vos. Cada vez que se calla, la pared curva le devuelve la última palabra una vez sola, y ella espera a que termine de volver.',
    {
      variants: [
        {
          when: { visited: 'a2_fuera_ilse', min: 1 },
          text: 'Vuelve a empezar por la noche once, con las mismas palabras. Esta vez te fijás en el pedazo que la primera vez te pasó de largo.',
        },
        {
          text: 'Lo que cuenta es de la noche once. Tomé bajó con un cincel y una vela a probar si la piedra era piedra de verdad. Alguien le sostuvo la escalera hasta que terminó.',
        },
      ],
    },
    {
      speaker: 'ilse',
      variants: [
        {
          text: '—Un dedo de agua por día desde esa noche. Once días son once dedos. —Se para y se sienta otra vez—. Yo sé contar y sé cuánto pesa un saco. Lo que no sé es cómo se para esto.',
        },
      ],
    },
  ],
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
            text: [
              'No la dejás cambiar de tema. Se lo preguntás tres veces con las mismas palabras, hasta que la cuarta le sale de una.',
              {
                speaker: 'ilse',
                variants: [
                  {
                    text: '—Yo. Yo se la sostuve. Yo le alcancé el cincel cuando se le cayó al agua y le dije que probara otra vez.',
                  },
                ],
              },
              'Después junta la tiza del piso y la acomoda en el escalón, aunque no haga falta.',
            ],
            effects: [{ clear: 'run:ilse_confia' }],
            next: 'a2_fuera_refugio',
          },
          partial: {
            text: [
              'Lo dice, y en cuanto lo dice se para. —Ya está. Ya lo tenés. —Sube la escalera de a dos escalones y la tapa queda abierta atrás de ella. Te quedás abajo con la gota y con la piedra.',
            ],
            effects: [{ clear: 'run:ilse_confia' }, { clear: 'run:con_ilse' }],
            next: 'a2_fuera_refugio',
          },
          failure: {
            text: [
              'Apretás donde no había que apretar y lo que sale no es el nombre. —¡Vos no estabas! ¡Vos llegaste once días tarde, mierda! —La pared curva le devuelve el grito y el grito sale por la trampilla. Afuera, en el caz, un remo para de golpe.',
            ],
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
      outcome: {
        text: [
          'Apenas se lo pedís, contesta. —Ya está dicho. —Se limpia las manos en el delantal—. Si no, mañana te ahogás solo y lo tengo que contar yo.',
        ],
        effects: [{ set: 'run:con_ilse' }],
        next: 'a2_fuera_refugio',
      },
    },
    {
      id: 'escucharla_hasta_el_final',
      label: 'Escucharla hasta que se le acabe',
      outcome: {
        text: [
          'No preguntás nada. Se le acaba sola, como se acaba una bolsa: primero de a puñados y después de golpe.',
          {
            speaker: 'ilse',
            variants: [
              {
                text: '—Le dije que no era piedra de acá. Él se rió y me dijo que la piedra que no se prueba no sirve. Después me dijo que no contara nada hasta saber qué era. No conté nada. Eso fue todo lo que hice.',
              },
            ],
          },
          'Cuando termina se queda sentada al lado tuyo, que es lo más cerca que estuvo de nadie en once días.',
        ],
        effects: [{ set: 'run:ilse_confia' }],
        next: 'a2_fuera_refugio',
      },
    },
    {
      id: 'dejarla_en_paz',
      label: 'Dejarla en paz y subir al molino',
      outcome: {
        text: [
          'Le dejás la tiza al lado y subís. A media escalera la oís acomodar cosas que ya estaban acomodadas.',
        ],
        next: 'a2_fuera_refugio',
      },
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
  text: [
    'Arriba, el molino está vacío de gente y lleno de todo lo demás. Te tirás entre las bolsas rotas, con la harina vieja metiéndose entre los dientes, que no se va con saliva.',
    'De día, con un río debajo, el sueño viene por pedazos. Igual algo que tenías abierto se cierra mientras dormís, y al despertar duele menos.',
    'Dos veces pasa una barca de la guardia por el caz. La segunda vez, el que rema levanta la cara y cuenta las ventanas de arriba.',
  ],
  choices: [
    {
      id: 'dormir_hasta_la_noche',
      label: 'Dormir hasta que caiga la tercera noche',
      outcome: {
        text: ['Te dejás dormir hasta que el hueco de la ventana se pone del color del plomo.'],
        next: 'c2_anochece',
      },
    },
    {
      id: 'bajar_otra_vez_al_sotano',
      label: 'Bajar otra vez al sótano mientras hay tiempo',
      outcome: { next: 'a2_fuera_sotano' },
    },
    {
      id: 'buscar_a_ilse_entre_las_bolsas',
      label: 'Buscar a Ilse entre las bolsas de harina',
      outcome: {
        text: [
          'La encontrás contando bolsas que nadie necesita contar. Cuando la mirás deja la cuenta por la mitad y baja otra vez, y vos atrás.',
        ],
        next: 'a2_fuera_ilse',
      },
    },
    {
      id: 'secarte_junto_al_horno',
      label: 'Secarte junto al horno del molino',
      outcome: {
        text: [
          'Hacés fuego chico adentro del horno, donde no se ve desde el agua, y te sentás pegado a la piedra hasta que la ropa deja de gotear. Se te va el temblor de las manos.',
        ],
        effects: [{ removeCondition: 'all' }],
        next: 'c2_anochece',
      },
    },
    {
      id: 'repasar_el_cuaderno',
      label: 'Repasar las últimas hojas del cuaderno',
      requires: { item: 'cuaderno_de_tome' },
      lockedHint: 'No tenés el cuaderno de Tomé encima.',
      outcome: {
        text: [
          'Las últimas hojas tienen una línea por página y la letra se le va cayendo hacia el margen. La del noveno día dice: «Dos dedos hoy. No baja. Carajo, Tomé, qué hiciste». Bajás con el cuaderno en la mano.',
        ],
        next: 'a2_fuera_ilse',
      },
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
  text: [
    'Toda la plaza está afuera con la lluvia encima. Clavan tablas en las ventanas bajas y suben a los carros lo que se puede subir. El bando del poste se despegó de una punta y golpea la madera toda la noche.',
    'El que vuelve del vado lo dice sin que le pregunten: el agua tapa cuatro de las siete piedras. Anoche se veían seis.',
    'Del otro lado del agua, el molino tiene las dos ventanas encendidas. Contra la isla hay amarrada una barca que no es la de Tomé.',
  ],
  choices: [
    {
      id: 'buscar_una_cuerda',
      label: 'Buscar una cuerda de sirga en el molino',
      outcome: {
        text: [
          'En el embarcadero de este lado, donde Tomé dejaba la barca, hay una sirga de tres brazas, dura de brea. La enrollás al hombro.',
        ],
        effects: [{ give: 'cuerda_de_molinero' }],
        next: 'c2_orilla',
      },
    },
    {
      id: 'mirar_cuantas_piedras_quedan',
      label: 'Mirar cuántas piedras del vado quedan',
      outcome: {
        text: [
          'Bajás hasta donde se ve el vado y contás vos mismo, para no creerle a nadie. Cuatro tapadas. Mientras contás se va la quinta.',
        ],
        next: 'c2_orilla',
      },
    },
    {
      id: 'escuchar_a_la_gente',
      label: 'Escuchar lo que grita la gente en la plaza',
      outcome: {
        text: [
          'Nadie habla del molinero. Hablan de la vega, de la siembra que ya está bajo el agua y del turno del pozo si la plaza se inunda.',
        ],
        next: 'c2_orilla',
      },
    },
    {
      id: 'cerrar_los_postigos',
      label: 'Cerrar los postigos con los vecinos',
      outcome: {
        text: [
          'Aguantás el postigo contra el viento mientras un viejo clava. No te pregunta el nombre. Al terminar te da medio pan y se mete adentro.',
        ],
        next: 'c2_orilla',
      },
    },
    {
      id: 'salir_ya_hacia_la_orilla',
      label: 'Salir ya mismo hacia la orilla',
      outcome: {
        text: [
          'No esperás a que se acomode nada. Salís por el camino de abajo, con la lluvia de costado y el barro hasta el tobillo.',
        ],
        next: 'c2_orilla',
      },
    },
    {
      id: 'avisarle_a_orell',
      label: 'Avisarle a Orell que vas a cruzar',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell todavía no te debe nada.',
      outcome: {
        text: [
          'Lo encontrás bajo el alero, contando hombres. —Hoy no cruza nadie —dice, y se queda callado lo que dura un relevo—. Si vas igual, andá por la orilla de abajo.',
        ],
        next: 'c2_orilla',
      },
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
  text: [
    'Desde el banco de grava ya no se oye el vado. Con el agua baja, la piedra le corta el ruido y el vado suena corto; esta noche suena hueco y parejo, y el ruido de la piedra no está. El sauce partido tiene el tronco muerto adentro del agua hasta la mitad.',
    'Anteanoche dos carreteros quisieron pasar con la mula. A la mula la sacaron media legua abajo, contra el azud. A ellos los sacaron al otro día, y no los sacaron enteros.',
    {
      variants: [
        {
          when: { knows: 'vado_oculto' },
          text: 'Contás por dentro, que es como se cuenta ahora. La cuarta, la del borde redondo, está donde siempre y ya no sirve de nada.',
        },
        {
          text: 'Contás lo que se ve: tres piedras, y las tres con el agua encima haciendo espuma. De las otras cuatro no hay manera de saber dónde están.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'bajar_al_vado',
      label: 'Bajar al vado',
      outcome: {
        text: [
          'Bajás por la grava hasta donde el banco se termina. El agua te llega a la rodilla antes de que hayas entrado en el vado.',
        ],
        next: 'c2_vado_crecido',
      },
    },
    {
      // FASE H · tarea 2. Era una inconsistencia, no una excepción: las otras dos maneras de evitar
      // el vado ya cuestan —esperar paga +1 de `sospecha`, el azud paga una Herida— y esta era la
      // única gratis, siendo la menos discreta de las tres: el texto ya decía que del molino salió
      // gente a mirar. Ahora paga el tic, con el sujeto que mira nombrado, y el `label` lo anuncia.
      id: 'remar_en_la_barca_de_tome',
      label: 'Remar hasta la isla, a la vista del molino',
      outcome: {
        text: [
          'La barca de Tomé está dada vuelta entre los juncos y hay que achicarla con el sombrero. Remás contra la corriente y llegás al pie de la isla mucho después de lo que pensabas. Del molino ya salió gente a mirar: uno se queda mirándote hasta la grava y después entra a decirlo.',
        ],
        effects: [{ set: 'run:dravos_sabe' }, { clock: 'sospecha', delta: 1 }],
        next: 'c2_otra_orilla',
      },
    },
    {
      id: 'esperar_a_que_el_agua_baje',
      label: 'Esperar a que el agua baje un dedo',
      outcome: {
        text: [
          'Te sentás en la grava a esperar el dedo que no va a bajar. Baja igual, tarde y poco. Para entonces en la ventana del molino hay tres sombras y no dos: alguien cruzó a avisar que en el sauce hay un hombre sentado.',
        ],
        effects: [{ set: 'run:dravos_sabe' }, { clock: 'sospecha', delta: 1 }],
        next: 'c2_otra_orilla',
      },
    },
    {
      id: 'subir_por_el_azud',
      label: 'Subir por el azud y pasar por arriba',
      outcome: {
        text: [
          'El azud es un muro de un palmo de ancho con el agua pasándole por encima. Vas de costado, de cara a la corriente. En la tercera compuerta el pie encuentra madera podrida y la rodilla da contra el canto. Cruzás rengueando, y del otro lado te esperan despiertos.',
        ],
        effects: [{ set: 'run:dravos_sabe' }, { wound: 1 }],
        next: 'c2_otra_orilla',
      },
    },
    {
      id: 'cruzar_con_orell',
      label: 'Cruzar con Orell y su farol',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no va a cruzar el vado por vos.',
      outcome: {
        text: [
          'Baja con el farol tapado con la capa y no dice de dónde lo sacó. Va adelante, tanteando el azud con el asta de la lanza. —Pisá donde piso. —Pasan los dos y no se cruzan con nadie.',
        ],
        next: 'c2_otra_orilla',
      },
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
  text: [
    'Estás metido hasta la mitad del muslo y todavía no empezó el vado. El agua no viene fría: viene pesada, y te corre la rodilla para el costado antes de que vos decidas nada.',
    'De la rama muerta del sauce cuelga la cadena vieja del azud, tirante. De acá a la isla hay veinte pasos de espuma marrón y, abajo, las siete piedras. No se ve ninguna.',
    'De frente, en el medio, el agua llega al pecho y el fondo es grava suelta. Por las piedras hay que ir a ciegas, con el limo encima. La cadena aguanta un bulto atado y no aguanta a un hombre.',
    {
      variants: [
        {
          when: { endingSeen: 'fin_hundido' },
          text: 'La otra vez el agua bajó cuando la piedra volvió a su hueco. De este lado del río no hay ningún hueco.',
        },
        {
          text: 'Lo que el río se lleva esta noche baja hasta el azud, se queda un rato contra la cadena y después sigue para abajo.',
        },
      ],
    },
  ],
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
          success: {
            text: [
              'Entrás en ángulo y dejás que el río te empuje hacia donde querés llegar. El fondo se te va dos veces y las dos lo recuperás con el otro pie. Salís de pie en la grava de la isla.',
            ],
            next: 'c2_otra_orilla',
          },
          partial: {
            text: [
              'Cruzás, y el río te cobra el paso: en el medio te da vuelta y te suelta contra la punta de la isla.',
              {
                variants: [
                  {
                    when: { item: 'carta_lacrada' },
                    text: 'Cuando te ponés de pie, el trapo encerado está abierto y el lacre de Berta se deshizo en tinta.',
                  },
                  { text: 'Cuando te ponés de pie te falta la capa, enganchada en algo que no llegaste a ver.' },
                ],
              },
            ],
            effects: [{ addCondition: 'empapado' }, { take: 'carta_lacrada' }],
            next: 'c2_otra_orilla',
          },
          failure: {
            text: [
              'En el medio, el pie de apoyo encuentra grava y la grava se mueve entera. El agua te entra por la nariz y por las mangas al mismo tiempo, y el ruido del río se te pone adentro de la cabeza. La cadena del azud te para de costado.',
            ],
            effects: [{ lethal: true }, { addCondition: 'empapado' }],
            next: 'c2_otra_orilla',
          },
          fumble: {
            text: [
              'Cuatro pasos adentro el fondo se termina de golpe y no hay dónde. El río te lleva boca arriba, sin sacudirte, y la ropa se te llena por el cuello. Cuando volvés a tocar piedra, el azud quedó atrás.',
            ],
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
          success: {
            text: [
              'Tanteás con el pie antes de cargar el peso, una por una, contando. La cuarta está donde siempre y se hunde un palmo, como siempre. Llegás a la isla sin haber levantado los pies del fondo.',
            ],
            next: 'c2_otra_orilla',
          },
          partial: {
            text: [
              'Llegás. En la quinta el limo te gana el pie de adelante y hacés el resto a brazadas cortas, agarrándote de lo que no ves. Salís escupiendo río.',
            ],
            effects: [{ addCondition: 'empapado' }],
            next: 'c2_otra_orilla',
          },
          failure: {
            text: [
              'Encontrás la cuarta piedra con la espinilla en vez de con el pie. Caés para adelante y el río te toma antes de que el agua te tape: te lleva de lado, de piedra en piedra. Después deja de haber piedras.',
            ],
            effects: [{ lethal: true }, { addCondition: 'empapado' }],
            next: 'c2_otra_orilla',
          },
        },
      },
    },
    // Burnt Bridge, sin tirada: se entrega la piedra y con ella el bando.
    //
    // FASE H · tarea 2, segunda vuelta. Era la manera de cruzar el tramo más peligroso de la campaña
    // sin pagar nada físico: el que llega sin la piedra entregaba un bulto vacío y lo pasaban gratis.
    // Ahora se cobra lo que la escena ya narraba: te suben ellos, dicen tu nombre porque ya lo
    // tienen, y los dos hombres que te suben no te sueltan. `perseguido` es exactamente eso.
    // NO cobra `sospecha` (el reloj ya llegó lejos) y NO puede matar: sigue siendo una de las tres
    // salidas seguras que pide biblia §11, y su prosa no usa una sola palabra de muerte.
    {
      id: 'entregar_lo_que_llevas',
      label: 'Entregar lo que llevás y cruzar bajo custodia',
      outcome: {
        text: [
          'Desde la isla te alumbran con un farol tapado y dicen tu nombre, que ya lo tienen. Atás el bulto a la cadena y del otro extremo tiran. Después bajan dos hombres con botas hasta la ingle y te suben en vilo, con el cuidado de quien sube una mercadería que no se puede mojar. Nadie pregunta nada: ya está pago. En la grava, los dos hombres no vuelven a la barca: se quedan uno a cada lado tuyo.',
        ],
        effects: [
          { take: 'sello_del_vado' },
          { set: 'run:trato_con_halvar' },
          { set: 'run:dravos_sabe' },
          { addCondition: 'perseguido' },
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
            text: [
              'Vas hasta la rama muerta con el agua en la cintura y atás lo que llevás a un eslabón, donde la espuma no deja ver.',
              {
                variants: [
                  {
                    when: { item: 'sello_del_vado' },
                    text: 'La piedra tira para abajo hasta que la cadena la frena. Después cruzás liviano y por donde te convenga.',
                  },
                  {
                    text: 'Adentro del bulto va un canto rodado, para que pese y para que el sitio quede marcado. Después cruzás liviano y por donde te convenga.',
                  },
                ],
              },
            ],
            effects: [{ set: 'run:sello_escondido' }, { set: 'run:dravos_sabe' }],
            next: 'c2_otra_orilla',
          },
          partial: {
            text: [
              'El nudo te sale recién a la tercera, con las manos dormidas, y para entonces estás adentro hasta el cuello. Queda bien atado. Salís por donde entraste, chorreando.',
            ],
            effects: [
              { set: 'run:sello_escondido' },
              { set: 'run:dravos_sabe' },
              { addCondition: 'empapado' },
            ],
            next: 'c2_otra_orilla',
          },
          failure: {
            text: [
              'Atás bien, pero tardás. Cuando levantás la cabeza hay un farol quieto en la orilla de la isla y un hombre mirando justo el sitio donde metiste las manos.',
            ],
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
      outcome: {
        text: [
          'Te quedás en la grava, con el agua en los tobillos, y aguantás. Baja con una soga al hombro, la ata al sauce y se ata él. Te pasa la punta por la cintura. —De a uno. Yo primero. —Del otro lado la soga queda puesta por si hay que volver.',
        ],
        next: 'c2_otra_orilla',
      },
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
  text: [
    'Salís del agua en la grava de la isla y el suelo te sigue moviendo un rato. El molino está a veinte pasos, con las dos ventanas encendidas y la puerta grande cerrada por dentro.',
    'El caz se desbordó y la isla es medio barro. Cada paso en el tablón del embarcadero devuelve agua por las juntas y te entra en la bota por arriba. La cadena del azud sale del agua a un paso y se pierde río abajo.',
    {
      speaker: 'orell',
      variants: [
        {
          when: { flag: 'run:orell_confia' },
          text: '—Llegaste. —Baja el farol para no darte en la cara—. Me falta un relevo. Usalo. Y salí por donde entraste.',
        },
        {
          text: '—Te vi cruzar. —No levanta la ballesta—. Me falta un relevo para tener que informar. Entrá por el caz y no por la puerta.',
        },
      ],
    },
  ],
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
            text: [
              'Tirás de la cadena eslabón por eslabón, sentado, con los talones contra el tablón. El bulto viene entero y chorreando. Lo desatás con los dientes.',
            ],
            effects: [{ give: 'sello_del_vado' }, { clear: 'run:sello_escondido' }],
            next: 'cl_molino',
          },
          partial: {
            text: [
              'La cadena viene, se traba a mitad de camino y vuelve de golpe. El eslabón te agarra dos dedos contra el canto. Soltás sin gritar. El bulto quedó de este lado.',
            ],
            effects: [
              { give: 'sello_del_vado' },
              { clear: 'run:sello_escondido' },
              { wound: 1 },
            ],
            next: 'cl_molino',
          },
          failure: {
            text: [
              'Sube una braza y se planta. Tirás hasta que algo se corta arriba, en el azud, y lo que viene después es cadena sola. Lo que ataste se queda en el agua.',
            ],
            next: 'cl_molino',
          },
        },
      },
    },
    // Burnt Bridge, sin tirada: la piedra se queda en el agua y los cuatro epílogos lo dicen.
    //
    // FASE H · tarea 2, segunda vuelta. Era la otra manera de salir del cuello 2 sin pagar nada:
    // esquivaba la tirada de `levantar_la_cadena` —que puede costar una Herida— y no cobraba nada a
    // cambio. La cadena sale del agua a un paso de la punta del tablón, en una crecida y de noche:
    // el precio es meterse, y las dos variantes lo dicen ahora. Condición y no reloj, a propósito.
    {
      id: 'dejar_el_sello_en_la_cadena',
      label: 'Meterte al agua, dejar el sello y no volver',
      outcome: {
        text: [
          {
            variants: [
              {
                when: { item: 'sello_del_vado' },
                text: 'Entrás hasta la cintura, sacás la piedra del trapo, la atás a un eslabón y la dejás bajar hasta que la cadena la frena.',
              },
              {
                text: 'Vas hasta la punta del tablón con el agua encima y no la tocás. Lo que esté ahí abajo está mejor abajo que en la mesa.',
              },
            ],
          },
          'Volvés con las manos vacías y chorreando. Ninguno de los que entren esta noche va a saber dónde mirar.',
        ],
        effects: [
          { take: 'sello_del_vado' },
          { set: 'run:sello_escondido' },
          { addCondition: 'empapado' },
        ],
        next: 'cl_molino',
      },
    },
    {
      id: 'subir_al_molino_de_una',
      label: 'Subir al molino de una',
      outcome: {
        text: [
          'Vas derecho por el barro, sin agacharte y sin bajar el paso. La puerta grande está cerrada, pero el postigo del caz nunca cerró bien.',
        ],
        next: 'cl_molino',
      },
    },
    {
      id: 'esperar_a_que_pase_la_ronda',
      label: 'Esperar junto al horno a que pase la ronda',
      outcome: {
        text: [
          'Te metés en el horno viejo, con la espalda contra la piedra tibia, hasta que la ropa deja de pesar. La ronda pasa dos veces. La segunda, uno se para donde estabas vos y le mira las huellas al barro.',
        ],
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
