import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena, conOpcion, mundoDePrueba, opcion } from './base';

// set de un flag que no está declarado.
export const rotaR07FlagNoDeclarado: Campaign = conEscena(campanaBase, conOpcion(b_inicio, {
  ...opcion(b_inicio, 'hablar'),
  roll: { attr: 'presencia', difficulty: 'normal', tags: ['social'], outcomes: {
    success: { effects: [{ set: 'run:b_inventado' }], next: 'b_fin_a' },
    partial: { next: 'b_fin_a' },
    failure: { next: 'b_inicio' } } },
}));

// El speaker b_guia no está en npcs de la escena.
export const rotaR07SpeakerFuera: Campaign = conEscena(campanaBase, { ...b_inicio, npcs: [] });

// relic en un objeto de la campaña.
export const rotaR07Reliquia: Campaign = { ...campanaBase, items: { b_llave: { ...campanaBase.items.b_llave!, relic: true } } };

// La campaña redefine un PNJ de world.
export const rotaR07RedefineMundo: Campaign = { ...campanaBase, npcs: { ...campanaBase.npcs, viajero: { ...mundoDePrueba.npcs.viajero!, name: 'Otro viajero' } } };

// Flag char: declarado con el prefijo de otra campaña.
export const rotaR07Prefijo: Campaign = { ...campanaBase, flags: { ...campanaBase.flags, 'char:otra.cosa': 'Flag de otra campaña' } };
