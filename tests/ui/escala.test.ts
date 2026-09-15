import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cuerpoBaseDe } from '../fixtures/css';

const tokens = readFileSync(resolve(process.cwd(), 'src/app/tokens.css'), 'utf8');
const textColumn = readFileSync(resolve(process.cwd(), 'src/ui/components/TextColumn.module.css'), 'utf8');
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
    //
    // **Se lee con el fixture y no con un regex propio.** El regex que había acá
    // (`/\.columna\s*\{([^}]*)\}/`) devolvía el cuerpo CON los comentarios, y el comentario de
    // esta misma regla nombra `--ancho-prosa` dos veces: volver la declaración a
    // `max-width: min(var(--ancho-columna-max), 100%)` dejaba el token huérfano otra vez y los
    // 1189 en verde, que es literalmente la regresión que este caso dice atajar. Es la misma
    // forma de mentir que `cuerpoDe` corta desde la tarea 2.
    const columna = cuerpoBaseDe(textColumn, '.columna') ?? '';
    expect(columna, '.columna no tiene regla propia').not.toBe('');
    expect(columna, 'la prosa de la escena no consume --ancho-prosa').toContain('--ancho-prosa');
    expect(columna, 'la medida de la prosa no está acotada con min(): desborda a 150 %').toMatch(
      /max-width:\s*min\(/,
    );
    // Y el token que se acota es ese y no otro: `min(var(--ancho-columna-max), 100%)` satisface
    // las dos aserciones de arriba cuando el comentario nombra `--ancho-prosa`.
    expect(columna, 'la medida acotada no es --ancho-prosa').toMatch(/max-width:\s*min\(\s*var\(--ancho-prosa\)/);
  });

  /**
   * **`--interlineado-juego` es el DIVISOR de cada cuenta de líneas de esta fase** y no lo
   * vigilaba nadie: se podía cambiar y ninguna aserción se enteraba. De él cuelgan el 44 % de la
   * caja (que se justifica en que 353,19 px de interior dan 10,27 líneas), el ruling de
   * `--ancho-prosa` en 38em, la elección de la escena de la captura y el presupuesto de alto de
   * `OptionList`. Este caso no fija el número por gusto: fija la CONSECUENCIA medida.
   */
  it('el interlineado de la prosa sostiene el presupuesto de líneas de la caja', () => {
    const declarado = valorDe('interlineado-juego');
    expect(declarado, '--interlineado-juego no existe').not.toBe('');
    // Sin unidad, que no es un detalle: un `line-height` con unidad se hereda como longitud ya
    // resuelta, así que dejaría de seguir a `--tam-texto-juego` y a la escala del jugador.
    expect(declarado, '--interlineado-juego dejó de ser un número sin unidad').toMatch(/^\d+(?:\.\d+)?$/);
    const interlineado = Number(declarado);

    // Medido a 1919x905: la caja deja 353,19 px de interior y el diálogo mide 21,4937 px. El
    // presupuesto con el que se defendió el 44 % de `--alto-caja` —contra el 25,7 % que es la
    // norma del género— es que ahí entren **10 líneas**, que es lo que pide la encrucijada peor
    // de la campaña. Con 1,6 la interlínea da 34,39 px y entran 10,27; con 1,7 da 36,54 y entran
    // 9,67, o sea que la prosa vuelve a scrollear y se deshace el §6.1 entero. El interlineado es
    // el DIVISOR de esa cuenta y de todas las de la fase.
    const interiorDeLaCaja = 353.19;
    const cuerpoDelDialogo = 21.4937;
    const lineasQueEntran = interiorDeLaCaja / (cuerpoDelDialogo * interlineado);
    expect(lineasQueEntran, 'la caja deja de tener lugar para 10 líneas: vuelve el scroll').toBeGreaterThanOrEqual(10);
    // Y un piso, porque el otro lado también es una decisión: por debajo de 1,4 la prosa se
    // apelmaza y deja de ser un cuerpo de novela. (Los renglones sueltos de la interfaz usan 1,3,
    // y eso está escrito en `OptionList.module.css` como lo contrario de un párrafo.)
    expect(interlineado, 'el interlineado de la prosa se apretó al de un renglón de interfaz').toBeGreaterThanOrEqual(
      1.4,
    );

    // Y no puede quedar huérfano: la prosa de la escena es la que lo consume.
    expect(cuerpoBaseDe(textColumn, '.columna'), 'la prosa no consume --interlineado-juego').toMatch(
      /line-height:\s*var\(--interlineado-juego\)/,
    );
  });

  it('--ancho-columna-max sigue en px y sin tocar: lo comparten Cajon, Dialogo y FinScreen', () => {
    expect(valorDe('ancho-columna-max')).toBe('720px');
  });
});
