/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
      />,
    );
    expect(screen.getByText('Torre abandonada')).toBeInTheDocument();
    expect(screen.getByText(/Herido/)).toBeInTheDocument();
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/Asustado/)).toBeInTheDocument();
  });

  it('sin condiciones muestra el texto correspondiente', () => {
    render(
      <StatusBar placeName="Torre abandonada" wounds={0} fortune={3} fortuneMax={3} conditions={[]} onAbandon={vi.fn()} />,
    );
    expect(screen.getByText(new RegExp(S.barra.sinCondiciones))).toBeInTheDocument();
  });

  it('Abandonar pide confirmación y solo llama a onAbandon si se acepta', () => {
    const onAbandon = vi.fn();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <StatusBar placeName="Torre abandonada" wounds={0} fortune={3} fortuneMax={3} conditions={[]} onAbandon={onAbandon} />,
    );
    fireEvent.click(screen.getByRole('button', { name: S.barra.abandonar }));
    expect(confirmar).toHaveBeenCalledWith(S.barra.confirmarAbandono);
    expect(onAbandon).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: S.barra.abandonar }));
    expect(onAbandon).toHaveBeenCalledTimes(1);
  });

  it('con abandonDisabled, el botón está deshabilitado y no ofrece la confirmación', () => {
    const onAbandon = vi.fn();
    const confirmar = vi.spyOn(window, 'confirm');
    render(
      <StatusBar
        placeName="Torre abandonada"
        wounds={0}
        fortune={3}
        fortuneMax={3}
        conditions={[]}
        onAbandon={onAbandon}
        abandonDisabled={true}
      />,
    );
    const boton = screen.getByRole('button', { name: S.barra.abandonar });
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
    expect(confirmar).not.toHaveBeenCalled();
    expect(onAbandon).not.toHaveBeenCalled();
  });
});
