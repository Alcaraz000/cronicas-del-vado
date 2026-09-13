// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Campaign, WorldContent } from '@/content/schema';

/**
 * El motor resuelve PNJ, lugares y objetos contra `campaign` y nada más. WORLD está vacío en la
 * Fase A, así que con el contenido real no se nota; pero las reliquias viven SOLO en
 * `src/content/world/items.ts` por diseño, y sin fusionar nunca darían ventaja ni mostrarían su
 * nombre. Este archivo pone un WORLD de mentira, con contenido, para que el agujero se vea.
 */
const mundoFalso = vi.hoisted(() => ({
  npcs: {
    orell: { id: 'orell', name: 'Orell', portrait: 'orell', voice: 'Grave.', canonPrompt: 'Hombre de barba cana.' },
  },
  places: {
    vado: { id: 'vado', name: 'El Vado', background: 'vado', canonPrompt: 'Un vado de piedra sobre el río.' },
  },
  items: {
    amuleto_del_vado: {
      id: 'amuleto_del_vado',
      name: 'Amuleto del Vado',
      icon: 'amuleto',
      description: 'Una reliquia que cruza campañas.',
      advantageTags: ['saber' as const],
      relic: true,
    },
  },
  flags: {},
}));

vi.mock('@/content/world', () => ({ WORLD: mundoFalso }));

import { render as renderScene } from '@/engine/resolve';
import { selectGameState } from '@/state/selectors';
import { conMundo, createAppStore } from '@/state/store';

/** Campaña mínima para probar conMundo sin depender del contenido real. */
const campanaMinima: Campaign = {
  id: 'x',
  contentVersion: 1,
  title: 'Campaña x',
  premise: 'Campaña mínima para probar la fusión con el mundo.',
  cover: 'x',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  start: 'inicio',
  scenes: {},
  npcs: { propio: { id: 'propio', name: 'PNJ propio', portrait: 'p', voice: 'v', canonPrompt: 'c' } },
  places: { plaza: { id: 'plaza', name: 'La plaza', background: 'plaza', canonPrompt: 'c' } },
  items: { llave: { id: 'llave', name: 'Llave de la campaña', icon: 'llave', description: 'd' } },
  flags: { 'run:x': 'Un flag' },
  memories: {},
  milestones: {},
  clocks: {},
  endings: {},
};

beforeEach(() => {
  localStorage.clear();
});

describe('conMundo', () => {
  it('agrega los PNJ, lugares y objetos del mundo sin pisar los de la campaña', () => {
    const fusionada = conMundo(campanaMinima, mundoFalso as WorldContent);
    expect(fusionada.npcs['orell']?.name).toBe('Orell');
    expect(fusionada.npcs['propio']?.name).toBe('PNJ propio');
    expect(fusionada.places['vado']?.name).toBe('El Vado');
    expect(fusionada.places['plaza']?.name).toBe('La plaza');
    expect(fusionada.items['amuleto_del_vado']?.name).toBe('Amuleto del Vado');
    expect(fusionada.items['llave']?.name).toBe('Llave de la campaña');
  });

  it('ante una colisión de id gana el mundo', () => {
    // r07 ya prohíbe que una campaña redefina un id de world/, así que una colisión es
    // contenido roto: el mundo es la fuente canónica y la campaña no lo puede tapar.
    const mundoQueChoca: WorldContent = {
      npcs: {},
      places: {},
      items: { llave: { id: 'llave', name: 'Llave del mundo', icon: 'llave', description: 'd' } },
      flags: {},
    };
    expect(conMundo(campanaMinima, mundoQueChoca).items['llave']?.name).toBe('Llave del mundo');
  });

  it('no toca el resto de la campaña ni la muta', () => {
    const antes = JSON.stringify(campanaMinima);
    const fusionada = conMundo(campanaMinima, mundoFalso as WorldContent);
    expect(fusionada.flags).toEqual(campanaMinima.flags);
    expect(fusionada.scenes).toBe(campanaMinima.scenes);
    expect(fusionada.id).toBe('x');
    expect(JSON.stringify(campanaMinima)).toBe(antes);
  });
});

describe('store: la campaña que recibe el motor trae el mundo adentro', () => {
  it('startRun entrega una campaña con los PNJ, lugares y objetos del mundo', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');

    const campana = store.getState().ui.campaign;
    expect(campana).not.toBeNull();
    expect(campana!.npcs['orell']?.name).toBe('Orell');
    expect(campana!.places['vado']?.name).toBe('El Vado');
    expect(campana!.items['amuleto_del_vado']?.name).toBe('Amuleto del Vado');
    // El contenido propio de la campaña de humo sigue entero.
    expect(campana!.npcs['centinela']?.name).toBe('El centinela');
    expect(campana!.items['llave_de_hierro']?.name).toBe('Llave de hierro');
  });

  it('una reliquia que vive solo en el mundo da ventaja y muestra su nombre en la tirada', async () => {
    // Este es el mordisco real del hallazgo: modifiers.ts busca el objeto en campaign.items.
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');

    const campana = store.getState().ui.campaign!;
    const gs = selectGameState(store.getState())!;
    const conReliquia = { ...gs, run: { ...gs.run, items: ['amuleto_del_vado'] } };
    const escena = renderScene(campana, conReliquia);
    const leer = escena.choices.find((c) => c.id === 'leer_inscripcion');
    const fuentes = leer?.preview?.sources.map((f) => f.label) ?? [];
    expect(fuentes).toContain('Amuleto del Vado');
  });
});
