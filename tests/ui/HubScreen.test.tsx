/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
 *
 * Corta por el texto `@media` **en cualquier parte**, comentarios incluidos: si algún día un
 * comentario de la cabecera lo nombra, esto se queda corto. No es silencioso —se lleva reglas
 * puestas y los casos caen en rojo, no en verde—, así que alcanza con saberlo.
 */
const cssBase = (): string => css().split('@media')[0] ?? '';

/**
 * Los cuerpos de TODAS las reglas de `bloque` cuyo selector incluye a `selector` como una de sus
 * partes separadas por coma.
 *
 * `cuerpoDe` pide el selector entero y acá hace falta lo contrario: adentro del bloque de
 * movimiento reducido las cinco clases comparten una sola regla (`.tarjeta, .jugar, …`), así que
 * preguntar por `.tarjeta` sola con `cuerpoDe` devuelve `null` y preguntar por el bloque entero
 * con un `toMatch` es ciego a qué selector recibe la declaración — que es justo el agujero que
 * este helper cierra.
 */
function reglasPara(bloque: string, selector: string): string[] {
  const sinComentariosCss = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\//g, '');
  const cuerpos: string[] = [];
  for (const [, sel = '', cuerpo = ''] of bloque.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const partes = sinComentariosCss(sel).replace(/\s+/g, '').split(',');
    if (partes.includes(selector)) cuerpos.push(sinComentariosCss(cuerpo));
  }
  return cuerpos;
}
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
    for (const selector of ['.pantalla>.fondo>[data-aspect]', ".tarjeta>.portada>[data-aspect='3:4']"]) {
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
    //
    // Prohibir `auto-fill` no alcanza: borrar `grid-template-columns` entero, o volver a
    // `minmax(300px, 1fr)`, pasaba en verde. Se pide la forma completa. El `min(100%, …)` es la
    // parte que evita que en un teléfono la pista pedida (26em) sea más ancha que la pantalla y
    // la tarjeta se desborde.
    const grilla = cuerpoDe(cssBase(), '.grilla');
    expect(grilla, 'no hay regla .grilla').not.toBeNull();
    expect(grilla ?? '', 'la grilla sigue en auto-fill').not.toMatch(/auto-fill/);
    expect(grilla ?? '', 'la grilla no reparte con auto-fit').toMatch(
      /grid-template-columns:\s*repeat\(\s*auto-fit\s*,/,
    );
    expect(grilla ?? '', 'la pista no está acotada al ancho de la pantalla').toMatch(
      /minmax\(\s*min\(\s*100%/,
    );
  });

  it('el arte está clavado al viewport y el título mide contra la ventana', () => {
    // Dos líneas que sostienen argumentos escritos en el archivo y que no vigilaba nadie
    // (las dos pasaban mutadas):
    //
    // (1) `.fondo` y `.velo` son `fixed` y no `absolute` PORQUE esta pantalla scrollea: con
    //     `absolute` el arte se va con el scroll y abajo queda el fondo liso, que es justo lo
    //     que la tarea vino a sacar. La escena puede darse el lujo de `absolute` porque no
    //     scrollea nunca.
    // (2) el título mide contra `--tam-texto-juego`, no en `rem`. `rem` vale 16 px SIEMPRE (el
    //     `font-size` del documento vive en `body`, no en `<html>`), así que un `2rem` acá no
    //     seguiría ni a la ventana ni a la preferencia de letra grande: es el mismo bug que la
    //     tarea 1 arregló en el dado.
    for (const selector of ['.fondo', '.velo']) {
      expect(cuerpoDe(cssBase(), selector) ?? '', `${selector} se iría con el scroll`).toMatch(
        /position\s*:\s*fixed/,
      );
    }
    const titulo = cuerpoDe(cssBase(), '.titulo') ?? '';
    expect(titulo, 'no hay regla .titulo').not.toBe('');
    expect(titulo, 'el nombre del juego no escala con la ventana').toMatch(
      /font-size:[^;]*var\(--tam-texto-juego\)/,
    );
  });

  it('el cromo no puede pisar la placa del título', () => {
    // Estuvo `position: absolute; top: 0; right: 0`, que es donde el género pone el cromo, y era
    // un bug: así no reserva ni ancho ni alto y la placa —que crece con el ALTO de la ventana—
    // se le mete encima. Medido en el navegador: 196,5 px de solape a 810x905, 151,5 a 900x905,
    // 121,5 a 960x905 (media pantalla en el monitor de Gabriel), 51,5 a 1100x905 y 36,1 a
    // 1280x1200. Una media query de ancho NO lo arregla —a 1280 de ancho solapa o no según el
    // alto—, así que lo que se fija es que el cromo esté en el flujo.
    const cromo = cuerpoDe(cssBase(), '.cromo') ?? '';
    expect(cromo, 'no hay regla .cromo').not.toBe('');
    expect(cromo, 'el cromo volvió a salirse del flujo').not.toMatch(
      /position\s*:\s*(absolute|fixed)/,
    );
  });

  it('en el teléfono la tarjeta apila y la portada se acota por alto', () => {
    // El bloque `@media (max-width: 800px)` entero no lo vigilaba nadie: borrándolo, los casos
    // quedaban en verde y con él se iban la tarjeta apilada y la portada acotada, o sea los
    // 231,41 x 308,55 px que el informe reporta como resultado a 375x812. Sin acotar, esa
    // portada mediría 425,33 px de alto —más de la mitad de la ventana— y empujaría la premisa
    // y el botón fuera de la pantalla.
    const telefono = bloqueDeMedia(css(), '@media (max-width: 800px)');
    const tarjeta = cuerpoDe(telefono, '.tarjeta') ?? '';
    expect(tarjeta, 'la tarjeta no apila en el teléfono').toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/,
    );
    const portada = cuerpoDe(telefono, ".tarjeta>.portada>[data-aspect='3:4']") ?? '';
    expect(portada, 'la portada del teléfono no se acota por alto').toMatch(/height:\s*\d+(\.\d+)?vh/);
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
    // El título de sección es el ÚNICO texto que no vive adentro de un panel, así que apoya
    // contra el arte y nada más, y su capa propia es lo que sostiene el contraste: calculado
    // contra el peor caso (una portada BLANCA), `--color-acento` sobre el velo da 2,00:1 —no
    // llega ni al 3:1 de texto grande— y con esta capa encima, 5,56:1. Sin este caso, borrar la
    // línea no rompía nada y el §4 del informe quedaba sin nada que lo sostenga.
    const subtitulo = cuerpoDe(cssBase(), '.subtitulo') ?? '';
    expect(subtitulo, 'el título de sección se quedó apoyado contra el arte pelado').toContain(
      'var(--capa-cromo)',
    );
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
    //
    // Y se pide SELECTOR POR SELECTOR, no por texto libre sobre el bloque. Un
    // `expect(bloque).toMatch(/transition:\s*none/)` es ciego a quién recibe la declaración:
    // sacando `.tarjeta` de los dos selectores del bloque y dejando las declaraciones en
    // `.jugar` quedaba en verde, con la tarjeta animando para quien pidió que no. Es la misma
    // familia del `\brem\b` de la tarea 1 y del `cuerpoDe` del `@media` de más arriba.
    const reducido = bloqueDeMedia(css(), '@media (prefers-reduced-motion');
    for (const selector of ['.tarjeta', '.jugar', '.secundario', '.elegir', '.borrar']) {
      expect(
        reglasPara(reducido, selector).join('\n'),
        `${selector} sigue animando con prefers-reduced-motion`,
      ).toMatch(/transition\s*:\s*none/);
    }
    expect(
      reglasPara(reducido, '.tarjeta:hover').join('\n'),
      'el desplazamiento de la tarjeta sigue vivo con prefers-reduced-motion',
    ).toMatch(/transform\s*:\s*none/);
  });

  it('el fondo a sangre sale del fondo que la campaña declara, y cae a su portada si no hay', async () => {
    // `CampaignMeta.cover` existía en el esquema y no lo leía nadie: la única lectura del repo
    // era una aserción de `tests/content/vado.test.ts`. Y el autor ya había escrito el valor
    // —`cover: 'molino_de_tome'`, el nombre de un FONDO de escena—, así que el contenido ya había
    // dicho cuál es su imagen y la interfaz la ignoraba y usaba la portada.
    //
    // Importa por el encuadre, no por prolijidad: una portada es 900x1200 (retrato) y a 1919x905
    // `cover` sólo deja ver el 35,4 % de su alto; un fondo 16:9 se ve al 83,8 % (medido).
    registrar([meta('vado', [1, 3], { cover: 'molino_de_tome' })]);
    montarStore([], null);
    await montar();

    await waitFor(() => {
      const decorativa = document.querySelector('[aria-hidden="true"] img');
      expect(decorativa?.getAttribute('src'), 'el fondo no es el que declara la campaña').toMatch(
        /molino_de_tome/,
      );
    });
    // Y la tarjeta sigue mostrando la PORTADA, que es otra imagen y otro papel.
    const portada = await screen.findByAltText(S.hub.campana.portadaAlt('Campaña vado'));
    expect(portada.getAttribute('src')).toMatch(/portada_vado/);
    cleanup();

    // Sin fondo declarado que exista, el respaldo es la portada de la campaña.
    registrar([meta('vado', [1, 3])]); // `cover` de fixture: 'vado_portada', que no es ningún fondo
    montarStore([], null);
    await montar();
    await waitFor(() => {
      expect(document.querySelector('[aria-hidden="true"] img')?.getAttribute('src')).toMatch(
        /portada_vado/,
      );
    });
    cleanup();

    // Y sin ninguna de las dos, NADA: a sangre, la caja gris del `Placeholder` no es un fondo
    // sino un error a pantalla completa. La campaña de humo `prueba` está en este caso.
    registrar([meta('sin_arte', [1, 3], { cover: 'tampoco_existe' })]);
    montarStore([], null);
    await montar();
    expect(document.querySelector('[aria-hidden="true"] img')).toBeNull();
  });

  it('una campaña sin escenas mortales no explica la regla de la muerte', async () => {
    // La regla dejó de vivir en un `<details>` y se pinta sólo si hay escenas mortales. Ninguna
    // fixture del hub usaba `lethalScenes: 0`, así que esa rama no la cubría nadie.
    registrar([meta('c1', [1, 3], { lethalScenes: 0 })]);
    await montar();

    expect(screen.getByText(S.hub.campana.mortales(0))).toBeInTheDocument();
    expect(screen.queryByText(S.hub.campana.reglaMortal)).toBeNull();
  });

  it('después de borrar, el foco no se queda en un botón que ya no existe', async () => {
    // La trampa de foco del `Dialogo` devuelve el foco a quien lo abrió, y al confirmar un
    // borrado ese botón se desmonta con su fila: el foco caía a `<body>` y el jugador de teclado
    // quedaba sin lugar. Con `window.confirm` terminaba igual, pero eso lo resolvía el navegador
    // y esto es código nuestro.
    montarStore([makeCharacter({ level: 2 })], 'pj_prueba', { deleteCharacter: vi.fn() });
    await montar();

    fireEvent.click(screen.getByRole('button', { name: /Borrar a/i }));
    fireEvent.click(screen.getByRole('button', { name: S.hub.personaje.borrarBoton }));
    expect(screen.getByTestId('crear-personaje')).toHaveFocus();
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
