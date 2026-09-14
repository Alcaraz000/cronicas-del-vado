/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CreacionScreen } from '@/ui/screens/CreacionScreen';
import { useStore } from '@/state/store';
import { CLASSES, TRAITS } from '@/content/catalog';
import { S } from '@/ui/strings.es';
import { bloqueDeMedia, cuerpoDe } from '../fixtures/css';
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
 * Cuerpo de la regla BASE de un selector: la que está en el nivel de arriba del archivo, fuera de
 * todo `@media`.
 *
 * `cuerpoDe()` devuelve la PRIMERA regla cuyo selector coincide, y su regex no distingue niveles:
 * una regla escrita adentro de un `@media` coincide igual. Con eso, un `toMatch()` sobre `.tarjeta`
 * puede pasar en verde contra la versión de teléfono mientras la base dice otra cosa —y al revés—.
 * Es la cuarta forma de test que no muerde que aparece en esta fase (las otras tres: `/\brem\b/`
 * contra `3.5rem`, `/flex-direction:\s*row/` contra `row-reverse`, y el cuerpo con comentarios
 * adentro). Se corta acá borrando los bloques anidados antes de buscar.
 */
function sinBloquesAnidados(css: string): string {
  let salida = '';
  let i = 0;
  while (i < css.length) {
    if (css[i] !== '@') {
      salida += css[i];
      i += 1;
      continue;
    }
    const apertura = css.indexOf('{', i);
    if (apertura === -1) break;
    let profundidad = 0;
    let fin = apertura;
    for (; fin < css.length; fin++) {
      if (css[fin] === '{') profundidad += 1;
      else if (css[fin] === '}') {
        profundidad -= 1;
        if (profundidad === 0) break;
      }
    }
    i = fin + 1;
  }
  return salida;
}

function cuerpoBaseDe(css: string, selector: string): string | null {
  return cuerpoDe(sinBloquesAnidados(css), selector);
}

/** Las reglas (selector + cuerpo) de una hoja cuyo selector contiene `fragmento`. */
function reglasQueTocan(css: string, fragmento: string): { selector: string; cuerpo: string }[] {
  const reglas: { selector: string; cuerpo: string }[] = [];
  for (const [, sel = '', cuerpo = ''] of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const limpio = sel.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (limpio.includes(fragmento)) reglas.push({ selector: limpio, cuerpo });
  }
  return reglas;
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
 * Los cuatro bugs medidos en el spec §0.4 y en el diagnóstico de esta fase. No son cosmética: los
 * dos primeros son la causa mecánica de que la pantalla se vea rota (las tarjetas se pisan), el
 * tercero le muestra al jugador el nombre de un archivo, y el cuarto deja a quien juega con teclado
 * sin forma de enterarse de por qué una opción está bloqueada.
 */
describe('CreacionScreen · los cuatro bugs medidos', () => {
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
    // `all: unset` pisa el `*{box-sizing:border-box}` de tokens.css:178-182 y devuelve la tarjeta
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

  it('los retratos dejan de estar topeados en los 160 px de Imagen.module.css', () => {
    // `Imagen.module.css` le pone `max-width: 160px` a TODO `[data-aspect='3:4']`. Esa regla se
    // escribió acá, para las miniaturas de la creación, y es la que deja los retratos de 900x1200
    // en 160 px en un monitor de 2560. Se anula desde afuera, igual que hace el hub con la
    // portada, y con un selector que gane por especificidad: `.marco[data-aspect='3:4']` pesa
    // (0,2,0), así que hace falta (0,3,0) para no depender del orden de importación, que ningún
    // CSS Module garantiza.
    const imagen = readFileSync(resolve(process.cwd(), 'src/ui/components/Imagen.module.css'), 'utf8');
    expect(cuerpoBaseDe(imagen, ".marco[data-aspect='3:4']") ?? '').toMatch(/max-width:\s*160px/);

    const reglas = reglasQueTocan(CSS, "[data-aspect='3:4']");
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
      .filter((p) => !/\bnot\b/.test(p));
    expect(anchas.length, 'las reglas de pantalla ancha están negadas o no existen').toBeGreaterThan(0);

    // Y lo que tiene que pasar en pantalla ancha es CONCRETO: la identidad (el retrato grande, el
    // nombre, la clase) al lado de la pregunta y no encima. Pedir un `grid-template-columns`
    // cualquiera tampoco alcanzaba: con la regla de `.conArte` negada, la del paso 2 sola dejaba
    // el caso en verde (probado mutando).
    const reparto = anchas.map((p) => bloqueDeMedia(CSS, p)).join('\n');
    expect(reparto, '.conArte no se reparte en dos columnas en ninguna pantalla ancha').toMatch(
      /\.conArte\s*\{[^}]*grid-template-columns/,
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
