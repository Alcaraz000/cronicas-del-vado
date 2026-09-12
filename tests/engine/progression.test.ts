import { describe, expect, it } from 'vitest';
import { LIMITS } from '@/content/catalog';
import {
  calcularXp,
  campaignLabel,
  fortuneMax,
  nivelPorXp,
  otorgarXp,
  premiosPorSubir,
  topeAgotado,
  topeDeNivel,
  veteranModifier,
  xpDelNivel,
  XP_BONO_POR_ETIQUETA,
  XP_POR_FINAL_NUEVO,
  XP_POR_HITO,
  type CampaignLabel,
  type GananciaXp,
  type PremioDeNivel,
} from '@/engine/progression';

describe('campaignLabel', () => {
  const rango: [number, number] = [3, 5];

  it.each<[number, CampaignLabel]>([
    [1, 'mortal'],
    [2, 'exigente'],
    [3, 'pareja'],
    [4, 'pareja'],
    [5, 'pareja'],
    [6, 'tranquila'],
    [7, 'tranquila'],
    [8, 'paseo'],
    [10, 'paseo'],
  ])('con rango [3, 5] el nivel %i es %s', (level, esperado) => {
    expect(campaignLabel(rango, level)).toBe(esperado);
  });

  it('con rango [1, 3] un personaje nuevo juega en Pareja', () => {
    expect(campaignLabel([1, 3], 1)).toBe('pareja');
  });

  it('con rango [1, 3] los niveles 4 y 5 son Tranquila y el 6 es Paseo', () => {
    expect(campaignLabel([1, 3], 4)).toBe('tranquila');
    expect(campaignLabel([1, 3], 5)).toBe('tranquila');
    expect(campaignLabel([1, 3], 6)).toBe('paseo');
  });

  it('el borde inferior se calcula igual aunque el mínimo sea 1', () => {
    expect(campaignLabel([1, 3], 0)).toBe('exigente');
    expect(campaignLabel([1, 3], -1)).toBe('mortal');
  });

  it('no muta el rango recibido', () => {
    const copia: [number, number] = [3, 5];
    campaignLabel(copia, 1);
    campaignLabel(copia, 9);
    expect(copia).toEqual([3, 5]);
  });
});

describe('veteranModifier', () => {
  it('es 0 en mortal, exigente y pareja', () => {
    expect(veteranModifier('mortal')).toBe(0);
    expect(veteranModifier('exigente')).toBe(0);
    expect(veteranModifier('pareja')).toBe(0);
  });

  it('es -1 en tranquila y -2 en paseo', () => {
    expect(veteranModifier('tranquila')).toBe(-1);
    expect(veteranModifier('paseo')).toBe(-2);
  });
});

describe('fortuneMax', () => {
  it('devuelve fortuneBase por debajo del nivel 5', () => {
    expect(fortuneMax(1)).toBe(LIMITS.fortuneBase);
    expect(fortuneMax(4)).toBe(LIMITS.fortuneBase);
    expect(fortuneMax(1)).toBe(3);
  });

  it('devuelve fortuneFromLevel5 desde el nivel 5', () => {
    expect(fortuneMax(5)).toBe(LIMITS.fortuneFromLevel5);
    expect(fortuneMax(10)).toBe(LIMITS.fortuneFromLevel5);
    expect(fortuneMax(5)).toBe(4);
  });
});

/* ------------------------------------------------------------------ tabla de niveles */

describe('nivelPorXp y xpDelNivel', () => {
  it.each<[number, number]>([
    [0, 1],
    [1, 1],
    [59, 1],
    [60, 2],
    [119, 2],
    [120, 3],
    [179, 3],
    [180, 4],
    [539, 9],
    [540, 10],
  ])('con %i XP el nivel es %i', (xp, nivel) => {
    expect(nivelPorXp(xp)).toBe(nivel);
  });

  it('el nivel se topea en LIMITS.maxLevel por mucha XP que haya', () => {
    expect(nivelPorXp(600)).toBe(LIMITS.maxLevel);
    expect(nivelPorXp(99999)).toBe(LIMITS.maxLevel);
  });

  it('una XP inválida o negativa cae en el nivel 1', () => {
    expect(nivelPorXp(-40)).toBe(1);
    expect(nivelPorXp(Number.NaN)).toBe(1);
  });

  it('xpDelNivel pide 60 acumulados por nivel: nivel N = 60 × (N − 1)', () => {
    expect(xpDelNivel(1)).toBe(0);
    expect(xpDelNivel(2)).toBe(LIMITS.xpPerLevel);
    expect(xpDelNivel(3)).toBe(120);
    expect(xpDelNivel(10)).toBe(540);
  });

  it('xpDelNivel recorta los niveles fuera de rango en vez de inventar tramos', () => {
    expect(xpDelNivel(0)).toBe(0);
    expect(xpDelNivel(11)).toBe(xpDelNivel(LIMITS.maxLevel));
  });

  it('las dos funciones son coherentes en cada borde de nivel', () => {
    for (let nivel = 1; nivel <= LIMITS.maxLevel; nivel += 1) {
      const borde = xpDelNivel(nivel);
      expect(nivelPorXp(borde)).toBe(nivel);
      if (nivel > 1) expect(nivelPorXp(borde - 1)).toBe(nivel - 1);
    }
  });
});

describe('topeDeNivel', () => {
  it('es el máximo del rango más uno', () => {
    expect(topeDeNivel([1, 3])).toBe(4);
    expect(topeDeNivel([3, 5])).toBe(6);
  });

  it('nunca promete un nivel que no existe', () => {
    expect(topeDeNivel([8, 10])).toBe(LIMITS.maxLevel);
  });
});

describe('topeAgotado', () => {
  it('dice si la campaña ya no tiene XP para este personaje', () => {
    // Aldamar, rango [1, 3]: el tope es el nivel 4, o sea 180 XP acumuladas.
    expect(topeAgotado(0, [1, 3])).toBe(false);
    expect(topeAgotado(179, [1, 3])).toBe(false);
    expect(topeAgotado(180, [1, 3])).toBe(true);
    expect(topeAgotado(600, [1, 3])).toBe(true);
  });

  it('es el mismo tope que aplica otorgarXp', () => {
    const ganancia = calcularXp({ hitosNuevos: 1, finalNuevo: true, primeraVictoria: true, etiqueta: 'pareja' });
    for (const xp of [0, 100, 179, 180, 240]) {
      const resumen = otorgarXp({ xp, nivel: nivelPorXp(xp), ganancia, topeNivel: topeDeNivel([1, 3]) });
      expect(topeAgotado(xp, [1, 3])).toBe(resumen.otorgada === 0);
    }
  });
});

/* ------------------------------------------------------------------ ganancia de XP */

describe('calcularXp', () => {
  it('la primera victoria en Pareja con un hito nuevo y un final nuevo da 10 + 30 + 40', () => {
    const g = calcularXp({ hitosNuevos: 1, finalNuevo: true, primeraVictoria: true, etiqueta: 'pareja' });
    expect(g.hitos).toBe(XP_POR_HITO);
    expect(g.finales).toBe(XP_POR_FINAL_NUEVO);
    expect(g.bono).toBe(40);
    expect(g.total).toBe(80);
    expect(g.detalle).toHaveLength(3);
  });

  it('los hitos repetidos y el final ya visto no dan nada', () => {
    const g = calcularXp({ hitosNuevos: 0, finalNuevo: false, primeraVictoria: false, etiqueta: 'pareja' });
    expect(g).toEqual({ hitos: 0, finales: 0, bono: 0, total: 0, detalle: [] });
  });

  it('una victoria repetida con un final nuevo cobra el final pero no el bono', () => {
    const g = calcularXp({ hitosNuevos: 2, finalNuevo: true, primeraVictoria: false, etiqueta: 'mortal' });
    expect(g.hitos).toBe(20);
    expect(g.bono).toBe(0);
    expect(g.total).toBe(50);
  });

  it('el bono sale de la dificultad relativa y solo en la primera victoria', () => {
    expect(XP_BONO_POR_ETIQUETA).toEqual({ mortal: 80, exigente: 60, pareja: 40, tranquila: 20, paseo: 0 });
    for (const etiqueta of ['mortal', 'exigente', 'pareja', 'tranquila', 'paseo'] as const) {
      const g = calcularXp({ hitosNuevos: 0, finalNuevo: false, primeraVictoria: true, etiqueta });
      expect(g.bono).toBe(XP_BONO_POR_ETIQUETA[etiqueta]);
      expect(g.total).toBe(XP_BONO_POR_ETIQUETA[etiqueta]);
    }
  });

  it('en Paseo el detalle explica la primera victoria aunque el bono sea 0', () => {
    const g = calcularXp({ hitosNuevos: 0, finalNuevo: false, primeraVictoria: true, etiqueta: 'paseo' });
    expect(g.bono).toBe(0);
    expect(g.detalle).toHaveLength(1);
  });

  it('una cantidad de hitos rota no resta XP', () => {
    expect(calcularXp({ hitosNuevos: -3, finalNuevo: false, primeraVictoria: false, etiqueta: 'pareja' }).total).toBe(0);
  });

  it('la calibración de la spec: primera victoria en Aldamar con 10 hitos = 170 XP → nivel 3', () => {
    const g = calcularXp({ hitosNuevos: 10, finalNuevo: true, primeraVictoria: true, etiqueta: 'pareja' });
    expect(g.total).toBe(170);
    expect(nivelPorXp(g.total)).toBe(3);
  });
});

/* ------------------------------------------------------------------ premios de nivel */

describe('premiosPorSubir', () => {
  it('sin subir de nivel no hay premios', () => {
    expect(premiosPorSubir(3, 3)).toEqual([]);
    expect(premiosPorSubir(5, 4)).toEqual([]);
  });

  it('los niveles pares dan atributo y los impares habilidad', () => {
    expect(premiosPorSubir(1, 2)).toEqual<PremioDeNivel[]>([{ kind: 'atributo' }]);
    expect(premiosPorSubir(2, 3)).toEqual<PremioDeNivel[]>([{ kind: 'habilidad' }]);
    expect(premiosPorSubir(3, 4)).toEqual<PremioDeNivel[]>([{ kind: 'atributo' }]);
  });

  it('subir varios niveles de una devuelve los premios de cada nivel en orden', () => {
    expect(premiosPorSubir(1, 4)).toEqual<PremioDeNivel[]>([
      { kind: 'atributo' },
      { kind: 'habilidad' },
      { kind: 'atributo' },
    ]);
  });

  it('el nivel 5 suma la Fortuna a su habilidad', () => {
    expect(premiosPorSubir(4, 5)).toEqual<PremioDeNivel[]>([{ kind: 'habilidad' }, { kind: 'fortuna' }]);
  });

  it('el nivel 10 suma la leyenda a su atributo', () => {
    expect(premiosPorSubir(9, 10)).toEqual<PremioDeNivel[]>([{ kind: 'atributo' }, { kind: 'leyenda' }]);
  });

  it('de 1 a 10 hay 5 atributos, 4 habilidades, 1 Fortuna y 1 leyenda', () => {
    const premios = premiosPorSubir(1, LIMITS.maxLevel);
    const cuenta = (kind: PremioDeNivel['kind']): number => premios.filter((p) => p.kind === kind).length;
    expect(cuenta('atributo')).toBe(5);
    expect(cuenta('habilidad')).toBe(4);
    expect(cuenta('fortuna')).toBe(1);
    expect(cuenta('leyenda')).toBe(1);
  });

  it('no pasa del nivel máximo aunque se lo pidan', () => {
    expect(premiosPorSubir(9, 25)).toEqual(premiosPorSubir(9, LIMITS.maxLevel));
  });
});

/* ------------------------------------------------------------------ tope por campaña */

function ganancia(total: number): GananciaXp {
  return { hitos: total, finales: 0, bono: 0, total, detalle: [`Prueba: +${total}`] };
}

describe('otorgarXp', () => {
  it('suma la ganancia entera cuando entra debajo del tope', () => {
    const r = otorgarXp({ xp: 0, nivel: 1, ganancia: ganancia(170), topeNivel: 4 });
    expect(r.otorgada).toBe(170);
    expect(r.descartada).toBe(0);
    expect(r.xpDespues).toBe(170);
    expect(r.nivelAntes).toBe(1);
    expect(r.nivelDespues).toBe(3);
    expect(r.topeAlcanzado).toBe(false);
    expect(r.premios).toEqual<PremioDeNivel[]>([{ kind: 'atributo' }, { kind: 'habilidad' }]);
  });

  it('descarta el sobrante que pasaría el tope de la campaña', () => {
    const r = otorgarXp({ xp: 170, nivel: 3, ganancia: ganancia(80), topeNivel: 4 });
    expect(r.otorgada).toBe(10);
    expect(r.descartada).toBe(70);
    expect(r.xpDespues).toBe(xpDelNivel(4));
    expect(r.nivelDespues).toBe(4);
    expect(r.topeAlcanzado).toBe(true);
    expect(r.premios).toEqual<PremioDeNivel[]>([{ kind: 'atributo' }]);
  });

  it('un personaje que ya pasó el tope no gana nada y no baja de nivel', () => {
    const r = otorgarXp({ xp: xpDelNivel(5), nivel: 5, ganancia: ganancia(80), topeNivel: 4 });
    expect(r.otorgada).toBe(0);
    expect(r.descartada).toBe(80);
    expect(r.xpAntes).toBe(240);
    expect(r.xpDespues).toBe(240);
    expect(r.nivelDespues).toBe(5);
    expect(r.premios).toEqual([]);
    expect(r.topeAlcanzado).toBe(true);
  });

  it('sin ganancia no hay premios ni descarte', () => {
    const r = otorgarXp({ xp: 120, nivel: 3, ganancia: ganancia(0), topeNivel: 4 });
    expect(r.otorgada).toBe(0);
    expect(r.descartada).toBe(0);
    expect(r.nivelDespues).toBe(3);
    expect(r.premios).toEqual([]);
  });

  it('conserva la ganancia calculada para que la pantalla de fin la desglose', () => {
    const g = ganancia(30);
    expect(otorgarXp({ xp: 0, nivel: 1, ganancia: g, topeNivel: 4 }).ganancia).toBe(g);
  });
});
