import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPAIGNS } from '@/content/campaigns/index';
import { WORLD } from '@/content/world/index';
import type { Campaign, WorldContent } from '@/content/schema';
import { lintCampaign } from './lib/lint/index';
import { codigoDeSalida, formatIssue, parseArgs, POR_DEFECTO, summaryLine, visible } from './lib/lint/cli';
import type { LintIssue } from './lib/lint/types';

const RAIZ = path.resolve(fileURLToPath(import.meta.url), '../..');

/**
 * El motor espera la campaña fusionada con el mundo; el store lo hace con `conMundo`. Acá se repite
 * la misma fusión en vez de importar el store, porque `tools/*` corre en Node puro y el store arrastra
 * zustand, la persistencia y medio Vite.
 */
function conMundo(campaign: Campaign, world: WorldContent): Campaign {
  return {
    ...campaign,
    npcs: { ...campaign.npcs, ...world.npcs },
    places: { ...campaign.places, ...world.places },
    items: { ...campaign.items, ...world.items },
  };
}

/** El outline de diseño de la campaña, si existe; sin él el chequeo de presupuesto se saltea. */
async function leerOutline(campaignId: string): Promise<string | undefined> {
  const ruta = path.join(RAIZ, 'src', 'content', 'campaigns', campaignId, 'design', '01-outline.md');
  try {
    return await readFile(ruta, 'utf8');
  } catch {
    return undefined;
  }
}

async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  const ids = args.campaign !== undefined ? [args.campaign] : Object.keys(CAMPAIGNS);
  const todos: LintIssue[] = [];
  for (const id of ids) {
    const entry = CAMPAIGNS[id];
    if (entry === undefined) {
      console.error(`Campaña desconocida: ${id} (registradas: ${Object.keys(CAMPAIGNS).join(', ')})`);
      return 1;
    }
    const campaign = conMundo(await entry.load(), WORLD);
    const outline = await leerOutline(id);
    const issues = lintCampaign(campaign, {
      world: WORLD,
      ...(outline === undefined ? {} : { outline }),
      seed: args.seed ?? POR_DEFECTO.seed,
      walks: args.walks ?? POR_DEFECTO.walks,
      top: args.top ?? POR_DEFECTO.top,
    });
    for (const issue of issues) if (visible(issue, args.level)) console.log(formatIssue(id, issue));
    console.log(`${id}: ${summaryLine(issues)}${outline === undefined ? ' (sin outline: no se midió el presupuesto)' : ''}`);
    todos.push(...issues);
  }
  console.log(summaryLine(todos));
  const code = codigoDeSalida(todos, args.strict === true);
  if (code !== 0) console.error(`--strict: ${todos.filter((i) => i.level === 'error').length} hallazgos por encima del umbral`);
  return code;
}

// Mismo motivo que en `validate.ts`: en Windows stdout es asíncrono también por tubería, así que se
// fija `process.exitCode` en vez de cortar el proceso y la salida sale entera.
main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  },
);
