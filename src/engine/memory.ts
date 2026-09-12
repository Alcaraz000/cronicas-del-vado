import type { Scene } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/** Unión ordenada sin duplicados: conserva `base` y agrega los de `extra` que falten, en orden. */
function unir(base: readonly string[], extra: readonly string[]): string[] {
  const resultado = [...base];
  for (const valor of extra) {
    if (!resultado.includes(valor)) {
      resultado.push(valor);
    }
  }
  return resultado;
}

/**
 * Deriva la memoria automática al salir de una escena por una elección.
 * Marca en el personaje los PNJ conocidos (`char:met.<npc>`) y el lugar (`char:place.<lugar>`).
 */
export function deriveMemory(ctx: EvalContext, sceneId: string, hashes: string[]): GameState {
  void hashes;
  const { campaign, state } = ctx;
  const escena: Scene | undefined = campaign.scenes[sceneId];
  if (escena === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  const nuevosFlags = [...(escena.npcs ?? []).map((npc) => `char:met.${npc}`), `char:place.${escena.place}`];
  return {
    ...state,
    character: { ...state.character, flags: unir(state.character.flags, nuevosFlags) },
  };
}
