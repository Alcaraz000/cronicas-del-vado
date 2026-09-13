/** @vitest-environment jsdom */
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FinScreen } from '@/ui/screens/FinScreen';
import { useStore } from '@/state/store';
import { campaign } from '@/content/campaigns/prueba/campaign';
import { CLASSES, SKILLS } from '@/content/catalog';
import * as engine from '@/engine/resolve';
import { S } from '@/ui/strings.es';
import type { Campaign } from '@/content/schema';
import type { Character, EndSummary, GameState, Run } from '@/engine/types';
import type { ResumenXp } from '@/engine/progression';

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

/** ResumenXp mínimo y válido: a estos tests no les importan los números, solo el resto del EndSummary. */
function xpDePrueba(): ResumenXp {
  return {
    ganancia: { hitos: 0, finales: 0, bono: 0, total: 0, detalle: [] },
    otorgada: 0,
    descartada: 0,
    xpAntes: 0,
    xpDespues: 0,
    nivelAntes: 1,
    nivelDespues: 1,
    premios: [],
    topeNivel: 6,
    topeXp: 300,
    topeAlcanzado: false,
  };
}

/**
 * Monta el store como queda DESPUÉS de que `finishRun` ya corrió (tarea 11: cuando FinScreen se
 * dibuja el final recién conseguido ya está en `character.campaignLog[campaña].endings`, así que
 * acá se arma directamente ese estado "ya cerrado" en vez de simularlo con `engine.endRun`).
 * `endingsVistos` son los finales que el personaje ya tiene registrados para esa campaña.
 */
function montarFinCerrado(opts: { campaign?: Campaign; endSummary: EndSummary; endingsVistos?: string[] }): void {
  const personaje = personajeDePrueba();
  const camp = opts.campaign ?? campaign;
  useStore.setState({
    characters: [
      {
        ...personaje,
        campaignLog: { [camp.id]: { runs: 1, wins: 0, endings: opts.endingsVistos ?? [], milestones: [] } },
      },
    ],
    activeCharacterId: personaje.id,
    world: { flags: [], fallen: [] },
    seen: {},
    prefs: { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
    ui: {
      screen: 'fin',
      campaign: camp,
      pending: null,
      error: null,
      endSummary: opts.endSummary,
      ganancia: null,
      subidaPendiente: null,
    },
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

    // El título aparece como mínimo una vez (como encabezado); desde la tarea 11 también
    // aparece en el mapa de finales, porque es el que acabás de conseguir.
    expect(screen.getAllByText(campaign.endings['fin_huida']?.title ?? '').length).toBeGreaterThan(0);

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

  /**
   * Tarea 6 (Fase H): `ScreenRouter` desmonta la pantalla anterior entera, así que el control
   * que tenía el foco al llegar acá ya no existe y el foco cae a `<body>`, invisible. El
   * título recibe el foco por programa apenas se monta (ver `useEnfocarAlEntrar`).
   */
  it('lleva el foco al título del desenlace apenas se monta, para no dejarlo perdido en <body>', () => {
    const estado = estadoEn('p_umbral', 2);
    const pendiente = engine.beginRoll(campaign, estado, 'forzar_puerta');
    const final = engine.commitRoll(campaign, estado, { ...pendiente, band: 'failure' as const });
    montarFinCon(final);

    render(<FinScreen />);

    const titulo = screen.getByRole('heading', { level: 1, name: S.fin.derrota });
    expect(titulo).toHaveFocus();
  });

  it('cierra la partida una sola vez aunque StrictMode invoque el efecto dos veces', () => {
    // En desarrollo la app corre bajo StrictMode (src/main.tsx) y React invoca los efectos
    // dos veces al montar. Si `finishRun` no fuera idempotente, la XP se cobraría doble y la
    // partida quedaría registrada dos veces en el campaignLog.
    const character = personajeDePrueba();
    const final = engine.enter(
      campaign,
      { world: { flags: [], fallen: [] }, character, run: runDePrueba(), seen: {} },
      'p_fin_huida',
    );
    montarFinCon(final);

    render(
      <StrictMode>
        <FinScreen />
      </StrictMode>,
    );

    const s = useStore.getState();
    // 30 del final nuevo + 40 del bono de primera victoria (nivel 3 en una campaña [3, 5]).
    expect(s.characters[0]?.xp).toBe(190);
    expect(s.characters[0]?.campaignLog.prueba).toMatchObject({ runs: 1, wins: 1 });
    expect(s.ui.subidaPendiente).toEqual({ desde: 3, hasta: 4, premios: [{ kind: 'atributo' }] });
  });

  it('una muerte vuelve al inicio, no al hub', () => {
    const estado = estadoEn('p_cripta', 2);
    const pendiente = engine.beginRoll(campaign, estado, 'cruzar');
    const final = engine.commitRoll(campaign, estado, { ...pendiente, band: 'failure' as const });
    expect(final.run.outcome).toEqual({ kind: 'death' });

    montarFinCon(final);
    render(<FinScreen />);

    const volver = screen.getByTestId('volver-del-fin');
    expect(volver).toHaveTextContent(S.fin.volverAlInicio);
    fireEvent.click(volver);
    expect(useStore.getState().ui.screen).toBe('inicio');
  });
});

describe('FinScreen: lo que el mundo recordará y los finales', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('lista lo que el mundo recordará, con la línea de memories de cada flag de canon', () => {
    montarFinCerrado({
      endSummary: {
        outcome: { kind: 'ending', endingId: 'fin_huida' },
        canonFlags: ['char:prueba.vio_la_cripta'],
        discardedFlags: [],
        xp: xpDePrueba(),
      },
      endingsVistos: ['fin_huida'],
    });

    render(<FinScreen />);

    expect(screen.getByText(S.fin.recuerda)).toBeInTheDocument();
    expect(screen.getByText(campaign.memories['char:prueba.vio_la_cripta'] ?? '')).toBeInTheDocument();
  });

  it('no muestra los flags descartados', () => {
    // endSummary.discardedFlags no aparece: se perdieron, no son canon. El flag descartado
    // SÍ tiene línea en `memories` (le agregamos una) para probar que lo que lo excluye es
    // estar en `discardedFlags`, y no que le falte la línea.
    const campConDescartado: Campaign = {
      ...campaign,
      memories: { ...campaign.memories, 'char:prueba.descartado': 'Esto no debería verse nunca.' },
    };
    montarFinCerrado({
      campaign: campConDescartado,
      endSummary: {
        outcome: { kind: 'ending', endingId: 'fin_huida' },
        canonFlags: ['char:prueba.vio_la_cripta'],
        discardedFlags: ['char:prueba.descartado'],
        xp: xpDePrueba(),
      },
      endingsVistos: ['fin_huida'],
    });

    render(<FinScreen />);

    expect(screen.getByText(campaign.memories['char:prueba.vio_la_cripta'] ?? '')).toBeInTheDocument();
    expect(screen.queryByText('Esto no debería verse nunca.')).toBeNull();
  });

  it('un flag de canon sin línea se omite, y no se ve ningún identificador', () => {
    montarFinCerrado({
      endSummary: {
        outcome: { kind: 'ending', endingId: 'fin_huida' },
        canonFlags: ['char:prueba.vio_la_cripta', 'char:prueba.sin_linea'],
        discardedFlags: [],
        xp: xpDePrueba(),
      },
      endingsVistos: ['fin_huida'],
    });

    render(<FinScreen />);

    expect(screen.getByText(campaign.memories['char:prueba.vio_la_cripta'] ?? '')).toBeInTheDocument();
    expect(screen.queryByText(/sin_linea/)).toBeNull();
    expect(document.body.textContent).not.toContain('char:prueba.sin_linea');
  });

  it('muestra los finales vistos y los no vistos en silueta', () => {
    const campConCuatroFinales: Campaign = {
      ...campaign,
      endings: {
        ...campaign.endings,
        fin_c: { title: 'El pacto con la torre' },
        fin_d: { title: 'La verdad del vado', hidden: true },
      },
    };
    montarFinCerrado({
      campaign: campConCuatroFinales,
      endSummary: {
        outcome: { kind: 'ending', endingId: 'fin_huida' },
        canonFlags: [],
        discardedFlags: [],
        xp: xpDePrueba(),
      },
      endingsVistos: ['fin_tesoro', 'fin_huida'],
    });

    render(<FinScreen />);

    // El título del final visto se lee...
    expect(screen.getByText('El tesoro de la torre')).toBeInTheDocument();
    expect(screen.getByText('Con vida')).toBeInTheDocument();

    // ...el del no visto NO se lee, en NINGUNA parte del documento: ni el normal, ni el hidden.
    expect(screen.queryByText('El pacto con la torre')).toBeNull();
    expect(screen.queryByText('La verdad del vado')).toBeNull();
    expect(document.body.textContent).not.toContain('El pacto con la torre');
    expect(document.body.textContent).not.toContain('La verdad del vado');

    // ...pero se ve que existen, en silueta (dos finales sin descubrir), y la cuenta dice "2 de 4".
    expect(screen.getAllByText(S.fin.finalOculto)).toHaveLength(2);
    expect(screen.getByText(S.hub.campana.finales(2, 4))).toBeInTheDocument();

    // Y esa silueta dice algo: un lector de pantalla leería cuatro viñetas si no.
    const ocultos = screen.getAllByLabelText(S.fin.finalOcultoEtiqueta);
    expect(ocultos).toHaveLength(2);
    // El final que sí viste no lleva la etiqueta: lo que se anuncia es su título.
    expect(screen.getByText('El tesoro de la torre')).not.toHaveAttribute('aria-label');
  });

  it('una derrota no lista canon, porque no escribió ninguno', () => {
    montarFinCerrado({
      endSummary: {
        outcome: { kind: 'defeat' },
        canonFlags: [],
        discardedFlags: ['char:prueba.vio_la_cripta'],
        xp: xpDePrueba(),
      },
    });

    render(<FinScreen />);

    expect(screen.queryByText(S.fin.recuerda)).toBeNull();
  });
});

describe('FinScreen: la elección de la habilidad respeta la regla de identidad', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  /** Partida ya cerrada, con un premio de habilidad esperando al jugador. */
  function montarConPremioDeHabilidad(): void {
    const personaje = personajeDePrueba();
    useStore.setState({
      characters: [{ ...personaje, level: 5, xp: 240, skills: ['erudito_de_runas'] }],
      activeCharacterId: personaje.id,
      world: { flags: [], fallen: [] },
      seen: {},
      prefs: { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
      ui: {
        screen: 'fin',
        campaign,
        pending: null,
        error: null,
        endSummary: {
          outcome: { kind: 'ending', endingId: 'fin_huida' },
          canonFlags: [],
          discardedFlags: [],
          xp: {
            ganancia: { hitos: 10, finales: 30, bono: 0, total: 40, detalle: ['1 hito nuevo: +10', 'Final nuevo: +30'] },
            otorgada: 40,
            descartada: 0,
            xpAntes: 200,
            xpDespues: 240,
            nivelAntes: 4,
            nivelDespues: 5,
            premios: [{ kind: 'habilidad' }, { kind: 'fortuna' }],
            topeNivel: 6,
            topeXp: 300,
            topeAlcanzado: false,
          },
        },
        ganancia: { hitos: 10, finales: 30, bono: 0, total: 40, detalle: ['1 hito nuevo: +10', 'Final nuevo: +30'] },
        subidaPendiente: { desde: 4, hasta: 5, premios: [{ kind: 'habilidad' }, { kind: 'fortuna' }] },
      },
    });
  }

  it('muestra la habilidad prohibida deshabilitada y con el motivo, y aplica la que sí se puede', () => {
    montarConPremioDeHabilidad();
    render(<FinScreen />);

    // Veterano es `fisico`, la Debilidad del Mago: se ve, no se puede elegir, y dice por qué.
    const veterano = screen.getByTestId('premio-habilidad-veterano');
    expect(veterano).toBeVisible();
    expect(veterano).toBeDisabled();
    expect(
      screen.getByText(S.fin.motivoDebilidad(S.tags[SKILLS.veterano.tag], CLASSES.mago.name)),
    ).toBeInTheDocument();

    // La que ya tiene tampoco se puede elegir dos veces.
    expect(screen.getByTestId('premio-habilidad-erudito_de_runas')).toBeDisabled();
    expect(screen.getByText(S.fin.motivoRepetida)).toBeInTheDocument();

    // El premio automático del nivel 5 se informa, no se elige.
    expect(screen.getByText(S.fin.premioFortuna)).toBeInTheDocument();

    // Y no se sale de la pantalla hasta gastarlo.
    expect(screen.getByTestId('volver-del-fin')).toBeDisabled();

    fireEvent.click(screen.getByTestId('premio-habilidad-vista_arcana'));

    expect(useStore.getState().characters[0]?.skills).toEqual(['erudito_de_runas', 'vista_arcana']);
    expect(screen.getByTestId('volver-del-fin')).toBeEnabled();
  });
});
