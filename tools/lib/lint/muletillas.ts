import { info, type LintCheck, type LintIssue } from './types';
import { normalizar, palabras, textosDe, variantes } from './texto';

const CHECK = 'muletillas';

/**
 * Palabras vacías del rioplatense escrito: artículos, preposiciones, pronombres, auxiliares y los
 * verbos de altísima frecuencia que no dicen nada del estilo del autor. Lo que queda son palabras de
 * contenido, que es donde se ven los tics.
 */
export const VACIAS: ReadonlySet<string> = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'de', 'a', 'en', 'con', 'sin', 'por', 'para', 'sobre', 'entre', 'hasta', 'desde', 'hacia', 'tras', 'contra', 'según',
  'y', 'e', 'o', 'u', 'ni', 'pero', 'sino', 'aunque', 'porque', 'que', 'qué', 'como', 'cómo', 'cuando', 'cuándo',
  'donde', 'dónde', 'si', 'sí', 'no', 'más', 'menos', 'muy', 'ya', 'también', 'tampoco', 'todavía',
  'se', 'te', 'me', 'le', 'les', 'nos', 'su', 'sus', 'tu', 'tus', 'mi', 'mis', 'vos', 'él', 'ella', 'ellos', 'ellas',
  'este', 'esta', 'esto', 'estos', 'estas', 'ese', 'esa', 'eso', 'esos', 'esas', 'aquel', 'aquella',
  'es', 'son', 'era', 'eran', 'fue', 'fueron', 'ser', 'sos', 'sea',
  'está', 'están', 'estás', 'estaba', 'estaban', 'estar', 'hay', 'había', 'ha', 'han',
  'todo', 'toda', 'todos', 'todas', 'algo', 'nada', 'alguien', 'nadie', 'otro', 'otra', 'otros', 'otras',
  'dos', 'tres', 'primera', 'primero', 'cada', 'mismo', 'misma', 'tan', 'ahí', 'acá', 'allá', 'así', 'antes', 'después', 'ahora', 'luego',
  'dice', 'decir', 'dijo', 'tiene', 'tenés', 'tener', 'hace', 'hacer', 'hacés', 'va', 'ir', 'vas',
  'usted', 'bien', 'casi', 'solo', 'sólo', 'cosa', 'cosas',
]);

/** Las palabras de contenido más repetidas de toda la campaña, para que el autor vea sus tics. */
export const chequearMuletillas: LintCheck = (campaign, ctx) => {
  const issues: LintIssue[] = [];
  const cuenta = new Map<string, number>();
  const escenasDe = new Map<string, Set<string>>();
  let total = 0;
  for (const scene of Object.values(campaign.scenes)) {
    for (const text of textosDe(scene)) {
      for (const v of variantes(text)) {
        for (const t of palabras(normalizar(v.text))) {
          total += 1;
          if (t.length < 4 || VACIAS.has(t)) continue;
          cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
          const set = escenasDe.get(t);
          if (set === undefined) escenasDe.set(t, new Set([scene.id]));
          else set.add(scene.id);
        }
      }
    }
  }
  const orden = [...cuenta].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, ctx.top);
  const linea = orden
    .map(([palabra, n]) => `${palabra} ${n} (${escenasDe.get(palabra)?.size ?? 0} esc.)`)
    .join(' · ');
  issues.push(info(CHECK, `${total} palabras de prosa; las ${orden.length} de contenido más repetidas: ${linea}`));
  return issues;
};
