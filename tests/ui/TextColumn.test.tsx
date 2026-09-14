/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LogEntry } from '@/engine/types';
import { TextColumn } from '@/ui/components/TextColumn';
import type { Revelado } from '@/ui/hooks/useRevelado';
import { S } from '@/ui/strings.es';

const log: LogEntry[] = [{ kind: 'scene', sceneId: 'p_umbral', paragraphs: [{ text: 'Cruzás el vado.' }], hashes: [] }];

/** Un paso entero del jugador, con la forma exacta que le da el motor: escena, elección, tirada,
    desenlace y la escena que ese desenlace abrió. */
const conTirada: LogEntry[] = [
  { kind: 'scene', sceneId: 'p_camino', paragraphs: [{ text: 'El camino baja hacia el agua.' }], hashes: [] },
  { kind: 'choice', sceneId: 'p_camino', choiceId: 'rodear', label: 'Rodear por la orilla' },
  { kind: 'roll', dice: [4, 5], kept: [0, 1], mode: 'normal', total: 9, band: 'partial', fortuneSpent: 0, powerUsed: false },
  { kind: 'outcome', paragraphs: [{ text: 'Terminás el resbalón sentado en el río.' }] },
  { kind: 'scene', sceneId: 'p_vado', paragraphs: [{ text: 'Media legua río abajo el barro se acaba.' }], hashes: [] },
];

/** Un `Revelado` de mentira, para fijar cómo se porta la columna en cada momento del tipeo. */
function revelado(overrides: Partial<Revelado> = {}): Revelado {
  return {
    parrafosVisibles: 0,
    caracteresVisibles: 0,
    terminado: false,
    puedeSaltarLeido: false,
    avanzar: vi.fn(),
    saltarLeido: vi.fn(),
    ...overrides,
  };
}

describe('TextColumn', () => {
  it('es una región viva educada: polite y no atómica', () => {
    render(<TextColumn log={log} />);
    const columna = screen.getByTestId('columna-texto');
    expect(columna).toHaveAttribute('aria-live', 'polite');
    expect(columna).toHaveAttribute('aria-atomic', 'false');
  });

  it('mientras la máquina de escribir tipea, la región queda ocupada y el lector no deletrea', () => {
    // El nodo de texto del párrafo en curso cambia una vez por carácter, a 40 cps. Sin
    // `aria-busy`, la región viva reanuncia ese nodo en cada cambio y el lector de pantalla
    // termina leyendo "L", "La", "La c", "La cr"… en vez de la prosa.
    render(<TextColumn log={log} revelado={revelado({ terminado: false, caracteresVisibles: 4 })} />);
    expect(screen.getByTestId('columna-texto')).toHaveAttribute('aria-busy', 'true');
  });

  it('al terminar de revelar, la región se libera y recién ahí se anuncia el texto', () => {
    render(<TextColumn log={log} revelado={revelado({ terminado: true, parrafosVisibles: 1 })} />);
    expect(screen.getByTestId('columna-texto')).toHaveAttribute('aria-busy', 'false');
  });

  it('sin revelado (el fin, que no anima nada) la región nunca está ocupada', () => {
    render(<TextColumn log={log} />);
    expect(screen.getByTestId('columna-texto')).toHaveAttribute('aria-busy', 'false');
  });

  /**
   * La caja dibuja lo que escribió el ÚLTIMO PASO del jugador y nada más: la partida anterior
   * vive en el cajón del historial (tarea 3). El revelado sigue siendo el de `log[log.length-1]`,
   * y por eso sacar el scrollback de la pantalla no lo toca.
   */
  it('no dibuja la partida acumulada: la escena anterior y su elección quedan afuera', () => {
    const acumulado: LogEntry[] = [
      { kind: 'scene', sceneId: 'p_umbral', paragraphs: [{ text: 'Cruzás el vado.' }], hashes: [] },
      { kind: 'choice', sceneId: 'p_umbral', choiceId: 'seguir', label: 'Seguir hasta el molino' },
      { kind: 'scene', sceneId: 'p_molino', paragraphs: [{ text: 'El molino está a oscuras.' }], hashes: [] },
    ];
    render(<TextColumn log={acumulado} />);

    const columna = screen.getByTestId('columna-texto');
    expect(columna).toHaveTextContent('El molino está a oscuras.');
    expect(columna).not.toHaveTextContent('Cruzás el vado.');
    expect(columna).not.toHaveTextContent('Seguir hasta el molino');
  });

  /**
   * El desenlace de una tirada NO es nunca la última entrada del log: `choose` y `commitRoll`
   * escriben el 'outcome' y enseguida llaman a `enter()`, que apila la escena nueva en la misma
   * acción (`src/engine/resolve.ts`). O sea que "mostrar la última entrada" a secas deja fuera de
   * la pantalla toda la prosa de desenlaces: 335 de los 344 desenlaces de la campaña publicada
   * tienen texto, 9.809 palabras contadas sobre `campaign.scenes`. Por eso lo que la caja
   * muestra es el tramo final de prosa —lo que el último paso escribió—, que en la práctica es
   * el desenlace más la escena que abrió, y nunca más que eso porque el motor escribe una
   * 'choice' o un 'roll' antes de cada desenlace.
   */
  it('el desenlace de la tirada se lee junto a la escena que abrió, no solo en el historial', () => {
    render(<TextColumn log={conTirada} />);

    const columna = screen.getByTestId('columna-texto');
    expect(columna).toHaveTextContent('Terminás el resbalón sentado en el río.');
    expect(columna).toHaveTextContent('Media legua río abajo el barro se acaba.');
    // El tramo corta en el 'roll' y en la 'choice': ni los dados ni la opción elegida entran.
    expect(columna).not.toHaveTextContent('Rodear por la orilla');
    expect(columna).not.toHaveTextContent(S.log.dados);
    expect(columna).not.toHaveTextContent('El camino baja hacia el agua.');
  });

  it('el revelado sigue siendo el de la última entrada: el desenlace ya está entero cuando la escena arranca', () => {
    render(<TextColumn log={conTirada} revelado={revelado({ parrafosVisibles: 0, caracteresVisibles: 0 })} />);

    const columna = screen.getByTestId('columna-texto');
    expect(columna).toHaveTextContent('Terminás el resbalón sentado en el río.');
    expect(columna).not.toHaveTextContent('Media legua río abajo');
  });

  it('con el log vacío no rompe ni dibuja una entrada fantasma', () => {
    render(<TextColumn log={[]} />);
    expect(screen.getByTestId('columna-texto')).toHaveTextContent('');
  });
});
