/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Imagen } from '@/ui/components/Imagen';
import { useStore } from '@/state/store';

describe('Imagen', () => {
  afterEach(() => {
    cleanup();
    useStore.getState().setPrefs({ reducedMotion: 'auto' });
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

  it('el fundido cruzado: la imagen vieja sigue en el DOM hasta que la nueva resolvió decode()', async () => {
    // jsdom no implementa HTMLImageElement.decode; lo mockeamos acá para controlar a mano
    // cuándo "termina de decodificar" y así poder observar el estado intermedio. Cada llamada
    // agrega su resolver a la lista (en vez de reusar una sola variable) para no perder el de
    // la primera imagen cuando llega el de la segunda.
    const resolvers: Array<() => void> = [];
    const decodeOriginal = window.HTMLImageElement.prototype.decode;
    window.HTMLImageElement.prototype.decode = () =>
      new Promise<void>((resolve) => {
        resolvers.push(resolve);
      });

    try {
      const { rerender } = render(<Imagen tipo="fondo" id="aldamar_plaza" aspect="16:9" alt="Fondo: Plaza" />);
      // La primera imagen también pasa por decode(): la dejamos resolver para poder partir
      // de un estado con algo ya mostrado.
      await waitFor(() => expect(resolvers.length).toBe(1));
      resolvers[0]();
      const vieja = await screen.findByAltText('Fondo: Plaza');
      expect(vieja.getAttribute('src')).toMatch(/aldamar_plaza/);

      rerender(<Imagen tipo="fondo" id="casa_de_berta" aspect="16:9" alt="Fondo: Casa de Berta" />);

      // decode() de la nueva imagen todavía no resolvió: la vieja tiene que seguir siendo
      // la que se ve, sin placeholder de por medio ni la nueva a medio pintar.
      await waitFor(() => expect(resolvers.length).toBe(2));
      expect(screen.getByAltText('Fondo: Plaza')).toBeInTheDocument();
      expect(screen.queryByAltText('Fondo: Casa de Berta')).toBeNull();

      resolvers[1]();

      await waitFor(() => {
        expect(screen.getByAltText('Fondo: Casa de Berta').getAttribute('src')).toMatch(/casa_de_berta/);
      });
      expect(screen.queryByAltText('Fondo: Plaza')).toBeNull();
    } finally {
      window.HTMLImageElement.prototype.decode = decodeOriginal;
    }
  });

  it('con movimiento reducido, la imagen queda marcada para que el CSS corte seco (sin fundido)', async () => {
    useStore.getState().setPrefs({ reducedMotion: 'on' });
    render(<Imagen tipo="retrato" id="orell" aspect="3:4" alt="Retrato de Orell" />);
    const img = await screen.findByAltText('Retrato de Orell');
    expect(img).toHaveAttribute('data-reducida', 'true');
  });
});
