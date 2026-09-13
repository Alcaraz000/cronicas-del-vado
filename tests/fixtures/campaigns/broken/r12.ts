import type { Campaign } from '@/content/schema';
import { campanaBase } from './base';

/** El flag de canon está declarado, pero el jugador no tiene qué leer de él. */
export const rotaR12FaltaLinea: Campaign = { ...campanaBase, memories: {} };

/**
 * Lo mismo, pero del lado del MUNDO. Los otros cuatro fixtures son todos `char:`, así que el
 * segundo prefijo de la regla (`world:<campaña>.`) recorría el mismo camino sin que nada lo
 * demostrara: un `startsWith` mal escrito ahí dejaría pasar canon del mundo sin línea, que es
 * justo el que sobrevive al personaje y más caro sale perder.
 */
export const rotaR12FaltaLineaDeMundo: Campaign = {
  ...campanaBase,
  flags: { ...campanaBase.flags, 'world:base.puente_caido': 'El puente quedó abajo' },
};

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
