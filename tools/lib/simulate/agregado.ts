import type { ClassId } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import { alcanzablesSinMemoria, opcionesDeMemoria, todasLasOpciones } from './grafo';
import { CLASES, type Combinacion, type ResultadoCarrera, type ResultadoPartida } from './types';

/** Objetivo de diseño de la spec §11: una partida dura entre 24 y 30 escenas. */
export const LARGO_OBJETIVO: readonly [number, number] = [24, 30];

/** Tope de muerte a nivel 1 con política codiciosa (aserción 2 de la spec §10). */
export const TOPE_MUERTE_CODICIOSA = 0.03;

export interface Resumen {
  n: number;
  media: number;
  mediana: number;
  min: number;
  max: number;
}

export function resumir(valores: readonly number[]): Resumen {
  if (valores.length === 0) return { n: 0, media: 0, mediana: 0, min: 0, max: 0 };
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  const mediana =
    ordenados.length % 2 === 1
      ? (ordenados[mitad] as number)
      : ((ordenados[mitad - 1] as number) + (ordenados[mitad] as number)) / 2;
  return {
    n: valores.length,
    media: valores.reduce((s, v) => s + v, 0) / valores.length,
    mediana,
    min: ordenados[0] as number,
    max: ordenados[ordenados.length - 1] as number,
  };
}

export interface FilaCombinacion extends Combinacion {
  partidas: number;
  escenas: Resumen;
  /** Escenas DISTINTAS por partida: la longitud sin contar las vueltas al hub. */
  escenasDistintas: Resumen;
  palabras: Resumen;
  /** Fracción de partidas cuya longitud cae dentro de LARGO_OBJETIVO. */
  enObjetivo: number;
  derrota: number;
  muerte: number;
  colgadas: number;
  sinSalida: number;
  heridasMedia: number;
  /** Fallos / tiradas, sobre el total de la combinación, DESPUÉS de Fortuna y Poder. */
  tasaFallo: number;
  /** Fallos en los dados / tiradas: la dificultad cruda, antes de Fortuna y Poder. */
  tasaFalloCruda: number;
  tiradasMedia: number;
  finales: Record<string, number>;
  nivelFinalMedio: number;
  xpFinalMedia: number;
}

export interface Aserciones {
  /** 1. Escenas alcanzables sin memoria que la simulación no visitó nunca. */
  escenasInalcanzables: string[];
  /** 2. Muerte a nivel 1 con política codiciosa. */
  muerteNivel1Codiciosa: number;
  partidasNivel1Codiciosa: number;
  /** 3. Por clase, los finales de la campaña que no se alcanzaron en ninguna partida. */
  finalesFaltantesPorClase: { clase: ClassId; faltan: string[] }[];
  ok: boolean;
}

export interface Agregado {
  carreras: number;
  partidas: number;
  escenasTotales: number;
  escenasVisitadas: number;
  escenasNuncaVisitadas: string[];
  /** Las que nunca se visitaron y además NO están detrás de una condición de memoria. */
  escenasNuncaVisitadasSinMemoria: string[];
  opcionesTotales: number;
  opcionesElegidas: number;
  opcionesNuncaElegidas: string[];
  opcionesNuncaElegidasSinMemoria: string[];
  finales: Record<string, number>;
  finalesPorClase: Record<string, Record<string, number>>;
  /** Finales por número de partida dentro de la carrera (1..k). */
  finalesPorPartida: Record<number, Record<string, number>>;
  filas: FilaCombinacion[];
  global: Omit<FilaCombinacion, keyof Combinacion>;
  flagsNuncaEncendidos: string[];
  hitosNuncaAlcanzados: string[];
  finalesNuncaAlcanzados: string[];
  nivelFinal: Resumen;
  xpFinal: Resumen;
  partidasConLogRecortado: number;
  /** Escenas donde alguna partida se colgó, de la más frecuente a la menos. */
  escenasQueCuelgan: { sceneId: string; veces: number }[];
  /** Escenas donde alguna partida se quedó sin opciones habilitadas. */
  escenasSinSalida: { sceneId: string; veces: number }[];
  aserciones: Aserciones;
  /**
   * Lo que el simulador quiere que el autor lea aunque no sea una aserción: medidas fuera del
   * objetivo de diseño, combinaciones degeneradas, finales casi inalcanzables.
   */
  avisos: string[];
}

function porcentaje(v: number): string {
  return `${(v * 100).toFixed(1)} %`;
}

/**
 * Avisos automáticos. No hacen fallar nada (los umbrales se fijan después de 3-5 testers, spec §10);
 * son la lista corta de cosas que el autor tiene que mirar.
 */
function calcularAvisos(campaign: Campaign, agregado: Omit<Agregado, 'avisos'>): string[] {
  const avisos: string[] = [];
  const g = agregado.global;

  if (g.escenas.media > LARGO_OBJETIVO[1] || g.escenas.media < LARGO_OBJETIVO[0]) {
    avisos.push(
      `La partida media dura ${g.escenas.media.toFixed(1)} escenas (${g.escenasDistintas.media.toFixed(1)} distintas) y el objetivo de diseño es ${LARGO_OBJETIVO[0]}–${LARGO_OBJETIVO[1]}.`,
    );
  }
  for (const fila of agregado.filas) {
    if (fila.tiradasMedia === 0) {
      avisos.push(
        `${fila.clase} nivel ${fila.nivel} con política ${fila.politica} termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.`,
      );
    }
  }
  const totalFinales = Object.values(agregado.finales).reduce((s, v) => s + v, 0);
  for (const id of Object.keys(campaign.endings)) {
    const n = agregado.finales[id] ?? 0;
    if (totalFinales > 0 && n / totalFinales < 0.05) {
      avisos.push(`El final \`${id}\` sale en ${porcentaje(n / totalFinales)} de las partidas que llegan a un final.`);
    }
  }
  if (g.colgadas > 0) {
    avisos.push(
      `${g.colgadas} partidas se colgaron sin llegar a un desenlace, en ${agregado.escenasQueCuelgan.map((e) => `\`${e.sceneId}\` (${e.veces})`).join(', ')}: hay un ciclo del que la política no sale.`,
    );
  }
  if (g.sinSalida > 0) {
    avisos.push(
      `${g.sinSalida} partidas quedaron sin ninguna opción habilitada, en ${agregado.escenasSinSalida.map((e) => `\`${e.sceneId}\` (${e.veces})`).join(', ')}.`,
    );
  }
  if (agregado.partidasConLogRecortado > 0) {
    avisos.push(`${agregado.partidasConLogRecortado} partidas llegaron al tope del log: sus métricas están recortadas.`);
  }
  return avisos;
}

/** Lo que hace falta para la tabla de trivialización, por número de partida dentro de la carrera. */
export interface DatosPorPartida {
  fallos: number;
  fallosCrudos: number;
  tiradas: number;
  escenas: number[];
  /** Nivel con el que el personaje EMPEZÓ esa partida. */
  nivel: number[];
  palabras: number[];
}

export function porNumeroDePartida(partidas: readonly ResultadoPartida[]): Map<number, DatosPorPartida> {
  const mapa = new Map<number, DatosPorPartida>();
  for (const p of partidas) {
    const d = mapa.get(p.partida) ?? { fallos: 0, fallosCrudos: 0, tiradas: 0, escenas: [], nivel: [], palabras: [] };
    d.fallos += p.fallos;
    d.fallosCrudos += p.fallosCrudos;
    d.tiradas += p.tiradas;
    d.escenas.push(p.escenas.length);
    d.nivel.push(p.nivelAntes);
    d.palabras.push(p.palabras);
    mapa.set(p.partida, d);
  }
  return mapa;
}

/** Escenas donde las partidas terminaron mal, de la más frecuente a la menos. */
function contarEscenas(
  partidas: readonly ResultadoPartida[],
  kind: 'colgada' | 'sin_salida',
): { sceneId: string; veces: number }[] {
  const cuentas: Record<string, number> = {};
  for (const p of partidas) {
    if (p.desenlace.kind === kind) cuenta(cuentas, p.desenlace.sceneId);
  }
  return Object.entries(cuentas)
    .map(([sceneId, veces]) => ({ sceneId, veces }))
    .sort((a, b) => b.veces - a.veces || a.sceneId.localeCompare(b.sceneId));
}

function clave(c: Combinacion): string {
  return `${c.clase}|${c.nivel}|${c.politica}`;
}

function esFinal(p: ResultadoPartida): string | null {
  return p.desenlace.kind === 'ending' ? p.desenlace.endingId : null;
}

function cuenta(mapa: Record<string, number>, llave: string): void {
  mapa[llave] = (mapa[llave] ?? 0) + 1;
}

function fila(partidas: readonly ResultadoPartida[], carrerasDe: readonly ResultadoCarrera[]): Omit<FilaCombinacion, keyof Combinacion> {
  const escenas = resumir(partidas.map((p) => p.escenas.length));
  const escenasDistintas = resumir(partidas.map((p) => new Set(p.escenas).size));
  const palabras = resumir(partidas.map((p) => p.palabras));
  const dentro = partidas.filter(
    (p) => p.escenas.length >= LARGO_OBJETIVO[0] && p.escenas.length <= LARGO_OBJETIVO[1],
  ).length;
  const tiradas = partidas.reduce((s, p) => s + p.tiradas, 0);
  const fallos = partidas.reduce((s, p) => s + p.fallos, 0);
  const fallosCrudos = partidas.reduce((s, p) => s + p.fallosCrudos, 0);
  const finales: Record<string, number> = {};
  for (const p of partidas) {
    const id = esFinal(p);
    if (id !== null) cuenta(finales, id);
  }
  const total = Math.max(1, partidas.length);
  return {
    partidas: partidas.length,
    escenas,
    escenasDistintas,
    palabras,
    enObjetivo: dentro / total,
    derrota: partidas.filter((p) => p.desenlace.kind === 'defeat').length / total,
    muerte: partidas.filter((p) => p.desenlace.kind === 'death').length / total,
    colgadas: partidas.filter((p) => p.desenlace.kind === 'colgada').length,
    sinSalida: partidas.filter((p) => p.desenlace.kind === 'sin_salida').length,
    heridasMedia: partidas.reduce((s, p) => s + p.heridas, 0) / total,
    tasaFallo: tiradas === 0 ? 0 : fallos / tiradas,
    tasaFalloCruda: tiradas === 0 ? 0 : fallosCrudos / tiradas,
    tiradasMedia: tiradas / total,
    finales,
    nivelFinalMedio: carrerasDe.length === 0 ? 0 : carrerasDe.reduce((s, c) => s + c.nivelFinal, 0) / carrerasDe.length,
    xpFinalMedia: carrerasDe.length === 0 ? 0 : carrerasDe.reduce((s, c) => s + c.xpFinal, 0) / carrerasDe.length,
  };
}

/**
 * Junta todas las carreras en el informe. Puro: no mira el reloj ni el disco, así que dos corridas
 * con la misma semilla producen exactamente el mismo agregado y el `sim-report.md` se puede
 * comparar entre commits con un diff.
 */
export function agregar(campaign: Campaign, carreras: readonly ResultadoCarrera[]): Agregado {
  const partidas = carreras.flatMap((c) => c.partidas);

  const escenasVistas = new Set<string>();
  const opcionesVistas = new Set<string>();
  const flagsVistos = new Set<string>();
  const hitosVistos = new Set<string>();
  const finales: Record<string, number> = {};
  const finalesPorClase: Record<string, Record<string, number>> = {};
  const finalesPorPartida: Record<number, Record<string, number>> = {};

  for (const p of partidas) {
    for (const s of p.escenas) escenasVistas.add(s);
    for (const o of p.opciones) opcionesVistas.add(o);
    for (const f of p.flags) flagsVistos.add(f);
    for (const h of p.hitos) hitosVistos.add(h);
    const id = esFinal(p);
    if (id === null) continue;
    cuenta(finales, id);
    const porClase = (finalesPorClase[p.clase] ??= {});
    cuenta(porClase, id);
    const porPartida = (finalesPorPartida[p.partida] ??= {});
    cuenta(porPartida, id);
  }

  const idsEscenas = Object.keys(campaign.scenes);
  const sinMemoria = alcanzablesSinMemoria(campaign);
  const nuncaVisitadas = idsEscenas.filter((id) => !escenasVistas.has(id));

  const opciones = todasLasOpciones(campaign);
  const opcionesMemoria = opcionesDeMemoria(campaign);
  const nuncaElegidas = opciones.filter((o) => !opcionesVistas.has(o));

  const combinaciones = new Map<string, { c: Combinacion; partidas: ResultadoPartida[]; carreras: ResultadoCarrera[] }>();
  for (const carrera of carreras) {
    const k = clave(carrera);
    const entrada = combinaciones.get(k) ?? { c: carrera, partidas: [], carreras: [] };
    entrada.partidas.push(...carrera.partidas);
    entrada.carreras.push(carrera);
    combinaciones.set(k, entrada);
  }
  const filas: FilaCombinacion[] = [...combinaciones.values()].map((e) => ({
    clase: e.c.clase,
    nivel: e.c.nivel,
    politica: e.c.politica,
    ...fila(e.partidas, e.carreras),
  }));

  const nivel1Codiciosa = partidas.filter((p) => p.nivel === 1 && p.politica === 'codiciosa');
  const muertes = nivel1Codiciosa.filter((p) => p.desenlace.kind === 'death').length;
  const finalesFaltantesPorClase = CLASES.map((clase) => ({
    clase,
    faltan: Object.keys(campaign.endings).filter((id) => (finalesPorClase[clase]?.[id] ?? 0) === 0),
  })).filter((f) => f.faltan.length > 0);
  const escenasInalcanzables = nuncaVisitadas.filter((id) => sinMemoria.has(id));
  const tasaMuerte = nivel1Codiciosa.length === 0 ? 0 : muertes / nivel1Codiciosa.length;

  const aserciones: Aserciones = {
    escenasInalcanzables,
    muerteNivel1Codiciosa: tasaMuerte,
    partidasNivel1Codiciosa: nivel1Codiciosa.length,
    finalesFaltantesPorClase,
    ok: escenasInalcanzables.length === 0 && tasaMuerte < TOPE_MUERTE_CODICIOSA && finalesFaltantesPorClase.length === 0,
  };

  const base: Omit<Agregado, 'avisos'> = {
    carreras: carreras.length,
    partidas: partidas.length,
    escenasTotales: idsEscenas.length,
    escenasVisitadas: escenasVistas.size,
    escenasNuncaVisitadas: nuncaVisitadas,
    escenasNuncaVisitadasSinMemoria: escenasInalcanzables,
    opcionesTotales: opciones.length,
    opcionesElegidas: opcionesVistas.size,
    opcionesNuncaElegidas: nuncaElegidas,
    opcionesNuncaElegidasSinMemoria: nuncaElegidas.filter((o) => !opcionesMemoria.has(o)),
    finales,
    finalesPorClase,
    finalesPorPartida,
    filas,
    global: fila(partidas, carreras),
    flagsNuncaEncendidos: Object.keys(campaign.flags).filter((f) => !flagsVistos.has(f)),
    hitosNuncaAlcanzados: Object.keys(campaign.milestones).filter((m) => !hitosVistos.has(m)),
    finalesNuncaAlcanzados: Object.keys(campaign.endings).filter((e) => (finales[e] ?? 0) === 0),
    nivelFinal: resumir(carreras.map((c) => c.nivelFinal)),
    xpFinal: resumir(carreras.map((c) => c.xpFinal)),
    partidasConLogRecortado: partidas.filter((p) => p.logRecortado).length,
    escenasQueCuelgan: contarEscenas(partidas, 'colgada'),
    escenasSinSalida: contarEscenas(partidas, 'sin_salida'),
    aserciones,
  };
  return { ...base, avisos: calcularAvisos(campaign, base) };
}
