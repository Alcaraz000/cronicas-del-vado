import type { Campaign } from '@/content/schema';
import { campanaBase } from './base';

/** El flag de canon está declarado, pero el jugador no tiene qué leer de él. */
export const rotaR12FaltaLinea: Campaign = { ...campanaBase, memories: {} };

/** Hay línea para un flag que nadie declaró. */
export const rotaR12LineaHuerfana: Campaign = {
  ...campanaBase,
  memories: { ...campanaBase.memories, 'char:base.fantasma': 'Nadie escribió este flag.' },
};

/** Línea sobre un flag `run:`, que muere con la partida y no se lee nunca en la Ficha. */
export const rotaR12LineaDeRun: Campaign = {
  ...campanaBase,
  memories: { ...campanaBase.memories, 'run:b_hablo': 'Hablaste con el guía.' },
};

/** Línea sobre un espacio compartido: eso lo deriva el motor y se muestra con el nombre del PNJ. */
export const rotaR12LineaCompartida: Campaign = {
  ...campanaBase,
  memories: { ...campanaBase.memories, 'char:met.b_guia': 'Conociste al guía.' },
};
