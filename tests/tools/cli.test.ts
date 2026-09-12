import { describe, expect, it } from 'vitest';
import { formatIssue, parseArgs, summaryLine } from '../../tools/lib/validate/cli';

describe('parseArgs', () => {
  it('sin argumentos devuelve un objeto vacío', () => {
    expect(parseArgs([])).toEqual({});
  });
  it('acepta --profile y --campaign separados o con =', () => {
    expect(parseArgs(['--profile', 'release', '--campaign', 'prueba'])).toEqual({ profile: 'release', campaign: 'prueba' });
    expect(parseArgs(['--profile=smoke', '--campaign=vado'])).toEqual({ profile: 'smoke', campaign: 'vado' });
  });
  it('rechaza un perfil inválido y argumentos desconocidos', () => {
    expect(() => parseArgs(['--profile', 'rapido'])).toThrow('Perfil desconocido: rapido (se acepta smoke o release)');
    expect(() => parseArgs(['--profile'])).toThrow('Falta el valor de --profile');
    expect(() => parseArgs(['--assets'])).toThrow('Argumento desconocido: --assets');
  });
});

describe('formatIssue', () => {
  it('imprime campaña › escena › [regla] mensaje', () => {
    expect(formatIssue('prueba', { level: 'error', rule: 'r01_targets', sceneId: 'p_umbral', message: 'falta algo' })).toBe('prueba › p_umbral › [r01_targets] falta algo');
  });
  it('sin sceneId usa un guion', () => {
    expect(formatIssue('prueba', { level: 'error', rule: 'r05_lethal', message: 'meta.lethalScenes es 2' })).toBe('prueba › - › [r05_lethal] meta.lethalScenes es 2');
  });
});

describe('summaryLine', () => {
  it('cuenta errores y avisos', () => {
    expect(summaryLine([])).toBe('0 errores, 0 avisos');
    expect(summaryLine([
      { level: 'error', rule: 'r01_targets', message: 'a' },
      { level: 'error', rule: 'r02_reach', message: 'b' },
      { level: 'warning', rule: 'w01', message: 'c' },
    ])).toBe('2 errores, 1 avisos');
  });
});
