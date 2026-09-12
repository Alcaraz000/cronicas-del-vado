import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ATTRS,
  ATTR_NAMES,
  TAGS,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  CLASSES,
  TRAITS,
  SKILLS,
  CONDITIONS,
  FUMBLE_DEFAULT_CONDITION,
  LIMITS,
  WOUND_LABELS,
  type Attr,
  type Tag,
  type Difficulty,
  type ClassId,
  type TraitId,
  type SkillId,
  type ConditionId,
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

describe('catalog: clases', () => {
  const classIds = Object.keys(CLASSES) as ClassId[];

  it('hay exactamente 4 clases, cada una con su atributo principal', () => {
    expect(classIds).toEqual(['guerrero', 'explorador', 'mago', 'clerigo']);
    expectTypeOf<ClassId>().toEqualTypeOf<'guerrero' | 'explorador' | 'mago' | 'clerigo'>();
    expect(CLASSES.guerrero.attr).toBe('vigor');
    expect(CLASSES.explorador.attr).toBe('astucia');
    expect(CLASSES.mago.attr).toBe('saber');
    expect(CLASSES.clerigo.attr).toBe('presencia');
    for (const id of classIds) {
      expect(ATTRS).toContain(CLASSES[id].attr);
    }
  });

  it('cada clase tiene nombre visible en español', () => {
    expect(CLASSES.guerrero.name).toBe('Guerrero');
    expect(CLASSES.explorador.name).toBe('Explorador');
    expect(CLASSES.mago.name).toBe('Mago');
    expect(CLASSES.clerigo.name).toBe('Clérigo');
  });

  it('cada Debilidad de clase es un Tag del catálogo', () => {
    for (const id of classIds) {
      expect(TAGS).toContain(CLASSES[id].weakness);
    }
  });

  it('las Debilidades son las del diseño: sigilo, social, fisico, engano', () => {
    expect(CLASSES.guerrero.weakness).toBe('sigilo');
    expect(CLASSES.explorador.weakness).toBe('social');
    expect(CLASSES.mago.weakness).toBe('fisico');
    expect(CLASSES.clerigo.weakness).toBe('engano');
  });

  it('cada Poder tiene id único, nombre y descripción no vacíos', () => {
    const powerIds = classIds.map((id) => CLASSES[id].power.id);
    expect(powerIds).toEqual(['furia', 'sombra', 'conjuro', 'plegaria']);
    expect(new Set(powerIds).size).toBe(powerIds.length);
    for (const id of classIds) {
      const { power } = CLASSES[id];
      expect(power.name.length).toBeGreaterThan(0);
      expect(power.description.length).toBeGreaterThan(0);
    }
    expect(CLASSES.guerrero.power.name).toBe('Furia');
    expect(CLASSES.explorador.power.name).toBe('Sombra');
    expect(CLASSES.mago.power.name).toBe('Conjuro');
    expect(CLASSES.clerigo.power.name).toBe('Plegaria');
  });

  it('los alcances de Poder coinciden con el diseño y solo usan tags del catálogo', () => {
    expect(CLASSES.guerrero.power.scope).toEqual({ kind: 'tags', tags: ['fisico'] });
    expect(CLASSES.explorador.power.scope).toEqual({ kind: 'tags', tags: ['sigilo', 'huida', 'supervivencia'] });
    expect(CLASSES.mago.power.scope).toEqual({ kind: 'any' });
    expect(CLASSES.clerigo.power.scope).toEqual({ kind: 'sheet' });
    for (const id of classIds) {
      const { scope } = CLASSES[id].power;
      if (scope.kind === 'tags') {
        expect(scope.tags.length).toBeGreaterThan(0);
        for (const tag of scope.tags) {
          expect(TAGS).toContain(tag);
        }
      }
    }
  });
});

describe('catalog: rasgos, habilidades y condiciones', () => {
  const traitIds = Object.keys(TRAITS) as TraitId[];
  const skillIds = Object.keys(SKILLS) as SkillId[];
  const conditionIds = Object.keys(CONDITIONS) as ConditionId[];

  it('los ids no se repiten entre rasgos, habilidades y condiciones', () => {
    const all = [...traitIds, ...skillIds, ...conditionIds];
    expect(new Set(all).size).toBe(all.length);
  });

  it('hay 8 rasgos en el orden del diseño', () => {
    expect(traitIds).toEqual([
      'hijo_de_la_frontera',
      'criado_en_el_templo',
      'desertor',
      'huerfano_de_la_peste',
      'aprendiz_de_escriba',
      'contrabandista',
      'cazador_furtivo',
      'hijo_de_molinero',
    ]);
  });

  it('ningún rasgo repite tag con otro rasgo: 8 rasgos, 8 tags distintos, todos del catálogo', () => {
    const tags = traitIds.map((id) => TRAITS[id].tag);
    expect(tags).toHaveLength(8);
    expect(new Set(tags).size).toBe(8);
    for (const tag of tags) {
      expect(TAGS).toContain(tag);
    }
  });

  it('los tags de los rasgos son los del diseño', () => {
    expect(TRAITS.hijo_de_la_frontera.tag).toBe('supervivencia');
    expect(TRAITS.criado_en_el_templo.tag).toBe('fe');
    expect(TRAITS.desertor.tag).toBe('fisico');
    expect(TRAITS.huerfano_de_la_peste.tag).toBe('percepcion');
    expect(TRAITS.aprendiz_de_escriba.tag).toBe('saber');
    expect(TRAITS.contrabandista.tag).toBe('engano');
    expect(TRAITS.cazador_furtivo.tag).toBe('sigilo');
    expect(TRAITS.hijo_de_molinero.tag).toBe('social');
  });

  it('cada rasgo tiene nombre y descripción no vacíos', () => {
    for (const id of traitIds) {
      expect(TRAITS[id].name.length).toBeGreaterThan(0);
      expect(TRAITS[id].description.length).toBeGreaterThan(0);
    }
    expect(TRAITS.desertor.name).toBe('Desertor');
    expect(TRAITS.huerfano_de_la_peste.name).toBe('Huérfano de la peste');
  });

  it('hay 12 habilidades con nombre y con tag del catálogo', () => {
    expect(skillIds).toEqual([
      'veterano', 'intimidante', 'orador', 'rastreador', 'ojo_avizor', 'escurridizo',
      'erudito_de_runas', 'vista_arcana', 'voz_del_templo', 'curandero', 'superviviente', 'manos_ligeras',
    ]);
    for (const id of skillIds) {
      expect(SKILLS[id].name.length).toBeGreaterThan(0);
      expect(TAGS).toContain(SKILLS[id].tag);
    }
    expect(SKILLS.veterano.tag).toBe('fisico');
    expect(SKILLS.manos_ligeras.tag).toBe('sigilo');
    expect(SKILLS.intimidante.tag).toBe('social');
    expect(SKILLS.orador.tag).toBe('social');
    expect(SKILLS.vista_arcana.tag).toBe('magia');
  });

  it('hay 6 condiciones; su tag es un Tag del catálogo o "all"', () => {
    expect(conditionIds).toEqual(['envenenado', 'asustado', 'exhausto', 'empapado', 'perseguido', 'agotado']);
    for (const id of conditionIds) {
      const tag = CONDITIONS[id].tag;
      expect(tag === 'all' || TAGS.includes(tag)).toBe(true);
    }
    expect(CONDITIONS.envenenado.tag).toBe('all');
    expect(CONDITIONS.asustado.tag).toBe('social');
    expect(CONDITIONS.exhausto.tag).toBe('fisico');
    expect(CONDITIONS.empapado.tag).toBe('sigilo');
    expect(CONDITIONS.perseguido.tag).toBe('huida');
    expect(CONDITIONS.agotado.tag).toBe('magia');
  });

  it('la condición por defecto del Fallo grave es exhausto y existe en el catálogo', () => {
    expect(FUMBLE_DEFAULT_CONDITION).toBe('exhausto');
    expect(conditionIds).toContain(FUMBLE_DEFAULT_CONDITION);
  });
});
