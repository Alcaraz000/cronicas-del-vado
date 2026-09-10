# motor-narrativo

CONFIANZA: media-alta. Verificado con fuentes primarias: versiones y fechas de inkjs (2.4.0, feb 2025) e ink (1.2.1, may 2024), licencias MIT de inkjs/ink/Narrat/Monogatari, ausencia de runtime JS en el roadmap 2026 de Yarn Spinner, contenido de la spec JSON de Twine, arquitectura Vue de Narrat y web components/TS de Monogatari, y los artículos de diseño (Ashwell, Short, Choice of Games, Roadwarden, Disco Elysium). NO pude verificar: tamaño minificado/gzip de inkjs (bundlephobia no cargó) ni de zod; fecha exacta de la última publicación de yarn-bound (npm devolvió 403; el buscador dice "hace 2 años"); estado de mantenimiento de RenJS-V2 en 2025-2026; número de versión exacto de Narrat y Monogatari (solo actividad reciente del repo, jun 2026 para Monogatari). Tampoco confirmé si el compilador de ink marca knots huérfanos (asumo que no). La cita "Yarn Spinner 3.1 dic 2025" proviene del blog oficial pero refiere a Unity, no a web.

## Resumen
Para una novela visual rejugable estática en React + TypeScript, escrita masivamente con ayuda de IA, la opción que mejor equilibra tipado, validación, integración con React, dados con modificadores y campañas cargables por separado es un **esquema propio de escenas en JSON/TypeScript validado con zod y un "linter de grafo" en build time**, complementado con un patrón narrativo de "rama y cuello de botella" (branch-and-bottleneck) con hubs y memoria por codewords/flags + unos pocos stats numéricos.

Ink + inkjs (v2.4.0, feb 2025, MIT; ink 1.2.1, may 2024) es la alternativa seria: lenguaje maduro, compilador que detecta diverts rotos y variables no declaradas, RANDOM(), funciones EXTERNAL, contadores de visitas y estado serializable (ToJson/LoadJson), y cada campaña compilada es un JSON que se puede cargar con lazy loading. Sus desventajas para este proyecto: la sintaxis es fácil de romper para una IA en generación masiva (glue, espacios, reglas de choices), el estado del personaje persistente vive fuera de la historia y hay que sincronizarlo por funciones externas, y la validación semántica (flags de memoria entre campañas, escenas huérfanas, mínimo 4 opciones) exige herramientas propias igual.

Yarn Spinner no tiene runtime web oficial en 2026 (el port comunitario yarn-bound lleva ~2 años sin publicar), Twine exporta texto crudo de pasajes sin estructura de variables, y los motores de novela visual (Monogatari, Narrat, RenJS) imponen su propio front (web components, Vue, Phaser) y no encajan en React. Se descartan.

Recomendación: datos propios + zod + validación de grafo, con campañas como módulos `import()` dinámicos.

## Hallazgos
## 1. Opciones de representación/ejecución de la narrativa

### (a) Ink (inkle) + inkjs
- **Versiones verificadas**: inkjs **2.4.0** (17 feb 2025, última release en GitHub); ink **1.2.1** (5 may 2024, última release de inkle; ninguna en 2025-2026). inkjs 2.3.0 declaró paridad con ink 1.2.0. Licencia **MIT** en ambos.
- **Build**: `inkjs` (runtime ES2015+), `inkjs/dist/ink.js` (transpilado), `inkjs/full` (runtime + compilador). Recomendado: compilar con `inklecate` (o el compilador de inkjs) en build time y enviar al navegador solo el runtime + el JSON de la historia. Tamaño minificado/gzip: **no verificado** (bundlephobia no respondió).
- **TypeScript**: tipos incluidos (`Story`, `Compiler`, `InkList`).
- **Memoria/estado**: `VAR` globales, temporales, condicionales `{cond: a | b}`, `LIST` (conjuntos de estados, ideal para "conoce a X", "estuvo en Y"), **contadores de visita** por knot/stitch (`{visto_taberna > 0}`), `TURNS_SINCE(-> knot)`, tags `#` para metadatos (imagen, música, retrato), `INCLUDE` para partir archivos.
- **Dados**: `RANDOM(min,max)` nativo; hay librerías comunitarias ("dice functions for ink"). Modificadores complejos (clase, rasgos, objetos del personaje persistente) se hacen mejor con funciones `EXTERNAL` implementadas en TS, con fallback en ink.
- **Validación estática**: el compilador falla ante diverts a knots inexistentes y variables no declaradas. **No** detecta knots huérfanos ni reglas de negocio (mínimo 4 opciones, flags de memoria cross-campaña). Diferencias inkjs vs inklecate documentadas (manejo de INCLUDE por JSON handler; nombres de clases ofuscados en minificado).
- **React**: no hay binding oficial; se envuelve `story.Continue()` / `story.currentChoices` / `ChooseChoiceIndex()` en un hook. Es sencillo pero el flujo "línea a línea" de ink no mapea 1:1 con "una escena = un objeto".
- **Lazy loading**: cada campaña = un `.ink` compilado a JSON, cargable con `fetch`/`import()` dinámico. El estado persistente del personaje entre campañas hay que pasarlo con `story.variablesState` o funciones externas al iniciar.
- **Curva/IA**: Claude conoce bien ink, pero la sintaxis tiene trampas (glue `<>`, saltos de línea, choices `*` vs `+`, sticky, gathers) y un error de compilación en un archivo de 5.000 líneas generado por IA es costoso de localizar. Herramienta Inky (editor) ayuda a probar.

### (b) Yarn Spinner
- Core 3.1 (dic 2025) es C#/Unity; roadmap 2026: Unreal, Godot, extensión VS Code reescrita, "Try Yarn Spinner" web. El post "Yarn Spinner in 2026" **no menciona runtime JavaScript**.
- Ports JS comunitarios: `yarn-bound` 0.5.5 (wrapper sobre bondage.js, publicado hace ~2 años según npm), "Yarn Spinner Javascript Library" (parser básico). Sin garantía de soportar Yarn 2/3.
- Licencia core MIT; add-ons pagos.
- Veredicto: es un lenguaje de diálogos para motores de juego, no para web estática. Descartado.

### (c) Twine / SugarCube / Harlowe exportando datos
- La spec oficial "Twine 2 JSON Output" solo define `name`, `tags`, `text`, `metadata` por pasaje: **los enlaces, variables y condiciones quedan como texto crudo** en el markup del formato (SugarCube `<<if>>`, Harlowe `(if:)`). Habría que escribir un parser propio.
- Exportadores JSON (Twison, TwineJson, twison2) son formatos de historia comunitarios, poco mantenidos.
- Puede servir como **editor visual** del grafo para un humano, pero no como formato de datos tipado para React. Descartado como runtime.

### (d) Esquema propio JSON/TypeScript + zod
- Cada campaña es un módulo TS (o JSON) con `scenes: Record<SceneId, Scene>`; cada `Scene` tiene `id`, `background`, `portraits`, `text` (con variantes condicionadas), `choices[]` (≥4), cada `Choice` con `requires` (condiciones sobre flags/stats/objetos), `roll?` (dado, dificultad, modificadores por rasgo/clase/estado), `outcomes` (éxito/fallo → `effects` + `next`).
- **Validación estática**: zod valida forma; un script `npm run lint:campaign` valida semántica: todos los `next` existen, no hay escenas inalcanzables desde `start`, todos los flags leídos están declarados en un catálogo (`flags.ts` con `as const`), mínimo 4 opciones, cada final marcado, ciclos permitidos solo en hubs. Con TypeScript literal types (`SceneId` como union), muchos errores los marca el editor antes de correr nada.
- **Generación por IA**: JSON con schema es lo que mejor se lleva con salidas estructuradas (structured outputs / zod en 2025-2026 en todos los proveedores). Claude puede generar escenas en lotes y el linter rechaza lo que no encaje; el error señala la escena exacta.
- **React**: mapeo directo `Scene → <SceneView>`; imágenes por id de asset resueltas por un manifiesto (`import.meta.glob` de Vite).
- **Lazy loading**: `const campaigns = { primera: () => import('./campaigns/primera') }`; Vite hace chunks separados; los assets van con `?url` o carpeta pública.
- **Bundle**: el runtime propio son unas decenas de líneas (evaluar condiciones, aplicar efectos, tirar dados); zod ~ 13-15 KB gzip aprox. (cifra de memoria, no verificada en esta sesión; existe `zod/mini` para reducir).
- Costo: hay que escribir el evaluador de condiciones (mejor **datos declarativos** `{flag:'conoce_a_mira'}`, `{stat:'fuerza', gte:3}` que strings con expresiones) y texto condicional simple (variantes por flag). Sin DSL ni parser.

### (e) Motores de novela visual web
- **Monogatari** (`@monogatari/core`): TypeScript, web components, MIT, repo actualizado en junio 2026 (activo). Orientado a VN clásica (sprites, dialog box, save slots con screenshot, rollback). Tiene su propio DOM/UI; meterlo dentro de React es pelear contra dos dueños del DOM. Sin sistema de personaje/dados.
- **Narrat**: motor RPG narrativo en **Vue 3 + Pinia**, MIT, activo (CI, Node ≥22.17). Trae exactamente lo pedido (skill checks con dados, inventario, quests, variables, condiciones, save) pero en su propio lenguaje de script y su propio front Vue: adoptarlo implica abandonar React, no complementarlo.
- **RenJS-V2**: Phaser + YAML; no se encontró evidencia de releases recientes (no verificado el estado 2025-2026). Descartado.
- Conclusión: ninguno vale la pena dentro de React; su valor sería reemplazar el stack, contra la decisión 2.

## 2. Patrones de grafos de escenas para rejugabilidad

**Taxonomía de Sam Kabo Ashwell ("Standard Patterns in Choice-Based Games")**: Time Cave (explosión, poco estado), Gauntlet (lineal con podas), **Branch & Bottleneck** (ramas que reconvergen en eventos comunes + mucho estado; ej. Choice of Games, Long Live the Queen), Quest (módulos por geografía; Fighting Fantasy, 80 Days), Open Map, Sorting Hat, Floating Modules (storylets; Fallen London), Loop & Grow / Spoke & Hub.

**Choice of Games ("By the Numbers")**: con 2 opciones por página, 20 páginas = >1M de páginas; solución = **fusionar ramas agresivamente + delayed branching**: las decisiones tempranas no bifurcan, suben/bajan **stats numéricos** que se testean después. "No hay forma más simple de manejar ramificación diferida que números."

**Emily Short (QBN/storylets)**: storylet = contenido + prerrequisitos + efectos. Evita explosión (4 storylets de pistas en vez de 6 caminos ordenados) y permite añadir contenido después (DLC = campañas nuevas). Costo: contabilidad de qualities. Para campañas de 30-60 min y un solo autor, un **híbrido** es lo sensato: espina Branch & Bottleneck con 3-5 cuellos de botella, hubs (pueblo, taberna) donde las opciones se filtran por flags, y unos pocos "storylets" opcionales gateados por memoria.

**Roadwarden (Deep Dive, Game Developer)**: "miles de variables"; clasificación de decisiones en **Fluff** (cosmético, a veces citado después), **Spice** (puntos de amistad/stats), **Floodgates** (cierran opciones, reversibles con costo) y **Burnt Bridges** (irreversibles, afectan epílogo). Umbrales ocultos de confianza por NPC; reputación por aldea; aldeas como hubs con progresión introducción → desconfianza → misiones básicas → avanzadas; sistema "alambique": distintos aportes suman a un umbral. Admite que las aldeas se sienten iguales sin importar el orden: los hubs necesitan texto reactivo al orden de visita.

**Disco Elysium**: "micro-reactividad a escala industrial": cientos de pequeñas decisiones (afeitarse, el apodo) reflejadas en diálogos; costo real (428 cartas nuevas por 4 apodos). Lección: elegir pocos flags "baratos" que se citen mucho. Chequeos blancos (reintentables al subir stat) vs rojos (una sola vez); el fallo no bloquea, genera complicación.

**Citizen Sleeper**: dados **tirados por adelantado** cada ciclo y asignados a acciones (mitiga la crueldad del azar), **clocks** (relojes de progreso) tipo Blades in the Dark, "éxito con costo". Para este juego: mostrar el rango de resultados o dar "empujes" (rerolls con costo) hace que la tirada se sienta decisión y no lotería.

**Fallen London / Sunless Sea**: qualities visibles y ocultas; contenido libre gateado por qualities. **80 Days**: estructura Quest por geografía, cada elección cargada de contexto. **Wildermyth**: eventos modulares encadenados con módulos obligatorios fijos y rellenos variables entre hitos; rasgos de personaje seleccionan eventos. **Fabled Lands / Lone Wolf**: **codewords** (palabras neutras que se marcan/desmarcan, con prefijo por libro) como memoria portátil entre libros = el modelo exacto para memoria entre campañas; Lone Wolf muestra el antipatrón (20 párrafos iniciales reconstruyendo el inventario).

**Variables de estado vs ramas duras**: ramas duras para lo que cambia la escena completa (2-3 por cuello de botella); flags booleanos/codewords para memoria y texto condicional; stats numéricos para delayed branching y modificadores de dados. Regla práctica: si una decisión afecta >1 escena futura, es flag/stat, no rama.

## 3. Diseño concreto sugerido (sobre la opción d)
- `character.ts`: nivel, clase, rasgos, XP, secuelas, `codewords: Set<string>` **con prefijo de campaña** (`c1:salvo_a_mira`) + globales (`g:conoce_al_gremio`).
- Memoria en tres capas: `run` (flags de la partida), `campaign` (contadores de visitas/finales por campaña, persisten en localStorage), `global` (codewords del personaje). El texto de escena usa `variants: [{when: {...}, text}]` con fallback.
- Dificultad de campaña = nivel recomendado + lista de chequeos con CD; el linter puede calcular la CD máxima y avisar si supera lo alcanzable.
- Tiradas: `{ dice: 'd20', stat: 'astucia', dc: 14, mods: [{trait:'ladron', +2}, {flag:'herido', -2}] }`; resultado → `success | fail | crit` con `next` distinto. Muerte permanente = efecto explícito `permadeath: true` solo en escenas marcadas.
- Herramientas: script `validate` (zod + grafo: alcanzabilidad, huérfanas, flags declarados, ≥4 opciones, finales) y `graph` (exporta DOT/Mermaid para verlo). Tests con Vitest recorriendo todas las rutas con dados fijados.

## Recomendaciones
- **Esquema propio de escenas en JSON/TypeScript + zod + linter de grafo en build time** | PROS: Tipado completo (SceneId/flags como uniones literales), validación semántica a medida (ramas rotas, huérfanas, flags no declarados, mínimo 4 opciones, finales), mapeo directo a componentes React y a assets por id, dados con modificadores como datos declarativos, campañas como módulos import() con chunks separados en Vite, formato ideal para generación masiva por IA con salidas estructuradas, cero dependencias de runtime narrativo, i18n futura trivial (textos por id). | CONTRAS: Hay que escribir el evaluador de condiciones/efectos y el sistema de variantes de texto (pequeño pero propio); el JSON es más verboso que la prosa de ink para escribir a mano; sin editor visual (mitigable exportando el grafo a Mermaid/DOT). | VEREDICTO: recomendada: es la única opción donde el tipado, la validación, el estado persistente del personaje y la carga modular quedan bajo control total con muy poco código.
- **Ink + inkjs (compilar en build, cargar JSON por campaña)** | PROS: Lenguaje maduro y expresivo (contadores de visita, LIST, TURNS_SINCE, tags, RANDOM), compilador que detecta diverts rotos y variables no declaradas, inkjs 2.4.0 MIT con tipos TS, estado serializable, editor Inky para probar, Claude lo conoce bien. | CONTRAS: Sin release de ink desde may 2024 ni de inkjs desde feb 2025 (estable pero lento); sintaxis frágil para IA en volumen (glue, choices, gathers); el personaje persistente y los modificadores de dados viven fuera de la historia y se sincronizan por funciones EXTERNAL; el flujo línea a línea no mapea limpio a 'una escena'; escenas huérfanas y reglas del juego requieren tooling propio igual; tamaño de bundle no verificado. | VEREDICTO: alternativa: elegirla solo si el autor prefiere escribir prosa ramificada a mano en vez de generar datos estructurados.
- **Yarn Spinner (yarn-bound / ports JS)** | PROS: Buen lenguaje de diálogos, core MIT, muy activo en Unity/Unreal/Godot en 2026. | CONTRAS: No hay runtime web oficial; yarn-bound sin publicar hace ~2 años y probablemente atrasado respecto de Yarn 3; enfocado en diálogos, no en escenas con estado de RPG. | VEREDICTO: descartada: no existe soporte JS mantenido.
- **Twine (SugarCube/Harlowe) exportando JSON** | PROS: Editor visual del grafo, gratis, familiar. | CONTRAS: El JSON oficial solo trae texto crudo por pasaje; enlaces, variables y condiciones quedan en markup del formato y habría que parsearlos; exportadores comunitarios poco mantenidos; sin tipado. | VEREDICTO: descartada como formato de datos; a lo sumo, herramienta de bocetado visual.
- **Motores de VN web (Monogatari, Narrat, RenJS)** | PROS: Monogatari (TS, MIT, activo jun 2026) y Narrat (Vue, MIT, activo, con skill checks/inventario/quests) traen UI y features listas. | CONTRAS: Cada uno es dueño de su DOM/framework (web components, Vue, Phaser): embeberlos en React duplica renderers y pelea por el estado; sustituirían el stack en vez de integrarse; RenJS sin evidencia de actividad reciente. | VEREDICTO: descartada: contradicen la decisión de React y no aportan más que un evaluador de escenas propio de ~200 líneas.

## Fuentes
- [Releases · y-lohse/inkjs (v2.4.0)](https://github.com/y-lohse/inkjs/releases) 2025-02-17
- [inkjs README (licencia, builds, TypeScript)](https://github.com/y-lohse/inkjs) 2025
- [inkjs compiler-differences.md](https://github.com/y-lohse/inkjs/blob/master/docs/compiler-differences.md) 
- [Releases · inkle/ink (v1.2.1)](https://github.com/inkle/ink/releases) 2024-05-05
- [Writing With Ink (documentación del lenguaje)](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) 
- [Yarn Spinner in 2026](https://yarnspinner.dev/blog/yarn-spinner-in-2026) 2026
- [yarn-bound (npm)](https://www.npmjs.com/package/yarn-bound) 
- [Twine 2 JSON Output spec](https://github.com/iftechfoundation/twine-specs/blob/master/twine-2-jsonoutput-doc.md) 
- [Narrat engine (GitHub)](https://github.com/liana-p/narrat-engine) 
- [Narrat features](https://narrat.dev/features/) 
- [Monogatari (GitHub)](https://github.com/Monogatari/Monogatari) 2026-06
- [RenJS-V2 (GitHub)](https://github.com/lunafromthemoon/RenJS-V2) 
- [Standard Patterns in Choice-Based Games – Sam Kabo Ashwell](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/) 2015-01-26
- [Beyond Branching: Quality-Based, Salience-Based, and Waypoint Narrative Structures – Emily Short](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/) 2016-04-12
- [Storylets: You Want Them – Emily Short](https://emshort.blog/2019/11/29/storylets-you-want-them/) 2019-11-29
- [By the Numbers: How to Write a Long Interactive Novel That Doesn't Suck – Choice of Games](https://www.choiceofgames.com/2011/07/by-the-numbers-how-to-write-a-long-interactive-novel-that-doesnt-suck/) 2011-07
- [Deep Dive: How to design for impact and narrative variance with Roadwarden – Game Developer](https://www.gamedeveloper.com/design/deep-dive-roadwarden) 
- [Understanding the meaningless, micro-reactive, and marvellous writing of Disco Elysium – Game Developer](https://www.gamedeveloper.com/business/understanding-the-meaningless-micro-reactive-and-marvellous-writing-of-i-disco-elysium-i-) 
- [How Citizen Sleeper was inspired by tabletop RPGs and gig work – Game Developer](https://www.gamedeveloper.com/business/how-citizen-sleeper-was-inspired-by-tabletop-rpgs-and-gig-work) 
- [Attempted: Building a general-purpose QBN system – Bruno Dias](https://brunodias.dev/2017/05/30/an-ideal-qbn-system.html) 2017-05-30
- [Codewords in gamebooks – Lloyd of Gamebooks](http://www.lloydofgamebooks.com/2014/10/codewords-in-gamebooks.html) 2014-10
- [Wildermyth's Modular Storytelling Design](https://cjleo.com/blog/the-power-of-wildermyths-modular-storytelling-in-game-design/) 
- [GDC Vault – Ink: The Narrative Scripting Language Behind 80 Days and Sorcery!](https://gdcvault.com/play/1023221/Ink-The-Narrative-Scripting-Language) 
- [OpenAI Structured Outputs vs Zod (2026)](https://dev.to/whoffagents/openai-structured-outputs-vs-zod-which-to-use-for-llm-response-validation-in-2026-366m) 2026