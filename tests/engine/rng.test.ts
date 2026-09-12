import { describe, expect, it } from 'vitest';
import { hash32, mulberry32, newSeed, rollDice } from '@/engine/rng';

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

describe('rollDice', () => {
  const seed = 3826002220;

  it('devuelve `count` enteros entre 1 y 6', () => {
    for (const count of [1, 2, 3, 20]) {
      const dice = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, count);
      expect(dice).toHaveLength(count);
      for (const d of dice) {
        expect(Number.isInteger(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(6);
      }
    }
  });

  it('count 0 devuelve un array vacío', () => {
    expect(rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 0)).toEqual([]);
  });

  /**
   * Valor dorado de la cadena completa hash32 → mulberry32 → mapeo a 1-6. La promesa
   * "recargar a mitad de tirada devuelve los mismos dados" depende de los tres eslabones:
   * los tests de arriba fijan hash32 y la reproducibilidad relativa, pero sin dados literales
   * un cambio en mulberry32 o en el mapeo pasaría en silencio con todo en verde.
   */
  it('valor dorado: la tirada inicial de p_umbral/leer_inscripcion da 4, 1 y 6', () => {
    expect(rollDice(3826002220, 'p_umbral', 'leer_inscripcion', 0, 0, 3)).toEqual([4, 1, 6]);
  });

  it('valor dorado: la primera repetición con Fortuna de esa misma tirada da 6', () => {
    expect(rollDice(3826002220, 'p_umbral', 'leer_inscripcion', 0, 1, 1)).toEqual([6]);
  });

  it('los mismos argumentos dan los mismos dados (recargar y repetir = mismos dados)', () => {
    const a = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 3);
    const b = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 3);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('el primer dado no depende de count (base de la repetición con Fortuna)', () => {
    const uno = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 1, 1);
    const dos = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 1, 2);
    expect(uno[0]).toBe(dos[0]);
  });

  it('cambiar attempt cambia los dados', () => {
    const intento0 = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 20);
    const intento1 = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 1, 20);
    expect(intento0).not.toEqual(intento1);
  });

  it('cambiar visits cambia los dados', () => {
    const visita0 = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 20);
    const visita1 = rollDice(seed, 'p_umbral', 'leer_inscripcion', 1, 0, 20);
    expect(visita0).not.toEqual(visita1);
  });

  it('cambiar la semilla, la escena o la opción cambia los dados', () => {
    const base = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 20);
    expect(rollDice(seed + 1, 'p_umbral', 'leer_inscripcion', 0, 0, 20)).not.toEqual(base);
    expect(rollDice(seed, 'p_biblioteca', 'leer_inscripcion', 0, 0, 20)).not.toEqual(base);
    expect(rollDice(seed, 'p_umbral', 'forzar_puerta', 0, 0, 20)).not.toEqual(base);
  });

  it('usa mulberry32(hash32(seed, sceneId, choiceId, visits, attempt))', () => {
    const next = mulberry32(hash32(seed, 'p_umbral', 'leer_inscripcion', 2, 1));
    const esperado = [Math.floor(next() * 6) + 1, Math.floor(next() * 6) + 1];
    expect(rollDice(seed, 'p_umbral', 'leer_inscripcion', 2, 1, 2)).toEqual(esperado);
  });

  it('a lo largo de muchas semillas salen las seis caras', () => {
    const caras = new Set<number>();
    for (let s = 0; s < 200; s += 1) {
      for (const d of rollDice(s, 'p_umbral', 'leer_inscripcion', 0, 0, 3)) caras.add(d);
    }
    expect([...caras].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('newSeed', () => {
  it('es hash32 de la entropía', () => {
    expect(newSeed('a')).toBe(3826002220);
    expect(newSeed('1700000000000|0.123')).toBe(hash32('1700000000000|0.123'));
  });

  it('entropías distintas dan semillas distintas', () => {
    expect(newSeed('1700000000000|0.123')).not.toBe(newSeed('1700000000000|0.124'));
    expect(newSeed('1700000000000|0.123')).not.toBe(newSeed('1700000000001|0.123'));
  });

  it('devuelve un entero sin signo de 32 bits', () => {
    const s = newSeed('cualquier cosa');
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});
