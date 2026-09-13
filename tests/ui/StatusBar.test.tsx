/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StatusBar } from '@/ui/components/StatusBar';
import { S } from '@/ui/strings.es';

describe('StatusBar', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('muestra lugar, heridas, Fortuna y condiciones', () => {
    render(
      <StatusBar
        placeName="Torre abandonada"
        wounds={1}
        fortune={2}
        fortuneMax={3}
        conditions={['asustado']}
        onAbandon={vi.fn()}
        onOpenFicha={vi.fn()}
      />,
    );
    expect(screen.getByText('Torre abandonada')).toBeInTheDocument();
    expect(screen.getByText(/Herido/)).toBeInTheDocument();
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/Asustado/)).toBeInTheDocument();
  });

  it('sin condiciones muestra el texto correspondiente', () => {
    render(
      <StatusBar
        placeName="Torre abandonada"
        wounds={0}
        fortune={3}
        fortuneMax={3}
        conditions={[]}
        onAbandon={vi.fn()}
        onOpenFicha={vi.fn()}
      />,
    );
    expect(screen.getByText(new RegExp(S.barra.sinCondiciones))).toBeInTheDocument();
  });

  it('el botón Ficha menciona la tecla C y llama a onOpenFicha', () => {
    const onOpenFicha = vi.fn();
    render(
      <StatusBar
        placeName="Torre abandonada"
        wounds={0}
        fortune={3}
        fortuneMax={3}
        conditions={[]}
        onAbandon={vi.fn()}
        onOpenFicha={onOpenFicha}
      />,
    );
    const boton = screen.getByRole('button', { name: S.barra.ficha });
    expect(boton).toHaveAttribute('title', expect.stringContaining('C'));
    fireEvent.click(boton);
    expect(onOpenFicha).toHaveBeenCalledOnce();
  });

  it('Abandonar pide confirmación con un Dialogo de tono peligro y solo llama a onAbandon si se confirma', () => {
    const onAbandon = vi.fn();
    render(
      <StatusBar
        placeName="Torre abandonada"
        wounds={0}
        fortune={3}
        fortuneMax={3}
        conditions={[]}
        onAbandon={onAbandon}
        onOpenFicha={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: S.barra.abandonar }));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAccessibleName(S.barra.confirmarAbandonoTitulo);
    expect(within(dialogo).getByText(S.barra.confirmarAbandono)).toBeInTheDocument();
    expect(dialogo).toHaveAttribute('data-tono', 'peligro');

    // Cancelar cierra el diálogo sin abandonar.
    fireEvent.click(within(dialogo).getByRole('button', { name: S.comun.cancelar }));
    expect(onAbandon).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Confirmar sí abandona.
    fireEvent.click(screen.getByRole('button', { name: S.barra.abandonar }));
    const segundoDialogo = screen.getByRole('dialog');
    fireEvent.click(within(segundoDialogo).getByRole('button', { name: S.barra.abandonar }));
    expect(onAbandon).toHaveBeenCalledOnce();
  });

  it('con abandonDisabled, Abandonar está deshabilitado y no ofrece la confirmación; Ficha sigue habilitado', () => {
    const onAbandon = vi.fn();
    const onOpenFicha = vi.fn();
    render(
      <StatusBar
        placeName="Torre abandonada"
        wounds={0}
        fortune={3}
        fortuneMax={3}
        conditions={[]}
        onAbandon={onAbandon}
        onOpenFicha={onOpenFicha}
        abandonDisabled={true}
      />,
    );
    const boton = screen.getByRole('button', { name: S.barra.abandonar });
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onAbandon).not.toHaveBeenCalled();

    // Mirar la ficha es seguro en cualquier momento: no se deshabilita con la tirada pendiente.
    const botonFicha = screen.getByRole('button', { name: S.barra.ficha });
    expect(botonFicha).not.toBeDisabled();
    fireEvent.click(botonFicha);
    expect(onOpenFicha).toHaveBeenCalledOnce();
  });
});
