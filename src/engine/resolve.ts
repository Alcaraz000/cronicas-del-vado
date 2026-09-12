import { CLASSES, LIMITS, SKILLS, TRAITS } from '@/content/catalog';
import type { Campaign, Choice, Condition, Scene } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import { applyEffects } from '@/engine/effects';
import { buildPreview } from '@/engine/modifiers';
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
