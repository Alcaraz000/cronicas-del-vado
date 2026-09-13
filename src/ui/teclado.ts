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

/**
 * Controles que ya tienen su propia activación por teclado: un botón, un enlace, un `summary`,
 * algo con `role="button"`. El navegador convierte el Enter (o el Espacio) que reciben en un
 * click sobre ellos, y ese click sintetizado es lo ÚNICO que los activa desde el teclado.
 *
 * Por eso el listener de Enter/Espacio de `EscenaScreen` —que vive en `window` y ve todo lo que
 * burbujea— tiene que dejarlos pasar enteros: ni `preventDefault()`, que cancela el click antes
 * de que exista, ni `avanzar()`, que además le robaría la tecla al control enfocado. Sin esta
 * guarda, con cualquier botón de la escena enfocado dejan de andar las opciones, la barra,
 * "Saltar lo leído" y "Continuar" del panel de tirada — y ese último no tiene atajo alternativo,
 * porque mientras hay una tirada pendiente `OptionList` ni se dibuja.
 *
 * Es la guarda hermana de `esCampoDeTexto` y vive al lado por el mismo motivo: los listeners de
 * la pantalla de juego comparten una sola definición de "esta tecla no es mía".
 *
 * No es la misma lista que `ENFOCABLE` de `useTrampaDeFoco`, aunque se parezcan: ahí la
 * pregunta es qué puede recibir el foco dentro de un modal, y acá es qué se activa solo con
 * esta tecla. Un `[tabindex]` suelto entra en la primera y no en la segunda.
 */
const CONTROL_ACTIVABLE = 'a[href], button, input, select, summary, textarea, [role="button"], [role="link"]';

export function esControlActivable(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CONTROL_ACTIVABLE) !== null;
}
