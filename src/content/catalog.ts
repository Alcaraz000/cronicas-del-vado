// Catálogo del sistema de reglas de "Crónicas del Vado".
// Solo constantes y tipos derivados de ellas. No importa nada: el motor,
// el esquema de contenido, las herramientas y la UI derivan sus ids de acá.

export const ATTRS = ['vigor', 'astucia', 'saber', 'presencia'] as const;
export type Attr = (typeof ATTRS)[number];
export const ATTR_NAMES: Record<Attr, string> = {
  vigor: 'Vigor',
  astucia: 'Astucia',
  saber: 'Saber',
  presencia: 'Presencia',
};

export const TAGS = [
  'fisico',
  'sigilo',
  'percepcion',
  'social',
  'engano',
  'saber',
  'magia',
  'fe',
  'supervivencia',
  'huida',
] as const;
export type Tag = (typeof TAGS)[number];

// Modificador que la dificultad suma a la tirada 2d6 + atributo.
export const DIFFICULTIES = { facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
  extrema: 'Extrema',
};

// Alcance del Poder de clase:
// - tags: convierte un Fallo en Éxito con costo si la tirada comparte algún tag.
// - any: lo mismo en cualquier tirada.
// - sheet: no actúa sobre tiradas; se usa desde la ficha (Plegaria).
export type PowerScope = { kind: 'tags'; tags: readonly Tag[] } | { kind: 'any' } | { kind: 'sheet' };

export interface ClassDef {
  name: string;
  attr: Attr;
  weakness: Tag;
  power: { id: string; name: string; description: string; scope: PowerScope };
}

export const CLASSES = {
  guerrero: {
    name: 'Guerrero',
    attr: 'vigor',
    weakness: 'sigilo',
    power: {
      id: 'furia',
      name: 'Furia',
      description: 'Convierte un Fallo en Éxito con costo en una tirada física.',
      scope: { kind: 'tags', tags: ['fisico'] },
    },
  },
  explorador: {
    name: 'Explorador',
    attr: 'astucia',
    weakness: 'social',
    power: {
      id: 'sombra',
      name: 'Sombra',
      description: 'Convierte un Fallo en Éxito con costo en sigilo, huida o supervivencia.',
      scope: { kind: 'tags', tags: ['sigilo', 'huida', 'supervivencia'] },
    },
  },
  mago: {
    name: 'Mago',
    attr: 'saber',
    weakness: 'fisico',
    power: {
      id: 'conjuro',
      name: 'Conjuro',
      description: 'Convierte un Fallo en Éxito con costo en cualquier tirada; quedás Agotado.',
      scope: { kind: 'any' },
    },
  },
  clerigo: {
    name: 'Clérigo',
    attr: 'presencia',
    weakness: 'engano',
    power: {
      id: 'plegaria',
      name: 'Plegaria',
      description: 'Cura 1 Herida y limpia todas las condiciones. Se usa desde la ficha.',
      scope: { kind: 'sheet' },
    },
  },
} as const satisfies Record<string, ClassDef>;
export type ClassId = keyof typeof CLASSES;

// Rasgo de origen: ventaja permanente en UN tag + flag `char:origen.<id>` (lo escribe el store al crear el personaje).
export interface TraitDef {
  name: string;
  tag: Tag;
  description: string;
}

export const TRAITS = {
  hijo_de_la_frontera: {
    name: 'Hijo de la frontera',
    tag: 'supervivencia',
    description: 'Creciste donde el mapa se acaba; el monte no te asusta.',
  },
  criado_en_el_templo: {
    name: 'Criado en el templo',
    tag: 'fe',
    description: 'Sabés qué se dice y qué se calla delante de un altar.',
  },
  desertor: {
    name: 'Desertor',
    tag: 'fisico',
    description: 'Serviste, peleaste y te fuiste. Todavía sabés parar un golpe.',
  },
  huerfano_de_la_peste: {
    name: 'Huérfano de la peste',
    tag: 'percepcion',
    description: 'Aprendiste a mirar antes de entrar a una casa.',
  },
  aprendiz_de_escriba: {
    name: 'Aprendiz de escriba',
    tag: 'saber',
    description: 'Leés rápido, incluso lo que no está escrito para vos.',
  },
  contrabandista: {
    name: 'Contrabandista',
    tag: 'engano',
    description: 'Mentir con cara de piedra fue tu oficio.',
  },
  cazador_furtivo: {
    name: 'Cazador furtivo',
    tag: 'sigilo',
    description: 'Sabés moverte sin que el bosque ni el guardabosque te oigan.',
  },
  hijo_de_molinero: {
    name: 'Hijo de molinero',
    tag: 'social',
    description: 'Conocés a la gente de pueblo porque sos de pueblo.',
  },
} as const satisfies Record<string, TraitDef>;
export type TraitId = keyof typeof TRAITS;

// Habilidad: ventaja permanente en un tag. Se gana una en los niveles 3, 5, 7 y 9.
export interface SkillDef {
  name: string;
  tag: Tag;
}

export const SKILLS = {
  veterano: { name: 'Veterano', tag: 'fisico' },
  intimidante: { name: 'Intimidante', tag: 'social' },
  orador: { name: 'Orador', tag: 'social' },
  rastreador: { name: 'Rastreador', tag: 'percepcion' },
  ojo_avizor: { name: 'Ojo avizor', tag: 'percepcion' },
  escurridizo: { name: 'Escurridizo', tag: 'huida' },
  erudito_de_runas: { name: 'Erudito de runas', tag: 'saber' },
  vista_arcana: { name: 'Vista arcana', tag: 'magia' },
  voz_del_templo: { name: 'Voz del templo', tag: 'fe' },
  curandero: { name: 'Curandero', tag: 'supervivencia' },
  superviviente: { name: 'Superviviente', tag: 'supervivencia' },
  manos_ligeras: { name: 'Manos ligeras', tag: 'sigilo' },
} as const satisfies Record<string, SkillDef>;
export type SkillId = keyof typeof SKILLS;

// Condición: desventaja temporal en un tag, o en todas las tiradas ('all').
export interface ConditionDef {
  name: string;
  tag: Tag | 'all';
}

export const CONDITIONS = {
  envenenado: { name: 'Envenenado', tag: 'all' },
  asustado: { name: 'Asustado', tag: 'social' },
  exhausto: { name: 'Exhausto', tag: 'fisico' },
  empapado: { name: 'Empapado', tag: 'sigilo' },
  perseguido: { name: 'Perseguido', tag: 'huida' },
  agotado: { name: 'Agotado', tag: 'magia' },
} as const satisfies Record<string, ConditionDef>;
export type ConditionId = keyof typeof CONDITIONS;

// Condición que aplica un Fallo grave (doble 1) cuando la tirada no define un outcome `fumble` propio.
export const FUMBLE_DEFAULT_CONDITION: ConditionId = 'exhausto';

export const LIMITS = {
  maxItems: 6,          // ranuras de objetos por partida
  maxConditions: 3,     // condiciones simultáneas; la cuarta reemplaza a la más antigua
  maxRedirects: 8,      // saltos de redirect encadenados antes de considerar un ciclo
  maxLog: 400,          // entradas del historial de la partida que se conservan
  fortuneBase: 3,       // Fortuna por partida
  fortuneFromLevel5: 4, // Fortuna por partida desde nivel 5
  maxWounds: 3,         // 3 Heridas = Caído
  maxAttr: 5,           // techo de cada atributo
  maxLevel: 10,
  xpPerLevel: 60,
  minChoices: 4,        // opciones mínimas por escena no final
  maxChoices: 9,        // opciones máximas (teclas 1-9)
  maxCharacters: 3,     // personajes por perfil
} as const;

// Índice = cantidad de Heridas (0..maxWounds).
export const WOUND_LABELS = ['Sano', 'Herido', 'Malherido', 'Caído'] as const;

// Regla de identidad (spec, sección 4): no se puede elegir un rasgo ni una habilidad
// cuyo tag coincida con la Debilidad de la clase. La UI de creación oculta los
// incompatibles con el motivo; el motor no necesita lógica extra.
export function isTraitAllowed(classId: ClassId, traitId: TraitId): boolean {
  return TRAITS[traitId].tag !== CLASSES[classId].weakness;
}

export function isSkillAllowed(classId: ClassId, skillId: SkillId): boolean {
  return SKILLS[skillId].tag !== CLASSES[classId].weakness;
}
