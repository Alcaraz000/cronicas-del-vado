/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dados } from '@/ui/components/Dados';

describe('Dados', () => {
  it('dibuja un dado por valor, con su cara accesible', () => {
    render(<Dados dice={[6, 2, 5]} kept={[0, 2]} girando={false} />);
    expect(screen.getByTestId('dado-0')).toHaveAccessibleName('6');
    expect(screen.getByTestId('dado-1')).toHaveAccessibleName('2');
  });

  it('marca cuál se conserva y cuál se descarta', () => {
    render(<Dados dice={[6, 2, 5]} kept={[0, 2]} girando={false} />);
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-kept', 'true');
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-kept', 'false');
  });

  it('mientras gira no muestra el valor final', () => {
    render(<Dados dice={[6, 2, 5]} kept={[0, 2]} girando />);
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-girando', 'true');
  });

  it('resalta solo el dado repetido', () => {
    render(<Dados dice={[6, 2, 5]} kept={[0, 2]} girando={false} resaltado={1} />);
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-resaltado', 'true');
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-resaltado', 'false');
  });
});
