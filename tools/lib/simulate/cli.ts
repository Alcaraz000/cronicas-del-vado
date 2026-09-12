/**
 * Parseo de argumentos a mano, como en `tools/lib/validate/cli.ts`: sin librerías y con los
 * mensajes en castellano. Acepta `--x valor` y `--x=valor`.
 */

export interface CliArgs {
  campaign?: string;
  /** Carreras por combinación. */
  n?: number;
  /** Partidas por carrera. */
  k?: number;
  seed?: number;
  /** Ruta del informe; por defecto, el `design/sim-report.md` de la campaña. */
  out?: string;
  maxPasos?: number;
}

/** Semilla por defecto: fija para que el informe sea reproducible y comparable entre commits. */
export const SEMILLA_POR_DEFECTO = 20260912;

/**
 * Carreras por combinación por defecto: 100, o sea 2.400 carreras y ~9.300 partidas, un minuto y
 * medio. La spec §10 pide 500 (unos ocho minutos); se sube con `--n`. El valor por defecto es el
 * que se usó para el `sim-report.md` que está en el repo, así que `npm run simulate` sin argumentos
 * regenera exactamente ese archivo.
 */
export const N_POR_DEFECTO = 100;

/** Partidas por carrera por defecto (spec §10: K = 4). */
export const K_POR_DEFECTO = 4;

/**
 * Tope de transiciones de escena por partida antes de darla por colgada. Es una red de seguridad,
 * no un recorte: la partida más larga de la campaña real ronda las 90 escenas con la política
 * aleatoria, así que 250 deja pasar toda la cola y solo salta si hay un ciclo de verdad.
 * También queda por debajo de `LIMITS.maxLog`, para que el log no se recorte y las métricas
 * (que se leen de él) sigan siendo exactas.
 */
export const MAX_PASOS_POR_DEFECTO = 250;

function entero(nombre: string, valor: string): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${nombre} tiene que ser un entero positivo (llegó "${valor}")`);
  }
  return n;
}

const CONOCIDOS = new Set(['--campaign', '--n', '--k', '--seed', '--out', '--max-pasos']);

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {};
  const tomarValor = (
    nombre: string,
    inline: string | undefined,
    siguiente: string | undefined,
  ): { valor: string; salto: number } => {
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
    if (!CONOCIDOS.has(nombre)) {
      throw new Error(`Argumento desconocido: ${actual}`);
    }
    const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
    switch (nombre) {
      case '--campaign':
        args.campaign = valor;
        break;
      case '--n':
        args.n = entero(nombre, valor);
        break;
      case '--k':
        args.k = entero(nombre, valor);
        break;
      case '--seed':
        args.seed = entero(nombre, valor);
        break;
      case '--out':
        args.out = valor;
        break;
      case '--max-pasos':
        args.maxPasos = entero(nombre, valor);
        break;
      default:
        throw new Error(`Argumento desconocido: ${actual}`);
    }
    i += salto;
  }
  return args;
}

/** Ruta por defecto del informe de una campaña. */
export function rutaInforme(campaignId: string): string {
  return `src/content/campaigns/${campaignId}/design/sim-report.md`;
}
