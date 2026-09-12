import { describe, expect, it } from 'vitest';
import { classify, keepDice } from '@/engine/dice';

describe('keepDice', () => {
  it('normal y cancelled conservan siempre los índices 0 y 1', () => {
    expect(keepDice([1, 6], 'normal')).toEqual([0, 1]);
    expect(keepDice([1, 6], 'cancelled')).toEqual([0, 1]);
    expect(keepDice([1, 6, 3], 'normal')).toEqual([0, 1]);
  });

  it('advantage conserva los índices de los dos mayores', () => {
    expect(keepDice([2, 6, 4], 'advantage')).toEqual([1, 2]);
    expect(keepDice([6, 1, 5], 'advantage')).toEqual([0, 2]);
    expect(keepDice([1, 2, 6], 'advantage')).toEqual([1, 2]);
  });

  it('disadvantage conserva los índices de los dos menores', () => {
    expect(keepDice([2, 6, 4], 'disadvantage')).toEqual([0, 2]);
    expect(keepDice([6, 1, 5], 'disadvantage')).toEqual([1, 2]);
    expect(keepDice([1, 2, 6], 'disadvantage')).toEqual([0, 1]);
  });

  it('con empates elige el índice menor y devuelve los índices ordenados', () => {
    expect(keepDice([3, 5, 3], 'advantage')).toEqual([0, 1]);
    expect(keepDice([3, 5, 3], 'disadvantage')).toEqual([0, 2]);
    expect(keepDice([4, 4, 4], 'advantage')).toEqual([0, 1]);
    expect(keepDice([4, 4, 4], 'disadvantage')).toEqual([0, 1]);
    expect(keepDice([5, 3, 5], 'advantage')).toEqual([0, 2]);
  });

  it('con dos dados en advantage o disadvantage conserva ambos', () => {
    expect(keepDice([2, 5], 'advantage')).toEqual([0, 1]);
    expect(keepDice([2, 5], 'disadvantage')).toEqual([0, 1]);
  });

  it('no muta la entrada y devuelve un array nuevo', () => {
    const dice = [3, 5, 3];
    const copia = [...dice];
    const kept = keepDice(dice, 'advantage');
    expect(dice).toEqual(copia);
    expect(kept).not.toBe(dice);
  });
});

describe('classify', () => {
  it('clasifica por el total (suma de conservados + modificador)', () => {
    expect(classify([5, 5], 0)).toBe('success'); // 10
    expect(classify([6, 5], 0)).toBe('success'); // 11
    expect(classify([4, 5], 1)).toBe('success'); // 10
    expect(classify([4, 3], 0)).toBe('partial'); // 7
    expect(classify([4, 5], 0)).toBe('partial'); // 9
    expect(classify([1, 2], 5)).toBe('partial'); // 8
    expect(classify([3, 3], 0)).toBe('failure'); // 6
    expect(classify([6, 3], -3)).toBe('failure'); // 6
    expect(classify([1, 2], 0)).toBe('failure'); // 3
  });

  it('doble 6 natural es crit aunque el total sea bajo', () => {
    expect(classify([6, 6], -5)).toBe('crit');
    expect(classify([6, 6], 0)).toBe('crit');
  });

  it('doble 1 natural es fumble aunque el total sea alto', () => {
    expect(classify([1, 1], 9)).toBe('fumble');
    expect(classify([1, 1], 0)).toBe('fumble');
  });

  it('otros dobles no son naturales', () => {
    expect(classify([5, 5], 0)).toBe('success');
    expect(classify([4, 4], 0)).toBe('partial');
    expect(classify([2, 2], 0)).toBe('failure');
  });

  it('no muta la entrada', () => {
    const kept = [6, 6];
    classify(kept, 0);
    expect(kept).toEqual([6, 6]);
  });
});
