import type { Scene } from '@/content/schema';

/**
 * LOTE 7 — Clímax y finales de "El vado de Aldamar" (outline §2, tablas "Clímax" y "Finales").
 *
 * Ocho escenas: `cl_molino`, `cl_dravos` (encounter), `cl_halvar`, `cl_desenlace` y los cuatro
 * finales `fin_hundido`, `fin_dravos`, `fin_crecida`, `fin_heredero`.
 *
 * PROSA ESCRITA. La estructura quedó intacta respecto del esqueleto: no se tocó ni una `choice`, ni
 * un `label`, ni un `requires`, ni un `lockedHint`, ni un `roll`, ni un `effects`, ni un `next`, ni
 * un `redirect`, ni un `onEnter`, ni un `npcs`, ni un `place`, ni un `variant`. Lo único que entró
 * acá es texto: los `text` de escena, las bandas de las nueve tiradas, los `outcome.text` de las
 * opciones sin tirada y los cuatro epílogos.
 *
 * Invariantes de este módulo, en el orden en que se rompen si alguien no las lee:
 *
 * 1. **`cl_dravos` está en 9 opciones = `LIMITS.maxChoices`. NO ADMITE NI UNA OPCIÓN MÁS, NUNCA**
 *    (outline §5/r03 y §8.3). Si un lote necesita algo nuevo acá, saca otra cosa primero.
 * 2. **La piedra está en el molino en toda ruta** (biblia §1.2): ninguna opción de `cl_desenlace`
 *    usa `{ item: 'sello_del_vado' }` como `requires`. El objeto cambia el precio, nunca el acceso.
 * 3. **`cl_molino.onEnter` resetea el reloj `pelea`** con `{ clock: 'pelea', delta: -3 }`:
 *    `applyClock` clampea a `[0, max]`, así que el clímax arranca en cero se haya peleado o no en
 *    el cuello 1.
 * 4. **PNJ declarados = presentes en TODA ruta** (outline §7, conflicto 12). Por eso `cl_molino` y
 *    `cl_halvar` no declaran a Ilse (viene con `run:con_ilse`) y `cl_dravos` no declara a Orell
 *    (viene con `run:orell_confia`): a los dos los nombra el narrador, sin `speaker`. `cl_desenlace`
 *    sí declara a `ilse`, `berta` y `orell`.
 * 5. **Ningún `set`/`clear` sobre espacio compartido.** Los cuatro finales escriben `char:vado.*` y
 *    `world:vado.*`, que son de la campaña; `char:met.*`, `char:place.*` y `world:caido.*` los
 *    deriva el motor y acá solo se leerían.
 * 6. **`fin_heredero` no hace `give` de la reliquia**: la entrega `endings.fin_heredero.reward` en
 *    `campaign.ts` (y hoy `endRun` todavía no lo aplica — tarea abierta, biblia §13.1).
 * 7. Las escenas del clímax que vuelven a sí mismas llevan `onEnter` con hito o reloj, que es lo que
 *    corta los bucles de `outcome` (`cl_dravos → cl_dravos`) en el test de contenido. Desde la
 *    Fase H, `cl_desenlace` ya no lleva `onEnter`: no vuelve a sí misma y su hito se mudó a los
 *    cuatro finales.
 *
 * PASADA DE VOZ HECHA A MANO (outline §5/r08 c; r08 NO la frena porque los tres viven en `world/`):
 * ningún párrafo con `speaker` de **Halvar** (`cl_halvar`), de **Orell** o de **Ilse**
 * (`cl_desenlace`) lleva `met`, `knows`, `endingSeen` ni `char:vado.*`. Los tres únicos ejes que
 * varían en boca de un PNJ en este archivo son flags `run:` y el reloj `pelea`, que son de esta
 * misma partida y por lo tanto legales (biblia §9.1):
 *   · `cl_molino` → Pell varía por `run:mausi_informo`
 *   · `cl_dravos` → Dravos varía por `{ clock: 'pelea', gte: 1 | 2 }` (las tres rondas)
 *   · `cl_desenlace` → Berta varía por `run:berta_miente`
 * Las dos variantes de **memoria** del bloque son párrafos de **narrador**, sin `speaker`:
 *   · `cl_molino`    → `{ met: 'halvar' }`             base 43 / variante 37  (debut de Halvar, biblia §3)
 *   · `cl_desenlace` → `{ endingSeen: 'fin_crecida' }` base 35 / variante 27  (la cuota de biblia §9.1)
 * Las dos cumplen la regla congelada del lote 1: **una variante de memoria nunca es más larga que la
 * base que reemplaza**, y las dos cambian el foco (el que vuelve no mira, se acuerda con las manos).
 *
 * Detalles sensoriales (uno por escena, ninguno visual del todo, ninguno repetido, ninguno en un
 * párrafo con variante de memoria). El molino tiene diez escenas y su firma —el caz golpeando bajo
 * el piso de tablones— se gastó en el acto 1, así que las cuatro de acá tiran de otra cosa:
 *   · `cl_molino`    tacto  — el agua de adentro te pasa el tobillo y está más tibia que la del río
 *   · `cl_dravos`    oído   — el eje chilla una vez por vuelta y el ruido se mete por los dientes
 *   · `cl_halvar`    olfato — el lacre caliente huele a miel quemada y queda en la garganta
 *   · `cl_desenlace` tacto  — el agua del sótano sube sin ruido: avisa por la ropa, no por el oído
 *   · `fin_hundido`  tacto  — el frío de las piernas bajando junto con el agua
 *   · `fin_dravos`   oído   — los remos envueltos en trapo, que entran sin ruido
 *   · `fin_crecida`  tacto  — el temblor del piso en las rodillas antes de que suba el agua
 *   · `fin_heredero` tacto  — el caz empujándote el pecho a cada paso, contra la corriente
 *
 * Arranques (tres primeras palabras del texto base): `cl_molino` "Adentro el agua" · `cl_dravos`
 * "El molino queda" · `cl_halvar` "Halvar corre una" · `cl_desenlace` "Bajás la escalera" ·
 * `fin_hundido` "Encaja con un" · `fin_dravos` "Cruzan antes del" · `fin_crecida` "Ilse sube con" ·
 * `fin_heredero` "Salís de la". Las ocho primeras palabras son distintas entre sí, ninguna está en
 * la lista de quemados de §2.7 y ninguna coincide con la de una escena a la que esta apunta.
 *
 * Cupos gastados por este lote: `usted` ×2 escritos (Pell en `cl_molino`, **uno por variante**: uno
 * en la banda base y uno en la de `run:mausi_informo`). **Costo declarado**: como las dos variantes
 * son mutuamente excluyentes, **una partida lee UNO**, no los dos que el outline §6 le reparte a
 * esta escena para que el tic definitorio de Pell no se adelgace justo en el clímax. La versión
 * anterior escribía dos en cada variante —una partida leía dos, que es lo que el reparto quiere—
 * pero el linter cuenta lo **escrito** y no lo leído, veía 4 y hacía saltar el cupo de campaña a 10
 * de 8. Mientras el cupo se mida sobre lo escrito, las dos cosas no se pueden tener a la vez; esta
 * es la mejor disponible y se paga en voz. Puteadas: 0
 * (Dravos, Halvar, Orell y Berta las tienen prohibidas por §1.4, Pell nunca termina una, e Ilse gasta
 * las suyas en el acto 2). Adverbios en -mente: 0. `muy`: 0. `de repente`/`de pronto`: 0.
 * `parece que`: 0. `como si fuera`: 0. `no podés evitar`: 0. Enumeración de tres: 1 (`fin_crecida`).
 * Oración sin verbo: 0 (ninguna hacía falta; el cupo de una por escena queda sin gastar).
 *
 * CINCO ANOTACIONES PARA EL DISEÑO (no se tocó nada; se anota y se sigue).
 * (a) **`run:sello_escondido` contra la invariante 2.** Biblia §1.2 dice que la piedra está en el
 *     molino en TODA ruta, pero `c2_otra_orilla.dejar_el_sello_en_la_cadena` y el fallo de
 *     `levantar_la_cadena` la dejan atada en el agua, y el outline §5 dice que "lo leen los cuatro
 *     epílogos". Las dos cosas no pueden ser ciertas a la vez. **Resuelto en prosa, sin tocar
 *     estructura**: `cl_desenlace` lleva una variante de narrador por `{ flag: 'run:sello_escondido' }`
 *     que dice que la subieron de la cadena antes que vos, siguiendo el hierro con la mano. Así la
 *     piedra está al lado del zócalo igual y la invariante se sostiene. **Conviene escribirlo en la
 *     biblia §1.2 en vez de dejarlo colgado de un párrafo.**
 * (b) **El epílogo de `fin_hundido` no puede distinguir "usó el medallón" de "nunca lo tuvo".** Las
 *     bandas `crit` y `success` de `devolver_el_sello_a_la_piedra` hacen `take` del medallón, así que
 *     después del final las dos rutas lo tienen igual de ausente. La única condición honesta que
 *     queda es `{ item: 'medallon_de_tome' }`, y significa **"la esquirla te quedó en la mano"**: por
 *     ahí entra el epílogo del sello que cerró con un hueco (biblia §5). El caso "nunca lo tuviste"
 *     cae en la base, que no promete que haya cerrado bien ni afirma que haya cerrado mal.
 * (c) **La celda `cl_molino` = 331 palabras no cierra, por la misma razón que `p_puente_amanecer`.**
 *     La tabla mide palabras **escritas**, no leídas, y esta escena escribe: `text` base 150, tres
 *     variantes condicionadas (memoria de Halvar, `run:dravos_sabe`, `run:mausi_informo`) que la
 *     tabla no le presupuesta acá sino en la línea global de variantes, tres bandas de tirada y
 *     **seis** `outcome.text` de opciones cuyo único cambio posible es el texto (§2.5 obliga a
 *     pagarlas). **FASE H · tarea 4**: medido con el piso aritmético del outline §2.1, el mínimo de
 *     esta celda son 335 palabras contra un `pal` de 331 — se pasa por cuatro, pero entra holgada en
 *     la tolerancia del 25 %, así que es una celda **exigente y no rota**, y por eso NO se tocó: la
 *     escena mide 397 contra 331 (+20 %) con seis desenlaces de 17 a 30 palabras. **Sigue en pie la
 *     recomendación: mover las variantes de flag del clímax (180 palabras en §3) a las escenas que
 *     las llevan, que es de donde sale el exceso.**
 * (d) **Presupuesto medido, escena por escena** (palabras escritas, contando todas las variantes y
 *     sin contar `label` ni `lockedHint`), DESPUÉS del recorte de la Fase H · tarea 4: `cl_molino`
 *     397/331 · `cl_dravos` 695/695 · `cl_halvar` 506/515 · `cl_desenlace` 570/571 · `fin_hundido`
 *     261/300 · `fin_dravos` 257/300 · `fin_crecida` 284/300 · `fin_heredero` 252/300. Clímax 2.168
 *     contra 2.112; finales 1.054 contra 1.200. **Total del lote 3.222 contra 3.312 (−2,7 %)**;
 *     antes del recorte eran 3.626 (+9,5 %).
 *     Ritmo medido sobre las 289 oraciones del lote: media **12,5**, mediana 12, máximo **30**, cero
 *     oraciones de 31 o más, y **las nueve de más de 22 palabras llevan dos puntos**, como pide §1.2
 *     de la guía de voz.
 * (e) **`cl_desenlace.subir_y_dejar_que_el_agua_decida` no hacía `take` del `sello_del_vado`.** Las
 *     otras seis opciones de la escena sí lo hacen, así que esa era la única ruta en la que el
 *     jugador llegaba a un final **con la piedra todavía en la mochila** mientras el epílogo contaba
 *     que la usó Ilse. **SALDADO en la Fase H · tarea 2**: la opción hace el `take` y su `label` dice
 *     que la piedra se queda abajo.
 *
 * ---------------------------------------------------------------------------------------------
 * FASE H · TAREA 2 — "que ceder cueste algo". Lo que cambió de estructura en este archivo:
 *   1. `cl_halvar.bajar_al_sotano_sin_contestar` → `{ clock: 'sospecha', delta: 1 }` y `label` que
 *      lo anuncia. Es el único tic de `sospecha` nuevo del clímax.
 *   2. `cl_desenlace.subir_y_dejar_que_el_agua_decida` → `{ take: 'sello_del_vado' }`, la nota (e).
 *   3. El hito `cerrar_la_cronica` se mudó de `cl_desenlace.onEnter` al `onEnter` de los CUATRO
 *      finales: se marcaba antes de elegir el final, así que premiaba bajar una escalera. Ahora
 *      marca haber cerrado algo, y una partida que se pierde en el clímax ya no se lo lleva.
 *
 * SEGUNDA VUELTA, la que salió de la medición y no de la tabla. La traza del simulador mostró que la
 * ruta de la política prudente entra al clímax por `cl_molino.encarar_a_dravos` y sale de él por
 * `cl_dravos.huir_escaleras_abajo`, y que ninguna de las dos cobraba nada:
 *   4. `cl_molino.encarar_a_dravos` → `{ addCondition: 'perseguido' }`. Era la primera libre del
 *      clímax y la única de sus cuatro libres sin costo. El primer intento cobró `run:dravos_sabe`
 *      y era decorativo: nada lee ese flag después de esta escena. Ahora se paga la salida, y la
 *      lee la única tirada con tag `huida` del encuentro.
 *   5. `cl_dravos.huir_escaleras_abajo` → `empapado` en el éxito y `{ wound: 1 }` en el parcial. Era
 *      la ÚNICA salida del encuentro que no movía el reloj `pelea` y no cobraba nada: las otras
 *      cinco piden haber peleado, la piedra, el flag de Orell, una Herida o quedar Agotado.
 *   6. `cl_dravos.apagar_la_runa_un_latido` [Mago] → `{ wound: 1 }`, además del `agotado` que ya
 *      tenía. `agotado` es tag `magia` y en el clímax no hay ni una tirada con ese tag: no lo leía
 *      nadie. Ahora paga la misma moneda que `trabar_el_eje` [Guerrero], su hermana de escena.
 * Ninguna cobra `sospecha`.
 *
 * UNA TRAMPA DEL MOTOR, PARA QUE NADIE LA REPITA: `choose` y `commitRoll` aplican los `effects`
 * ANTES de resolver el texto del desenlace (`resolve.ts:265-267` y `473-489`). Una variante
 * `when: { item: X }` dentro del desenlace de una opción que hace `take: X` NO SE DISPARA NUNCA.
 * La nota (c) de `scenes/acto2_fuera.ts` documenta ese patrón como solución y no lo es: la variante
 * de `c2_vado_crecido.cruzar_de_frente.partial` es prosa muerta. Queda anotado en el informe.
 * Ninguna opción se sacó, ninguna ganó `requires` y ningún `next` se movió: la cuenta `opc`/`libres`
 * del outline §2 no cambia. `cl_dravos` no se tocó: es la única de las diez bisagra que ya estaba
 * bien, porque no tiene ninguna opción sin tirada y sin `requires`.
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

// ---------------------------------------------------------------------------
// Clímax — el molino inundado
// ---------------------------------------------------------------------------

/** 7 opciones / 4 libres · 1 tirada. Entrada única del clímax; resetea el reloj `pelea`. */
export const cl_molino = {
  id: 'cl_molino',
  kind: 'normal',
  place: 'molino_de_tome',
  variant: 'inundado',
  npcs: ['dravos', 'halvar', 'pell'],
  onEnter: [{ clock: 'pelea', delta: -3 }],
  text: [
    'Adentro el agua te pasa el tobillo y está más tibia que la del río: lleva dos días encerrada. La rueda gira sin carga y la harina hace grumos en las paredes.',
    {
      variants: [
        {
          when: { met: 'halvar' },
          text: 'Al mercader ya lo conocés: la barba trenzada, los anillos, el maletín al pecho. Vino a cobrar lo que ya es suyo.',
        },
        {
          text: 'Contra la pared hay una mesa seca sobre caballetes y dos hombres. Uno es el capitán: sobretodo índigo, guantes en el cinto, sin una gota. El otro, barba trenzada y anillos de plata.',
        },
      ],
    },
    {
      variants: [
        {
          when: { flag: 'run:dravos_sabe' },
          text: 'El capitán levanta la cabeza antes de que termines de entrar. El lacre ya está derretido y el papel abierto. Te esperaban.',
        },
        {
          text: 'Ninguno de los dos mira la puerta. Sobre la mesa hay un papel abierto y una cuchara de lacre apagada. Al lado, un saco con algo del tamaño de un ladrillo.',
        },
      ],
    },
    {
      speaker: 'pell',
      variants: [
        {
          when: { flag: 'run:mausi_informo' },
          text: '—Su nombre subió a la torre el martes. Yo no lo mandé. —Se acomoda el casco—. La undécima ordenanza dice que usted no…',
        },
        {
          text: '—Pase. Digo, no pase. —Baja la lanza y la vuelve a subir—. La undécima ordenanza dice que usted no puede estar acá, y yo tampoco.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'escuchar',
      label: 'Escuchar desde atrás de los sacos de harina',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo', 'percepcion'],
        outcomes: {
          // FASE «objetivos» · tarea 4, caso 3: lo que Halvar dice en voz alta ES la definición de
          // `run:sabe_de_halvar` («hay un mercader del otro lado metido en esto»), y el flag ya
          // existía sin que esta banda lo encendiera. Es la TERCERA fuente, y la biblia §7.2 sólo
          // la admite en el clímax y pagando: ésta se paga con una tirada. No es un cobro
          // decorativo: `cl_halvar` —a donde va esta banda— lo lee en el `advantageIf` de
          // `leerle_el_libro_de_rutas`.
          success: {
            text: [
              'Te metés entre los sacos y aguantás la respiración. Halvar cuenta en voz alta: entre su casa y el vado hay tres peajes y el del medio es suyo.',
            ],
            effects: [{ set: 'run:sabe_de_halvar' }],
            next: 'cl_halvar',
          },
          partial: {
            text: [
              'Escuchás la mitad. Dravos habla de once meses y catorce hombres, y baja la voz donde importa. Un saco cede bajo tu rodilla y calla.',
            ],
            next: 'cl_halvar',
          },
          // El fallo enciende `run:dravos_sabe` (flags.ts: "el fallo de cl_molino.escuchar").
          failure: {
            text: [
              'El tablón que pisás devuelve el agua y el ruido llena el molino. Halvar cierra el maletín y el capitán se corre: te deja ver qué hay encima.',
            ],
            effects: [{ set: 'run:dravos_sabe' }],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      // FASE H · tarea 2, segunda vuelta. Era la primera libre del clímax y la única de las cuatro
      // que no cobraba nada.
      //
      // El primer intento cobró `{ set: 'run:dravos_sabe' }` y ERA UN COBRO DECORATIVO: nada lee ese
      // flag después de esta escena. Su único `requires` (`interrumpir_antes_de_que_firmen`) y su
      // única variante viven acá mismo y se evalúan antes de elegir; `cl_dravos`, `cl_halvar`,
      // `cl_desenlace` y los cuatro epílogos no lo miran. Un costo que nadie lee no es un costo.
      //
      // Lo que se cobra ahora es lo que la escena contrapone: `escuchar` es quedarse tapado detrás
      // de los sacos y esta es salir al claro. El que sale al claro no se vuelve a escabullir.
      // `perseguido` es tag `huida`, y el encuentro tiene exactamente una tirada con ese tag
      // (`cl_dravos.huir_escaleras_abajo`): el precio se paga en la escena siguiente.
      id: 'encarar_a_dravos',
      label: 'Encarar a Dravos y quedarte sin puerta atrás',
      outcome: {
        text: [
          'Salís al claro y decís lo que viniste a decir. Dravos no levanta la voz: dobla el papel y busca los guantes. Pell se corre a la puerta y se queda ahí, con la lanza cruzada.',
        ],
        effects: [{ addCondition: 'perseguido' }],
        next: 'cl_dravos',
      },
    },
    {
      id: 'sentarte_a_la_mesa_con_halvar',
      label: 'Sentarte a la mesa con Halvar',
      outcome: {
        text: [
          'Corrés un cajón con el pie y te sentás sin que te ofrezcan. Halvar te mira las botas. «Amigo».',
        ],
        next: 'cl_halvar',
      },
    },
    {
      id: 'llamar_a_pell_aparte',
      label: 'Llamar a Pell aparte',
      outcome: {
        text: [
          'Lo llevás dos pasos hacia la puerta. Contesta mirando la mesa, y esa es toda la respuesta.',
        ],
        next: 'cl_dravos',
      },
    },
    {
      // Exclusiva de quien cruzó el vado de frente: es la única ruta que llega sin `run:dravos_sabe`.
      id: 'interrumpir_antes_de_que_firmen',
      label: 'Interrumpirlos antes de que firmen',
      requires: { not: { flag: 'run:dravos_sabe' } },
      lockedHint: 'Dravos ya sabe que estás acá: no hay sorpresa.',
      outcome: {
        text: [
          'Entrás hablando y la cuchara del lacre queda a mitad de camino. Halvar cierra el libro con un dedo adentro.',
        ],
        next: 'cl_halvar',
      },
    },
    {
      id: 'rendirte_de_entrada',
      label: 'Rendirte de entrada y bajar las manos',
      requires: { flag: 'run:acusado' },
      lockedHint: 'Nadie te acusó de nada todavía.',
      outcome: {
        text: [
          'Bajás las manos y las dejás a la vista. Dravos reformula lo que no dijiste: que venís a entregarte. Pide la cuerda.',
        ],
        effects: [{ set: 'run:dravos_sabe' }],
        next: 'cl_dravos',
      },
    },
    {
      id: 'mandar_a_ilse_al_sotano',
      label: 'Mandar a Ilse al sótano mientras hablás',
      requires: { flag: 'run:con_ilse' },
      lockedHint: 'Ilse no está en el molino.',
      outcome: {
        text: [
          '«La escalera la conozco mejor que vos», te contesta, y ya está bajando con el farol pegado al cuerpo.',
        ],
        next: 'cl_halvar',
      },
    },
  ],
} satisfies Scene;

/**
 * ENCOUNTER · 3 rondas · **9 opciones / 4 libres · 4 tiradas**.
 *
 * ⚠ NUEVE ES `LIMITS.maxChoices`: esta escena está cerrada y no admite ninguna opción más.
 *
 * r06 se satisface con las cuatro libres solas: 3 atributos distintos (Vigor, Astucia, Presencia),
 * cinco opciones sin tirada y `huir_escaleras_abajo` con tag `huida`. Las dos `[Clase]` no cuentan.
 * La salida del bucle está por partida doble: el `redirect` sobre `pelea >= 3` y `rematarlo`, con
 * `requires: { clock: 'pelea', gte: 2 }`.
 *
 * Dravos no muere en escena (biblia §3): queda roto, preso, degradado o huido.
 *
 * Las tres rondas se distinguen con variantes encadenadas por `{ clock: 'pelea', gte: … }`, que es
 * estado de esta partida y por lo tanto legal en boca de Dravos. Como el `redirect` dispara en 3,
 * `gte: 2` es la tercera ronda y la última que se renderiza. El detalle sensorial vive en la banda
 * base (ronda 1), que toda ruta lee al entrar porque `cl_molino` dejó el reloj en cero.
 */
export const cl_dravos = {
  id: 'cl_dravos',
  kind: 'encounter',
  place: 'molino_de_tome',
  variant: 'inundado',
  // Orell NO va acá: su presencia depende de `run:orell_confia` y lo nombra el narrador.
  npcs: ['dravos'],
  redirect: [{ when: { clock: 'pelea', gte: 3 }, to: 'cl_desenlace' }],
  onEnter: [{ milestone: 'enfrentar_a_dravos' }],
  text: [
    {
      variants: [
        {
          when: { clock: 'pelea', gte: 2 },
          text: 'El capitán está de rodillas en el agua y hay una mano que no le cierra. No pide nada. Atrás, el mercader calcula cuánto le cuesta quedarse.',
        },
        {
          when: { clock: 'pelea', gte: 1 },
          text: 'Dravos se corre de la mesa y busca donde el piso no cede. La muela gira sin nada que moler y el agua le llega a él también.',
        },
        {
          text: 'El molino queda partido en dos: la mesa seca y el palmo de agua donde estás vos. El eje chilla una vez por vuelta y el ruido se te mete por los dientes.',
        },
      ],
    },
    {
      speaker: 'dravos',
      variants: [
        {
          when: { clock: 'pelea', gte: 2 },
          text: '—Lo que falta entender es que esto se paga igual. Con la piedra, o con catorce hombres puestos en tu camino.',
        },
        {
          when: { clock: 'pelea', gte: 1 },
          text: '—Acá adentro nadie va a gritar. Corresponde terminar esto y firmar antes de que aclare.',
        },
        {
          text: '—Lo que entró por esa puerta es un problema de orden. Once meses sin paga tienen catorce hombres. Hay que resolverlo antes de que baje el agua.',
        },
      ],
    },
    {
      variants: [
        {
          when: { flag: 'run:orell_confia' },
          text: 'En el umbral está el sargento, con la ballesta al hombro, y no entra. Mira el agua y no a vos.',
        },
        { text: 'Afuera, en el umbral, el chico se quedó sin decidirse.' },
      ],
    },
  ],
  choices: [
    {
      id: 'cargarlo',
      label: 'Cargarlo contra la mesa',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: [
              'Lo cruzás contra el canto de la mesa antes de que saque los guantes. El papel se va al agua y el capitán atrás. Se levanta escupiendo harina.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'cl_dravos',
          },
          partial: {
            text: [
              'Entran los dos al agua y ahí no hay orden que valga. Le arrancás el saco y él te encuentra la oreja con el codo.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
            next: 'cl_dravos',
          },
          failure: {
            text: [
              'Calculás mal el palmo de agua y el pie se te queda atrás. Dravos se corre y te deja pasar de largo. La esquina de la mesa te encuentra las costillas.',
            ],
            effects: [{ wound: 1 }],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      id: 'usar_la_maquinaria',
      label: 'Soltar la muela y usar el molino contra él',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        advantageIf: { item: 'farol_de_sebo' },
        outcomes: {
          success: {
            text: [
              'Soltás la traba del eje con las dos manos. La muela baja de golpe y se lleva los caballetes. El capitán queda del otro lado de una piedra que gira.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'cl_dravos',
          },
          partial: {
            text: [
              'Te colgás de la palanca con todo el cuerpo y el eje cede tarde. La muela agarra el saco y no a él. Quedás sin aire contra el tablón.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }, { addCondition: 'exhausto' }],
            next: 'cl_dravos',
          },
          failure: {
            text: [
              'La traba no es la que pensabas. El eje sigue y la correa te lleva la mano contra el brocal: la sacás con un dedo que no dobla.',
            ],
            effects: [{ wound: 1 }],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      id: 'quebrarle_la_moral',
      label: 'Quebrarle la moral delante de sus hombres',
      roll: {
        attr: 'presencia',
        difficulty: 'dificil',
        tags: ['social'],
        outcomes: {
          // Único `crit` de la escena (cupo de r04): cierra el encuentro de una.
          crit: {
            text: [
              'Lo decís para el chico del umbral y no para él: once meses, catorce sueldos y una piedra vendida del otro lado. Pell baja la lanza, Dravos lo ve, y se le termina.',
            ],
            effects: [{ clock: 'pelea', delta: 3 }],
            next: 'cl_desenlace',
          },
          success: {
            text: [
              'Nombrás la orden escrita y le decís la fecha. El capitán reformula lo que dijiste, como siempre, y le sale torcido: repite tus palabras y no sabe dónde ponerlas.',
            ],
            effects: [{ clock: 'pelea', delta: 2 }],
            next: 'cl_dravos',
          },
          partial: {
            text: [
              'Te escucha entero, que es peor que si te cortara. Después se acomoda el puño y queda a la vista el hilo rojo. No te contesta.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'cl_dravos',
          },
          failure: {
            text: [
              'La voz se te va en la mitad de la frase. Dravos espera a que se termine sola. Dice que el agua va a subir igual, se discuta o no.',
            ],
            effects: [{ addCondition: 'asustado' }],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      // FASE H · tarea 2, segunda vuelta. Era la única salida del encuentro que no movía el reloj
      // `pelea` y no costaba nada en dos de sus tres bandas: las otras cinco piden haber peleado, la
      // piedra, el flag de Orell, una Herida o quedar Agotado. Ahora el éxito cobra lo que el propio
      // texto ya narraba —el agua de abajo te recibe entera— y el parcial cobra el medio escalón que
      // te llevás puesto, que es la gramática de esta campaña para un parcial: pasás pagando.
      id: 'huir_escaleras_abajo',
      label: 'Huir escaleras abajo, al agua del sótano',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['huida'],
        outcomes: {
          success: {
            text: [
              'Tirás el cajón atrás tuyo y buscás la trampilla con el pie. El agua de abajo está más fría y te recibe entera. Arriba preguntan adónde fuiste y nadie contesta.',
            ],
            effects: [{ addCondition: 'empapado' }],
            next: 'cl_desenlace',
          },
          partial: {
            text: [
              'Bajás a los tropezones y te llevás medio escalón con vos. Alguien te sigue con el farol en alto, sin correr, como el que ya bajó.',
            ],
            effects: [{ addCondition: 'perseguido' }, { wound: 1 }],
            next: 'cl_desenlace',
          },
          failure: {
            text: [
              'La trampilla no cede: hay agua apoyada del otro lado. El capitán te agarra de la capa y te devuelve arriba, de rodillas.',
            ],
            effects: [{ wound: 1 }],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      id: 'rendir_el_sello',
      label: 'Rendirle el sello y terminar con esto',
      requires: { item: 'sello_del_vado' },
      lockedHint: 'No tenés el sello encima.',
      outcome: {
        text: [
          'Ponés la piedra sobre la mesa, dentro del saco, y sacás la mano. Halvar cuenta lo suyo sin mirarte. Dravos mira cómo lo cuenta.',
        ],
        effects: [{ take: 'sello_del_vado' }, { set: 'run:trato_con_halvar' }, { clock: 'pelea', delta: 3 }],
        next: 'cl_desenlace',
      },
    },
    {
      // La opción de ronda posterior que r06 pide: `requires` sobre el reloj.
      id: 'rematarlo',
      label: 'Rematarlo mientras está en el piso',
      requires: { clock: 'pelea', gte: 2 },
      lockedHint: 'Todavía está en pie.',
      outcome: {
        text: [
          'Le das una vez más y se termina ahí. El capitán no se cubre la cara: se cubre la mano con la que firma. Lo dejás respirando contra el agua.',
        ],
        effects: [{ clock: 'pelea', delta: 1 }],
        next: 'cl_desenlace',
      },
    },
    {
      id: 'que_orell_lo_detenga',
      label: 'Pedirle a Orell que lo detenga',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no va a levantar la mano por vos.',
      outcome: {
        text: [
          'El sargento entra dos pasos y dice un rango, no un nombre. —Capitán. Baje eso. —Se para al lado tuyo—. Dos relevos vienen atrás.',
        ],
        effects: [{ clock: 'pelea', delta: 3 }],
        next: 'cl_desenlace',
      },
    },
    {
      // [Guerrero] — sabor y atajo, nunca llave (outline §5/r02).
      id: 'trabar_el_eje',
      label: 'Trabar el eje con el hombro',
      requires: { class: 'guerrero' },
      lockedHint: 'Ese eje no lo traba cualquiera con el hombro.',
      outcome: {
        text: [
          'Metés el hombro en el eje y lo parás con el cuerpo. El molino se queja una vez. Algo en el hombro se queja más bajo.',
        ],
        effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
        next: 'cl_dravos',
      },
    },
    {
      // [Mago] — cierra el encuentro sin pelear, y desde la Fase H lo paga como su hermana de escena.
      //
      // `agotado` es tag `magia` y en el clímax entero no queda ni una tirada con ese tag, así que
      // era un precio que no leía nadie: la maga cerraba el encuentro con cero tiradas, cero Heridas
      // y cero consecuencias. `trabar_el_eje` [Guerrero], tres opciones más arriba, cuesta
      // `{ wound: 1 }` y ni siquiera cierra. La asimetría era entre dos opciones de la misma escena,
      // no entre dos clases: ahora las dos pagan la misma moneda, la que el motor sí lee (3 = Caído).
      // El `pelea +3` se queda: que cierre el encuentro es el contrato de biblia §9.5 para esta
      // opción, y lo que estaba mal no era que cerrara sino que cerrara gratis.
      //
      // El `label` NO anuncia la Herida, y es a propósito: el de `trabar_el_eje` tampoco anuncia la
      // suya. Las doce opciones `[Clase]` ya llevan el badge que el motor deriva de su `requires`, y
      // biblia §10 pide que el precio se diga sin nombrar la mecánica: acá vive en el texto, en las
      // rodillas en el agua y la nariz sangrando.
      id: 'apagar_la_runa_un_latido',
      label: 'Apagar la runa un latido',
      requires: { class: 'mago' },
      lockedHint: 'Solo un Mago le hace callar una runa.',
      outcome: {
        text: [
          'Le decís a la piedra el nombre que tenía antes del molino y se calla un latido. El agua se queda quieta. A Dravos se le termina la noche ahí. Cuando el ruido vuelve estás de rodillas, con la nariz sangrando.',
        ],
        effects: [{ addCondition: 'agotado' }, { wound: 1 }, { clock: 'pelea', delta: 3 }],
        next: 'cl_desenlace',
      },
    },
  ],
} satisfies Scene;

/**
 * 7 opciones / 4 libres · 2 tiradas. La ruta diplomática del clímax, y la del personaje mínimo.
 * `cerrar_el_trato` es el Burnt Bridge de la escena (uno solo, y sin dado).
 *
 * Piso dramático de la biblia §2.3: dos PNJ declarados, así que la escena no baja de 350 palabras
 * de presupuesto por más que la mitad de sus opciones no tiren un dado.
 */
export const cl_halvar = {
  id: 'cl_halvar',
  kind: 'normal',
  place: 'molino_de_tome',
  variant: 'inundado',
  // Ilse NO va acá: viene con `run:con_ilse` y la nombra el narrador.
  npcs: ['halvar', 'dravos'],
  onEnter: [{ milestone: 'enfrentar_a_dravos' }],
  text: [
    'Halvar corre una silla con el pie y te la ofrece mojada. Sobre la mesa hay un libro abierto y una cuchara de lacre en el brasero, y al costado el saco con la piedra. El lacre huele a miel quemada y le gana al del río.',
    {
      variants: [
        {
          when: { flag: 'run:con_la_ley' },
          text: 'Venís del lado de la ley y los dos lo saben: uno te sienta de testigo y el otro de socio.',
        },
        {
          when: { flag: 'run:contra_la_ley' },
          text: 'Llegaste por abajo, del sótano y del agua. Para esta mesa no cambia nada: lo que mueve el precio es lo que traés.',
        },
        { text: 'Nadie pregunta cómo entraste ni por dónde. En esta mesa lo único que se pregunta es qué traés.' },
      ],
    },
    {
      speaker: 'halvar',
      variants: [
        {
          text: '—Cerremos, amigo. Tres peajes hay entre mi casa y este vado y el del medio lo cobro yo. Poco me cuesta sumarte a la lista. Mucho me cuesta restarte.',
        },
      ],
    },
    {
      speaker: 'dravos',
      variants: [
        {
          text: '—Lo que hay que entender es que esto ya está hecho. Falta el lacre y falta que alguien se calle once meses, que es lo que se le debe a un hombre acá.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'regatear_el_precio',
      label: 'Regatear el precio delante de Dravos',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: {
            text: [
              'Le ponés precio a lo que él daba por regalado, y no bajás la voz. Halvar tacha una cifra y anota otra. A Dravos la tachadura le interesa más que la cifra.',
            ],
            next: 'cl_desenlace',
          },
          partial: {
            text: [
              'La cifra sube tanto que el capitán se queda mirando el libro. Halvar vuelve a poner la cuchara en el brasero: ahora hay apuro, y no es tuyo.',
            ],
            next: 'cl_desenlace',
          },
          failure: {
            text: [
              'Pedís de más y se te nota de dónde sale el número. Halvar cierra el libro. El capitán deja de reformular lo que decís, que es la única señal que da.',
            ],
            effects: [{ set: 'run:dravos_sabe' }],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      id: 'leerle_el_libro_de_rutas',
      label: 'Leerle en voz alta su propio libro de rutas',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber'],
        advantageIf: { flag: 'run:sabe_de_halvar' },
        outcomes: {
          success: {
            text: [
              'Das vuelta el libro y leés en voz alta los peajes del año que viene. Están anotados para un vado que ya no se cruza. Halvar deja los dedos quietos en la tapa.',
            ],
            next: 'cl_desenlace',
          },
          partial: {
            text: [
              'Sacás la cuenta a medias, y alcanza: la casa de Halvar gana más con el río arriba que con la piedra abajo. Te corrige dos números y al corregirlos te da la razón.',
            ],
            next: 'cl_desenlace',
          },
          failure: {
            text: [
              'Leés el renglón al revés y decís lo que no dice. Halvar te saca el libro sin que se note. Dravos se pone los guantes mientras el otro te explica el error.',
            ],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      // Burnt Bridge: cierra la rama y no se vuelve. Sin tirada, por la regla de la biblia §10.
      id: 'cerrar_el_trato',
      label: 'Cerrar el trato y cobrar tu parte',
      outcome: {
        text: [
          'Decís que sí con una palabra y alcanza. Halvar te cuenta tu parte sobre la mesa mojada. El lacre baja con tu nombre al lado del de él.',
        ],
        effects: [{ set: 'run:trato_con_halvar' }, { set: 'run:dravos_sabe' }],
        next: 'cl_desenlace',
      },
    },
    {
      // FASE H · tarea 2. Era la salida gratis del clímax diplomático. Dravos está declarado en
      // `npcs` de esta escena y pasó la noche fichando conductas: irse de una negociación sin
      // ofrecer nada y sin dar un motivo, delante del capitán, se ve. +1 de `sospecha`, con el
      // sujeto nombrado, y el `label` lo anuncia.
      id: 'bajar_al_sotano_sin_contestar',
      label: 'Bajar al sótano sin contestar, delante del capitán',
      outcome: {
        text: [
          'No contestás. Corrés la trampilla con el pie y bajás. Atrás, Halvar te explica lo caro que sale no contestar. Dravos no te frena: dice que corresponde anotar la hora.',
        ],
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'cl_desenlace',
      },
    },
    {
      // La tercera vía a `run:berta_miente`, y el único trabajo del premio exclusivo de la rama A.
      id: 'leerle_lo_que_firmo_berta',
      label: 'Leerle lo que firmó Berta, con la fecha',
      requires: { item: 'carta_de_halvar' },
      lockedHint: 'No tenés la carta de Halvar encima.',
      outcome: {
        text: [
          'Abrís la carta y leés la fecha antes que el nombre. La cesión del paso está firmada once días antes de que te llegara la otra. Halvar no lo niega: te corrige la fecha por una peor.',
        ],
        effects: [{ take: 'carta_de_halvar' }, { set: 'run:berta_miente' }],
        next: 'cl_desenlace',
      },
    },
    {
      // [Clérigo] — abre una negociación que no existe sin Clérigo.
      id: 'ofrecer_el_juicio_del_templo',
      label: 'Ofrecer el juicio del templo',
      requires: { class: 'clerigo' },
      lockedHint: 'No es tu oficio invocar un juicio del templo.',
      outcome: {
        text: [
          'Nombrás el juicio del templo y decís en cuántos días baja un juez. Halvar hace la cuenta de lo que cuesta esperar y no contesta enseguida.',
        ],
        next: 'cl_desenlace',
      },
    },
    {
      id: 'que_ilse_hable',
      label: 'Dejar que hable Ilse',
      requires: { flag: 'run:con_ilse' },
      lockedHint: 'Ilse no está en el molino.',
      outcome: {
        text: [
          '«Pesá lo que estás comprando», dice, y no espera a que Halvar termine. «Sesenta y cuatro casas, una rueda y un vado. Ponelo en arrobas.»',
        ],
        next: 'cl_desenlace',
      },
    },
  ],
} satisfies Scene;

/**
 * Abanico final: 7 opciones / 4 libres · 2 tiradas, y las cuatro libres cubren tres de los cuatro
 * finales (outline §5/r02 b). Las dos tiradas llevan **las tres bandas al mismo final**: cambian el
 * precio, nunca el destino.
 *
 * Ninguna opción pide `{ item: 'sello_del_vado' }`: la piedra está al lado del zócalo en toda ruta.
 * La variante por `run:sello_escondido` del segundo párrafo es lo que sostiene esa invariante cuando
 * el jugador la dejó atada a la cadena del azud (ver nota (a) de la cabecera).
 */
export const cl_desenlace = {
  id: 'cl_desenlace',
  kind: 'normal',
  place: 'sotano_del_sello',
  npcs: ['ilse', 'berta', 'orell'],
  // FASE H · tarea 2: el hito `cerrar_la_cronica` ya NO se marca acá. Se marcaba al entrar, es
  // decir ANTES de elegir el final, así que premiaba haber bajado una escalera. Ahora vive en el
  // `onEnter` de los cuatro finales: marca haber cerrado algo. `cl_desenlace` queda sin `onEnter`,
  // y puede: no vuelve a sí misma, así que no necesita nada que corte el bucle.
  text: [
    'Bajás la escalera con el agua por encima del tercer escalón. El sótano es redondo y más viejo que el molino. El agua sube sin ruido: te avisa por la ropa, no por el oído.',
    {
      variants: [
        {
          when: { flag: 'run:sello_escondido' },
          text: 'La piedra la subieron de la cadena antes que vos: alguien siguió el hierro hasta el fondo. Está al borde del hueco, llena de limo, con la cara tallada para arriba.',
        },
        {
          when: { endingSeen: 'fin_crecida' },
          text: 'El zócalo lo encontrás sin buscarlo. Las manos se acuerdan del canal en espiral y de que el hueco es más chico de lo que uno espera.',
        },
        {
          text: 'En el piso hay canales en espiral que bajan hasta un hueco del tamaño de dos puños. Al lado del zócalo está la piedra, fuera del saco, con la cara para arriba.',
        },
      ],
    },
    {
      speaker: 'berta',
      variants: [
        {
          when: { flag: 'run:berta_miente' },
          text: '—Mirá, ya sé que lo sabés, así que no te hago el número otra vez. Firmé antes de escribirte. Somos sesenta y cuatro casas y ninguna aguanta dos inviernos sin paso, y bueno.',
        },
        {
          text: '—Mirá, lo que hay que mirar son los días. Sin molino y sin paso, Aldamar se vacía en dos inviernos, y no hay bolsa de plata que alcance. Nosotros no elegimos nada, y bueno.',
        },
      ],
    },
    {
      speaker: 'ilse',
      variants: [
        {
          text: '—Bajala o soltala. Las dos cosas juntas no se pueden. —Tiene el farol en una mano y la escalera en la otra, y no suelta ninguna.',
        },
      ],
    },
    'El sargento bajó último y se quedó al pie de la escalera. No sube la ballesta ni la baja.',
  ],
  choices: [
    {
      id: 'devolver_el_sello_a_la_piedra',
      label: 'Devolver el sello a su piedra',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        // Sin el medallón el sello cierra mal, y el epílogo de `fin_hundido` lo dice (biblia §5).
        advantageIf: { item: 'medallon_de_tome' },
        outcomes: {
          crit: {
            text: [
              'Ponés la esquirla en su lugar antes que la piedra, con dos dedos. La piedra baja encima como si volviera de un viaje corto. El agua empieza a irse.',
            ],
            effects: [{ take: 'sello_del_vado' }, { take: 'medallon_de_tome' }],
            next: 'fin_hundido',
          },
          success: {
            text: [
              'Levantás la piedra con las dos manos y la bajás derecha al hueco. La esquirla entra con ella y algo abajo la termina de acomodar. El agua para de subir.',
            ],
            effects: [{ take: 'sello_del_vado' }, { take: 'medallon_de_tome' }],
            next: 'fin_hundido',
          },
          partial: {
            text: [
              'Entra, pero te cuesta tres intentos y el último de rodillas. Queda apoyada y no asentada. Cuando sacás las manos te tiemblan los brazos como a un viejo.',
            ],
            effects: [{ take: 'sello_del_vado' }, { addCondition: 'exhausto' }],
            next: 'fin_hundido',
          },
          failure: {
            text: [
              'Se te va de las manos y el agua se la lleva un palmo. La levantás del fondo con los dedos entumecidos y la encajás torcida. Ahí se queda.',
            ],
            effects: [{ take: 'sello_del_vado' }, { addCondition: 'empapado' }],
            next: 'fin_hundido',
          },
        },
      },
    },
    {
      // El único camino sin `requires` a `fin_dravos`, y por eso se llama así: la guarnición cobra
      // igual esté Dravos entero, preso o huido (biblia §3).
      id: 'dejar_que_la_guardia_cruce_con_la_piedra',
      label: 'Dejar que la guardia cruce con la piedra',
      outcome: {
        text: [
          'Te corrés del hueco y dejás que suban con ella. Nadie te empuja y nadie te agradece. Arriba alguien cuenta en voz alta, y no son monedas: son hombres.',
        ],
        effects: [{ take: 'sello_del_vado' }],
        next: 'fin_dravos',
      },
    },
    {
      id: 'ponersela_en_las_manos_a_ilse',
      label: 'Ponérsela en las manos a Ilse',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social', 'fe'],
        advantageIf: { flag: 'run:ilse_confia' },
        outcomes: {
          success: {
            text: [
              'Le ponés la piedra en las manos y no le decís qué hacer. La pesa una vez, como pesa un saco, y sube sola los escalones que haga falta.',
            ],
            effects: [{ take: 'sello_del_vado' }],
            next: 'fin_crecida',
          },
          partial: {
            text: [
              'Tarda en aceptarla y vos tardás en soltarla, y las cuatro manos quedan un momento abajo del mismo peso. Después se la lleva sin mirarte.',
            ],
            effects: [{ take: 'sello_del_vado' }],
            next: 'fin_crecida',
          },
          failure: {
            text: [
              'No te contesta. Te saca la piedra de las manos antes de que termines la frase. Sube de dos en dos, con el farol bajo el brazo.',
            ],
            effects: [{ take: 'sello_del_vado' }],
            next: 'fin_crecida',
          },
        },
      },
    },
    {
      // FASE H · tarea 2. Era la única de las siete sin ningún efecto —la nota (e) de la cabecera lo
      // tenía diagnosticado— y por eso era la salida perfecta del jugador de cero tiradas: llegaba a
      // un final con la piedra todavía en la mochila mientras el epílogo contaba que la usó Ilse.
      // El `take` cierra la ficha y el `label` dice que la piedra se queda abajo.
      id: 'subir_y_dejar_que_el_agua_decida',
      label: 'Dejar la piedra donde está y que el agua decida',
      outcome: {
        text: [
          'Subís la escalera sin dar explicaciones y dejás la piedra al lado del hueco. Atrás, el agua sigue entrando y el hueco queda abierto.',
        ],
        effects: [{ take: 'sello_del_vado' }],
        next: 'fin_crecida',
      },
    },
    {
      // La única puerta al final oculto. No es condición de clase: `isSatisfiable` la da por
      // verdadera para las cuatro, así que r02 sigue en verde.
      id: 'quedarte_con_el_sello',
      label: 'Quedarte con el sello y salir por el caz',
      requires: { flag: 'char:vado.sabe_del_sello' },
      lockedHint: 'No sabés qué es esa piedra ni para qué sirve.',
      outcome: {
        text: [
          'La metés contra las costillas, donde iba la carta, y buscás la boca del caz. Nadie te sigue: cuando el río sube, nadie mira para abajo.',
        ],
        next: 'fin_heredero',
      },
    },
    {
      id: 'cerrar_la_compuerta_con_orell',
      label: 'Cerrar la compuerta con Orell',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no va a mover un dedo por vos.',
      outcome: {
        text: [
          '—Vos abajo, yo arriba. —El sargento deja la ballesta en el agua y agarra la manivela—. Dos vueltas mías por cada una tuya, y sin hablar.',
        ],
        effects: [{ take: 'sello_del_vado' }],
        next: 'fin_hundido',
      },
    },
    {
      id: 'venderselo_vos_a_halvar',
      label: 'Vendérselo vos a Halvar',
      requires: { flag: 'run:trato_con_halvar' },
      lockedHint: 'No cerraste ningún trato con Halvar.',
      outcome: {
        text: [
          'Subís vos con la piedra y se la ponés en la mano, no en la mesa. Te paga lo hablado y anota el vado en el libro del año que viene.',
        ],
        effects: [{ take: 'sello_del_vado' }],
        next: 'fin_dravos',
      },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// Los cuatro finales — `kind: 'ending'`, 0 opciones
//
// Cada uno lleva `text` (el último plano de la partida) y `epilogue` (la crónica, que es lo último
// que lee el jugador). Los ejes de variación de los epílogos son todos de esta partida o de canon de
// campaña —`run:*`, `char:vado.*`, objetos— y ninguno va en boca de un PNJ: los cuatro epílogos son
// narrador puro.
// ---------------------------------------------------------------------------

/** No escribe canon de mundo a propósito: devuelve el vado a como siempre estuvo (biblia §7.3). */
export const fin_hundido = {
  id: 'fin_hundido',
  kind: 'ending',
  place: 'sotano_del_sello',
  onEnter: [{ set: 'char:vado.sello_hundido' }, { milestone: 'cerrar_la_cronica' }],
  text: [
    'Encaja con un ruido corto, de piedra contra piedra, y después el sótano se queda sin ruido ninguno. El agua de los canales baja primero, en espiral, y se va por donde nadie la ve irse. Tardás en darte cuenta de que el frío de las piernas está bajando con ella.',
  ],
  choices: [],
  ending: {
    id: 'fin_hundido',
    epilogue: [
      'El río baja toda la noche. A la mañana, en el vado, se cuentan las siete piedras otra vez, y la cuarta sigue siendo la que falla.',
      {
        variants: [
          {
            when: { item: 'medallon_de_tome' },
            text: 'La esquirla te quedó en la mano. El sello cerró con un hueco del tamaño de un pulgar: el agua baja un palmo y ahí se queda. El vado se cruza. El molino no vuelve a moler.',
          },
          {
            text: 'Al molino le vuelve el caz a media altura, que es como tiene que estar. Nadie sabe bien qué hiciste vos ahí abajo, y a nadie le hace falta saberlo.',
          },
        ],
      },
      {
        variants: [
          {
            when: { flag: 'char:vado.tome_enterrado' },
            text: 'A Tomé ya lo habías enterrado vos, arriba del talud. Le ponen una piedra con la fecha equivocada y no hay quien la corrija.',
          },
          {
            text: 'A Tomé lo sacan del vado con la soga del pozo. Lo entierran arriba del talud, donde el agua no llega ni en marzo.',
          },
        ],
      },
      'Halvar cruza al norte con el maletín vacío y el libro de rutas lleno de renglones tachados. La guarnición cobra tarde y cobra menos, que es como cobran las guarniciones cuando no queda nada que vender.',
      'Cobrás la bolsa de plata de Berta y no preguntás de dónde sale. Conociste a un hombre que ya estaba muerto, y es el único de este pueblo que no te mintió.',
    ],
  },
} satisfies Scene;

export const fin_dravos = {
  id: 'fin_dravos',
  kind: 'ending',
  place: 'vado_oculto',
  variant: 'crecido',
  onEnter: [
    { set: 'char:vado.vendido' },
    { set: 'world:vado.sello_perdido' },
    { milestone: 'cerrar_la_cronica' },
  ],
  text: [
    'Cruzan antes del amanecer, con la piedra envuelta en el saco y el agua todavía alta. Los remos entran sin ruido: los envolvieron en trapo antes de bajar la barca. Desde el banco de grava se ve lo justo, cuatro hombres y una linterna tapada, y nadie apura a nadie.',
  ],
  choices: [],
  ending: {
    id: 'fin_dravos',
    epilogue: [
      'El paso de Aldamar queda cedido por escrito y con fecha. Los carros que bajan del norte hacen tres días más de camino. Pagan el peaje en el puente de la casa de Halvar, que cobra en su moneda.',
      {
        variants: [
          {
            when: { flag: 'run:trato_con_halvar' },
            text: 'Tu parte te la pagaron entera y en el sitio. Es la única deuda de esta historia que quedó saldada, y la cobraste vos.',
          },
          {
            text: 'A vos no te paga nadie esa noche. Berta manda la bolsa de plata al Ancla Seca dos días después y Mausi te la entrega sin mirarte a la cara.',
          },
        ],
      },
      {
        variants: [
          {
            when: { flag: 'run:berta_miente' },
            text: 'Berta sigue siendo alcaldesa de sesenta y cuatro casas que se van vaciando de a una. Vos sabés qué firmó y en qué mes lo firmó: no hay a quién contárselo que no lo haya firmado también.',
          },
          {
            text: 'Berta sigue siendo alcaldesa. Dos inviernos después las sesenta y cuatro casas son cuarenta, y el molino se cae solo, sin que nadie lo empuje.',
          },
        ],
      },
      'La guarnición cobra once meses de atraso en una sola tarde. Del capitán se cuentan tres versiones distintas en el Ancla Seca, y en las tres cobró.',
      'El vado se cruza igual que siempre, y eso es lo peor: la piedra ya no está abajo y el río todavía no se enteró.',
    ],
  },
} satisfies Scene;

export const fin_crecida = {
  id: 'fin_crecida',
  kind: 'ending',
  place: 'molino_de_tome',
  variant: 'inundado',
  onEnter: [
    { set: 'char:vado.vinculo_ilse' },
    { set: 'world:vado.aldamar_inundada' },
    { milestone: 'cerrar_la_cronica' },
  ],
  text: [
    'Ilse sube con la piedra en las dos manos y no la baja otra vez. El piso del molino tiembla antes de que suba el agua: lo sentís en las rodillas, en los dientes, en el eje que arranca solo. Después el caz revienta hacia adentro.',
  ],
  choices: [],
  ending: {
    id: 'fin_crecida',
    epilogue: [
      'La vega se inunda esa misma noche y el año de siembra se va con el agua. La gente sube a los techos con lo que puede cargar. No se ahoga nadie, y eso también lo decidieron entre los dos.',
      'El vado no se cruza más: donde estaban las siete piedras hay una lengua de agua marrón de media legua de ancho. El puente viejo, sin la vega debajo, no aguanta un carro cargado.',
      'Aldamar deja de tener un paso que vender. Halvar cruza al norte con el maletín cerrado y no vuelve: no hay peaje que cobrarle a un pueblo al que ya no va nadie.',
      {
        variants: [
          {
            when: { flag: 'run:con_ilse' },
            text: 'Ilse se queda del otro lado del agua y no vuelve a Aldamar. Te manda una vez, con un carrero, un saco de harina del último molido de Tomé. Adentro no hay ninguna carta.',
          },
          {
            text: 'A Ilse la nombran en el pueblo con las dos cosas juntas: la que mojó la vega y la que salvó las sesenta y cuatro casas. Las dos son ciertas y las dicen en la misma frase.',
          },
        ],
      },
      {
        variants: [
          {
            when: { flag: 'run:berta_miente' },
            text: 'La cesión firmada no le sirve a Berta para nada: cedió un paso que dejó de existir esa noche. Es lo único que hiciste acá que no se puede deshacer.',
          },
          {
            text: 'Berta no dice una palabra en la asamblea. Cuando le preguntan qué se hace ahora, contesta que hay que contar los días. Los cuenta en voz alta, uno por uno.',
          },
        ],
      },
    ],
  },
} satisfies Scene;

/**
 * Final oculto. La reliquia la entrega `endings.fin_heredero.reward` en `campaign.ts`, NO un
 * `give` de acá: si se diera dos veces, la ranura de mochila se contaría mal.
 */
export const fin_heredero = {
  id: 'fin_heredero',
  kind: 'ending',
  place: 'puente_viejo',
  variant: 'amanecer',
  onEnter: [
    { set: 'char:vado.heredero' },
    { set: 'world:vado.sello_perdido' },
    { milestone: 'cerrar_la_cronica' },
  ],
  text: [
    'Salís de la isla por el caz, contra la corriente, con la piedra atada al pecho donde iba la carta. El agua te empuja a cada paso y hay que ganarle el camino de a uno. Atrás, el molino sigue con la luz prendida y todavía no salió nadie a mirar el río.',
  ],
  choices: [],
  ending: {
    id: 'fin_heredero',
    epilogue: [
      'El puente lo cruzás con el primer carro del día, caminando al lado de la rueda, del lado del río. Clarea cuando dejás atrás la torre.',
      'La piedra pesa poco para lo que es. A media legua todavía escuchás el vado. A una legua ya no: a partir de ahí el ruido que hace lo hace adentro del trapo encerado.',
      {
        variants: [
          {
            when: { flag: 'run:acusado' },
            text: 'En Aldamar tu nombre queda escrito en una tablilla, y debajo del nombre la palabra que usó Dravos. Por ese puente no volvés, y lo sabés antes de terminar de cruzarlo.',
          },
          {
            text: 'En Aldamar nadie se da cuenta de qué falta hasta tres días después, y para entonces no hay a quién preguntarle. La bolsa de plata de Berta queda sin cobrar.',
          },
        ],
      },
      'El río sube dos inviernos seguidos y en el pueblo no entienden por qué. El vado se cruza cuando el agua quiere, que es como se cruzaba antes de que existiera Aldamar.',
      {
        variants: [
          {
            when: { flag: 'char:vado.tome_enterrado' },
            text: 'A Tomé lo dejaste bajo tierra y te llevaste lo que él rompió. La deuda quedó entera de tu lado de la cuenta.',
          },
          {
            text: 'Tomé le arrancó una esquirla para saber si era piedra de verdad. Vos te llevaste el resto, y todavía no sabés para qué.',
          },
        ],
      },
    ],
  },
} satisfies Scene;
