import { LIMITS } from '@/content/catalog';
import type { Campaign, Scene } from '@/content/schema';
import { applyEffects } from '@/engine/effects';
import { hashParagraph, resolveText } from '@/engine/text';
import type { EvalContext, GameState, LogEntry, Run } from '@/engine/types';

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

export function enter(campaign: Campaign, state: GameState, sceneId: string): GameState {
  const scene = getScene(campaign, sceneId);
  const conEfectos = applyEffects(scene.onEnter, { campaign, state });
  const ctx: EvalContext = { campaign, state: conEfectos };
  const paragraphs = resolveText(scene.text, ctx);
  const entrada: LogEntry = {
    kind: 'scene',
    sceneId: scene.id,
    paragraphs,
    hashes: paragraphs.map((p) => hashParagraph(p.text)),
  };
  const log = [...conEfectos.run.log, entrada].slice(-LIMITS.maxLog);
  const run: Run = { ...conEfectos.run, sceneId: scene.id, log };
  return { ...conEfectos, run };
}
