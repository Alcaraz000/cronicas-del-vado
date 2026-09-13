import type { Scene } from '@/content/schema';

/**
 * PROSA (Fase D). El cuello 1, la transición que compromete la rama y la rama A del acto 2.
 *
 * Diez escenas, exactamente las de la tabla §2 de `design/01-outline.md`:
 * `c1_cuerpo`, `c1_acusacion`, `c1_refriega` (encounter) · `a2_amanecer` · `a2_ley_orell`,
 * `a2_ley_torre`, `a2_ley_cartas`, `a2_ley_halvar`, `a2_ley_berta`, `a2_ley_guardia` (rest).
 *
 * La estructura quedó INTACTA respecto del esqueleto hasta la Fase D: no se tocó ni una `choice`, ni
 * un `label`, ni un `requires`, ni un `lockedHint`, ni un `roll`, ni un `effects`, ni un `next`, ni
 * un `onEnter`, ni un `npcs`, ni un `place`, ni un `redirect`. Lo único que entró en la D es texto:
 * los `text` de escena, las bandas de las cinco tiradas y los `outcome.text` de las opciones libres.
 *
 * ---------------------------------------------------------------------------------------------
 * FASE H · TAREA 2 — "que ceder cueste algo". Lo ÚNICO que cambió de estructura en este archivo,
 * y las cuatro cosas son `effects` (ninguna opción se sacó, ninguna ganó `requires`, ningún `next`
 * se movió, así que la cuenta `opc`/`libres` del outline §2 no se toca):
 *   1. `c1_acusacion.ceder` → `{ take: 'carta_lacrada' }` y `label` que lo anuncia.
 *   2. `c1_refriega.rendirte` → `{ clock: 'sospecha', delta: 1 }` y `label` que lo anuncia.
 *   3. `a2_ley_orell.onEnter` deja de encender `run:orell_confia`; lo enciende el ÉXITO de
 *      `preguntarle_por_la_orden_escrita`, con el `clear` del par en la misma banda. El `onEnter`
 *      queda sin efectos y por eso ya no se declara.
 *   4. `a2_ley_torre.leer_el_sigilo_de_la_mesa` → `{ clock: 'sospecha', delta: 1 }`: era la segunda
 *      vía gratuita de la rama A al hito `ver_el_sello` y sobraba.
 * Tics de `sospecha` nuevos en este archivo: DOS (2 y 4), los dos con sujeto que mira.
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
 *
 * ---------------------------------------------------------------------------------------------
 * FASE H · TAREA 3 — "el sello es invisible, no inaccesible". Informe de Fase E §8.2: solo el
 * 14,4 % de las partidas enciende `char:vado.sabe_del_sello`, y la brecha entre clases es ruido
 * (1,58–2,04 %): no es una puerta angosta, es una puerta que no se ve. **No se tocó la mecánica**
 * (mismo `requires`, misma tirada, mismo intento único). Lo único que cambió en `a2_ley_cartas`:
 *   1. Un párrafo nuevo, al final del `text` de escena, antes de las opciones: dice que el lacre
 *      del pie de las cartas no es un adorno (líneas que se repiten iguales), sin adelantar qué
 *      significan. Presupuesto de la escena: 547 → 568 de 459 (+24 %, dentro del piso de aviso).
 *   2. `reconocer_el_sigilo.label` pasa de "Reconocer el sigilo del lacre" a "Leer lo que dice el
 *      lacre" (biblia §10: la etiqueta anuncia que hay algo escrito, no nombra el objeto sin más).
 * La contraparte en la rama B, `a2_fuera_sello.leer_la_piedra`, se tocó igual en
 * `scenes/acto2_fuera.ts`. El simulador no puede medir el efecto (juega sin leer prosa): la traza
 * de `npm run simulate` con la misma semilla da los mismos 118/9416 en `fin_heredero` antes y
 * después, como se espera de un cambio que le habla a una persona y no a una política.
 *
 * ---------------------------------------------------------------------------------------------
 * REGISTROS DEL LOTE (biblia §12 / outline §6.3). `design/arranques.md`,
 * `design/detalles-sensoriales.md` y `design/cupos.md` todavía no existen en el repo (deuda del
 * lote 1, anotada en la biblia §13.7): estas filas van acá para que se copien cuando se creen.
 *
 * ARRANQUES (tres primeras palabras del texto base):
 *   `c1_cuerpo` "Está entre la" · `c1_acusacion` "Te suben a" · `c1_refriega` "Son seis y" ·
 *   `a2_amanecer` "De a poco" · `a2_ley_orell` "Adentro de la" · `a2_ley_torre` "Arriba, la sala" ·
 *   `a2_ley_cartas` "Las cartas están" · `a2_ley_halvar` "En el banco" ·
 *   `a2_ley_berta` "Golpeás una vez" · `a2_ley_guardia` "Abajo, en el".
 *   Las diez primeras palabras son distintas entre sí y distintas de las cinco del prólogo (Hace,
 *   Dos, Orell, Media, Clarea). Regla local verificada arista por arista dentro del archivo.
 *
 * DETALLES SENSORIALES (uno por escena, ninguno visual, ninguno repetido, todos en párrafo sin
 * variante de memoria):
 *   `c1_cuerpo` olfato/gusto — el olor dulce que se queda en el paladar aunque respires por la boca
 *   `c1_acusacion` oído — el barro que deja de chapotear y hace ruido de succión bajo tantos pies
 *   `c1_refriega` tacto — el talón que se va un dedo para atrás cada vez que cargás el peso
 *   `a2_amanecer` tacto — las manos tan frías que el pulgar no encuentra el filo de la uña
 *   `a2_ley_orell` olfato — tinta fresca que queda en la garganta y no en la nariz (firma de
 *     `torre_de_dravos`, mitad "tinta"; la mitad "sebo quemado" ya la gastó `p_puente`)
 *   `a2_ley_torre` oído — el carbón que revienta y se lleva el resto del ruido de la sala
 *   `a2_ley_cartas` tacto — el papel liso y frío del otro lado del río, que se quiebra en el pliegue
 *   `a2_ley_halvar` olfato — clavo de olor y vino caliente del brasero de la barca
 *   `a2_ley_berta` oído — el saco que alguien levanta, apoya y vuelve a levantar en la escalera
 *   `a2_ley_guardia` gusto — el jarro de agua con grasa y un pedazo de nabo
 *
 * CUPOS GASTADOS POR ESTE LOTE: `usted` 0 · puteadas 0 · adverbios en -mente 0 · `muy` 0 ·
 *   `de repente`/`de pronto` 0 · `parece que` 0 · `como si fuera` 0 · `lentamente`/`rápidamente` 0 ·
 *   `no podés evitar` 0 · `de alguna manera` 0. Oración sin verbo: 0 en las diez escenas.
 *   Remate del narrador: como mucho uno por escena («no se enredó solo», «que es una manera de no
 *   dejarte ir», «que en este barro no tiene ningún derecho a estar», «y eso es lo que te dice de
 *   qué está hecha»).
 *   NOTA: Pell habla en `a2_amanecer.preguntarle_a_pell_por_la_orden` y NO gasta `usted`, porque el
 *   reparto del outline §6.2 le da sus 8 a `p_puente`, `a1_molino`, `a1_molino_pell` y `cl_molino`.
 *   Se lo caracteriza con los otros tres tics: empieza, se corrige, recita ordenanza numerada y no
 *   termina la frase.
 *
 * MARCO DE MEMORIA (biblia §9.1, outline §5/r08). Las cuatro variantes que cruzan el estado del
 * jugador están TODAS en párrafos de narrador, sin `speaker`:
 *   · `c1_cuerpo`     → `{ flag: 'char:vado.tome_enterrado' }`  base 24 / variante 21
 *   · `c1_acusacion`  → presentación de Orell, tres variantes: `visited` de las tres escenas del
 *     puente (lo viste esta misma noche) · `{ met: 'orell' }` (otra partida) · base
 *   · `a2_ley_torre`  → `{ visited: 'a2_ley_torre', min: 1 }` (se vuelve desde `a2_ley_guardia`)
 *   · `a2_ley_halvar` → `{ met: 'halvar' }`, la presentación de Halvar en una de las dos escenas
 *     donde puede debutar (la otra es `cl_molino`)                base 35 / variante 32
 * Ninguna es más larga que su base. PASADA DE VOZ HECHA A MANO sobre el agujero de r08 (Orell,
 * Ilse y Halvar viven en `world/` y el validador no los frena): los tres párrafos con
 * `speaker: 'orell'` (`a2_ley_orell`, `a2_ley_guardia`) y el de `speaker: 'halvar'`
 * (`a2_ley_halvar`) NO llevan `when`. Ilse nunca lleva `speaker` en este archivo: habla entre
 * comillas angulares dentro de párrafos de narrador, así que tampoco puede recordar.
 * Variantes por flag de partida (legales en cualquier párrafo): `run:cuerpo_hallado` y
 * `run:la_soga_cortada` en `c1_cuerpo`; `run:cuerpo_hallado`, `run:pell_amigo` y `run:pell_delato`
 * en `c1_acusacion`; `clock: pelea` y `wounds` en `c1_refriega`; `run:contra_la_ley` en
 * `a2_amanecer`; `run:cruzo_de_rama` en `a2_ley_orell`; `run:sabe_de_halvar` en `a2_ley_cartas`;
 * `run:berta_miente` en `a2_ley_berta`.
 *
 * TICS DE `sospecha`, todos nombrados en la ficción con sujeto concreto (biblia §2.5): el hombre
 * que carga sacos en la barca del norte y mira la tierra removida (`c1_cuerpo.enterrarlo`) · el del
 * brasero que sube a cargarlo sin que nadie se lo pida y el que anota la hora en la tablilla del
 * relevo (`a2_ley_orell`) · el cuerno de tinta que rueda y la orden de contar las cartas, y la
 * pregunta cortés de Dravos (`a2_ley_torre`) · la marca de dedo que no sale de la carta y el cabo
 * que te pregunta cuánto rato estuviste arriba (`a2_ley_cartas`) · el renglón del día en el libro
 * de rutas y el hombre de la barca que te mira la cara (`a2_ley_halvar`) · Berta que escuchó todo
 * desde abajo y el sereno del pozo que los ve salir juntos (`a2_ley_berta`) · el nombre y la hora
 * escritos en la tablilla de la guardia (`a2_ley_guardia.onEnter`).
 *
 * CANON RESPETADO, punto por punto:
 *   · Las piedras del vado son SIETE y la que falla es la CUARTA (prólogo). El cuerpo está entre la
 *     cuarta y la quinta; la banda de fallo de `revisar_el_cuerpo` se hunde en la cuarta; el plano
 *     de `buscar_el_mapa` tiene la cuarta marcada con una cruz.
 *   · `c1_cuerpo` cumple la regla de plano de la biblia §1.3: el cuerpo se cuenta DESDE TRES PASOS
 *     —ropa hinchada, manos, la soga, el olor— y no se nombra la cara. Nada de interior del cuerpo.
 *   · El `vio_el_sello` del cuerpo es el HUECO, no la piedra: el cincel con el filo volcado y el
 *     engarce vacío del cordón (biblia §3, "el hueco con la esquirla faltante junto al cuerpo").
 *     Lo que hizo Tomé no se explica ahí: eso es `la_verdad_de_tome` y se paga en `a2_ley_cartas`
 *     o en la escalera de Ilse.
 *   · Orell no vende su secreto en ninguna opción sin tirada. Su primera cuota es admitir que hay
 *     una orden escrita anterior al cierre del puente y cerrar con su fórmula: "Eso no te lo puedo
 *     decir". Nunca dice lo que vio ni que movió el cuerpo.
 *   · Dravos no filtra la venta: dice la aritmética de la guarnición (once meses de sueldo, catorce
 *     hombres) y nunca el precio en monedas, que es de Halvar (doce, ocho, nueve).
 *   · Berta miente sin que el texto la acuse: dice la versión de la carta "con las mismas palabras",
 *     repite la cifra dos veces y `run:berta_miente` no se enciende acá.
 *   · Nadie muere en estas diez escenas y ninguna es `lethal`.
 *
 * PRESUPUESTO MEDIDO (palabras escritas / celda `pal` del outline §2):
 *   `c1_cuerpo` 470/414 · `c1_acusacion` 486/448 · `c1_refriega` 485/504 · `a2_amanecer` 294/194 ·
 *   `a2_ley_orell` 364/304 · `a2_ley_torre` 424/370 · `a2_ley_cartas` 518/459 ·
 *   `a2_ley_halvar` 394/299 · `a2_ley_berta` 464/359 · `a2_ley_guardia` 217/90.
 *   Total 4.116 contra 3.441 (+19,6 %). Medido contando una variante por párrafo, la base sin
 *   `when`, que es lo que lee una partida. Descontando las dos celdas insatisfacibles de (a) y (b),
 *   son 3.605 contra 3.157 (+14,2 %).
 *
 * TRES ANOTACIONES PARA EL DISEÑO (no se tocó nada; se anota y se sigue).
 * (a) `a2_ley_guardia` = 90 palabras es INSATISFACIBLE, igual que `p_puente_amanecer` en el lote 1
 *     y por la misma causa: la celda `pal` coincide con la celda `text`, así que a las cinco
 *     opciones —cuatro libres, ninguna con tirada, y dos de ellas con el mismo `next`— les quedan
 *     CERO palabras, y §2.5 obliga a pagarlas con texto porque el texto es lo único que las
 *     distingue. El piso real es ~220 y ahí aterrizó esta versión. **Hay que subir la celda a ~220
 *     o convertir dos opciones en una.**
 * (b) `a2_amanecer` = 194 tiene el mismo problema más chico: 110 de `text` dejan 84 para seis
 *     opciones sin tirada, dos pares de las cuales comparten `next` sin `effects` distintos.
 *     Aterriza en ~280. Sugerencia: 280.
 * (c) `a2_ley_halvar` y `a2_ley_berta` se pasan un 33 % y un 26 % por la misma razón que el lote 1
 *     ya había anotado: la tabla presupuesta ~28 palabras de `outcome.text` y una escena de careo
 *     con dos voces fuertes no cierra un desenlace en menos de 35. No es capricho del escritor: el
 *     presupuesto de outcomes de la tabla está calculado sobre la media de la campaña y no sobre
 *     las escenas con PNJ declarados. Palanca de recorte disponible si hace falta: las cuatro
 *     opciones Fluff de `a2_ley_halvar` y `a2_ley_guardia` bajan 40 palabras sin perder nada.
 *
 * UNA ANOTACIÓN DE ESTRUCTURA QUE NO SE TOCÓ (biblia §10, invariante "≥1 Fluff/Spice por escena").
 * `a2_ley_guardia.dormir_hasta_el_relevo` y `.esperar_despierto_junto_al_brasero` comparten `next`
 * y no tienen `effects`: son dos Fluff puras y el texto es lo único que las separa. Está bien y
 * cumple §2.5 con el texto escrito, pero conviene saber que si alguna vez se recortan outcomes de
 * esta escena, esas dos opciones se vuelven idénticas en pantalla y hay que colapsarlas.
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
 * TENSIÓN QUE EL RECORTE DEJA A LA VISTA, y que conviene resolver en el diseño: las celdas de la
 * tabla §2 del outline y la banda de 20-60 palabras por desenlace de la biblia §2.3 **no se pueden
 * satisfacer las dos a la vez**. La tabla presupuesta 28 palabras por `outcome.text` y solo para
 * una parte de las opciones libres, así que entrar en la celda obliga a bajar de 20 en varios
 * desenlaces. Los avisos de `[bandas]` del linter subieron de 117 a 153 por eso: son el precio de
 * los 22 errores de presupuesto que quedaron en 0.
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
  text: [
    {
      variants: [
        {
          when: { flag: 'run:cuerpo_hallado' },
          text: 'Venís sabiendo. Lo que falta no es encontrarlo: es pararse al lado y ponerle nombre a una cosa que el agua movió once días.',
        },
        {
          text: 'Está entre la cuarta piedra y la quinta, atravesado contra la corriente, y el agua lo acomoda un poco cada vez que pasa.',
        },
      ],
    },
    'Lo mirás desde tres pasos. La ropa se le hinchó y tira de las costuras; las manos están abiertas y blancas, con los dedos para arriba. Sobre el agua hay un olor dulce que no es de río y llega en tandas, cuando el viento cambia.',
    {
      variants: [
        {
          when: { flag: 'run:la_soga_cortada' },
          text: 'La soga es la del pozo de la plaza: el corte fresco del brocal está en esta punta. Da dos vueltas al pecho y el nudo quedó afuera.',
        },
        {
          text: 'Una soga le da dos vueltas al pecho y sigue bajo el agua hasta un hierro clavado en la piedra. El nudo quedó afuera: no se enredó solo.',
        },
      ],
    },
    {
      variants: [
        {
          when: { flag: 'char:vado.tome_enterrado' },
          text: 'La última vez le abriste un pozo en la grava con las manos. La grava está lisa y él está donde estaba.',
        },
        {
          text: 'Río arriba, la rueda del molino sigue quieta. Del pueblo no bajó nadie: el camino de la orilla está sin pisar desde que llueve.',
        },
      ],
    },
  ],
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
            text: [
              'Le abrís el delantal sin darlo vuelta. En el bolsillo hay un cincel con el filo volcado. Del cuello le cuelga un cordón con un engarce vacío del tamaño de una uña, con polvo gris adentro.',
            ],
            effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
            next: 'c1_acusacion',
          },
          partial: {
            text: [
              'Te metés hasta la cintura y la corriente te lo saca de la mano dos veces. Alcanzás a verle el cordón y el engarce vacío antes de soltarlo. Salís con el río en las botas.',
            ],
            effects: [
              { set: 'run:vio_el_sello' },
              { milestone: 'ver_el_sello' },
              { addCondition: 'empapado' },
            ],
            next: 'c1_acusacion',
          },
          failure: {
            text: [
              'Apoyás la rodilla en la cuarta piedra y se hunde un palmo. Terminás sentado contra él, con el río empujándolos a los dos. Salís sin haberle abierto el delantal.',
            ],
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
        text: [
          'Cavás con las manos en la grava, arriba de la línea del agua, y lo arrastrás hasta el pozo. Del banco del norte, un hombre que carga una barca deja de cargar.',
        ],
        effects: [{ set: 'char:vado.tome_enterrado' }, { clock: 'sospecha', delta: 1 }],
        next: 'c1_acusacion',
      },
    },
    {
      id: 'desatar_la_soga',
      label: 'Desatar la soga que lo tenía ahí',
      outcome: {
        text: [
          'El nudo se hinchó y hay que abrirlo con el cuchillo. Cuando cede, el cuerpo gira y queda mirando río abajo. El hierro sigue clavado en la piedra.',
        ],
        next: 'c1_acusacion',
      },
    },
    {
      id: 'mirar_la_grava_de_la_orilla',
      label: 'Mirar la grava antes de que llueva más',
      outcome: {
        text: [
          'La lluvia llenó la mitad de las marcas. Quedan dos surcos de talones que bajan del camino y, al costado, pisadas hondas de alguien que caminaba para atrás.',
        ],
        next: 'c1_acusacion',
      },
    },
    {
      id: 'taparlo_y_volver_al_pueblo',
      label: 'Taparlo y volver al pueblo a decirlo',
      outcome: {
        text: [
          'Le tirás la capa encima y le trabás las puntas con dos piedras. El agua le levanta el borde igual. Subís sin darte vuelta.',
        ],
        next: 'c1_acusacion',
      },
    },
    {
      id: 'darle_el_ultimo_rito',
      label: 'Darle el último rito acá mismo',
      requires: { class: 'clerigo' },
      lockedHint: 'No es tu oficio despedir a un muerto.',
      outcome: {
        text: [
          'Lo sacás del agua antes de decir nada, porque el rito se dice en tierra. Le cerrás los dedos, le ponés grava a puñados y decís los nombres en el orden que te enseñaron.',
        ],
        effects: [{ set: 'char:vado.tome_enterrado' }],
        next: 'c1_acusacion',
      },
    },
    {
      id: 'cantar_el_responso',
      label: 'Cantar el responso que nadie se anima',
      requires: { trait: 'criado_en_el_templo' },
      lockedHint: 'Nadie te enseñó el responso.',
      outcome: {
        text: [
          'El responso es de tres voces y vos tenés una. Lo cantás igual, bajo, contra el agua. Te acordás de todos los renglones menos del último, que era el que perdonaba.',
        ],
        next: 'c1_acusacion',
      },
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
  text: [
    'Te suben a la plaza con la capa chorreando y la rueda de gente se arma sola. Bajo tantos pies el barro hace un ruido de succión cada vez que alguien cambia el peso.',
    {
      variants: [
        {
          when: { flag: 'run:cuerpo_hallado' },
          text: 'Lo que vos sabías lo sabe ahora la plaza entera. Nadie pregunta qué había en el vado: preguntan qué hacías vos ahí.',
        },
        {
          text: 'Nadie pregunta qué había en el vado. Preguntan, sin levantar la voz, qué hacías vos ahí.',
        },
      ],
    },
    {
      variants: [
        {
          when: {
            any: [
              { visited: 'p_puente', min: 1 },
              { visited: 'p_puente_rechazo', min: 1 },
              { visited: 'p_puente_amanecer', min: 1 },
            ],
          },
          text: 'Al sargento lo tenés visto de esta misma noche, del otro lado de los barriles. Acá está tres pasos detrás del capitán y no se mueve.',
        },
        {
          when: { met: 'orell' },
          text: 'Al sargento de la cicatriz lo conocés de antes de esta noche. Él no, y no te busca la cara.',
        },
        {
          text: 'Detrás del capitán hay un sargento de barba gris, con el gambesón gris y una cicatriz que le parte la ceja. No se mueve y no te saca los ojos de encima.',
        },
      ],
    },
    {
      speaker: 'dravos',
      variants: [
        {
          text: '—Catorce hombres buscaron once días. Llega uno de afuera y lo encuentra antes de que se le seque la capa. —Se saca un guante—. Nadie lo acusa. Corresponde tomarle el nombre y retenerlo.',
        },
      ],
    },
    {
      variants: [
        {
          when: { flag: 'run:pell_delato' },
          text: 'En la segunda fila está el chico del casco grande, con la cara de quien ya dijo lo que vio y no sabe cómo guardarlo.',
        },
        {
          when: { flag: 'run:pell_amigo' },
          text: 'En la segunda fila está el chico del casco grande. Cuando el capitán pregunta quién más bajó al vado, mira el barro y tarda.',
        },
        {
          text: 'La rueda de gente se cierra un paso. Nadie dice nada todavía: esperan a ver de qué lado se acomoda la alcaldesa.',
        },
      ],
    },
    {
      speaker: 'berta',
      variants: [
        {
          text: '—Mirá, yo te mandé a buscar a un hombre y me trajiste un muerto, y son sesenta y cuatro casas mirando esto. Hacé lo que te diga el capitán, que se ordena en dos días, y bueno.',
        },
      ],
    },
  ],
  choices: [
    {
      // FASE H · tarea 2. Era la salida gratis del cuello 1 y ahora cuesta la `carta_lacrada`: la
      // quinta manera de gastarla (biblia §5). El costo se anuncia en el `label`, porque el motor
      // deriva el `badge` del `requires` y esta opción no tiene. Es la escena más pública de la
      // campaña —Dravos, Berta y la ronda entera están en `npcs`—, así que al que se deja procesar
      // sin jugar ninguna carta se la encuentran igual, y pierde el beneficio de haberla mostrado él.
      //
      // LA PROSA NO NOMBRA LA CARTA, y no es descuido. Un jugador puede llegar acá sin ella —se
      // gasta de cinco maneras (biblia §5), y la ruta más muda la entrega en el puente—, así que el
      // narrador no puede afirmar que se la sacan. Y una variante `when: { item: 'carta_lacrada' }`
      // acá sería PROSA MUERTA: `choose` aplica los `effects` antes de resolver el texto
      // (`resolve.ts:265-267`), así que después del `take` la condición ya es falsa. Se describe el
      // cacheo, que es verdad siempre, y el efecto se encarga del resto.
      id: 'ceder',
      label: 'Bajar la voz y dejar que te palpen la capa',
      outcome: {
        text: [
          'Bajás la voz y decís el nombre, de dónde venís y para quién trabajás. Antes de anotar nada te palpan la capa por fuera y por dentro, y lo que encuentran no te lo devuelven.',
        ],
        effects: [{ take: 'carta_lacrada' }, { set: 'run:con_la_ley' }, { clear: 'run:contra_la_ley' }],
        next: 'a2_amanecer',
      },
    },
    {
      id: 'correr',
      label: 'Correr antes de que te rodeen',
      outcome: {
        text: [
          'Salís entre dos cuerpos antes de que la rueda se cierre y alguien te agarra la capa y se queda con un pedazo. Atrás, una voz grita que no tiren. Después es barro y pasos.',
        ],
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
        text: [
          'Plantás los pies y abrís los brazos, y el primero que te toca se lleva el codo. El capitán no levanta la voz: levanta dos dedos.',
        ],
        effects: [{ set: 'run:contra_la_ley' }, { clear: 'run:con_la_ley' }],
        next: 'c1_refriega',
      },
    },
    {
      id: 'callarte_y_escuchar',
      label: 'Callarte y escuchar quién dice qué',
      outcome: {
        text: [
          'El capitán habla de hombres y de días; la alcaldesa, de casas y de plata; el sargento no habla. Los tres dicen forastero y ninguno dice asesino.',
        ],
        next: 'a2_amanecer',
      },
    },
    {
      id: 'delatar_a_orell',
      label: 'Decir delante de todos lo que hizo Orell',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no te dio nada que usar en su contra.',
      outcome: {
        text: [
          'Decís que el sargento te dejó cruzar de noche y que sabía lo del molino. Orell no lo niega, y eso es lo peor que le podía pasar. Cuando la plaza se afloja, ya está mirando el agua.',
        ],
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
        text: [
          'Le buscás la cara y aguantás. El sargento se toma su silencio y después dice cuatro palabras: «Llegó anoche. Lo anoté yo». Alcanza para que al capitán le convenga tomarte el nombre.',
        ],
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
        text: [
          'Le ponés la carta en la mano con el lacre para arriba. Dravos la lee y después mira a la alcaldesa más de lo que dura una mirada. Se la guarda en el pecho. «Esto lo firmó ella. Corresponde archivarlo».',
        ],
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
  text: [
    {
      variants: [
        {
          when: { clock: 'pelea', gte: 1 },
          text: 'La línea se abrió y no se volvió a cerrar del todo. Del lado del pozo queda un hueco entre dos hombros, y los dos hombros lo saben.',
        },
        {
          text: 'Son seis y se ponen en línea sin que nadie se lo mande: tapan el callejón, el pozo y el barro del medio. El capitán se queda atrás, donde se ve todo.',
        },
      ],
    },
    'En el barro no se puede afirmar el pie: cada vez que cargás el peso, el talón se te va un dedo para atrás.',
    {
      variants: [
        {
          when: { wounds: { gte: 2 } },
          text: 'Respirás por la boca y el costado te contesta. Lo que queda de esto se mide en cuánto aguantes parado.',
        },
        {
          text: 'Orell está en la punta de la línea y no da un paso adelante. Tampoco da uno atrás.',
        },
      ],
    },
  ],
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
            text: [
              'Entrás con el hombro en la juntura de dos escudos y los dos se separan. Uno queda sentado en el barro con las manos vacías. El callejón se te abre entero.',
            ],
            effects: [{ clock: 'pelea', delta: 2 }],
            next: 'c1_refriega',
          },
          success: {
            text: [
              'Metés el antebrazo debajo de una barbada y empujás para arriba. El hombre suelta la lanza para no caerse. La línea se corre medio paso y no vuelve.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'c1_refriega',
          },
          partial: {
            text: [
              'Pasás pagando: alguien te cruza el asta de una lanza contra la boca del estómago y el aire se te va de una. Seguís adelante doblado.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
            next: 'c1_refriega',
          },
          failure: {
            text: [
              'Rebotás contra dos hombros que estaban esperando el envión. El barro te devuelve de rodillas y un talón de bota te encuentra el muslo.',
            ],
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
            text: [
              'Gritás «se va por el caz, se va por el caz» con la voz que usan ellos. Tres cabezas giran para el agua. Cuando vuelven, el hueco ya es tuyo.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'c1_refriega',
          },
          partial: {
            text: [
              'Te sale a medias: dos salen para el caz y el capitán manda dos atrás tuyo, por si acaso. Esos dos ya no te sueltan en toda la noche.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }, { addCondition: 'perseguido' }],
            next: 'c1_refriega',
          },
          failure: {
            text: [
              'El que tenés enfrente te deja terminar la orden y te contesta con el canto del escudo. Te mordés la lengua. La línea no se movió.',
            ],
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
            text: [
              'Tomás el terraplén de costado y te dejás ir sentado hasta el agua. El río está bajo y frío y te lleva veinte pasos antes de soltarte en los juncos.',
            ],
            effects: [
              { clock: 'pelea', delta: 2 },
              { set: 'run:contra_la_ley' },
              { clear: 'run:con_la_ley' },
            ],
            next: 'a2_amanecer',
          },
          partial: {
            text: [
              'Saltás mal y entrás de espaldas. El agua te da vuelta una vez y te escupe contra un poste del embarcadero. Salís con todo el peso del río encima.',
            ],
            effects: [
              { clock: 'pelea', delta: 2 },
              { addCondition: 'empapado' },
              { set: 'run:contra_la_ley' },
              { clear: 'run:con_la_ley' },
            ],
            next: 'a2_amanecer',
          },
          failure: {
            text: [
              'Te dan alcance antes del borde: un asta de lanza te cruza las canillas y el barro hace el resto. Volvés al medio de la plaza a la rastra.',
            ],
            effects: [{ wound: 1 }],
            next: 'c1_refriega',
          },
        },
      },
    },
    {
      // FASE H · tarea 2. Para llegar acá ya elegiste correr o resistirte: rendirte de golpe en
      // medio de la plaza, delante de Dravos y de la línea entera, es un cambio de conducta con
      // testigos concretos, y por eso paga +1 de `sospecha` (biblia §7.1: el tic se nombra en la
      // ficción y se le pone sujeto). El `label` lo anuncia con la fórmula de §10.
      id: 'rendirte',
      label: 'Abrir las manos y rendirte delante de todos',
      outcome: {
        text: [
          'Abrís las manos despacio, con los dedos separados, y las dejás donde todos las vean. La línea tarda en creerte. El capitán manda que no te peguen y el chico del casco anota la hora en que cambiaste de idea.',
        ],
        effects: [
          { clock: 'pelea', delta: 3 },
          { clock: 'sospecha', delta: 1 },
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
        text: [
          'Volvés sobre el hueco antes de que lo tapen y lo abrís con el hombro y la rodilla. El último que te queda enfrente elige no ser el que te para.',
        ],
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
        text: [
          'Le buscás la cara al sargento por encima de las lanzas. Orell se mete en el medio, de espaldas a vos. «Basta. Lo llevo yo». Nadie discute una orden así.',
        ],
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
  text: [
    'La plaza se vacía, y los últimos en irse son los que no tenían nada que hacer ahí. Queda la luz gris de antes del sol. Tenés las manos tan frías que el pulgar no encuentra la uña.',
    {
      variants: [
        {
          when: { flag: 'run:contra_la_ley' },
          text: 'Nadie te sigue. Eso no quiere decir que nadie sepa dónde vas a estar cuando se haga de día.',
        },
        {
          text: 'Te dejaron ir con el nombre anotado y la noche entera por delante, que es una manera de no dejarte ir.',
        },
      ],
    },
    'Se ven las tres salidas: la torre con luz arriba; el zaguán de la alcaldesa, entornado a deshora; y el caz del molino, por donde se sale sin que te vean.',
  ],
  choices: [
    {
      id: 'presentarte_en_la_torre',
      label: 'Presentarte en la torre por tu propio pie',
      outcome: {
        text: [
          'Cruzás el puente por el medio, con las manos a la vista. En la barricada no preguntan: ya saben adónde vas.',
        ],
        effects: [{ set: 'run:con_la_ley' }, { clear: 'run:contra_la_ley' }],
        next: 'a2_ley_orell',
      },
    },
    {
      id: 'esperar_el_relevo_y_entrar_con_orell',
      label: 'Esperar el relevo y entrar con Orell',
      outcome: {
        text: [
          'Aguantás bajo el arco y subís con el relevo. El sargento no te manda volver.',
        ],
        effects: [{ set: 'run:con_la_ley' }, { clear: 'run:contra_la_ley' }],
        next: 'a2_ley_orell',
      },
    },
    {
      id: 'buscar_a_ilse',
      label: 'Buscar a Ilse antes de que abran la plaza',
      outcome: {
        text: [
          'La encontrás cargando el carro a oscuras. Apoya el saco, se pone la capa y sale primero.',
        ],
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
        text: [
          'Bajás por el borde del caz. Los tablones resbalan y el agua suena hueca. Nadie te ve irte.',
        ],
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
        text: [
          'Las piernas te llevan antes que la cabeza: la trampilla, los ocho escalones, el olor a piedra fría. No vas a buscar: vas a confirmar.',
        ],
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
        text: [
          'Al chico lo encontrás en el poste de los bandos. «La orden está. Escrita, digo. La segunda ordenanza dice que un bando se exhibe, y este no…». Te señala la torre.',
        ],
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
 * Puerta de la rama A y primera cuota de la confesión de Orell.
 *
 * FASE H · tarea 2: el `onEnter` **ya no regala** `run:orell_confia`. Lo regalaba a cualquiera que
 * entrara por una opción libre de `a2_amanecer`, y ese flag es el que abre
 * `cl_dravos.que_orell_lo_detenga`: el clímax se cerraba sin tirar un dado con un flag que no se
 * había ganado nadie. Ahora la fuente de rama A es el **éxito** de `preguntarle_por_la_orden_escrita`,
 * igual que en el prólogo, donde solo el éxito de `convencer_a_la_guardia` lo enciende. El `clear` de
 * `run:orell_humillado` —su par mutuamente excluyente— viaja con el `set`, en la misma banda.
 * La cuota de biblia §7.2 se respeta: sigue habiendo una fuente por acto para el flag de relación.
 *
 * Lleva uno de los tres cruces de rama de la campaña, con su `requires: { not: … }`, su `clear` del
 * bando viejo y su +1 de `sospecha`.
 */
export const a2_ley_orell = {
  id: 'a2_ley_orell',
  kind: 'normal',
  place: 'torre_de_dravos',
  npcs: ['orell'],
  text: [
    'Adentro de la torre hace más frío que afuera. Orell te espera al pie de la escalera. Huele a tinta fresca a una hora en que nadie debería estar escribiendo, y el olor viene de arriba.',
    {
      variants: [
        {
          when: { flag: 'run:cruzo_de_rama' },
          text: 'Venís del otro lado y él lo sabe sin que se lo digas. No te lo cobra: te corre el banco con la bota.',
        },
        {
          text: 'Te hace sentar en el banco donde se sientan los que esperan, y se queda parado al lado tuyo.',
        },
      ],
    },
    {
      speaker: 'orell',
      variants: [
        {
          text: '—Arriba está el capitán Dravos. Baja cuando termine. —Mira la escalera—. Hay una orden escrita de antes de que cerráramos el puente. No es la del puente. Eso no te lo puedo decir.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'entrar_con_el_a_la_torre',
      label: 'Entrar con él a la sala de mando',
      outcome: {
        text: [
          'Subís los escalones detrás de él. Arriba la puerta está entornada y adentro hay alguien que no se levantó de la silla en toda la noche.',
        ],
        next: 'a2_ley_torre',
      },
    },
    {
      id: 'pedirle_ver_las_cartas',
      label: 'Pedirle ver las cartas de la mesa',
      outcome: {
        text: [
          'Le pedís ver lo que hay sobre la mesa y no te contesta que sí. Se corre del pie de la escalera, que es lo mismo.',
        ],
        next: 'a2_ley_cartas',
      },
    },
    {
      id: 'preguntarle_por_la_orden_escrita',
      label: 'Preguntarle por la orden que guarda',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          // La única fuente de `run:orell_confia` en la rama A (FASE H · tarea 2). El `clear` del par
          // viaja con el `set`: nadie sale de acá debiéndole a Orell y teniéndolo en contra.
          success: {
            text: [
              'No le pedís verla: le preguntás quién la firmó. Orell mira la escalera, mira el banco y termina diciéndote en qué mesa están las cartas.',
            ],
            effects: [{ set: 'run:orell_confia' }, { clear: 'run:orell_humillado' }],
            next: 'a2_ley_cartas',
          },
          partial: {
            text: [
              'Preguntás dos veces y la segunda la escucha el del brasero, que sube a cargarlo sin que se lo pidan. Orell te deja pasar, y ya no es un favor callado.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_cartas',
          },
          failure: {
            text: [
              'Insistís con el nombre del capitán delante de dos hombres y el sargento se calla, que es como se enoja. El más joven anota la hora en la tablilla del relevo.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_guardia',
          },
        },
      },
    },
    {
      id: 'quedarte_en_el_cuerpo_de_guardia',
      label: 'Quedarte en el cuerpo de guardia',
      outcome: {
        text: [
          'Te quedás en el banco. Entran dos del relevo, se sacan las botas y ninguno pregunta quién sos.',
        ],
        next: 'a2_ley_guardia',
      },
    },
    {
      id: 'irte_con_ilse_y_no_volver',
      label: 'Dejar la torre e irte con Ilse, y no volver',
      requires: { not: { flag: 'run:cruzo_de_rama' } },
      lockedHint: 'Ya elegiste de qué lado estás, y no hay vuelta.',
      outcome: {
        text: [
          'Salís por donde entraste y él no pregunta adónde. Ilse espera donde dijo. El hombre del relevo te mira salir y se acuerda de la hora.',
        ],
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
        text: [
          'Te lo dice sin adornos: un forastero, un muerto de once días y un nombre anotado dos veces la misma noche. El del brasero carga el mismo carbón dos veces.',
        ],
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
  text: [
    'Arriba, la sala de mando es una mesa larga y todo lo demás es pared. El brasero está cargado de más y cada tanto revienta un carbón: mientras dura ese ruido no se oye nada más.',
    {
      variants: [
        {
          when: { visited: 'a2_ley_torre', min: 1 },
          text: 'Sobre la mesa hay menos papel que hace un rato. Los rollos del vado siguen donde estaban.',
        },
        {
          text: 'Sobre la mesa hay cartas abiertas, rollos atados con cinta y un lacre verde que no es de esta guarnición. Debajo hay un cofre con dos cerraduras.',
        },
      ],
    },
    {
      speaker: 'dravos',
      variants: [
        {
          text: '—Sentate si querés. Hay once meses de sueldo atrasado en esa caja, y adentro no hay nada. —Vuelve a lo suyo—. Lo que falta entender no es quién mató al molinero: es qué hace un pueblo sin paso.',
        },
      ],
    },
  ],
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
            text: [
              'Esperás el carbón que revienta y en ese ruido cruzás hasta la mesa. Sacás la de arriba de todo, la del lacre verde, y salís antes de que el capitán levante la cabeza.',
            ],
            effects: [{ give: 'carta_de_halvar' }],
            next: 'a2_ley_cartas',
          },
          partial: {
            text: [
              'Te llevás la del lacre verde y también el codo contra el cuerno de tinta, que rueda y no se rompe. Dravos no se da vuelta. Al rato manda contar las cartas.',
            ],
            effects: [{ give: 'carta_de_halvar' }, { clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_cartas',
          },
          failure: {
            text: [
              'El carbón no revienta cuando lo necesitás. Dravos te habla sin darse vuelta y te pregunta, con toda cortesía, qué estabas por levantar de esa mesa.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }, { set: 'run:dravos_sabe' }],
            next: 'a2_ley_guardia',
          },
        },
      },
    },
    {
      // FASE H · tarea 2. `ver_el_sello` tenía DOS puertas gratuitas en la rama A —esta y
      // `a2_ley_cartas.buscar_el_mapa`— y una sola en la B. La que se cobra es esta, porque es la
      // única de las dos que tiene testigo: Dravos está declarado en `npcs` de esta escena y
      // `a2_ley_cartas` no declara a nadie, y la biblia §7.1 pide que cada tic de `sospecha` tenga un
      // sujeto que mire. La vía gratuita de la rama A queda en el mapa de las cartas.
      id: 'leer_el_sigilo_de_la_mesa',
      label: 'Leer el sigilo lacrado delante de Dravos',
      outcome: {
        text: [
          'El lacre verde no tiene armas: tiene un círculo con tres canales, como los de un molino. El mismo dibujo está al pie de otras dos cartas. Dravos pregunta, sin levantar la cabeza, cuál te interesó.',
        ],
        effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }, { clock: 'sospecha', delta: 1 }],
        next: 'a2_ley_cartas',
      },
    },
    {
      id: 'pedir_licencia_para_ver_a_la_alcaldesa',
      label: 'Pedir licencia para ir a ver a la alcaldesa',
      outcome: {
        text: [
          'Lo pedís en voz alta, delante del relevo, para que quede dicho. Dravos no dice que sí: dice que corresponde, y que vayas antes de que salga.',
        ],
        next: 'a2_ley_berta',
      },
    },
    {
      id: 'bajar_al_cuerpo_de_guardia',
      label: 'Bajar al cuerpo de guardia sin decir nada',
      outcome: {
        text: [
          'Bajás sin saludar. En la escalera te cruzás con el del brasero, que se pega a la pared.',
        ],
        next: 'a2_ley_guardia',
      },
    },
    {
      id: 'encarar_a_dravos',
      label: 'Encararlo por la piedra, en su propia torre',
      requires: { flag: 'run:vio_el_sello' },
      lockedHint: 'No viste la piedra: no tenés con qué encararlo.',
      outcome: {
        text: [
          'Le nombrás la piedra del sótano en su propia sala. Dravos deja la pluma y no la levanta más. «Entonces corresponde adelantar lo que estaba para pasado mañana». Manda que te acompañen.',
        ],
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
        text: [
          'Te ofrecés para la escolta de la barca del norte y decís la fórmula entera. Dravos te hace cargar la valija de las cartas, y en la puerta te quedás con una.',
        ],
        effects: [{ give: 'carta_de_halvar' }],
        next: 'a2_ley_cartas',
      },
    },
    {
      id: 'nombrar_su_grado_viejo',
      label: 'Nombrarlo por el grado que tenía antes',
      requires: { trait: 'desertor' },
      lockedHint: 'No sabés qué grado tenía Dravos antes.',
      outcome: {
        text: [
          'Le decís el grado que tenía antes de esta guarnición. Dravos no lo corrige. Por primera vez deja de reformular lo que decís antes de contestarte.',
        ],
        next: 'a2_ley_cartas',
      },
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
  text: [
    'Las cartas están en dos montones, los dos ordenados por fecha. El papel del otro lado del río es más liso y más frío al tacto, y no se dobla: se quiebra en el pliegue.',
    {
      variants: [
        {
          when: { flag: 'run:sabe_de_halvar' },
          text: 'El nombre que te dieron en el pueblo está acá abajo, firmado con dos plumas distintas. Sabías que había un mercader del otro lado; no que escribía tanto.',
        },
        {
          text: 'Todas las de papel liso están firmadas con el mismo nombre, uno que no se usa de este lado: Halvar. Ninguna dice qué se compra.',
        },
      ],
    },
    'Abajo hay rollos atados que no son cartas. La cinta de uno está gastada de abrirlo y volverlo a atar.',
    'El lacre del pie no es un adorno: tres líneas nacen de un punto y se repiten en cada carta.',
  ],
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
            text: [
              'Las leés por fecha y la historia se arma sola. Al octavo día el molinero mandó decir que la piedra del sótano estaba rota y que la rotura era suya. Debajo, una orden de la torre en sucio: que el molinero no hable.',
            ],
            effects: [{ milestone: 'la_verdad_de_tome' }],
            next: 'a2_ley_halvar',
          },
          partial: {
            text: [
              'Sacás en limpio lo del molinero y la piedra rota, pero para leer una fecha tenés que acercar la carta al brasero. Le dejás una marca de dedo que no sale.',
            ],
            effects: [{ milestone: 'la_verdad_de_tome' }, { clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_halvar',
          },
          failure: {
            text: [
              'El orden de las fechas no es el de los montones y se te va media vela sin sacar nada. Al bajar, el cabo del brasero te pregunta cuánto estuviste arriba.',
            ],
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
        text: [
          'El rollo de la cinta gastada es un plano del vado con las siete piedras. La cuarta tiene una cruz y, al lado, un círculo del que salen tres canales.',
        ],
        effects: [{ set: 'run:vio_el_sello' }, { milestone: 'ver_el_sello' }],
        next: 'a2_ley_halvar',
      },
    },
    {
      id: 'bajar_al_vado_a_ver_al_mercader',
      label: 'Bajar al vado a verle la cara al mercader',
      outcome: {
        text: [
          'Bajás por el terraplén con el nombre en la boca. Media legua abajo hay una barca amarrada y alguien despierto adentro.',
        ],
        next: 'a2_ley_halvar',
      },
    },
    {
      id: 'llevarle_a_berta_lo_que_leiste',
      label: 'Llevarle a Berta lo que acabás de leer',
      outcome: {
        text: [
          'Doblás la que puede probar algo y te la llevás contra las costillas. La casa de la alcaldesa tiene la lámpara encendida a una hora en que debería estar apagada.',
        ],
        next: 'a2_ley_berta',
      },
    },
    {
      id: 'reconocer_el_sigilo',
      label: 'Leer lo que dice el lacre',
      requires: { not: { flag: 'run:piedra_leida' } },
      lockedHint: 'Ese lacre ya te dijo todo lo que iba a decirte.',
      roll: {
        attr: 'saber',
        difficulty: 'dificil',
        tags: ['saber', 'magia'],
        advantageIf: { any: [{ class: 'mago' }, { skill: 'vista_arcana' }] },
        outcomes: {
          crit: {
            text: [
              'No es un escudo: es un plano. Los tres canales son los del piso de un sótano y el círculo del medio es el hueco donde va la piedra. Lo que cierra esa carta es la cosa que se vende.',
            ],
            effects: [{ set: 'run:piedra_leida' }, { set: 'char:vado.sabe_del_sello' }],
            next: 'a2_ley_halvar',
          },
          success: {
            text: [
              'Los tres canales del sigilo repiten un dibujo que se talla en el piso, alrededor de un hueco. Entendés para qué sirve una piedra así y por qué el río viene subiendo.',
            ],
            effects: [{ set: 'run:piedra_leida' }, { set: 'char:vado.sabe_del_sello' }],
            next: 'a2_ley_halvar',
          },
          partial: {
            text: [
              'Tenés que raspar el lacre para verle el fondo y salta en tres pedazos. Entendés qué hace la piedra. También dejaste una carta abierta que cualquiera va a encontrar.',
            ],
            effects: [
              { set: 'run:piedra_leida' },
              { set: 'char:vado.sabe_del_sello' },
              { clock: 'sospecha', delta: 1 },
            ],
            next: 'a2_ley_berta',
          },
          failure: {
            text: [
              'Mirás el sigilo hasta que las líneas se te mueven solas y no cierra: tres canales y un círculo podrían ser cualquier cosa. Cuando volvés a mirarlo ya no ves más que cera.',
            ],
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
        text: [
          'Volvés sobre la segunda línea, la que se repetía cada cinco signos. Acá está entera, en el margen de un plano: dice qué se cierra y qué se abre.',
        ],
        effects: [{ set: 'char:vado.sabe_del_sello' }],
        next: 'a2_ley_halvar',
      },
    },
    {
      id: 'leer_el_codigo_de_contrabando',
      label: 'Leer el código de contrabando del margen',
      requires: { trait: 'contrabandista' },
      lockedHint: 'Para vos esos números del margen no dicen nada.',
      outcome: {
        text: [
          'Los números del margen no son cuentas: son días de camino y peajes de tres puentes, anotados para no pagarlos. Uno de los tres no está construido.',
        ],
        next: 'a2_ley_halvar',
      },
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
  text: [
    'En el banco de grava del norte hay una barca chata amarrada a dos estacas, con brasero. Sale un olor a clavo de olor y a vino caliente que en este barro no tiene derecho.',
    {
      variants: [
        {
          when: { met: 'halvar' },
          text: 'Al del abrigo verde lo tenés visto: los anillos, las trencitas de la barba. Te hace lugar como a un conocido, y es la primera vez que hablan.',
        },
        {
          text: 'Sale a cubierta un hombre grande de abrigo verde, anillos de plata en tres dedos y la barba rubia trenzada. No te pregunta quién sos: te hace lugar.',
        },
      ],
    },
    {
      speaker: 'halvar',
      variants: [
        {
          text: '—Que llueva así, no me conviene. —Te alcanza un jarro sin preguntar—. Cerremos, amigo: doce monedas por pasar a un hombre y su bulto, y dos peajes río arriba que no vas a pagar. Barato no es. Caro tampoco.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'escuchar_su_oferta',
      label: 'Escuchar la oferta hasta el final',
      outcome: {
        text: [
          'Lo dejás terminar. Doce monedas, una barca antes del alba y una condición: que lo que cruce el río cruce envuelto y no se nombre.',
        ],
        next: 'a2_ley_berta',
      },
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
            text: [
              'Le contás las estacas, el calado y las tres noches que lleva amarrado, y le ponés precio. Halvar se ríe con la boca cerrada y baja a ocho. Te da la mano sin sacarse el anillo.',
            ],
            effects: [{ set: 'run:trato_con_halvar' }],
            next: 'a2_ley_guardia',
          },
          partial: {
            text: [
              'Cierran en nueve, y para cerrar tenés que darle tu nombre y el de quien te mandó. Lo anota en el libro de rutas, con letra chiquita.',
            ],
            effects: [{ set: 'run:trato_con_halvar' }, { clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_guardia',
          },
          failure: {
            text: [
              'Pedís de más y lo pedís dos veces. «Hablar, siempre se puede», dice, y se vuelve al brasero. Antes de bajar le dice algo a su hombre, que te mira la cara.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_berta',
          },
        },
      },
    },
    {
      id: 'preguntarle_por_tome',
      label: 'Preguntarle por el molinero, de frente',
      outcome: {
        text: [
          'No se le mueve la cara. «Conocerlo, no lo conocí. Comprarle harina, sí, dos años». Después atiende el brasero.',
        ],
        next: 'a2_ley_berta',
      },
    },
    {
      id: 'volver_sin_cerrar_nada',
      label: 'Volver a la torre sin cerrar nada',
      outcome: {
        text: [
          'Le devolvés el jarro y subís el terraplén. Atrás, el de la barca suelta una amarra y la vuelve a atar.',
        ],
        next: 'a2_ley_guardia',
      },
    },
    {
      id: 'cerrar_el_precio_ahora',
      label: 'Cerrar el precio ahora, con la mano',
      requires: { flag: 'run:sabe_de_halvar' },
      lockedHint: 'No sabés lo suficiente de él para apurarlo.',
      outcome: {
        text: [
          'Le ponés la mano adelante antes de que termine y él te la toma. Su hombre lo anota con tu nombre: acá todo lo que se cierra se escribe.',
        ],
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
        text: [
          'Le mostrás la fecha del pie y tapás el resto con el pulgar. Halvar la lee dos veces y no dice qué leyó. «Cerremos ahora, amigo. Después de esa fecha el precio se me pone raro».',
        ],
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
  text: [
    'Golpeás una vez sola y la puerta ya estaba por abrirse. Adentro la casa está seca y caliente y los mapas del río tapan la pared en capas. Arriba, alguien levanta un saco, lo apoya y lo vuelve a levantar: es lo único que se oye.',
    {
      speaker: 'berta',
      variants: [
        {
          text: '—Mirá, acá el problema no es de quién es la culpa: son sesenta y cuatro casas y dos inviernos, y las dos cosas se cuentan igual de rápido. Vos hiciste lo que te pagué. Dejá que el capitán haga lo suyo, y bueno.',
        },
      ],
    },
    'Ilse no bajó del todo. Está tres escalones arriba con un saco de harina entre las botas, y cada vez que su madre dice «el capitán» lo corre un dedo.',
    {
      variants: [
        {
          when: { flag: 'run:berta_miente' },
          text: 'Ya la pescaste una vez esta noche. No se le nota nada, y eso es lo que te dice de qué está hecha.',
        },
        {
          text: 'Habla de la paga sin que se la pidas y la dice dos veces, con la misma cifra las dos.',
        },
      ],
    },
  ],
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
            text: [
              'Subís dos escalones y te sentás, que era lo único que hacía falta. Ilse se saca del cuello un cordón con una esquirla gris del tamaño de una uña. «Se la arrancó él con el cincel. Yo le sostuve la escalera».',
            ],
            effects: [
              { give: 'medallon_de_tome' },
              { milestone: 'la_verdad_de_tome' },
              { set: 'run:ilse_confia' },
            ],
            next: 'a2_ley_guardia',
          },
          partial: {
            text: [
              'Te lo cuenta parada y de apuro, con la madre hablando abajo: la esquirla, el cincel, la noche que le sostuvo la escalera. Te pone el cordón en la mano y Berta pregunta qué le dio.',
            ],
            effects: [
              { give: 'medallon_de_tome' },
              { milestone: 'la_verdad_de_tome' },
              { clock: 'sospecha', delta: 1 },
            ],
            next: 'a2_ley_guardia',
          },
          failure: {
            text: [
              'Preguntás de más y preguntás desde abajo. Ilse se carga el saco al hombro y sube. «Esto pesa menos», dice, y cierra la puerta. A la mañana el capitán va a saber qué le fuiste a preguntar a su hija.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a2_ley_guardia',
          },
        },
      },
    },
    {
      id: 'escuchar_la_version_de_berta',
      label: 'Escuchar la versión de Berta sin cortarla',
      outcome: {
        text: [
          'La dejás hablar hasta el final. Once días, dos guardias que no entraron y una bolsa apartada: el mismo orden que la carta y las mismas palabras.',
        ],
        next: 'a2_ley_guardia',
      },
    },
    {
      id: 'acusarla_en_su_casa',
      label: 'Acusarla en su propia casa, y quemarla',
      outcome: {
        text: [
          'Se lo decís delante de la hija. Berta no se levanta ni sube la voz: junta los papeles y los da vuelta. «Esto es un desastre», dice, y manda a la torre.',
        ],
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'a2_ley_guardia',
      },
    },
    {
      id: 'irte_sin_decir_nada',
      label: 'Irte sin decir nada y dejarla hablando',
      outcome: {
        text: [
          'Te levantás en la mitad de una frase y salís. La puerta queda abierta y nadie la cierra.',
        ],
        next: 'a2_ley_guardia',
      },
    },
    {
      id: 'bajar_al_sotano_con_ilse',
      label: 'Bajar al sótano con Ilse, y no volver',
      requires: { not: { flag: 'run:cruzo_de_rama' } },
      lockedHint: 'Ya elegiste de qué lado estás, y no hay vuelta.',
      outcome: {
        text: [
          'Ilse baja el saco y no pregunta nada. En la puerta, Berta te saca la carta lacrada con dos dedos, como se recoge algo prestado. «Esto vuelve conmigo». Salen los dos al barro y el sereno los ve.',
        ],
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
        text: [
          'Preguntás qué hay abajo del molino. Ilse tarda un escalón en contestar. «Una piedra con canales. Y un hueco donde va». La forma del hueco ya la sabías.',
        ],
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
  text: [
    'Abajo, en el cuerpo de guardia, hay un banco largo, cuatro capas y un puchero que hierve desde dos relevos. Te dan un jarro con grasa.',
    'El farol queda en el poste: adentro no se entra con fuego propio. En la tablilla está tu nombre y la hora.',
    {
      speaker: 'orell',
      variants: [
        {
          text: '—Dormí. Dos relevos y oscurece. —Te tira una manta—. El agua subió un palmo desde ayer.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'dormir_hasta_el_relevo',
      label: 'Dormir lo que queda hasta el relevo',
      outcome: {
        text: [
          'Dormís de un tirón y despertás con la boca seca.',
        ],
        next: 'c2_anochece',
      },
    },
    {
      id: 'esperar_despierto_junto_al_brasero',
      label: 'Esperar despierto junto al brasero',
      outcome: {
        text: [
          'No dormís. Dos relevos: los que bajan hablan del agua.',
        ],
        next: 'c2_anochece',
      },
    },
    {
      id: 'volver_a_la_torre',
      label: 'Volver a subir a la sala de mando',
      outcome: {
        text: [
          'Subís con la excusa del jarro. La sala sigue entornada.',
        ],
        next: 'a2_ley_torre',
      },
    },
    {
      id: 'volver_a_casa_de_berta',
      label: 'Volver a golpear la puerta de Berta',
      outcome: {
        text: [
          'Cruzás el puente al revés. Lo de Berta sigue encendido.',
        ],
        next: 'a2_ley_berta',
      },
    },
    {
      id: 'pedirle_la_capa_a_orell',
      label: 'Pedirle a Orell la capa seca del perchero',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell todavía no te presta ni la hora.',
      outcome: {
        text: [
          'Orell te tira una capa seca.',
        ],
        effects: [{ removeCondition: 'empapado' }],
        next: 'c2_anochece',
      },
    },
  ],
} satisfies Scene;
