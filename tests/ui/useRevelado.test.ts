/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRevelado } from '@/ui/hooks/useRevelado';
import type { LogEntry, SeenMap } from '@/engine/types';

const escena = (paragraphs: string[], hashes: string[]): LogEntry => ({
  kind: 'scene',
  sceneId: 'm_inicio',
  paragraphs: paragraphs.map((text) => ({ text })),
  hashes,
});

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useRevelado', () => {
  it('instantáneo muestra todo desde el primer render', () => {
    const log = [escena(['uno', 'dos'], ['h1', 'h2'])];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: true }));
    expect(result.current.parrafosVisibles).toBe(2);
    expect(result.current.terminado).toBe(true);
  });

  it('revela carácter por carácter al ritmo de cps', () => {
    const log = [escena(['abcdefgh'], ['h1'])];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    expect(result.current.caracteresVisibles).toBe(0);
    act(() => { vi.advanceTimersByTime(100); }); // 4 caracteres a 40 cps
    expect(result.current.caracteresVisibles).toBe(4);
    expect(result.current.terminado).toBe(false);
  });

  it('avanzar completa el párrafo en curso y el segundo avanza al siguiente', () => {
    const log = [escena(['abcdefgh', 'segundo'], ['h1', 'h2'])];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    act(() => { result.current.avanzar(); });
    expect(result.current.parrafosVisibles).toBe(0);
    expect(result.current.caracteresVisibles).toBe(8);
    act(() => { result.current.avanzar(); });
    expect(result.current.parrafosVisibles).toBe(1);
    expect(result.current.caracteresVisibles).toBe(0);
  });

  it('al terminar el último párrafo queda terminado', () => {
    const log = [escena(['ab'], ['h1'])];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.terminado).toBe(true);
    expect(result.current.parrafosVisibles).toBe(1);
  });

  it('una entrada nueva en el log reinicia el revelado', () => {
    const primera = [escena(['ab'], ['h1'])];
    const { result, rerender } = renderHook((props: { log: LogEntry[] }) =>
      useRevelado({ log: props.log, seen: {}, cps: 40, instantaneo: false }), { initialProps: { log: primera } });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.terminado).toBe(true);
    rerender({ log: [...primera, escena(['cdef'], ['h2'])] });
    expect(result.current.terminado).toBe(false);
    expect(result.current.caracteresVisibles).toBe(0);
  });

  it('si la última entrada no lleva prosa, no hay nada que revelar', () => {
    const log: LogEntry[] = [
      escena(['ab'], ['h1']),
      { kind: 'choice', sceneId: 'm_inicio', choiceId: 'partir', label: 'Partir' },
    ];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    expect(result.current.terminado).toBe(true);
  });

  it('ofrece saltar leído solo si el párrafo en curso ya se leyó antes', () => {
    const seen: SeenMap = { m_inicio: ['h1'] };
    const sinLeer = renderHook(() => useRevelado({ log: [escena(['ab'], ['hX'])], seen, cps: 40, instantaneo: false }));
    expect(sinLeer.result.current.puedeSaltarLeido).toBe(false);
    const leido = renderHook(() => useRevelado({ log: [escena(['ab'], ['h1'])], seen, cps: 40, instantaneo: false }));
    expect(leido.result.current.puedeSaltarLeido).toBe(true);
  });

  it('saltar leído frena EXACTAMENTE en el primer párrafo no leído', () => {
    const seen: SeenMap = { m_inicio: ['h1', 'h2'] };
    const log = [escena(['viejo uno', 'viejo dos', 'variante nueva', 'viejo tres'], ['h1', 'h2', 'hNUEVO', 'h3'])];
    const { result } = renderHook(() => useRevelado({ log, seen, cps: 40, instantaneo: false }));
    act(() => { result.current.saltarLeido(); });
    expect(result.current.parrafosVisibles).toBe(2);
    expect(result.current.caracteresVisibles).toBe(0);
    expect(result.current.terminado).toBe(false);
  });

  it('si toda la entrada ya se leyó, saltar leído la muestra entera', () => {
    const seen: SeenMap = { m_inicio: ['h1', 'h2'] };
    const { result } = renderHook(() =>
      useRevelado({ log: [escena(['uno', 'dos'], ['h1', 'h2'])], seen, cps: 40, instantaneo: false }));
    act(() => { result.current.saltarLeido(); });
    expect(result.current.terminado).toBe(true);
  });

  it('una entrada de desenlace no ofrece saltar leído: no lleva hashes', () => {
    const log: LogEntry[] = [{ kind: 'outcome', paragraphs: [{ text: 'Cae la piedra.' }] }];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    expect(result.current.puedeSaltarLeido).toBe(false);
  });
});
