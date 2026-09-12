import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Campaign, WorldContent } from '@/content/schema';
import { archivosDeArte, comparar, referencias, rutaDe } from '../../tools/lib/assets/index';

const campana: Campaign = {
  id: 'assets', contentVersion: 1, title: 'Assets', premise: 'p', cover: 'portada_assets',
  levelRange: [1, 3], durationMin: [1, 2], lethalScenes: 0, lintProfile: 'smoke', start: 'p_inicio',
  scenes: {
    p_inicio: { id: 'p_inicio', kind: 'normal', place: 'torre', text: ['Texto.'], choices: [] },
  },
  npcs: { centinela: { id: 'centinela', name: 'Centinela', portrait: 'centinela', voice: 'v', canonPrompt: 'c' } },
  places: {
    torre: { id: 'torre', name: 'Torre', background: 'torre', variants: { noche: 'torre.noche' }, canonPrompt: 'c' },
  },
  items: { llave: { id: 'llave', name: 'Llave', icon: 'llave_de_hierro', description: 'd' } },
  flags: {}, milestones: {}, clocks: {}, endings: {},
};

const mundo: WorldContent = {
  npcs: { orell: { id: 'orell', name: 'Orell', portrait: 'orell', voice: 'v', canonPrompt: 'c' } },
  places: {},
  items: { sello: { id: 'sello', name: 'Sello', icon: 'sello_del_vado', description: 'd', relic: true } },
  flags: {},
};

describe('referencias', () => {
  const refs = referencias(campana, mundo);

  it('saca retratos, fondos, variantes, iconos y portada, con el mundo fusionado', () => {
    expect(refs.map(rutaDe).sort()).toEqual([
      'cover/portada_assets.png',
      'item/llave_de_hierro.png',
      'item/sello_del_vado.png',
      'npc/centinela.png',
      'npc/orell.png',
      'place/torre.noche.png',
      'place/torre.png',
    ]);
  });

  it('dice de dónde sale cada referencia', () => {
    const variante = refs.find((r) => r.name === 'torre.noche');
    expect(variante).toMatchObject({ kind: 'place', origen: 'places.torre.variants.noche' });
  });
});

describe('comparar', () => {
  const refs = referencias(campana, mundo);

  it('sin archivos, todo falta y no hay huérfanos', () => {
    const informe = comparar(refs, []);
    expect(informe.faltantes.map(rutaDe)).toHaveLength(refs.length);
    expect(informe.huerfanos).toEqual([]);
    expect(informe.porTipo.npc).toEqual({ total: 2, faltan: 2 });
  });

  it('acepta el archivo con o sin la carpeta de campaña adelante', () => {
    const informe = comparar(refs, ['vado/npc/orell.png', 'npc/centinela.png']);
    expect(informe.faltantes.map(rutaDe)).not.toContain('npc/orell.png');
    expect(informe.faltantes.map(rutaDe)).not.toContain('npc/centinela.png');
    expect(informe.huerfanos).toEqual([]);
  });

  it('lista los archivos que nadie referencia', () => {
    const informe = comparar(refs, ['npc/centinela.png', 'npc/fantasma.png', 'place/otra/torre.png']);
    expect(informe.huerfanos).toEqual(['npc/fantasma.png', 'place/otra/torre.png']);
  });
});

describe('archivosDeArte', () => {
  it('devuelve una lista vacía si la carpeta no existe', async () => {
    expect(await archivosDeArte(path.join(tmpdir(), 'no-existe-' + String(Date.now())))).toEqual([]);
  });

  it('recorre subcarpetas, normaliza a barras y deja fuera lo que no es imagen', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'assets-'));
    await mkdir(path.join(dir, 'vado', 'npc'), { recursive: true });
    await writeFile(path.join(dir, 'vado', 'npc', 'berta.png'), 'x');
    await writeFile(path.join(dir, 'vado', 'npc', 'notas.txt'), 'x');
    expect(await archivosDeArte(dir)).toEqual(['vado/npc/berta.png']);
  });
});

const raiz = path.resolve(fileURLToPath(import.meta.url), '../../..');

function correrCli(args: readonly string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const hijo = spawn(process.execPath, ['--import', 'tsx', 'tools/validate.ts', ...args], { cwd: raiz, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    hijo.stdout?.setEncoding('utf8').on('data', (t: string) => { stdout += t; });
    hijo.stderr?.setEncoding('utf8').on('data', (t: string) => { stderr += t; });
    hijo.on('error', reject);
    hijo.on('close', (code) => { resolve({ code, stdout, stderr }); });
  });
}

describe('validate --assets (proceso)', () => {
  it('sin la bandera no dice nada de arte', async () => {
    const { stdout } = await correrCli(['--campaign', 'prueba']);
    expect(stdout).not.toContain('assets');
  }, 60000);

  it('con --assets informa lo que falta pero sale con 0', async () => {
    const { code, stdout } = await correrCli(['--campaign', 'vado', '--assets']);
    expect(stdout).toContain('assets');
    expect(stdout).toMatch(/falta .*npc\/berta\.png/);
    // El retrato de un PNJ de `world/` lo referencian todas las campañas: el total cuenta archivos, no referencias.
    expect(stdout).toMatch(/assets: faltan \d+ archivos de arte distintos \(informativo/);
    expect(code).toBe(0);
  }, 60000);

  it('con --assets-strict sale con 1 mientras falte arte', async () => {
    const { code, stdout } = await correrCli(['--campaign', 'vado', '--assets', '--assets-strict']);
    expect(stdout).toContain('assets');
    expect(code).toBe(1);
  }, 60000);
});
