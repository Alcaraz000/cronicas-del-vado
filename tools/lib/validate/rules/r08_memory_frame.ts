import type { TextVariant } from '@/content/schema';
import { error, type Rule, type ValidationIssue } from '../types';
import { has, paragraphsOf, sceneTexts, walkCondition } from '../walk';

const RULE = 'r08_memory_frame';

export const r08_memory_frame: Rule = (campaign, ctx) => {
  const issues: ValidationIssue[] = [];
  const prefijoLocal = `char:${campaign.id}.`;
  for (const scene of Object.values(campaign.scenes)) {
    for (const text of sceneTexts(scene)) {
      for (const p of paragraphsOf(text)) {
        const quien = p.speaker === undefined ? 'del narrador' : `de ${p.speaker}`;
        const ultima: TextVariant | undefined = p.variants[p.variants.length - 1];
        if (ultima === undefined || ultima.when !== undefined) {
          issues.push(error(RULE, `Un párrafo ${quien} en ${scene.id} no termina en una variante sin when`, scene.id));
        }
        const pnjLocal = p.speaker !== undefined && has(campaign.npcs, p.speaker) && !has(ctx.world.npcs, p.speaker);
        if (!pnjLocal) continue;
        for (const v of p.variants) {
          walkCondition(v.when, (leaf) => {
            let memoria: string | null = null;
            if ('met' in leaf) memoria = 'met';
            else if ('knows' in leaf) memoria = 'knows';
            else if ('endingSeen' in leaf) memoria = 'endingSeen';
            else if ('flag' in leaf && leaf.flag.startsWith(prefijoLocal)) memoria = `flag ${leaf.flag}`;
            if (memoria !== null) {
              issues.push(error(RULE, `El PNJ ${p.speaker ?? '?'} es de esta campaña y no puede recordar otra partida: variante con ${memoria} en ${scene.id}`, scene.id));
            }
          });
        }
      }
    }
  }
  return issues;
};
