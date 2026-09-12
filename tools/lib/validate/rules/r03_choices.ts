import { LIMITS } from '@/content/catalog';
import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r03_choices';

// El mínimo de opciones libres es el mismo en smoke y en release (contrato, sección J).
export const r03_choices: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  for (const scene of Object.values(campaign.scenes)) {
    const total = scene.choices.length;
    if (scene.kind === 'ending') {
      if (total !== 0) issues.push(error(RULE, `La escena final ${scene.id} debe tener 0 opciones y tiene ${total}`, scene.id));
      continue;
    }
    if (total < LIMITS.minChoices || total > LIMITS.maxChoices) {
      issues.push(error(RULE, `La escena ${scene.id} tiene ${total} opciones; debe tener entre ${LIMITS.minChoices} y ${LIMITS.maxChoices}`, scene.id));
    }
    const libres = scene.choices.filter((c) => c.requires === undefined).length;
    if (libres < LIMITS.minChoices) {
      issues.push(error(RULE, `La escena ${scene.id} tiene ${libres} opciones sin requires; debe tener al menos ${LIMITS.minChoices}`, scene.id));
    }
  }
  return issues;
};
