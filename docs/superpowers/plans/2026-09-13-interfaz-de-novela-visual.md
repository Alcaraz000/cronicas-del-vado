# La interfaz de novela visual: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usá `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que el juego se vea como una novela visual y no como una aplicación web. El arte llena la pantalla, el texto vive encima, el hablante tiene su placa y los personajes son siluetas recortadas presentes en la escena.

**Arquitectura:** es CSS, estructura de componentes y una pasada de arte. El motor no se toca, el contenido no se toca, y `useRevelado` tampoco: solo mira la última entrada del log, así que sacar la columna acumulada de la pantalla no lo afecta.

**Stack:** Vite 8.3 + React 19 + TypeScript 5.9.3 + Vitest 5. El arte sale de ComfyUI Portable en `C:\ComfyUI\ComfyUI_windows_portable` (arranca con `run_nvidia_gpu.bat`, API en 127.0.0.1:8188) con el nodo BiRefNet ya instalado.

## Restricciones globales

- **No se toca `src/engine/`** ni `src/content/`. Es una tarea de presentación. La prosa además está a once palabras del tope de presupuesto: agregar texto de campaña la pone en rojo.
- **No se toca `useRevelado` ni el salto de lo leído.** Hay tests que los fijan; si se caen, algo se hizo mal.
- TypeScript queda en **5.9.3**. No actualizar.
- **Ningún `*.module.css` escribe un color ni un tamaño de fuente literal**: todo sale de `src/app/tokens.css`, y todo `font-size` se multiplica por `var(--escala-fuente)`.
- **La paleta no cambia.** Los colores de `tokens.css` son la identidad del juego.
- **Todo el texto que ve el jugador vive en `src/ui/strings.es.ts`.** Castellano rioplatense con voseo.
- Se conserva entero lo que construyeron las fases F y H: foco al entrar a cada pantalla, foco a la primera acción cuando termina el revelado, contador de modales (`src/ui/modales.ts`), guardas de `src/ui/teclado.ts`, `aria-live` en el texto, `prefers-reduced-motion`, contraste 4,5:1.
- Tests en castellano, con `describe`/`it` importados explícitamente de vitest (el proyecto NO usa `globals: true`), y `/** @vitest-environment jsdom */` en la primera línea de los tests de componentes.
- **Un commit por tarea**, mensaje en castellano, con la línea `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` al final. Es textual.
- Antes de dar una tarea por terminada: `npm test`, `npx tsc --noEmit` y `npm run validate`, en verde.

## La trampa que mordió a cuatro implementadores en la fase anterior

**Cuando verifiques en el navegador, asegurate de que el servidor sirva ESTE árbol.** Un `npm run dev` viejo corriendo en otro directorio sobre el mismo puerto sirve el código de otra rama, y ya produjo un falso negativo que casi hace tirar un arreglo bueno y una captura de README del build equivocado.

```bash
curl -s http://localhost:PUERTO/src/ui/screens/EscenaScreen.module.css | grep -c "algo-que-acabas-de-escribir"
```

Si da 0, estás mirando otra cosa. Levantá `vite` a mano en un puerto libre desde este árbol.

## La referencia visual

Hay una maqueta funcionando con el arte real en el scratchpad de la sesión, servida en el puerto 5188 mientras dure. Si no está, el diseño está descrito acá y en el spec con números.

Los números del género, de Ren'Py sobre 1920×1080: caja de texto **278 px = 26 % de la altura**, pegada abajo, a todo el ancho; diálogo 33 px; nombre 45 px, o sea **1,36× el diálogo**. Acá la caja va más alta (**44 %**) porque esta campaña tiene párrafos de hasta 160 palabras.

## Orden de las tareas

1 → 2 → 3 → 4. La 1 primero para que la 2 tenga sprites de verdad con los que trabajar.

---

### Tarea 1: los sprites

**Archivos:**
- Modificar: `art/manifest.mts`, `art/recorte.mts`, `art/post.mts`, `src/ui/assets/index.ts`, `tools/lib/assets/index.ts`
- Crear: `src/assets/sprite/*.webp` (8 archivos, generados)
- Test: `tests/tools/assets.test.ts`, `tests/ui/assets.test.ts`

**Interfaces:**
- Consume: nada.
- Produce: el tipo de asset `sprite` y los ocho archivos. La tarea 2 los dibuja.

Los retratos de hoy son cuadros 3:4 **con fondo pintado**. Pegados sobre una escena se leen como una foto pegada encima. Hay que recortarlos de verdad.

**Son ocho, no veinte.** De los 20 retratos, 12 son de jugador y viven solo en la creación de personaje. Los que aparecen en una escena son los ocho PNJ: `berta`, `dravos`, `tome`, `mausi`, `pell`, `orell`, `ilse`, `halvar`.

**Y son un tipo nuevo, no un reemplazo.** El cuadro enmarcado sigue siendo lo correcto para la galería de la creación de personaje y para la Ficha; la silueta es lo correcto para la escena. Los dos conviven.

- [ ] **Paso 1: los tests que fallan**

En `tests/ui/assets.test.ts`, que el registro de imágenes reconozca el tipo `sprite` y resuelva `sprite/berta`. En `tests/tools/assets.test.ts`, que el cruce de assets exija un sprite por cada PNJ con retrato y que un sprite huérfano se reporte.

- [ ] **Paso 2: correr y verificar que fallan**

Comando: `npx vitest run tests/ui/assets.test.ts tests/tools/assets.test.ts`

- [ ] **Paso 3: el tipo nuevo en el manifiesto**

En `art/manifest.mts`, agregá `'sprite'` al tipo `Entrada` y una entrada por cada PNJ de `campaign.npcs` y `WORLD.npcs`, con el **mismo id y la misma semilla** que su retrato: el sprite no se genera de nuevo, se deriva del máster que ya existe en `art/masters/retrato/<id>/`.

- [ ] **Paso 4: el recorte**

`art/recorte.mts` hoy filtra `e.tipo === 'objeto'`. Extendelo para procesar también los sprites, leyendo el máster de `art/masters/retrato/<id>/` y dejando el PNG con alfa como `recorte.png` en `art/masters/sprite/<id>/`.

**Ojo con el nodo:** `BiRefNetRMBG` lee sus entradas opcionales sin valor por defecto y revienta con `Error in image processing: 'mask_blur'` si faltan. Hay que pasarle las siete explícitas, como ya hace el código para los objetos: `model`, `sensitivity`, `mask_blur`, `mask_offset`, `invert_output`, `refine_foreground`, `background`, `background_color`.

- [ ] **Paso 5: el post-proceso conserva el alfa**

En `art/post.mts`, agregá `sprite: { w: 768, h: 1024, recorte: false }` al mapa `SALIDA`, y extendé la condición `conAlfa` —hoy `e.tipo === 'objeto'`— para incluir `sprite`. Sin eso el WebP sale con fondo negro y no sirve para nada.

- [ ] **Paso 6: generar los ocho**

Arrancá ComfyUI con `C:\ComfyUI\ComfyUI_windows_portable\run_nvidia_gpu.bat`, esperá a que la API responda en 127.0.0.1:8188, y corré:

```bash
npx tsx art/manifest.mts
npx tsx art/recorte.mts
npx tsx art/post.mts
```

**Mirá los ocho resultados antes de seguir.** El recorte de un retrato es más difícil que el de un objeto: el pelo, una capucha y un fondo oscuro confunden al modelo. Si alguno sale con un halo o con un pedazo de fondo pegado, decilo en el informe con cuál y qué tan mal — no lo tapes.

Apagá ComfyUI cuando termines: ocupa la placa.

- [ ] **Paso 7: el registro de la UI y el validador**

`src/ui/assets/index.ts` suma `'sprite'` a `AssetKind` y a su `import.meta.glob`. `tools/lib/assets/index.ts` suma el tipo y la regla de que todo PNJ con retrato tiene sprite.

- [ ] **Paso 8: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate -- --assets
git add -A
git commit -m "feat(arte): sprites recortados de los ocho personajes de escena"
```

---

### Tarea 2: el layout de novela visual

**Archivos:**
- Modificar: `src/ui/screens/EscenaScreen.tsx`, `EscenaScreen.module.css`, `src/ui/components/StatusBar.tsx` y su CSS, `src/ui/components/TextColumn.module.css`, `OptionList.module.css`, `RollPanel.module.css`
- Test: `tests/ui/EscenaScreen.test.tsx`, `tests/ui/StatusBar.test.tsx`

**Interfaces:**
- Consume: el tipo `sprite` de la tarea 1.
- Produce: la pantalla nueva. La tarea 3 le cambia qué texto muestra.

Es el corazón del rediseño. **La decisión que lo define: el texto va encima del arte, no al lado.**

**El layout:**

- **El fondo llena el marco.** Posicionado absoluto sobre toda la pantalla, `object-fit: cover`. Sin margen, sin radio, sin tarjeta. Encima, un velo en degradado vertical que deja el arte limpio arriba y oscurece la franja de abajo lo suficiente para que el texto se lea.
- **La caja de texto** se apoya abajo, a todo el ancho, **44 % de alto**, fondo casi opaco con un degradado suave, y un filo superior de un dorado tenue. Si una entrada no entra, **la caja scrollea por dentro**; no crece.
- **La placa del hablante** monta sobre el borde superior de la caja, corrida a la izquierda, en serif dorada, **1,3× el tamaño del diálogo**. Solo aparece cuando el párrafo tiene hablante.
- **El sprite** se ancla abajo a la izquierda, alto (alrededor del 80 % de la pantalla), de modo que **la cara quede por encima del borde de la caja** y el resto se pierda detrás: es como un sprite se apoya en el suelo. Con `prefers-reduced-motion` no entra animado.
- **Las opciones y el panel de tirada viven dentro de la caja**, debajo del texto.
- **El cromo flota sobre el arte**: el lugar a la izquierda en serif dorada, Heridas y Fortuna como marcas compactas a la derecha, Ficha y Abandonar como botones fantasma. Fondo: un degradado que se desvanece, no un color sólido.

**En móvil** la estructura es la misma y ya está a mitad de camino: la hoja inferior de la Fase H **es** la caja. Cambia que el fondo llena la mitad de arriba a sangre en vez de ser una banda con la imagen contenida, y que el sprite se ancla al borde de la hoja.

**Lo que no se puede romper**, y tiene tests que lo fijan: el botón de saltar lo leído sigue visible y pegado arriba de la caja; el foco sigue yendo a la primera opción cuando el revelado termina; `aria-live` sigue en el texto; las condiciones siguen viéndose en móvil cuando las hay.

- [ ] **Paso 1: los tests que fallan**

En `tests/ui/EscenaScreen.test.tsx`: que la escena dibuje el fondo a sangre (sin el contenedor de tarjeta), que use `tipo="sprite"` y no `"retrato"`, y que el hablante tenga su placa. Seguí el patrón de lectura de CSS de `tests/fixtures/css.ts` para lo que sea declaración.

- [ ] **Paso 2: correr y verificar que fallan**

- [ ] **Paso 3: implementar**

Leé antes los comentarios largos de `EscenaScreen.module.css`: explican por qué el botón de saltar es `sticky` y por qué el autoscroll depende de `caracteresVisibles`. Están ahí porque alguien ya se equivocó.

- [ ] **Paso 4: jugarlo, en las dos medidas**

Servidor verificado con `curl` como dice el encabezado. A **1280×800** y a **375×812**, jugando de verdad: entrar a una escena con hablante, leer, resolver una tirada, abrir la Ficha, usar el saltar leído. Con la consola abierta.

Anotá en el informe qué viste y qué ajustaste mirándolo, que es donde este trabajo se gana.

- [ ] **Paso 5: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "feat(ui): el texto vive encima del arte, como en una novela visual"
```

---

### Tarea 3: el historial

**Archivos:**
- Crear: `src/ui/components/Historial.tsx` y su `.module.css`
- Modificar: `src/ui/components/TextColumn.tsx`, `src/ui/screens/EscenaScreen.tsx`, `src/ui/strings.es.ts`
- Test: `tests/ui/Historial.test.tsx`, `tests/ui/EscenaScreen.test.tsx`

**Interfaces:**
- Consume: el layout de la tarea 2, y `Cajon` y `modales.ts` de fases anteriores.
- Produce: nada para las siguientes.

Hoy la columna acumula **toda la partida** y se scrollea. Ninguna novela visual hace eso: muestran el texto actual y guardan lo anterior detrás de un botón.

**Por qué esto es más barato de lo que suena, y hay que entenderlo antes de tocar nada:** `useRevelado` solo mira `log[log.length - 1]`. Todo lo anterior es puro dibujo. Sacar la columna acumulada **no toca el revelado ni el salto de lo leído**.

- **La caja muestra la última entrada del log**: la prosa de la escena, o el desenlace de la tirada recién resuelta.
- **Un botón Historial** abre un cajón con todo el log de la partida, montado sobre el `Cajon` que ya usa la Ficha, con su foco atrapado y su Esc. Adentro va lo que hoy muestra la columna: escenas, elecciones y tiradas, con el mismo formato.
- **La tecla H** lo abre, al lado de la C de la Ficha, con las mismas guardas de `src/ui/teclado.ts` y respetando `hayModalAbierto()`.
- El autoscroll de la columna deja de hacer falta para seguir el texto que crece; queda el scroll interno de la caja.

- [ ] **Paso 1: los tests que fallan**

Que la caja muestre solo la última entrada; que el botón y la tecla H abran el cajón; que el cajón muestre las entradas anteriores; que H no dispare desde un campo de texto ni con otro modal abierto.

- [ ] **Paso 2: correr y verificar que fallan**

- [ ] **Paso 3: implementar**

- [ ] **Paso 4: verificar que no se rompió lo de antes**

Los tests de `useRevelado`, de saltar lo leído y de foco tienen que seguir pasando **sin tocarlos**. Si alguno se cae, pará y reportalo: significa que la columna y el revelado estaban más acoplados de lo que este plan cree.

- [ ] **Paso 5: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "feat(ui): el historial vive detras de un boton, no en la pantalla"
```

---

### Tarea 4: verificación y cierre

**Archivos:**
- Modificar: `docs/captura-escena.png`, `README.md` si hace falta
- Test: ninguno nuevo

**Interfaces:** consume todo lo anterior.

- [ ] **Paso 1: una partida entera**

Servidor verificado con `curl`. Jugá de principio a fin en escritorio con la consola abierta, y verificá:

1. El fondo llena la pantalla y el texto está encima.
2. El hablante tiene placa y el sprite se ve recortado, sin rectángulo.
3. El historial se abre con el botón y con H, y muestra lo que antes estaba en la columna.
4. Saltar lo leído sigue frenando en la variante nueva.
5. La Ficha, las preferencias y el teclado siguen enteros.
6. **Cero errores de consola.**

- [ ] **Paso 2: lo mismo en teléfono**

A 375×812, jugando. Anotá cualquier cosa que quede apretada.

- [ ] **Paso 3: la captura del README**

La de hoy muestra el layout viejo. Rehacela con el nuevo, **desde un servidor verificado**, eligiendo una escena con hablante para que se vea la placa y el sprite. Guardala en `docs/captura-escena.png`.

- [ ] **Paso 4: el circuito completo**

```bash
npm test && npx tsc --noEmit && npm run validate && npm run build
```

- [ ] **Paso 5: commitear**

```bash
git add -A
git commit -m "docs: la captura muestra la interfaz nueva"
```
