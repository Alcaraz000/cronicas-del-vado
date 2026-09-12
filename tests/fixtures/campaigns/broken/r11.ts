import type { Campaign, Effect } from '@/content/schema';
import { campanaBase } from './base';

/** La campaña base con un reward puesto en fin_b, que es el final que no premia nada. */
export function conReward(reward: Effect[]): Campaign {
  return { ...campanaBase, endings: { ...campanaBase.endings, fin_b: { ...campanaBase.endings.fin_b!, reward } } };
}

// Lo único que el reward de un final soporta: una reliquia de world y flags char:/world: de la campaña.
export const rewardValido: Campaign = conReward([{ give: 'reliquia_de_prueba' }, { set: 'char:base.recuerdo' }]);

// { lethal: true } en un reward: no cuelga de ninguna escena ni de ninguna tirada.
export const rotaR11RewardLethal: Campaign = conReward([{ lethal: true }]);

// Un efecto que no tiene ningún sentido con la partida ya terminada.
export const rotaR11RewardEfectoSinSemantica: Campaign = conReward([{ heal: 1 }]);

// give de un objeto normal: el inventario de la partida se descarta al terminar, así que el
// objeto se entrega y se pierde en el mismo instante. Solo las reliquias sobreviven.
export const rotaR11RewardObjetoNormal: Campaign = conReward([{ give: 'b_llave' }]);

// set de un flag run:, que vive lo que vive la partida y por lo tanto nunca llega a verse.
export const rotaR11RewardFlagRun: Campaign = conReward([{ set: 'run:b_hablo' }]);
