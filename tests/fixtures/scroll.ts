/**
 * Espía de `scrollIntoView`, compartido por los tests que verifican que algo se trae a la vista.
 *
 * jsdom no implementa `scrollIntoView` —por eso el código de la app lo llama detrás de un
 * `typeof === 'function'`— así que acá se instala uno que solo anota sobre qué elemento se llamó.
 * Vive en un fixture y no copiado en cada archivo porque ya lo usan dos (`EscenaScreen.test.tsx`
 * para afirmar que las opciones NO se scrollean, `TextColumn.test.tsx` para afirmar que el ancla
 * del final SÍ), y las dos puntas tienen que espiar lo mismo.
 */
export interface ScrollEspiado extends Array<Element> {
  restaurar: () => void;
}

export function espiarScrollIntoView(): ScrollEspiado {
  const vistos = [] as unknown as ScrollEspiado;
  // Vía `Reflect` y no por asignación directa: en el tipo de `Element` la propiedad no es
  // opcional, así que no se puede borrar para dejar el prototipo como estaba.
  const original: unknown = Reflect.get(Element.prototype, 'scrollIntoView');
  Reflect.set(Element.prototype, 'scrollIntoView', function (this: Element): void {
    vistos.push(this);
  });
  vistos.restaurar = (): void => {
    if (original === undefined) Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    else Reflect.set(Element.prototype, 'scrollIntoView', original);
  };
  return vistos;
}
