import type { Campaign, Choice } from '@/content/schema';
import { b_ronda1, b_ronda2, campanaBase, conEscena, conOpcion, opcion } from './base';

const conAtributo = (choice: Choice, attr: 'vigor' | 'astucia'): Choice => ({ ...choice, roll: { ...choice.roll!, attr } });

// Ronda 1 con todas las tiradas de Vigor.
export const rotaR06UnAtributo: Campaign = conEscena(campanaBase, conOpcion(
  conOpcion(b_ronda1, conAtributo(opcion(b_ronda1, 'enganar'), 'vigor')),
  conAtributo(opcion(b_ronda1, 'huir'), 'vigor'),
));

// Ronda 1 sin ninguna tirada con tag huida.
export const rotaR06SinHuida: Campaign = conEscena(campanaBase, conOpcion(b_ronda1, { ...opcion(b_ronda1, 'huir'), roll: { ...opcion(b_ronda1, 'huir').roll!, tags: ['sigilo'] } }));

// Ronda 2 sin redirect y sin ninguna opción con requires sobre el estado.
const { redirect: _redirect, ...ronda2SinRedirect } = b_ronda2;
const { requires: _requires, lockedHint: _hint, ...rematarLibre } = opcion(b_ronda2, 'rematar');
export const rotaR06RondaSinEstado: Campaign = conEscena(campanaBase, conOpcion(ronda2SinRedirect, rematarLibre));
