import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
    expect(() => parseArgs(['--arte'])).toThrow('Argumento desconocido: --arte');
  });
  it('acepta las banderas de arte, y la estricta implica la informativa', () => {
    expect(parseArgs(['--assets'])).toEqual({ assets: true });
    expect(parseArgs(['--assets-strict'])).toEqual({ assets: true, assetsStrict: true });
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

const raiz = path.resolve(fileURLToPath(import.meta.url), '../../..');

interface Corrida { code: number | null; stdout: string; stderr: string }

/** Corre el CLI del validador como proceso aparte, con stdout y stderr por tubería (como en npm run build). */
function correrCli(args: readonly string[]): Promise<Corrida> {
  return new Promise<Corrida>((resolve, reject) => {
    const hijo = spawn(process.execPath, ['--import', 'tsx', 'tools/validate.ts', ...args], {
      cwd: raiz,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    hijo.stdout?.setEncoding('utf8').on('data', (trozo: string) => { stdout += trozo; });
    hijo.stderr?.setEncoding('utf8').on('data', (trozo: string) => { stderr += trozo; });
    hijo.on('error', reject);
    hijo.on('close', (code) => { resolve({ code, stdout, stderr }); });
  });
}

/**
 * El CLI no puede cortar su propia salida: bajo `npm run build` stdout es una tubería y en Windows
 * las escrituras a una tubería son asíncronas, así que un `process.exit()` inmediato después de
 * `console.log` se puede llevar puesta la línea de resumen, justo la que hace falta cuando hay errores.
 * Por eso el CLI fija `process.exitCode` y deja que el proceso termine solo.
 */
describe('tools/validate.ts (proceso)', () => {
  it('imprime la salida completa y sale con 0 cuando la campaña valida', async () => {
    const { code, stdout } = await correrCli(['--campaign', 'prueba']);
    const lineas = stdout.trimEnd().split(/\r?\n/);
    expect(lineas.at(-2)).toBe('prueba: 0 errores, 0 avisos (perfil smoke)');
    expect(lineas.at(-1)).toBe('0 errores, 0 avisos');
    expect(code).toBe(0);
  }, 60000);

  it('sale con 1 y explica el error cuando la campaña no existe', async () => {
    const { code, stderr } = await correrCli(['--campaign', 'no_existe']);
    expect(stderr).toContain('Campaña desconocida: no_existe');
    expect(code).toBe(1);
  }, 60000);

  // La pérdida de salida es una carrera: con dos líneas cortas casi nunca se reproduce, así que
  // los dos tests de arriba no alcanzan para fijarla. Esto sí: el CLI no puede llamar a
  // process.exit(), tiene que fijar process.exitCode y dejar que el proceso termine solo.
  it('no llama a process.exit(): fija process.exitCode', async () => {
    const fuente = await readFile(path.join(raiz, 'tools', 'validate.ts'), 'utf8');
    expect(fuente).toContain('process.exitCode');
    expect(fuente).not.toMatch(/process\.exit\(/);
  });
});
