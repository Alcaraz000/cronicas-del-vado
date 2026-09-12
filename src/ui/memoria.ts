import { CLASSES } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import type { Character, GameState } from '@/engine/types';
import { S } from '@/ui/strings.es';

export interface RecuerdoLinea {
  id: string;
  texto: string;
}

export interface Recuerdos {
  gente: RecuerdoLinea[];
  lugares: RecuerdoLinea[];
  hechos: RecuerdoLinea[];
  mundo: RecuerdoLinea[];
  reliquias: RecuerdoLinea[];
  caidos: RecuerdoLinea[];
}

/**
 * Lo que el personaje recuerda, listo para dibujar. Derivación pura: no toca el store.
 *
 * Dos cosas que parecen detalles y no lo son:
 *  - `run.stagedFlags` NO entra. Durante la partida el canon está apostado, y una derrota
 *    no lo escribe: mostrarlo sería prometer un recuerdo que el jugador puede perder.
 *  - Un flag de canon sin línea en `memories` se omite. r12 hace que eso no llegue a
 *    producción, pero si llegara, la Ficha calla en vez de mostrar un identificador.
 */
export function derivarRecuerdos(campaign: Campaign, state: GameState): Recuerdos {
  const { character, world } = state;
  const canon = (prefijo: string): RecuerdoLinea[] =>
    (prefijo.startsWith('world:') ? world.flags : character.flags)
      .filter((f) => f.startsWith(prefijo))
      .map((f) => ({ id: f, texto: campaign.memories[f] ?? '' }))
      .filter((l) => l.texto !== '');

  const porPrefijo = (prefijo: string, nombre: (id: string) => string | undefined): RecuerdoLinea[] =>
    character.flags
      .filter((f) => f.startsWith(prefijo))
      .map((f) => ({ id: f, texto: nombre(f.slice(prefijo.length)) ?? '' }))
      .filter((l) => l.texto !== '');

  return {
    gente: porPrefijo('char:met.', (id) => campaign.npcs[id]?.name),
    lugares: porPrefijo('char:place.', (id) => campaign.places[id]?.name),
    hechos: canon(`char:${campaign.id}.`),
    mundo: canon(`world:${campaign.id}.`),
    // flatMap y no filter+map: con noUncheckedIndexedAccess, el filter no estrecha el tipo
    // y el map de después quedaría con item posiblemente undefined.
    reliquias: character.relics.flatMap((id) => {
      const item = campaign.items[id];
      return item === undefined ? [] : [{ id, texto: `${item.name}: ${item.description}` }];
    }),
    caidos: world.fallen.map((f) => ({
      id: `${f.name}-${f.campaign}`,
      texto: S.ficha.caido(f.name, CLASSES[f.classId].name, f.level, f.campaign),
    })),
  };
}

export interface Cronica {
  titulo: string;
  finalCanonico: string | null;
  partidas: number;
  finalesVistos: number;
  finalesTotales: number;
}

/** La crónica de ESTA campaña para este personaje. La Ficha solo se abre en partida. */
export function derivarCronica(campaign: Campaign, character: Character): Cronica {
  const entrada = character.campaignLog[campaign.id];
  const canon = entrada?.canonEnding;
  return {
    titulo: campaign.title,
    finalCanonico: canon !== undefined ? (campaign.endings[canon]?.title ?? null) : null,
    partidas: entrada?.runs ?? 0,
    finalesVistos: entrada?.endings.length ?? 0,
    finalesTotales: Object.keys(campaign.endings).length,
  };
}
