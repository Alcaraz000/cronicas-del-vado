/**
 * Genera `art/manifest.generated.json` leyendo el CONTENIDO, no una lista a mano.
 *
 * La spec §7 lo pide así: el manifiesto es derivado, nunca se edita, y falla si un id
 * que estaba curado desapareció del contenido. Cada entrada lleva el prompt completo
 * (el estilo por tipo + el `canonPrompt` de la entidad), el tamaño y la semilla.
 *
 *   npx tsx art/manifest.mts
 */
import { writeFileSync } from 'node:fs';
import { CLASSES } from '../src/content/catalog';
import { campaign } from '../src/content/campaigns/vado/campaign';
import { WORLD } from '../src/content/world';

/** Estilo por tipo de imagen. Sale de `art/style.md`, congelado tras la prueba de estilo. */
const ESTILO = {
  base:
    'painterly digital illustration, semi-realistic fantasy concept art, oil painting texture, ' +
    'visible brushwork, dramatic chiaroscuro lighting, muted earthy palette with warm lantern accents, ' +
    'medieval european setting, painted by a concept artist for a dark fantasy game',
  negativoBase:
    'photo, photorealistic, 3d render, cgi, anime, manga, cartoon, cel shading, flat vector, ' +
    'smooth airbrush, plastic skin, text, watermark, signature, logo, blurry, lowres, ' +
    'extra limbs, deformed hands, oversaturated, neon colors, modern clothing',
  // El encuadre se repite dos veces porque el modelo se va a plano de cintura (art/style.md).
  retrato: 'head and shoulders only, tight crop at the collarbone, three quarter view, plain dark vignette background, no architecture, no scenery',
  retratoNegativo: 'full body, waist up, architecture, buildings, scenery, landscape, props, weapons in frame',
  fondo: 'wide establishing shot, no people, no figures',
  fondoNegativo: 'people, figures, characters, portrait, close-up',
  // Sin "studio lighting" ni "object study": empujan a foto de producto (art/style.md).
  objeto: 'single object centered on a plain flat grey background, no scenery, no props, no decoration, painted item icon',
  objetoNegativo: 'scenery, background objects, foliage, plants, palm leaves, lanterns, table, cloth, hands, multiple objects, collage, border, frame',
} as const;

interface Entrada {
  id: string;
  tipo: 'retrato' | 'fondo' | 'objeto' | 'portada' | 'sprite';
  prompt: string;
  negativo: string;
  width: number;
  height: number;
  seed: number;
}

/** Semilla estable por id: misma entidad, misma semilla, aunque cambie el orden del manifiesto. */
function semilla(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1_000_000;
}

const entradas: Entrada[] = [];

// Retratos de PNJ: los de la campaña y los compartidos del mundo.
for (const npc of [...Object.values(campaign.npcs), ...Object.values(WORLD.npcs)]) {
  entradas.push({
    id: npc.portrait,
    tipo: 'retrato',
    prompt: `${ESTILO.base}, ${ESTILO.retrato}, ${npc.canonPrompt}`,
    negativo: `${ESTILO.negativoBase}, ${ESTILO.retratoNegativo}`,
    width: 896,
    height: 1152,
    seed: semilla(npc.portrait),
  });
  // El sprite de escena de este mismo PNJ: mismo id y misma semilla que su retrato porque
  // no se genera de nuevo, se recorta con alfa (`art/recorte.mts`) del mismo máster que ya
  // existe en `art/masters/retrato/<id>/`. `prompt`/`negativo` quedan documentados por si
  // algún día hace falta regenerar el máster, pero el recorte no los usa.
  entradas.push({
    id: npc.portrait,
    tipo: 'sprite',
    prompt: `${ESTILO.base}, ${ESTILO.retrato}, ${npc.canonPrompt}`,
    negativo: `${ESTILO.negativoBase}, ${ESTILO.retratoNegativo}`,
    width: 896,
    height: 1152,
    seed: semilla(npc.portrait),
  });
}

// Retratos de jugador: 3 por clase, los que ofrece la creación de personaje.
const RASGOS_JUGADOR: Record<string, string[]> = {
  guerrero: [
    'a broad-shouldered woman in her thirties, short cropped hair, a broken nose, scarred leather jerkin over mail',
    'a heavy-set man in his forties, thick beard, shaved temples, a padded gambeson with old bloodstains',
    'a wiry young fighter, androgynous, close-shorn head, a livid burn scar down one cheek, studded leather',
  ],
  explorador: [
    'a lean woman in her late twenties, weathered face, a long dark braid, oiled hood and a quiver strap',
    'a grey-eyed man in his thirties, stubble, a fur-lined collar, a coil of rope across the chest',
    'a young androgynous tracker, freckled, hair tied back with cord, patched green wool cloak',
  ],
  mago: [
    'a pale scholar in their late twenties, androgynous, ink-stained fingers, close-cropped hair, worn indigo travelling robe',
    'an older woman with iron-grey hair pinned up, spectacles on a cord, layered dark scholar robes',
    'a gaunt young man, hollow cheeks, shaved head, a leather satchel of scrolls across the chest',
  ],
  clerigo: [
    'a broad woman in her fifties, calm face, grey hair under a linen coif, plain undyed habit with a wooden pendant',
    'a young priest, androgynous, shaved head, serene tired eyes, a travelling cassock with a rope belt',
    'a stern man in his forties, close beard, a scar through one eyebrow, dark vestments and a small iron symbol',
  ],
};
for (const clase of Object.keys(CLASSES)) {
  RASGOS_JUGADOR[clase]?.forEach((rasgo, i) => {
    const id = `${clase}_0${i + 1}`;
    entradas.push({
      id,
      tipo: 'retrato',
      prompt: `${ESTILO.base}, ${ESTILO.retrato}, portrait of ${rasgo}, neutral expression, dark neutral background`,
      negativo: `${ESTILO.negativoBase}, ${ESTILO.retratoNegativo}`,
      width: 896,
      height: 1152,
      seed: semilla(id),
    });
  });
}

// Fondos de lugar, más sus variantes declaradas.
for (const place of Object.values(campaign.places)) {
  entradas.push({
    id: place.background,
    tipo: 'fondo',
    prompt: `${ESTILO.base}, ${ESTILO.fondo}, ${place.canonPrompt}`,
    negativo: `${ESTILO.negativoBase}, ${ESTILO.fondoNegativo}`,
    width: 1344,
    height: 768,
    seed: semilla(place.background),
  });
  for (const [nombre, archivo] of Object.entries(place.variants ?? {})) {
    const matiz: Record<string, string> = {
      amanecer: 'at grey dawn, first cold light, rain easing, mist on the water',
      crecido: 'in full flood, brown churning water, everything half submerged, storm',
      tormenta: 'in a violent storm at night, sheeting rain, lightning, shutters banging',
      inundado: 'flooded, water up to the sills, everything soaked and abandoned, grey light',
    };
    entradas.push({
      id: archivo,
      tipo: 'fondo',
      prompt: `${ESTILO.base}, ${ESTILO.fondo}, ${place.canonPrompt} ${matiz[nombre] ?? nombre}`,
      negativo: `${ESTILO.negativoBase}, ${ESTILO.fondoNegativo}`,
      width: 1344,
      height: 768,
      seed: semilla(archivo),
    });
  }
}

// Objetos: los de la campaña y la reliquia compartida.
for (const item of [...Object.values(campaign.items), ...Object.values(WORLD.items)]) {
  entradas.push({
    id: item.icon,
    tipo: 'objeto',
    prompt: `${ESTILO.base}, ${ESTILO.objeto}, ${item.name}: ${item.description}`,
    negativo: `${ESTILO.negativoBase}, ${ESTILO.objetoNegativo}`,
    width: 1024,
    height: 1024,
    seed: semilla(item.icon),
  });
}

// Portada de la campaña.
entradas.push({
  id: `portada_${campaign.id}`,
  tipo: 'portada',
  prompt: `${ESTILO.base}, ${ESTILO.fondo}, ${campaign.places[campaign.cover]?.canonPrompt ?? campaign.premise}`,
  negativo: `${ESTILO.negativoBase}, ${ESTILO.fondoNegativo}`,
  width: 896,
  height: 1152,
  seed: semilla(`portada_${campaign.id}`),
});

// La clave es tipo+id, no solo el id: un sprite comparte a propósito el id de su retrato
// (mismo máster, ver el bucle de PNJ más arriba), y los dos son archivos distintos porque
// el tipo va en la ruta (`src/assets/<tipo>/<id>.webp`).
const vistos = new Set<string>();
const duplicados = entradas.filter((e) => {
  const clave = `${e.tipo}/${e.id}`;
  if (vistos.has(clave)) return true;
  vistos.add(clave);
  return false;
});
if (duplicados.length > 0) throw new Error(`ids repetidos en el manifiesto: ${duplicados.map((d) => `${d.tipo}/${d.id}`).join(', ')}`);

const salida = { campana: campaign.id, generado: 'derivado del contenido, no editar a mano', entradas };
writeFileSync('art/manifest.generated.json', `${JSON.stringify(salida, null, 2)}\n`, 'utf-8');

const porTipo = entradas.reduce<Record<string, number>>((a, e) => ({ ...a, [e.tipo]: (a[e.tipo] ?? 0) + 1 }), {});
console.log(`art/manifest.generated.json: ${entradas.length} imágenes`, porTipo);
