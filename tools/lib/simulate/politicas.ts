import type { PendingRoll, RenderedChoice } from '@/engine/types';
import type { PoliticaId } from './types';

/**
 * Probabilidad de éxito que la política le atribuye a una opción.
 * Una opción sin tirada no puede fallar: vale 1.
 */
export function probExito(opcion: RenderedChoice): number {
  return opcion.preview === undefined ? 1 : opcion.preview.odds.success;
}

/** Probabilidad de fallo. Una opción sin tirada vale 0. */
export function probFallo(opcion: RenderedChoice): number {
  return opcion.preview === undefined ? 0 : opcion.preview.odds.failure;
}

/**
 * Índice del máximo según `puntaje`, con empate a favor del primero.
 * Se compara con un epsilon porque las probabilidades salen de divisiones exactas sobre 36 y 216:
 * sin él, dos opciones idénticas podrían desempatar por el ruido del punto flotante y el informe
 * dejaría de ser comparable entre commits.
 */
const EPSILON = 1e-9;

function indiceDelMaximo(opciones: readonly RenderedChoice[], puntaje: (o: RenderedChoice) => number): number {
  let mejor = 0;
  let mejorPuntaje = -Infinity;
  for (let i = 0; i < opciones.length; i += 1) {
    const opcion = opciones[i];
    if (opcion === undefined) continue;
    const p = puntaje(opcion);
    if (p > mejorPuntaje + EPSILON) {
      mejor = i;
      mejorPuntaje = p;
    }
  }
  return mejor;
}

/**
 * Elige una opción entre las candidatas según la política. `azar` es el generador determinista
 * de la partida (mulberry32): la misma semilla da exactamente la misma elección.
 * Lanza si la lista viene vacía: quien llama tiene que haber filtrado antes.
 */
export function elegirOpcion(
  politica: PoliticaId,
  opciones: readonly RenderedChoice[],
  azar: () => number,
): RenderedChoice {
  if (opciones.length === 0) {
    throw new Error('No hay opciones para elegir');
  }
  const indice =
    politica === 'aleatoria'
      ? Math.min(opciones.length - 1, Math.floor(azar() * opciones.length))
      : politica === 'codiciosa'
        ? indiceDelMaximo(opciones, probExito)
        : indiceDelMaximo(opciones, probFallo);
  return opciones[indice] as RenderedChoice;
}

/**
 * Candidatas de una escena: las habilitadas que la partida todavía no eligió en ESA escena.
 * Es la regla que hace que las tres políticas terminen: sin ella, la codiciosa elige siempre la
 * misma primera opción del hub y nunca junta las tres pistas, y las excepciones que vuelven al hub
 * («mirar el pozo») se convierten en un bucle infinito. Un jugador tampoco lee dos veces el mismo
 * poste de bandos. Si ya se eligieron todas, se vuelven a habilitar todas.
 */
export function candidatas(
  sceneId: string,
  habilitadas: readonly RenderedChoice[],
  yaElegidas: ReadonlySet<string>,
): RenderedChoice[] {
  const frescas = habilitadas.filter((o) => !yaElegidas.has(`${sceneId}#${o.id}`));
  return frescas.length > 0 ? frescas : [...habilitadas];
}

/** Índice del dado conservado con el valor más bajo: el que conviene repetir con Fortuna. */
export function peorDadoConservado(pending: PendingRoll): number {
  let peor = pending.kept[0] ?? 0;
  let peorValor = Infinity;
  for (const indice of pending.kept) {
    const valor = pending.dice[indice] ?? 0;
    if (valor < peorValor) {
      peor = indice;
      peorValor = valor;
    }
  }
  return peor;
}

/** ¿La banda es un fallo (normal o grave)? */
export function esFallo(banda: PendingRoll['band']): boolean {
  return banda === 'failure' || banda === 'fumble';
}
