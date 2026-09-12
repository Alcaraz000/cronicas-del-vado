import type { Choice, Outcome, Scene } from '@/content/schema';
import { aviso, error, info, type LintCheck, type LintIssue } from './types';
import { contar, palabrasEscritas, palabrasEtiquetas, palabrasPistas, textoBase, variantes, textosDe } from './texto';

const CHECK = 'presupuesto';
const BANDAS = 'bandas';

/** Celda de la tabla §2 del outline: cuánto debe medir el texto base y cuánto la escena entera. */
export interface CeldaPresupuesto { id: string; text: number; pal: number }

/**
 * Bandas de longitud de la biblia §2.3, en palabras. Se miden sobre lo que lee una partida
 * (la variante base), no sobre todo lo escrito.
 */
export const BANDAS_BIBLIA = {
  escena: [60, 160] as const,
  rondaEncuentro: [40, 80] as const,
  desenlace: [20, 60] as const,
  epilogo: [120, 200] as const,
  etiquetaCaracteres: 60,
};

/** Umbrales de `--strict`. Un exceso por debajo de estos números informa; por encima, es error. */
export const UMBRALES = {
  /** Porcentaje que el total escrito puede pasarse del presupuesto del outline sin ser error. */
  excesoTotalPct: 5,
  /** Porcentaje que una escena puede pasarse de su celda `pal` sin ser error. */
  excesoEscenaPct: 25,
};

function celdas(fila: string): string[] {
  const linea = fila.trim();
  if (!linea.startsWith('|')) return [];
  return linea.slice(1, linea.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
}

function limpiar(celda: string): string {
  return celda.replace(/[`*]/g, '').trim();
}

function numero(celda: string): number | null {
  const limpio = limpiar(celda).replace(/\./g, '');
  return /^\d+$/.test(limpio) ? Number(limpio) : null;
}

function esSeparador(cs: readonly string[]): boolean {
  return cs.length > 0 && cs.every((c) => /^:?-{2,}:?$/.test(c));
}

/**
 * Lee la tabla §2 del outline ("Tabla de escenas") y devuelve, por escena, las columnas `text` y `pal`.
 *
 * La sección tiene ocho tablas con dos formas distintas (las escenas normales traen `kind`, `lugar`,
 * `PNJ`, `opc` y `tir`; los finales traen `epílogo` y `variantes`), así que las columnas se buscan por
 * el nombre del encabezado y no por posición. Solo se aceptan tablas que tengan `id`, `text` y `pal`.
 */
export function leerPresupuestoOutline(markdown: string): Map<string, CeldaPresupuesto> {
  const lineas = markdown.split(/\r?\n/);
  const desde = lineas.findIndex((l) => /^##\s+2\.\s/.test(l));
  const hasta = lineas.findIndex((l, i) => i > desde && desde >= 0 && /^##\s+3\.\s/.test(l));
  const tramo = desde < 0 ? lineas : lineas.slice(desde, hasta < 0 ? undefined : hasta);

  const salida = new Map<string, CeldaPresupuesto>();
  let cols: { id: number; text: number; pal: number } | null = null;
  for (const linea of tramo) {
    const cs = celdas(linea);
    if (cs.length === 0) { cols = null; continue; }
    if (esSeparador(cs)) continue;
    const nombres = cs.map((c) => limpiar(c).toLocaleLowerCase('es'));
    const iId = nombres.indexOf('id');
    const iText = nombres.indexOf('text');
    const iPal = nombres.indexOf('pal');
    if (iId >= 0 && iText >= 0 && iPal >= 0) { cols = { id: iId, text: iText, pal: iPal }; continue; }
    if (cols === null) continue;
    const id = limpiar(cs[cols.id] ?? '');
    const text = numero(cs[cols.text] ?? '');
    const pal = numero(cs[cols.pal] ?? '');
    if (id === '' || text === null || pal === null) continue;
    salida.set(id, { id, text, pal });
  }
  return salida;
}

/** Los desenlaces de una opción, con el nombre de la banda cuando la opción es una tirada. */
function desenlacesDe(choice: Choice): { etiqueta: string; outcome: Outcome }[] {
  if (choice.outcome !== undefined) return [{ etiqueta: '', outcome: choice.outcome }];
  const o = choice.roll?.outcomes;
  if (o === undefined) return [];
  const lista = [
    { etiqueta: ' · éxito', outcome: o.success },
    { etiqueta: ' · con costo', outcome: o.partial },
    { etiqueta: ' · fallo', outcome: o.failure },
  ];
  if (o.crit) lista.push({ etiqueta: ' · crítico', outcome: o.crit });
  if (o.fumble) lista.push({ etiqueta: ' · fallo grave', outcome: o.fumble });
  return lista;
}

function bandaEscena(scene: Scene): readonly [number, number] {
  if (scene.kind === 'encounter') return BANDAS_BIBLIA.rondaEncuentro;
  return BANDAS_BIBLIA.escena;
}

/** Compara lo escrito contra la tabla §2 del outline y contra las bandas de la biblia §2.3. */
export const chequearPresupuesto: LintCheck = (campaign, ctx) => {
  const issues: LintIssue[] = [];
  const tabla = ctx.outline === undefined ? new Map<string, CeldaPresupuesto>() : leerPresupuestoOutline(ctx.outline);
  const escenas = Object.values(campaign.scenes);

  let escritoTotal = 0;
  let presupuestoTotal = 0;
  let baseTotal = 0;
  let basePresupuesto = 0;
  let etiquetasTotal = 0;
  let pistasTotal = 0;
  const excesos: { id: string; escrito: number; pal: number }[] = [];
  let sinCelda = 0;

  for (const scene of escenas) {
    const escrito = palabrasEscritas(scene);
    escritoTotal += escrito;
    baseTotal += contar(textoBase(scene.text));
    etiquetasTotal += palabrasEtiquetas(scene);
    pistasTotal += palabrasPistas(scene);
    const celda = tabla.get(scene.id);
    if (celda === undefined) { sinCelda += 1; } else {
      presupuestoTotal += celda.pal;
      basePresupuesto += celda.text;
      const base = contar(textoBase(scene.text));
      if (escrito > celda.pal) excesos.push({ id: scene.id, escrito, pal: celda.pal });
      const pct = celda.pal === 0 ? Infinity : ((escrito - celda.pal) / celda.pal) * 100;
      if (escrito > celda.pal) {
        const nivel = pct > UMBRALES.excesoEscenaPct ? error : aviso;
        issues.push(nivel(CHECK, `se pasa del presupuesto: ${escrito} palabras escritas contra ${celda.pal} de la tabla §2 (+${escrito - celda.pal}, +${pct.toFixed(0)} %)`, scene.id));
      }
      if (base > celda.text) {
        issues.push(aviso(CHECK, `el texto base mide ${base} palabras contra las ${celda.text} de la columna \`text\` (+${base - celda.text})`, scene.id));
      }
    }
  }

  if (sinCelda > 0 && tabla.size > 0) {
    issues.push(aviso(CHECK, `${sinCelda} escenas no tienen fila en la tabla §2 del outline`));
  }

  // Bandas de la biblia §2.3, medidas sobre lo que lee una partida.
  for (const scene of escenas) {
    const [min, max] = bandaEscena(scene);
    const base = contar(textoBase(scene.text));
    const cual = scene.kind === 'encounter' ? 'ronda de encuentro' : 'texto de escena';
    if (base < min || base > max) {
      issues.push(aviso(BANDAS, `${cual}: ${base} palabras, fuera de la banda ${min}-${max} de la biblia §2.3`, scene.id));
    }
    for (const choice of scene.choices) {
      if (contar(choice.label) > 0 && choice.label.length > BANDAS_BIBLIA.etiquetaCaracteres) {
        issues.push(aviso(BANDAS, `la etiqueta de \`${choice.id}\` mide ${choice.label.length} caracteres (tope ${BANDAS_BIBLIA.etiquetaCaracteres})`, scene.id));
      }
    }
    // La banda de la biblia §2.3 mide **un desenlace**, o sea lo que se lee al elegir esa opción:
    // el `outcome.text` entero en su versión base, no cada párrafo por separado.
    for (const choice of scene.choices) {
      for (const { etiqueta, outcome } of desenlacesDe(choice)) {
        if (outcome.text === undefined) continue;
        const n = contar(textoBase(outcome.text));
        const [dmin, dmax] = BANDAS_BIBLIA.desenlace;
        if (n > 0 && (n < dmin || n > dmax)) {
          issues.push(aviso(BANDAS, `el desenlace \`${choice.id}\`${etiqueta} mide ${n} palabras, fuera de la banda ${dmin}-${dmax}: «${recorte(textoBase(outcome.text))}»`, scene.id));
        }
      }
    }
    if (scene.ending) {
      const n = contar(textoBase(scene.ending.epilogue));
      const [emin, emax] = BANDAS_BIBLIA.epilogo;
      if (n < emin || n > emax) {
        issues.push(aviso(BANDAS, `el epílogo mide ${n} palabras, fuera de la banda ${emin}-${emax}`, scene.id));
      }
    }
  }

  // Totales.
  const escritoConEtiquetas = escritoTotal + etiquetasTotal + pistasTotal;
  issues.push(info(CHECK, `prosa narrativa: ${escritoTotal} palabras escritas` + (presupuestoTotal > 0 ? ` contra ${presupuestoTotal} de presupuesto (${signo(escritoTotal - presupuestoTotal)}, ${signo(Math.round(((escritoTotal - presupuestoTotal) / presupuestoTotal) * 100))} %)` : '')));
  issues.push(info(CHECK, `texto base de las escenas: ${baseTotal} palabras` + (basePresupuesto > 0 ? ` contra ${basePresupuesto} de la columna \`text\` (${signo(baseTotal - basePresupuesto)}); media ${(baseTotal / escenas.length).toFixed(0)} por escena` : '')));
  // Dónde vive el resto de la prosa: es la línea que dice si el exceso está en el texto que lee
  // todo el mundo o en las piezas condicionales, que es lo que decide qué se recorta.
  let variantesEscena = 0;
  let desenlaces = 0;
  let epilogos = 0;
  for (const scene of escenas) {
    for (const v of variantes(scene.text)) variantesEscena += contar(v.text);
    for (const text of textosDe(scene)) {
      if (text === scene.text) continue;
      if (scene.ending && text === scene.ending.epilogue) { for (const v of variantes(text)) epilogos += contar(v.text); continue; }
      for (const v of variantes(text)) desenlaces += contar(v.text);
    }
  }
  issues.push(info(CHECK, `reparto: texto de escena ${variantesEscena} (base ${baseTotal} + ${variantesEscena - baseTotal} de variantes) · desenlaces y bandas ${desenlaces} · epílogos ${epilogos}`));
  issues.push(info(CHECK, `etiquetas ${etiquetasTotal} + \`lockedHint\` ${pistasTotal} ⇒ total escrito ${escritoConEtiquetas} palabras`));
  if (excesos.length > 0) {
    const peores = [...excesos].sort((a, b) => (b.escrito - b.pal) - (a.escrito - a.pal)).slice(0, 5);
    issues.push(info(CHECK, `${excesos.length} de ${escenas.length} escenas por encima de su celda; las peores: ${peores.map((e) => `${e.id} +${e.escrito - e.pal}`).join(' · ')}`));
  }
  if (presupuestoTotal > 0) {
    const pct = ((escritoTotal - presupuestoTotal) / presupuestoTotal) * 100;
    if (pct > UMBRALES.excesoTotalPct) {
      issues.push(error(CHECK, `la campaña se pasa del presupuesto de prosa en ${pct.toFixed(1)} % (tope ${UMBRALES.excesoTotalPct} %)`));
    }
  }
  return issues;
};

function signo(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function recorte(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length <= 48 ? limpio : `${limpio.slice(0, 45)}…`;
}
