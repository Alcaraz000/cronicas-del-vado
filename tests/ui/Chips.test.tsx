/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chips, chipsDeTirada } from '@/ui/components/Chips';
import type { RollPreview } from '@/engine/types';

function preview(over: Partial<RollPreview> = {}): RollPreview {
  return {
    attr: 'saber', attrValue: 2, difficulty: 'dificil', difficultyMod: -1,
    veteranMod: 0, totalMod: 1, mode: 'normal', sources: [],
    odds: { success: 0.3, partial: 0.4, failure: 0.3 }, risk: 'arriesgado',
    targetLine: 'Necesitás 8+', ...over,
  };
}

describe('chipsDeTirada', () => {
  it('arma el chip del atributo con su valor y el de la dificultad', () => {
    const chips = chipsDeTirada(preview());
    expect(chips[0]?.texto).toContain('Saber');
    expect(chips[0]?.texto).toContain('+2');
    expect(chips.some((c) => c.texto.includes('Difícil'))).toBe(true);
  });

  it('omite el chip de Veterano cuando el modificador es cero', () => {
    expect(chipsDeTirada(preview()).some((c) => c.texto.includes('Veterano'))).toBe(false);
    expect(chipsDeTirada(preview({ veteranMod: -1 })).some((c) => c.texto.includes('Veterano'))).toBe(true);
  });

  it('marca tachado el origen anulado y le pone el tono que le toca', () => {
    const chips = chipsDeTirada(
      preview({
        mode: 'cancelled',
        sources: [
          { kind: 'advantage', label: 'Aprendiz de escriba', origin: 'trait', cancelled: true },
          { kind: 'disadvantage', label: 'Exhausto', origin: 'condition', cancelled: true },
        ],
      }),
    );
    const ventaja = chips.find((c) => c.texto.includes('Aprendiz de escriba'));
    const desventaja = chips.find((c) => c.texto.includes('Exhausto'));
    expect(ventaja?.tachado).toBe(true);
    expect(ventaja?.tono).toBe('ventaja');
    expect(desventaja?.tachado).toBe(true);
    expect(desventaja?.tono).toBe('desventaja');
  });
});

describe('Chips', () => {
  it('dibuja el tachado con data-tachado, no solo con color', () => {
    render(<Chips chips={[{ texto: 'Exhausto', tono: 'desventaja', tachado: true }]} />);
    expect(screen.getByText('Exhausto')).toHaveAttribute('data-tachado', 'true');
  });
});
