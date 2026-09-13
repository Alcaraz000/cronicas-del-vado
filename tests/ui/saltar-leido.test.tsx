/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { choose, enter } from '@/engine/resolve';
import type { Character, GameState } from '@/engine/types';
import { useStore } from '@/state/store';
import { EscenaScreen } from '@/ui/screens/EscenaScreen';
import { S } from '@/ui/strings.es';
import { crearEstadoMemoria, memoria } from '../fixtures/campaigns/memoria';

/**
 * Los cuatro párrafos de `m_cripta` (tests/fixtures/campaigns/memoria.ts): los tres primeros
 * son textualmente idénticos en cualquier visita, y el tercero (índice 2, "viejo, viejo,
 * NUEVO, viejo") cambia recién a partir de la segunda. Están acá, en un solo lugar, para que
 * los asserts de abajo no repitan la prosa.
 */
const PARRAFO_0 = 'La cripta es un pasillo de losas sueltas sobre un pozo negro. Un fallo acá te puede matar.';
const PARRAFO_1 = 'Del otro lado brilla algo que podría ser oro.';
const PARRAFO_2_SEGUNDA_VISITA =
  'Volviste a bajar: ahora ves una grieta nueva en la piedra, justo donde antes no habías mirado.';
const PARRAFO_3 = 'El silencio pesa más que cualquier respuesta que puedas dar.';

/** Entra a `m_cripta` por primera vez, con el motor real (sin tiradas: rngSeed no importa). */
function primeraVisitaACripta(): GameState {
  return enter(memoria, crearEstadoMemoria(), 'm_cripta');
}

/**
 * Juega la cripta una vez entera y vuelve a bajar, con el motor real: `retroceder` deriva
 * memoria de `m_cripta` (ahí queda `seen['m_cripta']` con los 4 hashes de la primera visita
 * y `visited['m_cripta'] = 1`), entra a `m_sala`, y `bajar` vuelve a entrar a `m_cripta` — la
 * segunda visita, con el párrafo 2 ya en su variante nueva. Ningún hash se arma a mano: son
 * los que produce `enter`/`choose` de verdad.
 */
function segundaVisitaACripta(): GameState {
  let estado = primeraVisitaACripta();
  estado = choose(memoria, estado, 'retroceder'); // sale de la cripta: acá se deriva `seen`.
  estado = choose(memoria, estado, 'bajar'); // vuelve a bajar: segunda visita real.
  return estado;
}

/** Carga un GameState (armado con el motor real) en el store, listo para montar EscenaScreen. */
function montarEnEscena(gs: GameState): void {
  const character: Character = { ...gs.character, run: gs.run };
  useStore.setState((s) => ({
    characters: [character],
    activeCharacterId: character.id,
    world: gs.world,
    seen: { ...s.seen, [gs.run.campaignId]: gs.seen },
    ui: { ...s.ui, screen: 'escena', campaign: memoria, pending: null },
  }));
}

/** La última sección `data-scene="m_cripta"` del log: la entrada que controla `revelado`. */
function seccionActual(): HTMLElement {
  const secciones = document.querySelectorAll<HTMLElement>('[data-scene="m_cripta"]');
  const ultima = secciones[secciones.length - 1];
  if (ultima === undefined) throw new Error('No hay ninguna sección de m_cripta en el log');
  return ultima;
}

describe('saltar lo leído, de punta a punta', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().setPrefs({ cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' });
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useStore.getState().setPrefs({ cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' });
  });

  it('en la segunda visita, saltar leído frena en la variante nueva', () => {
    montarEnEscena(segundaVisitaACripta());
    render(<EscenaScreen />);

    // El botón está visible apenas se entra: el párrafo en curso (índice 0) ya se leyó antes.
    const boton = screen.getByRole('button', { name: S.escena.saltarLeido });
    expect(boton).toHaveAttribute('title', S.escena.saltarLeidoTitulo);

    act(() => { fireEvent.click(boton); });

    const actual = within(seccionActual());

    // Los párrafos repetidos (0 y 1, antes del nuevo) quedan enteros en pantalla.
    expect(actual.getByText(PARRAFO_0)).toBeInTheDocument();
    expect(actual.getByText(PARRAFO_1)).toBeInTheDocument();

    // El párrafo nuevo (índice 2) es justo donde frena: no aparece completo...
    expect(actual.queryByText(PARRAFO_2_SEGUNDA_VISITA)).not.toBeInTheDocument();
    // ...ni tampoco el que viene después (índice 3, viejo pero posterior al nuevo). Si el
    // salto revelara todo en lugar de frenar, este texto ya estaría en pantalla.
    expect(actual.queryByText(PARRAFO_3)).not.toBeInTheDocument();

    // Y no quedó pegado en cero: sigue tipeándose. A 40 cps (25 ms/carácter), 120 ms
    // alcanzan para 4 caracteres del párrafo nuevo — ni uno de más, ni el texto completo.
    act(() => { vi.advanceTimersByTime(120); });
    const prefijo = PARRAFO_2_SEGUNDA_VISITA.slice(0, 4);
    expect(actual.getByText(prefijo)).toBeInTheDocument();
    expect(actual.queryByText(PARRAFO_2_SEGUNDA_VISITA)).not.toBeInTheDocument();
  });

  it('en la primera visita el botón no existe', () => {
    montarEnEscena(primeraVisitaACripta());
    render(<EscenaScreen />);

    expect(screen.queryByRole('button', { name: S.escena.saltarLeido })).not.toBeInTheDocument();
  });

  it('el botón desaparece cuando ya no queda nada leído por saltar', () => {
    montarEnEscena(segundaVisitaACripta());
    render(<EscenaScreen />);

    act(() => { fireEvent.click(screen.getByRole('button', { name: S.escena.saltarLeido })); });

    // El párrafo en curso ahora es el nuevo (índice 2): su hash nunca estuvo en `seen`,
    // así que ya no hay nada leído por saltar y el botón desaparece.
    expect(screen.queryByRole('button', { name: S.escena.saltarLeido })).not.toBeInTheDocument();
  });

  it('el botón queda pegado al borde de la columna, que scrollea sola mientras se revela', () => {
    // jsdom no hace layout ni aplica hojas de estilo de módulos CSS, así que la regla se lee
    // del archivo. Vale la pena igual: el autoscroll de `TextColumn` clava el log contra el
    // borde de abajo en cada carácter revelado, y sin `position: sticky` este botón se va de
    // pantalla justo en la ventana en la que existe. Es el modo de que, si alguien saca la
    // regla, se entere acá y no jugando la segunda escena.
    const css = readFileSync(resolve(process.cwd(), 'src/ui/screens/EscenaScreen.module.css'), 'utf8');
    const regla = /\.saltarLeido\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(regla).toMatch(/position:\s*sticky/);
    expect(regla).toMatch(/top:\s*0/);
  });
});
