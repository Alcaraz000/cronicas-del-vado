/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Campaign } from '@/content/schema';
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
  milestones: {},
  clocks: {},
  endings: {},
};

function montarEscena(campaign: Campaign): void {
  const run = makeRun({ campaignId: campaign.id, contentVersion: campaign.contentVersion, sceneId: campaign.start });
  const character = makeCharacter({ run });
  useStore.setState((s) => ({
    characters: [character],
    activeCharacterId: character.id,
    world: { flags: [], fallen: [] },
    seen: {},
    ui: { ...s.ui, screen: 'escena', campaign, pending: null },
  }));
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
