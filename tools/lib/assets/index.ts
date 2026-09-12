import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Campaign, WorldContent } from '@/content/schema';
import { conMundo } from '../mundo';

/**
 * Cruce contenido ↔ archivos de arte (spec §7 y §10).
 *
 * Convención de nombres de la spec §7: `<tipo>/<id>[.<variante>].png`, con el **mismo id que el
 * contenido** (`npc/orell.png`, `place/puente_viejo.amanecer.png`). Los exportados viven bajo
 * `src/assets/`, normalmente con una carpeta de alcance adelante (`src/assets/vado/npc/berta.png`,
 * `src/assets/world/npc/orell.png`), así que el cruce compara **los dos últimos tramos** de la ruta
 * y no se casa con una organización de carpetas en particular.
 *
 * Mientras no exista el arte (fase G), lo esperable es que falte TODO: esa lista es exactamente la
 * lista de compras de la producción de arte, y por eso el chequeo es informativo salvo que se pida
 * lo contrario con `--assets-strict`.
 *
 * Todo lo de acá es puro menos `archivosDeArte`, que es el único que toca el disco.
 */

export type AssetKind = 'npc' | 'place' | 'item' | 'cover' | 'cg';

export interface AssetRef {
  kind: AssetKind;
  /** Id del archivo, con la variante pegada si la hay: `puente_viejo.amanecer`. */
  name: string;
  /** De dónde sale la referencia, para poder ir a arreglarla: `places.puente_viejo.variants.amanecer`. */
  origen: string;
}

export interface ConteoTipo { total: number; faltan: number }

export interface AssetReport {
  refs: AssetRef[];
  faltantes: AssetRef[];
  /** Archivos de arte que están en el disco y nadie referencia. */
  huerfanos: string[];
  porTipo: Record<AssetKind, ConteoTipo>;
}

const EXTENSIONES: readonly string[] = ['.png', '.webp', '.avif'];

/** Ruta esperada de una referencia, relativa a `src/assets/`. La spec exige PNG como exportado. */
export function rutaDe(ref: AssetRef): string {
  return `${ref.kind}/${ref.name}.png`;
}

/** Clave de comparación: los dos últimos tramos, sin extensión. `vado/npc/berta.png` → `npc/berta`. */
export function claveDe(ruta: string): string {
  const limpia = ruta.replace(/\\/g, '/').replace(/\.[^./]+$/, '');
  const tramos = limpia.split('/').filter((t) => t !== '');
  return tramos.slice(-2).join('/');
}

/**
 * Todas las referencias a arte de una campaña **ya fusionada con el mundo**: sin fusionar faltarían
 * los retratos de `orell`, `ilse` y `halvar` y el icono de la reliquia, que son justo los que se
 * comparten entre campañas y los que nadie va a echar de menos hasta que falten en pantalla.
 */
export function referencias(campaign: Campaign, world: WorldContent): AssetRef[] {
  const completa = conMundo(campaign, world);
  const refs: AssetRef[] = [{ kind: 'cover', name: completa.cover, origen: 'meta.cover' }];
  for (const [id, npc] of Object.entries(completa.npcs)) {
    refs.push({ kind: 'npc', name: npc.portrait, origen: `npcs.${id}.portrait` });
  }
  for (const [id, place] of Object.entries(completa.places)) {
    refs.push({ kind: 'place', name: place.background, origen: `places.${id}.background` });
    for (const [variante, nombre] of Object.entries(place.variants ?? {})) {
      refs.push({ kind: 'place', name: nombre, origen: `places.${id}.variants.${variante}` });
    }
  }
  for (const [id, item] of Object.entries(completa.items)) {
    refs.push({ kind: 'item', name: item.icon, origen: `items.${id}.icon` });
  }
  // Las CG de escena todavía no existen en el contenido (ninguna escena declara `cg`), pero la spec
  // §7 les reserva 6 imágenes: si alguna aparece, entra al cruce sin tocar nada.
  for (const [id, scene] of Object.entries(completa.scenes)) {
    if (scene.cg !== undefined) refs.push({ kind: 'cg', name: scene.cg, origen: `scenes.${id}.cg` });
  }
  return refs;
}

const TIPOS: readonly AssetKind[] = ['npc', 'place', 'item', 'cover', 'cg'];

/** Cruza referencias contra archivos (rutas relativas a `src/assets/`, con barras normales). */
export function comparar(refs: readonly AssetRef[], archivos: readonly string[]): AssetReport {
  const presentes = new Set(archivos.map(claveDe));
  const referenciadas = new Set(refs.map((r) => `${r.kind}/${r.name}`));
  const faltantes = refs.filter((r) => !presentes.has(`${r.kind}/${r.name}`));
  const huerfanos = archivos.filter((a) => !referenciadas.has(claveDe(a)));
  const porTipo = Object.fromEntries(TIPOS.map((tipo): [AssetKind, ConteoTipo] => [tipo, {
    total: refs.filter((r) => r.kind === tipo).length,
    faltan: faltantes.filter((r) => r.kind === tipo).length,
  }])) as Record<AssetKind, ConteoTipo>;
  return { refs: [...refs], faltantes, huerfanos, porTipo };
}

/**
 * Archivos de arte bajo `raiz`, recursivo, en rutas relativas con barras normales. Si la carpeta no
 * existe (que es el caso hasta la fase G) devuelve una lista vacía en vez de explotar.
 */
export async function archivosDeArte(raiz: string): Promise<string[]> {
  let entradas: Dirent[];
  try {
    entradas = await readdir(raiz, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
  const archivos: string[] = [];
  for (const entrada of entradas) {
    if (!entrada.isFile() || !EXTENSIONES.includes(path.extname(entrada.name).toLowerCase())) continue;
    const completa = path.join(entrada.parentPath, entrada.name);
    archivos.push(path.relative(raiz, completa).replace(/\\/g, '/'));
  }
  return archivos.sort();
}

/** Líneas del informe, en español y en el mismo formato `campaña › escena › [regla] mensaje` del validador. */
export function lineasDeInforme(campaignId: string, informe: AssetReport): string[] {
  const lineas = informe.faltantes.map((r) => `${campaignId} › - › [assets] falta ${rutaDe(r)} (${r.origen})`);
  for (const huerfano of informe.huerfanos) {
    lineas.push(`${campaignId} › - › [assets] sobra ${huerfano}: no lo referencia nadie`);
  }
  return lineas;
}

export function resumenDeAssets(campaignId: string, informe: AssetReport): string {
  const detalle = TIPOS
    .filter((tipo) => informe.porTipo[tipo].total > 0)
    .map((tipo) => `${tipo} ${String(informe.porTipo[tipo].faltan)}/${String(informe.porTipo[tipo].total)}`)
    .join(', ');
  const faltan = informe.faltantes.length;
  const total = informe.refs.length;
  return `${campaignId}: assets, faltan ${String(faltan)} de ${String(total)} (${detalle}); ${String(informe.huerfanos.length)} sin referencia`;
}
