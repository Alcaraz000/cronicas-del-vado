import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Campaign, Scene } from '@/content/schema';
import type { RenderedChoice } from '@/engine/types';
import { minimal } from '../fixtures/campaigns/minimal';
import { agregar, porNumeroDePartida, resumir } from '../../tools/lib/simulate/agregado';
import { fusionarConMundo } from '../../tools/lib/simulate/campana';
import { MAX_PASOS_POR_DEFECTO, parseArgs, rutaInforme } from '../../tools/lib/simulate/cli';
import { alcanzablesSinMemoria, opcionesDeMemoria, todasLasOpciones, usaMemoria } from '../../tools/lib/simulate/grafo';
import { informeMarkdown, lineasDeAserciones } from '../../tools/lib/simulate/informe';
import { combinaciones, simularCarrera, simularPartida } from '../../tools/lib/simulate/partida';
import { habilidadesPermitidas, paresDeRasgos, personajeDeCarrera } from '../../tools/lib/simulate/personajes';
import { candidatas, elegirOpcion, peorDadoConservado, probExito, probFallo } from '../../tools/lib/simulate/politicas';
import { CLASES, NIVELES, POLITICAS, type ConfigSim } from '../../tools/lib/simulate/types';

const config: ConfigSim = { campaignId: minimal.id, n: 2, k: 3, semilla: 1234, maxPasos: MAX_PASOS_POR_DEFECTO };

const opcion = (id: string, exito?: number, fallo?: number): RenderedChoice => ({
  id,
  label: id,
  visible: true,
  enabled: true,
  leadsToLethal: false,
  alreadySeen: false,
  ...(exito === undefined
    ? {}
    : {
        preview: {
          attr: 'vigor',
          attrValue: 0,
          difficulty: 'normal',
          difficultyMod: 0,
          veteranMod: 0,
          totalMod: 0,
          mode: 'normal',
          sources: [],
          odds: { success: exito, partial: 1 - exito - (fallo ?? 0), failure: fallo ?? 0 },
          risk: 'arriesgado',
          targetLine: '',
        },
      }),
});

describe('grafo: memoria y cobertura', () => {
  it('usaMemoria reconoce met, knows, endingSeen y los flags char:/world:, y no los run:', () => {
    expect(usaMemoria(undefined)).toBe(false);
    expect(usaMemoria({ flag: 'run:x' })).toBe(false);
    expect(usaMemoria({ flag: 'char:vado.sabe_del_sello' })).toBe(true);
    expect(usaMemoria({ flag: 'world:vado.sello_perdido' })).toBe(true);
    expect(usaMemoria({ met: 'orell' })).toBe(true);
    expect(usaMemoria({ knows: 'vado_oculto' })).toBe(true);
    expect(usaMemoria({ endingSeen: 'fin_crecida' })).toBe(true);
    expect(usaMemoria({ all: [{ flag: 'run:x' }, { met: 'orell' }] })).toBe(true);
    expect(usaMemoria({ not: { knows: 'x' } })).toBe(true);
    expect(usaMemoria({ any: [{ flag: 'run:x' }, { trait: 'desertor' }] })).toBe(false);
  });

  it('alcanzablesSinMemoria deja afuera lo que solo se abre con memoria', () => {
    const escena = (id: string, extra: Partial<Scene> = {}): Scene => ({
      id, kind: 'normal', place: 'p', text: [], choices: [], ...extra,
    });
    const campana: Campaign = {
      ...minimal,
      start: 'a',
      scenes: {
        a: escena('a', {
          choices: [
            { id: 'ir', label: 'Ir', outcome: { next: 'b' } },
            { id: 'recuerdo', label: 'Recordar', requires: { knows: 'x' }, outcome: { next: 'secreta' } },
          ],
        }),
        b: escena('b'),
        secreta: escena('secreta'),
      },
    };
    expect([...alcanzablesSinMemoria(campana)].sort()).toEqual(['a', 'b']);
  });

  it('todasLasOpciones y opcionesDeMemoria cuentan la campaña real', () => {
    expect(todasLasOpciones(minimal)).toContain('m_inicio#trepar');
    expect(opcionesDeMemoria(minimal).size).toBe(0);
  });
});

describe('políticas', () => {
  it('una opción sin tirada vale éxito 1 y fallo 0', () => {
    expect(probExito(opcion('libre'))).toBe(1);
    expect(probFallo(opcion('libre'))).toBe(0);
  });

  it('codiciosa toma la de más éxito y temeraria la de más fallo; empate a la primera', () => {
    const azar = (): number => 0;
    const lista = [opcion('a', 0.2, 0.5), opcion('b', 0.6, 0.1), opcion('c', 0.6, 0.1)];
    expect(elegirOpcion('codiciosa', lista, azar).id).toBe('b');
    expect(elegirOpcion('temeraria', lista, azar).id).toBe('a');
    expect(elegirOpcion('codiciosa', [opcion('x', 0.9, 0.05), opcion('libre')], azar).id).toBe('libre');
    expect(elegirOpcion('temeraria', [opcion('libre'), opcion('x', 0.9, 0.05)], azar).id).toBe('x');
  });

  it('aleatoria usa el generador y nunca se sale del rango', () => {
    const lista = [opcion('a'), opcion('b'), opcion('c')];
    expect(elegirOpcion('aleatoria', lista, () => 0).id).toBe('a');
    expect(elegirOpcion('aleatoria', lista, () => 0.5).id).toBe('b');
    // Un generador que devolviera 1 (no debería) no puede desbordar la lista.
    expect(elegirOpcion('aleatoria', lista, () => 1).id).toBe('c');
    expect(() => elegirOpcion('aleatoria', [], () => 0)).toThrow('No hay opciones para elegir');
  });

  it('candidatas descarta lo ya elegido en esa escena y vuelve a abrir todo si no queda nada', () => {
    const lista = [opcion('a'), opcion('b')];
    expect(candidatas('s', lista, new Set(['s#a'])).map((o) => o.id)).toEqual(['b']);
    expect(candidatas('s', lista, new Set(['s#a', 's#b'])).map((o) => o.id)).toEqual(['a', 'b']);
    // Lo elegido en OTRA escena no cuenta.
    expect(candidatas('s', lista, new Set(['otra#a'])).map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('peorDadoConservado devuelve el índice del dado conservado más bajo', () => {
    const pending = { dice: [5, 2, 6], kept: [0, 2] } as Parameters<typeof peorDadoConservado>[0];
    expect(peorDadoConservado(pending)).toBe(0);
  });
});

describe('personajes de carrera', () => {
  it('reparte 2/1/1/0 con el 2 en el atributo de la clase y respeta la regla de identidad', () => {
    const guerrero = personajeDeCarrera('guerrero', 1, 0);
    expect(guerrero.attrs.vigor).toBe(2);
    expect([...Object.values(guerrero.attrs)].sort((a, b) => b - a)).toEqual([2, 1, 1, 0]);
    expect(guerrero.traits).toHaveLength(2);
    // La Debilidad del Guerrero es `sigilo`: nunca puede llevar Cazador furtivo.
    for (const clase of CLASES) {
      for (let i = 0; i < 21; i += 1) {
        const pj = personajeDeCarrera(clase, 3, i);
        expect(pj.traits).toHaveLength(2);
        expect(new Set(pj.traits).size).toBe(2);
        expect(pj.skills.every((s) => habilidadesPermitidas(clase).includes(s))).toBe(true);
      }
    }
  });

  it('a nivel 3 suma un atributo y una habilidad, y la XP es la del nivel', () => {
    const mago = personajeDeCarrera('mago', 3, 0);
    expect(mago.attrs.saber).toBe(3);
    expect(mago.skills).toHaveLength(1);
    expect(mago.xp).toBe(120);
    expect(mago.level).toBe(3);
  });

  it('los rasgos rotan con el índice de carrera y cubren los 21 pares', () => {
    const pares = paresDeRasgos('mago');
    expect(pares).toHaveLength(21);
    const vistos = new Set(Array.from({ length: 21 }, (_, i) => personajeDeCarrera('mago', 1, i).traits.join('+')));
    expect(vistos.size).toBe(21);
  });

  it('el mismo índice de carrera da siempre el mismo personaje', () => {
    expect(personajeDeCarrera('clerigo', 3, 7)).toEqual(personajeDeCarrera('clerigo', 3, 7));
  });
});

describe('simulación de partidas y carreras', () => {
  const estadoInicial = (clase: Parameters<typeof personajeDeCarrera>[0]) => ({
    world: { flags: [], fallen: [] },
    character: personajeDeCarrera(clase, 1, 0),
    seen: {},
  });

  it('una partida termina, deja métricas y no cuelga', () => {
    const { resultado } = simularPartida(minimal, estadoInicial('mago'), { clase: 'mago', nivel: 1, politica: 'aleatoria' }, 0, 1, config);
    expect(resultado.desenlace).toEqual({ kind: 'ending', endingId: 'm_fin' });
    expect(resultado.escenas.length).toBeGreaterThan(0);
    expect(resultado.escenas.at(-1)).toBe('m_final');
    expect(resultado.opciones.length).toBe(resultado.escenas.length - 1);
    expect(resultado.palabras).toBeGreaterThan(0);
    expect(resultado.logRecortado).toBe(false);
  });

  it('es determinista: la misma semilla da exactamente el mismo resultado', () => {
    const combo = { clase: 'guerrero', nivel: 1, politica: 'aleatoria' } as const;
    const a = simularPartida(minimal, estadoInicial('guerrero'), combo, 3, 2, config);
    const b = simularPartida(minimal, estadoInicial('guerrero'), combo, 3, 2, config);
    expect(b.resultado).toEqual(a.resultado);
    expect(b.estado.character).toEqual(a.estado.character);
  });

  it('cambiar la semilla cambia la partida', () => {
    const combo = { clase: 'guerrero', nivel: 1, politica: 'aleatoria' } as const;
    const a = simularPartida(minimal, estadoInicial('guerrero'), combo, 3, 2, config);
    const b = simularPartida(minimal, estadoInicial('guerrero'), combo, 3, 2, { ...config, semilla: 999 });
    expect(b.resultado.escenas.join('>')).not.toBe(a.resultado.escenas.join('>'));
  });

  it('una carrera conserva lo que persiste entre partidas: registro, XP y nivel', () => {
    const carrera = simularCarrera(minimal, { clase: 'explorador', nivel: 1, politica: 'aleatoria' }, 0, config);
    expect(carrera.partidas).toHaveLength(config.k);
    expect(carrera.partidas.map((p) => p.partida)).toEqual([1, 2, 3]);
    // Primera victoria: hito + final + bono. Las siguientes ya no cobran lo mismo.
    expect(carrera.xpFinal).toBeGreaterThan(0);
    expect(carrera.nivelFinal).toBeGreaterThanOrEqual(1);
    // El canon del personaje quedó escrito y sobrevivió a las partidas siguientes.
    expect(carrera.flagsPersonaje.some((f) => f.startsWith('char:place.'))).toBe(true);
  });

  it('la política codiciosa nunca cuelga en un hub con opciones que vuelven al hub', () => {
    const carrera = simularCarrera(minimal, { clase: 'mago', nivel: 1, politica: 'codiciosa' }, 0, config);
    for (const partida of carrera.partidas) {
      expect(partida.desenlace.kind).not.toBe('colgada');
      expect(partida.desenlace.kind).not.toBe('sin_salida');
    }
  });

  it('combinaciones enumera clase × nivel × política en orden fijo', () => {
    const combos = combinaciones(CLASES, NIVELES, POLITICAS);
    expect(combos).toHaveLength(4 * 2 * 3);
    expect(combos[0]).toEqual({ clase: 'guerrero', nivel: 1, politica: 'aleatoria' });
    expect(combos.at(-1)).toEqual({ clase: 'clerigo', nivel: 3, politica: 'temeraria' });
  });
});

describe('agregado e informe', () => {
  const carreras = combinaciones(CLASES, NIVELES, POLITICAS).flatMap((combo) =>
    Array.from({ length: 2 }, (_, i) => simularCarrera(minimal, combo, i, config)),
  );

  it('resumir devuelve media, mediana y extremos', () => {
    expect(resumir([])).toEqual({ n: 0, media: 0, mediana: 0, min: 0, max: 0 });
    expect(resumir([1, 2, 3])).toEqual({ n: 3, media: 2, mediana: 2, min: 1, max: 3 });
    expect(resumir([1, 2, 3, 4]).mediana).toBe(2.5);
  });

  it('cuenta cobertura, finales y las tres aserciones', () => {
    const agregado = agregar(minimal, carreras);
    expect(agregado.carreras).toBe(48);
    expect(agregado.escenasTotales).toBe(3);
    expect(agregado.escenasVisitadas).toBe(3);
    expect(agregado.escenasNuncaVisitadas).toEqual([]);
    expect(agregado.aserciones.escenasInalcanzables).toEqual([]);
    expect(agregado.finales.m_fin).toBeGreaterThan(0);
    // `minimal` tiene un solo final y las cuatro clases llegan: no falta ninguno.
    expect(agregado.aserciones.finalesFaltantesPorClase).toEqual([]);
    expect(agregado.filas).toHaveLength(24);
  });

  it('distingue el Fallo en los dados del Fallo que le queda al jugador', () => {
    const agregado = agregar(minimal, carreras);
    // Fortuna y Poder solo pueden mejorar una tirada, nunca empeorarla.
    expect(agregado.global.tasaFallo).toBeLessThanOrEqual(agregado.global.tasaFalloCruda);
    expect(agregado.global.escenasDistintas.media).toBeLessThanOrEqual(agregado.global.escenas.media);
  });

  it('avisa de las combinaciones que terminan la campaña sin tirar un dado', () => {
    const agregado = agregar(minimal, carreras);
    // En `minimal` la codiciosa siempre tiene una opción sin tirada: nunca tira.
    expect(agregado.avisos.some((a) => a.includes('sin tirar un solo dado'))).toBe(true);
    expect(agregado.avisos.every((a) => typeof a === 'string' && a.length > 0)).toBe(true);
  });

  it('porNumeroDePartida agrupa por posición dentro de la carrera', () => {
    const mapa = porNumeroDePartida(carreras.flatMap((c) => c.partidas));
    expect([...mapa.keys()].sort()).toEqual([1, 2, 3]);
    expect(mapa.get(1)?.escenas.length).toBe(48);
  });

  it('el informe es Markdown, trae las tres aserciones y no lleva fecha', () => {
    const agregado = agregar(minimal, carreras);
    const md = informeMarkdown(minimal, config, agregado, porNumeroDePartida(carreras.flatMap((c) => c.partidas)));
    expect(md).toContain('# Informe de simulación — Campaña mínima');
    expect(md).toContain('## Las tres aserciones');
    expect(md).toContain('## Cobertura');
    expect(md).toContain('## Rejugar: ¿se trivializa?');
    expect(lineasDeAserciones(agregado)).toHaveLength(3);
    // Comparable entre commits: el mismo agregado tiene que dar el mismo texto, sin fecha adentro.
    expect(md).toBe(informeMarkdown(minimal, config, agregado, porNumeroDePartida(carreras.flatMap((c) => c.partidas))));
    expect(md).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('fusión con el mundo', () => {
  it('mete los PNJ, lugares y objetos de WORLD en la campaña y el mundo gana la colisión', () => {
    const world = {
      npcs: { orell: { id: 'orell', name: 'Orell', portrait: 'p', voice: 'v', canonPrompt: 'c' } },
      places: { m_claro: { id: 'm_claro', name: 'Otro claro', background: 'b', canonPrompt: 'c' } },
      items: { reliquia: { id: 'reliquia', name: 'Reliquia', icon: 'i', description: 'd', relic: true as const } },
      flags: {},
    };
    const fusionada = fusionarConMundo(minimal, world);
    expect(fusionada.npcs.orell?.name).toBe('Orell');
    expect(fusionada.npcs.m_guia?.name).toBe('El guía');
    expect(fusionada.places.m_claro?.name).toBe('Otro claro');
    expect(fusionada.items.reliquia?.relic).toBe(true);
    expect(minimal.npcs.orell).toBeUndefined();
  });
});

describe('parseArgs', () => {
  it('sin argumentos devuelve un objeto vacío', () => {
    expect(parseArgs([])).toEqual({});
  });
  it('acepta los argumentos separados o con =', () => {
    expect(parseArgs(['--campaign', 'vado', '--n', '10', '--k=2', '--seed=7'])).toEqual({
      campaign: 'vado', n: 10, k: 2, seed: 7,
    });
    expect(parseArgs(['--out', 'x.md', '--max-pasos', '20'])).toEqual({ out: 'x.md', maxPasos: 20 });
  });
  it('rechaza valores que no son enteros positivos y argumentos desconocidos', () => {
    expect(() => parseArgs(['--n', '0'])).toThrow('--n tiene que ser un entero positivo (llegó "0")');
    expect(() => parseArgs(['--k', 'dos'])).toThrow('--k tiene que ser un entero positivo (llegó "dos")');
    expect(() => parseArgs(['--seed'])).toThrow('Falta el valor de --seed');
    expect(() => parseArgs(['--profile', 'release'])).toThrow('Argumento desconocido: --profile');
  });
  it('la ruta por defecto del informe cuelga del design de la campaña', () => {
    expect(rutaInforme('vado')).toBe('src/content/campaigns/vado/design/sim-report.md');
  });
});

const raiz = path.resolve(fileURLToPath(import.meta.url), '../../..');

interface Corrida { code: number | null; stdout: string; stderr: string }

function correrCli(args: readonly string[]): Promise<Corrida> {
  return new Promise<Corrida>((resolve, reject) => {
    const hijo = spawn(process.execPath, ['--import', 'tsx', 'tools/simulate.ts', ...args], {
      cwd: raiz,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    hijo.stdout?.setEncoding('utf8').on('data', (t: string) => { stdout += t; });
    hijo.stderr?.setEncoding('utf8').on('data', (t: string) => { stderr += t; });
    hijo.on('error', reject);
    hijo.on('close', (code) => { resolve({ code, stdout, stderr }); });
  });
}

describe('tools/simulate.ts (proceso)', () => {
  it('escribe el informe donde le digan y el código de salida sigue a las aserciones', async () => {
    const destino = path.join(os.tmpdir(), `sim-report-test-${process.pid}.md`);
    const { code, stdout } = await correrCli(['--n', '2', '--k', '2', '--out', destino]);
    const informe = await readFile(destino, 'utf8');
    expect(informe).toContain('# Informe de simulación — El vado de Aldamar');
    expect(informe).toContain('| 1 | Ninguna escena fuera de una condición de memoria queda inalcanzable |');
    expect(stdout).toContain('Aserción 1');
    // Con N chico alguna aserción puede no llegar; lo que se prueba es que el código de salida
    // sea exactamente el veredicto, no que con dos carreras por combinación alcance para todo.
    expect(code).toBe(stdout.includes('FALLA') ? 1 : 0);
    await rm(destino, { force: true });
  }, 120000);

  it('sale con 1 y explica el error cuando la campaña no existe', async () => {
    const { code, stderr } = await correrCli(['--campaign', 'no_existe']);
    expect(stderr).toContain('Campaña desconocida: no_existe');
    expect(code).toBe(1);
  }, 60000);

  // Mismo motivo que en tools/validate.ts: en Windows stdout es una tubería asíncrona y un
  // process.exit() inmediato se lleva puesto el veredicto de las aserciones.
  it('no llama a process.exit(): fija process.exitCode', async () => {
    const fuente = await readFile(path.join(raiz, 'tools', 'simulate.ts'), 'utf8');
    expect(fuente).toContain('process.exitCode');
    expect(fuente).not.toMatch(/process\.exit\(/);
  });
});
