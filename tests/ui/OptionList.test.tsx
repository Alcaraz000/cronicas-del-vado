/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OptionList } from '@/ui/components/OptionList';
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

  it('muestra label, badge, chip de atributo, fuentes, riesgo y porcentajes', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={1} onPick={onPick} />);

    expect(screen.getByText('Leer la inscripción')).toBeInTheDocument();
    expect(screen.getByText('[Aprendiz de escriba]')).toBeInTheDocument();
    expect(screen.getByText('Saber +2 · Normal')).toBeInTheDocument();
    expect(screen.getByText('▲ Aprendiz de escriba')).toHaveAttribute('data-cancelled', 'false');
    expect(screen.getByText(S.opciones.riesgo.arriesgado)).toHaveAttribute('data-riesgo', 'arriesgado');
    expect(screen.getByText('Éxito 42 % · Con costo 42 % · Fallo 17 %')).toBeInTheDocument();

    expect(screen.getByText('Vigor -1 · Difícil')).toBeInTheDocument();
    expect(screen.getByText('▲ Situación')).toHaveAttribute('data-cancelled', 'true');
    expect(screen.getByText('▼ Debilidad: Mago')).toHaveAttribute('data-cancelled', 'true');
    expect(screen.getByText(S.opciones.riesgo.peligroso)).toHaveAttribute('data-riesgo', 'peligroso');
    expect(screen.getByText('Éxito 8 % · Con costo 33 % · Fallo 58 %')).toBeInTheDocument();

    expect(screen.getByText(S.opciones.mortal)).toBeInTheDocument();
    expect(screen.getByText(S.opciones.yaElegida)).toBeInTheDocument();
    expect(screen.queryByText('Opción oculta')).toBeNull();
  });

  it('oculta los porcentajes cuando showOdds es false', () => {
    render(<OptionList choices={opciones} showOdds={false} wounds={0} onPick={onPick} />);
    expect(screen.queryByText(/Éxito \d+ %/)).toBeNull();
    expect(screen.getByText('Saber +2 · Normal')).toBeInTheDocument();
  });

  it('una opción bloqueada con lockedHint está deshabilitada, muestra la pista y no elige', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    const boton = screen.getByTestId('opcion-llave');
    expect(boton).toBeDisabled();
    expect(screen.getByText('Necesitás algo con qué trabar la puerta')).toBeInTheDocument();
    fireEvent.click(boton);
    expect(onPick).not.toHaveBeenCalled();
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

  it('una opción que lleva a escena mortal pide confirmación con el texto según heridas', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<OptionList choices={opciones} showOdds={true} wounds={1} onPick={onPick} />);

    fireEvent.click(screen.getByTestId('opcion-bajar'));
    expect(confirmar).toHaveBeenCalledWith(S.opciones.confirmMortal[1]);
    expect(onPick).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('opcion-bajar'));
    expect(onPick).toHaveBeenCalledWith('bajar');
  });

  it('la confirmación también se pide al elegir por teclado y usa el texto de Malherido', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<OptionList choices={opciones} showOdds={true} wounds={2} onPick={onPick} />);
    fireEvent.keyDown(window, { key: '3' });
    expect(confirmar).toHaveBeenCalledWith(S.opciones.confirmMortal[2]);
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
