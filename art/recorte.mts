/**
 * Recorta con canal alfa los objetos, usando BiRefNet a través de ComfyUI.
 *
 * Los objetos se generan sobre un gris plano (ver `art/style.md`) justamente para que se
 * puedan separar del fondo. Este paso deja el PNG con transparencia en
 * `art/masters/objeto/<id>/recorte.png`, que es lo que después toma `art/post.mts`.
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
const objetos = manifiesto.entradas.filter((e) => e.tipo === 'objeto');

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
for (const obj of objetos) {
  const dir = join('art', 'masters', 'objeto', obj.id);
  if (!existsSync(dir)) { console.log(`sin máster: ${obj.id}`); continue; }
  const png = readdirSync(dir).filter((f) => f.endsWith('.png') && f !== 'recorte.png').sort();
  if (png.length === 0) { console.log(`sin máster: ${obj.id}`); continue; }

  // ComfyUI solo lee imágenes de su carpeta de entrada.
  const nombre = `recorte_${obj.id}.png`;
  mkdirSync(ENTRADA_COMFY, { recursive: true });
  copyFileSync(join(dir, png[png.length - 1]!), join(ENTRADA_COMFY, nombre));

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
    '3': { class_type: 'SaveImage', inputs: { filename_prefix: `alfa_${obj.id}`, images: ['2', 0] } },
  };
  const imgs = await esperar(await encolar(wf));
  for (const img of imgs) {
    const origen = join(SALIDA_COMFY, img.subfolder, img.filename);
    if (existsSync(origen)) {
      copyFileSync(origen, join(dir, 'recorte.png'));
      hechos += 1;
      console.log(`  ${obj.id} recortado`);
    }
  }
}
console.log(`recorte con alfa: ${hechos}/${objetos.length} objetos`);
