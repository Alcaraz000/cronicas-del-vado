/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { bloqueDeMedia, cuerpoDe } from '../fixtures/css';
import { espiarScrollIntoView } from '../fixtures/scroll';
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

  /**
   * §0.5 del diseño: tres números se sostenían entre sí y no los vigilaba NINGÚN test. La caja
   * en 44 %, la parada densa del velo en 62 % —que es 100 − 44 + 6— y el «47 % del sprite
   * visible» del comentario, que sale de combinar el 44 % de la caja con el 80 % del sprite:
   * (0,56 − 0,18)/0,80. Cambiar uno solo desacoplaba los otros dos en silencio. Este caso es la
   * razón de ser del token: la caja y el velo ya no pueden divergir sin romper la suite.
   */
  it('el alto de la caja es UN token, y el velo cuelga de él', () => {
    const pantalla = cuerpoDe(css, '.pantalla');
    expect(pantalla, '.pantalla no declara --alto-caja').toMatch(/--alto-caja\s*:\s*44%/);
    expect(cuerpoDe(css, '.caja'), 'la caja no consume el token').toMatch(/height\s*:\s*var\(--alto-caja\)/);
    // El velo, con el desfase de 6 puntos escrito: la parada densa va 6 puntos POR DEBAJO del
    // borde de arriba de la caja, para que el degradado ya esté denso cuando llega el filo de
    // oro. Sin el `+ 6%` el degradado muere justo en el filo y el recorte del sprite se corta
    // de golpe contra el borde, que es lo que el velo está para evitar.
    expect(cuerpoDe(css, '.velo'), 'la parada densa del velo volvió a ser un número suelto').toMatch(
      /calc\(\s*100%\s*-\s*var\(--alto-caja\)\s*\+\s*6%\s*\)/,
    );
  });

  it('la caja se apoya abajo, a todo el ancho, y scrollea por dentro en vez de crecer', () => {
    const caja = cuerpoDe(css, '.caja');
    expect(caja, '.caja no tiene regla propia').not.toBeNull();
    expect(caja).toMatch(/position\s*:\s*absolute/);
    expect(caja).toMatch(/bottom\s*:\s*0/);
    expect(caja).toMatch(/left\s*:\s*0/);
    expect(caja).toMatch(/right\s*:\s*0/);
    expect(caja).toMatch(/height\s*:\s*var\(--alto-caja\)/);

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

  it('arriba de 1400 px la caja se reparte en dos columnas', () => {
    // Apiladas, a 1919x905 sobre `a1_taberna` se ven 3 de 10 líneas de prosa y 3 de 7 opciones,
    // y el scroll queda en el tope: las 3 que se ven son las ÚLTIMAS. Repartidas, la prosa se
    // queda con los 349 px completos de la caja: 10,2 líneas.
    // OJO: `bloqueDeMedia` LANZA si no encuentra la media query (tests/fixtures/css.ts:16), no
    // devuelve null. Así que la ausencia del bloque se afirma con `not.toThrow()`, no con
    // `not.toBeNull()`.
    expect(() => bloqueDeMedia(css, '@media (min-width: 1400px)')).not.toThrow();
    const ancha = bloqueDeMedia(css, '@media (min-width: 1400px)');
    // El `;` no es decoración del patrón: sin él, `row-reverse` pasa en verde, y con las
    // opciones a la izquierda y la prosa a la derecha la pantalla queda dada vuelta sin que
    // nadie se entere. Es la misma familia que el `\brem\b` que no mordía en la tarea 1.
    expect(cuerpoDe(ancha, '.caja'), 'el reparto acepta row-reverse: la prosa se iría a la derecha').toMatch(
      /flex-direction\s*:\s*row\s*;/,
    );
    // El aire entre las dos columnas: sin él la prosa y las opciones se tocan.
    expect(cuerpoDe(ancha, '.caja'), 'el reparto no separa las dos columnas').toMatch(/gap\s*:\s*var\(--esp-6\)/);
    // Y el pie de la caja, que en el reparto es más corto a propósito: esos 4 px son de las
    // opciones, y son parte de lo que cierra el §6.1 (ver el comentario de la regla).
    expect(cuerpoDe(ancha, '.caja'), 'el reparto perdió el pie corto: son 4 px de las opciones').toMatch(
      /padding-bottom\s*:\s*var\(--esp-3\)/,
    );
    expect(cuerpoDe(ancha, '.acciones')).toMatch(/max-height\s*:\s*100%/);

    // El ancho base lo fija la PROSA y las acciones se quedan con el resto. Al revés —con las
    // acciones en un ancho fijo— a 1919x905 la columna de texto mediría 1331 px mientras la
    // prosa corta en `--ancho-prosa`: 514 px muertos ADENTRO de la columna de texto, que es el
    // mismo problema que esta tarea vino a arreglar, más chico y un nivel más adentro.
    expect(cuerpoDe(ancha, '.columna')).toMatch(/flex\s*:\s*0\s+0\s+min\(\s*calc\(var\(--ancho-prosa\)/);

    // Y la expresión ENTERA, que hasta esta oleada estaba vigilada solo por el prefijo. Las dos
    // mitades que faltaban son las dos que hacen que la prosa entre:
    //
    // - **el canal del scroll** (`+ var(--esp-4)`, los mismos 16 px del `padding-right` de la
    //   regla base). Sin él la columna reserva 816,76 y la prosa se queda con 800,76: medido, la
    //   misma prosa de `a1_taberna` se parte en 11 líneas, no entra en los 349 px y aparece la
    //   barra, que le come otros 10 px. Un lazo: scrollea porque es angosta y es angosta porque
    //   scrollea.
    // - **el tope del 60 %**, que es lo que impide que la columna de prosa se lleve la caja
    //   entera y deje a las acciones sin ancho.
    expect(
      cuerpoDe(ancha, '.columna'),
      'la columna dejó de reservar el canal del scroll: la prosa se parte en 11 líneas y aparece la barra',
    ).toMatch(/min\(\s*calc\(var\(--ancho-prosa\)\s*\+\s*var\(--esp-4\)\)\s*,\s*60%\s*\)/);
    // Y el `em` de `--ancho-prosa` tiene que resolverse contra el cuerpo de la PROSA: sin un
    // `font-size` propio, `.columna` hereda el de la interfaz y los 38em dan 644,81 px en vez
    // de 816,76 (medido a 1919x905). La columna quedaba 172 px más angosta que la medida que
    // ella misma reserva y la prosa seguía scrolleando.
    expect(cuerpoDe(ancha, '.columna'), 'el em de --ancho-prosa se resuelve contra el cuerpo equivocado').toMatch(
      /font-size\s*:\s*calc\(var\(--tam-texto-juego\)\s*\*\s*var\(--escala-fuente\)\)/,
    );

    // Y el tope de la tirada tiene que subir CON él, o el bono no existe:
    // `.acciones[data-tirada='true']` tiene especificidad (0,2,0) contra la (0,1,0) de
    // `.acciones`, y una media query no suma especificidad — así que el 78 % de la regla base
    // le ganaría a este 100 % y el panel seguiría sin entrar.
    expect(
      cuerpoDe(ancha, ".acciones[data-tirada='true']"),
      'el tope de la tirada se queda en el 78 % de la regla base y le gana por especificidad',
    ).toMatch(/max-height\s*:\s*100%/);
  });

  it('la regla base del reparto apilado NO se toca: es la que vale abajo de 1400', () => {
    expect(cuerpoDe(css, '.acciones')).toMatch(/max-height\s*:\s*60%/);
    expect(cuerpoDe(css, '.columna')).toMatch(/flex\s*:\s*1\s+1\s+0/);
  });

  it('la placa viaja con la prosa cuando el contenido se centra', () => {
    // Si el contenido de la caja se centra y la placa se queda clavada en 48 px, la placa nombra
    // a un texto que arranca hasta 59,5 px más a la derecha (con el tope de 1184, entre 1280 y
    // 1400 px de ancho, que es la única banda donde el centrado de la regla base actúa). Es peor
    // que el problema que vino a arreglar. Las dos llevan la MISMA expresión.
    const caja = cuerpoDe(css, '.caja') ?? '';
    const placa = cuerpoDe(css, '.placa') ?? '';
    const expresion = /max\(\s*var\(--esp-7\)/;
    expect(caja, 'la caja no centra su contenido').toMatch(expresion);
    expect(placa, 'la placa no acompaña al centrado de la caja').toMatch(expresion);

    // Y "la misma" quiere decir IDÉNTICA, carácter por carácter. Que las dos tengan un `max()`
    // no alcanza: con 1184 en la caja y 1440 en la placa los dos patrones de arriba pasan en
    // verde y la placa queda desalineada igual. Esto compara las dos expresiones enteras.
    const expresionDe = (cuerpo: string, prop: string): string | undefined =>
      new RegExp(`${prop}\\s*:\\s*(max\\([^;]*)\\s*;`).exec(cuerpo)?.[1]?.replace(/\s+/g, ' ').trim();
    expect(expresionDe(caja, 'padding-inline'), 'la caja no declara el centrado con max()').toBeDefined();
    expect(
      expresionDe(placa, 'left'),
      'la placa y la caja usan topes distintos: la placa nombra a un texto que arranca en otro lado',
    ).toBe(expresionDe(caja, 'padding-inline'));

    // Y lo mismo del otro lado del corte: si el reparto cambia el relleno de la caja, la placa
    // tiene que cambiarlo con ella. Medido a 1919x905: con la placa en el `max()` de la regla
    // base y la caja en el relleno del reparto, la placa arrancaría en 367,5 y la prosa en 48.
    const ancha = bloqueDeMedia(css, '@media (min-width: 1400px)');
    const cajaAncha = cuerpoDe(ancha, '.caja') ?? '';
    const placaAncha = cuerpoDe(ancha, '.placa') ?? '';
    const rellenoAncho = /padding-inline\s*:\s*([^;]+);/.exec(cajaAncha)?.[1]?.trim();
    if (rellenoAncho !== undefined) {
      expect(
        /left\s*:\s*([^;]+);/.exec(placaAncha)?.[1]?.trim(),
        'la caja cambia su relleno en el reparto y la placa se queda atrás',
      ).toBe(rellenoAncho);
    }
  });

  /**
   * El caso de arriba compara las dos expresiones ENTRE SÍ, así que **cambiar las dos juntas pasa
   * en verde** — y con ellas se va el centrado, que es un entregable de la fase. Los dos topes
   * están medidos y cada uno tiene un único valor defendible:
   *
   * - **1184 en la regla base** = 1280 − 48 × 2, o sea el interior de la caja en la ventana a la
   *   que esta interfaz se compuso y se verificó. La expresión da exactamente los 48 px de
   *   siempre a 1280 —esa medida no se mueve un píxel, que es el requisito— y de ahí para arriba
   *   el interior deja de crecer. Con el 1440 del contrato la declaración NO HARÍA NADA NUNCA:
   *   `(100% − 1440px)/2` recién le gana a los 48 px arriba de 1536, y de 1400 para arriba manda
   *   el bloque del reparto, así que la banda útil (1280-1400) quedaría sin cubrir.
   * - **1824 en el reparto** = 1920 − 48 × 2, el monitor donde la fase se verifica. Medido a
   *   1919x905 sobre `a1_taberna` con las palancas de alto puestas: con 1184 la prosa cae a
   *   710,39 y VUELVE A DESBORDAR 65 px; con 1440 la prosa entra pero las acciones quedan en
   *   575,25 y se ven 5 de 7 opciones; con 1824 entran las 7 y las 10 líneas, las dos con 0 de
   *   desborde. Y arregla el ultrawide: a 3440x1440 una opción medía 2346 px contra 950 de prosa
   *   (2,47×) y con el tope mide 826 (0,87×).
   */
  it('los dos topes del centrado son los medidos, no dos números cualesquiera', () => {
    /** El tope en px del `max(var(--esp-7), (100% - <tope>px) / 2)` de una declaración. */
    const topeDe = (cuerpo: string, prop: string): number => {
      const patron = new RegExp(
        `${prop}\\s*:\\s*max\\(\\s*var\\(--esp-7\\)\\s*,\\s*\\(\\s*100%\\s*-\\s*(\\d+)px\\s*\\)\\s*/\\s*2\\s*\\)`,
      );
      return Number(patron.exec(cuerpo)?.[1]);
    };

    const base = cuerpoDe(css, '.caja') ?? '';
    expect(topeDe(base, 'padding-inline'), 'el centrado de la regla base perdió su tope de 1184 px').toBe(1184);
    expect(topeDe(cuerpoDe(css, '.placa') ?? '', 'left')).toBe(1184);

    const ancha = bloqueDeMedia(css, '@media (min-width: 1400px)');
    const reparto = cuerpoDe(ancha, '.caja') ?? '';
    expect(topeDe(reparto, 'padding-inline'), 'el reparto perdió su tope de 1824 px').toBe(1824);
    expect(topeDe(cuerpoDe(ancha, '.placa') ?? '', 'left')).toBe(1824);

    // Y el del reparto tiene que ser MÁS ancho que el de la base, o el reparto estrecharía el
    // interior justo donde la caja tiene más lugar: con 1184 en los dos, la prosa desborda 65 px.
    expect(topeDe(reparto, 'padding-inline')).toBeGreaterThan(topeDe(base, 'padding-inline'));
  });

  it('el sprite se ancla ARRIBA y acotado, y no lleva el marco gris del retrato', () => {
    const sprite = cuerpoDe(css, '.sprite');
    expect(sprite, '.sprite no tiene regla propia').not.toBeNull();
    expect(sprite).toMatch(/position\s*:\s*absolute/);
    // Alto de verdad, pero con techo: anclado abajo, cada píxel que crecía la ventana se lo
    // comía la caja y la fracción visible quedaba clavada en 47,5 % mientras la cabeza se
    // inflaba (283 px a 1919x905, el 31,3 % del alto de la ventana).
    // Con el techo ESCRITO: `min(80%, ...)` a secas deja pasar `min(80%, 99999px)`, que es lo
    // mismo que no tener techo, y el techo es la mitad del entregable — de él salen el 50,58 %
    // visible a 1919x905 y el 80,47 % a 2560x1440 que dice el comentario de la regla.
    expect(sprite).toMatch(/height\s*:\s*min\(\s*80%\s*,\s*680px\s*\)/);
    // Anclado por ARRIBA la fracción visible crece con la ventana en vez de quedarse quieta:
    // 47,5 % a 1280x800 (idéntico a hoy), 50,6 % a 1919x905, 60,4 % a 1080. El 18 % es el
    // mismo que hoy sale implícito de `2% + 80%`.
    expect(sprite).toMatch(/top\s*:\s*18%/);
    expect(sprite, 'el sprite volvió a anclarse abajo: la cabeza vuelve a inflarse').not.toMatch(/bottom\s*:/);

    // La otra mitad de la geometría, que hasta esta oleada no vigilaba nadie:
    //
    // - **el `aspect-ratio: 3 / 4`**, que va en el CONTENEDOR y no en el marco de adentro. Los
    //   ocho recortes son 768×1024 exactos, así que con él el hueco mide lo mismo HAYA ARTE O NO
    //   —`Placeholder` también es 3:4— y la campaña de humo no cambia de forma. Sin él el hueco
    //   se queda sin ancho propio y el 48,7 % de pantalla del bloque de teléfono (183 px de 375,
    //   medido) no sale de ninguna parte.
    // - **el `left`**, que es lo que lo pone del lado del que se mide todo lo demás. En el bloque
    //   de teléfono el sprite se va a la derecha con `left: auto`, y esa línea no significa nada
    //   si acá no hay un `left`.
    expect(sprite, 'el sprite perdió su relación de aspecto: el hueco deja de medir lo mismo sin arte').toMatch(
      /aspect-ratio\s*:\s*3\s*\/\s*4/,
    );
    expect(sprite, 'el sprite no se ancla a ningún borde horizontal').toMatch(/left\s*:\s*var\(--esp-\d\)/);
    // Y no se come los clics: cubre media pantalla por encima del fondo, y el clic en el arte es
    // lo que completa el párrafo en curso del revelado.
    expect(sprite, 'el sprite volvió a comerse los clics del arte').toMatch(/pointer-events\s*:\s*none/);

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
    // El alto ya no se escribe en `.caja` sino en `--alto-caja`, que el bloque de móvil
    // redefine en `.pantalla`: así el velo lo sigue solo, en vez de quedarse con la parada
    // densa de escritorio mientras la caja arranca 14 puntos más arriba.
    const pantalla = cuerpoDe(movil, '.pantalla');
    expect(pantalla, '.pantalla no redefine --alto-caja en el bloque de móvil').not.toBeNull();
    const alto = /--alto-caja\s*:\s*(\d+)%/.exec(pantalla ?? '')?.[1];
    expect(alto, 'el bloque de móvil no declara --alto-caja en %').toBeDefined();
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
    // Y el `top: auto`, que no es decorativo: la regla base ancla por ARRIBA, así que sin esto
    // el caso queda sobre-restringido (`top` + `bottom` + `height`), el navegador descarta el
    // `bottom` y el recorte del teléfono se va al 18 % — seis puntos más arriba de donde estaba.
    expect(sprite, 'el sprite de móvil quedó sobre-restringido y se va seis puntos hacia arriba').toMatch(
      /top\s*:\s*auto/,
    );
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
    // Lo decidió una medición de navegador a 375×812 que vive en un solo lugar: el comentario de
    // `src/ui/components/StatusBar.tsx`, arriba de `.acciones`. Acá no se copia — ya divergió una
    // vez entre el código y el informe.
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
   *
   * **Los dos selectores de acá abajo llevan el espacio del descendiente, y no es cosmética.**
   * `Parrafos` marca un `<strong>` ADENTRO del párrafo (`TextColumn.tsx` pone la clase en el
   * contenedor), así que la regla que esconde es `.columna [data-hablante='placa']`; la
   * compuesta `.columna[data-hablante='placa']` pediría que el contenedor llevara el atributo
   * y **no alcanzaría a nada**. Hasta el cierre de la fase del escalado este caso pedía la
   * compuesta y pasaba igual, porque `cuerpoDe` borraba TODO el espacio del selector y las
   * confundía: escrita compuesta en la hoja, ningún prefijo se escondía y la suite seguía en
   * verde. Por eso además de leer el archivo se comprueba contra el DOM que el selector
   * alcance al nodo — que es lo único que un string no puede mentir.
   */
  it('la hoja esconde únicamente el prefijo que la placa repite, no todos', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/ui/components/TextColumn.module.css'), 'utf8');

    const soloLaPlaca = cuerpoDe(css, ".columna [data-hablante='placa']");
    expect(soloLaPlaca, 'la regla dejó de apuntar solo al prefijo de la placa').not.toBeNull();
    expect(soloLaPlaca).toMatch(/clip-path\s*:\s*inset\(50%\)/);
    // Y sigue siendo ocultamiento VISUAL: `display: none` se llevaría el nombre del árbol de
    // accesibilidad, que es de donde lo toma la región viva.
    expect(soloLaPlaca).not.toMatch(/display\s*:\s*none/);

    // La regla vieja, que se llevaba puestos todos los prefijos, no puede volver. También con el
    // espacio: la que hacía daño era la descendiente.
    expect(cuerpoDe(css, '.columna [data-hablante]'), 'volvió la regla que esconde TODOS los prefijos').toBeNull();

    // Y el selector del archivo, corrido tal cual sobre lo renderizado: en el entorno de test los
    // CSS Modules devuelven el nombre pelado de la clase. Un selector que pesa lo que tiene que
    // pesar pero no le pega a nada es el agujero de la tarea 4, y acá no puede pasar.
    montarEscena(conArte, {
      log: [escenaLog([{ speaker: 'mensajero', text: '—Vengo de lejos y con prisa.' }])],
    });
    render(<EscenaScreen />);
    expect(
      document.querySelectorAll(".columna [data-hablante='placa']").length,
      'el selector de la hoja no alcanza a ningún prefijo del DOM',
    ).toBe(1);
    expect(document.querySelectorAll(".columna[data-hablante='placa']").length).toBe(0);
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

/**
 * El objetivo en la barra. La pantalla no decide nada: le pregunta al motor cuál es el objetivo
 * activo y le pasa el TEXTO a `StatusBar`. Lo que se fija acá es ese cable —que la pantalla mire
 * la campaña y el estado de verdad, y que el objetivo cambie cuando el estado cambia—, porque el
 * dibujo ya lo fijan los casos de `StatusBar`.
 */
describe('EscenaScreen — el objetivo', () => {
  /** `conArte` con dos objetivos: el primero se cumple al prender `run:hablado`. */
  const conObjetivos: Campaign = {
    ...conArte,
    objetivos: [
      { id: 'o_hablar', texto: 'Hablá con el mensajero', hecho: { flag: 'run:hablado' } },
      { id: 'o_irse', texto: 'Salí de la plaza antes del amanecer', when: { flag: 'run:hablado' } },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra el objetivo activo de la campaña', () => {
    montarEscena(conObjetivos);
    render(<EscenaScreen />);
    expect(screen.getByTestId('objetivo')).toHaveTextContent(/Hablá con el mensajero/);
  });

  it('cuando el estado cumple el primero, la barra pasa al que sigue', () => {
    montarEscena(conObjetivos, { flags: ['run:hablado'] });
    render(<EscenaScreen />);
    expect(screen.getByTestId('objetivo')).toHaveTextContent(/Salí de la plaza antes del amanecer/);
    expect(screen.getByTestId('objetivo')).not.toHaveTextContent(/Hablá con el mensajero/);
  });

  it('una campaña sin objetivos no dibuja la línea (es el caso de hoy: la campaña real todavía no los declara)', () => {
    montarEscena(conArte);
    render(<EscenaScreen />);
    expect(screen.queryByTestId('objetivo')).not.toBeInTheDocument();
    // Y el lugar sigue estando: lo que falta es el objetivo, no la barra.
    expect(screen.getByText('La plaza vieja')).toBeInTheDocument();
  });
});
