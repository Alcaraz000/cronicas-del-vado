import type { Character, GameState } from '@/engine/types';
import type { PersistedSlice, Store } from '@/state/store';

/** Arma el GameState del personaje activo, o null si no hay personaje activo o no tiene partida en curso. */
export function selectGameState(s: Store): GameState | null {
  const character = s.characters.find((c) => c.id === s.activeCharacterId);
  if (!character || !character.run) return null;
  return {
    world: s.world,
    character,
    run: character.run,
    seen: s.seen[character.run.campaignId] ?? {},
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
