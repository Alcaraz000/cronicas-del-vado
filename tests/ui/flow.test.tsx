/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '@/app/App';
import { useStore } from '@/state/store';
import { selectGameState } from '@/state/selectors';
import { campaign } from '@/content/campaigns/prueba/campaign';
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
    prefs: { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
    ui: { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null },
  });
}

describe('flujo de la rebanada vertical', () => {
  beforeEach(() => {
    reiniciarStore();
  });

  afterEach(() => {
    cleanup();
  });

  it('inicio → nueva partida → escena p_umbral sin "otra vez" → opción sin tirada → nueva escena en el log', async () => {
    render(<App />);
    expect(screen.getByText(S.titulo)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: S.inicio.continuar })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: S.inicio.nuevaPrueba }));

    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral), undefined, { timeout: 5000 });
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
    expect(screen.getByText(`› ${rodear.label}`)).toBeInTheDocument();
    expect(screen.getByText(textoSeguro(umbral))).toBeInTheDocument();

    const gs = selectGameState(useStore.getState());
    expect(gs?.run.sceneId).toBe('p_patio');
    expect(gs?.run.visited['p_umbral']).toBe(1);
    expect(useStore.getState().ui.screen).toBe('escena');
  });

  it('con el personaje activo muerto, "Nueva partida de prueba" juega con uno nuevo', async () => {
    // El muerto no vuelve (spec): endRun marca character.dead pero no cambia activeCharacterId,
    // así que el camino más corto desde 'fin' volvía a poner al muerto en la torre.
    const id = useStore.getState().createTestCharacter();
    useStore.setState({
      characters: useStore.getState().characters.map((c) => ({ ...c, dead: { campaign: 'prueba', scene: 'p_cripta' } })),
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: S.inicio.nuevaPrueba }));

    await screen.findByText(textoSeguro(escena('p_umbral')), undefined, { timeout: 5000 });
    const s = useStore.getState();
    expect(s.ui.screen).toBe('escena');
    expect(s.activeCharacterId).not.toBe(id);
    const activo = s.characters.find((c) => c.id === s.activeCharacterId);
    expect(activo?.dead).toBeUndefined();
    expect(activo?.run?.sceneId).toBe('p_umbral');
    // El muerto queda en la lista, sin partida.
    expect(s.characters.find((c) => c.id === id)?.run).toBeNull();
  });

  it('una opción con tirada muestra el panel, persiste run.pending y Continuar consolida', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: S.inicio.nuevaPrueba }));
    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral), undefined, { timeout: 5000 });

    fireEvent.click(screen.getByTestId('opcion-leer_inscripcion'));

    const continuar = await screen.findByRole('button', { name: S.tirada.continuar });
    expect(screen.getByTestId('total')).toBeInTheDocument();
    expect(screen.queryByTestId('opcion-leer_inscripcion')).toBeNull();

    // Mientras hay una tirada pendiente, la UI no ofrece "Abandonar": el store
    // (tarea 13) no limpia run.pending al abandonar, así que la salida se bloquea acá.
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
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: S.inicio.nuevaPrueba }));
    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral), undefined, { timeout: 5000 });

    // Simula un guardado viejo o un fixture que nunca escribió `seen` para la campaña.
    useStore.setState({ seen: {} });

    // Si selectGameState devolviera un `{}` nuevo por llamada, useShallow vería un
    // cambio en cada render y React lanzaría "Maximum update depth exceeded".
    await screen.findByText(textoSeguro(umbral));
    expect(selectGameState(useStore.getState())?.seen).toEqual({});
    expect(useStore.getState().ui.screen).toBe('escena');
  });
});
