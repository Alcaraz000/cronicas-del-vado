import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CAMPAIGNS } from '@/content/campaigns/index';
import { parseGraphArgs, AYUDA } from './lib/graph/cli';
import { cuentasDe, documentoMarkdown, documentoMermaid } from './lib/graph/mermaid';

/**
 * Exportador del grafo de escenas a Mermaid (spec §8 y §10).
 *
 * Herramienta de autor: **reporta**, no bloquea, y nunca sale con código distinto de 0 salvo que le
 * pidan una campaña que no existe o no pueda escribir el archivo. El grafo que dibuja es el REAL, el
 * del contenido, para poder ponerlo al lado del diagrama del outline y ver si se desviaron.
 *
 * No fusiona con el mundo a propósito: el grafo solo mira `scenes`, y las escenas son siempre de la
 * campaña. Lo que sí necesita la fusión es `validate --assets` (PNJ y reliquias de `world/`).
 */
async function main(argv: readonly string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(AYUDA);
    return 0;
  }
  const args = parseGraphArgs(argv);
  const ids = args.campaign !== undefined ? [args.campaign] : Object.keys(CAMPAIGNS);
  if (args.out !== undefined && ids.length > 1) {
    console.error('Con --out hay que indicar también --campaign: un archivo por campaña.');
    return 1;
  }
  for (const id of ids) {
    const entry = CAMPAIGNS[id];
    if (entry === undefined) {
      console.error(`Campaña desconocida: ${id} (registradas: ${Object.keys(CAMPAIGNS).join(', ')})`);
      return 1;
    }
    const campaign = await entry.load();
    const opciones = args.split === undefined ? {} : { split: args.split };
    const texto = args.format === 'mmd' ? documentoMermaid(campaign, opciones) : documentoMarkdown(campaign, opciones);
    if (args.out === undefined) {
      console.log(texto);
      continue;
    }
    const destino = path.resolve(args.out);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, `${texto}\n`, 'utf8');
    const c = cuentasDe(campaign);
    console.log(`${id}: ${String(c.escenas)} escenas y ${String(c.opciones)} opciones → ${destino}`);
  }
  return 0;
}

// Igual que en `tools/validate.ts`: se fija `process.exitCode` en vez de cortar el proceso, porque en
// Windows las escrituras a una tubería son asíncronas y un `process.exit()` se lleva puesta la salida.
main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  },
);
