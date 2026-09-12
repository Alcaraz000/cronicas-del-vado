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
