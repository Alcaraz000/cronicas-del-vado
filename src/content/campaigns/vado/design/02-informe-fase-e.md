# Informe de Fase E — "El vado de Aldamar"

Lo que las tres herramientas de análisis encontraron cuando se las corrió sobre la campaña real, y
qué conviene hacer con eso. **Es un informe de autor: nada de acá bloquea el build.**

**Cómo se produjo.** Todo es reproducible y determinista; los números salen de:

| Herramienta | Comando | Corrida |
|---|---|---|
| Simulador | `npm run simulate` | semilla 20260912 · 2.400 carreras · **9.298 partidas** → `design/sim-report.md` |
| Simulador (ampliado) | `npm run simulate -- --n 500` | semilla 20260912 · 12.000 carreras · **46.329 partidas** (solo para este informe) |
| Lint de texto | `npm run lint:text -- --campaign=vado` | 22 errores · 116 avisos · 11 mediciones · 200 caminatas con semilla 20260910 |
| Grafo | `npm run graph:vado` | → `design/03-grafo.generated.md` |
| Arte | `npm run validate:assets` | cruce contenido ↔ `src/assets/` |

Donde un número de la corrida chica y uno de la ampliada difieren, manda la ampliada y se dice.

---

## 0. Lo primero: las tres aserciones pasan, pero la segunda pasa vacía

| # | Aserción | Resultado |
|---|---|---|
| 1 | Ninguna escena fuera de una condición de memoria queda inalcanzable | **PASA** — las 46 visitadas |
| 2 | Muerte a nivel 1 con política codiciosa < 3 % | **PASA con 0,0 %… y no quiere decir nada** |
| 3 | Los cuatro finales se alcanzan con las cuatro clases | **PASA** |

**La 2 pasa por construcción, no por calibración.** La política codiciosa —"la opción con mayor
probabilidad de éxito"— siempre encuentra una opción sin tirada, que no puede fallar, así que **hace
cero tiradas** y la muerte es 0 % porque nunca se tocó un dado. Esto no es un defecto del simulador:
es la lectura literal de la política, y lo que destapa es un hecho del contenido que sí importa y
que está en el punto 1 de la lista final.

La medida honesta de la aserción 2 es la política **aleatoria**, que sí tira (6,8–7,2 tiradas por
partida): **muerte a nivel 1 = 0,2 %** sobre 7.981 partidas. La aserción se cumple igual, con
margen, pero midiendo algo.

---

## 1. ¿Hay escenas u opciones que ningún jugador ve nunca?

**No hay una sola línea de contenido muerto.** Sobre 9.298 partidas: **46 de 46 escenas**, **252 de
252 opciones**, los **24 flags** declarados encendidos, los **10 hitos** alcanzados y los **4
finales** vistos. Cero huérfanos.

Lo que sí hay es contenido **rarísimo**, que es otra cosa y se arregla distinto: **31 de las 252
opciones las ve menos del 1 % de las partidas.** Las cinco más escondidas:

| Opción | Partidas que la eligen | Por qué |
|---|---|---|
| `a1_molino_pell#pedirle_que_te_abra_la_trampilla` | **5 de 9.298 (0,05 %)** | pide `run:pell_amigo` **dentro** de una escena que solo se ve yendo al molino primero (15,6 %) |
| `cl_halvar#leerle_lo_que_firmo_berta` | 12 (0,13 %) | pide llevar `carta_de_halvar` **encima** hasta el clímax, con 6 ranuras de mochila |
| `a2_fuera_sello#escuchar_el_sello` | 18 (0,19 %) | `[Clase]` Mago, en una escena de rama que se ve el 5,9 % |
| `a1_ronda#pedirle_a_orell_que_responda_por_vos` | 19 (0,20 %) | pide `run:orell_confia` dentro del floodgate de sospecha (8,7 %) |
| `a2_ley_torre#nombrar_su_grado_viejo` | 19 (0,20 %) | `[Origen]` desertor, en una escena de una sola rama |

El patrón es siempre el mismo: **una condición dentro de una escena que ya de por sí es rara**.
Multiplicar 15 % por 30 % da 5 %, y ahí vive la mitad de estas opciones. No es un error —el diseño
quiere que haya cosas que no se ven en la primera partida— pero conviene saber que
`pedirle_que_te_abra_la_trampilla` está escrita para que la lea **uno de cada dos mil jugadores**.
Si algún párrafo tiene que sobrevivir a un recorte, no es ese.

Del lado de las escenas, **una sola** la ve menos del 5 % de las partidas: `fin_heredero`, 1,38 %.
Las siguientes son `a2_fuera_medallon` (5,0 %), `p_puente_amanecer` (5,8 %) y `a2_fuera_sello`
(5,9 %), que son ramas legítimas.

---

## 2. Los cuatro finales: alcanzables sí, parejos no

Reparto sobre 32.664 partidas que llegaron a un final (corrida ampliada):

| Final | Partidas | % |
|---|---|---|
| `fin_dravos` | 19.129 | **58,6 %** |
| `fin_crecida` | 7.186 | 22,0 % |
| `fin_hundido` | 5.743 | 17,6 % |
| `fin_heredero` | 606 | **1,9 %** |

**`fin_dravos` es el desenlace por omisión.** Es donde caés si no hacés nada especial: la ruta sin
dados termina ahí las cuatro veces de la carrera. Que el final "aceptás la traición" sea el que sale
solo es una decisión de tono defendible, pero está bien saberla.

**Las cuatro clases llegan a los cuatro finales**, y las diferencias entre clases son mucho más
chicas de lo que parecía con la corrida chica. Porcentaje de `fin_heredero` sobre los finales de cada
clase, con 46.329 partidas:

| Clase | `fin_heredero` |
|---|---|
| guerrero | 1,58 % |
| explorador | 1,83 % |
| mago | 1,96 % |
| clerigo | 2,04 % |

Con N = 100 el Guerrero parecía la mitad que el resto (18 contra 37); con N = 500 la brecha se cae a
un 30 % de diferencia. **Era ruido, no un agujero de clase.** No hace falta escribirle al Guerrero
una cuarta puerta al sello.

### ¿Y el "toda clase llega, a más tardar en la segunda partida" de la spec §11?

Eso **no se puede confirmar ni desmentir con el simulador**, y conviene decirlo con todas las letras:
las tres políticas juegan sin intención. Ninguna busca un final; la aleatoria elige al azar, la
codiciosa esquiva el riesgo y la temeraria lo busca. El 1,9 % mide **con qué frecuencia te tropezás
con el final oculto jugando sin querer**, no con cuánto esfuerzo lo conseguís cuando lo buscás.

Lo que sí se puede medir es la puerta, y ahí está el número interesante:

- **Solo el 14,4 % de las partidas enciende `char:vado.sabe_del_sello`** (18,3 % con la política
  aleatoria; **0 % con la codiciosa**, que nunca tira y por lo tanto nunca lee la piedra).
- De las partidas que **sí** lo encendieron y llegaron a un final, **el 26,1 % termina en
  `fin_heredero`** (política aleatoria). O sea: **conseguir el flag es el 100 % del problema**; una
  vez que lo tenés, el final está a tiro incluso eligiendo al azar.
- El mecanismo de rejugabilidad **funciona y se nota**: 54 → 145 → 181 → 226 apariciones en la 1ª,
  2ª, 3ª y 4ª partida de la carrera. Se cuadruplica. El canon de `char:vado.*` hace exactamente lo
  que la biblia §9 promete.

**Conclusión:** el final oculto no es inalcanzable, es **invisible**. El camino A (leer la piedra,
Saber · difícil, un intento por partida) existe en las dos ramas y no tiene condición de clase, pero
un jugador que no sospecha que hay algo bajo la piedra no gasta su único intento ahí. Si la promesa
de la spec tiene que cumplirse, se cumple con **telegrafía**, no con mecánica.

---

## 3. Duración: la campaña mide bien; lo que medía mal era el informe

**La partida típica dura 37,8 minutos** (mediana de 82 caminatas completas del lint, con la fórmula
del diseño: palabras ÷ 180 + 8 s por decisión), con mínimo 23,4 y máximo 57,1. El 77 % cae dentro de
la ventana 30–45. Las tres rutas que el outline §4 calculó a mano (34,8 / 40,0 / 30,4 min) se
sostienen contra la prosa que efectivamente se escribió: **las cuentas del outline eran buenas.**

El simulador decía otra cosa —"la partida media dura 40,3 escenas y el objetivo es 24–30, cae dentro
el 7,8 %"— y **era la herramienta la que estaba mal**, no la campaña. Contaba **pantallas**
(entradas a escena, con las vueltas al hub, `mirar_el_pozo` y las rondas de encuentro) contra un
objetivo que el propio outline §4 verifica en **escenas distintas**: sus tres rutas declaran 32, 38
y 30 pantallas y 29, 31 y 27 escenas distintas, y las tres están "dentro". Se corrigió la métrica en
esta fase:

- **23,9 escenas distintas de media** (mediana 26), **67,7 % dentro de 24–30**.
- El tercio que queda afuera es casi todo la política temeraria, que muere o pierde a mitad de
  camino (16–18 escenas): partidas cortadas, no partidas cortas.
- 40,3 pantallas de media siguen reportándose aparte, porque son las que gobiernan el reloj.

**Queda decidido:** las 24–30 de la spec §11 se miden en **escenas distintas**; las pantallas son la
cuenta del tiempo. El `sim-report.md` ya dice las dos.

Palabras leídas por partida: **5.777 de media** (rango 908–12.329), contra las ~5.000 que
presupuestaba la spec §11. El presupuesto de lectura está corto un 15 %, en línea con el exceso de
escritura del punto siguiente.

---

## 4. El presupuesto de palabras: +20,6 %, y se sabe exactamente dónde

**18.907 palabras de prosa narrativa contra 15.674 presupuestadas: +3.233, +20,6 %.** Con etiquetas
(1.662) y `lockedHint` (579): 21.148 escritas contra 17.594 declaradas.

Lo que no se sabía hasta ahora es **dónde** se fue, y la respuesta es contraintuitiva:

| Línea de gasto | Escrito | Presupuesto | Diferencia |
|---|---:|---:|---|
| Texto base de escena | 5.021 | 4.925 | **+96 (+2 %)** |
| Desenlaces y bandas de tirada | 11.491 | 7.455 | **+4.036 (+54 %)** |
| Variantes condicionales | 1.541 | 2.624 | **−1.083 (−41 %)** |
| Epílogos | 854 | 640 | +214 |

**No se infló la prosa de escena: se inflaron los desenlaces.** Las 46 escenas promedian 109
palabras de texto base, dentro de la banda 60–160 de la biblia §2.3, y clavan el presupuesto con un
2 % de error. El desborde entero está en los `outcome.text` y las tres bandas de cada tirada, que se
escribieron mucho más largos de lo que la tabla §3 les daba. Y **las variantes condicionales
quedaron 1.083 palabras por debajo**: la memoria se escribió más corta de lo planeado.

La buena noticia: **la palanca que el outline §3 dejó declarada apunta justo ahí** ("bajar el cupo de
outcomes con texto de 100 a 60, −1.120"). Tirando de esa palanca y podando los desenlaces más largos
se recupera todo el exceso sin tocar una sola escena ni un solo nodo del grafo.

**39 de 46 escenas se pasan de su celda `pal`.** Las peores en palabras absolutas: `cl_molino` +216,
`a1_molino_pell` +178, `a1_molino_trampilla` +165, `c1_acusacion` +163, `a1_ilse_patio` +146.

**Tres celdas del outline son insatisfacibles y hay que corregir el documento, no la prosa:**
`a2_ley_guardia` (217/90, +141 %), `p_puente_amanecer` (202/84, +140 %) y `a2_fuera_refugio`
(198/90, +120 %). Las tres tienen **5 opciones** y celdas de 84–90 palabras: con la regla §2.5 de la
biblia —toda opción hace algo y todo desenlace se escribe— no entran ni escribiéndolas a telegrama.
Hay que subirles la celda a ~200.

**Detalle aritmético del outline:** las 46 filas de la tabla §2 suman **15.674** palabras de `pal`,
no los **15.644** que declara §3. Son 30 palabras de diferencia dentro del documento de diseño. La
columna `text` sí cierra exacto en 4.925.

---

## 5. Dificultad: bien calibrada, con dos asteriscos

**La dificultad cruda está donde el diseño la quería.** Fallo en los dados **27,5 %**; después de
gastar Fortuna y el Poder, **13,1 %**. Con 7,1 tiradas por partida y 3 puntos de Fortuna, los
recursos se comen más de la mitad de los fracasos, que es exactamente para lo que están. Se llega al
final con **1,17 Heridas de media**: Herido pero no Malherido, que es lo que la spec §4 pedía para
que cruzar el vado pese.

### ¿Cuánta gente muere a nivel 1?

Depende enteramente de cómo jugás, y ese rango es la respuesta:

| Cómo juega | Muerte a nivel 1 |
|---|---|
| Codiciosa (nunca tira) | **0,0 %** — no toca un dado |
| Aleatoria (tira 6,9 veces) | **0,2 %** |
| Temeraria (busca el riesgo) | **6,8 %** |

Y por clase, con la temeraria a nivel 1: **Guerrero 11,8 %**, **Mago 11,6 %**, Explorador 4,2 %,
**Clérigo 0,9 %**. Un Guerrero temerario muere **trece veces más** que un Clérigo temerario. La causa
es de ficha, no de contenido: la **Plegaria** del Clérigo cura una Herida y se usa desde la ficha, en
cualquier momento; la Furia, la Sombra y el Conjuro solo convierten un Fallo en Éxito, que sirve para
ganar la tirada pero no para deshacer el daño que ya te hicieron. **Los tres Poderes de conversión
valen mucho menos para sobrevivir que la curación.** No hay que arreglarlo en la campaña, pero es una
asimetría de reglas que conviene tener anotada antes de la segunda campaña.

### ¿Rejugar con un personaje subido trivializa la campaña?

**No. Al revés: endurece.** A lo largo de la carrera de 4 partidas, con el nivel medio de arranque
subiendo de 2,00 a 3,52:

| Partida de la carrera | Nivel al empezar | Fallo en los dados |
|---|---|---|
| 1 | 2,00 | 25,1 % |
| 2 | 3,15 | 27,2 % |
| 3 | 3,39 | 28,6 % |
| 4 | 3,52 | **29,3 %** |

Es el **Veterano** funcionando tal como está escrito en la spec §4: al llegar a nivel 4 —el tope de
la campaña— `levelRange [1, 3]` pasa a "Tranquila" y mete **−1 en toda tirada**, que más que
compensa el +1 de atributo del nivel par. El tope de XP aguanta perfecto: nivel final mediana **4**,
XP final mediana **180**, que es exactamente el tope. **La carrera se aplana en la segunda partida y
no vuelve a crecer.**

Asterisco: por eso mismo la **muerte sube con el nivel** en Guerrero (11,8 % → 15,9 %) y Mago
(11,6 % → 14,2 %). El anti-trivialización te cobra en las dos clases que ya morían más.

### Estabilidad

Cero partidas colgadas y cero escenas sin salida en 46.329 partidas con tope de 250 pasos: **no hay
un solo ciclo real en el grafo**. La caminata más larga llega a 96 pantallas, que es la política
aleatoria dando vueltas, no un bucle.

---

## 6. La prosa: la voz aguantó; lo que pesa son las repeticiones

**Las prohibiciones duras están todas en cero**, y en 18.907 palabras eso no es poco:

- **Peninsularismos: cero.** Ni un `tú`, `ti`, `contigo`, `vosotros`, `os`, `vuestro`, `tienes`,
  `puedes`, `coger`, `vale`, `chaval`, `tío`. **La voz rioplatense aguantó los siete lotes.**
- **Clichés de la lista de §2.6: cero.** **Anacronismos y unidades: cero.**
- **Adverbios en `-mente`: cero en toda la campaña.** Cero `muy`, `de repente`, `lentamente`,
  `parece que`, `como si fuera`, `no podés evitar`, `una mezcla de`, `de alguna manera`.
- **Arranques (biblia §2.7): limpio en las cuatro reglas.** Ninguna escena comparte sus tres primeras
  palabras con otra, ninguna primera palabra se repite más de tres veces, ninguna escena arranca
  igual que una a la que apunta, y no hay un solo texto duplicado palabra por palabra.
- **Marco de memoria (el agujero de r08): limpio.** Los 22 párrafos con `speaker` de Orell, Ilse o
  Halvar —los tres de `world/`, que r08 no frena— no tienen ni una variante con `met`, `knows`,
  `endingSeen` ni `char:vado.*`. La pasada de voz a mano que declaran las cabeceras de lote se hizo.

**Lo que sí hay que mirar son las repeticiones: 298 n-gramas de 4 o más palabras aparecen en más de
una escena.** Las que se notan al leer:

1. **El retrato de Orell, casi textual en tres escenas:** "barba gris corta y una cicatriz blanca"
   (`p_puente`, `a1_taberna`) y "y una cicatriz blanca que le parte la ceja" (`p_puente`,
   `c1_acusacion`). Es el caso más sistemático y el más fácil de arreglar: que cada escena lo mire
   por otro lado.
2. **"el sótano es redondo y más viejo que el molino que tiene encima"** — 13 palabras idénticas en
   `a2_fuera_sotano` y `cl_desenlace`.
3. **"por donde entra el agua con la espalda contra el tablón"** — 11 palabras en `a1_molino_rueda` y
   `a1_molino_trampilla`, dos escenas vecinas.
4. **"sesenta y cuatro casas que comen de esa rueda"** en `p_camino` y `a1_alcaldesa` (y una segunda
   variante de la misma frase en las mismas dos escenas).
5. **Una muletilla de construcción:** "a una hora en que" en `a2_amanecer`, `a2_ley_cartas` y
   `a2_ley_orell`, las tres veces con el mismo giro ("a una hora en que no debería estarlo", "…que ya
   debería estar apagada", "…que nadie debería estar escribiendo").

**El tic real de la campaña no es "agua"** (134 usos, pero es la campaña del río): es el **eje
vertical**. `arriba` + `abajo` + `sube` + `baja` + `piso` suman ~230 usos, y **`queda` aparece en 37
de las 46 escenas**, o sea en el 80 % de la campaña. Son palabras invisibles de a una y pesadas en
bloque.

**Cupos:** `usted` se pasó, 10 usos contra 8 (`p_puente` ×2, `a1_molino` ×2, `a1_molino_pell` ×2,
`cl_molino` ×4). Es casi contable: los 4 de `cl_molino` son **dos variantes del mismo párrafo de
Pell**, así que una partida oye 8 y lo escrito dice 10. Y al revés: **`puteadas` 2 de 8**, cuando la
biblia §1.4 le asigna 4 a Mausi ella sola. **Mausi no putea casi nada**, y eso sí le cambia el
personaje.

**Bandas:** solo 4 escenas fuera de 60–160 palabras, y las dos largas son las del piso dramático
(`c1_acusacion` 206, `a1_alcaldesa` 183): eso es deliberado. Los **cuatro finales están cortos**
(46–53 palabras contra 60), que también parece deliberado —el `text` de un final es la bajada al
epílogo y el peso está en las 160 del epílogo— pero hoy el lint los marca. **Conviene declararlo:**
excepción de banda para `kind: 'ending'`, o subirlos.

---

## 7. El grafo real contra el diseñado: coinciden

Comparación arista por arista del grafo generado del contenido contra los tres diagramas del outline
(§1.2, §1.3 y §1.4): **114 aristas de cada lado, 46 escenas de cada lado, 0 aristas de más y 0 de
menos.** Ninguna escena del outline falta en el contenido y ninguna del contenido queda sin dibujar.
Las cifras cerradas también coinciden: 46 escenas, 252 opciones, 41 tiradas, 6 entradas de `redirect`
en 5 escenas, 4 finales, 1 escena mortal, y por `kind` 36 normales + 1 hub + 2 encuentros + 3
descansos + 4 finales.

**La única diferencia es de notación:** el outline dibuja `a2_amanecer → a2_fuera_sotano` punteada
igual que los `redirect`, pero en el contenido es una **opción** (`ir_derecho_al_sotano`, con
`requires: char:vado.sabe_del_sello`). **El contenido está bien** —un atajo `[Recuerdo]` tiene que
ser una decisión del jugador; un `redirect` lo saltearía sin preguntar— y lo que engaña es que el
outline usa el mismo punteado para dos cosas distintas. Se arregla con una línea de leyenda.

Dos cosas que salieron de mirar el grafo y conviene que queden escritas:

- **El `redirect` es una arista de verdad.** Del acto 1 al cuello 1 se pasa exclusivamente por el
  `redirect` de `a1_plaza`: recorriendo solo aristas de opción, la campaña queda partida en dos y
  solo 17 de las 46 escenas son alcanzables desde `p_camino`. Cualquier herramienta futura que
  camine el grafo tiene que seguir los redirects.
- **La spec §11 quedó vieja en un número:** dice "~30 tiradas"; el outline dice 41 y el contenido
  dice 41. La que hay que actualizar es la spec.

El grafo generado queda commiteado en `design/03-grafo.generated.md` y se regenera con
`npm run graph:vado`. **No se edita a mano.**

---

## 8. Las cinco cosas que conviene arreglar primero

### 1. Se puede terminar la campaña entera sin tirar un solo dado — y casi no cuesta nada

**41 de las 42 escenas no finales ofrecen una opción sin tirada y sin `requires`** (la única que no
es `cl_dravos`, el jefe, y se sale gratis igual por `que_orell_lo_detenga`). La escena mortal
`c2_vado_crecido` se cruza por `entregar_lo_que_llevas`. Un jugador que elija siempre lo seguro
termina la campaña con: **42 pantallas, 29 escenas distintas, 6.060 palabras, 0 tiradas, 0 Heridas,
9 de los 10 hitos, nivel 1 → 3 con 160 XP, y el final `fin_dravos`.** Es una partida de largo
completo —29 escenas distintas está *dentro* del objetivo de diseño— en la que el sistema de reglas
entero (dados, Fortuna, Poderes, Heridas, muerte) **nunca se enciende**.

Ojo: que toda escena mortal tenga salida sin tirada es una regla de la spec §4 y está bien. Que la
tengan las **otras 40** es una decisión que nadie tomó explícitamente.

**Por qué primero:** vacía la aserción 2, y sobre todo es la estrategia dominante más aburrida
posible. Un tester prudente puede jugar la campaña entera y no enterarse de que hay un sistema de
reglas.

**Qué mirar, en orden de menos invasivo a más:** (a) que la opción libre **cueste** algo visible en
las escenas bisagra —`sospecha`, un objeto, una relación—, de modo que ceder siempre sea una decisión
y no un almuerzo gratis; (b) que la ruta muda no junte 9 de 10 hitos; (c) redefinir la política
codiciosa del simulador ("la mejor tirada, y la opción libre solo si ninguna tirada llega a cierta
probabilidad") para que la aserción 2 vuelva a medir algo. **(c) sin (a) es maquillaje.**

### 2. El final oculto es invisible, no inaccesible: hay que telegrafiarlo

Solo el **14,4 %** de las partidas enciende `char:vado.sabe_del_sello`, pero **el 26,1 % de las que
lo encienden y llegan a un final terminan en `fin_heredero`**. El cuello no es el final: es la
puerta. Y la puerta es una tirada de Saber · difícil con **un solo intento por partida**
(`run:piedra_leida`), que un jugador gasta solo si sospecha que la piedra esconde algo.

**Qué mirar:** que las escenas que preceden a `leer_la_piedra` / `reconocer_el_sigilo` **le digan al
jugador que ahí hay algo**, con una línea de texto o con una etiqueta más golosa. El mecanismo de
memoria ya empuja solo (54 → 145 → 181 → 226 a lo largo de la carrera); lo que falta es que la
primera partida sepa dónde mirar. **No hace falta tocar la mecánica ni escribirle una puerta extra al
Guerrero:** con 46.329 partidas la brecha entre clases es de 1,58 % a 2,04 %, o sea ruido.

### 3. Recortar 3.200 palabras de los desenlaces, que es donde están

El exceso es **+20,6 %** y **no está en la prosa de escena** (+2 %, perfecta) sino en los
**desenlaces y bandas: +54 %**. La palanca ya está declarada en el outline §3 y apunta exactamente
ahí. Empezar por las cinco peores celdas —`cl_molino` +216, `a1_molino_pell` +178,
`a1_molino_trampilla` +165, `c1_acusacion` +163, `a1_ilse_patio` +146— y por los desenlaces largos de
`a2_fuera_ilse` (83 y 62 palabras contra una banda de 20–60).

**Antes de recortar, corregir el documento:** `a2_ley_guardia`, `p_puente_amanecer` y
`a2_fuera_refugio` tienen 5 opciones y celdas de 84–90 palabras. Son **insatisfacibles**: hay que
subirles la celda a ~200 en el outline §2, no exprimirles la prosa. Y de paso cerrar la diferencia de
30 palabras entre la suma de la tabla §2 (15.674) y el total declarado en §3 (15.644).

### 4. El retrato de Orell y el eje vertical: una pasada de repeticiones

298 n-gramas de 4+ palabras se repiten entre escenas. No hay que tocarlos todos: hay que tocar los
que un jugador **nota**. En orden: el retrato de Orell casi textual en `p_puente`, `a1_taberna` y
`c1_acusacion`; el sótano redondo (13 palabras idénticas en dos escenas); el tablón del molino (11
palabras en dos escenas vecinas); las sesenta y cuatro casas; y "a una hora en que" ×3.

En la misma pasada entran los dos desajustes de cupo, que son de personaje y no de estilo:
**`usted` 10 contra 8** (los 4 de `cl_molino` son dos variantes del mismo párrafo, así que una
partida oye 8: decidir si el cupo se mide sobre lo escrito o sobre lo que se lee) y **Mausi putea 2
veces cuando la biblia le da 4**.

### 5. El arte que se está generando no cae donde el contenido lo busca

`npm run validate:assets` reporta **29 referencias faltantes y 41 archivos sin referencia**, con 41
imágenes ya en `src/assets/`. No falta el arte: **las dos mitades del pipeline no se llaman igual.**
La spec §7 y el cruce del validador esperan `npc/orell.png`, `place/puente_viejo.amanecer.png`,
`item/…`, `cover/…`; lo que hay en el disco es `retrato/orell.webp`, `fondo/puente_viejo.webp`,
`objeto/…`, `portada/…`.

**Por qué entra en esta lista aunque sea de otra fase:** es el mismo tipo de falla silenciosa que la
fusión con el mundo. Hoy no rompe nada porque la UI todavía no carga imágenes; el día que las cargue,
no van a aparecer y el validador va a seguir diciendo "faltan 29". Hay que elegir **una** convención
—la de la spec o la castellana del generador— y que los dos lados la usen. Es media hora ahora y una
tarde de desconcierto después.

---

## 9. Decisiones que se tomaron en esta fase

| Cuestión | Decisión |
|---|---|
| ¿Las 24–30 escenas se miden en pantallas o en escenas distintas? | **Escenas distintas**, que es como el outline §4 verifica sus tres rutas. El simulador ya lo mide así; las pantallas se siguen reportando aparte. |
| ¿Se cambia la definición de la política codiciosa? | **No por ahora.** Es la lectura literal de la spec §10 y el informe es comparable entre commits. Se cambia junto con el punto 1 de la lista, o no se cambia. |
| ¿`--n` por defecto? | **100** (~65 s), para que `npm run simulate` sin argumentos regenere el `sim-report.md` commiteado byte a byte. Los N = 500 de la spec §10 se piden con `--n 500` (~6 min). |
| ¿`simulate` o `lint:text` en `npm run build`? | **No.** Son informes, no puertas: la spec §10 lo dice para el simulador, y el lint en `--strict` fallaría hasta que se haga el recorte del punto 3. Se agregó `npm run lint` (validate + lint:text, sale 0) para correr las dos pasadas de autor juntas. |
| ¿`npm run build` mira el arte? | **No**, y tiene que seguir así: corre `validate` sin banderas. El cruce de arte vive en `npm run validate:assets` (informativo) y `validate -- --assets-strict` (falla). |
| ¿Se commitea el grafo generado? | **Sí**, en `design/03-grafo.generated.md`, para poder diffearlo contra el outline. Sin test que falle si difiere: es un informe, no un contrato. |

## 10. Lo que queda abierto

- **Umbral de `--strict` del lint.** Hoy falla con cualquier hallazgo `error`, y 22 de los 22 errores
  son excesos de presupuesto. Cuando se haga el recorte del punto 3, conviene mover los excesos a
  `aviso` y dejar `--strict` mirando las listas duras, los cupos y el marco de memoria; recién ahí
  entra en una cadena automática.
- **Banda de los finales.** Los cuatro `ending` tienen 46–53 palabras contra un piso de 60. Si es
  deliberado (y parece que sí), hay que escribir la excepción para `kind: 'ending'` en la biblia
  §2.3.
- **Política de Fortuna del simulador.** Hoy gasta mientras el resultado siga siendo Fallo, así que
  puede quemar los 3 puntos en una tirada temprana. Un jugador real reserva uno para la escena
  mortal. Cambiarlo **subiría** los números de muerte, o sea que los de este informe son un piso.
- **Perfil "veterano" con `seedFlags`** (spec §10): no está implementado. La carrera de 4 partidas ya
  produce el efecto, pero para medir la verificación abierta n.º 5 de la biblia (¿el veterano que
  toma los tres atajos baja de 30 min?) haría falta el perfil explícito.
- **`validate --assets` no verifica aspecto, dimensiones ni peso** ni cruza contra `art/curation.json`,
  como pide la spec §10. Con arte en el disco, ahora ya tiene contra qué correr.
- **Ruta mínima del lint (19,6 min a cada final).** Es una cota inferior teórica, no una partida: la
  caminata no evalúa `requires` ni las condiciones de `redirect`, así que toma atajos `[Recuerdo]`
  sin tener el flag. Medir rutas reales es trabajo del simulador, no del lint.
