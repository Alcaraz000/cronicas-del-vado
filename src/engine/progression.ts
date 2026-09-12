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
