import { describe, expect, it } from 'vitest';
import { endRun } from '@/engine/resolve';
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
    expect(summary).toEqual({
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
    expect(summary).toEqual({
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
    expect(summary).toEqual({
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
