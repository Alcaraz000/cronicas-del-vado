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

## 3. La simulación — **el estado vigente**

Semilla 20260912, 100 carreras por combinación, 4 partidas por carrera, 12.490 partidas. Estos son
los números del repositorio HOY; `sim-report.md` los reescribe en cada corrida. El §3 bis y el §5
guardan las vueltas anteriores para poder comparar, y **están superados por esta tabla**.

| Clase | Nivel | Política | Derrota | Heridas | Hitos | Tiradas |
|---|---|---|---|---|---|---|
| guerrero | 1 | prudente | 0,0 % | 1,33 | 9,0 | 1,0 |
| guerrero | 3 | prudente | 0,5 % | 1,43 | 9,0 | 1,0 |
| explorador | 1 | prudente | 0,0 % | 0,47 | 9,0 | 2,0 |
| explorador | 3 | prudente | 0,0 % | 0,45 | 9,0 | 2,0 |
| mago | 1 | prudente | 0,0 % | 1,00 | 9,0 | 0,0 |
| mago | 3 | prudente | 0,0 % | 1,00 | 9,0 | 0,0 |
| clerigo | 1 | prudente | 0,0 % | 0,39 | 9,0 | 1,8 |
| clerigo | 3 | prudente | 0,0 % | 0,18 | 9,0 | 1,5 |

Campaña entera, **línea de base → vigente**: derrota **20,7 → 23,1 %** · muerte 1,6 → 1,6 % ·
heridas **0,90 → 1,33** · tiradas **6,2 → 6,4** · escenas distintas 25,1 en las dos, dentro de 24–30
el **75,9 → 74,8 %** · aserción 4 (codiciosa) 3,4 → 3,3. Las cuatro aserciones pasan, las 46 escenas
y las 252 opciones se siguen visitando y los cuatro finales se alcanzan con las cuatro clases.
Finales `hundido / dravos / crecida / heredero`: 1450 / 5993 / 2149 / 128 → **914 / 6307 / 2077 / 118**.

---

## 3 bis. La simulación después de la PRIMERA vuelta (histórico)

> Los números de abajo son los de la primera vuelta, cuando solo estaban aplicadas las seis opciones
> de la tabla del §1. **Están superados por el §3.** Se conservan porque son la línea contra la que
> se mide lo que hizo cada vuelta.


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

---

## 5. Anexo — segunda vuelta: cobrar donde la medición dice

> **Dos filas de este anexo las superó la ronda de arreglos 1 (§6), y están corregidas en su sitio:**
> el costo de `cl_molino.encarar_a_dravos` pasó de `{ set: 'run:dravos_sabe' }` —que no lo leía
> nadie— a `{ addCondition: 'perseguido' }`, y la prosa de
> `c2_otra_orilla.dejar_el_sello_en_la_cadena` dejó de usar una variante por objeto que era prosa
> muerta. Las etiquetas de las dos también cambiaron. Lo vigente es siempre el §3 y el §6.

El §4 midió que la ruta real de la política prudente no pasa por cinco de las seis opciones de la
tabla. La decisión fue **cobrar donde la medición señala**, y no abrir una tarea aparte: las tres
palancas están todas en escenas bisagra, así que es el mismo principio ya aprobado puesto donde hace
falta. Ninguna de las tres cobra `sospecha`: el reloj llega a 4 y redirige, y la primera vuelta ya
gastó un tic. Las monedas acá son una relación, dos condiciones y una Herida.

| Escena · opción | Costo nuevo | Por qué es consistente |
|---|---|---|
| `c2_vado_crecido.entregar_lo_que_llevas` | `{ addCondition: 'perseguido' }` | Era la manera de cruzar el tramo más peligroso de la campaña sin pagar nada físico: el que llega sin la piedra entregaba un bulto vacío y lo pasaban gratis. La escena ya narraba el precio: desde la isla **dicen tu nombre, que ya lo tienen**, bajan dos hombres y te suben en vilo "como una mercadería". `perseguido` es exactamente eso: llegás siendo carga suya y no te sueltan. **Sigue sin poder matar** y su prosa sigue sin una palabra de muerte, como pide biblia §11 para las opciones 3, 4 y 5. |
| `c2_otra_orilla.dejar_el_sello_en_la_cadena` | `{ addCondition: 'empapado' }` | Era la otra salida gratis del cuello 2: esquivaba la tirada de `levantar_la_cadena` —que puede costar una Herida— sin cobrar nada. La cadena sale del agua a un paso de la punta del tablón, en una crecida y de noche: el precio es meterse. **(Corregido en el §6.1: la versión de esta vuelta tenía una variante por `{ item: 'sello_del_vado' }` que era prosa muerta, porque el desenlace hace `take` de ese mismo objeto. Ahora la prosa describe la maniobra y es verdadera con la piedra y sin ella.)** |
| `cl_molino.encarar_a_dravos` | ~~`{ set: 'run:dravos_sabe' }`~~ → **`{ addCondition: 'perseguido' }`** | Era la primera libre del clímax y la única de sus cuatro libres sin costo. **El cobro de esta vuelta fue decorativo y el §6.2 lo reemplazó:** nada lee `run:dravos_sabe` después de `cl_molino`. Lo que se paga ahora es la salida, y la lee la única tirada del encuentro con tag `huida`. |
| `cl_dravos.huir_escaleras_abajo` | `empapado` en el éxito · `{ wound: 1 }` en el parcial | Era la **única** salida del encuentro que no movía el reloj `pelea` y no cobraba nada en dos de sus tres bandas: las otras cinco piden haber peleado, la piedra, el flag de Orell, una Herida o quedar Agotado. El éxito cobra lo que su propio texto ya narraba ("el agua de abajo está más fría y te recibe entera") y el parcial cobra el medio escalón que te llevás puesto, que es la gramática de esta campaña para un parcial: pasás pagando. |

Las cuatro se anuncian en la etiqueta, igual que las seis de la primera vuelta:

| Antes | Ahora |
|---|---|
| Entregar lo que llevás y que te pasen | **Entregar lo que llevás y cruzar bajo custodia** |
| Dejar el sello donde está y no volver | **Meterte al agua, dejar el sello y no volver** |
| Apagar la runa un latido | **Apagar la runa un latido** (sin cambio: el precio vive en el texto, §6.4) |
| Encarar a Dravos delante de todos | ~~Encarar a Dravos y que sepa que sabés~~ → **Encarar a Dravos y quedarte sin puerta atrás** (§6.2) |
| Huir escaleras abajo, hacia el sótano | **Huir escaleras abajo, al agua del sótano** |

### Lo que dio la segunda medición

| Clase · nivel · prudente | Derrota | Heridas | Hitos | Tiradas |
|---|---|---|---|---|
| guerrero 1 | 0,0 → 0,0 → 0,0 % | 0,00 → 1,30 → **1,33** | 9,0 → 9,0 → 9,0 | 0,0 → 1,0 → **1,0** |
| guerrero 3 | 0,0 → 1,5 → **0,5 %** | 0,00 → 1,19 → **1,43** | 9,0 → 9,0 → 9,0 | 0,0 → 1,0 → **1,0** |
| explorador 1 | 0,0 → 0,0 → 0,0 % | 0,00 → 0,00 → **0,47** | 9,0 → 9,0 → 9,0 | 0,0 → 1,3 → **2,0** |
| explorador 3 | 0,0 → 0,0 → 0,0 % | 0,00 → 0,00 → **0,45** | 9,0 → 9,0 → 9,0 | 0,0 → 1,4 → **2,0** |
| mago 1 y 3 | 0,0 → 0,0 → 0,0 % | 0,00 → 0,00 → 0,00 | 9,0 → 9,0 → 9,0 | 0,0 → 0,0 → **0,0** |
| clerigo 1 | 0,0 → 0,0 → 0,0 % | 0,00 → 0,31 → **0,39** | 9,0 → 9,0 → 9,0 | 0,0 → 1,7 → **1,8** |
| clerigo 3 | 0,0 → 0,0 → 0,0 % | 0,00 → 0,10 → **0,18** | 9,0 → 9,0 → 9,0 | 0,0 → 1,5 → **1,5** |

Campaña entera (línea de base → primera vuelta → segunda): derrota **20,7 → 21,6 → 22,7 %** ·
heridas **0,90 → 1,09 → 1,19** · tiradas **6,2 → 6,4 → 6,5** · escenas distintas 25,1 en las tres,
con el porcentaje dentro de 24–30 en **75,9 → 75,4 → 74,9 %**. Las cuatro aserciones pasan y la
codiciosa sube de 3,4 a 3,5 tiradas.

**El efecto que sí se ve en la traza:** el `perseguido` del vado crecido le da desventaja al
`huir_escaleras_abajo` del clímax, que es por donde la ruta muda se escapaba. Ahora ya no se escapa:
el explorador y el clérigo pelean dos rondas antes de salir, y el guerrero tres. La prudente entra al
clímax marcada, mojada y sin sorpresa, que era exactamente lo que no le costaba nada.

**Lo que NO se movió, y se deja de perseguir por decisión del coordinador:** la columna Hitos sigue
en 9,0 y la derrota sigue cerca de 0. El motivo es el del §4 y no cambió: **seis de los nueve hitos
son `onEnter` de escenas obligatorias** y marcan haber estado, que es lo que biblia §7.4 quiere que
marquen; mientras la prudente **termine** la partida, 9 es el número correcto. Para que baje habría
que hacerla perder, y perder pide 3 Heridas: con dos o tres rondas de encuentro no llega. A partir
de acá es una decisión de balance de diseño, no de implementación.

**El mago sigue terminando la campaña sin tirar un solo dado.** Cierra el encuentro con
`apagar_la_runa_un_latido`, su opción de clase, que por contrato de biblia §9.5 es sabor y atajo y
paga con la condición `agotado`. Se reporta y no se toca: cambiarlo sería romper el contrato de las
doce opciones `[Clase]`.

### `fin_hundido` cae un 36 % — anotado y sin compensar

De **1450** partidas en la línea de base a **929** después de las dos vueltas. La causa es una sola y
es directa: `cl_desenlace.cerrar_la_compuerta_con_orell` pide `run:orell_confia`, y ese flag dejó de
regalarse en el `onEnter` de `a2_ley_orell`. El otro camino al mismo final,
`devolver_el_sello_a_la_piedra` (Vigor · normal, sin `requires`), sigue abierto para las cuatro
clases, y la aserción 3 confirma que las cuatro siguen llegando a los cuatro finales.

**No se compensó tocando otra cosa.** Es un efecto de balance y lo decide Gabriel.

### `enfrentar_a_dravos` se queda donde está

Se evaluó atarlo a haber tirado, que era la alternativa que contemplaba el brief, y se descartó por
lo que significa el hito. "Atado a haber tirado" habría incluido `huir_escaleras_abajo` —que es una
tirada, y es huir— y habría dejado **sin** hito al jugador que se ganó a Orell en la rama A y usó su
palabra en `que_orell_lo_detenga`, que es el camino más caro de todos. Es decir: habría premiado huir
y castigado el camino que la fase quiere premiar. El hito sigue en `cl_dravos.onEnter` y
`cl_halvar.onEnter`, como dice biblia §7.4, y el defecto que el brief nombraba —que el enfrentamiento
se cerrara sin tirar un dado— lo arregla el cambio de `run:orell_confia`.

---

## 6. Anexo — ronda de arreglos 1

Siete puntos del coordinador. Los tres importantes eran, los tres, la misma falla de fondo: **un
costo anunciado que no se cobra**. Vale la pena dejarla escrita como regla, porque es la que esta
fase iba a producir por diseño:

> **Antes de cobrar algo, listar quién lo lee después de la escena que lo enciende.** Un flag que
> solo leen `requires` y variantes de su propia escena, o una condición cuyo tag no aparece en
> ninguna tirada posterior, no es un precio: es decoración.

### 6.1 `c1_acusacion.ceder` afirmaba un objeto que la ruta puede no tener

La etiqueta prometía "dejar que te tomen la carta" y la prosa afirmaba que la sacaban y que Dravos la
leía. La `carta_lacrada` se gasta de cinco maneras y la ruta más muda la entrega en el puente, así
que el narrador mentía justo en el cobro número 1, en el cuello por el que pasa toda partida.

**No se resolvió con una variante por objeto, y hay un motivo que conviene que quede escrito.**
`choose` aplica los `effects` **antes** de resolver el texto del desenlace (`resolve.ts:265-267`, y
`commitRoll` hace lo mismo en `473-489`). Una variante `when: { item: X }` dentro del desenlace de
una opción que hace `take: X` **no se dispara nunca**: cuando se evalúa, el objeto ya no está.

> **Deuda que esto destapa, y que no toqué porque es de otra escena:** la nota (c) de la cabecera de
> `scenes/acto2_fuera.ts` documenta ese patrón como la solución para
> `c2_vado_crecido.cruzar_de_frente.partial`, que hace `take: 'carta_lacrada'` y lleva una variante
> `when: { item: 'carta_lacrada' }`. **Esa variante es prosa muerta**: el jugador que llega con la
> carta lee igual el texto del que no la tiene. Está anotado en la cabecera de `desenlace.ts` para
> que nadie vuelva a copiar el patrón.

La solución acá es prosa verdadera en los dos casos: se describe el cacheo, que pasa siempre, y el
`take` se encarga del resto. Etiqueta **«Bajar la voz y dejar que te palpen la capa»**, que anuncia
el precio (si llevás algo, lo perdés) sin prometer un objeto concreto. Un test fija que la prosa de
esa opción no nombre la carta ni use una variante por objeto.

### 6.2 El costo de `cl_molino.encarar_a_dravos` era decorativo

Verificado: después de `cl_molino`, **nada lee `run:dravos_sabe`**. Su único `requires`
(`interrumpir_antes_de_que_firmen`) y su única variante viven en esa misma escena y se evalúan antes
de elegir; `cl_dravos`, `cl_halvar`, `cl_desenlace` y los cuatro epílogos no lo miran.

Elegí la primera salida de las dos que me diste: **cobrarle algo que se lea**. El costo pasa a ser
`{ addCondition: 'perseguido' }`, y es lo que la escena ya contrapone: `escuchar` es quedarse tapado
detrás de los sacos y esta es salir al claro. El que sale al claro no se vuelve a escabullir.
`perseguido` es tag `huida` y el encuentro tiene **exactamente una** tirada con ese tag
(`cl_dravos.huir_escaleras_abajo`, `modifiers.ts:54-56` aplica la desventaja): el precio se paga en
la escena siguiente, y se paga en la opción por la que la ruta muda se escapaba.

Etiqueta **«Encarar a Dravos y quedarte sin puerta atrás»**. Y con eso se resuelve también el punto
7: la línea explicativa existía para justificar el flag, y en su lugar hay algo que se ve — «Pell se
corre a la puerta y se queda ahí, con la lanza cruzada».

### 6.3 La opción del mago

Tenías razón y era peor de lo que decía el punto: **`agotado` es tag `magia`, y en el clímax entero
—`cl_molino`, `cl_dravos`, `cl_halvar`, `cl_desenlace`— no queda ni una tirada con ese tag**. Los
nueve `tags` del archivo son `sigilo`, `percepcion`, `fisico`, `social`, `huida`, `saber` y `fe`. O
sea que la maga no pagaba `agotado`: pagaba nada, y cerraba el encuentro entero. Su hermana de
escena, `trabar_el_eje` [Guerrero], cuesta `{ wound: 1 }` y ni siquiera cierra.

Elegí la Herida y no el `pelea +2`, y por una razón medida: con `+2` la maga prudente habría hecho
`apagar_la_runa` y después `rematarlo` —que pide `pelea >= 2`, no tiene tirada y es gratis—, así que
habría salido igual **sin tirar un dado** y con una pantalla más. La Herida, en cambio, la lee el
motor (3 = Caído) y es exactamente la moneda de la opción hermana. El `pelea +3` se queda: que cierre
el encuentro es el contrato de biblia §9.5 para esta opción, y lo que estaba mal no era que cerrara
sino que cerrara gratis. Un test nuevo fija que las dos opciones de clase del encuentro cuesten lo
mismo, y otro fija que ninguna tirada del clímax tenga tag `magia`.

**Efecto medido:** la maga prudente pasa de **0,00 a 1,00 Heridas** en los dos niveles. **Sigue en
0,0 tiradas**, y eso no lo arregla esta línea: `apagar_la_runa_un_latido` es una opción sin tirada
por contrato de biblia §9.5, igual que las otras once `[Clase]`. Ahora paga, pero sigue sin tirar.
Cambiar eso es cambiar el contrato de las doce opciones de clase, y esa decisión no es mía.

### 6.4 Los cuatro puntos chicos

- **§3 del informe:** renombrado. Arriba va la tabla **vigente** y abajo queda el §3 bis con los
  números de la primera vuelta, marcado como histórico y superado.
- **Deriva de documentación:** biblia §7.1 lista ahora los cuatro tics nuevos y dice **~21 fuentes**
  en vez de ~17; biblia §11 y outline §5 listan el `perseguido` de `entregar_lo_que_llevas`. La
  fuente de `run:dravos_sabe` en biblia §7.2 **no** hacía falta tocarla: el punto 6.2 sacó ese `set`.
- **La contradicción de biblia §10:** escrita la excepción. La invariante "al menos una opción Fluff
  o Spice, siempre existe una salida que no cobra peaje" vale en las escenas de exploración lateral
  y **no** en las diez bisagra, donde la salida sin tirada sigue existiendo pero cobra peaje, con las
  dos exenciones (`a2_amanecer` y `c2_anochece`) y su motivo. Va con el corolario de arriba: un costo
  que nadie lee no es un costo.
- **`acto2_fuera.ts`**, "salió gente a mirar: uno se queda mirándote" → "uno no se mueve hasta que
  tocás la grava".

### 6.5 La pregunta: por qué encarecer la ruta muda **bajó** la derrota del guerrero

Es real, no es ruido, y la causa está en la política del simulador, no en el contenido. Lo medí con
cuatro semillas sobre el guerrero nivel 3 prudente:

| | semilla 20260912 | 11111 | 22222 | 33333 |
|---|---|---|---|---|
| después de la **primera** vuelta | 1,5 % | 0,8 % | — | — |
| después de la **segunda** | 0,5 % | 0,5 % | 0,5 % | 0,3 % |

O sea ~1,1 % → ~0,45 %: la mitad de lo que sugería comparar dos celdas de una sola semilla, pero un
efecto de verdad. El mecanismo se ve en la traza, comparando la misma partida antes y después:

| | antes | después |
|---|---|---|
| guerrero en `cl_dravos` | `trabar_el_eje` → **`huir_escaleras_abajo`** | `trabar_el_eje` → **`usar_la_maquinaria`** → `rematarlo` |

El `perseguido` que ahora cobra el vado crecido le baja la probabilidad de éxito a
`huir_escaleras_abajo` (tag `huida`), y **la política prudente, cuando no le queda opción libre,
elige por probabilidad de éxito y es ciega a lo que hace la banda**. Así que se corre a
`usar_la_maquinaria`. Y esas dos tiradas no son equivalentes:

- `huir_escaleras_abajo`: el éxito sale del encuentro, pero el **fallo cuesta una Herida y devuelve a
  `cl_dravos` con el reloj `pelea` donde estaba**. Fallar no acerca el final: repite la exposición.
- `usar_la_maquinaria`: el éxito **y el parcial** mueven `pelea +1`, y el parcial cuesta `exhausto`,
  no una Herida. Con el `pelea +1` que ya dejó `trabar_el_eje`, una sola banda buena llega a 2 y
  **desbloquea `rematarlo`**, que no tiene tirada, no hiere y cierra el encuentro.

Resumido: **el costo no hizo el encuentro más seguro; hizo que la política eligiera la tirada que
progresa en vez de la que solo escapa.** Como la derrota se acumula por quedarse rondas adentro del
encuentro, salir antes derrota menos. Cuadra con el otro número que parecía contradictorio: las
Heridas medias **subieron** (1,19 → 1,43) mientras la derrota bajaba — más partidas con una o dos
Heridas, menos partidas metidas en el bucle que llega a tres.

Lo dejo como está y lo anoto, porque lo que muestra no es un problema del contenido sino un límite
del instrumento: `prudente` maximiza la probabilidad de éxito de la tirada y no mira la consecuencia
de la banda. Un jugador real sí la mira.

---

## 7. Anexo — ronda de arreglos 2

### 7.1 La segunda prosa muerta, y el candado para que no haya una tercera

`c2_otra_orilla.dejar_el_sello_en_la_cadena` tenía el mismo defecto que `c1_acusacion.ceder`, y peor:
la variante `when: { item: 'sello_del_vado' }` vivía en el **mismo desenlace** que hace
`take: 'sello_del_vado'`, así que el que llegaba con la piedra leía siempre el fallback —«y no la
tocás»— mientras el motor se la sacaba y encendía `run:sello_escondido`, que los cuatro epílogos leen
como que la piedra quedó en el agua. Prosa de la segunda vuelta, y el comentario de la opción y el §5
afirmaban los dos que "las dos variantes lo dicen", cuando solo una podía mostrarse.

Arreglado con el mismo criterio que `ceder`: **prosa verdadera en los dos casos, sin variante por
objeto**. Se describe la maniobra, que es la misma traiga o no traiga la piedra — entrás hasta la
cintura, seguís la cadena eslabón por eslabón, atás corto lo que tenga que quedar abajo — y el efecto
se encarga del resto. De paso baja 12 palabras escritas en una escena que estaba 31 % por encima de
su celda.

**Y en vez de arreglar solo la que me señalaron, escaneé las 46 escenas.** Hay exactamente dos
instancias en la campaña: esta y `c2_vado_crecido.cruzar_de_frente.partial`. La segunda es de la Fase
D (lote 5), vive en la escena mortal, su prosa no es de esta tarea y **no la toqué**. Pero ahora hay
un test de contenido que fija la lista en esa única entrada: si aparece una tercera, se cae.

Los dos casos vecinos que **sí** funcionan quedaron intactos, como pediste: la variante de
`fin_hundido` por `medallon_de_tome` (vive en `ending.epilogue`, no en el desenlace que hace el
`take`, y su semántica buscada es justamente "la esquirla te quedó en la mano") y la de
`atar_lo_que_llevas_a_la_cadena` (su desenlace no hace `take`, así que la condición sigue siendo
informativa).

### 7.2 Los cuatro chicos

- **§5 del informe:** le puse el mismo banner de "superado" que al §3, y corregí en su sitio las dos
  filas que declaraban como vigente lo que el §6 reemplazó (el costo y la etiqueta de
  `encarar_a_dravos`, y la afirmación sobre las dos variantes de `dejar_el_sello_en_la_cadena`).
- **Biblia §7.2, fila de `run:dravos_sabe`:** decía que lo leen "variantes de `cl_molino`,
  `cl_dravos` y los epílogos" y se contradecía con el corolario nuevo de §10. Ahora dice lo que es
  verdad y lo que verifiqué: **solo `cl_molino`**, y las dos lecturas se evalúan antes de elegir.
- **Biblia §9.5, opción del mago:** decía "(cierra el encuentro sin pelear)" sin el precio, al lado
  de la del guerrero que sí anota el suyo. Ahora anota la Herida y el `agotado`, y por qué se los
  puso la Fase H.
- **La etiqueta del mago:** «Apagar la runa un latido, y pagarlo» era registro meta y contradecía la
  regla que acababa de escribir en biblia §10. Vuelve a «Apagar la runa un latido», como su hermana
  `trabar_el_eje`: las doce `[Clase]` ya llevan el badge que el motor deriva del `requires`, y el
  precio vive en el texto —las rodillas en el agua, la nariz sangrando.
- **La nota (c) de `acto2_fuera.ts`:** era la receta mala en el archivo que alguien abre para tocar
  el vado. Ahora dice, ahí mismo, que esa variante no funciona, por qué, que queda como deuda y cuál
  es la forma correcta, con las dos opciones que ya la usan como ejemplo.

### 7.3 La aserción 4: esta ronda no la mueve, y sé por qué se movió antes

**3,3 antes y después de esta ronda.** Los cambios fueron prosa, etiquetas y documentación: nada que
toque odds ni efectos.

Los 0,2 se los comió la ronda anterior, y el mecanismo es estructural, no casual:

1. `modifiers.ts:54-62` aplica **desventaja** por cada condición cuyo tag coincida con la tirada, por
  1 Herida en las tiradas `fisico` y por 2 Heridas en **todas**.
2. `politicas.ts` define la codiciosa como "elegí la de mayor probabilidad de éxito, y puntuá ceder
  con `PROB_LIBRE = 0.7`" — un **piso fijo**.

O sea: **cada costo que se cobra en una condición o en una Herida baja las probabilidades reales de
las tiradas siguientes, y la codiciosa las compara contra un 0,7 que no se mueve, así que cede un
poco más.** Y la aserción 4 mide exactamente cuánto tira la codiciosa. Se ve en la fila que más se
movió: el guerrero nivel 1 codiciosa pasó de 0,17 a **1,22** Heridas y de 3,0 a **2,8** tiradas.

No es un defecto de esta tarea ni del instrumento: es el acoplamiento entre "cobrar con Heridas" y
"medir cuánto arriesga el que maximiza". Pero conviene que esté escrito: **el margen hoy es 3,3
contra un piso de 3,0, y toda tarea que agregue condiciones o Heridas se lo va a seguir comiendo.**
La palanca de diseño, si algún día hace falta, es `PROB_LIBRE`, que el propio comentario del
simulador declara "un botón de diseño, no una constante física".

### 7.4 Los números, sin cambios respecto del §3

La medición de esta ronda dio lo mismo que la anterior en todas las filas de la prudente y en la
campaña entera: derrota 23,1 %, muerte 1,6 %, heridas 1,33, tiradas 6,4, distintas 25,1 (74,8 %
dentro de 24–30), las cuatro aserciones pasan. Era lo esperable: no se tocó ni un efecto.
