/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CreacionScreen } from '@/ui/screens/CreacionScreen';
import { useStore } from '@/state/store';
import { CLASSES, TRAITS } from '@/content/catalog';
import { S } from '@/ui/strings.es';
import type { CreateCharacterInput } from '@/state/store';

/**
 * La pantalla de creación no evalúa reglas: pregunta al catálogo qué se puede
 * elegir y llama a `createCharacter` del store. Estos tests montan la pantalla
 * sola y espían esa acción.
 */
function espiarCreateCharacter(): ReturnType<typeof vi.fn> {
  const espia = vi.fn((_input: CreateCharacterInput) => 'id-nuevo');
  useStore.setState({ createCharacter: espia });
  return espia;
}

function siguiente(): HTMLElement {
  return screen.getByTestId('siguiente');
}

function avanzar(): void {
  fireEvent.click(siguiente());
}

describe('CreacionScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ characters: [], activeCharacterId: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('no deja avanzar del paso 1 sin elegir clase, y dice por qué', () => {
    render(<CreacionScreen />);

    expect(siguiente()).toBeDisabled();
    expect(screen.getByText(S.creacion.faltaClase)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('clase-guerrero'));

    expect(siguiente()).toBeEnabled();
    expect(screen.queryByText(S.creacion.faltaClase)).toBeNull();
  });

  it('la tarjeta de clase muestra el atributo que potencia, el Poder y la Debilidad', () => {
    render(<CreacionScreen />);

    const tarjeta = screen.getByTestId('clase-explorador');
    expect(tarjeta).toHaveTextContent(CLASSES.explorador.name);
    expect(tarjeta).toHaveTextContent(CLASSES.explorador.power.name);
    expect(tarjeta).toHaveTextContent(CLASSES.explorador.power.description);
    expect(tarjeta).toHaveTextContent(S.tags[CLASSES.explorador.weakness]);
  });

  it('no deja avanzar del paso 2 con el nombre vacío', () => {
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-mago'));
    avanzar();

    const nombre = screen.getByLabelText(S.creacion.nombreEtiqueta);
    expect(siguiente()).toBeEnabled(); // hay un nombre por defecto

    fireEvent.change(nombre, { target: { value: '   ' } });
    expect(siguiente()).toBeDisabled();
    expect(screen.getByText(S.creacion.faltaNombre)).toBeInTheDocument();
  });

  it('el paso 2 muestra primero los tres retratos de la clase y el resto con «ver todos»', () => {
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-clerigo'));
    avanzar();

    expect(screen.getByTestId('retrato-clerigo_01')).toBeInTheDocument();
    expect(screen.getByTestId('retrato-clerigo_03')).toBeInTheDocument();
    expect(screen.queryByTestId('retrato-mago_01')).toBeNull();

    fireEvent.click(screen.getByTestId('ver-todos'));
    expect(screen.getByTestId('retrato-mago_01')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^retrato-/)).toHaveLength(12);
  });

  it('los rasgos que chocan con la Debilidad de la clase quedan deshabilitados con el motivo a la vista', () => {
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-guerrero'));
    avanzar();
    avanzar();

    // Guerrero tiene Debilidad `sigilo`; Cazador furtivo es `sigilo`.
    const incompatible = screen.getByTestId('rasgo-cazador_furtivo');
    expect(incompatible).toBeDisabled();

    const motivo = S.creacion.motivoDebilidad(CLASSES.guerrero.name, S.tags.sigilo);
    expect(screen.getByText(motivo)).toBeInTheDocument();

    // El motivo se lee: está asociado al control, no solo pintado en gris.
    const idMotivo = incompatible.getAttribute('aria-describedby');
    expect(idMotivo).not.toBeNull();
    expect(document.getElementById(idMotivo ?? '')).toHaveTextContent(motivo);

    // Y el resto sigue disponible.
    expect(screen.getByTestId('rasgo-desertor')).toBeEnabled();
  });

  it('se eligen exactamente dos rasgos: con uno no avanza y el tercero queda deshabilitado con motivo', () => {
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-guerrero'));
    avanzar();
    avanzar();

    expect(siguiente()).toBeDisabled();
    expect(screen.getByText(S.creacion.faltanRasgos(2))).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('rasgo-desertor'));
    expect(siguiente()).toBeDisabled();
    expect(screen.getByText(S.creacion.faltanRasgos(1))).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('rasgo-contrabandista'));
    expect(siguiente()).toBeEnabled();
    expect(screen.getByTestId('rasgo-desertor')).toHaveAttribute('aria-pressed', 'true');

    // El tercero no se puede sumar, y la pantalla explica por qué.
    const tercero = screen.getByTestId('rasgo-hijo_de_molinero');
    expect(tercero).toBeDisabled();
    expect(screen.getAllByText(S.creacion.motivoDosRasgos).length).toBeGreaterThan(0);

    // Soltar uno vuelve a abrir el resto.
    fireEvent.click(screen.getByTestId('rasgo-contrabandista'));
    expect(screen.getByTestId('rasgo-hijo_de_molinero')).toBeEnabled();
    expect(siguiente()).toBeDisabled();
  });

  it('el paso 4 muestra los atributos y deja ordenar el reparto 2/1/1/0', () => {
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-guerrero'));
    avanzar();
    avanzar();
    fireEvent.click(screen.getByTestId('rasgo-desertor'));
    fireEvent.click(screen.getByTestId('rasgo-contrabandista'));
    avanzar();

    // Guerrero potencia Vigor: ese es el 2 y no se puede bajar a 0.
    expect(screen.getByTestId('atributo-vigor')).toHaveTextContent('2');
    expect(screen.queryByTestId('flojo-vigor')).toBeNull();

    fireEvent.click(screen.getByTestId('flojo-saber'));
    expect(screen.getByTestId('atributo-saber')).toHaveTextContent('0');
    expect(screen.getByTestId('atributo-astucia')).toHaveTextContent('1');
    expect(screen.getByTestId('atributo-presencia')).toHaveTextContent('1');
  });

  it('al confirmar llama a createCharacter con lo elegido y avisa al que la montó', () => {
    const espia = espiarCreateCharacter();
    const onCreado = vi.fn();
    render(<CreacionScreen onCreado={onCreado} />);

    fireEvent.click(screen.getByTestId('clase-explorador'));
    avanzar();

    fireEvent.change(screen.getByLabelText(S.creacion.nombreEtiqueta), { target: { value: 'Bruna' } });
    fireEvent.click(screen.getByTestId('retrato-explorador_02'));
    avanzar();

    fireEvent.click(screen.getByTestId('rasgo-cazador_furtivo'));
    fireEvent.click(screen.getByTestId('rasgo-aprendiz_de_escriba'));
    avanzar();

    fireEvent.click(screen.getByTestId('flojo-vigor'));
    fireEvent.click(screen.getByTestId('crear'));

    expect(espia).toHaveBeenCalledTimes(1);
    expect(espia).toHaveBeenCalledWith({
      name: 'Bruna',
      classId: 'explorador',
      portrait: 'explorador_02',
      traits: ['cazador_furtivo', 'aprendiz_de_escriba'],
      attrs: { vigor: 0, astucia: 2, saber: 1, presencia: 1 },
    });
    expect(onCreado).toHaveBeenCalledWith('id-nuevo');
  });

  it('volver desde el paso 1 avisa al que la montó; desde el paso 2 retrocede de paso', () => {
    const onCancelar = vi.fn();
    render(<CreacionScreen onCancelar={onCancelar} />);

    fireEvent.click(screen.getByTestId('volver'));
    expect(onCancelar).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('clase-mago'));
    avanzar();
    expect(screen.getByTestId('paso')).toHaveTextContent(S.creacion.paso(2, 4));

    fireEvent.click(screen.getByTestId('volver'));
    expect(screen.getByTestId('paso')).toHaveTextContent(S.creacion.paso(1, 4));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('cambiar de clase suelta el rasgo que pasó a ser incompatible', () => {
    const espia = espiarCreateCharacter();
    render(<CreacionScreen />);

    // Con Mago (Debilidad `fisico`), Desertor (`fisico`) está prohibido: se elige con Guerrero…
    fireEvent.click(screen.getByTestId('clase-guerrero'));
    avanzar();
    avanzar();
    fireEvent.click(screen.getByTestId('rasgo-desertor'));
    fireEvent.click(screen.getByTestId('rasgo-contrabandista'));

    // …y al volver al paso 1 y cambiar a Mago, Desertor deja de contar.
    fireEvent.click(screen.getByTestId('volver'));
    fireEvent.click(screen.getByTestId('volver'));
    fireEvent.click(screen.getByTestId('clase-mago'));
    avanzar();
    avanzar();

    expect(screen.getByTestId('rasgo-desertor')).toBeDisabled();
    expect(screen.getByTestId('rasgo-contrabandista')).toHaveAttribute('aria-pressed', 'true');
    expect(siguiente()).toBeDisabled();

    fireEvent.click(screen.getByTestId('rasgo-hijo_de_la_frontera'));
    avanzar();
    fireEvent.click(screen.getByTestId('crear'));

    expect(espia).toHaveBeenCalledTimes(1);
    const input = espia.mock.calls[0]?.[0] as CreateCharacterInput;
    expect(input.classId).toBe('mago');
    expect(input.traits).toEqual(['contrabandista', 'hijo_de_la_frontera']);
    expect(Object.keys(TRAITS)).toContain(input.traits[0]);
  });
});
