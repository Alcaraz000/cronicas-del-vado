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
    // Con la medida en px y la fuente escalando, pedir letra grande ANGOSTABA la columna: los
    // 720 px eran fijos y los glifos crecían 1,5x, así que la línea pasaba de las 81-86 letras
    // medidas a 1280x800 a unas 55. En `em` el recuento no se mueve.
    expect(valorDe('ancho-prosa'), '--ancho-prosa no existe').not.toBe('');
    expect(valorDe('ancho-prosa')).toMatch(/em\b/);
  });

  it('la medida de la prosa es una medida de prosa, no cualquier número', () => {
    // `--ancho-prosa: 4em` pasaba todos los casos de acá arriba —lo mutó el revisor— y dejaba la
    // prosa en una tira de nueve caracteres. La banda sale de la medición: a 19px la prosa de la
    // campaña en Georgia corre a 8,3 px por carácter, así que 28em son ~64 caracteres (la caja
    // ADV de Ren'Py mide ~67) y 42em son ~96, bastante más que el <= 80 de WCAG 1.4.8. Fuera de
    // esa banda no hay decisión de diseño posible. El valor exacto y su porqué, en tokens.css.
    const em = Number(/^([\d.]+)em$/.exec(valorDe('ancho-prosa'))?.[1]);
    expect(em, '--ancho-prosa no es un número de `em` pelado').toBeGreaterThan(0);
    const angosta = '--ancho-prosa deja la prosa más angosta que la caja ADV de Ren’Py';
    const larga = '--ancho-prosa se pasa de largo: más de ~96 caracteres por línea';
    expect(em, angosta).toBeGreaterThanOrEqual(28);
    expect(em, larga).toBeLessThanOrEqual(42);
  });

  it('la columna de la escena consume --ancho-prosa, y acotada con min()', () => {
    // Sin este caso el token queda huérfano: el revisor volvió `TextColumn.module.css` a
    // `max-width: var(--ancho-columna-max)` y los 1134 tests seguían en verde, con el token nuevo
    // declarado y sin usar. Y el `min()` no es adorno: a --escala-fuente 1,5 los 38em miden
    // 1083 px y desbordarían cualquier ventana de 1024 (medido: con el `min()` la columna se
    // corta en 902 px a 1024x768 y no hay scroll horizontal).
    const columna =
      /\.columna\s*\{([^}]*)\}/.exec(
        readFileSync(resolve(process.cwd(), 'src/ui/components/TextColumn.module.css'), 'utf8'),
      )?.[1] ?? '';
    expect(columna, '.columna no tiene regla propia').not.toBe('');
    expect(columna, 'la prosa de la escena no consume --ancho-prosa').toContain('--ancho-prosa');
    expect(columna, 'la medida de la prosa no está acotada con min(): desborda a 150 %').toMatch(
      /max-width:\s*min\(/,
    );
  });

  it('--ancho-columna-max sigue en px y sin tocar: lo comparten Cajon, Dialogo y FinScreen', () => {
    expect(valorDe('ancho-columna-max')).toBe('720px');
  });
});
