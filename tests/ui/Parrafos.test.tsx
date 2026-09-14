/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ResolvedParagraph } from '@/engine/types';
import { useStore } from '@/state/store';
import { Parrafos } from '@/ui/components/Parrafos';
import { minimal } from '../fixtures/campaigns/minimal';

const PRIMERO = 'Llegás al claro y la piedra plana sigue ahí.';
const DIALOGO = '—El risco está por ahí, si te animás.';

const dos: ResolvedParagraph[] = [{ text: PRIMERO }, { speaker: 'm_guia', text: DIALOGO }];

/** El nombre visible del guía sale de la campaña del store, nunca del id. */
const NOMBRE_DEL_GUIA = minimal.npcs.m_guia!.name;

describe('Parrafos', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState((s) => ({ ui: { ...s.ui, campaign: minimal } }));
  });

  afterEach(() => {
    cleanup();
  });

  it('sin `visibles` dibuja todos los párrafos enteros (así lo usa el fin, que no anima nada)', () => {
    render(<Parrafos parrafos={dos} />);

    expect(screen.getByText(PRIMERO)).toBeInTheDocument();
    expect(screen.getByText(DIALOGO)).toBeInTheDocument();
  });

  it('con 0 caracteres el párrafo en curso no se dibuja: ni el texto ni el nombre del hablante', () => {
    // Es la regla que evita el parpadeo feo del principio: un "El guía:" colgado sin una sola
    // letra de lo que dice, esperando a que la máquina de escribir arranque.
    render(<Parrafos parrafos={dos} visibles={1} caracteres={0} />);

    expect(screen.getByText(PRIMERO)).toBeInTheDocument();
    expect(screen.queryByText(DIALOGO)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(NOMBRE_DEL_GUIA);
  });

  it('con 1 carácter el nombre del hablante ya aparece entero, junto a esa primera letra', () => {
    render(<Parrafos parrafos={dos} visibles={1} caracteres={1} />);

    expect(document.body.textContent).toContain(NOMBRE_DEL_GUIA);
    expect(screen.getByText(DIALOGO.slice(0, 1))).toBeInTheDocument();
    // Y solo esa letra: el resto del diálogo todavía no está.
    expect(screen.queryByText(DIALOGO)).not.toBeInTheDocument();
  });

  it('`caracteres` se cuenta sobre el texto, no sobre el nombre del hablante', () => {
    // Si el nombre contara, con 3 caracteres se vería un pedazo del nombre y nada del texto.
    render(<Parrafos parrafos={dos} visibles={1} caracteres={3} />);

    expect(screen.getByText(DIALOGO.slice(0, 3))).toBeInTheDocument();
    expect(document.body.textContent).toContain(NOMBRE_DEL_GUIA);
  });

  it('muestra el nombre del PNJ, nunca su identificador', () => {
    render(<Parrafos parrafos={dos} />);

    expect(document.body.textContent).toContain(NOMBRE_DEL_GUIA);
    expect(document.body.textContent).not.toContain('m_guia');
  });

  /**
   * `conPlaca` es lo que decide si ALGÚN prefijo se puede esconder, y por defecto está apagado.
   * Es la garantía de `FinScreen` y del cajón del `Historial`: ahí no hay placa del hablante,
   * así que el prefijo es la única pista de quién habla y no puede perderse. Y no depende de qué
   * valor tenga el atributo —depende de que `"placa"` no aparezca nunca—, que es lo que lo hace
   * seguro cuando alguien reutilice `Parrafos` en otra pantalla.
   */
  it('sin `conPlaca` ningún prefijo se marca para esconder (el fin y el historial no tienen placa)', () => {
    const { container } = render(<Parrafos parrafos={dos} />);

    expect(container.querySelector("[data-hablante='placa']")).toBeNull();
    expect(container.querySelector("[data-hablante='propio']")).not.toBeNull();
  });

  it('con `conPlaca` se marca uno solo: el último dibujado con hablante, que es el que la placa dice', () => {
    const tres: ResolvedParagraph[] = [
      { speaker: 'm_guia', text: 'Primero habla el guía.' },
      { speaker: 'nadie', text: 'Después habla otro.' },
      { text: 'Y cierra la narración.' },
    ];
    const { container } = render(<Parrafos parrafos={tres} conPlaca />);

    const marcas = [...container.querySelectorAll('[data-hablante]')];
    expect(marcas.map((m) => m.getAttribute('data-hablante'))).toEqual(['propio', 'placa']);
  });

  it('un hablante que la campaña no conoce no rompe el párrafo', () => {
    // La rama defensiva de `nombres[p.speaker] ?? p.speaker`: preferible a no dibujar la línea.
    render(<Parrafos parrafos={[{ speaker: 'nadie', text: DIALOGO }]} />);

    expect(screen.getByText(DIALOGO)).toBeInTheDocument();
  });
});
