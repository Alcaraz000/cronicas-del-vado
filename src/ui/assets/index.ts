/**
 * Registro del arte real (`src/assets/<tipo>/<id>.webp`). La UI le pide una imagen por
 * tipo e id y este módulo dice si existe y, si existe, cuál es su URL servible.
 *
 * `import.meta.glob` con `eager: false` no mete los archivos en el bundle inicial: Vite
 * genera un módulo aparte por imagen (`() => Promise<string>`, gracias a `query: '?url'`)
 * que solo se pide cuando `cargarImagen` lo llama. Sin esto, las ~40 imágenes (varias en
 * 1920×1080) entrarían todas al chunk de arranque.
 *
 * Nada de esto evalúa reglas del juego: es indexación de archivos, nada más.
 */
const modulos = import.meta.glob<string>('/src/assets/*/*.webp', {
  eager: false,
  query: '?url',
  import: 'default',
});

export type TipoImagen = 'retrato' | 'fondo' | 'objeto' | 'portada' | 'sprite';

/**
 * Nombre de archivo (sin extensión) para un tipo e id.
 *
 * `portada` es la excepción: el único archivo que existe hoy es `portada_vado.webp`, y se
 * busca por el id de la CAMPAÑA ('vado'), no por `CampaignMeta.cover` ('molino_de_tome' en
 * el outline de la campaña, una decisión de contenido ya cerrada que no tiene por qué
 * coincidir con el nombre del archivo de portada). Los demás tipos usan el id tal cual:
 * un retrato de PNJ o de jugador es `Npc.portrait` o `Character.portrait`, un fondo es
 * `Place.background` (con el punto de la variante, vía `Place.variants`) y un objeto es
 * `Item.icon`.
 */
function archivoDe(tipo: TipoImagen, id: string): string {
  return tipo === 'portada' ? `portada_${id}` : id;
}

function claveDe(tipo: TipoImagen, id: string): string {
  return `/src/assets/${tipo}/${archivoDe(tipo, id)}.webp`;
}

/** Sin abrir el archivo: alcanza con mirar las claves del glob. Sincrónico a propósito. */
export function existeImagen(tipo: TipoImagen, id: string): boolean {
  return claveDe(tipo, id) in modulos;
}

/** URL servible de la imagen, o `null` si no hay arte para ese tipo e id. Nunca lanza. */
export async function cargarImagen(tipo: TipoImagen, id: string): Promise<string | null> {
  const cargar = modulos[claveDe(tipo, id)];
  if (cargar === undefined) return null;
  return cargar();
}

/**
 * Pide la imagen por adelantado para que el navegador la tenga en caché cuando haga falta
 * mostrarla (por ejemplo, el fondo de una escena a la que la actual puede llevar). No
 * bloquea ni informa el resultado: si no hay arte, no hace nada.
 */
export function precargarImagen(tipo: TipoImagen, id: string): void {
  void cargarImagen(tipo, id).then((url) => {
    if (url === null) return;
    new Image().src = url;
  });
}
