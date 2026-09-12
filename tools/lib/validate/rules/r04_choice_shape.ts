import type { Roll } from '@/content/schema';
import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r04_choice_shape';

export const r04_choice_shape: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  for (const scene of Object.values(campaign.scenes)) {
    for (const choice of scene.choices) {
      const tieneRoll = choice.roll !== undefined;
      const tieneOutcome = choice.outcome !== undefined;
      if (tieneRoll === tieneOutcome) {
        issues.push(error(RULE, `La opción ${choice.id} debe tener exactamente uno de roll u outcome (tiene ${tieneRoll ? 'los dos' : 'ninguno'})`, scene.id));
      }
      if (choice.roll) {
        const outcomes: Partial<Roll['outcomes']> = choice.roll.outcomes;
        for (const banda of ['success', 'partial', 'failure'] as const) {
          if (outcomes[banda] === undefined) issues.push(error(RULE, `La tirada de la opción ${choice.id} no tiene outcome ${banda}`, scene.id));
        }
      }
    }
  }
  return issues;
};
