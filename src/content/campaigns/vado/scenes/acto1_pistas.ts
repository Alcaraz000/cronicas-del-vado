import type { Scene } from '@/content/schema';

/**
 * Acto 1 — las dos puertas de pista que no son la taberna: **la casa de la alcaldesa**
 * (`a1_alcaldesa`, `a1_berta_despacho`, `a1_ilse_patio`) y **el molino de Tomé**
 * (`a1_molino`, `a1_molino_pell`, `a1_molino_trampilla`, `a1_molino_rueda`).
 *
 * PROSA (Fase D). Entró texto y **nada más que texto**: no se tocó ni una `choice`, ni un `label`,
 * ni un `requires`, ni un `lockedHint`, ni un `roll`, ni un `effects`, ni un `next`, ni un
 * `onEnter`, ni un `npcs`, ni un `place`. Lo que era `['TODO']` es ahora el `text` de la escena y
 * los `outcome.text` que estaban omitidos están escritos.
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
 *
 * ── LA MATRIZ 3×3 (biblia §9.2), escrita en las dos puertas de este archivo ──────────────────
 * La posición se lee con **los otros dos** `run:pista_*`, nunca con `visited`, porque el `onEnter`
 * de la propia escena ya encendió el suyo antes del render:
 *   `a1_alcaldesa` lee `run:pista_taberna` + `run:pista_molino`;
 *   `a1_molino`    lee `run:pista_taberna` + `run:pista_alcaldesa`.
 * Orden de las variantes, de la más específica a la base: `all` (última pista) → `any` (segunda) →
 * sin `when` (primera). En las dos, la celda «última» dice **sin metáfora** que ya no queda noche.
 *
 * ── DEUDA DE PROSA SALDADA ───────────────────────────────────────────────────────────────────
 * · Cuota de memoria (biblia §9.1): `a1_alcaldesa` y `a1_molino` llevan su variante
 *   `{ visited: …, min: 1 }`, las dos en **párrafo de narrador** y las dos **más cortas que la
 *   base** (21/31 y 19/33). Ninguna de las dos vive en el párrafo que tiene el detalle sensorial.
 * · Debut de Ilse: `a1_alcaldesa` lleva el párrafo de narrador con variante `{ met: 'ilse' }`
 *   (biblia §9.1, "Ilse en `a1_alcaldesa` y `a2_fuera_fuga`"). Variante 25 / base 33.
 * · Pasada de voz a mano (§5/r08c): **Ilse vive en `world/`, así que r08 no frenaría una memoria en
 *   su boca**. Se revisó escena por escena: los dos párrafos con `speaker: 'ilse'` de este archivo
 *   (`a1_ilse_patio`) no leen `met`, `knows`, `endingSeen` ni `char:*`. Los de `speaker: 'berta'`
 *   y `speaker: 'pell'` varían solo por `run:pista_*`, que es estado de esta partida y es legal.
 * · `[Recuerdo]` mudo: ninguno. `a1_ilse_patio.preguntarle_por_el_sello` es el camino C a
 *   `char:vado.sabe_del_sello` (biblia §9.4) y **escribe información**: Ilse dice qué hace la
 *   piedra. El recuerdo se cuenta como memoria del cuerpo ("te salen solas"), no como consulta.
 *
 * Detalles sensoriales (uno por escena, ninguno visual, ninguno repetido, ninguno en párrafo con
 * variante de memoria):
 *   `a1_alcaldesa`        olfato/gusto — cera de abeja y papel seco (firma de `casa_de_berta`, 1.er uso)
 *   `a1_berta_despacho`   oído — la pluma raspa y se para en cada cifra
 *   `a1_ilse_patio`       tacto/peso — el asa de soga deja una marca caliente en la palma
 *   `a1_molino`           oído/tacto — el caz golpeando bajo el piso de tablones, que sube por las
 *                         rodillas (firma de `molino_de_tome`, 1.er uso)
 *   `a1_molino_pell`      gusto — la harina vieja pegada al paladar al respirar por la boca
 *   `a1_molino_trampilla` olfato — por la juntura de la tapa sube aire a piedra mojada y hierro frío
 *   `a1_molino_rueda`     oído — el eje se queja una vez por vuelta, siempre en el mismo punto
 * NO se gastó «olor a río» (quemable de biblia §2.2): la celda «molino último» la esquiva con el
 * aire frío subiendo por el hueco, y queda libre para el cuello 2.
 *
 * Arranques (tres primeras palabras del texto base): `a1_alcaldesa` "Adentro hace un" ·
 * `a1_berta_despacho` "Cuatro mapas del" · `a1_ilse_patio` "Ilse ya cargó" · `a1_molino` "Bajo el
 * piso" · `a1_molino_pell` "Se saca el" · `a1_molino_trampilla` "Una tapa de" · `a1_molino_rueda`
 * "Afuera, del lado". Las siete primeras palabras son distintas entre sí, ninguna está quemada por
 * §2.7 y ninguna coincide con la de una escena a la que esta apunta (las siete se apuntan entre
 * ellas; queda por chequear contra `a1_plaza`, que la escribe otro lote).
 *
 * Cupos gastados por este lote: `usted` ×4 (2 de Pell en `a1_molino`, 2 en `a1_molino_pell`; total
 * de campaña 6 de 8 con las 2 del prólogo). Puteadas 0. Adverbios en -mente 0. `muy` 0.
 * `de repente`/`de pronto` 0. `parece que` 0. `como si fuera` 0. `una mezcla de X y Y` 0.
 * Oración sin verbo: una en `a1_alcaldesa`, una en `a1_molino_trampilla`, ninguna al final de un
 * párrafo; las otras cinco escenas, 0. Remate del narrador: como mucho uno por escena.
 *
 * ── ANOTADO Y NO TOCADO (cuatro cosas de estructura que la prosa tuvo que rodear) ─────────────
 * (a) `a1_molino` declara `npcs: ['pell']` en toda ruta, pero la celda «molino último» de la
 *     matriz dice que Pell ya se fue, y `hablar_con_el_chico` desaparece justo ahí. La prosa lo
 *     resuelve sin tocar nada: **Pell nunca tiene `speaker` en `a1_molino`** (lo reporta el
 *     narrador entre comillas, como en `p_puente`) y en las celdas «segundo» y «último» está
 *     afuera, en la ronda del caz — que es lo que hace jugable la banda de fallo de
 *     `mirar_por_la_ventana`, la que enciende `run:pell_delato` también cuando él "ya se fue".
 *     Efecto lateral que sigue en pie: declararlo deriva `char:met.pell` con solo entrar al
 *     molino, así que el atajo `[Recuerdo]` de `a1_plaza` se abre sin haberlo conocido de frente.
 * (b) La celda «alcaldesa última» de la biblia §9.2 tiene que encender `run:berta_miente`, y en el
 *     esqueleto **ninguna opción de `a1_alcaldesa` lo enciende**: el único `set` del flag en este
 *     archivo está en `a1_berta_despacho.revisar_el_escritorio`. La prosa escribe la mentira (capa
 *     puesta, «no salgo: estaba entrando») para que se vea, pero el flag no se enciende ahí.
 * (c) `a1_molino_trampilla.onEnter` consume la palanca antes del render, así que el texto de la
 *     escena no puede condicionarse por tenerla. Está escrito para leerse igual con palanca y sin
 *     ella: la tapa "no se queda abierta sola: la calzás".
 * (d) Presupuesto. La suma de los objetivos de la **biblia §2.3** (texto de tabla + 35 por banda de
 *     tirada + 28 por outcome con texto + variantes) da más que la celda `pal` del outline §2 en
 *     cinco de las siete: `a1_berta_despacho` 317/261 · `a1_ilse_patio` 345/261 · `a1_molino_pell`
 *     385/301 · `a1_molino_trampilla` 380/296 · `a1_molino_rueda` 287/203. Es la misma causa que
 *     anotó el lote 1: la tabla presupuesta pocas palabras de `outcome.text` para escenas que
 *     tienen cinco o seis opciones, y §2.5 obliga a pagarlas con texto. Este lote aterriza en los
 *     objetivos de la biblia, no en las celdas del outline. **Hay que subir esas cinco celdas.**
 *
 * MEDIDO, escena por escena (palabras de prosa, sin `label` ni `lockedHint`):
 *   `a1_alcaldesa` 593/588 · `a1_berta_despacho` 397/261 · `a1_ilse_patio` 407/261 ·
 *   `a1_molino` 541/496 · `a1_molino_pell` 479/301 · `a1_molino_trampilla` 462/296 ·
 *   `a1_molino_rueda` 330/203. **Total 3.209 contra las 2.406 del outline §2 (+33 %).** Contra los
 *   objetivos de la biblia §2.3 (2.761) es +17 %. La única escena que cierra clavada es la del piso
 *   dramático, que es justamente la que el outline presupuestó con la regla correcta.
 *
 * Ritmo, medido contra la calibración del prólogo (media 12,1 · máximo 30 · toda oración de más de
 * 22 con dos puntos): media por escena 11,6-13,7 · máximo 30 · ninguna oración de más de 22 sin
 * dos puntos · oraciones de 8 palabras o menos, 16-34 % según la escena.
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
  text: [
    {
      variants: [
        {
          when: { visited: 'a1_alcaldesa', min: 1 },
          text: 'Volvés a entrar y ya nadie te abre: la puerta quedó entornada. Berta no levanta la cabeza hasta que te sentás.',
        },
        {
          text: 'Adentro hace un calor de leña seca que no se parece a nada de lo de afuera. Berta te hace pasar sin preguntarte el nombre. Te señala el banco largo del fuego.',
        },
      ],
    },
    'Las paredes están tapadas de mapas del río, clavados uno encima del otro. Huele a cera de abeja y a papel seco, y el calor te afloja los dedos antes de que te des cuenta.',
    {
      variants: [
        {
          when: { all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_molino' }] },
          text: 'Berta tiene la capa puesta y los guantes en la mano, parada del lado de adentro de la puerta. Y ya no queda noche: lo que falta no alcanza para golpear otra puerta.',
        },
        {
          when: { any: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_molino' }] },
          text: 'Te recibe de pie y no te ofrece asiento. En el zaguán, Ilse entra y sale con sacos y deja la puerta del patio abierta cada vez.',
        },
        {
          text: 'La mesa está puesta para dos y hay una jarra tapada con un paño. Berta espera a que te saques el agua de encima. Te sirve ella misma, y se sirve después.',
        },
      ],
    },
    {
      speaker: 'berta',
      variants: [
        {
          when: { all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_molino' }] },
          text: '—Mirá, no salgo: estaba entrando. Son once días, son sesenta y cuatro casas que comen de esa rueda y hay una bolsa apartada desde el primero. Traelo, o traeme la certeza, y bueno.',
        },
        {
          when: { any: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_molino' }] },
          text: '—Mirá, voy a ser corta porque tengo el pueblo encima: once días sin humo en el molino y sesenta y cuatro casas que me preguntan a mí. Vos buscá, que yo pago, y bueno.',
        },
        {
          text: '—Mirá, la cosa es simple y la digo una sola vez. Hace once días que el molino no larga humo, y somos sesenta y cuatro casas que comemos de esa rueda. La bolsa está apartada desde el tercer día. Comé algo primero, que los números los arreglamos después.',
        },
      ],
    },
    {
      variants: [
        {
          when: { met: 'ilse' },
          text: 'A Ilse la conocés: la trenza cobre, el delantal de hombre atado dos veces. Cruza el zaguán con un saco al hombro y no te mira.',
        },
        {
          text: 'Detrás de Berta cruza el zaguán una chica de diecinueve o veinte con un saco al hombro. Trenza cobre, delantal de hombre atado dos veces, harina hasta los codos. Nadie la presenta y ella no saluda.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'preguntar_por_tome',
      label: 'Preguntarle a Berta por Tomé',
      outcome: {
        text: [
          'Le nombrás a Tomé y ella se para antes de que termines. Ahí no contesta. «Eso se habla sentado y con el libro delante», dice, y abre la puerta del fondo con el codo.',
        ],
        next: 'a1_berta_despacho',
      },
    },
    {
      id: 'reclamar_el_adelanto',
      label: 'Reclamar el adelanto que promete la carta',
      outcome: {
        text: [
          'Preguntás por la plata antes que por el muerto. A Berta no le molesta: cuenta en voz alta, por días, te adelanta la tercera parte sobre la mesa y recién entonces abre la puerta del fondo.',
        ],
        next: 'a1_berta_despacho',
      },
    },
    {
      id: 'ayudar_a_ilse_con_los_sacos',
      label: 'Ayudar a Ilse con los sacos del zaguán',
      outcome: {
        text: [
          'Le sacás un saco del hombro sin pedir permiso. Ella te lo deja, mide el peso que te queda en las manos y decide algo sobre vos que no dice. Salís atrás de ella.',
        ],
        next: 'a1_ilse_patio',
      },
    },
    {
      id: 'salir_al_patio',
      label: 'Salir al patio detrás de Ilse',
      outcome: {
        text: [
          'Berta sigue hablando cuando vos ya estás mirando el zaguán. Te levantás en mitad de una cifra y salís al patio, donde el ruido del pueblo se termina.',
        ],
        next: 'a1_ilse_patio',
      },
    },
    {
      id: 'despedirte_hasta_manana',
      label: 'Despedirte y volver a la plaza',
      outcome: {
        text: [
          'Le decís que volvés mañana y ella te da la mano como se cierra un contrato. En el umbral, el frío de afuera te encuentra la ropa antes que la cara.',
        ],
        next: 'a1_plaza',
      },
    },
    // [Clérigo] — sabor y atajo, nunca llave: Ilse te habla aunque esta no sea la segunda pista.
    {
      id: 'bendecir_la_casa',
      label: 'Bendecir la casa antes de sentarte',
      requires: { class: 'clerigo' },
      lockedHint: 'No es tu oficio bendecir casas ajenas',
      outcome: {
        text: [
          'Decís la fórmula corta, la de las casas con gente adentro, y tocás el marco con dos dedos. Berta se queda quieta por educación. Ilse no: deja el saco en el piso y te espera en el zaguán.',
        ],
        next: 'a1_ilse_patio',
      },
    },
    // [Origen] `huerfano_de_la_peste` (biblia §9.5).
    {
      id: 'mirar_la_casa_antes_de_entrar',
      label: 'Mirar la casa antes de cruzar el umbral',
      requires: { trait: 'huerfano_de_la_peste' },
      lockedHint: 'Entrás sin mirar, como todo el mundo',
      outcome: {
        text: [
          'Mirás la casa como se miraban cuando te tocó a vos: los postigos de arriba clavados hace poco, el arcón con candado nuevo, un plato secándose para seis sillas. Acá se cocina para menos gente de la que se sienta.',
        ],
        next: 'a1_berta_despacho',
      },
    },
  ],
} satisfies Scene;

export const a1_berta_despacho = {
  id: 'a1_berta_despacho',
  kind: 'normal',
  place: 'casa_de_berta',
  npcs: ['berta'],
  text: [
    'Cuatro mapas del río tapan la pared del fondo, clavados uno encima del otro. El de arriba es el más nuevo. Berta escribe mientras habla: la pluma raspa y se para en cada cifra.',
    {
      speaker: 'berta',
      variants: [
        {
          text: '—Mirá, yo llevo el libro de esta casa desde hace catorce años y no me falta un renglón. Tomé me debía dos moliendas y yo le debía la mitad de un techo: así funciona un pueblo de sesenta y cuatro casas. Vos preguntá, que yo mientras termino esto, y bueno.',
        },
      ],
    },
    'El escritorio está cargado: cartas apiladas por tamaño, un sello de lacre con el mango gastado, un cofre de roble con la llave puesta. No lo cubre. Tampoco te lo ofrece.',
  ],
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
            text: [
              'Leés al revés mientras ella da vuelta la hoja, que es como se lee un escritorio ajeno. Abajo de todo hay una carta con la misma letra y la misma cifra que la tuya. La fecha es de cuatro días antes y el nombre no es el tuyo.',
            ],
            effects: [{ set: 'run:berta_miente' }],
            next: 'a1_alcaldesa',
          },
          partial: {
            text: [
              'La carta la ves igual, y ella te ve verla: levanta la vista cuando ya tenés la mano estirada. No dice nada. Al rato entra un guardia a buscar el correo de la noche y ella le da dos cartas en vez de una.',
            ],
            effects: [{ set: 'run:berta_miente' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_alcaldesa',
          },
          failure: {
            text: [
              'Se te va el codo contra el cofre y la llave suena contra el roble. Berta tapa la hoja con el antebrazo, sin apuro, y te pregunta si no querés ver el patio. El guardia de la puerta te mira salir. Se toma su tiempo.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a1_ilse_patio',
          },
        },
      },
    },
    {
      id: 'preguntarle_por_la_carta',
      label: 'Preguntarle por la carta que te mandó',
      outcome: {
        text: [
          'Le mostrás el lacre y le preguntás por qué a vos. «Porque no sos de acá y porque cobrás», dice, sin levantar la pluma. «A un vecino no lo podés mandar a mirar el molino de otro vecino.»',
        ],
        next: 'a1_alcaldesa',
      },
    },
    {
      id: 'buscar_a_ilse_en_el_zaguan',
      label: 'Buscar a Ilse en el zaguán',
      outcome: {
        text: [
          'Dejás a Berta con la cifra a medias. Ilse está acomodando sacos contra la pared del zaguán y los acomoda igual aunque vos estés parado ahí.',
        ],
        next: 'a1_ilse_patio',
      },
    },
    {
      id: 'dejarla_terminar_y_escuchar',
      label: 'Dejarla terminar y escuchar hasta el final',
      outcome: {
        text: [
          'No preguntás nada y ella sigue. Habla del molino como se habla de un techo: cuánto aguanta, cuánto cuesta, cuántos inviernos le quedan. En veinte renglones no dice una sola vez el nombre de Tomé.',
        ],
        next: 'a1_alcaldesa',
      },
    },
    // Floodgate que LEE lo que se averigua en el Ancla Seca (`a1_orell_mesa` o el libro de Mausi).
    {
      id: 'nombrarle_al_mercader',
      label: 'Nombrarle al mercader del otro lado',
      requires: { flag: 'run:sabe_de_halvar' },
      lockedHint: 'Todavía no tenés ningún nombre que tirarle',
      outcome: {
        text: [
          'Decís el nombre del mercader del otro lado y la pluma sigue andando pareja: nadie escribe parejo cuando le nombran a alguien que no conoce. Termina la carta, la lacra y la deja del lado de la puerta, para que salga con el primero que pase.',
        ],
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
  text: [
    'Ilse ya cargó media carretilla y no espera a que le ofrezcas. Te pone un saco en los brazos. El asa de soga te deja una marca caliente en la palma antes de que llegues a la carretilla.',
    {
      speaker: 'ilse',
      variants: [
        {
          text: '—Cuarenta arrobas. Las bajo yo porque las subí yo. —Acomoda el saco con la rodilla—. Vos sos el de la carta. Mi madre escribe lindo.',
        },
      ],
    },
    'En la carretilla hay sacos, un farol apagado y algo más, tapado con una arpillera doblada en cuatro. Cuando te ve mirar no lo tapa mejor: sigue cargando.',
  ],
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
            text: [
              'Levantás la punta de la arpillera cuando se agacha por el saco siguiente. Debajo hay pan, una manta doblada y una vela entera. Nadie lleva eso a un molino donde no duerme nadie.',
            ],
            effects: [{ set: 'run:pista_molino' }],
            next: 'a1_molino',
          },
          partial: {
            text: [
              'La arpillera se te va de la mano y el farol rueda hasta el pie de Ilse. Ella lo levanta y no dice nada del pan ni de la manta. Del otro lado de la tapia alguien corre el postigo para ver qué se cayó, y lo deja corrido.',
            ],
            effects: [{ set: 'run:pista_molino' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_molino',
          },
          failure: {
            text: [
              'Te acercás un paso de más y ella mueve la carretilla medio giro, sin mirarte, como quien acomoda una carga. Lo que haya abajo queda del otro lado. Te manda para adentro con tres palabras.',
            ],
            next: 'a1_alcaldesa',
          },
        },
      },
    },
    // La fuente de `run:ilse_confia` del acto 1 (biblia §7.2: una por acto).
    {
      id: 'escucharla_sin_apurarla',
      label: 'Escucharla sin apurarla',
      outcome: {
        text: [
          'No preguntás y ella tampoco, y así están un rato, cargando. Después habla sola: los escalones del molino, que Tomé bajaba de a dos con un saco al hombro. Habla en pasado y se da cuenta a mitad de frase. Cambia de tema y agarra el saco siguiente.',
        ],
        effects: [{ set: 'run:ilse_confia' }],
        next: 'a1_alcaldesa',
      },
    },
    {
      id: 'acompanarla_hasta_el_molino',
      label: 'Acompañarla hasta el molino',
      outcome: {
        text: [
          'Agarrás una manija de la carretilla y ella agarra la otra sin discutir. Media legua abajo cruza el vado con el saco al hombro y no pisa la cuarta piedra.',
        ],
        effects: [{ set: 'run:con_ilse' }],
        next: 'a1_molino',
      },
    },
    {
      id: 'volver_a_la_plaza',
      label: 'Volver a la plaza por el callejón',
      outcome: {
        text: [
          'Le avisás que después seguís y ella no contesta. Cierra el portón del patio cuando todavía estás del lado de adentro del callejón.',
        ],
        next: 'a1_plaza',
      },
    },
    // Atajo [Recuerdo] 4 de la biblia §9.3: no ahorra camino, ESCRIBE información.
    // Es el camino C a `char:vado.sabe_del_sello` antes de elegir rama (biblia §9.4).
    {
      id: 'preguntarle_por_el_sello',
      label: 'Preguntarle por el sello sin rodeos',
      requires: { endingSeen: 'fin_crecida' },
      lockedHint: 'Todavía no sabés que hay algo que preguntar',
      outcome: {
        text: [
          'No preguntás por Tomé: preguntás por la piedra del sótano, con las palabras justas, y te salen solas. Ilse deja el saco en el piso, que es lo que hace ella en vez de sentarse. «Aguanta el río. Eso hace. Tomé decía que el vado se cruza porque alguien lo dejó cruzable.» No pregunta cómo lo sabés.',
        ],
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
        text: [
          'Le pedís la llave y se ríe con la boca cerrada. «No hay llave. Hay un candado que Tomé colgaba sin cerrar, por si alguien llegaba de noche.» Te dice por dónde se cruza y a qué hora baja el agua.',
        ],
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
  text: [
    'Bajo el piso de tablones el caz golpea. El golpe te sube por las rodillas cada vez que la rueda pasa. La muela está quieta. Hay harina vieja en las vigas y en la escalera del desván.',
    {
      variants: [
        {
          when: { visited: 'a1_molino', min: 1 },
          text: 'Volvés a entrar pisando tus propias huellas en la harina, que son las últimas que hay.',
        },
        {
          text: 'Contra la muela hay una barra de hierro de las de levantar la piedra. Del gancho de la pared cuelga un farol de sebo con el vidrio ahumado, y todavía tiene mecha.',
        },
      ],
    },
    {
      variants: [
        {
          when: { all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }] },
          text: 'La trampilla del piso está abierta de par en par y por el hueco sube aire frío. Adentro no queda nadie: el chico del casco se fue con la ronda. Y ya no queda noche para volver una segunda vez.',
        },
        {
          when: { any: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }] },
          text: 'El candado está forzado desde adentro. La rueda gira sin carga, que es lo que hace cuando nadie la traba. En la harina del piso hay dos juegos de huellas: unas chicas y unas grandes. Las grandes van y no vuelven.',
        },
        {
          text: 'El chico del casco grande está adentro, con la lanza apoyada en la muela y un bulto de arpillera a los pies. Te ve y levanta la lanza tarde. «La novena ordenanza dice que sin luz no se entra, así que usted…». Se corrige: «Que usted no puede, quiero decir». Ahí se queda.',
        },
      ],
    },
  ],
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
          success: {
            text: [
              'Sacás medio cuerpo por la ventana del caz y quedás colgado sobre el agua. Desde ahí se ve lo que desde adentro no: una tapa de roble en el piso, levantada un palmo, y una escalera que baja del otro lado de la pared.',
            ],
            next: 'a1_molino_trampilla',
          },
          partial: {
            text: [
              'Ves lo mismo, pero el marco cruje y el crujido sale afuera. Alcanzás a meterte antes de que llegue nadie. El chico del casco se para a escuchar y después sigue caminando más despacio.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a1_molino_trampilla',
          },
          failure: {
            text: [
              'El chico del casco te encuentra con medio cuerpo afuera. Te alumbra la cara y no dice una palabra: se va derecho, sin correr. Antes del relevo tu descripción sube a la torre.',
            ],
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
        text: [
          'Levantás la barra de la muela con las dos manos. Pesa como para abrir cualquier cosa de este molino, y como para cerrarla después.',
        ],
        effects: [{ give: 'palanca_de_molino' }],
        next: 'a1_molino_trampilla',
      },
    },
    {
      id: 'descolgar_el_farol',
      label: 'Descolgar el farol del gancho',
      outcome: {
        text: [
          'Descolgás el farol del gancho. La mecha prende a la tercera y el vidrio ahumado deja pasar un círculo de luz del tamaño de una mano.',
        ],
        effects: [{ give: 'farol_de_sebo' }],
        next: 'a1_molino_rueda',
      },
    },
    // La salida libre que reemplazó al viejo `redirect` de `a1_molino_pell` (outline §5/r03).
    {
      id: 'entrar_por_el_caz',
      label: 'Entrar por el caz, bajo el piso',
      outcome: {
        text: [
          'Salís por la ventana y entrás otra vez por abajo, pisando el borde del caz. El agua corre negra a un palmo de la bota.',
        ],
        next: 'a1_molino_trampilla',
      },
    },
    {
      id: 'volver_a_la_plaza',
      label: 'Volver a la plaza',
      outcome: {
        text: [
          'Dejás el molino como lo encontraste y cruzás de vuelta. Del lado de Aldamar, las ventanas encendidas se cuentan con una mano.',
        ],
        next: 'a1_plaza',
      },
    },
    // La celda "molino último" de la matriz 3×3: con las otras dos pistas encendidas, Pell ya se
    // fue y esta opción NO aparece (biblia §9.2). Es la única entrada a `a1_molino_pell`.
    {
      id: 'hablar_con_el_chico',
      label: 'Hablarle al chico del casco grande',
      requires: { not: { all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }] } },
      lockedHint: 'El molino ya está vacío: no hay nadie a quien hablarle',
      outcome: {
        text: [
          'Le hablás como se le habla a alguien que tiene un arma y no sabe para qué. El chico apoya la lanza contra la muela y se saca el casco. Con el casco en la mano tiene tres años menos.',
        ],
        next: 'a1_molino_pell',
      },
    },
    // [Explorador] — ves la trampilla sin tocar el candado (biblia §9.5).
    {
      id: 'subir_por_la_rueda',
      label: 'Subir por la rueda hasta el desván',
      requires: { class: 'explorador' },
      lockedHint: 'Esa rueda no la sube cualquiera',
      outcome: {
        text: [
          'Subís por los álabes de la rueda quieta hasta la viga del desván, y desde arriba el molino se lee entero. La tapa del piso tiene el herraje forzado, y no lo forzaron de este lado.',
        ],
        next: 'a1_molino_trampilla',
      },
    },
    // [Origen] `hijo_de_molinero` (biblia §9.5).
    {
      id: 'trabar_la_rueda_como_te_ensenaron',
      label: 'Trabar la rueda como te enseñaron de chico',
      requires: { trait: 'hijo_de_molinero' },
      lockedHint: 'Nadie te enseñó a parar una rueda de molino',
      outcome: {
        text: [
          'La compuerta del caz se baja con el pie y la aguja se traba con media vuelta: te lo enseñaron antes de que supieras leer. La rueda se para y el molino se queda sin ruido de golpe.',
        ],
        next: 'a1_molino_rueda',
      },
    },
  ],
} satisfies Scene;

export const a1_molino_pell = {
  id: 'a1_molino_pell',
  kind: 'normal',
  place: 'molino_de_tome',
  // Se entra solo por `a1_molino.hablar_con_el_chico`, así que Pell está en toda ruta que entra.
  npcs: ['pell'],
  text: [
    'Se saca el casco para contestarte y el casco le deja una marca roja que le cruza la frente. Tendrá diecisiete. Cuando respirás por la boca, la harina vieja se te pega al paladar y ahí se queda.',
    {
      speaker: 'pell',
      variants: [
        {
          text: '—Pell, me llamo. Digo: guardia Pell, de la milicia de Aldamar. —Se acomoda la lanza y no sabe dónde ponerla—. Usted no puede estar acá, pero la cuarta ordenanza dice que al que entra de noche hay que preguntarle primero. Así que usted dirá.',
        },
      ],
    },
    'El bulto de arpillera sigue a sus pies y no lo levanta. Está atado con soga de sirga, mide un antebrazo y tiene una punta oscura de mojada. Por el tejido asoma algo blanco, apelmazado.',
  ],
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
            text: [
              'No le pedís nada: le decís lo que vas a hacer y por qué, con el nombre de Berta adelante. Pell baja la lanza, va hasta la muela y vuelve con la barra de hierro.',
              {
                speaker: 'pell',
                variants: [{ text: '—La trampilla se abre con esto. Yo no la abrí nunca.' }],
              },
            ],
            effects: [{ set: 'run:pell_amigo' }, { give: 'palanca_de_molino' }],
            next: 'a1_molino_trampilla',
          },
          success: {
            text: [
              'Hablás despacio y no le preguntás nada que tenga que negar. El chico se corre dos pasos hacia la puerta y deja el paso libre sin decir que lo deja. «Yo a esta hora salgo a la ronda», dice, y sale.',
            ],
            effects: [{ set: 'run:pell_amigo' }],
            next: 'a1_molino_trampilla',
          },
          partial: {
            text: [
              'Le ganás la conversación y él se da cuenta de que se la ganaste. Se pone colorado hasta las orejas y contesta lo que no le preguntaste. Después sale al portón del caz a contarle al cabo lo que vio, porque eso sí lo sabe hacer.',
            ],
            effects: [{ set: 'run:pell_amigo' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_molino',
          },
          failure: {
            text: [
              'Lo apurás y el chico hace lo único que le enseñaron: grita el alto de la ordenanza, entero y con el número. Del otro lado del agua no contesta nadie. Antes del alba tu cara y el nombre del molino están en el parte del relevo.',
            ],
            effects: [{ set: 'run:pell_delato' }, { clock: 'sospecha', delta: 2 }],
            next: 'a1_molino_rueda',
          },
        },
      },
    },
    {
      id: 'preguntarle_por_el_bulto',
      label: 'Preguntarle qué lleva en la arpillera',
      outcome: {
        text: [
          'Le preguntás qué lleva y el chico se pone el bulto atrás de la pierna, que es la respuesta. «Eso es de la casa», dice. «Digo, de la casa del molino. Del molino.» Sale por el costado del caz con el bulto contra el pecho.',
        ],
        next: 'a1_molino_rueda',
      },
    },
    {
      id: 'dejarlo_ir_y_entrar_igual',
      label: 'Dejarlo ir y entrar igual',
      outcome: {
        text: [
          'Te corrés de la puerta y el chico sale casi corriendo. No mira atrás. Adentro queda el molino entero y la tapa del piso.',
        ],
        next: 'a1_molino_trampilla',
      },
    },
    {
      id: 'volver_al_cuerpo_del_molino',
      label: 'Volver al cuerpo del molino',
      outcome: {
        text: [
          'Le decís que seguís buscando adentro y él te dice que sí a todo, que es lo que hace con las órdenes. Se queda en la puerta, sin entrar y sin irse.',
        ],
        next: 'a1_molino',
      },
    },
    // Segunda fuente de `run:pell_amigo` (biblia §7.2). Gasta credibilidad, no la carta: el
    // `take` de la `carta_lacrada` está reservado a las cuatro maneras de biblia §5.
    {
      id: 'mentirle_con_la_carta',
      label: 'Mentirle mostrando el lacre de Berta',
      requires: { item: 'carta_lacrada' },
      lockedHint: 'Ya no tenés la carta lacrada',
      outcome: {
        text: [
          'Le mostrás el lacre y le decís que la alcaldesa te manda a abrir la trampilla. Pell lee el sello y no la carta: con el sello le alcanza. Se hace a un lado y te sostiene él la puerta del piso.',
        ],
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
        text: [
          'Se lo pedís y no dice que sí: va a buscar la barra de hierro y la trae. «La sexta ordenanza dice que hay que ayudar al que llega con encargo», dice. La sexta ordenanza se la acaba de inventar.',
        ],
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
  text: [
    'Una tapa de roble a ras del piso, con herraje y sin candado. Pesa lo que una puerta y no se queda abierta sola: la calzás. Por la juntura sube un aire que huele a piedra mojada y a hierro frío.',
    'Abajo hay una escalera, de las que se atan arriba, y ocho o nueve escalones hasta un piso de agua quieta. La madera está mojada hasta la mitad, y hasta la mitad nomás.',
    'En la cara de adentro de la tapa hay signos tallados en una banda. Unos están comidos por los años. Otros tienen el corte fresco, hecho con algo chico y sin pulso.',
  ],
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
            text: [
              'Bajás despacio, con el peso en los brazos, y no tocás el agua. Desde el último escalón seco se ve el cuarto entero: redondo, de piedra más vieja que el molino, con canales tallados en el suelo que van todos al mismo punto. En el punto hay una piedra encajada.',
            ],
            effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
            next: 'a1_molino_rueda',
          },
          partial: {
            text: [
              'Se te va el pie en el penúltimo escalón, que está podrido. Quedás colgado del travesaño con todo el peso en una muñeca. La piedra del medio la ves igual, encajada en su hueco, con los canales muriendo contra ella. Subís con la muñeca hinchada.',
            ],
            effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }, { wound: 1 }],
            next: 'a1_molino_rueda',
          },
          failure: {
            text: [
              'Vas bajando bien hasta que la escalera se corre un palmo. El agua de abajo te llega a la cintura y está más fría de lo que el molino deja pensar. Salís por donde entraste y la tapa se cierra sola atrás tuyo.',
            ],
            effects: [{ addCondition: 'empapado' }],
            next: 'a1_molino',
          },
          fumble: {
            text: [
              'La escalera no estaba atada arriba. Se va de costado con vos y el agua te recibe de espaldas: el golpe te lo da el borde de piedra del cuarto, en la cadera. Salís trepando por el marco, con una pierna que no quiere.',
            ],
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
        text: [
          'Pasás el pulgar por la banda de signos. No son letras de las que usás. Hay uno que vuelve siempre en el mismo lugar de la cuenta: uno de cada cinco. Los frescos están copiados encima de los viejos, torcidos, por alguien que copiaba sin entender.',
        ],
        effects: [{ set: 'run:vio_runas' }],
        next: 'a1_molino_rueda',
      },
    },
    {
      id: 'volver_al_cuerpo_del_molino',
      label: 'Volver al cuerpo del molino',
      outcome: {
        text: [
          'Dejás la tapa calzada y volvés sobre tus pasos. La harina del piso te devuelve el camino que hiciste, marcado hasta la puerta.',
        ],
        next: 'a1_molino',
      },
    },
    {
      id: 'salir_por_el_caz',
      label: 'Salir por el caz hasta la plaza',
      outcome: {
        text: [
          'Salís por abajo, por donde entra el agua, con la espalda contra el tablón. Del otro lado está la grava y media legua de orilla hasta el pueblo.',
        ],
        next: 'a1_plaza',
      },
    },
    // [Origen] `cazador_furtivo` (biblia §9.5): baja sin que la escalera cante, sin tirada.
    {
      id: 'bajar_sin_que_cante',
      label: 'Pisar donde la escalera no canta',
      requires: { trait: 'cazador_furtivo' },
      lockedHint: 'La escalera canta y vos no sabés dónde pisar',
      outcome: {
        text: [
          'Pisás contra los montantes, donde el escalón no trabaja, y la escalera no dice una palabra. Abajo, en el medio del cuarto, hay una piedra encajada en el suelo y los canales van todos a ella.',
        ],
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
        text: [
          'Ahora sabés qué estás mirando: la banda de la tapa sigue abajo, en el zócalo del cuarto, y termina en un hueco del tamaño de una hogaza. El hueco no está vacío. Hay piedra adentro, y le falta una esquina.',
        ],
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
  text: [
    'Afuera, del lado del caz, la rueda gira vacía y sin que nadie la pare. El eje se queja una vez por vuelta, siempre en el mismo punto. Entre queja y queja se escucha el agua entrar en los álabes.',
    'El agua viene del azud por un canal de tablones y sale por debajo del molino. Entre dos álabes hay algo trabado que sube con la rueda y vuelve a bajar.',
  ],
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
            text: [
              'Metés un madero entre los rayos y lo dejás morder contra el poste. La rueda se para con un tirón que te sube por los brazos. Lo que estaba trabado queda arriba, al alcance: un delantal de molinero, de lona, blanco de harina vieja, con el nudo del cuello todavía hecho.',
            ],
            effects: [{ set: 'run:cuerpo_hallado' }],
            next: 'a1_molino_trampilla',
          },
          partial: {
            text: [
              'Se te escapa el madero cuando la rueda toma el tirón y el mango te pega en el mismo lugar dos veces. La rueda igual se traba. De un álabe cuelga un delantal de molinero, de lona, con el nudo del cuello hecho. El brazo te queda duro hasta el codo.',
            ],
            effects: [{ set: 'run:cuerpo_hallado' }, { wound: 1 }],
            next: 'a1_molino_trampilla',
          },
          failure: {
            text: [
              'La rueda te gana. El madero salta, te lleva medio paso al canal y terminás sentado en el caz, con el agua al pecho y corriendo. Salís del otro lado. La rueda sigue dando vueltas con lo suyo adentro.',
            ],
            effects: [{ addCondition: 'empapado' }],
            next: 'a1_molino',
          },
        },
      },
    },
    {
      id: 'seguir_el_caz_hasta_el_azud',
      label: 'Seguir el caz hasta el azud',
      outcome: {
        text: [
          'Seguís el canal de tablones hasta el azud, donde el agua se parte en dos. Desde ahí se ve Aldamar entera y se cuentan tres ventanas encendidas.',
        ],
        next: 'a1_plaza',
      },
    },
    {
      id: 'volver_adentro',
      label: 'Volver adentro del molino',
      outcome: {
        text: [
          'Volvés por la puerta grande con las manos mojadas. El caz te vuelve a subir por el piso apenas pisás los tablones.',
        ],
        next: 'a1_molino',
      },
    },
    {
      id: 'entrar_por_el_hueco_del_caz',
      label: 'Entrar por el hueco del caz a la trampilla',
      outcome: {
        text: [
          'Te metés agachado por donde entra el agua, con la espalda contra el tablón mojado. El hueco sale a un palmo de la tapa del piso, por abajo.',
        ],
        next: 'a1_molino_trampilla',
      },
    },
    {
      id: 'pescar_lo_que_flota',
      label: 'Alumbrar lo que flota entre los álabes',
      requires: { item: 'farol_de_sebo' },
      lockedHint: 'Sin luz no ves nada en esa agua',
      outcome: {
        text: [
          'Bajás el farol hasta el agua, con el brazo estirado, y esperás a que la rueda te lo traiga. Es un delantal de molinero, de lona, con el nudo del cuello todavía hecho. Once días en el agua y el nudo sigue ahí.',
        ],
        effects: [{ set: 'run:cuerpo_hallado' }],
        next: 'a1_molino_trampilla',
      },
    },
  ],
} satisfies Scene;
