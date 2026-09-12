import { z } from 'zod';
import {
  ATTRS,
  TAGS,
  DIFFICULTIES,
  CLASSES,
  TRAITS,
  SKILLS,
  CONDITIONS,
  type Attr,
  type Tag,
  type Difficulty,
  type ClassId,
  type TraitId,
  type SkillId,
  type ConditionId,
} from '@/content/catalog';

// ---------------------------------------------------------------------------
// Tipos de contenido (escritos a mano; los esquemas zod de abajo los espejan y
// un test con expectTypeOf comprueba que coinciden en los dos sentidos).
// ---------------------------------------------------------------------------

export type FlagId = `run:${string}` | `char:${string}` | `world:${string}`;

export type SceneKind = 'normal' | 'hub' | 'encounter' | 'rest' | 'ending';

export type Condition =
  | { flag: FlagId }
  | { not: Condition }
  | { all: Condition[] }
  | { any: Condition[] }
  | { class: ClassId }
  | { trait: TraitId }
  | { skill: SkillId }
  | { item: string }
  | { attr: Attr; gte: number }
  | { wounds: { gte?: number; lte?: number } }
  | { condition: ConditionId }
  | { visited: string; min?: number }
  | { met: string }
  | { knows: string }
  | { clock: string; gte: number }
  | { endingSeen: string };

export type Effect =
  | { set: FlagId }
  | { clear: FlagId }
  | { give: string }
  | { take: string }
  | { wound: 1 | 2 }
  | { heal: 1 }
  | { addCondition: ConditionId }
  | { removeCondition: ConditionId | 'all' }
  | { clock: string; delta: number }
  | { milestone: string }
  | { fortune: number }
  | { lethal: true };

export interface TextVariant {
  when?: Condition;
  text: string;
}

export interface Paragraph {
  speaker?: string;
  variants: TextVariant[];
}

export type Text = (string | Paragraph)[];

export interface Outcome {
  text?: Text;
  effects?: Effect[];
  next: string;
}

export interface Roll {
  attr: Attr;
  difficulty: Difficulty;
  tags: Tag[];
  advantageIf?: Condition;
  disadvantageIf?: Condition;
  outcomes: { success: Outcome; partial: Outcome; failure: Outcome; crit?: Outcome; fumble?: Outcome };
}

export interface Choice {
  id: string;
  label: string;
  requires?: Condition;
  lockedHint?: string;
  roll?: Roll;
  outcome?: Outcome;
}

export interface Redirect {
  when: Condition;
  to: string;
}

// Orden fijo del motor (Tarea 9): enter resuelve `redirect` sobre el estado de
// entrada; aplica `onEnter` de la escena final; render evalúa `when`, `requires`
// y `advantageIf` contra ese estado (todavía sin la memoria de esta escena); al
// elegir se deriva la memoria (visited, met, place, párrafos vistos), se aplican
// efectos y se entra a la siguiente escena.
export interface Scene {
  id: string;
  kind: SceneKind;
  lethal?: true;
  place: string;
  variant?: string;
  cg?: string;
  npcs?: string[];
  redirect?: Redirect[];
  onEnter?: Effect[];
  text: Text;
  choices: Choice[];
  ending?: { id: string; epilogue: Text };
}

export interface Npc {
  id: string;
  name: string;
  portrait: string;
  voice: string;
  canonPrompt: string;
}

export interface Place {
  id: string;
  name: string;
  background: string;
  variants?: Record<string, string>;
  canonPrompt: string;
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  description: string;
  advantageTags?: Tag[];
  relic?: true;
}

export interface CampaignMeta {
  id: string;
  contentVersion: number;
  title: string;
  premise: string;
  cover: string;
  levelRange: [number, number];
  durationMin: [number, number];
  lethalScenes: number;
  lintProfile: 'smoke' | 'release';
  hidden?: true;
}

export interface Campaign extends CampaignMeta {
  start: string;
  scenes: Record<string, Scene>;
  npcs: Record<string, Npc>;
  places: Record<string, Place>;
  items: Record<string, Item>;
  flags: Record<string, string>;
  milestones: Record<string, { label: string }>;
  clocks: Record<string, { max: number; label: string }>;
  endings: Record<string, { title: string; hidden?: true; reward?: Effect[] }>;
}

export interface WorldContent {
  npcs: Record<string, Npc>;
  places: Record<string, Place>;
  items: Record<string, Item>;
  flags: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Esquemas zod espejo
// ---------------------------------------------------------------------------

const FLAG_REGEX = /^(run|char|world):/;

export const FlagIdSchema = z.custom<FlagId>(
  (value) => typeof value === 'string' && FLAG_REGEX.test(value),
  { message: 'El flag debe empezar con run:, char: o world:' },
);

const AttrSchema = z.enum(ATTRS);
const TagSchema = z.enum(TAGS);
const DifficultySchema = z.enum(Object.keys(DIFFICULTIES) as [Difficulty, ...Difficulty[]]);
const ClassIdSchema = z.enum(Object.keys(CLASSES) as [ClassId, ...ClassId[]]);
const TraitIdSchema = z.enum(Object.keys(TRAITS) as [TraitId, ...TraitId[]]);
const SkillIdSchema = z.enum(Object.keys(SKILLS) as [SkillId, ...SkillId[]]);
const ConditionIdSchema = z.enum(Object.keys(CONDITIONS) as [ConditionId, ...ConditionId[]]);

const idSchema = z.string().min(1);

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ flag: FlagIdSchema }),
    z.object({ not: ConditionSchema }),
    z.object({ all: z.array(ConditionSchema) }),
    z.object({ any: z.array(ConditionSchema) }),
    z.object({ class: ClassIdSchema }),
    z.object({ trait: TraitIdSchema }),
    z.object({ skill: SkillIdSchema }),
    z.object({ item: idSchema }),
    z.object({ attr: AttrSchema, gte: z.number().int() }),
    z.object({ wounds: z.object({ gte: z.number().int().optional(), lte: z.number().int().optional() }) }),
    z.object({ condition: ConditionIdSchema }),
    z.object({ visited: idSchema, min: z.number().int().min(1).optional() }),
    z.object({ met: idSchema }),
    z.object({ knows: idSchema }),
    z.object({ clock: idSchema, gte: z.number().int() }),
    z.object({ endingSeen: idSchema }),
  ]),
);

export const EffectSchema = z.union([
  z.object({ set: FlagIdSchema }),
  z.object({ clear: FlagIdSchema }),
  z.object({ give: idSchema }),
  z.object({ take: idSchema }),
  z.object({ wound: z.union([z.literal(1), z.literal(2)]) }),
  z.object({ heal: z.literal(1) }),
  z.object({ addCondition: ConditionIdSchema }),
  z.object({ removeCondition: z.union([ConditionIdSchema, z.literal('all')]) }),
  z.object({ clock: idSchema, delta: z.number().int() }),
  z.object({ milestone: idSchema }),
  z.object({ fortune: z.number().int() }),
  z.object({ lethal: z.literal(true) }),
]);

export const TextVariantSchema = z.object({
  when: ConditionSchema.optional(),
  text: z.string(),
});

export const ParagraphSchema = z.object({
  speaker: idSchema.optional(),
  variants: z.array(TextVariantSchema).min(1),
});

export const TextSchema = z.array(z.union([z.string(), ParagraphSchema]));

export const OutcomeSchema = z.object({
  text: TextSchema.optional(),
  effects: z.array(EffectSchema).optional(),
  next: idSchema,
});

export const RollSchema = z.object({
  attr: AttrSchema,
  difficulty: DifficultySchema,
  tags: z.array(TagSchema),
  advantageIf: ConditionSchema.optional(),
  disadvantageIf: ConditionSchema.optional(),
  outcomes: z.object({
    success: OutcomeSchema,
    partial: OutcomeSchema,
    failure: OutcomeSchema,
    crit: OutcomeSchema.optional(),
    fumble: OutcomeSchema.optional(),
  }),
});

export const ChoiceSchema = z
  .object({
    id: idSchema,
    label: z.string().min(1),
    requires: ConditionSchema.optional(),
    lockedHint: z.string().min(1).optional(),
    roll: RollSchema.optional(),
    outcome: OutcomeSchema.optional(),
  })
  .refine((choice) => (choice.roll !== undefined) !== (choice.outcome !== undefined), {
    message: 'Una opción debe tener exactamente uno de roll u outcome',
    path: ['roll'],
  });

const SceneKindSchema = z.enum(['normal', 'hub', 'encounter', 'rest', 'ending']);

export const RedirectSchema = z.object({
  when: ConditionSchema,
  to: idSchema,
});

export const SceneSchema = z
  .object({
    id: idSchema,
    kind: SceneKindSchema,
    lethal: z.literal(true).optional(),
    place: idSchema,
    variant: idSchema.optional(),
    cg: idSchema.optional(),
    npcs: z.array(idSchema).optional(),
    redirect: z.array(RedirectSchema).optional(),
    onEnter: z.array(EffectSchema).optional(),
    text: TextSchema,
    choices: z.array(ChoiceSchema),
    ending: z.object({ id: idSchema, epilogue: TextSchema }).optional(),
  })
  .refine((scene) => scene.kind !== 'ending' || scene.ending !== undefined, {
    message: 'Una escena de tipo ending necesita el campo ending',
    path: ['ending'],
  })
  .refine((scene) => scene.kind !== 'ending' || scene.choices.length === 0, {
    message: 'Una escena de tipo ending no puede tener opciones',
    path: ['choices'],
  });

export const NpcSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  portrait: idSchema,
  voice: z.string(),
  canonPrompt: z.string(),
});

export const PlaceSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  background: idSchema,
  variants: z.record(z.string(), z.string()).optional(),
  canonPrompt: z.string(),
});

export const ItemSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  icon: idSchema,
  description: z.string(),
  advantageTags: z.array(TagSchema).optional(),
  relic: z.literal(true).optional(),
});

export const CampaignMetaSchema = z.object({
  id: idSchema,
  contentVersion: z.number().int().min(1),
  title: z.string().min(1),
  premise: z.string(),
  cover: idSchema,
  levelRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  durationMin: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  lethalScenes: z.number().int().min(0),
  lintProfile: z.enum(['smoke', 'release']),
  hidden: z.literal(true).optional(),
});

export const CampaignSchema = CampaignMetaSchema.extend({
  start: idSchema,
  scenes: z.record(z.string(), SceneSchema),
  npcs: z.record(z.string(), NpcSchema),
  places: z.record(z.string(), PlaceSchema),
  items: z.record(z.string(), ItemSchema),
  flags: z.record(z.string(), z.string()),
  milestones: z.record(z.string(), z.object({ label: z.string().min(1) })),
  clocks: z.record(z.string(), z.object({ max: z.number().int().min(1), label: z.string().min(1) })),
  endings: z.record(
    z.string(),
    z.object({
      title: z.string().min(1),
      hidden: z.literal(true).optional(),
      reward: z.array(EffectSchema).optional(),
    }),
  ),
});

export const WorldContentSchema = z.object({
  npcs: z.record(z.string(), NpcSchema),
  places: z.record(z.string(), PlaceSchema),
  items: z.record(z.string(), ItemSchema),
  flags: z.record(z.string(), z.string()),
});

export function parseCampaign(data: unknown): Campaign {
  return CampaignSchema.parse(data);
}
