import { describe, expect, it } from 'vitest';
import { bandOdds, classify, keepDice, odds, riskLabel, targetLine } from '@/engine/dice';

describe('keepDice', () => {
  it('normal y cancelled conservan siempre los índices 0 y 1', () => {
    expect(keepDice([1, 6], 'normal')).toEqual([0, 1]);
    expect(keepDice([1, 6], 'cancelled')).toEqual([0, 1]);
    expect(keepDice([1, 6, 3], 'normal')).toEqual([0, 1]);
  });

  it('advantage conserva los índices de los dos mayores', () => {
    expect(keepDice([2, 6, 4], 'advantage')).toEqual([1, 2]);
    expect(keepDice([6, 1, 5], 'advantage')).toEqual([0, 2]);
    expect(keepDice([1, 2, 6], 'advantage')).toEqual([1, 2]);
  });

  it('disadvantage conserva los índices de los dos menores', () => {
    expect(keepDice([2, 6, 4], 'disadvantage')).toEqual([0, 2]);
    expect(keepDice([6, 1, 5], 'disadvantage')).toEqual([1, 2]);
    expect(keepDice([1, 2, 6], 'disadvantage')).toEqual([0, 1]);
  });

  it('con empates elige el índice menor y devuelve los índices ordenados', () => {
    expect(keepDice([3, 5, 3], 'advantage')).toEqual([0, 1]);
    expect(keepDice([3, 5, 3], 'disadvantage')).toEqual([0, 2]);
    expect(keepDice([4, 4, 4], 'advantage')).toEqual([0, 1]);
    expect(keepDice([4, 4, 4], 'disadvantage')).toEqual([0, 1]);
    expect(keepDice([5, 3, 5], 'advantage')).toEqual([0, 2]);
  });

  it('con dos dados en advantage o disadvantage conserva ambos', () => {
    expect(keepDice([2, 5], 'advantage')).toEqual([0, 1]);
    expect(keepDice([2, 5], 'disadvantage')).toEqual([0, 1]);
  });

  it('no muta la entrada y devuelve un array nuevo', () => {
    const dice = [3, 5, 3];
    const copia = [...dice];
    const kept = keepDice(dice, 'advantage');
    expect(dice).toEqual(copia);
    expect(kept).not.toBe(dice);
  });
});

describe('classify', () => {
  it('clasifica por el total (suma de conservados + modificador)', () => {
    expect(classify([5, 5], 0)).toBe('success'); // 10
    expect(classify([6, 5], 0)).toBe('success'); // 11
    expect(classify([4, 5], 1)).toBe('success'); // 10
    expect(classify([4, 3], 0)).toBe('partial'); // 7
    expect(classify([4, 5], 0)).toBe('partial'); // 9
    expect(classify([1, 2], 5)).toBe('partial'); // 8
    expect(classify([3, 3], 0)).toBe('failure'); // 6
    expect(classify([6, 3], -3)).toBe('failure'); // 6
    expect(classify([1, 2], 0)).toBe('failure'); // 3
  });

  it('doble 6 natural es crit aunque el total sea bajo', () => {
    expect(classify([6, 6], -5)).toBe('crit');
    expect(classify([6, 6], 0)).toBe('crit');
  });

  it('doble 1 natural es fumble aunque el total sea alto', () => {
    expect(classify([1, 1], 9)).toBe('fumble');
    expect(classify([1, 1], 0)).toBe('fumble');
  });

  it('otros dobles no son naturales', () => {
    expect(classify([5, 5], 0)).toBe('success');
    expect(classify([4, 4], 0)).toBe('partial');
    expect(classify([2, 2], 0)).toBe('failure');
  });

  it('no muta la entrada', () => {
    const kept = [6, 6];
    classify(kept, 0);
    expect(kept).toEqual([6, 6]);
  });
});

/** Porcentaje redondeado a un decimal, como lo muestra la UI. */
const pct = (p: number): number => Math.round(p * 1000) / 10;

describe('bandOdds', () => {
  it('normal: fracciones exactas sobre 36 casos', () => {
    const b = bandOdds(0, 'normal');
    expect(b.crit).toBe(1 / 36);
    expect(b.success).toBe(5 / 36);
    expect(b.partial).toBe(15 / 36);
    expect(b.failure).toBe(14 / 36);
    expect(b.fumble).toBe(1 / 36);
  });

  it('cancelled se calcula igual que normal', () => {
    expect(bandOdds(0, 'cancelled')).toEqual(bandOdds(0, 'normal'));
    expect(bandOdds(2, 'cancelled')).toEqual(bandOdds(2, 'normal'));
  });

  it('advantage: fracciones exactas sobre 216 casos', () => {
    const b = bandOdds(0, 'advantage');
    expect(b.crit).toBe(16 / 216);
    expect(b.success).toBe(61 / 216);
    expect(b.partial).toBe(97 / 216);
    expect(b.failure).toBe(41 / 216);
    expect(b.fumble).toBe(1 / 216);
  });

  it('disadvantage: fracciones exactas sobre 216 casos', () => {
    const b = bandOdds(0, 'disadvantage');
    expect(b.crit).toBe(1 / 216);
    expect(b.success).toBe(10 / 216);
    expect(b.partial).toBe(58 / 216);
    expect(b.failure).toBe(131 / 216);
    expect(b.fumble).toBe(16 / 216);
  });

  it('las cinco bandas suman 1 en todos los modos y modificadores', () => {
    const modes = ['normal', 'advantage', 'disadvantage', 'cancelled'] as const;
    for (const mode of modes) {
      for (let mod = -4; mod <= 4; mod += 1) {
        const b = bandOdds(mod, mode);
        expect(b.crit + b.success + b.partial + b.failure + b.fumble).toBeCloseTo(1, 12);
      }
    }
  });

  it('dobles: crit 2,8 % normal y 7,4 % con ventaja; fumble 7,4 % con desventaja y 0,5 % con ventaja', () => {
    expect(pct(bandOdds(0, 'normal').crit)).toBeCloseTo(2.8, 3);
    expect(pct(bandOdds(0, 'normal').fumble)).toBeCloseTo(2.8, 3);
    expect(pct(bandOdds(0, 'advantage').crit)).toBeCloseTo(7.4, 3);
    expect(pct(bandOdds(0, 'disadvantage').fumble)).toBeCloseTo(7.4, 3);
    expect(pct(bandOdds(0, 'advantage').fumble)).toBeCloseTo(0.5, 3);
  });

  it('los naturales no dependen del modificador', () => {
    expect(bandOdds(-5, 'normal').crit).toBe(1 / 36);
    expect(bandOdds(9, 'normal').fumble).toBe(1 / 36);
  });
});

describe('odds', () => {
  it('normal mod 0 → 16,7 / 41,7 / 41,7', () => {
    const o = odds(0, 'normal');
    expect(pct(o.success)).toBeCloseTo(16.7, 3);
    expect(pct(o.partial)).toBeCloseTo(41.7, 3);
    expect(pct(o.failure)).toBeCloseTo(41.7, 3);
  });

  it('normal mod +2 → 41,7 / 41,7 / 16,7', () => {
    const o = odds(2, 'normal');
    expect(pct(o.success)).toBeCloseTo(41.7, 3);
    expect(pct(o.partial)).toBeCloseTo(41.7, 3);
    expect(pct(o.failure)).toBeCloseTo(16.7, 3);
  });

  it('advantage mod 0 → 35,6 / 44,9 / 19,4', () => {
    const o = odds(0, 'advantage');
    expect(pct(o.success)).toBeCloseTo(35.6, 3);
    expect(pct(o.partial)).toBeCloseTo(44.9, 3);
    expect(pct(o.failure)).toBeCloseTo(19.4, 3);
  });

  it('advantage mod +2 → 68,1 / 26,9 / 5,1', () => {
    const o = odds(2, 'advantage');
    expect(pct(o.success)).toBeCloseTo(68.1, 3);
    expect(pct(o.partial)).toBeCloseTo(26.9, 3);
    expect(pct(o.failure)).toBeCloseTo(5.1, 3);
  });

  it('disadvantage mod 0 → 5,1 / 26,9 / 68,1', () => {
    const o = odds(0, 'disadvantage');
    expect(pct(o.success)).toBeCloseTo(5.1, 3);
    expect(pct(o.partial)).toBeCloseTo(26.9, 3);
    expect(pct(o.failure)).toBeCloseTo(68.1, 3);
  });

  it('success = crit + success y failure = failure + fumble', () => {
    const b = bandOdds(0, 'advantage');
    const o = odds(0, 'advantage');
    expect(o.success).toBeCloseTo(b.crit + b.success, 12);
    expect(o.partial).toBe(b.partial);
    expect(o.failure).toBeCloseTo(b.failure + b.fumble, 12);
  });

  it('las tres bandas suman 1', () => {
    const o = odds(-1, 'disadvantage');
    expect(o.success + o.partial + o.failure).toBeCloseTo(1, 12);
  });
});

describe('riskLabel', () => {
  it('seguro en los bordes inclusivos: fallo 0,20 y éxito 0,40', () => {
    expect(riskLabel({ success: 0.4, partial: 0.4, failure: 0.2 })).toBe('seguro');
    expect(riskLabel({ success: 0.7, partial: 0.25, failure: 0.05 })).toBe('seguro');
  });

  it('no es seguro si el éxito no llega a 0,40 aunque el fallo sea bajo', () => {
    expect(riskLabel({ success: 0.3, partial: 0.6, failure: 0.1 })).toBe('arriesgado');
    expect(riskLabel({ success: 0.399, partial: 0.401, failure: 0.2 })).toBe('arriesgado');
  });

  it('arriesgado hasta fallo 0,45 inclusive', () => {
    expect(riskLabel({ success: 0.3, partial: 0.25, failure: 0.45 })).toBe('arriesgado');
    expect(riskLabel({ success: 0.5, partial: 0.29, failure: 0.21 })).toBe('arriesgado');
  });

  it('peligroso desde fallo 0,451', () => {
    expect(riskLabel({ success: 0.3, partial: 0.249, failure: 0.451 })).toBe('peligroso');
    expect(riskLabel({ success: 0.05, partial: 0.27, failure: 0.68 })).toBe('peligroso');
  });

  it('funciona con las probabilidades reales de odds', () => {
    expect(riskLabel(odds(2, 'normal'))).toBe('seguro');
    expect(riskLabel(odds(1, 'advantage'))).toBe('seguro');
    expect(riskLabel(odds(2, 'advantage'))).toBe('seguro');
    expect(riskLabel(odds(0, 'normal'))).toBe('arriesgado');
    expect(riskLabel(odds(1, 'normal'))).toBe('arriesgado');
    // fallo 19,4 % (≤ 20) pero éxito 35,6 % (< 40): no alcanza para seguro
    expect(riskLabel(odds(0, 'advantage'))).toBe('arriesgado');
    expect(riskLabel(odds(-1, 'normal'))).toBe('peligroso');
    expect(riskLabel(odds(0, 'disadvantage'))).toBe('peligroso');
  });
});

describe('targetLine', () => {
  it('mod 0: 10+ éxito, 7+ con costo', () => {
    expect(targetLine(0)).toBe(
      'Necesitás 10+ en los dados para éxito, 7+ con costo · doble 1 siempre falla · doble 6 siempre crítico',
    );
  });

  it('mod +2 baja los umbrales en los dados', () => {
    expect(targetLine(2)).toBe(
      'Necesitás 8+ en los dados para éxito, 5+ con costo · doble 1 siempre falla · doble 6 siempre crítico',
    );
  });

  it('mod -1 los sube', () => {
    expect(targetLine(-1)).toBe(
      'Necesitás 11+ en los dados para éxito, 8+ con costo · doble 1 siempre falla · doble 6 siempre crítico',
    );
  });
});
