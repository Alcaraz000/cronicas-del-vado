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
 * Deriva la memoria automática al salir de una escena por una elección (cero trabajo del autor):
 * - `character.flags ∪= char:met.<npc>` por cada PNJ de `scene.npcs` y `char:place.<scene.place>`;
 * - `run.visited[sceneId] = (previo ?? 0) + 1` (una visita COMPLETA: se cuenta al elegir, no al entrar);
 * - `seen[sceneId] ∪= hashes` (hashes de los párrafos que efectivamente se mostraron).
 * Pura: devuelve un GameState nuevo y no toca la entrada.
 * Lanza `Escena desconocida: <id>` si la escena no existe en la campaña.
 */
export function deriveMemory(ctx: EvalContext, sceneId: string, hashes: string[]): GameState {
  const { campaign, state } = ctx;
  const escena: Scene | undefined = campaign.scenes[sceneId];
  if (escena === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  const nuevosFlags = [...(escena.npcs ?? []).map((npc) => `char:met.${npc}`), `char:place.${escena.place}`];
  const visitasPrevias = state.run.visited[sceneId] ?? 0;
  const vistosPrevios = state.seen[sceneId] ?? [];
  return {
    ...state,
    character: { ...state.character, flags: unir(state.character.flags, nuevosFlags) },
    run: { ...state.run, visited: { ...state.run.visited, [sceneId]: visitasPrevias + 1 } },
    seen: { ...state.seen, [sceneId]: unir(vistosPrevios, hashes) },
  };
}
