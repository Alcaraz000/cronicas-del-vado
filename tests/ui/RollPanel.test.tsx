/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RollPanel } from '@/ui/components/RollPanel';
import { S } from '@/ui/strings.es';
import { useStore } from '@/state/store';
import type { PendingRoll, RollPreview } from '@/engine/types';

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

function pendiente(over: Partial<PendingRoll> = {}): PendingRoll {
  return {
    choiceId: 'leer_inscripcion',
    sceneId: 'p_umbral',
    preview,
    dice: [6, 2, 5],
    kept: [0, 2],
    total: 13,
    band: 'success',
    rerolls: [],
    powerUsed: false,
    canReroll: true,
    canUsePower: false,
    ...over,
  };
}

describe('RollPanel', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useStore.getState().setPrefs({ reducedMotion: 'auto' });
  });

  it('con movimiento reducido muestra el resultado completo de una, sin temporizadores', () => {
    useStore.getState().setPrefs({ reducedMotion: 'on' });
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    render(
      <RollPanel pending={pendiente()} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={vi.fn()} />,
    );

    // Todo lo que solo debería verse "al asentar" ya está en el primer render.
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-girando', 'false');
    expect(screen.getByTestId('total')).toHaveTextContent('13');
    expect(screen.getByTestId('sello')).toHaveTextContent(S.tirada.banda.success);
    expect(screen.getByRole('button', { name: S.tirada.continuar })).toBeInTheDocument();

    // Sin movimiento no hay nada que animar: no debe quedar ningún temporizador corriendo.
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('anima y después se asienta: primero giran los dados, después el total', () => {
    vi.useFakeTimers();
    render(
      <RollPanel pending={pendiente()} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={vi.fn()} />,
    );

    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-girando', 'true');
    expect(screen.queryByTestId('total')).toBeNull();
    expect(screen.queryByTestId('sello')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-girando', 'false');
    expect(screen.getByTestId('total')).toHaveTextContent('13');
    expect(screen.getByTestId('sello')).toHaveTextContent(S.tirada.banda.success);
  });

  it('un clic salta la animación', () => {
    vi.useFakeTimers();
    render(
      <RollPanel pending={pendiente()} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(screen.queryByTestId('total')).toBeNull();

    fireEvent.click(screen.getByRole('region', { name: S.tirada.titulo }));

    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-girando', 'false');
    expect(screen.getByTestId('total')).toHaveTextContent('13');
  });

  it('muestra los chips del preview, con los anulados tachados', () => {
    useStore.getState().setPrefs({ reducedMotion: 'on' });
    const previewAnulado: RollPreview = {
      ...preview,
      mode: 'cancelled',
      sources: [
        { kind: 'advantage', label: 'Aprendiz de escriba', origin: 'trait', cancelled: true },
        { kind: 'disadvantage', label: 'Exhausto', origin: 'condition', cancelled: true },
      ],
    };
    render(
      <RollPanel
        pending={pendiente({ preview: previewAnulado })}
        powerName="Conjuro"
        onReroll={vi.fn()}
        onPower={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText(S.tirada.modo.cancelled)).toBeInTheDocument();
    const ventaja = S.tirada.chip.fuente(S.tirada.chip.simbolo.advantage, 'Aprendiz de escriba');
    const desventaja = S.tirada.chip.fuente(S.tirada.chip.simbolo.disadvantage, 'Exhausto');
    expect(screen.getByText(ventaja)).toHaveAttribute('data-tachado', 'true');
    expect(screen.getByText(desventaja)).toHaveAttribute('data-tachado', 'true');
  });

  it('el sello lleva icono Y texto, no solo color', () => {
    useStore.getState().setPrefs({ reducedMotion: 'on' });
    render(
      <RollPanel
        pending={pendiente({ band: 'fumble' })}
        powerName="Conjuro"
        onReroll={vi.fn()}
        onPower={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    const sello = screen.getByTestId('sello');
    expect(sello).toHaveAttribute('data-banda', 'fumble');
    expect(sello).toHaveTextContent(S.tirada.icono.fumble);
    expect(sello).toHaveTextContent(S.tirada.banda.fumble);
  });

  it('los botones de Fortuna y Poder aparecen recién cuando la tirada se asentó', () => {
    vi.useFakeTimers();
    render(
      <RollPanel
        pending={pendiente({ canReroll: true, canUsePower: true })}
        powerName="Conjuro"
        onReroll={vi.fn()}
        onPower={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Fortuna/ })).toBeNull();
    expect(screen.queryByRole('button', { name: S.tirada.poder('Conjuro') })).toBeNull();
    expect(screen.queryByRole('button', { name: S.tirada.continuar })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getAllByRole('button', { name: /Fortuna/ }).length).toBe(3);
    expect(screen.getByRole('button', { name: S.tirada.poder('Conjuro') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: S.tirada.continuar })).toBeInTheDocument();
  });

  it('al repetir un dado con Fortuna solo re-anima ese dado', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <RollPanel pending={pendiente()} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={vi.fn()} />,
    );
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-girando', 'false');
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-girando', 'false');
    expect(screen.getByTestId('dado-2')).toHaveAttribute('data-girando', 'false');

    rerender(
      <RollPanel
        pending={pendiente({ dice: [6, 4, 5], rerolls: [1], total: 11 })}
        powerName="Conjuro"
        onReroll={vi.fn()}
        onPower={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    // Solo el dado repetido gira; el resto de la tirada, ya asentada, no se toca.
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-girando', 'true');
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-resaltado', 'true');
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-girando', 'false');
    expect(screen.getByTestId('dado-2')).toHaveAttribute('data-girando', 'false');
    expect(screen.getByTestId('total')).toHaveTextContent('11');

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-girando', 'false');
  });
});
