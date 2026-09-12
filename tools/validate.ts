import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPAIGNS } from '@/content/campaigns/index';
import { WORLD } from '@/content/world/index';
import { validateCampaign } from './lib/validate/index';
import { formatIssue, parseArgs, summaryLine } from './lib/validate/cli';
import { archivosDeArte, comparar, lineasDeInforme, referencias, resumenDeAssets, rutaDe } from './lib/assets/index';
import type { ValidationIssue } from './lib/validate/types';

/** `src/assets/`, donde `post.py` deja los exportados (spec §7). */
const ASSETS = path.resolve(fileURLToPath(import.meta.url), '../../src/assets');

async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  const ids = args.campaign !== undefined ? [args.campaign] : Object.keys(CAMPAIGNS);
  const todos: ValidationIssue[] = [];
  // El cruce de arte no es una regla del validador: no mira el grafo, mira el disco, y es
  // informativo salvo que lo pidan estricto. Por eso vive aparte y no entra en `todos`.
  const archivos = args.assets === true ? await archivosDeArte(ASSETS) : [];
  // Por ruta y no por campaña: los PNJ y las reliquias de `world/` los referencian todas, y contar
  // ocho veces el retrato de Orell convertiría la lista de compras en una lista de compras inflada.
  const faltanAssets = new Set<string>();
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
    if (args.assets === true) {
      const informe = comparar(referencias(campaign, WORLD), archivos);
      for (const linea of lineasDeInforme(id, informe)) console.log(linea);
      console.log(resumenDeAssets(id, informe));
      for (const ref of informe.faltantes) faltanAssets.add(rutaDe(ref));
    }
  }
  console.log(summaryLine(todos));
  if (args.assets === true) {
    const aviso = args.assetsStrict === true ? '' : ' (informativo; con --assets-strict falla)';
    console.log(`assets: faltan ${String(faltanAssets.size)} archivos de arte distintos${aviso}`);
  }
  if (todos.some((i) => i.level === 'error')) return 1;
  return args.assetsStrict === true && faltanAssets.size > 0 ? 1 : 0;
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
