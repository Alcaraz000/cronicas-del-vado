# ux-novela-visual

CONFIANZA: media-alta. Alta en: patrones de layout (ADV/NVL/libro/columna), elementos canónicos de UI de VN, preferencias de Ren'Py (leídas de la doc oficial), flujo de tirada de BG3 y sus críticas, etiquetas de riesgo de Citizen Sleeper, prácticas de guardado local (artículo de marzo 2026), guías de accesibilidad, soporte de AVIF/WebP, Vite 8 (marzo 2026) y tamaños de Motion (doc oficial: 34 kB / 4,6 kB + 15 kB). Media en: versión exacta de Zustand (un resultado indica 5.0.15 como última; no abrí la página de npm) y en la versión actual de Motion (no verifiqué el número de versión mayor de 2026; los tamaños sí). howler 2.2.4 sin releases desde ~2023 verificado por npm. No pude leer: la página de Fuwanovel (403), nongine.app (DNS) y la página de gamepressure sobre la UI de Disco Elysium (404); los detalles de Disco Elysium y Roadwarden provienen de resúmenes de búsqueda y conocimiento previo. Los presupuestos de KB por asset y las tablas de resolución son estimaciones de ingeniería derivadas de las fuentes (calidad 60-75 AVIF, 20-30 % menos que WebP), no cifras medidas. Un resultado de búsqueda afirmaba que 8 GB de VRAM son insuficientes para SDXL; eso contradice la experiencia común (SDXL en fp16 corre en 8 GB con VAE/offload) y queda fuera de mi alcance: que lo confirme el investigador de arte. No verifiqué el estado de mantenimiento de Recoil en 2026 (lo marco como sin mantenimiento por conocimiento previo).

## Resumen
Para un juego de rol narrativo en navegador que se sienta como novela visual rejugable, la investigación converge en un layout híbrido "cinematográfico + libro": fondo 16:9 a pantalla completa con degradado oscuro, y una columna de texto lateral (derecha, ~38-42 % del ancho en escritorio; inferior en móvil) que acumula el texto con scroll continuo al estilo Disco Elysium/Roadwarden. Eso resuelve gratis el backlog, permite 4+ opciones sin tapar la ilustración y encaja con un juego de mucha lectura (30-60 min). El retrato del hablante va dentro de la columna (estilo "side image"), no como sprite gigante sobre el fondo, lo que reduce drásticamente el arte que hay que generar.

Las opciones deben mostrar el atributo/rasgo implicado y una etiqueta cualitativa de riesgo (Seguro/Arriesgado/Peligroso, como Citizen Sleeper), con porcentaje exacto opcional (Disco Elysium lo muestra; BG3 muestra el DC). La tirada se resuelve inline, en 2D con CSS/Motion: se muestra el objetivo, gira el d20 (~0,7 s), luego "vuelan" los modificadores con su origen (clase, rasgo, objeto, estado) y aparece el total. Siempre saltable con clic y respetando prefers-reduced-motion; evitar la pantalla completa modal de BG3.

Stack verificado a 2026: Vite 8 (marzo 2026, Rolldown), Zustand 5.0.x con middleware persist en localStorage (guardados < 1 MB) más exportar/importar JSON, Motion con `m` + `LazyMotion` (~4,6 kB + 15 kB), howler.js 2.2.4 (estable pero sin releases desde 2023; aceptable) y vite-imagetools para generar AVIF + WebP en build. Assets: fondos 1920×1080 AVIF (100-200 KB), retratos 3:4 a 768×1024 (30-60 KB), iconos SVG, precarga de la escena siguiente y carga perezosa por campaña con `import()` dinámico.

## Hallazgos
## 1. Layouts de novela visual y juegos narrativos

**Vocabulario estándar (VNDev Wiki, Fuwanovel):**
- **ADV** (Adventure): fondo completo + sprites/retratos + caja de texto inferior (2-4 líneas). Es el arquetipo "anime VN". Ventaja: máxima presencia del arte. Desventaja: poco texto por pantalla, muchos clics, las opciones se apilan centradas tapando el arte, y exige sprites de cuerpo entero con múltiples poses/expresiones (mucho arte).
- **NVL** (Novel): texto a pantalla completa sobre el fondo oscurecido. Mucho texto por pantalla; el arte queda de fondo. Tendencia observada: sin botones en pantalla, todo en un menú de pausa.
- **Elementos canónicos de la caja de texto**: name plate (nombre del hablante, arriba a la izquierda), side image (retrato cabeza/hombros dentro o junto a la caja, muy usado para el narrador/pensamientos), indicador click-to-continue (CTC), botones rápidos (Saltar, Auto, Historial, Guardar, Opciones) y menú principal (Continuar, Nueva, Cargar, Opciones, Extras).
- **Menú de guardado**: con nombre de capítulo, fecha/hora y miniatura para reconocer la partida.

**Estilo "libro" con ilustración lateral (Roadwarden):** tres paneles: ilustración/mapa a la izquierda, columna de texto con opciones clicables en el centro-derecha, y una franja de estado (día, vitalidad, armadura…) al borde derecho. Roadwarden es texto-pesado con arte estático y el layout se sostiene 10+ horas de lectura.

**Estilo "tablero + tarjetas" (Citizen Sleeper):** la escena es una ilustración con "acciones" como tarjetas donde se colocan dados; el diálogo se abre como panel lateral con retrato grande. Muy legible, pero es un juego de gestión, no de escena a escena.

**Disco Elysium:** columna de diálogo a la derecha con texto acumulativo (scroll continuo = historial natural), nombre del hablante coloreado, y las opciones al final del hilo. Los checks muestran nombre de la habilidad, etiqueta de dificultad (Trivial… Imposible) y porcentaje; blancos (reintentables) vs rojos (una sola vez). Al pasar el cursor se ven los modificadores que afectan la tirada.

**Conclusión de layout para este proyecto:** híbrido. Fondo 16:9 a pantalla completa (la "ilustración") + columna derecha semiopaca con texto acumulativo, retrato del hablante como side image de 3:4 dentro de la columna, opciones al pie. Esto evita generar sprites de cuerpo entero con poses (solo retratos), soporta 4+ opciones con texto largo y da backlog gratis. En móvil (bonus) la columna pasa a ser una hoja inferior que ocupa el 55-60 % de la altura, con el fondo arriba.

## 2. Presentación de 4+ opciones y de la probabilidad

Tres escuelas verificadas:
- **Disco Elysium**: muestra habilidad + dificultad textual + % exacto; los modificadores se explican al hover. Transparencia total. Riesgo: el jugador "juega al número".
- **Citizen Sleeper 2**: cada acción se etiqueta Segura / Arriesgada / Peligrosa según qué resultados causan daño; muestra el modificador de habilidad (+1/-1) y las probabilidades de cada resultado junto al dado antes de confirmar. El diseñador lo justifica: "si toda acción es aleatoria en el momento de elegirla, se elimina la estrategia".
- **Baldur's Gate 3**: no muestra % previo; muestra el **DC** (número objetivo) y luego los bonos se suman visiblemente después de rodar el d20. Críticas verificadas: pantalla completa modal con animación de entrada no saltable, modificadores escondidos tras un botón, demasiados clics.

**Patrón recomendado por opción** (fila vertical, numeradas 1-4+ para teclado):
- Texto de la opción (verbo primero: "Intimidar al guardia").
- Chip con el atributo/rasgo/objeto que la potencia (icono + nombre), con signo si perjudica ("Herido −2").
- Etiqueta de riesgo cualitativa (Seguro/Arriesgado/Peligroso) coloreada **y con icono** (no depender solo del color).
- Porcentaje exacto como preferencia "Mostrar probabilidades" (activada por defecto; el jugador que quiera misterio la apaga).
- Opciones sin tirada (narrativas) sin chip; opciones bloqueadas por requisito visibles pero deshabilitadas con el motivo ("Requiere: Ganzúas"), patrón común en CRPG que refuerza la rejugabilidad.
- Marca sutil "ya elegida en una partida anterior" (equivalente al "seen" de Ren'Py) para guiar la rejugada.

## 3. Animación y feedback de dados en 2D

Secuencia que funciona (derivada de BG3 y de las críticas a BG3):
1. Al elegir, aparece **inline en la columna** (no modal) un bloque de tirada con el objetivo ("Dificultad 14").
2. El d20 (SVG) gira/tiembla con números cambiando ~600-900 ms.
3. Los modificadores "vuelan" uno a uno con etiqueta de origen (+2 Guerrero, +1 Rasgo Terco, −2 Herido, +1 Decisión previa). Esto es lo que hace sentir que "tu build ganó la tirada".
4. Total vs objetivo → sello Éxito / Fallo / Crítico; 20 natural y 1 natural con feedback especial.
5. **Cualquier clic/tecla salta al resultado final**; con `prefers-reduced-motion` se muestra el resultado directamente.

**Implementación:** no hace falta librería de dados. Motion (`m` + `LazyMotion` con `domAnimation`) o puro CSS `@keyframes` + Web Animations API cubre esto. Alternativas descartadas: `@3d-dice/dice-box` (3D, motor de físicas pesado, innecesario), `react-dice-complete` y `react-dice-roll` (pequeños, poco mantenidos, solo d6 en cubo 3D CSS; no dan d20 ni el flujo de modificadores).

## 4. Backlog, velocidad de texto, autoavance, saltar leído

Referencia Ren'Py (documentación de preferencias, verificada):
- `text_cps` (caracteres por segundo; 0 = instantáneo; valores típicos 30-60).
- `afm_time` (retardo de autoavance; escala con la longitud del texto), `afm_enable`, `afm_after_click`.
- `skip_unseen = False` por defecto: el salto solo avanza texto **ya leído**; `skip_after_choices = False`: el salto se detiene en cada decisión. Existe salto "normal" (muestra cada pantalla) y "rápido" (no muestra nada hasta un punto de parada).
- Rollback e historial: pantalla de historial con hablante + texto.

**Aplicación:** con la columna de texto acumulativa el historial de la partida ya es visible con scroll; agregar pantalla "Historial" solo si se decide vaciar la columna entre escenas. Efecto máquina de escribir por párrafo (no por escena) con cps configurable, "instantáneo" como opción, y **primer clic = mostrar todo, segundo clic = avanzar**. "Saltar leído": registro global (no por partida) de ids de nodos vistos por campaña; el botón acelera hasta el primer nodo no visto o la siguiente decisión, y se detiene siempre en decisiones y tiradas. Componentes de typewriter con soporte de reduced-motion existen (SmoothUI, motion-components); el `Typewriter` oficial de Motion es de pago (Motion+), así que conviene un hook propio de ~40 líneas.

## 5. Ficha y creación de personaje en pocos pasos

Patrón de 4 pasos con barra de progreso y "volver": (1) nombre + retrato elegido de una galería de retratos IA (con filtro por género/edad) → (2) clase, 4 tarjetas con arte y 2 líneas de qué tiradas potencia → (3) rasgos: elegir 2 de 6, cada uno con pro y contra narrativo → (4) resumen con la ficha completa y botón "Crear". Ficha en juego: cajón lateral (tecla C) con atributos, habilidades, objetos, estados/secuelas, XP y nivel, y una sección "Recuerdos" (lugares y personajes conocidos por campaña) que hace visible el sistema de memoria. Citizen Sleeper demuestra que un sistema de mejora de "puntos → habilidad discreta" sin árbol es suficiente para un juego narrativo.

## 6. Hub de campañas con dificultad visible

Tarjetas con portada 3:4, título, dificultad (1-5 calaveras) + "nivel sugerido", duración estimada, icono de advertencia si hay muerte permanente posible, contador de partidas jugadas / finales vistos (p. ej. "2 de 5 finales"), y estado (Nueva / En curso / Completada). Si hay partida en curso, botón "Continuar" prominente; si no, "Comenzar". Bloquear la campaña por nivel no es necesario: alcanza con una confirmación "Tu personaje está por debajo del nivel sugerido".

## 7. Guardado local

Verificado (Bugnet, marzo 2026): localStorage para guardados < 1 MB (límite 5-10 MB por origen), IndexedDB (via `idb-keyval`, ~600 B) para más; siempre versión en cada guardado + migración incremental; try/catch y manejo de `QuotaExceededError`; autosave en `visibilitychange` y `beforeunload` (síncrono → localStorage); `navigator.storage.persist()` para reducir riesgo de desalojo; **exportar/importar como archivo JSON es obligatorio** porque el navegador puede borrar datos.

**Modelo de datos sugerido:** `profile` (personaje, memoria entre campañas, nodos vistos, preferencias) y `run` (partida en curso: campaña, nodo actual, estado de escena, semilla de tiradas, flags). Autosave único por partida al entrar en cada nodo; sin ranuras de partida (rejugable y corta), pero 2-3 ranuras de **perfil/personaje** son baratas. Zustand `persist` sobre localStorage cubre todo esto sin código extra.

## 8. Accesibilidad (Game Accessibility Guidelines + WCAG 2.1 AA)

Básico: fuente legible por defecto (≥16 px, ideal 18-20 px para lectura larga), contraste ≥ 4,5:1 texto y 3:1 UI, avanzar texto al propio ritmo, lenguaje claro, controles remapeables. Intermedio: redimensionar interfaz (fuente 100/125/150 %), elección de alto contraste, opción de ocultar movimiento de fondo, guardado manual. Teclado: 1-9 eligen opción, Enter/Espacio avanza, H historial, C ficha, Esc menú; foco visible; `prefers-reduced-motion` respetado; resultados de tirada con texto e icono, no solo color. La EAA (junio 2025) empuja a WCAG 2.1 AA en la UE; para un sitio hobby es buena práctica más que obligación. Ancho de línea 60-75 caracteres en la columna de texto.

## 9. Rendimiento y carga de imágenes en sitio estático

- **Formatos:** AVIF soportado en todos los navegadores mayores desde enero 2024 (Chrome 85+, Firefox 93+, Safari 16+, Edge 121+), ~93-95 % de uso global; 20-30 % más chico que WebP a igual calidad. Servir `<picture>` con AVIF + fallback WebP. Precaución: AVIF puede introducir banding en degradados suaves a calidad baja (relevante para arte pintado); calidad 60-75 en AVIF suele bastar; decodificación más lenta que WebP en imágenes grandes.
- **Build:** Vite 8 (12 marzo 2026, bundler Rolldown). `vite-imagetools` (sharp) genera variantes de formato/tamaño por import; `vite-plugin-image-optimizer` recomprime lo que hay en `public/`.
- **Carga:** cada campaña en su propio chunk (`import('./campaigns/x')`) con manifiesto de assets; al entrar a un nodo, precargar imágenes de los nodos hijos (`new Image().decode()` o `<link rel="preload">`); `loading="lazy"` para galerías (hub, retratos de creación); `fetchpriority="high"` para el fondo actual. Mostrar el fondo con fundido cruzado solo cuando ya decodificó.
- **Presupuestos:** fondo 1920×1080 AVIF 100-200 KB (WebP 200-350 KB); retrato 768×1024 AVIF 30-60 KB; primera campaña completa 10-25 MB total; carga inicial (JS + UI + primera escena) < 1,5 MB.

## 10. Especificaciones de assets

| Asset | Relación | Máster (generación/upscale) | Exportado en juego | Miniatura | Peso objetivo |
|---|---|---|---|---|---|
| Fondo de lugar | 16:9 | 2560×1440 PNG (generar ~1344×768 y upscale 2×) | 1920×1080 AVIF+WebP; opcional 2560×1440 para pantallas 2K | 480×270 | 100-200 KB |
| Escena/CG específica | 16:9 | 2560×1440 | 1920×1080 | 480×270 | 100-250 KB |
| Retrato de personaje | 3:4 | 1536×2048 | 768×1024 | 192×256 (chips, log) | 30-60 KB |
| Retrato del jugador (galería) | 3:4 | igual | 768×1024 | 192×256 | 30-60 KB |
| Objeto / ítem | 1:1 | 1024×1024 con fondo transparente (PNG máster) | 256×256 WebP/AVIF con alfa | 64×64 | < 20 KB |
| Portada de campaña | 3:4 | 1536×2048 | 900×1200 | 300×400 | 80-150 KB |
| Fondo de la app / menú | 16:9 | 2560×1440 | 1920×1080 (oscurecido) | — | < 250 KB |
| Logo | libre | vectorizar o PNG 2048 de ancho | SVG o PNG 1024 | favicon 512/192/32 | < 100 KB |
| Iconos de UI | 1:1 | SVG (Lucide/propios) | SVG inline | — | — |
| Iconos de atributos/clases IA | 1:1 | 1024×1024 | 128×128 con alfa | — | < 10 KB |

Notas: la tradición VN pinta sprites a 2600-4000 px de alto y fondos a 4000×2250 para poder reencuadrar y luego reducir; con IA conviene el mismo principio: máster grande, exportar chico. Mantener los másteres PNG fuera del repo del sitio (o en LFS). Retratos siempre con el mismo encuadre (hombros arriba, mirada a cámara ligeramente a la izquierda) para coherencia en la columna. Dejar 5-10 % de margen ("bleed") en fondos si se quiere Ken Burns suave.

## 11. Librerías React (estado a 2026)

- **Estado:** Zustand 5.0.x (v5 exige React ≥18, usa `useSyncExternalStore` nativo; última vista 5.0.15; ~2,9 kB; middleware `persist`) = default recomendado. Jotai 2.x (~3,3 kB) si se prefiere estado atómico; innecesario aquí. Evitar Redux Toolkit (11 kB, boilerplate), Recoil (sin mantenimiento) y Context como store global (re-renders).
- **Animación:** Motion (ex Framer Motion, motion.dev): `motion` completo ~34 kB; `m` + `LazyMotion` ~4,6 kB inicial + `domAnimation` 15 kB. Suficiente para fundidos de escena, entrada de opciones y dados. Alternativas: CSS puro + View Transitions (0 kB) para fundidos; AutoAnimate (~3 kB) para listas. Evitar GSAP (78 kB, orientado a timelines complejas), react-spring (solapa con Motion), React Transition Group (sin mantenimiento).
- **Audio:** howler 2.2.4 (última publicación hace ~3 años; 7 kB; Web Audio con fallback HTML5; sprites de audio). Sigue funcionando y es el estándar de facto; alternativa aún más simple: un wrapper propio de `HTMLAudioElement` para música + Web Audio para SFX. Evitar Tone.js (síntesis, sobredimensionado).
- **Persistencia:** `persist` de Zustand sobre localStorage; `idb-keyval` solo si se superan ~1 MB.
- **Imágenes:** `vite-imagetools`.
- **Routing:** no necesario (máquina de estados de pantallas); si se quiere URL por pantalla, `wouter` (~2 kB).
- **UI:** CSS Modules o Tailwind v4; evitar librerías de componentes pesadas (MUI/Chakra) que pelean con la estética pintada.
- **Evitar:** motores de VN para web (embeben su propia UI), Phaser/Pixi (canvas innecesario para UI DOM), i18n runtime ahora (solo estructurar textos por id).

## Recomendaciones
- **Layout híbrido: fondo 16:9 a pantalla completa + columna de texto acumulativa a la derecha con retrato (side image) y opciones al pie** | PROS: Backlog gratis por scroll; soporta 4+ opciones largas sin tapar el arte; solo requiere retratos 3:4 (no sprites con poses); patrón probado en Disco Elysium y Roadwarden; se adapta a móvil como hoja inferior | CONTRAS: Menos 'anime VN' que el ADV clásico; hay que cuidar el ancho de línea (60-75 caracteres) y la opacidad del panel para que el fondo se vea | VEREDICTO: recomendada: maximiza lectura y rejugabilidad con el mínimo de arte generado
- **Layout ADV clásico (caja de texto inferior + sprites de cuerpo entero)** | PROS: Máxima presencia del arte; es lo que la gente reconoce como novela visual | CONTRAS: 2-4 líneas por clic (muchos clics en 30-60 min), opciones apiladas en el centro tapan el arte, exige sprites con múltiples poses y expresiones, y no tiene historial visible | VEREDICTO: descartada: multiplica el arte y castiga un juego de mucho texto y 4+ opciones
- **Opciones con chip de atributo + etiqueta de riesgo cualitativa (Seguro/Arriesgado/Peligroso) y porcentaje exacto como preferencia activada por defecto** | PROS: Combina lo mejor de Citizen Sleeper (riesgo legible) y Disco Elysium (transparencia); el jugador entiende por qué su personaje es bueno o malo en algo; permite jugar 'a ciegas' apagando el % | CONTRAS: Requiere calcular la probabilidad real (tabla d20 vs objetivo con modificadores) y mantenerla coherente con el motor | VEREDICTO: recomendada: refuerza la decisión informada exigida por la dificultad de campañas
- **Tirada inline en 2D: objetivo → d20 SVG girando (~0,7 s) → modificadores que vuelan con su origen → total y sello; saltable con clic; reduced-motion muestra el resultado directo** | PROS: Sensación tipo BG3 sin sus críticas (sin modal a pantalla completa ni animación no saltable); explica el sistema de rasgos/objetos/estados; se hace con CSS o Motion m+LazyMotion | CONTRAS: Hay que diseñar el SVG del d20 y ~40 líneas de lógica de secuencia; nada listo para usar | VEREDICTO: recomendada: feedback de dados con máximo valor narrativo y mínimo peso
- **Librerías de dados 3D (@3d-dice/dice-box, react-3d-dice)** | PROS: Muy vistosas, físicas reales | CONTRAS: Motor 3D pesado, incompatibles con la estética pintada 2D, difíciles de hacer saltables y accesibles | VEREDICTO: descartada: YAGNI
- **Zustand 5.0.x + middleware persist (localStorage) para perfil/personaje/memoria/preferencias y partida en curso; exportar/importar JSON; versión + migración en cada guardado** | PROS: ~3 kB, sin boilerplate, default de la comunidad en 2026; los guardados de este juego son < 1 MB; export/import protege contra borrado del navegador | CONTRAS: localStorage es síncrono y limitado a 5-10 MB; si algún día se guardan miniaturas o mucha memoria, migrar a idb-keyval | VEREDICTO: recomendada: el guardado más simple que cumple todos los requisitos
- **Jotai (estado atómico)** | PROS: Similar tamaño, buen soporte de estado derivado | CONTRAS: El estado del juego es un objeto grande y coherente (personaje, partida, preferencias), no cientos de átomos independientes; menos ejemplos de persist | VEREDICTO: alternativa: válida, pero no aporta nada frente a Zustand aquí
- **Motion (motion.dev) con `m` + `LazyMotion` + `domAnimation` para fundidos de escena, entrada de opciones y dados** | PROS: ~4,6 kB inicial + 15 kB de features; AnimatePresence para transiciones de escena; la librería de animación más usada en React en 2026 | CONTRAS: Su componente Typewriter es de pago (Motion+): el efecto máquina de escribir hay que hacerlo con un hook propio | VEREDICTO: recomendada: usar la variante ligera; complementar con CSS/View Transitions para fundidos simples
- **GSAP / react-spring / React Transition Group** | PROS: GSAP es muy potente y ahora gratuito; react-spring tiene físicas agradables | CONTRAS: GSAP 78 kB y orientado a timelines complejas; react-spring solapa con Motion; React Transition Group ya no se mantiene | VEREDICTO: descartada: peso o mantenimiento sin beneficio para este alcance
- **howler.js 2.2.4 para música ambiental y efectos (con sprites de audio)** | PROS: 7 kB, Web Audio con fallback, maneja el desbloqueo de audio en móvil, tipos actualizados en @types/howler | CONTRAS: Sin releases desde ~2023 (estable, pero sin mantenimiento activo) | VEREDICTO: recomendada: sigue siendo la opción práctica; si preocupa el mantenimiento, un wrapper propio de HTMLAudioElement + Web Audio para SFX es viable
- **Tone.js para audio** | PROS: Scheduling musical avanzado | CONTRAS: Orientado a síntesis/instrumentos; sobredimensionado para reproducir loops y SFX | VEREDICTO: descartada
- **Imágenes AVIF (calidad 60-75) con fallback WebP vía <picture>, generadas en build con vite-imagetools; fondos 1920×1080, retratos 768×1024 (3:4), objetos 256×256 con alfa, iconos SVG; precarga de nodos hijos y chunk por campaña con import() dinámico** | PROS: AVIF soportado en todos los navegadores mayores desde 2024 y 20-30 % más chico que WebP; presupuestos realistas para GitHub Pages/Netlify; cada campaña nueva no infla la carga inicial | CONTRAS: AVIF puede generar banding en degradados pintados a calidad baja (revisar 'con los ojos' y subir calidad si hace falta); mantener másteres PNG grandes fuera del repo | VEREDICTO: recomendada: pipeline estándar de sitio estático en 2026
- **Creación de personaje en 4 pasos (retrato+nombre → clase en 4 tarjetas → 2 de 6 rasgos → resumen) y ficha en cajón lateral (tecla C) con sección 'Recuerdos'** | PROS: Pocos pasos, cada elección muestra qué tiradas potencia; la sección de recuerdos hace visible la memoria entre campañas | CONTRAS: Requiere una galería inicial de ~12-16 retratos IA de jugador coherentes en encuadre | VEREDICTO: recomendada
- **Hub de campañas con tarjetas 3:4: dificultad en calaveras + nivel sugerido, duración, icono de muerte permanente, finales vistos/partidas jugadas, botón Continuar/Comenzar y aviso (no bloqueo) si el nivel es bajo** | PROS: Hace 'elegir con cabeza' una decisión informada y muestra la rejugabilidad como progreso | CONTRAS: Ninguno relevante; solo necesita metadatos por campaña | VEREDICTO: recomendada
- **Accesibilidad mínima: fuente base 18-20 px con 100/125/150 %, contraste 4,5:1, teclado completo (1-9 opciones, Enter avanza, H historial, C ficha, Esc menú), foco visible, prefers-reduced-motion, resultados con icono+texto, cps configurable con 'instantáneo', autoavance y 'saltar leído' que se detiene en decisiones** | PROS: Cubre las guías básicas e intermedias de Game Accessibility Guidelines y WCAG AA con poco esfuerzo; el teclado además acelera la rejugada | CONTRAS: Lector de pantalla completo (aria-live bien afinado) queda para después | VEREDICTO: recomendada

## Fuentes
- [Graphical User Interface – VNDev Wiki](https://vndev.wiki/Graphical_User_Interface) 
- [UI Design – An Anatomy Of Visual Novels (Fuwanovel)](https://forums.fuwanovel.moe/blogs/entry/4226-ui-design-%E2%80%93-an-anatomy-of-visual-novels/) 
- [Preference Variables — Ren'Py Documentation](https://www.renpy.org/doc/html/preferences.html) 
- [Baldur's Gate III's New Dice-Rolling Interface Truly Captures the Feeling of D&D Ability Checks](https://gamingrespawn.com/features/54148/baldurs-gate-iiis-new-dice-rolling-interface-truly-captures-the-feeling-of-dd-ability-checks/) 
- [For the love of god let me skip the dice rolling animations (críticas a la UI de BG3)](https://lemmy.world/post/2894095) 
- [Case study: Citizen Sleeper – How to Make an RPG](https://howtomakeanrpg.com/r/a/case-study-citizen-sleeper.html) 
- [Everything You Need To Know About The Dice Mechanic In Citizen Sleeper 2](https://www.thegamer.com/citizen-sleeper-2-starward-vector-dice-complete-guide/) 
- [Disco Elysium: Dialogs – gamepressure](https://www.gamepressure.com/disco-elysium/dialogs/z6e3e9) 
- [Game UI Database – Disco Elysium](https://www.gameuidatabase.com/gameData.php?id=374) 
- [Roadwarden – Wikipedia (layout de tres paneles)](https://en.wikipedia.org/wiki/Roadwarden) 
- [Game Save Best Practices for Web Games – Bugnet](https://bugnet.io/blog/game-save-best-practices-web) 2026-03-31
- [Full list – Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/) 
- [Game Accessibility Guidelines and Standards: WCAG, XAGs, and Legal Requirements](https://www.abratabia.com/game-accessibility/accessibility-guidelines.php) 
- [Modern Image Formats: WebP vs AVIF and its browser support – RUMvision](https://www.rumvision.com/blog/modern-image-formats-webp-avif-browser-support/) 
- [AVIF vs WebP: Which Image Format Should You Use in 2026? – Compresto](https://compresto.app/blog/avif-vs-webp) 
- [Squoosh: The Complete Guide to Browser-Based Image Optimization](https://meshworld.in/blog/web-dev/squoosh-image-optimization-guide/) 
- [Vite 8.0 is out!](https://vite.dev/blog/announcing-vite8) 2026-03-12
- [vite-imagetools – npm](https://www.npmjs.com/package/vite-imagetools) 
- [vite-plugin-image-optimizer – GitHub](https://github.com/FatehAK/vite-plugin-image-optimizer) 
- [Visual Novel Basic Art Tutorial: canvas size for sprites, backgrounds, CGs – Pitch Black Serenade](https://pitchblackserenade.wordpress.com/visual-novel-basic-art-tutorial-canvas-size-for-sprites-backgrounds-cgs/) 
- [Zustand vs Jotai vs Nano Stores 2026 — PkgPulse](https://www.pkgpulse.com/guides/zustand-vs-jotai-vs-nanostores-micro-state-management-2026) 2026-03-09
- [Announcing Zustand v5 – Poimandres](https://pmnd.rs/blog/announcing-zustand-v5/) 
- [zustand – npm](https://www.npmjs.com/package/zustand) 
- [Reduce bundle size of Framer Motion | Motion for React](https://motion.dev/docs/react-reduce-bundle-size) 
- [Typewriter effect & typing animations | Motion for React (Motion+)](https://motion.dev/docs/react-typewriter) 
- [Comparing the best React animation libraries for 2026 – LogRocket](https://blog.logrocket.com/best-react-animation-libraries/) 2026-01-22
- [howler – npm](https://www.npmjs.com/package/howler) 
- [Tone.js vs Howler.js: Which Should You Use? (2026)](https://supadark.com/notes/tone-js-vs-howler-js) 
- [Browser Storage in 2026: localForage vs js-cookie vs idb-keyval – Pi Stack](https://www.pistack.xyz/posts/2026-08-20-browser-storage-libraries-localforage-js-cookie-idb-keyval-comparison/) 2026-08-20
- [Typewriter Text | SmoothUI (respeta prefers-reduced-motion)](https://smoothui.dev/docs/components/typewriter-text) 
- [WCAG Technique C39: prefers-reduced-motion](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html) 