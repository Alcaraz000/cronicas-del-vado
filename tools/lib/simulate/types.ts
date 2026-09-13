import type { ClassId } from '@/content/catalog';

/**
 * Cómo elige el simulador entre las opciones habilitadas de una escena.
 * - `aleatoria`: al azar uniforme (es la que da cobertura).
 * - `codiciosa`: la de mayor puntaje —la probabilidad real, salvo ceder, que vale PROB_LIBRE—;
 *   ante empate, la primera.
 * - `temeraria`: la de mayor probabilidad de fallo; ante empate, la primera.
 * - `prudente`: cede siempre que haya una opción sin tirada. Es el jugador que no quiere
 *   arriesgar, y el instrumento con el que se mide si ceder cuesta algo.
 *
 * Una opción SIN tirada no puede fallar: vale éxito 1 y fallo 0 para `probExito`/`probFallo`, que
 * es lo que usan el informe, la temeraria y la prudente. La codiciosa puntúa distinto (ver
 * `puntajeCodicioso` en politicas.ts) para no confundir "no puede fallar" con "conviene".
 */
export type PoliticaId = 'aleatoria' | 'codiciosa' | 'temeraria' | 'prudente';

export const POLITICAS: readonly PoliticaId[] = ['aleatoria', 'codiciosa', 'temeraria', 'prudente'];

/** Niveles de partida que se simulan (spec §10). */
export const NIVELES: readonly number[] = [1, 3];

export const CLASES: readonly ClassId[] = ['guerrero', 'explorador', 'mago', 'clerigo'];

/** Cómo terminó una partida simulada. Las dos últimas son fallas del simulador, no del juego. */
export type DesenlaceSim =
  | { kind: 'ending'; endingId: string }
  | { kind: 'defeat' }
  | { kind: 'death' }
  /** Se pasó el tope de pasos: hay un ciclo del que la política no sale. `sceneId` es dónde quedó. */
  | { kind: 'colgada'; sceneId: string }
  /** Escena sin ninguna opción habilitada para este personaje. */
  | { kind: 'sin_salida'; sceneId: string };

export interface Combinacion {
  clase: ClassId;
  nivel: number;
  politica: PoliticaId;
}

/** Todo lo que una partida simulada deja para el informe. Se deriva del log del motor. */
export interface ResultadoPartida extends Combinacion {
  /** Índice de la carrera dentro de la combinación. */
  carrera: number;
  /** Número de partida DENTRO de la carrera, empezando en 1. */
  partida: number;
  desenlace: DesenlaceSim;
  /** Escenas mostradas, en orden y con repeticiones (las atravesadas por redirect no cuentan). */
  escenas: string[];
  /** Opciones elegidas, como `escena#opcion`, en orden y con repeticiones. */
  opciones: string[];
  /** Palabras de todo lo que el jugador leyó: texto de escena, de desenlace y epílogos. */
  palabras: number;
  heridas: number;
  tiradas: number;
  /** Tiradas que quedaron en Fallo o Fallo grave DESPUÉS de Fortuna y Poder. */
  fallos: number;
  /**
   * Tiradas que salieron Fallo o Fallo grave EN LOS DADOS, antes de gastar Fortuna o el Poder.
   * Es la dificultad cruda de la campaña; `fallos` es lo que el jugador terminó sufriendo.
   */
  fallosCrudos: number;
  fortunaGastada: number;
  poderUsado: boolean;
  hitos: string[];
  /** Flags encendidos al terminar: los `run:` y los apostados (`char:vado.*`, `world:vado.*`). */
  flags: string[];
  nivelAntes: number;
  nivelDespues: number;
  xpDespues: number;
  /** El log del motor llegó a su tope y las métricas de esta partida están recortadas. */
  logRecortado: boolean;
}

export interface ResultadoCarrera extends Combinacion {
  carrera: number;
  partidas: ResultadoPartida[];
  xpFinal: number;
  nivelFinal: number;
  /** Flags `char:` del personaje al terminar la carrera (canon y espacios compartidos). */
  flagsPersonaje: string[];
  /** Flags `world:` del perfil al terminar la carrera. */
  flagsMundo: string[];
}

export interface ConfigSim {
  campaignId: string;
  /** Carreras por combinación. */
  n: number;
  /** Partidas por carrera. */
  k: number;
  semilla: number;
  /** Tope de transiciones de escena por partida antes de darla por colgada. */
  maxPasos: number;
}
