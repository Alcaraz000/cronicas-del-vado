/**
 * Cuántos modales hay abiertos ahora mismo, para que los atajos de teclado de la pantalla de
 * juego no sigan disparando por detrás de uno.
 *
 * Los tres listeners de la pantalla de juego (1-9 en `OptionList`, C en `EscenaScreen` y
 * Enter/Espacio del revelado) escuchan en `window`: un modal dibujado encima no los tapa, por
 * más `aria-modal="true"` que declare. Hasta la tarea 6 eso no se notaba porque la
 * confirmación de escena mortal era `window.confirm`, que bloquea el hilo; al reemplazarla por
 * `Dialogo` los atajos quedaron vivos debajo de la confirmación, y en un juego con muerte
 * permanente eso significa que un dígito ejecuta otra opción mientras el jugador está mirando
 * el "¿seguro?".
 *
 * Es un contador y no un booleano porque puede haber más de un modal a la vez (la Ficha
 * abierta y encima una confirmación): con un booleano, cerrar el de arriba diría que ya no hay
 * ninguno. Y vive acá, en un módulo al lado de `teclado.ts`, por el mismo motivo que
 * `esCampoDeTexto`: la regla se escribe una sola vez y los tres listeners la comparten.
 *
 * Quien registra no es cada modal a mano sino `useTrampaDeFoco`, que ya es el único lugar por
 * el que pasan todos: así un modal nuevo queda contado por el solo hecho de atrapar el foco,
 * sin que nadie se acuerde de sumarlo.
 */
let abiertos = 0;

/** ¿Hay algún modal abierto? Los atajos de la pantalla de juego salen temprano si es que sí. */
export function hayModalAbierto(): boolean {
  return abiertos > 0;
}

/**
 * Suma un modal al contador y devuelve la función que lo resta. Pensada para usarse como
 * valor de retorno de un `useEffect`: React la llama al cerrarse o al desmontar. Restar dos
 * veces no baja el contador de más (el cierre es idempotente), así que un doble montaje del
 * modo estricto de React no lo deja en negativo.
 */
export function marcarModalAbierto(): () => void {
  abiertos += 1;
  let cerrado = false;
  return () => {
    if (cerrado) return;
    cerrado = true;
    abiertos -= 1;
  };
}
