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
 * Y por qué tampoco alcanza con la REFERENCIA de `log[log.length - 1]` (aunque `.slice()`
 * conserve la identidad de los objetos que sobreviven al recorte, lo que sugiere que
 * "cambió la referencia" debería bastar): si quien llama construye esa última entrada de
 * nuevo en cada render con contenido idéntico (no memoiza, o la reconstruye a propósito,
 * como hacen varios tests de este mismo archivo), la referencia cambia en TODOS los
 * renders aunque la entrada sea conceptualmente la misma, y un efecto atado a esa
 * referencia se reinicia sin parar: `setEstado` dispara un render, ese render arma una
 * referencia nueva, el efecto se repite — un bucle infinito, no una corrección. Por eso la
 * señal es `claveDe(entrada)`, una huella por VALOR (tipo + campos que identifican el
 * contenido, no la instancia): cambia exactamente cuando el contenido cambia de verdad —
 * incluso con el log recortado — y se mantiene estable frente a una reconstrucción
 * incidental con el mismo contenido. Ambos efectos (el de reinicio y el del intervalo)
 * dependen de esa clave, no del array `log` completo: así tampoco hace falta que quien
 * llame memoice `log` para que el intervalo no se destruya y se recree en cada render.
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

/**
 * Huella por VALOR de una entrada: identifica "es la misma entrada" por su contenido, no
 * por la instancia del objeto (ver el porqué en el comentario de cabecera del archivo).
 */
function claveDe(entrada: LogEntry | undefined): string {
  if (entrada === undefined) return '';
  switch (entrada.kind) {
    case 'scene':
      return `scene:${entrada.sceneId}:${entrada.hashes.join(',')}`;
    case 'outcome':
      return `outcome:${entrada.paragraphs.map((p) => p.text).join('|')}`;
    case 'choice':
      return `choice:${entrada.sceneId}:${entrada.choiceId}`;
    case 'roll':
      return `roll:${entrada.dice.join(',')}:${entrada.kept.join(',')}:${entrada.mode}:${entrada.total}:${entrada.fortuneSpent}:${entrada.powerUsed}`;
  }
}

interface Estado {
  parrafos: number;
  caracteres: number;
}

export function useRevelado({ log, seen, cps, instantaneo }: UseReveladoArgs): Revelado {
  const ultima = log[log.length - 1];
  const parrafos = parrafosDe(ultima);
  const hashes = hashesDe(ultima);
  const clave = claveDe(ultima);

  const [estado, setEstado] = useState<Estado>(() => ({
    parrafos: instantaneo ? parrafos.length : 0,
    caracteres: 0,
  }));

  // Nueva entrada en el log: reinicia el revelado (a todo si es instantáneo, a cero si no).
  // La dependencia es `clave` (huella por valor), no `log.length` ni la referencia de la
  // última entrada (ver comentario de cabecera).
  useEffect(() => {
    setEstado({
      parrafos: instantaneo ? parrafosDe(ultima).length : 0,
      caracteres: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se reinicia solo con una entrada NUEVA (clave de contenido), no con cada cambio de `instantaneo`; `ultima` en el cuerpo corresponde siempre al mismo contenido que `clave` en el render donde el efecto corre.
  }, [clave]);

  const terminado = estado.parrafos >= parrafos.length;

  // El tic de la máquina de escribir: un carácter por vez, al ritmo de `cps`. Se detiene solo
  // (no arranca de nuevo) al llegar a `terminado`, y siempre se limpia al desmontar o reiniciar.
  // Depende de `clave`, no del array `log` completo ni de la referencia de la última entrada:
  // así no se destruye y se recrea en cada render si quien llama no memoiza `log`.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depende de `clave`, no de `ultima` ni de `log`: ver comentario de cabecera.
  }, [instantaneo, terminado, cps, clave]);

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
