/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CampaignEntry } from '@/content/campaigns';
import type { Campaign, CampaignMeta } from '@/content/schema';
import type { Character } from '@/engine/types';
import { useStore, type Store } from '@/state/store';
import { HubScreen } from '@/ui/screens/HubScreen';
import { S } from '@/ui/strings.es';
import { makeCharacter, makeRun } from '../fixtures/state';

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

  it('pide confirmación antes de empezar solo si la campaña es Exigente o Mortal', async () => {
    registrar([meta('c1', [3, 5])]);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Pareja: arranca sin preguntar nada.
    const enRango = nuevoStartRun();
    montarStore([makeCharacter({ level: 3 })], 'pj_prueba', { startRun: enRango });
    await montar();
    fireEvent.click(screen.getByTestId('jugar-c1'));
    expect(confirmar).not.toHaveBeenCalled();
    expect(enRango).toHaveBeenCalledWith('c1');
    cleanup();

    // Exigente: pregunta, y con el riesgo dicho en el mensaje.
    const exigente = nuevoStartRun();
    montarStore([makeCharacter({ level: 2 })], 'pj_prueba', { startRun: exigente });
    await montar();
    fireEvent.click(screen.getByTestId('jugar-c1'));
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(confirmar.mock.calls[0]?.[0]).toContain(S.hub.confirmar.exigente);
    expect(exigente).toHaveBeenCalledWith('c1');
    cleanup();

    // Mortal: pregunta, y si el jugador dice que no, no arranca.
    confirmar.mockReturnValue(false);
    const mortal = nuevoStartRun();
    montarStore([makeCharacter({ level: 1 })], 'pj_prueba', { startRun: mortal });
    await montar();
    fireEvent.click(screen.getByTestId('jugar-c1'));
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(confirmar.mock.calls[1]?.[0]).toContain(S.hub.confirmar.mortal);
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
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const startRun = nuevoStartRun();
    montarStore([makeCharacter({ level: 2, run: makeRun({ campaignId: 'c1' }) })], 'pj_prueba', { startRun });
    await montar();

    fireEvent.click(screen.getByTestId('jugar-c2'));
    expect(confirmar.mock.calls[0]?.[0]).toContain(S.hub.confirmarPerderPartida('Campaña c1'));
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

    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByTestId('borrar-pj_muerto'));
    expect(confirmar).toHaveBeenCalledWith(S.hub.personaje.borrarConfirmar('Finado'));
    expect(deleteCharacter).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('borrar-pj_muerto'));
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
