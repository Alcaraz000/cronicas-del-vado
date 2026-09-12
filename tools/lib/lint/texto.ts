import type { Choice, Outcome, Paragraph, Scene, Text, TextVariant } from '@/content/schema';

// ---------------------------------------------------------------------------
// Medición de prosa. Todo lo que cuenta palabras en esta herramienta pasa por acá,
// para que el total de la campaña y el de una escena se midan con la misma regla.
// ---------------------------------------------------------------------------

/** Una "palabra" empieza con letra o dígito y sigue con letras, marcas o dígitos. La raya de diálogo no cuenta. */
const PALABRA = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu;

export function palabras(texto: string): string[] {
  return texto.match(PALABRA) ?? [];
}

export function contar(texto: string): number {
  return palabras(texto).length;
}

/** Minúsculas conservando tildes: `tú` y `tu` son palabras distintas y las dos importan. */
export function normalizar(texto: string): string {
  return palabras(texto).join(' ').toLocaleLowerCase('es');
}

/** Corta en oraciones por `.`, `!`, `?`, `…` y `;`, conservando lo que hay entre medio. */
export function oraciones(texto: string): string[] {
  return texto
    .split(/(?<=[.!?…;])\s+|\n+/u)
    .map((o) => o.trim())
    .filter((o) => palabras(o).length > 0);
}

// --- Recorridos sobre el contenido -----------------------------------------

export function parrafos(text: Text): Paragraph[] {
  return text.filter((p): p is Paragraph => typeof p !== 'string');
}

/** Todas las variantes escritas de un `Text`, incluidas las de memoria y las de flag. */
export function variantes(text: Text): TextVariant[] {
  const lista: TextVariant[] = [];
  for (const p of text) {
    if (typeof p === 'string') lista.push({ text: p });
    else lista.push(...p.variants);
  }
  return lista;
}

/**
 * Lo que lee una partida: una variante por párrafo, la base (la última, la que no tiene `when`).
 * Es la medida que usan la banda de longitud de la biblia §2.3 y la columna `text` del outline §2.
 */
export function textoBase(text: Text): string {
  const trozos: string[] = [];
  for (const p of text) {
    if (typeof p === 'string') { trozos.push(p); continue; }
    const ultima = p.variants[p.variants.length - 1];
    if (ultima !== undefined) trozos.push(ultima.text);
  }
  return trozos.join('\n');
}

export function outcomesDe(choice: Choice): Outcome[] {
  const lista: Outcome[] = [];
  if (choice.outcome) lista.push(choice.outcome);
  const o = choice.roll?.outcomes;
  if (o) {
    lista.push(o.success, o.partial, o.failure);
    if (o.crit) lista.push(o.crit);
    if (o.fumble) lista.push(o.fumble);
  }
  return lista;
}

/** Todos los `Text` de una escena: el texto de la escena, los desenlaces con texto y el epílogo. */
export function textosDe(scene: Scene): Text[] {
  const lista: Text[] = [scene.text];
  for (const choice of scene.choices) {
    for (const outcome of outcomesDe(choice)) if (outcome.text) lista.push(outcome.text);
  }
  if (scene.ending) lista.push(scene.ending.epilogue);
  return lista;
}

/** Prosa narrativa escrita en una escena: toda variante de todo `Text`. Sin `label` ni `lockedHint`. */
export function palabrasEscritas(scene: Scene): number {
  let total = 0;
  for (const text of textosDe(scene)) for (const v of variantes(text)) total += contar(v.text);
  return total;
}

/** Palabras de `label` de todas las opciones de una escena (el outline §3 las cuenta aparte). */
export function palabrasEtiquetas(scene: Scene): number {
  return scene.choices.reduce((acc, c) => acc + contar(c.label), 0);
}

/** Palabras de `lockedHint` de todas las opciones de una escena. */
export function palabrasPistas(scene: Scene): number {
  return scene.choices.reduce((acc, c) => acc + contar(c.lockedHint ?? ''), 0);
}
