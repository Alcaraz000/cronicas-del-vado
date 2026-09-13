/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '@/app/App';
import { useStore } from '@/state/store';
import { selectGameState } from '@/state/selectors';
import { S } from '@/ui/strings.es';

/**
 * Tarea 6 (Fase H): el recorrido corto de la app con teclado, sobre el store real.
 *
 * jsdom implementa el foco pero no el ciclo nativo de activación de un `<button>` por Enter o
 * Espacio (ver el comentario de cabecera de `esControlActivable` en `teclado.ts`): eso es
 * responsabilidad exclusiva del navegador, no del código de la app, y ningún `keyDown`
 * sintético en jsdom lo dispara. Por eso este test no usa `fireEvent.click` ni una vez: donde
 * el jugador apretaría Enter sobre un botón nativo (crear personaje, elegir clase, elegir
 * campaña) el test avanza con la MISMA acción del store que ese botón llama — igual que
 * documenta `useEnfocarAlEntrar` para la navegación entre pantallas — y reserva el `keyDown`
 * de verdad para lo que el código de la app SÍ controla: los atajos de teclado propios de la
 * pantalla de juego (1-9, C, Esc), que están probados en detalle en `EscenaScreen.test.tsx`.
 * Acá alcanza con probar que, en el recorrido real, uno de esos atajos efectivamente entra a
 * una escena nueva.
 */
describe('recorrido con teclado: inicio → creación → hub → escena', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      characters: [],
      activeCharacterId: null,
      world: { flags: [], fallen: [] },
      seen: {},
      prefs: { cps: 0, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
      ui: { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null, ganancia: null, subidaPendiente: null },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('crea personaje, elige campaña y entra a la escena eligiendo una opción con la tecla 3', async () => {
    render(<App />);

    // 1. Arranca en el inicio, con foco en el título (tarea 6: useEnfocarAlEntrar).
    const tituloInicio = screen.getByRole('heading', { level: 1, name: S.titulo });
    expect(tituloInicio).toHaveFocus();
    expect(screen.getByText(S.inicio.sinPersonaje)).toBeInTheDocument();

    // 2. Crear personaje: el store, no un clic (la creación en sí no tiene atajo de teclado
    // propio, son botones nativos; ver el comentario de cabecera de este archivo).
    act(() => {
      useStore.getState().createTestCharacter();
      useStore.getState().goTo('hub');
    });
    await screen.findByText(S.hub.titulo);
    const tituloHub = screen.getByRole('heading', { level: 1, name: S.hub.titulo });
    expect(tituloHub).toHaveFocus();

    // 3. Elegir campaña y arrancar la partida (de nuevo, el store: no hay atajo para "Jugar").
    await act(async () => {
      await useStore.getState().startRun('prueba');
    });

    // 4. Ya en la escena: "Rodear por el patio" es la tercera opción visible de `p_umbral`
    // (sin tirada, para no depender del panel de dados) y la tecla 3 la elige de verdad, con
    // el mismo listener de `window` que usa un jugador real.
    const opcion = await screen.findByTestId('opcion-rodear_patio');
    expect(opcion).toBeEnabled();
    expect(useStore.getState().ui.screen).toBe('escena');

    fireEvent.keyDown(window, { key: '3' });

    await screen.findByText('› Rodear por el patio');
    expect(selectGameState(useStore.getState())?.run.sceneId).toBe('p_patio');
    expect(useStore.getState().ui.screen).toBe('escena');
  });
});
