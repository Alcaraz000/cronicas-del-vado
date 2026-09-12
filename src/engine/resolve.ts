import { CLASSES, LIMITS, SKILLS, TRAITS } from '@/content/catalog';
import type { Campaign, Choice, Condition, Scene } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import { applyEffects } from '@/engine/effects';
import { buildPreview } from '@/engine/modifiers';
import { deriveMemory } from '@/engine/memory';
import { hashParagraph, resolveText } from '@/engine/text';
import type {
  EvalContext,
  GameState,
  LogEntry,
  RenderedChoice,
  RenderedScene,
  ResolvedParagraph,
  Run,
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
 * En la Fase A el nombre de un objeto se busca solo en campaign.items (WORLD.items está vacío);
 * si no está, se usa el id.
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
 * → log 'outcome' (si hay texto) → si la partida terminó (defeat/death) se devuelve sin entrar;
 * si no, enter(outcome.next).
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
  if (next.run.outcome !== undefined) {
    return next;
  }
  return enter(campaign, next, outcome.next);
}
