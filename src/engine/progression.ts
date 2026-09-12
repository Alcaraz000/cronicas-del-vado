import { LIMITS } from '@/content/catalog';

export function fortuneMax(level: number): number {
  return level >= 5 ? LIMITS.fortuneFromLevel5 : LIMITS.fortuneBase;
}
