import type { Item } from '@/content/schema';

/**
 * Los 7 objetos propios de "El vado de Aldamar" (biblia §5).
 *
 * El octavo, `sello_del_vado`, NO está acá: es el único `relic: true` de la campaña y r07 exige que
 * las reliquias vivan en `src/content/world/items.ts`, porque persisten entre campañas por el
 * `reward` de `endings.fin_heredero`. Dentro de la partida se usa como un objeto normal.
 *
 * Economía de la mochila: `LIMITS.maxItems` es 6 y `giveItem` no hace nada, en silencio, si está
 * llena. El peor caso de cualquier ruta es 5 de 6 (biblia §5, tablas por rama), así que queda una
 * ranura de margen: ninguna llave narrativa puede depender de que haya lugar.
 */
export const items: Record<string, Item> = {
  carta_lacrada: {
    id: 'carta_lacrada',
    name: 'Carta lacrada de Berta',
    icon: 'carta_lacrada',
    description:
      'La carta que te trajo hasta acá: el lacre de la alcaldesa todavía entero, la promesa de plata y once días de ausencia escritos con buena letra. Es el objeto que más trabaja y el más perdible: se gasta dándosela a Orell para cruzar, mostrándosela a Dravos, mojándola en el vado o cuando Berta te la arranca de la mano.',
    advantageTags: ['social'],
  },
  farol_de_sebo: {
    id: 'farol_de_sebo',
    name: 'Farol de sebo',
    icon: 'farol_de_sebo',
    description:
      'Un farol de sebo con el vidrio ahumado. Alumbra poco y huele peor, pero alcanza para ver lo que nadie quiso dejar a la vista. Se te cae al charco del sótano, o lo dejás colgado en el poste del relevo.',
    advantageTags: ['percepcion'],
  },
  palanca_de_molino: {
    id: 'palanca_de_molino',
    name: 'Palanca de molino',
    icon: 'palanca_de_molino',
    description:
      'Una barra de hierro de las que usan para levantar la muela. Abre la trampilla sin pedirle permiso a nadie y se consume al bajar: queda trabando la tapa para que no se cierre sola.',
    advantageTags: ['fisico'],
  },
  cuerda_de_molinero: {
    id: 'cuerda_de_molinero',
    name: 'Cuerda de molinero',
    icon: 'cuerda_de_molinero',
    description:
      'Cuerda de sirga, gruesa y áspera, con un nudo cada tantos palmos para el agarre. Sirve para atarse al sauce partido y cruzar el vado con el agua encima de las piedras.',
    advantageTags: ['huida', 'supervivencia'],
  },
  cuaderno_de_tome: {
    id: 'cuaderno_de_tome',
    name: 'El cuaderno de Tomé',
    icon: 'cuaderno_de_tome',
    description:
      'Once días de anotaciones de molinero, medidas en dedos de agua, con la letra cada vez más corta hasta quedar en una línea por página. Es lo más parecido que hay a oírlo hablar.',
    advantageTags: ['saber'],
  },
  medallon_de_tome: {
    id: 'medallon_de_tome',
    name: 'El medallón de Tomé',
    icon: 'medallon_de_tome',
    description:
      'Una esquirla de piedra gris colgada de un cordón de cuero, con el borde todavía vivo del cincel. Es el pedazo que le falta al sello: sin ella la piedra cierra mal, y el río baja pero no del todo.',
    advantageTags: ['magia'],
  },
  carta_de_halvar: {
    id: 'carta_de_halvar',
    name: 'La carta de Halvar',
    icon: 'carta_de_halvar',
    description:
      'Una carta comercial, cortés hasta el empalago, con la cesión del paso anotada al margen y una fecha anterior a la carta que te trajo a vos. Es la traición de Berta por escrito, y se usa: no se colecciona.',
    advantageTags: ['social'],
  },
};
