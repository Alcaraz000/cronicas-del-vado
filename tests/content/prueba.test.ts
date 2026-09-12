import { describe, it, expect } from 'vitest';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { npcs } from '@/content/campaigns/prueba/npcs';
import { places } from '@/content/campaigns/prueba/places';
import { items } from '@/content/campaigns/prueba/items';
import { flags } from '@/content/campaigns/prueba/flags';
import type { Paragraph, Scene } from '@/content/schema';
import { p_umbral, p_biblioteca, p_patio, p_patio_2, p_victoria, p_capilla } from '@/content/campaigns/prueba/scenes/acto1';

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

/** Cantidad de opciones sin `requires` (las que todo personaje ve y puede elegir). */
function sinRequires(scene: Scene): number {
  return scene.choices.filter((c) => c.requires === undefined).length;
}

/** Párrafos estructurados (con variantes) de un texto; descarta los strings del narrador. */
function parrafosDe(scene: Scene): Paragraph[] {
  return scene.text.filter((p): p is Paragraph => typeof p !== 'string');
}

describe('prueba: escenas del acto 1', () => {
  // Vistas tipadas: `satisfies Scene` conserva el tipo literal; asignar a Scene expone todas las propiedades opcionales.
  const umbral: Scene = p_umbral;
  const biblioteca: Scene = p_biblioteca;
  const patio2: Scene = p_patio_2;
  const capilla: Scene = p_capilla;
  const acto1: Scene[] = [p_umbral, p_biblioteca, p_patio, p_patio_2, p_victoria, p_capilla];

  it('tiene los seis ids esperados y cada id coincide con su constante', () => {
    expect(acto1.map((s) => s.id)).toEqual(['p_umbral', 'p_biblioteca', 'p_patio', 'p_patio_2', 'p_victoria', 'p_capilla']);
  });

  it('declara los kinds del contrato', () => {
    expect(p_umbral.kind).toBe('hub');
    expect(p_biblioteca.kind).toBe('normal');
    expect(p_patio.kind).toBe('encounter');
    expect(p_patio_2.kind).toBe('encounter');
    expect(p_victoria.kind).toBe('normal');
    expect(p_capilla.kind).toBe('rest');
  });

  it('toda escena del acto 1 tiene entre 4 y 9 opciones y al menos 4 sin requires', () => {
    for (const scene of acto1) {
      expect(scene.choices.length, scene.id).toBeGreaterThanOrEqual(4);
      expect(scene.choices.length, scene.id).toBeLessThanOrEqual(9);
      expect(sinRequires(scene), scene.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('el umbral es el hub: hito al entrar, redirect al vencer al centinela y variantes de memoria en el narrador', () => {
    expect(umbral.onEnter).toEqual([{ milestone: 'entrar_a_la_torre' }]);
    expect(umbral.redirect).toEqual([{ when: { flag: 'run:centinela_vencido' }, to: 'p_escalera' }]);
    const parrafos = parrafosDe(umbral);
    const conVisited = parrafos.some((p) => p.speaker === undefined && p.variants.some((v) => JSON.stringify(v.when) === JSON.stringify({ visited: 'p_umbral', min: 1 })));
    const conKnows = parrafos.some((p) => p.speaker === undefined && p.variants.some((v) => JSON.stringify(v.when) === JSON.stringify({ knows: 'torre_abandonada' })));
    expect(conVisited).toBe(true);
    expect(conKnows).toBe(true);
  });

  it('la biblioteca hace hablar al centinela y lo lista en npcs', () => {
    expect(biblioteca.npcs).toContain('centinela');
    const habla = parrafosDe(biblioteca).some((p) => p.speaker === 'centinela');
    expect(habla).toBe(true);
  });

  it('el patio (ronda 2) redirige a la victoria con el reloj lleno y bloquea el remate con pista', () => {
    expect(patio2.redirect).toEqual([{ when: { clock: 'pelea', gte: 2 }, to: 'p_victoria' }]);
    const rematar = patio2.choices.find((c) => c.id === 'rematar');
    expect(rematar?.requires).toEqual({ clock: 'pelea', gte: 1 });
    expect(rematar?.lockedHint).toBe('Todavía no lo tenés contra las cuerdas');
    const llave = patio2.choices.find((c) => c.id === 'llave');
    expect(llave?.requires).toEqual({ item: 'llave_de_hierro' });
    expect(llave?.lockedHint).toBe('Necesitás algo con qué trabar la puerta');
  });

  it('la capilla cura al entrar y bloquea la subida con pista', () => {
    expect(capilla.onEnter).toEqual([{ heal: 1 }, { removeCondition: 'all' }]);
    const subir = capilla.choices.find((c) => c.id === 'subir');
    expect(subir?.requires).toEqual({ flag: 'run:centinela_vencido' });
    expect(subir?.lockedHint).toBe('El centinela sigue en el patio');
  });
});
