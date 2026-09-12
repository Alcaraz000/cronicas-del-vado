import { describe, it, expect } from 'vitest';
import { WORLD } from '@/content/world/index';

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
