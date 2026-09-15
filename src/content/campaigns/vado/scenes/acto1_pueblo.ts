import type { Redirect, Scene } from '@/content/schema';

/**
 * LA SALIDA DEL ACTO 1, en las ONCE escenas del racimo que no son el hub.
 *
 * Es el mismo objeto en `acto1_pueblo.ts` y en `acto1_pistas.ts` (no se puede compartir por
 * `export`: `campaign.ts` junta las escenas con un spread del espacio de nombres y cualquier otra
 * exportación se colaría en `scenes`). Si se toca acá, se toca allá.
 *
 * Tres cosas que hay que saber antes de moverlo:
 * - **No lleva `visited`.** El viejo `visited: a1_plaza >= 3` se fue por decisión de Gabriel
 *   (diseño §3): con un objetivo que te lleva a los tres lugares, el contador es fricción invisible.
 * - **`enter()` resuelve los redirect AL ENTRAR**, antes de dibujar. La tercera pista se enciende en
 *   el `onEnter` de la escena donde el jugador queda parado, así que el redirect de esa escena ya
 *   pasó: lo que lo saca es la elección SIGUIENTE. Por eso tiene que estar en las once y no en una.
 * - **El hub NO lo lleva.** Ahí la salida es una opción que se ve, `a1_plaza.bajar_al_rio`: si el
 *   hub también redirigiera, esa opción no se podría elegir nunca (r13 y diseño §5 piden que del
 *   racimo salga una arista de OPCIÓN, no sólo un redirect).
 */
const AL_CUELLO_1 = {
  when: {
    all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }],
  },
  to: 'c1_cuerpo',
} satisfies Redirect;

/**
 * EL FLOODGATE DEL RELOJ, en las DOCE escenas del racimo. Hasta la tarea 5 de la fase «objetivos»
 * vivía **sólo en el hub**, y eso era la misma falla que el resto de la fase: *una puerta que
 * depende de pisar una baldosa no es una puerta*. El reloj se llena adentro de la casa de Berta —
 * doce pasos insistiendo bastan para ponerlo en 4— y la puerta que lo leía estaba en la plaza, que
 * ese bucle no pisa: abierta y congelada, igual que el ciclo `a1_molino_trampilla ↔ a1_molino_rueda`
 * del diagnóstico (diseño §0.3 y §3, con su nota de corrección del 15 de septiembre).
 *
 * Dos cosas que hay que saber antes de moverlo:
 * - **Va PRIMERO, antes de `AL_CUELLO_1`**, y el orden importa: con el reloj lleno y las tres pistas
 *   puestas, la ronda te levanta **antes** de que puedas usar lo que averiguaste, que es el sentido
 *   entero de ese reloj (outline §1.2). Al revés, el reloj no cobraría nunca.
 * - **Acá el hub SÍ lo lleva**, al revés que `AL_CUELLO_1`, y no es una inconsistencia: el hub perdió
 *   el de las pistas porque si no `bajar_al_rio` sería contenido muerto, y **este floodgate no tiene
 *   ninguna opción que dejar muerta** — nadie elige que lo arresten. Medido, no asumido: con el
 *   floodgate en las doce, `npm run validate` sigue en 0 errores y los tests siguen en verde.
 * - `a1_ronda` **no** lo lleva, obviamente: se redirigiría a sí misma.
 */
const SOSPECHA_AL_TOPE = {
  when: { clock: 'sospecha', gte: 4 },
  to: 'a1_ronda',
} satisfies Redirect;

/**
 * LOTE 3 (bloque del pueblo) — Acto 1 de "El vado de Aldamar": el hub de la plaza, el Ancla Seca con
 * sus dos satélites, la posada y el floodgate de la ronda.
 *
 * PROSA ESCRITA sobre el esqueleto de la Fase C. Estructura intacta: no se tocó ni una `choice`, ni
 * un `label`, ni un `requires`, ni un `lockedHint`, ni un `roll`, ni un `effects`, ni un `next`, ni
 * un `redirect`, ni un `onEnter`, ni un `npcs`, ni un `place`. Lo único que entró acá es texto.
 *
 * Contratos que este archivo sostiene (outline §8), verificados y sin cambios:
 * - **`a1_plaza.redirect` quedó en uno solo: el floodgate de `sospecha` → `a1_ronda`.** El segundo,
 *   el de las tres pistas + `visited >= 3` → `c1_cuerpo`, se fue de acá en la fase «objetivos» y
 *   volvió convertido en la opción `bajar_al_rio`, que el jugador ve. El floodgate se queda acá —y
 *   además se COPIÓ a las otras once en la tarea 5 de esa misma fase, porque vivir sólo en el hub lo
 *   volvía una puerta que dependía de pisar una baldosa (diseño §3, corrección del 15 de septiembre).
 * - **`a1_plaza` está en 9 opciones / 6 libres: toca justo el techo** de `LIMITS.maxChoices`. El
 *   margen de una que quedaba se lo llevó `bajar_al_rio`. Las dos opciones que vuelven al propio
 *   hub (`mirar_el_pozo`,
 *   `leer_el_poste_de_bandos`) son la única excepción declarada a "ninguna opción vuelve a su
 *   escena" (biblia §6.3) y las dos llevan `outcome.text`, como manda esa excepción.
 * - **`a1_posada` no cobra `sospecha` y no cura Heridas** (biblia §7.1): limpia condiciones y hace
 *   pasar la noche. Su tercer párrafo es la ficción del `removeCondition: 'all'` del `onEnter`.
 * - **`a1_ronda` manda siempre a `c1_cuerpo`** y a ninguna otra escena.
 * - Ningún `set`/`clear` de acá toca un espacio compartido: solo se leen, y acá solo en
 *   `{ met: 'pell' }` (atajo del hub) y `{ met: 'orell' }` (variante de memoria de la taberna).
 *
 * MATRIZ DE LAS TRES PISTAS (biblia §9.2), celda de la taberna, escrita entera acá:
 *   · **primero** (0 pistas más): el viejo del hogar canta la copla del vado — pista de que hay
 *     runas, SIN flag. Es el párrafo base de `a1_taberna`, el que lee todo el mundo.
 *   · **segundo** (1 pista más): el del rincón va por la tercera jarra. Engancha con
 *     `a1_orell_mesa.pagarle_la_tercera_jarra`, que es la segunda fuente de `run:sabe_de_halvar`.
 *   · **última** (2 pistas más): Mausi te pregunta de frente y se abre `mostrarle_la_carta_a_mausi`
 *     → `run:berta_miente`. Ese párrafo dice **sin metáfora** que ya no queda noche, igual que el
 *     del hub con las tres pistas encendidas.
 * La posición se lee siempre con los OTROS dos `run:pista_*`, nunca con `visited`: dentro de
 * `a1_taberna` el propio `run:pista_taberna` ya está encendido por su `onEnter`.
 *
 * VARIANTES DE MEMORIA (cuota de la biblia §9.1; las dos de este bloque que la tabla pide):
 *   · `a1_plaza`   → `{ visited: 'a1_plaza', min: 1 }`    base 36 / variante 22   (narrador)
 *   · `a1_taberna` → `{ visited: 'a1_taberna', min: 1 }`  base 36 / variante 29   (boca de Mausi)
 * La segunda va en un párrafo de PNJ **a propósito y es legal**: §9.1 permite `visited` en boca de
 * un PNJ porque es de esta partida, y Mausi notando que entrás por segunda vez la misma noche es
 * exactamente su tic ("nunca te deja el vaso vacío"). Las dos variantes son más cortas que su base.
 * `a1_taberna` lleva ADEMÁS el párrafo de presentación de Orell con `{ met: 'orell' }` que la biblia
 * §3 exige en las tres escenas donde puede debutar, porque el puente es salteable: base 37 /
 * variante 25, párrafo **de narrador**, sin `speaker`.
 *
 * Pasada de voz hecha a mano (§5/r08c): Orell vive en `world/npcs.ts` y r08 NO lo frenaría. **Ningún
 * párrafo con `speaker: 'orell'` de este archivo lleva `met`, `knows`, `endingSeen` ni `char:vado.*`**;
 * el único que varía lo hace por `{ flag: 'run:orell_humillado' }`, que es estado de esta partida.
 *
 * Detalles sensoriales (uno por escena, ninguno repetido, ninguno en párrafo con variante de
 * memoria): `a1_plaza` olfato — leña mojada cuyo humo no sube y la falta del olor a pan (firma de
 * `aldamar_plaza`, primer y único uso; QUEMA "olor a pan") · `a1_taberna` gusto — el humo del hogar
 * deja en la boca grasa de cordero y cerveza agria (firma de `taberna_ancla_seca`, primer uso) ·
 * `a1_taberna_trastienda` tacto — el piso de tierra apisonada que cede bajo el pie ·
 * `a1_orell_mesa` oído — el gancho de la ballesta que Orell abre y cierra con el pulgar ·
 * `a1_posada` tacto — la manta fría del lado de la pared, y ese frío que tarda en irse ·
 * `a1_ronda` oído — la lluvia repicando en los yelmos, que te llega antes que los hombres.
 *
 * Cupos gastados en este lote: `usted` 0 · puteadas 0 · adverbios en -mente 0 · `muy` 0 ·
 * `de repente`/`de pronto` 0 · `parece que` 0 · `como si fuera` 0 (hay un "como si abajo hubiera",
 * que no es el giro con cupo). Oración sin verbo: una en `a1_plaza`, una en `a1_taberna`, una en
 * `a1_taberna_trastienda`, una en `a1_ronda` (en boca de Dravos); ninguna cierra párrafo.
 * Remate de narrador: uno en `a1_plaza.mirar_el_pozo`, uno en `a1_taberna.contarle_lo_del_bulto`,
 * uno en `a1_ronda.escaparte_entre_las_casas`. Ninguno en una banda de tirada.
 *
 * Arranques (tres primeras palabras del texto base): `a1_plaza` "Sesenta y cuatro" · `a1_taberna`
 * "Bajo la viga" · `a1_taberna_trastienda` "Barricas vacías puestas" · `a1_orell_mesa` "Orell no
 * levanta" · `a1_posada` "Arriba hay tres" · `a1_ronda` "Salen de dos". Las seis primeras palabras
 * son distintas entre sí y ninguna coincide con la de una escena a la que este bloque apunta dentro
 * de sí mismo. "Orell" queda con 2 usos de los 3 del tope global (el otro es `p_puente_rechazo`).
 *
 * CUATRO ANOTACIONES PARA EL DISEÑO (no se tocó nada; se anota y se sigue).
 * (a) **`a1_orell_mesa` = 131 palabras es insatisfacible, por la misma razón que
 *     `p_puente_amanecer` en el lote 1.** Las cuatro opciones vuelven a `a1_taberna` y ninguna
 *     cambia de destino, así que §2.5 obliga a pagar las cuatro con texto: 131 − 75 de `text` deja
 *     **14 palabras por opción**, y dos de ellas son parlamentos de Orell (la tercera jarra, que es
 *     una de las dos fuentes de `run:sabe_de_halvar`, y la reparación de `run:orell_humillado`).
 *     Piso real medido: ~200. **Hay que subir la celda a ~200 o bajar la escena a 3 opciones.**
 * (b) `a1_taberna_trastienda` = 126 tiene el mismo problema, más chico: tres de sus cuatro opciones
 *     necesitan texto (dos comparten `next: 'a1_molino'` sin `effects`) y la escena aterriza en
 *     ~150. Es una de las tres que la biblia §2.3 marca como primeras a recortar, así que se deja
 *     apretada a propósito y no se le colgó nada que otra escena necesite.
 * (c) `a1_ronda` = 243 presupuesta 28 palabras para **cuatro** `outcome.text`, y tres de esas cuatro
 *     opciones no tienen `effects` ni cambian de destino (las cinco van a `c1_cuerpo`): el texto es
 *     lo único que las distingue. Con `text` en 120 y tres bandas de tirada, el piso real es ~360.
 * (d) Presupuesto medido con contador, escena por escena (`text` base + todas las variantes +
 *     bandas + `outcome.text`): `a1_plaza` **397/431** ✔ · `a1_taberna` **678/696** ✔ ·
 *     `a1_taberna_trastienda` 160/126 · `a1_orell_mesa` 225/131 · `a1_posada` 185/146 ·
 *     `a1_ronda` 368/243. Total **2.013 contra 1.773 (+13,5 %)**.
 *     El desvío está entero en las cuatro celdas chicas: **las dos escenas caras del lote cierran
 *     por debajo del presupuesto**, y descontando `a1_orell_mesa`, `a1_taberna_trastienda` y
 *     `a1_ronda`, el resto da **582 contra 577 (+0,9 %)**. Ninguna pieza se pasa de las bandas de
 *     la biblia §2.3 por separado (`text` 60-160, bandas 25-50, `outcome.text` 20-60): lo que no
 *     cierra es la suma de las celdas, no el largo de lo escrito. `a1_posada` (185/146) es el caso
 *     más chico del mismo problema: dos de sus cinco opciones comparten `next` sin `effects`.
 * (e) Los tres registros de `design/` (`cupos.md`, `arranques.md`, `detalles-sensoriales.md`) **no
 *     existen todavía en el repositorio**: la carpeta `design/` tiene solo la biblia y el outline.
 *     Todo lo que este lote gastó queda anotado arriba, para volcarlo cuando se creen.
 *
 * ---------------------------------------------------------------------------------------------
 * FASE H · TAREA 4 — "los desenlaces entran en presupuesto". No se tocó ni una `choice`, ni un
 * `label`, ni un `requires`, ni un `roll`, ni un `effects`, ni un `next`: entró y salió texto.
 * Criterio de recorte, en este orden: (1) la oración que repite lo que la escena ya dijo; (2) la
 * que explica al jugador la opción que acaba de elegir; (3) el adjetivo y la subordinada que no
 * agregan información. NO se tocaron: lo que el jugador necesita para decidir lo que sigue, las
 * líneas que anuncian un costo (Fase H · tarea 2), la telegrafía del sello (tarea 3) ni la de
 * muerte (biblia §11), el piso dramático de §2.3 ni el detalle sensorial de §2.2.
 *
 * TRES CELDAS ESTABAN MAL CALCULADAS y se corrigieron en el outline §2.1, con la aritmética escrita
 * en el propio documento: `pal` mínimo = `text` + (bandas × 25) + (desenlaces sin tirada con texto ×
 * 20), los pisos de la biblia §2.3. Si ese mínimo no entra ni en el 25 % de tolerancia del linter, la
 * celda pide un imposible. Eran `p_puente_amanecer` (84 ⇒ **160**), `a2_ley_guardia` (90 ⇒ **190**) y
 * `a2_fuera_refugio` (90 ⇒ **170**): las tres tenían `pal` igual o casi igual a `text`, o sea 24, 0 y
 * 0 palabras para cinco, cinco y cuatro desenlaces. **La prosa que esas celdas habían forzado a
 * tirar está restituida** (en `p_puente_amanecer`, la muela del sargento y el silencio de Orell).
 * Medidas las 46 celdas, no hay una cuarta: otras doce tienen el mínimo por encima de `pal` pero
 * dentro de la tolerancia — son exigentes, no rotas, y no se tocaron.
 *
 * TENSIÓN QUE QUEDA A LA VISTA, y que es decisión de prosa, no aritmética: la tabla §2 presupuesta
 * 28 palabras por `outcome.text` y solo para una parte de las opciones libres, así que en las doce
 * celdas exigentes entrar en la celda **obliga igual** a escribir desenlaces por debajo de las 20
 * palabras de la biblia §2.3. Los avisos del linter quedaron en 143 contra los 117 del principio:
 * esa diferencia es el precio de los 22 errores de presupuesto que quedaron en 0.
 */

/**
 * EL HUB. `kind: 'hub'`, 8 opciones / 6 libres, cero tiradas.
 * Las tres puertas del acto 1 (`a1_taberna`, `a1_alcaldesa`, `a1_molino`) fijan su `run:pista_*` en
 * su propio `onEnter`, nunca acá y nunca como premio de una tirada: el `redirect` de las tres pistas
 * tiene que ser siempre alcanzable.
 *
 * Cuatro párrafos: detalle sensorial (sin variantes) · memoria por `visited` · posición en el acto
 * (el aviso de que no queda noche, con las tres pistas) · quién te está mirando la plaza, por flag.
 */
export const a1_plaza = {
  id: 'a1_plaza',
  kind: 'hub',
  place: 'aldamar_plaza',
  onEnter: [{ milestone: 'llegar_a_aldamar' }],
  // Floodgate de sospecha, y nada más. El cierre del acto ya no se dispara acá: es la opción
  // `bajar_al_rio`, que se ve y se elige. El hub es la única escena del racimo sin `AL_CUELLO_1`
  // —y la única que tiene SOLO el floodgate, porque las otras once llevan los dos.
  redirect: [SOSPECHA_AL_TOPE],
  text: [
    'Sesenta y cuatro casas y tres ventanas con luz. La plaza es barro pisado, con un pozo en el medio y un poste de bandos torcido. Huele a leña mojada y el humo no sube: se queda a la altura de la cara. Falta el olor del pan.',
    {
      variants: [
        {
          when: { visited: 'a1_plaza', min: 1 },
          text: 'Volvés a la plaza y el barro ya tiene tus pisadas encima de las otras. Contás las luces de nuevo: siguen tres.',
        },
        {
          text: 'Al fondo, pasado el agua, está el bulto negro del molino con la rueda quieta. Las tres luces son la taberna, la casa de la alcaldesa y una ventana alta que no sabés de quién.',
        },
      ],
    },
    {
      variants: [
        {
          when: {
            all: [
              { flag: 'run:pista_taberna' },
              { flag: 'run:pista_alcaldesa' },
              { flag: 'run:pista_molino' },
            ],
          },
          text: 'Ya no te queda noche para una cuarta puerta. Lo que no preguntaste no lo vas a preguntar: salís con lo que averiguaste.',
        },
        {
          text: 'A esta hora el pueblo tiene tres puertas: la taberna, el llamador de bronce de la alcaldesa y el molino, que está del otro lado y no tiene puerta que golpear.',
        },
      ],
    },
    {
      variants: [
        {
          when: { flag: 'run:mausi_informo' },
          text: 'Un guardia joven cruza la plaza y se para donde se ve la puerta del Ancla Seca. No mira para acá ni una vez.',
        },
        {
          when: { flag: 'run:orell_humillado' },
          text: 'En la boca del puente hay un hombre de gambesón gris de cara al pueblo. No se mueve en todo el rato que estás.',
        },
        {
          when: { flag: 'run:orell_confia' },
          text: 'Desde la boca del puente, el sargento levanta la mano una vez y la baja. Cuenta una cabeza más y sigue con lo suyo.',
        },
        {
          text: 'En el poste hay un bando nuevo con lacre, y debajo tres viejos deshechos por el agua.',
        },
      ],
    },
  ],
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
      outcome: {
        text: [
          'El pozo tiene brocal de piedra y polea de madera, y no tiene soga. La cortaron cerca del nudo, de un tajo limpio, y el cabo quedó colgando. Una soga de pozo es de todos.',
        ],
        effects: [{ set: 'run:la_soga_cortada' }],
        next: 'a1_plaza',
      },
    },
    {
      // Excepción declarada 2 de 2: el bando de Dravos con la pena escrita.
      id: 'leer_el_poste_de_bandos',
      label: 'Leer el poste de bandos',
      outcome: {
        text: [
          'El bando lo firma el capitán Dravos y lo clavaron con cuatro clavos nuevos: el puente cerrado hasta nueva orden. Abajo, la pena para el que cruce por otro lado, y para el forastero el doble.',
        ],
        next: 'a1_plaza',
      },
    },
    {
      id: 'volver_al_despacho',
      label: 'Volver al despacho de Berta',
      requires: { flag: 'run:pista_alcaldesa' },
      lockedHint: 'Todavía no tenés nada que preguntarle adentro.',
      outcome: {
        text: [
          'Cruzás la plaza con las mismas preguntas y una más. Golpear dos veces la misma puerta en una noche dice algo de vos.',
        ],
        next: 'a1_berta_despacho',
      },
    },
    {
      // LA SALIDA DEL ACTO 1 POR DECISIÓN. Las otras once escenas del racimo sacan al jugador
      // solas, con `AL_CUELLO_1`; acá, que es el hub, la puerta se ve y se elige. Con la puerta
      // cerrada el `lockedHint` dice lo mismo que el objetivo de la barra, y en el mismo tono.
      //
      // EL DESENLACE MIDE CATORCE PALABRAS, Y ES EL MÁXIMO QUE ENTRA. Hasta la tarea 5 iba mudo,
      // que es lo peor que le puede pasar a un quiebre de acto: `c1_cuerpo` empieza con el cuerpo
      // ya a la vista y nadie narraba la bajada. La cuenta, medida con `npm run lint:text` y no
      // estimada: la campaña escribe 16.712 palabras contra un presupuesto de 15.930, y el error
      // del 5 % salta a partir de 16.727 — o sea que quedan CATORCE palabras y ni una más. Las 24
      // que la tarea 3 había escrito dejaban el linter en 5,1 %.
      //
      // El precio, dicho para que se vea: la banda de la biblia §2.3 para un desenlace es 20-60
      // palabras, así que estas catorce abren UN aviso nuevo (143 → 144) que dice exactamente eso.
      // Se eligió el aviso antes que el error, y antes que seguir mudos. Para llegar a las 20 hay
      // que liberar seis palabras en otra escena, y eso es decisión de autor, no de esta tarea.
      id: 'bajar_al_rio',
      label: 'Bajar al río con lo que averiguaste',
      requires: {
        all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }],
      },
      lockedHint: 'Todavía te falta preguntar en el pueblo.',
      outcome: {
        // Catorce palabras exactas. La primera versión decía «el barro se vuelve grava», que es la
        // misma imagen que ya usa `a1_ronda` doscientas líneas más abajo: lo dijo el contador de
        // ngramas del linter (217 → 218 repeticiones de 4+ palabras), no el ojo.
        text: ['Bajás sin farol, con la carta en el bolsillo. El río se oye entero.'],
        next: 'c1_cuerpo',
      },
    },
    {
      // Atajo [Recuerdo] n.º 2 de la biblia §9.3: el badge lo deriva el motor del `met`.
      // Nunca mudo (guía §4.4): el recuerdo se cuenta como memoria del cuerpo, no como dato.
      id: 'entrar_al_molino_por_atras',
      label: 'Colarte al molino por atrás, en la ronda del chico',
      requires: { met: 'pell' },
      lockedHint: 'No sabés a qué hora hace la ronda el chico.',
      outcome: {
        text: [
          'El chico hace la ronda por el caz y tarda siempre lo mismo. Lo dejás pasar, contás hasta donde contaste la otra vez y entrás por atrás, con el agua en los pies.',
        ],
        next: 'a1_molino_trampilla',
      },
    },
  ],
} satisfies Scene;

/**
 * Puerta 1 de las tres. `onEnter` fija `run:pista_taberna`.
 * Orell está declarado porque en toda ruta que entra acá está en el salón, aunque en la celda
 * "primero" de la matriz no abra la boca.
 * Dos tiradas, dos atributos distintos (Presencia y Astucia) y tres salidas sin dado.
 *
 * Cuatro párrafos: detalle sensorial (gusto, sin variantes) · presentación de Orell con `met`
 * (NARRADOR, sin `speaker`) · Mausi, con la variante `visited` de la cuota · la posición en el acto,
 * que es la celda de la matriz §9.2.
 */
export const a1_taberna = {
  id: 'a1_taberna',
  kind: 'normal',
  place: 'taberna_ancla_seca',
  npcs: ['mausi', 'orell'],
  redirect: [SOSPECHA_AL_TOPE, AL_CUELLO_1],
  onEnter: [{ set: 'run:pista_taberna' }],
  text: [
    'Bajo la viga maestra cuelga un ancla comida de óxido. Nadie levanta la cabeza. El humo del hogar baja y te deja en la boca un gusto a grasa de cordero y cerveza agria.',
    {
      variants: [
        {
          when: { met: 'orell' },
          text: 'Al sargento lo tenés ubicado antes de sacarte el agua de encima. Sin ballesta y con la espalda contra la pared, sigue haciendo la misma guardia.',
        },
        {
          text: 'En la mesa del rincón hay un hombre de barba gris corta y una cicatriz blanca en la ceja izquierda. Gambesón abierto, jarra por la mitad. Está fuera de servicio y sigue de cara a la puerta.',
        },
      ],
    },
    {
      speaker: 'mausi',
      variants: [
        {
          when: { visited: 'a1_taberna', min: 1 },
          text: '—¿Otra vez? Sentate, que te la lleno. —No pregunta si querés—. Yo no digo nada, ¿eh?, pero el que entra dos veces la misma noche anda buscando algo.',
        },
        {
          text: '—Sentate donde quieras, que hoy sobra sitio. ¿Venís del camino? Se te ve. —Te pone una jarra sin preguntar—. Yo no digo nada, ¿eh?, pero hace once días que sirvo la mitad de las jarras.',
        },
      ],
    },
    {
      variants: [
        {
          when: { all: [{ flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }] },
          text: 'Ya no te queda noche para volver acá. Mausi deja el trapo, se para enfrente y te pregunta a vos, al revés de como venía siendo.',
        },
        {
          when: { any: [{ flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }] },
          text: 'El de la mesa del rincón va por la tercera jarra y el rincón ya no está tan callado.',
        },
        {
          text: 'En el rincón del hogar, un viejo canta para adentro una copla que en el segundo verso cuenta piedras y no nombra a nadie.',
        },
      ],
    },
  ],
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
          success: {
            text: [
              'Preguntás por el molinero sin levantar la voz, con el lacre a la vista. Mausi cuelga la jarra y te hace pasar por el hueco del mostrador.',
              {
                speaker: 'mausi',
                variants: [{ text: '—Atrás. Acá hay orejas y yo tengo veinte jarras que servir.' }],
              },
            ],
            next: 'a1_taberna_trastienda',
          },
          partial: {
            text: [
              'Te contesta fuerte, para que la oiga la sala: que el molinero debía plata en tres casas y que ella no es la última en cobrar. Al rato, el que le acarrea la leña cruza la plaza con un papel doblado.',
            ],
            effects: [{ set: 'run:mausi_informo' }],
            next: 'a1_plaza',
          },
          failure: {
            text: [
              'Insistís, y el nombre de Tomé queda dando vueltas entre las mesas. Mausi se seca las manos, no contesta y te llena el vaso igual. Mañana en la torre van a saber quién vino a preguntar.',
            ],
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
          success: {
            text: [
              'Esperás a que baje al sótano por una barrica y das vuelta el libro. Entre los fiados del pueblo hay una cuenta sola, en letra que no es de acá, a nombre de un tal Halvar, del otro lado del río.',
            ],
            effects: [{ set: 'run:sabe_de_halvar' }],
            next: 'a1_taberna_trastienda',
          },
          partial: {
            text: [
              'Alcanzás a leer el nombre antes de que la tapa te gane la mano: Halvar, y una cuenta que no paga nadie de acá. Mausi no dice nada delante de la gente: le hace una seña al de la puerta.',
            ],
            effects: [{ set: 'run:sabe_de_halvar' }, { clock: 'sospecha', delta: 1 }],
            next: 'a1_taberna_trastienda',
          },
          failure: {
            text: [
              'El libro está atado al mostrador con un cordel y el cordel canta. Mausi no se da vuelta: le pregunta al del rincón si quiere otra, y el del rincón te mira a vos.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a1_plaza',
          },
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
      outcome: {
        text: [
          'Levanta la tabla de la barra con la cadera sin dejar de servir.',
          {
            speaker: 'mausi',
            variants: [{ text: '—Andá, pero no me muevas las barricas. Y dejá la puerta como está.' }],
          },
        ],
        next: 'a1_taberna_trastienda',
      },
    },
    {
      // Fluff con obligación de pagar: Mausi cuenta por qué el molino tuvo luz el invierno pasado.
      id: 'pagar_una_ronda',
      label: 'Pagar una ronda y escuchar',
      outcome: {
        text: [
          'Pagás una vuelta corta y la sala se acomoda un poco.',
          {
            speaker: 'mausi',
            variants: [
              {
                text: '—El invierno pasado el molino tuvo luz una semana, ¿eh?, y no molió un grano. Yo no digo nada, pero un molino que no muele no gasta sebo. —Se va con cuatro jarras en una mano.',
              },
            ],
          },
        ],
        next: 'a1_plaza',
      },
    },
    {
      // Cruce molino → taberna (biblia §9.2): Mausi reconoce el bulto que le viste a Pell.
      id: 'contarle_lo_del_bulto',
      label: 'Contarle lo que viste salir del molino',
      requires: { flag: 'run:pista_molino' },
      lockedHint: 'Todavía no viste nada que valga la pena contar.',
      outcome: {
        text: [
          'Le contás lo del bulto de arpillera, largo, atado en tres vueltas.',
          {
            speaker: 'mausi',
            variants: [{ text: '—¿De tres vueltas? Esa la ata él y nadie más.' }],
          },
          'Deja la jarra a medio llenar, y es la primera vez en la noche que la ves dejar algo a medias. Nadie saca de un molino un bulto largo atado en tres vueltas si adentro hay alguien vivo.',
        ],
        effects: [{ set: 'run:cuerpo_hallado' }],
        next: 'a1_plaza',
      },
    },
    {
      // Celda "última" de la matriz: Berta ya le pagó a alguien antes que a vos.
      id: 'mostrarle_la_carta_a_mausi',
      label: 'Mostrarle el lacre de la alcaldesa',
      requires: { all: [{ flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }] },
      lockedHint: 'Mausi no le va a dar importancia a un lacre todavía.',
      outcome: {
        text: [
          'Ponés el lacre sobre la barra, del lado que se ve.',
          {
            speaker: 'mausi',
            variants: [
              {
                text: '—Ese lacre ya lo vi este mes. —Se le va la mano y la jarra rebalsa—. Yo no digo nada, ¿eh?, pero el de la capa buena pasó antes que vos, con un papel igual, y venía con la plata contada.',
              },
            ],
          },
        ],
        effects: [{ set: 'run:berta_miente' }],
        next: 'a1_plaza',
      },
    },
  ],
} satisfies Scene;

/**
 * Satélite de tránsito del Ancla Seca. 4 opciones, las cuatro libres, cero tiradas.
 * Es una de las tres escenas que la biblia §2.3 marca como primeras a recortar si un lote se pasa
 * de presupuesto, así que no se le cuelga nada que otra escena necesite.
 * `salir_por_la_puerta_de_atras` y `escuchar_el_caz_antes_de_cruzar` comparten `next` y no tienen
 * `effects`: el texto es lo único que las distingue y por eso las dos lo llevan (guía §4.4).
 */
export const a1_taberna_trastienda = {
  id: 'a1_taberna_trastienda',
  kind: 'normal',
  place: 'taberna_ancla_seca',
  npcs: ['mausi'],
  redirect: [SOSPECHA_AL_TOPE, AL_CUELLO_1],
  text: [
    'Barricas vacías puestas de canto, una pila de leña que no se secó nunca y una puerta de tablas que da al patio. El piso es de tierra apisonada y cede bajo el pie, como si abajo hubiera agua.',
    {
      speaker: 'mausi',
      variants: [
        {
          text: '—Farol hay uno, el del clavo, y lo quiero de vuelta. Del patio se baja al agua. —Se va sin cerrar—. Yo no vi que salieras por ahí, ¿eh?',
        },
      ],
    },
  ],
  choices: [
    {
      // Una de las dos fuentes del farol en el acto 1 (la otra es el molino).
      id: 'agarrar_el_farol_del_clavo',
      label: 'Agarrar el farol de sebo del clavo',
      outcome: {
        text: ['El farol es de sebo y la puerta de cuerno está rajada.'],
        effects: [{ give: 'farol_de_sebo' }],
        next: 'a1_taberna',
      },
    },
    {
      id: 'revisar_las_barricas_vacias',
      label: 'Revisar las barricas vacías',
      outcome: {
        text: [
          'Once barricas vacías. Una no huele a cerveza: huele a harina, y el polvo del fondo está seco.',
        ],
        next: 'a1_taberna',
      },
    },
    {
      id: 'salir_por_la_puerta_de_atras',
      label: 'Salir por la puerta de atrás',
      outcome: {
        text: [
          'Salís al patio y al camino de tablones que baja al agua. La puerta queda abierta.',
        ],
        next: 'a1_molino',
      },
    },
    {
      id: 'escuchar_el_caz_antes_de_cruzar',
      label: 'Escuchar el caz antes de cruzar el patio',
      outcome: {
        text: [
          'Te quedás quieto hasta que el ruido se ordena: el río por un lado y, más adentro, el caz metiéndose debajo del molino. El molino suena lleno.',
        ],
        next: 'a1_molino',
      },
    },
  ],
} satisfies Scene;

/**
 * La mesa de Orell. 4 opciones, las cuatro libres, cero tiradas, un solo destino.
 * `recordarle_el_puente` es el único lugar de la campaña que limpia `run:orell_humillado`, y por eso
 * hace `clear` del viejo además del `set` del nuevo: el par es mutuamente excluyente (biblia §10).
 *
 * ECONOMÍA DE ORELL (guía de voz §2.1), respetada al pie: acá puede decir **lo que no puede decir**;
 * nunca lo que vio. La fecha del bando es un dato público clavado en el poste de la plaza, no su
 * secreto, y por eso se puede pagar en el acto 1 sin robarle material a la rama A.
 */
export const a1_orell_mesa = {
  id: 'a1_orell_mesa',
  kind: 'normal',
  place: 'taberna_ancla_seca',
  npcs: ['orell'],
  redirect: [SOSPECHA_AL_TOPE, AL_CUELLO_1],
  text: [
    'Orell no levanta la vista cuando te parás al lado de la mesa. Junto a la jarra está el gancho de la ballesta: lo abre y lo cierra con el pulgar mientras mira la puerta. Hace un ruido chico por debajo de todo.',
    {
      speaker: 'orell',
      variants: [
        {
          text: '—Sentate si querés. Fuera de servicio no contesto nada. —Corre la jarra—. Tampoco te voy a mentir.',
        },
      ],
    },
  ],
  choices: [
    {
      // Celda "segundo" de la matriz: por la tercera jarra nombra a Halvar, dos escenas antes de
      // que el mercader aparezca. Es la segunda de las DOS fuentes de `run:sabe_de_halvar`.
      id: 'pagarle_la_tercera_jarra',
      label: 'Pagarle la tercera jarra',
      outcome: {
        text: [
          {
            speaker: 'orell',
            variants: [
              {
                text: '—Del otro lado hay un mercader con dos barcas, Halvar, desde antes de que cerráramos el puente. —Deja la jarra—. Eso te lo puedo decir.',
              },
            ],
          },
        ],
        effects: [{ set: 'run:sabe_de_halvar' }],
        next: 'a1_taberna',
      },
    },
    {
      id: 'recordarle_el_puente',
      label: 'Recordarle lo del puente y ofrecerle la mano',
      outcome: {
        text: [
          {
            speaker: 'orell',
            variants: [
              {
                when: { flag: 'run:orell_humillado' },
                text: '—Aquella noche había un chico mirando. —Te da la mano—. Queda saldado.',
              },
              {
                text: '—Estabas en tu derecho. Yo estaba en el mío. —Te da la mano—. Ninguno de los dos decide nada.',
              },
            ],
          },
        ],
        effects: [{ clear: 'run:orell_humillado' }, { set: 'run:orell_confia' }],
        next: 'a1_taberna',
      },
    },
    {
      id: 'preguntarle_por_la_orden_de_cerrar_el_puente',
      label: 'Preguntarle quién firmó el cierre del puente',
      outcome: {
        text: [
          {
            speaker: 'orell',
            variants: [
              {
                text: '—La firma es del capitán Dravos, de hace doce días. —Levanta la jarra y no toma—. El bando dice lo que dice.',
              },
            ],
          },
          'El puente se cerró antes de que Tomé faltara.',
        ],
        next: 'a1_taberna',
      },
    },
    {
      id: 'dejarlo_tomar_en_paz',
      label: 'Dejarlo tomar en paz',
      outcome: {
        text: [
          'No preguntás nada. Al levantarse te corre la banqueta.',
        ],
        next: 'a1_taberna',
      },
    },
  ],
} satisfies Scene;

/**
 * La `rest` del acto 1. 5 opciones, las cinco libres, cero tiradas.
 * **No cura Heridas y no cobra `sospecha`** (biblia §7.1): limpia condiciones y hace pasar la noche.
 * Es alcanzable solo antes de la tercera pista: con las tres puestas, `AL_CUELLO_1` la saltea al
 * entrar y el jugador cae en el cuello 1.
 *
 * El tercer párrafo es la ficción del `removeCondition: 'all'`: se seca lo mojado y se pasa el susto.
 * `dormir_hasta_que_afloje_la_lluvia` y `revisar_tus_cosas_antes_de_acostarte` comparten `next` y no
 * tienen `effects`: las dos llevan texto.
 */
export const a1_posada = {
  id: 'a1_posada',
  kind: 'rest',
  place: 'taberna_ancla_seca',
  npcs: ['mausi'],
  redirect: [SOSPECHA_AL_TOPE, AL_CUELLO_1],
  onEnter: [{ removeCondition: 'all' }],
  text: [
    'Arriba hay tres cuartos y dos con la puerta abierta, que es como decir vacíos. El tuyo tiene un jergón, una palangana y una vela corta. La manta pesa y del lado de la pared está fría, y esa frialdad tarda en irse.',
    {
      speaker: 'mausi',
      variants: [
        {
          text: '—Te dejo agua caliente y no me la vuelques. —Cuelga tu capa a secar—. Dormí lo que puedas: acá se madruga porque el río madruga.',
        },
      ],
    },
    'Te sacás lo mojado y lo colgás cerca de la vela. Por la ventana se ve el poste de bandos y nada más.',
  ],
  choices: [
    {
      id: 'dormir_hasta_que_afloje_la_lluvia',
      label: 'Dormir hasta que afloje la lluvia',
      outcome: {
        text: [
          'No afloja. Dormís de a pedazos: te despierta la lluvia cada vez que cambia de sitio en el techo. Al bajar, falta menos noche.',
        ],
        next: 'a1_plaza',
      },
    },
    {
      id: 'bajar_al_salon_otra_vez',
      label: 'Bajar al salón otra vez',
      outcome: { next: 'a1_taberna' },
    },
    {
      id: 'salir_derecho_al_molino',
      label: 'Salir derecho al molino, sin dormir',
      outcome: {
        text: [
          'Bajás por la escalera de atrás, sin vela. El agua suena más cerca que hace un rato.',
        ],
        next: 'a1_molino',
      },
    },
    {
      id: 'ir_a_lo_de_la_alcaldesa_de_madrugada',
      label: 'Ir a lo de la alcaldesa de madrugada',
      outcome: { next: 'a1_alcaldesa' },
    },
    {
      id: 'revisar_tus_cosas_antes_de_acostarte',
      label: 'Revisar tus cosas antes de acostarte',
      outcome: {
        text: [
          'Ponés todo sobre el jergón y lo contás. Está lo que traías y no lo gastado. La carta, si la tenés, vuelve al trapo encerado.',
        ],
        next: 'a1_plaza',
      },
    },
  ],
} satisfies Scene;

/**
 * El floodgate de `sospecha`. Se entra SOLO por el `redirect [0]` de `a1_plaza` y se sale SIEMPRE a
 * `c1_cuerpo`: Dravos no te acusa en la plaza, te lleva al vado a mostrarte el cuerpo.
 * `onEnter` enciende `run:dravos_sabe`, que es lo que el reloj significa.
 * 5 opciones / 4 libres, una sola tirada (`dificil`, tag `social`, la Debilidad del Explorador), que
 * convive con `escaparte_entre_las_casas`, sin dado.
 *
 * Debut posible de Dravos. Lo nombra **Orell**, que nunca lo nombra sin el rango, así que el jugador
 * lee "capitán Dravos" antes de que el motor imprima el nombre del `speaker`. Al sargento el
 * narrador lo llama "el sargento de la barba gris" y no por su nombre: esta escena es alcanzable
 * sin haber pasado por la barricada ni por la taberna (biblia §2.4b).
 * El texto NO cuenta el resultado de `mantener_la_calma`: plantea el interrogatorio y se calla.
 */
export const a1_ronda = {
  id: 'a1_ronda',
  kind: 'normal',
  place: 'aldamar_plaza',
  npcs: ['dravos', 'orell'],
  onEnter: [{ set: 'run:dravos_sabe' }],
  text: [
    'Salen de dos calles a la vez y la plaza se cierra sola. Seis con farol y dos sin. La lluvia repica en los yelmos con un ruido chico y parejo que llega antes.',
    'Adelante va uno sin farol, con sobreveste índigo y una traba de plata en el hombro. No se moja igual que los otros. Dos pasos atrás, el sargento de barba gris mira el barro.',
    {
      speaker: 'orell',
      variants: [{ text: '—Capitán Dravos. Es el del camino del norte.' }],
    },
    {
      speaker: 'dravos',
      variants: [
        {
          text: '—De noche, bajo la lluvia, preguntando por un hombre que no está. —Se pone los guantes sin apuro—. Corresponde aclarar eso. Los catorce hombres de esta guarnición ya te vieron la cara.',
        },
      ],
    },
  ],
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
          success: {
            text: [
              'Contestás lo justo y no te movés. Dravos repite tu respuesta con otras palabras y no encuentra el hueco. Te llevan caminando, y nadie te toca.',
            ],
            next: 'c1_cuerpo',
          },
          partial: {
            text: [
              'Aguantás las tres primeras preguntas. En la cuarta se te va la voz un tono y él se detiene. —Corresponde que veas una cosa antes de seguir hablando. —Te sacan entre cuatro.',
            ],
            effects: [{ addCondition: 'asustado' }],
            next: 'c1_cuerpo',
          },
          failure: {
            text: [
              'Un guardia te pone la mano en el hombro y la sacás de un tirón. El cabo de la lanza te entra abajo de las costillas y el aire se te va de una. Dravos no levanta la voz.',
            ],
            effects: [{ wound: 1 }],
            next: 'c1_cuerpo',
          },
        },
      },
    },
    {
      id: 'escaparte_entre_las_casas',
      label: 'Escaparte entre las casas',
      outcome: {
        text: [
          'Salís por el callejón del pozo, el único sin farol. Te siguen sin correr: el que no corre sabe adónde da.',
        ],
        effects: [{ addCondition: 'perseguido' }],
        next: 'c1_cuerpo',
      },
    },
    {
      id: 'dejar_que_te_lleven',
      label: 'Dejar que te lleven sin decir nada',
      outcome: {
        text: [
          'No decís nada. Te llevan por el camino del río y no hacia la torre. Lo entendés cuando el barro se vuelve grava.',
        ],
        next: 'c1_cuerpo',
      },
    },
    {
      id: 'preguntarle_a_dravos_por_tome',
      label: 'Preguntarle a Dravos por el molinero',
      outcome: {
        text: [
          {
            speaker: 'dravos',
            variants: [
              {
                text: '—El molinero. —Lo dice como quien lee un renglón—. Primero ver, después preguntar. Corresponde ese orden.',
              },
            ],
          },
        ],
        next: 'c1_cuerpo',
      },
    },
    {
      id: 'pedirle_a_orell_que_responda_por_vos',
      label: 'Pedirle a Orell que responda por vos',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell todavía no te debe nada.',
      outcome: {
        text: [
          'El sargento tarda. Después da un paso y dice que respondés vos, pero vas con él. Dravos no discute delante de los hombres.',
        ],
        next: 'c1_cuerpo',
      },
    },
  ],
} satisfies Scene;
