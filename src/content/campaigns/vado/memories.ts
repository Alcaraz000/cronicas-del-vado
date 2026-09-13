/**
 * Lo que el personaje recuerda del vado, en voz del narrador. Una línea por flag de canon
 * declarado en `flags.ts` (6 del personaje, 2 del mundo), que es lo que exige r12.
 *
 * Estas líneas las lee el jugador en la Ficha meses después, cuando ya no se acuerda de
 * la partida: dicen QUÉ pasó, nunca cómo se prendió el flag ni qué escena lo escribió.
 */
export const memories: Record<string, string> = {
  'char:vado.sabe_del_sello':
    'Supiste qué era en realidad el sello del vado: no la piedra, sino lo que la crecida guarda debajo.',
  'char:vado.tome_enterrado': 'Le diste sepultura a Tomé en la vega, con el agua subiéndote a las botas.',
  'char:vado.sello_hundido': 'Devolviste el sello a su piedra y viste bajar el río.',
  'char:vado.vendido': 'Dejaste que el sello cruzara el río en el carro de un mercader.',
  'char:vado.vinculo_ilse': 'Abriste el sello junto a Ilse, y en Aldamar todavía se dice que fueron los dos.',
  'char:vado.heredero': 'Te llevaste el sello del vado, y nadie en Aldamar sabe que lo tenés.',
  'world:vado.aldamar_inundada': 'La vega de Aldamar quedó bajo el agua. El vado no se cruza más.',
  'world:vado.sello_perdido': 'El sello ya no está en el vado.',
};
