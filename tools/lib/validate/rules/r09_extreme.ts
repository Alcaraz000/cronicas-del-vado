import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r09_extreme';

export const r09_extreme: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const minimo = campaign.levelRange[0];
  if (minimo >= 3) return issues;
  for (const scene of Object.values(campaign.scenes)) {
    for (const choice of scene.choices) {
      if (choice.roll?.difficulty === 'extrema') {
        issues.push(error(RULE, `La opción ${choice.id} usa dificultad extrema y levelRange[0] es ${minimo} (se exige 3 o más)`, scene.id));
      }
    }
  }
  return issues;
};
