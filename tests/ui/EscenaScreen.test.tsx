/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Campaign } from '@/content/schema';
import type { LogEntry, Run } from '@/engine/types';
import { useStore } from '@/state/store';
import { EscenaScreen } from '@/ui/screens/EscenaScreen';
import { S } from '@/ui/strings.es';
import { makeCharacter, makeRun } from '../fixtures/state';
import { minimal } from '../fixtures/campaigns/minimal';

/**
 * Campaña sintética con dos indirecciones a propósito: el id de la escena (`plaza_vieja`)
 * NO es el id de archivo del fondo, y el id del PNJ (`mensajero`) NO es el id de archivo
 * del retrato. Así el test prueba que la pantalla resuelve la imagen a través de
 * `Place.background` / `Place.variants` y de `Npc.portrait` (los campos que la consigna
 * señala como la referencia real), y no asumiendo que el id de contenido es el nombre
 * de archivo — que es cierto hoy en la campaña real pero no es lo que garantiza el esquema.
 */
const conArte: Campaign = {
  id: 'con_arte',
  contentVersion: 1,
  title: 'Campaña con arte',
  premise: '',
  cover: 'x',
  levelRange: [1, 1],
  durationMin: [1, 1],
  lethalScenes: 0,
  lintProfile: 'smoke',
  hidden: true,
  start: 'e_inicio',
  scenes: {
    e_inicio: {
      id: 'e_inicio',
      kind: 'normal',
      place: 'plaza_vieja',
      variant: 'amanecer',
      npcs: ['mensajero'],
      text: ['Estás en la plaza al amanecer.'],
      choices: [{ id: 'seguir', label: 'Seguir camino', outcome: { next: 'e_inicio' } }],
    },
  },
  npcs: {
    mensajero: { id: 'mensajero', name: 'El mensajero', portrait: 'orell', voice: '', canonPrompt: '' },
  },
  places: {
    plaza_vieja: {
      id: 'plaza_vieja',
      name: 'La plaza vieja',
      background: 'puente_viejo',
      variants: { amanecer: 'puente_viejo.amanecer' },
      canonPrompt: '',
    },
  },
  items: {},
  flags: {},
  memories: {},
  milestones: {},
  clocks: {},
  endings: {},
};

function montarEscena(campaign: Campaign, runOverrides: Partial<Run> = {}): void {
  const run = makeRun({
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    sceneId: campaign.start,
    ...runOverrides,
  });
  const character = makeCharacter({ run });
  useStore.setState((s) => ({
    characters: [character],
    activeCharacterId: character.id,
    world: { flags: [], fallen: [] },
    seen: {},
    ui: { ...s.ui, screen: 'escena', campaign, pending: null },
  }));
}

/** Una entrada 'scene' de log con la prosa que se quiera probar revelando. */
function escenaLog(paragraphs: string[]): LogEntry {
  return {
    kind: 'scene',
    sceneId: minimal.start,
    paragraphs: paragraphs.map((text) => ({ text })),
    hashes: paragraphs.map((_, i) => `h${i}`),
  };
}

describe('EscenaScreen — arte', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra la imagen real del fondo (con variante) y del retrato del PNJ que habla', async () => {
    montarEscena(conArte);
    render(<EscenaScreen />);

    const fondo = await screen.findByAltText(`${S.placeholder.fondo}: La plaza vieja`);
    expect(fondo.tagName).toBe('IMG');
    expect(fondo.getAttribute('src')).toMatch(/puente_viejo/);

    const retrato = await screen.findByAltText(`${S.placeholder.retrato}: El mensajero`);
    expect(retrato.tagName).toBe('IMG');
    expect(retrato.getAttribute('src')).toMatch(/orell/);

    // El nombre del lugar sigue en la barra superior: la imagen no es la única pista.
    expect(screen.getByText('La plaza vieja')).toBeInTheDocument();
  });

  it('sin arte cae al placeholder y la escena se sigue jugando igual (campaña de humo)', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    expect(screen.getByRole('img', { name: `${S.placeholder.fondo}: El claro` })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `${S.placeholder.retrato}: El guía` })).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();

    // Nada rompió: las opciones de la escena están y se pueden elegir.
    expect(screen.getByTestId('opcion-descansar')).toBeInTheDocument();
    expect(screen.getByText('El claro')).toBeInTheDocument();
  });
});

describe('EscenaScreen — la Ficha', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('la tecla C abre la Ficha y Esc la cierra', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'c' });
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAccessibleName(S.ficha.titulo);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('la tecla C no abre la Ficha si el foco está en un campo de texto', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'c' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    input.remove();
  });
});

describe('EscenaScreen — el revelado', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useStore.getState().setPrefs({ cps: 40, reducedMotion: 'auto' });
  });

  it('con cps 0 el texto aparece entero y las opciones también', () => {
    useStore.getState().setPrefs({ cps: 0 });
    montarEscena(minimal, { log: [escenaLog(['Un texto que aparece entero de una.'])] });
    render(<EscenaScreen />);

    expect(screen.getByText('Un texto que aparece entero de una.')).toBeInTheDocument();
    expect(screen.getByTestId('opcion-descansar')).toBeInTheDocument();
  });

  it('mientras se revela no hay opciones, y aparecen al terminar', () => {
    montarEscena(minimal, { log: [escenaLog(['Un texto largo que tarda en aparecer del todo, letra por letra.'])] });
    render(<EscenaScreen />);

    // Recién montado, con temporizadores falsos sin avanzar: nada de la opción está.
    expect(screen.queryByTestId('opcion-descansar')).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(10_000); });

    expect(screen.getByTestId('opcion-descansar')).toBeInTheDocument();
  });

  it('un clic en la columna completa el párrafo en curso', () => {
    montarEscena(minimal, {
      log: [escenaLog(['Primero.', 'Segundo, bastante más largo, para notar que no se reveló solo.'])],
    });
    render(<EscenaScreen />);

    // Antes del clic: con temporizadores falsos sin avanzar, el párrafo en curso no se ve.
    expect(screen.queryByText('Primero.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('columna-texto'));

    expect(screen.getByText('Primero.')).toBeInTheDocument();
    expect(screen.queryByText('Segundo, bastante más largo, para notar que no se reveló solo.')).not.toBeInTheDocument();
  });

  it('Enter y Espacio hacen lo mismo que el clic', () => {
    function completaConLaTecla(key: string): void {
      montarEscena(minimal, { log: [escenaLog(['Un párrafo para completar con el teclado.'])] });
      render(<EscenaScreen />);

      expect(screen.queryByText('Un párrafo para completar con el teclado.')).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key });
      expect(screen.getByText('Un párrafo para completar con el teclado.')).toBeInTheDocument();

      cleanup();
    }

    completaConLaTecla('Enter');
    completaConLaTecla(' ');
  });

  it('con movimiento reducido no hay revelado', () => {
    useStore.getState().setPrefs({ reducedMotion: 'on' });
    montarEscena(minimal, { log: [escenaLog(['Todo de una porque hay movimiento reducido.'])] });
    render(<EscenaScreen />);

    expect(screen.getByText('Todo de una porque hay movimiento reducido.')).toBeInTheDocument();
    expect(screen.getByTestId('opcion-descansar')).toBeInTheDocument();
  });

  it('mientras el texto se revela, el teclado 1-9 de las opciones no hace nada (la lista ni se montó)', () => {
    montarEscena(minimal, { log: [escenaLog(['Un texto largo que todavía no terminó de aparecer del todo.'])] });
    render(<EscenaScreen />);

    expect(screen.queryByTestId('opcion-descansar')).not.toBeInTheDocument();

    // Si el listener de OptionList estuviera montado, esto elegiría la primera opción
    // habilitada a ciegas. Como la lista todavía no se dibujó, no debería pasar nada.
    fireEvent.keyDown(window, { key: '1' });

    expect(screen.queryByTestId('opcion-descansar')).not.toBeInTheDocument();
    expect(useStore.getState().characters[0]?.run?.sceneId).toBe(minimal.start);
  });
});
