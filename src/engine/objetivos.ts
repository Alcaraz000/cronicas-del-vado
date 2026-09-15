import type { Campaign, Objetivo } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import type { GameState } from '@/engine/types';

/**
 * El objetivo activo: el PRIMERO de la lista cuyo `when` se cumple y cuyo `hecho` no.
 *
 * El orden de la lista es la prioridad, y lo decide el autor: así una campaña puede poner primero
 * lo urgente aunque se haya habilitado después. Nada acá mira el orden en que el estado se fue
 * prendiendo —el estado no lo guarda— y esa es justamente la razón de que la prioridad viva en el
 * contenido.
 *
 * Pura: no muta la campaña ni el estado. Una campaña sin `objetivos` (o con la lista vacía, o con
 * todos cumplidos) devuelve `null`, y la barra entonces no dibuja nada.
 *
 * **Las dos ausencias NO son simétricas, y por eso `hecho` lleva su guarda explícita.**
 * `evaluate(undefined, …)` es `true`: para `when` eso es exactamente lo que se quiere —sin
 * condición, el objetivo está en juego desde el principio—, pero para `hecho` diría "ya está
 * cumplido" y saltearía todo objetivo que no declare cuándo termina. La guarda es la que hace que
 * un objetivo sin `hecho` se muestre hasta que otro lo reemplace.
 */
export function objetivoActivo(campaign: Campaign, state: GameState): Objetivo | null {
  const objetivos = campaign.objetivos;
  if (objetivos === undefined) return null;
  const ctx = { campaign, state };
  for (const objetivo of objetivos) {
    if (!evaluate(objetivo.when, ctx)) continue;
    if (objetivo.hecho !== undefined && evaluate(objetivo.hecho, ctx)) continue;
    return objetivo;
  }
  return null;
}
