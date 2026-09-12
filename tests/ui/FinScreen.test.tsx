/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FinScreen } from '@/ui/screens/FinScreen';
import { useStore } from '@/state/store';
import { campaign } from '@/content/campaigns/prueba/campaign';
import * as engine from '@/engine/resolve';
import type { Character, GameState, Run } from '@/engine/types';

/**
 * `render()` del motor (tarea 9/10) devuelve el epílogo de un final DOS veces:
 * una dentro de `paragraphs` (porque `enter()` concatena `ending.epilogue` al
 * texto de la escena antes de guardarlo en el log) y otra en `ending.epilogue`
 * suelto. FinScreen tiene que mostrar una sola fuente. Este test reproduce un
 * final real de la campaña de prueba (`p_fin_huida`) y verifica que el texto
 * del epílogo aparece una sola vez en la pantalla de fin.
 */
function personajeDePrueba(): Character {
  return {
    id: 'personaje-de-prueba',
    name: 'Prueba',
    portrait: 'mago_01',
    classId: 'mago',
    attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
    traits: ['aprendiz_de_escriba'],
    skills: [],
    level: 3,
    xp: 120,
    flags: [],
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
  };
}

function runDePrueba(): Run {
  return {
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    sceneId: campaign.start,
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: 3,
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: 1,
  };
}

describe('FinScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('no repite el epílogo del final aunque el motor lo traiga tanto en paragraphs como en ending.epilogue', () => {
    const character = personajeDePrueba();
    const entrada: GameState = {
      world: { flags: [], fallen: [] },
      character,
      run: runDePrueba(),
      seen: {},
    };

    // Estado real de haber llegado al final "Con vida" (p_fin_huida, sin heridas):
    // `enter()` deja en el log el texto de la escena + el epílogo, una sola vez.
    const final = engine.enter(campaign, entrada, 'p_fin_huida');
    expect(final.run.outcome).toEqual({ kind: 'ending', endingId: 'fin_huida' });

    useStore.setState({
      characters: [{ ...character, run: final.run }],
      activeCharacterId: character.id,
      world: final.world,
      seen: {},
      prefs: { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
      ui: { screen: 'fin', campaign, pending: null, error: null, endSummary: null },
    });

    render(<FinScreen />);

    expect(screen.getByText(campaign.endings['fin_huida']?.title ?? '')).toBeInTheDocument();

    // Frase exclusiva de la variante de epílogo sin heridas: si apareciera dos
    // veces (una por `paragraphs`, otra por `ending.epilogue`), este assert falla.
    const frase = 'Llegás a la aldea con las primeras luces, entero y con las manos vacías. Habrá otra noche.';
    expect(screen.getAllByText(frase)).toHaveLength(1);

    // Sanity check adicional: contando todo el texto de la pantalla, la frase
    // aparece exactamente una vez (no dos fragmentos idénticos en el DOM).
    const ocurrencias = (screen.getByText(frase).closest('div')?.textContent ?? '').split(frase).length - 1;
    expect(ocurrencias).toBe(1);
  });
});
