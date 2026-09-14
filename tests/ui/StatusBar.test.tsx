/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StatusBar } from '@/ui/components/StatusBar';
import { S } from '@/ui/strings.es';
import { bloqueDeMedia, cuerpoDe as cuerpoDeBloque } from '../fixtures/css';

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

  it('Abandonar no se ve igual que Ficha: la acción destructiva tiene jerarquía propia', () => {
    // Los dos botones viven en una barra que está siempre en pantalla; uno solo mira la ficha
    // y el otro cierra la partida sin vuelta atrás. jsdom no aplica los módulos CSS, así que
    // la regla se lee del archivo: lo que importa fijar es que "abandonar" tenga su propia
    // declaración con los tokens de peligro y que "ficha" no la tenga.
    const css = readFileSync(resolve(process.cwd(), 'src/ui/components/StatusBar.module.css'), 'utf8');
    /**
     * Cuerpo de la regla cuyo selector es EXACTAMENTE `selector`, sin comentarios ni espacios
     * (así da igual cómo esté formateado el archivo o con qué fin de línea se guardó).
     */
    const cuerpoDe = (selector: string): string | null => {
      for (const [, sel = '', cuerpo = ''] of css.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
        if (sel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '') === selector) return cuerpo;
      }
      return null;
    };

    expect(cuerpoDe('.abandonar')).toMatch(/var\(--color-peligro/);
    // La regla que los dos comparten sigue siendo neutra: el rojo es solo del destructivo.
    expect(cuerpoDe('.ficha,.abandonar')).toMatch(/var\(--color-borde\)/);
    expect(cuerpoDe('.ficha,.abandonar')).not.toMatch(/var\(--color-peligro/);
  });

  it('el cromo FLOTA sobre el arte: un degradado que se desvanece, no una barra sólida con borde', () => {
    // El rediseño pone el arte a sangre debajo de todo. Una barra de herramientas con fondo
    // sólido y un borde de 1 px cruzándole la cabeza a la imagen es justo lo que hace que la
    // pantalla se lea como una aplicación web: el cromo tiene que apoyarse sobre el arte y
    // desvanecerse. jsdom no aplica módulos CSS, así que la regla se lee del archivo.
    const css = readFileSync(resolve(process.cwd(), 'src/ui/components/StatusBar.module.css'), 'utf8');
    const barra = cuerpoDeBloque(css, '.barra');
    expect(barra, '.barra no tiene regla propia').not.toBeNull();
    expect(barra).toMatch(/linear-gradient\(\s*to bottom/);
    expect(barra, 'el borde inferior le cruza una línea al arte').not.toMatch(/border-bottom/);
  });

  it('el lugar se lee como el título de la escena: la serif del juego, en el acento', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/ui/components/StatusBar.module.css'), 'utf8');
    const lugar = cuerpoDeBloque(css, '.lugar');
    expect(lugar, '.lugar no tiene regla propia').not.toBeNull();
    expect(lugar).toMatch(/var\(--fuente-juego\)/);
    expect(lugar).toMatch(/var\(--color-acento\)/);
  });

  it('en móvil solo se oculta "sin condiciones": la regla vieja que tapaba toda la línea no debe quedar', () => {
    // Mismo motivo que arriba (jsdom no evalúa `@media`) y mismo método: leer el archivo.
    // Oleada final de la Fase H, hallazgo B3: los costos que esta fase agregó son en su mayoría
    // condiciones (perseguido, empapado, agotado), y ocultar `.condiciones` sin condición
    // le tapaba al jugador de teléfono el precio que estaba pagando, mientras las Heridas
    // seguían a la vista. Ahora la regla de móvil apunta al modificador `.condicionesVacias`
    // que `StatusBar` solo agrega cuando no hay ninguna condición.
    const css = readFileSync(resolve(process.cwd(), 'src/ui/components/StatusBar.module.css'), 'utf8');
    const movil = bloqueDeMedia(css, '@media (max-width: 800px)');
    expect(cuerpoDeBloque(movil, '.condiciones'), '.condiciones ya no debe ocultarse entera en móvil').toBeNull();
    const vacias = cuerpoDeBloque(movil, '.condicionesVacias');
    expect(vacias, '.condicionesVacias no tiene una regla propia en el bloque de móvil').not.toBeNull();
    expect(vacias).toMatch(/display\s*:\s*none/);
  });

  it('la línea de condiciones tiene su propia clase además de `.dato`, para poder ocultarla en móvil sin tocar heridas ni Fortuna', () => {
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
    const condiciones = screen.getByText(new RegExp(`^${S.barra.condiciones}:`)).closest('span');
    expect(condiciones).toHaveClass('condiciones');
  });

  it('sin condiciones, la línea lleva el modificador que la oculta en móvil', () => {
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
    const condiciones = screen.getByText(new RegExp(`^${S.barra.condiciones}:`)).closest('span');
    expect(condiciones).toHaveClass('condicionesVacias');
  });

  it('con condiciones reales (los costos de esta fase: perseguido, empapado, agotado), la línea NO lleva el modificador y queda visible en móvil', () => {
    render(
      <StatusBar
        placeName="Torre abandonada"
        wounds={0}
        fortune={3}
        fortuneMax={3}
        conditions={['perseguido']}
        onAbandon={vi.fn()}
        onOpenFicha={vi.fn()}
      />,
    );
    const condiciones = screen.getByText(new RegExp(`^${S.barra.condiciones}:`)).closest('span');
    expect(condiciones).toHaveClass('condiciones');
    expect(condiciones).not.toHaveClass('condicionesVacias');
  });
});
