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
    for (const [token, piso] of [
      ['tam-texto-juego', 19],
      ['tam-ui', 15],
      ['tam-ui-chico', 13],
    ] as const) {
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
