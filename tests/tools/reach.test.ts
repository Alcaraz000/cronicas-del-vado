import { describe, expect, it } from 'vitest';
import type { Campaign, Scene } from '@/content/schema';
import { isSatisfiable, reachableScenes, sceneEdges } from '../../tools/lib/validate/reach';

const escena = (id: string, extra: Partial<Scene> = {}): Scene => ({
  id, kind: 'normal', place: 'lugar', text: ['Texto.'], choices: [], ...extra,
});

const campana = (scenes: Scene[], start = 'inicio'): Campaign => ({
  id: 'reach', contentVersion: 1, title: 'Reach', premise: 'p', cover: 'c', levelRange: [1, 3], durationMin: [1, 2],
  lethalScenes: 0, lintProfile: 'smoke', start,
  scenes: Object.fromEntries(scenes.map((s) => [s.id, s])),
  npcs: {}, places: {}, items: {}, flags: {}, memories: {}, milestones: {}, clocks: {}, endings: {},
});

describe('sceneEdges', () => {
  it('lista redirect, outcome y los cinco outcomes de una tirada', () => {
    const s = escena('a', {
      redirect: [{ when: { flag: 'run:x' }, to: 'r' }],
      choices: [
        { id: 'o', label: 'Ir', outcome: { next: 'o1' } },
        { id: 't', label: 'Tirar', roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: {
          success: { next: 's' }, partial: { next: 'p' }, failure: { next: 'f' }, crit: { next: 'c' }, fumble: { next: 'fu' } } } },
      ],
    });
    const edges = sceneEdges(s);
    expect(edges.map((e) => `${e.via}:${e.to}`)).toEqual(['redirect:r', 'outcome:o1', 'roll:s', 'roll:p', 'roll:f', 'roll:c', 'roll:fu']);
    expect(edges[1]?.choiceId).toBe('o');
    expect(edges[0]?.from).toBe('a');
  });
});

describe('isSatisfiable', () => {
  it('undefined y hojas que no son de clase siempre se cumplen', () => {
    expect(isSatisfiable(undefined, 'mago')).toBe(true);
    expect(isSatisfiable({ flag: 'run:x' }, 'mago')).toBe(true);
    expect(isSatisfiable({ not: { flag: 'run:x' } }, 'mago')).toBe(true);
  });
  it('class se evalúa contra la clase dada; con null siempre se cumple', () => {
    expect(isSatisfiable({ class: 'mago' }, 'mago')).toBe(true);
    expect(isSatisfiable({ class: 'mago' }, 'guerrero')).toBe(false);
    expect(isSatisfiable({ class: 'mago' }, null)).toBe(true);
    expect(isSatisfiable({ not: { class: 'mago' } }, 'mago')).toBe(false);
    expect(isSatisfiable({ not: { class: 'mago' } }, 'guerrero')).toBe(true);
    expect(isSatisfiable({ all: [{ class: 'mago' }, { flag: 'run:x' }] }, 'guerrero')).toBe(false);
    expect(isSatisfiable({ any: [{ class: 'mago' }, { flag: 'run:x' }] }, 'guerrero')).toBe(true);
  });
});

describe('reachableScenes', () => {
  const c = campana([
    escena('inicio', { choices: [
      { id: 'a', label: 'A', outcome: { next: 'medio' } },
      { id: 'm', label: 'M', requires: { class: 'mago' }, outcome: { next: 'secreto' } },
    ] }),
    escena('medio', { redirect: [{ when: { clock: 'x', gte: 1 }, to: 'fin' }], choices: [
      { id: 't', label: 'T', roll: { attr: 'saber', difficulty: 'normal', tags: ['saber'], outcomes: {
        success: { next: 'fin' }, partial: { next: 'medio' }, failure: { next: 'inicio' } } } },
    ] }),
    escena('secreto', { choices: [{ id: 'v', label: 'V', outcome: { next: 'fin' } }] }),
    escena('fin', { kind: 'ending', ending: { id: 'fin', epilogue: ['Fin.'] } }),
    escena('aislada'),
  ]);
  it('con null alcanza todo salvo lo que nadie apunta', () => {
    expect(reachableScenes(c, null)).toEqual(new Set(['inicio', 'medio', 'secreto', 'fin']));
  });
  it('con guerrero no entra a la escena que exige mago', () => {
    expect(reachableScenes(c, 'guerrero').has('secreto')).toBe(false);
    expect(reachableScenes(c, 'mago').has('secreto')).toBe(true);
  });
  it('ignora targets inexistentes sin romper', () => {
    const c2 = campana([escena('inicio', { choices: [{ id: 'x', label: 'X', outcome: { next: 'nada' } }] })]);
    expect(reachableScenes(c2, null)).toEqual(new Set(['inicio']));
  });
  it('no muta la campaña', () => {
    const antes = JSON.stringify(c);
    reachableScenes(c, 'clerigo');
    expect(JSON.stringify(c)).toBe(antes);
  });
});
