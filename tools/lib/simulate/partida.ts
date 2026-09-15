import { ATTRS, CLASSES, LIMITS, type Attr, type ClassId, type SkillId } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import { fortuneMax, type PremioDeNivel } from '@/engine/progression';
import { hash32, mulberry32 } from '@/engine/rng';
import * as engine from '@/engine/resolve';
import type { Character, GameState, LogEntry, PendingRoll, Run, SeenMap, WorldState } from '@/engine/types';
import { habilidadesPermitidas, personajeDeCarrera } from './personajes';
import { candidatas, elegirOpcion, esFallo, peorDadoConservado } from './politicas';
import type { Combinacion, ConfigSim, DesenlaceSim, ResultadoCarrera, ResultadoPartida } from './types';

/** Heridas a partir de las cuales el Clérigo reza (Malherido: la próxima escena mortal lo mata). */
const HERIDAS_PARA_PLEGARIA = 2;

function contarPalabras(texto: string): number {
  return texto.split(/\s+/).filter((p) => p.length > 0).length;
}

/**
 * Partida nueva, igual que `newRun` del store salvo la semilla, que acá es determinista:
 * hash32 de la combinación entera. Dos corridas con la misma `--seed` tiran los mismos dados.
 */
function partidaNueva(campaign: Campaign, character: Character, semilla: number, etiqueta: string): Run {
  return {
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    sceneId: campaign.start,
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: fortuneMax(character.level),
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: hash32(semilla, etiqueta),
  };
}

/**
 * Política fija de Fortuna y Poder (spec §10, "políticas fijas"):
 * 1. Poder primero, la PRIMERA vez que un Fallo se puede convertir: es gratis y es de un uso por
 *    partida, así que gastarlo antes que la Fortuna nunca es peor.
 * 2. Fortuna después: mientras el resultado siga siendo Fallo y quede Fortuna, se repite el dado
 *    conservado más bajo. El bucle termina porque `canReroll` baja con cada repetición.
 */
function resolverTirada(
  campaign: Campaign,
  state: GameState,
  choiceId: string,
): { pending: PendingRoll; falloCrudo: boolean } {
  let pending = engine.beginRoll(campaign, state, choiceId);
  const falloCrudo = esFallo(pending.band);
  if (esFallo(pending.band) && pending.canUsePower) {
    pending = engine.usePower(campaign, state, pending);
  }
  while (esFallo(pending.band) && pending.canReroll) {
    pending = engine.rerollDie(campaign, state, pending, peorDadoConservado(pending));
  }
  return { pending, falloCrudo };
}

/** Métricas que se leen del log del motor: es el registro exacto de lo que el jugador vio e hizo. */
function leerLog(log: readonly LogEntry[]): {
  escenas: string[];
  opciones: string[];
  palabras: number;
  tiradas: number;
  fallos: number;
  fortunaGastada: number;
  poderUsado: boolean;
} {
  const escenas: string[] = [];
  const opciones: string[] = [];
  let palabras = 0;
  let tiradas = 0;
  let fallos = 0;
  let fortunaGastada = 0;
  let poderUsado = false;
  for (const entrada of log) {
    if (entrada.kind === 'scene') {
      escenas.push(entrada.sceneId);
      for (const p of entrada.paragraphs) palabras += contarPalabras(p.text);
    } else if (entrada.kind === 'outcome') {
      for (const p of entrada.paragraphs) palabras += contarPalabras(p.text);
    } else if (entrada.kind === 'choice') {
      opciones.push(`${entrada.sceneId}#${entrada.choiceId}`);
    } else {
      tiradas += 1;
      if (esFallo(entrada.band)) fallos += 1;
      fortunaGastada += entrada.fortuneSpent;
      if (entrada.powerUsed) poderUsado = true;
    }
  }
  return { escenas, opciones, palabras, tiradas, fallos, fortunaGastada, poderUsado };
}

/**
 * Gasta los premios de nivel que `endRun` deja pendientes, igual que haría el jugador en la
 * pantalla de fin (`aplicarPremioDeNivel` del store): atributo al de la clase mientras no toque el
 * techo, y habilidad la primera permitida que no tenga. Sin esto una carrera no se haría más fuerte
 * y la tasa de Fallo por partida —lo que detecta la trivialización— no diría nada.
 */
export function gastarPremios(character: Character, premios: readonly PremioDeNivel[]): Character {
  let attrs: Record<Attr, number> = { ...character.attrs };
  const skills: SkillId[] = [...character.skills];
  const permitidas = habilidadesPermitidas(character.classId);
  for (const premio of premios) {
    if (premio.kind === 'atributo') {
      const principal = CLASSES[character.classId].attr;
      const destino =
        attrs[principal] < LIMITS.maxAttr ? principal : ATTRS.find((a) => attrs[a] < LIMITS.maxAttr);
      if (destino !== undefined) attrs = { ...attrs, [destino]: attrs[destino] + 1 };
    } else if (premio.kind === 'habilidad') {
      const elegida = permitidas.find((s) => !skills.includes(s));
      if (elegida !== undefined) skills.push(elegida);
    }
  }
  return { ...character, attrs, skills };
}

export interface EstadoCarrera {
  world: WorldState;
  character: Character;
  seen: SeenMap;
}

/**
 * Juega UNA partida completa con el motor real y devuelve el estado que persiste más las métricas.
 * El bucle es el mismo que el del store: render → elegir → (choose | beginRoll+commitRoll) → repetir.
 */
export function simularPartida(
  campaign: Campaign,
  entrada: EstadoCarrera,
  combinacion: Combinacion,
  carrera: number,
  partida: number,
  config: ConfigSim,
): { estado: EstadoCarrera; resultado: ResultadoPartida } {
  const { clase, nivel, politica } = combinacion;
  const etiqueta = `${clase}|${nivel}|${politica}|${carrera}|${partida}`;
  const azar = mulberry32(hash32(config.semilla, 'politica', etiqueta));
  const run = partidaNueva(campaign, entrada.character, config.semilla, etiqueta);

  let state: GameState = { world: entrada.world, character: entrada.character, run, seen: entrada.seen };
  state = engine.enter(campaign, state, campaign.start);

  const elegidasPorEscena = new Set<string>();
  let desbordada = false;
  let sinSalida: string | undefined;
  let pasos = 0;
  let fallosCrudos = 0;

  while (state.run.outcome === undefined) {
    if (pasos >= config.maxPasos) {
      desbordada = true;
      break;
    }
    pasos += 1;

    // Plegaria: el Clérigo reza desde la ficha cuando queda Malherido, no en una tirada.
    if (state.character.classId === 'clerigo' && !state.run.powerUsed && state.run.wounds >= HERIDAS_PARA_PLEGARIA) {
      state = engine.usePlegaria(campaign, state);
    }

    const escena = engine.render(campaign, state);
    const habilitadas = escena.choices.filter((o) => o.enabled);
    if (habilitadas.length === 0) {
      sinSalida = escena.sceneId;
      break;
    }
    const opcion = elegirOpcion(politica, candidatas(politica, escena.sceneId, habilitadas, elegidasPorEscena), azar);
    elegidasPorEscena.add(`${escena.sceneId}#${opcion.id}`);

    if (opcion.preview === undefined) {
      state = engine.choose(campaign, state, opcion.id);
    } else {
      const tirada = resolverTirada(campaign, state, opcion.id);
      if (tirada.falloCrudo) fallosCrudos += 1;
      state = engine.commitRoll(campaign, state, tirada.pending);
    }
  }

  const metricas = leerLog(state.run.log);
  const heridas = state.run.wounds;
  const hitos = [...state.run.milestones];
  const flags = [...state.run.flags, ...state.run.stagedFlags];
  const nivelAntes = state.character.level;
  const logRecortado = state.run.log.length >= LIMITS.maxLog;

  let desenlace: DesenlaceSim;
  let salida: EstadoCarrera;
  let nivelDespues = nivelAntes;
  let xpDespues = state.character.xp;

  if (state.run.outcome === undefined) {
    // La partida no llegó a un desenlace: se cierra como derrota para no dejar el personaje colgado.
    desenlace = desbordada
      ? { kind: 'colgada', sceneId: state.run.sceneId }
      : { kind: 'sin_salida', sceneId: sinSalida ?? state.run.sceneId };
    const cerrada: GameState = { ...state, run: { ...state.run, outcome: { kind: 'defeat' } } };
    const fin = engine.endRun(campaign, cerrada);
    nivelDespues = fin.summary.xp.nivelDespues;
    xpDespues = fin.character.xp;
    salida = { world: fin.world, character: gastarPremios(fin.character, fin.summary.xp.premios), seen: cerrada.seen };
  } else {
    const outcome = state.run.outcome;
    desenlace = outcome.kind === 'ending' ? { kind: 'ending', endingId: outcome.endingId } : { kind: outcome.kind };
    const fin = engine.endRun(campaign, state);
    nivelDespues = fin.summary.xp.nivelDespues;
    xpDespues = fin.character.xp;
    salida = { world: fin.world, character: gastarPremios(fin.character, fin.summary.xp.premios), seen: state.seen };
  }

  const resultado: ResultadoPartida = {
    clase,
    nivel,
    politica,
    carrera,
    partida,
    desenlace,
    escenas: metricas.escenas,
    opciones: metricas.opciones,
    palabras: metricas.palabras,
    heridas,
    tiradas: metricas.tiradas,
    fallos: metricas.fallos,
    fallosCrudos,
    fortunaGastada: metricas.fortunaGastada,
    poderUsado: metricas.poderUsado,
    hitos,
    flags,
    nivelAntes,
    nivelDespues,
    xpDespues,
    logRecortado,
  };
  return { estado: salida, resultado };
}

/**
 * Una CARRERA: el mismo personaje juega K partidas seguidas conservando lo que persiste
 * (flags `char:` y `world:`, el registro de campaña, `seen`, la XP y el nivel). Es la unidad de
 * la spec §10: es lo único que muestra si rejugar se trivializa.
 *
 * Un personaje muerto no vuelve a jugar: la carrera se corta ahí, con menos partidas.
 */
export function simularCarrera(
  campaign: Campaign,
  combinacion: Combinacion,
  carrera: number,
  config: ConfigSim,
): ResultadoCarrera {
  let estado: EstadoCarrera = {
    world: { flags: [], fallen: [] },
    character: personajeDeCarrera(combinacion.clase, combinacion.nivel, carrera),
    seen: {},
  };
  const partidas: ResultadoPartida[] = [];
  for (let i = 1; i <= config.k; i += 1) {
    const paso = simularPartida(campaign, estado, combinacion, carrera, i, config);
    partidas.push(paso.resultado);
    estado = paso.estado;
    if (estado.character.dead !== undefined) break;
  }
  return {
    ...combinacion,
    carrera,
    partidas,
    xpFinal: estado.character.xp,
    nivelFinal: estado.character.level,
    flagsPersonaje: [...estado.character.flags],
    flagsMundo: [...estado.world.flags],
  };
}

/** Todas las combinaciones de clase × nivel × política, en orden fijo. */
export function combinaciones(
  clases: readonly ClassId[],
  niveles: readonly number[],
  politicas: readonly Combinacion['politica'][],
): Combinacion[] {
  const lista: Combinacion[] = [];
  for (const clase of clases) {
    for (const nivel of niveles) {
      for (const politica of politicas) lista.push({ clase, nivel, politica });
    }
  }
  return lista;
}
