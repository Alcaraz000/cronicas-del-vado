import type { Character, GameState, SeenMap } from '@/engine/types';
import type { PersistedSlice, Store } from '@/state/store';

/**
 * "Sin párrafos vistos" con referencia estable. `selectGameState` se usa con
 * `useShallow` en la UI: si acá devolviéramos un `{}` nuevo por llamada,
 * cada render vería un `seen` distinto y React entraría en bucle.
 */
const EMPTY_SEEN: SeenMap = {};

/** Arma el GameState del personaje activo, o null si no hay personaje activo o no tiene partida en curso. */
export function selectGameState(s: Store): GameState | null {
  const character = s.characters.find((c) => c.id === s.activeCharacterId);
  if (!character || !character.run) return null;
  return {
    world: s.world,
    character,
    run: character.run,
    seen: s.seen[character.run.campaignId] ?? EMPTY_SEEN,
  };
}

/** Reparte un GameState nuevo en las porciones persistidas del store. No muta nada. */
export function writeGameState(s: Store, gs: GameState): Partial<PersistedSlice> {
  const character: Character = { ...gs.character, run: gs.run };
  return {
    world: gs.world,
    characters: s.characters.map((c) => (c.id === character.id ? character : c)),
    seen: { ...s.seen, [gs.run.campaignId]: gs.seen },
  };
}
