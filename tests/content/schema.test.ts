import { describe, expect, it } from 'vitest';
import { ConditionSchema, EffectSchema } from '@/content/schema';

describe('ConditionSchema', () => {
  it('acepta una condición anidada con all/any/not y todas las hojas', () => {
    const condicion: unknown = {
      all: [
        { flag: 'run:centinela_vencido' },
        { flag: 'char:prueba.vio_la_cripta' },
        { flag: 'world:caido.prueba' },
        { any: [{ class: 'mago' }, { trait: 'aprendiz_de_escriba' }, { skill: 'rastreador' }] },
        { not: { condition: 'asustado' } },
        { attr: 'saber', gte: 2 },
        { wounds: { gte: 1, lte: 2 } },
        { visited: 'p_umbral', min: 1 },
        { visited: 'p_umbral' },
        { met: 'centinela' },
        { knows: 'torre_abandonada' },
        { clock: 'pelea', gte: 1 },
        { endingSeen: 'fin_tesoro' },
        { item: 'llave_de_hierro' },
      ],
    };
    expect(ConditionSchema.safeParse(condicion).success).toBe(true);
  });

  it('rechaza un flag sin prefijo run:, char: o world:', () => {
    expect(ConditionSchema.safeParse({ flag: 'centinela_vencido' }).success).toBe(false);
  });

  it('rechaza un flag con prefijo desconocido', () => {
    expect(ConditionSchema.safeParse({ flag: 'global:centinela' }).success).toBe(false);
  });

  it('rechaza una clave desconocida', () => {
    expect(ConditionSchema.safeParse({ visitado: 'p_umbral' }).success).toBe(false);
  });

  it('rechaza ids que no están en el catálogo', () => {
    expect(ConditionSchema.safeParse({ class: 'paladin' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ trait: 'noble' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ skill: 'herrero' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ condition: 'dormido' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ attr: 'fuerza', gte: 1 }).success).toBe(false);
  });

  it('rechaza una condición anidada inválida dentro de not', () => {
    expect(ConditionSchema.safeParse({ not: { flag: 'sin_prefijo' } }).success).toBe(false);
  });
});

describe('EffectSchema', () => {
  it('acepta cada tipo de efecto', () => {
    const efectos: unknown[] = [
      { set: 'run:tiene_pista' },
      { clear: 'char:prueba.vio_la_cripta' },
      { give: 'llave_de_hierro' },
      { take: 'llave_de_hierro' },
      { wound: 1 },
      { wound: 2 },
      { heal: 1 },
      { addCondition: 'asustado' },
      { removeCondition: 'perseguido' },
      { removeCondition: 'all' },
      { clock: 'pelea', delta: 1 },
      { clock: 'pelea', delta: -2 },
      { milestone: 'entrar_a_la_torre' },
      { fortune: -1 },
      { lethal: true },
    ];
    for (const efecto of efectos) {
      expect(EffectSchema.safeParse(efecto).success, JSON.stringify(efecto)).toBe(true);
    }
  });

  it('rechaza valores fuera de rango', () => {
    expect(EffectSchema.safeParse({ wound: 3 }).success).toBe(false);
    expect(EffectSchema.safeParse({ wound: 0 }).success).toBe(false);
    expect(EffectSchema.safeParse({ heal: 2 }).success).toBe(false);
    expect(EffectSchema.safeParse({ lethal: false }).success).toBe(false);
  });

  it('rechaza un flag sin prefijo en set y clear', () => {
    expect(EffectSchema.safeParse({ set: 'tiene_pista' }).success).toBe(false);
    expect(EffectSchema.safeParse({ clear: 'tiene_pista' }).success).toBe(false);
  });

  it('rechaza una condición desconocida', () => {
    expect(EffectSchema.safeParse({ addCondition: 'dormido' }).success).toBe(false);
    expect(EffectSchema.safeParse({ removeCondition: 'dormido' }).success).toBe(false);
  });

  it('rechaza un delta de reloj no entero', () => {
    expect(EffectSchema.safeParse({ clock: 'pelea', delta: 0.5 }).success).toBe(false);
  });
});
