import { useCallback, useEffect, type RefObject } from 'react';
import { marcarModalAbierto } from '@/ui/modales';

const ENFOCABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Trampa de foco compartida por los paneles y diálogos modales del juego (`Cajon`,
 * `Dialogo`, `OpcionesModal`): al abrirse mueve el foco al primer elemento enfocable de
 * `panel`, atrapa Tab/Shift+Tab para que no se escape mientras está abierto, cierra con Esc,
 * y devuelve el foco a donde estaba cuando se cierra.
 *
 * El primer elemento enfocable lo decide el orden del DOM: si un componente necesita que
 * el foco arranque en un botón particular (como `Dialogo` con "cancelar"), alcanza con
 * ponerlo primero en el marcado.
 *
 * Además anota el modal en `ui/modales.ts` mientras está abierto. El foco atrapado frena al
 * teclado que NAVEGA (Tab), pero no al que ACTÚA: los atajos de la pantalla de juego escuchan
 * en `window` y seguirían eligiendo opciones por detrás del modal. Registrarlo acá —y no en
 * cada componente— es lo que hace que todo modal quede contado por el solo hecho de atrapar
 * el foco, sin depender de que alguien se acuerde.
 */
export function useTrampaDeFoco<T extends HTMLElement>(
  panel: RefObject<T | null>,
  abierto: boolean,
  onCerrar: () => void,
): void {
  useEffect(() => {
    if (!abierto) return;
    return marcarModalAbierto();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const primero = panel.current?.querySelector<HTMLElement>(ENFOCABLE);
    (primero ?? panel.current)?.focus();
    return () => {
      anterior?.focus();
    };
  }, [abierto, panel]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCerrar();
        return;
      }
      if (event.key !== 'Tab') return;
      const enfocables = [...(panel.current?.querySelectorAll<HTMLElement>(ENFOCABLE) ?? [])];
      if (enfocables.length === 0) return;
      const primero = enfocables[0]!;
      const ultimo = enfocables[enfocables.length - 1]!;
      const activo = document.activeElement;
      if (event.shiftKey && (activo === primero || !panel.current?.contains(activo))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (activo === ultimo || !panel.current?.contains(activo))) {
        event.preventDefault();
        primero.focus();
      }
    },
    [onCerrar, panel],
  );

  useEffect(() => {
    if (!abierto) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [abierto, onKeyDown]);
}
