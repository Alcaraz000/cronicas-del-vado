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
  });
});
