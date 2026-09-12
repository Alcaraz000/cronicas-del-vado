import type { Campaign } from '@/content/schema';
import { b_fin_a, b_inicio, campanaBase, conEscena, opcion, sinOpcion } from './base';

// Tres opciones en total, las tres libres: dos issues (total y libres) en smoke y en release.
export const rotaR03Pocas: Campaign = conEscena(campanaBase, sinOpcion(sinOpcion(b_inicio, 'hablar'), 'recordar'));

// Un final con una opción. zod la rechaza en validateCampaign (refine de SceneSchema: 'Una escena de tipo ending
// no puede tener opciones'); la regla r03 se prueba llamándola directo.
export const rotaR03FinalConOpciones: Campaign = conEscena(campanaBase, { ...b_fin_a, choices: [{ id: 'volver', label: 'Volver', outcome: { next: 'b_inicio' } }] });

// Cinco opciones pero solo tres libres: falla en ambos perfiles (el mínimo de libres no depende del perfil).
export const rotaR03PocasLibres: Campaign = conEscena(campanaBase, {
  ...sinOpcion(b_inicio, 'hablar'),
  choices: [
    ...sinOpcion(b_inicio, 'hablar').choices,
    { ...opcion(b_inicio, 'hablar'), id: 'hablar_recuerdo', requires: { flag: 'char:base.recuerdo' }, lockedHint: 'No lo recordás' },
  ],
});
