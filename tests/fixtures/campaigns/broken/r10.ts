import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena } from './base';

// Un TODO residual en el texto de una escena (solo falla en perfil release).
export const rotaR10Todo: Campaign = conEscena(campanaBase, { ...b_inicio, text: ['TODO: escribir la llegada a la plaza.', ...b_inicio.text.slice(1)] });
