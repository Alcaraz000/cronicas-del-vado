import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { campaign as vado } from '@/content/campaigns/vado/campaign';
import type { Campaign, Scene } from '@/content/schema';
import { parseGraphArgs } from '../../tools/lib/graph/cli';
import { actoDe, construirGrafo, documentoMarkdown, mermaidFlowchart } from '../../tools/lib/graph/mermaid';

const escena = (id: string, extra: Partial<Scene> = {}): Scene => ({
  id, kind: 'normal', place: 'lugar', text: ['Texto.'], choices: [], ...extra,
});

const campana = (scenes: Scene[], start = 'p_inicio'): Campaign => ({
  id: 'grafo', contentVersion: 1, title: 'Grafo', premise: 'p', cover: 'c', levelRange: [1, 3], durationMin: [1, 2],
  lethalScenes: 0, lintProfile: 'smoke', start,
  scenes: Object.fromEntries(scenes.map((s) => [s.id, s])),
  npcs: {}, places: {}, items: {}, flags: {}, memories: {}, milestones: {}, clocks: {}, endings: {},
});

describe('actoDe', () => {
  it('usa el prefijo hasta el primer guion bajo', () => {
    expect(actoDe('a1_molino_pell')).toBe('a1');
    expect(actoDe('fin_crecida')).toBe('fin');
    expect(actoDe('solo')).toBe('solo');
  });
});

describe('construirGrafo', () => {
  const grafo = construirGrafo(campana([
    escena('p_inicio', { choices: [
      { id: 'ir', label: 'Ir', outcome: { next: 'a1_hub' } },
      { id: 'tirar', label: 'Tirar', roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: {
        success: { next: 'a1_hub' }, partial: { next: 'a1_hub' }, failure: { next: 'p_inicio' } } } },
    ] }),
    escena('a1_hub', { kind: 'hub', redirect: [{ when: { flag: 'run:x' }, to: 'fin_ok' }], choices: [
      { id: 'volver', label: 'Volver', outcome: { next: 'p_inicio' } },
      { id: 'perdida', label: 'Perdida', outcome: { next: 'a1_no_existe' } },
    ] }),
    escena('fin_ok', { kind: 'ending', ending: { id: 'fin_ok', epilogue: ['Fin.'] } }),
  ]));

  it('marca acto, kind, escena mortal y escena inicial', () => {
    const inicio = grafo.nodes.find((n) => n.id === 'p_inicio');
    expect(inicio).toMatchObject({ act: 'p', kind: 'normal', start: true, existe: true });
    expect(grafo.nodes.find((n) => n.id === 'a1_hub')?.kind).toBe('hub');
    expect(grafo.nodes.find((n) => n.id === 'fin_ok')?.endingId).toBe('fin_ok');
    expect(grafo.acts).toEqual(['p', 'a1', 'fin']);
  });

  it('ordena los actos por cercanía al arranque, no por el orden de los módulos', () => {
    // `c1` se declara último pero se juega antes que `a2`: el documento tiene que salir jugable.
    const suelto = construirGrafo(campana([
      escena('p_inicio', { choices: [{ id: 'ir', label: 'Ir', outcome: { next: 'c1_cuello' } }] }),
      escena('a2_rama', { choices: [{ id: 'ir', label: 'Ir', outcome: { next: 'fin_ok' } }] }),
      escena('fin_ok', { kind: 'ending', ending: { id: 'fin_ok', epilogue: ['Fin.'] } }),
      escena('c1_cuello', { choices: [{ id: 'ir', label: 'Ir', outcome: { next: 'a2_rama' } }] }),
    ]));
    expect(suelto.acts).toEqual(['p', 'c1', 'a2', 'fin']);
  });

  it('fusiona las aristas repetidas y cuenta las opciones distintas', () => {
    const aristas = grafo.edges.map((e) => `${e.from}->${e.to}:${e.via}:${e.opciones}`);
    // Dos opciones distintas llevan de p_inicio a a1_hub (una con tres outcomes): cuenta 2, no 3.
    expect(aristas).toContain('p_inicio->a1_hub:choice:2');
    expect(aristas).toContain('p_inicio->p_inicio:choice:1');
    expect(aristas).toContain('a1_hub->fin_ok:redirect:1');
  });

  it('agrega un nodo fantasma para un destino que no existe', () => {
    expect(grafo.nodes.find((n) => n.id === 'a1_no_existe')).toMatchObject({ existe: false, act: 'a1' });
  });
});

describe('mermaidFlowchart', () => {
  const grafo = construirGrafo(campana([
    escena('p_inicio', { choices: [{ id: 'ir', label: 'Ir', outcome: { next: 'a1_hub' } }] }),
    escena('a1_hub', { kind: 'hub', redirect: [{ when: { flag: 'run:x' }, to: 'a1_pelea' }], choices: [
      { id: 'pelear', label: 'Pelear', outcome: { next: 'a1_pelea' } },
      { id: 'dormir', label: 'Dormir', outcome: { next: 'a1_cama' } },
      { id: 'morir', label: 'Morir', outcome: { next: 'a1_vado' } },
    ] }),
    escena('a1_pelea', { kind: 'encounter' }),
    escena('a1_cama', { kind: 'rest' }),
    escena('a1_vado', { lethal: true }),
  ]));

  it('agrupa por acto y distingue las escenas por kind', () => {
    const texto = mermaidFlowchart(grafo);
    expect(texto).toMatch(/^flowchart TD\n/);
    expect(texto).toContain('subgraph acto_a1[');
    expect(texto).toContain('a1_hub[["a1_hub<br/>HUB"]]');
    expect(texto).toContain('a1_pelea{{"a1_pelea<br/>ENCUENTRO"}}');
    expect(texto).toContain('a1_cama>"a1_cama<br/>DESCANSO"]');
    expect(texto).toContain('a1_vado[/"a1_vado<br/>MORTAL"\\]');
    expect(texto).toContain('p_inicio["p_inicio<br/>START"]');
    expect(texto).toContain('class a1_hub hub;');
  });

  it('dibuja los redirect punteados y con su propio estilo de línea', () => {
    const texto = mermaidFlowchart(grafo);
    expect(texto).toContain('a1_hub -. "redirect" .-> a1_pelea');
    expect(texto).toContain('p_inicio --> a1_hub');
    expect(texto).toMatch(/linkStyle \d+(,\d+)* stroke:/);
  });

  it('con --acts deja fuera lo ajeno y marca como externos los vecinos', () => {
    const texto = mermaidFlowchart(grafo, { acts: ['a1'] });
    expect(texto).toContain('a1_hub');
    expect(texto).toContain('p_inicio');
    expect(texto).toContain('class p_inicio externo;');
    expect(texto).not.toContain('subgraph acto_p[');
  });
});

describe('documentoMarkdown sobre la campaña real', () => {
  const doc = documentoMarkdown(vado, { split: true });

  it('nombra la campaña y cuenta escenas, opciones y tiradas', () => {
    expect(doc).toContain('# Grafo de escenas — El vado de Aldamar (vado)');
    expect(doc).toContain('46 escenas');
    expect(doc).toContain('252 opciones');
  });

  it('trae un bloque mermaid general y uno por acto, y todas las escenas', () => {
    const bloques = doc.match(/```mermaid/g) ?? [];
    expect(bloques.length).toBe(1 + construirGrafo(vado).acts.length);
    for (const id of Object.keys(vado.scenes)) expect(doc).toContain(id);
  });
});

describe('parseGraphArgs', () => {
  it('sin argumentos devuelve un objeto vacío', () => {
    expect(parseGraphArgs([])).toEqual({});
  });
  it('acepta --campaign, --out, --format y --split separados o con =', () => {
    expect(parseGraphArgs(['--campaign', 'vado', '--out', 'g.md'])).toEqual({ campaign: 'vado', out: 'g.md' });
    expect(parseGraphArgs(['--format=mmd', '--split'])).toEqual({ format: 'mmd', split: true });
    expect(parseGraphArgs(['--no-split'])).toEqual({ split: false });
  });
  it('rechaza formatos y argumentos desconocidos', () => {
    expect(() => parseGraphArgs(['--format', 'dot'])).toThrow('Formato desconocido: dot (se acepta md o mmd)');
    expect(() => parseGraphArgs(['--campaign'])).toThrow('Falta el valor de --campaign');
    expect(() => parseGraphArgs(['--todo'])).toThrow('Argumento desconocido: --todo');
  });
});

const raiz = path.resolve(fileURLToPath(import.meta.url), '../../..');

function correr(args: readonly string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const hijo = spawn(process.execPath, ['--import', 'tsx', 'tools/graph.ts', ...args], { cwd: raiz, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    hijo.stdout?.setEncoding('utf8').on('data', (t: string) => { stdout += t; });
    hijo.stderr?.setEncoding('utf8').on('data', (t: string) => { stderr += t; });
    hijo.on('error', reject);
    hijo.on('close', (code) => { resolve({ code, stdout, stderr }); });
  });
}

describe('tools/graph.ts (proceso)', () => {
  it('escribe el grafo de la campaña en el archivo pedido', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'grafo-'));
    const destino = path.join(dir, 'vado.md');
    const { code, stdout } = await correr(['--campaign', 'vado', '--out', destino]);
    expect(code).toBe(0);
    expect(stdout).toContain(destino);
    const escrito = await readFile(destino, 'utf8');
    expect(escrito).toContain('```mermaid');
    expect(escrito).toContain('c2_vado_crecido');
  }, 60000);

  it('sale con 1 si la campaña no existe', async () => {
    const { code, stderr } = await correr(['--campaign', 'no_existe']);
    expect(code).toBe(1);
    expect(stderr).toContain('Campaña desconocida: no_existe');
  }, 60000);
});
