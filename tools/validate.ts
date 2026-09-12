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

main(process.argv.slice(2)).then(
  (code) => { process.exit(code); },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);
