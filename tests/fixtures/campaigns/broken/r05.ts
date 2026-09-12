import type { Campaign, Choice, Outcome } from '@/content/schema';
import { b_cripta, b_inicio, campanaBase, conEscena, conOpcion, opcion } from './base';

const hablarCon = (failure: Outcome): Choice => ({
  ...opcion(b_inicio, 'hablar'),
  roll: { attr: 'presencia', difficulty: 'normal', tags: ['social'], outcomes: {
    success: { effects: [{ set: 'run:b_hablo' }, { give: 'b_llave' }], next: 'b_fin_a' },
    partial: { effects: [{ addCondition: 'asustado' }], next: 'b_fin_a' },
    failure,
  } },
});

// { lethal: true } en una escena que no es lethal.
export const rotaR05LethalFuera: Campaign = conEscena(campanaBase, conOpcion(b_inicio, hablarCon({ effects: [{ lethal: true }], next: 'b_inicio' })));

// Un outcome de tirada apunta a la escena mortal.
export const rotaR05EntradaPorTirada: Campaign = conEscena(campanaBase, conOpcion(b_inicio, hablarCon({ next: 'b_cripta' })));

// meta.lethalScenes no coincide con la cantidad de escenas lethal.
export const rotaR05Conteo: Campaign = { ...campanaBase, lethalScenes: 2 };

// La escena mortal solo tiene tiradas con tag fisico.
export const rotaR05SoloFisico: Campaign = conEscena(campanaBase, conOpcion(
  conOpcion(b_cripta, { ...opcion(b_cripta, 'conjurar'), roll: { ...opcion(b_cripta, 'conjurar').roll!, tags: ['fisico'] } }),
  { ...opcion(b_cripta, 'tantear'), roll: { ...opcion(b_cripta, 'tantear').roll!, tags: ['fisico'] } },
));

// El reward de un final usa { lethal: true }: no tiene sentido fuera de un outcome de tirada de una escena lethal.
export const rotaR05RewardLethal: Campaign = { ...campanaBase, endings: { ...campanaBase.endings, fin_b: { ...campanaBase.endings.fin_b!, reward: [{ lethal: true }] } } };
