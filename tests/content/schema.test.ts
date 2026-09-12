import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import {
  ConditionSchema,
  EffectSchema,
  TextSchema,
  OutcomeSchema,
  RollSchema,
  ChoiceSchema,
  RedirectSchema,
  SceneSchema,
  CampaignSchema,
  WorldContentSchema,
  parseCampaign,
  type Campaign,
  type FlagId,
  type WorldContent,
} from '@/content/schema';
import { minimal } from '../fixtures/campaigns/minimal';

describe('ConditionSchema', () => {
  it('acepta una condición anidada con all/any/not y todas las hojas', () => {
    const condicion: unknown = {
      all: [
        { flag: 'run:centinela_vencido' },
        { flag: 'char:prueba.vio_la_cripta' },
        { flag: 'world:caido.prueba' },
        { any: [{ class: 'mago' }, { trait: 'aprendiz_de_escriba' }, { skill: 'rastreador' }] },
        { not: { condition: 'asustado' } },
        { attr: 'saber', gte: 2 },
        { wounds: { gte: 1, lte: 2 } },
        { visited: 'p_umbral', min: 1 },
        { visited: 'p_umbral' },
        { met: 'centinela' },
        { knows: 'torre_abandonada' },
        { clock: 'pelea', gte: 1 },
        { endingSeen: 'fin_tesoro' },
        { item: 'llave_de_hierro' },
      ],
    };
    expect(ConditionSchema.safeParse(condicion).success).toBe(true);
  });

  it('rechaza un flag sin prefijo run:, char: o world:', () => {
    expect(ConditionSchema.safeParse({ flag: 'centinela_vencido' }).success).toBe(false);
  });

  it('rechaza un flag con prefijo desconocido', () => {
    expect(ConditionSchema.safeParse({ flag: 'global:centinela' }).success).toBe(false);
  });

  it('rechaza una clave desconocida', () => {
    expect(ConditionSchema.safeParse({ visitado: 'p_umbral' }).success).toBe(false);
  });

  it('rechaza ids que no están en el catálogo', () => {
    expect(ConditionSchema.safeParse({ class: 'paladin' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ trait: 'noble' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ skill: 'herrero' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ condition: 'dormido' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ attr: 'fuerza', gte: 1 }).success).toBe(false);
  });

  it('rechaza una condición anidada inválida dentro de not', () => {
    expect(ConditionSchema.safeParse({ not: { flag: 'sin_prefijo' } }).success).toBe(false);
  });
});

describe('EffectSchema', () => {
  it('acepta cada tipo de efecto', () => {
    const efectos: unknown[] = [
      { set: 'run:tiene_pista' },
      { clear: 'char:prueba.vio_la_cripta' },
      { give: 'llave_de_hierro' },
      { take: 'llave_de_hierro' },
      { wound: 1 },
      { wound: 2 },
      { heal: 1 },
      { addCondition: 'asustado' },
      { removeCondition: 'perseguido' },
      { removeCondition: 'all' },
      { clock: 'pelea', delta: 1 },
      { clock: 'pelea', delta: -2 },
      { milestone: 'entrar_a_la_torre' },
      { fortune: -1 },
      { lethal: true },
    ];
    for (const efecto of efectos) {
      expect(EffectSchema.safeParse(efecto).success, JSON.stringify(efecto)).toBe(true);
    }
  });

  it('rechaza valores fuera de rango', () => {
    expect(EffectSchema.safeParse({ wound: 3 }).success).toBe(false);
    expect(EffectSchema.safeParse({ wound: 0 }).success).toBe(false);
    expect(EffectSchema.safeParse({ heal: 2 }).success).toBe(false);
    expect(EffectSchema.safeParse({ lethal: false }).success).toBe(false);
  });

  it('rechaza un flag sin prefijo en set y clear', () => {
    expect(EffectSchema.safeParse({ set: 'tiene_pista' }).success).toBe(false);
    expect(EffectSchema.safeParse({ clear: 'tiene_pista' }).success).toBe(false);
  });

  it('rechaza una condición desconocida', () => {
    expect(EffectSchema.safeParse({ addCondition: 'dormido' }).success).toBe(false);
    expect(EffectSchema.safeParse({ removeCondition: 'dormido' }).success).toBe(false);
  });

  it('rechaza un delta de reloj no entero', () => {
    expect(EffectSchema.safeParse({ clock: 'pelea', delta: 0.5 }).success).toBe(false);
  });
});

describe('TextSchema y OutcomeSchema', () => {
  it('acepta strings de narrador y párrafos con variantes', () => {
    const texto: unknown = [
      'Llegás al claro.',
      {
        variants: [
          { when: { visited: 'm_inicio', min: 1 }, text: 'El claro otra vez.' },
          { text: 'Un claro entre pinos.' },
        ],
      },
      { speaker: 'm_guia', variants: [{ text: '—Por acá.' }] },
    ];
    expect(TextSchema.safeParse(texto).success).toBe(true);
  });

  it('rechaza un párrafo sin variantes', () => {
    expect(TextSchema.safeParse([{ speaker: 'm_guia', variants: [] }]).success).toBe(false);
  });

  it('acepta un outcome con solo next y uno completo', () => {
    expect(OutcomeSchema.safeParse({ next: 'm_final' }).success).toBe(true);
    expect(
      OutcomeSchema.safeParse({ text: ['Subís.'], effects: [{ set: 'run:partio' }], next: 'm_final' }).success,
    ).toBe(true);
  });

  it('rechaza un outcome sin next', () => {
    expect(OutcomeSchema.safeParse({ text: ['Subís.'] }).success).toBe(false);
  });
});

describe('RollSchema', () => {
  const tirada: unknown = {
    attr: 'vigor',
    difficulty: 'normal',
    tags: ['fisico'],
    advantageIf: { item: 'm_piedra' },
    outcomes: {
      success: { next: 'm_final' },
      partial: { effects: [{ wound: 1 }], next: 'm_final' },
      failure: { effects: [{ wound: 1 }], next: 'm_descanso' },
    },
  };

  it('acepta una tirada con success, partial y failure', () => {
    expect(RollSchema.safeParse(tirada).success).toBe(true);
  });

  it('rechaza una tirada sin failure', () => {
    const sinFailure = {
      ...(tirada as Record<string, unknown>),
      outcomes: { success: { next: 'm_final' }, partial: { next: 'm_final' } },
    };
    expect(RollSchema.safeParse(sinFailure).success).toBe(false);
  });

  it('rechaza dificultad o tag fuera del catálogo', () => {
    expect(RollSchema.safeParse({ ...(tirada as Record<string, unknown>), difficulty: 'imposible' }).success).toBe(false);
    expect(RollSchema.safeParse({ ...(tirada as Record<string, unknown>), tags: ['cocina'] }).success).toBe(false);
  });
});

describe('ChoiceSchema', () => {
  const tirada: unknown = {
    attr: 'vigor',
    difficulty: 'normal',
    tags: ['fisico'],
    outcomes: { success: { next: 'm_final' }, partial: { next: 'm_final' }, failure: { next: 'm_descanso' } },
  };

  it('acepta una opción con outcome', () => {
    expect(ChoiceSchema.safeParse({ id: 'partir', label: 'Partir', outcome: { next: 'm_final' } }).success).toBe(true);
  });

  it('acepta una opción con roll', () => {
    expect(ChoiceSchema.safeParse({ id: 'trepar', label: 'Trepar el risco', roll: tirada }).success).toBe(true);
  });

  it('acepta requires y lockedHint', () => {
    const opcion: unknown = {
      id: 'contar',
      label: 'Contarle al guía lo que viste',
      requires: { met: 'm_guia' },
      lockedHint: 'Todavía no conocés al guía',
      outcome: { next: 'm_inicio' },
    };
    expect(ChoiceSchema.safeParse(opcion).success).toBe(true);
  });

  it('rechaza una opción con roll y outcome a la vez', () => {
    const resultado = ChoiceSchema.safeParse({ id: 'trepar', label: 'Trepar', roll: tirada, outcome: { next: 'm_final' } });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /exactamente uno/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza una opción sin roll ni outcome', () => {
    expect(ChoiceSchema.safeParse({ id: 'nada', label: 'Nada' }).success).toBe(false);
  });
});

describe('RedirectSchema', () => {
  it('acepta when + to', () => {
    expect(RedirectSchema.safeParse({ when: { flag: 'run:partio' }, to: 'm_final' }).success).toBe(true);
  });

  it('rechaza un redirect sin when', () => {
    expect(RedirectSchema.safeParse({ to: 'm_final' }).success).toBe(false);
  });
});

describe('SceneSchema', () => {
  const opcion = { id: 'partir', label: 'Partir', outcome: { next: 'm_final' } };

  it('acepta una escena normal con redirect, onEnter, npcs y opciones', () => {
    const escena: unknown = {
      id: 'm_inicio',
      kind: 'normal',
      place: 'm_claro',
      variant: 'noche',
      npcs: ['m_guia'],
      redirect: [{ when: { flag: 'run:partio' }, to: 'm_final' }],
      onEnter: [{ milestone: 'm_llegar' }],
      text: ['Llegás al claro.'],
      choices: [opcion],
    };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('acepta una escena lethal', () => {
    const escena: unknown = { id: 'm_cripta', kind: 'normal', lethal: true, place: 'm_claro', text: ['Oscuro.'], choices: [opcion] };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('acepta un ending con ending y sin opciones', () => {
    const escena: unknown = {
      id: 'm_final',
      kind: 'ending',
      place: 'm_claro',
      text: ['Dejás el claro atrás.'],
      choices: [],
      ending: { id: 'm_fin', epilogue: ['El sendero te lleva de vuelta.'] },
    };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('rechaza un ending con opciones', () => {
    const escena: unknown = {
      id: 'm_final',
      kind: 'ending',
      place: 'm_claro',
      text: ['Dejás el claro atrás.'],
      choices: [opcion],
      ending: { id: 'm_fin', epilogue: ['El sendero te lleva de vuelta.'] },
    };
    const resultado = SceneSchema.safeParse(escena);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /no puede tener opciones/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza un ending sin el campo ending', () => {
    const escena: unknown = { id: 'm_final', kind: 'ending', place: 'm_claro', text: ['Fin.'], choices: [] };
    const resultado = SceneSchema.safeParse(escena);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /necesita el campo ending/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza kind y lethal con valores inválidos', () => {
    expect(SceneSchema.safeParse({ id: 'x', kind: 'boss', place: 'm_claro', text: [], choices: [] }).success).toBe(false);
    expect(SceneSchema.safeParse({ id: 'x', kind: 'normal', lethal: false, place: 'm_claro', text: [], choices: [] }).success).toBe(false);
  });
});

// Clon profundo del fixture: el fixture no tiene valores undefined ni funciones,
// así que el viaje por JSON es sin pérdidas. Los tests modifican el clon, nunca `minimal`.
function clonarMinimal(): Campaign {
  return JSON.parse(JSON.stringify(minimal)) as Campaign;
}

describe('parseCampaign', () => {
  it('devuelve una campaña igual al fixture minimal (y un objeto nuevo)', () => {
    const parseada = parseCampaign(minimal);
    expect(parseada).toEqual(minimal);
    expect(parseada).not.toBe(minimal);
  });

  it('CampaignSchema.safeParse acepta el fixture', () => {
    expect(CampaignSchema.safeParse(minimal).success).toBe(true);
  });

  it('falla si una opción tiene roll y outcome', () => {
    const roto = clonarMinimal();
    const trepar = roto.scenes['m_inicio']!.choices.find((choice) => choice.id === 'trepar')!;
    trepar.outcome = { next: 'm_final' };
    expect(() => parseCampaign(roto)).toThrow(/exactamente uno/);
  });

  it('falla si una opción no tiene ni roll ni outcome', () => {
    const roto = clonarMinimal();
    const partir = roto.scenes['m_inicio']!.choices.find((choice) => choice.id === 'partir')!;
    delete partir.outcome;
    expect(() => parseCampaign(roto)).toThrow(/exactamente uno/);
  });

  it('falla si un flag no tiene prefijo válido', () => {
    const roto = clonarMinimal();
    const partir = roto.scenes['m_inicio']!.choices.find((choice) => choice.id === 'partir')!;
    // El cast es deliberado: queremos un dato mal formado que TypeScript no dejaría escribir.
    partir.outcome!.effects = [{ set: 'partio' as unknown as FlagId }];
    expect(() => parseCampaign(roto)).toThrow(/run:, char: o world:/);
  });

  it('falla si un ending tiene choices', () => {
    const roto = clonarMinimal();
    roto.scenes['m_final']!.choices = [{ id: 'volver', label: 'Volver al claro', outcome: { next: 'm_inicio' } }];
    expect(() => parseCampaign(roto)).toThrow(/no puede tener opciones/);
  });

  it('falla si falta un campo obligatorio de la meta', () => {
    const { start: _start, ...sinStart } = clonarMinimal();
    expect(() => parseCampaign(sinStart)).toThrow();
  });

  it('falla con datos que no son un objeto', () => {
    expect(() => parseCampaign(null)).toThrow();
    expect(() => parseCampaign('minimal')).toThrow();
  });

  it('no muta la entrada', () => {
    const copia = clonarMinimal();
    parseCampaign(copia);
    expect(copia).toEqual(minimal);
  });
});

describe('WorldContentSchema', () => {
  it('acepta un mundo vacío y uno con contenido', () => {
    const vacio: unknown = { npcs: {}, places: {}, items: {}, flags: {} };
    expect(WorldContentSchema.safeParse(vacio).success).toBe(true);
    const conContenido: unknown = {
      npcs: { orell: { id: 'orell', name: 'Orell', portrait: 'orell', voice: 'Grave.', canonPrompt: 'sargento de barba gris' } },
      places: {},
      items: { sello_del_vado: { id: 'sello_del_vado', name: 'Sello del vado', icon: 'sello', description: 'Frío.', relic: true } },
      flags: { 'char:met.*': 'PNJ conocidos' },
    };
    expect(WorldContentSchema.safeParse(conContenido).success).toBe(true);
  });

  it('rechaza un mundo sin flags', () => {
    expect(WorldContentSchema.safeParse({ npcs: {}, places: {}, items: {} }).success).toBe(false);
  });
});

describe('tipos inferidos por zod', () => {
  it('z.infer<typeof CampaignSchema> y Campaign son intercambiables', () => {
    expectTypeOf<z.infer<typeof CampaignSchema>>().toMatchTypeOf<Campaign>();
    expectTypeOf<Campaign>().toMatchTypeOf<z.infer<typeof CampaignSchema>>();
  });

  it('z.infer<typeof WorldContentSchema> y WorldContent son intercambiables', () => {
    expectTypeOf<z.infer<typeof WorldContentSchema>>().toMatchTypeOf<WorldContent>();
    expectTypeOf<WorldContent>().toMatchTypeOf<z.infer<typeof WorldContentSchema>>();
  });

  it('parseCampaign devuelve Campaign', () => {
    expectTypeOf(parseCampaign).returns.toEqualTypeOf<Campaign>();
  });
});
