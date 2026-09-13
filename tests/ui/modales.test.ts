import { describe, expect, it } from 'vitest';
import { hayModalAbierto, marcarModalAbierto } from '@/ui/modales';

/**
 * El contador es estado de módulo, así que una fuga acá no rompe un caso: apaga TODO el
 * teclado de la pantalla de juego, en silencio y para siempre. Por eso se prueba solo, además
 * de los tests de `EscenaScreen` que lo ejercitan de punta a punta.
 */
describe('modales', () => {
  it('sin modales abiertos no hay ninguno', () => {
    expect(hayModalAbierto()).toBe(false);
  });

  it('abrir y cerrar deja el contador donde estaba', () => {
    const cerrar = marcarModalAbierto();
    expect(hayModalAbierto()).toBe(true);
    cerrar();
    expect(hayModalAbierto()).toBe(false);
  });

  it('con dos modales encimados, cerrar el de arriba no dice que ya no hay ninguno', () => {
    // El caso que un booleano no podría representar: la Ficha abierta y una confirmación
    // encima. Al cerrar la confirmación el teclado tiene que seguir bloqueado.
    const cerrarFicha = marcarModalAbierto();
    const cerrarConfirmacion = marcarModalAbierto();

    cerrarConfirmacion();
    expect(hayModalAbierto()).toBe(true);

    cerrarFicha();
    expect(hayModalAbierto()).toBe(false);
  });

  it('cerrar dos veces el mismo modal no deja el contador en negativo', () => {
    // El modo estricto de React monta, desmonta y vuelve a montar: el cierre tiene que ser
    // idempotente o el contador se va abajo de cero y ningún modal vuelve a bloquear nada.
    const cerrar = marcarModalAbierto();
    const otro = marcarModalAbierto();
    cerrar();
    cerrar();
    expect(hayModalAbierto()).toBe(true);

    otro();
    expect(hayModalAbierto()).toBe(false);
  });
});
