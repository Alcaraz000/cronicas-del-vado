import type { LintIssue, LintLevel } from './types';

export interface LintArgs {
  campaign?: string;
  strict?: true;
  seed?: number;
  walks?: number;
  top?: number;
  /** Nivel mínimo que se imprime. Por defecto se imprime todo. */
  level?: LintLevel;
}

export const POR_DEFECTO = { seed: 20260910, walks: 200, top: 25 };

const NIVELES: Record<LintLevel, number> = { info: 0, aviso: 1, error: 2 };

function esNivel(valor: string): valor is LintLevel {
  return valor === 'error' || valor === 'aviso' || valor === 'info';
}

function entero(nombre: string, valor: string): number {
  if (!/^-?\d+$/.test(valor)) throw new Error(`${nombre} espera un número entero, no "${valor}"`);
  return Number(valor);
}

export function parseArgs(argv: readonly string[]): LintArgs {
  const args: LintArgs = {};
  const tomarValor = (nombre: string, inline: string | undefined, siguiente: string | undefined): { valor: string; salto: number } => {
    if (inline !== undefined) return { valor: inline, salto: 1 };
    if (siguiente === undefined || siguiente.startsWith('--')) throw new Error(`Falta el valor de ${nombre}`);
    return { valor: siguiente, salto: 2 };
  };
  let i = 0;
  while (i < argv.length) {
    const actual = argv[i] ?? '';
    const igual = actual.indexOf('=');
    const nombre = igual === -1 ? actual : actual.slice(0, igual);
    const inline = igual === -1 ? undefined : actual.slice(igual + 1);
    if (nombre === '--campaign') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      args.campaign = valor;
      i += salto;
    } else if (nombre === '--strict') {
      if (inline !== undefined) throw new Error('--strict no lleva valor');
      args.strict = true;
      i += 1;
    } else if (nombre === '--seed' || nombre === '--walks' || nombre === '--top') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      const n = entero(nombre, valor);
      if (nombre === '--seed') args.seed = n;
      else if (nombre === '--walks') args.walks = n;
      else args.top = n;
      if (n < 0) throw new Error(`${nombre} no puede ser negativo`);
      i += salto;
    } else if (nombre === '--level') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      if (!esNivel(valor)) throw new Error(`Nivel desconocido: ${valor} (se acepta error, aviso o info)`);
      args.level = valor;
      i += salto;
    } else {
      throw new Error(`Argumento desconocido: ${actual}`);
    }
  }
  return args;
}

export function formatIssue(campaignId: string, issue: LintIssue): string {
  return `${campaignId} › ${issue.sceneId ?? '-'} › [${issue.check}] ${issue.message}`;
}

export function summaryLine(issues: readonly LintIssue[]): string {
  const errores = issues.filter((i) => i.level === 'error').length;
  const avisos = issues.filter((i) => i.level === 'aviso').length;
  const infos = issues.filter((i) => i.level === 'info').length;
  return `${errores} errores, ${avisos} avisos, ${infos} mediciones`;
}

export function visible(issue: LintIssue, minimo: LintLevel | undefined): boolean {
  return minimo === undefined || NIVELES[issue.level] >= NIVELES[minimo];
}

/**
 * Sin `--strict` esto informa y sale con 0, siempre: es una herramienta de autor, no una puerta.
 * Con `--strict` falla si hay al menos un hallazgo de nivel `error`, que son los que están por encima
 * de un umbral declarado (las listas duras de la biblia §2.6, los cupos, el marco de memoria y los
 * excesos de presupuesto más grandes que `UMBRALES`).
 */
export function codigoDeSalida(issues: readonly LintIssue[], strict: boolean): number {
  if (!strict) return 0;
  return issues.some((i) => i.level === 'error') ? 1 : 0;
}
