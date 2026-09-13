/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LogEntry } from '@/engine/types';
import { TextColumn } from '@/ui/components/TextColumn';
import type { Revelado } from '@/ui/hooks/useRevelado';

const log: LogEntry[] = [{ kind: 'scene', sceneId: 'p_umbral', paragraphs: [{ text: 'Cruzás el vado.' }], hashes: [] }];

/** Un `Revelado` de mentira, para fijar cómo se porta la columna en cada momento del tipeo. */
function revelado(overrides: Partial<Revelado> = {}): Revelado {
  return {
    parrafosVisibles: 0,
    caracteresVisibles: 0,
    terminado: false,
    puedeSaltarLeido: false,
    avanzar: vi.fn(),
    saltarLeido: vi.fn(),
    ...overrides,
  };
}

describe('TextColumn', () => {
  it('es una región viva educada: polite y no atómica', () => {
    render(<TextColumn log={log} />);
    const columna = screen.getByTestId('columna-texto');
    expect(columna).toHaveAttribute('aria-live', 'polite');
    expect(columna).toHaveAttribute('aria-atomic', 'false');
  });

  it('mientras la máquina de escribir tipea, la región queda ocupada y el lector no deletrea', () => {
    // El nodo de texto del párrafo en curso cambia una vez por carácter, a 40 cps. Sin
    // `aria-busy`, la región viva reanuncia ese nodo en cada cambio y el lector de pantalla
    // termina leyendo "L", "La", "La c", "La cr"… en vez de la prosa.
    render(<TextColumn log={log} revelado={revelado({ terminado: false, caracteresVisibles: 4 })} />);
    expect(screen.getByTestId('columna-texto')).toHaveAttribute('aria-busy', 'true');
  });

  it('al terminar de revelar, la región se libera y recién ahí se anuncia el texto', () => {
    render(<TextColumn log={log} revelado={revelado({ terminado: true, parrafosVisibles: 1 })} />);
    expect(screen.getByTestId('columna-texto')).toHaveAttribute('aria-busy', 'false');
  });

  it('sin revelado (el fin, que no anima nada) la región nunca está ocupada', () => {
    render(<TextColumn log={log} />);
    expect(screen.getByTestId('columna-texto')).toHaveAttribute('aria-busy', 'false');
  });
});
