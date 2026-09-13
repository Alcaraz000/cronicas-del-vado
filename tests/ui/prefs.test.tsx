/** @vitest-environment jsdom */
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from '@/ui/hooks/useReducedMotion';
import { usePrefsCss } from '@/ui/hooks/usePrefsCss';
import { useStore } from '@/state/store';

/**
 * Stub de `matchMedia` que siempre devuelve el mismo `MediaQueryList` simulado (así el
 * `useEffect` del hook y la lectura inicial ven el mismo objeto) y guarda el listener de
 * 'change' que le registren, para poder dispararlo desde el test con `disparar` y probar
 * la suscripción real, no solo el valor inicial.
 */
function conMedia(matches: boolean): { disparar: (matches: boolean) => void } {
  let listener: ((e: MediaQueryListEvent) => void) | null = null;
  const mql = {
    matches,
    media: '',
    onchange: null,
    addEventListener: (_evento: string, cb: (e: MediaQueryListEvent) => void) => {
      listener = cb;
    },
    removeEventListener: () => {
      listener = null;
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  vi.stubGlobal('matchMedia', () => mql);
  return {
    disparar: (nuevoMatches: boolean) => {
      mql.matches = nuevoMatches;
      listener?.({ matches: nuevoMatches } as MediaQueryListEvent);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  useStore.getState().setPrefs({ reducedMotion: 'auto', fontScale: 1, cps: 40 });
  // `usePrefsCss` escribe en `document.documentElement`, que no lo limpia `tests/setup.ts`
  // (solo hace `cleanup()` del DOM montado por Testing Library): sin esto, un test de este
  // archivo le deja `--escala-fuente` puesta al que corra después.
  document.documentElement.style.removeProperty('--escala-fuente');
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

  it('una misma instancia se entera cuando el sistema cambia de preferencia', () => {
    const { disparar } = conMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      disparar(true);
    });

    expect(result.current).toBe(true);
  });
});

describe('usePrefsCss', () => {
  it('escribe la escala de fuente como variable CSS en la raíz', () => {
    useStore.getState().setPrefs({ fontScale: 1.25 });
    renderHook(() => usePrefsCss());
    expect(document.documentElement.style.getPropertyValue('--escala-fuente')).toBe('1.25');
  });

  it('todo font-size de la interfaz multiplica por --escala-fuente', () => {
    // La preferencia de tamaño de letra no sirve de nada en los lugares donde no llega, y son
    // justo los textos más chicos de la pantalla (chips, barra de estado, panel de tirada) los
    // que más falta le hacen a quien pide 150 %. Este barrido evita que la próxima regla de
    // `font-size` nazca sin la escala.
    const modulos = globSync('src/ui/**/*.module.css', { cwd: process.cwd() });
    expect(modulos.length).toBeGreaterThan(0);

    const sinEscala: string[] = [];
    for (const relativo of modulos) {
      const css = readFileSync(resolve(process.cwd(), relativo), 'utf8');
      for (const [declaracion = ''] of css.matchAll(/font-size:[^;]+;/g)) {
        if (!declaracion.includes('--escala-fuente')) sinEscala.push(`${relativo}: ${declaracion}`);
      }
    }

    expect(sinEscala).toEqual([]);
  });
});
