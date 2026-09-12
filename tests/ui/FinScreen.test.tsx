/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FinScreen } from '@/ui/screens/FinScreen';
import { useStore } from '@/state/store';
import { campaign } from '@/content/campaigns/prueba/campaign';
import * as engine from '@/engine/resolve';
import { S } from '@/ui/strings.es';
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

/** Estado de partida real parado en `sceneId` con `wounds` Heridas. */
function estadoEn(sceneId: string, wounds: 0 | 1 | 2 | 3): GameState {
  return {
    world: { flags: [], fallen: [] },
    character: personajeDePrueba(),
    run: { ...runDePrueba(), sceneId, wounds },
    seen: {},
  };
}

/**
 * Monta el store con el GameState final (tal como lo devuelve `commitRoll`/`enter`)
 * y la pantalla en 'fin'. `character.run` se rearma igual que `writeGameState`
 * (tarea 13): en `GameState`, `run` vive aparte de `character`.
 */
function montarFinCon(gs: GameState): void {
  useStore.setState({
    characters: [{ ...gs.character, run: gs.run }],
    activeCharacterId: gs.character.id,
    world: gs.world,
    seen: {},
    prefs: { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
    ui: { screen: 'fin', campaign, pending: null, error: null, endSummary: null, ganancia: null, subidaPendiente: null },
  });
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
      ui: { screen: 'fin', campaign, pending: null, error: null, endSummary: null, ganancia: null, subidaPendiente: null },
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

  it('desenlace de muerte: muestra el texto que el motor dejó en el log, no solo el título', () => {
    // Malherido (2 Heridas) en la cripta: un Fallo en "Cruzar el puente corriendo"
    // aplica `{ lethal: true }`, que con 2+ Heridas previas mata de verdad
    // (src/engine/effects.ts, applyLethal). El texto de esa muerte lo escribe
    // el motor como LogEntry 'outcome' al aplicar el desenlace (resolve.ts:481).
    const estado = estadoEn('p_cripta', 2);
    const pendiente = engine.beginRoll(campaign, estado, 'cruzar');
    const forzado = { ...pendiente, band: 'failure' as const };
    const final = engine.commitRoll(campaign, estado, forzado);
    expect(final.run.outcome).toEqual({ kind: 'death' });
    expect(final.run.log.at(-1)).toMatchObject({ kind: 'outcome' });

    montarFinCon(final);
    render(<FinScreen />);

    expect(screen.getByText(S.fin.muerte)).toBeInTheDocument();
    expect(
      screen.getByText(
        'El bloque cede y vos con él. Te agarrás del borde con una mano; la piedra te muerde el pecho al subir. Salís de la cripta a rastras, sin arca y sin aire, y de la torre como podés.',
      ),
    ).toBeInTheDocument();
  });

  it('un párrafo con speaker muestra el nombre del PNJ, no su id', () => {
    // FinScreen reimplementaba el render de párrafos sin el mapa de nombres que usa TextColumn:
    // el primer final con una línea de diálogo iba a imprimir "centinela:" en vez de "El centinela:".
    const base = estadoEn('p_umbral', 0);
    const final: GameState = {
      ...base,
      run: {
        ...base.run,
        outcome: { kind: 'defeat' },
        log: [{ kind: 'outcome', paragraphs: [{ speaker: 'centinela', text: '—Te lo dije, no era para vos.' }] }],
      },
    };

    montarFinCon(final);
    render(<FinScreen />);

    const nombre = campaign.npcs['centinela']?.name ?? '';
    expect(nombre).toBe('El centinela');
    expect(screen.getByText(`${nombre}:`)).toBeInTheDocument();
    expect(screen.queryByText('centinela:')).toBeNull();
    expect(screen.getByText('—Te lo dije, no era para vos.')).toBeInTheDocument();
  });

  it('desenlace de derrota: muestra el texto que el motor dejó en el log, no solo el título', () => {
    // Herido dos veces (2 Heridas) en el umbral: un Fallo en "Forzar a hombros
    // la puerta interior" aplica `{ wound: 1 }` (no `lethal`) y llega a 3
    // Heridas, el tope; `applyEffects` lo marca 'defeat' en general, sin pasar
    // por `applyLethal`. El texto también queda como LogEntry 'outcome'.
    const estado = estadoEn('p_umbral', 2);
    const pendiente = engine.beginRoll(campaign, estado, 'forzar_puerta');
    const forzado = { ...pendiente, band: 'failure' as const };
    const final = engine.commitRoll(campaign, estado, forzado);
    expect(final.run.outcome).toEqual({ kind: 'defeat' });
    expect(final.run.wounds).toBe(3);
    expect(final.run.log.at(-1)).toMatchObject({ kind: 'outcome' });

    montarFinCon(final);
    render(<FinScreen />);

    expect(screen.getByText(S.fin.derrota)).toBeInTheDocument();
    expect(
      screen.getByText(
        'La puerta no se mueve; vos sí. Rebotás contra el marco, te doblás una muñeca y, cuando levantás la vista, hay alguien parado en el arco del patio, mirándote.',
      ),
    ).toBeInTheDocument();
  });
});
