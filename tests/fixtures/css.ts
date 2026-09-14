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

/** Regla suelta tal como sale del barrido: selector y cuerpo, los dos ya sin comentarios. */
export interface Regla {
  selector: string;
  cuerpo: string;
}

/**
 * Cada regla `selector { cuerpo }` de una hoja, sin comentarios en ninguno de los dos lados.
 *
 * El barrido es por texto y no por un parser de verdad: alcanza porque lo único que se le
 * pregunta a una hoja de este repo es si una declaración está escrita o no.
 *
 * El selector se corta **después del último `;`** de lo que haya entre dos reglas. Sin eso, una
 * regla-@ de una sola línea se pega adelante y el selector deja de coincidir: con
 * `@import "otra.css";` arriba de todo, el selector de la primera regla salía
 * `@import"otra.css";.x` y `cuerpoDe(css, '.x')` devolvía `null` en silencio.
 */
function reglasDe(css: string): Regla[] {
  const reglas: Regla[] = [];
  for (const [, sel = '', cuerpo = ''] of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const limpio = sinComentarios(sel);
    reglas.push({ selector: limpio.slice(limpio.lastIndexOf(';') + 1).trim(), cuerpo: sinComentarios(cuerpo).trim() });
  }
  return reglas;
}

/**
 * Cuerpo del primer bloque `@media (...)` de una hoja de estilos que empieza con `media`
 * (p.ej. `@media (max-width: 800px)`), contando llaves: adentro hay varias reglas propias, así
 * que cortar en la primera `}` que aparece se queda corto.
 *
 * **Devuelve el texto CRUDO, comentarios incluidos**, y es el único de este archivo que lo hace:
 * varios casos leen un bloque entero a propósito. Para preguntar por una regla de adentro,
 * pasale el resultado a `cuerpoDe` o a `reglasPara`, que sí limpian.
 */
export function bloqueDeMedia(css: string, media: string): string {
  const inicio = css.indexOf(media);
  if (inicio === -1) throw new Error(`no se encontró "${media}"`);
  const apertura = css.indexOf('{', inicio);
  let profundidad = 0;
  let fin = apertura;
  for (; fin < css.length; fin++) {
    if (css[fin] === '{') profundidad++;
    else if (css[fin] === '}') {
      profundidad -= 1;
      if (profundidad === 0) break;
    }
  }
  return css.slice(apertura + 1, fin);
}

/**
 * Cuerpo de la regla cuyo selector es EXACTAMENTE `selector`, sin comentarios ni espacios.
 *
 * Devuelve la PRIMERA que coincide y **no distingue niveles**: una regla escrita adentro de un
 * `@media` coincide igual. Cuando la hoja declara el mismo selector dos veces —la base y su
 * redefinición de teléfono o de movimiento reducido— eso hace que un caso pueda pasar en verde
 * contra la versión equivocada. Para esos usá `cuerpoBaseDe`.
 */
export function cuerpoDe(css: string, selector: string): string | null {
  for (const regla of reglasDe(css)) {
    if (regla.selector.replace(/\s+/g, '') === selector) return regla.cuerpo;
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
    let profundidad = 0;
    let fin = apertura.index + apertura[0].length - 1;
    for (; fin < limpio.length; fin++) {
      if (limpio[fin] === '{') profundidad += 1;
      else if (limpio[fin] === '}') {
        profundidad -= 1;
        if (profundidad === 0) break;
      }
    }
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
 */
export function reglasPara(bloque: string, selector: string): string[] {
  return reglasDe(bloque)
    .filter((regla) => regla.selector.replace(/\s+/g, '').split(',').includes(selector))
    .map((regla) => regla.cuerpo);
}

/**
 * Las reglas de una hoja cuyo selector NOMBRA `fragmento` (una clase, un atributo, lo que sea).
 *
 * Es el barrido ancho, para los casos que preguntan "¿quién le pone `max-width` a esto?" sin
 * saber de antemano con qué selector. Devuelve selector y cuerpo porque el selector es la mitad
 * de la respuesta: un caso que solo mire cuerpos no distingue una regla que alcanza al elemento
 * de una que no le pega a nada.
 */
export function reglasQueTocan(css: string, fragmento: string): Regla[] {
  return reglasDe(css).filter((regla) => regla.selector.includes(fragmento));
}
