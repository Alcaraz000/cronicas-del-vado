import { describe, expect, it } from 'vitest';
import { hashParagraph, resolveText } from '@/engine/text';
import { hash32 } from '@/engine/rng';
import type { Campaign, Text } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/** Campaña mínima solo para dar contexto a `evaluate`; no tiene escenas porque resolveText no las necesita. */
const campania: Campaign = {
  id: 'texto_test',
  contentVersion: 1,
  title: 'Campaña de prueba de texto',
  premise: 'Solo para tests.',
  cover: 'portada_test',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  start: 'inicio',
  scenes: {},
  npcs: {},
  places: {},
  items: {},
  flags: {},
  milestones: {},
  clocks: {},
  endings: {},
};

interface StateOverrides {
  characterFlags?: string[];
  runFlags?: string[];
  items?: string[];
}

function makeState(over: StateOverrides = {}): GameState {
  return {
    world: { flags: [], fallen: [] },
    character: {
      id: 'pj_1',
      name: 'Prueba',
      portrait: 'mago_01',
      classId: 'mago',
      attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
      traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
      skills: [],
      level: 3,
      xp: 0,
      flags: over.characterFlags ?? [],
      memoryNames: {},
      relics: [],
      scars: [],
      campaignLog: {},
      run: null,
    },
    run: {
      campaignId: campania.id,
      contentVersion: 1,
      sceneId: 'inicio',
      flags: over.runFlags ?? [],
      stagedFlags: [],
      visited: {},
      items: over.items ?? [],
      wounds: 0,
      conditions: [],
      fortune: 3,
      powerUsed: false,
      clocks: {},
      milestones: [],
      log: [],
      rngSeed: 1,
    },
    seen: {},
  };
}

function makeCtx(over: StateOverrides = {}): EvalContext {
  return { campaign: campania, state: makeState(over) };
}

describe('hashParagraph', () => {
  it('devuelve el hash32 del texto expresado en base36', () => {
    const texto = 'El puente viejo está cerrado con tablones y barriles.';
    expect(hashParagraph(texto)).toBe(hash32(texto).toString(36));
  });

  it('solo contiene dígitos y letras minúsculas (base36)', () => {
    expect(hashParagraph('Aldamar de noche huele a humo viejo.')).toMatch(/^[0-9a-z]+$/);
  });

  it('es estable: el mismo texto da siempre el mismo hash', () => {
    const texto = 'Nadie te saluda; tampoco nadie te cierra la puerta.';
    expect(hashParagraph(texto)).toBe(hashParagraph(texto));
  });

  it('es distinto para textos distintos, incluso si difieren en un carácter', () => {
    expect(hashParagraph('Cruzás la plaza.')).not.toBe(hashParagraph('Cruzás la plaza,'));
    expect(hashParagraph('a')).not.toBe(hashParagraph('b'));
    expect(hashParagraph('')).not.toBe(hashParagraph(' '));
  });
});

describe('resolveText: narrador y speaker', () => {
  it('un string se convierte en párrafo de narrador sin speaker', () => {
    const texto: Text = ['La plaza está vacía.'];
    const resultado = resolveText(texto, makeCtx());
    expect(resultado).toStrictEqual([{ text: 'La plaza está vacía.' }]);
    expect('speaker' in resultado[0]!).toBe(false);
  });

  it('un Paragraph con speaker conserva el speaker en el párrafo resuelto', () => {
    const texto: Text = [{ speaker: 'centinela', variants: [{ text: '—Alto ahí.' }] }];
    expect(resolveText(texto, makeCtx())).toStrictEqual([{ speaker: 'centinela', text: '—Alto ahí.' }]);
  });

  it('un Paragraph sin speaker es de narrador', () => {
    const texto: Text = [{ variants: [{ text: 'El centinela te mira.' }] }];
    const resultado = resolveText(texto, makeCtx());
    expect(resultado).toStrictEqual([{ text: 'El centinela te mira.' }]);
    expect('speaker' in resultado[0]!).toBe(false);
  });

  it('respeta el orden de los párrafos mezclando strings y Paragraphs', () => {
    const texto: Text = [
      'Primero.',
      { speaker: 'orell', variants: [{ text: '—Segundo.' }] },
      'Tercero.',
    ];
    expect(resolveText(texto, makeCtx())).toStrictEqual([
      { text: 'Primero.' },
      { speaker: 'orell', text: '—Segundo.' },
      { text: 'Tercero.' },
    ]);
  });

  it('con un Text vacío devuelve una lista vacía', () => {
    expect(resolveText([], makeCtx())).toStrictEqual([]);
  });
});

describe('resolveText: variantes condicionadas', () => {
  /** La más específica va arriba; la última no tiene `when` y es la de siempre. */
  const parrafoHub: Text = [
    {
      variants: [
        { when: { all: [{ flag: 'run:a' }, { flag: 'run:b' }] }, text: 'Tenés las dos pistas.' },
        { when: { flag: 'run:a' }, text: 'Tenés la pista A.' },
        { when: { flag: 'run:b' }, text: 'Tenés la pista B.' },
        { text: 'No sabés nada todavía.' },
      ],
    },
  ];

  it('gana la primera variante cuyo when se cumple, en orden de escritura', () => {
    expect(resolveText(parrafoHub, makeCtx({ runFlags: ['run:a', 'run:b'] }))).toStrictEqual([
      { text: 'Tenés las dos pistas.' },
    ]);
    expect(resolveText(parrafoHub, makeCtx({ runFlags: ['run:a'] }))).toStrictEqual([{ text: 'Tenés la pista A.' }]);
    expect(resolveText(parrafoHub, makeCtx({ runFlags: ['run:b'] }))).toStrictEqual([{ text: 'Tenés la pista B.' }]);
  });

  it('sin ningún when cumplido cae en la variante sin when', () => {
    expect(resolveText(parrafoHub, makeCtx())).toStrictEqual([{ text: 'No sabés nada todavía.' }]);
  });

  it('una variante sin when siempre gana aunque haya otras después', () => {
    const texto: Text = [
      { variants: [{ text: 'Siempre.' }, { when: { flag: 'run:a' }, text: 'Nunca se muestra.' }] },
    ];
    expect(resolveText(texto, makeCtx({ runFlags: ['run:a'] }))).toStrictEqual([{ text: 'Siempre.' }]);
  });

  it('un párrafo sin variante válida se omite y no deja hueco', () => {
    const texto: Text = [
      'Antes.',
      { variants: [{ when: { flag: 'run:no_existe' }, text: 'Oculto.' }] },
      { variants: [] },
      'Después.',
    ];
    expect(resolveText(texto, makeCtx())).toStrictEqual([{ text: 'Antes.' }, { text: 'Después.' }]);
  });

  it('conserva el speaker de la variante que gana', () => {
    const texto: Text = [
      {
        speaker: 'orell',
        variants: [
          { when: { trait: 'desertor' }, text: '—Un desertor. Se te nota en cómo parás.' },
          { text: '—Nadie cruza hasta que amanezca.' },
        ],
      },
    ];
    expect(resolveText(texto, makeCtx())).toStrictEqual([
      { speaker: 'orell', text: '—Nadie cruza hasta que amanezca.' },
    ]);
  });

  it('las variantes de memoria (met, knows) leen los flags del personaje', () => {
    const texto: Text = [
      {
        variants: [
          { when: { met: 'orell' }, text: 'Lo conocés de otra crónica.' },
          { text: 'Un sargento de barba gris te apunta con la ballesta.' },
        ],
      },
      {
        variants: [
          { when: { knows: 'puente_viejo' }, text: 'El puente viejo, otra vez.' },
          { text: 'El puente viejo está cerrado con tablones.' },
        ],
      },
    ];
    expect(resolveText(texto, makeCtx())).toStrictEqual([
      { text: 'Un sargento de barba gris te apunta con la ballesta.' },
      { text: 'El puente viejo está cerrado con tablones.' },
    ]);
    expect(
      resolveText(texto, makeCtx({ characterFlags: ['char:met.orell', 'char:place.puente_viejo'] })),
    ).toStrictEqual([{ text: 'Lo conocés de otra crónica.' }, { text: 'El puente viejo, otra vez.' }]);
  });

  it('evalúa condiciones que no son flags (item, trait) con el mismo contexto', () => {
    const texto: Text = [
      {
        variants: [
          { when: { item: 'carta_lacrada' }, text: 'Mostrás la carta.' },
          { when: { trait: 'aprendiz_de_escriba' }, text: 'Leés el lacre desde lejos.' },
          { text: 'No tenés nada que mostrar.' },
        ],
      },
    ];
    expect(resolveText(texto, makeCtx({ items: ['carta_lacrada'] }))).toStrictEqual([{ text: 'Mostrás la carta.' }]);
    expect(resolveText(texto, makeCtx())).toStrictEqual([{ text: 'Leés el lacre desde lejos.' }]);
  });
});
