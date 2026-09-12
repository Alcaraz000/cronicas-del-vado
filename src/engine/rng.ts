const FNV_OFFSET_BASIS = 0x811c9dc5; // 2166136261
const FNV_PRIME = 0x01000193; // 16777619

/**
 * FNV-1a de 32 bits sobre los code units UTF-16 de parts.join('|').
 * Resultado como entero sin signo (>>> 0). Estable: hash32('a') === 0xe40c292c.
 */
export function hash32(...parts: (string | number)[]): number {
  const text = parts.join('|');
  let h = FNV_OFFSET_BASIS;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

/** Generador mulberry32: devuelve una función que produce números en [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
