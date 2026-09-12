import { describe, expect, it } from 'vitest';
import { LIMITS } from '@/content/catalog';
import { campaignLabel, fortuneMax, veteranModifier, type CampaignLabel } from '@/engine/progression';

describe('campaignLabel', () => {
  const rango: [number, number] = [3, 5];

  it.each<[number, CampaignLabel]>([
    [1, 'mortal'],
    [2, 'exigente'],
    [3, 'pareja'],
    [4, 'pareja'],
    [5, 'pareja'],
    [6, 'tranquila'],
    [7, 'tranquila'],
    [8, 'paseo'],
    [10, 'paseo'],
  ])('con rango [3, 5] el nivel %i es %s', (level, esperado) => {
    expect(campaignLabel(rango, level)).toBe(esperado);
  });

  it('con rango [1, 3] un personaje nuevo juega en Pareja', () => {
    expect(campaignLabel([1, 3], 1)).toBe('pareja');
  });

  it('con rango [1, 3] los niveles 4 y 5 son Tranquila y el 6 es Paseo', () => {
    expect(campaignLabel([1, 3], 4)).toBe('tranquila');
    expect(campaignLabel([1, 3], 5)).toBe('tranquila');
    expect(campaignLabel([1, 3], 6)).toBe('paseo');
  });

  it('el borde inferior se calcula igual aunque el mínimo sea 1', () => {
    expect(campaignLabel([1, 3], 0)).toBe('exigente');
    expect(campaignLabel([1, 3], -1)).toBe('mortal');
  });

  it('no muta el rango recibido', () => {
    const copia: [number, number] = [3, 5];
    campaignLabel(copia, 1);
    campaignLabel(copia, 9);
    expect(copia).toEqual([3, 5]);
  });
});

describe('veteranModifier', () => {
  it('es 0 en mortal, exigente y pareja', () => {
    expect(veteranModifier('mortal')).toBe(0);
    expect(veteranModifier('exigente')).toBe(0);
    expect(veteranModifier('pareja')).toBe(0);
  });

  it('es -1 en tranquila y -2 en paseo', () => {
    expect(veteranModifier('tranquila')).toBe(-1);
    expect(veteranModifier('paseo')).toBe(-2);
  });
});

describe('fortuneMax', () => {
  it('devuelve fortuneBase por debajo del nivel 5', () => {
    expect(fortuneMax(1)).toBe(LIMITS.fortuneBase);
    expect(fortuneMax(4)).toBe(LIMITS.fortuneBase);
    expect(fortuneMax(1)).toBe(3);
  });

  it('devuelve fortuneFromLevel5 desde el nivel 5', () => {
    expect(fortuneMax(5)).toBe(LIMITS.fortuneFromLevel5);
    expect(fortuneMax(10)).toBe(LIMITS.fortuneFromLevel5);
    expect(fortuneMax(5)).toBe(4);
  });
});
