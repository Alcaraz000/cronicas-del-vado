import type { Campaign, WorldContent } from '@/content/schema';

export interface ValidationIssue { level: 'error' | 'warning'; rule: string; sceneId?: string; message: string }
export interface ValidateContext { world: WorldContent; profile: 'smoke' | 'release' }
export type Rule = (campaign: Campaign, ctx: ValidateContext) => ValidationIssue[];

export function error(rule: string, message: string, sceneId?: string): ValidationIssue {
  if (sceneId === undefined) return { level: 'error', rule, message };
  return { level: 'error', rule, sceneId, message };
}
