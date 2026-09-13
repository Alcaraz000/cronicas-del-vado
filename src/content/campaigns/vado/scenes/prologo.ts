import type { Scene } from '@/content/schema';

/**
 * LOTE 1 — Prólogo de "El vado de Aldamar" (5 escenas, primera noche bajo la lluvia).
 *
 * VERSIÓN CONSOLIDADA. Base: piloto `seco` (ganador por unanimidad del jurado). Injertos de `voz`
 * y uno de `atmosferico`, más los arreglos que el jurado pidió. Esta es la prosa que fija la voz de
 * la campaña: los lotes 2-7 la leen destilada en la guía de voz que salió de este archivo.
 *
 * Estructura definitiva e intacta respecto del esqueleto: no se tocó ni una `choice`, ni un `label`,
 * ni un `requires`, ni un `lockedHint`, ni un `roll`, ni un `effects`, ni un `next`, ni un `onEnter`,
 * ni un `npcs`, ni un `place`, ni un `variant`. Lo único que entró acá es texto.
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
 * `normal`. El único `crit` del tramo es `p_puente.convencer_a_la_guardia` y el único `fumble` es
 * `p_vado_oculto.leer_las_marcas_del_sauce` (§5/r04, cupo nombrado uno por uno).
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
 * DEUDA SALDADA. Las tres variantes de memoria de la cuota (biblia §9.1) están escritas y las tres
 * son **párrafos de narrador**, sin `speaker`:
 *   · `p_camino`        → `{ any: [endingSeen ×4] }`   base 26 / variante 23
 *   · `p_puente`        → `{ met: 'orell' }`            base 39 / variante 38
 *   · `p_vado_oculto`   → `{ knows: 'vado_oculto' }`    base 47 / variante 31
 * Regla congelada acá para los seis lotes que faltan: **una variante de memoria nunca es más larga
 * que la base que reemplaza**, y las tres cambian el foco (el que vuelve cuenta, no mira).
 *
 * Pasada de voz hecha a mano (§5/r08c): Orell vive en `world/npcs.ts`, así que r08 NO frenaría un
 * párrafo suyo con `met`, `knows` o `endingSeen`. **Ninguno de los párrafos con `speaker: 'orell'`
 * de este archivo lleva memoria**: el único que varía lo hace por `{ wounds: { gte: 1 } }`, que es
 * estado de esta partida y es legal en boca de un PNJ (§9.1).
 *
 * VERIFICADO EN EL MOTOR (lo que ningún piloto se había fijado): `ui/components/Parrafos.tsx`
 * **imprime el nombre visible del PNJ** cuando un párrafo lleva `speaker`. O sea que un párrafo con
 * `speaker: 'orell'` ya pone "Sargento Orell:" en pantalla. La solución de que **Pell lo nombre en
 * el `text` base de `p_puente`** se conserva igual, porque cubre las rutas sin `crit` y porque es el
 * mejor beat del personaje; y por eso también el `crit` de `convencer_a_la_guardia` puede hacer que
 * Orell se presente él mismo sin que suene redundante: ahí gana relación, no información.
 *
 * Detalles sensoriales (uno por escena, ninguno repetido, ninguno en párrafo con variante de
 * memoria): `p_camino` oído/tacto — el golpe del río en los pilares, que llega por las suelas (firma
 * de `puente_viejo`, primer y único uso) · `p_puente` olfato — sebo quemado y lana mojada ·
 * `p_puente_rechazo` tacto — el palmo tibio del pretil donde estuvo colgado el farol ·
 * `p_vado_oculto` tacto — el frío subiendo por la pantorrilla (firma de `vado_oculto`, primer uso) ·
 * `p_puente_amanecer` oído — la cuerda de la ballesta chillando al aflojarse.
 * QUEMADA: «la ropa pesando el doble» (`p_camino.rodear_por_la_orilla.partial`). Los tres pilotos la
 * usaron; se gasta una vez acá y no vuelve a aparecer en la campaña.
 *
 * Cupos gastados: `usted` ×2 (las dos de Pell en `p_puente`). Puteadas: 0. Adverbios en -mente: 0.
 * `muy`: 0. `de repente`/`de pronto`: 0. `parece que`: 0. `como si fuera`: 0. Oración sin verbo:
 * una por escena como máximo (p_camino, p_puente y p_vado_oculto gastan la suya; las otras dos, 0).
 *
 * Arranques (tres primeras palabras del texto base): `p_camino` "Hace once días" · `p_puente` "Dos
 * faroles cuelgan" · `p_puente_rechazo` "Orell te acompaña" · `p_vado_oculto` "Media legua río" ·
 * `p_puente_amanecer` "Clarea sin sol". Las cinco primeras palabras son distintas entre sí y ninguna
 * está en la lista de quemados de §2.7.
 *
 * TRES ANOTACIONES PARA EL DISEÑO (no se tocó nada; se anota y se sigue).
 * (a) `p_puente_amanecer` = 84 palabras era una celda **mal calculada**, no exigente. Con `text` base
 *     de 60 quedaban 24 para cinco opciones, y dos de ellas (`bajar_al_vado_antes_de_que_aclare` y
 *     `seguir_la_orilla_hasta_el_sauce`) comparten `next` y no tienen `effects`, así que §2.5
 *     obliga a pagarlas con texto. **SALDADO en la Fase H · tarea 4**: la celda sube a **160** por
 *     el piso aritmético del outline §2.1 (`text` 60 + 5 desenlaces × 20 del piso de la biblia
 *     §2.3), y la prosa que las 84 habían forzado a tirar está restituida —el texto base vuelve a
 *     sus 70 palabras, la muela del sargento a `compartir_el_pan_con_la_guardia` y el silencio de
 *     Orell a `preguntarle_por_tome`—. La escena mide 198 contra 160 y sus cinco desenlaces vuelven
 *     a estar dentro de la banda de 20-60.
 *     **Queda un resto por anotar, y es de la columna `text`, no de `pal`:** la escena escribe 70 de
 *     base contra una celda `text` de 60, así que la versión original entera medía 202 y el tope del
 *     linter para 160 son 200. Entró sacando **cuatro** palabras («para pasarlo» y «el ruido del
 *     agua cambia y»). Si se quiere el original palabra por palabra, lo que corresponde es que
 *     `text` pase de 60 a 70 —que es lo que la escena escribe y sigue en la banda 60-160— y con
 *     ella `pal` a 170. **No se tocó: la autorización de la tarea 4 era sobre `pal` y sobre estas
 *     tres celdas, no sobre la columna `text`.**
 * (b) Geografía: la biblia §1.3 pone la torre de la guardia en la punta **norte** del puente, pero
 *     el `canonPrompt` de `puente_viejo` la pinta en la punta **lejana**, con el pueblo detrás. Como
 *     el fondo pintado es lo que el jugador ve, esta prosa sigue la imagen: barricada cerca, torre
 *     lejos, Aldamar del otro lado. **Decisión pendiente antes del lote 2**: tres escenas de acá la
 *     describen y `puente_viejo` vuelve en cinco.
 * (c) Ambigüedad del molino: §1.3 dice que el prólogo pasa «delante del molino a oscuras» y §1.1
 *     dice que el molino tiene luz. Acá manda §1.1: la ventana de arriba está encendida en
 *     `p_vado_oculto` y ninguna línea dice "a oscuras". **Resolver en la biblia antes del lote 2.**
 * (d) Presupuesto medido, escena por escena, DESPUÉS del recorte de la Fase H · tarea 4:
 *     `p_camino` 349/396 · `p_puente` 573/556 · `p_puente_rechazo` 319/284 · `p_vado_oculto` 414/389
 *     · `p_puente_amanecer` 198/160 (celda corregida, ver (a)). Total 1.853 contra las 1.785 del
 *     outline §3 (+3,8 %); antes del recorte eran 1.944 contra 1.709 (+13,8 %). La causa del +3,5 %
 *     que queda es la misma que ya estaba anotada: el prólogo tiene **18 opciones sin tirada cuyo
 *     único cambio posible es el texto**, y la línea de outcomes de §3 no las paga a todas.
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
// p_camino — START. La única escena que no se puede saltear.
// `onEnter` entrega la `carta_lacrada`: ranura 1 de 6 (biblia §5).
// ---------------------------------------------------------------------------

export const p_camino = {
  id: 'p_camino',
  kind: 'normal',
  place: 'puente_viejo',
  onEnter: [{ give: 'carta_lacrada' }],
  text: [
    'Hace once días que Tomé, el molinero de Aldamar, no aparece. Te escribieron porque no sos de acá, porque hacés esto y porque cobrás.',
    'La carta va contra las costillas, en un trapo encerado. «Mirá, hace once días que nadie le ve el humo al molino y somos sesenta y cuatro casas que comen de esa rueda. Hay una bolsa de plata apartada para quien lo traiga, y bueno.» Firma Berta, la alcaldesa.',
    {
      variants: [
        {
          when: {
            any: [
              { endingSeen: 'fin_hundido' },
              { endingSeen: 'fin_dravos' },
              { endingSeen: 'fin_crecida' },
              { endingSeen: 'fin_heredero' },
            ],
          },
          text: 'El camino es el mismo. Ya sabés que Tomé está muerto desde antes de que te llegara la carta, y bajás igual.',
        },
        {
          text: 'El camino baja hacia el agua entre juncos aplastados y las tablas podridas de un embarcadero. Hace rato que no cruzás a nadie.',
        },
      ],
    },
    'Al fondo está el puente viejo, con una barricada de tablones y barriles en la boca del lado de acá. El río golpea los pilares con un ruido bajo que te sube por las suelas antes de llegarte al oído. Alguien cerró el paso de un pueblo que vive de que la gente pase.',
  ],
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
          success: {
            text: [
              'Bajás la pendiente agarrándote de los juncos. El barro se acaba en grava. Más adelante un sauce partido se acuesta sobre el río, y debajo la corriente cambia de ruido.',
            ],
            next: 'p_vado_oculto',
          },
          partial: {
            text: [
              'Terminás el resbalón sentado en el río, con el agua al pecho y la ropa pesando el doble. La pendiente cedió con vos encima. Salís contra la corriente: el sauce está adelante.',
            ],
            effects: [{ addCondition: 'empapado' }],
            next: 'p_vado_oculto',
          },
          failure: {
            text: [
              'Los juncos no aguantan. Caés de costado contra una raíz y algo en las costillas te avisa que va a doler un rato largo. La orilla termina en zarza: volvés al camino.',
            ],
            effects: [{ wound: 1 }],
            next: 'p_puente',
          },
        },
      },
    },
    {
      id: 'leer_otra_vez_la_carta',
      label: 'Leer otra vez la carta de Berta',
      outcome: {
        text: [
          'Buena letra, renglones derechos, ni una tachadura. Abajo la cifra, y al lado una palabra que no va en ningún contrato: «discreción».',
        ],
        next: 'p_puente',
      },
    },
    {
      // Uno de los dos tics de `sospecha` del prólogo (biblia §7.1, tope de +2 en todo el tramo).
      id: 'esperar_a_que_afloje_la_lluvia',
      label: 'Esperar a que afloje la lluvia',
      outcome: {
        text: [
          'La lluvia no afloja. Lo que pasa es un carro que baja del puente, se cruza con vos y no para. El carrero te mira el tiempo justo para poder describirte después.',
        ],
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'p_puente',
      },
    },
    {
      // [Origen] `hijo_de_la_frontera` (biblia §9.5). Suma: las 4 libres siguen en pie.
      id: 'leer_el_cielo',
      label: 'Leer el cielo y adelantarte a la tormenta',
      requires: { trait: 'hijo_de_la_frontera' },
      lockedHint: 'Hace falta haberte criado donde el mapa se acaba.',
      outcome: {
        text: [
          'Las nubes vienen del oeste, bajas y enteras, sin un corte. Eso no es un chaparrón: se queda tres días. Contás las noches que tenés y apurás el paso.',
        ],
        next: 'p_puente',
      },
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
  text: [
    'Dos faroles cuelgan de sendos postes y el viento les agacha la llama. La barricada es tablones y barriles de sal atados con soga de sirga. Huele a sebo quemado y a lana mojada. Al final, una torre baja y los postigos cerrados de Aldamar.',
    {
      variants: [
        {
          when: { met: 'orell' },
          text: 'Al sargento lo conocés: la cicatriz que le parte la ceja, el gambesón gris, el paso de quien ya hizo esta guardia mil veces. Para él sos un bulto que llega de noche del norte.',
        },
        {
          text: 'Un hombre sale de atrás de los barriles con la ballesta cruzada al pecho. Tendrá cincuenta y pico: barba gris corta y una cicatriz blanca en la ceja izquierda. No apunta a nadie y no hace falta.',
        },
      ],
    },
    'Detrás de él, un chico con un casco que le baja hasta las cejas repite lo que le hicieron aprender: «El paso está cerrado por bando, usted disculpe». Lo empieza otra vez, más bajo: «Sargento Orell, la séptima ordenanza dice que usted…». No la termina.',
    {
      speaker: 'orell',
      variants: [
        {
          when: { wounds: { gte: 1 } },
          text: '—Estás sangrando. Por acá no se cruza igual. Orden del capitán Dravos.',
        },
        { text: '—Por acá no se cruza. Orden del capitán Dravos. Volvé cuando aclare.' },
      ],
    },
  ],
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
          crit: {
            text: [
              'Le nombrás a Berta antes que a vos mismo y le mostrás el lacre sin soltarlo. El sargento lee el sello y corre un barril con la bota.',
              {
                speaker: 'orell',
                variants: [
                  {
                    text: '—Pasá. Lo voy a anotar como lo que fue. Orell, me llamo. Por si adentro te preguntan quién te dejó.',
                  },
                ],
              },
            ],
            effects: [{ set: 'run:orell_confia' }, { clear: 'run:orell_humillado' }],
            next: 'a1_plaza',
          },
          success: {
            text: [
              'Hablás poco y no pedís dos veces. Orell escucha con la ballesta baja, deja correr un silencio largo y le hace una seña al chico. Corren un barril: queda un hueco de un hombro.',
            ],
            effects: [{ set: 'run:orell_confia' }, { clear: 'run:orell_humillado' }],
            next: 'a1_plaza',
          },
          partial: {
            text: [
              'Te deja pasar, pero antes te hace decir el nombre, de dónde venís y a quién buscás, y el chico lo anota en una tablilla. La tablilla sube a la torre con el relevo.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'a1_plaza',
          },
          failure: {
            text: [
              'Repetís el argumento una vez de más. El sargento no contesta: se corre medio paso y te tapa el hueco. El chico afloja el gancho de la ballesta. Quedó tu cara para acordarse.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'p_puente_rechazo',
          },
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
          success: {
            text: [
              'Te parás lo bastante cerca como para que tenga que elegir. Orell no retrocede ni llama a nadie. «Pasá», dice, y lo dice para adentro. El chico saca los tablones solo.',
            ],
            effects: [{ set: 'run:orell_humillado' }],
            next: 'a1_plaza',
          },
          partial: {
            text: [
              'Aguanta el envite de pie y sin hablar. Lo que cede es otra cosa: el chico da un paso atrás y el sargento lo ve darlo. Te saca del puente del brazo.',
            ],
            effects: [{ set: 'run:orell_humillado' }, { clock: 'sospecha', delta: 1 }],
            next: 'p_puente_rechazo',
          },
          failure: {
            text: [
              'El sargento te deja terminar. Después levanta dos dedos y el chico baja la punta de la lanza a tu cintura. «Dos relevos por noche. Todos con la misma orden».',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'p_puente_rechazo',
          },
        },
      },
    },
    {
      // Primera de las cuatro maneras de gastar la `carta_lacrada` (biblia §5).
      id: 'entregarle_la_carta_para_cruzar',
      label: 'Entregarle la carta lacrada para cruzar',
      outcome: {
        text: [
          'Orell rompe el lacre tapando el papel con el cuerpo. Lee dos veces, dobla la carta y se la guarda. «Esto sube a la torre. Vos pasá».',
        ],
        effects: [{ take: 'carta_lacrada' }],
        next: 'a1_plaza',
      },
    },
    {
      // Fuente 1 de 2 de `run:vio_runas` (la otra es `a1_molino_trampilla.leer_las_marcas`).
      // Destino `p_puente_rechazo` por el conflicto 11 del outline.
      id: 'mirar_las_runas_del_pilar',
      label: 'Mirar las runas del pilar',
      outcome: {
        text: [
          'El primer pilar tiene una banda de signos a la altura del agua, comidos por el limo. No son letras de las que usás: una se repite cada cinco. Orell te ve mirarlas.',
        ],
        effects: [{ set: 'run:vio_runas' }],
        next: 'p_puente_rechazo',
      },
    },
    {
      id: 'esperar_el_relevo_del_alba',
      label: 'Esperar el relevo del alba',
      outcome: {
        text: [
          'Te corrés bajo el arco, fuera de la luz, y aguantás. El chico sube a la torre y baja con otro, que pregunta por el del camino.',
        ],
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'p_puente_amanecer',
      },
    },
    {
      // [Explorador] (biblia §9.5): llega al vado sin tirada. Sabor y atajo, nunca llave.
      id: 'leer_la_orilla',
      label: 'Leer la orilla desde el pretil',
      requires: { class: 'explorador' },
      lockedHint: 'Solo un Explorador le saca el paso al río de una mirada.',
      outcome: {
        text: [
          'Desde el pretil el río se lee como una página: donde el agua se arruga hay piedra abajo. La arruga está media legua abajo, junto a un sauce partido.',
        ],
        next: 'p_vado_oculto',
      },
    },
    {
      // Atajo [Recuerdo] 1 (biblia §9.3). `knows` se LEE, nunca se escribe.
      id: 'bajar_al_vado_que_ya_conoces',
      label: 'Bajar al vado que ya conocés',
      requires: { knows: 'vado_oculto' },
      lockedHint: 'Hay que haber estado antes en el vado.',
      outcome: {
        text: [
          'No hace falta mirar el agua: las piernas se acuerdan del sauce y del orden de las piedras. Te vas antes de que al sargento se le ocurra preguntar.',
        ],
        next: 'p_vado_oculto',
      },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// p_puente_rechazo — Orell te sacó del puente. Se entra desde `p_puente` por tres vías.
// Orell está declarado y no habla: su enojo se ve en que se calla (biblia §3).
// ---------------------------------------------------------------------------

export const p_puente_rechazo = {
  id: 'p_puente_rechazo',
  kind: 'normal',
  place: 'puente_viejo',
  npcs: ['orell'],
  text: [
    'Orell te acompaña hasta donde se terminan los tablones y ahí se para. No te empuja. Mira cómo bajás los tres escalones de piedra y recién entonces vuelve. Apoyás la mano en el pretil: la piedra está fría y lisa, salvo un palmo tibio donde estuvo colgado el farol.',
    'Atrás, los tablones vuelven a su lugar de a uno. La barricada tapa la boca del puente y nada más: el terraplén baja entre zarzas y a la altura del segundo arco asoma un pilar caído. Río abajo el camino sigue.',
  ],
  choices: [
    {
      id: 'colarte_por_el_terraplen',
      label: 'Colarte por el terraplén',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo'],
        outcomes: {
          success: {
            text: [
              'Entrás en la zarza de rodillas y salís bajo el primer arco, tapado de los faroles. Cruzás por la cornisa con el río sonando a olla debajo.',
            ],
            next: 'a1_plaza',
          },
          partial: {
            text: [
              'Pisás mal en la cornisa y el río te recibe de costado. Salís veinte pasos más abajo, con una bota menos. Arriba nadie gritó.',
            ],
            effects: [{ addCondition: 'empapado' }],
            next: 'a1_plaza',
          },
          failure: {
            text: [
              'La zarza te agarra la capa y hay que arrancarla de un tirón. El chico del casco asoma sobre el pretil y grita un nombre que no es el tuyo. Te quedás quieto en el barro.',
            ],
            effects: [{ clock: 'sospecha', delta: 1 }],
            next: 'p_puente_amanecer',
          },
        },
      },
    },
    {
      // La certeza cuesta una Herida: es la salida sin dado de la escena.
      id: 'cruzar_por_el_pilar_caido',
      label: 'Cruzar por el pilar caído',
      outcome: {
        text: [
          'El pilar caído es una lengua de piedra a un palmo del agua. Vas a gatas. En la mitad el musgo cede y el hombro da contra el canto: el ruido lo escuchás por dentro. El brazo te queda muerto.',
        ],
        effects: [{ wound: 1 }],
        next: 'a1_plaza',
      },
    },
    {
      id: 'buscar_el_paso_rio_abajo',
      label: 'Buscar el paso río abajo',
      outcome: {
        text: [
          'Dejás el talud y seguís la orilla río abajo. En dos vueltas del camino los faroles del puente se apagan atrás.',
        ],
        next: 'p_vado_oculto',
      },
    },
    {
      // Segundo y último tic de `sospecha` disponible en el prólogo (tope +2, biblia §7.1).
      id: 'acampar_hasta_el_relevo',
      label: 'Acampar hasta el relevo',
      outcome: {
        text: [
          'Armás reparo bajo el talud y aguantás sentado. Dos veces en la noche el chico baja con el farol y te alumbra la cara. La segunda vuelve caminando rápido.',
        ],
        effects: [{ clock: 'sospecha', delta: 1 }],
        next: 'p_puente_amanecer',
      },
    },
    {
      // [Guerrero] (biblia §9.5): enciende `run:orell_confia` sin tirada. Alcanzable en
      // `p_puente_rechazo` después de que `intimidar_al_sargento` haya encendido
      // `run:orell_humillado` (oleada final de la Fase H, hallazgo C): limpiarlo acá es lo que
      // mantiene el par mutuamente excluyente.
      id: 'reconocer_el_escudo',
      label: 'Reconocer el escudo del sargento',
      requires: { class: 'guerrero' },
      lockedHint: 'Hay que haber servido para leer un escudo así.',
      outcome: {
        text: [
          'El escudo del poste lleva la marca de una compañía que ya no existe. Decís el nombre y el año. Orell tarda en contestar y después corre un tablón con la bota. «Andá».',
        ],
        effects: [{ set: 'run:orell_confia' }, { clear: 'run:orell_humillado' }],
        next: 'a1_plaza',
      },
    },
    {
      // Atajo [Recuerdo] 1, segunda puerta (biblia §9.3).
      id: 'bajar_al_vado_que_ya_conoces',
      label: 'Bajar al vado que ya conocés',
      requires: { knows: 'vado_oculto' },
      lockedHint: 'Hay que haber estado antes en el vado.',
      outcome: {
        text: [
          'Las piernas se acuerdan del camino antes que vos. No mirás atrás para saber si el sargento te mira.',
        ],
        next: 'p_vado_oculto',
      },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// p_vado_oculto — el sauce partido y las piedras. Única salida del prólogo al molino.
// LA PIEDRA QUE FALLA ES LA CUARTA, y es la misma en las tres apariciones de esta escena y en
// `c2_vado_crecido`: se cuentan siete y la cuarta está más honda. No cambiarla en el lote 5.
// ---------------------------------------------------------------------------

export const p_vado_oculto = {
  id: 'p_vado_oculto',
  kind: 'normal',
  place: 'vado_oculto',
  text: [
    'Media legua río abajo el barro se acaba y empieza la grava. El sauce está partido por un rayo viejo: la mitad muerta se acuesta sobre el agua, la otra sigue con hojas. Metés un pie y el frío te sube por la pantorrilla antes de que el agua pase del tobillo.',
    'Debajo del sauce, una línea de piedras planas corta la corriente. Contás siete. La cuarta está más honda que las demás, o está más honda hoy.',
    {
      variants: [
        {
          when: { knows: 'vado_oculto' },
          text: 'Río arriba, la misma ventana encendida que la otra vez. Ya sabés qué piedra falla: la cuarta, la del borde redondo, que se hunde un palmo cuando la pisás.',
        },
        {
          text: 'Río arriba, en mitad del agua, hay una isla baja y en la isla un edificio grande y negro con la rueda quieta: el molino, con luz en la ventana de arriba. De este lado, grava pisoteada y marcas de quilla en el barro.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'cruzar_por_las_piedras',
      label: 'Cruzar por las piedras del vado',
      outcome: {
        text: [
          'Las piedras están cubiertas de un limo que no se ve. Vas de costado, apoyando el canto del pie. La cuarta se hunde un palmo y el agua te llega a la ingle.',
        ],
        effects: [{ addCondition: 'empapado' }],
        next: 'a1_plaza',
      },
    },
    {
      // El único `fumble` del prólogo (§5/r04). NO enciende `run:vio_runas`: ese flag tiene dos
      // fuentes cerradas (`p_puente.mirar_las_runas_del_pilar` y `a1_molino_trampilla`).
      // La banda de fallo NO te hace pisar la cuarta piedra: el jugador que vuelve ya la tiene
      // nombrada en la variante de memoria y el personaje no puede olvidarla dos párrafos después.
      id: 'leer_las_marcas_del_sauce',
      label: 'Leer las marcas del sauce partido',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber', 'percepcion'],
        outcomes: {
          success: {
            text: [
              'En la corteza muerta hay muescas de cuchillo a la altura del pecho: marcas de agua, once, cada una un dedo más alta. Un reguero de barro sube por el caz hasta una trampilla.',
            ],
            next: 'a1_molino_trampilla',
          },
          partial: {
            text: [
              'Que son marcas de agua lo sacás enseguida. Cuántas y de cuándo, no: la cuenta se te mezcla con la lluvia. Cruzás derecho a la puerta grande del molino.',
            ],
            next: 'a1_molino',
          },
          failure: {
            text: [
              'Le acercás la cara a la corteza y no sacás nada en limpio: tajos viejos, musgo, agua encima. Al retroceder el pie se te va en la raíz mojada y la rodilla da contra el tronco.',
            ],
            effects: [{ wound: 1 }],
            next: 'a1_plaza',
          },
          fumble: {
            text: [
              'Te subís a la rama muerta para llegar a las marcas de arriba. Cede en el nudo y te lleva. El río te da vuelta una vez y te suelta en la grava, de cara.',
            ],
            effects: [{ wound: 1 }, { addCondition: 'empapado' }],
            next: 'a1_plaza',
          },
        },
      },
    },
    {
      id: 'subir_por_el_caz',
      label: 'Subir por el caz hasta la trampilla',
      outcome: {
        text: [
          'El caz es un canal de tablones que entra por debajo del molino. Vas por el borde, con el agua sonando hueca abajo.',
        ],
        next: 'a1_molino_trampilla',
      },
    },
    {
      id: 'rodear_hasta_la_puerta_del_molino',
      label: 'Rodear hasta la puerta del molino',
      outcome: {
        text: [
          'Rodeás la isla por la grava. La puerta del molino da contra el viento y el candado no está puesto: cuelga.',
        ],
        next: 'a1_molino',
      },
    },
    {
      id: 'mirar_la_luz_del_molino',
      label: 'Mirar la luz del molino antes de cruzar',
      outcome: {
        text: [
          'La ventana de arriba tiene luz de farol, no de fuego, y se mueve: alguien la lleva de una punta a la otra.',
        ],
        next: 'a1_molino',
      },
    },
    {
      // [Mago] (biblia §9.5): cruza sin Herida y sin quedar `empapado`.
      id: 'nombrar_el_agua',
      label: 'Nombrar el agua',
      requires: { class: 'mago' },
      lockedHint: 'Solo un Mago sabe con qué nombre se le habla a un río.',
      outcome: {
        text: [
          'Le decís al río el nombre que tenía antes del pueblo. No se abre ni se calla: te deja pasar, que es otra cosa. Cruzás con las botas secas.',
        ],
        next: 'a1_plaza',
      },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// p_puente_amanecer — convergencia del prólogo. 5 opciones, las 5 libres, cero tiradas.
// `onEnter` enciende `run:orell_confia`: esperar el relevo ES la fuente (biblia §7.2). También
// limpia `run:orell_humillado` (oleada final de la Fase H, hallazgo C): esta escena es
// alcanzable después de `p_puente.intimidar_al_sargento` (partial) o de `acampar_hasta_el_relevo`
// en `p_puente_rechazo` con el humillado ya prendido, y el par es mutuamente excluyente.
// La celda de 84 palabras del outline §2 es insatisfacible; ver nota (a) de la cabecera.
// ---------------------------------------------------------------------------

export const p_puente_amanecer = {
  id: 'p_puente_amanecer',
  kind: 'normal',
  place: 'puente_viejo',
  variant: 'amanecer',
  npcs: ['orell'],
  onEnter: [{ set: 'run:orell_confia' }, { clear: 'run:orell_humillado' }],
  text: [
    'Clarea sin sol. El río pasó de negro a marrón y ahora se le ven las cosas que arrastra. En la cabecera del puente el relevo afloja la cuerda de la ballesta y la cuerda chilla al ceder: ese es el ruido que hace una noche cuando se termina.',
    {
      speaker: 'orell',
      variants: [
        {
          text: '—Pasá. Doce guardias y ninguna novedad. —Corre un tablón con la bota—. La alcaldesa está en la plaza a esta hora.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'cruzar_con_el_relevo',
      label: 'Cruzar con el relevo de la mañana',
      outcome: {
        text: [
          'Cruzás en el medio del relevo, entre hombres que ya no miran nada. Del otro lado el puente se termina en barro.',
        ],
        next: 'a1_plaza',
      },
    },
    {
      id: 'preguntarle_por_tome',
      label: 'Preguntarle a Orell por Tomé',
      outcome: {
        text: [
          {
            speaker: 'orell',
            variants: [
              {
                text: '—Once días. Al cuarto mandé dos guardias al molino. No entraron. —Se queda callado más de lo que dura la frase—. Eso no te lo puedo decir.',
              },
            ],
          },
        ],
        next: 'a1_plaza',
      },
    },
    {
      id: 'compartir_el_pan_con_la_guardia',
      label: 'Compartir el pan con la guardia',
      outcome: {
        text: [
          'El pan es de ayer y hay que mojarlo. Comen de pie, sin hablar, mirando el agua. Al sargento le falta una muela del lado derecho y mastica del otro.',
        ],
        next: 'a1_plaza',
      },
    },
    {
      id: 'bajar_al_vado_antes_de_que_aclare',
      label: 'Bajar al vado antes de que aclare',
      outcome: {
        text: [
          'Bajás del terraplén mientras la guardia se cambia de sitio. Nadie pregunta adónde vas. A esta hora el río está bajo y se le ven los huesos.',
        ],
        next: 'p_vado_oculto',
      },
    },
    {
      id: 'seguir_la_orilla_hasta_el_sauce',
      label: 'Seguir la orilla hasta el sauce partido',
      outcome: {
        text: [
          'Seguís la orilla río abajo, pisando grava mojada. A media legua el ruido del agua se vuelve corto: ahí abajo hay piedra.',
        ],
        next: 'p_vado_oculto',
      },
    },
  ],
} satisfies Scene;
