import { useEffect, type RefObject } from 'react';

/**
 * Mueve el foco al título que `ref` señala apenas se monta (o cuando cambia `clave`, para un
 * asistente de varios pasos dentro de la misma pantalla).
 *
 * `ScreenRouter` es un `switch` puro: al cambiar de pantalla, la que se va desmonta entera y
 * el control que tenía el foco desaparece del DOM. El navegador no tiene dónde dejarlo y cae a
 * `<body>`, invisible: un jugador de teclado tiene que volver a tabular desde el principio de
 * la página en CADA pantalla nueva, sin ninguna pista de dónde está parado. `CreacionScreen`
 * tiene el mismo problema puertas adentro: cada paso reemplaza el `<main>` entero, así que el
 * control enfocado del paso anterior también desaparece.
 *
 * El título es el destino porque ya existe, ya anuncia de qué pantalla se trata, y no compite
 * con el orden de tabulación normal: por eso necesita `tabIndex={-1}` en el marcado (foco por
 * programa sí, `Tab` no lo pisa). No se toca en pantallas transitorias sin nada que enfocar
 * (`CargandoScreen`) ni en `EscenaScreen`, donde el contenido cambia de escena en escena sin
 * desmontar la pantalla entera: mover el foco ahí en cada elección es una decisión de diseño
 * propia (¿corta la lectura en curso?), no el mismo arreglo mecánico que acá.
 */
export function useEnfocarAlEntrar(ref: RefObject<HTMLElement | null>, clave?: unknown): void {
  useEffect(() => {
    ref.current?.focus();
    // El ref es estable entre renders; solo `clave` decide cuándo reenfocar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
}
