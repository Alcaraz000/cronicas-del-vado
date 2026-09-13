/**
 * Si el foco está en un campo de texto (o contenteditable): ahí una tecla de acceso rápido
 * de una sola letra o dígito (1-9 en `OptionList`, C en `EscenaScreen`) no tiene que disparar
 * nada, porque el jugador está escribiendo, no jugando. Compartida por todos los listeners
 * de teclado de la pantalla de juego para que la regla viva en un solo lugar.
 */
export function esCampoDeTexto(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}
