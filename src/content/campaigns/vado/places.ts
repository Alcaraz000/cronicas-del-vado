import type { Place } from '@/content/schema';

/**
 * Los 8 lugares de "El vado de Aldamar" (biblia §4).
 *
 * Presupuesto de arte cerrado: **8 bases + 4 variantes**, y las cuatro variantes son
 * re-iluminaciones de la misma composición (`puente_viejo.amanecer`, `vado_oculto.crecido`,
 * `aldamar_plaza.tormenta`, `molino_de_tome.inundado`). Un interior distinto no es una variante:
 * es otra escena en el mismo lugar, diferenciada por prosa.
 *
 * Por eso `salon`, `trastienda`, `despacho`, `patio`, `cuartel`, `escritorio`, `rueda`, `piedra`,
 * `alba`, `dia`, `ronda`, `callejon` y `embarcadero` NO existen como `variant`, y `noche` tampoco:
 * la noche es la imagen base de los ocho.
 */
export const places: Record<string, Place> = {
  puente_viejo: {
    id: 'puente_viejo',
    name: 'El puente viejo',
    background: 'puente_viejo',
    variants: {
      amanecer: 'puente_viejo.amanecer',
    },
    canonPrompt:
      'Old stone bridge over a wide brown river at night, seen from a muddy road in the foreground, three arches, a barricade of planks and barrels across the near end, two lanterns hanging on poles, a squat square guard tower at the far end, a dark village of shuttered houses beyond. Heavy rain, low black clouds. No figures. Palette: wet slate, black water, amber lantern light.',
  },
  vado_oculto: {
    id: 'vado_oculto',
    name: 'El vado oculto',
    background: 'vado_oculto',
    variants: {
      crecido: 'vado_oculto.crecido',
    },
    canonPrompt:
      'Hidden river ford at night, a lightning-split willow leaning over the bank, flat stepping stones breaking the black water, reed beds on both sides, a low gravel spit, far hills as a flat silhouette. Overcast moonlight. No figures. Palette: black-green water, silver moon, dead willow grey.',
  },
  aldamar_plaza: {
    id: 'aldamar_plaza',
    name: 'La plaza de Aldamar',
    background: 'aldamar_plaza',
    variants: {
      tormenta: 'aldamar_plaza.tormenta',
    },
    canonPrompt:
      'Muddy village square of a river frontier town at night, a stone well with a cut rope in the centre, low timber-and-daub houses with steep shingle roofs, three windows lit warm amber, a leaning notice post, the black bulk of a watermill across the water at the far end. Light rain, puddles reflecting the lit windows. No figures. Palette: mud brown, wet black timber, amber window light.',
  },
  taberna_ancla_seca: {
    id: 'taberna_ancla_seca',
    name: 'El Ancla Seca',
    background: 'taberna_ancla_seca',
    canonPrompt:
      'Interior of a small river tavern, heavy low beams, a rusted iron ship anchor hanging from the main beam, long trestle tables, a smoky hearth on the left, a plank bar with clay jugs, a closed back door with a bench beside it, fishing floats and a broken oar on the wall. Tallow candles, thick smoky air. No figures. Palette: smoke brown, ember orange, rust, dirty cream plaster.',
  },
  casa_de_berta: {
    id: 'casa_de_berta',
    name: 'La casa de la alcaldesa',
    background: 'casa_de_berta',
    canonPrompt:
      'Interior of a village mayor’s house, two-storey stair in the background, whitewashed walls covered in overlapping river maps pinned in layers, a broad writing table with sealed letters, a wax seal press and a brass candlestick, a tall stone hearth burning well, a locked oak chest. Warm even candlelight. No figures. Palette: beeswax gold, dry parchment, dark oak, whitewash.',
  },
  molino_de_tome: {
    id: 'molino_de_tome',
    name: 'El molino de Tomé',
    background: 'molino_de_tome',
    variants: {
      inundado: 'molino_de_tome.inundado',
    },
    canonPrompt:
      'Interior of a working watermill at night, the great wooden gear wheel and millstone in the centre, a stack of burst flour sacks, a wooden stair to a loft, a trapdoor in the plank floor with a hasp, flour dust hanging in a single lantern beam, the wet mill race visible through an open hatch. No figures. Palette: flour white, wet oak black, lantern amber, green river damp.',
  },
  sotano_del_sello: {
    id: 'sotano_del_sello',
    name: 'El sótano del sello',
    background: 'sotano_del_sello',
    canonPrompt:
      'Round underground stone chamber older than the building above it, carved spiral channels in the floor leading to a central socket, a shallow ring of standing water, a wooden ladder coming down through a trapdoor, chalk writing scrawled across one curved wall, roots pushing between the blocks. Cold blue light from above, one lantern on the floor. No figures. Palette: cold grey stone, chalk white, black water, faint green moss.',
  },
  torre_de_dravos: {
    id: 'torre_de_dravos',
    name: 'La torre de la guardia',
    background: 'torre_de_dravos',
    canonPrompt:
      'Interior of a square stone guard tower command room, a heavy campaign table with unrolled charts and a stack of sealed letters, a brass brazier of coals, a rack of crossbows on the wall, an untouched camp bed, a narrow arrow-slit window showing black river and rain, a strongbox under the table. Tallow lamp light, cold stone. No figures. Palette: cold grey stone, ember red, ink black, brass.',
  },
};
