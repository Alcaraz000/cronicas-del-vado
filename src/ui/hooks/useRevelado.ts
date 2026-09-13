import { useEffect, useState } from 'react';
import type { LogEntry, SeenMap } from '@/engine/types';

/**
 * La máquina de escribir del log: revela la ÚLTIMA entrada carácter por carácter (o de
 * un saque si `instantaneo`) y ofrece saltar directo a lo que todavía no se leyó.
 *
 * Por qué `seen` sirve para "saltar lo leído" mientras la escena está en pantalla:
 * el motor deriva `seen[sceneId]` recién al SALIR de la escena, al elegir una opción
 * (`deriveMemory` en `engine/memory.ts` hace `seen[sceneId] ∪= hashes`). Mientras estás
 * LEYENDO una escena por segunda vez, `seen[sceneId]` todavía tiene los hashes de la
 * visita ANTERIOR, no los de esta pasada: comparar `hashes[i]` de la entrada actual
 * contra ese conjunto es exactamente "¿este párrafo ya lo leíste en una visita previa?".
 * Si alguna vez esa derivación se mueve a la ENTRADA a la escena, `seen[sceneId]` ya
 * incluiría los hashes de la visita en curso y este hook dejaría de poder distinguir
 * "ya leído antes" de "leído recién ahora": el salto ofrecería revelar todo siempre,
 * en silencio, sin ningún error que lo delate.
 *
 * Por qué "entrada nueva" NO se detecta por `log.length`: el motor recorta el log a
 * `LIMITS.maxLog` (`appendLogEntries` y `enter()` en `engine/resolve.ts` hacen `.slice(...)`).
 * Pasado ese tope, cada entrada nueva empuja a la más vieja y `log.length` queda CONSTANTE
 * para siempre: el reinicio dejaría de dispararse en silencio justo cuando la partida se
 * pone larga, y el revelado quedaría mezclando el progreso de la entrada vieja con el largo
 * de la nueva.
 *
 * La señal correcta es la REFERENCIA de `log[log.length - 1]` (`ultima`), no su contenido:
 * `.slice()` conserva la identidad de los objetos que sobreviven al recorte, así que esa
 * referencia cambia exactamente cuando llega una entrada de verdad nueva — incluso con el
 * log recortado — y el motor NUNCA reutiliza la referencia de una entrada anterior (arma un
 * objeto nuevo siempre, aunque el contenido sea idéntico al de la entrada previa: una ronda
 * de combate que vuelve a sí misma, o una escena que redirige a su propio id con el mismo
 * texto). Por eso la identidad es también la única señal que distingue "la escena volvió a
 * mostrarse con el mismo texto" (el revelado tiene que reiniciar) de "seguimos mirando la
 * misma entrada" (no tiene que reiniciar): una huella por CONTENIDO sería ciega a ese caso,
 * porque ahí el contenido no cambia.
 *
 * Eso sí: quien llama a este hook tiene que pasar el `log` (o al menos su última entrada)
 * con una referencia ESTABLE entre renders mientras el contenido no cambie de verdad — no
 * reconstruirlo inline en cada render. `EscenaScreen` lo cumple pasando `gs.run.log` tal cual
 * sale del store (estable mientras no haya una acción que lo cambie). Si quien llama
 * reconstruye la última entrada con contenido idéntico en cada render (no memoiza, o la
 * arma de nuevo a propósito), la referencia cambia en TODOS los renders aunque la entrada
 * sea conceptualmente la misma, y el efecto de reinicio —atado a esa identidad— no para:
 * `setEstado` dispara un render, ese render arma una referencia nueva, el efecto se repite —
 * un bucle infinito. Los tests de este archivo que necesitan volver a renderizar el MISMO
 * log (en vez de pasar uno nuevo por `rerender`) arman ese log en un `const` FUERA del
 * callback que le pasan a `renderHook`, precisamente para no pisar esta regla.
 */

interface UseReveladoArgs {
  log: LogEntry[];
  seen: SeenMap;
  cps: number;
  instantaneo: boolean;
}

export interface Revelado {
  /** Párrafos 0…parrafosVisibles-1 de la última entrada, mostrados enteros. */
  parrafosVisibles: number;
  /** Caracteres mostrados del párrafo en curso (índice `parrafosVisibles`). */
  caracteresVisibles: number;
  /** `parrafosVisibles === cantidad de párrafos de la entrada`. */
  terminado: boolean;
  /** La entrada es `scene`, no está terminada, y su párrafo en curso ya se vio antes. */
  puedeSaltarLeido: boolean;
  /** Completa el párrafo en curso; si ya estaba completo, pasa al siguiente. */
  avanzar: () => void;
  /** Da por completos los párrafos ya vistos y frena en el primero nuevo. */
  saltarLeido: () => void;
}

/** Párrafos de una entrada del log; `choice` y `roll` no llevan prosa. */
function parrafosDe(entrada: LogEntry | undefined): { text: string }[] {
  if (entrada === undefined) return [];
  if (entrada.kind === 'scene' || entrada.kind === 'outcome') return entrada.paragraphs;
  return [];
}

/** Hashes de una entrada; solo `scene` los tiene (por eso un desenlace nunca ofrece saltar). */
function hashesDe(entrada: LogEntry | undefined): string[] | undefined {
  return entrada !== undefined && entrada.kind === 'scene' ? entrada.hashes : undefined;
}

interface Estado {
  parrafos: number;
  caracteres: number;
}

export function useRevelado({ log, seen, cps, instantaneo }: UseReveladoArgs): Revelado {
  const ultima = log[log.length - 1];
  const parrafos = parrafosDe(ultima);
  const hashes = hashesDe(ultima);

  const [estado, setEstado] = useState<Estado>(() => ({
    parrafos: instantaneo ? parrafos.length : 0,
    caracteres: 0,
  }));

  // Nueva entrada en el log: reinicia el revelado (a todo si es instantáneo, a cero si no).
  // La dependencia es la REFERENCIA de `ultima`, no `log.length` ni una huella por contenido
  // (ver comentario de cabecera: la identidad es la única señal que distingue una escena que
  // vuelve a sí misma con el mismo texto de "seguimos mirando la misma entrada").
  useEffect(() => {
    setEstado({
      parrafos: instantaneo ? parrafosDe(ultima).length : 0,
      caracteres: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se reinicia solo con una entrada NUEVA (identidad de `ultima`), no con cada cambio de `instantaneo`.
  }, [ultima]);

  const terminado = estado.parrafos >= parrafos.length;

  // El tic de la máquina de escribir: un carácter por vez, al ritmo de `cps`. Se detiene solo
  // (no arranca de nuevo) al llegar a `terminado`, y siempre se limpia al desmontar o reiniciar.
  useEffect(() => {
    if (instantaneo || terminado) return;
    const actuales = parrafosDe(ultima);
    const intervalo = setInterval(() => {
      setEstado((previo) => {
        const enCurso = actuales[previo.parrafos];
        if (enCurso === undefined) return previo; // ya terminado; nada que tickear.
        if (previo.caracteres < enCurso.text.length) {
          return { ...previo, caracteres: previo.caracteres + 1 };
        }
        // El párrafo en curso ya está completo: este tic pasa al siguiente.
        return { ...previo, parrafos: previo.parrafos + 1, caracteres: 0 };
      });
    }, 1000 / cps);
    return () => clearInterval(intervalo);
  }, [instantaneo, terminado, cps, ultima]);

  function avanzar(): void {
    setEstado((previo) => {
      const enCurso = parrafos[previo.parrafos];
      if (enCurso === undefined) return previo;
      if (previo.caracteres < enCurso.text.length) {
        return { ...previo, caracteres: enCurso.text.length };
      }
      return { ...previo, parrafos: previo.parrafos + 1, caracteres: 0 };
    });
  }

  function saltarLeido(): void {
    setEstado((previo) => {
      if (ultima?.kind !== 'scene') return previo;
      const vistos = seen[ultima.sceneId] ?? [];
      const hashesEntrada = ultima.hashes;
      let i = 0;
      while (i < hashesEntrada.length && vistos.includes(hashesEntrada[i]!)) {
        i += 1;
      }
      return { ...previo, parrafos: i, caracteres: 0 };
    });
  }

  const puedeSaltarLeido =
    ultima?.kind === 'scene' &&
    !terminado &&
    hashes !== undefined &&
    estado.parrafos < hashes.length &&
    (seen[ultima.sceneId] ?? []).includes(hashes[estado.parrafos]);

  return {
    parrafosVisibles: estado.parrafos,
    caracteresVisibles: estado.caracteres,
    terminado,
    puedeSaltarLeido,
    avanzar,
    saltarLeido,
  };
}
