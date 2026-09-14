# El escalado de la interfaz y las dos pantallas de menú — plan de implementación

> **Para quien lo ejecute:** SUB-SKILL OBLIGATORIA: usar `superpowers:subagent-driven-development`
> para implementar este plan tarea por tarea. Los pasos usan `- [ ]` para llevar la cuenta.

**Objetivo:** que la interfaz mantenga su proporción en cualquier pantalla, que una encrucijada
entera se lea sin scrollear a 1919×905, y que el hub y la creación de personaje se vean parte del
mismo juego que la escena.

**Arquitectura:** una sola unidad manda la geometría de la pantalla de juego y la tipografía la
sigue con piso y techo, como hace Ren'Py. Arriba de 1400 px de ancho la caja de texto se reparte por
dentro en dos columnas —prosa a la izquierda, acciones a la derecha— sin dejar de estar apoyada
abajo, a todo el ancho, encima del arte. El hub y la creación se reescriben sobre el vocabulario
visual que la fase anterior construyó (las capas, el filo de oro, la serif del juego) y sobre el
arte que ya existe generado.

**Herramientas:** Vite 8.3, React 19, TypeScript 5.9.3 (**clavado**: 7.x saca `baseUrl` y rompe el
tsconfig), Vitest 5 con jsdom y Testing Library, zod 4, zustand 5. `playwright-core` con el Edge del
sistema para la captura.

## Restricciones globales

Copiadas del diseño (`docs/superpowers/specs/2026-09-14-escalado-y-pantallas-de-menu-design.md` §5).
Valen para **todas** las tareas:

- **No se toca `src/engine/`.** Nada de esto lo necesita.
- **No se toca el contenido de la campaña** (`src/content/campaigns/`). Ni una palabra.
- **No se tocan las reglas del juego**: la regla de identidad visible (la clase fija el 2, el
  jugador elige dónde va el 0), las incompatibilidades entre rasgos y Debilidades, el tope de
  personajes. Sus tests pasan **sin modificarse**.
- **No se tocan `useRevelado`, el salto de lo leído, `src/ui/modales.ts` ni `src/ui/teclado.ts`.**
  Sus tests pasan **sin modificarse**.
- **No se toca la paleta.** Los colores son los de `src/app/tokens.css`.
- **Cero colores y cero tamaños literales** en los `*.module.css`: todo por token.
- **Todo `font-size` lleva `var(--escala-fuente)`.** Hay un test que lo barre
  (`tests/ui/prefs.test.tsx:89`) y tiene que seguir en verde.
- **Todo el texto de jugador vive en `src/ui/strings.es.ts`**, nunca incrustado en el componente.
- Comentarios en castellano rioplatense, explicando el *porqué* y citando mediciones.
- **Ningún número inventado.** Si un comentario dice una medida, tiene que estar medida. Este repo
  ya gastó tres correcciones en números falsos escritos como si fueran mediciones.

### La trampa del dev server, que ya mordió a cinco personas acá

Un `npm run dev` viejo en el 5173 puede servir **otra rama**. Levantá vite vos en un puerto propio
desde este worktree y **antes de creerle a nada** verificá por HTTP que es el tuyo:

```bash
curl -s http://localhost:PUERTO/src/ui/screens/EscenaScreen.tsx | grep -c "indiceDeLaPlaca"
```

**Grepeá identificadores o cadenas, nunca comentarios: esbuild los borra.** Y el server tiene que
ser **posterior a tus ediciones**: uno encendido durante un cambio recarga en caliente un módulo a
medio aplicar y da errores fantasma. Cuando termines, apagalo.

---

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `src/app/tokens.css` | Los tres tokens de tamaño pasan a `clamp()`; nace `--ancho-prosa` | 1 |
| `src/ui/components/Dados.module.css` | El dado deja de medir `3.5rem` fijos | 1 |
| `src/ui/components/TextColumn.module.css` | La medida de la prosa en `em` | 1 |
| `src/ui/screens/EscenaScreen.module.css` | `--alto-caja`, sprite acotado, reparto en dos columnas, centrado | 2 |
| `src/ui/components/Imagen.module.css` | El encuadre del fondo deja de depender de la relación de aspecto | 2 |
| `src/ui/screens/HubScreen.tsx` + `.module.css` | Portada a sangre, nombre del juego, tarjeta grande, jerarquía, `Dialogo` | 3 |
| `src/ui/screens/CreacionScreen.tsx` + `.module.css` | Los cuatro bugs, una pregunta por pantalla, arte grande | 4 |
| `src/ui/strings.es.ts` | Los textos nuevos de 3 y 4 | 3, 4 |
| `tools/captura.mts` | La captura se rehace con el layout nuevo | 5 |

---

### Tarea 1: el modelo de escalado

**Archivos:**
- Modificar: `src/app/tokens.css:76-78` y `:91`, `src/ui/components/Dados.module.css:7-11`,
  `src/ui/components/TextColumn.module.css:6`
- Test: `tests/ui/escala.test.ts` (nuevo), `tests/ui/prefs.test.tsx` (se le suma un caso)

**Interfaces:**
- Consume: nada.
- Produce: `--tam-texto-juego`, `--tam-ui`, `--tam-ui-chico` como `clamp()`, y el token nuevo
  **`--ancho-prosa: 38em`**, que la tarea 2 da por existente.

Esta tarea **no toca una sola regla de layout**. Cambia números en tokens y dos reglas que los
consumen. Es la que cierra la tijera de −29 % sin mover nada de sitio.

**El piso va anclado al valor de HOY a 800 px de alto** (19/800 = 2,375vh), para que 1280×800 quede
byte-idéntico —capturas del README incluidas— y todas las mediciones asentadas en comentarios sigan
siendo ciertas donde se tomaron.

- [ ] **Paso 1: los tests que fallan**

Creá `tests/ui/escala.test.ts` que lea `src/app/tokens.css` y fije, con el motivo escrito:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(resolve(process.cwd(), 'src/app/tokens.css'), 'utf8');
const valorDe = (nombre: string): string =>
  new RegExp(`--${nombre}\\s*:\\s*([^;]+);`).exec(tokens)?.[1]?.trim() ?? '';

describe('el modelo de escalado', () => {
  it('los tres tokens de tamaño escalan con el alto de la ventana', () => {
    // El bug que esto fija: `.sprite`, `.caja` y `.acciones` son porcentajes del alto de la
    // ventana y `--tam-texto-juego` era 19px clavados, así que de 1280x800 a 1919x905 el sprite
    // crecía 84 px y la letra cero. Medido contra la diagonal, el texto era un 29 % más chico.
    for (const token of ['tam-texto-juego', 'tam-ui', 'tam-ui-chico']) {
      expect(valorDe(token), `--${token} no escala`).toMatch(/^clamp\(/);
      expect(valorDe(token), `--${token} escala con el ancho, no con el alto`).toContain('vh');
    }
  });

  it('el piso es el valor de hoy a 800 px de alto, para que 1280x800 no se mueva', () => {
    expect(valorDe('tam-texto-juego')).toMatch(/clamp\(\s*19px/);
    expect(valorDe('tam-ui')).toMatch(/clamp\(\s*15px/);
    expect(valorDe('tam-ui-chico')).toMatch(/clamp\(\s*13px/);
  });

  it('el techo no pasa de 2,5x el piso', () => {
    // Regla de tipografía fluida: por encima de 2,5x el salto entre medidas se vuelve brusco y
    // el texto pega un tirón en el medio del rango.
    for (const [token, piso] of [['tam-texto-juego', 19], ['tam-ui', 15], ['tam-ui-chico', 13]] as const) {
      const techo = Number(/,\s*(\d+(?:\.\d+)?)px\s*\)/.exec(valorDe(token))?.[1]);
      expect(techo, `--${token} no declara techo en px`).toBeGreaterThan(piso);
      expect(techo / piso, `--${token} tiene un techo demasiado alto`).toBeLessThanOrEqual(2.5);
    }
  });

  it('la medida de la prosa se mide en em, no en px', () => {
    // Con la medida en px y la fuente escalando, pedir letra grande ANGOSTABA la columna: a
    // --escala-fuente 1,5 los 720px pasaban de 76 a 50 caracteres. En `em` el número de
    // caracteres por línea es constante a cualquier escala.
    expect(valorDe('ancho-prosa'), '--ancho-prosa no existe').not.toBe('');
    expect(valorDe('ancho-prosa')).toMatch(/em\b/);
  });

  it('--ancho-columna-max sigue en px y sin tocar: lo comparten Cajon, Dialogo y FinScreen', () => {
    expect(valorDe('ancho-columna-max')).toBe('720px');
  });
});
```

Y sumá a `tests/ui/prefs.test.tsx`, al lado del barrido de `font-size`, el caso que falta:

```ts
it('el dado sigue la escala de fuente como todo lo demás', () => {
  // `usePrefsCss` escribe --escala-fuente en <html> pero `tokens.css` pone el font-size en
  // `body`, así que `rem` vale 16px SIEMPRE: el dado medía 56px con escala 1, con 1,25 y con
  // 1,5. El barrido de font-size no lo agarra porque son `width`/`height`.
  const css = readFileSync(resolve(process.cwd(), 'src/ui/components/Dados.module.css'), 'utf8');
  const dado = /\.dado\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(dado, '.dado no tiene regla propia').not.toBe('');
  expect(dado, 'el dado sigue midiendo en rem, que no escala').not.toMatch(/\brem\b/);
  expect(dado).toContain('--escala-fuente');
});
```

- [ ] **Paso 2: correrlos y verificar que fallan**

`npx vitest run tests/ui/escala.test.ts tests/ui/prefs.test.tsx`
Esperado: fallan los cinco casos nuevos (`--ancho-prosa` no existe, los tokens no son `clamp()`, el
dado tiene `rem`).

- [ ] **Paso 3: implementar**

En `src/app/tokens.css`:

```css
  /* El piso es el valor de hoy a 800 px de alto (19/800 = 2,375vh), así que 1280x800 queda
     idéntico y las mediciones escritas en comentarios siguen siendo ciertas donde se tomaron.
     `vh` y no `vw` porque toda la geometría de la escena sale del ALTO (caja 44 %, sprite 80 %,
     acciones 60 %): con `vw`, un ultrawide 2560x1080 inflaría la letra sin dar una línea más de
     caja. Los techos están en 1,32x / 1,27x / 1,23x el piso, bien abajo del 2,5x a partir del
     cual el texto pega un tirón en el medio del rango.
     La preferencia del jugador multiplica POR FUERA del clamp (los módulos hacen
     `calc(var(--tam-...) * var(--escala-fuente))`), así que pedir 150 % siempre agranda de
     verdad: meter la escala adentro del clamp la anularía arriba del techo, que es fallo de
     accesibilidad. */
  --tam-texto-juego: clamp(19px, 2.375vh, 25px);
  --tam-ui: clamp(15px, 1.875vh, 19px);
  --tam-ui-chico: clamp(13px, 1.625vh, 16px);
```

Y el token nuevo, al lado de `--ancho-columna-max`:

```css
  /* La medida de la prosa de la escena, en `em` y no en px. `em` se resuelve contra el
     `font-size` del propio elemento, que ya es `calc(--tam-texto-juego * --escala-fuente)`, así
     que los caracteres por línea quedan constantes a cualquier escala. 38em ≈ 76 caracteres, el
     techo cómodo (WCAG 1.4.8 pide <= 80; Ren'Py usa ~67 en su caja ADV).
     Es un token APARTE de `--ancho-columna-max`, que es px y lo comparten `Cajon`, `Dialogo`,
     `OpcionesModal` y `FinScreen`: tocar aquel rompe cuatro pantallas. */
  --ancho-prosa: 38em;
```

En `src/ui/components/TextColumn.module.css:6`, cambiá el `max-width` por
`max-width: min(var(--ancho-prosa), 100%);` — el `min()` es obligatorio: a 150 % en una ventana de
1024 px los 38em miden 1083 px y desbordarían.

En `src/ui/components/Dados.module.css`, el dado pasa a seguir la escala:

```css
.dado {
  /* 3,5x el cuerpo de la interfaz, que es lo que medían los 3.5rem cuando se escribieron. En
     `rem` no escalaba: `usePrefsCss` escribe --escala-fuente en <html> pero el `font-size` vive
     en `body`, así que `rem` vale 16px siempre y el dado medía 56px en las tres escalas. */
  width: calc(3.5 * var(--tam-ui) * var(--escala-fuente));
  height: calc(3.5 * var(--tam-ui) * var(--escala-fuente));
  overflow: visible;
}
```

- [ ] **Paso 4: verificar que no se rompió nada**

`npm test && npx tsc --noEmit`. Los 1128 de base más los nuevos, todos en verde. En particular
`tests/ui/prefs.test.tsx:89` (el barrido de `font-size`) y los tests de `Dados`.

**Si algún test de medición se cae, PARÁ y reportá** en vez de ajustar el test: significa que algo
leía un tamaño que ahora es un `clamp()`.

- [ ] **Paso 5: verificar en el navegador que 1280×800 no se movió**

Levantá el server verificado con curl. A **1280×800** medí por DOM el `font-size` computado del
diálogo, de la placa y del cromo: tienen que dar **19 / 24,7 / 13 px exactos**, los mismos de hoy.
Después medí a **1919×905** y anotá los valores nuevos. Los dos juegos de números van al informe.

- [ ] **Paso 6: commitear**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "feat(ui): la tipografia escala con la ventana, como el arte"
```

---

### Tarea 2: la escena en pantallas anchas

**Archivos:**
- Modificar: `src/ui/screens/EscenaScreen.module.css`, `src/ui/components/Imagen.module.css`
- Test: `tests/ui/EscenaScreen.test.tsx` (hay tres aserciones que hay que reescribir)

**Interfaces:**
- Consume: `--ancho-prosa` y los tokens fluidos de la tarea 1.
- Produce: `--alto-caja`, del que consumen la caja, el velo y el sprite.

Son cinco cambios en un solo archivo, y conviene entender por qué van juntos: los tres primeros se
sostienen mutuamente hoy sin que ningún test los vigile.

**a) Extraer `--alto-caja`.** Hoy `.caja { height: 44% }`, `.velo` se vuelve denso en el `62%` y el
comentario del sprite afirma que se ve el `47 %` — y ese 47 sale de `(0,56 − 0,18)/0,80`, o sea de
combinar el 44 % de la caja con el 80 % del sprite. **Tres números que se sostienen entre sí y que
nadie vigila.** Declará `--alto-caja: 44%` en `.pantalla` (y `58%` en el bloque móvil) y que la
caja, el velo y el cálculo del sprite lo consuman. El velo pasa a
`calc(100% - var(--alto-caja) + 6%)` en la parada densa, que es el mismo desfase de 6 puntos que hay
hoy, ahora escrito.

**b) Acotar el sprite y anclarlo por arriba.** Hoy `height: 80%` con `bottom: 2%`. El problema no es
el 80 % sino que, anclado abajo, al crecer la ventana **se ve menos personaje**: la fracción visible
queda clavada en 47,5 % y la cabeza pasa a medir 283 px (31,3 % del alto de la ventana) a 1919×905.
Pasá a `height: min(80%, 680px)` y cambiá `bottom: 2%` por **`top: 18%`** (el mismo 18 % que hoy
sale implícito de `2% + 80%`). Con eso la fracción visible **crece** con la ventana: 47,5 % a
1280×800 (idéntico), 50,6 % a 1919×905, 60,4 % a 1080. Pasa de cabeza flotante a cabeza y torso.

**c) El reparto en dos columnas arriba de 1400 px.** Es el cambio que responde a la queja:

```css
/* Arriba de 1400 px de ancho la caja se reparte por dentro: la prosa a la izquierda, las
   acciones a la derecha. NO es la grilla de la fase anterior con el arte al costado —el texto
   sigue ENCIMA del arte y la caja sigue apoyada abajo a todo el ancho—; lo que se reparte es el
   interior de la caja. Es lo que hacen Roadwarden y Citizen Sleeper, que el diseño ya citaba.

   Medido a 1919x905 sobre `a1_taberna` (10 líneas de prosa, 7 opciones): apiladas, la prosa
   tiene 140 px para 314 y se ven 3 de 10 líneas y 3 de 7 opciones. Repartidas, la prosa se
   queda con los 349 px completos de la caja: 10,2 líneas. Se ve la encrucijada entera.

   El bono: `RollPanel` mide 271 px a escala 1 y 311 a 150 %, y el tope del 78 % le daba 236, o
   sea que NO ENTRABA NUNCA. Con el reparto tiene los 349 px enteros y entra en las dos escalas
   por primera vez. Los dos parches de scroll quedan como red para 1280, no como única defensa.

   El corte en 1400 y no en 1280: a 1280 el reparto dejaría la prosa en 820 px y las acciones en
   320, y las opciones con chips y probabilidades envuelven. Abajo del corte no cambia nada. */
@media (min-width: 1400px) {
  .caja { flex-direction: row; gap: var(--esp-6); }
  .acciones { flex: 0 0 clamp(320px, 32%, 460px); max-height: 100%; }
}
```

**La regla base no se toca**: `.acciones` conserva `max-height: 60%` y `.columna` conserva
`flex: 1 1 0`. Eso es lo que hace que los tests de la regla base sigan siendo ciertos.

**d) Centrar el contenido de la caja cuando NO está repartido.** Abajo de 1400 px la prosa sigue
cortando en la medida y quedando pegada a la izquierda. El género la centra: Ren'Py pone la columna
de diálogo en 1116 px de 1920 con **márgenes simétricos de 20,9 % por lado**. Usá
`padding-inline: max(var(--esp-7), (100% - 1440px) / 2)`. **Ojo con dos cosas o el remedio es peor
que la enfermedad:** `.placa` está clavada en `left: var(--esp-7)` y quedaría desprendida del texto
que nombra — tiene que llevar la misma expresión `max()`. (Detalle del género que vale copiar: la
placa de Ren'Py arranca 42 px **a la izquierda** de la columna de diálogo, no alineada con ella.)

**e) El encuadre del fondo.** Hoy `object-fit: cover` recorta distinto según la relación de aspecto:
a 1919×905 se come el 8,08 % de arriba **y** el 8,08 % de abajo, y es la única de las cinco medidas
donde pasa (1600×900 y 2560×1440 son 16:9 exacto y no pierden nada). El resultado es que la franja
que el artista sacrificó no es la que se sacrifica. Fijá `object-position` para que **lo que se
recorte sea siempre lo de abajo**, que es lo que la caja tapa igual. Empezá por `center top` y
**verificalo contra los doce fondos de la campaña**: si alguno pierde algo importante arriba,
decilo y proponé el valor medido.

- [ ] **Paso 1: los tests que fallan**

Reescribí las tres aserciones que se caen y agregá las nuevas. En `tests/ui/EscenaScreen.test.tsx`:

- `:631` `expect(caja).toMatch(/height\s*:\s*44%/)` → pasa a exigir que la caja consuma el token:
  `expect(caja).toMatch(/height\s*:\s*var\(--alto-caja\)/)`, más un caso nuevo que fije que
  `.pantalla` declara `--alto-caja: 44%`.
- `:669` `expect(sprite).toMatch(/height\s*:\s*80%/)` → `expect(sprite).toMatch(/height:\s*min\(80%/)`
  más `expect(sprite).toMatch(/top\s*:\s*18%/)` y **`expect(sprite).not.toMatch(/bottom\s*:/)`**, que
  es lo que impide que vuelva el anclaje de abajo sin que nadie se entere.
- `:701-703` (móvil) extrae `/height\s*:\s*(\d+)%/` y exige `> 44` → tiene que leer el
  `--alto-caja` del bloque móvil.

Y tres casos nuevos:

```ts
it('arriba de 1400 px la caja se reparte en dos columnas', () => {
  // Apiladas, a 1919x905 se ven 3 de 10 líneas de prosa y 3 de 7 opciones. Repartidas, la prosa
  // se queda con los 349 px completos de la caja: 10,2 líneas.
  // OJO: `bloqueDeMedia` LANZA si no encuentra la media query (tests/fixtures/css.ts:16), no
  // devuelve null. Así que la ausencia del bloque se afirma con `not.toThrow()`, no con
  // `not.toBeNull()`.
  expect(() => bloqueDeMedia(css, '@media (min-width: 1400px)')).not.toThrow();
  const ancha = bloqueDeMedia(css, '@media (min-width: 1400px)');
  expect(cuerpoDe(ancha, '.caja')).toMatch(/flex-direction\s*:\s*row/);
  expect(cuerpoDe(ancha, '.acciones')).toMatch(/max-height\s*:\s*100%/);
});

it('la regla base del reparto apilado NO se toca: es la que vale abajo de 1400', () => {
  expect(cuerpoDe(css, '.acciones')).toMatch(/max-height\s*:\s*60%/);
  expect(cuerpoDe(css, '.columna')).toMatch(/flex\s*:\s*1\s+1\s+0/);
});

it('la placa viaja con la prosa cuando el contenido se centra', () => {
  // Si el contenido de la caja se centra y la placa se queda clavada en 48px, la placa nombra a
  // un texto que arranca 190px más a la derecha. Es peor que el problema que vino a arreglar.
  const caja = cuerpoDe(css, '.caja') ?? '';
  const placa = cuerpoDe(css, '.placa') ?? '';
  const expresion = /max\(\s*var\(--esp-7\)/;
  expect(caja, 'la caja no centra su contenido').toMatch(expresion);
  expect(placa, 'la placa no acompaña al centrado de la caja').toMatch(expresion);
});
```

**`bloqueDeMedia()` busca la media query por `indexOf` del literal exacto** (`tests/fixtures/css.ts:14-15`),
así que hay que pasarle el string tal cual está escrito en el CSS.

- [ ] **Paso 2: correr y verificar que fallan**

- [ ] **Paso 3: implementar**, en el orden a → b → c → d → e.

- [ ] **Paso 4: verificar en el navegador, que es donde se juzga esta tarea**

Server propio verificado con curl. Llegá a **`a1_taberna`** (hablante Mausi, 10 líneas, 7 opciones),
que es la escena con la que se midió el problema. Medí por DOM, no a ojo:

1. A **1919×905**: `.columna` y `.acciones` con `scrollHeight` contra `clientHeight`. **Las dos
   tienen que dejar de scrollear.** Contá las líneas visibles y las opciones visibles.
2. A **1919×905 con `--escala-fuente: 1,5`**: cuántas líneas y cuántas opciones.
3. A **1280×800**: tiene que quedar **idéntico a hoy** (la media query no aplica). Confirmá el
   `font-size` del diálogo en 19 px y el alto de la caja en 352 px.
4. A **2560×1440** y a **375×812**: que nada se rompa.
5. Con una **tirada en curso** a 1919×905 y escala 1,5: medí si el `RollPanel` entra entero sin
   scroll, que es el bono de esta tarea.
6. Mirá los **ocho sprites** en las tres medidas de escritorio y decí si el encuadre nuevo mejora o
   empeora. Es el juicio más subjetivo de la tarea: los recortes se compusieron mirando el 47 %.
7. Mirá los **doce fondos** con el `object-position` nuevo.

- [ ] **Paso 5: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "feat(ui): en pantalla ancha la caja se reparte, y el sprite deja de ser una cabeza"
```

---

### Tarea 3: el hub

**Archivos:**
- Modificar: `src/ui/screens/HubScreen.tsx`, `src/ui/screens/HubScreen.module.css`,
  `src/ui/strings.es.ts`
- Test: `tests/ui/HubScreen.test.tsx`

**Interfaces:**
- Consume: los tokens de la tarea 1, el componente `Dialogo` y las capas de `tokens.css`.
- Produce: nada para las siguientes.

Hoy esta pantalla es un formulario, y las razones son concretas y medidas:

- **No menciona el nombre del juego.** `S.hub.titulo` es `'Campañas'`, una etiqueta de sección.
  `'Crónicas del Vado'` solo lo pinta `InicioScreen`.
- **No usa ninguno de los tokens de capa** que la fase anterior construyó (`--capa-arte`,
  `--capa-caja`, `--filo-acento`, `--borde-acento`…). El vocabulario visual del juego existe y esta
  pantalla está escrita en otro idioma.
- **Cero estados interactivos**: ni un `:hover`, ni una transición, ni una sombra en todo el archivo.
- **Bajo el encabezado, el contenido termina en x = 539,8 px en las cinco medidas**: a 1919×905
  queda el 71,9 % del ancho sin usar y el 87,2 % del primer viewport vacío.
- **La portada sale a 160×213 px desde un archivo de 900×1200** (17,8 %), por el
  `max-width: 160px` de `Imagen.module.css:13-16`, una regla escrita para otra pantalla.
  `EscenaScreen.module.css:41-47` demuestra que se anula desde afuera con el selector
  `[data-aspect]`; el hub no lo hace.
- **La grilla trabaja al revés**: `repeat(auto-fill, minmax(300px,1fr))` abre columnas vacías, así
  que la única tarjeta **se achica cuanto más grande la pantalla** (395 px a 1280 → 300 a 2560).
- **La acción destructiva pesa igual que la principal**: "Jugar con Bruno de Aldamar" y "Borrar a
  Bruno de Aldamar" son el mismo `styles.secundario`, pegados en un flex con 8 px de separación.
- **Quedan dos `window.confirm` nativos** (`HubScreen.tsx:192` y `:203`), los únicos que sobreviven
  en `src/`: arrancar una campaña que te puede matar el personaje se resuelve con el cuadro gris del
  sistema operativo, mientras el resto del juego usa `Dialogo`.
- **Sin jerarquía**: los títulos de sección miden 15 px, lo mismo que el cuerpo; la premisa de la
  campaña (91 palabras) sale a 15 px, más chica que el texto de una escena (19 px).
- **Un `<details><summary>` en la tarjeta de campaña**: un acordeón nativo es la señal más
  inequívoca de "panel de configuración".
- **El orden de lectura pone la administración del perfil antes del juego.**
- **No hay `<main>`**, a diferencia de `CreacionScreen` y `EscenaScreen`, y la `<ul>` de campañas es
  la única sección sin encabezado ni `aria-label`.

**Lo que hay que hacer**, con la convención del género: **el menú se construye sobre el arte**. La
portada a sangre detrás de todo, oscurecida con las capas que ya existen, el nombre del juego encima
como placa —no como encabezado de aplicación—, y el contenido en una columna acotada y **centrada**
sobre ella. Eso resuelve el 87 % de pantalla vacía sin inventar relleno: donde había fondo liso hay
cuadro. La campaña pasa a tarjeta grande con la imagen dominante. El bloque de personajes va después
del juego, no antes. La acción destructiva se separa y se nombra con su verbo.

**Lo que no se toca:** el tope de 3 personajes y su regla, el cálculo de dificultad relativa, la
advertencia de partida en curso, los textos que ya existen en `strings.es.ts` salvo los que se
agreguen, y el recorrido por teclado. **Buscá los tests de `tests/ui/HubScreen.test.tsx` antes de
empezar y nombralos en el informe**; los que fijan reglas de juego pasan sin modificarse.

- [ ] **Paso 1: los tests que fallan**

```ts
it('el nombre del juego está en la pantalla', () => {
  // Hoy el hub abre con "Campañas" —una etiqueta de sección— y el nombre del juego no aparece
  // en ningún lado: sólo lo pinta InicioScreen.
  render(<HubScreen />);
  expect(screen.getByText(/Crónicas del Vado/i)).toBeInTheDocument();
});

it('las dos confirmaciones son Dialogo y no el cuadro gris del sistema operativo', () => {
  // HubScreen.tsx:192 y :203 son los ÚNICOS window.confirm que quedan en src/. El momento más
  // dramático del hub —arrancar una campaña que te puede matar el personaje— se resolvía con el
  // diálogo nativo mientras el resto del juego usa `Dialogo`.
  const espia = vi.spyOn(window, 'confirm');
  render(<HubScreen />);
  fireEvent.click(screen.getByRole('button', { name: /Borrar a/i }));
  expect(espia, 'sigue usando window.confirm').not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('la portada no está capada al max-width pensado para otra pantalla', () => {
  // `Imagen.module.css:13-16` pone `max-width: 160px` a todo `[data-aspect='3:4']`. El archivo
  // es de 900x1200: la portada salía al 17,8 % de su fuente, igual en un monitor de 2560 que en
  // un teléfono. `EscenaScreen.module.css:41-47` demuestra que se anula desde afuera.
  const css = readFileSync(resolve(process.cwd(), 'src/ui/screens/HubScreen.module.css'), 'utf8');
  expect(css, 'el hub no anula el tope de 160px de Imagen.module.css').toMatch(/max-width\s*:\s*none/);
});

it('la pantalla declara su landmark y la lista de campañas tiene nombre', () => {
  // CreacionScreen y EscenaScreen abren <main>; el hub abría un <div> pelado. Y la <ul> de
  // campañas era la única sección sin encabezado ni aria-label.
  render(<HubScreen />);
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('list', { name: /campañ/i })).toBeInTheDocument();
});

it('borrar un personaje no se ve igual que jugar con él', () => {
  // Las dos acciones pasaban por `styles.secundario`, pegadas en un flex con 8px de separación:
  // borrar para siempre se veía idéntico a seleccionar.
  render(<HubScreen />);
  const jugar = screen.getByRole('button', { name: /Jugar con/i });
  const borrar = screen.getByRole('button', { name: /Borrar a/i });
  expect(borrar.className, 'borrar y jugar comparten clase').not.toBe(jugar.className);
});
```

- [ ] **Paso 2: correr y verificar que fallan**

- [ ] **Paso 3: implementar**

- [ ] **Paso 4: verificar en el navegador** a 1919×905, 1280×800, 2560×1440 y 375×812, con la
consola abierta. Medí el porcentaje de ancho usado y el de viewport vacío, que son los números que
esta tarea vino a mover, y ponelos en el informe contra los de hoy (28,1 % y 12,8 %).

- [ ] **Paso 5: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "feat(ui): el hub se construye sobre el arte, no sobre un formulario"
```

---

### Tarea 4: la creación de personaje

**Archivos:**
- Modificar: `src/ui/screens/CreacionScreen.tsx`, `src/ui/screens/CreacionScreen.module.css`,
  `src/ui/strings.es.ts`
- Test: `tests/ui/CreacionScreen.test.tsx`

**Interfaces:**
- Consume: los tokens de la tarea 1.
- Produce: nada.

**Primero los cuatro bugs, que son la causa mecánica de que se vea rota**, y cada uno con un test que
muerde:

1. **`.tarjeta { all: unset }`** (`CreacionScreen.module.css:75`) pisa el
   `*{box-sizing:border-box}` global de `tokens.css:122-126` y devuelve la tarjeta a `content-box`.
   Con `height: 100%` más 12 px de relleno por lado y 1 px de borde, **el botón desborda su celda
   26,0 px y se mete 14,0 px dentro de la tarjeta de la fila siguiente**. Pasa en los pasos 1 y 3 y
   en las cinco medidas. Se arregla con `box-sizing: border-box` después del `all: unset`.
2. **El `<p class="motivo">` es hermano del `<button>`** dentro del mismo `<li>`
   (`CreacionScreen.tsx:384-388`): como el botón ya ocupa el 100 % más los 26 px, el párrafo cae
   fuera de la celda — 89 px de texto colgando. Es el "No se puede: Engaño es la Debilidad del
   Clérigo…" suelto de la captura. El motivo va **adentro** de la tarjeta.
3. **El id del archivo se le muestra al jugador**: `CreacionScreen.tsx:301` pinta como texto
   **visible** `S.creacion.retratoEtiqueta(id)`, que es `Retrato ${id.replace('_',' ')}` → "Retrato
   clerigo 01". Sirve como `alt`; debajo de la miniatura se lee como una planilla. Que siga siendo
   el nombre accesible y deje de ser texto a la vista.
4. **Lo deshabilitado es un callejón sin salida.** El botón lleva `disabled` nativo
   (`CreacionScreen.tsx:377`), así que sale del orden de tabulación y **un jugador de teclado nunca
   enfoca la tarjeta y por lo tanto nunca escucha el `aria-describedby`** que explica por qué no
   puede elegirla. Usá `aria-disabled` con el control enfocable, o llevá el motivo a un lugar que el
   teclado alcance. **Este punto es de accesibilidad, no de estética: no lo saltees.**

**Y después el rediseño: una pregunta por pantalla, con el arte grande.** Hoy los cuatro pasos viven
en una columna de 720 px centrada —**la única pantalla del juego con cero reglas `@media`**— que a
1919×905 deja 1199 px (62,5 %) de margen muerto y el 72,4 % del viewport vacío. Con una sola pregunta
a la vez, el retrato puede ser enorme: hay **20 retratos generados que hoy se muestran a 160 px**.

Además:
- **El mismo motivo se repite seis veces**: con dos rasgos elegidos, los otros seis pintan cada uno
  su propio párrafo idéntico ("Ya elegiste dos rasgos. Soltá uno si querés cambiarlo."). Uno solo,
  donde el jugador está mirando.
- **Cuatro clases de mensaje se ven iguales**: una regla dura del juego y un aviso de cupo usan la
  misma itálica ámbar de 13 px.
- **El título se imprime dos veces** a dos líneas de distancia (`:158` y `:164`, el mismo string).
- **La barra de progreso se contradice**: pinta 25 % en el paso 1 mientras `aria-valuenow={1}` es el
  mínimo, o sea 0 %.
- **La tipografía de la tarjeta está aplanada a 13 px** para todo, y los tres datos distintos de una
  clase (atributo, Poder, Debilidad) usan la misma clase `.linea`.
- **El paso 3 no tiene arte**: son ocho cajitas de texto en una página de 1920 px.

**Lo que NO se toca:** la regla de identidad visible, las incompatibilidades entre rasgos y
Debilidades, el orden de los cuatro pasos, y los textos de contenido. Se rediseña **cómo se ven**,
no qué preguntan. **Los tests que fijan esas reglas pasan sin modificarse**; buscalos y nombralos.
Ojo con `tests/ui/CreacionScreen.test.tsx:153`, que usa `getAllByText(...).length > 0` y por lo
tanto **tolera** las seis repeticiones: si dejás un solo motivo, ese test sigue pasando sin avisar
que el problema se arregló. Agregá el que lo fije.

- [ ] **Paso 1: los tests que fallan** — los cuatro bugs primero, cada uno con su caso:

```ts
it('la tarjeta respeta el box-sizing global y no desborda su celda', () => {
  // `all: unset` pisa el `*{box-sizing:border-box}` de tokens.css:122-126 y devuelve la tarjeta
  // a content-box. Con `height:100%` + 12px de padding por lado + 1px de borde, el botón medía
  // 185,7px en una celda de 159,7: desbordaba 26,0px y con `gap:12px` se metía 14,0px DENTRO de
  // la tarjeta de la fila siguiente. Es la causa mecánica de "parecen mal acomodadas".
  const css = readFileSync(resolve(process.cwd(), 'src/ui/screens/CreacionScreen.module.css'), 'utf8');
  const tarjeta = cuerpoDe(css, '.tarjeta') ?? '';
  expect(tarjeta, '.tarjeta no tiene regla propia').not.toBe('');
  const posUnset = tarjeta.indexOf('all:');
  const posBox = tarjeta.indexOf('box-sizing:');
  expect(posBox, '.tarjeta no declara box-sizing').toBeGreaterThan(-1);
  if (posUnset > -1) {
    expect(posBox, 'box-sizing va ANTES de `all: unset`, así que no lo repara').toBeGreaterThan(posUnset);
  }
  expect(tarjeta).toMatch(/box-sizing\s*:\s*border-box/);
});

it('el motivo de un rasgo bloqueado vive DENTRO de la tarjeta, no como hermano del botón', () => {
  // Como hermano del <button> y con el botón ocupando el 100% (+26px), el <p> caía fuera del
  // <li>: 89px de texto colgando. Es el "No se puede: Engaño es la Debilidad del Clérigo..."
  // suelto de la captura.
  render(<CreacionScreen />);
  // ...llegar al paso 3 y encontrar una tarjeta bloqueada...
  const motivo = screen.getByText(/No se puede/i);
  const tarjeta = motivo.closest('button, [role="button"]');
  expect(tarjeta, 'el motivo quedó fuera de la tarjeta que explica').not.toBeNull();
});

it('el id del archivo del retrato no es texto visible para el jugador', () => {
  // CreacionScreen.tsx:301 pintaba `Retrato clerigo 01` como texto A LA VISTA debajo de cada
  // miniatura: es el id del archivo, no un nombre. Tiene que seguir siendo nombre accesible.
  render(<CreacionScreen />);
  // ...llegar al paso del retrato...
  expect(screen.queryByText(/^Retrato \w+ \d+$/)).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Retrato/i }).length).toBeGreaterThan(0);
});

it('una opción bloqueada se puede enfocar con el teclado y dice por qué', () => {
  // Con `disabled` nativo el botón sale del orden de tabulación, así que un jugador de teclado
  // NUNCA lo enfoca y por lo tanto nunca escucha el `aria-describedby` que explica el bloqueo.
  // Es un callejón sin salida de accesibilidad, no un detalle estético.
  render(<CreacionScreen />);
  // ...llegar al paso 3 con una tarjeta bloqueada...
  const bloqueada = screen.getByRole('button', { name: /Contrabandista/i });
  expect(bloqueada).not.toBeDisabled();
  expect(bloqueada).toHaveAttribute('aria-disabled', 'true');
  bloqueada.focus();
  expect(bloqueada).toHaveFocus();
  expect(bloqueada).toHaveAccessibleDescription(/Debilidad/i);
});

it('el motivo de cupo aparece UNA vez, no seis', () => {
  // Con dos rasgos elegidos, los otros seis pintaban cada uno su propio párrafo idéntico.
  // `tests/ui/CreacionScreen.test.tsx:153` usa `getAllByText(...).length > 0`, que TOLERA las
  // seis repeticiones: por eso hace falta este caso además de aquel.
  render(<CreacionScreen />);
  // ...llegar al paso 3 y elegir dos rasgos...
  expect(screen.getAllByText(/Ya elegiste dos rasgos/i)).toHaveLength(1);
});
```

- [ ] **Paso 2: correr y verificar que fallan**
- [ ] **Paso 3: implementar**
- [ ] **Paso 4: verificar en el navegador** los cuatro pasos a 1919×905, 1280×800, 2560×1440 y
375×812. Medí el desborde de las tarjetas: tiene que ser **0 px**, contra los 26 de hoy.
- [ ] **Paso 5: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "feat(ui): una pregunta por pantalla, y las tarjetas dejan de solaparse"
```

---

### Tarea 5: verificación y cierre

**Archivos:** `tools/captura.mts`, `docs/captura-escena.png`, `README.md` si hace falta.

- [ ] **Paso 1: una partida entera a 1919×905**, con la consola abierta. Los ocho puntos del §6 del
diseño, uno por uno, con evidencia. Cero errores de consola.

- [ ] **Paso 2: lo mismo a 1280×800, 2560×1440 y 375×812**, y a `--escala-fuente` 1,25 y 1,5.

- [ ] **Paso 3: la captura del README.** `tools/captura.mts` elige `a1_orell_mesa` a 1280×970 porque
con el layout viejo **ninguna escena con hablante entraba entera** a una medida razonable
(`p_puente` pedía ~2070 px de alto). **Con el reparto en dos columnas eso cambia**: volvé a medir y,
si ahora entra una escena que muestre además el sistema de tiradas, cambiá la ruta y actualizá el
comentario y el `alt` del README. Si no entra, dejala como está y escribí el número.

- [ ] **Paso 4: el circuito completo**

```bash
npm test && npx tsc --noEmit && npm run validate && npm run build
```

- [ ] **Paso 5: commitear**

```bash
git add -A
git commit -m "docs: la captura muestra el layout de pantalla ancha"
```
