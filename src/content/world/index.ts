import type { WorldContent } from '@/content/schema';
import { npcs } from '@/content/world/npcs';
import { places } from '@/content/world/places';
import { items } from '@/content/world/items';
import { flags } from '@/content/world/flags';

/** Contenido compartido por todas las campañas. El motor resuelve PNJ, lugares y objetos contra WORLD ∪ campaña. */
export const WORLD: WorldContent = { npcs, places, items, flags };
