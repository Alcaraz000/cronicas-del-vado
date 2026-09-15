/**
 * Utilidades para tests que leen un `*.module.css` crudo y verifican la DECLARACIÓN de una
 * regla, no el resultado: jsdom no evalúa `@media` ni calcula layout, así que un test de CSS
 * acá es necesariamente de texto. El paso que manda para confirmar un cambio de layout es
 * jugarlo en un navegador de verdad (ver el informe de la Fase H, tarea 5) — esto solo evita
 * que una línea que un test así SÍ puede fijar se borre en silencio.
 *
 * **Las cinco funciones de este archivo estaban repartidas en tres lugares** (acá,
 * `HubScreen.test.tsx` y `CreacionScreen.test.tsx`), escritas por tres tareas que no podían
 * tocar el fixture compartido porque había otro agente en el árbol. Se juntaron en el cierre de
 * la fase del escalado. Cuál usar:
 *
 * | quiero… | uso |
 * |---|---|
 * | el cuerpo de una regla, esté donde esté | `cuerpoDe` |
 * | el cuerpo de la regla BASE, ignorando `@media`/`@supports`/`@layer` | `cuerpoBaseDe` |
 * | las reglas de un bloque que le pegan EXACTAMENTE a un selector | `reglasPara` |
 * | todas las reglas cuyo selector NOMBRA algo (una clase, un atributo) | `reglasQueTocan` |
 * | el texto crudo de un bloque `@media`, comentarios incluidos | `bloqueDeMedia` |
 *
 * Todas devuelven **cuerpos y selectores sin comentarios** menos `bloqueDeMedia`, que es un
 * extractor de texto crudo a propósito. El porqué está en `sinComentarios`.
 *
 * **Este archivo es el punto único de falla de casi todos los tests de CSS del repo.** Si un
 * helper miente, decenas de casos pasan en verde sobre código roto — que es exactamente lo que
 * pasó cinco veces en la fase del escalado. Por eso el barrido es explícito (un escáner que
 * cuenta llaves, respeta comillas e ignora comentarios) y no un regex de una línea, y por eso
 * el fixture tiene sus propios tests en `css.test.ts`, cada uno con una hoja adversaria.
 */

/**
 * Un CSS sin sus comentarios.
 *
 * No es cosmética: en este repo los comentarios citan el código que reemplazaron ("era
 * `width: 100%`, y con eso…"), así que un `not.toMatch()` contra el cuerpo crudo falla por el
 * comentario mientras la regla está bien, y —peor— un `toMatch()` puede pasar en verde contra
 * una declaración que solo existe adentro de uno. Las dos formas de mentir salen de lo mismo,
 * así que se cortan acá y no en cada caso. Ya mordió dos veces en la fase del escalado: una en
 * `cuerpoDe` (tarea 2) y otra en `reglasQueTocan` (tarea 4), esta última adentro del caso
 * escrito para tapar el agujero anterior.
 */
function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * La misma hoja con cada comentario reemplazado por **espacios de su mismo largo**, así los
 * índices no se mueven ni un carácter.
 *
 * Es lo que le deja a `bloqueDeMedia` buscar sin ver los comentarios y seguir devolviendo el
 * texto CRUDO del original, que es su contrato. Sin esto, un comentario que nombra una media
 * query antes del bloque real —y este repo los tiene: `CreacionScreen.module.css` nombra
 * `@media` en su cabecera y `EscenaScreen.module.css` nombra `@media (min-width: 1400px)` en
 * la prosa de una regla— hacía que el helper cortara desde ahí y devolviera el cuerpo de una
 * regla base cualquiera **sin lanzar**. Es el mismo agujero que la tarea 5 le tapó a
 * `sinBloquesAnidados`, diez líneas más abajo.
 */
function comentariosEnBlanco(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, (comentario) => ' '.repeat(comentario.length));
}

/** Regla suelta tal como sale del barrido: selector y cuerpo, los dos ya sin comentarios. */
export interface Regla {
  selector: string;
  cuerpo: string;
}

/** Un bloque `prelusio { cuerpo }` ubicado por índices dentro del texto que lo contiene. */
interface Bloque {
  /** Primer carácter después del bloque anterior de este nivel (o 0): ahí arranca el prelusio. */
  desde: number;
  /** Índice de la `{` que abre el bloque. */
  apertura: number;
  /** Índice de la `}` que lo cierra. */
  cierre: number;
}

/**
 * Los bloques del NIVEL DE ARRIBA de un texto CSS, contando llaves y respetando comillas.
 *
 * Es el reemplazo del barrido por regex `/([^{}]*)\{([^{}]*)\}/g`, que tenía dos agujeros que
 * ningún test podía ver desde afuera:
 *
 * - **una regla que contiene otra queda INVISIBLE ENTERA.** El `[^{}]*` del cuerpo no puede
 *   cruzar la llave de la regla de adentro, así que con anidamiento CSS nativo
 *   (`.padre { color: red; .hijo { … } }`) el barrido devolvía `.hijo` y `.padre` no existía:
 *   todo `toBeNull()` y todo `not.toMatch()` sobre el padre pasaba **en el vacío**.
 * - una llave adentro de una cadena (`content: "}"`) partía la regla al medio.
 *
 * Un bloque que nunca cierra no se emite, y el que lo necesita —`bloqueDeMedia`— lo convierte
 * en un error en vez de devolver "hasta el final del archivo".
 */
function bloquesDeNivel(css: string): Bloque[] {
  const bloques: Bloque[] = [];
  let desde = 0;
  let apertura = -1;
  let profundidad = 0;
  let comilla = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (comilla !== '') {
      if (c === '\\') i += 1;
      else if (c === comilla) comilla = '';
    } else if (c === '"' || c === "'") {
      comilla = c;
    } else if (c === '{') {
      if (profundidad === 0) apertura = i;
      profundidad += 1;
    } else if (c === '}' && profundidad > 0) {
      profundidad -= 1;
      if (profundidad === 0) {
        bloques.push({ desde, apertura, cierre: i });
        desde = i + 1;
      }
    }
  }
  return bloques;
}

/**
 * Índice de la `}` que cierra la `{` de `apertura`, o `-1` si la hoja no la cierra nunca.
 * Cuenta llaves y respeta comillas, igual que `bloquesDeNivel`.
 */
function cierreDe(css: string, apertura: number): number {
  let profundidad = 0;
  let comilla = '';
  for (let i = apertura; i < css.length; i++) {
    const c = css[i];
    if (comilla !== '') {
      if (c === '\\') i += 1;
      else if (c === comilla) comilla = '';
    } else if (c === '"' || c === "'") {
      comilla = c;
    } else if (c === '{') {
      profundidad += 1;
    } else if (c === '}') {
      profundidad -= 1;
      if (profundidad === 0) return i;
    }
  }
  return -1;
}

/**
 * El selector de un bloque: lo que hay entre el bloque anterior y la `{`, cortado **después del
 * último `;`**.
 *
 * Sin ese corte, una regla-@ de una sola línea se pega adelante y el selector deja de coincidir:
 * con `@import "otra.css";` arriba de todo, el selector de la primera regla salía
 * `@import"otra.css";.x` y `cuerpoDe(css, '.x')` devolvía `null` en silencio.
 */
function selectorDe(prelusio: string): string {
  return prelusio.slice(prelusio.lastIndexOf(';') + 1).trim();
}

/**
 * Las declaraciones PROPIAS de un cuerpo: lo mismo, pero sin las reglas anidadas adentro.
 *
 * Con anidamiento nativo, `.padre { color: red; .hijo { color: blue; } }` declara una sola cosa
 * —`color: red`— y `color: blue` es del hijo. Devolver el cuerpo entero haría que un
 * `toMatch(/color:\s*blue/)` contra el padre pasara en verde por una declaración que no es suya.
 */
function declaracionesPropias(cuerpo: string): string {
  const anidados = bloquesDeNivel(cuerpo);
  const ultimo = anidados.at(-1);
  if (ultimo === undefined) return cuerpo;
  let salida = '';
  for (const { desde, apertura } of anidados) {
    // Lo que viene antes del último `;` son declaraciones del padre; lo que viene después es el
    // selector del hijo, que se va con su bloque.
    const prelusio = cuerpo.slice(desde, apertura);
    salida += prelusio.slice(0, prelusio.lastIndexOf(';') + 1);
  }
  return salida + cuerpo.slice(ultimo.cierre + 1);
}

/**
 * Cada regla `selector { cuerpo }` de una hoja, sin comentarios en ninguno de los dos lados y a
 * **cualquier profundidad**: las de adentro de un `@media`, las de adentro de un `@supports` y
 * las anidadas bajo otra regla salen todas, en el orden en que están escritas (el padre antes
 * que sus hijos).
 *
 * El barrido es por texto y no por un parser de verdad: alcanza porque lo único que se le
 * pregunta a una hoja de este repo es si una declaración está escrita o no.
 *
 * Una regla-@ **no se emite como regla**: no declara nada por sí misma y su prelusio no es un
 * selector. Lo que se emite son las reglas de adentro, que es lo que hace que `cuerpoDe`
 * encuentre una regla escrita dentro de un `@media` — su contrato, y el motivo de que exista
 * `cuerpoBaseDe`.
 */
function reglasDe(css: string): Regla[] {
  return reglasDeLimpio(sinComentarios(css));
}

/** El barrido de verdad, sobre un texto al que ya se le sacaron los comentarios. */
function reglasDeLimpio(css: string): Regla[] {
  const reglas: Regla[] = [];
  for (const { desde, apertura, cierre } of bloquesDeNivel(css)) {
    const selector = selectorDe(css.slice(desde, apertura));
    const cuerpo = css.slice(apertura + 1, cierre);
    if (!selector.startsWith('@')) {
      reglas.push({ selector, cuerpo: declaracionesPropias(cuerpo).trim() });
    }
    reglas.push(...reglasDeLimpio(cuerpo));
  }
  return reglas;
}

/**
 * Un selector comparable: espacios colapsados a uno solo y sacados de alrededor de los
 * combinadores (`>`, `+`, `~`) y de las comas.
 *
 * **El espacio que queda es el combinador de descendiente, y se respeta**: `.a .b` (un `.b`
 * adentro de un `.a`) y `.a.b` (un elemento que tiene las dos clases) son selectores distintos
 * y le pegan a cosas distintas. El normalizador anterior borraba TODO el espacio, así que los
 * confundía: `cuerpoDe(css, '.a.b')` devolvía el cuerpo de `.a .b` y viceversa. Un test podía
 * pedir el compuesto, recibir el descendiente y quedar en verde con la regla que dice vigilar
 * escrita de la otra forma —o, peor, dejar de morder si un día alguien cambiaba una por la otra,
 * que es justo el cambio que rompe la pantalla—.
 */
function normalizarSelector(selector: string): string {
  return selector
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~,])\s*/g, '$1')
    .trim();
}

/**
 * Cuerpo CRUDO (comentarios incluidos) del primer bloque `@media (...)` de una hoja que empieza
 * con `media` (p.ej. `@media (max-width: 800px)`), contando llaves: adentro hay varias reglas
 * propias, así que cortar en la primera `}` que aparece se queda corto.
 *
 * **La búsqueda es ciega a los comentarios y el resultado no**: se busca sobre una copia con los
 * comentarios en blanco (ver `comentariosEnBlanco`) y se corta sobre el original. Así un
 * comentario que nombra la media query antes del bloque real no se lleva puesta la respuesta, y
 * los casos que leen un bloque entero a propósito siguen viendo su texto tal cual está escrito.
 * Para preguntar por una regla de adentro, pasale el resultado a `cuerpoDe` o a `reglasPara`,
 * que sí limpian.
 *
 * **Lanza** si no encuentra la media query, si lo que encuentra no abre ningún bloque o si el
 * bloque no cierra. Lo último no es teórico: con las llaves desbalanceadas el helper anterior
 * devolvía **desde la media query hasta el final del archivo**, o sea la hoja entera disfrazada
 * de bloque, y cualquier `toMatch` contra ella pasaba por lo que dijera cualquier otra regla.
 */
export function bloqueDeMedia(css: string, media: string): string {
  const ciego = comentariosEnBlanco(css);
  const inicio = ciego.indexOf(media);
  if (inicio === -1) throw new Error(`no se encontró "${media}"`);
  const apertura = ciego.indexOf('{', inicio);
  if (apertura === -1) throw new Error(`"${media}" no abre ningún bloque`);
  const fin = cierreDe(ciego, apertura);
  if (fin === -1) throw new Error(`el bloque de "${media}" no cierra: llaves desbalanceadas`);
  return css.slice(apertura + 1, fin);
}

/**
 * Cuerpo de la regla cuyo selector es EXACTAMENTE `selector`, sin comentarios ni espacios de
 * más (ver `normalizarSelector`: el espacio de descendiente SÍ cuenta).
 *
 * Devuelve la PRIMERA que coincide y **no distingue niveles**: una regla escrita adentro de un
 * `@media` coincide igual. Cuando la hoja declara el mismo selector dos veces —la base y su
 * redefinición de teléfono o de movimiento reducido— eso hace que un caso pueda pasar en verde
 * contra la versión equivocada. Para esos usá `cuerpoBaseDe`.
 */
export function cuerpoDe(css: string, selector: string): string | null {
  const buscado = normalizarSelector(selector);
  for (const regla of reglasDe(css)) {
    if (normalizarSelector(regla.selector) === buscado) return regla.cuerpo;
  }
  return null;
}

/**
 * Apertura de un bloque de regla-@: `@` + nombre + lo que venga **sin `;` ni `{` en el medio** +
 * la llave.
 *
 * Los dos caracteres excluidos son los que separan un bloque de lo que no lo es:
 *
 * - un `@import "otra.css";` o un `@charset "utf-8";` terminan en `;` **antes** de cualquier
 *   llave, así que no matchean y no se llevan puesta la regla que viene después;
 * - un `@` suelto adentro de una declaración (`content: "@";`) no lleva `[\w-]+` detrás, así que
 *   tampoco matchea.
 *
 * El helper del que esto viene trataba **cualquier** `@` como apertura de bloque y las dos
 * formas de arriba le comían la regla siguiente en silencio.
 */
const APERTURA_DE_BLOQUE_AT = /@[\w-]+[^;{]*\{/g;

/**
 * La hoja sin sus bloques `@…{ }`: queda solo el nivel de arriba, que es donde viven las reglas
 * base.
 *
 * Sirve para lo que `cuerpoDe` no puede: varios archivos declaran el mismo selector dos veces
 * —la base y su redefinición adentro de un `@media`— y `cuerpoDe` devuelve la primera que
 * encuentre. Probado en la fase del escalado: borrar `.tarjeta:hover` de la base dejaba los 24
 * casos del hub en verde porque `cuerpoDe` encontraba el `.tarjeta:hover` del bloque de
 * `prefers-reduced-motion`; y mover el `box-sizing` de `.tarjeta` adentro del bloque de teléfono
 * dejaba el caso de la creación en verde con la regla base rota.
 *
 * **Los comentarios se van primero**, y eso arregla el tercer agujero del helper que reemplaza:
 * aquel cortaba la hoja por el texto `@media` **en cualquier parte**, así que un comentario que
 * lo nombrara se llevaba todo lo que venía después. No es hipotético:
 * `CreacionScreen.module.css` nombra `@media` en su comentario de cabecera, antes de la primera
 * regla. Y como lo que se saca son bloques y no "de acá hasta el final", una regla base escrita
 * DESPUÉS de un `@media` —que aquel dejaba invisible— sigue estando.
 *
 * Saca `@media`, `@supports` (que `tokens.css` tiene), `@layer` y también `@keyframes`, que es
 * lo correcto: sus `from {}` / `to {}` se leerían como reglas sueltas.
 */
export function sinBloquesAnidados(css: string): string {
  const limpio = sinComentarios(css);
  let salida = '';
  let i = 0;
  for (;;) {
    APERTURA_DE_BLOQUE_AT.lastIndex = i;
    const apertura = APERTURA_DE_BLOQUE_AT.exec(limpio);
    if (apertura === null) {
      salida += limpio.slice(i);
      return salida;
    }
    salida += limpio.slice(i, apertura.index);
    const fin = cierreDe(limpio, apertura.index + apertura[0].length - 1);
    // Un bloque-@ que no cierra se lleva todo lo que queda, que es lo correcto: no hay ninguna
    // regla base después de él, porque después de él no hay nada cerrado.
    if (fin === -1) return salida;
    i = fin + 1;
  }
}

/** Cuerpo de la regla BASE de `selector`: la del nivel de arriba, fuera de todo bloque `@`. */
export function cuerpoBaseDe(css: string, selector: string): string | null {
  return cuerpoDe(sinBloquesAnidados(css), selector);
}

/**
 * Los cuerpos de TODAS las reglas de `bloque` cuyo selector incluye a `selector` como una de sus
 * partes separadas por coma.
 *
 * `cuerpoDe` pide el selector entero y a veces hace falta lo contrario: adentro del bloque de
 * movimiento reducido del hub, cinco clases comparten una sola regla (`.tarjeta, .jugar, …`), así
 * que preguntar por `.tarjeta` sola con `cuerpoDe` devuelve `null` y preguntar por el bloque
 * entero con un `toMatch` es ciego a QUÉ selector recibe la declaración — que es justo el agujero
 * que este helper cierra (sacar `.tarjeta` de la lista y dejar las declaraciones en otro selector
 * quedaba en verde, con la tarjeta animando para quien pidió que no).
 *
 * La comparación es por parte NORMALIZADA, no por texto pelado: `.a .b` y `.a.b` son distintos
 * (ver `normalizarSelector`).
 */
export function reglasPara(bloque: string, selector: string): string[] {
  const buscado = normalizarSelector(selector);
  return reglasDe(bloque)
    .filter((regla) => regla.selector.split(',').some((parte) => normalizarSelector(parte) === buscado))
    .map((regla) => regla.cuerpo);
}

/**
 * Las reglas de una hoja cuyo selector NOMBRA `fragmento` (una clase, un atributo, lo que sea).
 *
 * Es el barrido ancho, para los casos que preguntan "¿quién le pone `max-width` a esto?" sin
 * saber de antemano con qué selector. Devuelve selector y cuerpo porque el selector es la mitad
 * de la respuesta: un caso que solo mire cuerpos no distingue una regla que alcanza al elemento
 * de una que no le pega a nada.
 *
 * **Barre la hoja ENTERA, bloques `@` incluidos.** Si lo que se quiere fijar es que una
 * declaración esté en la regla BASE —y casi siempre lo es, porque lo que se rompe es que alguien
 * la mueva adentro de un `@media` y deje de valer en la ventana donde importa—, pasale
 * `sinBloquesAnidados(css)` en vez de `css`.
 */
export function reglasQueTocan(css: string, fragmento: string): Regla[] {
  return reglasDe(css).filter((regla) => regla.selector.includes(fragmento));
}
