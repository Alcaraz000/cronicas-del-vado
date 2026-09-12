import type { Campaign, Scene } from '@/content/schema';
import { b_cripta, b_descanso, campanaBase, conEscena, conOpcion, opcion } from './base';

// Escena válida a la que nadie apunta.
const b_aislada: Scene = {
  id: 'b_aislada', kind: 'normal', place: 'b_plaza', text: ['Nadie llega acá.'],
  choices: [
    { id: 'a', label: 'Volver', outcome: { next: 'b_inicio' } },
    { id: 'b', label: 'Descansar', outcome: { next: 'b_descanso' } },
    { id: 'c', label: 'Pelear', outcome: { next: 'b_ronda1' } },
    { id: 'd', label: 'Bajar', outcome: { next: 'b_cripta' } },
  ],
};
export const rotaR02Aislada: Campaign = conEscena(campanaBase, b_aislada);

// fin_b solo se alcanza con { class: 'mago' }: la cripta ya no manda a fin_b y la salida del descanso exige mago.
const criptaSinFinB: Scene = conOpcion(
  conOpcion(b_cripta, { ...opcion(b_cripta, 'cruzar'), roll: { attr: 'vigor', difficulty: 'muy_dificil', tags: ['fisico'], outcomes: {
    success: { next: 'b_fin_a' }, partial: { effects: [{ wound: 1 }], next: 'b_fin_a' }, failure: { effects: [{ lethal: true }], next: 'b_descanso' } } } }),
  { ...opcion(b_cripta, 'conjurar'), roll: { attr: 'saber', difficulty: 'dificil', tags: ['magia'], outcomes: {
    success: { effects: [{ set: 'char:base.recuerdo' }], next: 'b_fin_a' }, partial: { effects: [{ addCondition: 'agotado' }], next: 'b_fin_a' }, failure: { effects: [{ lethal: true }], next: 'b_descanso' } } } },
);
export const rotaR02SoloMago: Campaign = conEscena(
  conEscena(campanaBase, criptaSinFinB),
  conOpcion(b_descanso, { ...opcion(b_descanso, 'irse'), requires: { class: 'mago' }, lockedHint: 'Solo un mago conoce el camino' }),
);

// Un id de campaign.endings que ninguna escena produce (ni siquiera una inalcanzable): el final queda colgado.
export const rotaR02FinalNoProducido: Campaign = { ...campanaBase, endings: { ...campanaBase.endings, fin_c: { title: 'Final C' } } };
