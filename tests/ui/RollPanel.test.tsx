/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RollPanel } from '@/ui/components/RollPanel';
import { S } from '@/ui/strings.es';
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
  });

  it('muestra objetivo, dados (descartado apagado), total y sello de banda', () => {
    render(
      <RollPanel pending={pendiente()} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(screen.getByText(preview.targetLine)).toBeInTheDocument();
    expect(screen.getByText(S.tirada.modo.advantage)).toBeInTheDocument();

    expect(screen.getByTestId('dado-0')).toHaveTextContent('6');
    expect(screen.getByTestId('dado-1')).toHaveTextContent('2');
    expect(screen.getByTestId('dado-2')).toHaveTextContent('5');
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-kept', 'true');
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-kept', 'false');
    expect(screen.getByTestId('dado-1')).toHaveStyle({ opacity: '0.4' });
    expect(screen.getByTestId('dado-2')).toHaveStyle({ opacity: '1' });

    expect(screen.getByTestId('total')).toHaveTextContent('13');
    const sello = screen.getByText(S.tirada.banda.success);
    expect(sello).toHaveAttribute('data-banda', 'success');
  });

  it('muestra el sello de cada banda', () => {
    const bandas = ['crit', 'success', 'partial', 'failure', 'fumble'] as const;
    for (const band of bandas) {
      render(
        <RollPanel pending={pendiente({ band })} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={vi.fn()} />,
      );
      expect(screen.getByText(S.tirada.banda[band])).toHaveAttribute('data-banda', band);
      cleanup();
    }
  });

  it('ofrece un botón de Fortuna por dado solo si canReroll y llama a onReroll con el índice', () => {
    const onReroll = vi.fn<(i: number) => void>();
    render(
      <RollPanel pending={pendiente({ canReroll: true })} powerName="Conjuro" onReroll={onReroll} onPower={vi.fn()} onContinue={vi.fn()} />,
    );
    const botones = screen.getAllByRole('button', { name: /Fortuna: repetir dado/ });
    expect(botones).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: S.tirada.repetir(2) }));
    expect(onReroll).toHaveBeenCalledWith(1);
    cleanup();

    render(
      <RollPanel pending={pendiente({ canReroll: false })} powerName="Conjuro" onReroll={onReroll} onPower={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /Fortuna: repetir dado/ })).toBeNull();
  });

  it('ofrece el botón de Poder solo si canUsePower y llama a onPower', () => {
    const onPower = vi.fn();
    render(
      <RollPanel
        pending={pendiente({ band: 'failure', canUsePower: true })}
        powerName="Conjuro"
        onReroll={vi.fn()}
        onPower={onPower}
        onContinue={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: S.tirada.poder('Conjuro') }));
    expect(onPower).toHaveBeenCalledTimes(1);
    cleanup();

    render(
      <RollPanel pending={pendiente({ canUsePower: false })} powerName="Conjuro" onReroll={vi.fn()} onPower={onPower} onContinue={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /Usar Poder/ })).toBeNull();
  });

  it('Continuar llama a onContinue', () => {
    const onContinue = vi.fn();
    render(
      <RollPanel pending={pendiente()} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={onContinue} />,
    );
    fireEvent.click(screen.getByRole('button', { name: S.tirada.continuar }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
