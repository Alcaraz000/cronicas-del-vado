import { error, type Rule, type ValidationIssue } from '../types';
import { choiceOutcomes, stringsOf } from '../walk';

const RULE = 'r10_todo';

export const r10_todo: Rule = (campaign, ctx) => {
  const issues: ValidationIssue[] = [];
  if (ctx.profile !== 'release') return issues;
  for (const scene of Object.values(campaign.scenes)) {
    const textos: { donde: string; texto: string }[] = [];
    for (const s of stringsOf(scene.text)) textos.push({ donde: 'text', texto: s });
    for (const choice of scene.choices) {
      textos.push({ donde: `label de ${choice.id}`, texto: choice.label });
      if (choice.lockedHint !== undefined) textos.push({ donde: `lockedHint de ${choice.id}`, texto: choice.lockedHint });
      for (const outcome of choiceOutcomes(choice)) {
        for (const s of stringsOf(outcome.text ?? [])) textos.push({ donde: `outcome de ${choice.id}`, texto: s });
      }
    }
    if (scene.ending) for (const s of stringsOf(scene.ending.epilogue)) textos.push({ donde: 'epilogue', texto: s });
    for (const { donde, texto } of textos) {
      if (texto.includes('TODO')) issues.push(error(RULE, `TODO residual en ${donde} de la escena ${scene.id}: "${texto.slice(0, 40)}"`, scene.id));
    }
  }
  return issues;
};
