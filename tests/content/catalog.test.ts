import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ATTRS,
  ATTR_NAMES,
  TAGS,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  LIMITS,
  WOUND_LABELS,
  type Attr,
  type Tag,
  type Difficulty,
} from '@/content/catalog';

describe('catalog: atributos, tags y dificultades', () => {
  it('declara los 4 atributos en orden y con su nombre visible', () => {
    expect(ATTRS).toEqual(['vigor', 'astucia', 'saber', 'presencia']);
    expect(ATTR_NAMES).toEqual({ vigor: 'Vigor', astucia: 'Astucia', saber: 'Saber', presencia: 'Presencia' });
    expectTypeOf<Attr>().toEqualTypeOf<'vigor' | 'astucia' | 'saber' | 'presencia'>();
  });

  it('declara los 10 tags sin repetidos', () => {
    expect(TAGS).toEqual([
      'fisico', 'sigilo', 'percepcion', 'social', 'engano',
      'saber', 'magia', 'fe', 'supervivencia', 'huida',
    ]);
    expect(new Set(TAGS).size).toBe(TAGS.length);
    expectTypeOf<Tag>().toEqualTypeOf<
      'fisico' | 'sigilo' | 'percepcion' | 'social' | 'engano' | 'saber' | 'magia' | 'fe' | 'supervivencia' | 'huida'
    >();
  });

  it('las dificultades valen +1, 0, -1, -2, -3 y tienen nombre visible', () => {
    expect(DIFFICULTIES).toEqual({ facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 });
    expect(DIFFICULTY_NAMES).toEqual({
      facil: 'Fácil', normal: 'Normal', dificil: 'Difícil', muy_dificil: 'Muy difícil', extrema: 'Extrema',
    });
    expectTypeOf<Difficulty>().toEqualTypeOf<'facil' | 'normal' | 'dificil' | 'muy_dificil' | 'extrema'>();
  });
});

describe('catalog: límites y etiquetas de heridas', () => {
  it('LIMITS tiene exactamente los valores del diseño', () => {
    expect(LIMITS).toEqual({
      maxItems: 6,
      maxConditions: 3,
      maxRedirects: 8,
      maxLog: 400,
      fortuneBase: 3,
      fortuneFromLevel5: 4,
      maxWounds: 3,
      maxAttr: 5,
      maxLevel: 10,
      xpPerLevel: 60,
      minChoices: 4,
      maxChoices: 9,
      maxCharacters: 3,
    });
  });

  it('WOUND_LABELS tiene una etiqueta por cada valor de Heridas, de 0 a maxWounds', () => {
    expect(WOUND_LABELS).toEqual(['Sano', 'Herido', 'Malherido', 'Caído']);
    expect(WOUND_LABELS).toHaveLength(LIMITS.maxWounds + 1);
  });
});
