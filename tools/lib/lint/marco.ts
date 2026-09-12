import type { Condition } from '@/content/schema';
import { error, info, type LintCheck, type LintIssue } from './types';
import { textosDe } from './texto';

const CHECK = 'marco';

function recorrer(cond: Condition | undefined, visitar: (hoja: Condition) => void): void {
  if (cond === undefined) return;
  if ('not' in cond) { recorrer(cond.not, visitar); return; }
  if ('all' in cond) { for (const c of cond.all) recorrer(c, visitar); return; }
  if ('any' in cond) { for (const c of cond.any) recorrer(c, visitar); return; }
  visitar(cond);
}

/**
 * El agujero de `r08_memory_frame`, tapado.
 *
 * r08 calcula "PNJ local" como un `speaker` que está en `campaign.npcs` y **no** en `world.npcs`, así
 * que un párrafo de Orell, Ilse o Halvar con `met`, `knows` o `endingSeen` compila y valida, aunque
 * rompe el marco de ficción igual que cualquier otro: dentro de la misma campaña, cada partida es la
 * misma noche otra vez y ningún PNJ recuerda otra partida (biblia §9.1, spec §5).
 *
 * Lo que sí pueden leer los tres —y por eso no se informa— es un flag `run:`, `visited`, la clase, un
 * rasgo, un objeto, las Heridas o una condición: eso lo ven ahora, no lo recuerdan.
 */
export const chequearMarco: LintCheck = (campaign, ctx) => {
  const issues: LintIssue[] = [];
  const prefijoLocal = `char:${campaign.id}.`;
  const delMundo = Object.keys(ctx.world.npcs).filter((id) => Object.prototype.hasOwnProperty.call(campaign.npcs, id));
  let revisados = 0;
  for (const scene of Object.values(campaign.scenes)) {
    for (const text of textosDe(scene)) {
      for (const p of text) {
        if (typeof p === 'string') continue;
        const speaker = p.speaker;
        if (speaker === undefined || !Object.prototype.hasOwnProperty.call(ctx.world.npcs, speaker)) continue;
        revisados += 1;
        for (const v of p.variants) {
          recorrer(v.when, (hoja) => {
            let memoria: string | null = null;
            if ('met' in hoja) memoria = `met: ${hoja.met}`;
            else if ('knows' in hoja) memoria = `knows: ${hoja.knows}`;
            else if ('endingSeen' in hoja) memoria = `endingSeen: ${hoja.endingSeen}`;
            else if ('flag' in hoja && hoja.flag.startsWith(prefijoLocal)) memoria = `flag ${hoja.flag}`;
            if (memoria === null) return;
            issues.push(error(CHECK, `${speaker} vive en world/ y r08 no lo frena, pero tampoco puede recordar otra partida: variante con ${memoria} en su boca — «${v.text.replace(/\s+/g, ' ').slice(0, 60)}»`, scene.id));
          });
        }
      }
    }
  }
  issues.push(info(CHECK, `${revisados} párrafos con \`speaker\` de world/ revisados (${delMundo.join(', ') || 'ninguno compartido'})`));
  return issues;
};
