import { describe, expect, it } from 'vitest';
import { enter, getScene } from '@/engine/resolve';
import { hashParagraph } from '@/engine/text';
import type { GameState, LogEntry } from '@/engine/types';
import { crearEstadoMemoria, memoria } from '../fixtures/campaigns/memoria';

function ultimaEscenaDelLog(state: GameState): Extract<LogEntry, { kind: 'scene' }> {
  const ultima = state.run.log[state.run.log.length - 1];
  if (ultima === undefined || ultima.kind !== 'scene') {
    throw new Error('El último LogEntry no es de tipo scene');
  }
  return ultima;
}

describe('getScene', () => {
  it('devuelve la escena por id', () => {
    expect(getScene(memoria, 'm_puerta').id).toBe('m_puerta');
    expect(getScene(memoria, 'm_cripta').lethal).toBe(true);
  });

  it('lanza con un id desconocido', () => {
    expect(() => getScene(memoria, 'm_nada')).toThrow('Escena desconocida: m_nada');
  });
});

describe('enter: escena sin redirect', () => {
  it('fija run.sceneId y agrega un LogEntry scene con los párrafos resueltos y sus hashes', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_puerta');

    expect(resultado.run.sceneId).toBe('m_puerta');
    expect(resultado.run.log).toHaveLength(1);
    const entrada = ultimaEscenaDelLog(resultado);
    expect(entrada.sceneId).toBe('m_puerta');
    expect(entrada.paragraphs).toHaveLength(3);
    expect(entrada.paragraphs[0]?.text).toBe('La puerta de la torre vieja está cerrada. Una guardiana de capa gris te mira desde el umbral.');
    expect(entrada.paragraphs[2]).toEqual({ speaker: 'guardiana', text: '—Nadie pasa sin la llave. Ni vos ni nadie.' });
    expect(entrada.hashes).toEqual(entrada.paragraphs.map((p) => hashParagraph(p.text)));
  });

  it('aplica onEnter una vez por cada entrada', () => {
    const una = enter(memoria, crearEstadoMemoria(), 'm_sala');
    expect(una.run.clocks.ronda).toBe(1);

    const dos = enter(memoria, una, 'm_sala');
    expect(dos.run.clocks.ronda).toBe(2);
    expect(dos.run.log).toHaveLength(2);
  });

  it('el hito de onEnter es idempotente dentro de la partida', () => {
    const una = enter(memoria, crearEstadoMemoria(), 'm_puerta');
    const dos = enter(memoria, una, 'm_puerta');
    expect(una.run.milestones).toEqual(['llegar_a_la_puerta']);
    expect(dos.run.milestones).toEqual(['llegar_a_la_puerta']);
  });

  it('no cuenta visitas ni deriva memoria al entrar', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_puerta');
    expect(resultado.run.visited).toEqual({});
    expect(resultado.character.flags).toEqual([]);
    expect(resultado.seen).toEqual({});
  });

  it('no muta el estado de entrada', () => {
    const estado = crearEstadoMemoria();
    const antes = JSON.stringify(estado);
    enter(memoria, estado, 'm_sala');
    expect(JSON.stringify(estado)).toBe(antes);
  });
});
