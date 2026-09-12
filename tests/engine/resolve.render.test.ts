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

function opcion(vista: RenderedScene, id: string) {
  const encontrada = vista.choices.find((c) => c.id === id);
  if (encontrada === undefined) {
    throw new Error(`La escena renderizada no tiene la opción ${id}`);
  }
  return encontrada;
}

describe('render: opciones', () => {
  it('sin requires: visible, habilitada, sin badge ni lockedHint', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    const abrir = opcion(vista, 'abrir');
    expect(abrir.visible).toBe(true);
    expect(abrir.enabled).toBe(true);
    expect(abrir.badge).toBeUndefined();
    expect(abrir.lockedHint).toBeUndefined();
    expect(abrir.label).toBe('Abrir la puerta con cuidado');
  });

  it('badge por tipo de requires: clase, rasgo, habilidad y objeto', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    expect(opcion(vista, 'magia').badge).toBe('Mago');
    expect(opcion(vista, 'escriba').badge).toBe('Aprendiz de escriba');
    expect(opcion(vista, 'rastrear').badge).toBe('Rastreador');
    expect(opcion(vista, 'llave').badge).toBe('Llave vieja');
  });

  it('badge Recuerdo para knows, para flag char: y para all/any con un hijo de memoria', () => {
    const { vista: puerta } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(opcion(puerta, 'recuerdo').badge).toBe('Recuerdo');
    expect(opcion(puerta, 'cronica').badge).toBe('Recuerdo');

    const { vista: sala } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    // all: [{ wounds }, { met }] → wounds no da badge; met sí.
    expect(opcion(sala, 'combinado').badge).toBe('Recuerdo');
  });

  it('requires cumplido: visible y habilitada, conserva el lockedHint como dato', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    const magia = opcion(vista, 'magia');
    expect(magia.visible).toBe(true);
    expect(magia.enabled).toBe(true);
    expect(magia.lockedHint).toBe('Solo un mago lee estas runas');
    expect(opcion(vista, 'escriba').enabled).toBe(true);
  });

  it('requires fallido con lockedHint: visible y deshabilitada, con el hint', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    const rastrear = opcion(vista, 'rastrear');
    expect(rastrear.visible).toBe(true);
    expect(rastrear.enabled).toBe(false);
    expect(rastrear.lockedHint).toBe('No sabés leer huellas');

    const llave = opcion(vista, 'llave');
    expect(llave.visible).toBe(true);
    expect(llave.enabled).toBe(false);
  });

  it('requires fallido sin lockedHint: invisible y deshabilitada', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    const secreto = opcion(vista, 'secreto');
    expect(secreto.visible).toBe(false);
    expect(secreto.enabled).toBe(false);
  });

  it('la opción Recuerdo se bloquea en la primera visita y se habilita tras derivar memoria', () => {
    const { vista: primera } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(opcion(primera, 'recuerdo').enabled).toBe(false);

    const segunda = render(memoria, segundaVisitaAPuerta());
    expect(opcion(segunda, 'recuerdo').enabled).toBe(true);
  });

  it('leadsToLethal es true solo si outcome.next apunta a una escena lethal', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(opcion(vista, 'entrar_cripta').leadsToLethal).toBe(true);
    expect(opcion(vista, 'abrir').leadsToLethal).toBe(false);
    expect(opcion(vista, 'forzar').leadsToLethal).toBe(false);
  });

  it('alreadySeen es true si la escena destino tiene hashes en seen', () => {
    const sinMemoria = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta').vista;
    expect(opcion(sinMemoria, 'abrir').alreadySeen).toBe(false);

    const conMemoria = entrarYRenderizar(crearEstadoMemoria({ seen: { m_sala: ['abc'] } }), 'm_puerta').vista;
    expect(opcion(conMemoria, 'abrir').alreadySeen).toBe(true);
    expect(opcion(conMemoria, 'entrar_cripta').alreadySeen).toBe(false);
  });

  it('preview solo en opciones con tirada; el mago forzando la puerta tiene desventaja por Debilidad', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(opcion(vista, 'abrir').preview).toBeUndefined();

    const preview = opcion(vista, 'forzar').preview;
    expect(preview).toBeDefined();
    expect(preview?.attr).toBe('vigor');
    expect(preview?.attrValue).toBe(0);
    expect(preview?.difficulty).toBe('dificil');
    expect(preview?.totalMod).toBe(-1);
    expect(preview?.mode).toBe('disadvantage');
  });

  it('el estado no se modifica al renderizar', () => {
    const estado = enter(memoria, crearEstadoMemoria(), 'm_sala');
    const antes = JSON.stringify(estado);
    render(memoria, estado);
    expect(JSON.stringify(estado)).toBe(antes);
  });
});
