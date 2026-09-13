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
  entrada: number;
  parrafos: number;
  caracteres: number;
}

export function useRevelado({ log, seen, cps, instantaneo }: UseReveladoArgs): Revelado {
  const ultima = log[log.length - 1];
  const parrafos = parrafosDe(ultima);
  const hashes = hashesDe(ultima);

  const [estado, setEstado] = useState<Estado>(() => ({
    entrada: log.length - 1,
    parrafos: instantaneo ? parrafos.length : 0,
    caracteres: 0,
  }));

  // Nueva entrada en el log: reinicia el revelado (a todo si es instantáneo, a cero si no).
  useEffect(() => {
    setEstado({
      entrada: log.length - 1,
      parrafos: instantaneo ? parrafos.length : 0,
      caracteres: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se reinicia solo con una entrada NUEVA.
  }, [log.length]);

  const terminado = estado.parrafos >= parrafos.length;

  // El tic de la máquina de escribir: un carácter por vez, al ritmo de `cps`. Se detiene solo
  // (no arranca de nuevo) al llegar a `terminado`, y siempre se limpia al desmontar o reiniciar.
  useEffect(() => {
    if (instantaneo || terminado) return;
    const intervalo = setInterval(() => {
      setEstado((previo) => {
        const actuales = parrafosDe(log[previo.entrada]);
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
  }, [instantaneo, terminado, cps, log]);

  function avanzar(): void {
    setEstado((previo) => {
      const actuales = parrafosDe(log[previo.entrada]);
      const enCurso = actuales[previo.parrafos];
      if (enCurso === undefined) return previo;
      if (previo.caracteres < enCurso.text.length) {
        return { ...previo, caracteres: enCurso.text.length };
      }
      return { ...previo, parrafos: previo.parrafos + 1, caracteres: 0 };
    });
  }

  function saltarLeido(): void {
    setEstado((previo) => {
      const entradaLog = log[previo.entrada];
      const vistos = entradaLog?.kind === 'scene' ? (seen[entradaLog.sceneId] ?? []) : undefined;
      const hashesEntrada = hashesDe(entradaLog);
      if (hashesEntrada === undefined || vistos === undefined) return previo;
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
    (seen[ultima.sceneId] ?? []).includes(hashes[estado.parrafos]!);

  return {
    parrafosVisibles: estado.parrafos,
    caracteresVisibles: estado.caracteres,
    terminado,
    puedeSaltarLeido,
    avanzar,
    saltarLeido,
  };
}
