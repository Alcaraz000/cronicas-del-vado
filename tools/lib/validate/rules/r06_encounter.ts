import { sceneEdges } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';
import { walkCondition } from '../walk';

const RULE = 'r06_encounter';

export const r06_encounter: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const encuentros = Object.values(campaign.scenes).filter((s) => s.kind === 'encounter');
  const rondasPosteriores = new Set<string>();
  for (const s of encuentros) for (const e of sceneEdges(s)) if (e.to !== s.id) rondasPosteriores.add(e.to);

  for (const scene of encuentros) {
    const rolls = scene.choices.flatMap((c) => (c.roll ? [c.roll] : []));
    const atributos = new Set(rolls.map((r) => r.attr));
    if (atributos.size < 2) {
      issues.push(error(RULE, `El encuentro ${scene.id} ofrece ${atributos.size} atributo(s) distinto(s) en sus tiradas; necesita al menos 2`, scene.id));
    }
    if (!scene.choices.some((c) => c.roll === undefined)) {
      issues.push(error(RULE, `El encuentro ${scene.id} no tiene ninguna opción sin tirada`, scene.id));
    }
    if (!rolls.some((r) => r.tags.includes('huida'))) {
      issues.push(error(RULE, `El encuentro ${scene.id} no tiene ninguna tirada con tag huida`, scene.id));
    }
    if (rondasPosteriores.has(scene.id)) {
      const usaEstado = scene.choices.some((c) => {
        let ok = false;
        walkCondition(c.requires, (leaf) => {
          if ('clock' in leaf || 'wounds' in leaf || ('flag' in leaf && leaf.flag.startsWith('run:'))) ok = true;
        });
        return ok;
      });
      const tieneRedirect = (scene.redirect ?? []).length > 0;
      if (!usaEstado && !tieneRedirect) {
        issues.push(error(RULE, `La ronda ${scene.id} sigue a otro encuentro y no tiene ni opción con requires sobre reloj, Heridas o flag run: ni redirect`, scene.id));
      }
    }
  }
  return issues;
};
