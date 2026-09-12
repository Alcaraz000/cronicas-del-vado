import type { ValidationIssue } from './types';

export interface CliArgs { profile?: 'smoke' | 'release'; campaign?: string }

function esPerfil(value: string): value is 'smoke' | 'release' {
  return value === 'smoke' || value === 'release';
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {};
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
    if (nombre === '--profile') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      if (!esPerfil(valor)) throw new Error(`Perfil desconocido: ${valor} (se acepta smoke o release)`);
      args.profile = valor;
      i += salto;
    } else if (nombre === '--campaign') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      args.campaign = valor;
      i += salto;
    } else {
      throw new Error(`Argumento desconocido: ${actual}`);
    }
  }
  return args;
}

export function formatIssue(campaignId: string, issue: ValidationIssue): string {
  return `${campaignId} › ${issue.sceneId ?? '-'} › [${issue.rule}] ${issue.message}`;
}

export function summaryLine(issues: readonly ValidationIssue[]): string {
  const errores = issues.filter((i) => i.level === 'error').length;
  const avisos = issues.filter((i) => i.level === 'warning').length;
  return `${errores} errores, ${avisos} avisos`;
}
