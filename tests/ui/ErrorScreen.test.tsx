/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ErrorScreen } from '@/ui/screens/ErrorScreen';
import { useStore } from '@/state/store';
import { S } from '@/ui/strings.es';

/**
 * Tarea 6 (Fase H): `ScreenRouter` desmonta la pantalla anterior entera, así que el control
 * que tenía el foco al llegar acá ya no existe y el foco cae a `<body>`, invisible. El
 * título recibe el foco por programa apenas se monta (ver `useEnfocarAlEntrar`).
 */
describe('ErrorScreen', () => {
  afterEach(() => {
    cleanup();
  });

  it('lleva el foco al título apenas se monta, para no dejarlo perdido en <body>', () => {
    useStore.setState((s) => ({ ui: { ...s.ui, error: 'algo salió mal' } }));

    render(<ErrorScreen />);

    const titulo = screen.getByRole('heading', { level: 1, name: S.error.titulo });
    expect(titulo).toHaveFocus();
  });
});
