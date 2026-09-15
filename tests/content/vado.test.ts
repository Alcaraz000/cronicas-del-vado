import { describe, expect, it } from 'vitest';
import { CLASSES, LIMITS, type ClassId } from '@/content/catalog';
import { parseCampaign, type Campaign, type Choice, type Effect, type Outcome, type Scene } from '@/content/schema';
import { campaign } from '@/content/campaigns/vado/campaign';
import { meta } from '@/content/campaigns/vado/meta';
import { WORLD } from '@/content/world';
import { conMundo } from '@/state/store';
import { beginRoll, choose, commitRoll, endRun, enter, render } from '@/engine/resolve';
import { objetivoActivo } from '@/engine/objetivos';
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
  // 9 y no 8: la fase «objetivos» le agregó a la plaza la salida POR DECISIÓN del acto 1
  // (`bajar_al_rio`, con `requires`), que es la que hace que el racimo tenga una arista de
  // opción hacia afuera. Sigue en 6 libres y toca justo el techo de `LIMITS.maxChoices`.
  a1_plaza: [9, 6],
  a1_taberna: [7, 5],
  a1_taberna_trastienda: [4, 4],
  a1_orell_mesa: [4, 4],
  // 4 libres y no 5: la fase «objetivos» le puso `requires: { not: run:cobro_el_adelanto }` a
  // `reclamar_el_adelanto`, que narraba un cobro sin registrarlo (outline §2.2). Toca justo el
  // piso de `LIMITS.minChoices`.
  a1_alcaldesa: [7, 4],
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

/**
 * Las DOCE escenas que el diseño §0.1 midió como una componente fuertemente conexa sin una sola
 * arista de salida. `a1_ronda` no está en la lista y nunca estuvo: no entra ninguna opción en ella
 * (se llega sólo por el `redirect` de sospecha) y sus cinco opciones salen todas a `c1_cuerpo`.
 */
const RACIMO_DEL_ACTO_1 = [
  'a1_plaza',
  'a1_taberna',
  'a1_taberna_trastienda',
  'a1_orell_mesa',
  'a1_alcaldesa',
  'a1_berta_despacho',
  'a1_ilse_patio',
  'a1_molino',
  'a1_molino_pell',
  'a1_molino_rueda',
  'a1_molino_trampilla',
  'a1_posada',
] as const;

/** La condición de la salida del acto 1: las tres pistas, y NADA de `visited` (diseño §3). */
const LAS_TRES_PISTAS = {
  all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }],
} as const;

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

  it('suma 253 opciones, 178 libres y 41 tiradas, como los totales del outline', () => {
    const totales = escenas.reduce(
      (acc, s) => ({
        opciones: acc.opciones + s.choices.length,
        libres: acc.libres + sinRequires(s),
        tiradas: acc.tiradas + s.choices.filter((c) => c.roll !== undefined).length,
      }),
      { opciones: 0, libres: 0, tiradas: 0 },
    );
    expect(totales).toEqual({ opciones: 253, libres: 178, tiradas: 41 });
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

  it('el hub se queda SOLO con el floodgate de sospecha (§8.7, corregido por la fase «objetivos»)', () => {
    // Antes eran dos: el de sospecha y el de las tres pistas + `visited: a1_plaza >= 3`. El
    // segundo se fue de acá y volvió convertido en la opción `bajar_al_rio`, que se ve; el
    // `visited` lo sacó Gabriel («fricción invisible», diseño §3).
    expect(campaign.scenes['a1_plaza']?.redirect).toEqual([
      { when: { clock: 'sospecha', gte: 4 }, to: 'a1_ronda' },
    ]);
  });

  it('los dieciséis redirect de la campaña viven en dieciséis escenas y ninguno apunta a una escena con redirect (r01)', () => {
    const conRedirect = escenas.filter((s) => (s.redirect ?? []).length > 0);
    expect(conRedirect.map((s) => s.id).sort()).toEqual(
      [
        'a1_plaza',
        ...RACIMO_DEL_ACTO_1.filter((id) => id !== 'a1_plaza'),
        'a2_fuera_refugio',
        'a2_ley_guardia',
        'c1_refriega',
        'cl_dravos',
      ].sort(),
    );
    expect(conRedirect.reduce((n, s) => n + (s.redirect ?? []).length, 0)).toBe(16);
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
 * Tramo común a las cuatro partidas: prólogo por el puente, las tres puertas del acto 1 y la
 * vuelta al hub, donde el acto se cierra **eligiendo** `bajar_al_rio`. El `visited: a1_plaza >= 3`
 * que antes hacía falta ya no existe (diseño §3): las tres pistas alcanzan.
 */
const HASTA_EL_CUELLO_1: readonly Paso[] = [
  'seguir_hasta_el_puente', // p_camino  → p_puente
  'entregarle_la_carta_para_cruzar', // p_puente   → a1_plaza
  'entrar_al_ancla_seca', // a1_plaza   → a1_taberna     (run:pista_taberna)
  'pagar_una_ronda', // a1_taberna → a1_plaza
  'golpear_la_puerta_de_berta', // a1_plaza   → a1_alcaldesa   (run:pista_alcaldesa)
  'despedirte_hasta_manana', // a1_alcaldesa → a1_plaza
  'cruzar_al_molino', // a1_plaza   → a1_molino      (run:pista_molino, y van tres)
  'volver_a_la_plaza', // a1_molino  → a1_plaza (el hub NO redirige: ofrece la puerta)
  'bajar_al_rio', // a1_plaza   → c1_cuerpo, por decisión
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

  it('el acto 1 se cierra con las tres pistas y ya NO pide pisar el hub tres veces', () => {
    // Una pista antes: dos pistas y el hub todavía se puede jugar.
    const dosPistas = jugar('guerrero', HASTA_EL_CUELLO_1.slice(0, 6));
    expect(dosPistas.run.sceneId).toBe('a1_plaza');
    expect(dosPistas.run.flags).toContain('run:pista_taberna');
    expect(dosPistas.run.flags).toContain('run:pista_alcaldesa');
    expect(dosPistas.run.flags).not.toContain('run:pista_molino');

    const enElCuello = jugar('guerrero', HASTA_EL_CUELLO_1);
    expect(enElCuello.run.sceneId).toBe('c1_cuerpo');

    // Y una ruta que junta las tres pistas pisando el hub DOS veces llega igual: ésa es la
    // condición que se sacó. Con el `visited: a1_plaza >= 3` puesto, esta partida se quedaba
    // dando vueltas en el acto 1.
    const porDosVueltas = jugar('guerrero', [
      'seguir_hasta_el_puente', // p_camino → p_puente
      'entregarle_la_carta_para_cruzar', // p_puente → a1_plaza
      'entrar_al_ancla_seca', // a1_plaza → a1_taberna    (pista 1)
      'pedirle_a_mausi_la_trastienda', // a1_taberna → a1_taberna_trastienda
      'salir_por_la_puerta_de_atras', // trastienda → a1_molino    (pista 2)
      'volver_a_la_plaza', // a1_molino → a1_plaza
      'golpear_la_puerta_de_berta', // a1_plaza → a1_alcaldesa  (pista 3)
      'ayudar_a_ilse_con_los_sacos', // → a1_ilse_patio, que REDIRIGE al cuello 1
    ]);
    expect(porDosVueltas.run.sceneId).toBe('c1_cuerpo');
    expect(porDosVueltas.run.visited['a1_plaza']).toBe(2);
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
  /**
   * La regla general detrás del caso de `ceder`, como regresión sobre las 46 escenas.
   *
   * Después de que corren los `effects`, la condición `{ item: X }` es determinista: tras un
   * `take: X` es siempre falsa, así que la variante que la usa es prosa muerta y el jugador lee el
   * fallback, que suele decir lo contrario de lo que acaba de pasarle.
   *
   * Queda UNA sola, anotada y no arreglada acá: `c2_vado_crecido.cruzar_de_frente.partial` es de la
   * Fase D (lote 5), vive en la escena mortal y su prosa no es de esta tarea. La lista de abajo es
   * el candado: si aparece una segunda, este test se cae.
   */
  it('ninguna variante por objeto vive en el mismo desenlace que se lleva ese objeto', () => {
    const muertas: string[] = [];
    for (const scene of escenas) {
      for (const choice of scene.choices) {
        const bandas: [string, Outcome][] = choice.outcome
          ? [[`${scene.id}/${choice.id}`, choice.outcome]]
          : desenlaces(choice).map((o, i) => [`${scene.id}/${choice.id}[${i}]`, o]);
        for (const [etiqueta, banda] of bandas) {
          const llevados = (banda.effects ?? []).flatMap((e) => ('take' in e ? [e.take] : []));
          if (llevados.length === 0) continue;
          const plano = JSON.stringify(banda.text ?? []);
          for (const id of llevados) {
            if (plano.includes(`"item":"${id}"`)) muertas.push(etiqueta);
          }
        }
      }
    }
    expect(muertas.sort()).toEqual(['c2_vado_crecido/cruzar_de_frente[1]']);
  });

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

  it('toda fuente de run:orell_confia limpia run:orell_humillado, en TODA la campaña (no solo el acto 2)', () => {
    // Oleada final de la Fase H, hallazgo C: el test de arriba solo mira `a2_ley_orell`. El bug de
    // verdad estaba en el prólogo: `p_puente_amanecer.onEnter` y `reconocer_el_escudo` (opción de
    // Guerrero en `p_puente_rechazo`) encendían `run:orell_confia` sin limpiar `run:orell_humillado`,
    // y las dos son alcanzables después de `p_puente.intimidar_al_sargento`, que enciende el
    // humillado — una partida podía terminar con los dos flags prendidos a la vez. La invariante es
    // pareja para toda fuente, recorriendo `bloquesDeEfectos()` (onEnter + todos los desenlaces de
    // toda escena), no solo la rama A del acto 2.
    for (const { etiqueta, effects } of bloquesDeEfectos()) {
      if (!effects.some((e) => 'set' in e && e.set === 'run:orell_confia')) continue;
      expect(effects, etiqueta).toContainEqual({ clear: 'run:orell_humillado' });
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

// ---------------------------------------------------------------------------
// Fase H · tarea 3 — el sello se telegrafía, y la carta que nadie podía usar
// ---------------------------------------------------------------------------

describe('vado: el sello es invisible, no inaccesible (Fase H §3)', () => {
  /**
   * Las dos puertas del camino A (biblia §9.4) no cambian de mecánica: siguen siendo la misma
   * tirada de Saber · difícil con un intento por partida. Lo único que cambia es que el texto de
   * escena, antes de ofrecer la opción, dice que hay algo para leer, y que la etiqueta promete que
   * hay algo escrito en vez de nombrar el objeto sin más.
   */
  it('las dos escenas de la piedra dicen que hay algo escrito antes de ofrecer leerla', () => {
    const casos: { sceneId: string; choiceId: string }[] = [
      { sceneId: 'a2_ley_cartas', choiceId: 'reconocer_el_sigilo' },
      { sceneId: 'a2_fuera_sello', choiceId: 'leer_la_piedra' },
    ];
    for (const { sceneId, choiceId } of casos) {
      const scene = campaign.scenes[sceneId] as Scene;
      // El aviso vive en el texto de ESCENA (lo que se lee antes de elegir), no en el desenlace.
      const textoDeEscena = JSON.stringify(scene.text).toLowerCase();
      expect(textoDeEscena, `${sceneId}: el texto de escena no dice que hay algo para leer`).toContain('adorno');

      const choice = scene.choices.find((c) => c.id === choiceId);
      expect(choice, `${sceneId}/${choiceId}`).toBeDefined();
      // "Leer la piedra" no promete nada; "Leer lo que dice la piedra" sí (biblia §10).
      expect(choice?.label.toLowerCase(), `${sceneId}/${choiceId}`).toContain('dice');
    }
  });

  /**
   * Fase H · tarea 3, brief §"la carta que nadie podía usar". El brief nombraba
   * `cl_halvar.leerle_el_libro_de_rutas` como la opción sin guardia, pero esa premisa no se sostenía
   * (investigación completa en `task-3-report.md` §4): esa opción es una de las 4 libres de
   * `cl_halvar` a propósito —el diseño la documenta como la vía SIN objeto, en paralelo a la que sí
   * lo pide— y forzarle un `requires` deja la escena en 3 libres, lo que dispara `r03_choices`
   * (`LIMITS.minChoices = 4`), confirmado corriendo `npm run validate` con el cambio puesto.
   *
   * La opción que de verdad usa `carta_de_halvar`, `leerle_lo_que_firmo_berta`, ya tenía el
   * `requires` y el `lockedHint` puestos —probablemente desde el lote que escribió la prosa—, así
   * que el segundo arreglo de la tarea no existía: ya estaba hecho. Este test fija ese estado para
   * que, si alguna vez se le saca la guardia a esta opción, algo se entere.
   */
  it('la opción del clímax que usa la carta de Halvar ya la pide y explica qué falta', () => {
    const opcion = campaign.scenes['cl_halvar']?.choices.find((c) => c.id === 'leerle_lo_que_firmo_berta');
    expect(opcion?.requires).toEqual({ item: 'carta_de_halvar' });
    expect(opcion?.lockedHint).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Fase «objetivos» — el acto 1 tiene salida y el juego dice qué estás haciendo
// ---------------------------------------------------------------------------

/** Una partida parada en `sceneId` con los flags que pida el caso, sin haber jugado hasta ahí. */
function partidaEn(sceneId: string, flags: readonly string[]): GameState {
  const base = nivel1('guerrero');
  return { ...base, run: { ...base.run, sceneId, flags: [...flags] } };
}

const TRES_PISTAS_PUESTAS = ['run:pista_taberna', 'run:pista_alcaldesa', 'run:pista_molino'] as const;

/** El texto del objetivo activo, que es lo único que llega a la pantalla. */
function objetivoDe(state: GameState): string | null {
  return objetivoActivo(vado, state)?.texto ?? null;
}

describe('vado: el acto 1 tiene salida (diseño §3)', () => {
  const ONCE = RACIMO_DEL_ACTO_1.filter((id) => id !== 'a1_plaza');

  it('las once escenas del racimo que no son el hub declaran el redirect de las tres pistas', () => {
    for (const id of ONCE) {
      expect(campaign.scenes[id]?.redirect, id).toEqual([{ when: LAS_TRES_PISTAS, to: 'c1_cuerpo' }]);
    }
  });

  it('ninguna condición de redirect del acto 1 mira `visited`', () => {
    for (const id of RACIMO_DEL_ACTO_1) {
      const json = JSON.stringify(campaign.scenes[id]?.redirect ?? []);
      expect(json, id).not.toContain('visited');
    }
  });

  it('el hub gana la salida POR DECISIÓN: una opción que se ve, pide las tres pistas y baja al cuello 1', () => {
    const salida = campaign.scenes['a1_plaza']?.choices.find((c) => c.id === 'bajar_al_rio');
    expect(salida).toBeDefined();
    expect(salida?.requires).toEqual(LAS_TRES_PISTAS);
    expect(salida?.lockedHint).toBeTruthy();
    expect(salida?.outcome?.next).toBe('c1_cuerpo');
  });

  /**
   * Es la mitad que la regla 13 mira y la que el diseño §5 pide: del racimo tiene que salir una
   * ARISTA DE OPCIÓN, no sólo un `redirect`. Sin esta opción `npm run validate` sigue rojo aunque
   * las doce escenas tengan el redirect puesto (informe de la tarea 3, §2).
   */
  it('del racimo sale exactamente una arista que nace de una opción', () => {
    const adentro = new Set<string>(RACIMO_DEL_ACTO_1);
    const salidas: string[] = [];
    for (const id of RACIMO_DEL_ACTO_1) {
      const scene = campaign.scenes[id] as Scene;
      for (const choice of scene.choices) {
        for (const o of desenlaces(choice)) {
          if (!adentro.has(o.next)) salidas.push(`${id}/${choice.id} -> ${o.next}`);
        }
      }
    }
    expect(salidas).toEqual(['a1_plaza/bajar_al_rio -> c1_cuerpo']);
  });

  it('entrar a cualquiera de las once con las tres pistas cae en el cuello 1, y al hub no', () => {
    for (const id of ONCE) {
      const state = enter(vado, partidaEn(id, TRES_PISTAS_PUESTAS), id);
      expect(state.run.sceneId, id).toBe('c1_cuerpo');
    }
    // El hub no redirige: ofrece la puerta y deja elegir.
    const enElHub = enter(vado, partidaEn('a1_plaza', TRES_PISTAS_PUESTAS), 'a1_plaza');
    expect(enElHub.run.sceneId).toBe('a1_plaza');
    const salida = render(vado, enElHub).choices.find((c) => c.id === 'bajar_al_rio');
    expect(salida?.visible).toBe(true);
    expect(salida?.enabled).toBe(true);
    expect(choose(vado, enElHub, 'bajar_al_rio').run.sceneId).toBe('c1_cuerpo');
  });

  it('sin las tres pistas ninguna de las doce redirige, y la puerta del hub está cerrada', () => {
    for (const id of RACIMO_DEL_ACTO_1) {
      const state = enter(vado, partidaEn(id, ['run:pista_taberna', 'run:pista_alcaldesa']), id);
      expect(state.run.sceneId, id).toBe(id);
    }
    const enElHub = enter(vado, partidaEn('a1_plaza', ['run:pista_taberna']), 'a1_plaza');
    const salida = render(vado, enElHub).choices.find((c) => c.id === 'bajar_al_rio');
    expect(salida?.visible).toBe(true);
    expect(salida?.enabled).toBe(false);
    expect(salida?.lockedHint).toBeTruthy();
  });

  /**
   * El aviso del motor: `enter()` resuelve los `redirect` AL ENTRAR. La pista que faltaba se
   * enciende en el `onEnter` de la escena donde el jugador queda parado, así que el redirect de esa
   * escena ya pasó: lo que lo saca es la elección SIGUIENTE, y por eso el redirect tiene que estar
   * en las once y no en una sola.
   */
  it('jugando: la tercera pista te deja adentro, y la elección siguiente te saca', () => {
    const conLasTres = jugar('guerrero', HASTA_EL_CUELLO_1.slice(0, 7));
    expect(conLasTres.run.sceneId).toBe('a1_molino');
    for (const flag of TRES_PISTAS_PUESTAS) expect(conLasTres.run.flags).toContain(flag);

    // Cualquier elección que no sea volver al hub cae en el cuello 1 en un paso.
    expect(choose(vado, conLasTres, 'entrar_por_el_caz').run.sceneId).toBe('c1_cuerpo');
    expect(choose(vado, conLasTres, 'descolgar_el_farol').run.sceneId).toBe('c1_cuerpo');
    // Y la que vuelve al hub te deja elegir la puerta.
    const enElHub = choose(vado, conLasTres, 'volver_a_la_plaza');
    expect(enElHub.run.sceneId).toBe('a1_plaza');
    expect(choose(vado, enElHub, 'bajar_al_rio').run.sceneId).toBe('c1_cuerpo');
  });
});

describe('vado: el objetivo en pantalla (diseño §2)', () => {
  it('declara los siete objetivos, en el orden de prioridad', () => {
    expect(campaign.objetivos?.map((o) => o.id)).toEqual([
      'obj_acto2',
      'obj_llegar',
      'obj_preguntar',
      'obj_molino',
      'obj_taberna',
      'obj_berta',
      'obj_cierra',
    ]);
  });

  /**
   * La restricción MEDIDA en el navegador por la tarea 2: en 375×812, si el título pasa de
   * ~190 px las marcas de Heridas y Fortuna se van a un renglón propio y el cromo le come 32 px
   * más al arte. 29 caracteres miden 171 px; 54 miden 325.
   */
  it('ningún texto pasa de los 32 caracteres que entran en el cartel del teléfono', () => {
    for (const objetivo of campaign.objetivos ?? []) {
      expect(objetivo.texto.length, `${objetivo.id}: ${objetivo.texto}`).toBeLessThanOrEqual(32);
      expect(objetivo.texto.trim(), objetivo.id).not.toBe('');
    }
  });

  it('en el prólogo el objetivo es el de la campaña entera', () => {
    const arranque = enter(vado, nivel1('guerrero'), vado.start);
    expect(objetivoDe(arranque)).toBe('Averiguá qué pasó con Tomé');
    expect(objetivoDe(jugar('guerrero', ['seguir_hasta_el_puente']))).toBe('Averiguá qué pasó con Tomé');
  });

  it('en el pueblo y sin ninguna pista, manda a preguntar', () => {
    const enLaPlaza = jugar('guerrero', [
      'seguir_hasta_el_puente',
      'entregarle_la_carta_para_cruzar',
      'mirar_el_pozo', // vuelve al hub sin encender ninguna pista
    ]);
    expect(enLaPlaza.run.sceneId).toBe('a1_plaza');
    expect(enLaPlaza.run.flags).not.toContain('run:pista_taberna');
    expect(objetivoDe(enLaPlaza)).toBe('Preguntá en el pueblo');
  });

  /**
   * El PEOR ciclo del diagnóstico (§0.3): se entra al acto 1 por el vado oculto, directo a la
   * trampilla del molino, y se da vueltas entre la trampilla y la rueda sin pisar la plaza y sin
   * encender una sola pista. Ahí las dos puertas del acto estaban congeladas a la vez y la pantalla
   * no decía nada. Ahora dice a dónde ir.
   */
  it('entrando por el vado oculto, el bucle trampilla ↔ rueda también tiene objetivo', () => {
    let state = jugar('guerrero', [
      ['rodear_por_la_orilla', 'success'], // p_camino → p_vado_oculto
      'subir_por_el_caz', // p_vado_oculto → a1_molino_trampilla, sin ninguna pista
    ]);
    expect(state.run.sceneId).toBe('a1_molino_trampilla');
    expect(state.run.visited['a1_plaza']).toBeUndefined();
    expect(state.run.flags.filter((f) => f.startsWith('run:pista_'))).toEqual([]);
    // La primera pantalla de Aldamar todavía muestra el objetivo de la campaña entera.
    expect(objetivoDe(state)).toBe('Averiguá qué pasó con Tomé');

    for (let vuelta = 0; vuelta < 5; vuelta += 1) {
      state = choose(vado, state, 'leer_las_marcas'); // trampilla → rueda
      expect(state.run.sceneId, `vuelta ${vuelta}`).toBe('a1_molino_rueda');
      expect(objetivoDe(state), `vuelta ${vuelta}`).toBe('Preguntá en el pueblo');
      state = choose(vado, state, 'entrar_por_el_hueco_del_caz'); // rueda → trampilla
      expect(state.run.sceneId, `vuelta ${vuelta}`).toBe('a1_molino_trampilla');
      expect(objetivoDe(state), `vuelta ${vuelta}`).toBe('Preguntá en el pueblo');
    }
  });

  it('entrando por la puerta del molino, el objetivo nombra los otros dos lugares', () => {
    const enElMolino = jugar('guerrero', [
      ['rodear_por_la_orilla', 'success'], // p_camino → p_vado_oculto
      'rodear_hasta_la_puerta_del_molino', // → a1_molino (run:pista_molino)
      'agarrar_la_palanca', // → a1_molino_trampilla
    ]);
    expect(enElMolino.run.sceneId).toBe('a1_molino_trampilla');
    expect(enElMolino.run.visited['a1_plaza']).toBeUndefined();
    expect(objetivoDe(enElMolino)).toBe('No pasaste por el Ancla Seca');
  });

  it('con una o dos pistas, nombra un lugar que todavía no viste', () => {
    const casos: { flags: string[]; texto: string }[] = [
      { flags: ['run:pista_taberna'], texto: 'Todavía no viste el molino' },
      { flags: ['run:pista_alcaldesa'], texto: 'Todavía no viste el molino' },
      { flags: ['run:pista_molino'], texto: 'No pasaste por el Ancla Seca' },
      { flags: ['run:pista_taberna', 'run:pista_molino'], texto: 'No hablaste con Berta' },
      { flags: ['run:pista_alcaldesa', 'run:pista_molino'], texto: 'No pasaste por el Ancla Seca' },
      { flags: ['run:pista_taberna', 'run:pista_alcaldesa'], texto: 'Todavía no viste el molino' },
    ];
    for (const { flags, texto } of casos) {
      const base = partidaEn('a1_plaza', flags);
      const enElPueblo: GameState = { ...base, run: { ...base.run, visited: { a1_plaza: 1 } } };
      expect(objetivoDe(enElPueblo), flags.join('+')).toBe(texto);
    }
  });

  it('con las tres pistas, deja de nombrar lugares', () => {
    const conLasTres = jugar('guerrero', HASTA_EL_CUELLO_1.slice(0, 8));
    expect(conLasTres.run.sceneId).toBe('a1_plaza');
    expect(objetivoDe(conLasTres)).toBe('Hay algo que no cierra');
  });

  it('pasado el cuello 1 el objetivo es el del acto 2, aunque falten pistas', () => {
    const enElCuerpo = jugar('guerrero', HASTA_EL_CUELLO_1);
    expect(enElCuerpo.run.sceneId).toBe('c1_cuerpo');
    expect(objetivoDe(choose(vado, enElCuerpo, 'taparlo_y_volver_al_pueblo'))).toBe(
      'Averiguá quién lo tiró al agua',
    );

    // Por la ronda de Dravos se llega al acto 2 con una sola pista: ninguno de los objetivos del
    // acto 1 puede asomar ahí.
    const base = partidaEn('a1_plaza', ['run:pista_taberna']);
    const temerario: GameState = { ...base, run: { ...base.run, clocks: { sospecha: 4 } } };
    const enLaRonda = enter(vado, temerario, 'a1_plaza');
    expect(enLaRonda.run.sceneId).toBe('a1_ronda');
    expect(objetivoDe(enLaRonda)).toBe('Averiguá quién lo tiró al agua');
  });

  /** Las opciones que la pantalla deja tocar: es lo único que un jugador puede elegir. */
  function habilitadas(state: GameState): string[] {
    return render(vado, state)
      .choices.filter((c) => c.visible && c.enabled)
      .map((c) => c.id);
  }

  /**
   * EL BUG DE GABRIEL, caminado como lo camina un jugador: la casa de Berta, «Reclamar el adelanto»
   * y «Revisar el escritorio», una y otra vez. Criterio §7.3 del diseño, primera mitad: **el bucle
   * concreto no se puede caminar**.
   *
   * OJO, Y ES LO QUE ESTE CASO ARREGLA: `choose()` NO mira `requires` (lo hace `render`, que es lo
   * que dibuja la pantalla). La versión anterior de este caso elegía `reclamar_el_adelanto` veinte
   * veces con `choose()` directo y pasaba contenta, aunque desde la tarea 4 la opción se apaga
   * después de la primera: estaba caminando una secuencia que el jugador no puede hacer. Por eso
   * acá cada vuelta pasa por `render` y por `habilitadas`.
   */
  it('el bucle de la casa de Berta: la segunda vuelta ya no se puede elegir', () => {
    let state = jugar('guerrero', [
      'seguir_hasta_el_puente',
      'entregarle_la_carta_para_cruzar',
      'golpear_la_puerta_de_berta', // a1_plaza → a1_alcaldesa (run:pista_alcaldesa)
    ]);
    expect(state.run.sceneId).toBe('a1_alcaldesa');

    // VUELTA 1 — la opción está, con su etiqueta, y se puede elegir.
    const primeraVuelta = habilitadas(state);
    expect(primeraVuelta).toContain('reclamar_el_adelanto');
    expect(objetivoDe(state)).toBe('Todavía no viste el molino');

    state = choose(vado, state, 'reclamar_el_adelanto'); // → a1_berta_despacho
    expect(state.run.sceneId).toBe('a1_berta_despacho');
    expect(objetivoDe(state)).toBe('Todavía no viste el molino');
    const pending = beginRoll(vado, state, 'revisar_el_escritorio');
    state = commitRoll(vado, state, { ...pending, band: 'success' }); // → a1_alcaldesa
    expect(state.run.sceneId).toBe('a1_alcaldesa');

    // VUELTA 2 — la misma pantalla, y ya NO es la misma: la opción se ve y no se puede elegir.
    const reclamar = render(vado, state).choices.find((c) => c.id === 'reclamar_el_adelanto');
    expect(reclamar?.label).toBe('Reclamar el adelanto que promete la carta');
    expect(reclamar?.visible).toBe(true);
    expect(reclamar?.enabled).toBe(false);
    expect(reclamar?.lockedHint).toBe('El adelanto ya lo cobraste');

    // La lista de lo elegible CAMBIÓ entre una vuelta y la otra: ése era el síntoma que Gabriel
    // reportó («la pantalla es idéntica»), y es el que se fue.
    const segundaVuelta = habilitadas(state);
    expect(segundaVuelta).not.toContain('reclamar_el_adelanto');
    expect(segundaVuelta).not.toEqual(primeraVuelta);
    // Y lo que queda no es un pozo: las otras cuatro siguen ahí.
    expect(segundaVuelta).toEqual([
      'preguntar_por_tome',
      'ayudar_a_ilse_con_los_sacos',
      'salir_al_patio',
      'despedirte_hasta_manana',
    ]);
    // El cartel sigue nombrando el lugar que falta, en las dos vueltas y en las dos escenas.
    expect(objetivoDe(state)).toBe('Todavía no viste el molino');

    // Y en cuanto el jugador hace lo que el objetivo le pide, el acto avanza.
    state = choose(vado, state, 'despedirte_hasta_manana'); // → a1_plaza
    state = choose(vado, state, 'cruzar_al_molino'); // → a1_molino (run:pista_molino)
    expect(objetivoDe(state)).toBe('No pasaste por el Ancla Seca');
    state = choose(vado, state, 'volver_a_la_plaza'); // → a1_plaza
    state = choose(vado, state, 'entrar_al_ancla_seca'); // → a1_taberna (la tercera pista)
    expect(objetivoDe(state)).toBe('Hay algo que no cierra');
    // La elección siguiente lo saca: la que se queda en el Ancla Seca, por el redirect…
    expect(choose(vado, state, 'sentarte_en_la_mesa_de_orell').run.sceneId).toBe('c1_cuerpo');
    // …y la que vuelve al hub, por la puerta que ahora se ve.
    state = choose(vado, state, 'pagar_una_ronda');
    expect(state.run.sceneId).toBe('a1_plaza');
    expect(objetivoDe(state)).toBe('Hay algo que no cierra');
    state = choose(vado, state, 'bajar_al_rio');
    expect(state.run.sceneId).toBe('c1_cuerpo');
  });

  /**
   * LA SEGUNDA MITAD DEL §7.3 —«llegar a la salida del acto en una cantidad acotada de pasos»— NO
   * SE CUMPLE, y este caso fija por qué, medido con el motor y respetando lo que la pantalla
   * habilita: el jugador que se queda insistiendo adentro de la casa de Berta llena el reloj de
   * `sospecha` hasta el tope, y la puerta que lee ese reloj vive **sólo en el hub**, que ese bucle
   * no pisa. Las tres bandas dan lo mismo y a 400 pasos no sale (informe de la tarea 5).
   *
   * No está acá para bendecir el encierro sino para que se vea de una: si algún día el floodgate de
   * `sospecha` se muda a las once escenas —que es el arreglo de una línea que este caso propone—,
   * este test se cae y hay que venir a leer esto.
   */
  it('insistiendo en la casa de Berta el reloj se llena, y la puerta que lo lee está en el hub', () => {
    // La mitad estructural: de las doce escenas del racimo, la única que mira `sospecha` es el hub.
    const leenElReloj = RACIMO_DEL_ACTO_1.filter((id) =>
      JSON.stringify(campaign.scenes[id]?.redirect ?? []).includes('sospecha'),
    );
    expect(leenElReloj).toEqual(['a1_plaza']);

    // La mitad jugada: doce pasos insistiendo, siempre lo primero que la pantalla habilita.
    let state = jugar('guerrero', [
      'seguir_hasta_el_puente',
      'entregarle_la_carta_para_cruzar',
      'golpear_la_puerta_de_berta',
    ]);
    for (let paso = 0; paso < 12; paso += 1) {
      const elegible = habilitadas(state);
      expect(elegible.length, `paso ${paso} en ${state.run.sceneId}`).toBeGreaterThan(0);
      const id = elegible[0] as string;
      const choice = vado.scenes[state.run.sceneId]?.choices.find((c) => c.id === id) as Choice;
      if (choice.roll !== undefined) {
        const pendiente = beginRoll(vado, state, id);
        state = commitRoll(vado, state, { ...pendiente, band: 'failure' });
      } else {
        state = choose(vado, state, id);
      }
      expect(state.run.outcome, `paso ${paso}`).toBeUndefined();
      expect(RACIMO_DEL_ACTO_1, `paso ${paso}`).toContain(state.run.sceneId);
    }
    expect(state.run.clocks['sospecha']).toBeGreaterThanOrEqual(4);
    expect(state.run.sceneId).toBe('a1_alcaldesa');
    // El cartel, mientras tanto, sigue diciendo a dónde ir: eso es lo que sí cambió.
    expect(objetivoDe(state)).toBe('Todavía no viste el molino');

    // Y lo que lo levanta es volver al hub, que es donde vive la puerta.
    state = choose(vado, state, 'despedirte_hasta_manana');
    expect(state.run.sceneId).toBe('a1_ronda');
    expect(objetivoDe(state)).toBe('Averiguá quién lo tiró al agua');
  });

  /**
   * El quiebre de acto dejó de ser mudo (tarea 5). Van las dos aserciones juntas a propósito: la
   * de lo que TIENE que decir —un `toContain` sobre la prosa— y la de que se loguea al elegir. Un
   * `not.toMatch` solo pasaría igual de contento con el texto vacío, que es la trampa que esta
   * fase encontró tres veces.
   */
  it('`bajar_al_rio` narra la bajada: el quiebre de acto ya no es una transición muda', () => {
    const salida = campaign.scenes['a1_plaza']?.choices.find((c) => c.id === 'bajar_al_rio');
    const prosa = prosaDe(salida?.outcome as Outcome);
    expect(prosa).toContain('Bajás sin farol');
    expect(prosa).toContain('El río se oye entero');

    const enElHub = enter(vado, partidaEn('a1_plaza', TRES_PISTAS_PUESTAS), 'a1_plaza');
    const despues = choose(vado, enElHub, 'bajar_al_rio');
    expect(despues.run.sceneId).toBe('c1_cuerpo');
    const desenlace = despues.run.log.filter((e) => e.kind === 'outcome').at(-1);
    expect(JSON.stringify(desenlace)).toContain('Bajás sin farol');
  });
});

// ---------------------------------------------------------------------------
// Fase «objetivos», tarea 4 — lo que la prosa promete, el estado lo registra
// ---------------------------------------------------------------------------

/** Toda la prosa escrita de un desenlace, variantes incluidas, en un solo string. */
function prosaDe(outcome: Outcome): string {
  return (outcome.text ?? [])
    .map((p) => (typeof p === 'string' ? p : p.variants.map((v) => v.text).join(' ')))
    .join(' ');
}

function opcionDe(sceneId: string, choiceId: string): Choice {
  const choice = campaign.scenes[sceneId]?.choices.find((c) => c.id === choiceId);
  expect(choice, `${sceneId}.${choiceId}`).toBeDefined();
  return choice as Choice;
}

describe('vado: lo que la prosa dice que pasó, el estado lo registra (diseño §4)', () => {
  /**
   * Caso 1, el de Gabriel. «te adelanta la tercera parte» y la opción no tenía un solo efecto,
   * así que volvía a prometer lo mismo cada vez que la mirabas.
   */
  it('«Reclamar el adelanto» cobra una vez, queda registrado y no vuelve a prometerlo', () => {
    const reclamar = opcionDe('a1_alcaldesa', 'reclamar_el_adelanto');
    // La etiqueta NO se toca: el problema nunca fue cómo se llama la opción (decisión de Gabriel).
    expect(reclamar.label).toBe('Reclamar el adelanto que promete la carta');
    expect(campaign.flags['run:cobro_el_adelanto']).toBeTruthy();
    expect(prosaDe(reclamar.outcome as Outcome)).toContain('te adelanta la tercera parte');
    expect(reclamar.outcome?.effects).toEqual([{ set: 'run:cobro_el_adelanto' }]);

    // Jugando: se entra a la casa de Berta y se cobra.
    const enLaCasa = jugar('guerrero', [
      'seguir_hasta_el_puente',
      'entregarle_la_carta_para_cruzar',
      'golpear_la_puerta_de_berta',
    ]);
    expect(enLaCasa.run.sceneId).toBe('a1_alcaldesa');
    const primera = render(vado, enLaCasa).choices.find((c) => c.id === 'reclamar_el_adelanto');
    expect(primera?.visible).toBe(true);
    expect(primera?.enabled).toBe(true);

    const cobrado = choose(vado, enLaCasa, 'reclamar_el_adelanto');
    expect(cobrado.run.sceneId).toBe('a1_berta_despacho');
    expect(cobrado.run.flags).toContain('run:cobro_el_adelanto');
    // La prosa que afirma el pago es la que se leyó, y ahora tiene estado atrás.
    const leido = cobrado.run.log.filter((e) => e.kind === 'outcome').at(-1);
    expect(JSON.stringify(leido)).toContain('te adelanta la tercera parte');

    // La segunda vez la opción sigue ahí, con su etiqueta, y ya no promete nada.
    const deVuelta = choose(vado, cobrado, 'preguntarle_por_la_carta');
    expect(deVuelta.run.sceneId).toBe('a1_alcaldesa');
    const segunda = render(vado, deVuelta).choices.find((c) => c.id === 'reclamar_el_adelanto');
    expect(segunda?.label).toBe('Reclamar el adelanto que promete la carta');
    expect(segunda?.visible).toBe(true);
    expect(segunda?.enabled).toBe(false);
    expect(segunda?.lockedHint).toBe(reclamar.lockedHint);
    expect(reclamar.lockedHint).toBeTruthy();
  });

  /** Caso 2: «La tapa tiene el herraje forzado, y no de este lado» es un hallazgo, no ambiente. */
  it('subir por la rueda registra el herraje forzado de la trampilla', () => {
    const subir = opcionDe('a1_molino', 'subir_por_la_rueda');
    expect(subir.label).toBe('Subir por la rueda hasta el desván');
    expect(campaign.flags['run:tapa_forzada']).toBeTruthy();
    expect(prosaDe(subir.outcome as Outcome)).toContain('el herraje forzado, y no de este lado');
    expect(subir.outcome?.effects).toEqual([{ set: 'run:tapa_forzada' }]);

    const state = jugar('explorador', [
      'seguir_hasta_el_puente',
      'entregarle_la_carta_para_cruzar',
      'cruzar_al_molino',
      'subir_por_la_rueda',
    ]);
    expect(state.run.sceneId).toBe('a1_molino_trampilla');
    expect(state.run.flags).toContain('run:tapa_forzada');
  });

  /** Caso 3: Halvar dice que el peaje del medio es suyo, que es lo que significa el flag. */
  it('escuchar a Halvar en el clímax registra que sabés del mercader, y sólo en el éxito', () => {
    const escuchar = opcionDe('cl_molino', 'escuchar');
    const bandas = escuchar.roll?.outcomes;
    expect(prosaDe(bandas?.success as Outcome)).toContain('el del medio es suyo');
    expect(bandas?.success.effects).toEqual([{ set: 'run:sabe_de_halvar' }]);
    // La banda parcial escucha la mitad y no se entera: no enciende nada.
    expect(bandas?.partial.effects).toBeUndefined();
    // El fallo sigue cobrando lo suyo, y nada más.
    expect(bandas?.failure.effects).toEqual([{ set: 'run:dravos_sabe' }]);

    const pasos = PARTIDAS.find((p) => p.final === 'fin_hundido')?.pasos as readonly Paso[];
    const hasta = pasos.slice(0, pasos.findIndex((p) => Array.isArray(p) && p[0] === 'escuchar') + 1);
    const state = jugar('guerrero', hasta);
    expect(state.run.sceneId).toBe('cl_halvar');
    expect(state.run.flags).toContain('run:sabe_de_halvar');
  });

  /**
   * Casos 4 y 5: o el efecto existe en el vocabulario del motor, o la frase no puede afirmar que
   * pasó. `Effect` no tiene comida ni calzado y no se le agregan por una línea cada uno.
   */
  it('cerrar los postigos no narra comida, porque el motor no tiene comida', () => {
    const postigos = opcionDe('c2_anochece', 'cerrar_los_postigos');
    expect(postigos.label).toBe('Cerrar los postigos con los vecinos');
    expect(postigos.outcome?.effects).toBeUndefined();
    // La guarda contra el falso verde: borrar la prosa entera también haría pasar el `not.toMatch`.
    expect(prosaDe(postigos.outcome as Outcome)).toContain('Aguantás el postigo contra el viento');
    expect(prosaDe(postigos.outcome as Outcome)).not.toMatch(/\bpan(es)?\b/iu);
  });

  it('colarse por el terraplén no narra calzado perdido, y sí lo que el estado registra', () => {
    const colarte = opcionDe('p_puente_rechazo', 'colarte_por_el_terraplen');
    expect(colarte.label).toBe('Colarte por el terraplén');
    const parcial = colarte.roll?.outcomes.partial as Outcome;
    expect(parcial.effects).toEqual([{ addCondition: 'empapado' }]);
    // Misma guarda: la banda sigue narrando la caída al agua, que es lo que el `empapado` registra.
    expect(prosaDe(parcial)).toContain('el río te recibe de costado');
    expect(prosaDe(parcial)).not.toMatch(/\bbotas?\b/iu);

    // Jugando: la banda parcial deja lo único que la banda afirma, el agua encima.
    const state = jugar('guerrero', [
      'seguir_hasta_el_puente',
      'mirar_las_runas_del_pilar',
      ['colarte_por_el_terraplen', 'partial'],
    ]);
    expect(state.run.sceneId).toBe('a1_plaza');
    expect(state.run.conditions).toContain('empapado');
    expect(JSON.stringify(state.run.log.filter((e) => e.kind === 'outcome'))).not.toMatch(/bota/iu);
  });
});
