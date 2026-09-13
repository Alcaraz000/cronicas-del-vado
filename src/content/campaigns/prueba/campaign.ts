import type { Campaign } from '@/content/schema';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { npcs } from '@/content/campaigns/prueba/npcs';
import { places } from '@/content/campaigns/prueba/places';
import { items } from '@/content/campaigns/prueba/items';
import { flags } from '@/content/campaigns/prueba/flags';
import { memories } from '@/content/campaigns/prueba/memories';
import { p_umbral, p_biblioteca, p_patio, p_patio_2, p_victoria, p_capilla } from '@/content/campaigns/prueba/scenes/acto1';
import { p_escalera, p_cripta, p_fin_tesoro, p_fin_huida } from '@/content/campaigns/prueba/scenes/acto2';

/** Campaña de humo completa. El registro la carga con `import()` dinámico; nunca se importa estáticamente desde la UI. */
export const campaign: Campaign = {
  ...pruebaMeta,
  start: 'p_umbral',
  scenes: {
    p_umbral,
    p_biblioteca,
    p_patio,
    p_patio_2,
    p_victoria,
    p_capilla,
    p_escalera,
    p_cripta,
    p_fin_tesoro,
    p_fin_huida,
  },
  npcs,
  places,
  items,
  flags,
  memories,
  milestones: {
    entrar_a_la_torre: { label: 'Entrar a la torre' },
  },
  clocks: {
    pelea: { max: 2, label: 'Pelea' },
  },
  endings: {
    fin_tesoro: { title: 'El tesoro de la torre' },
    fin_huida: { title: 'Con vida' },
  },
};
