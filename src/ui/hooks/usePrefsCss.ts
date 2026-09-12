import { useEffect } from 'react';
import { useStore } from '@/state/store';

/**
 * Cablea `prefs.fontScale` a la variable CSS `--escala-fuente` en `<html>`, de la que ya
 * dependen `tokens.css` y los módulos que escalan su tipografía de juego. Se llama una sola
 * vez, en la raíz de la app: no hace falta un hook por componente, la variable es global.
 */
export function usePrefsCss(): void {
  const fontScale = useStore((s) => s.prefs.fontScale);

  useEffect(() => {
    document.documentElement.style.setProperty('--escala-fuente', String(fontScale));
  }, [fontScale]);
}
