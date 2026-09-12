import { sceneEdges } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';
import { choiceOutcomes, has, outcomeHasLethal, rollOutcomes } from '../walk';

const RULE = 'r05_lethal';

export const r05_lethal: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const escenas = Object.values(campaign.scenes);
  const mortales = new Set(escenas.filter((s) => s.lethal === true).map((s) => s.id));

  for (const scene of escenas) {
    if ((scene.onEnter ?? []).some((e) => 'lethal' in e)) {
      issues.push(error(RULE, `onEnter de ${scene.id} usa { lethal: true }; solo va en outcomes de tirada de escenas lethal`, scene.id));
    }
    for (const choice of scene.choices) {
      if (choice.outcome && outcomeHasLethal(choice.outcome)) {
        issues.push(error(RULE, `La opción ${choice.id} sin tirada usa { lethal: true }; solo va en outcomes de tirada de escenas lethal`, scene.id));
      }
      if (!scene.lethal && rollOutcomes(choice).some(outcomeHasLethal)) {
        issues.push(error(RULE, `La opción ${choice.id} usa { lethal: true } pero la escena ${scene.id} no es lethal`, scene.id));
      }
    }
    for (const e of sceneEdges(scene)) {
      if (mortales.has(e.to) && e.via !== 'outcome') {
        const via = e.via === 'redirect' ? 'un redirect' : `un outcome de tirada (opción ${e.choiceId ?? '?'})`;
        issues.push(error(RULE, `A la escena mortal ${e.to} se entra por ${via}; solo se entra por outcome.next de una opción sin tirada`, scene.id));
      }
    }
  }

  for (const id of mortales) {
    if (!has(campaign.scenes, id)) continue;
    const scene = campaign.scenes[id];
    if (!scene) continue;
    const sinLethal = scene.choices.some((c) => !choiceOutcomes(c).some(outcomeHasLethal));
    if (!sinLethal) issues.push(error(RULE, `La escena mortal ${id} no tiene ninguna opción sin { lethal: true } en sus outcomes`, id));
    const noFisico = scene.choices.some((c) => c.roll !== undefined && !c.roll.tags.includes('fisico'));
    if (!noFisico) issues.push(error(RULE, `La escena mortal ${id} no tiene ninguna opción con tirada cuyos tags no incluyan fisico`, id));
  }

  if (campaign.lethalScenes !== mortales.size) {
    issues.push(error(RULE, `meta.lethalScenes es ${campaign.lethalScenes} pero hay ${mortales.size} escenas lethal`));
  }

  // { lethal: true } dentro de endings[*].reward lo rechaza r11_reward, que es la regla que decide
  // qué efectos tienen semántica ahí. r05 se ocupa de lethal dentro de las escenas.
  return issues;
};
