import { CAMPAIGNS } from '@/content/campaigns/index';
import { WORLD } from '@/content/world/index';
import { validateCampaign } from './lib/validate/index';
import { formatIssue, parseArgs, summaryLine } from './lib/validate/cli';
import type { ValidationIssue } from './lib/validate/types';

async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  const ids = args.campaign !== undefined ? [args.campaign] : Object.keys(CAMPAIGNS);
  const todos: ValidationIssue[] = [];
  for (const id of ids) {
    const entry = CAMPAIGNS[id];
    if (entry === undefined) {
      console.error(`Campaña desconocida: ${id} (registradas: ${Object.keys(CAMPAIGNS).join(', ')})`);
      return 1;
    }
    const campaign = await entry.load();
    const profile = args.profile ?? entry.meta.lintProfile;
    const issues = validateCampaign(campaign, { world: WORLD, profile });
    for (const issue of issues) console.log(formatIssue(id, issue));
    console.log(`${id}: ${summaryLine(issues)} (perfil ${profile})`);
    todos.push(...issues);
  }
  console.log(summaryLine(todos));
  return todos.some((i) => i.level === 'error') ? 1 : 0;
}

// Se fija process.exitCode en vez de cortar el proceso a mano: en Windows las escrituras a
// stdout son asíncronas también por tubería (que es como corre bajo `npm run build`), y una
// salida inmediata no las espera, así que se puede llevar puesta la línea de resumen, justo la
// que hace falta cuando hay errores. Dejando que el proceso termine solo, la salida sale entera.
main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  },
);
