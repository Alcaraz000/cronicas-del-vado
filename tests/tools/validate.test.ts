import { describe, expect, it } from 'vitest';
import { CAMPAIGNS } from '@/content/campaigns/index';
import type { Campaign, WorldContent } from '@/content/schema';
import { WORLD } from '@/content/world/index';
import { RULES, validateCampaign, type ValidateContext, type ValidationIssue } from '../../tools/lib/validate/index';
import { minimal } from '../fixtures/campaigns/minimal';
import { b_inicio, campanaBase, conEscena, conOpcion, mundoDePrueba, opcion } from '../fixtures/campaigns/broken/base';
import { rotaR01Ciclo, rotaR01Target } from '../fixtures/campaigns/broken/r01';
import { rotaR02Aislada, rotaR02FinalNoProducido, rotaR02SoloMago } from '../fixtures/campaigns/broken/r02';
import { rotaR03FinalConOpciones, rotaR03Pocas, rotaR03PocasLibres } from '../fixtures/campaigns/broken/r03';
import { rotaR04Ambos } from '../fixtures/campaigns/broken/r04';
import { rotaR05Conteo, rotaR05EntradaPorTirada, rotaR05LethalFuera, rotaR05RewardLethal, rotaR05SoloFisico } from '../fixtures/campaigns/broken/r05';
import { rotaR06Autobucle, rotaR06RondaSinEstado, rotaR06SinHuida, rotaR06UnAtributo } from '../fixtures/campaigns/broken/r06';
import { rotaR07EscribeCompartido, rotaR07FlagNoDeclarado, rotaR07Prefijo, rotaR07RedefineMundo, rotaR07Reliquia, rotaR07RewardFlagNoDeclarado, rotaR07SpeakerFuera, rotaR07VariantInexistente, rotaR07VisitedInexistente } from '../fixtures/campaigns/broken/r07';
import { rotaR08PnjRecuerda, rotaR08SinDefecto } from '../fixtures/campaigns/broken/r08';
import { rotaR09Extrema } from '../fixtures/campaigns/broken/r09';
import { rotaR10Todo } from '../fixtures/campaigns/broken/r10';

export const ctx = (profile: 'smoke' | 'release' = 'release'): ValidateContext => ({ world: mundoDePrueba, profile });
export const reglas = (issues: ValidationIssue[]): string[] => [...new Set(issues.filter((i) => i.level === 'error').map((i) => i.rule))].sort();
export const soloRegla = (campaign: Campaign, rule: string, profile: 'smoke' | 'release' = 'release'): ValidationIssue[] => {
  const issues = validateCampaign(campaign, ctx(profile));
  expect(reglas(issues)).toEqual([rule]);
  return issues;
};

describe('validateCampaign: esquema y campaña base', () => {
  it('la campaña base pasa sin errores en release', () => {
    expect(validateCampaign(campanaBase, ctx('release'))).toEqual([]);
  });
  it('si zod falla devuelve un único error rule schema y no corre reglas', () => {
    const rota = { ...campanaBase, levelRange: 'uno' } as unknown as Campaign;
    const issues = validateCampaign(rota, ctx());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('schema');
    expect(issues[0]?.level).toBe('error');
    expect(issues[0]?.message).toContain('levelRange');
  });
  it('RULES expone las diez reglas en orden', () => {
    expect(Object.keys(RULES)).toEqual(['r01_targets', 'r02_reach', 'r03_choices', 'r04_choice_shape', 'r05_lethal', 'r06_encounter', 'r07_ids', 'r08_memory_frame', 'r09_extreme', 'r10_todo']);
  });
  it('no muta la campaña', () => {
    const antes = JSON.stringify(campanaBase);
    validateCampaign(campanaBase, ctx());
    expect(JSON.stringify(campanaBase)).toBe(antes);
  });
});

describe('r01_targets', () => {
  it('next inexistente', () => {
    const issues = soloRegla(rotaR01Target, 'r01_targets');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_descanso');
    expect(issues[0]?.message).toContain('b_no_existe');
  });
  it('start inexistente', () => {
    const issues = RULES.r01_targets?.({ ...campanaBase, start: 'nada' }, ctx()) ?? [];
    expect(issues.map((i) => i.message)).toEqual(['start apunta a una escena inexistente: nada']);
  });
  it('ciclo de redirects sin efectos entre medio', () => {
    const issues = soloRegla(rotaR01Ciclo, 'r01_targets');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('b_ronda1 → b_ronda2 → b_ronda1');
  });
});

describe('r02_reach', () => {
  it('escena inalcanzable desde start', () => {
    const issues = soloRegla(rotaR02Aislada, 'r02_reach');
    expect(issues.map((i) => i.sceneId)).toEqual(['b_aislada']);
  });
  it('final alcanzable solo con mago falla para las otras tres clases', () => {
    const issues = soloRegla(rotaR02SoloMago, 'r02_reach');
    expect(issues).toHaveLength(3);
    expect(issues.every((i) => i.sceneId === 'b_fin_b')).toBe(true);
    const texto = issues.map((i) => i.message).join('\n');
    expect(texto).toContain('Guerrero');
    expect(texto).toContain('Explorador');
    expect(texto).toContain('Clérigo');
    expect(texto).not.toContain('Mago');
  });
  it('un final declarado en endings sin ninguna escena que lo produzca queda colgado', () => {
    const issues = soloRegla(rotaR02FinalNoProducido, 'r02_reach');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBeUndefined();
    expect(issues[0]?.message).toContain('fin_c');
  });
});

describe('r03_choices', () => {
  it('menos de LIMITS.minChoices opciones: dos issues (total y libres) en smoke y en release', () => {
    expect(soloRegla(rotaR03Pocas, 'r03_choices', 'smoke').map((i) => i.sceneId)).toEqual(['b_inicio', 'b_inicio']);
    expect(soloRegla(rotaR03Pocas, 'r03_choices', 'release').map((i) => i.sceneId)).toEqual(['b_inicio', 'b_inicio']);
  });
  it('un final con opciones (zod lo rechaza antes; la regla se prueba directo)', () => {
    expect(validateCampaign(rotaR03FinalConOpciones, ctx())[0]?.rule).toBe('schema');
    const issues = RULES.r03_choices?.(rotaR03FinalConOpciones, ctx()) ?? [];
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_fin_a');
    expect(issues[0]?.message).toContain('0 opciones');
  });
  it('pocas opciones libres: falla en release y en smoke', () => {
    const issues = soloRegla(rotaR03PocasLibres, 'r03_choices', 'release');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('sin requires');
    expect(soloRegla(rotaR03PocasLibres, 'r03_choices', 'smoke')).toHaveLength(1);
  });
});

describe('r04_choice_shape', () => {
  it('opción con roll y outcome a la vez (zod lo rechaza antes; la regla se prueba directo)', () => {
    expect(validateCampaign(rotaR04Ambos, ctx())[0]?.rule).toBe('schema');
    const issues = RULES.r04_choice_shape?.(rotaR04Ambos, ctx()) ?? [];
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[0]?.message).toContain('descansar');
  });
  it('opción sin roll ni outcome y tirada sin failure', () => {
    const sinNada = { ...campanaBase.scenes.b_inicio!, choices: campanaBase.scenes.b_inicio!.choices.map((c) => (c.id === 'descansar' ? { id: 'descansar', label: 'Buscar refugio' } : c)) };
    const rota = { ...campanaBase, scenes: { ...campanaBase.scenes, b_inicio: sinNada } } as unknown as Campaign;
    const issues = RULES.r04_choice_shape?.(rota, ctx()) ?? [];
    expect(issues.map((i) => i.message)).toEqual(['La opción descansar debe tener exactamente uno de roll u outcome (tiene ninguno)']);
  });
});

describe('r05_lethal', () => {
  it('lethal fuera de una escena lethal', () => {
    const issues = soloRegla(rotaR05LethalFuera, 'r05_lethal');
    expect(issues.map((i) => i.sceneId)).toEqual(['b_inicio']);
  });
  it('entrada a la escena mortal por outcome de tirada', () => {
    const issues = soloRegla(rotaR05EntradaPorTirada, 'r05_lethal');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[0]?.message).toContain('b_cripta');
  });
  it('lethalScenes no coincide', () => {
    const issues = soloRegla(rotaR05Conteo, 'r05_lethal');
    expect(issues[0]?.message).toContain('lethalScenes');
    expect(issues[0]?.sceneId).toBeUndefined();
  });
  it('sin tirada que no sea fisico', () => {
    const issues = soloRegla(rotaR05SoloFisico, 'r05_lethal');
    expect(issues.map((i) => i.sceneId)).toEqual(['b_cripta']);
    expect(issues[0]?.message).toContain('fisico');
  });
  it('reward de un final con lethal: no tiene escena ni outcome de tirada que lo justifique', () => {
    const issues = soloRegla(rotaR05RewardLethal, 'r05_lethal');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBeUndefined();
    expect(issues[0]?.message).toContain('fin_b');
  });
});

describe('r06_encounter', () => {
  it('un solo atributo', () => {
    const issues = soloRegla(rotaR06UnAtributo, 'r06_encounter');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_ronda1');
    expect(issues[0]?.message).toContain('atributo');
  });
  it('sin tirada de huida', () => {
    const issues = soloRegla(rotaR06SinHuida, 'r06_encounter');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('huida');
  });
  it('ronda posterior sin requires sobre el estado ni redirect', () => {
    const issues = soloRegla(rotaR06RondaSinEstado, 'r06_encounter');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_ronda2');
  });
  it('un encuentro que se repite a sí mismo también necesita redirect o requires de estado', () => {
    const issues = soloRegla(rotaR06Autobucle, 'r06_encounter');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_ronda1');
  });
});

describe('r07_ids', () => {
  it('flag no declarado', () => {
    const issues = soloRegla(rotaR07FlagNoDeclarado, 'r07_ids');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('run:b_inventado');
  });
  it('speaker fuera de npcs de la escena', () => {
    const issues = soloRegla(rotaR07SpeakerFuera, 'r07_ids');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('b_guia');
  });
  it('relic en la campaña', () => {
    expect(soloRegla(rotaR07Reliquia, 'r07_ids')[0]?.message).toContain('relic');
  });
  it('id de world redefinido', () => {
    expect(soloRegla(rotaR07RedefineMundo, 'r07_ids')[0]?.message).toContain('viajero');
  });
  it('prefijo de campaña incorrecto', () => {
    expect(soloRegla(rotaR07Prefijo, 'r07_ids')[0]?.message).toContain('char:otra.cosa');
  });
  it('acepta los espacios compartidos por prefijo en condiciones, que es donde se leen', () => {
    const conMet = conEscena(
      campanaBase,
      conOpcion(b_inicio, { ...opcion(b_inicio, 'recordar'), requires: { any: [{ flag: 'char:met.viajero' }, { flag: 'world:caido.base' }] } }),
    );
    expect(validateCampaign(conMet, ctx())).toEqual([]);
  });
  it('rechaza set/clear de un espacio compartido: el motor descarta esos flags al terminar', () => {
    // endRun solo promociona lo apostado con el prefijo de la campaña (char:<id>. / world:<id>.).
    // Un `{ set: 'char:met.orell' }` funciona durante la partida y se pierde al final, en silencio.
    const issues = soloRegla(rotaR07EscribeCompartido, 'r07_ids');
    expect(issues).toHaveLength(2);
    expect(issues[0]?.message).toContain('char:met.viajero');
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[1]?.message).toContain('world:caido.base');
  });
  it('los espacios compartidos salen de world.flags: agregar uno nuevo no obliga a tocar la regla', () => {
    // r07 no puede tener su propia copia de las claves de src/content/world/flags.ts:
    // un espacio compartido nuevo tiene que valer en la regla sin editarla.
    const mundoConVinculo: WorldContent = {
      ...mundoDePrueba,
      flags: { ...mundoDePrueba.flags, 'char:vinculo.*': 'Vínculo del personaje con un PNJ' },
    };
    const conVinculo = conEscena(
      campanaBase,
      conOpcion(b_inicio, { ...opcion(b_inicio, 'recordar'), requires: { flag: 'char:vinculo.b_guia' } }),
    );
    expect(validateCampaign(conVinculo, { world: mundoConVinculo, profile: 'release' })).toEqual([]);
    // Sin ese espacio declarado en world.flags, el mismo flag se sigue rechazando.
    expect(reglas(validateCampaign(conVinculo, ctx()))).toEqual(['r07_ids']);
  });
  it('condición visited con una escena que no existe', () => {
    const issues = soloRegla(rotaR07VisitedInexistente, 'r07_ids');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[0]?.message).toContain('b_plazza');
    expect(issues[0]?.message).toContain('visited');
  });
  it('acepta visited cuando la escena existe (la campaña base lo hace en b_inicio)', () => {
    expect(validateCampaign(campanaBase, ctx())).toEqual([]);
  });
  it('scene.variant sobre un lugar que no declara esa variante', () => {
    const issues = soloRegla(rotaR07VariantInexistente, 'r07_ids');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[0]?.message).toContain('tormenta');
    expect(issues[0]?.message).toContain('b_plaza');
  });
  it('acepta scene.variant cuando el lugar la declara', () => {
    const conVariante = conEscena(
      { ...campanaBase, places: { b_plaza: { ...campanaBase.places.b_plaza!, variants: { tormenta: 'b_plaza.tormenta' } } } },
      { ...b_inicio, variant: 'tormenta' },
    );
    expect(validateCampaign(conVariante, ctx())).toEqual([]);
  });
  it('el reward de un final con un flag no declarado se valida igual que el resto de los efectos', () => {
    const issues = soloRegla(rotaR07RewardFlagNoDeclarado, 'r07_ids');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBeUndefined();
    expect(issues[0]?.message).toContain('run:reward_inventado');
  });
});

describe('r08_memory_frame', () => {
  it('un PNJ de la campaña no puede recordar otra partida', () => {
    const issues = soloRegla(rotaR08PnjRecuerda, 'r08_memory_frame');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('met');
  });
  it('un PNJ de world sí puede (la campaña base lo hace con viajero)', () => {
    expect(validateCampaign(campanaBase, ctx())).toEqual([]);
  });
  it('todo párrafo termina en una variante sin when', () => {
    const issues = soloRegla(rotaR08SinDefecto, 'r08_memory_frame');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
  });
});

describe('r09_extreme', () => {
  it('extrema con levelRange[0] < 3', () => {
    const issues = soloRegla(rotaR09Extrema, 'r09_extreme');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[0]?.message).toContain('hablar');
  });
  it('extrema permitida con levelRange[0] >= 3', () => {
    expect(validateCampaign({ ...rotaR09Extrema, levelRange: [3, 5] }, ctx())).toEqual([]);
  });
});

describe('r10_todo', () => {
  it('TODO residual falla en release y pasa en smoke', () => {
    const issues = soloRegla(rotaR10Todo, 'r10_todo', 'release');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(validateCampaign(rotaR10Todo, ctx('smoke'))).toEqual([]);
  });
  it('detecta TODO en labels, lockedHint, outcome.text y epílogo', () => {
    const conTodos: Campaign = {
      ...campanaBase,
      scenes: {
        ...campanaBase.scenes,
        b_fin_a: { ...campanaBase.scenes.b_fin_a!, ending: { id: 'fin_a', epilogue: ['TODO epílogo'] } },
        b_descanso: { ...campanaBase.scenes.b_descanso!, choices: campanaBase.scenes.b_descanso!.choices.map((c) => (c.id === 'mirar'
          ? { ...c, label: 'TODO label', outcome: { text: ['TODO outcome'], next: 'b_descanso' } }
          : c)) },
      },
    };
    const issues = soloRegla(conTodos, 'r10_todo', 'release');
    expect(issues.map((i) => i.sceneId).sort()).toEqual(['b_descanso', 'b_descanso', 'b_fin_a']);
  });
});

describe('campañas reales', () => {
  it('minimal.ts pasa sin errores en release', () => {
    expect(validateCampaign(minimal, { world: WORLD, profile: 'release' })).toEqual([]);
  });
  it('la campaña prueba pasa sin errores con su propio perfil', async () => {
    const entry = CAMPAIGNS['prueba'];
    expect(entry).toBeDefined();
    const campaign = await entry!.load();
    const issues = validateCampaign(campaign, { world: WORLD, profile: entry!.meta.lintProfile });
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });
});
