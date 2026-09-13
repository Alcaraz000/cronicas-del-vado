import styles from './Dados.module.css';

type Punto = readonly [number, number];

const TL: Punto = [25, 25];
const TR: Punto = [75, 25];
const ML: Punto = [25, 50];
const MR: Punto = [75, 50];
const BL: Punto = [25, 75];
const BR: Punto = [75, 75];
const MC: Punto = [50, 50];

/** Puntos de una cara de d6 según su valor, en una grilla de 3×3 sobre un viewBox de 100×100. */
const CARAS: Record<number, readonly Punto[]> = {
  1: [MC],
  2: [TL, BR],
  3: [TL, MC, BR],
  4: [TL, TR, BL, BR],
  5: [TL, TR, MC, BL, BR],
  6: [TL, TR, ML, MR, BL, BR],
};

export interface DadosProps {
  /** Los 2 o 3 valores tirados, en el orden que devuelve el motor. */
  dice: number[];
  /** Índices (dentro de `dice`) de los conservados; el resto se ve apagado. */
  kept: number[];
  /**
   * ¿Están girando? Sin `resaltado`, aplica a todos por igual (la tirada inicial: los 2 o 3
   * dados giran juntos). Con `resaltado`, gira solo ese índice — los demás quedan quietos
   * pase lo que pase con `girando` — porque es una repetición de Fortuna y el resto de la
   * tirada no se tocó.
   */
  girando: boolean;
  /** Índice del dado recién repetido con Fortuna, si hay uno. */
  resaltado?: number;
}

/**
 * Un dado por valor de `dice`, dibujado como cara de d6 (puntos, no el número en texto: así
 * no hace falta ningún tamaño de fuente propio) y accesible por `aria-label`. Cada uno lleva
 * los atributos `data-*` que gobiernan tanto el CSS (opacidad del descartado, giro, resalte)
 * como lo que los tests pueden leer.
 */
export function Dados({ dice, kept, girando, resaltado }: DadosProps) {
  return (
    <div className={styles.dados}>
      {dice.map((valor, i) => {
        const estaGirando = resaltado === undefined ? girando : girando && i === resaltado;
        return (
          <svg
            key={i}
            data-testid={`dado-${i}`}
            className={styles.dado}
            viewBox="0 0 100 100"
            role="img"
            aria-label={String(valor)}
            data-kept={kept.includes(i) ? 'true' : 'false'}
            data-girando={estaGirando ? 'true' : 'false'}
            data-resaltado={resaltado === i ? 'true' : 'false'}
          >
            <rect x="4" y="4" width="92" height="92" rx="14" className={styles.cara} />
            {(CARAS[valor] ?? []).map(([cx, cy], j) => (
              <circle key={j} cx={cx} cy={cy} r="9" className={styles.punto} />
            ))}
          </svg>
        );
      })}
    </div>
  );
}
