import { LIMITS } from '@/content/catalog';
import type { Campaign, Choice, Scene } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import { applyEffects } from '@/engine/effects';
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

function renderChoice(choice: Choice): RenderedChoice {
  return {
    id: choice.id,
    label: choice.label,
    visible: true,
    enabled: true,
    leadsToLethal: false,
    alreadySeen: false,
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
    choices: scene.choices.map((choice) => renderChoice(choice)),
    ...(ending !== undefined ? { ending } : {}),
  };
}
