import type { Campaign, Choice, Scene } from '@/content/schema';
import { b_descanso, b_inicio, campanaBase, conEscena, conOpcion, opcion } from './base';

// `irse` era la única opción libre (sin requires y sin tirada) que llegaba a un final: con llave,
// desde el inicio, el descanso, la ronda 1 y la cripta ya no se sale sin tirar dados ni tener el
// flag. La ronda 2 se salva porque su redirect de clock la lleva a b_fin_a.
export const rotaR13SinFinalLibre: Campaign = conEscena(
  campanaBase,
  conOpcion(b_descanso, {
    ...opcion(b_descanso, 'irse'),
    requires: { flag: 'run:b_hablo' },
    lockedHint: 'No hablaste con el guía',
  }),
);

// Un racimo cerrado: dos escenas que sólo se apuntan entre ellas y a sí mismas, con la única
// salida en un `redirect` que el jugador nunca ve como opción. Es la forma exacta del acto 1 de
// la campaña real, en chico.
const vuelve = (id: string, label: string, next: string): Choice => ({ id, label, outcome: { next } });

const b_pozo1: Scene = {
  id: 'b_pozo1', kind: 'normal', place: 'b_plaza',
  text: ['El pozo no tiene brocal y la cuerda está tensa.'],
  choices: [
    vuelve('bajar', 'Bajar por la cuerda', 'b_pozo2'),
    vuelve('mirar', 'Mirar el agua', 'b_pozo1'),
    vuelve('gritar', 'Gritar hacia abajo', 'b_pozo1'),
    vuelve('tirar', 'Tirar de la cuerda', 'b_pozo2'),
  ],
};

const b_pozo2: Scene = {
  id: 'b_pozo2', kind: 'normal', place: 'b_plaza',
  redirect: [{ when: { clock: 'b_pelea', gte: 2 }, to: 'b_fin_a' }],
  text: ['Abajo huele a agua vieja y la cuerda no llega al fondo.'],
  choices: [
    vuelve('subir', 'Subir por la cuerda', 'b_pozo1'),
    vuelve('tantear', 'Tantear la pared', 'b_pozo2'),
    vuelve('escuchar', 'Escuchar el goteo', 'b_pozo2'),
    vuelve('volver', 'Volver arriba', 'b_pozo1'),
  ],
};

const inicioConPozo: Scene = {
  ...b_inicio,
  choices: [...b_inicio.choices, vuelve('pozo', 'Bajar al pozo de la plaza', 'b_pozo1')],
};

export const rotaR13Racimo: Campaign = conEscena(
  conEscena(conEscena(campanaBase, b_pozo1), b_pozo2),
  inicioConPozo,
);

// Una sola escena que sólo se apunta a sí misma y sale por redirect. Tarjan la deja en una
// componente de UNA escena, así que la regla tiene que mirar además el lazo a sí misma: si no, el
// caso más barato de la falla —una pantalla de la que no se sale eligiendo— se le escapa.
const b_noria: Scene = {
  id: 'b_noria', kind: 'normal', place: 'b_plaza',
  redirect: [{ when: { clock: 'b_pelea', gte: 2 }, to: 'b_fin_a' }],
  text: ['La noria gira y no llega a ningún lado.'],
  choices: [
    vuelve('empujar', 'Empujar la noria', 'b_noria'),
    vuelve('frenar', 'Frenar la noria', 'b_noria'),
    vuelve('mirar', 'Mirar cómo gira', 'b_noria'),
    vuelve('contar', 'Contar las vueltas', 'b_noria'),
  ],
};

export const rotaR13Autobucle: Campaign = conEscena(conEscena(campanaBase, b_noria), {
  ...b_inicio,
  choices: [...b_inicio.choices, vuelve('noria', 'Acercarse a la noria', 'b_noria')],
});

// El mismo pozo, pero la salida es una TIRADA en vez de un redirect. Las dos mitades de la regla
// miran conjuntos distintos de aristas y esta campaña las separa: la tirada NO es una opción libre
// (la primera mitad denuncia las dos escenas del pozo) pero SÍ es una arista de `choice` (la
// segunda no denuncia nada, porque del racimo se sale eligiendo, aunque sea tirando dados).
const b_pozo2ConTirada: Scene = {
  ...b_pozo2,
  redirect: undefined,
  choices: [
    ...b_pozo2.choices,
    { id: 'trepar', label: 'Trepar por la pared', roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: {
      success: { next: 'b_fin_a' },
      partial: { effects: [{ wound: 1 }], next: 'b_fin_a' },
      failure: { effects: [{ wound: 1 }], next: 'b_pozo2' } } } },
  ],
};

export const rotaR13SoloTirada: Campaign = conEscena(
  conEscena(conEscena(campanaBase, b_pozo1), b_pozo2ConTirada),
  inicioConPozo,
);
