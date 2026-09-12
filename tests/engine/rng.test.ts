import { describe, expect, it } from 'vitest';
import { hash32, mulberry32 } from '@/engine/rng';

describe('hash32', () => {
  it('es FNV-1a de 32 bits: hash32("a") = 0xe40c292c', () => {
    expect(hash32('a')).toBe(3826002220);
    expect(hash32('a')).toBe(0xe40c292c);
  });

  it('la cadena vacía devuelve el offset basis', () => {
    expect(hash32('')).toBe(2166136261);
    expect(hash32()).toBe(2166136261);
  });

  it('une las partes con | antes de hashear (strings y numbers)', () => {
    expect(hash32('a', 'b')).toBe(hash32('a|b'));
    expect(hash32(42, 'p_umbral')).toBe(hash32('42|p_umbral'));
    expect(hash32(1, 2, 3)).toBe(hash32('1|2|3'));
  });

  it('devuelve un entero sin signo de 32 bits, estable entre llamadas', () => {
    const h = hash32('Crónicas del Vado');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
    expect(hash32('Crónicas del Vado')).toBe(h);
  });

  it('entradas distintas dan hashes distintos', () => {
    expect(hash32('a')).not.toBe(hash32('b'));
    expect(hash32('a', 'b')).not.toBe(hash32('b', 'a'));
    expect(hash32(7, 'x', 0, 0)).not.toBe(hash32(7, 'x', 0, 1));
  });
});

describe('mulberry32', () => {
  it('es reproducible: la misma semilla da la misma secuencia', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('devuelve números en [0, 1)', () => {
    const next = mulberry32(3826002220);
    for (let i = 0; i < 1000; i += 1) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('semillas distintas dan secuencias distintas', () => {
    const seq1 = Array.from({ length: 10 }, mulberry32(1));
    const seq2 = Array.from({ length: 10 }, mulberry32(2));
    expect(seq1).not.toEqual(seq2);
  });

  it('la semilla se reduce a 32 bits sin signo', () => {
    const seq1 = Array.from({ length: 5 }, mulberry32(5));
    const seq2 = Array.from({ length: 5 }, mulberry32(2 ** 32 + 5));
    expect(seq1).toEqual(seq2);
  });
});
