import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/content/schema';
import { RULES, validateCampaign, type ValidateContext, type ValidationIssue } from '../../tools/lib/validate/index';
import { campanaBase, mundoDePrueba } from '../fixtures/campaigns/broken/base';
import { rotaR01Ciclo, rotaR01Target } from '../fixtures/campaigns/broken/r01';
import { rotaR02Aislada, rotaR02SoloMago } from '../fixtures/campaigns/broken/r02';
import { rotaR03FinalConOpciones, rotaR03Pocas, rotaR03PocasLibres } from '../fixtures/campaigns/broken/r03';
import { rotaR04Ambos } from '../fixtures/campaigns/broken/r04';
import { rotaR05Conteo, rotaR05EntradaPorTirada, rotaR05LethalFuera, rotaR05SoloFisico } from '../fixtures/campaigns/broken/r05';

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
});
