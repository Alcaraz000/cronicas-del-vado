import { CLASSES, CONDITIONS, type ConditionId } from '@/content/catalog';
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
 * Una línea de narrador por flag de canon, en el orden en que vienen los flags. Es la única
 * derivación de `campaign.memories`, compartida por la Ficha (el canon ya escrito del
 * personaje y del mundo) y por la pantalla de fin (el canon que la partida acaba de dejar).
 *
 * Un flag sin línea en `memories` se omite EN SILENCIO. La regla `r12_memories` del validador
 * hace que eso no llegue a producción, pero si llegara, la interfaz calla en vez de mostrar
 * un identificador crudo — que es la regla de la que no se sale nunca.
 */
export function lineasDeMemoria(campaign: Campaign, flags: string[]): RecuerdoLinea[] {
  return flags.map((f) => ({ id: f, texto: campaign.memories[f] ?? '' })).filter((l) => l.texto !== '');
}

/**
 * Lo que el personaje recuerda, listo para dibujar. Derivación pura: no toca el store.
 *
 * `run.stagedFlags` NO entra. Durante la partida el canon está apostado, y una derrota no lo
 * escribe: mostrarlo sería prometer un recuerdo que el jugador puede perder. Se cumple por
 * construcción (acá solo se leen `character.flags` y `world.flags`), y hay un test que lo fija
 * para que no se rompa sin querer.
 */
export function derivarRecuerdos(campaign: Campaign, state: GameState): Recuerdos {
  const { character, world } = state;
  const canon = (prefijo: string): RecuerdoLinea[] =>
    lineasDeMemoria(
      campaign,
      (prefijo.startsWith('world:') ? world.flags : character.flags).filter((f) => f.startsWith(prefijo)),
    );

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
    // flatMap y no filter+map: si el item no existe, la rama defensiva retorna []
    // evitando incluir registros incompletos.
    reliquias: character.relics.flatMap((id) => {
      const item = campaign.items[id];
      return item === undefined ? [] : [{ id, texto: `${item.name}: ${item.description}` }];
    }),
    caidos: world.fallen.flatMap((f, i) => {
      const clase = CLASSES[f.classId];
      if (clase === undefined) return [];
      const nombre = f.name;
      const nivel = f.level;
      const texto =
        f.campaign === campaign.id
          ? S.ficha.caido(nombre, clase.name, nivel, campaign.title)
          : S.ficha.caidoSinCampana(nombre, clase.name, nivel);
      // El índice va en la key porque `Fallen` no tiene id propio: dos personajes con el
      // mismo nombre muertos en la misma campaña (el jugador que vuelve a llamar Vera a su
      // siguiente maga) darían la misma key y React dibujaría uno solo.
      return [{ id: `${nombre}-${f.campaign}-${i}`, texto }];
    }),
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

/**
 * Nombres de las condiciones activas, ya unidos en una sola cadena lista para mostrar
 * ("Asustado, Exhausto"), o `S.barra.sinCondiciones` si no hay ninguna. Comparten esta
 * derivación `StatusBar` (las condiciones de la partida en curso) y `Ficha` (las mismas,
 * leídas de `run.conditions`): es una sola definición para no arrastrar dos si el día de
 * mañana cambia cómo se listan.
 */
export function nombresDeCondiciones(conditions: ConditionId[]): string {
  return conditions.length === 0 ? S.barra.sinCondiciones : conditions.map((c) => CONDITIONS[c].name).join(', ');
}

/**
 * Nombres de `campaign.items` para una lista de ids (objetos de la partida o reliquias del
 * personaje). Un id que no resuelve se omite: acá también rige la regla de no mostrar nunca
 * un identificador crudo.
 */
export function nombresDeItems(ids: string[], campaign: Campaign): string[] {
  return ids.flatMap((id) => {
    const item = campaign.items[id];
    return item === undefined ? [] : [item.name];
  });
}
