import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r12_memories';

/**
 * Simetría entre los flags de canon y lo que el jugador lee de ellos.
 *
 * Las descripciones de `campaign.flags` están escritas para el autor ("lo enciende tal opción,
 * lo limpia tal otra"): no se le pueden mostrar a nadie. `campaign.memories` es la otra cara,
 * una línea de narrador por flag de canon, y es lo único que la Ficha y la pantalla de fin
 * tienen para decir qué recuerda el personaje.
 *
 * Por eso la regla va en los dos sentidos:
 *   - Todo `char:<campaña>.*` y `world:<campaña>.*` declarado en `flags` tiene su línea.
 *   - Toda clave de `memories` es uno de esos flags: los `run:` mueren con la partida y no se
 *     leen nunca, y los espacios compartidos (`char:met.*`, `char:place.*`, …) los deriva el
 *     motor y se muestran con el nombre del PNJ o del lugar, no con una línea escrita.
 */
export const r12_memories: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const prefijos = [`char:${campaign.id}.`, `world:${campaign.id}.`];
  const esCanon = (flag: string): boolean => prefijos.some((p) => flag.startsWith(p));

  for (const flag of Object.keys(campaign.flags)) {
    if (esCanon(flag) && campaign.memories[flag] === undefined) {
      issues.push(
        error(
          RULE,
          `El flag de canon ${flag} no tiene línea en memories: es lo que el jugador lee en la Ficha, y sin ella el recuerdo se omite en silencio`,
        ),
      );
    }
  }

  for (const flag of Object.keys(campaign.memories)) {
    if (!esCanon(flag)) {
      issues.push(
        error(
          RULE,
          `memories tiene una línea para ${flag}, que no es un flag de canon de esta campaña: solo se muestran los char:${campaign.id}. y world:${campaign.id}., porque son los únicos que sobreviven a la partida`,
        ),
      );
      continue;
    }
    if (campaign.flags[flag] === undefined) {
      issues.push(
        error(
          RULE,
          `memories tiene una línea para ${flag}, que no está declarado en flags: o falta la declaración, o la línea quedó de un flag que se borró`,
        ),
      );
    }
  }

  return issues;
};
