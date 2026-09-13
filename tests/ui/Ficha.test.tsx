/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CLASSES, CONDITIONS, SKILLS, TRAITS, WOUND_LABELS } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import type { Character, Run, WorldState } from '@/engine/types';
import { topeDeNivel, xpDelNivel } from '@/engine/progression';
import { useStore } from '@/state/store';
import { Ficha } from '@/ui/components/Ficha';
import { S } from '@/ui/strings.es';
import { makeCharacter, makeRun, makeWorld } from '../fixtures/state';
import { minimal } from '../fixtures/campaigns/minimal';

/** La campaña del fixture, más una reliquia y una línea de canon del mundo (igual que en memoria.test.ts). */
const campana: Campaign = {
  ...minimal,
  items: {
    ...minimal.items,
    m_talisman: {
      id: 'm_talisman',
      name: 'Talismán de hueso',
      icon: 'm_talisman',
      description: 'Liviano, tibio, y nunca deja de estarlo.',
      relic: true,
    },
  },
  memories: {
    ...minimal.memories,
    'world:minimal.derrumbe': 'El risco se vino abajo y el sendero ya no existe.',
  },
};

interface Overrides {
  character?: Partial<Character>;
  run?: Partial<Run>;
  world?: Partial<WorldState>;
  campaign?: Campaign;
}

function montar(overrides: Overrides = {}): void {
  const campaign = overrides.campaign ?? campana;
  const run = makeRun({
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    sceneId: campaign.start,
    ...overrides.run,
  });
  const character = makeCharacter({ run, ...overrides.character });
  useStore.setState((s) => ({
    characters: [character],
    activeCharacterId: character.id,
    world: makeWorld(overrides.world),
    seen: {},
    ui: { ...s.ui, campaign },
  }));
}

describe('Ficha', () => {
  afterEach(() => {
    cleanup();
  });

  it('muestra atributos, clase con su Poder y su Debilidad, rasgos y habilidades', () => {
    montar({ character: { skills: ['veterano'] } });
    render(<Ficha abierto onCerrar={vi.fn()} />);

    // atributos del personaje de prueba: vigor 0, astucia 1, saber 2, presencia 1
    expect(screen.getByText('Saber 2')).toBeInTheDocument();
    expect(screen.getByText('Astucia 1')).toBeInTheDocument();

    // clase, con su Poder y su Debilidad
    expect(screen.getByText(new RegExp(CLASSES.mago.name))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(CLASSES.mago.power.name))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(S.tags[CLASSES.mago.weakness]))).toBeInTheDocument();

    // rasgos de origen del personaje de prueba
    expect(screen.getByText(TRAITS.aprendiz_de_escriba.name)).toBeInTheDocument();
    expect(screen.getByText(TRAITS.cazador_furtivo.name)).toBeInTheDocument();

    // habilidades
    expect(screen.getByText(SKILLS.veterano.name)).toBeInTheDocument();
  });

  it('sin habilidades lo dice con una frase, en vez de una lista vacía', () => {
    montar();
    render(<Ficha abierto onCerrar={vi.fn()} />);
    expect(screen.getByText(S.ficha.sinHabilidades)).toBeInTheDocument();
  });

  it('muestra Heridas con su etiqueta y las condiciones activas', () => {
    montar({ run: { wounds: 2, conditions: ['asustado'] } });
    render(<Ficha abierto onCerrar={vi.fn()} />);
    expect(screen.getByText(new RegExp(WOUND_LABELS[2]))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(CONDITIONS.asustado.name))).toBeInTheDocument();
  });

  it('muestra XP y nivel CON el tope de la campaña', () => {
    montar({ character: { level: 2, xp: 65 } });
    render(<Ficha abierto onCerrar={vi.fn()} />);
    // minimal.levelRange es [1, 3]: topeDeNivel da 4. Es la regla que explica por qué
    // rejugar esta campaña con un personaje de nivel 4 o más ya no lo sube de nivel.
    const tope = topeDeNivel(campana.levelRange);
    expect(tope).toBe(4);
    expect(screen.getByText(`nivel 2 de ${tope}`)).toBeInTheDocument();
    expect(screen.getByText(`65 / ${xpDelNivel(3)} XP`)).toBeInTheDocument();
  });

  it('muestra los objetos de la partida y las reliquias del personaje', () => {
    montar({ run: { items: ['m_piedra'] }, character: { relics: ['m_talisman'] } });
    render(<Ficha abierto onCerrar={vi.fn()} />);
    expect(screen.getByText('Piedra lisa')).toBeInTheDocument();
    expect(screen.getByText('Talismán de hueso')).toBeInTheDocument();
  });

  it('sin objetos ni reliquias lo dice con una frase, en vez de listas vacías', () => {
    montar();
    render(<Ficha abierto onCerrar={vi.fn()} />);
    expect(screen.getByText(S.ficha.sinObjetos)).toBeInTheDocument();
    expect(screen.getByText(S.ficha.sinReliquias)).toBeInTheDocument();
  });

  it('muestra los Recuerdos derivados, nunca un id crudo', () => {
    montar({
      character: { flags: ['char:met.m_guia', 'char:place.m_claro', 'char:minimal.trepo'] },
      world: {
        flags: ['world:minimal.derrumbe'],
        fallen: [{ name: 'Vera', classId: 'guerrero', level: 2, campaign: 'otra', scene: 'm_risco' }],
      },
    });
    render(<Ficha abierto onCerrar={vi.fn()} />);

    expect(screen.getByText(minimal.npcs.m_guia!.name)).toBeInTheDocument();
    expect(screen.getByText(minimal.places.m_claro!.name)).toBeInTheDocument();
    expect(screen.getByText(campana.memories['char:minimal.trepo']!)).toBeInTheDocument();
    expect(screen.getByText(campana.memories['world:minimal.derrumbe']!)).toBeInTheDocument();
    expect(screen.getByText(/Vera/)).toBeInTheDocument();

    const texto = document.body.textContent ?? '';
    expect(texto).not.toMatch(/\bchar:/);
    expect(texto).not.toMatch(/\bworld:/);
  });

  it('con un personaje nuevo los Recuerdos están vacíos y lo dice con una frase', () => {
    montar();
    render(<Ficha abierto onCerrar={vi.fn()} />);
    expect(screen.getByText(S.ficha.sinRecuerdos)).toBeInTheDocument();
    // ninguno de los seis títulos de grupo se dibuja
    expect(screen.queryByText(S.ficha.recuerdos.gente)).not.toBeInTheDocument();
    expect(screen.queryByText(S.ficha.recuerdos.caidos)).not.toBeInTheDocument();
  });

  it('cerrada no dibuja nada', () => {
    montar();
    render(<Ficha abierto={false} onCerrar={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
