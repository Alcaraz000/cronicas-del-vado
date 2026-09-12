import { z } from 'zod';
import { CampaignSchema, type Campaign } from '@/content/schema';
import { r01_targets } from './rules/r01_targets';
import { r02_reach } from './rules/r02_reach';
import { r03_choices } from './rules/r03_choices';
import { r04_choice_shape } from './rules/r04_choice_shape';
import { r05_lethal } from './rules/r05_lethal';
import type { Rule, ValidateContext, ValidationIssue } from './types';

export type { Rule, ValidateContext, ValidationIssue } from './types';

export const RULES: Record<string, Rule> = {
  r01_targets,
  r02_reach,
  r03_choices,
  r04_choice_shape,
  r05_lethal,
};

export function validateCampaign(campaign: Campaign, ctx: ValidateContext): ValidationIssue[] {
  const parsed = CampaignSchema.safeParse(campaign);
  if (!parsed.success) {
    return [{ level: 'error', rule: 'schema', message: z.prettifyError(parsed.error) }];
  }
  return Object.values(RULES).flatMap((rule) => rule(campaign, ctx));
}
