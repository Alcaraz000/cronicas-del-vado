/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InicioScreen } from '@/ui/screens/InicioScreen';
import { useStore } from '@/state/store';
import { S } from '@/ui/strings.es';

/**
 * Tarea 6 (Fase H): `ScreenRouter` es un `switch` puro, así que al LLEGAR a esta pantalla
 * (desde cualquier otra) el control que tenía el foco ya no existe y el foco cae a `<body>`,
 * invisible. Sin un destino explícito, un jugador de teclado tiene que tabular desde el
 * principio de la página en cada pantalla nueva. El arreglo: el título se vuelve enfocable
 * por programa (`tabIndex={-1}`) y recibe el foco apenas la pantalla se monta.
 */
describe('InicioScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ characters: [], activeCharacterId: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('lleva el foco al título apenas se monta, para no dejarlo perdido en <body>', () => {
    render(<InicioScreen />);

    const titulo = screen.getByRole('heading', { level: 1, name: S.titulo });
    expect(titulo).toHaveFocus();
  });
});
