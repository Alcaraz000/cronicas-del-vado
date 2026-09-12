import type { Place } from '@/content/schema';

export const places: Record<string, Place> = {
  torre_abandonada: {
    id: 'torre_abandonada',
    name: 'Torre abandonada',
    background: 'torre_abandonada',
    variants: {
      noche: 'torre_abandonada.noche',
      cripta: 'torre_abandonada.cripta',
    },
    canonPrompt:
      'Torre de piedra gris medio derrumbada en un claro, puerta de hierro entornada, ventanas rotas, noche nublada con luna baja, hierba alta y un patio interior con un aljibe seco.',
  },
};
