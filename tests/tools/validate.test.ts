import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/content/schema';
import { RULES, validateCampaign, type ValidateContext, type ValidationIssue } from '../../tools/lib/validate/index';
import { campanaBase, mundoDePrueba } from '../fixtures/campaigns/broken/base';
import { rotaR01Ciclo, rotaR01Target } from '../fixtures/campaigns/broken/r01';
import { rotaR02Aislada, rotaR02SoloMago } from '../fixtures/campaigns/broken/r02';

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
