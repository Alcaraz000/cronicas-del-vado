import { partirBandera, tomarValor } from '../args';

export type GraphFormat = 'md' | 'mmd';

export interface GraphArgs {
  campaign?: string;
  out?: string;
  format?: GraphFormat;
  /** `true` fuerza los diagramas por acto, `false` los prohíbe; sin la bandera decide el tamaño. */
  split?: boolean;
}

function esFormato(valor: string): valor is GraphFormat {
  return valor === 'md' || valor === 'mmd';
}

export function parseGraphArgs(argv: readonly string[]): GraphArgs {
  const args: GraphArgs = {};
  let i = 0;
  while (i < argv.length) {
    const actual = argv[i] ?? '';
    const { nombre, inline } = partirBandera(actual);
    if (nombre === '--campaign') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      args.campaign = valor;
      i += salto;
    } else if (nombre === '--out') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      args.out = valor;
      i += salto;
    } else if (nombre === '--format') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      if (!esFormato(valor)) throw new Error(`Formato desconocido: ${valor} (se acepta md o mmd)`);
      args.format = valor;
      i += salto;
    } else if (nombre === '--split') {
      args.split = true;
      i += 1;
    } else if (nombre === '--no-split') {
      args.split = false;
      i += 1;
    } else {
      throw new Error(`Argumento desconocido: ${actual}`);
    }
  }
  return args;
}

export const AYUDA = [
  'Uso: npm run graph -- [--campaign <id>] [--out <archivo>] [--format md|mmd] [--split|--no-split]',
  '  --campaign  una sola campaña (por defecto, todas las registradas)',
  '  --out       escribe a un archivo en vez de a la salida estándar (exige --campaign)',
  '  --format    md (Markdown con bloques ```mermaid, por defecto) o mmd (Mermaid pelado)',
  '  --split     agrega un diagrama por acto (automático si la campaña pasa de 20 escenas)',
].join('\n');
