import { describe, it, expect } from 'vitest';
import { WORLD } from '@/content/world/index';
import { CAMPAIGNS, listCampaigns } from '@/content/campaigns/index';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { campaign } from '@/content/campaigns/prueba/campaign';
import { meta as vadoMeta } from '@/content/campaigns/vado/meta';
import { campaign as vado } from '@/content/campaigns/vado/campaign';

describe('WORLD (contenido compartido)', () => {
  it('declara los tres PNJ compartidos del Vado y ningún lugar', () => {
    // Orell, Ilse y Halvar viven acá porque los reutiliza la segunda campaña y porque r07 rechaza
    // que "El vado de Aldamar" los redeclare en su propio `npcs`.
    expect(Object.keys(WORLD.npcs).sort()).toEqual(['halvar', 'ilse', 'orell']);
    for (const [id, npc] of Object.entries(WORLD.npcs)) {
      expect(npc.id, id).toBe(id);
      expect(npc.name.trim().length, id).toBeGreaterThan(0);
    }
    expect(Object.keys(WORLD.places)).toEqual([]);
  });

  it('declara la única reliquia, que por ser relic no puede vivir dentro de una campaña', () => {
    expect(Object.keys(WORLD.items)).toEqual(['sello_del_vado']);
    expect(WORLD.items['sello_del_vado']?.id).toBe('sello_del_vado');
    expect(WORLD.items['sello_del_vado']?.relic).toBe(true);
  });

  it('declara exactamente los cinco espacios de flags compartidos, con descripción', () => {
    expect(Object.keys(WORLD.flags).sort()).toEqual([
      'char:leyenda',
      'char:met.*',
      'char:origen.*',
      'char:place.*',
      'world:caido.*',
    ]);
    for (const descripcion of Object.values(WORLD.flags)) {
      expect(descripcion.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('CAMPAIGNS (registro de campañas)', () => {
  it('registra la campaña prueba con su meta estática', () => {
    const entry = CAMPAIGNS['prueba'];
    expect(entry).toBeDefined();
    expect(entry?.meta).toBe(pruebaMeta);
    expect(entry?.meta.hidden).toBe(true);
  });

  it('listCampaigns(false) no incluye prueba porque es hidden', () => {
    const visibles = listCampaigns(false).map((m) => m.id);
    expect(visibles).not.toContain('prueba');
  });

  it('listCampaigns(true) incluye prueba', () => {
    const todas = listCampaigns(true).map((m) => m.id);
    expect(todas).toContain('prueba');
  });

  it('listCampaigns devuelve un array nuevo en cada llamada (no expone el registro)', () => {
    const a = listCampaigns(true);
    const b = listCampaigns(true);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('load() devuelve la campaña completa', async () => {
    const entry = CAMPAIGNS['prueba'];
    expect(entry).toBeDefined();
    const loaded = await entry!.load();
    expect(loaded.id).toBe('prueba');
    expect(loaded.start).toBe('p_umbral');
    expect(loaded).toEqual(campaign);
  });

  it('registra "El vado de Aldamar" y su load() trae las 46 escenas', async () => {
    const entry = CAMPAIGNS['vado'];
    expect(entry).toBeDefined();
    expect(entry?.meta).toBe(vadoMeta);
    // Fase D: la prosa está escrita y el perfil pasó a 'release', así que la campaña ya se le
    // ofrece al jugador. `hidden` se saca omitiendo la clave, no poniéndola en `false`: el
    // esquema la declara `z.literal(true).optional()`.
    expect(entry?.meta.hidden).toBeUndefined();
    expect(listCampaigns(false).map((m) => m.id)).toContain('vado');
    expect(listCampaigns(true).map((m) => m.id)).toContain('vado');

    const loaded = await entry!.load();
    expect(loaded.id).toBe('vado');
    expect(loaded.start).toBe('p_camino');
    expect(Object.keys(loaded.scenes)).toHaveLength(46);
    expect(loaded).toEqual(vado);
  });
});
