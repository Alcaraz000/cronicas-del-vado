/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from '@/ui/hooks/useReducedMotion';
import { usePrefsCss } from '@/ui/hooks/usePrefsCss';
import { useStore } from '@/state/store';

function conMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  useStore.getState().setPrefs({ reducedMotion: 'auto', fontScale: 1, cps: 40 });
});

describe('useReducedMotion', () => {
  it('con prefs en auto sigue al sistema', () => {
    conMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
    conMedia(false);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });

  it('con prefs en on ignora al sistema', () => {
    conMedia(false);
    useStore.getState().setPrefs({ reducedMotion: 'on' });
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });

  it('sin matchMedia en el entorno no explota y devuelve false', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });
});

describe('usePrefsCss', () => {
  it('escribe la escala de fuente como variable CSS en la raíz', () => {
    useStore.getState().setPrefs({ fontScale: 1.25 });
    renderHook(() => usePrefsCss());
    expect(document.documentElement.style.getPropertyValue('--escala-fuente')).toBe('1.25');
  });
});
