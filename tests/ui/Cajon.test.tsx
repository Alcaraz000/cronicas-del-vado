/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Cajon } from '@/ui/components/Cajon';
import { cuerpoDe } from '../fixtures/css';

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

  /**
   * El encabezado —título y botón "Cerrar"— queda FIJO y lo que scrollea es el cuerpo.
   *
   * Hasta la oleada de arreglos de la tarea 3 el `overflow-y` vivía en `.panel`, con el
   * encabezado adentro: en una Ficha larga el botón de cerrar se iba de pantalla, y en el
   * historial —que abre scrolleado al final, que es lo que el jugador viene a ver— el cajón
   * abría directamente sin ningún "Cerrar" a la vista. Medido jugando: con dos escenas el
   * contenido ya mide 978 px contra 800 de ventana.
   *
   * jsdom no calcula layout ni aplica módulos CSS, así que esto se lee del archivo: es el modo
   * de que, si alguien devuelve el scroll al panel, se entere acá y no abriendo la Ficha.
   */
  it('el encabezado queda fijo y el que scrollea es el cuerpo', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/ui/components/Cajon.module.css'), 'utf8');

    const panel = cuerpoDe(css, '.panel');
    expect(panel, '.panel no tiene regla propia').not.toBeNull();
    expect(panel, 'el scroll volvió al panel y se lleva el encabezado con él').not.toMatch(
      /overflow-y\s*:\s*auto/,
    );

    const cuerpo = cuerpoDe(css, '.cuerpo');
    expect(cuerpo, '.cuerpo no tiene regla propia').not.toBeNull();
    expect(cuerpo).toMatch(/overflow-y\s*:\s*auto/);
    // Base cero: se queda con lo que sobra, no con lo que su contenido pide. Y `min-height: 0`
    // por el `min-height: auto` implícito de todo ítem flex, sin el cual el `overflow-y` nunca
    // llega a activarse porque el ítem se infla con su contenido.
    expect(cuerpo).toMatch(/flex\s*:\s*1\s+1\s+0/);
    expect(cuerpo).toMatch(/min-height\s*:\s*0/);

    // Y el encabezado no se achica cuando el cuerpo trae más de lo que entra.
    expect(cuerpoDe(css, '.encabezado')).toMatch(/flex\s*:\s*0\s+0\s+auto/);
  });
});
