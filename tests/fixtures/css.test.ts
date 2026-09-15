import { describe, expect, it } from 'vitest';
import { bloqueDeMedia, cuerpoBaseDe, cuerpoDe, reglasPara, reglasQueTocan, sinBloquesAnidados } from './css';

/**
 * Los helpers de `css.ts` los usan diez archivos de test para fijar líneas de CSS que jsdom no
 * puede evaluar. O sea que **un agujero acá afloja todos esos casos a la vez y en silencio**: la
 * fase del escalado encontró cinco pruebas-que-no-muerden y dos de ellas eran de estos helpers
 * (el cuerpo que volvía con los comentarios adentro, y la regla del `@media` devuelta como si
 * fuera la base). Por eso el fixture tiene casos propios.
 *
 * Las hojas de acá abajo son mínimas y están escritas para el agujero que cada caso cierra, no
 * para parecerse a un `*.module.css` del repo.
 */
describe('fixtures/css', () => {
  describe('cuerpoDe', () => {
    it('devuelve el cuerpo sin comentarios, así un toMatch no puede pasar por una frase comentada', () => {
      const css = `.x { /* era width: 100%; */ display: flex; }`;
      expect(cuerpoDe(css, '.x')).toMatch(/display:\s*flex/);
      expect(cuerpoDe(css, '.x')).not.toMatch(/width:\s*100%/);
    });

    it('pide el selector entero, normalizando espacios', () => {
      const css = `.a > .b   { color: red; }`;
      expect(cuerpoDe(css, '.a>.b')).toMatch(/color:\s*red/);
      expect(cuerpoDe(css, '.b')).toBeNull();
    });
  });

  describe('sinBloquesAnidados / cuerpoBaseDe', () => {
    /**
     * Las dos hojas de este caso ponen el `@media` ARRIBA de la regla base a propósito: con la
     * base primero, `cuerpoDe` la encuentra igual y los dos helpers dan lo mismo — o sea que el
     * caso pasaría en verde con `cuerpoBaseDe = cuerpoDe`, que es justo la regresión que existe
     * para atajar. Probado mutando: con la base primero, verde; así, rojo.
     */
    it('devuelve la regla BASE y no la del @media, que es la que cuerpoDe encuentra primero', () => {
      const css = `@media (max-width: 800px) { .t { box-sizing: content-box; } }\n.t { box-sizing: border-box; }`;
      expect(cuerpoDe(css, '.t'), 'cuerpoDe se queda con la primera que ve').toMatch(/content-box/);
      expect(cuerpoBaseDe(css, '.t')).toMatch(/border-box/);

      // Y si la declaración vive SOLO adentro del bloque, la regla base no existe: `null`, no el
      // cuerpo del teléfono.
      const soloEnMedia = `@media (max-width: 800px) { .t { box-sizing: border-box; } }`;
      expect(cuerpoDe(soloEnMedia, '.t')).toMatch(/border-box/);
      expect(cuerpoBaseDe(soloEnMedia, '.t')).toBeNull();
    });

    it('ve las reglas base que vienen DESPUÉS de un @media', () => {
      const css = `@media (max-width: 800px) { .a { color: red; } }\n.despues { color: blue; }`;
      expect(cuerpoBaseDe(css, '.despues')).toMatch(/color:\s*blue/);
      // El helper que esto reemplazó cortaba la hoja en el primer `@media` y la perdía.
      expect(css.split('@media')[0] ?? '').not.toContain('.despues');
    });

    it('no se come la regla siguiente cuando un COMENTARIO nombra un @media', () => {
      const css = `/* Era la única pantalla sin una sola regla @media. */\n.pantalla { display: grid; }`;
      expect(cuerpoBaseDe(css, '.pantalla')).toMatch(/display:\s*grid/);
    });

    it('no se come la regla siguiente por un @import, que termina en ; y no abre bloque', () => {
      const css = `@import "otra.css";\n.x { color: red; }`;
      expect(cuerpoBaseDe(css, '.x')).toMatch(/color:\s*red/);
    });

    it('no se come la regla siguiente por un @ adentro de una declaración', () => {
      const css = `.arroba { content: "@"; }\n.x { color: red; }`;
      expect(cuerpoBaseDe(css, '.x')).toMatch(/color:\s*red/);
    });

    it('saca @supports, @layer y @keyframes, no solo @media', () => {
      const css =
        `@supports (color: color-mix(in srgb, white 50%, transparent)) { .s { color: red; } }\n` +
        `@layer base { .l { color: red; } }\n` +
        `@keyframes entra { from { opacity: 0; } to { opacity: 1; } }\n` +
        `.base { color: blue; }`;
      const plano = sinBloquesAnidados(css);
      expect(cuerpoBaseDe(css, '.base')).toMatch(/color:\s*blue/);
      for (const selector of ['.s', '.l', 'from', 'to']) {
        expect(cuerpoDe(plano, selector), `${selector} no es una regla base`).toBeNull();
      }
    });
  });

  describe('reglasPara', () => {
    it('encuentra el selector dentro de una lista separada por comas, que es lo que cuerpoDe no puede', () => {
      const bloque = `.tarjeta, .jugar, .borrar { transition: none; }`;
      expect(reglasPara(bloque, '.tarjeta')).toEqual(['transition: none;']);
      expect(reglasPara(bloque, '.otra')).toEqual([]);
      // Y no le alcanza con que el nombre aparezca adentro de otro: `.tarjetas` no es `.tarjeta`.
      expect(reglasPara(`.tarjetas { transition: none; }`, '.tarjeta')).toEqual([]);
    });

    it('limpia los comentarios del cuerpo y del selector', () => {
      const bloque = `/* .tarjeta */ .jugar { /* transform: none; */ opacity: 1; }`;
      expect(reglasPara(bloque, '.tarjeta')).toEqual([]);
      expect(reglasPara(bloque, '.jugar').join('')).not.toMatch(/transform/);
    });

    /**
     * **Agujero 4 del fixture.** El normalizador borraba TODO el espacio del selector, así que
     * `.a .b` (un `.b` adentro de un `.a`) y `.a.b` (un elemento con las dos clases) quedaban
     * indistinguibles. No es teórico ni cosmético: le pegan a cosas distintas, y cambiar una por
     * la otra es justo el cambio que rompe una pantalla. Mordió de verdad en esta misma oleada
     * —`tests/ui/EscenaScreen.test.tsx` pedía `.columna[data-hablante='placa']` mientras la hoja
     * declara `.columna [data-hablante='placa']`, que es la correcta—, así que con el agujero
     * abierto escribir la compuesta en la hoja dejaba la suite en verde con ningún prefijo
     * escondido.
     */
    it('no confunde el descendiente `.a .b` con el compuesto `.a.b`', () => {
      const descendiente = `.tarjeta .jugar { transition: none; }`;
      const compuesto = `.tarjeta.jugar { transition: none; }`;

      expect(reglasPara(descendiente, '.tarjeta .jugar')).toEqual(['transition: none;']);
      expect(reglasPara(descendiente, '.tarjeta.jugar'), 'el descendiente pasó por compuesto').toEqual([]);
      expect(reglasPara(compuesto, '.tarjeta.jugar')).toEqual(['transition: none;']);
      expect(reglasPara(compuesto, '.tarjeta .jugar'), 'el compuesto pasó por descendiente').toEqual([]);

      // Lo mismo en `cuerpoDe`, que comparte el normalizador y donde el agujero mordió.
      expect(cuerpoDe(descendiente, '.tarjeta.jugar')).toBeNull();
      expect(cuerpoDe(compuesto, '.tarjeta .jugar')).toBeNull();
      expect(cuerpoDe(descendiente, '.tarjeta .jugar')).toMatch(/transition/);
    });

    /**
     * Lo que el normalizador SÍ tiene que seguir colapsando: el espacio alrededor de un
     * combinador y de una coma no significa nada, y los tests del repo escriben las dos formas
     * (`cuerpoDe(css, '.pantalla>.fondo>…')` contra una hoja que lo escribe con espacios, y
     * `StatusBar.test.tsx` pide `'.ficha,.historial,.abandonar'` contra una lista en tres
     * renglones).
     */
    it('el espacio alrededor de un combinador o de una coma sigue sin contar', () => {
      expect(cuerpoDe(`.a > .b { color: red; }`, '.a>.b')).toMatch(/color:\s*red/);
      expect(cuerpoDe(`.a>.b { color: red; }`, '.a > .b')).toMatch(/color:\s*red/);
      expect(cuerpoDe(`.uno,\n.dos,\n.tres { color: red; }`, '.uno,.dos,.tres')).toMatch(/color:\s*red/);
      expect(reglasPara(`.uno,\n.dos { color: red; }`, '.dos')).toEqual(['color: red;']);
    });
  });

  describe('reglasQueTocan', () => {
    it('devuelve selector y cuerpo, los dos sin comentarios', () => {
      const css = `/* .falsa[data-aspect='3:4'] */\n.marco[data-aspect='3:4'] { /* max-width: 160px; */ max-width: none; }`;
      const reglas = reglasQueTocan(css, '[data-aspect');
      expect(reglas).toHaveLength(1);
      expect(reglas[0]?.selector).toBe(".marco[data-aspect='3:4']");
      expect(reglas[0]?.cuerpo).toMatch(/max-width:\s*none/);
      expect(reglas[0]?.cuerpo).not.toMatch(/160px/);
    });
  });

  describe('bloqueDeMedia', () => {
    it('cuenta llaves, así se lleva el bloque entero y no hasta la primera }', () => {
      const css = `@media (max-width: 800px) { .a { color: red; } .b { color: blue; } }\n.c { color: green; }`;
      const bloque = bloqueDeMedia(css, '@media (max-width: 800px)');
      expect(cuerpoDe(bloque, '.b')).toMatch(/color:\s*blue/);
      expect(cuerpoDe(bloque, '.c')).toBeNull();
    });

    it('lanza si no encuentra la media query, en vez de devolver la hoja entera', () => {
      expect(() => bloqueDeMedia(`.a { color: red; }`, '@media (min-width: 1400px)')).toThrow(/no se encontró/);
    });

    /**
     * **Agujero 1 del fixture, y el que más barato salía disparar en este repo**, que nombra
     * media queries en comentarios todo el tiempo: `CreacionScreen.module.css` nombra `@media` en
     * su cabecera y `EscenaScreen.module.css` nombra `@media (min-width: 1400px)` en la prosa de
     * una regla. La búsqueda iba por `indexOf` sobre el texto CRUDO y después agarraba el primer
     * `{` que viniera, así que devolvía **el cuerpo de una regla base cualquiera y no lanzaba**:
     * un `toMatch` contra "el bloque del reparto" pasaba por lo que dijera la regla de al lado
     * del comentario. Es el mismo agujero que la tarea 5 le tapó a `sinBloquesAnidados`.
     */
    it('no corta por un COMENTARIO que nombra la media query: busca el bloque de verdad', () => {
      const css =
        `/* Arriba de 1400 px —@media (min-width: 1400px)— la caja se reparte en dos columnas. */\n` +
        `.caja { flex-direction: column; }\n` +
        `@media (min-width: 1400px) { .caja { flex-direction: row; } }`;
      const ancha = bloqueDeMedia(css, '@media (min-width: 1400px)');
      expect(cuerpoDe(ancha, '.caja'), 'devolvió el cuerpo de la regla base, no el del bloque').toMatch(
        /flex-direction:\s*row/,
      );
      expect(cuerpoDe(ancha, '.caja')).not.toMatch(/column/);
    });

    it('lanza cuando la media query SOLO existe adentro de un comentario', () => {
      const css = `/* el bloque de @media (min-width: 1400px) se fue en la tarea 9 */\n.caja { color: red; }`;
      expect(() => bloqueDeMedia(css, '@media (min-width: 1400px)')).toThrow(/no se encontró/);
    });

    /**
     * **Agujero 2 del fixture.** Con las llaves desbalanceadas el conteo nunca volvía a cero y el
     * helper devolvía **desde la media query hasta el final del archivo**: la hoja entera
     * disfrazada de bloque, con cada regla base adentro. Un `toMatch` contra eso pasa por
     * cualquier cosa escrita en cualquier parte, que es la peor forma de mentir de las cinco.
     */
    it('lanza si el bloque no cierra, en vez de devolver hasta el final del archivo', () => {
      const sinCerrar = `@media (max-width: 800px) { .a { color: red; }\n.b { color: blue; }`;
      expect(() => bloqueDeMedia(sinCerrar, '@media (max-width: 800px)')).toThrow(/no cierra/);
      // Y la prueba de que el agujero era este: el texto que devolvía contenía la regla de afuera.
      expect(sinCerrar.slice(sinCerrar.indexOf('{') + 1)).toContain('.b');
    });

    it('lanza si lo que encuentra no abre ningún bloque', () => {
      expect(() => bloqueDeMedia(`.a { color: red; }\n@media print;`, '@media print')).toThrow(/no abre/);
    });
  });

  /**
   * **Agujero 3 del fixture, y el más silencioso.** El barrido era
   * `/([^{}]*)\{([^{}]*)\}/g`, y ese `[^{}]*` del cuerpo no puede cruzar la llave de una regla de
   * adentro: con anidamiento CSS nativo la regla PADRE quedaba invisible entera. O sea que todo
   * `toBeNull()` y todo `not.toMatch()` sobre ella pasaba **en el vacío** — el caso no fallaba
   * porque la regla estuviera bien sino porque el helper no la veía.
   */
  describe('anidamiento CSS nativo', () => {
    const anidado = `.padre {\n  color: red;\n  .hijo { color: blue; }\n}\n.otra { color: green; }`;

    it('la regla padre existe, con SUS declaraciones y no las del hijo', () => {
      expect(cuerpoDe(anidado, '.padre'), 'la regla padre es invisible: todo not.toMatch pasa en el vacío').toMatch(
        /color:\s*red/,
      );
      expect(cuerpoDe(anidado, '.padre'), 'el cuerpo del padre se trajo la declaración del hijo').not.toMatch(
        /color:\s*blue/,
      );
      expect(cuerpoDe(anidado, '.hijo')).toMatch(/color:\s*blue/);
      // Y la regla de después del bloque anidado sigue estando: el barrido no se corta ahí.
      expect(cuerpoDe(anidado, '.otra')).toMatch(/color:\s*green/);
    });

    it('la ve también `cuerpoBaseDe` y la lista de `reglasQueTocan`', () => {
      expect(cuerpoBaseDe(anidado, '.padre')).toMatch(/color:\s*red/);
      expect(reglasQueTocan(anidado, '.padre').map(({ selector }) => selector)).toEqual(['.padre']);
    });

    it('un `&` anidado sale con su propio selector y no se come al padre', () => {
      const css = `.tarjeta {\n  border: 1px solid;\n  &:hover { border-color: gold; }\n}`;
      expect(cuerpoDe(css, '.tarjeta')).toMatch(/border:\s*1px solid/);
      expect(cuerpoDe(css, '.tarjeta')).not.toMatch(/gold/);
      expect(cuerpoDe(css, '&:hover')).toMatch(/border-color:\s*gold/);
    });

    it('una llave adentro de una cadena no parte la regla al medio', () => {
      const css = `.llave::before { content: "}"; color: red; }\n.x { color: blue; }`;
      expect(cuerpoDe(css, '.llave::before')).toMatch(/color:\s*red/);
      expect(cuerpoDe(css, '.x'), 'la cadena con `}` se llevó puesta la regla siguiente').toMatch(/color:\s*blue/);
    });
  });
});
