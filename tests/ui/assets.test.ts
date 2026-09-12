import { describe, expect, it } from 'vitest';
import { cargarImagen, existeImagen, precargarImagen } from '@/ui/assets';

/**
 * El registro no evalúa reglas ni conoce el motor: solo sabe, dado un tipo y un id,
 * si hay un archivo en `src/assets/<tipo>/` y cuál es su URL servible. `import.meta.glob`
 * con `eager: false` hace que el archivo NO entre al bundle inicial (Vite emite un chunk
 * aparte por imagen, que solo se pide cuando `cargarImagen` lo llama).
 */
describe('registro de imágenes (src/ui/assets)', () => {
  it('encuentra un retrato de PNJ y uno de jugador por su id', () => {
    expect(existeImagen('retrato', 'orell')).toBe(true);
    expect(existeImagen('retrato', 'guerrero_01')).toBe(true);
    expect(existeImagen('retrato', 'clerigo_03')).toBe(true);
  });

  it('encuentra un fondo base y su variante, cuyo id lleva un punto', () => {
    expect(existeImagen('fondo', 'puente_viejo')).toBe(true);
    expect(existeImagen('fondo', 'puente_viejo.amanecer')).toBe(true);
  });

  it('encuentra un objeto', () => {
    expect(existeImagen('objeto', 'sello_del_vado')).toBe(true);
  });

  it('la portada de una campaña se busca por el id de la campaña', () => {
    // El archivo es `portada_vado.webp`: la portada no se busca por `CampaignMeta.cover`
    // (ese campo es una decisión de contenido ya cerrada en el outline y no coincide con
    // el nombre de archivo), sino por el id de la campaña.
    expect(existeImagen('portada', 'vado')).toBe(true);
  });

  it('devuelve false para un id sin arte, sin romper', () => {
    expect(existeImagen('retrato', 'm_guia')).toBe(false);
    expect(existeImagen('fondo', 'torre_abandonada')).toBe(false);
    expect(existeImagen('portada', 'prueba')).toBe(false);
    expect(existeImagen('objeto', 'no_existe')).toBe(false);
  });

  it('carga la URL de una imagen que existe', async () => {
    const url = await cargarImagen('retrato', 'orell');
    expect(url).not.toBeNull();
    expect(url).toMatch(/orell/);
    expect(url).toMatch(/\.webp/);
  });

  it('carga la URL de la portada por id de campaña', async () => {
    const url = await cargarImagen('portada', 'vado');
    expect(url).not.toBeNull();
    expect(url).toMatch(/portada_vado/);
  });

  it('devuelve null al cargar una imagen que no existe, sin lanzar', async () => {
    await expect(cargarImagen('retrato', 'no_existe')).resolves.toBeNull();
  });

  it('precargarImagen no lanza ni para un id existente ni para uno inexistente', () => {
    expect(() => precargarImagen('fondo', 'puente_viejo')).not.toThrow();
    expect(() => precargarImagen('fondo', 'no_existe')).not.toThrow();
  });
});
