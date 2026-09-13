import { useEffect, useState } from 'react';
import { useStore } from '@/state/store';

const CONSULTA = '(prefers-reduced-motion: reduce)';

/**
 * ¿Hay que mostrar el resultado sin animarlo? `prefs.reducedMotion` en 'on' manda siempre;
 * en 'auto' decide el sistema. jsdom no implementa matchMedia: la guarda es necesaria, no
 * defensiva de más.
 */
export function useReducedMotion(): boolean {
  const preferencia = useStore((s) => s.prefs.reducedMotion);
  const [sistema, setSistema] = useState<boolean>(() => window.matchMedia?.(CONSULTA).matches ?? false);

  useEffect(() => {
    const mq = window.matchMedia?.(CONSULTA);
    if (mq === undefined) return;
    const alCambiar = (e: MediaQueryListEvent): void => setSistema(e.matches);
    mq.addEventListener('change', alCambiar);
    setSistema(mq.matches);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  return preferencia === 'on' || sistema;
}
