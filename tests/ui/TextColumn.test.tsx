/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LogEntry } from '@/engine/types';
import { TextColumn } from '@/ui/components/TextColumn';

const log: LogEntry[] = [{ kind: 'scene', sceneId: 'p_umbral', paragraphs: [{ text: 'Cruzás el vado.' }], hashes: [] }];

describe('TextColumn', () => {
  it('lleva aria-live polite y no atómico, para que un lector de pantalla anuncie la prosa que va apareciendo', () => {
    render(<TextColumn log={log} />);
    const columna = screen.getByTestId('columna-texto');
    expect(columna).toHaveAttribute('aria-live', 'polite');
    expect(columna).toHaveAttribute('aria-atomic', 'false');
  });
});
