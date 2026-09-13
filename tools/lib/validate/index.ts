import { z } from 'zod';
import { CampaignSchema, type Campaign } from '@/content/schema';
import { r01_targets } from './rules/r01_targets';
import { r02_reach } from './rules/r02_reach';
import { r03_choices } from './rules/r03_choices';
import { r04_choice_shape } from './rules/r04_choice_shape';
import { r05_lethal } from './rules/r05_lethal';
import { r06_encounter } from './rules/r06_encounter';
import { r07_ids } from './rules/r07_ids';
import { r08_memory_frame } from './rules/r08_memory_frame';
import { r09_extreme } from './rules/r09_extreme';
import { r10_todo } from './rules/r10_todo';
import { r11_reward } from './rules/r11_reward';
import { r12_memories } from './rules/r12_memories';
import type { Rule, ValidateContext, ValidationIssue } from './types';

export type { Rule, ValidateContext, ValidationIssue } from './types';

export const RULES: Record<string, Rule> = {
  r01_targets,
  r02_reach,
  r03_choices,
  r04_choice_shape,
  r05_lethal,
  r06_encounter,
  r07_ids,
  r08_memory_frame,
  r09_extreme,
  r10_todo,
  r11_reward,
  r12_memories,
};

export function validateCampaign(campaign: Campaign, ctx: ValidateContext): ValidationIssue[] {
  const parsed = CampaignSchema.safeParse(campaign);
  if (!parsed.success) {
    return [{ level: 'error', rule: 'schema', message: z.prettifyError(parsed.error) }];
  }
  return Object.values(RULES).flatMap((rule) => rule(campaign, ctx));
}
