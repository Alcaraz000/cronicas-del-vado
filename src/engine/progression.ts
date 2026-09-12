import { LIMITS } from '@/content/catalog';

/**
 * Etiqueta de dificultad relativa de una campaña para un personaje.
 * Se calcula contra el nivel del personaje; los umbrales de las escenas nunca escalan.
 */
export type CampaignLabel = 'mortal' | 'exigente' | 'pareja' | 'tranquila' | 'paseo';

/**
 * level ≤ min-2 → mortal; level === min-1 → exigente; min ≤ level ≤ max → pareja;
 * level ≤ max+2 → tranquila; más → paseo.
 */
export function campaignLabel(levelRange: [number, number], level: number): CampaignLabel {
  const [min, max] = levelRange;
  if (level <= min - 2) return 'mortal';
  if (level < min) return 'exigente';
  if (level <= max) return 'pareja';
  if (level <= max + 2) return 'tranquila';
  return 'paseo';
}

/** Modificador Veterano: -1 en tranquila, -2 en paseo, 0 en el resto. */
export function veteranModifier(label: CampaignLabel): number {
  switch (label) {
    case 'tranquila':
      return -1;
    case 'paseo':
      return -2;
    case 'mortal':
    case 'exigente':
    case 'pareja':
      return 0;
  }
}

/** Fortuna máxima por partida: 3 puntos, 4 desde el nivel 5. */
export function fortuneMax(level: number): number {
  return level >= 5 ? LIMITS.fortuneFromLevel5 : LIMITS.fortuneBase;
}

// ---------------------------------------------------------------------------
// Progresión por descubrimiento (spec §4)
// ---------------------------------------------------------------------------

/** XP por hito registrado por primera vez con este personaje. */
export const XP_POR_HITO = 10;

/** XP por un final que este personaje no había visto en esta campaña. */
export const XP_POR_FINAL_NUEVO = 30;

/** Bono de campaña, solo en la PRIMERA victoria, según la dificultad relativa que se enfrentó. */
export const XP_BONO_POR_ETIQUETA: Record<CampaignLabel, number> = {
  mortal: 80,
  exigente: 60,
  pareja: 40,
  tranquila: 20,
  paseo: 0,
};

/**
 * Nombre de la etiqueta para el desglose de `GananciaXp.detalle`. Vive acá y no en
 * `ui/strings.es.ts` porque el contrato pide que el motor arme ese desglose: la pantalla
 * de fin lo muestra tal cual, sin volver a evaluar la regla. Es la única prosa del motor.
 */
const NOMBRE_ETIQUETA: Record<CampaignLabel, string> = {
  mortal: 'Mortal',
  exigente: 'Exigente',
  pareja: 'Pareja',
  tranquila: 'Tranquila',
  paseo: 'Paseo',
};

/** Entero sano dentro de [min, max]; un valor roto cae en `min`. */
function enteroEn(valor: number, min: number, max: number): number {
  if (!Number.isFinite(valor)) return min;
  return Math.min(max, Math.max(min, Math.floor(valor)));
}

/** Nivel que corresponde a una XP acumulada: nivel N pide 60 × (N − 1). Tope: LIMITS.maxLevel. */
export function nivelPorXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  return Math.min(LIMITS.maxLevel, Math.floor(xp / LIMITS.xpPerLevel) + 1);
}

/** XP acumulada que pide un nivel. Los niveles fuera de 1..maxLevel se recortan al borde. */
export function xpDelNivel(nivel: number): number {
  return LIMITS.xpPerLevel * (enteroEn(nivel, 1, LIMITS.maxLevel) - 1);
}

/**
 * Nivel hasta el que una campaña puede llevar a un personaje: el máximo de su rango más uno
 * (Aldamar, rango [1, 3] → 4). Se recorta a LIMITS.maxLevel para no prometer un nivel inexistente.
 */
export function topeDeNivel(levelRange: readonly [number, number]): number {
  return Math.min(LIMITS.maxLevel, levelRange[1] + 1);
}

/** Desglose de la XP ganada en una partida, antes del tope por campaña. */
export interface GananciaXp {
  hitos: number;
  finales: number;
  bono: number;
  total: number;
  /** Una línea por fuente, ya en prosa, para la pantalla de fin. */
  detalle: string[];
}

/**
 * XP por descubrimiento: todo se cobra "la primera vez con este personaje".
 * Quien llama decide qué es nuevo comparando contra `campaignLog` ANTES de actualizarlo.
 */
export function calcularXp(args: {
  hitosNuevos: number;
  finalNuevo: boolean;
  primeraVictoria: boolean;
  etiqueta: CampaignLabel;
}): GananciaXp {
  const cuenta = Math.max(0, Number.isFinite(args.hitosNuevos) ? Math.floor(args.hitosNuevos) : 0);
  const hitos = cuenta * XP_POR_HITO;
  const finales = args.finalNuevo ? XP_POR_FINAL_NUEVO : 0;
  const bono = args.primeraVictoria ? XP_BONO_POR_ETIQUETA[args.etiqueta] : 0;

  const detalle: string[] = [];
  if (cuenta > 0) detalle.push(`${cuenta} ${cuenta === 1 ? 'hito nuevo' : 'hitos nuevos'}: +${hitos}`);
  if (finales > 0) detalle.push(`Final nuevo: +${finales}`);
  // El bono se explica aunque sea 0: en Paseo el jugador tiene que ver POR QUÉ no cobró nada.
  if (args.primeraVictoria) detalle.push(`Primera victoria (${NOMBRE_ETIQUETA[args.etiqueta]}): +${bono}`);

  return { hitos, finales, bono, total: hitos + finales + bono, detalle };
}

/**
 * Lo que da subir un nivel. `atributo` y `habilidad` los ELIGE el jugador (el motor solo dice
 * cuáles corresponden); `fortuna` y `leyenda` son automáticos y solo se informan.
 */
export type PremioDeNivel = { kind: 'atributo' } | { kind: 'habilidad' } | { kind: 'fortuna' } | { kind: 'leyenda' };

/**
 * Premios de cada nivel ganado entre `desde` (excluido) y `hasta` (incluido), en orden:
 * pares +1 atributo, impares una habilidad, el 5 además sube la Fortuna y el último marca leyenda.
 */
export function premiosPorSubir(desde: number, hasta: number): PremioDeNivel[] {
  const primero = enteroEn(desde, 1, LIMITS.maxLevel) + 1;
  const ultimo = enteroEn(hasta, 1, LIMITS.maxLevel);
  const premios: PremioDeNivel[] = [];
  for (let nivel = primero; nivel <= ultimo; nivel += 1) {
    premios.push(nivel % 2 === 0 ? { kind: 'atributo' } : { kind: 'habilidad' });
    if (nivel === 5) premios.push({ kind: 'fortuna' });
    if (nivel === LIMITS.maxLevel) premios.push({ kind: 'leyenda' });
  }
  return premios;
}

/** Qué le pasó a la XP del personaje al cerrar una partida. Viaja en el resumen de fin. */
export interface ResumenXp {
  ganancia: GananciaXp;
  /** Lo que entró de verdad: `ganancia.total` recortado por el tope de la campaña. */
  otorgada: number;
  /** Lo que el tope de la campaña se comió. */
  descartada: number;
  xpAntes: number;
  xpDespues: number;
  nivelAntes: number;
  nivelDespues: number;
  /** Premios de los niveles ganados; los de elección quedan pendientes para el jugador. */
  premios: PremioDeNivel[];
  topeNivel: number;
  topeXp: number;
  /** El personaje ya no puede ganar más XP en esta campaña. */
  topeAlcanzado: boolean;
}

/**
 * Aplica la ganancia respetando el tope por campaña: una campaña no lleva a un personaje más allá
 * de `topeNivel`, y lo que sobra se descarta (es lo que evita que rejugar trivialice el juego).
 * Nunca baja la XP ni el nivel de quien ya está por encima del tope: ahí simplemente no gana nada.
 */
export function otorgarXp(args: {
  xp: number;
  nivel: number;
  ganancia: GananciaXp;
  topeNivel: number;
}): ResumenXp {
  const xpAntes = Math.max(0, Number.isFinite(args.xp) ? args.xp : 0);
  const nivelAntes = enteroEn(args.nivel, 1, LIMITS.maxLevel);
  const topeNivel = enteroEn(args.topeNivel, 1, LIMITS.maxLevel);
  const topeXp = xpDelNivel(topeNivel);
  const total = Math.max(0, args.ganancia.total);
  const otorgada = Math.min(total, Math.max(0, topeXp - xpAntes));
  const xpDespues = xpAntes + otorgada;
  const nivelDespues = Math.max(nivelAntes, nivelPorXp(xpDespues));
  return {
    ganancia: args.ganancia,
    otorgada,
    descartada: total - otorgada,
    xpAntes,
    xpDespues,
    nivelAntes,
    nivelDespues,
    premios: premiosPorSubir(nivelAntes, nivelDespues),
    topeNivel,
    topeXp,
    topeAlcanzado: xpDespues >= topeXp,
  };
}
