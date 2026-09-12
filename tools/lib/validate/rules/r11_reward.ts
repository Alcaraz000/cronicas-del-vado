import type { Effect, Item } from '@/content/schema';
import { error, type Rule, type ValidationIssue } from '../types';
import { endingRewards } from '../walk';

const RULE = 'r11_reward';

function clave(effect: Effect): string {
  return Object.keys(effect)[0] ?? '?';
}

/**
 * Qué puede hacer `endings[*].reward`.
 *
 * El reward se aplica cuando la partida ya terminó: no hay escena, no hay tirada y el estado de la
 * partida (heridas, condiciones, relojes, fortuna, inventario, flags `run:`) se descarta enseguida.
 * Lo único que cruza ese borde son las reliquias y los flags con el prefijo de la campaña, que el
 * motor promociona al personaje y al mundo. Todo lo demás se aplicaría sobre algo que está por
 * desaparecer: el autor escribe un premio y el jugador no ve nada.
 *
 * Por eso la lista es blanca y corta:
 *   - `{ give: <objeto con relic: true> }`
 *   - `{ set: 'char:<campaña>.<...>' }` o `{ set: 'world:<campaña>.<...>' }`
 *
 * Que el objeto o el flag existan y estén declarados lo comprueba r07; acá se decide si el efecto
 * tiene sentido en este lugar.
 */
export const r11_reward: Rule = (campaign, ctx) => {
  const issues: ValidationIssue[] = [];
  const push = (message: string): void => { issues.push(error(RULE, message)); };
  const objeto = (id: string): Item | undefined => campaign.items[id] ?? ctx.world.items[id];
  const prefijos = [`char:${campaign.id}.`, `world:${campaign.id}.`];

  for (const { endingId, effects } of endingRewards(campaign)) {
    for (const effect of effects) {
      if ('give' in effect) {
        const item = objeto(effect.give);
        // Si el objeto no existe, el que avisa es r07: sin la declaración no hay forma de saber si era reliquia.
        if (item !== undefined && item.relic !== true) {
          push(`El reward del final ${endingId} hace give de ${effect.give}, que no es una reliquia: el inventario se descarta al terminar la partida y solo sobreviven los objetos con relic: true de world.items`);
        }
      } else if ('set' in effect) {
        if (!prefijos.some((p) => effect.set.startsWith(p))) {
          push(`El reward del final ${endingId} hace set de ${effect.set}: en un reward solo valen los flags char:${campaign.id}. o world:${campaign.id}., que son los que el motor promociona al terminar la partida`);
        }
      } else {
        push(`El reward del final ${endingId} usa { ${clave(effect)} }, un efecto sin semántica con la partida ya terminada: un reward solo acepta give de una reliquia y set de un flag char:${campaign.id}. o world:${campaign.id}.`);
      }
    }
  }
  return issues;
};
