import { describe, it, expect } from 'vitest';
import { WORLD } from '@/content/world/index';
import { CAMPAIGNS, listCampaigns } from '@/content/campaigns/index';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { campaign } from '@/content/campaigns/prueba/campaign';

describe('WORLD (contenido compartido, Fase A)', () => {
  it('no declara PNJ, lugares ni objetos todavía', () => {
    expect(Object.keys(WORLD.npcs)).toEqual([]);
    expect(Object.keys(WORLD.places)).toEqual([]);
    expect(Object.keys(WORLD.items)).toEqual([]);
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
});
