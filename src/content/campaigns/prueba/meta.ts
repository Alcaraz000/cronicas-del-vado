import type { CampaignMeta } from '@/content/schema';

/** Meta estática de la campaña de humo. El registro la importa sin cargar las escenas. */
export const pruebaMeta: CampaignMeta = {
  id: 'prueba',
  contentVersion: 1,
  title: 'La torre de prueba',
  premise:
    'Una torre abandonada al borde de la aldea, un centinela al que le pagan por no dejar subir a nadie y un tesoro del que todos hablan y nadie vio. Campaña de humo para probar el motor de punta a punta.',
  cover: 'prueba_portada',
  levelRange: [3, 5],
  durationMin: [5, 10],
  lethalScenes: 1,
  lintProfile: 'smoke',
  hidden: true,
};
