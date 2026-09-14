/**
 * Utilidades para tests que leen un `*.module.css` crudo y verifican la DECLARACIÓN de una
 * regla, no el resultado: jsdom no evalúa `@media` ni calcula layout, así que un test de CSS
 * acá es necesariamente de texto. El paso que manda para confirmar un cambio de layout es
 * jugarlo en un navegador de verdad (ver el informe de la Fase H, tarea 5) — esto solo evita
 * que una línea que un test así SÍ puede fijar se borre en silencio.
 */

/**
 * Cuerpo del primer bloque `@media (...)` de una hoja de estilos que empieza con `media`
 * (p.ej. `@media (max-width: 800px)`), contando llaves: adentro hay varias reglas propias, así
 * que cortar en la primera `}` que aparece se queda corto.
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
 * **El cuerpo vuelve sin comentarios**, y eso no es cosmética: en este repo los comentarios citan
 * el código que reemplazaron ("era `width: 100%`, y con eso…"), así que un `not.toMatch()` contra
 * el cuerpo crudo falla por el comentario mientras la regla está bien, y —peor— un `toMatch()`
 * puede pasar en verde contra una declaración que solo existe adentro de un comentario. Las dos
 * formas de mentir salen de lo mismo, así que se cortan acá y no en cada caso.
 */
export function cuerpoDe(css: string, selector: string): string | null {
  const sinComentarios = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, sel = '', cuerpo = ''] of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if (sinComentarios(sel).replace(/\s+/g, '') === selector) return sinComentarios(cuerpo);
  }
  return null;
}
