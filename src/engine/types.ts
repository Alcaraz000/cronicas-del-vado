import type { Attr, ClassId, TraitId, SkillId, ConditionId, Difficulty } from '@/content/catalog';
import type { Campaign, SceneKind } from '@/content/schema';

/** Personaje muerto en una campaña; vive en el perfil (world.fallen). */
export interface Fallen {
  name: string;
  classId: ClassId;
  level: number;
  campaign: string;
  scene: string;
}

/** Estado del mundo (perfil): flags `world:` y Caídos. */
export interface WorldState {
  flags: string[];
  fallen: Fallen[];
}

export interface CampaignLogEntry {
  runs: number;
  wins: number;
  endings: string[];
  milestones: string[];
  canonEnding?: string;
}

export interface Character {
  id: string;
  name: string;
  portrait: string;
  classId: ClassId;
  attrs: Record<Attr, number>;
  traits: TraitId[];
  skills: SkillId[];
  level: number;
  xp: number;
  /** Flags `char:`. */
  flags: string[];
  memoryNames: Record<string, { name: string; campaign: string }>;
  relics: string[];
  /** Reservado para la v2. */
  scars: string[];
  campaignLog: Record<string, CampaignLogEntry>;
  run: Run | null;
  dead?: { campaign: string; scene: string };
}

/** cancelled = había ventaja y desventaja a la vez: se anulan y se tiran 2d6. */
export type RollMode = 'normal' | 'advantage' | 'disadvantage' | 'cancelled';

export type Band = 'crit' | 'success' | 'partial' | 'failure' | 'fumble';

export type Risk = 'seguro' | 'arriesgado' | 'peligroso';

export interface ResolvedParagraph {
  speaker?: string;
  text: string;
}

export type LogEntry =
  | { kind: 'scene'; sceneId: string; paragraphs: ResolvedParagraph[]; hashes: string[] }
  | { kind: 'choice'; sceneId: string; choiceId: string; label: string }
  /** `kept` son ÍNDICES dentro de `dice` (lo que devuelve keepDice); los valores son kept.map((i) => dice[i]). */
  | { kind: 'roll'; dice: number[]; kept: number[]; mode: RollMode; total: number; band: Band; fortuneSpent: number; powerUsed: boolean }
  | { kind: 'outcome'; paragraphs: ResolvedParagraph[] };

export type RunOutcome = { kind: 'ending'; endingId: string } | { kind: 'defeat' } | { kind: 'death' };

/** Tupla mínima persistida al mostrar los dados; rerolls = índices de dado repetidos, en orden. */
export interface PendingPersisted {
  choiceId: string;
  rerolls: number[];
  powerUsed: boolean;
}

export interface Run {
  campaignId: string;
  contentVersion: number;
  sceneId: string;
  /** Flags `run:`. */
  flags: string[];
  /** Flags `char:<campaña>.*` y `world:<campaña>.*` apostados hasta terminar por un final. */
  stagedFlags: string[];
  visited: Record<string, number>;
  items: string[];
  wounds: 0 | 1 | 2 | 3;
  conditions: ConditionId[];
  fortune: number;
  powerUsed: boolean;
  clocks: Record<string, number>;
  milestones: string[];
  log: LogEntry[];
  rngSeed: number;
  pending?: PendingPersisted;
  outcome?: RunOutcome;
}

/** sceneId → hashes de párrafo vistos (de la campaña actual). */
export type SeenMap = Record<string, string[]>;

export interface GameState {
  world: WorldState;
  character: Character;
  run: Run;
  seen: SeenMap;
}

export interface EvalContext {
  campaign: Campaign;
  state: GameState;
}

export interface RollSource {
  kind: 'advantage' | 'disadvantage';
  label: string;
  origin: 'trait' | 'skill' | 'item' | 'class' | 'condition' | 'wound' | 'scene';
  cancelled: boolean;
}

export interface RollPreview {
  attr: Attr;
  attrValue: number;
  difficulty: Difficulty;
  difficultyMod: number;
  veteranMod: number;
  totalMod: number;
  mode: RollMode;
  sources: RollSource[];
  odds: { success: number; partial: number; failure: number };
  risk: Risk;
  targetLine: string;
}

export interface RenderedChoice {
  id: string;
  label: string;
  visible: boolean;
  enabled: boolean;
  badge?: string;
  lockedHint?: string;
  preview?: RollPreview;
  leadsToLethal: boolean;
  alreadySeen: boolean;
}

export interface RenderedScene {
  sceneId: string;
  kind: SceneKind;
  lethal: boolean;
  place: string;
  variant?: string;
  cg?: string;
  portraitNpc?: string;
  paragraphs: ResolvedParagraph[];
  choices: RenderedChoice[];
  ending?: { id: string; title: string; epilogue: ResolvedParagraph[] };
}

export interface PendingRoll {
  choiceId: string;
  sceneId: string;
  preview: RollPreview;
  dice: number[];
  /** Índices (dentro de `dice`) de los 2 dados conservados, como devuelve keepDice; los valores son kept.map((i) => dice[i]). */
  kept: number[];
  total: number;
  band: Band;
  /** Índices de dado repetidos con Fortuna, en orden. */
  rerolls: number[];
  powerUsed: boolean;
  canReroll: boolean;
  canUsePower: boolean;
}

export interface EndSummary {
  outcome: RunOutcome;
  canonFlags: string[];
  discardedFlags: string[];
}
