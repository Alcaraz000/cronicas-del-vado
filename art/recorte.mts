/**
 * Recorta con canal alfa los objetos y los sprites de escena, usando BiRefNet a través de ComfyUI.
 *
 * Los objetos se generan sobre un gris plano (ver `art/style.md`) justamente para que se
 * puedan separar del fondo. Este paso deja el PNG con transparencia en
 * `art/masters/objeto/<id>/recorte.png`, que es lo que después toma `art/post.mts`.
 *
 * Los sprites no son arte nuevo: son el mismo máster de retrato de un PNJ de escena, recortado
 * en vez de encuadrado. Por eso el origen y el destino son carpetas distintas: se lee de
 * `art/masters/retrato/<id>/` y el resultado queda en `art/masters/sprite/<id>/recorte.png`.
 *
 * Requiere ComfyUI corriendo en 127.0.0.1:8188 con el nodo ComfyUI-RMBG instalado.
 *
 *   npx tsx art/recorte.mts
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SERVIDOR = 'http://127.0.0.1:8188';
const ENTRADA_COMFY = String.raw`C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\input`;
const SALIDA_COMFY = String.raw`C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\output`;

interface Entrada { id: string; tipo: string }
const manifiesto = JSON.parse(readFileSync('art/manifest.generated.json', 'utf-8')) as { entradas: Entrada[] };

/**
 * De qué carpeta de másteres sale la imagen a recortar, por tipo. El objeto se recorta desde
 * su propio máster; el sprite reutiliza el máster del retrato (mismo id, misma semilla, ver
 * `art/manifest.mts`) porque el PNJ ya existe pintado, solo hace falta separarlo del fondo.
 */
const ORIGEN: Record<string, string> = { objeto: 'objeto', sprite: 'retrato' };
const aRecortar = manifiesto.entradas.filter((e) => e.tipo === 'objeto' || e.tipo === 'sprite');

async function encolar(workflow: unknown): Promise<string> {
  const r = await fetch(`${SERVIDOR}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const j = (await r.json()) as { prompt_id: string };
  return j.prompt_id;
}

async function esperar(id: string): Promise<Array<{ filename: string; subfolder: string }>> {
  for (let i = 0; i < 200; i += 1) {
    const r = await fetch(`${SERVIDOR}/history/${id}`);
    const h = (await r.json()) as Record<string, { outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string }> }> }>;
    const hecho = h[id];
    if (hecho !== undefined) {
      return Object.values(hecho.outputs ?? {}).flatMap((n) => n.images ?? []);
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error(`el recorte ${id} no terminó`);
}

let hechos = 0;
for (const item of aRecortar) {
  const origenDir = join('art', 'masters', ORIGEN[item.tipo]!, item.id);
  const destinoDir = join('art', 'masters', item.tipo, item.id);
  if (!existsSync(origenDir)) { console.log(`sin máster: ${item.tipo}/${item.id}`); continue; }
  const png = readdirSync(origenDir).filter((f) => f.endsWith('.png') && f !== 'recorte.png').sort();
  if (png.length === 0) { console.log(`sin máster: ${item.tipo}/${item.id}`); continue; }

  // ComfyUI solo lee imágenes de su carpeta de entrada.
  const nombre = `recorte_${item.tipo}_${item.id}.png`;
  mkdirSync(ENTRADA_COMFY, { recursive: true });
  copyFileSync(join(origenDir, png[png.length - 1]!), join(ENTRADA_COMFY, nombre));

  const wf = {
    '1': { class_type: 'LoadImage', inputs: { image: nombre, upload: 'image' } },
    '2': {
      class_type: 'BiRefNetRMBG',
      // Los opcionales se pasan explícitos: el nodo los lee sin default y revienta con
      // "Error in image processing: 'mask_blur'" si faltan.
      inputs: {
        image: ['1', 0],
        model: 'BiRefNet-general',
        sensitivity: 1.0,
        mask_blur: 0,
        mask_offset: 0,
        invert_output: false,
        refine_foreground: true,
        background: 'Alpha',
        background_color: '#222222',
      },
    },
    '3': { class_type: 'SaveImage', inputs: { filename_prefix: `alfa_${item.tipo}_${item.id}`, images: ['2', 0] } },
  };
  const imgs = await esperar(await encolar(wf));
  for (const img of imgs) {
    const origen = join(SALIDA_COMFY, img.subfolder, img.filename);
    if (existsSync(origen)) {
      mkdirSync(destinoDir, { recursive: true });
      copyFileSync(origen, join(destinoDir, 'recorte.png'));
      hechos += 1;
      console.log(`  ${item.tipo}/${item.id} recortado`);
    }
  }
}
console.log(`recorte con alfa: ${hechos}/${aRecortar.length}`);
