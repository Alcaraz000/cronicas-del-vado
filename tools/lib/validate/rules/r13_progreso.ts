import type { Campaign, Scene } from '@/content/schema';
import { sceneEdges } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';
import { has } from '../walk';

const RULE = 'r13_progreso';

/**
 * Destinos a los que se llega sin llave: las opciones LIBRES —sin `requires`, o sea sin hacer falta
 * ningún estado, y sin `roll`, o sea sin hacer falta que salgan los dados— más los `redirect`, que
 * el motor resuelve solo.
 *
 * Los redirect cuentan acá y NO en `salidasDeChoice` a propósito: son la mitad del bug que esta
 * regla persigue —una salida que existe en el grafo y que el jugador nunca ve como opción.
 *
 * Las bandas de una tirada (`roll.outcomes.*`) NO entran: que exista un camino al final para quien
 * saque bien los dados no es progreso garantizado, y la definición de r03 —que sólo mira
 * `requires`— es más ancha que ésta justamente por eso.
 */
function pasosLibres(campaign: Campaign, scene: Scene): string[] {
  const destinos: string[] = [];
  for (const r of scene.redirect ?? []) destinos.push(r.to);
  for (const choice of scene.choices) {
    if (choice.requires !== undefined || choice.roll !== undefined) continue;
    if (choice.outcome !== undefined) destinos.push(choice.outcome.next);
  }
  return destinos.filter((id) => has(campaign.scenes, id));
}

/** Aristas que nacen de una opción: lo que el jugador elige. Un `redirect` no es una de éstas. */
function salidasDeChoice(campaign: Campaign, scene: Scene): string[] {
  return sceneEdges(scene)
    .filter((e) => e.via !== 'redirect')
    .map((e) => e.to)
    .filter((id) => has(campaign.scenes, id));
}

/**
 * Componentes fuertemente conexas (Tarjan), iterativo para no depender de la pila de JS: la
 * campaña real tiene 46 escenas pero el recorrido es sobre datos de autor y una recursión acá se
 * vuelve un límite escondido.
 */
function componentesFuertes(nodos: readonly string[], salientes: ReadonlyMap<string, string[]>): string[][] {
  const indice = new Map<string, number>();
  const bajo = new Map<string, number>();
  const enPila = new Set<string>();
  const pila: string[] = [];
  const componentes: string[][] = [];
  let contador = 0;

  const abrir = (id: string): void => {
    indice.set(id, contador);
    bajo.set(id, contador);
    contador += 1;
    pila.push(id);
    enPila.add(id);
  };

  for (const raiz of nodos) {
    if (indice.has(raiz)) continue;
    abrir(raiz);
    const marcos: { id: string; i: number }[] = [{ id: raiz, i: 0 }];
    while (marcos.length > 0) {
      const marco = marcos[marcos.length - 1] as { id: string; i: number };
      const vecinos = salientes.get(marco.id) ?? [];
      if (marco.i < vecinos.length) {
        const vecino = vecinos[marco.i] as string;
        marco.i += 1;
        if (!indice.has(vecino)) {
          abrir(vecino);
          marcos.push({ id: vecino, i: 0 });
        } else if (enPila.has(vecino)) {
          bajo.set(marco.id, Math.min(bajo.get(marco.id) as number, indice.get(vecino) as number));
        }
        continue;
      }
      if (bajo.get(marco.id) === indice.get(marco.id)) {
        const componente: string[] = [];
        for (;;) {
          const id = pila.pop() as string;
          enPila.delete(id);
          componente.push(id);
          if (id === marco.id) break;
        }
        componentes.push(componente.sort());
      }
      marcos.pop();
      const padre = marcos[marcos.length - 1];
      if (padre !== undefined) {
        bajo.set(padre.id, Math.min(bajo.get(padre.id) as number, bajo.get(marco.id) as number));
      }
    }
  }
  return componentes;
}

/**
 * Regla 13: que la partida pueda avanzar.
 *
 * Es la regla que habría atrapado el acto 1 el día que se escribió. Comprueba dos cosas:
 *
 * 1. Desde toda escena no final se llega a un final usando SÓLO opciones libres. Un acto que sólo
 *    se termina teniendo el flag correcto o acertando una tirada no es un acto: es una lotería.
 * 2. Ninguna región del grafo depende exclusivamente de un `redirect` para salir. Se calculan las
 *    componentes fuertemente conexas contando sólo las aristas que nacen de una opción; si de una
 *    componente no sale ninguna, el jugador puede dar vueltas adentro para siempre sin que nada de
 *    lo que elige lo saque. Que exista un `redirect` no alcanza: el jugador no lo ve, y si su
 *    condición depende de un estado que las opciones del racimo no mueven, no se abre nunca.
 *
 * Una componente de una sola escena cuenta como racimo si la escena vuelve a sí misma: es el mismo
 * encierro, con una pantalla en vez de doce.
 */
export const r13_progreso: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const ids = Object.keys(campaign.scenes);

  // 1. Alcance de un final con opciones libres, hacia atrás desde los finales.
  const entrantes = new Map<string, string[]>();
  for (const id of ids) {
    for (const destino of pasosLibres(campaign, campaign.scenes[id] as Scene)) {
      const lista = entrantes.get(destino);
      if (lista === undefined) entrantes.set(destino, [id]);
      else lista.push(id);
    }
  }
  const llegan = new Set<string>(ids.filter((id) => (campaign.scenes[id] as Scene).kind === 'ending'));
  const cola = [...llegan];
  while (cola.length > 0) {
    const id = cola.shift() as string;
    for (const previa of entrantes.get(id) ?? []) {
      if (llegan.has(previa)) continue;
      llegan.add(previa);
      cola.push(previa);
    }
  }
  for (const id of ids) {
    if (llegan.has(id)) continue;
    issues.push(error(RULE, `Desde la escena ${id} no se llega a ningún final con opciones libres (sin requires y sin tirada)`, id));
  }

  // 2. Racimos de los que no sale ninguna opción.
  const salientes = new Map<string, string[]>();
  for (const id of ids) salientes.set(id, salidasDeChoice(campaign, campaign.scenes[id] as Scene));
  for (const componente of componentesFuertes(ids, salientes)) {
    const adentro = new Set(componente);
    const primera = componente[0] as string;
    // Una escena sola no es un racimo salvo que vuelva a sí misma: un final, o cualquier escena de
    // paso, es una componente de una y no encierra a nadie.
    if (componente.length === 1 && !(salientes.get(primera) ?? []).includes(primera)) continue;
    if (componente.some((id) => (salientes.get(id) ?? []).some((to) => !adentro.has(to)))) continue;
    const redirects = componente.flatMap((id) => (campaign.scenes[id] as Scene).redirect ?? []).length;
    const puerta =
      redirects === 0
        ? 'y tampoco hay ningún redirect: no se sale'
        : `y sólo se sale por los ${redirects} redirect del racimo, que el jugador nunca ve como opción`;
    const sujeto =
      componente.length === 1
        ? `La escena ${primera} es un racimo cerrado`
        : `Las ${componente.length} escenas ${componente.join(', ')} son un racimo cerrado`;
    issues.push(error(RULE, `${sujeto}: ninguna opción sale de ahí ${puerta}`, primera));
  }
  return issues;
};
