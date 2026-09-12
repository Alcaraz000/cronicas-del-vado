import { describe, expect, it } from 'vitest';
import { classify, keepDice } from '@/engine/dice';
import { rollDice } from '@/engine/rng';
import { hashParagraph } from '@/engine/text';
import { beginRoll, choose, enter, rerollDie } from '@/engine/resolve';
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

describe('beginRoll', () => {
  it('no muta el estado y es determinista', () => {
    const state = estadoEn('t_inicio');
    const antes = JSON.stringify(state);
    const p1 = beginRoll(campaign, state, 'saber');
    const p2 = beginRoll(campaign, state, 'saber');
    expect(JSON.stringify(state)).toBe(antes);
    expect(p1).toEqual(p2);
    expect(state.run.pending).toBeUndefined();
  });

  it('con ventaja tira 3 dados y deriva kept, total y banda de dice.ts', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'saber'); // mago con Aprendiz de escriba → ventaja en saber
    expect(p.choiceId).toBe('saber');
    expect(p.sceneId).toBe('t_inicio');
    expect(p.preview.mode).toBe('advantage');
    expect(p.preview.totalMod).toBe(2); // saber 2 + normal 0 + veterano 0 (nivel 3 en rango [1,3])
    expect(p.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'saber', 0, 0, 3));
    expect(p.dice).toHaveLength(3);
    expect(p.kept).toEqual(keepDice(p.dice, 'advantage'));
    const valores = p.kept.map((i) => p.dice[i]!);
    expect(p.total).toBe(valores[0]! + valores[1]! + 2);
    expect(p.band).toBe(classify(valores, 2));
    expect(p.rerolls).toEqual([]);
    expect(p.powerUsed).toBe(false);
    expect(p.canReroll).toBe(true);
  });

  it('con desventaja tira 3 dados y en tirada normal tira 2', () => {
    const state = estadoEn('t_inicio');
    const fuerza = beginRoll(campaign, state, 'fuerza'); // Debilidad del mago: fisico
    expect(fuerza.preview.mode).toBe('disadvantage');
    expect(fuerza.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'fuerza', 0, 0, 3));
    expect(fuerza.kept).toEqual(keepDice(fuerza.dice, 'disadvantage'));
    const mirar = beginRoll(campaign, state, 'mirar'); // percepcion: sin fuentes
    expect(mirar.preview.mode).toBe('normal');
    expect(mirar.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'mirar', 0, 0, 2));
    expect(mirar.kept).toEqual([0, 1]);
  });

  it('usa el contador de visitas de la escena actual en el hash', () => {
    const state = estadoEn('t_inicio', { run: { visited: { t_inicio: 2 } } });
    const p = beginRoll(campaign, state, 'mirar');
    expect(p.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'mirar', 2, 0, 2));
  });

  it('canReroll es falso sin Fortuna', () => {
    const p = beginRoll(campaign, estadoEn('t_inicio', { run: { fortune: 0 } }), 'mirar');
    expect(p.canReroll).toBe(false);
  });

  it('lanza si la opción no tiene tirada o no existe', () => {
    const state = estadoEn('t_inicio');
    expect(() => beginRoll(campaign, state, 'pasar')).toThrow('La opción no tiene tirada: pasar');
    expect(() => beginRoll(campaign, state, 'nada')).toThrow('Opción desconocida: nada (escena t_inicio)');
  });
});

describe('rerollDie', () => {
  it('cambia solo el dado elegido usando attempt = rerolls.length + 1', () => {
    const state = estadoEn('t_inicio');
    const seed = state.run.rngSeed;
    const p0 = beginRoll(campaign, state, 'mirar');
    const p1 = rerollDie(campaign, state, p0, 1);
    expect(p1.dice[0]).toBe(p0.dice[0]);
    expect(p1.dice[1]).toBe(rollDice(seed, 't_inicio', 'mirar', 0, 1, 1)[0]);
    expect(p1.rerolls).toEqual([1]);
    const p2 = rerollDie(campaign, state, p1, 0);
    expect(p2.dice[0]).toBe(rollDice(seed, 't_inicio', 'mirar', 0, 2, 1)[0]);
    expect(p2.dice[1]).toBe(p1.dice[1]);
    expect(p2.rerolls).toEqual([1, 0]);
    // Los pending anteriores y el estado no cambian.
    expect(p0.rerolls).toEqual([]);
    expect(p0.dice).toEqual(rollDice(seed, 't_inicio', 'mirar', 0, 0, 2));
    expect(p1.rerolls).toEqual([1]);
    expect(state.run.fortune).toBe(3);
  });

  it('recalcula kept, total y banda con los dados nuevos', () => {
    const state = estadoEn('t_inicio');
    const p = rerollDie(campaign, state, beginRoll(campaign, state, 'saber'), 2);
    expect(p.kept).toEqual(keepDice(p.dice, 'advantage'));
    const valores = p.kept.map((i) => p.dice[i]!);
    expect(p.total).toBe(valores[0]! + valores[1]! + p.preview.totalMod);
    expect(p.band).toBe(classify(valores, p.preview.totalMod));
  });

  it('gasta Fortuna virtualmente: canReroll se apaga y después lanza', () => {
    const state = estadoEn('t_inicio', { run: { fortune: 1 } });
    const p0 = beginRoll(campaign, state, 'mirar');
    expect(p0.canReroll).toBe(true);
    const p1 = rerollDie(campaign, state, p0, 0);
    expect(p1.canReroll).toBe(false);
    expect(() => rerollDie(campaign, state, p1, 1)).toThrow('No queda Fortuna para repetir un dado');
    expect(state.run.fortune).toBe(1);
  });

  it('lanza con índice de dado inválido', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'mirar');
    expect(() => rerollDie(campaign, state, p, 2)).toThrow('Índice de dado inválido: 2');
    expect(() => rerollDie(campaign, state, p, -1)).toThrow('Índice de dado inválido: -1');
  });
});
