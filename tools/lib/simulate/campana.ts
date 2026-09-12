import { CAMPAIGNS } from '@/content/campaigns/index';
import type { Campaign, WorldContent } from '@/content/schema';
import { WORLD } from '@/content/world/index';

/**
 * La campaña con el contenido compartido adentro. Es la MISMA fusión que hace `conMundo` en
 * `src/state/store.ts`, copiada a propósito y no importada: el store arrastra zustand y crea la
 * instancia global en el import, y `tools/*` corre en Node puro.
 *
 * Sin esta fusión el motor no encuentra los PNJ de `world/` (Orell, Ilse, Halvar) ni la reliquia
 * `sello_del_vado`, y las opciones que dependen de ellos fallan en silencio: el simulador mediría
 * un juego que no es el que se juega. Ante colisión de id gana WORLD, igual que en el store.
 */
export function fusionarConMundo(campaign: Campaign, world: WorldContent): Campaign {
  return {
    ...campaign,
    npcs: { ...campaign.npcs, ...world.npcs },
    places: { ...campaign.places, ...world.places },
    items: { ...campaign.items, ...world.items },
  };
}

/** Carga una campaña del registro ya fusionada con el mundo. Lanza si el id no existe. */
export async function cargarCampana(campaignId: string): Promise<Campaign> {
  const entrada = CAMPAIGNS[campaignId];
  if (entrada === undefined) {
    throw new Error(`Campaña desconocida: ${campaignId} (registradas: ${Object.keys(CAMPAIGNS).join(', ')})`);
  }
  return fusionarConMundo(await entrada.load(), WORLD);
}
