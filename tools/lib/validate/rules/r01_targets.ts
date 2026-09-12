import type { Campaign, Scene } from '@/content/schema';
import { sceneEdges, type Edge } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';
import { has } from '../walk';

const RULE = 'r01_targets';

function describeEdge(e: Edge): string {
  if (e.via === 'redirect') return 'redirect.to';
  if (e.via === 'outcome') return `la opción ${e.choiceId ?? '?'} (outcome.next)`;
  return `la opción ${e.choiceId ?? '?'} (outcome de tirada)`;
}

function redirectCycles(campaign: Campaign): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const reported = new Set<string>();
  const color = new Map<string, 'gris' | 'negro'>();
  const stack: string[] = [];

  const visit = (id: string): void => {
    if (color.get(id) === 'negro') return;
    if (color.get(id) === 'gris') {
      const cycle = stack.slice(stack.indexOf(id));
      const key = [...cycle].sort().join(',');
      if (reported.has(key)) return;
      reported.add(key);
      const conEfectos = cycle.some((s) => ((campaign.scenes[s] as Scene).onEnter?.length ?? 0) > 0);
      if (!conEfectos) {
        issues.push(error(RULE, `Ciclo de redirects sin efectos entre medio: ${[...cycle, id].join(' → ')}`, id));
      }
      return;
    }
    color.set(id, 'gris');
    stack.push(id);
    const scene = campaign.scenes[id] as Scene;
    for (const r of scene.redirect ?? []) if (has(campaign.scenes, r.to)) visit(r.to);
    stack.pop();
    color.set(id, 'negro');
  };

  for (const id of Object.keys(campaign.scenes)) visit(id);
  return issues;
}

export const r01_targets: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  if (!has(campaign.scenes, campaign.start)) {
    issues.push(error(RULE, `start apunta a una escena inexistente: ${campaign.start}`));
  }
  for (const scene of Object.values(campaign.scenes)) {
    for (const e of sceneEdges(scene)) {
      if (!has(campaign.scenes, e.to)) issues.push(error(RULE, `${describeEdge(e)} apunta a una escena inexistente: ${e.to}`, scene.id));
    }
  }
  return [...issues, ...redirectCycles(campaign)];
};
