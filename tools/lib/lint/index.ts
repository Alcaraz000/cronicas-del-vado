import type { Campaign } from '@/content/schema';
import type { LintContext, LintIssue } from './types';
import { chequearPresupuesto } from './presupuesto';
import { chequearDuracion } from './duracion';
import { chequearRepeticiones } from './repeticiones';
import { chequearProhibidas } from './prohibidas';
import { chequearMuletillas } from './muletillas';
import { chequearMarco } from './marco';

export const CHEQUEOS = [
  chequearPresupuesto,
  chequearDuracion,
  chequearRepeticiones,
  chequearProhibidas,
  chequearMuletillas,
  chequearMarco,
] as const;

/**
 * Analiza la prosa de una campaña. Informa, no bloquea: el que decide si algo falla es el CLI con
 * `--strict`. La campaña tiene que venir **fusionada con el mundo** (`conMundo`), igual que se la
 * pasa el store al motor, o los PNJ compartidos no existen.
 */
export function lintCampaign(campaign: Campaign, ctx: LintContext): LintIssue[] {
  return CHEQUEOS.flatMap((chequeo) => chequeo(campaign, ctx));
}

export type { LintContext, LintIssue } from './types';
