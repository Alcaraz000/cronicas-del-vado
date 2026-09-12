import type { Campaign, Scene } from '@/content/schema';
import { rollDice } from '@/engine/rng';
import { aviso, info, type LintCheck, type LintIssue } from './types';
import { contar, outcomesDe, textoBase } from './texto';

const CHECK = 'duracion';

/** Fórmula del diseño (outline §4): 180 palabras por minuto y 8 segundos por decisión. */
export const PALABRAS_POR_MINUTO = 180;
export const SEGUNDOS_POR_DECISION = 8;

/** Tope de visitas por escena en una caminata, para que un hub no genere una ruta infinita. */
const TOPE_VISITAS = 3;
const TOPE_PASOS = 90;

export interface Ruta { escenas: string[]; palabras: number; decisiones: number; final: string | null }

/** Lo que se lee al entrar a una escena: el texto base, todas las etiquetas y todos los `lockedHint`. */
export function palabrasDePantalla(scene: Scene): number {
  let total = contar(textoBase(scene.text));
  for (const choice of scene.choices) {
    total += contar(choice.label);
    total += contar(choice.lockedHint ?? '');
  }
  if (scene.ending) total += contar(textoBase(scene.ending.epilogue));
  return total;
}

export function minutos(ruta: Ruta): number {
  return ruta.palabras / PALABRAS_POR_MINUTO + (ruta.decisiones * SEGUNDOS_POR_DECISION) / 60;
}

interface Destino { next: string; texto: number; porRedirect: boolean }

/**
 * Las salidas de una escena. Incluye las de `redirect`, que en esta campaña **no son un adorno**: el
 * acto 1 se comunica con el cuello 1 solo por el redirect del hub, así que un recorrido que las ignore
 * deja el grafo partido en dos y no llega a ningún final.
 *
 * Una entrada que dispara un `redirect` no se lee (outline §4), así que la arista no suma palabras ni
 * decisión. Como acá no hay estado que evaluar, se la habilita recién a partir de la segunda entrada a
 * la escena: es la aproximación de "el redirect se dispara cuando el estado se acumuló".
 */
function destinosDe(campaign: Campaign, scene: Scene, entradas: number): Destino[] {
  const lista: Destino[] = [];
  for (const choice of scene.choices) {
    for (const o of outcomesDe(choice)) lista.push({ next: o.next, texto: contar(textoBase(o.text ?? [])), porRedirect: false });
  }
  if (entradas >= 2) for (const r of scene.redirect ?? []) lista.push({ next: r.to, texto: 0, porRedirect: true });
  return lista.filter((d) => campaign.scenes[d.next] !== undefined);
}

/**
 * Camina el grafo eligiendo opciones con `rollDice`, que es la única fuente de azar del proyecto:
 * misma semilla ⇒ misma ruta ⇒ el informe se puede comparar entre commits.
 *
 * No evalúa `requires` ni las condiciones de `redirect` (no hay personaje), así que la ruta es una
 * cota de lectura, no una partida: para eso está `simulate`.
 */
export function caminar(campaign: Campaign, seed: number, corrida: number): Ruta | null {
  const escenas: string[] = [];
  const visitas = new Map<string, number>();
  let actual = campaign.start;
  let palabras = 0;
  let decisiones = 0;
  for (let paso = 0; paso < TOPE_PASOS; paso += 1) {
    const scene = campaign.scenes[actual];
    if (scene === undefined) return null;
    const entradas = (visitas.get(actual) ?? 0) + 1;
    visitas.set(actual, entradas);
    escenas.push(actual);
    palabras += palabrasDePantalla(scene);
    if (scene.kind === 'ending') return { escenas, palabras, decisiones, final: scene.ending?.id ?? actual };
    const destinos = destinosDe(campaign, scene, entradas).filter((d) => (visitas.get(d.next) ?? 0) < TOPE_VISITAS);
    if (destinos.length === 0) return null;
    const [d1 = 1, d2 = 1] = rollDice(seed, actual, 'lint-text', paso, corrida, 2);
    const elegido = destinos[((d1 - 1) * 6 + (d2 - 1)) % destinos.length];
    if (elegido === undefined) return null;
    palabras += elegido.texto;
    if (!elegido.porRedirect) decisiones += 1;
    actual = elegido.next;
  }
  return null;
}

/** Ruta más corta en pantallas hasta cada final, por anchura sobre las aristas de opción y de redirect. */
export function rutasMasCortas(campaign: Campaign): Map<string, string[]> {
  const previo = new Map<string, string | null>([[campaign.start, null]]);
  const cola = [campaign.start];
  const finales = new Map<string, string[]>();
  while (cola.length > 0) {
    const id = cola.shift();
    if (id === undefined) break;
    const scene = campaign.scenes[id];
    if (scene === undefined) continue;
    if (scene.kind === 'ending') {
      const camino: string[] = [];
      for (let cur: string | null | undefined = id; cur != null; cur = previo.get(cur)) camino.unshift(cur);
      finales.set(scene.ending?.id ?? id, camino);
      continue;
    }
    for (const d of destinosDe(campaign, scene, 2)) {
      if (previo.has(d.next)) continue;
      previo.set(d.next, id);
      cola.push(d.next);
    }
  }
  return finales;
}

function rutaDeCamino(campaign: Campaign, camino: readonly string[]): Ruta {
  let palabras = 0;
  let decisiones = 0;
  camino.forEach((id, i) => {
    const scene = campaign.scenes[id];
    if (scene === undefined) return;
    palabras += palabrasDePantalla(scene);
    if (i < camino.length - 1) {
      const siguiente = camino[i + 1];
      const outs = scene.choices.flatMap(outcomesDe).filter((o) => o.next === siguiente);
      const primero = outs[0];
      // Una entrada que dispara un redirect no se lee y no cuesta una decisión (outline §4).
      if (primero === undefined && (scene.redirect ?? []).some((r) => r.to === siguiente)) return;
      decisiones += 1;
      if (primero?.text) palabras += contar(textoBase(primero.text));
    }
  });
  const ultima = camino[camino.length - 1];
  const fin = ultima === undefined ? null : campaign.scenes[ultima]?.ending?.id ?? null;
  return { escenas: [...camino], palabras, decisiones, final: fin };
}

function mediana(nums: readonly number[]): number {
  if (nums.length === 0) return 0;
  const orden = [...nums].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  if (orden.length % 2 === 1) return orden[medio] ?? 0;
  return ((orden[medio - 1] ?? 0) + (orden[medio] ?? 0)) / 2;
}

export const chequearDuracion: LintCheck = (campaign, ctx) => {
  const issues: LintIssue[] = [];
  const [minVentana, maxVentana] = campaign.durationMin;

  const cortas = rutasMasCortas(campaign);
  for (const [finalId, camino] of [...cortas].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    const ruta = rutaDeCamino(campaign, camino);
    const m = minutos(ruta);
    const fuera = m < minVentana || m > maxVentana;
    issues.push((fuera ? aviso : info)(CHECK, `ruta mínima a ${finalId}: ${camino.length} pantallas, ${ruta.palabras} palabras, ${m.toFixed(1)} min${fuera ? ` — fuera de la ventana ${minVentana}-${maxVentana}` : ''}`));
  }

  const rutas: Ruta[] = [];
  for (let i = 0; i < ctx.walks; i += 1) {
    const ruta = caminar(campaign, ctx.seed, i);
    if (ruta !== null) rutas.push(ruta);
  }
  if (rutas.length === 0) {
    issues.push(aviso(CHECK, 'ninguna caminata llegó a un final: no se puede estimar la duración'));
    return issues;
  }
  const tiempos = rutas.map(minutos);
  const med = mediana(tiempos);
  const min = Math.min(...tiempos);
  const max = Math.max(...tiempos);
  const fuera = tiempos.filter((t) => t < minVentana || t > maxVentana).length;
  issues.push(info(CHECK, `${rutas.length} de ${ctx.walks} caminatas llegaron a un final (semilla ${ctx.seed}): mediana ${med.toFixed(1)} min, mínimo ${min.toFixed(1)}, máximo ${max.toFixed(1)} · pantallas mediana ${mediana(rutas.map((r) => r.escenas.length)).toFixed(0)}, palabras mediana ${mediana(rutas.map((r) => r.palabras)).toFixed(0)}`));
  const pct = (fuera / rutas.length) * 100;
  if (med < minVentana || med > maxVentana) {
    issues.push(aviso(CHECK, `la partida típica cae fuera de la ventana ${minVentana}-${maxVentana} min: mediana ${med.toFixed(1)}`));
  }
  if (pct > 50) {
    issues.push(aviso(CHECK, `${pct.toFixed(0)} % de las caminatas cae fuera de la ventana ${minVentana}-${maxVentana} min`));
  } else {
    issues.push(info(CHECK, `${pct.toFixed(0)} % de las caminatas cae fuera de la ventana ${minVentana}-${maxVentana} min`));
  }
  return issues;
};
