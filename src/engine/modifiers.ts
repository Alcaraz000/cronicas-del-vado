import { CLASSES, CONDITIONS, SKILLS, TRAITS, WOUND_LABELS, type Tag } from '@/content/catalog';
import type { Item, Roll } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import type { EvalContext, RollMode, RollSource } from '@/engine/types';

const ETIQUETA_SITUACION = 'Situación';

function fuente(kind: RollSource['kind'], label: string, origin: RollSource['origin']): RollSource {
  return { kind, label, origin, cancelled: false };
}

/** true si el tag de una condición aplica a la tirada: 'all' aplica siempre. */
function tagAplica(tag: Tag | 'all', tags: readonly Tag[]): boolean {
  return tag === 'all' || tags.includes(tag);
}

/**
 * Lista todas las fuentes de ventaja y desventaja que aplican a una tirada.
 * Orden: ventajas (rasgos, habilidades, objetos, advantageIf) y después desventajas
 * (Debilidad de clase, condiciones, heridas, disadvantageIf).
 * Si hay al menos una de cada tipo, todas quedan con cancelled = true: no se acumulan, se anulan.
 */
export function rollSources(roll: Roll, ctx: EvalContext): RollSource[] {
  const { character, run } = ctx.state;
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
  for (const itemId of run.items) {
    const objeto: Item | undefined = ctx.campaign.items[itemId];
    if (objeto === undefined || objeto.advantageTags === undefined) continue;
    if (objeto.advantageTags.some((t) => tags.includes(t))) {
      ventajas.push(fuente('advantage', objeto.name, 'item'));
    }
  }
  if (roll.advantageIf !== undefined && evaluate(roll.advantageIf, ctx)) {
    ventajas.push(fuente('advantage', ETIQUETA_SITUACION, 'scene'));
  }

  const clase = CLASSES[character.classId];
  if (tags.includes(clase.weakness)) {
    desventajas.push(fuente('disadvantage', `Debilidad: ${clase.name}`, 'class'));
  }
  for (const conditionId of run.conditions) {
    const condicion = CONDITIONS[conditionId];
    if (tagAplica(condicion.tag, tags)) desventajas.push(fuente('disadvantage', condicion.name, 'condition'));
  }
  if (run.wounds === 1 && tags.includes('fisico')) {
    desventajas.push(fuente('disadvantage', WOUND_LABELS[1], 'wound'));
  }
  if (run.wounds === 2) {
    desventajas.push(fuente('disadvantage', WOUND_LABELS[2], 'wound'));
  }
  if (roll.disadvantageIf !== undefined && evaluate(roll.disadvantageIf, ctx)) {
    desventajas.push(fuente('disadvantage', ETIQUETA_SITUACION, 'scene'));
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
