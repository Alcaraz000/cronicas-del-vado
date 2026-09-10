# sistema-reglas

CONFIANZA: media-alta. Verificado con lectura completa: reglas de Blades (SRD oficial), Ironsworn (SRD), fórmula y etiquetas de Fallen London (wiki), matemática d20 vs 2d6 (Gestwicki), Roadwarden y Slay the Princess (Game Developer), Darkest Dungeon (Game Developer), Wildermyth Legacy/Difficulty (wiki oficial), permadeath (Grid Sage Games 2025, Doull), Citizen Sleeper 2 (entrevista GameRant), Choice of Games (7 reglas y By the Numbers), Failbetter sobre muerte y legados. Las tablas de probabilidad del sistema propuesto las calculé yo por enumeración exhaustiva (2d6 y 3d6 conservando 2), son exactas. NO pude verificar: (1) la revisión sistemática MDPI 'Narrative and Challenge in Single-Player RPGs 1990–2025' (403) ni la entrevista de Roadwarden en RPGWatch (403); (2) los porcentajes de resultado por dado de Citizen Sleeper provienen de guías de jugadores, no de fuentes oficiales; (3) el diario de balance de Wildermyth es de ~2017, no reciente; (4) el detalle de los checks de Disco Elysium (doble 1 / doble 6, tabla de nombres de dificultad) sale de guías, no de los desarrolladores, y no confirmé los números objetivo de cada nombre; (5) no encontré ninguna charla GDC 2025–2026 específica sobre telegrafiar consecuencias ni entrevistas de 2026 con desarrolladores sobre tiradas; las fuentes de 2026 halladas (RoleForge, abril 2026) son de un blog de plataforma, no de un estudio; (6) las cifras de XP, umbrales de nivel y bonos de Ascensión de mi propuesta son puntos de partida de diseño, no valores probados con jugadores; (7) la afirmación de que la regla de 0 dados de Blades es 'tirar 2 y quedarse con el peor' la recuerdo de memoria y la página del SRD consultada no la mostraba.

## Resumen
Comparé cinco familias de resolución (d20 con ventaja, 2d6 tipo PbtA, d100, pools tipo Blades y librojuegos) contra tres criterios: cómo transmiten "potenciado/perjudicado", qué resultados narrativos generan y qué tan legibles son en pantalla para un jugador casual. La matemática confirma que la probabilidad base es intercambiable entre sistemas (Gestwicki: 2d6 con 7+ da 58%, d20 contra CD 10 da 55%); lo que cambia es la ESTRUCTURA del resultado. El 2d6 trae de fábrica tres bandas (éxito / éxito con costo / fallo), que es exactamente lo que una novela visual rejugable necesita para que cada tirada produzca texto distinto y "fail forward". La ventaja/desventanja (tirar un dado extra y quedarse con los mejores/peores dos) es la forma más legible de comunicar la situación en pantalla, como popularizó Baldur's Gate 3; y mostrar el porcentaje antes de tirar, como Disco Elysium, evita que el jugador sienta la tirada como injusta.

Propongo un sistema mínimo: 4 atributos (Vigor, Astucia, Saber, Presencia, 0–5), tirada única 2d6 + atributo + dificultad (Fácil +1 a Extrema −3), bandas fijas 10+/7–9/6−, dobles 6 y dobles 1 como crítico/fallo grave opcionales, ventaja/desventaja no acumulables, 3 puntos de Fortuna por partida para volver a tirar un dado, y un estado del personaje reducido a Heridas 0–3 más condiciones-etiqueta. Progresión de nivel 1 a 10 alternando +1 atributo y una habilidad que abre opciones (no solo bonos), rasgos de origen y cicatrices que los PNJ recuerdan, campañas con nivel recomendado y etiqueta relativa (Paseo / Tranquila / Pareja / Exigente / Mortal) más modificadores de "Ascensión" al rejugar (Slay the Spire) para que un personaje veterano no trivialice. La muerte permanente solo ocurre en escenas marcadas, con el personaje ya Malherido, tras una elección explícita y siempre con una salida no letal disponible; al morir, el mundo recuerda y el heredero recibe un rasgo de legado (lección de Sunless Skies).

## Hallazgos
# Hallazgos

## 1. Comparación de mecánicas de resolución

**La probabilidad base es intercambiable; la estructura del resultado no.** Paul Gestwicki calculó que 2d6 con éxito en 7+ da 58 % (42 % parcial 7–9, 17 % pleno 10+) y que un d20 contra CD 10 da 55 %; la diferencia real es que d20 es binario y 2d6 es ternario. También muestra que en 2d6 cada +1 tiene rendimiento decreciente (+14, +11, +8, +6, +3 puntos) mientras en d20 siempre vale +5 %. Un artículo de diseño de resolución (jfacegames, 2023) recomienda apuntar a 65–70 % de éxito para que el jugador se sienta competente y estima la ventaja d20 en ~+15 %.

Tabla resumida de evaluación (criterios: situación potenciada/perjudicada; riqueza narrativa; legibilidad casual en pantalla):

| Sistema | Potenciado/perjudicado | Resultado narrativo | Legibilidad en pantalla |
|---|---|---|---|
| d20 + ventaja/desventaja (5e, BG3) | Excelente: "tirás dos, te quedás con el mejor" se entiende sin explicar; BG3 lo muestra con el d20 grande, la CD y los bonos apilándose después del dado | Pobre de fábrica: binario; hay que inventar bandas (fallar por 5+) | Muy alta; es el sistema que más gente conoce |
| 2d6 + stat con bandas (PbtA, Disco Elysium, Fabled Lands) | Buena: el +1/−1 pesa mucho cerca del centro de la campana; la ventaja se implementa como 3d6 quedándose con 2 | Excelente: éxito / éxito con costo / fallo vienen de serie; DE agrega doble 1 = fallo automático, doble 6 = éxito automático y muestra el % antes de tirar | Alta: dos dados, sumar, comparar; los nombres de dificultad de DE (Trivial…Impossible) son etiquetas legibles |
| d100 (Call of Cthulhu 7e) | Regular: dados de bonificación/penalización (tirar dos "decenas" y elegir) son confusos incluso en mesa; en foros de Roll20 la gente pregunta qué se está tirando | Regular: tiene niveles (éxito normal, difícil = mitad, extremo = quinto) pero centrados en grados de éxito, no en costo; "pushing" (repetir con riesgo) es una idea aprovechable | Media: el % es transparente, pero un personaje con 45 % en todo se siente incompetente |
| Pool de d6 (Blades in the Dark) | Excelente conceptualmente: Posición (controlada / arriesgada / desesperada) y Efecto (limitado / estándar / grande) modelan la situación mejor que nadie | Excelente: 6 = logra; 4–5 = logra con consecuencia; 1–3 = fallo; crítico con dos 6; la tabla de consecuencias depende de la posición | Baja para casual: leer 3–5 dados y quedarse con el más alto, más dos ejes (posición/efecto), es demasiado en una pantalla de novela visual |
| Librojuegos (Fighting Fantasy, Fabled Lands, Steam Highwayman) | Simple: objetos que suman a una habilidad; Suerte como recurso gastable | Pobre: binario; Duncan Thomson (Gamebook Diaries) critica "tiradas que no cambian nada" y propone que cada ronda cambie el estado (Shaken, Wounded) | Alta: 2d6 + habilidad ≥ objetivo |

**Otros datos relevantes de casos reales:**
- **Disco Elysium**: 2d6 + habilidad + modificadores vs dificultad; checks blancos (repetibles al subir la habilidad) vs rojos (una sola vez, con impacto en la historia); checks pasivos que abren opciones sin tirar; el fallo suele ser tan interesante como el éxito. El análisis de gamedesignthinking destaca que la dificultad crece con el progreso porque más voces interrumpen: el sistema sostiene la narrativa, no la domina.
- **Citizen Sleeper**: dados de d6 tirados por adelantado y asignados como recurso; según guías, un 6 es 100 % positivo, 3–5 es 25/50/25 (positivo/neutro/negativo) y 1–2 es 50/50 neutro/negativo (cifras de guías de jugadores, no oficiales). La Condición del cuerpo reduce dados disponibles; relojes de progreso tomados de Blades. En la secuela (2025), cada dado aguanta tres golpes de estrés antes de romperse, "Push" mejora la tirada a cambio de estrés, cada clase tiene un Push único y una debilidad, y Martin dice que "los jugadores terminan fijando su propio balance con sus elecciones" (éxito con consecuencias como filosofía).
- **Ironsworn** (referente del solo RPG; un blog de abril de 2026 lo llama texto casi canónico): 5 stats 1–3; d6 + stat contra dos d10 de desafío; strong hit (supera ambos), weak hit (uno), miss (ninguno); Momentum −6 a +10 con reset en +2 que se "quema" para asegurar un resultado; pistas de Salud/Espíritu/Suministros 0–5; condiciones borrables (Wounded, Shaken) y "banes" permanentes (Maimed, Corrupted) que bajan el momentum máximo; rangos de desafío que fijan cuánto progreso da cada éxito (Troublesome 3 casillas … Epic 1 tick); muerte solo a 0 salud tras un miss en Endure Harm.
- **Fallen London**: fórmula pública P(éxito) = 0,6 × Cualidad / Dificultad (redondeo hacia abajo), y etiquetas de texto por rango de %: almost impossible (0–10), high-risk (11–30), tough (31–40), very chancy (41–50), chancy (51–60), modest (61–70), very modest (71–80), low-risk (81–90), straightforward (91–100). Es el mejor ejemplo de comunicar dificultad con palabras en vez de números.
- **Baldur's Gate 3** (análisis de jikguard/TheGamer): la interfaz de tirada "se siente" porque muestra el dado, la CD y los bonos aplicándose después de tirar, y decide qué tiradas mostrar en grande (conversación, cerraduras) y cuáles como iconos pequeños (percepción). El problema señalado es el save scumming, que vacía de sentido el fallo.

## 2. Éxito parcial y fallo con costo

- Cezar Capacle ("The cost of partial success"): inventar complicaciones es creativamente agotador; propone tablas temáticas de complicaciones y, sobre todo, invertir la lógica: partir del fallo y dejar que el jugador INVIERTA recursos categorizados (salud, ánimo, talento, equipo, información) para alcanzar el éxito. Psicológicamente se siente como agencia, no como pérdida.
- Gnome Stew (Failing Forward): tipos de costo utilizables en contenido pre-escrito: pérdida de recurso, condición, aumento de dificultad posterior, gatillar un combate, cortar un camino del mapa, avanzar un "reloj de perdición". Advertencia clave: no todo fallo necesita fail-forward; reservarlo para momentos importantes y dejar que checks menores simplemente fallen.
- Roadwarden (Deep Dive en Game Developer): jerarquía de consecuencias que sirve como guía de autoría: Fluff (color), Spice (afecta amistad/stats), Floodgates (limita opciones futuras), Burnt Bridges (permanentes: un PNJ muere, un pueblo cae). Además el "alambique": varias formas de alcanzar un umbral (sangre, hechizo u objeto sirven igual para alimentar el altar). Las tres clases dan bonos, no restricciones: ninguna misión exige una clase.
- Pentiment: las opciones desbloqueadas por trasfondo no siempre son buenas (los PNJ se irritan); los checks fallados no deben angustiar porque hay muchas rutas y el tiempo limita.
- Slay the Princess (Deep Dive, 2024): rejugabilidad por variación temática del capítulo 2 según el capítulo 1; "voces" internas que verbalizan dudas derivadas de decisiones previas en vez de preguntar al jugador; alcance deliberadamente estrecho (bosque/cabaña/sótano) para poder ramificar.

## 3. Dificultad de campañas y escalado

- Wildermyth separa dificultad de combate (vida, armadura, daño) y de mapa (ritmo de calamidades), con cuatro niveles (Storyteller, Adventurer, Tragic Hero, Walking Lunch) explicados en texto sin números. Su sistema Legacy tiene cinco tiers (Folk Hero → Mythwalker) con costo creciente en puntos de legado, el equipo se reduce por capítulo, el jugador elige qué habilidades readquiere, y las "campañas de legado" arrancan con calamidades proporcionales a la suma de tiers de los héroes traídos. Aun así los jugadores reportan que héroes Mythwalker trivializan incluso la dificultad máxima: escalar por nivel del héroe NO alcanza si el techo de poder no está acotado.
- Slay the Spire resuelve la trivialización por maestría con Ascensión: 20 niveles acumulativos de restricciones que se desbloquean al ganar. Es el modelo más barato de implementar en un juego pre-escrito: mismo contenido, umbrales más duros, recursos recortados, permadeath activada.
- Discusión de comunidad sobre level scaling: escalar enemigos al nivel del jugador anula la progresión; en juegos lineales conviene contenido estático con nivel recomendado, y reducir la XP cuanto más por encima del nivel base esté el jugador.
- Failbetter (Sunless Sea → Skies): la muerte era demasiado punitiva y la repetición se sentía castigo; en Skies el heredero conserva la mitad del dinero, el banco, la locomotora, XP y mapas, y el mundo recuerda. Lección: la permadeath funciona cuando deja progresión tangible entre vidas.

## 4. Muerte permanente justa

- Kyzrati (Grid Sage Games, agosto 2025): la permadeath tiene sentido cuando el jugador entiende que sus decisiones causaron el resultado; los sistemas deben ser predecibles, los cambios de estado se anuncian de inmediato, y en un jugador hipotéticamente óptimo la suerte nunca debería decidir una partida.
- Andrew Doull (lecciones de permadeath): el guardado captura "el progreso equivocado" (errores tempranos que el jugador desconoce); la permadeath fija el reinicio en un punto donde todas las lecciones son accesibles y desalienta el grindeo.
- Wildermyth: al caer, el héroe elige entre retirarse con secuela (debuff de campaña o pérdida de un miembro) o morir con gloria; solo puede ser mutilado una vez por capítulo, la segunda caída es muerte. Ironsworn: la muerte exige estar a 0 y fallar la tirada de resistir. Ambos coinciden en la regla de "dos pasos": nunca se muere de una sola tirada desde salud plena.

## 5. Estado del personaje sin micromanagement

- Darkest Dungeon (Deep Dive de Red Hook): intentaron ocultar el estrés y descubrieron que el jugador necesita el número visible (+20 Stress) para entender consecuencias; a 100 se tira Resolve y sale Aflicción (7 tipos) o Virtud; los Quirks son rasgos persistentes que construyen narrativa emergente. Lección: pocos estados discretos, visibles, con nombre y comportamiento propio.
- Ironsworn: tres pistas de 0–5 y un puñado de condiciones nombradas. Citizen Sleeper: dos números (Condición, Energía) y relojes.
- Choice of Games (7 reglas de stats): no usar solo habilidades; incluir rasgos de personalidad y morales; stats sobre el mundo (reputación, relaciones); recursos gastables; alternativas igual de atractivas; evitar FUE/DES/INT/CAR genéricos. Delayed branching: la decisión del capítulo 1 no ramifica de inmediato sino que decide el resultado del capítulo 3; los stats en 1–100 sirven para umbrales claros; estructura "pila de arbustos" (ramas que reconvergen al final de cada escena).

## 6. Estructura de contenido rejugable (contexto para las reglas)

- Choice of Games y Roadwarden convergen en "ramificar y reconverger" con estado numérico/etiquetas que decide los resultados tardíos; Roadwarden admite que mantener miles de variables fue una pesadilla: conviene un vocabulario de etiquetas pequeño y consistente.
- Blades/Citizen Sleeper/Ironsworn usan relojes o pistas de progreso: una herramienta ideal para "combate narrativo" y para amenazas que crecen con los fallos.

## 7. Probabilidades del sistema propuesto (calculadas)

2d6 + modificador neto (atributo + objeto + dificultad), bandas 10+ / 7–9 / 6−:

| Mod neto | Éxito | Éxito con costo | Fallo |
|---|---|---|---|
| −3 | 0 % | 16,7 % | 83,3 % |
| −2 | 2,8 % | 25,0 % | 72,2 % |
| −1 | 8,3 % | 33,3 % | 58,3 % |
| 0 | 16,7 % | 41,7 % | 41,7 % |
| +1 | 27,8 % | 44,4 % | 27,8 % |
| +2 | 41,7 % | 41,7 % | 16,7 % |
| +3 | 58,3 % | 33,3 % | 8,3 % |
| +4 | 72,2 % | 25,0 % | 2,8 % |
| +5 | 83,3 % | 16,7 % | 0 % |

Con **Ventaja** (3d6, se conservan los 2 mayores): mod 0 → 35,6 / 44,9 / 19,4; mod +2 → 68,1 / 26,9 / 5,1. Con **Desventaja** (3d6, se conservan los 2 menores): mod 0 → 5,1 / 26,9 / 68,1; mod +2 → 19,4 / 44,9 / 35,6. Doble 6 natural: 2,8 % (7,4 % con ventaja); doble 1: 2,8 % (7,4 % con desventaja). La ventaja equivale a unos +1,5/+2 puntos pero se explica sin números y se anima en pantalla (el dado descartado se apaga).

# Propuesta: sistema concreto y mínimo

## Atributos (4)
- **Vigor** (fuerza, aguante, violencia directa), **Astucia** (agilidad, sigilo, percepción, engaño), **Saber** (conocimiento, magia, lectura del mundo), **Presencia** (carisma, voluntad, fe, liderazgo).
- Rango 0–5. Creación: repartir 2 / 1 / 1 / 0. Techo 5 (no 7): obliga a diversificar y acota el poder máximo.
- Cada opción de decisión declara con qué atributo se tira; el diseño de cada decisión ofrece al menos una opción por atributo (así todo personaje tiene "su" opción) y, cuando corresponde, una quinta opción visible etiquetada por clase/rasgo, y una salida sin tirada (retirarse, pagar, esperar).

## Tirada única
**2d6 + Atributo + Dificultad de la situación (± Objeto/Condición)**, con la probabilidad mostrada ANTES de elegir (estilo Disco Elysium) y las fuentes como chips legibles ("+2 Astucia", "Difícil −1", "Ventaja: Cazador furtivo", "Desventaja: Herido"). Autosave único, la tirada se consolida: sin recargar.

- Dificultad de la situación (la fija el autor de la escena): Fácil +1, Normal 0, Difícil −1, Muy difícil −2, Extrema −3.
- **Ventaja / Desventaja**: se tira 3d6 y se conservan los 2 mejores (o los 2 peores). No se acumulan: cualquier cantidad de fuentes de ventaja = una ventaja; si hay ambas, se anulan (regla 5e; simple de leer). Fuentes: rasgos, clase, objetos con etiqueta, decisiones previas (flags), condiciones, memoria ("ya conocés este pasaje").
- Modificador plano solo de dos orígenes: el atributo y, como máximo, un ±1 de objeto o condición explícita. Nada más suma números.

## Tabla de resultados
| Resultado | Condición | Qué escribe el autor |
|---|---|---|
| **Crítico** | doble 6 natural (en los dados conservados) | Opcional: texto "crítico". Si no existe, es Éxito y el personaje recupera 1 Fortuna |
| **Éxito** | total ≥ 10 | Obligatorio |
| **Éxito con costo** | total 7–9 | Obligatorio: logra el objetivo y paga UN costo tomado de la lista cerrada: Herida, Condición, objeto perdido, relación dañada (flag), tiempo/oportunidad perdida, reloj de peligro +1 |
| **Fallo** | total ≤ 6 | Obligatorio; siempre avanza la historia por otro camino (fail forward) |
| **Fallo grave** | doble 1 natural | Opcional: texto "grave". Si no existe, es Fallo + una Condición |

Tres textos obligatorios por tirada (no cinco) mantienen la autoría acotada; crítico y grave se reservan para escenas clave.

## Fortuna (único recurso gastable de sistema)
3 puntos por partida (4 desde nivel 5); no persisten entre partidas. Después de ver los dados, 1 Fortuna = volver a tirar un dado. Se recupera 1 con un crítico. Es la válvula de agencia contra el azar (Capacle: invertir para pasar del fallo al éxito; Ironsworn: quemar momentum) y lo que hace defendible la muerte permanente: si moriste con Fortuna sin gastar, fue tu decisión. "Ascensión" puede quitarla.

## Estado del personaje
- **Heridas 0–3** con nombre: Sano → Herido (desventaja en tiradas con etiqueta "físico") → Malherido (desventaja en todas) → Caído. Se muestra como tres marcas y un adjetivo, nunca como HP.
- **Condiciones**: etiquetas temporales (Envenenado, Asustado, Exhausto, Perseguido…) que dan desventaja en tiradas con esa etiqueta o cierran opciones; máximo 3 visibles; las borra una escena de descanso o el final de la campaña.
- **Objetos**: 6 ranuras; cada objeto es una etiqueta (ventaja en X, o llave narrativa). Sin oro ni comida contados: si una campaña necesita dinero usa una pista 0–3 "Monedas" propia o una palabra clave ("Bolsa llena").
- **Reliquias**: hasta 2 objetos persistentes entre campañas (recompensa de primera finalización).
- Recuperación: escenas de descanso escritas curan 1 Herida y limpian condiciones; entre campañas se cura todo salvo cicatrices.

## Combate narrativo
Una escena de "Enfrentamiento" con 2–4 rondas. Cada ronda: 4+ opciones (una por atributo, más huir con su propia tirada). Un **reloj de victoria** de 2 (pelea menor) a 4 (jefe) segmentos: Éxito +1, Crítico +2, Éxito con costo +1 y el enemigo golpea (Herida o Condición u objeto, elige el autor), Fallo = el enemigo golpea y un **reloj de peligro** opcional avanza (al llenarse, cambia la escena: llegan refuerzos, se derrumba el puente). Cada ronda cambia el estado (Thomson): nunca "tiradas que no hacen nada".

## Clases, rasgos y habilidades (abren opciones, no solo suman)
- **4 clases**: Guerrero (Vigor), Explorador (Astucia), Mago (Saber), Clérigo (Presencia). Cada una tiene: (a) opciones etiquetadas que solo ella ve, marcadas visiblemente ("[Mago] Leer las runas"), nunca imprescindibles para terminar la campaña (Roadwarden); (b) un **Poder** de un uso por partida (Guerrero "Segundo aliento": ignora una Herida; Explorador "Sombra": convierte un Fallo de sigilo en Éxito con costo; Mago "Conjuro": convierte un Fallo en Éxito con costo y gana Condición Agotado; Clérigo "Plegaria": cura 1 Herida); (c) una **Debilidad** (etiqueta con desventaja permanente, tomada de Citizen Sleeper 2) que también abre texto propio.
- **Rasgos de origen** (2 al crear, de una lista de ~8: Hijo de la frontera, Criado en el templo, Desertor, Huérfano de la peste…): cada uno = una etiqueta con ventaja + un gancho que los PNJ reconocen (flag). Es la regla de Choice of Games de stats de personalidad y mundo, no solo competencias.
- **Rasgos adquiridos**: Cicatrices (desventaja en una etiqueta + gancho narrativo; se ganan al caer), Reputaciones ("Traidor de Valmar": cierra y abre opciones en cualquier campaña que lea ese flag), Vínculos ("Amiga de Mira": ventaja en escenas con ella, y memoria).
- **Habilidades** (una cada nivel impar, de una lista de ~5 por clase + 6 generales): cada habilidad = ventaja en una etiqueta + un tipo de opción que aparece (Rastreador ve opciones de rastro; Orador ve opciones de negociar la rendición). Sin árboles.

## Progresión (niveles 1–10)
- Nivel 2, 4, 6, 8, 10: +1 a un atributo (techo 5). Nivel 3, 5, 7, 9: una Habilidad nueva. Nivel 5: Fortuna máxima 4. Nivel 10: título "Leyenda" (flag que los PNJ reconocen).
- **XP por hitos**: cada campaña define 8–12 hitos; alcanzar un hito por primera vez con ese personaje da 10 XP, repetirlo 3 XP; terminar la campaña da un bono según dificultad relativa (Tranquila 20, Pareja 40, Exigente 60, Mortal 80; Paseo 0). Caer conserva la XP de los hitos, sin bono. Umbral sugerido: 60 XP por nivel (nivel N = 60×(N−1) acumulados). Objetivo de calibración: primera partida completa de nivel 1 → nivel 3; cada rejugada de la misma campaña ≈ medio nivel; campañas nuevas y exigentes 1–2 niveles. Los números son tunables, la forma (primera vez vale mucho, repetir vale poco, el bono premia jugar a nivel) es lo que importa.
- Recompensas únicas (Reliquia, Reputación, Vínculo) solo en la primera finalización o en finales concretos: el motivo real para rejugar es ver otros finales y otras rutas, no la XP.

## Dificultad de campañas
- Cada campaña declara: **nivel recomendado** (rango, ej. 1–3), cantidad de escenas mortales, duración estimada y una frase de tono. La ficha calcula la **etiqueta relativa** contra el personaje: nivel por debajo del mínimo = **Mortal** (rojo, con texto "tu personaje probablemente no sobreviva"); dentro del rango = **Pareja**; hasta 2 niveles por encima = **Tranquila**; más de 2 = **Paseo** (XP ×0,3, sin reliquias). Palabras antes que números, como Fallen London y Wildermyth.
- Los umbrales de las escenas NO escalan con el jugador: el contenido es estático y honesto; la progresión se siente al volver. El techo de atributo 5 y la dificultad Extrema −3 garantizan que una campaña de nivel 8–10 siga siendo tensa (un +5 contra Extrema es un +2 neto: 42 % de éxito pleno).
- **Ascensión** (al completar una campaña se desbloquea por campaña): A1 todas las tiradas −1; A2 sin Fortuna; A3 empezás Herido; A4 muerte permanente en toda la campaña. Acumulativos, opcionales, mostrados en la ficha; dan XP como Exigente y un flag de "completada en Ascensión N" que la memoria puede citar. Cuesta cero contenido nuevo.

## Muerte permanente situacional (telegrafiada)
1. Solo en **escenas marcadas como mortales**: icono propio, encabezado en prosa ("Aquí se puede morir de verdad") y una confirmación explícita al elegir entrar. La ficha de campaña ya anunció cuántas hay.
2. **Regla de dos pasos**: solo muere quien está **Malherido** (Heridas 2) y saca **Fallo** en la escena mortal. Sano o Herido nunca muere: cae a Malherido/Caído. Desde salud plena una sola tirada jamás mata.
3. Toda escena mortal ofrece **al menos una opción no letal** (retirada con costo: perder el objetivo, una Reputación, un Vínculo) entre sus 4+ opciones, y nunca se entra por emboscada: siempre hubo una decisión previa que llevó ahí.
4. Éxito con costo estando Malherido en escena mortal = sobrevive con una **Cicatriz permanente** (bane de Ironsworn, mutilación de Wildermyth).
5. **Caído fuera de escena mortal** = campaña perdida; el personaje conserva XP y elige 1 de 2 Cicatrices ofrecidas (elección mortal de Wildermyth: consecuencia, pero con agencia).
6. **Legado** al morir: el mundo recuerda (flags de alcance "mundo" sobreviven al personaje: los PNJ hablan del difunto), y el personaje nuevo puede tomar un rasgo "Heredero de X" con la memoria del anterior y ventaja en una etiqueta (Sunless Skies: la muerte deja progresión tangible).

## Memoria (interfaz con las reglas)
Tres alcances de flags: **partida** (esta run), **personaje** (entre partidas y campañas; incluye Vínculos, Reputaciones, lugares visitados, PNJ conocidos) y **mundo** (sobrevive a la muerte permanente). Las escenas leen flags para variar texto y para dar ventaja ("ya cruzaste este vado"): la memoria se convierte en potenciación situacional, no solo en color.

## Qué NO tiene el sistema (YAGNI)
Sin HP numéricos, sin oro contado, sin inventario con peso, sin árboles de talentos, sin tirada de iniciativa ni turnos, sin dificultad de check escalada al nivel, sin modificadores apilables más allá de un ±1, sin guardado manual.

## Recomendaciones
- **2d6 + atributo con bandas fijas (10+ / 7–9 / 6−), dificultad como ±, ventaja = 3d6 conservar 2 mejores, dobles como crítico/grave, Fortuna para repetir un dado** | PROS: Éxito parcial y fallo con costo vienen de serie (PbtA, Disco Elysium); dos dados se leen de un vistazo y se animan bien; la campana hace que un +1 de rasgo se sienta (hasta +14 puntos); el techo de atributo 5 acota el poder; probabilidad mostrable antes de tirar; solo 3 textos obligatorios por tirada. | CONTRAS: Rendimiento decreciente de los modificadores (un +1 vale distinto según dónde estés); menos familiar que el d20 para quien viene de D&D/BG3; hay que explicar la ventaja como 'tirás tres, te quedás con dos'. | VEREDICTO: recomendada: es el único sistema que combina resultados ternarios nativos, legibilidad en pantalla y potenciación situacional clara sin agregar ejes extra.
- **d20 + ventaja/desventaja (D&D 5e / Baldur's Gate 3) con bandas artificiales (fallar por 5+ = fallo grave, superar por 5+ = crítico)** | PROS: Máxima familiaridad; ventaja/desventaja es la metáfora más reconocible de 'potenciado/perjudicado'; modificadores lineales (+5 % cada punto) fáciles de razonar; la UI de BG3 demuestra que funciona en pantalla. | CONTRAS: Binario de fábrica: el éxito parcial hay que inventarlo con márgenes que el jugador casual no intuye; distribución plana (un 1 y un 20 son igual de probables), lo que hace las tiradas más swingy y las muertes más 'injustas'; los rasgos como +1 se sienten insignificantes. | VEREDICTO: alternativa: válida si el desarrollador prefiere la familiaridad del d20; requiere definir márgenes de ±5 para bandas y aceptar más varianza.
- **Pool de d6 al estilo Blades in the Dark (Posición y Efecto)** | PROS: Modela la situación mejor que cualquier otro (controlada/arriesgada/desesperada define qué tan malo es el costo); tabla de consecuencias ejemplar; crítico natural con dos 6; Citizen Sleeper demuestra que los d6 como recurso funcionan en videojuego. | CONTRAS: Leer 3–5 dados y dos ejes (posición, efecto) es demasiado para una novela visual casual; el pool de 0 dados y las reglas de asistencia/push agregan casos; en contenido pre-escrito la posición la fija el autor, así que el eje se puede absorber en la tabla de costos. | VEREDICTO: descartada como mecánica, pero se adoptan sus ideas: relojes de progreso/peligro, costos escalonados por gravedad de la escena y la regla '6 logra, 4–5 logra con consecuencia'.
- **d100 al estilo Call of Cthulhu (con dados de bonificación/penalización y 'pushing')** | PROS: El porcentaje es transparente; los grados de éxito (normal/difícil/extremo) existen; 'pushing' (repetir aceptando riesgo) es una idea aprovechable, que la propuesta recoge como Fortuna. | CONTRAS: Los dados de bonificación/penalización confunden incluso en mesa (hilos enteros de Roll20 preguntando qué se tira); habilidades al 40–50 % hacen sentir incompetente al héroe de fantasía; los grados son de calidad, no de costo narrativo; escalar 1–100 invita a micro-bonos. | VEREDICTO: descartada: buena transparencia pero peor sensación heroica y peor legibilidad de la ventaja situacional.
- **Sistema de librojuego clásico (2d6 + habilidad ≥ objetivo, Suerte gastable, Fighting Fantasy / Fabled Lands / Steam Highwayman)** | PROS: Simplísimo; palabras clave, códigos y objetos-que-suman son exactamente la estructura de memoria que necesita un juego pre-escrito; Suerte como recurso inspira la Fortuna. | CONTRAS: Binario; el combate por rondas de comparar tiradas se vuelve tedioso ('tiradas que no cambian nada'); sin éxito parcial cada fallo es una pared o una muerte. | VEREDICTO: descartada como resolución, adoptada como arquitectura de contenido (palabras clave, cambios locales permanentes, objetos como etiquetas).
- **Dificultad estática con nivel recomendado + etiqueta relativa + Ascensión al rejugar (en vez de escalar los umbrales al nivel del jugador)** | PROS: El contenido es honesto y la progresión se siente al volver; la etiqueta en palabras (Paseo/Tranquila/Pareja/Exigente/Mortal) comunica 'elegí con cabeza'; Ascensión reutiliza el mismo contenido para desafiar al veterano (Slay the Spire) sin escribir nada nuevo; XP reducida por sobrenivel evita el farmeo. | CONTRAS: Un personaje de nivel 10 arrasa una campaña de nivel 1–3 sin Ascensión (aceptado: es fantasía de poder con premio reducido); exige calibrar bien el rango recomendado de cada campaña. | VEREDICTO: recomendada: es la solución más barata y más legible al problema del personaje reutilizado.
- **Muerte permanente de dos pasos (solo en escenas marcadas, solo estando Malherido, siempre con salida no letal) + Legado** | PROS: Cumple los criterios de justicia de Kyzrati y Doull (predecible, anunciada, causada por decisiones); la Fortuna da una última palanca; Wildermyth e Ironsworn validan el patrón 'caer primero, morir después'; el Legado (Sunless Skies) evita que la muerte borre la memoria del mundo. | CONTRAS: Menos shock que una muerte súbita; requiere disciplina de autoría (toda escena mortal con salida y con decisión previa que la anticipe). | VEREDICTO: recomendada: es la única forma de que 'muerte permanente' y 'elegir con cabeza' convivan en un juego con dados.

## Fuentes
- [Comparing the dice of D&D and PbtA with Math (Paul Gestwicki)](http://paulgestwicki.blogspot.com/2020/06/comparing-dice-of-d-and-pbta-with-math.html) 2020-06
- [Getting your Resolution System Down (jfacegames)](https://jfacegames.substack.com/p/getting-your-resolution-system-down) 2023-07-15
- [TTRPG Dice Systems Explained: d20, Dice Pools, 2d6, and Percentile](https://www.ttrpg-games.com/blog/ttrpg-dice-systems-explained-d20-dice-pools-2d6-percentile) 
- [Blades in the Dark – Action Roll (SRD oficial)](https://bladesinthedark.com/action-roll) 
- [Ironsworn System Reference Document](https://tedtschopp.github.io/Ironsworn-SRD/Ironsworn%20SRD.html) 
- [Disco Elysium: Skill checks (gamepressure)](https://www.gamepressure.com/disco-elysium/skill-tests/zfe3e2) 
- [Disco Elysium RPG System Analysis (Game Design Thinking)](https://gamedesignthinking.com/disco-elysium-rpg-system-analysis/) 
- [Can I make an RPG on my own? Case study: Citizen Sleeper](https://howtomakeanrpg.com/r/a/case-study-citizen-sleeper.html) 
- [How The Dice System Works In Citizen Sleeper (TheGamer)](https://www.thegamer.com/citizen-sleeper-dice-explained-guide/) 
- [Interview: Citizen Sleeper 2 Solo Dev Talks Gameplay, Story, and Choices (GameRant)](https://gamerant.com/interview-citizen-sleeper-2-gameplay-story/) 2025
- [Deep Dive: How to design for impact and narrative variance with Roadwarden (Game Developer)](https://www.gamedeveloper.com/design/deep-dive-roadwarden) 
- [The cost of partial success (Cezar Capacle)](https://capacle.substack.com/p/the-cost-of-partial-success) 
- [Failing Forward: How to Make Failure Interesting in RPGs (Gnome Stew)](https://gnomestew.com/failing-forward-how-to-make-failure-interesting-in-rpgs/) 
- [By the Numbers: How to Write a Long Interactive Novel That Doesn't Suck (Choice of Games)](https://www.choiceofgames.com/2011/07/by-the-numbers-how-to-write-a-long-interactive-novel-that-doesnt-suck/) 2011-07
- [7 Rules for Designing Great Stats (Choice of Games)](https://www.choiceofgames.com/2011/07/7-rules-for-designing-great-stats/) 2011-07
- [Broad difficulty – Fallen London Wiki](https://fallenlondon.wiki/wiki/Broad_difficulty) 
- [Sunless Sea vs Sunless Skies: Death, Legacies and Repetition (Failbetter Games)](https://www.failbettergames.com/news/sunless-sea-vs-sunless-skies-death-legacies-and-repetition) 
- [Legacy – Wildermyth Wiki](https://wildermyth.com/wiki/Legacy) 
- [Difficulty – Wildermyth Wiki](https://wildermyth.com/wiki/Difficulty) 
- [Design Journal: Campaign Balance (Wildermyth devlog)](https://wildermyth.itch.io/wildermyth/devlog/86387/design-journal-campaign-balance) ~2017
- [Game Design Deep Dive: Darkest Dungeon's Affliction System (Game Developer)](https://www.gamedeveloper.com/design/game-design-deep-dive-i-darkest-dungeon-s-i-affliction-system) 
- [Designing for Mastery in Roguelikes (Grid Sage Games)](https://www.gridsagegames.com/blog/2025/08/designing-for-mastery-in-roguelikes-w-roguelike-radio/) 2025-08-07
- [Analysis: The Game Design Lessons Of Permadeath (Game Developer)](https://www.gamedeveloper.com/game-platforms/analysis-the-game-design-lessons-of-permadeath) 
- [What works (and doesn't work) about Baldur's Gate 3's D&D-driven systems](https://www.jikguard.com/news/what-works-and-doesnt-work-about-baldurs-gate-3s-dd-driven-systems/) 
- [Baldur's Gate 3's On-Screen Dice Rolls Are The Perfect Tabletop Experience (TheGamer)](https://www.thegamer.com/baldurs-gate-3-dice-rolls-perfect-tabletop-experience/) 
- [Deep Dive: Player-centered narrative design in Slay the Princess (Game Developer)](https://www.gamedeveloper.com/design/deep-dive-player-centered-narrative-design-in-slay-the-princess) 2024-01-18
- [Slay the Spire Review 2025 (The Nocturnal Rambler)](http://thenocturnalrambler.blogspot.com/2025/07/slay-the-spire-review-2025.html) 2025-07
- [Gamebook Diaries – Combat Options for an Open-World Gamebook (Rand Roll)](https://www.randroll.com/gamebook-diaries-9/) 
- [Fabled Lands: A toolkit for open-world gamebook design (Dave Morris)](https://fabledlands.blogspot.com/2025/10/a-toolkit-for-open-world-gamebook-design.html) 2025-10-16
- [Solo RPG in 2026: The State of the Space (RoleForge)](https://roleforge.ai/blog/solo-rpg-2026-state-of-the-space/) 2026-04-19
- [Call of Cthulhu 7e Bonus and Penalty Dice (Roll20 forums)](https://app.roll20.net/forum/post/1362863/call-of-cthulhu-7e-bonus-and-penalty-dice) 
- [What is your opinion on enemy level scaling in RPGs? (ResetEra)](https://www.resetera.com/threads/what-is-your-opinion-on-enemy-level-scaling-in-rpgs.685996/) 
- [Pentiment: Building Obsidian's Pentiment, interview with Josh Sawyer (MMORPG.com)](https://www.mmorpg.com/interviews/the-rpg-files-building-obsidians-pentiment-interview-with-game-director-josh-sawyer-2000126821) 