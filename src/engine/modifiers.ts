import { CLASSES, SKILLS, TRAITS, type Tag } from '@/content/catalog';
import type { Roll } from '@/content/schema';
import type { EvalContext, RollMode, RollSource } from '@/engine/types';

function fuente(kind: RollSource['kind'], label: string, origin: RollSource['origin']): RollSource {
  return { kind, label, origin, cancelled: false };
}

/**
 * Lista todas las fuentes de ventaja y desventaja que aplican a una tirada.
 * Primero las ventajas (rasgos, habilidades), después las desventajas (Debilidad de clase).
 * Si hay al menos una de cada tipo, todas quedan con cancelled = true: no se acumulan, se anulan.
 */
export function rollSources(roll: Roll, ctx: EvalContext): RollSource[] {
  const { character } = ctx.state;
  const tags: readonly Tag[] = roll.tags;
  const ventajas: RollSource[] = [];
  const desventajas: RollSource[] = [];

  for (const traitId of character.traits) {
    const rasgo = TRAITS[traitId];
    if (tags.includes(rasgo.tag)) ventajas.push(fuente('advantage', rasgo.name, 'trait'));
  }
  for (const skillId of character.skills) {
    const habilidad = SKILLS[skillId];
    if (tags.includes(habilidad.tag)) ventajas.push(fuente('advantage', habilidad.name, 'skill'));
  }

  const clase = CLASSES[character.classId];
  if (tags.includes(clase.weakness)) {
    desventajas.push(fuente('disadvantage', `Debilidad: ${clase.name}`, 'class'));
  }

  const cancelled = ventajas.length > 0 && desventajas.length > 0;
  return [...ventajas, ...desventajas].map((s) => ({ ...s, cancelled }));
}

/** sin fuentes → normal; solo ventaja → advantage; solo desventaja → disadvantage; ambas → cancelled. */
export function rollMode(sources: RollSource[]): RollMode {
  const hayVentaja = sources.some((s) => s.kind === 'advantage');
  const hayDesventaja = sources.some((s) => s.kind === 'disadvantage');
  if (hayVentaja && hayDesventaja) return 'cancelled';
  if (hayVentaja) return 'advantage';
  if (hayDesventaja) return 'disadvantage';
  return 'normal';
}
