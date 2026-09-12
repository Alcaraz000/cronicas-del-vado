import type { Npc } from '@/content/schema';

export const npcs: Record<string, Npc> = {
  centinela: {
    id: 'centinela',
    name: 'El centinela',
    portrait: 'centinela',
    voice: 'Seco y cansado. Frases cortas, vosea, no levanta la voz ni cuando amenaza. Repite "me pagan por eso".',
    canonPrompt:
      'Hombre de unos cuarenta años, barba rala y canosa, cota de malla que le queda grande, lanza corta, ojeras marcadas, iluminado por un candil desde abajo, fondo de piedra oscura.',
  },
};
