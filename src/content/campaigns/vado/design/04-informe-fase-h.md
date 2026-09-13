# Informe de contenido — Fase H · tarea 2: que ceder cueste algo

Lo escribe a mano quien hizo la tarea. Mide contra `sim-report.md`, que lo escribe `npm run simulate`.

El defecto: **41 de las 42 escenas no finales ofrecían una opción sin tirada y sin `requires`**, y un
jugador prudente terminaba la campaña con **0 tiradas, 0 Heridas, 9 de los 10 hitos y siempre el
mismo final**. El sistema de reglas no se encendía nunca.

La opción libre **no se quitó** en ninguna parte: protege la regla de la spec §4 (toda escena mortal
necesita salida sin tirada) y al jugador que no quiere arriesgar. Lo que se corrigió es que fuera
gratis, y solo en las escenas **bisagra**, los cuellos por los que pasa toda partida. Las 41 escenas
de exploración lateral quedaron intactas: ahí ceder gratis está bien.

---

## 1. Qué se cambió, escena por escena

Ninguna opción se sacó, ninguna ganó `requires`, ningún `next` se movió y ninguna cuenta de la
columna `opc`/`libres` del outline §2 cambió. Lo único que entró son `effects`, `label` y prosa.

| # | Escena · opción | Costo nuevo | Por qué es consistente |
|---|---|---|---|
| 1 | `c1_acusacion.ceder` | `{ take: 'carta_lacrada' }` | Es la escena más pública de la campaña: Dravos, Berta y la ronda entera están en `npcs`. Ya existía `mostrarle_la_carta_a_dravos`, que gasta la carta **a cambio de algo**. Si te dejás procesar sin jugar ninguna carta, el que te cachea la encuentra igual, y te quedás sin el beneficio de haberla mostrado vos. Es la **quinta** manera de gastar la `carta_lacrada` (biblia §5). |
| 2 | `c1_refriega.rendirte` | `{ clock: 'sospecha', delta: 1 }` | Para llegar acá ya elegiste correr o resistirte. Rendirte de golpe en medio de la plaza, delante de Dravos y de la línea de guardia, es un cambio de conducta con testigos concretos. El tic lo nombra la ficción: el chico del casco anota la hora en que cambiaste de idea. |
| 3 | `c2_orilla.remar_en_la_barca_de_tome` | `{ clock: 'sospecha', delta: 1 }` | Era una inconsistencia, no una excepción: las otras dos maneras de evitar el vado ya cuestan (esperar, +1 de `sospecha`; el azud, una Herida). El texto de esta misma opción ya decía que del molino salió gente a mirar: es la menos discreta de las tres y era la única gratis. |
| 4 | `cl_halvar.bajar_al_sotano_sin_contestar` | `{ clock: 'sospecha', delta: 1 }` | Dravos está declarado en la escena y pasó la noche fichando conductas. Irse de una negociación sin ofrecer nada ni dar un motivo, delante del capitán, se ve. |
| 5 | `cl_desenlace.subir_y_dejar_que_el_agua_decida` | `{ take: 'sello_del_vado' }` | Estaba diagnosticado y sin hacer: la nota (e) de la cabecera de `desenlace.ts` lo pedía. Era la única de las siete opciones sin ningún efecto, y por eso era la salida del jugador de cero tiradas: llegaba a un final con la piedra en la mochila mientras el epílogo contaba que la usó Ilse. |
| 6 | `a2_ley_orell.onEnter` → éxito de `preguntarle_por_la_orden_escrita` | `run:orell_confia` deja de regalarse | `cl_dravos.que_orell_lo_detenga` pide `run:orell_confia`, que parecía un requisito, pero lo encendía **gratis e incondicionalmente** el `onEnter` de `a2_ley_orell`, al que se llega por cualquier opción libre de `a2_amanecer`: el clímax se resolvía sin tirar, con un flag regalado. Ahora la fuente de la rama A es el **éxito** de la tirada de Presencia, como en el prólogo, donde solo el éxito de `convencer_a_la_guardia` lo enciende. El `clear` de `run:orell_humillado` —su par mutuamente excluyente— viaja con el `set`, en la misma banda. Se respeta la cuota de biblia §7.2: una fuente por acto para un flag de relación. |

### Y los hitos

| # | Hito | Qué se hizo |
|---|---|---|
| 1 | `cerrar_la_cronica` | Se mudó de `cl_desenlace.onEnter` al `onEnter` de los **cuatro** finales. Se marcaba al entrar al desenlace, es decir **antes** de elegir el final: premiaba haber bajado una escalera. Ahora marca haber cerrado algo, y una partida que se pierde en el clímax ya no se lo lleva. `cl_desenlace` queda sin `onEnter`, y puede: no vuelve a sí misma, así que no necesita nada que corte el bucle. |
| 2 | `enfrentar_a_dravos` | **Verificado, no movido.** El defecto era que el enfrentamiento se resolvía con `que_orell_lo_detenga` **sin tirar un dado**, y eso lo arregla el cambio 6: en la traza de la política prudente, las tiradas en `cl_dravos` pasaron de 0 a 1 en tres de las cuatro clases, y los ocho avisos de "termina la campaña sin tirar un solo dado" bajaron a dos. El hito sigue en `cl_dravos.onEnter` y `cl_halvar.onEnter`, que es lo que dice biblia §7.4. |
| 3 | `ver_el_sello` | Tenía **dos** vías gratuitas en la rama A (`a2_ley_torre.leer_el_sigilo_de_la_mesa` y `a2_ley_cartas.buscar_el_mapa`) y una en la B (`a2_fuera_sotano.onEnter`). Ahora queda **una gratuita por rama**: `leer_el_sigilo_de_la_mesa` paga +1 de `sospecha`. Se cobra esa y no la otra porque es la única de las dos que tiene testigo: Dravos está declarado en `npcs` de `a2_ley_torre` y `a2_ley_cartas` no declara a nadie, y biblia §7.1 pide que cada tic tenga un sujeto que mire. La opción **no** se quitó y el flag `run:vio_el_sello` conserva sus cinco fuentes. |

`la_verdad_de_tome` **no se tocó**: es el hito que el diseño ya cobra bien (exige tirada en sus dos
puertas de la rama A) y es justamente el que la ruta muda no consigue.

### Un costo se ve antes de elegir

El motor deriva el `badge` del `requires` (`resolve.ts::badgeDe`) y estas seis opciones no tienen
`requires`, así que el aviso va en el `label`, en ficción y sin nombrar la mecánica (biblia §10):

| Antes | Ahora |
|---|---|
| Bajar la voz y dejar que te tomen nota | **Bajar la voz y dejar que te tomen la carta** |
| Abrir las manos y rendirte | **Abrir las manos y rendirte delante de todos** |
| Remar hasta la isla en la barca de Tomé | **Remar hasta la isla, a la vista del molino** |
| Bajar al sótano sin contestarle | **Bajar al sótano sin contestar, delante del capitán** |
| Subir y dejar que el agua decida | **Dejar la piedra donde está y que el agua decida** |
| Leer el sigilo lacrado de la mesa | **Leer el sigilo lacrado delante de Dravos** |

Los seis `label` quedan en 60 caracteres o menos, y un test los comprueba uno por uno.

---

## 2. Qué NO se tocó, y por qué

- **`cl_dravos`.** Es la única de las diez bisagra que ya estaba bien: no tiene ninguna opción sin
  tirada y sin `requires`. Es la "1 de 42" que el informe de la Fase E reporta como excepción.
- **`a2_amanecer`.** Sus cuatro opciones libres son libres **por diseño explícito**: acá el Burnt
  Bridge es la escena, no la opción, y el costo ya existe y es grande (comprometer la rama). Además
  el amanecer está vacío —no hay un solo PNJ declarado— y un tic de `sospecha` sin nadie que te vea
  rompe la regla de biblia §7.1 de que la sospecha necesita un sujeto que mire.
- **`c2_anochece`.** Es escena de aviso, no de habilidad, y su propio comentario lo dice. La
  asimetría correcta ya está: `buscar_una_cuerda` entrega la `cuerda_de_molinero`, que es ventaja
  real en el vado crecido (`advantageIf` de `cruzar_de_frente`). Castigar a quien no la agarra sería
  penalizar la escena por hacer exactamente lo que tiene que hacer.
- **Las 41 escenas no bisagra.** En una escena de exploración lateral, ceder gratis está bien.
- **`src/engine/`, el esquema y `tools/`.** Esta tarea es de contenido. El instrumento ya estaba
  hecho: cambiarlo para que diera el número buscado sería hacer trampa.

---

## 3. La simulación, antes y después

Semilla 20260912, 100 carreras por combinación, 4 partidas por carrera, 12.490 partidas.

### La política prudente, que es la que se estaba midiendo

| Clase | Nivel | Derrota antes → después | Heridas antes → después | Hitos antes → después | Tiradas antes → después |
|---|---|---|---|---|---|
| guerrero | 1 | 0,0 % → **0,0 %** | 0,00 → **1,30** | 9,0 → **9,0** | 0,0 → **1,0** |
| guerrero | 3 | 0,0 % → **1,5 %** | 0,00 → **1,19** | 9,0 → **9,0** | 0,0 → **1,0** |
| explorador | 1 | 0,0 % → 0,0 % | 0,00 → 0,00 | 9,0 → 9,0 | 0,0 → **1,3** |
| explorador | 3 | 0,0 % → 0,0 % | 0,00 → 0,00 | 9,0 → 9,0 | 0,0 → **1,4** |
| mago | 1 | 0,0 % → 0,0 % | 0,00 → 0,00 | 9,0 → 9,0 | 0,0 → 0,0 |
| mago | 3 | 0,0 % → 0,0 % | 0,00 → 0,00 | 9,0 → 9,0 | 0,0 → 0,0 |
| clerigo | 1 | 0,0 % → 0,0 % | 0,00 → **0,31** | 9,0 → 9,0 | 0,0 → **1,7** |
| clerigo | 3 | 0,0 % → 0,0 % | 0,00 → **0,10** | 9,0 → 9,0 | 0,0 → **1,5** |

Avisos de "termina la campaña sin tirar un solo dado": **8 antes → 2 después** (solo el mago, que
cierra el encuentro con su opción de clase `apagar_la_runa_un_latido`, que es sabor y atajo por
contrato de biblia §9.5).

### La campaña entera

| | Antes | Después |
|---|---|---|
| Escenas visitadas | 46/46 | 46/46 |
| Opciones elegidas | 252/252 | 252/252 |
| Escenas distintas por partida | 25,1 (75,9 % en 24–30) | 25,1 (**75,4 %** en 24–30) |
| Derrota · muerte · heridas | 20,7 % · 1,6 % · 0,90 | **21,6 %** · 1,6 % · **1,09** |
| Tiradas por partida | 6,2 | **6,4** |
| Aserción 4 (codiciosa ≥ 3 tiradas) | 3,4 | 3,4 |
| Finales `hundido / dravos / crecida / heredero` | 1450 / 5993 / 2149 / 128 | **953** / **6323** / **2196** / 126 |

Las cuatro aserciones siguen pasando y los cuatro finales se siguen alcanzando con las cuatro clases.

**Efecto lateral medido y aceptado:** `fin_hundido` baja de 1450 a 953 partidas (−34 %). La causa es
directa y esperable: `cl_desenlace.cerrar_la_compuerta_con_orell` pide `run:orell_confia`, que dejó
de regalarse. El otro camino a ese final (`devolver_el_sello_a_la_piedra`, Vigor · normal, sin
`requires`) sigue abierto para las cuatro clases, y la aserción 3 lo confirma.

---

## 4. Lo que la medición dice y el brief no podía saber

**La columna Hitos de la prudente no bajó, y hay una razón concreta.** Se trazó una partida completa
de cada clase con el simulador real (`simularCarrera`, política `prudente`, semilla 20260912) y la
ruta es siempre la misma:

```
p_camino → p_puente → [hub, 3 pistas] → c1_cuerpo#enterrarlo → c1_acusacion#ceder → a2_amanecer#presentarte_en_la_torre
→ a2_ley_orell#entrar_con_el_a_la_torre → a2_ley_torre#leer_el_sigilo_de_la_mesa → a2_ley_cartas#buscar_el_mapa
→ a2_ley_halvar → a2_ley_berta → a2_ley_guardia → c2_anochece#buscar_una_cuerda → c2_orilla#bajar_al_vado
→ c2_vado_crecido#entregar_lo_que_llevas → c2_otra_orilla#dejar_el_sello_en_la_cadena
→ cl_molino#encarar_a_dravos → cl_dravos → cl_desenlace#dejar_que_la_guardia_cruce_con_la_piedra → fin_dravos
```

La política `prudente` de `tools/lib/simulate/politicas.ts` elige **la primera opción sin tirada en
el orden de la lista**, no "la opción que un jugador prudente elegiría". Por eso **cinco de las seis
opciones que la tabla manda cobrar no están en su ruta**:

| Opción cobrada | Qué hace la prudente en esa escena |
|---|---|
| `c1_acusacion.ceder` | **Sí la elige**, pero llega sin la `carta_lacrada`: ya la gastó en `p_puente.entregarle_la_carta_para_cruzar`, que también es la primera libre de su escena. El `take` es un no-op. |
| `c1_refriega.rendirte` | Nunca entra a `c1_refriega`: cedió en la acusación. |
| `c2_orilla.remar_en_la_barca_de_tome` | Elige `bajar_al_vado`, que está listada antes, y baja a la escena mortal. |
| `cl_halvar.bajar_al_sotano_sin_contestar` | Nunca entra a `cl_halvar`: en `cl_molino` elige `encarar_a_dravos`, que está listada antes, y va a `cl_dravos`. |
| `cl_desenlace.subir_y_dejar_que_el_agua_decida` | Elige `dejar_que_la_guardia_cruce_con_la_piedra`, que está listada antes. |

Las dos que sí la tocan son `a2_ley_torre.leer_el_sigilo_de_la_mesa` (+1 de `sospecha`) y el arreglo
de `run:orell_confia`, y ese segundo es el que la obliga a tirar por primera vez en la campaña.

**Por qué 9 hitos siguen siendo 9.** Los nueve que junta la ruta muda son:
`llegar_al_puente`, `llegar_a_aldamar`, `hallar_a_tome`, `elegir_bando`, `ver_el_sello`,
`la_tormenta`, `cruzar_el_vado_crecido`, `enfrentar_a_dravos` y `cerrar_la_cronica`. Seis de los
nueve son `onEnter` de escenas **obligatorias** y marcan haber estado, que es lo que biblia §7.4
quiere que marquen. Los tres restantes:

- `ver_el_sello`: la prudente recorre el pasillo entero de la rama A, así que toca **las dos**
  puertas. Cobrar una no le saca el hito; le saca un tic de `sospecha` del bolsillo.
- `enfrentar_a_dravos`: la prudente entra a `cl_dravos` por `cl_molino#encarar_a_dravos`.
- `cerrar_la_cronica`: ahora está en los finales, y la prudente llega a un final el 98,5–100 % de
  las veces.

Es decir: **mientras la prudente termine la partida, 9 hitos es el número correcto** (biblia §9.1:
"una primera partida completa toca entre 8 y 10"). La columna solo baja si la prudente **pierde**, y
para perder necesita 3 Heridas. Hoy llega al clímax con 0 y sale de `cl_dravos` con una sola tirada,
porque `huir_escaleras_abajo` (Astucia · normal) manda a `cl_desenlace` en dos de sus tres bandas.

**Queda abierto y necesita una decisión de diseño** (no se improvisó acá): si se quiere que la ruta
muda pueda perder, el presupuesto de Heridas de biblia §9.6 —"el cuello 1 puede costar 2; el clímax
2 más"— no lo gasta nunca, porque ninguna opción de su ruta hiere. Las palancas visibles son tres, y
las tres están fuera de la tabla de esta tarea:

1. `cl_dravos`: la salida `huir_escaleras_abajo` cierra el encuentro con una tirada y sin Herida en
   éxito y en parcial. Es la puerta de escape barata del clímax.
2. `c2_vado_crecido.entregar_lo_que_llevas` y `c2_otra_orilla.dejar_el_sello_en_la_cadena`: dos
   Burnt Bridge libres seguidos, sin Herida ni tic, en el cuello 2.
3. `cl_molino.encarar_a_dravos`: primera libre del clímax, sin costo.
