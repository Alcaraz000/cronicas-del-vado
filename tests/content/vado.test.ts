import { describe, expect, it } from 'vitest';
import { CLASSES, LIMITS, type ClassId } from '@/content/catalog';
import { parseCampaign, type Campaign, type Choice, type Effect, type Outcome, type Scene } from '@/content/schema';
import { campaign } from '@/content/campaigns/vado/campaign';
import { meta } from '@/content/campaigns/vado/meta';
import { WORLD } from '@/content/world';
import { conMundo } from '@/state/store';
import { beginRoll, choose, commitRoll, endRun, enter, render } from '@/engine/resolve';
import { fortuneMax } from '@/engine/progression';
import type { Band, GameState } from '@/engine/types';
import { makeState } from '../fixtures/state';

/**
 * Esqueleto de "El vado de Aldamar" (Fase C). El contrato que se verifica acá es la **tabla §2 del
 * outline** (`src/content/campaigns/vado/design/01-outline.md`) más los 14 puntos de su §8: los ids
 * de las 46 escenas, la cuenta exacta de opciones y de opciones libres por escena, la escena mortal
 * y —lo más importante— que la campaña se pueda jugar de punta a punta hasta los cuatro finales con
 * un personaje de nivel 1, con `TODO` adentro (§8.14).
 */

/** Las 46 escenas de la tabla §2, en el orden del documento. Un id que no esté acá no existe (§8.2). */
const IDS_DEL_OUTLINE = [
  // Prólogo (5)
  'p_camino',
  'p_puente',
  'p_puente_rechazo',
  'p_vado_oculto',
  'p_puente_amanecer',
  // Acto 1 (13)
  'a1_plaza',
  'a1_taberna',
  'a1_taberna_trastienda',
  'a1_orell_mesa',
  'a1_alcaldesa',
  'a1_berta_despacho',
  'a1_ilse_patio',
  'a1_molino',
  'a1_molino_pell',
  'a1_molino_trampilla',
  'a1_molino_rueda',
  'a1_posada',
  'a1_ronda',
  // Cuello 1 (3)
  'c1_cuerpo',
  'c1_acusacion',
  'c1_refriega',
  // Transición A (1)
  'a2_amanecer',
  // Acto 2, rama A (6)
  'a2_ley_orell',
  'a2_ley_torre',
  'a2_ley_cartas',
  'a2_ley_halvar',
  'a2_ley_berta',
  'a2_ley_guardia',
  // Acto 2, rama B (6)
  'a2_fuera_fuga',
  'a2_fuera_sotano',
  'a2_fuera_sello',
  'a2_fuera_medallon',
  'a2_fuera_ilse',
  'a2_fuera_refugio',
  // Transición B (1)
  'c2_anochece',
  // Cuello 2 (3)
  'c2_orilla',
  'c2_vado_crecido',
  'c2_otra_orilla',
  // Clímax (4)
  'cl_molino',
  'cl_dravos',
  'cl_halvar',
  'cl_desenlace',
  // Finales (4)
  'fin_hundido',
  'fin_dravos',
  'fin_crecida',
  'fin_heredero',
] as const;

/** Columna `opc` de la tabla §2: [opciones totales, opciones sin `requires`]. */
const OPCIONES_DEL_OUTLINE: Record<string, readonly [number, number]> = {
  p_camino: [5, 4],
  p_puente: [7, 5],
  p_puente_rechazo: [6, 4],
  p_vado_oculto: [6, 5],
  p_puente_amanecer: [5, 5],
  a1_plaza: [8, 6],
  a1_taberna: [7, 5],
  a1_taberna_trastienda: [4, 4],
  a1_orell_mesa: [4, 4],
  a1_alcaldesa: [7, 5],
  a1_berta_despacho: [5, 4],
  a1_ilse_patio: [6, 4],
  a1_molino: [8, 5],
  a1_molino_pell: [6, 4],
  a1_molino_trampilla: [6, 4],
  a1_molino_rueda: [5, 4],
  a1_posada: [5, 5],
  a1_ronda: [5, 4],
  c1_cuerpo: [7, 5],
  c1_acusacion: [7, 4],
  c1_refriega: [6, 4],
  a2_amanecer: [6, 4],
  a2_ley_orell: [6, 4],
  a2_ley_torre: [7, 4],
  a2_ley_cartas: [7, 4],
  a2_ley_halvar: [6, 4],
  a2_ley_berta: [6, 4],
  a2_ley_guardia: [5, 4],
  a2_fuera_fuga: [6, 4],
  a2_fuera_sotano: [7, 4],
  a2_fuera_sello: [7, 4],
  a2_fuera_medallon: [5, 4],
  a2_fuera_ilse: [4, 4],
  a2_fuera_refugio: [5, 4],
  c2_anochece: [6, 5],
  c2_orilla: [5, 4],
  c2_vado_crecido: [5, 4],
  c2_otra_orilla: [4, 4],
  cl_molino: [7, 4],
  cl_dravos: [9, 4],
  cl_halvar: [7, 4],
  cl_desenlace: [7, 4],
  fin_hundido: [0, 0],
  fin_dravos: [0, 0],
  fin_crecida: [0, 0],
  fin_heredero: [0, 0],
};

/** Los cinco espacios de flags que deriva el motor: se leen, nunca se escriben (§8.10 y r07). */
const PREFIJOS_PROHIBIDOS = ['char:met.', 'char:place.', 'char:origen.', 'char:leyenda', 'world:caido.'];

const escenas: Scene[] = Object.values(campaign.scenes);

function sinRequires(scene: Scene): number {
  return scene.choices.filter((c) => c.requires === undefined).length;
}

/** Todos los desenlaces de una opción: el `outcome` directo o los 3 a 5 de la tirada. */
function desenlaces(choice: Choice): Outcome[] {
  if (choice.outcome !== undefined) return [choice.outcome];
  const o = choice.roll?.outcomes;
  if (o === undefined) return [];
  const lista: Outcome[] = [o.success, o.partial, o.failure];
  if (o.crit !== undefined) lista.push(o.crit);
  if (o.fumble !== undefined) lista.push(o.fumble);
  return lista;
}

/** Ids de escena a los que apunta una escena: sus `redirect` y todos los `next` de sus opciones. */
function destinos(scene: Scene): string[] {
  const ids: string[] = [];
  for (const r of scene.redirect ?? []) ids.push(r.to);
  for (const c of scene.choices) for (const o of desenlaces(c)) ids.push(o.next);
  return ids;
}

/** Todo bloque de efectos escribible del contenido: los `onEnter`, los desenlaces y los `reward`. */
function bloquesDeEfectos(): { etiqueta: string; effects: Effect[] }[] {
  const salida: { etiqueta: string; effects: Effect[] }[] = [];
  for (const scene of escenas) {
    salida.push({ etiqueta: `${scene.id}/onEnter`, effects: scene.onEnter ?? [] });
    for (const choice of scene.choices) {
      for (const [i, o] of desenlaces(choice).entries()) {
        salida.push({ etiqueta: `${scene.id}/${choice.id}[${i}]`, effects: o.effects ?? [] });
      }
    }
  }
  for (const [id, ending] of Object.entries(campaign.endings)) {
    salida.push({ etiqueta: `endings/${id}/reward`, effects: ending.reward ?? [] });
  }
  return salida;
}

function tieneLethal(effects: Effect[] | undefined): boolean {
  return (effects ?? []).some((e) => 'lethal' in e);
}

// ---------------------------------------------------------------------------
// Chasis
// ---------------------------------------------------------------------------

describe('vado: chasis y meta', () => {
  it('pasa parseCampaign sin lanzar', () => {
    const parsed: Campaign = parseCampaign(campaign);
    expect(parsed.id).toBe('vado');
    expect(Object.keys(parsed.scenes)).toHaveLength(46);
  });

  it('declara el meta literal del contrato §8.1', () => {
    expect(meta.id).toBe('vado');
    expect(meta.contentVersion).toBe(1);
    expect(meta.title).toBe('El vado de Aldamar');
    expect(meta.cover).toBe('molino_de_tome');
    expect(meta.levelRange).toEqual([1, 3]);
    expect(meta.durationMin).toEqual([30, 45]);
    expect(meta.lethalScenes).toBe(1);
    expect(meta.lintProfile).toBe('release');
    // No está en el contrato §8.1: `hidden` era el estado de la Fase C. Con la prosa escrita la
    // campaña se le ofrece al jugador y la clave se omite: el esquema la declara
    // `z.literal(true).optional()`, así que `hidden: false` no valida.
    expect(meta.hidden).toBeUndefined();
    expect(campaign.start).toBe('p_camino');
    expect(campaign.scenes[campaign.start]).toBeDefined();
  });

  it('declara los dos relojes, los diez hitos y los cuatro finales', () => {
    expect(campaign.clocks['sospecha']?.max).toBe(4);
    expect(campaign.clocks['pelea']?.max).toBe(3);
    expect(Object.keys(campaign.milestones)).toHaveLength(10);
    expect(Object.keys(campaign.endings).sort()).toEqual(['fin_crecida', 'fin_dravos', 'fin_heredero', 'fin_hundido']);
    expect(campaign.endings['fin_heredero']?.hidden).toBe(true);
    expect(campaign.endings['fin_heredero']?.reward).toEqual([{ give: 'sello_del_vado' }]);
  });

  it('no redeclara lo que vive en world/: orell, ilse, halvar y la reliquia sello_del_vado', () => {
    for (const id of ['orell', 'ilse', 'halvar']) {
      expect(campaign.npcs[id], id).toBeUndefined();
      expect(WORLD.npcs[id], id).toBeDefined();
    }
    expect(campaign.items['sello_del_vado']).toBeUndefined();
    expect(WORLD.items['sello_del_vado']?.relic).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Las 46 escenas
// ---------------------------------------------------------------------------

describe('vado: las 46 escenas de la tabla §2', () => {
  it('son exactamente 46 y los ids son los del outline', () => {
    expect(escenas).toHaveLength(46);
    expect(Object.keys(campaign.scenes).sort()).toEqual([...IDS_DEL_OUTLINE].sort());
  });

  it('la clave de cada escena coincide con su id', () => {
    for (const [clave, scene] of Object.entries(campaign.scenes)) {
      expect(scene.id).toBe(clave);
    }
  });

  it('el reparto por kind es 36 normal · 1 hub · 2 encounter · 3 rest · 4 ending', () => {
    const cuenta = (kind: Scene['kind']): number => escenas.filter((s) => s.kind === kind).length;
    expect(cuenta('normal')).toBe(36);
    expect(cuenta('hub')).toBe(1);
    expect(cuenta('encounter')).toBe(2);
    expect(cuenta('rest')).toBe(3);
    expect(cuenta('ending')).toBe(4);
  });

  it('toda escena no final tiene entre 4 y 9 opciones y 4 o más sin requires; los finales tienen 0', () => {
    for (const scene of escenas) {
      if (scene.kind === 'ending') {
        expect(scene.choices, scene.id).toEqual([]);
        expect(scene.ending, scene.id).toBeDefined();
        expect(campaign.endings[scene.ending?.id ?? ''], scene.id).toBeDefined();
      } else {
        expect(scene.choices.length, scene.id).toBeGreaterThanOrEqual(LIMITS.minChoices);
        expect(scene.choices.length, scene.id).toBeLessThanOrEqual(LIMITS.maxChoices);
        expect(sinRequires(scene), scene.id).toBeGreaterThanOrEqual(LIMITS.minChoices);
      }
    }
  });

  it('la cuenta exacta por escena es la de la columna opc del outline', () => {
    for (const [id, [total, libres]] of Object.entries(OPCIONES_DEL_OUTLINE)) {
      const scene = campaign.scenes[id];
      expect(scene, id).toBeDefined();
      expect([scene?.choices.length, sinRequires(scene as Scene)], id).toEqual([total, libres]);
    }
  });

  it('suma 252 opciones, 179 libres y 41 tiradas, como los totales del outline', () => {
    const totales = escenas.reduce(
      (acc, s) => ({
        opciones: acc.opciones + s.choices.length,
        libres: acc.libres + sinRequires(s),
        tiradas: acc.tiradas + s.choices.filter((c) => c.roll !== undefined).length,
      }),
      { opciones: 0, libres: 0, tiradas: 0 },
    );
    expect(totales).toEqual({ opciones: 252, libres: 179, tiradas: 41 });
  });

  it('los ids de opción no se repiten dentro de una escena', () => {
    for (const scene of escenas) {
      const ids = scene.choices.map((c) => c.id);
      expect(new Set(ids).size, scene.id).toBe(ids.length);
    }
  });

  it('toda opción tiene exactamente uno de roll u outcome y una etiqueta de 60 caracteres o menos', () => {
    for (const scene of escenas) {
      for (const choice of scene.choices) {
        const cuantos = (choice.roll !== undefined ? 1 : 0) + (choice.outcome !== undefined ? 1 : 0);
        expect(cuantos, `${scene.id}/${choice.id}`).toBe(1);
        expect(choice.label.trim().length, `${scene.id}/${choice.id}`).toBeGreaterThan(0);
        expect(choice.label.length, `${scene.id}/${choice.id}`).toBeLessThanOrEqual(60);
      }
    }
  });

  it('toda tirada declara success, partial y failure', () => {
    for (const scene of escenas) {
      for (const choice of scene.choices) {
        if (choice.roll === undefined) continue;
        const o = choice.roll.outcomes;
        expect(o.success, `${scene.id}/${choice.id}`).toBeDefined();
        expect(o.partial, `${scene.id}/${choice.id}`).toBeDefined();
        expect(o.failure, `${scene.id}/${choice.id}`).toBeDefined();
      }
    }
  });

  it('ninguna dificultad es extrema y muy_dificil vive solo en las dos tiradas letales (§8.5)', () => {
    const muyDificiles: string[] = [];
    for (const scene of escenas) {
      for (const choice of scene.choices) {
        const dificultad = choice.roll?.difficulty;
        if (dificultad === undefined) continue;
        expect(dificultad, `${scene.id}/${choice.id}`).not.toBe('extrema');
        if (dificultad === 'muy_dificil') muyDificiles.push(`${scene.id}/${choice.id}`);
      }
    }
    expect(muyDificiles.sort()).toEqual(['c2_vado_crecido/cruzar_de_frente', 'c2_vado_crecido/cruzar_por_las_piedras']);
  });

  it('todo next y todo redirect.to apunta a una escena de las 46', () => {
    for (const scene of escenas) {
      for (const destino of destinos(scene)) {
        expect(campaign.scenes[destino], `${scene.id} -> ${destino}`).toBeDefined();
      }
    }
  });

  it('ningún set ni clear toca los espacios que deriva el motor (§8.10)', () => {
    for (const { etiqueta, effects } of bloquesDeEfectos()) {
      for (const effect of effects) {
        const flag = 'set' in effect ? effect.set : 'clear' in effect ? effect.clear : undefined;
        if (flag === undefined) continue;
        for (const prefijo of PREFIJOS_PROHIBIDOS) {
          expect(flag.startsWith(prefijo), `${etiqueta}: ${flag}`).toBe(false);
        }
      }
    }
  });

  it('el hub redirige primero por sospecha y después por las tres pistas (§8.7)', () => {
    expect(campaign.scenes['a1_plaza']?.redirect).toEqual([
      { when: { clock: 'sospecha', gte: 4 }, to: 'a1_ronda' },
      {
        when: {
          all: [
            { flag: 'run:pista_taberna' },
            { flag: 'run:pista_alcaldesa' },
            { flag: 'run:pista_molino' },
            { visited: 'a1_plaza', min: 3 },
          ],
        },
        to: 'c1_cuerpo',
      },
    ]);
  });

  it('los seis redirect de la campaña viven en cinco escenas y ninguno apunta a una escena con redirect (r01)', () => {
    const conRedirect = escenas.filter((s) => (s.redirect ?? []).length > 0);
    expect(conRedirect.map((s) => s.id).sort()).toEqual([
      'a1_plaza',
      'a2_fuera_refugio',
      'a2_ley_guardia',
      'c1_refriega',
      'cl_dravos',
    ]);
    expect(conRedirect.reduce((n, s) => n + (s.redirect ?? []).length, 0)).toBe(6);
    for (const scene of conRedirect) {
      for (const r of scene.redirect ?? []) {
        expect(campaign.scenes[r.to]?.redirect, `${scene.id} -> ${r.to}`).toBeUndefined();
      }
    }
  });

  it('las dos tiradas de puerta no se pueden repetir y encienden run:piedra_leida en todas sus bandas (§8.12)', () => {
    const puertas: [string, string][] = [
      ['a2_ley_cartas', 'reconocer_el_sigilo'],
      ['a2_fuera_sello', 'leer_la_piedra'],
    ];
    for (const [sceneId, choiceId] of puertas) {
      const choice = campaign.scenes[sceneId]?.choices.find((c) => c.id === choiceId);
      expect(choice?.requires, `${sceneId}/${choiceId}`).toEqual({ not: { flag: 'run:piedra_leida' } });
      for (const [i, o] of desenlaces(choice as Choice).entries()) {
        const enciende = (o.effects ?? []).some((e) => 'set' in e && e.set === 'run:piedra_leida');
        expect(enciende, `${sceneId}/${choiceId}[${i}]`).toBe(true);
      }
    }
  });

  it('los tres cruces de rama limpian el bando viejo además de encender el nuevo (§8.13)', () => {
    const cruces: [string, string, string, string][] = [
      ['a2_ley_orell', 'irte_con_ilse_y_no_volver', 'run:contra_la_ley', 'run:con_la_ley'],
      ['a2_ley_berta', 'bajar_al_sotano_con_ilse', 'run:contra_la_ley', 'run:con_la_ley'],
      ['a2_fuera_fuga', 'volver_con_la_guardia', 'run:con_la_ley', 'run:contra_la_ley'],
    ];
    for (const [sceneId, choiceId, nuevo, viejo] of cruces) {
      const choice = campaign.scenes[sceneId]?.choices.find((c) => c.id === choiceId);
      expect(choice?.requires, `${sceneId}/${choiceId}`).toEqual({ not: { flag: 'run:cruzo_de_rama' } });
      const effects = choice?.outcome?.effects ?? [];
      expect(effects, `${sceneId}/${choiceId}`).toContainEqual({ set: 'run:cruzo_de_rama' });
      expect(effects, `${sceneId}/${choiceId}`).toContainEqual({ set: nuevo });
      expect(effects, `${sceneId}/${choiceId}`).toContainEqual({ clear: viejo });
    }
  });
});

// ---------------------------------------------------------------------------
// La escena mortal
// ---------------------------------------------------------------------------

describe('vado: la escena mortal (r05 y §8.4)', () => {
  it('hay exactamente una escena lethal, es c2_vado_crecido y meta.lethalScenes coincide', () => {
    expect(escenas.filter((s) => s.lethal === true).map((s) => s.id)).toEqual(['c2_vado_crecido']);
    expect(campaign.lethalScenes).toBe(1);
    expect(meta.lethalScenes).toBe(1);
    expect(campaign.scenes['c2_vado_crecido']?.place).toBe('vado_oculto');
    expect(campaign.scenes['c2_vado_crecido']?.variant).toBe('crecido');
  });

  it('el efecto lethal aparece en tres desenlaces de tirada, los tres dentro de la escena mortal', () => {
    const conLethal: string[] = [];
    for (const scene of escenas) {
      expect(tieneLethal(scene.onEnter), `${scene.id}/onEnter`).toBe(false);
      for (const choice of scene.choices) {
        if (choice.outcome !== undefined) {
          expect(tieneLethal(choice.outcome.effects), `${scene.id}/${choice.id}`).toBe(false);
        }
        for (const [i, o] of desenlaces(choice).entries()) {
          if (!tieneLethal(o.effects)) continue;
          expect(scene.lethal, `${scene.id}/${choice.id}`).toBe(true);
          conLethal.push(`${scene.id}/${choice.id}[${i}]`);
        }
      }
    }
    expect(conLethal).toHaveLength(3);
    expect(campaign.endings['fin_heredero']?.reward?.some((e) => 'lethal' in e)).toBe(false);
  });

  it('la única entrada es c2_orilla.bajar_al_vado, una opción sin tirada', () => {
    const entradas: string[] = [];
    for (const scene of escenas) {
      for (const r of scene.redirect ?? []) {
        expect(r.to, `${scene.id} redirect`).not.toBe('c2_vado_crecido');
      }
      for (const choice of scene.choices) {
        for (const o of desenlaces(choice)) {
          if (o.next !== 'c2_vado_crecido') continue;
          expect(choice.roll, `${scene.id}/${choice.id}`).toBeUndefined();
          entradas.push(`${scene.id}/${choice.id}`);
        }
      }
    }
    expect(entradas).toEqual(['c2_orilla/bajar_al_vado']);
  });

  it('la escena mortal deja salida: opciones sin lethal y una tirada sin tag fisico', () => {
    const mortal = campaign.scenes['c2_vado_crecido'] as Scene;
    const sinLethal = mortal.choices.filter((c) => !desenlaces(c).some((o) => tieneLethal(o.effects)));
    expect(sinLethal.length).toBeGreaterThanOrEqual(1);
    const sinFisico = mortal.choices.filter((c) => c.roll !== undefined && !c.roll.tags.includes('fisico'));
    expect(sinFisico.length).toBeGreaterThanOrEqual(1);
    // Los cinco desenlaces salen de la escena: la mortal cambia el estado, no el grafo.
    for (const choice of mortal.choices) {
      for (const o of desenlaces(choice)) expect(o.next, `${choice.id}`).toBe('c2_otra_orilla');
    }
  });
});

// ---------------------------------------------------------------------------
// Se juega de punta a punta
// ---------------------------------------------------------------------------

/** La campaña tal como la ve el motor en producción: WORLD ∪ campaña (`state/store.ts`). */
const vado: Campaign = conMundo(campaign, WORLD);

/** Un paso de una partida: el id de la opción, y la banda a forzar si la opción tiene tirada. */
type Paso = string | readonly [string, Band];

/** Personaje de nivel 1 sin rasgos ni habilidades, recién parado en `campaign.start`. */
function nivel1(classId: ClassId): GameState {
  return makeState({
    character: {
      id: `pj_${classId}`,
      name: CLASSES[classId].name,
      classId,
      level: 1,
      xp: 0,
      attrs: { vigor: 1, astucia: 1, saber: 1, presencia: 1 },
      traits: [],
      skills: [],
    },
    run: {
      campaignId: vado.id,
      contentVersion: vado.contentVersion,
      sceneId: vado.start,
      fortune: fortuneMax(1),
    },
  });
}

/**
 * Juega la lista de pasos con el motor real. Cada paso comprueba que la opción esté **visible y
 * habilitada** en `render` antes de elegirla, así que una ruta que dejara de ser jugable rompe el
 * test en el paso exacto. Las tiradas se resuelven con `beginRoll` + `commitRoll` forzando la banda,
 * igual que `tests/engine/resolve.roll.test.ts`, para dirigir el recorrido sin depender de los dados.
 */
function jugar(classId: ClassId, pasos: readonly Paso[]): GameState {
  let state = enter(vado, nivel1(classId), vado.start);
  for (const paso of pasos) {
    const choiceId = typeof paso === 'string' ? paso : paso[0];
    const band = typeof paso === 'string' ? undefined : paso[1];
    const vista = render(vado, state);
    const donde = `${classId} · ${vista.sceneId} · ${choiceId}`;
    const rendida = vista.choices.find((c) => c.id === choiceId);
    expect(rendida, donde).toBeDefined();
    expect(rendida?.visible, donde).toBe(true);
    expect(rendida?.enabled, donde).toBe(true);

    const choice = vado.scenes[vista.sceneId]?.choices.find((c) => c.id === choiceId) as Choice;
    if (choice.roll !== undefined) {
      expect(band, `${donde}: una opción con tirada necesita banda`).toBeDefined();
      const pending = beginRoll(vado, state, choiceId);
      state = commitRoll(vado, state, { ...pending, band: band as Band });
    } else {
      expect(band, `${donde}: una opción sin tirada no lleva banda`).toBeUndefined();
      state = choose(vado, state, choiceId);
    }
    expect(state.run.outcome?.kind, donde).not.toBe('death');
    expect(state.run.outcome?.kind, donde).not.toBe('defeat');
  }
  return state;
}

/**
 * Tramo común a las cuatro partidas: prólogo por el puente, las tres puertas del acto 1 y la vuelta
 * al hub que dispara el `redirect` de las tres pistas (`visited: a1_plaza >= 3`) hacia el cuello 1.
 */
const HASTA_EL_CUELLO_1: readonly Paso[] = [
  'seguir_hasta_el_puente', // p_camino  → p_puente
  'entregarle_la_carta_para_cruzar', // p_puente   → a1_plaza
  'entrar_al_ancla_seca', // a1_plaza   → a1_taberna     (run:pista_taberna)
  'pagar_una_ronda', // a1_taberna → a1_plaza
  'golpear_la_puerta_de_berta', // a1_plaza   → a1_alcaldesa   (run:pista_alcaldesa)
  'despedirte_hasta_manana', // a1_alcaldesa → a1_plaza
  'cruzar_al_molino', // a1_plaza   → a1_molino      (run:pista_molino)
  'volver_a_la_plaza', // a1_molino  → REDIRECT a c1_cuerpo
];

/** Las cuatro partidas completas, una por final. Todas arrancan en `p_camino` y ninguna usa una opción de clase. */
const PARTIDAS: { final: string; escenaFinal: string; pasos: readonly Paso[] }[] = [
  {
    // Rama A, pasando por el encuentro del cuello 1 y por la tirada de la cadena en la otra orilla.
    final: 'fin_hundido',
    escenaFinal: 'fin_hundido',
    pasos: [
      ...HASTA_EL_CUELLO_1,
      'taparlo_y_volver_al_pueblo', // c1_cuerpo    → c1_acusacion
      'resistirte', // c1_acusacion → c1_refriega
      ['abrirse_paso', 'success'], // c1_refriega  → c1_refriega (reloj pelea +1)
      'rendirte', // c1_refriega  → a2_amanecer
      'presentarte_en_la_torre', // a2_amanecer  → a2_ley_orell
      'quedarte_en_el_cuerpo_de_guardia', // a2_ley_orell → a2_ley_guardia
      'dormir_hasta_el_relevo', // a2_ley_guardia → c2_anochece
      'salir_ya_hacia_la_orilla', // c2_anochece  → c2_orilla
      'subir_por_el_azud', // c2_orilla    → c2_otra_orilla
      ['levantar_la_cadena', 'partial'], // c2_otra_orilla → cl_molino
      ['escuchar', 'success'], // cl_molino    → cl_halvar
      'cerrar_el_trato', // cl_halvar    → cl_desenlace
      ['devolver_el_sello_a_la_piedra', 'success'], // → fin_hundido
    ],
  },
  {
    // Rama B, y la única partida que baja a la escena mortal por `c2_orilla.bajar_al_vado`.
    final: 'fin_dravos',
    escenaFinal: 'fin_dravos',
    pasos: [
      ...HASTA_EL_CUELLO_1,
      'taparlo_y_volver_al_pueblo',
      'ceder', // c1_acusacion → a2_amanecer
      'buscar_a_ilse', // a2_amanecer  → a2_fuera_fuga
      'seguirla_por_el_caz', // a2_fuera_fuga → a2_fuera_sotano
      'subir_a_descansar', // a2_fuera_sotano → a2_fuera_refugio
      'dormir_hasta_la_noche', // a2_fuera_refugio → c2_anochece
      'buscar_una_cuerda', // c2_anochece  → c2_orilla (cuerda_de_molinero, telegrafía T-2)
      'bajar_al_vado', // c2_orilla    → c2_vado_crecido (ESCENA MORTAL)
      ['cruzar_de_frente', 'success'], // c2_vado_crecido → c2_otra_orilla
      'subir_al_molino_de_una', // c2_otra_orilla → cl_molino
      'encarar_a_dravos', // cl_molino    → cl_dravos
      ['huir_escaleras_abajo', 'success'], // cl_dravos → cl_desenlace
      'dejar_que_la_guardia_cruce_con_la_piedra', // → fin_dravos
    ],
  },
  {
    // Rama B por el sótano entero, sin bajar al vado.
    final: 'fin_crecida',
    escenaFinal: 'fin_crecida',
    pasos: [
      ...HASTA_EL_CUELLO_1,
      'taparlo_y_volver_al_pueblo',
      'ceder',
      'salir_por_el_caz_sin_avisar', // a2_amanecer  → a2_fuera_fuga
      'esconderte_en_el_molino', // a2_fuera_fuga → a2_fuera_refugio
      'bajar_otra_vez_al_sotano', // a2_fuera_refugio → a2_fuera_sotano
      'abrir_el_cuaderno', // a2_fuera_sotano → a2_fuera_sello
      'dejar_la_piedra_en_su_hueco', // a2_fuera_sello → a2_fuera_ilse
      'dejarla_en_paz', // a2_fuera_ilse → a2_fuera_refugio
      'secarte_junto_al_horno', // a2_fuera_refugio → c2_anochece
      'mirar_cuantas_piedras_quedan', // c2_anochece → c2_orilla
      'esperar_a_que_el_agua_baje', // c2_orilla   → c2_otra_orilla
      'dejar_el_sello_en_la_cadena', // c2_otra_orilla → cl_molino
      'llamar_a_pell_aparte', // cl_molino   → cl_dravos
      ['huir_escaleras_abajo', 'success'], // cl_dravos → cl_desenlace
      'subir_y_dejar_que_el_agua_decida', // → fin_crecida
    ],
  },
  {
    // Rama A por las cartas: `reconocer_el_sigilo` es la puerta a `char:vado.sabe_del_sello`,
    // el único `requires` del final oculto (y no es de clase, r02).
    final: 'fin_heredero',
    escenaFinal: 'fin_heredero',
    pasos: [
      ...HASTA_EL_CUELLO_1,
      'taparlo_y_volver_al_pueblo',
      'ceder',
      'presentarte_en_la_torre', // a2_amanecer  → a2_ley_orell
      'pedirle_ver_las_cartas', // a2_ley_orell → a2_ley_cartas
      ['reconocer_el_sigilo', 'success'], // a2_ley_cartas → a2_ley_halvar (char:vado.sabe_del_sello)
      'volver_sin_cerrar_nada', // a2_ley_halvar → a2_ley_guardia
      'dormir_hasta_el_relevo', // a2_ley_guardia → c2_anochece
      'buscar_una_cuerda',
      'remar_en_la_barca_de_tome', // c2_orilla → c2_otra_orilla
      'subir_al_molino_de_una',
      'sentarte_a_la_mesa_con_halvar', // cl_molino → cl_halvar
      'bajar_al_sotano_sin_contestar', // cl_halvar → cl_desenlace
      'quedarte_con_el_sello', // → fin_heredero
    ],
  },
];

describe('vado: se juega de punta a punta hasta los cuatro finales (§8.14)', () => {
  const clases = Object.keys(CLASSES) as ClassId[];

  it('las cuatro partidas cubren los cuatro finales declarados', () => {
    expect(PARTIDAS.map((p) => p.final).sort()).toEqual(Object.keys(campaign.endings).sort());
  });

  for (const partida of PARTIDAS) {
    it.each(clases)(`un %s de nivel 1 llega a ${partida.final}`, (classId) => {
      const state = jugar(classId, partida.pasos);
      expect(state.run.sceneId).toBe(partida.escenaFinal);
      expect(state.run.outcome).toEqual({ kind: 'ending', endingId: partida.final });
      const vista = render(vado, state);
      expect(vista.kind).toBe('ending');
      expect(vista.choices).toEqual([]);
      expect(vista.ending?.id).toBe(partida.final);
      expect(vista.ending?.title).toBe(campaign.endings[partida.final]?.title);
    });
  }

  it('el redirect del hub cierra el acto 1 recién con las tres pistas y la tercera vuelta', () => {
    // Una vuelta antes: dos pistas y dos visitas completas, el hub todavía se puede jugar.
    const dosPistas = jugar('guerrero', HASTA_EL_CUELLO_1.slice(0, 6));
    expect(dosPistas.run.sceneId).toBe('a1_plaza');
    expect(dosPistas.run.flags).toContain('run:pista_taberna');
    expect(dosPistas.run.flags).toContain('run:pista_alcaldesa');
    expect(dosPistas.run.flags).not.toContain('run:pista_molino');

    const enElCuello = jugar('guerrero', HASTA_EL_CUELLO_1);
    expect(enElCuello.run.sceneId).toBe('c1_cuerpo');
    expect(enElCuello.run.visited['a1_plaza']).toBe(3);
  });

  it('la escena mortal mata a un personaje malherido y no lo deja avanzar', () => {
    const pasos = PARTIDAS.find((p) => p.final === 'fin_dravos')?.pasos ?? [];
    const corte = pasos.findIndex((p) => p === 'bajar_al_vado');
    expect(corte).toBeGreaterThan(0);
    const enElVado = jugar('guerrero', pasos.slice(0, corte + 1));
    expect(enElVado.run.sceneId).toBe('c2_vado_crecido');

    const malherido: GameState = { ...enElVado, run: { ...enElVado.run, wounds: 2 } };
    const pending = beginRoll(vado, malherido, 'cruzar_de_frente');
    const muerto = commitRoll(vado, malherido, { ...pending, band: 'failure' });
    expect(muerto.run.outcome).toEqual({ kind: 'death' });
    expect(muerto.run.sceneId).toBe('c2_vado_crecido');
  });
});

// ---------------------------------------------------------------------------
// Fase H · tarea 2 — que ceder cueste algo
// ---------------------------------------------------------------------------

/** La opción `id` de la escena `sceneId`, o `undefined` si no existe. */
function opcion(sceneId: string, choiceId: string): Choice | undefined {
  return campaign.scenes[sceneId]?.choices.find((c) => c.id === choiceId);
}

/** Los efectos del `outcome` sin tirada de una opción. */
function efectos(sceneId: string, choiceId: string): Effect[] {
  return opcion(sceneId, choiceId)?.outcome?.effects ?? [];
}

/** Una opción es gratis si no tiene `requires`, no tiene tirada y su desenlace no tiene efectos. */
function esGratis(choice: Choice): boolean {
  return choice.requires === undefined && choice.roll === undefined && (choice.outcome?.effects ?? []).length === 0;
}

describe('vado: ceder cuesta algo en las escenas bisagra (Fase H §2)', () => {
  it('ceder en la acusación cuesta la carta lacrada', () => {
    const o = campaign.scenes['c1_acusacion']?.choices.find((c) => c.id === 'ceder');
    expect(o?.outcome?.effects).toContainEqual({ take: 'carta_lacrada' });
  });

  /**
   * `choose` aplica los `effects` ANTES de resolver el texto (`resolve.ts:265-267`, y `commitRoll`
   * hace lo mismo en `473-489`), así que una variante `when: { item: … }` en el desenlace de una
   * opción que hace `take` de ese mismo objeto no se dispara nunca. Por eso la prosa de `ceder`
   * tiene que ser verdadera con la carta y sin ella: no puede afirmar que te sacan algo que la ruta
   * del jugador quizá ya gastó (la prudente llega acá sin la carta, la entregó en el puente).
   */
  it('la prosa de ceder no afirma un objeto que el jugador puede no tener', () => {
    const choice = opcion('c1_acusacion', 'ceder');
    const plano = JSON.stringify(choice?.outcome?.text ?? []);
    expect(plano.toLowerCase()).not.toContain('carta lacrada');
    expect(plano, 'una variante por item acá sería prosa muerta').not.toContain('sello_del_vado');
    expect(plano, 'una variante por item acá sería prosa muerta').not.toContain('carta_lacrada');
  });

  it('rendirse en la refriega se paga con sospecha', () => {
    const o = campaign.scenes['c1_refriega']?.choices.find((c) => c.id === 'rendirte');
    expect(o?.outcome?.effects).toContainEqual({ clock: 'sospecha', delta: 1 });
  });

  it('remar hasta la isla se paga con sospecha', () => {
    const o = campaign.scenes['c2_orilla']?.choices.find((c) => c.id === 'remar_en_la_barca_de_tome');
    expect(o?.outcome?.effects).toContainEqual({ clock: 'sospecha', delta: 1 });
  });

  it('irse del sótano sin contestar se paga con sospecha', () => {
    const o = campaign.scenes['cl_halvar']?.choices.find((c) => c.id === 'bajar_al_sotano_sin_contestar');
    expect(o?.outcome?.effects).toContainEqual({ clock: 'sospecha', delta: 1 });
  });

  it('dejar que el agua decida entrega el sello', () => {
    const o = campaign.scenes['cl_desenlace']?.choices.find((c) => c.id === 'subir_y_dejar_que_el_agua_decida');
    expect(o?.outcome?.effects).toContainEqual({ take: 'sello_del_vado' });
  });

  it('orell_confia no se enciende por entrar a a2_ley_orell', () => {
    expect(campaign.scenes['a2_ley_orell']?.onEnter ?? []).not.toContainEqual({ set: 'run:orell_confia' });
  });

  it('en la rama A orell_confia se gana con el éxito de la tirada, y ahí limpia orell_humillado', () => {
    const o = opcion('a2_ley_orell', 'preguntarle_por_la_orden_escrita');
    expect(o?.roll, 'la fuente de rama A tiene que ser una tirada').toBeDefined();
    const exito = o?.roll?.outcomes.success.effects ?? [];
    expect(exito).toContainEqual({ set: 'run:orell_confia' });
    expect(exito).toContainEqual({ clear: 'run:orell_humillado' });
    // El par mutuamente excluyente: ninguna banda enciende uno sin limpiar el otro.
    for (const [i, banda] of desenlaces(o as Choice).entries()) {
      const effects = banda.effects ?? [];
      if (!effects.some((e) => 'set' in e && e.set === 'run:orell_confia')) continue;
      expect(effects, `banda ${i}`).toContainEqual({ clear: 'run:orell_humillado' });
    }
  });

  it('ninguna escena enciende orell_confia en su onEnter dentro del acto 2', () => {
    for (const scene of escenas) {
      if (scene.id === 'p_puente_amanecer') continue; // la fuente del prólogo, biblia §7.2
      expect((scene.onEnter ?? []).some((e) => 'set' in e && e.set === 'run:orell_confia'), scene.id).toBe(false);
    }
  });

  it('el encuentro del clímax no se cierra sin dados salvo que te hayas ganado algo antes', () => {
    const dravos = campaign.scenes['cl_dravos'] as Scene;
    for (const choice of dravos.choices) {
      const gratis = choice.requires === undefined && choice.roll === undefined;
      expect(gratis, `cl_dravos/${choice.id}`).toBe(false);
    }
  });

  it('cerrar_la_cronica se marca al llegar a un final, no al entrar al desenlace', () => {
    expect(campaign.scenes['cl_desenlace']?.onEnter ?? []).not.toContainEqual({ milestone: 'cerrar_la_cronica' });
    for (const fin of ['fin_hundido', 'fin_dravos', 'fin_crecida', 'fin_heredero']) {
      expect(campaign.scenes[fin]?.onEnter ?? [], fin).toContainEqual({ milestone: 'cerrar_la_cronica' });
    }
  });

  it('ver_el_sello deja una sola vía gratuita por rama', () => {
    const gratuitas: string[] = [];
    for (const scene of escenas) {
      if ((scene.onEnter ?? []).some((e) => 'milestone' in e && e.milestone === 'ver_el_sello')) {
        gratuitas.push(`${scene.id}/onEnter`);
      }
      for (const choice of scene.choices) {
        if (choice.requires !== undefined || choice.roll !== undefined) continue;
        const effects = choice.outcome?.effects ?? [];
        if (!effects.some((e) => 'milestone' in e && e.milestone === 'ver_el_sello')) continue;
        if (effects.some((e) => 'clock' in e || 'wound' in e || 'take' in e)) continue; // ya cuesta algo
        gratuitas.push(`${scene.id}/${choice.id}`);
      }
    }
    // Rama B: el `onEnter` del sótano. Rama A: el mapa de las cartas. Y ninguna más.
    expect(gratuitas.sort()).toEqual(['a2_fuera_sotano/onEnter', 'a2_ley_cartas/buscar_el_mapa']);
  });

  it('leer el sigilo delante de Dravos se paga con sospecha', () => {
    expect(efectos('a2_ley_torre', 'leer_el_sigilo_de_la_mesa')).toContainEqual({ clock: 'sospecha', delta: 1 });
  });

  it('las seis opciones bisagra dejaron de salir gratis', () => {
    const bisagras: [string, string][] = [
      ['c1_acusacion', 'ceder'],
      ['c1_refriega', 'rendirte'],
      ['c2_orilla', 'remar_en_la_barca_de_tome'],
      ['cl_halvar', 'bajar_al_sotano_sin_contestar'],
      ['cl_desenlace', 'subir_y_dejar_que_el_agua_decida'],
      ['a2_ley_torre', 'leer_el_sigilo_de_la_mesa'],
    ];
    for (const [sceneId, choiceId] of bisagras) {
      const choice = opcion(sceneId, choiceId);
      expect(choice, `${sceneId}/${choiceId}`).toBeDefined();
      expect(esGratis(choice as Choice), `${sceneId}/${choiceId}`).toBe(false);
    }
  });

  /**
   * Un costo escondido no es una decisión: es una trampa. El motor deriva el `badge` del `requires`
   * (`resolve.ts::badgeDe`) y estas seis no tienen `requires`, así que el aviso tiene que estar en la
   * etiqueta, en ficción y sin nombrar la mecánica (biblia §10).
   */
  it('cada costo nuevo se anuncia en la etiqueta', () => {
    const avisos: [string, string, string][] = [
      ['c1_acusacion', 'ceder', 'palpen la capa'],
      ['c1_refriega', 'rendirte', 'delante de todos'],
      ['c2_orilla', 'remar_en_la_barca_de_tome', 'a la vista'],
      ['cl_halvar', 'bajar_al_sotano_sin_contestar', 'delante del capitán'],
      ['cl_desenlace', 'subir_y_dejar_que_el_agua_decida', 'dejar la piedra'],
      ['a2_ley_torre', 'leer_el_sigilo_de_la_mesa', 'delante de Dravos'],
    ];
    for (const [sceneId, choiceId, aviso] of avisos) {
      const label = opcion(sceneId, choiceId)?.label ?? '';
      expect(label.toLowerCase(), `${sceneId}/${choiceId}`).toContain(aviso.toLowerCase());
      expect(label.length, `${sceneId}/${choiceId}`).toBeLessThanOrEqual(60);
    }
  });

  it('la opción libre sigue existiendo en las seis: ninguna ganó un requires', () => {
    const bisagras: [string, string][] = [
      ['c1_acusacion', 'ceder'],
      ['c1_refriega', 'rendirte'],
      ['c2_orilla', 'remar_en_la_barca_de_tome'],
      ['cl_halvar', 'bajar_al_sotano_sin_contestar'],
      ['cl_desenlace', 'subir_y_dejar_que_el_agua_decida'],
      ['a2_ley_torre', 'leer_el_sigilo_de_la_mesa'],
    ];
    for (const [sceneId, choiceId] of bisagras) {
      expect(opcion(sceneId, choiceId)?.requires, `${sceneId}/${choiceId}`).toBeUndefined();
      expect(opcion(sceneId, choiceId)?.roll, `${sceneId}/${choiceId}`).toBeUndefined();
    }
  });

  /**
   * Segunda vuelta. La tabla del brief salió de un análisis estático de las 46 escenas; la traza del
   * simulador mostró que la ruta real de la política prudente pasa por otro lado. Estas tres palancas
   * son las que esa medición señaló, y las tres están en escenas bisagra.
   *
   * Ninguna cobra `sospecha`: el reloj llega a 4 y redirige, y en la primera vuelta ya entró un tic.
   * Las monedas acá son una relación (`run:dravos_sabe`), dos condiciones y una Herida.
   */
  it('entregar lo que llevás en el vado crecido te deja marcado', () => {
    const effects = efectos('c2_vado_crecido', 'entregar_lo_que_llevas');
    expect(effects).toContainEqual({ addCondition: 'perseguido' });
    // Sigue sin poder matar: es una de las tres salidas seguras de la escena mortal (biblia §11).
    expect(tieneLethal(effects)).toBe(false);
  });

  it('dejar el sello en la cadena te cuesta meterte al agua', () => {
    expect(efectos('c2_otra_orilla', 'dejar_el_sello_en_la_cadena')).toContainEqual({
      addCondition: 'empapado',
    });
  });

  /**
   * Un costo que nadie lee no es un costo. `run:dravos_sabe` no lo lee nada DESPUÉS de `cl_molino`:
   * su único `requires` (`interrumpir_antes_de_que_firmen`) y su única variante viven en esa misma
   * escena y se evalúan antes de elegir; `cl_dravos`, `cl_halvar`, `cl_desenlace` y los cuatro
   * finales no lo miran. El precio de salir al claro es la salida: `perseguido` es `huida`, y el
   * encuentro tiene exactamente una tirada con ese tag.
   */
  it('encarar a Dravos cuesta la salida, y el encuentro la lee', () => {
    const effects = efectos('cl_molino', 'encarar_a_dravos');
    expect(effects).toContainEqual({ addCondition: 'perseguido' });
    expect(effects).not.toContainEqual({ set: 'run:dravos_sabe' });
    const huir = opcion('cl_dravos', 'huir_escaleras_abajo');
    expect(huir?.roll?.tags, 'perseguido solo cobra si algo tira con tag huida').toContain('huida');
  });

  it('la opción del mago en el encuentro cuesta lo mismo que la del guerrero', () => {
    const mago = efectos('cl_dravos', 'apagar_la_runa_un_latido');
    const guerrero = efectos('cl_dravos', 'trabar_el_eje');
    // `agotado` es `magia` y en el clímax no queda ni una tirada con ese tag: no lo lee nadie.
    // La Herida sí la lee el motor (3 = Caído) y es la moneda de su hermana de escena.
    expect(guerrero).toContainEqual({ wound: 1 });
    expect(mago).toContainEqual({ wound: 1 });
  });

  it('ninguna tirada del clímax tiene tag magia, así que agotado solo no alcanza como precio', () => {
    const climax = ['cl_molino', 'cl_dravos', 'cl_halvar', 'cl_desenlace'];
    for (const sceneId of climax) {
      for (const choice of (campaign.scenes[sceneId] as Scene).choices) {
        expect(choice.roll?.tags ?? [], `${sceneId}/${choice.id}`).not.toContain('magia');
      }
    }
  });

  it('huir escaleras abajo deja de ser la salida gratis del encuentro', () => {
    const roll = opcion('cl_dravos', 'huir_escaleras_abajo')?.roll;
    expect(roll?.outcomes.success.effects).toContainEqual({ addCondition: 'empapado' });
    expect(roll?.outcomes.partial.effects).toContainEqual({ wound: 1 });
    expect(roll?.outcomes.partial.effects).toContainEqual({ addCondition: 'perseguido' });
  });

  it('ninguna banda del encuentro del clímax sale sin efectos', () => {
    const dravos = campaign.scenes['cl_dravos'] as Scene;
    for (const choice of dravos.choices) {
      for (const [i, banda] of desenlaces(choice).entries()) {
        expect((banda.effects ?? []).length, `cl_dravos/${choice.id}[${i}]`).toBeGreaterThan(0);
      }
    }
  });

  it('las tres palancas de la segunda vuelta se anuncian en la etiqueta', () => {
    const avisos: [string, string, string][] = [
      ['c2_vado_crecido', 'entregar_lo_que_llevas', 'custodia'],
      ['c2_otra_orilla', 'dejar_el_sello_en_la_cadena', 'al agua'],
      ['cl_molino', 'encarar_a_dravos', 'sin puerta'],
      ['cl_dravos', 'huir_escaleras_abajo', 'al agua'],
    ];
    for (const [sceneId, choiceId, aviso] of avisos) {
      const label = opcion(sceneId, choiceId)?.label ?? '';
      expect(label.toLowerCase(), `${sceneId}/${choiceId}`).toContain(aviso.toLowerCase());
      expect(label.length, `${sceneId}/${choiceId}`).toBeLessThanOrEqual(60);
    }
  });

  it('la segunda vuelta no metió ni un tic más de sospecha', () => {
    const palancas: [string, string][] = [
      ['c2_vado_crecido', 'entregar_lo_que_llevas'],
      ['c2_otra_orilla', 'dejar_el_sello_en_la_cadena'],
      ['cl_molino', 'encarar_a_dravos'],
    ];
    for (const [sceneId, choiceId] of palancas) {
      const effects = efectos(sceneId, choiceId);
      expect(effects.some((e) => 'clock' in e && e.clock === 'sospecha'), `${sceneId}/${choiceId}`).toBe(false);
    }
    for (const banda of desenlaces(opcion('cl_dravos', 'huir_escaleras_abajo') as Choice)) {
      const effects = banda.effects ?? [];
      expect(effects.some((e) => 'clock' in e && e.clock === 'sospecha')).toBe(false);
    }
  });

  it('a2_amanecer y c2_anochece no se tocaron: siguen sin cobrar nada', () => {
    for (const sceneId of ['a2_amanecer', 'c2_anochece']) {
      const scene = campaign.scenes[sceneId] as Scene;
      for (const choice of scene.choices) {
        const effects = choice.outcome?.effects ?? [];
        expect(effects.some((e) => 'clock' in e && e.clock === 'sospecha'), `${sceneId}/${choice.id}`).toBe(false);
        expect(effects.some((e) => 'wound' in e), `${sceneId}/${choice.id}`).toBe(false);
      }
    }
  });
});

/**
 * La reliquia de punta a punta (biblia §13.1, outline §5). Los tests unitarios de `applyReward`
 * (tests/engine/resolve.end.test.ts) arman un fixture que mete la reliquia en `campaign.items`, que
 * es justo lo que r07 le PROHÍBE al contenido real: las reliquias solo se declaran en `world.items`.
 * Por eso hacen falta estos, que juegan la campaña de verdad con el motor de verdad sobre la campaña
 * fusionada con WORLD (`conMundo`, que es lo que hace el store al cargar) y miran el perfil después
 * de cerrar la partida. Sin ellos, el motor podría no encontrar nunca la reliquia y nadie se entera.
 */
describe('vado: fin_heredero deja la reliquia en el personaje (§13.1)', () => {
  const clases = Object.keys(CLASSES) as ClassId[];
  const pasosDe = (final: string): readonly Paso[] => {
    const partida = PARTIDAS.find((p) => p.final === final);
    expect(partida, `no hay partida para ${final}`).toBeDefined();
    return partida?.pasos ?? [];
  };

  it('la reliquia no está en campaign.items y sí en la campaña fusionada con WORLD', () => {
    expect(campaign.items['sello_del_vado']).toBeUndefined();
    expect(vado.items['sello_del_vado']?.relic).toBe(true);
  });

  it.each(clases)('un %s que cierra fin_heredero se queda con sello_del_vado', (classId) => {
    const state = jugar(classId, pasosDe('fin_heredero'));
    expect(state.character.relics).toEqual([]);

    const { character, world, summary } = endRun(vado, state);

    expect(character.relics).toEqual(['sello_del_vado']);
    expect(character.run).toBeNull();
    expect(character.flags).toContain('char:vado.heredero');
    expect(world.flags).toContain('world:vado.sello_perdido');
    expect(summary.canonFlags).toContain('char:vado.heredero');
    expect(summary.canonFlags).toContain('world:vado.sello_perdido');
    expect(character.campaignLog['vado']?.canonEnding).toBe('fin_heredero');
  });

  it.each(['fin_hundido', 'fin_dravos', 'fin_crecida'])('%s no entrega ninguna reliquia', (final) => {
    const state = jugar('guerrero', pasosDe(final));
    const { character } = endRun(vado, state);
    expect(character.relics).toEqual([]);
    expect(character.campaignLog['vado']?.canonEnding).toBe(final);
  });

  it('la reliquia entra una sola vez aunque se juegue fin_heredero dos veces', () => {
    const primera = endRun(vado, jugar('mago', pasosDe('fin_heredero')));
    expect(primera.character.relics).toEqual(['sello_del_vado']);

    const segunda = jugar('mago', pasosDe('fin_heredero'));
    const { character } = endRun(vado, {
      ...segunda,
      character: { ...segunda.character, relics: primera.character.relics },
    });
    expect(character.relics).toEqual(['sello_del_vado']);
  });
});
