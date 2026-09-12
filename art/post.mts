/**
 * Post-proceso: de los másteres de `art/masters/` a los archivos que consume la app.
 *
 * Hace tres cosas, según el tipo:
 *  - retrato: recorta a 3:4 desde arriba (la cara está en el tercio superior) y baja a 768x1024.
 *  - fondo y portada: reescala a 1920x1080 / 900x1200 sin recortar.
 *  - objeto: se espera que ya venga con canal alfa (lo recorta `art/recorte.mts` con BiRefNet).
 *
 * Sale en WebP, que es lo que soporta todo navegador actual y pesa la mitad que el PNG.
 * Los archivos quedan en `src/assets/<tipo>/<id>.webp`, con el mismo id que usa el contenido.
 *
 *   npx tsx art/post.mts
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

interface Entrada { id: string; tipo: string; width: number; height: number }
const manifiesto = JSON.parse(readFileSync('art/manifest.generated.json', 'utf-8')) as { entradas: Entrada[] };

/** Tamaño final por tipo, de la spec §7. */
const SALIDA: Record<string, { w: number; h: number; recorte: boolean }> = {
  retrato: { w: 768, h: 1024, recorte: true },
  fondo: { w: 1920, h: 1080, recorte: false },
  objeto: { w: 256, h: 256, recorte: false },
  portada: { w: 900, h: 1200, recorte: false },
};

function masterDe(tipo: string, id: string): string | null {
  const dir = join('art', 'masters', tipo, id);
  if (!existsSync(dir)) return null;
  // El recorte con alfa (art/recorte.mts) gana sobre el máster con fondo gris.
  if (existsSync(join(dir, 'recorte.png'))) return join(dir, 'recorte.png');
  const png = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  return png.length > 0 ? join(dir, png[png.length - 1]!) : null;
}

let hechos = 0;
const faltantes: string[] = [];

for (const e of manifiesto.entradas) {
  const master = masterDe(e.tipo, e.id);
  if (master === null) { faltantes.push(`${e.tipo}/${e.id}`); continue; }

  const spec = SALIDA[e.tipo];
  if (spec === undefined) { faltantes.push(`${e.tipo}/${e.id} (tipo sin destino)`); continue; }

  const destinoDir = join('src', 'assets', e.tipo);
  mkdirSync(destinoDir, { recursive: true });
  const destino = join(destinoDir, `${e.id}.webp`);

  let img = sharp(master);
  if (spec.recorte) {
    // 3:4 anclado arriba: la cara vive en el tercio superior del máster 896x1152.
    const meta = await img.metadata();
    const w = meta.width ?? e.width;
    const altoObjetivo = Math.round((w * spec.h) / spec.w);
    const alto = Math.min(altoObjetivo, meta.height ?? e.height);
    img = img.extract({ left: 0, top: 0, width: w, height: alto });
  }
  const conAlfa = e.tipo === 'objeto';
  await img
    .resize(spec.w, spec.h, { fit: conAlfa ? 'contain' : 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(destino);
  hechos += 1;
}

const indice = manifiesto.entradas
  .filter((e) => existsSync(join('src', 'assets', e.tipo, `${e.id}.webp`)))
  .map((e) => `${e.tipo}/${e.id}`);
writeFileSync('art/assets.index.json', `${JSON.stringify(indice, null, 2)}\n`, 'utf-8');

console.log(`post-proceso: ${hechos} imágenes a src/assets/`);
if (faltantes.length > 0) console.log(`sin máster (${faltantes.length}): ${faltantes.join(', ')}`);
