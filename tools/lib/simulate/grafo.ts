import type { Campaign, Choice, Condition, Scene } from '@/content/schema';

/**
 * El grafo de escenas visto desde el simulador. No se reusa `tools/lib/validate/reach.ts` a
 * propósito: acá la pregunta no es "¿existe un camino?" sino "¿existe un camino que NO pase por
 * una condición de memoria?", que es lo que pide la aserción 1 de la spec §10.
 */

export interface Arista {
  desde: string;
  hasta: string;
  /** La condición que hay que cumplir para tomar la arista: `requires` de la opción o `when` del redirect. */
  guarda?: Condition;
}

/** Los cinco desenlaces posibles de una tirada, en orden fijo. */
function destinosDeTirada(choice: Choice): string[] {
  const o = choice.roll?.outcomes;
  if (o === undefined) return [];
  const lista = [o.success.next, o.partial.next, o.failure.next];
  if (o.crit) lista.push(o.crit.next);
  if (o.fumble) lista.push(o.fumble.next);
  return lista;
}

export function aristasDeEscena(scene: Scene): Arista[] {
  const aristas: Arista[] = [];
  for (const r of scene.redirect ?? []) {
    aristas.push({ desde: scene.id, hasta: r.to, guarda: r.when });
  }
  for (const choice of scene.choices) {
    const guarda = choice.requires;
    const destinos = [...(choice.outcome ? [choice.outcome.next] : []), ...destinosDeTirada(choice)];
    for (const hasta of destinos) {
      aristas.push(guarda === undefined ? { desde: scene.id, hasta } : { desde: scene.id, hasta, guarda });
    }
  }
  return aristas;
}

/**
 * ¿La condición mira la memoria del personaje o del mundo? Son las cuatro formas de la spec §5:
 * `met`, `knows`, `endingSeen` y los flags `char:` / `world:` (los `run:` son de esta partida).
 * Basta con que aparezca UNA hoja de memoria en cualquier rama: si la condición la nombra, cumplirla
 * depende de haber jugado antes.
 */
export function usaMemoria(cond: Condition | undefined): boolean {
  if (cond === undefined) return false;
  if ('not' in cond) return usaMemoria(cond.not);
  if ('all' in cond) return cond.all.some(usaMemoria);
  if ('any' in cond) return cond.any.some(usaMemoria);
  if ('met' in cond || 'knows' in cond || 'endingSeen' in cond) return true;
  if ('flag' in cond) return cond.flag.startsWith('char:') || cond.flag.startsWith('world:');
  return false;
}

/**
 * Escenas a las que se llega desde `start` SIN pasar nunca por una arista con condición de memoria.
 * Son las que un personaje nuevo, en su primera partida, podría ver: las de afuera de este conjunto
 * son las que la spec §10 permite que queden sin visitar.
 */
export function alcanzablesSinMemoria(campaign: Campaign): Set<string> {
  const vistas = new Set<string>();
  const cola: string[] = [campaign.start];
  while (cola.length > 0) {
    const id = cola.shift() as string;
    const scene: Scene | undefined = campaign.scenes[id];
    if (vistas.has(id) || scene === undefined) continue;
    vistas.add(id);
    for (const arista of aristasDeEscena(scene)) {
      if (!usaMemoria(arista.guarda)) cola.push(arista.hasta);
    }
  }
  return vistas;
}

/** Todas las opciones de la campaña como `escena#opcion`, en orden de declaración. */
export function todasLasOpciones(campaign: Campaign): string[] {
  const lista: string[] = [];
  for (const scene of Object.values(campaign.scenes)) {
    for (const choice of scene.choices) lista.push(`${scene.id}#${choice.id}`);
  }
  return lista;
}

/** Opciones cuyo `requires` mira la memoria: las que un personaje nuevo no puede elegir nunca. */
export function opcionesDeMemoria(campaign: Campaign): Set<string> {
  const set = new Set<string>();
  for (const scene of Object.values(campaign.scenes)) {
    for (const choice of scene.choices) {
      if (usaMemoria(choice.requires)) set.add(`${scene.id}#${choice.id}`);
    }
  }
  return set;
}
