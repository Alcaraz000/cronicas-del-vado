import { partirBandera, tomarValor } from '../args';
import type { ValidationIssue } from './types';

/**
 * `--assets` cruza el contenido contra los archivos de arte de `src/assets/` (spec §7). Es
 * **informativo**: mientras no exista el arte, lo normal es que falte todo, y `npm run build` corre
 * `validate` sin banderas, así que el chequeo no puede ponerse en el camino. `--assets-strict` es la
 * bandera explícita que lo convierte en una puerta, para cuando la fase G declare el arte terminado.
 */
export interface CliArgs { profile?: 'smoke' | 'release'; campaign?: string; assets?: true; assetsStrict?: true }

function esPerfil(value: string): value is 'smoke' | 'release' {
  return value === 'smoke' || value === 'release';
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {};
  let i = 0;
  while (i < argv.length) {
    const actual = argv[i] ?? '';
    const { nombre, inline } = partirBandera(actual);
    if (nombre === '--assets') {
      args.assets = true;
      i += 1;
    } else if (nombre === '--assets-strict') {
      // Implica --assets: pedir que falle sin pedir que mire sería una trampa silenciosa.
      args.assets = true;
      args.assetsStrict = true;
      i += 1;
    } else if (nombre === '--profile') {
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
