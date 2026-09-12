import { describe, expect, it } from 'vitest';
import { LIMITS } from '@/content/catalog';
import type { Campaign, Scene } from '@/content/schema';
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

function campanaConCadena(largo: number): Campaign {
  const escenas: Record<string, Scene> = {};
  for (let i = 0; i < largo; i += 1) {
    const id = `m_cadena_${i}`;
    const base: Scene = { id, kind: 'normal', place: 'torre_vieja', text: [`Eslabón ${i}.`], choices: [] };
    escenas[id] =
      i < largo - 1
        ? { ...base, redirect: [{ when: { not: { flag: 'run:nunca' } }, to: `m_cadena_${i + 1}` }] }
        : base;
  }
  return { ...memoria, scenes: { ...memoria.scenes, ...escenas } };
}

describe('enter: redirects', () => {
  it('sigue redirects en cadena y no registra las escenas atravesadas', () => {
    const estado = crearEstadoMemoria({ run: { flags: ['run:puerta_abierta', 'run:tesoro_a_la_vista'] } });
    const resultado = enter(memoria, estado, 'm_puerta');

    expect(resultado.run.sceneId).toBe('m_fin_tesoro');
    expect(resultado.run.log.map((e) => (e.kind === 'scene' ? e.sceneId : e.kind))).toEqual(['m_fin_tesoro']);
    expect(resultado.run.visited).toEqual({});
    // Los onEnter de m_puerta (hito) y m_sala (reloj) NO se aplican: solo cuenta la escena final.
    expect(resultado.run.milestones).toEqual([]);
    expect(resultado.run.clocks).toEqual({});
  });

  it('ignora un redirect cuya condición no se cumple', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_puerta');
    expect(resultado.run.sceneId).toBe('m_puerta');
    expect(resultado.run.milestones).toEqual(['llegar_a_la_puerta']);
  });

  it('evalúa los redirects contra el estado de entrada, antes de cualquier onEnter', () => {
    const estado = crearEstadoMemoria({ run: { flags: ['run:puerta_abierta'] } });
    const resultado = enter(memoria, estado, 'm_puerta');
    expect(resultado.run.sceneId).toBe('m_sala');
    expect(resultado.run.clocks.ronda).toBe(1);
    expect(resultado.run.milestones).toEqual([]);
  });

  it('permite exactamente LIMITS.maxRedirects saltos', () => {
    const campana = campanaConCadena(LIMITS.maxRedirects + 1);
    const resultado = enter(campana, crearEstadoMemoria(), 'm_cadena_0');
    expect(resultado.run.sceneId).toBe(`m_cadena_${LIMITS.maxRedirects}`);
  });

  it('lanza al superar LIMITS.maxRedirects saltos', () => {
    const campana = campanaConCadena(LIMITS.maxRedirects + 2);
    expect(() => enter(campana, crearEstadoMemoria(), 'm_cadena_0')).toThrow(/Demasiados redirects/);
  });

  it('lanza ante dos escenas que se redirigen mutuamente sin condición', () => {
    const bucle: Campaign = {
      ...memoria,
      scenes: {
        ...memoria.scenes,
        m_bucle_a: {
          id: 'm_bucle_a',
          kind: 'normal',
          place: 'torre_vieja',
          redirect: [{ when: { not: { flag: 'run:nunca' } }, to: 'm_bucle_b' }],
          text: ['Bucle A.'],
          choices: [],
        },
        m_bucle_b: {
          id: 'm_bucle_b',
          kind: 'normal',
          place: 'torre_vieja',
          redirect: [{ when: { not: { flag: 'run:nunca' } }, to: 'm_bucle_a' }],
          text: ['Bucle B.'],
          choices: [],
        },
      },
    };
    expect(() => enter(bucle, crearEstadoMemoria(), 'm_bucle_a')).toThrow(/Demasiados redirects/);
  });
});

describe('enter: final y recorte del log', () => {
  it('una escena ending marca run.outcome y agrega el epílogo después del texto', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_fin_huida');

    expect(resultado.run.outcome).toEqual({ kind: 'ending', endingId: 'fin_huida' });
    const entrada = ultimaEscenaDelLog(resultado);
    expect(entrada.paragraphs.map((p) => p.text)).toEqual([
      'Bajás la cuesta sin mirar atrás. La torre queda donde estaba.',
      'Con vida y sin tesoro. Hay peores maneras de terminar una noche.',
    ]);
    expect(entrada.hashes).toHaveLength(2);
  });

  it('una escena que no es ending no fija outcome', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_sala');
    expect(resultado.run.outcome).toBeUndefined();
  });

  it('recorta el log a LIMITS.maxLog entradas conservando las últimas', () => {
    const relleno: LogEntry[] = Array.from({ length: LIMITS.maxLog }, (_, i): LogEntry => ({
      kind: 'choice',
      sceneId: 'm_puerta',
      choiceId: `c${i}`,
      label: `Opción ${i}`,
    }));
    const estado = crearEstadoMemoria({ run: { log: relleno } });
    const resultado = enter(memoria, estado, 'm_puerta');

    expect(resultado.run.log).toHaveLength(LIMITS.maxLog);
    expect(resultado.run.log[0]).toEqual(relleno[1]);
    expect(resultado.run.log[LIMITS.maxLog - 1]?.kind).toBe('scene');
  });
});
