/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Imagen } from '@/ui/components/Imagen';

describe('Imagen', () => {
  afterEach(() => {
    cleanup();
  });

  it('muestra la imagen real, diferida y con el espacio reservado, cuando hay arte', async () => {
    const { container } = render(<Imagen tipo="retrato" id="orell" aspect="3:4" alt="Retrato de Orell" />);

    const img = await screen.findByAltText('Retrato de Orell');
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img.getAttribute('src')).toMatch(/orell/);
    expect(container.querySelector('[data-aspect="3:4"]')).toBeInTheDocument();
  });

  it('cae al placeholder gris cuando no hay arte para ese tipo e id, sin romper', () => {
    render(<Imagen tipo="fondo" id="lugar_inventado" aspect="16:9" alt="Fondo: Un lugar sin arte" />);

    expect(screen.getByRole('img', { name: 'Fondo: Un lugar sin arte' })).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('el alt no es nunca el id crudo', async () => {
    render(<Imagen tipo="retrato" id="guerrero_01" aspect="3:4" alt="Retrato de un guerrero" />);
    const img = await screen.findByAltText('Retrato de un guerrero');
    expect(img).not.toHaveAttribute('alt', 'guerrero_01');
  });
});
