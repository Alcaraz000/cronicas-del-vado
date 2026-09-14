# El escalado de la interfaz, y las dos pantallas que quedaron sin hacer

**Fecha:** 14 de septiembre de 2026
**Estado:** aprobado por Gabriel
**Motivo:** después de publicar el rediseño de novela visual, Gabriel lo abrió en su monitor de
1920×1080 y dijo que la interfaz se ve muy chica, las imágenes muy grandes y cortadas, y que hay que
scrollear mucho para leer y para recorrer las opciones. Y que el hub y la creación de personaje
"parecen hechos muy simple". Tiene razón en todo, y una parte es culpa de cómo verifiqué.

---

## 0. El diagnóstico, medido

Todo lo de esta sección está medido en el navegador sobre `main`, no estimado. La tabla completa
está en el informe de diagnóstico; acá van los números que deciden.

### 0.1 El error de método que lo dejó pasar

La fase anterior se verificó a **1280×800** y a **375×812**, y en las dos se ve bien. No se miró
ninguna pantalla grande. Peor: la verificación a 1280×800 se hizo sobre `a1_orell_mesa`, una escena
de 60 palabras y 4 opciones. Sobre una encrucijada real (`a1_taberna`: 10 líneas de prosa, 7
opciones) **el problema existe también a 1280×800**.

| A 1919×905 | |
|---|---|
| Líneas de prosa visibles | **3 de 10** |
| Opciones visibles | **3 de 7** |
| Dónde queda el scroll de la prosa | en el tope — **las 3 que se ven son las últimas 3** |
| Ancho que usa la prosa dentro de su caja | **39,5 %**; 1103 px muertos a la derecha |
| Ancho de una opción contra el de la prosa | **2,50×** |
| Cabeza del personaje | **283 px = 31,3 % del alto de la ventana**, 14,9× el cuerpo de texto |

Y a 1280×800, sobre la misma escena: **3 de 10 líneas y 2 de 7 opciones**. Con
`--escala-fuente: 1,5` en el monitor de Gabriel: **2 de 14 líneas y 2 de 7 opciones**.

### 0.2 La causa, en una frase

**Tres dimensiones gobiernan la pantalla y las tres son porcentajes del alto de la ventana**
—`.sprite { height: 80% }`, `.caja { height: 44% }`, `.acciones { max-height: 60% }`—; **la única
dimensión que gobierna lo que se lee, `--tam-texto-juego: 19px`, no lo es.** Ese es el desajuste
entero.

De 1280×800 a 1919×905 el sprite crece 84 px de alto, la caja crece 46 px y **la letra crece cero**.
Contra la diagonal de la pantalla, el texto es un **29 % más chico**. El jugador no compara la letra
con la caja: la compara con el monitor que tiene enfrente.

Y el mismo error se repite en el eje horizontal y contra la preferencia de accesibilidad:
`--ancho-columna-max` está en píxeles mientras la fuente escala, así que pedir letra grande
(`--escala-fuente: 1,5`) **angosta la medida de 82-85 a ~55 caracteres**. Es el mismo bug dos veces.

### 0.3 Lo que hace el género, investigado

Ren'Py no puede caer en esto porque tiene **una sola unidad**: escala texto, caja, sprites y fondo
con el factor `min(W/1920, H/1080)` y rellena el resto con barras. La proporción no cambia nunca y
el artista compone una sola vez.

| Ren'Py, sobre 1920×1080 | valor | nuestro valor |
|---|---|---|
| Alto de la caja | 278 px = **25,7 %** (constante en toda resolución) | 44 % |
| Medida de la línea de diálogo | **~67 caracteres** | 82-85 (y ~55 a escala 1,5) — ver la nota |
| Ancho de la columna de diálogo | 1116 px = **58,1 %**, centrada, márgenes de 20,9 % por lado | 720 px **pegados a la izquierda** |
| Diálogo | 33 px = 3,06 % del alto | 19 px = 2,10 % |
| Nombre del hablante | 45 px = 1,36× el diálogo | 1,3× ✓ |
| Escala de texto del jugador | slider 0,5× a 1,5× con Reset | presets 1 / 1,25 / 1,5 |

> **Corrección del 14 de septiembre, hecha al implementar la tarea 1.** Esta tabla decía que
> nuestra medida era de 76 caracteres y que ese era "el techo cómodo". Es falso: medido con
> `Range.getClientRects()` sobre el texto real, son **82-85 caracteres** por línea llena (8,25-8,36
> px por carácter en Georgia a 19 px). O sea que la línea **ya estaba por encima del ≤80 de WCAG
> 1.4.8 desde los 720 px de hoy**, no en su borde. El 76 salía de la regla de dedo de "medio em por
> carácter", que no vale para Georgia. Para 80 caracteres harían falta 34,7em; para los ~67 de
> Ren'Py, 29em. Se deja en 38em —la medida de hoy pasada a `em`— y la decisión de bajarla se toma
> en la tarea 2, **después** de medir cuántos caracteres quedan con el reparto en dos columnas.

Nuestro 44 % es **1,7× la norma de escritorio** y más alto que el modo teléfono del propio motor
(33,3 %). No se eligió mal por gusto: se eligió para que entraran las líneas a 1280×800. **La
respuesta correcta no era agrandar la caja, era que el texto escalara.**

Y la medida de 720 px tiene **dos** cosas mal, no una: es un poco larga (82-85 caracteres contra los
~67 del género) y, sobre todo, **está pegada a la izquierda** en una caja de 1919. De ahí el "está a
un costado". La segunda es la que el jugador siente; la primera es la que conviene no empeorar.

### 0.4 Los cuatro bugs que aparecieron midiendo

1. **`.tarjeta { all: unset }`** (`CreacionScreen.module.css:75`) pisa el `*{box-sizing:border-box}`
   global y devuelve la tarjeta a `content-box`. Con `height: 100%` más 12 px de relleno por lado y
   1 px de borde, **cada tarjeta desborda su celda 26 px y se mete 14 px dentro de la de abajo**. Es
   la causa mecánica de "parecen mal acomodadas". Pasa en los pasos 1 y 3, en las cinco medidas.
2. **El `<p class="motivo">` es hermano del `<button>`** dentro del mismo `<li>`
   (`CreacionScreen.tsx:384-388`), y como el botón ya ocupa el 100 % más los 26 px, el párrafo cae
   **fuera** de la celda: 89 px de texto colgando. Es el "No se puede: Engaño es la Debilidad del
   Clérigo…" suelto de la captura.
3. **El id del archivo se le muestra al jugador**: `CreacionScreen.tsx:301` pinta como texto visible
   `Retrato ${id.replace('_',' ')}` → "Retrato clerigo 01", "Retrato mago 03".
4. **Los dados no siguen la escala de fuente.** `Dados.module.css:8-9` mide `3.5rem`;
   `usePrefsCss.ts:13` escribe la variable en `<html>` pero `tokens.css:139` pone el `font-size` en
   `body`, así que **`rem` vale 16 px siempre** y el dado mide 56 px con escala 1, 1,25 y 1,5.

### 0.5 Y tres acoplamientos que ningún test vigila

- **El velo está cableado al 44 % de la caja**: `.velo` se vuelve denso en el 62 % y la caja arranca
  en el 56 %. Tocar el alto de la caja desacopla el degradado del filo de oro en silencio.
- **El "47 % del sprite visible"** del comentario sale de `80 %` y `44 %` juntos: `(0,56−0,18)/0,80`.
  Mover uno solo invalida el argumento de que la cara queda arriba del borde.
- **El tope de 160 px de la portada** (`Imagen.module.css:13-16`) se escribió para la creación de
  personaje y es el que decide el tamaño de la portada en el hub, donde nadie lo pensó.

---

## 1. El modelo de escalado

La decisión de fondo: **una sola unidad manda la geometría de la pantalla de juego**, como en
Ren'Py, y la tipografía la sigue con un piso y un techo que la preferencia del jugador puede
superar.

- **Tipografía fluida** en los tres tokens de tamaño, con el **piso anclado exactamente en el valor
  de hoy a 800 px de alto**, para que 1280×800 quede byte-idéntico y todas las mediciones asentadas
  en comentarios sigan siendo ciertas donde se tomaron.
- **`vh` y no `vw`**: toda la geometría de la escena sale del alto. Con `vw`, un ultrawide 2560×1080
  inflaría la letra sin dar una sola línea más de caja.
- **El techo no puede pasar de 2,5× el piso** y la preferencia del jugador multiplica por fuera del
  `clamp()`, para que pedir letra grande siempre agrande de verdad (WCAG 1.4.4: nunca `font-size` en
  unidades de viewport peladas).
- **La medida de la prosa en `em`, no en píxeles**, con un token propio que no toque el
  `--ancho-columna-max` compartido. Así el número de caracteres por línea es constante a cualquier
  escala.
- **Un `--alto-caja` compartido** del que consuman la caja, el velo y el sprite, para que los tres
  números que hoy se sostienen mutuamente no puedan volver a divergir en silencio.

---

## 2. La escena en pantallas anchas

**Arriba de 1400 px de ancho, la caja se reparte en dos columnas: la prosa a la izquierda, las
opciones (o el panel de tirada) a la derecha.** Abajo de ese corte no cambia nada.

| A 1919×905 | hoy | con el reparto |
|---|---|---|
| Líneas de prosa | 4,6 | **10,2** |
| Panel de tirada | no entra (271 px en 236) | **entra entero, también a escala 1,5** |

Esto no vuelve a la grilla de la fase anterior: **el texto sigue encima del arte**, el fondo sigue a
sangre y la caja sigue apoyada abajo a todo el ancho. Lo que se reparte es el interior de la caja.
Es lo que hacen Roadwarden y Citizen Sleeper, que el spec anterior ya citaba como el híbrido de los
juegos narrativos de mucho texto.

Además:

- **El sprite se acota por alto y se ancla por arriba**, no por abajo. Anclarlo por abajo hace que
  al crecer la ventana se vea *menos* personaje; anclarlo por arriba hace que se vea más. Pasa de
  cabeza-y-hombros a cabeza-y-torso en pantalla grande, que es lo contrario de la cabeza flotante de
  hoy.
- **El contenido de la caja se centra** cuando no está repartido en dos columnas, con márgenes
  simétricos, como hace el género. El fondo de la caja sigue a sangre: lo que se centra es lo que se
  lee. **La placa del hablante tiene que viajar con la prosa**, no quedarse clavada a 48 px.
- **El encuadre del fondo deja de depender de la relación de aspecto.** Hoy `object-fit: cover`
  recorta distinto en cada ventana: a 1919×905 se come el 8 % de arriba y el 8 % de abajo, y esa es
  la única medida donde pasa. Hay que fijar el encuadre para que la franja sacrificada sea siempre
  la misma, que es la de abajo, la que la caja tapa.

---

## 3. El hub

Hoy es un formulario: **no menciona el nombre del juego**, no usa **ninguno** de los tokens de capa
del vocabulario visual que la fase anterior construyó, tiene **cero estados interactivos** (ni un
`:hover`, ni una transición, ni una sombra en todo el archivo), y bajo el encabezado el contenido
termina en x = 539,8 px **en las cinco medidas**, dejando el 71,9 % del ancho sin usar a 1919×905.

- **La portada a sangre detrás de todo**, oscurecida, con el nombre del juego encima. El arte es el
  sujeto y el menú es el subtítulo. Es la convención literal del género, y resuelve de raíz el 87 %
  de pantalla vacía sin inventar relleno.
- **La campaña como tarjeta grande con la imagen dominante**, no como miniatura de catálogo de
  160 px sobre un archivo de 900×1200. La grilla pasa de `auto-fill` (que abre columnas vacías y
  **achica la tarjeta cuanto más grande la pantalla**) a un layout que no trabaje al revés.
- **La acción destructiva deja de pesar lo mismo que la principal.** Hoy "Borrar a Bruno de
  Aldamar" y "Jugar con Bruno de Aldamar" son el mismo botón, pegados uno al lado del otro.
- **Los dos `window.confirm` que quedan pasan a `Dialogo`.** Son los únicos que sobreviven en `src/`;
  el momento más dramático del hub —arrancar una campaña que te puede matar el personaje— hoy se
  resuelve con el cuadro gris del sistema operativo.
- **Jerarquía tipográfica de verdad**: hoy los títulos de sección miden 15 px, exactamente lo mismo
  que el cuerpo, y la premisa de la campaña sale más chica que el texto de una escena.
- **El orden de lectura primero el juego, después la administración del perfil.**

---

## 4. La creación de personaje

**Una pregunta por pantalla, con el arte grande.** Es la estructura de Sunless Sea y de la pantalla
"SELECT ARCHETYPE" de Disco Elysium, y resuelve de raíz el 72 % de pantalla vacía: con una sola
pregunta a la vez, el retrato puede ser enorme. Hoy los 20 retratos generados se muestran a 160 px.

- **Los cuatro bugs de §0.4 que viven acá se arreglan primero**, porque son la causa mecánica de que
  se vea rota: el `box-sizing`, el párrafo que cuelga fuera de su celda, y el id de archivo a la
  vista del jugador.
- **Lo deshabilitado deja de ser gris con una itálica flotando.** El motivo va **integrado en la
  tarjeta**, no debajo; y no puede ser un callejón sin salida. Hoy el botón lleva `disabled` nativo,
  así que sale del orden de tabulación y **un jugador de teclado nunca escucha el
  `aria-describedby`** que explica por qué no puede elegirlo.
- **El mismo motivo deja de repetirse seis veces.** Con dos rasgos elegidos, los otros seis pintan
  cada uno su propio párrafo idéntico.
- **Cuatro clases de mensaje dejan de verse iguales**: hoy una regla dura del juego y un aviso de
  cupo usan la misma itálica ámbar de 13 px.
- **La pantalla deja de ser una columna de 720 px centrada** en un monitor de 1920. Es la única
  pantalla del juego con cero reglas `@media`.
- **El paso 3 deja de no tener arte.** Es literalmente ocho cajitas de texto en una página de
  1920 px.

---

## 5. Lo que NO se toca

- **`src/engine/`.** Nada de esto lo necesita.
- **El contenido de la campaña.** Ni una palabra.
- **Las reglas del juego**: la regla de identidad visible (la clase fija el 2, el jugador elige
  dónde va el 0), las incompatibilidades entre rasgos y Debilidades, y el tope de personajes. Se
  conservan enteras y sus tests tienen que pasar sin tocarse.
- **`useRevelado`, el salto de lo leído, el contador de modales y las guardas del teclado.**
- **La paleta.** Los colores son los de `tokens.css` y se quedan.
- **El orden de los cuatro pasos de la creación.** Se rediseña cómo se ven, no qué preguntan ni en
  qué orden.

---

## 6. Criterio de listo

1. **A 1919×905, la escena no scrollea**: la prosa de una encrucijada de 10 líneas y sus 7 opciones
   se ven enteras al mismo tiempo.
2. **La proporción entre el texto y la pantalla deja de moverse**: medida contra la diagonal, la
   tijera de 1280×800 a 1920×1080 se cierra de −29 % a menos de −10 %.
3. **Pedir letra grande agranda de verdad**: a `--escala-fuente: 1,5` la medida sigue en ~76
   caracteres, no en 50, y se ven más líneas que hoy, no menos.
4. **1280×800 queda idéntico**, capturas del README incluidas.
5. **El hub y la creación se leen como el mismo juego que la escena**: usan su vocabulario visual, su
   tipografía y su arte, y no dejan dos tercios de pantalla vacíos.
6. **Los cuatro bugs de §0.4 están arreglados**, cada uno con un test que muerde.
7. **Todo lo de las fases anteriores sigue funcionando**: revelado, saltar lo leído, teclado
   completo, foco, preferencias, contraste, historial, Ficha.
8. `npm test`, `npx tsc --noEmit`, `npm run validate` y `npm run build`, los cuatro en verde, cero
   errores de consola, y verificado jugando a **1919×905, 1280×800, 2560×1440 y 375×812**.
