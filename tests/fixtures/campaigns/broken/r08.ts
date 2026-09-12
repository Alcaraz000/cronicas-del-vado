import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena } from './base';

// Un PNJ de la campaña recuerda otra partida (met en un párrafo con speaker local).
export const rotaR08PnjRecuerda: Campaign = conEscena(campanaBase, { ...b_inicio, text: [
  'Llegás a la plaza con la lluvia en la nuca.',
  { speaker: 'b_guia', variants: [
    { when: { met: 'b_guia' }, text: '—Otra vez vos.' },
    { text: '—Bienvenido.' } ] },
] });

// Un párrafo cuya última variante tiene when.
export const rotaR08SinDefecto: Campaign = conEscena(campanaBase, { ...b_inicio, text: [
  'Llegás a la plaza con la lluvia en la nuca.',
  { variants: [
    { when: { visited: 'b_inicio', min: 1 }, text: 'Otra vez la plaza.' },
    { when: { knows: 'b_plaza' }, text: 'Conocés esta plaza.' } ] },
] });
