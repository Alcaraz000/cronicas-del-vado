import { describe, expect, it } from 'vitest';
import { FUMBLE_DEFAULT_CONDITION } from '@/content/catalog';
import { classify, keepDice } from '@/engine/dice';
import { rollDice } from '@/engine/rng';
import { hashParagraph } from '@/engine/text';
import {
  beginRoll,
  choose,
  commitRoll,
  enter,
  rerollDie,
  restorePending,
  usePlegaria,
  usePower,
} from '@/engine/resolve';
import type { Band, GameState, LogEntry, PendingRoll } from '@/engine/types';
import { makeCtx, type StateOverrides } from '../fixtures/state';
import { findSeed, tirada as campaign, withSeed } from '../fixtures/campaigns/tirada';

type SceneEntry = Extract<LogEntry, { kind: 'scene' }>;

/** Estado recién entrado a `sceneId` (con su LogEntry 'scene'), sin memoria derivada todavía. */
function estadoEn(sceneId: string, overrides: StateOverrides = {}): GameState {
  return enter(campaign, makeCtx(campaign, overrides).state, sceneId);
}

function kinds(log: LogEntry[]): string[] {
  return log.map((e) => e.kind);
}

function sceneEntries(log: LogEntry[]): SceneEntry[] {
  return log.filter((e): e is SceneEntry => e.kind === 'scene');
}

function textos(entry: { paragraphs: { text: string }[] }): string[] {
  return entry.paragraphs.map((p) => p.text);
}

/** Copia del pending con otra banda: sirve para probar reglas sin depender de los dados. */
function forzar(p: PendingRoll, band: Band): PendingRoll {
  return { ...p, band };
}

const GUERRERO: StateOverrides = {
  character: { classId: 'guerrero', traits: [], attrs: { vigor: 2, astucia: 1, saber: 1, presencia: 0 } },
};

const CLERIGO: StateOverrides = {
  character: { classId: 'clerigo', traits: [], attrs: { vigor: 0, astucia: 1, saber: 1, presencia: 2 } },
};

describe('choose', () => {
  it('deriva la memoria de la escena actual ANTES de aplicar efectos y entrar', () => {
    const state = estadoEn('t_inicio');
    const antes = JSON.stringify(state);
    const inicio = sceneEntries(state.run.log)[0]!;
    // Primera visita: ni "otra vez" ni "ya lo conocés".
    expect(textos(inicio)).toEqual([
      'Una plaza empedrada bajo la lluvia. Un guardia vigila la única puerta.',
      'Al guardia no lo viste nunca.',
    ]);

    const next = choose(campaign, state, 'pasar');

    expect(JSON.stringify(state)).toBe(antes);
    expect(next.character.flags).toHaveLength(2);
    expect(next.character.flags).toEqual(expect.arrayContaining(['char:met.guardia', 'char:place.plaza_de_prueba']));
    expect(next.run.visited).toEqual({ t_inicio: 1 });
    expect(next.seen).toEqual({ t_inicio: inicio.hashes });
    expect(inicio.hashes).toEqual(textos(inicio).map(hashParagraph));
    expect(next.run.flags).toEqual(['run:paso']);
    expect(next.run.stagedFlags).toEqual(['char:tirada.entro']);
    expect(next.run.sceneId).toBe('t_sala');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome', 'scene']);
    // La escena siguiente ya ve el flag run:paso y el char:met.guardia derivado.
    const sala = sceneEntries(next.run.log)[1]!;
    expect(textos(sala)).toEqual([
      'Entraste sin tirar nada: la sala está en silencio.',
      'El guardia te sigue con la mirada; ya lo conocés.',
    ]);
  });

  it('al volver, la plaza muestra las variantes de visita previa y de PNJ conocido', () => {
    const s1 = choose(campaign, estadoEn('t_inicio'), 'pasar');
    const s2 = choose(campaign, s1, 'volver');
    expect(s2.run.visited).toEqual({ t_inicio: 1, t_sala: 1 });
    expect(s2.seen.t_sala).toHaveLength(2);
    const entradas = sceneEntries(s2.run.log);
    expect(entradas).toHaveLength(3);
    expect(textos(entradas[2]!)).toEqual(['La plaza de prueba, otra vez.', 'Al guardia ya lo conocés de otra noche.']);
  });

  it('registra la elección y el texto del desenlace en el log', () => {
    const next = choose(campaign, estadoEn('t_inicio'), 'pasar');
    expect(next.run.log[1]).toEqual({ kind: 'choice', sceneId: 't_inicio', choiceId: 'pasar', label: 'Cruzar la puerta sin más' });
    expect(next.run.log[2]).toEqual({ kind: 'outcome', paragraphs: [{ text: 'Cruzás sin mirar atrás.' }] });
  });

  it('sin texto de desenlace no agrega entrada outcome', () => {
    const enSala = choose(campaign, estadoEn('t_inicio'), 'pasar');
    const next = choose(campaign, enSala, 'volver');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome', 'scene', 'choice', 'scene']);
  });

  it('si el log no tiene la escena actual, calcula los hashes con resolveText', () => {
    const crudo = makeCtx(campaign).state; // sceneId t_inicio, log vacío
    const next = choose(campaign, crudo, 'pasar');
    expect(next.seen.t_inicio).toEqual([
      hashParagraph('Una plaza empedrada bajo la lluvia. Un guardia vigila la única puerta.'),
      hashParagraph('Al guardia no lo viste nunca.'),
    ]);
  });

  it('lanza si la opción tiene tirada o no existe', () => {
    const state = estadoEn('t_inicio');
    expect(() => choose(campaign, state, 'saber')).toThrow('La opción requiere una tirada: saber');
    expect(() => choose(campaign, state, 'nada')).toThrow('Opción desconocida: nada (escena t_inicio)');
  });

  it('si el desenlace deja Caído, no entra a la escena siguiente y run.outcome queda', () => {
    const state = estadoEn('t_sala', { run: { wounds: 1 } });
    const next = choose(campaign, state, 'rendirse');
    expect(next.run.wounds).toBe(3);
    expect(next.run.outcome).toEqual({ kind: 'defeat' });
    expect(next.run.sceneId).toBe('t_sala');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome']);
    expect(next.run.visited).toEqual({ t_sala: 1 });
  });

  it('limpia run.pending: una tirada pendiente de la escena que se abandona no sobrevive al choose', () => {
    const state = estadoEn('t_inicio', { run: { pending: { choiceId: 'mirar', rerolls: [], powerUsed: false } } });
    const next = choose(campaign, state, 'pasar');
    expect(next.run.pending).toBeUndefined();
    expect('pending' in next.run).toBe(false);
  });

  it('un pending abandonado con el Poder ya marcado no le devuelve el Poder gratis al jugador', () => {
    const state = estadoEn('t_inicio', { run: { pending: { choiceId: 'mirar', rerolls: [], powerUsed: true } } });
    const next = choose(campaign, state, 'pasar');
    expect(next.run.powerUsed).toBe(false);
    expect(next.run.pending).toBeUndefined();
    expect('pending' in next.run).toBe(false);
    // Sin pending que restaurar, restorePending no tiene nada equivocado para resolver.
    expect(restorePending(campaign, next)).toBeNull();
  });
});

describe('beginRoll', () => {
  it('no muta el estado y es determinista', () => {
    const state = estadoEn('t_inicio');
    const antes = JSON.stringify(state);
    const p1 = beginRoll(campaign, state, 'saber');
    const p2 = beginRoll(campaign, state, 'saber');
    expect(JSON.stringify(state)).toBe(antes);
    expect(p1).toEqual(p2);
    expect(state.run.pending).toBeUndefined();
  });

  it('con ventaja tira 3 dados y deriva kept, total y banda de dice.ts', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'saber'); // mago con Aprendiz de escriba → ventaja en saber
    expect(p.choiceId).toBe('saber');
    expect(p.sceneId).toBe('t_inicio');
    expect(p.preview.mode).toBe('advantage');
    expect(p.preview.totalMod).toBe(2); // saber 2 + normal 0 + veterano 0 (nivel 3 en rango [1,3])
    expect(p.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'saber', 0, 0, 3));
    expect(p.dice).toHaveLength(3);
    expect(p.kept).toEqual(keepDice(p.dice, 'advantage'));
    const valores = p.kept.map((i) => p.dice[i]!);
    expect(p.total).toBe(valores[0]! + valores[1]! + 2);
    expect(p.band).toBe(classify(valores, 2));
    expect(p.rerolls).toEqual([]);
    expect(p.powerUsed).toBe(false);
    expect(p.canReroll).toBe(true);
  });

  it('con desventaja tira 3 dados y en tirada normal tira 2', () => {
    const state = estadoEn('t_inicio');
    const fuerza = beginRoll(campaign, state, 'fuerza'); // Debilidad del mago: fisico
    expect(fuerza.preview.mode).toBe('disadvantage');
    expect(fuerza.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'fuerza', 0, 0, 3));
    expect(fuerza.kept).toEqual(keepDice(fuerza.dice, 'disadvantage'));
    const mirar = beginRoll(campaign, state, 'mirar'); // percepcion: sin fuentes
    expect(mirar.preview.mode).toBe('normal');
    expect(mirar.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'mirar', 0, 0, 2));
    expect(mirar.kept).toEqual([0, 1]);
  });

  it('usa el contador de visitas de la escena actual en el hash', () => {
    const state = estadoEn('t_inicio', { run: { visited: { t_inicio: 2 } } });
    const p = beginRoll(campaign, state, 'mirar');
    expect(p.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'mirar', 2, 0, 2));
  });

  it('canReroll es falso sin Fortuna', () => {
    const p = beginRoll(campaign, estadoEn('t_inicio', { run: { fortune: 0 } }), 'mirar');
    expect(p.canReroll).toBe(false);
  });

  it('lanza si la opción no tiene tirada o no existe', () => {
    const state = estadoEn('t_inicio');
    expect(() => beginRoll(campaign, state, 'pasar')).toThrow('La opción no tiene tirada: pasar');
    expect(() => beginRoll(campaign, state, 'nada')).toThrow('Opción desconocida: nada (escena t_inicio)');
  });
});

describe('rerollDie', () => {
  it('cambia solo el dado elegido usando attempt = rerolls.length + 1', () => {
    const state = estadoEn('t_inicio');
    const seed = state.run.rngSeed;
    const p0 = beginRoll(campaign, state, 'mirar');
    const p1 = rerollDie(campaign, state, p0, 1);
    expect(p1.dice[0]).toBe(p0.dice[0]);
    expect(p1.dice[1]).toBe(rollDice(seed, 't_inicio', 'mirar', 0, 1, 1)[0]);
    expect(p1.rerolls).toEqual([1]);
    const p2 = rerollDie(campaign, state, p1, 0);
    expect(p2.dice[0]).toBe(rollDice(seed, 't_inicio', 'mirar', 0, 2, 1)[0]);
    expect(p2.dice[1]).toBe(p1.dice[1]);
    expect(p2.rerolls).toEqual([1, 0]);
    // Los pending anteriores y el estado no cambian.
    expect(p0.rerolls).toEqual([]);
    expect(p0.dice).toEqual(rollDice(seed, 't_inicio', 'mirar', 0, 0, 2));
    expect(p1.rerolls).toEqual([1]);
    expect(state.run.fortune).toBe(3);
  });

  it('recalcula kept, total y banda con los dados nuevos', () => {
    const state = estadoEn('t_inicio');
    const p = rerollDie(campaign, state, beginRoll(campaign, state, 'saber'), 2);
    expect(p.kept).toEqual(keepDice(p.dice, 'advantage'));
    const valores = p.kept.map((i) => p.dice[i]!);
    expect(p.total).toBe(valores[0]! + valores[1]! + p.preview.totalMod);
    expect(p.band).toBe(classify(valores, p.preview.totalMod));
  });

  it('gasta Fortuna virtualmente: canReroll se apaga y después lanza', () => {
    const state = estadoEn('t_inicio', { run: { fortune: 1 } });
    const p0 = beginRoll(campaign, state, 'mirar');
    expect(p0.canReroll).toBe(true);
    const p1 = rerollDie(campaign, state, p0, 0);
    expect(p1.canReroll).toBe(false);
    expect(() => rerollDie(campaign, state, p1, 1)).toThrow('No queda Fortuna para repetir un dado');
    expect(state.run.fortune).toBe(1);
  });

  it('lanza con índice de dado inválido', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'mirar');
    expect(() => rerollDie(campaign, state, p, 2)).toThrow('Índice de dado inválido: 2');
    expect(() => rerollDie(campaign, state, p, -1)).toThrow('Índice de dado inválido: -1');
  });
});

describe('usePower', () => {
  it('el mago convierte un Fallo en Éxito con costo en cualquier tirada', () => {
    const state = estadoEn('t_inicio');
    const p = forzar(beginRoll(campaign, state, 'mirar'), 'failure');
    const q = usePower(campaign, state, p);
    expect(q.band).toBe('partial');
    expect(q.powerUsed).toBe(true);
    expect(q.canUsePower).toBe(false);
    expect(q.dice).toEqual(p.dice);
    expect(q.rerolls).toEqual(p.rerolls);
    // No muta el pending de entrada.
    expect(p.band).toBe('failure');
    expect(p.powerUsed).toBe(false);
  });

  it('también convierte un Fallo grave', () => {
    const state = estadoEn('t_inicio');
    const q = usePower(campaign, state, forzar(beginRoll(campaign, state, 'saber'), 'fumble'));
    expect(q.band).toBe('partial');
    expect(q.powerUsed).toBe(true);
  });

  it('no aplica sobre éxito, éxito con costo ni crítico', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'mirar');
    for (const band of ['success', 'partial', 'crit'] as const) {
      expect(() => usePower(campaign, state, forzar(p, band))).toThrow('El Poder no se puede usar en esta tirada');
    }
  });

  it('el guerrero solo puede usar Furia en tiradas con tag fisico', () => {
    const state = estadoEn('t_inicio', GUERRERO);
    const fisica = forzar(beginRoll(campaign, state, 'fuerza'), 'failure');
    expect(usePower(campaign, state, fisica).band).toBe('partial');
    const mental = forzar(beginRoll(campaign, state, 'saber'), 'failure');
    expect(() => usePower(campaign, state, mental)).toThrow('El Poder no se puede usar en esta tirada');
    expect(mental.canUsePower).toBe(false);
  });

  it('el clérigo nunca usa su Poder desde una tirada', () => {
    const state = estadoEn('t_inicio', CLERIGO);
    for (const id of ['saber', 'fuerza', 'mirar']) {
      const p = forzar(beginRoll(campaign, state, id), 'failure');
      expect(() => usePower(campaign, state, p)).toThrow('El Poder no se puede usar en esta tirada');
    }
  });

  it('no se puede usar dos veces: ni en la misma tirada ni si run.powerUsed ya está', () => {
    const state = estadoEn('t_inicio');
    const q = usePower(campaign, state, forzar(beginRoll(campaign, state, 'mirar'), 'failure'));
    expect(() => usePower(campaign, state, forzar(q, 'failure'))).toThrow('El Poder no se puede usar en esta tirada');
    const gastado = estadoEn('t_inicio', { run: { powerUsed: true } });
    const p = beginRoll(campaign, gastado, 'mirar');
    expect(p.canUsePower).toBe(false);
    expect(() => usePower(campaign, gastado, forzar(p, 'failure'))).toThrow('El Poder no se puede usar en esta tirada');
  });

  it('beginRoll deja canUsePower coherente con la banda real', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'mirar');
    expect(p.canUsePower).toBe(p.band === 'failure' || p.band === 'fumble');
  });

  it('tras usar el Poder, repetir un dado nunca vuelve a Fallo', () => {
    const base = estadoEn('t_inicio');
    const seed = findSeed((s) => beginRoll(campaign, s, 'mirar'), 'failure', base);
    const state = withSeed(base, seed);
    const q = usePower(campaign, state, beginRoll(campaign, state, 'mirar'));
    const r = rerollDie(campaign, state, q, 0);
    const valores = r.kept.map((i) => r.dice[i]!);
    const cruda = classify(valores, r.preview.totalMod);
    expect(r.band).toBe(cruda === 'failure' || cruda === 'fumble' ? 'partial' : cruda);
    expect(r.powerUsed).toBe(true);
    expect(r.canUsePower).toBe(false);
  });
});

describe('usePlegaria', () => {
  it('el clérigo cura 1 Herida, limpia condiciones y gasta el Poder', () => {
    const state = estadoEn('t_inicio', { ...CLERIGO, run: { wounds: 2, conditions: ['asustado', 'empapado'] } });
    const antes = JSON.stringify(state);
    const next = usePlegaria(campaign, state);
    expect(next.run.wounds).toBe(1);
    expect(next.run.conditions).toEqual([]);
    expect(next.run.powerUsed).toBe(true);
    expect(JSON.stringify(state)).toBe(antes);
  });

  it('sano: las Heridas quedan en 0', () => {
    const next = usePlegaria(campaign, estadoEn('t_inicio', { ...CLERIGO, run: { conditions: ['asustado'] } }));
    expect(next.run.wounds).toBe(0);
    expect(next.run.conditions).toEqual([]);
    expect(next.run.powerUsed).toBe(true);
  });

  it('con el Poder ya usado devuelve el mismo estado', () => {
    const state = estadoEn('t_inicio', { ...CLERIGO, run: { wounds: 2, powerUsed: true } });
    expect(usePlegaria(campaign, state)).toBe(state);
  });

  it('otra clase devuelve el mismo estado', () => {
    const state = estadoEn('t_inicio', { run: { wounds: 2, conditions: ['asustado'] } }); // mago
    expect(usePlegaria(campaign, state)).toBe(state);
  });
});

describe('restorePending', () => {
  it('devuelve null si no hay tirada pendiente', () => {
    expect(restorePending(campaign, estadoEn('t_inicio'))).toBeNull();
  });

  it('sin rerolls ni Poder equivale a beginRoll', () => {
    const state = estadoEn('t_inicio', { run: { pending: { choiceId: 'saber', rerolls: [], powerUsed: false } } });
    expect(restorePending(campaign, state)).toEqual(beginRoll(campaign, state, 'saber'));
  });

  it('reproduce exactamente un pending con dos rerolls y Poder (mismos dados y banda)', () => {
    const base = estadoEn('t_inicio');
    const construir = (s: GameState): PendingRoll =>
      rerollDie(campaign, s, rerollDie(campaign, s, beginRoll(campaign, s, 'mirar'), 0), 1);
    const seed = findSeed(construir, 'failure', base);
    const state = withSeed(base, seed);
    const esperado = usePower(campaign, state, construir(state));
    const conPending: GameState = {
      ...state,
      run: { ...state.run, pending: { choiceId: 'mirar', rerolls: [0, 1], powerUsed: true } },
    };
    const restaurado = restorePending(campaign, conPending);
    expect(restaurado).toEqual(esperado);
    expect(restaurado?.dice).toEqual(esperado.dice);
    expect(restaurado?.band).toBe('partial');
    expect(restaurado?.rerolls).toEqual([0, 1]);
    expect(restaurado?.powerUsed).toBe(true);
    expect(restaurado?.canUsePower).toBe(false);
  });

  it('si el Poder se usó y después un dado repetido dio éxito, conserva powerUsed sin cambiar la banda', () => {
    const base = estadoEn('t_inicio');
    const construir = (s: GameState): PendingRoll => rerollDie(campaign, s, beginRoll(campaign, s, 'mirar'), 0);
    const seed = findSeed(construir, 'success', base);
    const state = withSeed(base, seed);
    const conPending: GameState = {
      ...state,
      run: { ...state.run, pending: { choiceId: 'mirar', rerolls: [0], powerUsed: true } },
    };
    const restaurado = restorePending(campaign, conPending);
    expect(restaurado?.band).toBe('success');
    expect(restaurado?.powerUsed).toBe(true);
    expect(restaurado?.canUsePower).toBe(false);
    expect(restaurado?.dice).toEqual(construir(state).dice);
  });
});

describe('commitRoll', () => {
  it('aplica el desenlace de la banda, deriva memoria, registra el log y entra a next', () => {
    const state = estadoEn('t_inicio');
    const antes = JSON.stringify(state);
    const p = forzar(beginRoll(campaign, state, 'saber'), 'success');

    const next = commitRoll(campaign, state, p);

    expect(JSON.stringify(state)).toBe(antes);
    expect(next.run.flags).toEqual(['run:leyo']);
    expect(next.run.sceneId).toBe('t_sala');
    expect(next.run.visited).toEqual({ t_inicio: 1 });
    expect(next.character.flags).toEqual(expect.arrayContaining(['char:met.guardia', 'char:place.plaza_de_prueba']));
    expect(next.seen.t_inicio).toHaveLength(2);
    expect(next.run.pending).toBeUndefined();
    expect(next.run.fortune).toBe(3);
    expect(next.run.powerUsed).toBe(false);
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'roll', 'outcome', 'scene']);
    expect(next.run.log[1]).toEqual({ kind: 'choice', sceneId: 't_inicio', choiceId: 'saber', label: 'Leer la inscripción del dintel' });
    expect(next.run.log[2]).toEqual({
      kind: 'roll',
      dice: p.dice,
      kept: p.kept,
      mode: 'advantage',
      total: p.total,
      band: 'success',
      fortuneSpent: 0,
      powerUsed: false,
    });
    expect(next.run.log[3]).toEqual({ kind: 'outcome', paragraphs: [{ text: 'La inscripción cede su sentido.' }] });
    // La escena siguiente ya ve la memoria derivada.
    const sala = sceneEntries(next.run.log)[1]!;
    expect(textos(sala)[1]).toBe('El guardia te sigue con la mirada; ya lo conocés.');
  });

  it('sin texto de desenlace no agrega entrada outcome', () => {
    const state = estadoEn('t_inicio');
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'mirar'), 'partial'));
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'roll', 'scene']);
  });

  it('crítico: usa outcomes.crit y suma 1 Fortuna con tope', () => {
    const conUna = estadoEn('t_inicio', { run: { fortune: 1 } });
    const n1 = commitRoll(campaign, conUna, forzar(beginRoll(campaign, conUna, 'saber'), 'crit'));
    expect(n1.run.fortune).toBe(2);
    expect(n1.run.items).toEqual(['llave']);
    expect(n1.run.flags).toEqual([]); // no se aplicó success
    const llena = estadoEn('t_inicio'); // fortuna 3 = fortuneMax(nivel 3)
    const n2 = commitRoll(campaign, llena, forzar(beginRoll(campaign, llena, 'saber'), 'crit'));
    expect(n2.run.fortune).toBe(3);
  });

  it('crítico sin outcomes.crit usa success y aun así suma Fortuna', () => {
    const state = estadoEn('t_inicio', { run: { fortune: 2 } });
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'fuerza'), 'crit'));
    expect(next.run.wounds).toBe(0);
    expect(next.run.fortune).toBe(3);
    expect(next.run.sceneId).toBe('t_sala');
    expect(next.run.log[3]).toEqual({ kind: 'outcome', paragraphs: [{ text: 'La puerta cede.' }] });
  });

  it('fallo grave con outcomes.fumble no agrega la condición por defecto', () => {
    const state = estadoEn('t_inicio');
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'saber'), 'fumble'));
    expect(next.run.wounds).toBe(1);
    expect(next.run.conditions).toEqual([]);
  });

  it('fallo grave sin outcomes.fumble usa failure y agrega FUMBLE_DEFAULT_CONDITION', () => {
    const state = estadoEn('t_inicio');
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'fuerza'), 'fumble'));
    expect(next.run.wounds).toBe(1);
    expect(next.run.conditions).toEqual([FUMBLE_DEFAULT_CONDITION]);
    expect(next.run.log[2]).toMatchObject({ kind: 'roll', band: 'fumble' });
  });

  it('descuenta de la Fortuna los dados repetidos y lo registra en el log', () => {
    const state = estadoEn('t_inicio');
    const p = rerollDie(campaign, state, rerollDie(campaign, state, beginRoll(campaign, state, 'mirar'), 0), 1);
    const next = commitRoll(campaign, state, forzar(p, 'partial'));
    expect(next.run.fortune).toBe(1);
    expect(next.run.log[2]).toMatchObject({ kind: 'roll', fortuneSpent: 2, dice: p.dice });
  });

  it('crítico con un dado repetido: primero suma con tope, después descuenta', () => {
    const state = estadoEn('t_inicio'); // fortuna 3
    const p = rerollDie(campaign, state, beginRoll(campaign, state, 'saber'), 0);
    const next = commitRoll(campaign, state, forzar(p, 'crit'));
    expect(next.run.fortune).toBe(2);
  });

  it('con Poder usado marca run.powerUsed y deja Agotado al mago', () => {
    const state = estadoEn('t_inicio');
    const p = usePower(campaign, state, forzar(beginRoll(campaign, state, 'mirar'), 'failure'));
    const next = commitRoll(campaign, state, p);
    expect(next.run.powerUsed).toBe(true);
    expect(next.run.conditions).toEqual(['agotado']);
    expect(next.run.log[2]).toMatchObject({ kind: 'roll', band: 'partial', powerUsed: true });
    expect(next.run.sceneId).toBe('t_sala');
  });

  it('el guerrero con Furia no queda Agotado', () => {
    const state = estadoEn('t_inicio', GUERRERO);
    const p = usePower(campaign, state, forzar(beginRoll(campaign, state, 'fuerza'), 'failure'));
    const next = commitRoll(campaign, state, p);
    expect(next.run.powerUsed).toBe(true);
    expect(next.run.conditions).toEqual([]);
    expect(next.run.wounds).toBe(1); // partial de 'fuerza'
  });

  it('si el desenlace deja Caído, no entra a next y run.outcome queda', () => {
    const state = estadoEn('t_inicio', { run: { wounds: 2 } });
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'fuerza'), 'failure'));
    expect(next.run.wounds).toBe(3);
    expect(next.run.outcome).toEqual({ kind: 'defeat' });
    expect(next.run.sceneId).toBe('t_inicio');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'roll', 'outcome']);
    expect(next.run.pending).toBeUndefined();
  });

  it('un golpe mortal sobre Malherido mata y no entra a next', () => {
    const state = estadoEn('t_cripta', { run: { wounds: 2 } });
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'cruzar'), 'failure'));
    expect(next.run.wounds).toBe(3);
    expect(next.run.outcome).toEqual({ kind: 'death' });
    expect(next.run.sceneId).toBe('t_cripta');
  });

  it('un golpe mortal sobre Sano deja Malherido y sigue', () => {
    const state = estadoEn('t_cripta');
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'cruzar'), 'failure'));
    expect(next.run.wounds).toBe(2);
    expect(next.run.outcome).toBeUndefined();
    expect(next.run.sceneId).toBe('t_sala');
  });

  it('limpia run.pending persistido', () => {
    const state = estadoEn('t_inicio', { run: { pending: { choiceId: 'mirar', rerolls: [], powerUsed: false } } });
    const next = commitRoll(campaign, state, beginRoll(campaign, state, 'mirar'));
    expect(next.run.pending).toBeUndefined();
    expect('pending' in next.run).toBe(false);
  });

  it('lanza si la tirada pendiente es de otra escena', () => {
    const p = beginRoll(campaign, estadoEn('t_inicio'), 'mirar');
    const otra = estadoEn('t_sala');
    expect(() => commitRoll(campaign, otra, p)).toThrow('La tirada pendiente es de otra escena: t_inicio');
  });
});
