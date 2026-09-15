/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CreacionScreen } from '@/ui/screens/CreacionScreen';
import { useStore } from '@/state/store';
import { CLASSES, TRAITS } from '@/content/catalog';
import { S } from '@/ui/strings.es';
import { bloqueDeMedia, cuerpoBaseDe, reglasQueTocan, sinBloquesAnidados } from '../fixtures/css';
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

const CSS = readFileSync(resolve(process.cwd(), 'src/ui/screens/CreacionScreen.module.css'), 'utf8');

/**
 * `cuerpoBaseDe` y `reglasQueTocan` vivían acá y **se subieron a `tests/fixtures/css.ts`** en el
 * cierre de la fase del escalado: eran dos de los cinco helpers de CSS que tres tareas habían
 * escrito por separado porque no podían tocar el fixture compartido con otro agente en el árbol.
 * El porqué de cada uno quedó en el docblock del fixture, junto con el endurecimiento del escaneo
 * de reglas-`@` que allá se les agregó.
 */

/** El valor de un `clamp(piso, preferido, techo)` partido en sus tres partes. */
function partirClamp(valor: string): { piso: string; preferido: string; techo: string } | null {
  const partes = /clamp\(([^,]+),([^,]+),([^)]+)\)/.exec(valor);
  if (partes === null) return null;
  return { piso: partes[1]?.trim() ?? '', preferido: partes[2]?.trim() ?? '', techo: partes[3]?.trim() ?? '' };
}

/** Llegar al paso 3 (los dos rasgos) con la clase pedida ya elegida. */
function irAlPaso3(clase: string): void {
  fireEvent.click(screen.getByTestId(`clase-${clase}`));
  avanzar();
  avanzar();
}

/**
 * Una opción bloqueada. Reemplaza al `toBeDisabled()` que había: desde que el bloqueo es
 * `aria-disabled` (y no el `disabled` nativo, que saca el control del orden de tabulación),
 * `toBeDisabled()` no lo ve. Se exige LAS DOS cosas —que no esté deshabilitado de verdad y que
 * esté marcado como bloqueado— porque cada una sola pasa en verde con el bug de la otra.
 */
function esperarBloqueada(el: HTMLElement): void {
  expect(el).not.toBeDisabled();
  expect(el).toHaveAttribute('aria-disabled', 'true');
}

function esperarDisponible(el: HTMLElement): void {
  expect(el).toBeEnabled();
  expect(el).not.toHaveAttribute('aria-disabled', 'true');
}

describe('CreacionScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState((s) => ({
      characters: [],
      activeCharacterId: null,
      ui: { ...s.ui, screen: 'creacion' },
    }));
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Tarea 6 (Fase H): cada paso reemplaza el `<main>` entero (no es un router de pantallas,
   * pero el efecto es el mismo), así que el control que tenía el foco en el paso anterior
   * desaparece y el foco cae a `<body>`, invisible. El subtítulo del paso recibe el foco por
   * programa al montar Y cada vez que cambia de paso (ver `useEnfocarAlEntrar`).
   */
  it('lleva el foco al subtítulo del paso, al montar y en cada cambio de paso', () => {
    render(<CreacionScreen />);

    expect(screen.getByRole('heading', { level: 2, name: S.creacion.titulos[1] })).toHaveFocus();

    fireEvent.click(screen.getByTestId('clase-guerrero'));
    avanzar();
    expect(screen.getByRole('heading', { level: 2, name: S.creacion.titulos[2] })).toHaveFocus();

    avanzar();
    expect(screen.getByRole('heading', { level: 2, name: S.creacion.titulos[3] })).toHaveFocus();
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
    esperarBloqueada(incompatible);

    const motivo = S.creacion.motivoDebilidad(CLASSES.guerrero.name, S.tags.sigilo);
    expect(screen.getByText(motivo)).toBeInTheDocument();

    // El motivo se lee: está asociado al control, no solo pintado en gris.
    const idMotivo = incompatible.getAttribute('aria-describedby');
    expect(idMotivo).not.toBeNull();
    expect(document.getElementById(idMotivo ?? '')).toHaveTextContent(motivo);

    // Y el resto sigue disponible.
    esperarDisponible(screen.getByTestId('rasgo-desertor'));
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
    esperarBloqueada(tercero);
    expect(screen.getAllByText(S.creacion.motivoDosRasgos).length).toBeGreaterThan(0);

    // Soltar uno vuelve a abrir el resto.
    fireEvent.click(screen.getByTestId('rasgo-contrabandista'));
    esperarDisponible(screen.getByTestId('rasgo-hijo_de_molinero'));
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

  it('al confirmar llama a createCharacter con lo elegido y sale al hub', () => {
    const espia = espiarCreateCharacter();
    render(<CreacionScreen />);

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
    expect(useStore.getState().ui.screen).toBe('hub');
  });

  it('volver desde el paso 1 sale de la pantalla; desde el paso 2 retrocede de paso', () => {
    render(<CreacionScreen />);

    // Sin personajes todavía, salir de la creación devuelve al inicio.
    fireEvent.click(screen.getByTestId('volver'));
    expect(useStore.getState().ui.screen).toBe('inicio');

    useStore.setState((s) => ({ ui: { ...s.ui, screen: 'creacion' } }));
    fireEvent.click(screen.getByTestId('clase-mago'));
    avanzar();
    expect(screen.getByTestId('paso')).toHaveTextContent(S.creacion.paso(2, 4));

    fireEvent.click(screen.getByTestId('volver'));
    expect(screen.getByTestId('paso')).toHaveTextContent(S.creacion.paso(1, 4));
    expect(useStore.getState().ui.screen).toBe('creacion');
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

    esperarBloqueada(screen.getByTestId('rasgo-desertor'));
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

  it('muestra los retratos reales de la clase y del resto, y el del resumen final', async () => {
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-clerigo'));
    avanzar();

    // Los tres retratos de la clase elegida ya son arte real, no cajas grises.
    const clerigo01 = await screen.findByAltText(S.creacion.retratoEtiqueta('clerigo_01'));
    expect(clerigo01.tagName).toBe('IMG');
    expect(clerigo01.getAttribute('src')).toMatch(/clerigo_01/);

    fireEvent.click(screen.getByTestId('ver-todos'));
    const mago01 = await screen.findByAltText(S.creacion.retratoEtiqueta('mago_01'));
    expect(mago01.tagName).toBe('IMG');

    fireEvent.click(screen.getByTestId('retrato-clerigo_02'));
    avanzar();

    // Clérigo tiene Debilidad `engano`; estos dos rasgos no chocan con ella.
    fireEvent.click(screen.getByTestId('rasgo-hijo_de_la_frontera'));
    fireEvent.click(screen.getByTestId('rasgo-criado_en_el_templo'));
    avanzar();

    // Paso 4: el resumen usa el retrato elegido, también como imagen real.
    const resumen = await screen.findByAltText(S.creacion.retratoEtiqueta('clerigo_02'));
    expect(resumen.tagName).toBe('IMG');
  });
});

/**
 * Los CINCO bugs medidos —los cuatro del brief más el `all: unset` de `.retrato`, que era el mismo
 * y estaba latente—. No son cosmética: los dos primeros son la causa mecánica de que la pantalla se
 * vea rota (las tarjetas se pisan), el siguiente le muestra al jugador el nombre de un archivo, y
 * el último deja a quien juega con teclado sin forma de enterarse de por qué una opción está
 * bloqueada.
 */
describe('CreacionScreen · los cinco bugs medidos', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState((s) => ({
      characters: [],
      activeCharacterId: null,
      ui: { ...s.ui, screen: 'creacion' },
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('la tarjeta respeta el box-sizing global y no desborda su celda', () => {
    // `all: unset` pisa el `box-sizing: border-box` global de tokens.css:180-185 y devuelve la tarjeta
    // a content-box. Con `height:100%` + 12px de relleno por lado + 1px de borde, el botón
    // desbordaba su celda 26,0px EXACTOS (12+12+1+1 = 26) y con `gap:12px` se metía 14,0px DENTRO
    // de la tarjeta de la fila siguiente. Medido por DOM en las cuatro medidas de ventana
    // (1919x905, 1280x800, 2560x1440, 375x812): 26,0 px en todas, en los pasos 1 y 3.
    const tarjeta = cuerpoBaseDe(CSS, '.tarjeta') ?? '';
    expect(tarjeta, '.tarjeta no tiene regla propia').not.toBe('');
    const posUnset = tarjeta.indexOf('all:');
    const posBox = tarjeta.indexOf('box-sizing:');
    expect(posBox, '.tarjeta no declara box-sizing').toBeGreaterThan(-1);
    if (posUnset > -1) {
      expect(posBox, 'box-sizing va ANTES de `all: unset`, así que no lo repara').toBeGreaterThan(posUnset);
    }
    expect(tarjeta).toMatch(/box-sizing\s*:\s*border-box/);
  });

  it('el retrato de la galería tampoco vuelve a content-box', () => {
    // `.retrato` arrastra el MISMO `all: unset` que `.tarjeta`. No desbordaba porque no tiene
    // `height: 100%`, así que el bug estaba ahí latente: la primera vez que la galería pase a una
    // grilla con celdas de alto igual, vuelve. Se arregla de una vez.
    const retrato = cuerpoBaseDe(CSS, '.retrato') ?? '';
    expect(retrato, '.retrato no tiene regla propia').not.toBe('');
    const posUnset = retrato.indexOf('all:');
    const posBox = retrato.indexOf('box-sizing:');
    expect(posBox, '.retrato no declara box-sizing').toBeGreaterThan(-1);
    if (posUnset > -1) expect(posBox).toBeGreaterThan(posUnset);
    expect(retrato).toMatch(/box-sizing\s*:\s*border-box/);
  });

  it('el motivo de un rasgo bloqueado vive DENTRO de la tarjeta, no como hermano del botón', () => {
    // Como hermano del <button> y con el botón ocupando el 100% (+26px), el <p> caía fuera del
    // <li>: medido por DOM, 88,5px de texto colgando a 1280x800 y 96,1px a 1919x905. Es el
    // "No se puede: Engaño es la Debilidad del Clérigo..." suelto de la captura.
    render(<CreacionScreen />);
    irAlPaso3('clerigo');

    const motivo = screen.getByText(/No se puede/i);
    const tarjeta = motivo.closest('button, [role="button"]');
    expect(tarjeta, 'el motivo quedó fuera de la tarjeta que explica').not.toBeNull();
    expect(tarjeta).toHaveAttribute('data-testid', 'rasgo-contrabandista');
  });

  it('el id del archivo del retrato no es texto visible para el jugador', async () => {
    // Se pintaba `Retrato clerigo 01` como texto A LA VISTA debajo de cada miniatura: es el id del
    // archivo, no un nombre. Tiene que seguir siendo el nombre accesible del control.
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-clerigo'));
    avanzar();

    // Se esperan los TRES: mientras una imagen no resolvió, `Imagen` cae a `Placeholder`, que SÍ
    // pinta su etiqueta (es una caja gris que dice qué falta, y eso está bien). Esperar solo la
    // primera dejaba el caso a merced del orden en que resolvían las otras dos.
    for (const id of ['clerigo_01', 'clerigo_02', 'clerigo_03']) {
      await screen.findByAltText(S.creacion.retratoEtiqueta(id));
    }

    expect(screen.queryByText(/^Retrato \w+ \d+$/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Retrato clerigo 01/i }).length).toBeGreaterThan(0);
  });

  it('una opción bloqueada se puede enfocar con el teclado y dice por qué', () => {
    // Con `disabled` nativo el botón sale del orden de tabulación, así que un jugador de teclado
    // NUNCA lo enfoca y por lo tanto nunca escucha el `aria-describedby` que explica el bloqueo.
    // Es un callejón sin salida de accesibilidad, no un detalle estético.
    render(<CreacionScreen />);
    irAlPaso3('clerigo'); // Clérigo tiene Debilidad `engano`; Contrabandista es `engano`.

    const bloqueada = screen.getByRole('button', { name: /Contrabandista/i });
    expect(bloqueada).not.toBeDisabled();
    expect(bloqueada).toHaveAttribute('aria-disabled', 'true');
    bloqueada.focus();
    expect(bloqueada).toHaveFocus();
    expect(bloqueada).toHaveAccessibleDescription(/Debilidad/i);

    // Y enfocable no quiere decir elegible: la regla del juego no se movió.
    fireEvent.click(bloqueada);
    expect(bloqueada).toHaveAttribute('aria-pressed', 'false');
  });

  it('el motivo de cupo aparece UNA vez, no seis', () => {
    // Con dos rasgos elegidos, los otros seis pintaban cada uno su propio párrafo idéntico.
    // El caso de más arriba ("se eligen exactamente dos rasgos...") usa
    // `getAllByText(...).length > 0`, que TOLERA las seis repeticiones: por eso hace falta este
    // además de aquel.
    render(<CreacionScreen />);
    irAlPaso3('guerrero');
    fireEvent.click(screen.getByTestId('rasgo-desertor'));
    fireEvent.click(screen.getByTestId('rasgo-contrabandista'));

    expect(screen.getAllByText(/Ya elegiste dos rasgos/i)).toHaveLength(1);

    // Y decirlo una sola vez no puede costar la asociación: los seis bloqueados por cupo apuntan
    // al MISMO párrafo con aria-describedby.
    expect(screen.getByTestId('rasgo-hijo_de_molinero')).toHaveAccessibleDescription(/Ya elegiste dos rasgos/i);
    expect(screen.getByTestId('rasgo-aprendiz_de_escriba')).toHaveAccessibleDescription(/Ya elegiste dos rasgos/i);
  });
});

/**
 * El rediseño: una pregunta por pantalla, con el arte grande. Lo que estos casos fijan es lo que
 * ningún test miraba y por eso se pudo romper en silencio.
 */
describe('CreacionScreen · una pregunta por pantalla', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState((s) => ({
      characters: [],
      activeCharacterId: null,
      ui: { ...s.ui, screen: 'creacion' },
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('el título del paso se imprime UNA sola vez', () => {
    // Estaba dos veces y a dos líneas de distancia: en la línea "Paso 1 de 4 · Elegí tu clase" y
    // otra vez como <h2>. Se cuenta sobre el texto del documento y no con getAllByText porque
    // este último cuenta también a los contenedores que heredan el texto del hijo.
    render(<CreacionScreen />);
    const veces = (document.body.textContent ?? '').split(S.creacion.titulos[1]).length - 1;
    expect(veces, 'el título del paso aparece más de una vez').toBe(1);
  });

  it('la barra de progreso pinta exactamente lo que anuncia', () => {
    // Pintaba 25 % en el paso 1 mientras `aria-valuenow={1}` con `aria-valuemin={1}` es el mínimo,
    // o sea 0 %: lo que se ve y lo que se anuncia decían cosas distintas.
    render(<CreacionScreen />);
    const barra = screen.getByRole('progressbar');
    const min = Number(barra.getAttribute('aria-valuemin'));
    const max = Number(barra.getAttribute('aria-valuemax'));
    const ahora = Number(barra.getAttribute('aria-valuenow'));
    expect(max).toBeGreaterThan(min);

    const avance = barra.firstElementChild as HTMLElement | null;
    expect(avance, 'la barra no tiene el elemento que pinta el avance').not.toBeNull();
    const esperado = ((ahora - min) / (max - min)) * 100;
    expect(avance?.style.width).toBe(`${String(esperado)}%`);
  });

  it('los cuatro tipos de mensaje se distinguen entre sí, no solo por el tamaño', () => {
    // Una regla dura del juego ("Engaño es la Debilidad del Clérigo"), un aviso de cupo ("ya
    // elegiste dos"), lo que falta para seguir y el texto de ayuda usaban la MISMA itálica ámbar
    // de 13 px. Cuatro cosas distintas que se ven iguales no informan nada.
    const tipos = ['.ayuda', '.pendiente', '.cupo', '.regla'];
    const colores = tipos.map((tipo) => {
      const cuerpo = cuerpoBaseDe(CSS, tipo) ?? '';
      expect(cuerpo, `${tipo} no tiene regla propia`).not.toBe('');
      const color = /(?:^|[\s;])color:\s*([^;]+)/.exec(cuerpo)?.[1]?.trim() ?? '';
      expect(color, `${tipo} no declara color propio`).not.toBe('');
      return color;
    });
    expect(new Set(colores).size, `dos tipos de mensaje comparten color: ${colores.join(' | ')}`).toBe(tipos.length);
  });

  it('los retratos dejan de estar topeados en los 160 px de Imagen.module.css', async () => {
    // `Imagen.module.css` le pone `max-width: 160px` a TODO `[data-aspect='3:4']`. Esa regla se
    // escribió acá, para las miniaturas de la creación, y es la que deja los retratos de 900x1200
    // en 160 px en un monitor de 2560. Se anula desde afuera, igual que hace el hub con la
    // portada, y con un selector que gane por especificidad: `.marco[data-aspect='3:4']` pesa
    // (0,2,0), así que hace falta (0,3,0) para no depender del orden de importación, que ningún
    // CSS Module garantiza.
    const imagen = readFileSync(resolve(process.cwd(), 'src/ui/components/Imagen.module.css'), 'utf8');
    expect(cuerpoBaseDe(imagen, ".marco[data-aspect='3:4']") ?? '').toMatch(/max-width:\s*160px/);

    // `[data-aspect` sin cerrar el corchete a propósito: engancha tanto al `[data-aspect='3:4']`
    // de los cuadros como al `[data-aspect]` pelado del fondo a sangre.
    const reglas = reglasQueTocan(CSS, '[data-aspect');
    expect(reglas.length, 'la creación no anula el tope de 160 px en ninguna regla').toBeGreaterThan(0);
    for (const { selector, cuerpo } of reglas) {
      const clases = (selector.match(/\.[A-Za-z][\w-]*/g) ?? []).length;
      expect(clases, `«${selector}» no le gana a (0,2,0): le faltan clases`).toBeGreaterThanOrEqual(2);
      expect(cuerpo, `«${selector}» no toca el max-width, que es el tope que hay que anular`).toMatch(/max-width/);
    }

    // Y la que importa es la del RETRATO, no la del fondo a sangre: borrar la del retrato y dejar
    // la del fondo pasaba este caso en verde (probado mutando). Lo que la distingue es que el tope
    // del retrato sale de `--alto-retrato` y no de un número escrito a mano.
    const cap = reglas.find(({ cuerpo }) => cuerpo.includes('--alto-retrato'));
    expect(cap, 'ninguna regla acota el retrato contra --alto-retrato').toBeDefined();
    expect(cap?.cuerpo).toMatch(/max-width:\s*min\(/);

    // Contar clases dice cuánto PESA el selector, no a qué llega. Con `.pantalla .arteQueNoExiste >
    // [data-aspect='3:4']` este caso quedaba verde igual (mutación del revisor). Se comprueba
    // contra el DOM de verdad: en el entorno de test los CSS Modules devuelven el nombre pelado de
    // la clase, así que el selector del archivo se puede correr tal cual sobre lo renderizado.
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-clerigo'));
    avanzar();
    await screen.findByAltText(S.creacion.retratoEtiqueta('clerigo_01'));

    for (const { selector } of reglas) {
      expect(
        document.querySelectorAll(selector).length,
        `«${selector}» no alcanza a ningún elemento: pesa lo suficiente pero no matchea`,
      ).toBeGreaterThan(0);
    }
  });

  it('el arte de fondo es un 16:9 de lugar, no el retrato que se está eligiendo', async () => {
    // RULING de la revisión. El primer intento ponía a sangre el retrato elegido, y eso: repetía
    // el sujeto que ya está adelante y grande (en el paso 2 el fondo contestaba la pregunta), y
    // volvía a ser la cabeza flotante que la tarea 2 midió y trató como defecto en el sprite. A
    // 1919x905 un 3:4 a sangre deja ver el 35,4 % de arriba del archivo y un 16:9, el 83,8 %.
    render(<CreacionScreen />);
    const fondo = document.querySelector('.fondo');
    expect(fondo, 'la pantalla no dibuja arte de fondo').not.toBeNull();
    expect(fondo?.firstElementChild?.getAttribute('data-aspect'), 'el fondo a sangre volvió a ser un 3:4').toBe(
      '16:9',
    );

    // Y no cambia con lo que el jugador elige: es una constante de pantalla, porque la creación
    // ocurre antes de elegir campaña y acá no hay `meta.cover` que leer.
    const antes = (await screen.findByAltText('')).getAttribute('src');
    fireEvent.click(screen.getByTestId('clase-clerigo'));
    avanzar();
    expect((await screen.findByAltText('')).getAttribute('src')).toBe(antes);
  });

  it('el velo existe y se arma con los tokens de capa', () => {
    // De él cuelga TODO el contraste de la pantalla: el título del paso, la pregunta y los dos
    // párrafos del pie se leen contra el arte gracias a él más su capa propia, y la cuenta está
    // escrita en el archivo. Se podía borrar entero con los 1173 tests en verde.
    const velo = cuerpoBaseDe(CSS, '.velo') ?? '';
    expect(velo, '.velo no tiene regla propia').not.toBe('');
    expect(velo, 'el velo no cubre la pantalla').toMatch(/position:\s*fixed/);
    expect(velo, 'el velo se comería los clics').toMatch(/pointer-events:\s*none/);
    expect(velo, 'el velo no es un degradado de las capas de la paleta').toMatch(
      /linear-gradient\([^)]*var\(--capa-/,
    );

    // Y se dibuja de verdad, con el arte debajo y el contenido encima.
    render(<CreacionScreen />);
    const pantalla = document.querySelector('.pantalla');
    expect(pantalla?.querySelector('.velo'), 'la pantalla no dibuja el velo').not.toBeNull();
    expect(pantalla?.querySelector('.fondo'), 'la pantalla no dibuja el arte de fondo').not.toBeNull();
  });

  it('los dos párrafos del pie llevan capa propia: apoyan contra el arte', () => {
    // `.pie` no es un panel. Medido sobre el píxel compuesto de una captura a 1919x905 con el arte
    // reemplazado por blanco puro: con el velo solo, `--color-aviso` daba 3,77:1 y
    // `--color-peligro-texto` 3,03:1, los dos por debajo de 4,5:1; con `--capa-cromo` encima suben
    // a 6,36:1 y 5,10:1. La cuenta entera está en el comentario del velo.
    //
    // **Se busca en la hoja SIN sus bloques `@`, y ahí está el filo del caso.** `reglasQueTocan`
    // barre la hoja entera, así que con la hoja cruda mover `background: var(--capa-cromo)` de la
    // regla base al bloque de teléfono dejaba los 28 casos en verde **con los dos párrafos por
    // debajo de AA justo en el monitor donde esta fase se verifica**: la medición del contraste se
    // tomó a 1919x905 y el bloque de teléfono no aplica ahí. La capa tiene que estar en la BASE,
    // que es la que vale en todas las ventanas.
    const base = sinBloquesAnidados(CSS);
    for (const clase of ['.pendiente', '.error']) {
      const reglas = reglasQueTocan(base, clase).map(({ cuerpo }) => cuerpo);
      expect(reglas.length, `${clase} no tiene ninguna regla base`).toBeGreaterThan(0);
      expect(reglas.join('\n'), `${clase} apoya contra el arte sin capa propia`).toMatch(
        /background:\s*var\(--capa-/,
      );
    }
  });

  it('el tamaño del retrato sigue a la ventana y no son píxeles clavados', () => {
    // El retrato es el sujeto de la pantalla: si se fija en px, vuelve a ser una miniatura en un
    // monitor grande y a no entrar en uno chico. Se mide con la misma unidad que el resto de la
    // geometría del juego (`vh`, ver tokens.css) y acotado por los dos lados con clamp().
    const declaraciones = [...CSS.matchAll(/--alto-retrato:\s*([^;]+);/g)].map(([, v = '']) => v.trim());
    expect(declaraciones.length, 'nadie declara --alto-retrato').toBeGreaterThan(0);
    for (const valor of declaraciones) {
      expect(valor, `--alto-retrato: ${valor} no está acotado con clamp()`).toMatch(/clamp\(/);
      expect(valor, `--alto-retrato: ${valor} no sigue a la ventana`).toMatch(/\d(?:\.\d+)?vh\b/);

      // Banda de cordura, como la que la tarea 1 le puso a `--ancho-prosa`: sin ella,
      // `clamp(1px, 0.1vh, 2px)` pasaba el caso con las tres partes en su lugar y el retrato
      // reducido a un punto. Los bordes salen de lo que la pantalla puede sostener: por debajo de
      // 120 px el cuadro es más chico que la miniatura de 160 que esta tarea vino a agrandar, y
      // por arriba de 900 px no entra en ninguna de las cuatro ventanas que se verifican.
      const partes = partirClamp(valor);
      expect(partes, `--alto-retrato: ${valor} no se pudo partir`).not.toBeNull();
      const piso = Number(/^([\d.]+)px$/.exec(partes?.piso ?? '')?.[1]);
      const techo = Number(/^([\d.]+)px$/.exec(partes?.techo ?? '')?.[1]);
      const vh = Number(/^([\d.]+)vh$/.exec(partes?.preferido ?? '')?.[1]);
      expect(piso, `el piso de ${valor} no es un px pelado`).toBeGreaterThanOrEqual(120);
      expect(techo, `el techo de ${valor} deja el cuadro fuera de una ventana de 1440`).toBeLessThanOrEqual(900);
      expect(techo, `el techo de ${valor} está por debajo de su piso`).toBeGreaterThan(piso);
      // 15vh de 800 son 120 px y 60vh de 905 son 543: fuera de esa banda no hay diseño posible.
      expect(vh, `${valor} casi no sigue a la ventana`).toBeGreaterThanOrEqual(15);
      expect(vh, `${valor} se come la ventana entera`).toBeLessThanOrEqual(60);
    }
  });

  it('la pantalla deja de ser la única del juego sin una sola regla @media', () => {
    // Los cuatro pasos vivían en una columna de 720 px centrada, igual en un teléfono que en un
    // monitor de 2560: a 1919x905 eso deja 1199 px (62,5 %) de margen muerto, medido por DOM.
    const telefono = bloqueDeMedia(CSS, 'media (max-width: 800px)');
    expect(telefono.trim(), 'no hay bloque de teléfono').not.toBe('');

    // `toMatch(/@media[^{]*min-width/)` NO alcanza: `@media not all and (min-width: 1000px)` lo
    // satisface y no aplica nunca. Es la misma familia que el `/flex-direction:\s*row/` que
    // aceptaba `row-reverse` (tarea 2) y el `/\brem\b/` que no veía `3.5rem` (tarea 1). Se exige
    // un bloque sin negar Y que reparta de verdad en dos columnas.
    const anchas = [...CSS.matchAll(/@(media[^{]*min-width[^{]*)\{/g)]
      .map(([, prelusio = '']) => prelusio)
      .filter((p) => !/\bnot\b/.test(p))
      // Y tampoco vale un umbral que no se alcanza nunca: `@media (min-width: 99999px)` pasaba el
      // filtro de la negación y no aplica en ninguna pantalla. El techo es 1920, que es el monitor
      // de Gabriel y la medida con la que se verifica esta fase.
      .filter((p) => {
        const px = Number(/min-width:\s*(\d+)px/.exec(p)?.[1]);
        return Number.isFinite(px) && px >= 600 && px <= 1920;
      });
    expect(anchas.length, 'las reglas de pantalla ancha están negadas, no existen o piden un ancho imposible').toBeGreaterThan(0);

    // Y lo que tiene que pasar en pantalla ancha es CONCRETO: la identidad (el retrato grande, el
    // nombre, la clase) al lado de la pregunta y no encima. Pedir un `grid-template-columns`
    // cualquiera tampoco alcanzaba: con la regla de `.conArte` negada, la del paso 2 sola dejaba
    // el caso en verde (probado mutando).
    const reparto = anchas.map((p) => bloqueDeMedia(CSS, p)).join('\n');
    expect(reparto, '.conArte no se reparte en dos columnas en ninguna pantalla ancha').toMatch(
      /\.conArte\s*\{[^}]*grid-template-columns/,
    );

    // El bloque de teléfono tiene que REPETIR el selector con su atributo. Las media queries no
    // suman especificidad, así que `.tarjetas[data-paso='1']` (0,2,0) le gana a `.tarjetas`
    // (0,1,0) esté donde esté: sin esa línea, en el teléfono el paso 1 se queda con tarjetas del
    // ancho del cuadro y el texto en una tira. Es la misma trampa que mordió en la tarea 2 con
    // `.acciones[data-tirada='true']`, y borrarla dejaba los 1173 tests en verde.
    expect(telefono, "el bloque de teléfono no repite `.tarjetas[data-paso='1']`, y la regla base no le gana").toMatch(
      /\.tarjetas\[data-paso='1'\]\s*\{[^}]*grid-template-columns/,
    );
  });

  it('el paso 3 tiene arte: el retrato elegido acompaña a la pregunta de los rasgos', async () => {
    // Eran ocho cajitas de texto en una página de 1920 px. El arte no se inventa: es el retrato
    // que el jugador acaba de elegir en el paso 2.
    render(<CreacionScreen />);
    fireEvent.click(screen.getByTestId('clase-clerigo'));
    avanzar();
    fireEvent.click(screen.getByTestId('retrato-clerigo_02'));
    avanzar();

    expect(screen.getByRole('heading', { level: 2, name: S.creacion.titulos[3] })).toBeInTheDocument();
    const retrato = await screen.findByAltText(S.creacion.retratoEtiqueta('clerigo_02'));
    expect(retrato.tagName).toBe('IMG');
  });
});
