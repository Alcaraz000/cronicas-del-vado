/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Cajon } from '@/ui/components/Cajon';

describe('Cajon', () => {
  it('no dibuja nada cuando está cerrado', () => {
    render(
      <Cajon titulo="Ficha" abierto={false} onCerrar={vi.fn()}>
        <p>contenido</p>
      </Cajon>,
    );
    expect(screen.queryByText('contenido')).not.toBeInTheDocument();
  });

  it('es un diálogo con nombre accesible', () => {
    render(
      <Cajon titulo="Ficha" abierto onCerrar={vi.fn()}>
        <p>contenido</p>
      </Cajon>,
    );
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName('Ficha');
  });

  it('Esc lo cierra', () => {
    const onCerrar = vi.fn();
    render(
      <Cajon titulo="Ficha" abierto onCerrar={onCerrar}>
        <button type="button">algo</button>
      </Cajon>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledOnce();
  });

  it('al abrirse mueve el foco adentro y al cerrarse lo devuelve', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();
    expect(document.activeElement).toBe(disparador);

    const { rerender } = render(
      <Cajon titulo="Ficha" abierto onCerrar={vi.fn()}>
        <button type="button">adentro</button>
      </Cajon>,
    );
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    rerender(
      <Cajon titulo="Ficha" abierto={false} onCerrar={vi.fn()}>
        <button type="button">adentro</button>
      </Cajon>,
    );
    expect(document.activeElement).toBe(disparador);
    disparador.remove();
  });

  it('Tab en el último elemento vuelve al primero', () => {
    render(
      <Cajon titulo="Ficha" abierto onCerrar={vi.fn()}>
        <button type="button">uno</button>
        <button type="button">dos</button>
      </Cajon>,
    );
    const dentro = screen.getAllByRole('button');
    dentro[dentro.length - 1]?.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(dentro[0]);
  });

  it('Shift+Tab en el primer elemento vuelve al último', () => {
    render(
      <Cajon titulo="Ficha" abierto onCerrar={vi.fn()}>
        <button type="button">uno</button>
        <button type="button">dos</button>
      </Cajon>,
    );
    const dentro = screen.getAllByRole('button');
    dentro[0]?.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(dentro[dentro.length - 1]);
  });
});
