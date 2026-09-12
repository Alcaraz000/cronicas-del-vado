import { CLASSES, CONDITIONS, SKILLS, TAGS, TRAITS } from '@/content/catalog';
import { error, type Rule, type ValidationIssue } from '../types';
import { endingRewards, has, paragraphsOf, sceneConditions, sceneEffects, sceneTexts, walkCondition } from '../walk';

const RULE = 'r07_ids';

/**
 * Reconocedor de flags de espacios compartidos, derivado de `world.flags` (src/content/world/flags.ts):
 * las claves terminadas en `.*` valen por prefijo (`char:met.*` acepta `char:met.orell`) y el resto
 * son flags exactos (`char:leyenda`). Sale de ahí y no de una copia en esta regla para que agregar
 * un espacio compartido nuevo en el contenido no obligue a tocar el validador.
 */
export function sharedFlagMatcher(worldFlags: Record<string, string>): (flag: string) => boolean {
  const prefijos: string[] = [];
  const exactos: string[] = [];
  for (const clave of Object.keys(worldFlags)) {
    if (clave.endsWith('.*')) prefijos.push(clave.slice(0, -1));
    else exactos.push(clave);
  }
  return (flag) => exactos.includes(flag) || prefijos.some((p) => flag.startsWith(p));
}

export const r07_ids: Rule = (campaign, ctx) => {
  const issues: ValidationIssue[] = [];
  const { world } = ctx;
  const esCompartido = sharedFlagMatcher(world.flags);
  const prefijoCorrecto = (flag: string): boolean => {
    if (flag.startsWith('run:') || esCompartido(flag)) return true;
    if (flag.startsWith('char:')) return flag.startsWith(`char:${campaign.id}.`);
    if (flag.startsWith('world:')) return flag.startsWith(`world:${campaign.id}.`);
    return false;
  };
  const push = (message: string, sceneId?: string): void => { issues.push(error(RULE, message, sceneId)); };
  const existe = (col: 'npcs' | 'places' | 'items', id: string): boolean => has(campaign[col], id) || has(world[col], id);
  const flagOk = (flag: string, sceneId?: string): void => {
    if (!(has(campaign.flags, flag) || has(world.flags, flag) || esCompartido(flag))) {
      push(`El flag ${flag} no está declarado en campaign.flags ni en world.flags`, sceneId);
    } else if (!prefijoCorrecto(flag)) {
      push(`El flag ${flag} debe llevar el prefijo de la campaña (char:${campaign.id}. o world:${campaign.id}.)`, sceneId);
    }
  };

  for (const flag of Object.keys(campaign.flags)) {
    if (!prefijoCorrecto(flag)) push(`El flag declarado ${flag} debe llevar el prefijo de la campaña (char:${campaign.id}. o world:${campaign.id}.)`);
  }
  for (const col of ['npcs', 'places', 'items'] as const) {
    for (const id of Object.keys(campaign[col])) if (has(world[col], id)) push(`El id ${id} de ${col} ya existe en world y la campaña no puede redefinirlo`);
  }
  for (const [id, item] of Object.entries(campaign.items)) {
    if (item.relic) push(`El objeto ${id} es relic; las reliquias solo se declaran en world.items`);
  }

  for (const scene of Object.values(campaign.scenes)) {
    const sid = scene.id;
    if (!existe('places', scene.place)) push(`El lugar ${scene.place} no existe en la campaña ni en world`, sid);
    for (const npc of scene.npcs ?? []) if (!existe('npcs', npc)) push(`El PNJ ${npc} no existe en la campaña ni en world`, sid);
    if (scene.kind === 'ending') {
      if (!scene.ending) push(`La escena final ${sid} no declara ending`, sid);
      else if (!has(campaign.endings, scene.ending.id)) push(`El final ${scene.ending.id} no está en campaign.endings`, sid);
    }
    for (const text of sceneTexts(scene)) {
      for (const p of paragraphsOf(text)) {
        if (p.speaker !== undefined && !(scene.npcs ?? []).includes(p.speaker)) push(`El speaker ${p.speaker} no está en npcs de la escena ${sid}`, sid);
      }
    }
    for (const effect of sceneEffects(scene)) {
      if ('set' in effect) flagOk(effect.set, sid);
      else if ('clear' in effect) flagOk(effect.clear, sid);
      else if ('give' in effect) { if (!existe('items', effect.give)) push(`El objeto ${effect.give} (give) no existe`, sid); }
      else if ('take' in effect) { if (!existe('items', effect.take)) push(`El objeto ${effect.take} (take) no existe`, sid); }
      else if ('addCondition' in effect) { if (!has(CONDITIONS, effect.addCondition)) push(`La condición ${effect.addCondition} no existe en el catálogo`, sid); }
      else if ('removeCondition' in effect) { if (effect.removeCondition !== 'all' && !has(CONDITIONS, effect.removeCondition)) push(`La condición ${effect.removeCondition} no existe en el catálogo`, sid); }
      else if ('clock' in effect) { if (!has(campaign.clocks, effect.clock)) push(`El reloj ${effect.clock} no está declarado en campaign.clocks`, sid); }
      else if ('milestone' in effect) { if (!has(campaign.milestones, effect.milestone)) push(`El hito ${effect.milestone} no está declarado en campaign.milestones`, sid); }
    }
    for (const cond of sceneConditions(scene)) {
      walkCondition(cond, (leaf) => {
        if ('flag' in leaf) flagOk(leaf.flag, sid);
        else if ('item' in leaf) { if (!existe('items', leaf.item)) push(`El objeto ${leaf.item} (condición item) no existe`, sid); }
        else if ('met' in leaf) { if (!existe('npcs', leaf.met)) push(`El PNJ ${leaf.met} (condición met) no existe`, sid); }
        else if ('knows' in leaf) { if (!existe('places', leaf.knows)) push(`El lugar ${leaf.knows} (condición knows) no existe`, sid); }
        else if ('clock' in leaf) { if (!has(campaign.clocks, leaf.clock)) push(`El reloj ${leaf.clock} (condición clock) no está declarado`, sid); }
        else if ('endingSeen' in leaf) { if (!has(campaign.endings, leaf.endingSeen)) push(`El final ${leaf.endingSeen} (condición endingSeen) no existe`, sid); }
        else if ('condition' in leaf) { if (!has(CONDITIONS, leaf.condition)) push(`La condición ${leaf.condition} no existe en el catálogo`, sid); }
        else if ('trait' in leaf) { if (!has(TRAITS, leaf.trait)) push(`El rasgo ${leaf.trait} no existe en el catálogo`, sid); }
        else if ('skill' in leaf) { if (!has(SKILLS, leaf.skill)) push(`La habilidad ${leaf.skill} no existe en el catálogo`, sid); }
        else if ('class' in leaf) { if (!has(CLASSES, leaf.class)) push(`La clase ${leaf.class} no existe en el catálogo`, sid); }
      });
    }
    for (const choice of scene.choices) {
      for (const tag of choice.roll?.tags ?? []) {
        if (!(TAGS as readonly string[]).includes(tag)) push(`El tag ${tag} de la opción ${choice.id} no existe en el catálogo`, sid);
      }
    }
  }

  // El reward de un final no cuelga de ninguna escena; se valida aparte con los mismos chequeos de id.
  for (const { endingId, effects } of endingRewards(campaign)) {
    for (const effect of effects) {
      const contexto = `reward del final ${endingId}`;
      if ('set' in effect) flagOk(effect.set);
      else if ('clear' in effect) flagOk(effect.clear);
      else if ('give' in effect) { if (!existe('items', effect.give)) push(`El objeto ${effect.give} (give) no existe (${contexto})`); }
      else if ('take' in effect) { if (!existe('items', effect.take)) push(`El objeto ${effect.take} (take) no existe (${contexto})`); }
      else if ('addCondition' in effect) { if (!has(CONDITIONS, effect.addCondition)) push(`La condición ${effect.addCondition} no existe en el catálogo (${contexto})`); }
      else if ('removeCondition' in effect) { if (effect.removeCondition !== 'all' && !has(CONDITIONS, effect.removeCondition)) push(`La condición ${effect.removeCondition} no existe en el catálogo (${contexto})`); }
      else if ('clock' in effect) { if (!has(campaign.clocks, effect.clock)) push(`El reloj ${effect.clock} no está declarado en campaign.clocks (${contexto})`); }
      else if ('milestone' in effect) { if (!has(campaign.milestones, effect.milestone)) push(`El hito ${effect.milestone} no está declarado en campaign.milestones (${contexto})`); }
    }
  }
  return issues;
};
