# La interfaz de novela visual

**Fecha:** 13 de septiembre de 2026
**Estado:** aprobado por Gabriel
**Motivo:** después de publicar, Gabriel miró el juego y dijo que la interfaz es fea y que no parece una novela visual. Tiene razón.

---

## 0. El diagnóstico

Lo que se construyó en ocho fases es un **layout de aplicación web**: el fondo en una tarjeta con márgenes y esquinas redondeadas a la izquierda, el retrato en otra tarjeta debajo, y el texto en una columna al lado. Funciona, es accesible y está probado — y no se parece en nada al género que dice ser.

### 0.1 Lo que hace el género, investigado

El formato canónico es **ADV**: el arte ocupa la pantalla entera y una caja de texto se apoya abajo, a todo el ancho, con una **placa que nombra a quien habla**. El otro formato es **NVL**, donde la caja cubre casi toda la pantalla y se quita el resto de la interfaz; se usa cuando hay mucho texto.

Ren'Py, el motor estándar del género, da los números de referencia sobre 1920×1080:

| | valor | sobre la pantalla |
|---|---|---|
| Alto de la caja de texto | 278 px | **26 %** |
| Alineación | `yalign 1.0` | pegada abajo |
| Tamaño del diálogo | 33 px | — |
| Tamaño del nombre | 45 px | **1,36× el diálogo** |

Los juegos narrativos de mucho texto (Roadwarden, Citizen Sleeper) hacen un híbrido: ilustración más panel de texto, pero el panel es un panel **diseñado**, no una columna suelta.

### 0.2 Los cinco pecados de la pantalla actual

1. El fondo es una tarjeta flotando sobre negro, en vez de ser el mundo a sangre.
2. **El texto está al lado del arte en vez de encima.** Es la decisión que sola convierte cualquier cosa en una aplicación web.
3. No hay placa de nombre: el hablante es una palabra en negrita dentro del párrafo.
4. El retrato es una miniatura en un recuadro, no un personaje presente en la escena.
5. La barra de estado es una barra de herramientas con botones de formulario.

---

## 1. El layout nuevo

Un ADV híbrido: el arte a sangre, la caja abajo, pero más alta que la de Ren'Py porque esta campaña tiene párrafos de hasta 160 palabras.

- **El fondo llena el marco.** `object-fit: cover`, sin margen, sin radio, sin tarjeta. Encima, un velo en degradado que oscurece la franja de abajo lo suficiente para que el texto se lea sin tapar el arte.
- **La caja de texto** se apoya abajo, a todo el ancho, **44 % de alto**, con fondo casi opaco y un filo superior del dorado de la marca. Si una entrada no entra, la caja scrollea por dentro; no crece.
- **La placa del hablante** monta sobre el borde superior de la caja, corrida a la izquierda, en serif dorada y **a 1,3× el tamaño del diálogo**, que es la proporción del género.
- **Las opciones viven dentro de la caja**, debajo del texto, con sus chips como ahora.
- **El panel de tirada ocupa el lugar de las opciones**, dentro de la caja.
- **El cromo flota sobre el arte**: lugar a la izquierda en serif dorada, Heridas y Fortuna como marcas compactas a la derecha, y Ficha y Abandonar como botones fantasma. Sin fondo sólido: un degradado que se desvanece.

---

## 2. Los sprites

Los retratos de hoy son **cuadros 3:4 con fondo pintado**. Pegados sobre la escena se leen como una foto pegada encima; con una máscara elíptica mejoran, pero el rectángulo se sigue adivinando.

**Se recortan de verdad, con BiRefNet**, que es la misma herramienta que la Fase G ya usó para los ocho objetos y que está instalada y calibrada en `art/recorte.mts`.

**Dos tipos de asset, no uno.** Los retratos se dibujan en cuatro lugares y no todos quieren lo mismo:

| Dónde | Qué se usa | Por qué |
|---|---|---|
| `CreacionScreen` (tarjeta de clase, galería, resumen) | `retrato/` — el cuadro, como hoy | Una silueta recortada flotando en una tarjeta se ve peor que el cuadro |
| `Ficha` | `retrato/` | Lo mismo |
| `EscenaScreen` | **`sprite/` — nuevo** | Acá el personaje está en la escena |

El tipo `sprite` se deriva de los mismos másteres, que **siguen existiendo** en `art/masters/retrato/` (21 carpetas): BiRefNet produce el PNG con alfa y el post-proceso lo baja a WebP **conservando el canal alfa** (hoy `art/post.mts` solo conserva alfa para `objeto`).

**Son ocho sprites, no veinte.** De los 20 retratos, 12 son de jugador y viven solo en la creación de personaje; los que aparecen en una escena son los ocho PNJ: `berta`, `dravos`, `tome`, `mausi`, `pell`, `orell`, `ilse` y `halvar`. Cargan perezosos como todo lo demás.

`validate --assets` tiene que conocer el tipo nuevo y exigir que todo PNJ con retrato tenga su sprite.

---

## 3. El historial

Hoy la columna acumula **toda la partida** y se scrollea. Ninguna novela visual hace eso: muestran el texto actual y guardan lo anterior detrás de un botón de historial.

**Esto es más barato de lo que parece, y conviene decir por qué:** `useRevelado` solo mira `log[log.length - 1]` — la última entrada. Todo lo anterior es puro dibujo. Sacar la columna acumulada de la pantalla **no toca el revelado ni el salto de lo leído**; son independientes y hay tests que lo fijan.

- La caja muestra **la última entrada del log**: la prosa de la escena, o el desenlace de la tirada que se acaba de resolver.
- Un botón **Historial** abre un cajón con todo el log de la partida, con el mismo `Cajon` accesible que ya usa la Ficha. Ahí adentro se ve lo que hoy se ve en la columna: escenas, elecciones y tiradas.
- El autoscroll de la columna deja de hacer falta para seguir el texto que crece; queda el scroll interno de la caja para una entrada larga.
- **La tecla H** abre el historial, junto a la C de la Ficha.

---

## 4. Móvil

La estructura es la misma y ya está a mitad de camino: la hoja inferior de la Fase H **es** la caja de texto. Lo que cambia es que el fondo pasa a llenar la mitad de arriba a sangre en vez de ser una banda con la imagen contenida, y que el sprite se ancla al borde de la hoja.

Se verifica jugando a 375×812, como en la Fase H.

---

## 5. Lo que NO se toca

- **`src/engine/`.** Nada de esto lo necesita.
- **El contenido de la campaña.** Ni una palabra: la prosa está a once palabras del tope de presupuesto.
- **`useRevelado` y el salto de lo leído.** Ver §3.
- **Las preferencias, el teclado y los diálogos** de la Fase F y H: se conservan enteros, incluidos el foco al entrar, el contador de modales y la guarda de controles activables.
- **La paleta.** Los colores son los de `tokens.css` y se quedan: identidad primero.

---

## 6. Criterio de listo

1. **Un desconocido mira una captura y dice "novela visual"**, no "aplicación web".
2. El fondo llena la pantalla; el texto está encima; el hablante tiene placa.
3. Los sprites de la escena son siluetas recortadas, sin rectángulo visible.
4. El historial está detrás de un botón y la tecla H, y muestra todo lo que hoy muestra la columna.
5. Se juega igual en un teléfono a 375×812.
6. Todo lo de las fases F y H sigue funcionando: revelado, saltar lo leído, teclado completo, foco, preferencias, contraste.
7. `npm test`, `npx tsc --noEmit`, `npm run validate` y `npm run build`, los cuatro en verde, y cero errores de consola.
