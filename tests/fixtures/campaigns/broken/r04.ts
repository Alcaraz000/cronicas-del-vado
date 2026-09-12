import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena, conOpcion } from './base';

// Una opción con roll y outcome a la vez. zod la rechaza en validateCampaign (refine de ChoiceSchema: 'Una opción
// debe tener exactamente uno de roll u outcome'); la regla r04 se prueba llamándola directo.
export const rotaR04Ambos: Campaign = conEscena(campanaBase, conOpcion(b_inicio, {
  id: 'descansar', label: 'Buscar refugio',
  outcome: { next: 'b_descanso' },
  roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: { success: { next: 'b_descanso' }, partial: { next: 'b_descanso' }, failure: { next: 'b_descanso' } } },
}));
