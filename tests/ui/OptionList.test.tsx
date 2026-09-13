/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { OptionList } from '@/ui/components/OptionList';
import { marcarModalAbierto } from '@/ui/modales';
import { S } from '@/ui/strings.es';
import type { RenderedChoice, RollPreview } from '@/engine/types';

const preview: RollPreview = {
  attr: 'saber',
  attrValue: 2,
  difficulty: 'normal',
  difficultyMod: 0,
  veteranMod: 0,
  totalMod: 2,
  mode: 'advantage',
  sources: [{ kind: 'advantage', label: 'Aprendiz de escriba', origin: 'trait', cancelled: false }],
  odds: { success: 15 / 36, partial: 15 / 36, failure: 6 / 36 },
  risk: 'arriesgado',
  targetLine: 'Necesitás 8+ en los dados para éxito, 5+ con costo',
};

const previewAnulada: RollPreview = {
  attr: 'vigor',
  attrValue: 0,
  difficulty: 'dificil',
  difficultyMod: -1,
  veteranMod: 0,
  totalMod: -1,
  mode: 'cancelled',
  sources: [
    { kind: 'advantage', label: 'Situación', origin: 'scene', cancelled: true },
    { kind: 'disadvantage', label: 'Debilidad: Mago', origin: 'class', cancelled: true },
  ],
  odds: { success: 3 / 36, partial: 12 / 36, failure: 21 / 36 },
  risk: 'peligroso',
  targetLine: 'Necesitás 11+ en los dados para éxito, 8+ con costo',
};

function opcion(base: Pick<RenderedChoice, 'id' | 'label'> & Partial<RenderedChoice>): RenderedChoice {
  return { visible: true, enabled: true, leadsToLethal: false, alreadySeen: false, ...base };
}

const opciones: RenderedChoice[] = [
  opcion({
    id: 'llave',
    label: 'Trabar la puerta con la llave',
    enabled: false,
    lockedHint: 'Necesitás algo con qué trabar la puerta',
    badge: 'Llave de hierro',
  }),
  opcion({ id: 'leer', label: 'Leer la inscripción', preview, badge: 'Aprendiz de escriba' }),
  opcion({ id: 'forzar', label: 'Forzar la puerta', preview: previewAnulada }),
  opcion({ id: 'bajar', label: 'Bajar a la cripta', leadsToLethal: true, alreadySeen: true }),
  opcion({ id: 'secreta', label: 'Opción oculta', visible: false }),
];

describe('OptionList', () => {
  let onPick: ReturnType<typeof vi.fn<(choiceId: string) => void>>;

  beforeEach(() => {
    onPick = vi.fn<(choiceId: string) => void>();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('muestra label, badge, chips de modificador descompuestos, riesgo y porcentajes', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={1} onPick={onPick} />);

    expect(screen.getByText('Leer la inscripción')).toBeInTheDocument();
    expect(screen.getByText('[Aprendiz de escriba]')).toBeInTheDocument();

    // "leer": Saber +2, sin chip de dificultad (Normal no pesa), fuente de ventaja sin anular.
    expect(screen.getByText('Saber +2')).toBeInTheDocument();
    expect(screen.queryByText(/Normal/)).toBeNull();
    const fuenteVentaja = screen.getByText('▲ Aprendiz de escriba');
    expect(fuenteVentaja).toHaveAttribute('data-tono', 'ventaja');
    expect(fuenteVentaja).toHaveAttribute('data-tachado', 'false');
    expect(screen.getByText(S.opciones.riesgo.arriesgado)).toHaveAttribute('data-riesgo', 'arriesgado');
    expect(screen.getByText('Éxito 42 % · Con costo 42 % · Fallo 17 %')).toBeInTheDocument();

    // "forzar": Vigor +0, Difícil -1, ambas fuentes anuladas (ventaja y desventaja se cancelan).
    expect(screen.getByText('Vigor +0')).toBeInTheDocument();
    expect(screen.getByText('Difícil -1')).toBeInTheDocument();
    const fuenteVentajaAnulada = screen.getByText('▲ Situación');
    expect(fuenteVentajaAnulada).toHaveAttribute('data-tono', 'ventaja');
    expect(fuenteVentajaAnulada).toHaveAttribute('data-tachado', 'true');
    const fuenteDesventajaAnulada = screen.getByText('▼ Debilidad: Mago');
    expect(fuenteDesventajaAnulada).toHaveAttribute('data-tono', 'desventaja');
    expect(fuenteDesventajaAnulada).toHaveAttribute('data-tachado', 'true');
    expect(screen.getByText(S.opciones.riesgo.peligroso)).toHaveAttribute('data-riesgo', 'peligroso');
    expect(screen.getByText('Éxito 8 % · Con costo 33 % · Fallo 58 %')).toBeInTheDocument();

    expect(screen.getByText(S.opciones.mortal)).toBeInTheDocument();
    expect(screen.getByText(S.opciones.yaElegida)).toBeInTheDocument();
    expect(screen.queryByText('Opción oculta')).toBeNull();
  });

  it('oculta los porcentajes cuando showOdds es false', () => {
    render(<OptionList choices={opciones} showOdds={false} wounds={0} onPick={onPick} />);
    expect(screen.queryByText(/Éxito \d+ %/)).toBeNull();
    expect(screen.getByText('Saber +2')).toBeInTheDocument();
  });

  it('una opción bloqueada con lockedHint está deshabilitada, muestra la pista y no elige', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    const boton = screen.getByTestId('opcion-llave');
    expect(boton).toBeDisabled();
    expect(screen.getByText('Necesitás algo con qué trabar la puerta')).toBeInTheDocument();
    fireEvent.click(boton);
    expect(onPick).not.toHaveBeenCalled();
  });

  /**
   * Tarea 6 (Fase H), pedido del coordinador: cuando el revelado termina y aparecen las
   * opciones, el jugador de teclado está esperando justo para elegir. Enfocar la primera acá
   * es seguro porque `OptionList` recién se monta cuando `terminado` es verdadero: la región
   * viva del texto ya no está cambiando, así que moverle el foco no le corta la lectura a un
   * lector de pantalla. Sin esto, elegir una opción hace que el botón elegido se desmonte (la
   * escena cambia) y el foco cae a `<body>`: el jugador tiene que tabular desde arriba en cada
   * escena nueva.
   */
  it('al montar, el foco va a la primera opción visible y habilitada (salta la bloqueada)', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    expect(screen.getByTestId('opcion-leer')).toHaveFocus();
  });

  it('si hay un modal abierto, no le roba el foco (la trampa de foco del modal manda)', () => {
    const cerrarModal = marcarModalAbierto();
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    expect(screen.getByTestId('opcion-leer')).not.toHaveFocus();
    cerrarModal();
  });

  it('la tecla 1 elige la primera opción visible y habilitada (salta la bloqueada)', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('leer');

    fireEvent.keyDown(window, { key: '2' });
    expect(onPick).toHaveBeenLastCalledWith('forzar');

    fireEvent.keyDown(window, { key: '9' });
    expect(onPick).toHaveBeenCalledTimes(2);
  });

  it('el clic en un botón habilitado llama a onPick con su id', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    fireEvent.click(screen.getByTestId('opcion-forzar'));
    expect(onPick).toHaveBeenCalledWith('forzar');
  });

  it('una opción que lleva a escena mortal muestra un Dialogo de peligro con el texto según heridas; cancelar no elige', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={1} onPick={onPick} />);

    fireEvent.click(screen.getByTestId('opcion-bajar'));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('data-tono', 'peligro');
    expect(within(dialogo).getByText(S.opciones.confirmMortal[1])).toBeInTheDocument();
    expect(onPick).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: S.opciones.volver }));
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirmar el Dialogo de escena mortal llama a onPick con el id pendiente', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={1} onPick={onPick} />);

    fireEvent.click(screen.getByTestId('opcion-bajar'));
    fireEvent.click(screen.getByRole('button', { name: S.opciones.seguirIgual }));

    expect(onPick).toHaveBeenCalledWith('bajar');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('la confirmación también se pide al elegir por teclado y usa el texto de Malherido', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={2} onPick={onPick} />);
    fireEvent.keyDown(window, { key: '3' });
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(S.opciones.confirmMortal[2])).toBeInTheDocument();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('Ctrl+1 y Meta+1 no eligen ninguna opción (son atajos del navegador); 1 pelado sigue eligiendo', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);

    fireEvent.keyDown(window, { key: '1', ctrlKey: true });
    fireEvent.keyDown(window, { key: '1', metaKey: true });
    fireEvent.keyDown(window, { key: '1', altKey: true });
    expect(onPick).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: '1' });
    expect(onPick).toHaveBeenCalledWith('leer');
  });

  it('Shift+1 sí elige (en AZERTY el dígito se escribe con Shift)', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    fireEvent.keyDown(window, { key: '1', shiftKey: true });
    expect(onPick).toHaveBeenCalledWith('leer');
  });
});
