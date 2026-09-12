import type { Campaign, WorldContent } from '@/content/schema';

/**
 * Fusión campaña + mundo, **igual que `conMundo` de `src/state/store.ts`**.
 *
 * Está duplicada a propósito: `tools/*` corre con `tsx` en Node puro y no puede importar el store
 * (arrastra zustand y el resto de la app). El motor y todo lo que mira PNJ, lugares u objetos espera
 * la campaña ya fusionada: con el módulo crudo, las reliquias y los PNJ compartidos de `world/` no
 * existen y las cosas fallan en silencio (una referencia a `orell` no da error, da `undefined`).
 *
 * Si el store cambia la forma de fusionar, esto cambia con él.
 */
export function conMundo(campaign: Campaign, world: WorldContent): Campaign {
  return {
    ...campaign,
    npcs: { ...campaign.npcs, ...world.npcs },
    places: { ...campaign.places, ...world.places },
    items: { ...campaign.items, ...world.items },
  };
}
