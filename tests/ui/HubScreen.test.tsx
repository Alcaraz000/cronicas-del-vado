/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CampaignEntry } from '@/content/campaigns';
import type { Campaign, CampaignMeta } from '@/content/schema';
import type { Character } from '@/engine/types';
import { useStore, type Store } from '@/state/store';
import { HubScreen } from '@/ui/screens/HubScreen';
import { S } from '@/ui/strings.es';
import { bloqueDeMedia, cuerpoDe } from '../fixtures/css';
import { makeCharacter, makeRun } from '../fixtures/state';

const css = (): string => readFileSync(resolve(process.cwd(), 'src/ui/screens/HubScreen.module.css'), 'utf8');

/**
 * La hoja HASTA el primer `@media`, que es donde viven las reglas de base.
 *
 * `cuerpoDe` devuelve el cuerpo de la PRIMERA regla cuyo selector coincide, y varios selectores
 * de este archivo aparecen dos veces: una en la base y otra adentro de un `@media` que la
 * redefine (`.tarjeta`, `.panel`, `.tarjeta>.portada>[data-aspect='3:4']`, `.tarjeta:hover`).
 * Buscar sobre el archivo entero hace que un caso pueda pasar en verde contra la regla del
 * teléfono o contra la de `prefers-reduced-motion`: probado, borrar `.tarjeta:hover` de la base
 * dejaba los 24 casos en verde porque `cuerpoDe` encontraba el `.tarjeta:hover` del bloque de
 * movimiento reducido. Cortar acá es lo que hace que estas aserciones muerdan.
 */
const cssBase = (): string => css().split('@media')[0] ?? '';
const fuente = (): string => readFileSync(resolve(process.cwd(), 'src/ui/screens/HubScreen.tsx'), 'utf8');

/** El fuente sin comentarios: `window.confirm` se sigue NOMBRANDO en los comentarios del repo. */
const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/**
 * El registro de campañas se reemplaza por uno de prueba: las campañas reales no
 * alcanzan para cubrir las cinco etiquetas de dificultad (Aldamar es `[1, 3]`, así que
 * Exigente pediría un personaje de nivel 0, que no existe). Con metas sintéticas de
 * rango `[3, 5]` el mismo personaje recorre Mortal, Exigente, Pareja, Tranquila y Paseo.
 */
const H = vi.hoisted(() => ({
  metas: [] as CampaignMeta[],
  campaigns: {} as Record<string, CampaignEntry>,
}));

vi.mock('@/content/campaigns', () => ({
  CAMPAIGNS: H.campaigns,
  listCampaigns: (incluirOcultas: boolean): CampaignMeta[] =>
    H.metas.filter((m) => incluirOcultas || m.hidden !== true),
  campaignTitle: (id: string): string => H.campaigns[id]?.meta.title ?? id,
}));

function meta(id: string, levelRange: [number, number], extra: Partial<CampaignMeta> = {}): CampaignMeta {
  return {
    id,
    contentVersion: 1,
    title: `Campaña ${id}`,
    premise: `Premisa de ${id}`,
    cover: `${id}_portada`,
    levelRange,
    durationMin: [20, 30],
    lethalScenes: 1,
    lintProfile: 'release',
    ...extra,
  };
}

/** Campaña completa falsa: el hub solo le pide `endings`, para contar cuántos finales hay. */
function campanaFalsa(m: CampaignMeta, finales: number): Campaign {
  const endings = Object.fromEntries(
    Array.from({ length: finales }, (_, i) => [`fin_${i}`, { title: `Final ${i}` }]),
  );
  return { ...m, endings } as Campaign;
}

function registrar(metas: CampaignMeta[], finales = 4): void {
  H.metas.splice(0, H.metas.length, ...metas);
  for (const id of Object.keys(H.campaigns)) delete H.campaigns[id];
  for (const m of metas) {
    H.campaigns[m.id] = { meta: m, load: (): Promise<Campaign> => Promise.resolve(campanaFalsa(m, finales)) };
  }
}

/**
 * Solo toca lo que el hub lee. No reescribe `ui`: esa porción la están ampliando
 * otras tareas de la Fase C y el hub no depende de su forma.
 */
function montarStore(characters: Character[], activo: string | null, acciones: Partial<Store> = {}): void {
  useStore.setState({ characters, activeCharacterId: activo, ...acciones });
}

/**
 * Renderiza y deja que se resuelva el `import()` con el que el hub cuenta los finales,
 * dentro de `act`, para que ese `setState` no caiga fuera del test.
 */
async function montar(): Promise<void> {
  render(<HubScreen />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function nuevoStartRun(): ReturnType<typeof vi.fn<(campaignId: string) => Promise<void>>> {
  return vi.fn<(campaignId: string) => Promise<void>>(() => Promise.resolve());
}

describe('HubScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    registrar([]);
    montarStore([], null, { startRun: nuevoStartRun(), continueRun: () => Promise.resolve() });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  /**
   * Tarea 6 (Fase H): `ScreenRouter` desmonta la pantalla anterior entera, así que el control
   * que tenía el foco al llegar acá ya no existe y el foco cae a `<body>`, invisible. El
   * título recibe el foco por programa apenas se monta (ver `useEnfocarAlEntrar`).
   */
  it('lleva el foco al título apenas se monta, para no dejarlo perdido en <body>', async () => {
    await montar();

    const titulo = screen.getByRole('heading', { level: 1, name: S.hub.titulo });
    expect(titulo).toHaveFocus();
  });

  it('muestra la etiqueta de dificultad relativa al nivel del personaje activo', async () => {
    registrar([meta('c1', [3, 5])]);
    const casos = [
      [1, 'mortal'],
      [2, 'exigente'],
      [3, 'pareja'],
      [5, 'pareja'],
      [6, 'tranquila'],
      [7, 'tranquila'],
      [8, 'paseo'],
    ] as const;

    for (const [nivel, esperada] of casos) {
      montarStore([makeCharacter({ level: nivel })], 'pj_prueba');
      await montar();

      const etiqueta = screen.getByTestId('etiqueta-c1');
      expect(etiqueta).toHaveAttribute('data-etiqueta', esperada);
      expect(etiqueta).toHaveTextContent(S.hub.etiqueta[esperada]);
      cleanup();
    }
  });

  it('avisa del modificador Veterano solo cuando la campaña quedó por debajo del personaje', async () => {
    registrar([meta('c1', [3, 5])]);

    montarStore([makeCharacter({ level: 4 })], 'pj_prueba');
    await montar();
    expect(screen.queryByTestId('veterano-c1')).toBeNull();
    cleanup();

    montarStore([makeCharacter({ level: 6 })], 'pj_prueba');
    await montar();
    expect(screen.getByTestId('veterano-c1')).toHaveTextContent(S.hub.veterano(-1));
    cleanup();

    montarStore([makeCharacter({ level: 8 })], 'pj_prueba');
    await montar();
    expect(screen.getByTestId('veterano-c1')).toHaveTextContent(S.hub.veterano(-2));
  });

  /**
   * La REGLA no cambió en la Fase C: Pareja arranca sin preguntar, Exigente y Mortal
   * preguntan con el riesgo dicho, y decir que no no arranca nada. Lo que cambió es por
   * dónde se pregunta: era `window.confirm` y ahora es `Dialogo`, así que las aserciones
   * miran el modal en vez del espía del navegador.
   */
  it('pide confirmación antes de empezar solo si la campaña es Exigente o Mortal', async () => {
    registrar([meta('c1', [3, 5])]);

    // Pareja: arranca sin preguntar nada.
    const enRango = nuevoStartRun();
    montarStore([makeCharacter({ level: 3 })], 'pj_prueba', { startRun: enRango });
    await montar();
    fireEvent.click(screen.getByTestId('jugar-c1'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(enRango).toHaveBeenCalledWith('c1');
    cleanup();

    // Exigente: pregunta, y con el riesgo dicho en el mensaje.
    const exigente = nuevoStartRun();
    montarStore([makeCharacter({ level: 2 })], 'pj_prueba', { startRun: exigente });
    await montar();
    fireEvent.click(screen.getByTestId('jugar-c1'));
    expect(exigente, 'arrancó sin esperar la confirmación').not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(S.hub.confirmar.exigente);
    fireEvent.click(screen.getByRole('button', { name: S.hub.confirmar.empezar }));
    expect(exigente).toHaveBeenCalledWith('c1');
    cleanup();

    // Mortal: pregunta, y si el jugador dice que no, no arranca.
    const mortal = nuevoStartRun();
    montarStore([makeCharacter({ level: 1 })], 'pj_prueba', { startRun: mortal });
    await montar();
    fireEvent.click(screen.getByTestId('jugar-c1'));
    expect(screen.getByRole('dialog')).toHaveTextContent(S.hub.confirmar.mortal);
    fireEvent.click(screen.getByRole('button', { name: S.comun.cancelar }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mortal).not.toHaveBeenCalled();
  });

  it('ofrece Continuar solo en la campaña que tiene la partida en curso', async () => {
    registrar([meta('c1', [1, 3]), meta('c2', [1, 3])]);
    const startRun = nuevoStartRun();
    const continueRun = vi.fn<() => Promise<void>>(() => Promise.resolve());
    const conPartida = makeCharacter({ level: 2, run: makeRun({ campaignId: 'c1' }) });
    montarStore([conPartida], 'pj_prueba', { startRun, continueRun });
    await montar();

    expect(screen.getByTestId('jugar-c1')).toHaveTextContent(S.hub.campana.continuar);
    expect(screen.getByTestId('jugar-c2')).toHaveTextContent(S.hub.campana.comenzar);

    fireEvent.click(screen.getByTestId('jugar-c1'));
    expect(continueRun).toHaveBeenCalledTimes(1);
    expect(startRun).not.toHaveBeenCalled();
  });

  it('sin partida en curso ninguna tarjeta ofrece Continuar', async () => {
    registrar([meta('c1', [1, 3])]);
    montarStore([makeCharacter({ level: 2, run: null })], 'pj_prueba');
    await montar();

    expect(screen.getByTestId('jugar-c1')).toHaveTextContent(S.hub.campana.comenzar);
    expect(screen.queryByText(S.hub.campana.continuar)).toBeNull();
  });

  it('avisa que empezar otra campaña cierra como derrota la partida en curso', async () => {
    registrar([meta('c1', [1, 3]), meta('c2', [1, 3])]);
    const startRun = nuevoStartRun();
    montarStore([makeCharacter({ level: 2, run: makeRun({ campaignId: 'c1' }) })], 'pj_prueba', { startRun });
    await montar();

    fireEvent.click(screen.getByTestId('jugar-c2'));
    expect(screen.getByRole('dialog')).toHaveTextContent(S.hub.confirmarPerderPartida('Campaña c1'));
    fireEvent.click(screen.getByRole('button', { name: S.comun.cancelar }));
    expect(startRun).not.toHaveBeenCalled();
  });

  it('muestra finales vistos sobre el total, partidas jugadas y el tope de nivel de la campaña', async () => {
    registrar([meta('c1', [1, 3])], 4);
    montarStore(
      [
        makeCharacter({
          level: 2,
          campaignLog: { c1: { runs: 3, wins: 1, endings: ['fin_0', 'fin_2'], milestones: [] } },
        }),
      ],
      'pj_prueba',
    );
    await montar();

    expect(await screen.findByText(S.hub.campana.finales(2, 4))).toBeInTheDocument();
    expect(screen.getByText(S.hub.campana.partidas(3))).toBeInTheDocument();
    expect(screen.getByText(S.hub.campana.tope(4))).toBeInTheDocument();
    expect(screen.getByText(S.hub.campana.mortales(1))).toBeInTheDocument();
    expect(screen.getByText(S.hub.campana.reglaMortal)).toBeInTheDocument();
  });

  it('sin personaje activo no hay etiqueta ni se puede jugar', async () => {
    registrar([meta('c1', [1, 3])]);
    const startRun = nuevoStartRun();
    montarStore([], null, { startRun });
    await montar();

    expect(screen.queryByTestId('etiqueta-c1')).toBeNull();
    expect(screen.getByTestId('jugar-c1')).toBeDisabled();
    expect(screen.getByText(S.hub.campana.necesitaPersonaje)).toBeInTheDocument();
    expect(startRun).not.toHaveBeenCalled();
  });

  it('con el personaje activo muerto no deja jugar y lo dice', async () => {
    registrar([meta('c1', [1, 3])]);
    montarStore([makeCharacter({ level: 2, dead: { campaign: 'c1', scene: 'x' } })], 'pj_prueba');
    await montar();

    expect(screen.getByTestId('jugar-c1')).toBeDisabled();
    expect(screen.getByText(S.hub.campana.personajeMuerto)).toBeInTheDocument();
  });

  it('deja cambiar de personaje y crear otro cuando el store ofrece esas acciones', async () => {
    registrar([meta('c1', [1, 3])]);
    const selectCharacter = vi.fn<(id: string) => void>();
    const goTo = vi.fn<(screen: string) => void>();
    const otro = makeCharacter({ id: 'pj_otro', name: 'Otra', level: 5 });
    montarStore([makeCharacter({ level: 2 }), otro], 'pj_prueba', { selectCharacter, goTo } as Partial<Store>);
    await montar();

    fireEvent.click(screen.getByTestId('elegir-pj_otro'));
    expect(selectCharacter).toHaveBeenCalledWith('pj_otro');

    fireEvent.click(screen.getByTestId('crear-personaje'));
    expect(goTo).toHaveBeenCalledWith('creacion');
  });

  it('borra un personaje con confirmación: es la única salida cuando el perfil está lleno', async () => {
    registrar([meta('c1', [1, 3])]);
    const deleteCharacter = vi.fn<(id: string) => void>();
    const muerto = makeCharacter({ id: 'pj_muerto', name: 'Finado', dead: { campaign: 'c1', scene: 'x' } });
    montarStore([muerto, makeCharacter({ id: 'pj_otro', name: 'Otra' })], 'pj_muerto', {
      deleteCharacter,
    } as Partial<Store>);
    await montar();

    // Con el activo muerto no se puede jugar, y el hub dice por qué.
    expect(screen.getByTestId('jugar-c1')).toBeDisabled();

    // Se pregunta antes, y decir que no no borra nada. La pregunta es un `Dialogo` desde la
    // Fase C, tarea 3; el texto que se lee es el mismo de siempre.
    fireEvent.click(screen.getByTestId('borrar-pj_muerto'));
    expect(screen.getByRole('dialog')).toHaveTextContent(S.hub.personaje.borrarConfirmar('Finado'));
    fireEvent.click(screen.getByRole('button', { name: S.comun.cancelar }));
    expect(deleteCharacter).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('borrar-pj_muerto'));
    fireEvent.click(screen.getByRole('button', { name: S.hub.personaje.borrarBoton }));
    expect(deleteCharacter).toHaveBeenCalledWith('pj_muerto');
  });

  it('muestra la portada real de una campaña por su id, y cae al placeholder si no hay arte', async () => {
    // El archivo real es `portada_vado.webp`: se busca por el id de la campaña ('vado'),
    // no por `meta.cover` (acá 'sin_arte_portada', que a propósito no coincide con nada).
    registrar([meta('vado', [1, 3]), meta('sin_arte', [1, 3], { cover: 'sin_arte_portada' })]);
    montarStore([], null);
    await montar();

    const portada = await screen.findByAltText(S.hub.campana.portadaAlt('Campaña vado'));
    expect(portada.tagName).toBe('IMG');
    expect(portada.getAttribute('src')).toMatch(/portada_vado/);

    expect(screen.getByRole('img', { name: S.hub.campana.portadaAlt('Campaña sin_arte') })).toBeInTheDocument();
  });
});

/**
 * Fase C, tarea 3. El hub era un formulario: no nombraba el juego, no usaba ninguno de los
 * tokens de capa del vocabulario visual de la escena, no tenía un solo estado interactivo y
 * bajo el encabezado el contenido moría a la izquierda. Estos casos fijan lo que se rehizo.
 */
describe('HubScreen: el menú se construye sobre el arte', () => {
  beforeEach(() => {
    localStorage.clear();
    registrar([meta('c1', [1, 3])]);
    montarStore([makeCharacter({ level: 2 })], 'pj_prueba', {
      startRun: nuevoStartRun(),
      continueRun: () => Promise.resolve(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('el nombre del juego está en la pantalla', async () => {
    // Hoy el hub abría con "Campañas" —una etiqueta de sección— y el nombre del juego no
    // aparecía en ningún lado: sólo lo pintaba InicioScreen.
    await montar();

    expect(screen.getByText(/Crónicas del Vado/i)).toBeInTheDocument();
    // Y es el encabezado de la pantalla, no un adorno suelto: es lo que recibe el foco al
    // entrar (`useEnfocarAlEntrar`), así que un lector de pantalla lo anuncia primero.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Crónicas del Vado/i);
  });

  it('la pantalla declara su landmark y la lista de campañas tiene nombre', async () => {
    // CreacionScreen y EscenaScreen abren <main>; el hub abría un <div> pelado. Y la <ul> de
    // campañas era la única sección sin encabezado ni aria-label.
    await montar();

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /campañ/i })).toBeInTheDocument();
  });

  it('el orden de lectura pone el juego antes de la administración del perfil', async () => {
    // Era al revés: la ficha del personaje y la lista de personajes iban ARRIBA de las
    // campañas, así que lo primero que se leía en la pantalla de elegir campaña era el ABM
    // del perfil. `compareDocumentPosition` pregunta por el orden del DOM, que es el orden
    // de lectura de un lector de pantalla y del recorrido con Tab.
    await montar();

    const campanas = screen.getByRole('list', { name: /campañ/i });
    const personaje = screen.getByRole('heading', { name: S.hub.personaje.titulo });
    expect(
      campanas.compareDocumentPosition(personaje) & Node.DOCUMENT_POSITION_FOLLOWING,
      'el bloque de personajes sigue estando antes que las campañas',
    ).toBeTruthy();
  });

  it('las dos confirmaciones son Dialogo y no el cuadro gris del sistema operativo', async () => {
    // HubScreen.tsx:192 y :203 eran los ÚNICOS window.confirm que quedaban en src/. El momento
    // más dramático del hub —arrancar una campaña que te puede matar el personaje— se resolvía
    // con el diálogo nativo mientras el resto del juego usa `Dialogo`.
    const espia = vi.spyOn(window, 'confirm');
    registrar([meta('c1', [3, 5])]);
    montarStore([makeCharacter({ level: 1 })], 'pj_prueba', { startRun: nuevoStartRun() });
    await montar();

    // (1) la de borrar un personaje
    fireEvent.click(screen.getByRole('button', { name: /Borrar a/i }));
    expect(espia, 'borrar sigue usando window.confirm').not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: S.comun.cancelar }));

    // (2) la de empezar una campaña Mortal
    fireEvent.click(screen.getByTestId('jugar-c1'));
    expect(espia, 'empezar sigue usando window.confirm').not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(S.hub.confirmar.mortal);
  });

  it('no queda ningún window.confirm en el fuente del hub', () => {
    // El caso de arriba prueba los dos caminos que HOY existen; este impide que nazca un
    // tercero. Se leen los comentarios aparte porque el archivo NOMBRA `window.confirm` al
    // explicar por qué ya no lo usa, y un grep pelado pasaría en verde contra esa frase.
    expect(sinComentarios(fuente())).not.toMatch(/window\.confirm/);
  });

  it('borrar un personaje no se ve igual que jugar con él', async () => {
    // Las dos acciones pasaban por `styles.secundario`, pegadas en un flex con 8px de
    // separación: borrar para siempre se veía idéntico a seleccionar.
    montarStore([makeCharacter({ level: 2 }), makeCharacter({ id: 'pj_otro', name: 'Otra' })], 'pj_prueba');
    await montar();

    const jugar = screen.getByRole('button', { name: /Jugar con/i });
    const borrar = screen.getByRole('button', { name: S.hub.personaje.borrar('Otra') });
    expect(borrar.className, 'borrar y jugar comparten clase').not.toBe(jugar.className);
  });

  it('la portada no está capada al max-width pensado para otra pantalla', () => {
    // `Imagen.module.css:13-16` pone `max-width: 160px` a todo `[data-aspect='3:4']`. El
    // archivo es de 900x1200: la portada salía a 160x213,33 px, el 17,8 % de su fuente, igual
    // en un monitor de 2560 que en un teléfono (medido en el navegador, no estimado).
    // `EscenaScreen.module.css:173-178` ya lo anula así para el sprite, que es el mismo caso.
    //
    // Se pide regla por regla y con el selector ENTERO. Un `toMatch(/max-width: none/)` contra
    // el archivo suelto no muerde: probado sacándole el `max-width` a la portada de la tarjeta,
    // los 24 casos quedaban en verde porque la regla del fondo a sangre seguía teniéndolo.
    // Y los tres selectores encadenados son parte de lo que se fija: `.marco[data-aspect='3:4']`
    // pesa (0,2,0), así que con dos no alcanza y el resultado dependería del orden de
    // importación, que ningún CSS Module garantiza.
    for (const selector of [".pantalla>.fondo>[data-aspect='3:4']", ".tarjeta>.portada>[data-aspect='3:4']"]) {
      const regla = cuerpoDe(cssBase(), selector);
      expect(regla, `no hay regla ${selector}`).not.toBeNull();
      expect(regla ?? '', `${selector} no anula el tope de 160px de Imagen.module.css`).toMatch(
        /max-width\s*:\s*none/,
      );
    }
  });

  it('la grilla no achica la única tarjeta cuanto más grande es la pantalla', () => {
    // `repeat(auto-fill, minmax(300px, 1fr))` abre columnas VACÍAS: con una sola campaña la
    // tarjeta medía 395 px a 1280x800, 358,39 a 1919x905 y 300 a 2560x1440 (medido por DOM).
    // O sea que trabajaba al revés: cuanta más pantalla, más chica la tarjeta.
    const grilla = cuerpoDe(cssBase(), '.grilla');
    expect(grilla, 'no hay regla .grilla').not.toBeNull();
    expect(grilla ?? '', 'la grilla sigue en auto-fill').not.toMatch(/auto-fill/);
  });

  it('el hub habla el idioma visual de la escena y no el suyo propio', () => {
    // La fase anterior construyó un vocabulario de capas (tokens.css:34-44) y esta pantalla no
    // lo tocaba ni una vez: era `--color-superficie` opaco sobre fondo liso mientras la escena
    // pinta translúcido sobre el arte.
    //
    // Regla por regla y no contra el archivo entero: con un `toContain` suelto, cambiarle la
    // capa a la tarjeta dejaba los casos en verde porque el panel de personajes todavía la
    // tenía. Probado mutándolo.
    for (const selector of ['.tarjeta', '.panel']) {
      const regla = cuerpoDe(cssBase(), selector) ?? '';
      expect(regla, `no hay regla ${selector}`).not.toBe('');
      expect(regla, `${selector} no se apoya en el arte`).toContain('var(--capa-caja)');
      expect(regla, `${selector} no lleva el filo de oro`).toContain('var(--filo-acento)');
    }
    // Y el velo, que es lo que hace legible el texto sobre una imagen que no controlamos.
    const velo = cuerpoDe(cssBase(), '.velo') ?? '';
    expect(velo, 'el velo no usa las capas del vocabulario').toMatch(/var\(--capa-(arte|caja|cromo)\)/);
  });

  it('la tarjeta y los botones contestan al cursor, y el movimiento se apaga si lo piden', () => {
    // No había un solo `:hover`, ni una transición, ni una sombra en todo el archivo: los
    // controles no contestaban nada.
    //
    // De nuevo regla por regla: `toMatch(/:hover/)` contra el archivo entero no muerde, porque
    // con sacarle el `:hover` a la tarjeta quedaban los de los botones y pasaba igual.
    for (const selector of ['.tarjeta:hover', '.borrar:hover']) {
      expect(cuerpoDe(cssBase(), selector), `${selector} no existe`).not.toBeNull();
    }
    expect(cuerpoDe(cssBase(), '.tarjeta') ?? '', 'la tarjeta cambia de golpe').toMatch(/transition\s*:/);
    // La transición respeta la preferencia del sistema, como `Imagen.module.css` y
    // `Dados.module.css`. Se lee el bloque `@media` contando llaves (`bloqueDeMedia`) y no
    // cortando en la primera `}`: adentro hay más de una regla.
    const reducido = bloqueDeMedia(css(), '@media (prefers-reduced-motion');
    expect(reducido, 'la transición no se apaga con prefers-reduced-motion').toMatch(
      /transition\s*:\s*none/,
    );
    expect(reducido, 'el desplazamiento de la tarjeta sigue vivo con prefers-reduced-motion').toMatch(
      /transform\s*:\s*none/,
    );
  });

  it('la premisa de la campaña no es más chica que el texto de una escena', () => {
    // Los títulos de sección medían 15 px, lo mismo que el cuerpo, y la premisa (91 palabras)
    // salía a 15 px: más chica que la prosa de una escena, que mide --tam-texto-juego (19 px
    // de piso). Sin jerarquía, todo pesa igual y nada guía la lectura.
    const premisa = cuerpoDe(cssBase(), '.premisa') ?? '';
    expect(premisa, 'no hay regla .premisa').not.toBe('');
    expect(premisa, 'la premisa no se mide contra el cuerpo de la prosa').toMatch(
      /font-size:[^;]*var\(--tam-texto-juego\)/,
    );
    // Y el título de la campaña, por encima de la premisa. `\(` a propósito: `--tam-ui-chico`
    // contiene a `--tam-ui` como prefijo y sin el paréntesis la aserción no distingue.
    const titulo = cuerpoDe(cssBase(), '.tituloCampana') ?? '';
    expect(titulo, 'el título de la campaña no escala con la ventana').toMatch(
      /font-size:[^;]*var\(--tam-texto-juego\)/,
    );
  });
});
