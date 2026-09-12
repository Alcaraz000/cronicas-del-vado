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
