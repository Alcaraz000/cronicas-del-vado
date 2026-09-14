/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { LogEntry } from '@/engine/types';
import { useStore } from '@/state/store';
import { Historial } from '@/ui/components/Historial';
import { S } from '@/ui/strings.es';
import { minimal } from '../fixtures/campaigns/minimal';

/**
 * Una partida de tres escenas con todo lo que el log puede traer: prosa de escena, una elección,
 * una tirada con sus dados y el desenlace de esa tirada. Es lo que hasta esta tarea se veía
 * acumulado en la columna de la caja y ahora vive acá adentro.
 */
const log: LogEntry[] = [
  {
    kind: 'scene',
    sceneId: 'm_inicio',
    paragraphs: [
      { text: 'Llegás a un claro entre pinos.' },
      { speaker: 'm_guia', text: '—El risco está por ahí, si te animás.' },
    ],
    hashes: ['h0', 'h1'],
  },
  { kind: 'choice', sceneId: 'm_inicio', choiceId: 'trepar', label: 'Trepar el risco a pulso' },
  { kind: 'roll', dice: [4, 3], kept: [0, 1], mode: 'normal', total: 7, band: 'partial', fortuneSpent: 1, powerUsed: false },
  { kind: 'outcome', paragraphs: [{ text: 'Llegás arriba, pero una laja suelta te abre la mano.' }] },
  {
    kind: 'scene',
    sceneId: 'm_final',
    paragraphs: [{ speaker: 'm_guia', text: '—Te dije que se podía.' }],
    hashes: ['h2'],
  },
];

/** El cajón resuelve los nombres de PNJ contra la campaña del store, igual que la caja. */
function conCampana(): void {
  useStore.setState((s) => ({ ui: { ...s.ui, campaign: minimal } }));
}

describe('Historial', () => {
  beforeEach(() => {
    localStorage.clear();
    conCampana();
  });

  afterEach(() => {
    cleanup();
  });

  it('cerrado no dibuja nada', () => {
    render(<Historial log={log} abierto={false} onCerrar={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Llegás a un claro entre pinos.')).not.toBeInTheDocument();
  });

  it('abierto es el mismo cajón accesible que la Ficha: diálogo con nombre y Esc que cierra', () => {
    const onCerrar = vi.fn();
    render(<Historial log={log} abierto onCerrar={onCerrar} />);

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName(S.historial.titulo);
    // El foco entró al panel: es la trampa de `Cajon`, y es lo que hace que el cajón se pueda
    // cerrar con el teclado sin tocar el mouse.
    expect(dialogo.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledOnce();
  });

  it('muestra la partida entera: escenas, elecciones y tiradas, con el mismo formato de la caja', () => {
    render(<Historial log={log} abierto onCerrar={vi.fn()} />);

    const cajon = screen.getByTestId('historial');

    // La prosa de las dos escenas, incluida la PRIMERA, que es justo lo que la caja ya no muestra.
    expect(cajon).toHaveTextContent('Llegás a un claro entre pinos.');
    expect(cajon).toHaveTextContent('—Te dije que se podía.');
    // La elección, con su marca de guión, igual que en la columna.
    expect(cajon).toHaveTextContent('› Trepar el risco a pulso');
    // La tirada, con dados, total, banda y la Fortuna gastada.
    expect(cajon).toHaveTextContent(`${S.log.dados}: 4 · 3`);
    expect(cajon).toHaveTextContent(`${S.log.total} 7`);
    expect(cajon).toHaveTextContent(S.tirada.banda.partial);
    expect(cajon).toHaveTextContent(S.log.fortunaGastada(1));
    // Y el desenlace de esa tirada.
    expect(cajon).toHaveTextContent('Llegás arriba, pero una laja suelta te abre la mano.');
  });

  it('acá el nombre del hablante se ve: no hay placa que lo esté repitiendo', () => {
    // En la caja, el prefijo del párrafo que la placa nombra se esconde de la VISTA porque el
    // cartel ya lo dice. En el cajón no hay ninguna placa, así que el prefijo es lo único que
    // dice quién habló y tiene que quedarse entero — `Parrafos` sin `conPlaca` ya hace eso, y
    // esto lo fija para que nadie le pase la prop "por consistencia".
    render(<Historial log={log} abierto onCerrar={vi.fn()} />);

    const marcas = [...screen.getByTestId('historial').querySelectorAll('[data-hablante]')];
    expect(marcas).toHaveLength(2);
    expect(marcas.map((m) => m.getAttribute('data-hablante'))).toEqual(['propio', 'propio']);
    // Y con el nombre visible del PNJ, no su id.
    for (const marca of marcas) expect(marca).toHaveTextContent('El guía');
  });

  it('las entradas van en el orden en que pasaron, de la más vieja a la más nueva', () => {
    render(<Historial log={log} abierto onCerrar={vi.fn()} />);

    const texto = screen.getByTestId('historial').textContent ?? '';
    expect(texto.indexOf('Llegás a un claro entre pinos.')).toBeLessThan(texto.indexOf('Trepar el risco a pulso'));
    expect(texto.indexOf('Trepar el risco a pulso')).toBeLessThan(texto.indexOf('—Te dije que se podía.'));
  });

  it('con el log vacío lo dice en vez de abrir un cajón en blanco', () => {
    render(<Historial log={[]} abierto onCerrar={vi.fn()} />);

    expect(screen.getByText(S.historial.vacio)).toBeInTheDocument();
  });
});
