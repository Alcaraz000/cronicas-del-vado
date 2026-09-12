import type { Campaign } from '@/content/schema';
import { b_descanso, b_ronda1, b_ronda2, campanaBase, conEscena, conOpcion } from './base';

// Un next apunta a una escena que no existe.
export const rotaR01Target: Campaign = conEscena(campanaBase, conOpcion(b_descanso, { id: 'volver', label: 'Volver a la plaza', outcome: { next: 'b_no_existe' } }));

// Ciclo de redirects entre dos escenas sin onEnter: b_ronda1 → b_ronda2 → b_ronda1.
export const rotaR01Ciclo: Campaign = conEscena(
  conEscena(campanaBase, { ...b_ronda1, redirect: [{ when: { clock: 'b_pelea', gte: 1 }, to: 'b_ronda2' }] }),
  { ...b_ronda2, redirect: [{ when: { flag: 'run:b_hablo' }, to: 'b_ronda1' }] },
);
