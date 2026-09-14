/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '@/app/App';
import { useStore } from '@/state/store';
import { selectGameState, writeGameState } from '@/state/selectors';
import { campaign } from '@/content/campaigns/prueba/campaign';
import { meta as vadoMeta } from '@/content/campaigns/vado/meta';
import { ATTR_NAMES, CLASSES, TRAITS } from '@/content/catalog';
import * as engine from '@/engine/resolve';
import type { Scene } from '@/content/schema';
import { S } from '@/ui/strings.es';

function escena(id: string): Scene {
  const s = campaign.scenes[id];
  if (s === undefined) throw new Error(`La campaña de prueba no tiene la escena ${id}`);
  return s;
}

/**
 * Devuelve un texto de la escena que se renderiza sí o sí en la primera visita:
 * el primer párrafo de narrador simple (string) o, si no hay, el primer Paragraph
 * con una sola variante sin `when`.
 */
function textoSeguro(scene: Scene): string {
  for (const p of scene.text) {
    if (typeof p === 'string') return p;
  }
  for (const p of scene.text) {
    if (typeof p === 'string' || p.variants.length !== 1) continue;
    const unica = p.variants[0];
    if (unica !== undefined && unica.when === undefined) return unica.text;
  }
  throw new Error(`La escena ${scene.id} no tiene un párrafo sin variantes; ajustá textoSeguro`);
}

/** Texto de la variante "otra vez" (la que depende de `visited`) de una escena. */
function varianteDeVisita(scene: Scene): string {
  for (const p of scene.text) {
    if (typeof p === 'string') continue;
    for (const v of p.variants) {
      if (v.when !== undefined && 'visited' in v.when) return v.text;
    }
  }
  throw new Error(`La escena ${scene.id} no tiene una variante con visited`);
}

function reiniciarStore(): void {
  localStorage.clear();
  useStore.setState({
    characters: [],
    activeCharacterId: null,
    world: { flags: [], fallen: [] },
    seen: {},
    // cps: 0 (instantáneo): este archivo prueba el FLUJO del juego, no el ritmo del
    // revelado (tarea 9) — con cps > 0 y temporizadores reales, esperar a que cada escena
    // termine de tipearse letra por letra antes de que aparezcan las opciones haría estos
    // tests lentos y, con textos largos, directamente los haría fallar por timeout.
    prefs: { cps: 0, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
    ui: { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null, ganancia: null, subidaPendiente: null },
  });
}

/**
 * Deja al personaje de prueba dentro de la campaña de humo, en la primera escena.
 * La campaña `prueba` está oculta y ya no se ofrece desde ninguna pantalla (es contenido
 * de humo): los tests que miran la pantalla de escena entran por el store, que es el
 * mismo camino que recorre el hub.
 */
async function entrarEnLaTorre(): Promise<void> {
  await act(async () => {
    useStore.getState().createTestCharacter();
    await useStore.getState().startRun('prueba');
  });
}

describe('flujo de la rebanada vertical', () => {
  beforeEach(() => {
    reiniciarStore();
  });

  afterEach(() => {
    cleanup();
  });

  it('primera escena sin "otra vez" → opción sin tirada → nueva escena en el log', async () => {
    await entrarEnLaTorre();
    render(<App />);

    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral));
    expect(useStore.getState().ui.screen).toBe('escena');
    expect(screen.queryByText(varianteDeVisita(umbral))).toBeNull();

    const rodear = umbral.choices.find((c) => c.id === 'rodear_patio');
    if (rodear === undefined) throw new Error('p_umbral no tiene la opción rodear_patio');
    const boton = screen.getByTestId('opcion-rodear_patio');
    expect(boton).toBeEnabled();
    expect(boton).toHaveTextContent(rodear.label);

    fireEvent.click(boton);

    const patio = escena('p_patio');
    await screen.findByText(textoSeguro(patio));

    // La caja muestra la escena nueva y NADA más: desde la tarea 3 la elección y la escena
    // anterior no se apilan en pantalla, se leen en el cajón del historial. Las dos mitades se
    // verifican acá porque el log sigue siendo el mismo log: cambió dónde se dibuja.
    expect(screen.queryByText(`› ${rodear.label}`)).toBeNull();
    expect(screen.queryByText(textoSeguro(umbral))).toBeNull();

    fireEvent.keyDown(window, { key: 'h' });
    const historial = within(screen.getByTestId('historial'));
    expect(historial.getByText(`› ${rodear.label}`)).toBeInTheDocument();
    expect(historial.getByText(textoSeguro(umbral))).toBeInTheDocument();
    expect(historial.getByText(textoSeguro(patio))).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    const gs = selectGameState(useStore.getState());
    expect(gs?.run.sceneId).toBe('p_patio');
    expect(gs?.run.visited['p_umbral']).toBe(1);
    expect(useStore.getState().ui.screen).toBe('escena');
  });

  it('una opción con tirada muestra el panel, persiste run.pending y Continuar consolida', async () => {
    await entrarEnLaTorre();
    render(<App />);
    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral));

    fireEvent.click(screen.getByTestId('opcion-leer_inscripcion'));

    const continuar = await screen.findByRole('button', { name: S.tirada.continuar });
    expect(screen.getByTestId('total')).toBeInTheDocument();
    expect(screen.queryByTestId('opcion-leer_inscripcion')).toBeNull();

    // Mientras hay una tirada pendiente, la UI no ofrece "Abandonar": el store
    // no limpia run.pending al abandonar, así que la salida se bloquea acá.
    expect(screen.getByRole('button', { name: S.barra.abandonar })).toBeDisabled();

    const antes = selectGameState(useStore.getState());
    expect(antes?.run.pending).toEqual({ choiceId: 'leer_inscripcion', rerolls: [], powerUsed: false });
    expect(useStore.getState().ui.pending?.choiceId).toBe('leer_inscripcion');

    fireEvent.click(continuar);

    const biblioteca = escena('p_biblioteca');
    await screen.findByText(textoSeguro(biblioteca));
    const despues = selectGameState(useStore.getState());
    expect(despues?.run.pending).toBeUndefined();
    expect(despues?.run.sceneId).toBe('p_biblioteca');
    expect(despues?.run.log.some((e) => e.kind === 'roll')).toBe(true);
    expect(useStore.getState().ui.pending).toBeNull();

    // Ya sin tirada pendiente, "Abandonar" vuelve a estar disponible.
    expect(screen.getByRole('button', { name: S.barra.abandonar })).toBeEnabled();
  });

  it('con un guardado sin seen[campaignId], la escena se renderiza sin bucle de renders', async () => {
    await entrarEnLaTorre();
    render(<App />);
    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral));

    // Simula un guardado viejo o un fixture que nunca escribió `seen` para la campaña.
    act(() => {
      useStore.setState({ seen: {} });
    });

    // Si selectGameState devolviera un `{}` nuevo por llamada, useShallow vería un
    // cambio en cada render y React lanzaría "Maximum update depth exceeded".
    await screen.findByText(textoSeguro(umbral));
    expect(selectGameState(useStore.getState())?.seen).toEqual({});
    expect(useStore.getState().ui.screen).toBe('escena');
  });
});

describe('navegación entre pantallas', () => {
  beforeEach(() => {
    reiniciarStore();
  });

  afterEach(() => {
    cleanup();
  });

  it('sin personaje, el inicio lleva a la creación; con personaje, al hub', async () => {
    render(<App />);
    expect(screen.getByText(S.titulo)).toBeInTheDocument();
    expect(screen.getByText(S.inicio.sinPersonaje)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: S.inicio.continuar })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: S.inicio.crearPersonaje }));
    expect(useStore.getState().ui.screen).toBe('creacion');
    expect(screen.getByText(S.creacion.titulos[1])).toBeInTheDocument();

    // Volver desde el paso 1 sin personajes devuelve al inicio.
    fireEvent.click(screen.getByTestId('volver'));
    expect(useStore.getState().ui.screen).toBe('inicio');

    act(() => {
      useStore.getState().createTestCharacter();
    });
    fireEvent.click(screen.getByRole('button', { name: S.inicio.campanas }));
    expect(useStore.getState().ui.screen).toBe('hub');
    await screen.findByText(S.hub.titulo);
  });

  it('el hub vuelve al inicio y el inicio abre y cierra las Opciones', async () => {
    act(() => {
      useStore.getState().createTestCharacter();
    });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: S.inicio.opciones }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveAccessibleName(S.ajustes.titulo);

    fireEvent.click(screen.getByTestId('cerrar-opciones'));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: S.inicio.campanas }));
    await screen.findByText(S.hub.titulo);
    fireEvent.click(screen.getByRole('button', { name: S.hub.volver }));
    expect(useStore.getState().ui.screen).toBe('inicio');
  });
});

describe('la Fase C desbloquea el contenido por clase y por origen', () => {
  beforeEach(() => {
    reiniciarStore();
  });

  afterEach(() => {
    cleanup();
  });

  it('un explorador creado a mano ve en la primera escena de Aldamar una opción de su origen', async () => {
    render(<App />);

    // 1. Inicio → creación.
    fireEvent.click(screen.getByRole('button', { name: S.inicio.crearPersonaje }));

    // 2. Los cuatro pasos: clase, retrato y nombre, dos rasgos, resumen.
    fireEvent.click(screen.getByTestId('clase-explorador'));
    fireEvent.click(screen.getByTestId('siguiente'));

    fireEvent.change(screen.getByLabelText(S.creacion.nombreEtiqueta), { target: { value: 'Bruna' } });
    fireEvent.click(screen.getByTestId('siguiente'));

    // `hijo_de_molinero` es `social`, la Debilidad del Explorador: la pantalla lo bloquea con motivo.
    expect(screen.getByTestId('rasgo-hijo_de_molinero')).toBeDisabled();
    fireEvent.click(screen.getByTestId('rasgo-hijo_de_la_frontera'));
    fireEvent.click(screen.getByTestId('rasgo-cazador_furtivo'));
    fireEvent.click(screen.getByTestId('siguiente'));

    fireEvent.click(screen.getByTestId('crear'));

    // 3. El hub, con la dificultad relativa de Aldamar para un personaje de nivel 1.
    await screen.findByText(S.hub.titulo);
    const activo = useStore.getState().characters.at(-1);
    expect(activo?.classId).toBe('explorador');
    expect(activo?.level).toBe(1);
    expect(activo?.traits).toEqual(['hijo_de_la_frontera', 'cazador_furtivo']);

    const etiqueta = await screen.findByTestId(`etiqueta-${vadoMeta.id}`);
    expect(etiqueta).toHaveTextContent(S.hub.etiqueta.pareja);

    // 4. A jugar "El vado de Aldamar".
    fireEvent.click(screen.getByTestId(`jugar-${vadoMeta.id}`));

    // 5. En la primera escena hay una opción exclusiva de su rasgo de origen, habilitada
    //    y marcada con el nombre del rasgo. Con el mago de prueba no existía.
    const opcion = await screen.findByTestId('opcion-leer_el_cielo', undefined, { timeout: 10000 });
    expect(opcion).toBeEnabled();
    expect(opcion).toHaveTextContent(`[${TRAITS.hijo_de_la_frontera.name}]`);
    expect(useStore.getState().ui.screen).toBe('escena');
    expect(selectGameState(useStore.getState())?.run.campaignId).toBe(vadoMeta.id);
  }, 20000);
});

describe('fin de partida: XP, subida de nivel y vuelta al hub', () => {
  beforeEach(() => {
    reiniciarStore();
  });

  afterEach(() => {
    cleanup();
  });

  it('terminar una partida da XP, sube de nivel y guarda el premio que elige el jugador', async () => {
    await entrarEnLaTorre();

    // El motor entra en el final de verdad: la partida queda con outcome y la pantalla de fin
    // es la que llama a finishRun.
    const st = useStore.getState();
    const gs = selectGameState(st);
    const campana = st.ui.campaign;
    if (gs === null || campana === null) throw new Error('La partida de prueba no arrancó');
    const final = engine.enter(campana, gs, 'p_fin_huida');
    expect(final.run.outcome).toEqual({ kind: 'ending', endingId: 'fin_huida' });
    act(() => {
      useStore.setState((s) => ({ ...writeGameState(s, final), ui: { ...s.ui, screen: 'fin' } }));
    });

    render(<App />);

    // 10 del hito de p_umbral + 30 del final nuevo + 40 del bono de primera victoria (Pareja).
    await screen.findByText(S.fin.xpGanada(80));
    expect(screen.getByText(S.fin.subiste(3, 4))).toBeInTheDocument();

    const despuesDeCerrar = useStore.getState();
    expect(despuesDeCerrar.characters[0]?.run).toBeNull();
    expect(despuesDeCerrar.characters[0]?.level).toBe(4);
    expect(despuesDeCerrar.ui.subidaPendiente).toEqual({ desde: 3, hasta: 4, premios: [{ kind: 'atributo' }] });

    // Con el premio sin gastar no se sale de la pantalla, y la pantalla dice por qué.
    const volver = screen.getByTestId('volver-del-fin');
    expect(volver).toBeDisabled();
    expect(screen.getByText(S.fin.faltaElegirPremio)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('premio-atributo-saber'));

    const personaje = useStore.getState().characters[0];
    expect(personaje?.attrs.saber).toBe(3);
    expect(personaje?.xp).toBe(200);
    expect(useStore.getState().ui.subidaPendiente).toBeNull();

    // Y queda guardado en localStorage, que es lo que sobrevive a la recarga.
    const guardado = localStorage.getItem('juegorol') ?? '';
    expect(JSON.parse(guardado).state.characters[0].attrs.saber).toBe(3);

    expect(screen.getByTestId('volver-del-fin')).toBeEnabled();
    fireEvent.click(screen.getByTestId('volver-del-fin'));
    expect(useStore.getState().ui.screen).toBe('hub');
    await screen.findByText(S.hub.titulo);
    expect(screen.getByText(S.hub.personaje.ficha('Prueba', CLASSES.mago.name, 4))).toBeInTheDocument();
    expect(screen.getByText(S.hub.personaje.atributo(ATTR_NAMES.saber, 3))).toBeInTheDocument();
  }, 20000);
});
