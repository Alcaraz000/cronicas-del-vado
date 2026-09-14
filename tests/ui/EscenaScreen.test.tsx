/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { bloqueDeMedia, cuerpoDe } from '../fixtures/css';
import type { Campaign } from '@/content/schema';
import type { LogEntry, ResolvedParagraph, Run } from '@/engine/types';
import { useStore } from '@/state/store';
import { EscenaScreen } from '@/ui/screens/EscenaScreen';
import { S } from '@/ui/strings.es';
import { makeCharacter, makeRun } from '../fixtures/state';
import { minimal } from '../fixtures/campaigns/minimal';

/**
 * Campaña sintética con dos indirecciones a propósito: el id de la escena (`plaza_vieja`)
 * NO es el id de archivo del fondo, y el id del PNJ (`mensajero`) NO es el id de archivo
 * del retrato. Así el test prueba que la pantalla resuelve la imagen a través de
 * `Place.background` / `Place.variants` y de `Npc.portrait` (los campos que la consigna
 * señala como la referencia real), y no asumiendo que el id de contenido es el nombre
 * de archivo — que es cierto hoy en la campaña real pero no es lo que garantiza el esquema.
 */
const conArte: Campaign = {
  id: 'con_arte',
  contentVersion: 1,
  title: 'Campaña con arte',
  premise: '',
  cover: 'x',
  levelRange: [1, 1],
  durationMin: [1, 1],
  lethalScenes: 0,
  lintProfile: 'smoke',
  hidden: true,
  start: 'e_inicio',
  scenes: {
    e_inicio: {
      id: 'e_inicio',
      kind: 'normal',
      place: 'plaza_vieja',
      variant: 'amanecer',
      npcs: ['mensajero'],
      text: ['Estás en la plaza al amanecer.'],
      choices: [{ id: 'seguir', label: 'Seguir camino', outcome: { next: 'e_inicio' } }],
    },
  },
  npcs: {
    mensajero: { id: 'mensajero', name: 'El mensajero', portrait: 'orell', voice: '', canonPrompt: '' },
    // Un segundo PNJ que NO está en `scene.npcs` (o sea, no es el del sprite) pero sí habla:
    // hace falta para los bloques de dos hablantes, que son cinco en la campaña publicada
    // (`a1_ronda`, `c1_acusacion`, `a2_fuera_sotano`, `cl_desenlace`, `cl_halvar`).
    escriba: { id: 'escriba', name: 'La escriba', portrait: 'berta', voice: '', canonPrompt: '' },
  },
  places: {
    plaza_vieja: {
      id: 'plaza_vieja',
      name: 'La plaza vieja',
      background: 'puente_viejo',
      variants: { amanecer: 'puente_viejo.amanecer' },
      canonPrompt: '',
    },
  },
  items: {},
  flags: {},
  memories: {},
  milestones: {},
  clocks: {},
  endings: {},
};

function montarEscena(campaign: Campaign, runOverrides: Partial<Run> = {}): void {
  const run = makeRun({
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    sceneId: campaign.start,
    ...runOverrides,
  });
  const character = makeCharacter({ run });
  useStore.setState((s) => ({
    characters: [character],
    activeCharacterId: character.id,
    world: { flags: [], fallen: [] },
    seen: {},
    ui: { ...s.ui, screen: 'escena', campaign, pending: null },
  }));
}

/**
 * Lista de los elementos sobre los que se llamó `scrollIntoView`, en orden, más un
 * `restaurar()`. jsdom no implementa `scrollIntoView` (por eso el código lo llama detrás de un
 * `typeof === 'function'`), así que acá se instala uno que solo anota el elemento.
 */
interface ScrollEspiado extends Array<Element> {
  restaurar: () => void;
}

function espiarScrollIntoView(): ScrollEspiado {
  const vistos = [] as unknown as ScrollEspiado;
  // Vía `Reflect` y no por asignación directa: en el tipo de `Element` la propiedad no es
  // opcional, así que no se puede borrar para dejar el prototipo como estaba.
  const original: unknown = Reflect.get(Element.prototype, 'scrollIntoView');
  Reflect.set(Element.prototype, 'scrollIntoView', function (this: Element): void {
    vistos.push(this);
  });
  vistos.restaurar = (): void => {
    if (original === undefined) Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    else Reflect.set(Element.prototype, 'scrollIntoView', original);
  };
  return vistos;
}

/**
 * Una entrada 'scene' de log con la prosa que se quiera probar revelando. Una cadena suelta es
 * un párrafo de narrador; para probar la placa del hablante se pasa el párrafo entero, con su
 * `speaker`.
 */
function escenaLog(paragraphs: (string | ResolvedParagraph)[]): LogEntry {
  const parrafos: ResolvedParagraph[] = paragraphs.map((p) => (typeof p === 'string' ? { text: p } : p));
  return {
    kind: 'scene',
    sceneId: minimal.start,
    paragraphs: parrafos,
    hashes: parrafos.map((_, i) => `h${i}`),
  };
}

describe('EscenaScreen — arte', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra la imagen real del fondo (con variante) y el SPRITE del PNJ que habla, no su retrato', async () => {
    montarEscena(conArte);
    render(<EscenaScreen />);

    const fondo = await screen.findByAltText(`${S.placeholder.fondo}: La plaza vieja`);
    expect(fondo.tagName).toBe('IMG');
    expect(fondo.getAttribute('src')).toMatch(/puente_viejo/);

    // El recorte con alfa de la tarea 1, no el cuadro 3:4 CON fondo: pegado sobre el arte, un
    // retrato se lee como una foto pegada encima. `retrato` sigue existiendo y sigue siendo lo
    // correcto en la creación de personaje y en la Ficha; acá, no. Y el `alt` lo dice: en esta
    // pantalla el personaje está EN la escena, no colgado en un cuadro.
    const sprite = await screen.findByAltText(`${S.placeholder.sprite}: El mensajero`);
    expect(S.placeholder.sprite).not.toBe(S.placeholder.retrato);
    expect(sprite.tagName).toBe('IMG');
    expect(sprite.getAttribute('src')).toMatch(/sprite/);
    expect(sprite.getAttribute('src')).toMatch(/orell/);
    expect(sprite.getAttribute('src')).not.toMatch(/\/retrato\//);

    // El nombre del lugar sigue en el cromo: la imagen no es la única pista.
    expect(screen.getByText('La plaza vieja')).toBeInTheDocument();
  });

  it('sin arte cae al placeholder y la escena se sigue jugando igual (campaña de humo)', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    expect(screen.getByRole('img', { name: `${S.placeholder.fondo}: El claro` })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `${S.placeholder.sprite}: El guía` })).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();

    // Nada rompió: las opciones de la escena están y se pueden elegir.
    expect(screen.getByTestId('opcion-descansar')).toBeInTheDocument();
    expect(screen.getByText('El claro')).toBeInTheDocument();
  });
});

describe('EscenaScreen — la Ficha', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('la tecla C abre la Ficha y Esc la cierra', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'c' });
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAccessibleName(S.ficha.titulo);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('la tecla C no abre la Ficha si el foco está en un campo de texto', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'c' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    input.remove();
  });
});

describe('EscenaScreen — el revelado', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useStore.getState().setPrefs({ cps: 40, reducedMotion: 'auto' });
  });

  it('con cps 0 el texto aparece entero y las opciones también', () => {
    useStore.getState().setPrefs({ cps: 0 });
    montarEscena(minimal, { log: [escenaLog(['Un texto que aparece entero de una.'])] });
    render(<EscenaScreen />);

    expect(screen.getByText('Un texto que aparece entero de una.')).toBeInTheDocument();
    expect(screen.getByTestId('opcion-descansar')).toBeInTheDocument();
  });

  it('mientras se revela no hay opciones, y aparecen al terminar', () => {
    montarEscena(minimal, { log: [escenaLog(['Un texto largo que tarda en aparecer del todo, letra por letra.'])] });
    render(<EscenaScreen />);

    // Recién montado, con temporizadores falsos sin avanzar: nada de la opción está.
    expect(screen.queryByTestId('opcion-descansar')).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(10_000); });

    expect(screen.getByTestId('opcion-descansar')).toBeInTheDocument();
  });

  it('un clic en la columna completa el párrafo en curso', () => {
    montarEscena(minimal, {
      log: [escenaLog(['Primero.', 'Segundo, bastante más largo, para notar que no se reveló solo.'])],
    });
    render(<EscenaScreen />);

    // Antes del clic: con temporizadores falsos sin avanzar, el párrafo en curso no se ve.
    expect(screen.queryByText('Primero.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('columna-texto'));

    expect(screen.getByText('Primero.')).toBeInTheDocument();
    expect(screen.queryByText('Segundo, bastante más largo, para notar que no se reveló solo.')).not.toBeInTheDocument();
  });

  it('Enter y Espacio hacen lo mismo que el clic', () => {
    function completaConLaTecla(key: string): void {
      montarEscena(minimal, { log: [escenaLog(['Un párrafo para completar con el teclado.'])] });
      render(<EscenaScreen />);

      expect(screen.queryByText('Un párrafo para completar con el teclado.')).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key });
      expect(screen.getByText('Un párrafo para completar con el teclado.')).toBeInTheDocument();

      cleanup();
    }

    completaConLaTecla('Enter');
    completaConLaTecla(' ');
  });

  it('con movimiento reducido no hay revelado', () => {
    useStore.getState().setPrefs({ reducedMotion: 'on' });
    montarEscena(minimal, { log: [escenaLog(['Todo de una porque hay movimiento reducido.'])] });
    render(<EscenaScreen />);

    expect(screen.getByText('Todo de una porque hay movimiento reducido.')).toBeInTheDocument();
    expect(screen.getByTestId('opcion-descansar')).toBeInTheDocument();
  });

  it('con el foco en ninguna parte, Enter y Espacio cancelan la acción por defecto (la barra no scrollea)', () => {
    montarEscena(minimal, { log: [escenaLog(['Un párrafo cualquiera para revelar.'])] });
    render(<EscenaScreen />);

    // fireEvent.keyDown devuelve false cuando el handler llamó a preventDefault.
    expect(fireEvent.keyDown(window, { key: ' ', cancelable: true })).toBe(false);
    expect(fireEvent.keyDown(window, { key: 'Enter', cancelable: true })).toBe(false);
  });

  it('mientras el texto se revela, el teclado 1-9 de las opciones no hace nada (la lista ni se montó)', () => {
    montarEscena(minimal, { log: [escenaLog(['Un texto largo que todavía no terminó de aparecer del todo.'])] });
    render(<EscenaScreen />);

    expect(screen.queryByTestId('opcion-descansar')).not.toBeInTheDocument();

    // Si el listener de OptionList estuviera montado, esto elegiría la primera opción
    // habilitada a ciegas. Como la lista todavía no se dibujó, no debería pasar nada.
    fireEvent.keyDown(window, { key: '1' });

    expect(screen.queryByTestId('opcion-descansar')).not.toBeInTheDocument();
    expect(useStore.getState().characters[0]?.run?.sceneId).toBe(minimal.start);
  });

  /**
   * Las opciones no pueden nacer fuera de vista. Hasta el rediseño eso lo garantizaba un efecto
   * de `EscenaScreen` que, al terminar el revelado, las traía con `scrollIntoView`: el texto y
   * las acciones scrolleaban JUNTOS y el autoscroll de `TextColumn` clava la última línea contra
   * el borde de abajo, así que lo que nacía después caía justo fuera del recorte.
   *
   * Ahora la garantía es estructural, que es más fuerte: las acciones son su propia región de la
   * caja, con su propio alto y su propio scroll, y el texto se queda con lo que ellas no usan.
   * Se fija acá lo que un test puede fijar —el reparto declarado— más el efecto de verdad: que
   * la lista aparezca y que el autoscroll del texto no la arrastre, porque ya no la contiene.
   */
  it('las opciones nacen en su propia región de la caja: el autoscroll del texto no las toca', () => {
    const vistos = espiarScrollIntoView();
    try {
      montarEscena(minimal, { log: [escenaLog(['Un texto largo que tarda un rato en revelarse del todo.'])] });
      render(<EscenaScreen />);

      act(() => { vi.advanceTimersByTime(10_000); });

      const opcion = screen.getByTestId('opcion-descansar');
      expect(opcion).toBeInTheDocument();
      // Lo que `TextColumn` scrollea es el ancla del final del texto, y ese nodo no contiene a
      // las opciones: están en otra región.
      expect(vistos.some((el) => el.contains(opcion))).toBe(false);
      // La aserción de arriba es por la negativa y sola no alcanza: seguiría pasando si alguien
      // devolviera las opciones ADENTRO de la columna de texto y de paso se llevara el
      // `scrollIntoView`. Esta es la afirmativa que tapa el agujero — las opciones están fuera
      // del nodo que scrollea, que es la estructura que reemplazó al efecto.
      expect(screen.getByTestId('columna-texto').contains(opcion)).toBe(false);
    } finally {
      vistos.restaurar();
    }
  });
});

/**
 * `.acciones` es el MISMO nodo del DOM con la lista de opciones y con el panel de tirada (React
 * cambia los hijos, no el contenedor), así que su `scrollTop` sobrevive al cambio de estado: con
 * la lista scrolleada, el panel nace desplazado y lo primero que se pierde es la línea del
 * objetivo, que está arriba de todo y dice contra qué se tiró.
 *
 * jsdom no tiene layout, así que `scrollTop` nativo no scrollea nada y leerlo siempre da 0: el
 * test instrumenta la propiedad en el nodo para ver la ESCRITURA, que es lo que el efecto hace.
 */
describe('EscenaScreen — el panel de tirada nace arriba de todo', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().setPrefs({ cps: 0, reducedMotion: 'on' });
  });

  afterEach(() => {
    cleanup();
    useStore.getState().setPrefs({ cps: 40, reducedMotion: 'auto' });
  });

  it('al abrirse una tirada, la región de acciones vuelve a su tope', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    const acciones = screen.getByTestId('acciones');
    let valor = 0;
    const escrituras: number[] = [];
    Object.defineProperty(acciones, 'scrollTop', {
      configurable: true,
      get: () => valor,
      set: (v: number) => {
        valor = v;
        escrituras.push(v);
      },
    });

    // El jugador scrolleó la lista de opciones para llegar a las de abajo.
    acciones.scrollTop = 120;
    escrituras.length = 0;

    fireEvent.click(screen.getByTestId('opcion-trepar'));
    expect(useStore.getState().ui.pending).not.toBeNull();

    expect(escrituras, 'la región de acciones no se llevó al tope al abrirse la tirada').toContain(0);
    expect(acciones.scrollTop).toBe(0);
  });

  it('sin tirada pendiente nadie le toca el scroll a la lista de opciones', () => {
    // La otra dirección: el efecto no puede estar pisando el scroll en cada render, o el jugador
    // no podría scrollear una lista de siete opciones sin que lo devuelva al principio.
    montarEscena(minimal);
    render(<EscenaScreen />);

    const acciones = screen.getByTestId('acciones');
    let valor = 0;
    const escrituras: number[] = [];
    Object.defineProperty(acciones, 'scrollTop', {
      configurable: true,
      get: () => valor,
      set: (v: number) => {
        valor = v;
        escrituras.push(v);
      },
    });

    acciones.scrollTop = 120;
    escrituras.length = 0;

    // Un render cualquiera que no abre ninguna tirada: abrir y cerrar la Ficha.
    fireEvent.keyDown(window, { key: 'c' });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(escrituras).toEqual([]);
    expect(acciones.scrollTop).toBe(120);
  });
});

/**
 * El `preventDefault()` de B2 cancelaba TODO Enter/Espacio que llegara a `window`, incluidos
 * los que el navegador convierte en un click sobre el botón enfocado: con cualquier botón de la
 * escena enfocado dejaban de funcionar las opciones, la barra, "Saltar lo leído" y —lo más
 * grave— "Continuar" del panel de tirada, donde no hay atajo alternativo porque `OptionList`
 * no está dibujada.
 *
 * jsdom no sintetiza ese click (no implementa la activación por teclado de un botón), así que
 * lo que se puede y hay que fijar acá es el mecanismo exacto que se rompía: que el evento NO
 * quede cancelado cuando el foco está en un control que se activa solo, y que el revelado no se
 * lo quede. Con el evento vivo, el navegador hace lo suyo.
 */
describe('EscenaScreen — Enter y Espacio no le roban la tecla al botón enfocado', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().setPrefs({ cps: 0, reducedMotion: 'on' });
  });

  afterEach(() => {
    cleanup();
    useStore.getState().setPrefs({ cps: 40, reducedMotion: 'auto' });
  });

  it('con el foco en una opción, Enter es del botón: ni se cancela ni avanza el texto', () => {
    montarEscena(minimal, { log: [escenaLog(['Primero.', 'Segundo.'])] });
    render(<EscenaScreen />);

    const opcion = screen.getByTestId('opcion-descansar');
    opcion.focus();
    expect(opcion).toHaveFocus();

    expect(fireEvent.keyDown(opcion, { key: 'Enter', cancelable: true })).toBe(true);
    expect(fireEvent.keyDown(opcion, { key: ' ', cancelable: true })).toBe(true);

    // Y el click que el navegador sintetiza a partir de esa tecla sí elige la opción.
    fireEvent.click(opcion);
    expect(useStore.getState().characters[0]?.run?.sceneId).toBe('m_descanso');
  });

  it('con el foco en "Continuar" del panel de tirada, Enter es del botón', () => {
    // El caso sin salida: con una tirada pendiente `OptionList` no se dibuja, así que las
    // teclas 1-9 tampoco están. Si Enter tampoco activa el botón, el jugador de teclado se
    // queda trabado en la tirada.
    montarEscena(minimal);
    render(<EscenaScreen />);

    fireEvent.click(screen.getByTestId('opcion-trepar'));
    const continuar = screen.getByRole('button', { name: S.tirada.continuar });
    continuar.focus();

    expect(fireEvent.keyDown(continuar, { key: 'Enter', cancelable: true })).toBe(true);

    fireEvent.click(continuar);
    expect(useStore.getState().ui.pending).toBeNull();
  });

  it('con el foco en "Saltar lo leído", la tecla es del botón y no del revelado', () => {
    montarEscena(minimal, { log: [escenaLog(['Primero.', 'Segundo.'])] });
    render(<EscenaScreen />);

    // Un botón cualquiera de la barra permanente sirve igual para el caso: lo que se prueba es
    // que un control enfocado se quede con su tecla.
    const ficha = screen.getByRole('button', { name: S.barra.ficha });
    ficha.focus();

    expect(fireEvent.keyDown(ficha, { key: 'Enter', cancelable: true })).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con el foco fuera de todo control, Espacio sigue avanzando el texto y sigue cancelado', () => {
    // La otra dirección: lo que B2 vino a arreglar no se puede perder por el camino.
    useStore.getState().setPrefs({ cps: 40, reducedMotion: 'auto' });
    vi.useFakeTimers();
    try {
      montarEscena(minimal, { log: [escenaLog(['Un párrafo que se completa con la barra.'])] });
      render(<EscenaScreen />);

      expect(screen.queryByText('Un párrafo que se completa con la barra.')).not.toBeInTheDocument();

      expect(fireEvent.keyDown(document.body, { key: ' ', cancelable: true })).toBe(false);
      expect(screen.getByText('Un párrafo que se completa con la barra.')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * Los tres atajos de la pantalla de juego (1-9 de `OptionList`, C de la Ficha, Enter/Espacio
 * del revelado) escuchan en `window`, así que no los tapa ningún modal por sí solo. Antes de
 * la tarea 6 la confirmación mortal era `window.confirm`, que bloquea el hilo y no dejaba
 * pasar nada; al reemplazarla por `Dialogo` esa protección se perdió, y `aria-modal="true"`
 * pasó a afirmar algo que no era cierto. Estos tests fijan las dos direcciones: con un modal
 * abierto el atajo NO dispara, y con el modal cerrado sí.
 */
describe('EscenaScreen — un modal abierto tapa el teclado de abajo', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().setPrefs({ cps: 0 });
  });

  afterEach(() => {
    cleanup();
    useStore.getState().setPrefs({ cps: 40, reducedMotion: 'auto' });
  });

  /** La escena en la que está la partida del store: si una tecla eligió por detrás, cambió. */
  function escenaActual(): string | undefined {
    return useStore.getState().characters[0]?.run?.sceneId;
  }

  it('con el modal cerrado, la tecla 1 elige la primera opción', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    fireEvent.keyDown(window, { key: '1' });

    expect(escenaActual()).toBe('m_descanso');
  });

  it('con la Ficha abierta, la tecla 1 no elige nada', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.ficha.titulo);

    fireEvent.keyDown(window, { key: '1' });

    expect(escenaActual()).toBe(minimal.start);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.ficha.titulo);
  });

  it('al cerrar la Ficha el teclado vuelve: la tecla 1 elige de nuevo', () => {
    // La otra mitad del bloqueo, y la que más caro sale si falla: si el modal no se
    // descontara al cerrarse, el teclado quedaría muerto para el resto de la partida sin que
    // nada lo delate.
    montarEscena(minimal);
    render(<EscenaScreen />);

    fireEvent.keyDown(window, { key: 'c' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: '1' });

    expect(escenaActual()).toBe('m_descanso');
  });

  it('con la confirmación de abandono abierta, la tecla 1 no elige por detrás', () => {
    montarEscena(minimal);
    render(<EscenaScreen />);

    fireEvent.click(screen.getByRole('button', { name: S.barra.abandonar }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.barra.confirmarAbandonoTitulo);

    fireEvent.keyDown(window, { key: '1' });

    // Ni la partida avanzó, ni el diálogo quedó flotando sobre otra escena.
    expect(escenaActual()).toBe(minimal.start);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.barra.confirmarAbandonoTitulo);
  });

  it('con la Ficha abierta, Enter y Espacio no siguen revelando el texto de abajo', () => {
    vi.useFakeTimers();
    try {
      montarEscena(minimal, { log: [escenaLog(['Un párrafo que no tiene que avanzar solo.'])] });
      useStore.getState().setPrefs({ cps: 40 });
      render(<EscenaScreen />);

      fireEvent.keyDown(window, { key: 'c' });
      expect(screen.getByRole('dialog')).toHaveAccessibleName(S.ficha.titulo);

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: ' ' });

      expect(screen.queryByText('Un párrafo que no tiene que avanzar solo.')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * El corazón del rediseño: **el texto vive ENCIMA del arte, no al lado**. Una imagen metida en
 * una tarjeta al costado de una columna de texto es una aplicación web, sea cual sea la imagen.
 *
 * jsdom no calcula layout ni evalúa `@media`, así que esto no puede probar que se VEA como una
 * novela visual — eso se juega a mano a 1280×800 y a 375×812 (ver el informe de la tarea), y es
 * ahí donde este trabajo se gana. Lo único que un test puede fijar acá es la DECLARACIÓN, con el
 * mismo método y la misma advertencia de `tests/fixtures/css.ts`: que las líneas que sostienen
 * la estructura no se borren en silencio, y sobre todo que la grilla de dos columnas no vuelva.
 */
describe('EscenaScreen — el arte a sangre y el texto encima', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/ui/screens/EscenaScreen.module.css'), 'utf8');

  it('la pantalla es un marco de alto fijo: lo que scrollea es la caja, nunca la página', () => {
    const pantalla = cuerpoDe(css, '.pantalla');
    expect(pantalla, '.pantalla no tiene regla propia').not.toBeNull();
    expect(pantalla).toMatch(/position\s*:\s*relative/);
    expect(pantalla).toMatch(/overflow\s*:\s*hidden/);
    // `dvh` y no `vh` a secas: en el teléfono la barra del navegador se come el pie de la caja
    // y las opciones quedan justo debajo del borde. El `100vh` de al lado es el respaldo.
    expect(pantalla).toMatch(/height\s*:\s*100dvh/);
  });

  it('el fondo llena el marco, sin tarjeta ni grilla de dos columnas', () => {
    const fondo = cuerpoDe(css, '.fondo');
    expect(fondo, '.fondo no tiene regla propia').not.toBeNull();
    expect(fondo).toMatch(/position\s*:\s*absolute/);
    expect(fondo).toMatch(/inset\s*:\s*0/);

    // El marco de `Imagen` (y el de `Placeholder`, misma marca `data-aspect`) deja de imponer
    // su 16:9 y su radio de tarjeta: acá el fondo se recorta a la pantalla.
    const marco = cuerpoDe(css, ".pantalla>.fondo>[data-aspect='16:9']");
    expect(marco, 'falta el ajuste del marco del fondo').not.toBeNull();
    expect(marco).toMatch(/aspect-ratio\s*:\s*auto/);
    expect(marco).toMatch(/border-radius\s*:\s*0/);

    // La grilla 60/40 que ponía el texto AL LADO del arte es exactamente lo que se fue.
    expect(cuerpoDe(css, '.grid'), '.grid de dos columnas volvió').toBeNull();
    expect(cuerpoDe(css, '.visual'), '.visual (la tarjeta de arte) volvió').toBeNull();
  });

  it('el velo oscurece hacia abajo: es lo que deja leer sin tapar el arte', () => {
    const velo = cuerpoDe(css, '.velo');
    expect(velo, '.velo no tiene regla propia').not.toBeNull();
    expect(velo).toMatch(/linear-gradient\(\s*to bottom/);
  });

  it('la caja se apoya abajo, a todo el ancho, y scrollea por dentro en vez de crecer', () => {
    const caja = cuerpoDe(css, '.caja');
    expect(caja, '.caja no tiene regla propia').not.toBeNull();
    expect(caja).toMatch(/position\s*:\s*absolute/);
    expect(caja).toMatch(/bottom\s*:\s*0/);
    expect(caja).toMatch(/left\s*:\s*0/);
    expect(caja).toMatch(/right\s*:\s*0/);
    expect(caja).toMatch(/height\s*:\s*44%/);

    // Lo que no entra scrollea DENTRO. Sin `min-height: 0` el ítem flex pide su alto por
    // contenido y estira la caja: la trampa de siempre con flex y texto largo.
    const columna = cuerpoDe(css, '.columna');
    expect(columna, '.columna no tiene regla propia').not.toBeNull();
    expect(columna).toMatch(/overflow-y\s*:\s*auto/);
    expect(columna).toMatch(/min-height\s*:\s*0/);
  });

  /**
   * Medido jugando a 1280×800: la caja son 352 px y una encrucijada del Vado llega a siete
   * opciones con sus chips y sus probabilidades, 429 px — más que la caja entera. Con el texto
   * y las acciones en un solo scroll, apenas el revelado termina la lista empuja TODA la prosa
   * fuera del recorte y el jugador elige sin una sola línea de lo que acaba de leer, que es lo
   * contrario de lo que hace una novela visual. El reparto en dos regiones es lo que garantiza
   * que la línea siga en pantalla mientras se elige, y es lo que este test no deja borrar.
   */
  it('el texto y las acciones se reparten la caja: una lista larga no se lleva la prosa puesta', () => {
    const acciones = cuerpoDe(css, '.acciones');
    expect(acciones, '.acciones no tiene regla propia: volvieron a un solo scroll').not.toBeNull();
    expect(acciones).toMatch(/overflow-y\s*:\s*auto/);
    // El tope es lo que le reserva el resto de la caja al texto, pase lo que pase con la lista.
    const tope = /max-height\s*:\s*(\d+)%/.exec(acciones ?? '')?.[1];
    expect(tope, '.acciones no declara un tope en % de la caja').toBeDefined();
    expect(Number(tope)).toBeLessThan(100);

    // Y el texto pide su alto del espacio que sobra (`flex-basis: 0`), no de su contenido: con
    // base `auto` una escena larga se comería el reparto antes de que nadie lo reparta.
    expect(cuerpoDe(css, '.columna')).toMatch(/flex\s*:\s*1\s+1\s+0/);
  });

  it('el sprite se ancla abajo y alto, y no lleva el marco gris del retrato', () => {
    const sprite = cuerpoDe(css, '.sprite');
    expect(sprite, '.sprite no tiene regla propia').not.toBeNull();
    expect(sprite).toMatch(/position\s*:\s*absolute/);
    // Alto de verdad: con la caja empezando al 56 %, es lo que deja la cara por encima del
    // borde y hunde el resto detrás, como un sprite apoyado en el suelo de la escena.
    expect(sprite).toMatch(/height\s*:\s*80%/);

    // El recorte tiene canal alfa: el gris de fondo y el radio de `Imagen.module.css` le
    // dibujarían justo el rectángulo que la tarea 1 vino a sacar.
    const marco = cuerpoDe(css, ".pantalla>.sprite>[data-aspect='3:4']:not([role='img'])");
    expect(marco, 'falta el ajuste del marco del sprite').not.toBeNull();
    expect(marco).toMatch(/background\s*:\s*none/);
    expect(marco).toMatch(/border-radius\s*:\s*0/);
  });

  it('con movimiento reducido el sprite no entra animado', () => {
    // Dos caminos, igual que `Imagen.module.css`: el atributo que escribe `useReducedMotion()`
    // (combina la preferencia de la app con la del sistema) y la media query, que cubre que el
    // sistema cambie de preferencia con el componente ya montado.
    expect(cuerpoDe(css, ".sprite[data-reducida='true']")).toMatch(/animation\s*:\s*none/);
    const reducido = bloqueDeMedia(css, '@media (prefers-reduced-motion: reduce)');
    expect(cuerpoDe(reducido, '.sprite')).toMatch(/animation\s*:\s*none/);
  });
});

/**
 * En móvil la estructura es la MISMA: la hoja inferior de la Fase H es la caja. Lo que cambia
 * son las proporciones (el fondo llena la mitad de arriba a sangre, la caja es más alta) y que
 * el sprite se ancla del lado contrario a "Saltar lo leído".
 */
describe('EscenaScreen — las proporciones en móvil', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/ui/screens/EscenaScreen.module.css'), 'utf8');
  const movil = bloqueDeMedia(css, '@media (max-width: 800px)');

  it('la caja se lleva más pantalla que en escritorio: en un teléfono el texto es casi todo', () => {
    const caja = cuerpoDe(movil, '.caja');
    expect(caja, '.caja no tiene una regla propia en el bloque de móvil').not.toBeNull();
    const alto = /height\s*:\s*(\d+)%/.exec(caja ?? '')?.[1];
    expect(alto, '.caja de móvil no declara una altura en %').toBeDefined();
    expect(Number(alto)).toBeGreaterThan(44);
  });

  /**
   * El sprite pasa a la derecha. No es capricho: "Saltar lo leído" es `sticky` y vive pegado
   * arriba a la IZQUIERDA de la caja, y la placa del hablante monta sobre ese mismo borde
   * izquierdo. Con el sprite a la izquierda y una pantalla de 375 px, el recorte les cae
   * encima a los dos. Es el mismo motivo por el que el retrato de la Fase H ya se iba a la
   * derecha en este punto de corte.
   */
  it('el sprite se ancla a la derecha, para no taparle nada a "Saltar lo leído" ni a la placa', () => {
    const sprite = cuerpoDe(movil, '.sprite');
    expect(sprite, '.sprite no tiene una regla propia en el bloque de móvil').not.toBeNull();
    expect(sprite).toMatch(/right\s*:/);
    expect(sprite).toMatch(/left\s*:\s*auto/);
  });
});

/**
 * El historial detrás de un botón (tarea 3). Hasta acá la caja acumulaba TODA la partida y se
 * scrolleaba: ninguna novela visual hace eso, y de paso era lo que dejaba el borde de arriba de
 * la caja cortando una línea de texto por la mitad apenas empezaba la segunda escena.
 *
 * Sale barato porque `useRevelado` solo mira `log[log.length - 1]`: todo lo anterior era dibujo.
 */
describe('EscenaScreen — el historial detrás de un botón', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().setPrefs({ cps: 0 });
  });

  afterEach(() => {
    cleanup();
    useStore.getState().setPrefs({ cps: 40, reducedMotion: 'auto' });
  });

  /** Tres entradas: dos escenas con una elección en el medio. La última es la que va en la caja. */
  function montarConPartida(): void {
    montarEscena(conArte, {
      log: [
        escenaLog(['La plaza al amanecer, con el puesto todavía cerrado.']),
        { kind: 'choice', sceneId: conArte.start, choiceId: 'seguir', label: 'Seguir camino' },
        escenaLog(['El mensajero te espera del otro lado del puente.']),
      ],
    });
  }

  it('la caja muestra lo que escribió el último paso: la partida anterior ya no está en pantalla', () => {
    montarConPartida();
    render(<EscenaScreen />);

    const caja = screen.getByTestId('columna-texto');
    expect(caja).toHaveTextContent('El mensajero te espera del otro lado del puente.');
    expect(caja).not.toHaveTextContent('La plaza al amanecer');
    expect(caja).not.toHaveTextContent('Seguir camino');
  });

  /**
   * El desenlace de una opción NUNCA es la última entrada del log: `choose` y `commitRoll`
   * escriben el 'outcome' y en la misma acción llaman a `enter()`, que apila la escena nueva
   * (`src/engine/resolve.ts`). Mostrar "la última entrada" a secas, que es lo que decía el plan,
   * dejaba fuera de la pantalla 335 de los 344 desenlaces con texto de la campaña publicada
   * —9.809 palabras— y el jugador se enteraba de lo que le pasó recién abriendo el historial.
   */
  it('el desenlace de la opción se lee en la caja, pegado a la escena que abrió', () => {
    montarEscena(conArte, {
      log: [
        escenaLog(['La plaza al amanecer.']),
        { kind: 'choice', sceneId: conArte.start, choiceId: 'seguir', label: 'Seguir camino' },
        { kind: 'outcome', paragraphs: [{ text: 'Cruzás el puente sin mirar a los guardias.' }] },
        escenaLog(['Del otro lado el mercado ya está armado.']),
      ],
    });
    render(<EscenaScreen />);

    const caja = screen.getByTestId('columna-texto');
    expect(caja).toHaveTextContent('Cruzás el puente sin mirar a los guardias.');
    expect(caja).toHaveTextContent('Del otro lado el mercado ya está armado.');
    // Y el tramo corta en la elección: ni la línea "› …" ni la escena anterior vuelven.
    expect(caja).not.toHaveTextContent('Seguir camino');
    expect(caja).not.toHaveTextContent('La plaza al amanecer');
  });

  it('el botón Historial abre el cajón, y ahí sí están las entradas anteriores', () => {
    montarConPartida();
    render(<EscenaScreen />);

    expect(screen.queryByTestId('historial')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: S.barra.historial }));

    const cajon = screen.getByTestId('historial');
    expect(cajon).toHaveTextContent('La plaza al amanecer, con el puesto todavía cerrado.');
    expect(cajon).toHaveTextContent('› Seguir camino');
    expect(cajon).toHaveTextContent('El mensajero te espera del otro lado del puente.');
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.historial.titulo);
  });

  it('la tecla H lo abre y Esc lo cierra, igual que la C de la Ficha', () => {
    montarConPartida();
    render(<EscenaScreen />);

    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.historial.titulo);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Mayúscula también: es la misma tecla con Shift, y el jugador no tiene por qué saberlo.
    fireEvent.keyDown(window, { key: 'H' });
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.historial.titulo);
  });

  it('la tecla H no abre el historial si el foco está en un campo de texto', () => {
    montarConPartida();
    render(<EscenaScreen />);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'h' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    input.remove();
  });

  it('la tecla H no abre el historial por detrás de otro modal', () => {
    montarConPartida();
    render(<EscenaScreen />);

    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.ficha.titulo);

    fireEvent.keyDown(window, { key: 'h' });

    // Sigue estando la Ficha, y una sola: el historial no se abrió abajo ni encima.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(S.ficha.titulo);
  });

  it('Ctrl+H (y Alt, y Meta) son del navegador, no del juego', () => {
    montarConPartida();
    render(<EscenaScreen />);

    fireEvent.keyDown(window, { key: 'h', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'h', altKey: true });
    fireEvent.keyDown(window, { key: 'h', metaKey: true });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el botón del historial vive en el cromo, al lado del de la Ficha', () => {
    // Medido a 375×812 en el navegador, que es lo que decidió dónde va: el cromo mide 91 px de
    // alto con dos botones y 91 px con tres (el grupo pasa de 152 a 233 px y entra en el mismo
    // renglón), y 104 px en los dos casos a 125 %. Recién a 150 % suma un renglón (118 → 159).
    // Montado sobre el filo de la caja, en cambio, chocaba con la placa del hablante: con el
    // nombre más ancho ("Capitán Dravos": borde derecho en 221 / 272 / 323 px) y el botón de
    // 73 / 90 / 108 px pegado a la derecha, se pisan 3 px a 125 % y 72 px a 150 %.
    montarConPartida();
    render(<EscenaScreen />);

    const cromo = screen.getByRole('banner');
    const boton = screen.getByRole('button', { name: S.barra.historial });
    expect(cromo.contains(boton)).toBe(true);
    // Y en el mismo grupo que "Ficha", que es el otro cajón: los dos se abren con una letra.
    expect(boton.parentElement).toBe(screen.getByRole('button', { name: S.barra.ficha }).parentElement);
  });
});

/**
 * La placa del hablante: el elemento chico más fuerte de la pantalla, y la señal que más
 * rápido dice "novela visual". El género la pone claramente por encima del diálogo (Ren'Py
 * usa 45 contra 33, un 1,36×) y la monta sobre el borde de arriba de la caja.
 */
describe('EscenaScreen — la placa del hablante', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().setPrefs({ cps: 0 });
  });

  afterEach(() => {
    cleanup();
    useStore.getState().setPrefs({ cps: 40, reducedMotion: 'auto' });
  });

  it('un párrafo con hablante monta su placa, con el nombre visible del PNJ', () => {
    montarEscena(conArte, { log: [escenaLog([{ speaker: 'mensajero', text: '—Vengo de lejos y con prisa.' }])] });
    render(<EscenaScreen />);

    const placa = screen.getByTestId('placa-hablante');
    // El nombre, no el id: `mensajero` nunca se muestra crudo.
    expect(placa).toHaveTextContent('El mensajero');
  });

  it('la narración en tercera persona no lleva placa', () => {
    montarEscena(conArte, { log: [escenaLog(['Estás en la plaza al amanecer y no hay nadie.'])] });
    render(<EscenaScreen />);

    expect(screen.queryByTestId('placa-hablante')).not.toBeInTheDocument();
  });

  /**
   * El nombre ya está en la prosa (`Parrafos` lo dibuja como prefijo del párrafo, y ese
   * prefijo es lo único que un lector de pantalla escucha dentro de la región viva de
   * `TextColumn`). La placa es la MISMA información en forma visual: anunciarla otra vez
   * haría que cada línea de diálogo se leyera con el nombre dos veces.
   */
  it('la placa es decorativa para un lector de pantalla: el nombre ya está en el texto', () => {
    montarEscena(conArte, { log: [escenaLog([{ speaker: 'mensajero', text: '—Vengo de lejos.' }])] });
    render(<EscenaScreen />);

    expect(screen.getByTestId('placa-hablante')).toHaveAttribute('aria-hidden', 'true');
    // Y el nombre sigue estando en el texto, que es de donde lo toma la región viva.
    expect(screen.getByTestId('columna-texto')).toHaveTextContent('El mensajero');
  });

  /**
   * El caso que faltaba, y el que más fácil se "arregla" por accidente: `[hablante, narración]`.
   * La placa NO se apaga cuando el bloque sigue con narración del mismo hablante — se queda
   * puesta hasta el final del revelado.
   *
   * Es deliberado. El prefijo del párrafo ("El mensajero: ") está escondido a la VISTA dentro de
   * la caja, así que la placa es lo único que en pantalla dice quién habló: apagarla dejaría un
   * diálogo entrecomillado sin atribución ninguna. En la campaña `vado` publicada hay 14 bloques
   * con un párrafo con hablante seguido de narración y 13 terminan en narración; uno real está en
   * `src/content/campaigns/vado/scenes/acto1_pueblo.ts:628-639` (Orell contesta por la firma del
   * bando y el bloque cierra con "El puente se cerró antes de que Tomé faltara."), que es la forma
   * que este test copia.
   */
  it('con [hablante, narración] la placa se queda puesta después de terminado el revelado', () => {
    montarEscena(conArte, {
      log: [
        escenaLog([
          { speaker: 'mensajero', text: '—La firma es del capitán, de hace doce días.' },
          'El puente se cerró antes de que nadie faltara.',
        ]),
      ],
    });
    render(<EscenaScreen />);

    // `cps: 0` (el `beforeEach` de este bloque): el revelado ya terminó, los dos párrafos están.
    expect(screen.getByText(/El puente se cerró antes/)).toBeInTheDocument();
    expect(screen.getByTestId('placa-hablante')).toHaveTextContent('El mensajero');
  });

  /** Lo mismo, pero llegando por el revelado: la placa no se apaga cuando entra la narración. */
  it('la narración que sigue a un diálogo no apaga la placa mientras se revela', () => {
    useStore.getState().setPrefs({ cps: 40 });
    vi.useFakeTimers();
    try {
      montarEscena(conArte, {
        log: [
          escenaLog([
            { speaker: 'mensajero', text: '—Vengo de lejos y con prisa.' },
            'Se va sin esperar respuesta, y la plaza queda como estaba.',
          ]),
        ],
      });
      render(<EscenaScreen />);

      act(() => { vi.advanceTimersByTime(10_000); });

      expect(screen.getByText(/Se va sin esperar respuesta/)).toBeInTheDocument();
      expect(screen.getByTestId('placa-hablante')).toHaveTextContent('El mensajero');
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * El bloque con DOS hablantes, que hasta la ronda 2 quedaba MAL ATRIBUIDO y no solo sin
   * atribuir: la regla de CSS escondía el prefijo de todos los párrafos y la placa nombra a uno
   * solo —el último—, así que la línea del primero quedaba dibujada debajo del cartel del otro.
   * En la campaña publicada son cinco bloques y caen en tres de los momentos más cargados del
   * juego: `a1_ronda`, `c1_acusacion`, `a2_fuera_sotano`, `cl_desenlace` (el clímax, donde la
   * línea de Berta caía bajo un cartel que dice "Ilse") y `cl_halvar`.
   *
   * La regla ahora: se esconde SOLO el prefijo que la placa repite; los demás se quedan.
   */
  it('con dos hablantes, solo se esconde el prefijo que la placa repite: el del anterior se ve', () => {
    montarEscena(conArte, {
      log: [
        escenaLog([
          { speaker: 'mensajero', text: '—Yo lo vi entrar, y no salió.' },
          { speaker: 'escriba', text: '—Y yo lo vi salir por atrás.' },
        ]),
      ],
    });
    render(<EscenaScreen />);

    const marcas = [...screen.getByTestId('columna-texto').querySelectorAll('[data-hablante]')];
    expect(marcas).toHaveLength(2);
    // El primero conserva su prefijo a la vista; el segundo es el que la placa está diciendo.
    expect(marcas[0]).toHaveAttribute('data-hablante', 'propio');
    expect(marcas[0]).toHaveTextContent('El mensajero');
    expect(marcas[1]).toHaveAttribute('data-hablante', 'placa');
    expect(marcas[1]).toHaveTextContent('La escriba');

    expect(screen.getByTestId('placa-hablante')).toHaveTextContent('La escriba');
  });

  /**
   * La otra mitad del arreglo: la hoja de estilos tiene que esconder SOLO el prefijo marcado
   * `placa`. Con `[data-hablante]` a secas volvería el bug entero sin que ningún test de DOM se
   * entere, porque jsdom no aplica módulos CSS — por eso esto se lee del archivo.
   */
  it('la hoja esconde únicamente el prefijo que la placa repite, no todos', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/ui/components/TextColumn.module.css'), 'utf8');

    const soloLaPlaca = cuerpoDe(css, ".columna[data-hablante='placa']");
    expect(soloLaPlaca, 'la regla dejó de apuntar solo al prefijo de la placa').not.toBeNull();
    expect(soloLaPlaca).toMatch(/clip-path\s*:\s*inset\(50%\)/);
    // Y sigue siendo ocultamiento VISUAL: `display: none` se llevaría el nombre del árbol de
    // accesibilidad, que es de donde lo toma la región viva.
    expect(soloLaPlaca).not.toMatch(/display\s*:\s*none/);

    // La regla vieja, que se llevaba puestos todos los prefijos, no puede volver.
    expect(cuerpoDe(css, '.columna[data-hablante]'), 'volvió la regla que esconde TODOS los prefijos').toBeNull();
  });

  /**
   * El scrollback se mudó al cajón del historial (tarea 3), así que la regla se parte en dos y
   * las dos siguen importando: en la CAJA queda una sola entrada y su prefijo es el que la placa
   * repite, y en el CAJÓN —donde no hay ninguna placa— el prefijo de la entrada anterior es lo
   * único que dice quién habló, así que se queda entero.
   */
  it('la entrada anterior conserva su prefijo, pero ahora en el cajón: en la caja queda una sola', () => {
    montarEscena(conArte, {
      log: [
        escenaLog([{ speaker: 'mensajero', text: '—Vengo de lejos y con prisa.' }]),
        // La 'choice' del medio no es decorado: el motor escribe una antes de cada escena nueva,
        // y es la marca donde corta el tramo que la caja dibuja (ver `entradasDelUltimoPaso`).
        { kind: 'choice', sceneId: conArte.start, choiceId: 'seguir', label: 'Seguir camino' },
        escenaLog([{ speaker: 'escriba', text: '—Entonces firmá acá.' }]),
      ],
    });
    render(<EscenaScreen />);

    const enLaCaja = [...screen.getByTestId('columna-texto').querySelectorAll('[data-hablante]')];
    expect(enLaCaja.map((m) => m.getAttribute('data-hablante'))).toEqual(['placa']);
    expect(screen.getByTestId('placa-hablante')).toHaveTextContent('La escriba');

    fireEvent.keyDown(window, { key: 'h' });
    const enElCajon = [...screen.getByTestId('historial').querySelectorAll('[data-hablante]')];
    expect(enElCajon.map((m) => m.getAttribute('data-hablante'))).toEqual(['propio', 'propio']);
    expect(enElCajon[0]).toHaveTextContent('El mensajero');
  });

  /**
   * La divergencia es el riesgo real de este arreglo: son dos puntas del mismo hecho —a quién
   * nombra el cartel y a qué párrafo se le esconde el prefijo— y si un día se calcularan
   * distinto, la placa diría uno y el prefijo se escondería en otro sin que nada lo delate. Hoy
   * dependen de la misma función (`indiceDeLaPlaca`); esto lo fija carácter por carácter del
   * revelado, que es donde el par se mueve.
   */
  it('la placa y el prefijo escondido son SIEMPRE el mismo párrafo, también a mitad del revelado', () => {
    useStore.getState().setPrefs({ cps: 40 });
    vi.useFakeTimers();
    try {
      montarEscena(conArte, {
        log: [
          escenaLog([
            'Se juntan los dos en la plaza y ninguno se saluda.',
            { speaker: 'mensajero', text: '—Yo lo vi entrar, y no salió.' },
            { speaker: 'escriba', text: '—Y yo lo vi salir por atrás.' },
            'Ninguno de los dos afloja.',
          ]),
        ],
      });
      render(<EscenaScreen />);

      const vistos = new Set<string>();
      for (let tic = 0; tic < 60; tic++) {
        const placa = screen.queryByTestId('placa-hablante');
        const marcada = screen.getByTestId('columna-texto').querySelector("[data-hablante='placa']");
        if (placa === null) {
          expect(marcada, 'hay un prefijo escondido sin placa que lo reemplace').toBeNull();
        } else {
          expect(marcada, 'la placa nombra a alguien y ningún prefijo está escondido').not.toBeNull();
          // "La escriba: " empieza por "La escriba": son el mismo párrafo.
          expect(marcada?.textContent?.startsWith(placa.textContent ?? '')).toBe(true);
          vistos.add(placa.textContent ?? '');
        }
        act(() => { vi.advanceTimersByTime(100); });
      }

      // Y el recorrido pasó de verdad por los dos hablantes: si no, el bucle no probaría nada.
      expect([...vistos].sort()).toEqual(['El mensajero', 'La escriba']);
      // Al final, con la narración ya revelada, la placa sigue puesta en el último que habló.
      expect(screen.getByTestId('placa-hablante')).toHaveTextContent('La escriba');
    } finally {
      vi.useRealTimers();
    }
  });

  it('la placa dice quién habla AHORA: no se adelanta al párrafo que todavía no se reveló', () => {
    useStore.getState().setPrefs({ cps: 40 });
    vi.useFakeTimers();
    try {
      montarEscena(conArte, {
        log: [escenaLog(['Alguien cruza la plaza sin mirarte.', { speaker: 'mensajero', text: '—Después hablo yo.' }])],
      });
      render(<EscenaScreen />);

      // Con los temporizadores sin avanzar, el párrafo del mensajero ni empezó: no hay placa.
      expect(screen.queryByTestId('placa-hablante')).not.toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(10_000); });

      expect(screen.getByTestId('placa-hablante')).toHaveTextContent('El mensajero');
    } finally {
      vi.useRealTimers();
    }
  });
});
