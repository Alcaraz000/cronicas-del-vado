/**
 * Parseo de argumentos a mano, compartido por los CLI de `tools/`. Sin librerías a propósito:
 * son tres banderas por herramienta y una dependencia más en `devDependencies` no se paga sola.
 *
 * Acepta las dos formas de siempre: `--campaign vado` y `--campaign=vado`.
 */
export interface Valor { valor: string; salto: number }

export function tomarValor(nombre: string, inline: string | undefined, siguiente: string | undefined): Valor {
  if (inline !== undefined) return { valor: inline, salto: 1 };
  if (siguiente === undefined || siguiente.startsWith('--')) throw new Error(`Falta el valor de ${nombre}`);
  return { valor: siguiente, salto: 2 };
}

/** Separa `--clave=valor` en su nombre y su valor pegado (o `undefined` si venía suelto). */
export function partirBandera(argumento: string): { nombre: string; inline: string | undefined } {
  const igual = argumento.indexOf('=');
  if (igual === -1) return { nombre: argumento, inline: undefined };
  return { nombre: argumento.slice(0, igual), inline: argumento.slice(igual + 1) };
}
