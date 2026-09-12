import { describe, expect, it } from 'vitest';
import { endRun } from '@/engine/resolve';
import type { Campaign, Effect, Item } from '@/content/schema';
import type { GameState, RunOutcome } from '@/engine/types';
import { makeCtx } from '../fixtures/state';
import { tirada as campaign } from '../fixtures/campaigns/tirada';

/**
 * Partida terminada con `outcome`, con canon previo de esta campaña y de otra ('otra'),
 * flags apostados en stagedFlags y un hito nuevo y otro repetido.
 */
function terminada(outcome: RunOutcome): GameState {
  return makeCtx(campaign, {
    character: {
      flags: ['char:tirada.viejo', 'char:otra.cosa', 'char:met.guardia'],
      campaignLog: { tirada: { runs: 1, wins: 0, endings: [], milestones: ['hito_z'] } },
    },
    world: { flags: ['world:tirada.viejo', 'world:otra.x'], fallen: [] },
    run: {
      sceneId: 't_cripta',
      stagedFlags: ['char:tirada.entro', 'world:tirada.alarma'],
      milestones: ['hito_prueba', 'hito_z'],
      outcome,
    },
  }).state;
}

const FINAL: RunOutcome = { kind: 'ending', endingId: 'fin_prueba' };

describe('endRun · final', () => {
  it('reemplaza el canon de la campaña por lo apostado y conserva el de otras campañas', () => {
    const state = terminada(FINAL);
    const antes = JSON.stringify(state);
    const { world, character, summary } = endRun(campaign, state);
    expect(JSON.stringify(state)).toBe(antes);
    expect(character.flags).toEqual(['char:otra.cosa', 'char:met.guardia', 'char:tirada.entro']);
    expect(world.flags).toEqual(['world:otra.x', 'world:tirada.alarma']);
    expect(character.campaignLog.tirada).toEqual({
      runs: 2,
      wins: 1,
      endings: ['fin_prueba'],
      milestones: ['hito_z', 'hito_prueba'],
      canonEnding: 'fin_prueba',
    });
    expect(character.run).toBeNull();
    expect(character.dead).toBeUndefined();
    expect(world.fallen).toEqual([]);
    expect(summary).toMatchObject({
      outcome: FINAL,
      canonFlags: ['char:tirada.entro', 'world:tirada.alarma'],
      discardedFlags: [],
    });
  });

  it('crea la entrada del registro si no existía y no repite finales ya vistos', () => {
    const state = makeCtx(campaign, { run: { outcome: FINAL } }).state;
    const primera = endRun(campaign, state);
    expect(primera.character.campaignLog.tirada).toEqual({
      runs: 1,
      wins: 1,
      endings: ['fin_prueba'],
      milestones: [],
      canonEnding: 'fin_prueba',
    });
    const segundaState: GameState = { ...state, character: primera.character, world: primera.world };
    const segunda = endRun(campaign, segundaState);
    expect(segunda.character.campaignLog.tirada?.endings).toEqual(['fin_prueba']);
    expect(segunda.character.campaignLog.tirada?.runs).toBe(2);
    expect(segunda.character.campaignLog.tirada?.wins).toBe(2);
  });

  it('un final sin flags apostados borra el canon anterior de la campaña', () => {
    const state = makeCtx(campaign, {
      character: { flags: ['char:tirada.viejo', 'char:met.guardia'] },
      world: { flags: ['world:tirada.viejo'], fallen: [] },
      run: { outcome: FINAL },
    }).state;
    const { world, character, summary } = endRun(campaign, state);
    expect(character.flags).toEqual(['char:met.guardia']);
    expect(world.flags).toEqual([]);
    expect(summary.canonFlags).toEqual([]);
  });
});

describe('endRun · derrota', () => {
  it('descarta lo apostado, suma la partida y conserva los hitos', () => {
    const state = terminada({ kind: 'defeat' });
    const { world, character, summary } = endRun(campaign, state);
    expect(character.flags).toEqual(['char:tirada.viejo', 'char:otra.cosa', 'char:met.guardia']);
    expect(world.flags).toEqual(['world:tirada.viejo', 'world:otra.x']);
    expect(character.campaignLog.tirada).toEqual({
      runs: 2,
      wins: 0,
      endings: [],
      milestones: ['hito_z', 'hito_prueba'],
    });
    expect(character.run).toBeNull();
    expect(character.dead).toBeUndefined();
    expect(world.fallen).toEqual([]);
    expect(summary).toMatchObject({
      outcome: { kind: 'defeat' },
      canonFlags: [],
      discardedFlags: ['char:tirada.entro', 'world:tirada.alarma'],
    });
  });

  it('conserva el canonEnding de una victoria anterior', () => {
    const state = makeCtx(campaign, {
      character: { campaignLog: { tirada: { runs: 1, wins: 1, endings: ['fin_prueba'], milestones: [], canonEnding: 'fin_prueba' } } },
      run: { outcome: { kind: 'defeat' } },
    }).state;
    const { character } = endRun(campaign, state);
    expect(character.campaignLog.tirada).toEqual({
      runs: 2,
      wins: 1,
      endings: ['fin_prueba'],
      milestones: [],
      canonEnding: 'fin_prueba',
    });
  });
});

describe('endRun · muerte', () => {
  it('descarta lo apostado, registra al caído, marca al personaje muerto y escribe world:caido', () => {
    const state = terminada({ kind: 'death' });
    const { world, character, summary } = endRun(campaign, state);
    expect(character.dead).toEqual({ campaign: 'tirada', scene: 't_cripta' });
    expect(character.run).toBeNull();
    expect(character.flags).toEqual(['char:tirada.viejo', 'char:otra.cosa', 'char:met.guardia']);
    expect(character.campaignLog.tirada).toEqual({
      runs: 2,
      wins: 0,
      endings: [],
      milestones: ['hito_z', 'hito_prueba'],
    });
    expect(world.fallen).toEqual([{ name: 'Prueba', classId: 'mago', level: 3, campaign: 'tirada', scene: 't_cripta' }]);
    expect(world.flags).toEqual(['world:tirada.viejo', 'world:otra.x', 'world:caido.tirada']);
    expect(summary).toMatchObject({
      outcome: { kind: 'death' },
      canonFlags: [],
      discardedFlags: ['char:tirada.entro', 'world:tirada.alarma'],
    });
  });

  it('no duplica world:caido si ya estaba y agrega al caído a la lista existente', () => {
    const state = makeCtx(campaign, {
      world: {
        flags: ['world:caido.tirada'],
        fallen: [{ name: 'Anterior', classId: 'guerrero', level: 1, campaign: 'tirada', scene: 't_cripta' }],
      },
      run: { sceneId: 't_sala', outcome: { kind: 'death' } },
    }).state;
    const { world, character } = endRun(campaign, state);
    expect(world.flags).toEqual(['world:caido.tirada']);
    expect(world.fallen).toHaveLength(2);
    expect(world.fallen[1]).toEqual({ name: 'Prueba', classId: 'mago', level: 3, campaign: 'tirada', scene: 't_sala' });
    expect(character.dead).toEqual({ campaign: 'tirada', scene: 't_sala' });
  });
});

describe('endRun · sin desenlace', () => {
  it('lanza si la partida no terminó', () => {
    expect(() => endRun(campaign, makeCtx(campaign).state)).toThrow('La partida no terminó todavía');
  });
});

/* ------------------------------------------------------------------ recompensas de final */

/** Reliquia de prueba: en el juego real las reliquias solo se declaran en `world/items.ts`. */
const RELIQUIA: Item = {
  id: 'reliquia_prueba',
  name: 'Reliquia de prueba',
  icon: 'reliquia_prueba',
  description: 'Una piedra que sobrevive a la partida.',
  relic: true,
};

const OTRA_RELIQUIA: Item = { ...RELIQUIA, id: 'otra_reliquia', name: 'Otra reliquia' };

/** La campaña de prueba con las reliquias declaradas y `fin_prueba` dando la recompensa pedida. */
function conRecompensa(reward: Effect[]): Campaign {
  return {
    ...campaign,
    items: { ...campaign.items, reliquia_prueba: RELIQUIA, otra_reliquia: OTRA_RELIQUIA },
    endings: { fin_prueba: { title: 'Fin de la prueba', reward } },
  };
}

/** Partida terminada con `outcome` y las reliquias que ya trae el personaje. */
function terminadaCon(outcome: RunOutcome, relics: string[] = []): GameState {
  return makeCtx(campaign, {
    character: { relics },
    run: { stagedFlags: ['char:tirada.entro'], outcome },
  }).state;
}

describe('endRun · recompensa del final', () => {
  it('un `give` de un objeto `relic` deja la reliquia en el personaje', () => {
    const conReward = conRecompensa([{ give: 'reliquia_prueba' }]);
    const state = terminadaCon(FINAL);
    const antes = JSON.stringify(state);
    const { character } = endRun(conReward, state);
    expect(character.relics).toEqual(['reliquia_prueba']);
    expect(JSON.stringify(state)).toBe(antes);
  });

  it('no duplica una reliquia que el personaje ya tenía', () => {
    const conReward = conRecompensa([{ give: 'reliquia_prueba' }]);
    const { character } = endRun(conReward, terminadaCon(FINAL, ['reliquia_prueba']));
    expect(character.relics).toEqual(['reliquia_prueba']);
  });

  it('con 2 reliquias no entra una tercera y el final se cierra igual', () => {
    const conReward = conRecompensa([{ give: 'otra_reliquia' }]);
    const state = terminadaCon(FINAL, ['una', 'dos']);
    const { character, summary } = endRun(conReward, state);
    expect(character.relics).toEqual(['una', 'dos']);
    expect(character.campaignLog.tirada?.canonEnding).toBe('fin_prueba');
    expect(summary.outcome).toEqual(FINAL);
  });

  it('un `set` de un flag char: o world: se suma al canon del final', () => {
    const conReward = conRecompensa([{ set: 'char:met.orell' }, { set: 'world:tirada.sello' }]);
    const { character, world, summary } = endRun(conReward, terminadaCon(FINAL));
    expect(character.flags).toEqual(['char:tirada.entro', 'char:met.orell']);
    expect(world.flags).toEqual(['world:tirada.sello']);
    expect(summary.canonFlags).toEqual(['char:tirada.entro', 'char:met.orell', 'world:tirada.sello']);
  });

  it('ignora los efectos sin semántica de recompensa sin romper el cierre', () => {
    const conReward = conRecompensa([
      { give: 'llave' },
      { set: 'run:leyo' },
      { wound: 1 },
      { milestone: 'hito_prueba' },
    ]);
    const { character, world, summary } = endRun(conReward, terminadaCon(FINAL));
    expect(character.relics).toEqual([]);
    expect(character.flags).toEqual(['char:tirada.entro']);
    expect(world.flags).toEqual([]);
    expect(character.campaignLog.tirada?.milestones).toEqual([]);
    expect(summary.canonFlags).toEqual(['char:tirada.entro']);
  });

  it('la derrota no aplica la recompensa', () => {
    const conReward = conRecompensa([{ give: 'reliquia_prueba' }, { set: 'world:tirada.sello' }]);
    const { character, world } = endRun(conReward, terminadaCon({ kind: 'defeat' }));
    expect(character.relics).toEqual([]);
    expect(world.flags).toEqual([]);
  });

  it('la muerte no aplica la recompensa', () => {
    const conReward = conRecompensa([{ give: 'reliquia_prueba' }, { set: 'world:tirada.sello' }]);
    const { character, world } = endRun(conReward, terminadaCon({ kind: 'death' }));
    expect(character.relics).toEqual([]);
    expect(world.flags).toEqual(['world:caido.tirada']);
  });

  it('un final sin `reward` deja las reliquias como estaban', () => {
    const { character } = endRun(campaign, terminadaCon(FINAL, ['una']));
    expect(character.relics).toEqual(['una']);
  });
});

/* ------------------------------------------------------------------ XP y subida de nivel */

/**
 * La campaña de prueba declara `levelRange: [1, 3]`, así que su tope es el nivel 4
 * (180 XP acumulados) y un personaje de nivel 3 la juega en Pareja (bono 40).
 * El personaje del fixture arranca con nivel 3 y 120 XP.
 */
describe('endRun · XP', () => {
  it('la primera victoria cobra hitos nuevos, final nuevo y bono, y descarta lo que pasa el tope', () => {
    const { character, summary } = endRun(campaign, terminada(FINAL));
    // 1 hito nuevo (hito_z ya estaba) = 10, final nuevo = 30, primera victoria en Pareja = 40.
    expect(summary.xp.ganancia).toMatchObject({ hitos: 10, finales: 30, bono: 40, total: 80 });
    expect(summary.xp.ganancia.detalle).toHaveLength(3);
    expect(summary.xp.otorgada).toBe(60);
    expect(summary.xp.descartada).toBe(20);
    expect(summary.xp.xpAntes).toBe(120);
    expect(summary.xp.xpDespues).toBe(180);
    expect(summary.xp.nivelAntes).toBe(3);
    expect(summary.xp.nivelDespues).toBe(4);
    expect(summary.xp.topeNivel).toBe(4);
    expect(summary.xp.topeAlcanzado).toBe(true);
    expect(summary.xp.premios).toEqual([{ kind: 'atributo' }]);
    expect(character.xp).toBe(180);
    expect(character.level).toBe(4);
  });

  it('el premio de nivel queda pendiente: el motor no toca atributos ni habilidades', () => {
    const antes = terminada(FINAL);
    const { character } = endRun(campaign, antes);
    expect(character.attrs).toEqual(antes.character.attrs);
    expect(character.skills).toEqual(antes.character.skills);
  });

  it('una victoria repetida no cobra bono ni final ya visto', () => {
    const state = makeCtx(campaign, {
      character: {
        xp: 0,
        level: 1,
        campaignLog: { tirada: { runs: 1, wins: 1, endings: ['fin_prueba'], milestones: ['hito_z'], canonEnding: 'fin_prueba' } },
      },
      run: { milestones: ['hito_z'], outcome: FINAL },
    }).state;
    const { character, summary } = endRun(campaign, state);
    expect(summary.xp.ganancia.total).toBe(0);
    expect(summary.xp.otorgada).toBe(0);
    expect(summary.xp.premios).toEqual([]);
    expect(character.xp).toBe(0);
    expect(character.level).toBe(1);
  });

  it('la derrota conserva la XP de los hitos nuevos, sin bono ni final', () => {
    const { character, summary } = endRun(campaign, terminada({ kind: 'defeat' }));
    expect(summary.xp.ganancia).toMatchObject({ hitos: 10, finales: 0, bono: 0, total: 10 });
    expect(summary.xp.otorgada).toBe(10);
    expect(character.xp).toBe(130);
    expect(character.level).toBe(3);
  });

  it('la muerte no deja XP: el personaje no vuelve a jugar', () => {
    const { character, summary } = endRun(campaign, terminada({ kind: 'death' }));
    expect(summary.xp.ganancia.total).toBe(0);
    expect(summary.xp.otorgada).toBe(0);
    expect(character.xp).toBe(120);
    expect(character.level).toBe(3);
    expect(character.dead).toBeDefined();
  });

  it('el nivel 10 marca al personaje como leyenda y el flag lo escribe el motor', () => {
    const alta: Campaign = { ...campaign, levelRange: [8, 9] };
    const state = makeCtx(alta, {
      character: { xp: 530, level: 9, flags: ['char:met.guardia'] },
      run: { milestones: ['hito_prueba'], outcome: FINAL },
    }).state;
    const { character, summary } = endRun(alta, state);
    expect(summary.xp.nivelDespues).toBe(10);
    expect(summary.xp.premios).toEqual([{ kind: 'atributo' }, { kind: 'leyenda' }]);
    expect(character.level).toBe(10);
    expect(character.xp).toBe(540);
    expect(character.flags).toContain('char:leyenda');
  });

  it('sin llegar al nivel 10 no hay flag de leyenda', () => {
    const { character } = endRun(campaign, terminada(FINAL));
    expect(character.flags).not.toContain('char:leyenda');
  });

  it('la dificultad relativa del bono se mide con el nivel con el que se jugó', () => {
    const state = makeCtx(campaign, {
      character: { xp: 0, level: 1, campaignLog: {} },
      run: { milestones: [], outcome: FINAL },
    }).state;
    // campaignLabel([1, 3], 1) = 'pareja' → bono 40, más 30 del final nuevo.
    const { summary } = endRun(campaign, state);
    expect(summary.xp.ganancia.bono).toBe(40);
    expect(summary.xp.otorgada).toBe(70);
    expect(summary.xp.nivelDespues).toBe(2);
    expect(summary.xp.premios).toEqual([{ kind: 'atributo' }]);
  });
});
