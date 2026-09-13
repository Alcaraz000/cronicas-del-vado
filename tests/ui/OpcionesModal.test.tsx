/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OpcionesModal } from '@/ui/components/OpcionesModal';
import { PERSIST_VERSION } from '@/state/migrations';
import { useStore } from '@/state/store';
import { S } from '@/ui/strings.es';
import { makeCharacter } from '../fixtures/state';

function reiniciar(): void {
  localStorage.clear();
  useStore.setState({
    characters: [],
    activeCharacterId: null,
    world: { flags: [], fallen: [] },
    seen: {},
    prefs: { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
    ui: { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null, ganancia: null, subidaPendiente: null },
  });
}

function cajaDeImportar(): HTMLTextAreaElement {
  const caja = screen.getByTestId('guardado-para-importar');
  if (!(caja instanceof HTMLTextAreaElement)) throw new Error('La caja de importar no es un textarea');
  return caja;
}

describe('OpcionesModal', () => {
  beforeEach(() => {
    reiniciar();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('es un diálogo con nombre accesible y se cierra con Escape o con el botón', () => {
    const onCerrar = vi.fn();
    render(<OpcionesModal onCerrar={onCerrar} />);

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAccessibleName(S.ajustes.titulo);
    expect(screen.getByTestId('cerrar-opciones')).toHaveFocus();

    fireEvent.keyDown(dialogo, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('cerrar-opciones'));
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });

  it('atrapa el foco como el resto de los modales: Tab desde el último vuelve al primero', () => {
    // Era el único modal de la app que declaraba `aria-modal="true"` sin usar
    // `useTrampaDeFoco`: Tab se escapaba a la página de atrás y Escape solo andaba con el foco
    // adentro, porque el handler colgaba del propio diálogo y no del documento.
    render(<OpcionesModal onCerrar={vi.fn()} />);

    const enfocables = screen.getByRole('dialog').querySelectorAll<HTMLElement>('button, input, textarea');
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    expect(primero).toBe(screen.getByTestId('cerrar-opciones'));

    ultimo?.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(primero);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('Escape cierra aunque el foco se haya ido afuera del diálogo', () => {
    const onCerrar = vi.fn();
    render(<OpcionesModal onCerrar={onCerrar} />);

    const afuera = document.createElement('button');
    document.body.appendChild(afuera);
    afuera.focus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(1);

    afuera.remove();
  });

  it('cambiar el tamaño de letra en Preferencias actualiza el store', () => {
    render(<OpcionesModal onCerrar={vi.fn()} />);

    fireEvent.click(screen.getByLabelText(S.ajustes.preferencias.tamanoDeLetra.n125));

    expect(useStore.getState().prefs.fontScale).toBe(1.25);
  });

  it('un cps intermedio (guardado importado) deja marcado "Normal", no ningún radio', () => {
    act(() => {
      useStore.setState((s) => ({ prefs: { ...s.prefs, cps: 20 } }));
    });
    render(<OpcionesModal onCerrar={vi.fn()} />);

    expect(screen.getByLabelText(S.ajustes.preferencias.maquinaDeEscribir.normal)).toBeChecked();
    expect(screen.getByLabelText(S.ajustes.preferencias.maquinaDeEscribir.instantaneo)).not.toBeChecked();
  });

  it('muestra el guardado entero para copiar y lo ofrece como archivo', () => {
    act(() => {
      useStore.setState({ characters: [makeCharacter({ name: 'Bruna' })], activeCharacterId: 'pj_prueba' });
    });
    render(<OpcionesModal onCerrar={vi.fn()} />);

    const caja = screen.getByTestId('guardado-exportado');
    if (!(caja instanceof HTMLTextAreaElement)) throw new Error('La caja de exportar no es un textarea');
    const leido = JSON.parse(caja.value) as { version: number; state: { characters: { name: string }[] } };
    expect(leido.version).toBe(PERSIST_VERSION);
    expect(leido.state.characters[0]?.name).toBe('Bruna');
    expect(caja).toHaveAttribute('readonly');

    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:guardado');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    fireEvent.click(screen.getByTestId('descargar-guardado'));
    expect(crear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('si el navegador no deja descargar, lo dice y deja el texto como salida', () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('sin descargas acá');
    });
    render(<OpcionesModal onCerrar={vi.fn()} />);

    fireEvent.click(screen.getByTestId('descargar-guardado'));
    expect(screen.getByRole('alert')).toHaveTextContent(S.ajustes.exportar.sinDescarga);
    expect(screen.getByTestId('guardado-exportado')).toBeInTheDocument();
  });

  it('importar un guardado válido reemplaza el perfil y vuelve al inicio', () => {
    const guardado = JSON.stringify({
      version: PERSIST_VERSION,
      state: {
        characters: [makeCharacter({ id: 'pj_importado', name: 'Importada', run: null })],
        activeCharacterId: 'pj_importado',
        world: { flags: ['world:prueba.algo'], fallen: [] },
        seen: {},
        prefs: { cps: 80, showOdds: false, fontScale: 1.25, reducedMotion: 'on' },
      },
    });

    act(() => {
      useStore.setState((s) => ({ ui: { ...s.ui, screen: 'hub' } }));
    });
    render(<OpcionesModal onCerrar={vi.fn()} />);

    fireEvent.change(cajaDeImportar(), { target: { value: guardado } });
    fireEvent.click(screen.getByTestId('importar-guardado'));

    const s = useStore.getState();
    expect(s.characters.map((c) => c.name)).toEqual(['Importada']);
    expect(s.activeCharacterId).toBe('pj_importado');
    expect(s.world.flags).toEqual(['world:prueba.algo']);
    expect(s.prefs.cps).toBe(80);
    expect(s.ui.screen).toBe('inicio');
  });

  it('un guardado roto no toca nada y explica el motivo', () => {
    act(() => {
      useStore.setState({ characters: [makeCharacter({ name: 'Bruna' })], activeCharacterId: 'pj_prueba' });
    });
    render(<OpcionesModal onCerrar={vi.fn()} />);

    fireEvent.change(cajaDeImportar(), { target: { value: 'esto no es json' } });
    fireEvent.click(screen.getByTestId('importar-guardado'));

    expect(screen.getByRole('alert')).toHaveTextContent(S.ajustes.importar.error('El texto no es un JSON válido'));
    expect(useStore.getState().characters.map((c) => c.name)).toEqual(['Bruna']);

    // Un JSON con la forma equivocada tampoco entra.
    fireEvent.change(cajaDeImportar(), { target: { value: '{"version":0,"state":{"characters":"no"}}' } });
    fireEvent.click(screen.getByTestId('importar-guardado'));
    expect(screen.getByRole('alert')).toHaveTextContent(S.ajustes.importar.error(''));
    expect(useStore.getState().characters.map((c) => c.name)).toEqual(['Bruna']);
  });

  it('importar con la caja vacía avisa y no llama al store', () => {
    const importSave = vi.fn(() => ({ ok: true }));
    act(() => {
      useStore.setState({ importSave });
    });
    render(<OpcionesModal onCerrar={vi.fn()} />);

    fireEvent.click(screen.getByTestId('importar-guardado'));
    expect(screen.getByRole('alert')).toHaveTextContent(S.ajustes.importar.vacio);
    expect(importSave).not.toHaveBeenCalled();
  });
});
