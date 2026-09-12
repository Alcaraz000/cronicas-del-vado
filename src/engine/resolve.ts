import { CLASSES, FUMBLE_DEFAULT_CONDITION, LIMITS, SKILLS, TRAITS, type ClassId, type PowerScope, type Tag } from '@/content/catalog';
import type { Campaign, Choice, Condition, Effect, Outcome, Roll, Scene } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import { classify, keepDice } from '@/engine/dice';
import { applyEffects } from '@/engine/effects';
import { buildPreview } from '@/engine/modifiers';
import { deriveMemory } from '@/engine/memory';
import { fortuneMax } from '@/engine/progression';
import { rollDice } from '@/engine/rng';
import { hashParagraph, resolveText } from '@/engine/text';
import type {
  Band,
  CampaignLogEntry,
  Character,
  EndSummary,
  EvalContext,
  Fallen,
  GameState,
  LogEntry,
  PendingRoll,
  RenderedChoice,
  RenderedScene,
  ResolvedParagraph,
  Run,
  WorldState,
} from '@/engine/types';

// resolve.ts, parte 1 (Tarea 9): getScene, enter, render.
// La Tarea 10 agrega en este mismo archivo: choose, beginRoll, rerollDie, usePower,
// usePlegaria, restorePending, commitRoll y endRun.

const BADGE_RECUERDO = 'Recuerdo';

export function getScene(campaign: Campaign, sceneId: string): Scene {
  const scene = campaign.scenes[sceneId];
  if (scene === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  return scene;
}

/** Sigue la cadena de redirects evaluando siempre contra el estado de entrada (sin aplicar onEnter intermedios). */
function seguirRedirects(campaign: Campaign, state: GameState, sceneId: string): Scene {
  const ctx: EvalContext = { campaign, state };
  let scene = getScene(campaign, sceneId);
  let saltos = 0;
  for (;;) {
    const redirect = (scene.redirect ?? []).find((r) => evaluate(r.when, ctx));
    if (redirect === undefined) {
      return scene;
    }
    saltos += 1;
    if (saltos > LIMITS.maxRedirects) {
      throw new Error(`Demasiados redirects desde ${sceneId}: más de ${LIMITS.maxRedirects} saltos`);
    }
    scene = getScene(campaign, redirect.to);
  }
}

export function enter(campaign: Campaign, state: GameState, sceneId: string): GameState {
  const scene = seguirRedirects(campaign, state, sceneId);
  const ending = scene.kind === 'ending' ? scene.ending : undefined;
  if (scene.kind === 'ending' && ending === undefined) {
    throw new Error(`La escena final ${scene.id} no declara ending`);
  }

  const conEfectos = applyEffects(scene.onEnter, { campaign, state });
  const ctx: EvalContext = { campaign, state: conEfectos };
  const texto = resolveText(scene.text, ctx);
  const epilogo = ending !== undefined ? resolveText(ending.epilogue, ctx) : [];
  const paragraphs = [...texto, ...epilogo];
  const entrada: LogEntry = {
    kind: 'scene',
    sceneId: scene.id,
    paragraphs,
    hashes: paragraphs.map((p) => hashParagraph(p.text)),
  };
  const log = [...conEfectos.run.log, entrada].slice(-LIMITS.maxLog);
  const run: Run = { ...conEfectos.run, sceneId: scene.id, log };

  if (ending !== undefined) {
    return { ...conEfectos, run: { ...run, outcome: { kind: 'ending', endingId: ending.id } } };
  }
  return { ...conEfectos, run };
}

type LogScene = Extract<LogEntry, { kind: 'scene' }>;

function ultimaEntradaDeEscena(log: LogEntry[], sceneId: string): LogScene | undefined {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entrada = log[i];
    if (entrada !== undefined && entrada.kind === 'scene' && entrada.sceneId === sceneId) {
      return entrada;
    }
  }
  return undefined;
}

function ultimoHablante(paragraphs: ResolvedParagraph[]): string | undefined {
  for (let i = paragraphs.length - 1; i >= 0; i -= 1) {
    const speaker = paragraphs[i]?.speaker;
    if (speaker !== undefined) {
      return speaker;
    }
  }
  return undefined;
}

/**
 * Badge que la UI muestra entre corchetes, derivado del requires de la opción.
 * El nombre de un objeto se busca en campaign.items, que ya incluye los objetos del mundo: el store
 * fusiona WORLD en la campaña antes de dársela al motor (`conMundo` en state/store.ts), así que las
 * reliquias, que solo se declaran en world/items.ts, también se encuentran acá. Si no está, se usa el id.
 */
function badgeDe(cond: Condition, campaign: Campaign): string | undefined {
  if ('class' in cond) {
    return CLASSES[cond.class].name;
  }
  if ('trait' in cond) {
    return TRAITS[cond.trait].name;
  }
  if ('skill' in cond) {
    return SKILLS[cond.skill].name;
  }
  if ('item' in cond) {
    return campaign.items[cond.item]?.name ?? cond.item;
  }
  if ('met' in cond || 'knows' in cond || 'endingSeen' in cond) {
    return BADGE_RECUERDO;
  }
  if ('flag' in cond) {
    return cond.flag.startsWith('char:') ? BADGE_RECUERDO : undefined;
  }
  if ('all' in cond) {
    return primerBadge(cond.all, campaign);
  }
  if ('any' in cond) {
    return primerBadge(cond.any, campaign);
  }
  return undefined;
}

function primerBadge(conds: Condition[], campaign: Campaign): string | undefined {
  for (const cond of conds) {
    const badge = badgeDe(cond, campaign);
    if (badge !== undefined) {
      return badge;
    }
  }
  return undefined;
}

function renderChoice(choice: Choice, ctx: EvalContext): RenderedChoice {
  const cumple = evaluate(choice.requires, ctx);
  const next = choice.outcome?.next;
  const destino = next !== undefined ? ctx.campaign.scenes[next] : undefined;
  const badge = choice.requires !== undefined ? badgeDe(choice.requires, ctx.campaign) : undefined;

  return {
    id: choice.id,
    label: choice.label,
    visible: cumple || choice.lockedHint !== undefined,
    enabled: cumple,
    ...(badge !== undefined ? { badge } : {}),
    ...(choice.lockedHint !== undefined ? { lockedHint: choice.lockedHint } : {}),
    ...(choice.roll !== undefined ? { preview: buildPreview(choice.roll, ctx) } : {}),
    leadsToLethal: destino !== undefined && destino.lethal === true,
    alreadySeen: next !== undefined && (ctx.state.seen[next]?.length ?? 0) > 0,
  };
}

export function render(campaign: Campaign, state: GameState): RenderedScene {
  const scene = getScene(campaign, state.run.sceneId);
  const ctx: EvalContext = { campaign, state };
  const entrada = ultimaEntradaDeEscena(state.run.log, scene.id);
  const paragraphs = entrada !== undefined ? entrada.paragraphs : resolveText(scene.text, ctx);
  const portraitNpc = ultimoHablante(paragraphs) ?? scene.npcs?.[0];
  const ending =
    scene.kind === 'ending' && scene.ending !== undefined
      ? {
          id: scene.ending.id,
          title: campaign.endings[scene.ending.id]?.title ?? scene.ending.id,
          epilogue: resolveText(scene.ending.epilogue, ctx),
        }
      : undefined;

  return {
    sceneId: scene.id,
    kind: scene.kind,
    lethal: scene.lethal === true,
    place: scene.place,
    ...(scene.variant !== undefined ? { variant: scene.variant } : {}),
    ...(scene.cg !== undefined ? { cg: scene.cg } : {}),
    ...(portraitNpc !== undefined ? { portraitNpc } : {}),
    paragraphs,
    choices: scene.choices.map((choice) => renderChoice(choice, ctx)),
    ...(ending !== undefined ? { ending } : {}),
  };
}

// ---------------------------------------------------------------------------
// Parte 2: elegir, tirar, consolidar y terminar
// ---------------------------------------------------------------------------

/** Busca una opción de la escena o lanza con el id y la escena en el mensaje. */
function findChoiceOrThrow(scene: Scene, choiceId: string): Choice {
  const choice = scene.choices.find((c) => c.id === choiceId);
  if (choice === undefined) {
    throw new Error(`Opción desconocida: ${choiceId} (escena ${scene.id})`);
  }
  return choice;
}

/**
 * Hashes de los párrafos que el jugador vio en la escena actual: los del último
 * LogEntry 'scene' con ese sceneId; si no hay (estado armado a mano), se resuelve el texto ahora.
 */
function hashesOfCurrentScene(campaign: Campaign, state: GameState): string[] {
  const { run } = state;
  for (let i = run.log.length - 1; i >= 0; i -= 1) {
    const entry = run.log[i];
    if (entry !== undefined && entry.kind === 'scene' && entry.sceneId === run.sceneId) {
      return [...entry.hashes];
    }
  }
  const scene = getScene(campaign, run.sceneId);
  return resolveText(scene.text, { campaign, state }).map((p) => hashParagraph(p.text));
}

/** Agrega entradas al log y recorta a las últimas LIMITS.maxLog. */
function appendLogEntries(state: GameState, entries: LogEntry[]): GameState {
  const log = [...state.run.log, ...entries];
  const trimmed = log.length > LIMITS.maxLog ? log.slice(log.length - LIMITS.maxLog) : log;
  return { ...state, run: { ...state.run, log: trimmed } };
}

/**
 * Elegir una opción SIN tirada.
 * Orden fijo: deriveMemory(escena actual) → log 'choice' → applyEffects(outcome.effects)
 * → log 'outcome' (si hay texto) → limpiar run.pending (una tirada pendiente de la escena que se
 * abandona no puede sobrevivir a un choose: si no, restorePending la resolvería contra la escena
 * nueva) → si la partida terminó (defeat/death) se devuelve sin entrar; si no, enter(outcome.next).
 */
export function choose(campaign: Campaign, state: GameState, choiceId: string): GameState {
  const scene = getScene(campaign, state.run.sceneId);
  const choice = findChoiceOrThrow(scene, choiceId);
  if (choice.roll !== undefined) {
    throw new Error(`La opción requiere una tirada: ${choiceId}`);
  }
  const outcome = choice.outcome;
  if (outcome === undefined) {
    throw new Error(`La opción no tiene desenlace: ${choiceId}`);
  }
  const hashes = hashesOfCurrentScene(campaign, state);
  let next = deriveMemory({ campaign, state }, scene.id, hashes);
  next = appendLogEntries(next, [{ kind: 'choice', sceneId: scene.id, choiceId: choice.id, label: choice.label }]);
  next = applyEffects(outcome.effects, { campaign, state: next });
  if (outcome.text !== undefined) {
    const paragraphs = resolveText(outcome.text, { campaign, state: next });
    next = appendLogEntries(next, [{ kind: 'outcome', paragraphs }]);
  }
  next = { ...next, run: withoutPending(next.run) };
  if (next.run.outcome !== undefined) {
    return next;
  }
  return enter(campaign, next, outcome.next);
}

/** Devuelve la opción y su tirada; lanza si la opción no existe o no tiene tirada. */
function rollOfChoice(campaign: Campaign, state: GameState, choiceId: string): { choice: Choice; roll: Roll } {
  const scene = getScene(campaign, state.run.sceneId);
  const choice = findChoiceOrThrow(scene, choiceId);
  if (choice.roll === undefined) {
    throw new Error(`La opción no tiene tirada: ${choiceId}`);
  }
  return { choice, roll: choice.roll };
}

/** ¿El Poder de la clase aplica a estos tags? tags: intersección no vacía; any: siempre; sheet: nunca. */
function powerApplies(classId: ClassId, tags: readonly Tag[]): boolean {
  const scope: PowerScope = CLASSES[classId].power.scope;
  if (scope.kind === 'any') return true;
  if (scope.kind === 'sheet') return false;
  return scope.tags.some((t) => tags.includes(t));
}

/** Regla completa de canUsePower: una vez por partida, una vez por tirada, solo sobre failure/fumble. */
function computeCanUsePower(state: GameState, roll: Roll, band: Band, powerUsed: boolean): boolean {
  if (state.run.powerUsed || powerUsed) return false;
  if (band !== 'failure' && band !== 'fumble') return false;
  return powerApplies(state.character.classId, roll.tags);
}

/**
 * kept (índices), total y banda a partir de los dados. Si el Poder ya se usó,
 * la banda nunca vuelve a failure/fumble: queda en partial.
 */
function evaluateDice(
  dice: number[],
  mode: PendingRoll['preview']['mode'],
  totalMod: number,
  powerUsed: boolean,
): { kept: number[]; total: number; band: Band } {
  const kept = keepDice(dice, mode);
  const valores = kept.map((i) => dice[i] ?? 0);
  const total = valores.reduce((suma, v) => suma + v, 0) + totalMod;
  const cruda = classify(valores, totalMod);
  const band: Band = powerUsed && (cruda === 'failure' || cruda === 'fumble') ? 'partial' : cruda;
  return { kept, total, band };
}

/**
 * Primera fase de una tirada. Calcula preview, dados (hash determinista), kept, total y banda.
 * NO toca el estado: el store persiste aparte `run.pending = { choiceId, rerolls: [], powerUsed: false }`.
 */
export function beginRoll(campaign: Campaign, state: GameState, choiceId: string): PendingRoll {
  const { roll } = rollOfChoice(campaign, state, choiceId);
  const ctx: EvalContext = { campaign, state };
  const preview = buildPreview(roll, ctx);
  const count = preview.mode === 'advantage' || preview.mode === 'disadvantage' ? 3 : 2;
  const { run } = state;
  const visits = run.visited[run.sceneId] ?? 0;
  const dice = rollDice(run.rngSeed, run.sceneId, choiceId, visits, 0, count);
  const { kept, total, band } = evaluateDice(dice, preview.mode, preview.totalMod, false);
  return {
    choiceId,
    sceneId: run.sceneId,
    preview,
    dice,
    kept,
    total,
    band,
    rerolls: [],
    powerUsed: false,
    canReroll: run.fortune > 0,
    canUsePower: computeCanUsePower(state, roll, band, false),
  };
}

/**
 * Repite un dado gastando 1 Fortuna (virtual: se descuenta en commitRoll).
 * El dado nuevo sale del hash con attempt = rerolls.length + 1.
 */
export function rerollDie(campaign: Campaign, state: GameState, pending: PendingRoll, dieIndex: number): PendingRoll {
  if (!pending.canReroll) {
    throw new Error('No queda Fortuna para repetir un dado');
  }
  if (!Number.isInteger(dieIndex) || dieIndex < 0 || dieIndex >= pending.dice.length) {
    throw new Error(`Índice de dado inválido: ${dieIndex}`);
  }
  const { roll } = rollOfChoice(campaign, state, pending.choiceId);
  const { run } = state;
  const visits = run.visited[run.sceneId] ?? 0;
  const attempt = pending.rerolls.length + 1;
  const nuevo = rollDice(run.rngSeed, run.sceneId, pending.choiceId, visits, attempt, 1)[0] ?? 1;
  const dice = pending.dice.map((d, i) => (i === dieIndex ? nuevo : d));
  const rerolls = [...pending.rerolls, dieIndex];
  const { kept, total, band } = evaluateDice(dice, pending.preview.mode, pending.preview.totalMod, pending.powerUsed);
  return {
    ...pending,
    dice,
    kept,
    total,
    band,
    rerolls,
    canReroll: run.fortune - rerolls.length > 0,
    canUsePower: computeCanUsePower(state, roll, band, pending.powerUsed),
  };
}

/** Marca el Poder como usado en el pending: failure/fumble pasan a partial; el resto no cambia. */
function markPowerUsed(pending: PendingRoll): PendingRoll {
  const band: Band = pending.band === 'failure' || pending.band === 'fumble' ? 'partial' : pending.band;
  return { ...pending, band, powerUsed: true, canUsePower: false };
}

/**
 * Convierte un Fallo (o Fallo grave) en Éxito con costo si el Poder de la clase aplica.
 * Lanza si no se puede (ya usado en la partida o en esta tirada, banda no es fallo, scope no aplica).
 */
export function usePower(campaign: Campaign, state: GameState, pending: PendingRoll): PendingRoll {
  const { roll } = rollOfChoice(campaign, state, pending.choiceId);
  if (!computeCanUsePower(state, roll, pending.band, pending.powerUsed)) {
    throw new Error('El Poder no se puede usar en esta tirada');
  }
  return markPowerUsed(pending);
}

/**
 * Poder del Clérigo, desde la ficha: cura 1 Herida y limpia todas las condiciones.
 * Si no es clérigo o ya usó el Poder, devuelve el mismo estado.
 */
export function usePlegaria(_campaign: Campaign, state: GameState): GameState {
  const { character, run } = state;
  if (character.classId !== 'clerigo' || run.powerUsed) {
    return state;
  }
  const wounds = Math.max(0, run.wounds - 1) as Run['wounds'];
  return { ...state, run: { ...run, wounds, conditions: [], powerUsed: true } };
}

/**
 * Reconstruye el PendingRoll desde run.pending tras una recarga: beginRoll, un rerollDie por índice
 * en orden y, si powerUsed, el Poder. Si al final la banda ya no es fallo (el jugador usó el Poder y
 * después repitió un dado hasta el éxito), se conserva powerUsed sin tocar la banda.
 */
export function restorePending(campaign: Campaign, state: GameState): PendingRoll | null {
  const persisted = state.run.pending;
  if (persisted === undefined) {
    return null;
  }
  let pending = beginRoll(campaign, state, persisted.choiceId);
  for (const dieIndex of persisted.rerolls) {
    pending = rerollDie(campaign, state, pending, dieIndex);
  }
  if (persisted.powerUsed) {
    pending = pending.canUsePower ? usePower(campaign, state, pending) : markPowerUsed(pending);
  }
  return pending;
}

/** Desenlace según la banda: crit cae en success y fumble en failure si el autor no escribió el opcional. */
function outcomeForBand(roll: Roll, band: Band): Outcome {
  const o = roll.outcomes;
  if (band === 'crit') return o.crit ?? o.success;
  if (band === 'fumble') return o.fumble ?? o.failure;
  return o[band];
}

/** Copia del run sin la clave `pending`. */
function withoutPending(run: Run): Run {
  const copia: Run = { ...run };
  delete copia.pending;
  return copia;
}

/**
 * Segunda fase de una tirada. Orden fijo:
 * deriveMemory → log 'choice' → log 'roll' → outcome por banda → applyEffects(outcome.effects)
 * → crit: +1 Fortuna (tope fortuneMax) → fumble sin outcomes.fumble: addCondition FUMBLE_DEFAULT_CONDITION
 * → Fortuna -= dados repetidos → Poder usado: run.powerUsed y Agotado si es mago
 * → log 'outcome' si hay texto → limpiar run.pending → si la partida terminó, devolver; si no, enter(next).
 */
export function commitRoll(campaign: Campaign, state: GameState, pending: PendingRoll): GameState {
  if (pending.sceneId !== state.run.sceneId) {
    throw new Error(`La tirada pendiente es de otra escena: ${pending.sceneId}`);
  }
  const { choice, roll } = rollOfChoice(campaign, state, pending.choiceId);
  const hashes = hashesOfCurrentScene(campaign, state);
  let next = deriveMemory({ campaign, state }, state.run.sceneId, hashes);
  next = appendLogEntries(next, [
    { kind: 'choice', sceneId: pending.sceneId, choiceId: choice.id, label: choice.label },
    {
      kind: 'roll',
      dice: [...pending.dice],
      kept: [...pending.kept],
      mode: pending.preview.mode,
      total: pending.total,
      band: pending.band,
      fortuneSpent: pending.rerolls.length,
      powerUsed: pending.powerUsed,
    },
  ]);
  const outcome = outcomeForBand(roll, pending.band);
  next = applyEffects(outcome.effects, { campaign, state: next });
  if (pending.band === 'crit') {
    const max = fortuneMax(next.character.level);
    next = { ...next, run: { ...next.run, fortune: Math.min(max, next.run.fortune + 1) } };
  }
  if (pending.band === 'fumble' && roll.outcomes.fumble === undefined) {
    next = applyEffects([{ addCondition: FUMBLE_DEFAULT_CONDITION }], { campaign, state: next });
  }
  next = { ...next, run: { ...next.run, fortune: Math.max(0, next.run.fortune - pending.rerolls.length) } };
  if (pending.powerUsed) {
    next = { ...next, run: { ...next.run, powerUsed: true } };
    if (next.character.classId === 'mago') {
      next = applyEffects([{ addCondition: 'agotado' }], { campaign, state: next });
    }
  }
  if (outcome.text !== undefined) {
    const paragraphs = resolveText(outcome.text, { campaign, state: next });
    next = appendLogEntries(next, [{ kind: 'outcome', paragraphs }]);
  }
  next = { ...next, run: withoutPending(next.run) };
  if (next.run.outcome !== undefined) {
    return next;
  }
  return enter(campaign, next, outcome.next);
}

/**
 * Tope de reliquias que un personaje puede llevar entre campañas (spec §4, "Reliquias").
 * Vive acá y no en `LIMITS` porque hoy es el único lugar que puede sumar una reliquia.
 */
const MAX_RELICS = 2;

/**
 * Lo que una `reward` de final sabe hacer. El esquema declara `reward?: Effect[]`, pero solo dos
 * formas tienen semántica definida al cerrar la partida:
 * - `{ give: <objeto con relic: true> }` → la reliquia pasa a `character.relics`.
 * - `{ set: 'char:…' | 'world:…' }` → el flag se suma al canon que el final escribe.
 * Todo lo demás se IGNORA en silencio, a propósito: un `give` de un objeto común iría a `run.items`,
 * que se descarta justo acá; `wound`, `heal`, `clock`, `milestone`, `fortune` y compañía tocan una
 * partida que ya terminó; un `set` de `run:` muere con ella. No se inventa semántica y no se lanza,
 * para que una campaña mal escrita no le rompa el cierre a nadie: prohibirlos es trabajo del
 * validador (regla de contenido), no del motor.
 */
function applyReward(
  campaign: Campaign,
  reward: readonly Effect[],
  relics: readonly string[],
): { relics: string[]; flags: string[] } {
  const nextRelics = [...relics];
  const flags: string[] = [];
  for (const effect of reward) {
    if ('give' in effect) {
      const item = campaign.items[effect.give];
      if (item?.relic !== true) continue;
      if (nextRelics.includes(effect.give) || nextRelics.length >= MAX_RELICS) continue;
      nextRelics.push(effect.give);
      continue;
    }
    if ('set' in effect && (effect.set.startsWith('char:') || effect.set.startsWith('world:'))) {
      if (!flags.includes(effect.set)) flags.push(effect.set);
    }
  }
  return { relics: nextRelics, flags };
}

/** Unión ordenada sin duplicados: primero `base`, después los de `extra` que no estaban. */
function unionStrings(base: readonly string[], extra: readonly string[]): string[] {
  const out = [...base];
  for (const x of extra) {
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

/**
 * Cierra la partida y devuelve el mundo y el personaje nuevos más un resumen.
 * - ending: los `char:<campaña>.*` del personaje y los `world:<campaña>.*` del mundo se REEMPLAZAN por los
 *   apostados en run.stagedFlags (canon); los de otras campañas y los espacios compartidos se conservan.
 *   campaignLog: runs+1, wins+1, endings ∪ id, milestones ∪ run.milestones, canonEnding = id.
 *   Además se aplica `endings[<id>].reward` (ver applyReward): reliquias al personaje y flags al canon.
 * - defeat: runs+1, milestones ∪ run.milestones; lo apostado se descarta y no hay recompensa.
 * - death: como defeat, más character.dead, world.fallen y world:caido.<campaña>.
 * En todos los casos character.run = null.
 */
export function endRun(
  campaign: Campaign,
  state: GameState,
): { world: WorldState; character: Character; summary: EndSummary } {
  const { run, character, world } = state;
  const outcome = run.outcome;
  if (outcome === undefined) {
    throw new Error('La partida no terminó todavía');
  }
  const id = campaign.id;
  const charPrefix = `char:${id}.`;
  const worldPrefix = `world:${id}.`;
  const prev: CampaignLogEntry = character.campaignLog[id] ?? { runs: 0, wins: 0, endings: [], milestones: [] };
  const milestones = unionStrings(prev.milestones, run.milestones);

  if (outcome.kind === 'ending') {
    const reward = applyReward(campaign, campaign.endings[outcome.endingId]?.reward ?? [], character.relics);
    const canonChar = unionStrings(
      run.stagedFlags.filter((f) => f.startsWith(charPrefix)),
      reward.flags.filter((f) => f.startsWith('char:')),
    );
    const canonWorld = unionStrings(
      run.stagedFlags.filter((f) => f.startsWith(worldPrefix)),
      reward.flags.filter((f) => f.startsWith('world:')),
    );
    const charFlags = unionStrings(character.flags.filter((f) => !f.startsWith(charPrefix)), canonChar);
    const worldFlags = unionStrings(world.flags.filter((f) => !f.startsWith(worldPrefix)), canonWorld);
    const entry: CampaignLogEntry = {
      runs: prev.runs + 1,
      wins: prev.wins + 1,
      endings: unionStrings(prev.endings, [outcome.endingId]),
      milestones,
      canonEnding: outcome.endingId,
    };
    return {
      world: { ...world, flags: worldFlags, fallen: [...world.fallen] },
      character: {
        ...character,
        flags: charFlags,
        relics: reward.relics,
        campaignLog: { ...character.campaignLog, [id]: entry },
        run: null,
      },
      summary: { outcome, canonFlags: [...canonChar, ...canonWorld], discardedFlags: [] },
    };
  }

  const entry: CampaignLogEntry = { ...prev, runs: prev.runs + 1, milestones };
  const baseCharacter: Character = {
    ...character,
    flags: [...character.flags],
    campaignLog: { ...character.campaignLog, [id]: entry },
    run: null,
  };
  const summary: EndSummary = { outcome, canonFlags: [], discardedFlags: [...run.stagedFlags] };

  if (outcome.kind === 'defeat') {
    return {
      world: { ...world, flags: [...world.flags], fallen: [...world.fallen] },
      character: baseCharacter,
      summary,
    };
  }

  const fallen: Fallen = {
    name: character.name,
    classId: character.classId,
    level: character.level,
    campaign: id,
    scene: run.sceneId,
  };
  return {
    world: { ...world, flags: unionStrings(world.flags, [`world:caido.${id}`]), fallen: [...world.fallen, fallen] },
    character: { ...baseCharacter, dead: { campaign: id, scene: run.sceneId } },
    summary,
  };
}
