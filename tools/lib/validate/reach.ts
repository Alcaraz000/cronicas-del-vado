import type { ClassId } from '@/content/catalog';
import type { Campaign, Condition, Scene } from '@/content/schema';
import { has, rollOutcomes } from './walk';

export type EdgeVia = 'redirect' | 'outcome' | 'roll';
export interface Edge { from: string; to: string; via: EdgeVia; choiceId?: string }

export function sceneEdges(scene: Scene): Edge[] {
  const edges: Edge[] = [];
  for (const r of scene.redirect ?? []) edges.push({ from: scene.id, to: r.to, via: 'redirect' });
  for (const choice of scene.choices) {
    if (choice.outcome) edges.push({ from: scene.id, to: choice.outcome.next, via: 'outcome', choiceId: choice.id });
    for (const outcome of rollOutcomes(choice)) edges.push({ from: scene.id, to: outcome.next, via: 'roll', choiceId: choice.id });
  }
  return edges;
}

export function isClassOnly(cond: Condition): boolean {
  if ('class' in cond) return true;
  if ('not' in cond) return isClassOnly(cond.not);
  if ('all' in cond) return cond.all.every(isClassOnly);
  if ('any' in cond) return cond.any.every(isClassOnly);
  return false;
}

export function isSatisfiable(cond: Condition | undefined, classId: ClassId | null): boolean {
  if (cond === undefined) return true;
  if ('class' in cond) return classId === null || cond.class === classId;
  if ('not' in cond) return isClassOnly(cond.not) ? !isSatisfiable(cond.not, classId) : true;
  if ('all' in cond) return cond.all.every((c) => isSatisfiable(c, classId));
  if ('any' in cond) return cond.any.length === 0 || cond.any.some((c) => isSatisfiable(c, classId));
  return true;
}

export function reachableScenes(campaign: Campaign, classId: ClassId | null): Set<string> {
  const seen = new Set<string>();
  const queue: string[] = [campaign.start];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id) || !has(campaign.scenes, id)) continue;
    seen.add(id);
    const scene = campaign.scenes[id] as Scene;
    for (const r of scene.redirect ?? []) if (isSatisfiable(r.when, classId)) queue.push(r.to);
    for (const choice of scene.choices) {
      if (!isSatisfiable(choice.requires, classId)) continue;
      if (choice.outcome) queue.push(choice.outcome.next);
      for (const outcome of rollOutcomes(choice)) queue.push(outcome.next);
    }
  }
  return seen;
}
