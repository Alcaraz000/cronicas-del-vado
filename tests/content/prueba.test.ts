import { describe, it, expect } from 'vitest';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { npcs } from '@/content/campaigns/prueba/npcs';
import { places } from '@/content/campaigns/prueba/places';
import { items } from '@/content/campaigns/prueba/items';
import { flags } from '@/content/campaigns/prueba/flags';

describe('prueba: meta', () => {
  it('es la campaña de humo oculta, perfil smoke, rango 3-5, una escena mortal', () => {
    expect(pruebaMeta.id).toBe('prueba');
    expect(pruebaMeta.contentVersion).toBe(1);
    expect(pruebaMeta.hidden).toBe(true);
    expect(pruebaMeta.lintProfile).toBe('smoke');
    expect(pruebaMeta.levelRange).toEqual([3, 5]);
    expect(pruebaMeta.durationMin).toEqual([5, 10]);
    expect(pruebaMeta.lethalScenes).toBe(1);
    expect(pruebaMeta.title.length).toBeGreaterThan(0);
    expect(pruebaMeta.premise.length).toBeGreaterThan(0);
  });
});

describe('prueba: declaraciones', () => {
  it('declara al centinela con id coincidente', () => {
    expect(Object.keys(npcs)).toEqual(['centinela']);
    expect(npcs['centinela']?.id).toBe('centinela');
    expect(npcs['centinela']?.name.length).toBeGreaterThan(0);
  });

  it('declara la torre abandonada con variantes noche y cripta', () => {
    expect(Object.keys(places)).toEqual(['torre_abandonada']);
    expect(places['torre_abandonada']?.id).toBe('torre_abandonada');
    expect(Object.keys(places['torre_abandonada']?.variants ?? {}).sort()).toEqual(['cripta', 'noche']);
  });

  it('declara la llave de hierro con ventaja en sigilo y sin relic', () => {
    expect(Object.keys(items)).toEqual(['llave_de_hierro']);
    expect(items['llave_de_hierro']?.id).toBe('llave_de_hierro');
    expect(items['llave_de_hierro']?.advantageTags).toEqual(['sigilo']);
    expect(items['llave_de_hierro']?.relic).toBeUndefined();
  });

  it('declara los tres flags de la campaña con prefijos correctos', () => {
    expect(Object.keys(flags).sort()).toEqual(['char:prueba.vio_la_cripta', 'run:centinela_vencido', 'run:tiene_pista']);
    for (const descripcion of Object.values(flags)) {
      expect(descripcion.trim().length).toBeGreaterThan(0);
    }
  });
});
