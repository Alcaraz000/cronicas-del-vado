import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { ScreenRouter } from '@/app/ScreenRouter';
import { usePrefsCss } from '@/ui/hooks/usePrefsCss';
import { S } from '@/ui/strings.es';
import '@/app/tokens.css';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de render', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div role="alert" style={{ padding: 'var(--esp-6)', fontFamily: 'var(--fuente-ui)' }}>
          <h1>{S.error.titulo}</h1>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {S.error.recargar}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RELOAD_FLAG = 'juegorol:preload-reload';
const RELOAD_FLAG_TTL_MS = 10_000;

/**
 * Tras un deploy los chunks cambian de nombre y un import() dinámico viejo falla.
 * Vite emite `vite:preloadError`; recargamos UNA vez (flag en sessionStorage) y,
 * si la app vive 10 s sin problemas, borramos el flag para el próximo deploy.
 */
export function usePreloadErrorReload(): void {
  useEffect(() => {
    const onPreloadError = (event: Event): void => {
      let yaRecargado = false;
      try {
        yaRecargado = sessionStorage.getItem(RELOAD_FLAG) === '1';
      } catch {
        yaRecargado = false;
      }
      if (yaRecargado) return; // segunda vez: dejamos que el error llegue al ErrorBoundary / pantalla error
      event.preventDefault();
      try {
        sessionStorage.setItem(RELOAD_FLAG, '1');
      } catch {
        // sin sessionStorage recargamos igual; en el peor caso el usuario ve la pantalla de error
      }
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', onPreloadError);
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        // ignorar
      }
    }, RELOAD_FLAG_TTL_MS);
    return () => {
      window.removeEventListener('vite:preloadError', onPreloadError);
      window.clearTimeout(timer);
    };
  }, []);
}

export function App() {
  usePreloadErrorReload();
  usePrefsCss();
  return (
    <ErrorBoundary>
      <ScreenRouter />
    </ErrorBoundary>
  );
}

export default App;
