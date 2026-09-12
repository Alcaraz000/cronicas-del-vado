/**
 * Esquema zod del guardado (spec §9). Es el formato que escribe `persist` y el que
 * exporta e importa el jugador: el wrapper `{ state, version }`.
 *
 * Solo se usa al IMPORTAR. El guardado propio no se valida en cada `set` —sería caro y
 * el motor ya garantiza la forma—, pero un archivo pegado por el jugador puede venir
 * de cualquier lado: acá se comprueba antes de dejarlo entrar al store.
 *
 * Espeja los tipos de `engine/types.ts` y `state/store.ts`; un test con `expectTypeOf`
 * comprueba que lo inferido por zod y esos tipos coinciden en los dos sentidos.
 */
import { z } from 'zod';
import {
  CLASSES,
  CONDITIONS,
  LIMITS,
  SKILLS,
  TRAITS,
  type ClassId,
  type ConditionId,
  type SkillId,
  type TraitId,
} from '@/content/catalog';
import { PERSIST_VERSION, runMigrations } from '@/state/migrations';

const ClassIdSchema = z.enum(Object.keys(CLASSES) as [ClassId, ...ClassId[]]);
const TraitIdSchema = z.enum(Object.keys(TRAITS) as [TraitId, ...TraitId[]]);
const SkillIdSchema = z.enum(Object.keys(SKILLS) as [SkillId, ...SkillId[]]);
const ConditionIdSchema = z.enum(Object.keys(CONDITIONS) as [ConditionId, ...ConditionId[]]);

const entero = z.number().int();
const idSchema = z.string().min(1);

const AttrsSchema = z.object({
  vigor: entero.min(0).max(LIMITS.maxAttr),
  astucia: entero.min(0).max(LIMITS.maxAttr),
  saber: entero.min(0).max(LIMITS.maxAttr),
  presencia: entero.min(0).max(LIMITS.maxAttr),
});

const ResolvedParagraphSchema = z.object({
  speaker: z.string().optional(),
  text: z.string(),
});

const RollModeSchema = z.enum(['normal', 'advantage', 'disadvantage', 'cancelled']);
const BandSchema = z.enum(['crit', 'success', 'partial', 'failure', 'fumble']);

const LogEntrySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('scene'),
    sceneId: idSchema,
    paragraphs: z.array(ResolvedParagraphSchema),
    hashes: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('choice'),
    sceneId: idSchema,
    choiceId: idSchema,
    label: z.string(),
  }),
  z.object({
    kind: z.literal('roll'),
    dice: z.array(entero),
    kept: z.array(entero),
    mode: RollModeSchema,
    total: entero,
    band: BandSchema,
    fortuneSpent: entero,
    powerUsed: z.boolean(),
  }),
  z.object({
    kind: z.literal('outcome'),
    paragraphs: z.array(ResolvedParagraphSchema),
  }),
]);

const RunOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ending'), endingId: idSchema }),
  z.object({ kind: z.literal('defeat') }),
  z.object({ kind: z.literal('death') }),
]);

const RunSchema = z.object({
  campaignId: idSchema,
  contentVersion: entero,
  sceneId: idSchema,
  flags: z.array(z.string()),
  stagedFlags: z.array(z.string()),
  visited: z.record(z.string(), entero),
  items: z.array(z.string()),
  wounds: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  conditions: z.array(ConditionIdSchema),
  fortune: entero,
  powerUsed: z.boolean(),
  clocks: z.record(z.string(), entero),
  milestones: z.array(z.string()),
  log: z.array(LogEntrySchema),
  rngSeed: z.number(),
  pending: z
    .object({ choiceId: idSchema, rerolls: z.array(entero), powerUsed: z.boolean() })
    .optional(),
  outcome: RunOutcomeSchema.optional(),
});

const CampaignLogEntrySchema = z.object({
  runs: entero.min(0),
  wins: entero.min(0),
  endings: z.array(z.string()),
  milestones: z.array(z.string()),
  canonEnding: z.string().optional(),
});

const CharacterSchema = z.object({
  id: idSchema,
  name: z.string(),
  portrait: z.string(),
  classId: ClassIdSchema,
  attrs: AttrsSchema,
  traits: z.array(TraitIdSchema),
  skills: z.array(SkillIdSchema),
  level: entero.min(1).max(LIMITS.maxLevel),
  xp: z.number().min(0),
  flags: z.array(z.string()),
  memoryNames: z.record(z.string(), z.object({ name: z.string(), campaign: z.string() })),
  relics: z.array(z.string()),
  scars: z.array(z.string()),
  campaignLog: z.record(z.string(), CampaignLogEntrySchema),
  run: RunSchema.nullable(),
  dead: z.object({ campaign: z.string(), scene: z.string() }).optional(),
});

const FallenSchema = z.object({
  name: z.string(),
  classId: ClassIdSchema,
  level: entero,
  campaign: z.string(),
  scene: z.string(),
});

const WorldStateSchema = z.object({
  flags: z.array(z.string()),
  fallen: z.array(FallenSchema),
});

const PrefsSchema = z.object({
  cps: z.number(),
  showOdds: z.boolean(),
  fontScale: z.union([z.literal(1), z.literal(1.25), z.literal(1.5)]),
  reducedMotion: z.enum(['auto', 'on']),
});

/** El estado persistido: todo lo que `partialize` guarda bajo la clave `juegorol`. */
export const PersistedSliceSchema = z.object({
  characters: z.array(CharacterSchema).max(LIMITS.maxCharacters),
  activeCharacterId: z.string().nullable(),
  world: WorldStateSchema,
  seen: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
  prefs: PrefsSchema,
});

/** El archivo entero: lo que `persist` escribe en localStorage y lo que se exporta. */
export const SaveFileSchema = z.object({
  version: entero.min(0),
  state: PersistedSliceSchema,
});

export type SaveFile = z.infer<typeof SaveFileSchema>;
export type SavedState = z.infer<typeof PersistedSliceSchema>;

/** Primer problema del esquema, en una línea legible: "characters.0.level: …". */
function primerProblema(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue === undefined) return 'formato desconocido';
  const camino = issue.path.map((p) => String(p)).join('.');
  return camino === '' ? issue.message : `${camino}: ${issue.message}`;
}

export type ParseSaveResult = { ok: true; state: SavedState } | { ok: false; error: string };

/**
 * Lee un guardado exportado: JSON → wrapper → migraciones desde su `version` → zod.
 *
 * El orden importa: las migraciones corren ANTES de validar, porque un guardado viejo
 * tiene la forma vieja y el esquema describe la actual. Nunca lanza: devuelve el motivo
 * en castellano para que la pantalla de Opciones lo muestre sin romper nada.
 */
export function parseSave(json: string): ParseSaveResult {
  let crudo: unknown;
  try {
    crudo = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, error: 'El texto no es un JSON válido' };
  }

  const wrapper = z.object({ version: entero.min(0), state: z.unknown() }).safeParse(crudo);
  if (!wrapper.success) {
    return { ok: false, error: 'No parece un guardado de Crónicas del Vado (falta "version" o "state")' };
  }
  if (wrapper.data.version > PERSIST_VERSION) {
    return {
      ok: false,
      error: `El guardado es de una versión más nueva del juego (${wrapper.data.version}); actualizá antes de importarlo`,
    };
  }

  const migrado = runMigrations(wrapper.data.state, wrapper.data.version);
  const validado = PersistedSliceSchema.safeParse(migrado);
  if (!validado.success) {
    return { ok: false, error: `El guardado no tiene el formato esperado — ${primerProblema(validado.error)}` };
  }

  const state = validado.data;
  // Un id activo que no apunta a ningún personaje no justifica rechazar el guardado entero:
  // se repara. Cualquier otra inconsistencia sí es motivo de rechazo.
  const activo = state.activeCharacterId;
  if (activo !== null && !state.characters.some((c) => c.id === activo)) {
    return { ok: true, state: { ...state, activeCharacterId: null } };
  }
  return { ok: true, state };
}
