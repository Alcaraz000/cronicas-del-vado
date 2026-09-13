import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/content/schema';
import { derivarCronica, derivarRecuerdos } from '@/ui/memoria';
import { minimal } from '../fixtures/campaigns/minimal';
import { makeCharacter, makeState, makeWorld } from '../fixtures/state';

/** La campaña del fixture, más una reliquia y una línea de canon del mundo. */
const campana: Campaign = {
  ...minimal,
  items: {
    ...minimal.items,
    m_talisman: {
      id: 'm_talisman', name: 'Talismán de hueso', icon: 'm_talisman',
      description: 'Liviano, tibio, y nunca deja de estarlo.', relic: true,
    },
  },
  memories: {
    'char:minimal.trepo': 'Trepaste el risco y llegaste arriba.',
    'world:minimal.derrumbe': 'El risco se vino abajo y el sendero ya no existe.',
  },
};

describe('derivarRecuerdos', () => {
  it('traduce char:met.<id> al nombre del PNJ', () => {
    const state = makeState({ character: { flags: ['char:met.m_guia'] } });
    expect(derivarRecuerdos(campana, state).gente).toEqual([
      { id: 'char:met.m_guia', texto: minimal.npcs.m_guia!.name },
    ]);
  });

  it('traduce char:place.<id> al nombre del lugar', () => {
    const state = makeState({ character: { flags: ['char:place.m_claro'] } });
    expect(derivarRecuerdos(campana, state).lugares[0]?.texto).toBe(minimal.places.m_claro!.name);
  });

  it('muestra la línea de memories del canon del personaje', () => {
    const state = makeState({ character: { flags: ['char:minimal.trepo'] } });
    expect(derivarRecuerdos(campana, state).hechos[0]?.texto).toBe(campana.memories['char:minimal.trepo']);
  });

  it('muestra la línea de memories del canon del mundo', () => {
    const state = makeState({ world: makeWorld({ flags: ['world:minimal.derrumbe'] }) });
    expect(derivarRecuerdos(campana, state).mundo[0]?.texto).toBe(campana.memories['world:minimal.derrumbe']);
  });

  it('omite en silencio el flag de canon sin línea: nunca un id a la vista', () => {
    const state = makeState({ character: { flags: ['char:minimal.sin_linea'] } });
    expect(derivarRecuerdos(campana, state).hechos).toEqual([]);
  });

  it('NO muestra el canon apostado en run.stagedFlags: una derrota lo pierde', () => {
    // La decisión más delicada de esta derivación, y hasta ahora se cumplía solo por
    // construcción (la función ni mira `run`). Durante la partida el canon está APOSTADO: se
    // escribe recién al cerrar con un final, y una derrota lo tira. Mostrarlo en la Ficha
    // sería prometerle al jugador un recuerdo que todavía puede perder.
    const state = makeState({
      run: { stagedFlags: ['char:minimal.trepo', 'world:minimal.derrumbe'] },
    });

    const r = derivarRecuerdos(campana, state);

    // Las dos líneas existen en `memories`: si `stagedFlags` entrara, aparecerían.
    expect(campana.memories['char:minimal.trepo']).toBeDefined();
    expect(campana.memories['world:minimal.derrumbe']).toBeDefined();
    expect(r.hechos).toEqual([]);
    expect(r.mundo).toEqual([]);
  });

  it('ignora los flags run:, que no son del personaje', () => {
    const state = makeState({ character: { flags: ['run:algo'] } });
    const r = derivarRecuerdos(campana, state);
    expect([...r.gente, ...r.lugares, ...r.hechos, ...r.mundo]).toEqual([]);
  });

  it('lista las reliquias con su nombre y su descripción', () => {
    const state = makeState({ character: { relics: ['m_talisman'] } });
    const linea = derivarRecuerdos(campana, state).reliquias[0]?.texto ?? '';
    expect(linea).toContain('Talismán de hueso');
    expect(linea).toContain('nunca deja de estarlo');
  });

  it('lista los Caídos con nombre, clase, nivel y campaña', () => {
    const state = makeState({
      world: makeWorld({
        fallen: [{ name: 'Vera', classId: 'guerrero', level: 2, campaign: 'minimal', scene: 'm_risco' }],
      }),
    });
    const linea = derivarRecuerdos(campana, state).caidos[0]?.texto ?? '';
    expect(linea).toContain('Vera');
    expect(linea).toContain('2');
  });

  it('muestra el título de la campaña para un Caído de la campaña cargada', () => {
    const state = makeState({
      world: makeWorld({
        fallen: [{ name: 'Vera', classId: 'guerrero', level: 2, campaign: 'minimal', scene: 'm_risco' }],
      }),
    });
    const linea = derivarRecuerdos(campana, state).caidos[0]?.texto ?? '';
    expect(linea).toContain(campana.title);
  });

  it('dos Caídos con el mismo nombre en la misma campaña no colisionan de key', () => {
    // `Fallen` no tiene id propio: nombre y campaña no alcanzan para distinguir dos
    // personajes homónimos muertos en la misma crónica, y React con dos keys iguales dibuja
    // uno solo (o reusa el nodo equivocado). Es un caso perfectamente posible: el jugador
    // vuelve a llamar Vera a su siguiente maga.
    const state = makeState({
      world: makeWorld({
        fallen: [
          { name: 'Vera', classId: 'guerrero', level: 2, campaign: 'minimal', scene: 'm_risco' },
          { name: 'Vera', classId: 'mago', level: 4, campaign: 'minimal', scene: 'm_claro' },
        ],
      }),
    });
    const caidos = derivarRecuerdos(campana, state).caidos;
    expect(caidos).toHaveLength(2);
    expect(caidos[0]?.id).not.toBe(caidos[1]?.id);
  });

  it('omite el id de campaña para un Caído de otra campaña', () => {
    const state = makeState({
      world: makeWorld({
        fallen: [{ name: 'Vera', classId: 'guerrero', level: 2, campaign: 'otra', scene: 'm_risco' }],
      }),
    });
    const linea = derivarRecuerdos(campana, state).caidos[0]?.texto ?? '';
    expect(linea).toContain('Vera');
    expect(linea).toContain('Guerrero');
    expect(linea).toContain('2');
    expect(linea).not.toContain('otra'); // no muestra el id de otra campaña
  });
});

describe('derivarCronica', () => {
  it('trae título, final canónico, partidas y finales vistos', () => {
    const character = makeCharacter({
      campaignLog: { minimal: { runs: 3, wins: 1, endings: ['m_fin'], milestones: [], canonEnding: 'm_fin' } },
    });
    const cronica = derivarCronica(campana, character);
    expect(cronica.titulo).toBe(minimal.title);
    expect(cronica.finalCanonico).toBe(minimal.endings.m_fin!.title);
    expect(cronica.partidas).toBe(3);
    expect(cronica.finalesVistos).toBe(1);
    expect(cronica.finalesTotales).toBe(Object.keys(minimal.endings).length);
  });

  it('devuelve finalCanonico null si el personaje nunca ganó', () => {
    const character = makeCharacter({
      campaignLog: { minimal: { runs: 2, wins: 0, endings: [], milestones: [] } },
    });
    expect(derivarCronica(campana, character).finalCanonico).toBeNull();
  });

  it('con una campaña que el personaje nunca jugó, todo en cero', () => {
    expect(derivarCronica(campana, makeCharacter()).partidas).toBe(0);
  });
});
