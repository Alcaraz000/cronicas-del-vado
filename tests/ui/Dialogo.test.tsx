/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dialogo } from '@/ui/components/Dialogo';

function props(over = {}) {
  return {
    titulo: 'El vado crecido',
    cuerpo: 'Estás Malherido: un Fallo acá te mata.',
    confirmar: 'Cruzar igual',
    cancelar: 'Volver',
    abierto: true,
    onConfirmar: vi.fn(),
    onCancelar: vi.fn(),
    ...over,
  };
}

describe('Dialogo', () => {
  it('muestra título y cuerpo, y es un diálogo modal', () => {
    const p = props();
    render(<Dialogo {...p} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(p.cuerpo)).toBeInTheDocument();
  });

  it('el foco arranca en cancelar, no en confirmar', () => {
    const p = props();
    render(<Dialogo {...p} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: p.cancelar }));
  });

  it('confirmar y cancelar avisan al llamador', () => {
    const p = props();
    render(<Dialogo {...p} />);
    fireEvent.click(screen.getByRole('button', { name: p.confirmar }));
    expect(p.onConfirmar).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: p.cancelar }));
    expect(p.onCancelar).toHaveBeenCalledOnce();
  });

  it('Esc cancela', () => {
    const p = props();
    render(<Dialogo {...p} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(p.onCancelar).toHaveBeenCalledOnce();
    expect(p.onConfirmar).not.toHaveBeenCalled();
  });

  it('cerrado no dibuja nada', () => {
    const p = props({ abierto: false });
    render(<Dialogo {...p} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
