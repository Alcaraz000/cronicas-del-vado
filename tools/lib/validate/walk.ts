import type { Campaign, Choice, Condition, Effect, Outcome, Paragraph, Scene, Text } from '@/content/schema';

export function has(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function rollOutcomes(choice: Choice): Outcome[] {
  if (!choice.roll) return [];
  const o = choice.roll.outcomes;
  const list: Outcome[] = [o.success, o.partial, o.failure];
  if (o.crit) list.push(o.crit);
  if (o.fumble) list.push(o.fumble);
  return list;
}

export function choiceOutcomes(choice: Choice): Outcome[] {
  const list: Outcome[] = [];
  if (choice.outcome) list.push(choice.outcome);
  return [...list, ...rollOutcomes(choice)];
}

export function outcomeHasLethal(outcome: Outcome): boolean {
  return (outcome.effects ?? []).some((e) => 'lethal' in e);
}

export function sceneEffects(scene: Scene): Effect[] {
  const list: Effect[] = [...(scene.onEnter ?? [])];
  for (const choice of scene.choices) {
    for (const outcome of choiceOutcomes(choice)) list.push(...(outcome.effects ?? []));
  }
  return list;
}

// Los efectos de `endings[*].reward` no cuelgan de ninguna escena (viven en el mapa de la campaña,
// aparte de la escena de ending que produce ese final), así que no los recorre sceneEffects: r05 y
// r07 los recorren aparte con esta función para validarlos igual que al resto de los efectos.
export function endingRewards(campaign: Campaign): { endingId: string; effects: Effect[] }[] {
  return Object.entries(campaign.endings).map(([endingId, ending]) => ({ endingId, effects: ending.reward ?? [] }));
}

export function walkCondition(cond: Condition | undefined, visit: (leaf: Condition) => void): void {
  if (cond === undefined) return;
  if ('not' in cond) { walkCondition(cond.not, visit); return; }
  if ('all' in cond) { for (const c of cond.all) walkCondition(c, visit); return; }
  if ('any' in cond) { for (const c of cond.any) walkCondition(c, visit); return; }
  visit(cond);
}

export function paragraphsOf(text: Text): Paragraph[] {
  return text.filter((p): p is Paragraph => typeof p !== 'string');
}

export function sceneTexts(scene: Scene): Text[] {
  const list: Text[] = [scene.text];
  for (const choice of scene.choices) {
    for (const outcome of choiceOutcomes(choice)) if (outcome.text) list.push(outcome.text);
  }
  if (scene.ending) list.push(scene.ending.epilogue);
  return list;
}

export function sceneConditions(scene: Scene): Condition[] {
  const list: Condition[] = [];
  for (const r of scene.redirect ?? []) list.push(r.when);
  for (const choice of scene.choices) {
    if (choice.requires) list.push(choice.requires);
    if (choice.roll?.advantageIf) list.push(choice.roll.advantageIf);
    if (choice.roll?.disadvantageIf) list.push(choice.roll.disadvantageIf);
  }
  for (const text of sceneTexts(scene)) {
    for (const p of paragraphsOf(text)) for (const v of p.variants) if (v.when) list.push(v.when);
  }
  return list;
}

export function stringsOf(text: Text): string[] {
  const list: string[] = [];
  for (const p of text) {
    if (typeof p === 'string') list.push(p);
    else for (const v of p.variants) list.push(v.text);
  }
  return list;
}
