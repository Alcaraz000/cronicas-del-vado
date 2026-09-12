import { CLASSES, type ClassId } from '@/content/catalog';
import { reachableScenes } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r02_reach';

export const r02_reach: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const desdeStart = reachableScenes(campaign, null);
  const inalcanzables = new Set<string>();
  for (const id of Object.keys(campaign.scenes)) {
    if (!desdeStart.has(id)) {
      inalcanzables.add(id);
      issues.push(error(RULE, `La escena ${id} no es alcanzable desde start (${campaign.start})`, id));
    }
  }
  const finales = Object.values(campaign.scenes).filter((s) => s.kind === 'ending' && !inalcanzables.has(s.id));
  for (const classId of Object.keys(CLASSES) as ClassId[]) {
    const alcance = reachableScenes(campaign, classId);
    for (const scene of finales) {
      if (!alcance.has(scene.id)) {
        issues.push(error(RULE, `El final ${scene.ending?.id ?? scene.id} (escena ${scene.id}) no es alcanzable para la clase ${CLASSES[classId].name}`, scene.id));
      }
    }
  }
  return issues;
};
