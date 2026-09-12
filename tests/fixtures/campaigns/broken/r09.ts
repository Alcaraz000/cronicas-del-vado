import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena, conOpcion, opcion } from './base';

// Dificultad extrema con levelRange[0] = 1.
export const rotaR09Extrema: Campaign = conEscena(campanaBase, conOpcion(b_inicio, {
  ...opcion(b_inicio, 'hablar'),
  roll: { ...opcion(b_inicio, 'hablar').roll!, difficulty: 'extrema' },
}));
