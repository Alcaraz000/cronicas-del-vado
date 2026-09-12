import { describe, expect, it } from 'vitest';
import { hashParagraph } from '@/engine/text';
import { choose, enter } from '@/engine/resolve';
import type { GameState, LogEntry } from '@/engine/types';
import { makeCtx, type StateOverrides } from '../fixtures/state';
import { tirada as campaign } from '../fixtures/campaigns/tirada';

type SceneEntry = Extract<LogEntry, { kind: 'scene' }>;

/** Estado recién entrado a `sceneId` (con su LogEntry 'scene'), sin memoria derivada todavía. */
function estadoEn(sceneId: string, overrides: StateOverrides = {}): GameState {
  return enter(campaign, makeCtx(campaign, overrides).state, sceneId);
}

function kinds(log: LogEntry[]): string[] {
  return log.map((e) => e.kind);
}

function sceneEntries(log: LogEntry[]): SceneEntry[] {
  return log.filter((e): e is SceneEntry => e.kind === 'scene');
}

function textos(entry: { paragraphs: { text: string }[] }): string[] {
  return entry.paragraphs.map((p) => p.text);
}

describe('choose', () => {
  it('deriva la memoria de la escena actual ANTES de aplicar efectos y entrar', () => {
    const state = estadoEn('t_inicio');
    const antes = JSON.stringify(state);
    const inicio = sceneEntries(state.run.log)[0]!;
    // Primera visita: ni "otra vez" ni "ya lo conocés".
    expect(textos(inicio)).toEqual([
      'Una plaza empedrada bajo la lluvia. Un guardia vigila la única puerta.',
      'Al guardia no lo viste nunca.',
    ]);

    const next = choose(campaign, state, 'pasar');

    expect(JSON.stringify(state)).toBe(antes);
    expect(next.character.flags).toHaveLength(2);
    expect(next.character.flags).toEqual(expect.arrayContaining(['char:met.guardia', 'char:place.plaza_de_prueba']));
    expect(next.run.visited).toEqual({ t_inicio: 1 });
    expect(next.seen).toEqual({ t_inicio: inicio.hashes });
    expect(inicio.hashes).toEqual(textos(inicio).map(hashParagraph));
    expect(next.run.flags).toEqual(['run:paso']);
    expect(next.run.stagedFlags).toEqual(['char:tirada.entro']);
    expect(next.run.sceneId).toBe('t_sala');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome', 'scene']);
    // La escena siguiente ya ve el flag run:paso y el char:met.guardia derivado.
    const sala = sceneEntries(next.run.log)[1]!;
    expect(textos(sala)).toEqual([
      'Entraste sin tirar nada: la sala está en silencio.',
      'El guardia te sigue con la mirada; ya lo conocés.',
    ]);
  });

  it('al volver, la plaza muestra las variantes de visita previa y de PNJ conocido', () => {
    const s1 = choose(campaign, estadoEn('t_inicio'), 'pasar');
    const s2 = choose(campaign, s1, 'volver');
    expect(s2.run.visited).toEqual({ t_inicio: 1, t_sala: 1 });
    expect(s2.seen.t_sala).toHaveLength(2);
    const entradas = sceneEntries(s2.run.log);
    expect(entradas).toHaveLength(3);
    expect(textos(entradas[2]!)).toEqual(['La plaza de prueba, otra vez.', 'Al guardia ya lo conocés de otra noche.']);
  });

  it('registra la elección y el texto del desenlace en el log', () => {
    const next = choose(campaign, estadoEn('t_inicio'), 'pasar');
    expect(next.run.log[1]).toEqual({ kind: 'choice', sceneId: 't_inicio', choiceId: 'pasar', label: 'Cruzar la puerta sin más' });
    expect(next.run.log[2]).toEqual({ kind: 'outcome', paragraphs: [{ text: 'Cruzás sin mirar atrás.' }] });
  });

  it('sin texto de desenlace no agrega entrada outcome', () => {
    const enSala = choose(campaign, estadoEn('t_inicio'), 'pasar');
    const next = choose(campaign, enSala, 'volver');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome', 'scene', 'choice', 'scene']);
  });

  it('si el log no tiene la escena actual, calcula los hashes con resolveText', () => {
    const crudo = makeCtx(campaign).state; // sceneId t_inicio, log vacío
    const next = choose(campaign, crudo, 'pasar');
    expect(next.seen.t_inicio).toEqual([
      hashParagraph('Una plaza empedrada bajo la lluvia. Un guardia vigila la única puerta.'),
      hashParagraph('Al guardia no lo viste nunca.'),
    ]);
  });

  it('lanza si la opción tiene tirada o no existe', () => {
    const state = estadoEn('t_inicio');
    expect(() => choose(campaign, state, 'saber')).toThrow('La opción requiere una tirada: saber');
    expect(() => choose(campaign, state, 'nada')).toThrow('Opción desconocida: nada (escena t_inicio)');
  });

  it('si el desenlace deja Caído, no entra a la escena siguiente y run.outcome queda', () => {
    const state = estadoEn('t_sala', { run: { wounds: 1 } });
    const next = choose(campaign, state, 'rendirse');
    expect(next.run.wounds).toBe(3);
    expect(next.run.outcome).toEqual({ kind: 'defeat' });
    expect(next.run.sceneId).toBe('t_sala');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome']);
    expect(next.run.visited).toEqual({ t_sala: 1 });
  });
});
