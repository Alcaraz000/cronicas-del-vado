import { describe, expect, it } from 'vitest';
import { deriveMemory } from '@/engine/memory';
import { enter, render } from '@/engine/resolve';
import type { GameState, LogEntry, RenderedScene } from '@/engine/types';
import { crearEstadoMemoria, memoria } from '../fixtures/campaigns/memoria';

function ultimaEscenaDelLog(state: GameState): Extract<LogEntry, { kind: 'scene' }> {
  const ultima = state.run.log[state.run.log.length - 1];
  if (ultima === undefined || ultima.kind !== 'scene') {
    throw new Error('El último LogEntry no es de tipo scene');
  }
  return ultima;
}

function entrarYRenderizar(state: GameState, sceneId: string): { state: GameState; vista: RenderedScene } {
  const siguiente = enter(memoria, state, sceneId);
  return { state: siguiente, vista: render(memoria, siguiente) };
}

/** Estado tras una primera visita completa a m_puerta: entra, deriva memoria (como haría choose) y vuelve a entrar. */
function segundaVisitaAPuerta(): GameState {
  const primera = enter(memoria, crearEstadoMemoria(), 'm_puerta');
  const entrada = ultimaEscenaDelLog(primera);
  const conMemoria = deriveMemory({ campaign: memoria, state: primera }, 'm_puerta', entrada.hashes);
  return enter(memoria, conMemoria, 'm_puerta');
}

describe('render: párrafos y memoria', () => {
  it('la primera visita con un personaje nuevo no muestra "otra vez" ni la variante knows', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');

    expect(vista.sceneId).toBe('m_puerta');
    expect(vista.paragraphs).toHaveLength(3);
    expect(vista.paragraphs[0]?.text).not.toContain('otra vez');
    expect(vista.paragraphs[0]?.text).toContain('está cerrada');
    expect(vista.paragraphs[1]?.text).toBe('Nunca estuviste acá. La torre parece más alta de lo que debería.');
  });

  it('tras derivar memoria y volver a entrar, muestra "otra vez" y la variante knows', () => {
    const vista = render(memoria, segundaVisitaAPuerta());

    expect(vista.paragraphs[0]?.text).toContain('otra vez');
    expect(vista.paragraphs[1]?.text).toContain('Conocés esta torre');
    expect(vista.paragraphs[2]).toEqual({ speaker: 'guardiana', text: '—Nadie pasa sin la llave. Ni vos ni nadie.' });
  });

  it('usa los párrafos del último LogEntry scene de la escena actual', () => {
    const estado = crearEstadoMemoria({
      run: {
        sceneId: 'm_puerta',
        log: [
          { kind: 'scene', sceneId: 'm_puerta', paragraphs: [{ text: 'Versión vieja.' }], hashes: ['x'] },
          { kind: 'choice', sceneId: 'm_puerta', choiceId: 'esperar', label: 'Esperar junto a la puerta' },
          { kind: 'scene', sceneId: 'm_puerta', paragraphs: [{ text: 'Versión nueva.' }], hashes: ['y'] },
        ],
      },
    });
    expect(render(memoria, estado).paragraphs).toEqual([{ text: 'Versión nueva.' }]);
  });

  it('si no hay LogEntry scene para la escena actual, resuelve el texto en el momento', () => {
    const estado = crearEstadoMemoria({ run: { sceneId: 'm_sala', log: [] } });
    const vista = render(memoria, estado);
    expect(vista.paragraphs).toHaveLength(2);
    expect(vista.paragraphs[0]?.text).toContain('La sala huele a polvo');
  });
});

describe('render: metadatos, retrato y final', () => {
  it('expone sceneId, kind, lethal, place y variant de la escena', () => {
    const { vista: cripta } = entrarYRenderizar(crearEstadoMemoria(), 'm_cripta');
    expect(cripta.kind).toBe('normal');
    expect(cripta.lethal).toBe(true);
    expect(cripta.place).toBe('torre_vieja');
    expect(cripta.variant).toBe('cripta');

    const { vista: puerta } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(puerta.kind).toBe('hub');
    expect(puerta.lethal).toBe(false);
    expect(puerta.variant).toBeUndefined();
  });

  it('portraitNpc es el speaker del último párrafo con speaker', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(vista.portraitNpc).toBe('guardiana');
  });

  it('si ningún párrafo tiene speaker, portraitNpc es el primer PNJ de la escena', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    expect(vista.portraitNpc).toBe('guardiana');
  });

  it('sin speaker ni npcs, portraitNpc queda undefined', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_cripta');
    expect(vista.portraitNpc).toBeUndefined();
  });

  it('una escena que no es final no tiene ending', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    expect(vista.ending).toBeUndefined();
  });

  it('una escena ending expone id, título y epílogo resuelto, y no tiene opciones', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_fin_tesoro');

    expect(vista.kind).toBe('ending');
    expect(vista.ending).toEqual({
      id: 'fin_tesoro',
      title: 'El tesoro de la torre vieja',
      epilogue: [{ text: 'Salís de la torre con las mangas pesadas. La guardiana no dice nada.' }],
    });
    expect(vista.choices).toEqual([]);
  });
});
