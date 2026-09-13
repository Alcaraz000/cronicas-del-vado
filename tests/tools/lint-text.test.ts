import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Campaign, Scene, Text } from '@/content/schema';
import type { WorldContent } from '@/content/schema';
import { codigoDeSalida, formatIssue, parseArgs, summaryLine, visible } from '../../tools/lib/lint/cli';
import { contar, palabrasEscritas, textoBase } from '../../tools/lib/lint/texto';
import { leerPresupuestoOutline, chequearPresupuesto } from '../../tools/lib/lint/presupuesto';
import { repeticionesEntreEscenas, chequearRepeticiones } from '../../tools/lib/lint/repeticiones';
import { chequearProhibidas, contarFrase, contarMedidaDeTiempo, pareceSinVerbo } from '../../tools/lib/lint/prohibidas';
import { chequearMarco } from '../../tools/lib/lint/marco';
import { caminar, minutos, palabrasDePantalla, chequearDuracion } from '../../tools/lib/lint/duracion';
import { chequearMuletillas } from '../../tools/lib/lint/muletillas';
import type { LintContext, LintIssue } from '../../tools/lib/lint/types';

// --- andamios -------------------------------------------------------------

const escena = (id: string, extra: Partial<Scene> = {}): Scene => ({
  id, kind: 'normal', place: 'lugar', text: ['Texto base de la escena.'], choices: [], ...extra,
});

const mundo: WorldContent = {
  npcs: { orell: { id: 'orell', name: 'Orell', portrait: 'p', voice: 'v', canonPrompt: 'c' } },
  places: {}, items: {}, flags: {},
};

const campana = (scenes: Scene[], start = 'inicio'): Campaign => ({
  id: 'lint', contentVersion: 1, title: 'Lint', premise: 'p', cover: 'c', levelRange: [1, 3], durationMin: [30, 45],
  lethalScenes: 0, lintProfile: 'smoke', start,
  scenes: Object.fromEntries(scenes.map((s) => [s.id, s])),
  npcs: { ...mundo.npcs }, places: {}, items: {}, flags: {}, memories: {}, milestones: {}, clocks: {}, endings: {},
});

const ctx = (extra: Partial<LintContext> = {}): LintContext => ({ world: mundo, seed: 1, walks: 5, top: 5, ...extra });

const mensajes = (issues: readonly LintIssue[], check: string): string[] =>
  issues.filter((i) => i.check === check).map((i) => i.message);

// --- medición de texto ----------------------------------------------------

describe('texto', () => {
  it('cuenta palabras sin contar la raya de diálogo ni los puntos', () => {
    expect(contar('—No cruces. El río subió.')).toBe(5);
    expect(contar('')).toBe(0);
  });

  it('el texto base es la última variante de cada párrafo', () => {
    const text: Text = [
      { variants: [{ when: { met: 'orell' }, text: 'Ya lo conocés.' }, { text: 'Un hombre en la barricada.' }] },
      'Llueve.',
    ];
    expect(textoBase(text)).toBe('Un hombre en la barricada.\nLlueve.');
    expect(contar(textoBase(text))).toBe(6);
  });

  it('palabrasEscritas suma todas las variantes, los desenlaces y el epílogo', () => {
    const scene = escena('e', {
      text: [{ variants: [{ when: { met: 'orell' }, text: 'una dos tres' }, { text: 'cuatro cinco' }] }],
      choices: [{ id: 'c', label: 'Irse', outcome: { text: ['seis siete ocho'], next: 'e' } }],
    });
    // 3 (variante) + 2 (base) + 3 (desenlace) = 8; la etiqueta no cuenta.
    expect(palabrasEscritas(scene)).toBe(8);
  });
});

// --- presupuesto ----------------------------------------------------------

describe('leerPresupuestoOutline', () => {
  const md = [
    '## 2. Tabla de escenas',
    '',
    '| id | kind | lugar | PNJ | lleva a | opc | tir | text | pal |',
    '|---|---|---|---|---|---|---|---|---|',
    '| `p_camino` | normal | `puente_viejo` | — | `p_puente` | 5/4 | 1 | 150 | **396** |',
    '',
    '| id | lugar | canon | text | epílogo | variantes | pal |',
    '|---|---|---|---|---|---|---|',
    '| `fin_hundido` | `sotano` | `char:vado.x` | 60 | 160 | 80 | **300** |',
    '',
    '## 3. Presupuesto por acto',
    '',
    '| Tramo | esc. | text | pal |',
    '|---|---|---|---|',
    '| Prólogo | 5 | 565 | **1.709** |',
  ].join('\n');

  it('lee las dos formas de tabla por el nombre de la columna, no por posición', () => {
    const tabla = leerPresupuestoOutline(md);
    expect(tabla.get('p_camino')).toEqual({ id: 'p_camino', text: 150, pal: 396 });
    expect(tabla.get('fin_hundido')).toEqual({ id: 'fin_hundido', text: 60, pal: 300 });
  });

  it('no se lleva puesta la tabla de la §3, que está fuera de la sección', () => {
    expect(leerPresupuestoOutline(md).has('Prólogo')).toBe(false);
    expect(leerPresupuestoOutline(md).size).toBe(2);
  });

  it('informa el exceso de una escena contra su celda', () => {
    const larga = 'lluvia '.repeat(500).trim();
    const c = campana([escena('inicio', { text: [larga] })]);
    const outline = ['## 2. Tabla de escenas', '| id | text | pal |', '|---|---|---|', '| `inicio` | 150 | 396 |', '## 3. x'].join('\n');
    const issues = chequearPresupuesto(c, ctx({ outline }));
    expect(mensajes(issues, 'presupuesto').some((m) => m.includes('se pasa del presupuesto: 500 palabras escritas contra 396'))).toBe(true);
    expect(issues.some((i) => i.level === 'error' && i.message.includes('se pasa del presupuesto de prosa'))).toBe(true);
  });

  it('avisa cuando el texto base se sale de la banda 60-160 de la biblia §2.3', () => {
    const c = campana([escena('inicio', { text: ['Corta.'] })]);
    const issues = chequearPresupuesto(c, ctx());
    expect(mensajes(issues, 'bandas').some((m) => m.includes('fuera de la banda 60-160'))).toBe(true);
  });

  it('mide la banda de un desenlace sobre el outcome entero, no párrafo por párrafo', () => {
    const c = campana([escena('inicio', {
      text: ['Palabra '.repeat(80).trim()],
      choices: [{
        id: 'irse',
        label: 'Irse',
        // Dos párrafos de 15 palabras: por separado los dos caen bajo el piso de 20, juntos no.
        outcome: { text: ['palabra '.repeat(15).trim(), 'otra '.repeat(15).trim()], next: 'inicio' },
      }],
    })]);
    expect(mensajes(chequearPresupuesto(c, ctx()), 'bandas').filter((m) => m.includes('el desenlace'))).toHaveLength(0);
  });
});

// --- repeticiones ---------------------------------------------------------

describe('repeticionesEntreEscenas', () => {
  it('informa la repetición maximal y no sus sub-n-gramas', () => {
    const repes = repeticionesEntreEscenas(new Map([
      ['a', ['El agua sube por el caz y nadie mira.']],
      ['b', ['Otra cosa. El agua sube por el caz, dice Orell.']],
    ]));
    expect(repes).toHaveLength(1);
    expect(repes[0]?.frase).toBe('el agua sube por el caz');
    expect(repes[0]?.escenas).toEqual(['a', 'b']);
  });

  it('no informa una repetición dentro de una sola escena', () => {
    expect(repeticionesEntreEscenas(new Map([['a', ['el agua sube por el caz', 'el agua sube por el caz']]]))).toHaveLength(0);
  });

  it('no cruza el corte entre dos textos distintos de la misma escena', () => {
    const repes = repeticionesEntreEscenas(new Map([
      ['a', ['uno dos', 'tres cuatro']],
      ['b', ['uno dos tres cuatro']],
    ]));
    expect(repes).toHaveLength(0);
  });
});

describe('chequearRepeticiones', () => {
  it('marca como error dos escenas que arrancan con las mismas tres palabras', () => {
    const c = campana([
      escena('inicio', { text: ['La noche cae sobre el pueblo.'] }),
      escena('otra', { text: ['La noche cae despacio.'] }),
    ]);
    const issues = chequearRepeticiones(c, ctx());
    expect(issues.some((i) => i.level === 'error' && i.check === 'arranques' && i.message.includes('«la noche cae»'))).toBe(true);
  });

  it('avisa cuando una escena arranca con la misma palabra que una escena a la que apunta', () => {
    const c = campana([
      escena('inicio', { text: ['Llueve sobre el vado.'], choices: [{ id: 'ir', label: 'Ir', outcome: { next: 'otra' } }] }),
      escena('otra', { text: ['Llueve más fuerte ahora.'] }),
    ]);
    expect(mensajes(chequearRepeticiones(c, ctx()), 'arranques').some((m) => m.includes('igual que otra, a la que apunta'))).toBe(true);
  });

  it('marca textos duplicados palabra por palabra entre escenas', () => {
    const c = campana([
      escena('inicio', { text: ['El farol se apaga sin ruido.'] }),
      escena('otra', { text: ['El farol se apaga sin ruido.'] }),
    ]);
    expect(chequearRepeticiones(c, ctx()).some((i) => i.check === 'duplicados' && i.level === 'error')).toBe(true);
  });
});

// --- palabras prohibidas y cupos -----------------------------------------

describe('contarFrase', () => {
  it('cuenta por palabra entera y respeta la tilde', () => {
    expect(contarFrase('tu casa es tu casa', 'tu')).toBe(2);
    expect(contarFrase('tu casa', 'tú')).toBe(0);
    expect(contarFrase('no podés evitar mirar y no podés evitar volver', 'no podés evitar')).toBe(2);
    expect(contarFrase('contiguo al muro', 'contigo')).toBe(0);
  });
});

describe('contarMedidaDeTiempo', () => {
  it('cuenta la unidad solo cuando mide, no cuando dice la hora del día ni el orden', () => {
    expect(contarMedidaDeTiempo('esperás dos horas bajo la lluvia', 'horas')).toBe(1);
    expect(contarMedidaDeTiempo('media hora después', 'hora')).toBe(1);
    expect(contarMedidaDeTiempo('a esta hora el río está bajo', 'hora')).toBe(0);
    expect(contarMedidaDeTiempo('a una hora en que nadie debería estar despierto', 'hora')).toBe(0);
    expect(contarMedidaDeTiempo('a la altura del segundo arco', 'segundo')).toBe(0);
  });
});

describe('pareceSinVerbo', () => {
  it('reconoce un fragmento nominal corto', () => {
    expect(pareceSinVerbo('Once días.')).toBe(true);
    expect(pareceSinVerbo('Nadie en el puente.')).toBe(true);
    expect(pareceSinVerbo('Orden del capitán Dravos.')).toBe(true);
  });
  it('ante la duda dice que hay verbo: voseo, pretérito, imperativo y clíticos', () => {
    expect(pareceSinVerbo('El río sube.')).toBe(false);
    expect(pareceSinVerbo('Bajás la pendiente.')).toBe(false);
    expect(pareceSinVerbo('La pendiente cedió.')).toBe(false);
    expect(pareceSinVerbo('Sentate ahí.')).toBe(false);
    expect(pareceSinVerbo('Se toma su tiempo.')).toBe(false);
    expect(pareceSinVerbo('Orell te mira sin decir nada.')).toBe(false);
    expect(pareceSinVerbo('Una frase larga que no se mide porque pasa de cinco palabras')).toBe(false);
  });
});

describe('chequearProhibidas', () => {
  it('encuentra un peninsularismo de la lista dura', () => {
    const c = campana([escena('inicio', { text: ['—Tú no sabes nada —dice.'] })]);
    const issues = chequearProhibidas(c, ctx());
    expect(issues.filter((i) => i.check === 'prohibidas' && i.level === 'error')).toHaveLength(2);
    expect(mensajes(issues, 'prohibidas').some((m) => m.startsWith('«tú» ×1'))).toBe(true);
  });

  it('no se confunde con `tu` sin tilde ni con las ambiguas de la biblia', () => {
    const c = campana([escena('inicio', { text: ['Orell mira tu mano y deja el farol.'] })]);
    expect(chequearProhibidas(c, ctx()).filter((i) => i.check === 'prohibidas')).toHaveLength(0);
  });

  it('encuentra un cliché, una unidad y una medida de tiempo', () => {
    const c = campana([escena('inicio', { text: ['Un escalofrío recorre tu espalda durante dos minutos, a cien metros del vado.'] })]);
    const issues = chequearProhibidas(c, ctx());
    expect(issues.some((i) => i.check === 'cliches')).toBe(true);
    expect(issues.some((i) => i.check === 'anacronismos' && i.message.includes('«metros»'))).toBe(true);
    expect(issues.some((i) => i.check === 'anacronismos' && i.message.includes('no se mide en «minutos»'))).toBe(true);
  });

  it('cuenta el cupo de campaña en registro corrido y marca al dueño equivocado', () => {
    const parrafo = (speaker: string, texto: string): Text => [{ speaker, variants: [{ text: texto }] }];
    const c = campana([
      escena('inicio', { text: parrafo('orell', '—Usted no entiende, usted no estuvo acá.') }),
    ]);
    const issues = chequearProhibidas(c, ctx());
    expect(mensajes(issues, 'cupos').some((m) => m.startsWith('«usted»: 2/8'))).toBe(true);
    expect(issues.some((i) => i.check === 'cupos' && i.level === 'aviso' && i.message.includes('fuera de su boca'))).toBe(true);
  });

  it('marca el cupo cero de `realmente`', () => {
    const c = campana([escena('inicio', { text: ['Realmente no importa.'] })]);
    expect(chequearProhibidas(c, ctx()).some((i) => i.check === 'cupos' && i.level === 'error' && i.message.includes('realmente'))).toBe(true);
  });
});

// --- marco de memoria -----------------------------------------------------

describe('chequearMarco', () => {
  it('frena una variante de memoria en boca de un PNJ de world/, que r08 deja pasar', () => {
    const c = campana([escena('inicio', {
      text: [{ speaker: 'orell', variants: [{ when: { endingSeen: 'fin_crecida' }, text: '—Otra vez vos.' }, { text: '—Pasá.' }] }],
    })]);
    const issues = chequearMarco(c, ctx());
    expect(issues.filter((i) => i.level === 'error')).toHaveLength(1);
    expect(issues[0]?.message).toContain('endingSeen: fin_crecida');
  });

  it('deja pasar un flag `run:` en boca del mismo PNJ, que sí puede verlo ahora', () => {
    const c = campana([escena('inicio', {
      text: [{ speaker: 'orell', variants: [{ when: { flag: 'run:orell_confia' }, text: '—Vení.' }, { text: '—Pasá.' }] }],
    })]);
    expect(chequearMarco(c, ctx()).filter((i) => i.level === 'error')).toHaveLength(0);
  });
});

// --- duración -------------------------------------------------------------

describe('duracion', () => {
  const conFinal = (): Campaign => campana([
    escena('inicio', {
      text: ['Palabra '.repeat(100).trim()],
      choices: [{ id: 'a', label: 'Seguir adelante', outcome: { next: 'fin' } }],
    }),
    escena('fin', { kind: 'ending', text: ['Fin.'], ending: { id: 'fin', epilogue: ['Se acabó.'] } }),
  ]);

  it('cuenta el texto base, las etiquetas y los lockedHint de una pantalla', () => {
    const scene = escena('e', {
      text: ['una dos tres'],
      choices: [{ id: 'c', label: 'cuatro cinco', requires: { flag: 'run:x' }, lockedHint: 'seis', outcome: { next: 'e' } }],
    });
    expect(palabrasDePantalla(scene)).toBe(6);
  });

  it('la misma semilla da exactamente la misma ruta', () => {
    const c = conFinal();
    expect(caminar(c, 7, 0)).toEqual(caminar(c, 7, 0));
    expect(caminar(c, 7, 0)?.escenas).toEqual(['inicio', 'fin']);
  });

  it('aplica la fórmula del diseño: palabras/180 más 8 segundos por decisión', () => {
    expect(minutos({ escenas: [], palabras: 180, decisiones: 0, final: null })).toBeCloseTo(1);
    expect(minutos({ escenas: [], palabras: 0, decisiones: 15, final: null })).toBeCloseTo(2);
  });

  it('avisa cuando la partida típica queda fuera de la ventana de la campaña', () => {
    const issues = chequearDuracion(conFinal(), ctx());
    expect(issues.some((i) => i.level === 'aviso' && i.message.includes('fuera de la ventana 30-45'))).toBe(true);
  });
});

// --- muletillas -----------------------------------------------------------

describe('chequearMuletillas', () => {
  it('lista las palabras de contenido más repetidas y saltea las vacías', () => {
    const c = campana([escena('inicio', { text: ['El farol y el farol y el farol y la lluvia.'] })]);
    const linea = mensajes(chequearMuletillas(c, ctx()), 'muletillas')[0] ?? '';
    expect(linea).toContain('farol 3');
    expect(linea).not.toContain(' el ');
  });
});

// --- CLI ------------------------------------------------------------------

describe('parseArgs', () => {
  it('sin argumentos devuelve un objeto vacío', () => {
    expect(parseArgs([])).toEqual({});
  });
  it('acepta --campaign, --strict y los numéricos, separados o con =', () => {
    expect(parseArgs(['--campaign', 'vado', '--strict'])).toEqual({ campaign: 'vado', strict: true });
    expect(parseArgs(['--seed=5', '--walks=10', '--top=3', '--level=error'])).toEqual({ seed: 5, walks: 10, top: 3, level: 'error' });
  });
  it('rechaza lo que no entiende', () => {
    expect(() => parseArgs(['--campaign'])).toThrow('Falta el valor de --campaign');
    expect(() => parseArgs(['--strict=si'])).toThrow('--strict no lleva valor');
    expect(() => parseArgs(['--seed', 'x'])).toThrow('--seed espera un número entero, no "x"');
    expect(() => parseArgs(['--level', 'grave'])).toThrow('Nivel desconocido: grave (se acepta error, aviso o info)');
    expect(() => parseArgs(['--assets'])).toThrow('Argumento desconocido: --assets');
  });
});

describe('formatIssue y summaryLine', () => {
  it('imprime campaña › escena › [chequeo] mensaje', () => {
    expect(formatIssue('vado', { level: 'aviso', check: 'bandas', sceneId: 'p_camino', message: 'algo' })).toBe('vado › p_camino › [bandas] algo');
    expect(formatIssue('vado', { level: 'info', check: 'presupuesto', message: 'algo' })).toBe('vado › - › [presupuesto] algo');
  });
  it('cuenta errores, avisos y mediciones', () => {
    expect(summaryLine([{ level: 'error', check: 'a', message: 'x' }, { level: 'info', check: 'b', message: 'y' }])).toBe('1 errores, 0 avisos, 1 mediciones');
  });
  it('sin --strict siempre sale con 0; con --strict falla si hay un error', () => {
    const con: LintIssue[] = [{ level: 'error', check: 'cupos', message: 'x' }];
    const sin: LintIssue[] = [{ level: 'aviso', check: 'bandas', message: 'x' }];
    expect(codigoDeSalida(con, false)).toBe(0);
    expect(codigoDeSalida(con, true)).toBe(1);
    expect(codigoDeSalida(sin, true)).toBe(0);
  });
  it('--level filtra por nivel mínimo', () => {
    const i: LintIssue = { level: 'aviso', check: 'a', message: 'x' };
    expect(visible(i, undefined)).toBe(true);
    expect(visible(i, 'aviso')).toBe(true);
    expect(visible(i, 'error')).toBe(false);
  });
});

// --- el CLI de verdad, como proceso aparte --------------------------------

const raiz = path.resolve(fileURLToPath(import.meta.url), '../../..');

interface Corrida { code: number | null; stdout: string; stderr: string }

function correrCli(args: readonly string[]): Promise<Corrida> {
  return new Promise<Corrida>((resolve, reject) => {
    const hijo = spawn(process.execPath, ['--import', 'tsx', 'tools/lint-text.ts', ...args], {
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

describe('tools/lint-text.ts', () => {
  it('corre sobre la campaña real y sale con 0 sin --strict', async () => {
    const { code, stdout } = await correrCli(['--campaign=vado', '--walks=20']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/vado › .+ › \[presupuesto\] prosa narrativa: \d+ palabras escritas/);
    expect(stdout).toMatch(/vado: \d+ errores, \d+ avisos, \d+ mediciones/);
  }, 120_000);

  it('rechaza una campaña desconocida', async () => {
    const { code, stderr } = await correrCli(['--campaign=inexistente']);
    expect(code).toBe(1);
    expect(stderr).toContain('Campaña desconocida: inexistente');
  }, 60_000);

  it('con dos corridas iguales el informe es idéntico (determinismo)', async () => {
    const a = await correrCli(['--campaign=vado', '--walks=20', '--seed=99']);
    const b = await correrCli(['--campaign=vado', '--walks=20', '--seed=99']);
    expect(a.stdout).toBe(b.stdout);
  }, 180_000);
});
