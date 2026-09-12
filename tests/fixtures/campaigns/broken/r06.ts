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

// Ronda 1 que se repite a sí misma (golpear vuelve a b_ronda1) sin redirect ni requires de estado:
// el mismo bucle sin cambio de estado que la cláusula existe para prevenir, pero contra sí misma.
const golpeOriginal = opcion(b_ronda1, 'golpear');
const golpeEnBucle: Choice = {
  ...golpeOriginal,
  roll: {
    ...golpeOriginal.roll!,
    outcomes: {
      success: { ...golpeOriginal.roll!.outcomes.success, next: 'b_ronda1' },
      partial: { ...golpeOriginal.roll!.outcomes.partial, next: 'b_ronda1' },
      failure: { ...golpeOriginal.roll!.outcomes.failure, next: 'b_ronda1' },
    },
  },
};
export const rotaR06Autobucle: Campaign = conEscena(campanaBase, conOpcion(b_ronda1, golpeEnBucle));
