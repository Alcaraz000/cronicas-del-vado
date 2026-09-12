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
 * 7. Las cuatro escenas del clímax llevan `onEnter` con hito o reloj, que es lo que corta los bucles
 *    de `outcome` (`cl_dravos → cl_dravos`) en el test de contenido.
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
 * "Esto ya no" · `cl_halvar` "Halvar corre una" · `cl_desenlace` "Bajás la escalera" · `fin_hundido`
 * "Encaja con un" · `fin_dravos` "Cruzan antes del" · `fin_crecida` "Ilse pone las" · `fin_heredero`
 * "Salís de la". Las ocho primeras palabras son distintas entre sí, ninguna está en la lista de
 * quemados de §2.7 y ninguna coincide con la de una escena a la que esta apunta.
 *
 * Cupos gastados por este lote: `usted` ×2 (Pell en `cl_molino`; la variante por `run:mausi_informo`
 * gasta las mismas dos, así que una partida lee 2 y el total de campaña sube a 2 acá). Puteadas: 0
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
 *     pagarlas). El piso real son ~480. **Hay que subir la celda o mover las variantes de flag del
 *     clímax (180 palabras en §3) a las celdas de las escenas que las llevan.**
 * (d) **Presupuesto medido, escena por escena** (palabras escritas, contando todas las variantes y
 *     sin contar `label` ni `lockedHint`): `cl_molino` 547/331 · `cl_dravos` 801/695 · `cl_halvar`
 *     579/515 · `cl_desenlace` 642/571 · `fin_hundido` 261/300 · `fin_dravos` 257/300 · `fin_crecida`
 *     287/300 · `fin_heredero` 252/300. Clímax 2.569 contra 2.112; finales 1.057 contra 1.200.
 *     **Total del lote 3.626 contra 3.312 (+9,5 %)**, en la misma franja que el lote 1 (+7,2 %) y por
 *     la misma causa: la tabla presupuesta las variantes y los outcomes aparte y después no alcanzan.
 *     Ritmo medido sobre las 289 oraciones del lote: media **12,5**, mediana 12, máximo **30**, cero
 *     oraciones de 31 o más, y **las nueve de más de 22 palabras llevan dos puntos**, como pide §1.2
 *     de la guía de voz.
 * (e) **`cl_desenlace.subir_y_dejar_que_el_agua_decida` no hace `take` del `sello_del_vado`.** Las
 *     otras seis opciones de la escena sí lo hacen, así que esta es la única ruta en la que el
 *     jugador llega a un final **con la piedra todavía en la mochila** mientras el epílogo cuenta que
 *     la usó Ilse. La prosa lo tapa —subís y la dejás al lado del hueco—, pero la ficha dice otra
 *     cosa. **Le falta un `{ take: 'sello_del_vado' }`**, y es una línea.
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
    'Adentro el agua te pasa el tobillo y está más tibia que la del río: lleva dos días encerrada entre estos tablones. La rueda gira sin carga. En el piso flotan sacos reventados y la harina hace grumos contra las paredes.',
    {
      variants: [
        {
          when: { met: 'halvar' },
          text: 'Al mercader ya lo conocés: la barba clara trenzada en dos, los anillos, el maletín de cuero cruzado al pecho. Al lado del capitán tiene cara de hombre que vino a cobrar algo que ya es suyo.',
        },
        {
          text: 'Contra la pared del fondo hay una mesa seca sobre caballetes y dos hombres de pie. Uno es el capitán: sobretodo índigo, guantes en el cinto, sin una gota encima. El otro tiene la barba clara trenzada en dos y anillos de plata en tres dedos.',
        },
      ],
    },
    {
      variants: [
        {
          when: { flag: 'run:dravos_sabe' },
          text: 'El capitán levanta la cabeza antes de que termines de entrar. El lacre ya está derretido en la cuchara y el papel abierto sobre la mesa. Te esperaban, y eso cambia el orden de las cosas.',
        },
        {
          text: 'Ninguno de los dos mira la puerta. Sobre la mesa hay un papel abierto y una cuchara de lacre todavía apagada. Al lado espera un saco de harina con algo del tamaño de un ladrillo adentro.',
        },
      ],
    },
    {
      speaker: 'pell',
      variants: [
        {
          when: { flag: 'run:mausi_informo' },
          text: '—Su nombre subió a la torre el martes, usted sabe cómo es acá. Yo no lo mandé. —Se acomoda el casco—. La undécima ordenanza dice que usted no…',
        },
        {
          text: '—Pase. Digo, no pase. —Baja la lanza y la vuelve a subir—. La undécima ordenanza dice que usted no puede estar acá, y yo tampoco puedo, así que usted vio.',
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
          success: {
            text: [
              'Te metés entre los sacos reventados y aguantás la respiración contra la harina mojada. Halvar cuenta en voz alta: tres peajes hay entre su casa y el vado, y el del medio es de ellos.',
            ],
            next: 'cl_halvar',
          },
          partial: {
            text: [
              'Escuchás la mitad. Dravos habla de once meses y de catorce hombres, y después baja la voz justo donde importa. Un saco cede bajo tu rodilla y el capitán deja de hablar.',
            ],
            next: 'cl_halvar',
          },
          // El fallo enciende `run:dravos_sabe` (flags.ts: "el fallo de cl_molino.escuchar").
          failure: {
            text: [
              'El tablón que pisás devuelve el agua de abajo y el ruido llena el molino. Halvar cierra el maletín sin apuro. El capitán se corre de la mesa y te deja ver lo que hay encima.',
            ],
            effects: [{ set: 'run:dravos_sabe' }],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      id: 'encarar_a_dravos',
      label: 'Encarar a Dravos delante de todos',
      outcome: {
        text: [
          'Salís al claro del piso y decís lo que viniste a decir. Dravos no levanta la voz ni llama a nadie: dobla el papel en dos y busca los guantes.',
        ],
        next: 'cl_dravos',
      },
    },
    {
      id: 'sentarte_a_la_mesa_con_halvar',
      label: 'Sentarte a la mesa con Halvar',
      outcome: {
        text: [
          'Corrés un cajón con el pie y te sentás sin que nadie te ofrezca asiento. Halvar te mira las botas mojadas y después las manos. «Amigo», dice, y te hace lugar.',
        ],
        next: 'cl_halvar',
      },
    },
    {
      id: 'llamar_a_pell_aparte',
      label: 'Llamar a Pell aparte',
      outcome: {
        text: [
          'Lo llevás dos pasos hacia la puerta. El chico te contesta mirando la mesa, y esa es toda la respuesta. Atrás, el capitán dice su nombre completo y Pell vuelve a su sitio.',
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
          'Entrás hablando y les sacás el silencio de encima. La cuchara del lacre queda a mitad de camino. Halvar cierra el libro con un dedo adentro: después lo va a abrir.',
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
          'Bajás las manos y las dejás a la vista. Dravos reformula lo que no dijiste: que venís a entregarte, y que eso ahorra trabajo. Después le pide la cuerda al chico.',
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
          '«La escalera la conozco mejor que vos», te contesta antes de que termines, y ya está bajando. Se lleva el farol pegado al cuerpo para que la luz no se vea desde la mesa.',
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
          text: 'El capitán está de rodillas en el agua y hay una mano que no le cierra del todo. No pide nada. Atrás, el mercader mira la puerta y calcula cuánto le cuesta quedarse.',
        },
        {
          when: { clock: 'pelea', gte: 1 },
          text: 'Dravos se corre de la mesa y busca el sitio donde el piso no cede. La muela suelta gira despacio, sin nada que moler, y el agua le llega a él también.',
        },
        {
          text: 'Esto ya no se arregla con el papel. El molino queda partido en dos: la mesa seca y el palmo de agua donde estás vos. El eje de la rueda chilla una vez por vuelta y el ruido se te mete por los dientes.',
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
          text: '—Lo que acaba de entrar por esa puerta es un problema de orden, nada más. Once meses sin paga tienen catorce hombres. Hay que resolverlo antes de que baje el agua.',
        },
      ],
    },
    {
      variants: [
        {
          when: { flag: 'run:orell_confia' },
          text: 'En el umbral está el sargento, con la ballesta colgada del hombro, y no entra. Mira el agua y no a vos.',
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
              'Lo cruzás contra el canto de la mesa antes de que saque los guantes. El papel se va al agua y el capitán atrás. Se levanta escupiendo harina y no dice una palabra.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'cl_dravos',
          },
          partial: {
            text: [
              'Entran los dos al agua y ahí abajo no hay orden que valga. Le arrancás el saco del brazo y él te encuentra la oreja con el codo.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
            next: 'cl_dravos',
          },
          failure: {
            text: [
              'Calculás mal el palmo de agua y el pie se te queda atrás. Dravos se corre medio paso y te deja pasar de largo. La esquina de la mesa te encuentra las costillas.',
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
              'Soltás la traba del eje con las dos manos. La muela baja de golpe, muerde el borde de la mesa y se lleva los caballetes. El capitán queda del otro lado de una piedra que gira.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'cl_dravos',
          },
          partial: {
            text: [
              'Tenés que colgarte de la palanca con todo el cuerpo y el eje cede tarde. La muela agarra el saco y no a él. Te quedás sin aire contra el tablón, con las manos abiertas.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }, { addCondition: 'exhausto' }],
            next: 'cl_dravos',
          },
          failure: {
            text: [
              'La traba no es la que pensabas. El eje sigue y la correa de cuero te lleva la mano contra el brocal: la sacás con un dedo que no va a doblarse esta noche.',
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
              'Lo decís para el chico del umbral y no para él: once meses, catorce sueldos y una piedra vendida del otro lado del río. Pell baja la lanza. Dravos lo ve bajarla, y ahí se le termina.',
            ],
            effects: [{ clock: 'pelea', delta: 3 }],
            next: 'cl_desenlace',
          },
          success: {
            text: [
              'Nombrás la orden escrita y le decís la fecha. El capitán reformula lo que dijiste, como hace siempre, y esta vez le sale torcido: repite tus palabras y no encuentra dónde ponerlas.',
            ],
            effects: [{ clock: 'pelea', delta: 2 }],
            next: 'cl_dravos',
          },
          partial: {
            text: [
              'Te escucha entero, que es peor que si te cortara. Cuando terminás, se acomoda el puño del sobretodo y queda a la vista el hilo rojo del puño. No te contesta nada.',
            ],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'cl_dravos',
          },
          failure: {
            text: [
              'La voz se te va en la mitad de la frase. Dravos espera a que se termine sola y mira la puerta cerrada. Dice que el agua va a subir igual, se discuta o no.',
            ],
            effects: [{ addCondition: 'asustado' }],
            next: 'cl_dravos',
          },
        },
      },
    },
    {
      id: 'huir_escaleras_abajo',
      label: 'Huir escaleras abajo, hacia el sótano',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['huida'],
        outcomes: {
          success: {
            text: [
              'Tirás el cajón atrás tuyo y buscás la trampilla con el pie. El agua de abajo está más fría y te recibe entera. Arriba, alguien pregunta adónde fuiste y nadie contesta.',
            ],
            next: 'cl_desenlace',
          },
          partial: {
            text: [
              'Bajás a los tropezones y te llevás medio escalón con vos. Alguien te sigue con el farol en alto, sin correr, contando los escalones como los cuenta el que ya bajó por acá.',
            ],
            effects: [{ addCondition: 'perseguido' }],
            next: 'cl_desenlace',
          },
          failure: {
            text: [
              'La trampilla no cede: hay agua apoyada del otro lado. El capitán te agarra de la capa y te devuelve al piso de arriba, de rodillas, sin sacarte los ojos de encima.',
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
          'Ponés la piedra sobre la mesa, dentro del saco, y sacás la mano despacio. Halvar cuenta lo suyo sin mirarte. Dravos mira cómo lo cuenta y no dice nada.',
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
          'Le das una vez más y se termina ahí. El capitán no se cubre la cara: se cubre la mano con la que firma. Sigue respirando contra el agua y lo dejás así.',
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
          'El sargento entra dos pasos y dice un rango, no un nombre. —Capitán. Baje eso. —Corre el agua con la bota y se para al lado tuyo—. Dos relevos vienen atrás mío.',
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
          'Metés el hombro en el eje y lo parás con el cuerpo. El molino entero se queja una vez. Algo en el hombro se queja también, y más bajo.',
        ],
        effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
        next: 'cl_dravos',
      },
    },
    {
      // [Mago] — cierra el encuentro sin pelear, al precio de quedar Agotado.
      id: 'apagar_la_runa_un_latido',
      label: 'Apagar la runa un latido',
      requires: { class: 'mago' },
      lockedHint: 'Solo un Mago le hace callar una runa.',
      outcome: {
        text: [
          'Le decís a la piedra el nombre que tenía antes del molino y la piedra se calla un latido. En ese latido el agua se queda quieta y el eje no chilla. A Dravos se le termina la noche ahí.',
        ],
        effects: [{ addCondition: 'agotado' }, { clock: 'pelea', delta: 3 }],
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
    'Halvar corre una silla con el pie y te la ofrece mojada. Sobre la mesa hay un libro abierto y una cuchara de lacre en el brasero. Al costado espera el saco de harina con la piedra adentro. El lacre caliente huele a miel quemada, y ese olor le gana al del río.',
    {
      variants: [
        {
          when: { flag: 'run:con_la_ley' },
          text: 'Venís del lado de la ley y los dos lo saben: uno te sienta como testigo y el otro como socio, y ninguno de los dos se equivoca del todo.',
        },
        {
          when: { flag: 'run:contra_la_ley' },
          text: 'Llegaste por abajo, del sótano y del agua, con las manos como las tenés. Para esta mesa eso no cambia nada: lo que mueve el precio es lo que traés, no por dónde entraste.',
        },
        { text: 'Nadie pregunta cómo entraste ni por dónde. En esta mesa lo único que se pregunta es qué traés.' },
      ],
    },
    {
      speaker: 'halvar',
      variants: [
        {
          text: '—Cerremos, amigo. Tres peajes hay entre mi casa y este vado, y el del medio lo cobro yo. Poco me cuesta sumarte a la lista. Mucho me cuesta, digamos, tener que restarte.',
        },
      ],
    },
    {
      speaker: 'dravos',
      variants: [
        {
          text: '—Lo que hay que entender es que esto ya está hecho. Falta el lacre. Falta que alguien se quede callado once meses, que es lo que se le debe a un hombre acá.',
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
              'Le ponés precio a lo que él ya daba por regalado, y no bajás la voz para hacerlo. Halvar tacha una cifra del libro y anota otra. A Dravos la tachadura le interesa más que la cifra.',
            ],
            next: 'cl_desenlace',
          },
          partial: {
            text: [
              'La cifra sube, y sube tanto que el capitán se queda mirando el libro. Halvar vuelve a poner la cuchara en el brasero: ahora hay apuro, y el apuro no es tuyo.',
            ],
            next: 'cl_desenlace',
          },
          failure: {
            text: [
              'Pedís de más y se te nota de dónde sale el número. Halvar cierra el libro. El capitán deja de reformular lo que decís, que es la única señal que da antes de terminar una conversación.',
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
              'Das vuelta el libro y leés en voz alta los peajes del año que viene, con las fechas. Están anotados para un vado que ya no se cruza. Halvar deja los dedos quietos sobre la tapa.',
            ],
            next: 'cl_desenlace',
          },
          partial: {
            text: [
              'Sacás la cuenta a medias, y a medias alcanza: la casa de Halvar gana más con el río arriba que con la piedra abajo. Él te corrige dos números, y al corregirlos te da la razón.',
            ],
            next: 'cl_desenlace',
          },
          failure: {
            text: [
              'Leés el renglón al revés de como está escrito y decís lo que no dice. Halvar te saca el libro de las manos sin que se note que te lo saca. Dravos se pone los guantes mientras el otro te explica el error.',
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
          'Decís que sí con una palabra sola y la palabra alcanza. Halvar te cuenta tu parte ahí mismo, sobre la mesa mojada. El lacre baja sobre el papel con tu nombre al lado del de él.',
        ],
        effects: [{ set: 'run:trato_con_halvar' }, { set: 'run:dravos_sabe' }],
        next: 'cl_desenlace',
      },
    },
    {
      id: 'bajar_al_sotano_sin_contestar',
      label: 'Bajar al sótano sin contestarle',
      outcome: {
        text: [
          'No contestás. Corrés la trampilla con el pie y bajás. Atrás, sin levantar la voz, Halvar te explica lo caro que le sale a un hombre no contestar.',
        ],
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
          'Abrís la carta y leés la fecha antes que el nombre. La cesión del paso está firmada once días antes de que a vos te llegara la otra carta. Halvar no lo niega: te corrige la fecha por una peor.',
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
          'Nombrás el juicio del templo y decís en cuántos días baja un juez desde el otro lado. Halvar hace la cuenta de lo que cuesta esperar y, por primera vez, no contesta enseguida.',
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
          '«Pesá lo que estás comprando», dice, y no espera a que Halvar termine. «Sesenta y cuatro casas, una rueda y un vado. Ponelo en arrobas, si te sirve más.»',
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
  onEnter: [{ milestone: 'cerrar_la_cronica' }],
  text: [
    'Bajás la escalera con el agua ya por encima del tercer escalón. El sótano es redondo y más viejo que el molino que tiene encima. El agua sube sin hacer ruido: te avisa por la ropa, no por el oído.',
    {
      variants: [
        {
          when: { flag: 'run:sello_escondido' },
          text: 'La piedra la subieron de la cadena del azud antes que vos: alguien siguió el hierro con la mano hasta el fondo. Está al borde del hueco del piso, llena de limo, con la cara tallada para arriba.',
        },
        {
          when: { endingSeen: 'fin_crecida' },
          text: 'El zócalo lo encontrás sin buscarlo. Las manos se acuerdan del canal en espiral, y de que el hueco es más chico de lo que uno espera.',
        },
        {
          text: 'En el piso hay canales tallados en espiral que bajan hasta un hueco central del tamaño de dos puños. Al lado del zócalo está la piedra, fuera del saco, con la cara tallada para arriba.',
        },
      ],
    },
    {
      speaker: 'berta',
      variants: [
        {
          when: { flag: 'run:berta_miente' },
          text: '—Mirá, ya sé que lo sabés, así que no te voy a hacer el número otra vez. Firmé antes de escribirte. Somos sesenta y cuatro casas y ninguna aguanta dos inviernos sin paso, y bueno.',
        },
        {
          text: '—Mirá, lo que hay que mirar son los días. Sin molino y sin paso, Aldamar se vacía en dos inviernos, y no hay bolsa de plata que alcance para eso. Nosotros no elegimos nada, y bueno.',
        },
      ],
    },
    {
      speaker: 'ilse',
      variants: [
        {
          text: '—Bajala o soltala. Las dos cosas juntas no se pueden. —Tiene el farol en una mano y la escalera en la otra, y no suelta ninguna de las dos.',
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
              'Ponés la esquirla en su lugar antes que la piedra, con dos dedos. La piedra baja encima como si volviera de un viaje corto. El canal se llena de una. El agua empieza a irse por donde vino.',
            ],
            effects: [{ take: 'sello_del_vado' }, { take: 'medallon_de_tome' }],
            next: 'fin_hundido',
          },
          success: {
            text: [
              'Levantás la piedra con las dos manos y la bajás derecha al hueco. La esquirla entra con ella, por el borde, y algo abajo la termina de acomodar. El agua para de subir.',
            ],
            effects: [{ take: 'sello_del_vado' }, { take: 'medallon_de_tome' }],
            next: 'fin_hundido',
          },
          partial: {
            text: [
              'Entra, pero te cuesta tres intentos y el último lo hacés de rodillas en el agua. Queda apoyada y no asentada. Cuando sacás las manos te tiemblan los brazos como a un viejo.',
            ],
            effects: [{ take: 'sello_del_vado' }, { addCondition: 'exhausto' }],
            next: 'fin_hundido',
          },
          failure: {
            text: [
              'Se te va de las manos a mitad de camino y el agua se la lleva un palmo. La levantás del fondo con los dedos entumecidos y la encajás torcida. Entra torcida y ahí se queda.',
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
          'Te corrés del hueco y dejás que suban con ella. Nadie te empuja y nadie te agradece. Arriba, alguien cuenta en voz alta, y lo que cuenta no son monedas: son hombres.',
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
              'Le ponés la piedra en las manos y no le decís qué hacer con ella. Ilse la pesa una vez, como pesa un saco, y sube sola los escalones que haga falta subir.',
            ],
            effects: [{ take: 'sello_del_vado' }],
            next: 'fin_crecida',
          },
          partial: {
            text: [
              'Tarda en aceptarla y vos tardás en soltarla, y las cuatro manos quedan un momento abajo del mismo peso. Después se la lleva. No te mira mientras sube.',
            ],
            effects: [{ take: 'sello_del_vado' }],
            next: 'fin_crecida',
          },
          failure: {
            text: [
              'No te contesta lo que le preguntás. Te saca la piedra de las manos antes de que termines la frase. Sube la escalera de dos en dos, con el farol bajo el brazo.',
            ],
            effects: [{ take: 'sello_del_vado' }],
            next: 'fin_crecida',
          },
        },
      },
    },
    {
      id: 'subir_y_dejar_que_el_agua_decida',
      label: 'Subir y dejar que el agua decida',
      outcome: {
        text: [
          'Subís la escalera sin dar explicaciones y dejás la piedra abajo, al lado del hueco. Atrás, el agua sigue entrando por donde entra, y el hueco queda abierto.',
        ],
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
          'La metés contra las costillas, donde iba la carta, y buscás la boca del caz. Nadie te sigue. Cuando el río sube, nadie mira para abajo.',
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
          '—Vos abajo, yo arriba. —El sargento deja la ballesta en el agua y agarra la manivela con las dos manos—. Dos vueltas mías por cada una tuya, y sin hablar.',
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
          'Subís vos con la piedra y se la ponés en la mano, no en la mesa. Te paga lo hablado, sin descontar nada, y anota el vado en el libro de rutas del año que viene.',
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
  onEnter: [{ set: 'char:vado.sello_hundido' }],
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
  onEnter: [{ set: 'char:vado.vendido' }, { set: 'world:vado.sello_perdido' }],
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
  onEnter: [{ set: 'char:vado.vinculo_ilse' }, { set: 'world:vado.aldamar_inundada' }],
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
  onEnter: [{ set: 'char:vado.heredero' }, { set: 'world:vado.sello_perdido' }],
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
