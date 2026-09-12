import type { Item } from '@/content/schema';

/**
 * Objetos compartidos entre campañas. Solo acá puede haber objetos con `relic: true`.
 *
 * `sello_del_vado` es la única reliquia de "El vado de Aldamar" y por eso NO vive en
 * `campaigns/vado/items.ts`: r07 rechaza una reliquia declarada dentro de una campaña. Dentro de la
 * partida se usa como un objeto normal (ocupa ranura, da ventaja en `magia`); lo que persiste entre
 * campañas es el `reward: [{ give: 'sello_del_vado' }]` de `endings.fin_heredero`.
 */
export const items: Record<string, Item> = {
  sello_del_vado: {
    id: 'sello_del_vado',
    name: 'El sello del vado',
    icon: 'sello_del_vado',
    description:
      'Una piedra oscura, más vieja que el molino que la tapa, con canales tallados en espiral que bajan hacia el zócalo. Le falta una esquirla en el borde. Mientras esté puesta, el río no crece.',
    advantageTags: ['magia'],
    relic: true,
  },
};
