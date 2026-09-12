import type { Campaign, CampaignMeta } from '@/content/schema';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';

/** Entrada del registro: la meta se importa estáticamente; la campaña completa se carga con `import()` dinámico (un chunk por campaña). */
export interface CampaignEntry {
  meta: CampaignMeta;
  load: () => Promise<Campaign>;
}

/**
 * Registro de campañas. Solo importa `meta.ts` de cada una; `load()` trae escenas, PNJ, lugares y objetos.
 * Ninguna campaña importa a otra.
 */
export const CAMPAIGNS: Record<string, CampaignEntry> = {
  prueba: {
    meta: pruebaMeta,
    load: () => import('@/content/campaigns/prueba/campaign').then((m) => m.campaign),
  },
};

/** Metas de las campañas registradas. Con `includeHidden = false` (producción) se omiten las marcadas `hidden`. */
export function listCampaigns(includeHidden: boolean): CampaignMeta[] {
  return Object.values(CAMPAIGNS)
    .map((entry) => entry.meta)
    .filter((meta) => includeHidden || meta.hidden !== true);
}
