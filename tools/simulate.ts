import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CAMPAIGNS } from '@/content/campaigns/index';
import { agregar, porNumeroDePartida } from './lib/simulate/agregado';
import { cargarCampana } from './lib/simulate/campana';
import {
  K_POR_DEFECTO,
  MAX_PASOS_POR_DEFECTO,
  N_POR_DEFECTO,
  SEMILLA_POR_DEFECTO,
  parseArgs,
  rutaInforme,
} from './lib/simulate/cli';
import { informeMarkdown, lineasDeAserciones, resumenConsola } from './lib/simulate/informe';
import { combinaciones, simularCarrera } from './lib/simulate/partida';
import { CLASES, NIVELES, POLITICAS, type ConfigSim, type ResultadoCarrera } from './lib/simulate/types';

/**
 * Simulador de partidas de "Crónicas del Vado" (spec §10).
 *
 * Es una herramienta de AUTOR: corre el motor real sobre la campaña real y **reporta**. Solo cuatro
 * aserciones hacen fallar el comando; todo lo demás es informe.
 *
 * Uso:
 *   npx tsx tools/simulate.ts [--campaign vado] [--n 40] [--k 4] [--seed 20260912] [--out ruta.md]
 *
 * Determinismo: los dados salen de `rollDice(seed, …)` con una semilla derivada de la combinación
 * entera, y las elecciones de la política `aleatoria` de un `mulberry32` igual de derivado. Dos
 * corridas con la misma `--seed` producen exactamente el mismo informe, que es lo único que lo hace
 * comparable entre commits.
 *
 * OJO con la fusión con el mundo: el motor resuelve PNJ, lugares y objetos contra `campaign` y nada
 * más, así que hay que darle la campaña fusionada con WORLD, igual que hace el store. Sin eso las
 * reliquias y los PNJ compartidos no existen y el informe mide otro juego.
 */

async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  const campaignId = args.campaign ?? 'vado';
  if (CAMPAIGNS[campaignId] === undefined) {
    console.error(`Campaña desconocida: ${campaignId} (registradas: ${Object.keys(CAMPAIGNS).join(', ')})`);
    return 1;
  }
  const campaign = await cargarCampana(campaignId);

  const config: ConfigSim = {
    campaignId,
    n: args.n ?? N_POR_DEFECTO,
    k: args.k ?? K_POR_DEFECTO,
    semilla: args.seed ?? SEMILLA_POR_DEFECTO,
    maxPasos: args.maxPasos ?? MAX_PASOS_POR_DEFECTO,
  };

  const combos = combinaciones(CLASES, NIVELES, POLITICAS);
  const carreras: ResultadoCarrera[] = [];
  const arranque = Date.now();
  for (const combo of combos) {
    for (let i = 0; i < config.n; i += 1) {
      carreras.push(simularCarrera(campaign, combo, i, config));
    }
    process.stdout.write(`  ${combo.clase} nivel ${combo.nivel} ${combo.politica}: ${config.n} carreras\n`);
  }

  const agregado = agregar(campaign, carreras);
  const ruta = args.out ?? rutaInforme(campaignId);
  const destino = path.resolve(process.cwd(), ruta);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, informeMarkdown(campaign, config, agregado, porNumeroDePartida(carreras.flatMap((c) => c.partidas))), 'utf8');

  console.log('');
  console.log(resumenConsola(campaign, config, agregado, ruta));
  console.log(`Tiempo: ${((Date.now() - arranque) / 1000).toFixed(1)} s`);

  return lineasDeAserciones(agregado).every((a) => a.pasa) ? 0 : 1;
}

// Mismo motivo que en tools/validate.ts: en Windows las escrituras a una tubería son asíncronas y
// una salida inmediata se lleva puesta la última línea, que acá es justamente el veredicto de las
// aserciones. Se fija process.exitCode y se deja que el proceso termine solo.
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  },
);
