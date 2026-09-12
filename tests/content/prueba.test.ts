import { describe, it, expect } from 'vitest';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { npcs } from '@/content/campaigns/prueba/npcs';
import { places } from '@/content/campaigns/prueba/places';
import { items } from '@/content/campaigns/prueba/items';
import { flags } from '@/content/campaigns/prueba/flags';
import { parseCampaign, type Paragraph, type Scene, type Choice, type Outcome, type Effect } from '@/content/schema';
import { p_umbral, p_biblioteca, p_patio, p_patio_2, p_victoria, p_capilla } from '@/content/campaigns/prueba/scenes/acto1';
import { p_escalera, p_cripta, p_fin_tesoro, p_fin_huida } from '@/content/campaigns/prueba/scenes/acto2';
import { campaign } from '@/content/campaigns/prueba/campaign';
import { enter, render } from '@/engine/resolve';
import { makeState } from '../fixtures/state';

describe('prueba: meta', () => {
  it('es la campaña de humo oculta, perfil smoke, rango 3-5, una escena mortal', () => {
    expect(pruebaMeta.id).toBe('prueba');
    expect(pruebaMeta.contentVersion).toBe(1);
    expect(pruebaMeta.hidden).toBe(true);
    expect(pruebaMeta.lintProfile).toBe('smoke');
    expect(pruebaMeta.levelRange).toEqual([3, 5]);
    expect(pruebaMeta.durationMin).toEqual([5, 10]);
    expect(pruebaMeta.lethalScenes).toBe(1);
    expect(pruebaMeta.title.length).toBeGreaterThan(0);
    expect(pruebaMeta.premise.length).toBeGreaterThan(0);
  });
});

describe('prueba: declaraciones', () => {
  it('declara al centinela con id coincidente', () => {
    expect(Object.keys(npcs)).toEqual(['centinela']);
    expect(npcs['centinela']?.id).toBe('centinela');
    expect(npcs['centinela']?.name.length).toBeGreaterThan(0);
  });

  it('declara la torre abandonada con variantes noche y cripta', () => {
    expect(Object.keys(places)).toEqual(['torre_abandonada']);
    expect(places['torre_abandonada']?.id).toBe('torre_abandonada');
    expect(Object.keys(places['torre_abandonada']?.variants ?? {}).sort()).toEqual(['cripta', 'noche']);
  });

  it('declara la llave de hierro con ventaja en sigilo y sin relic', () => {
    expect(Object.keys(items)).toEqual(['llave_de_hierro']);
    expect(items['llave_de_hierro']?.id).toBe('llave_de_hierro');
    expect(items['llave_de_hierro']?.advantageTags).toEqual(['sigilo']);
    expect(items['llave_de_hierro']?.relic).toBeUndefined();
  });

  it('declara los cuatro flags de la campaña con prefijos correctos', () => {
    // run:centinela_abatido se agregó en la ronda de arreglo 2, para distinguir "vencido a las piñas" de "convencido/trabado".
    expect(Object.keys(flags).sort()).toEqual([
      'char:prueba.vio_la_cripta',
      'run:centinela_abatido',
      'run:centinela_vencido',
      'run:tiene_pista',
    ]);
    for (const descripcion of Object.values(flags)) {
      expect(descripcion.trim().length).toBeGreaterThan(0);
    }
  });
});

/** Cantidad de opciones sin `requires` (las que todo personaje ve y puede elegir). */
function sinRequires(scene: Scene): number {
  return scene.choices.filter((c) => c.requires === undefined).length;
}

/** Párrafos estructurados (con variantes) de un texto; descarta los strings del narrador. */
function parrafosDe(scene: Scene): Paragraph[] {
  return scene.text.filter((p): p is Paragraph => typeof p !== 'string');
}

describe('prueba: escenas del acto 1', () => {
  // Vistas tipadas: `satisfies Scene` conserva el tipo literal; asignar a Scene expone todas las propiedades opcionales.
  const umbral: Scene = p_umbral;
  const biblioteca: Scene = p_biblioteca;
  const patio2: Scene = p_patio_2;
  const capilla: Scene = p_capilla;
  const acto1: Scene[] = [p_umbral, p_biblioteca, p_patio, p_patio_2, p_victoria, p_capilla];

  it('tiene los seis ids esperados y cada id coincide con su constante', () => {
    expect(acto1.map((s) => s.id)).toEqual(['p_umbral', 'p_biblioteca', 'p_patio', 'p_patio_2', 'p_victoria', 'p_capilla']);
  });

  it('declara los kinds del contrato', () => {
    expect(p_umbral.kind).toBe('hub');
    expect(p_biblioteca.kind).toBe('normal');
    expect(p_patio.kind).toBe('encounter');
    expect(p_patio_2.kind).toBe('encounter');
    expect(p_victoria.kind).toBe('normal');
    expect(p_capilla.kind).toBe('rest');
  });

  it('toda escena del acto 1 tiene entre 4 y 9 opciones y al menos 4 sin requires', () => {
    for (const scene of acto1) {
      expect(scene.choices.length, scene.id).toBeGreaterThanOrEqual(4);
      expect(scene.choices.length, scene.id).toBeLessThanOrEqual(9);
      expect(sinRequires(scene), scene.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('el umbral es el hub: hito al entrar, redirect al vencer al centinela y variantes de memoria en el narrador', () => {
    expect(umbral.onEnter).toEqual([{ milestone: 'entrar_a_la_torre' }]);
    expect(umbral.redirect).toEqual([{ when: { flag: 'run:centinela_vencido' }, to: 'p_escalera' }]);
    const parrafos = parrafosDe(umbral);
    const conVisited = parrafos.some((p) => p.speaker === undefined && p.variants.some((v) => JSON.stringify(v.when) === JSON.stringify({ visited: 'p_umbral', min: 1 })));
    const conKnows = parrafos.some((p) => p.speaker === undefined && p.variants.some((v) => JSON.stringify(v.when) === JSON.stringify({ knows: 'torre_abandonada' })));
    expect(conVisited).toBe(true);
    expect(conKnows).toBe(true);
  });

  it('la biblioteca hace hablar al centinela y lo lista en npcs', () => {
    expect(biblioteca.npcs).toContain('centinela');
    const habla = parrafosDe(biblioteca).some((p) => p.speaker === 'centinela');
    expect(habla).toBe(true);
  });

  it('el patio (ronda 2) redirige a la victoria con el reloj lleno y bloquea el remate con pista', () => {
    expect(patio2.redirect).toEqual([{ when: { clock: 'pelea', gte: 2 }, to: 'p_victoria' }]);
    const rematar = patio2.choices.find((c) => c.id === 'rematar');
    expect(rematar?.requires).toEqual({ clock: 'pelea', gte: 1 });
    expect(rematar?.lockedHint).toBe('Todavía no lo tenés contra las cuerdas');
    const llave = patio2.choices.find((c) => c.id === 'llave');
    expect(llave?.requires).toEqual({ item: 'llave_de_hierro' });
    expect(llave?.lockedHint).toBe('Necesitás algo con qué trabar la puerta');
  });

  it('la capilla cura al entrar y bloquea la subida con pista', () => {
    expect(capilla.onEnter).toEqual([{ heal: 1 }, { removeCondition: 'all' }]);
    const subir = capilla.choices.find((c) => c.id === 'subir');
    expect(subir?.requires).toEqual({ flag: 'run:centinela_vencido' });
    expect(subir?.lockedHint).toBe('El centinela sigue en el patio');
  });
});

/** Todos los desenlaces de una opción: el outcome directo o los 3 a 5 outcomes de la tirada. */
function desenlaces(choice: Choice): Outcome[] {
  if (choice.outcome !== undefined) return [choice.outcome];
  if (choice.roll !== undefined) {
    const o = choice.roll.outcomes;
    const lista: Outcome[] = [o.success, o.partial, o.failure];
    if (o.crit !== undefined) lista.push(o.crit);
    if (o.fumble !== undefined) lista.push(o.fumble);
    return lista;
  }
  return [];
}

/** Ids de escena a los que apunta una escena: redirects y todos los next de todas sus opciones. */
function destinos(scene: Scene): string[] {
  const ids: string[] = [];
  for (const r of scene.redirect ?? []) ids.push(r.to);
  for (const c of scene.choices) for (const o of desenlaces(c)) ids.push(o.next);
  return ids;
}

function tieneLethal(effects: Effect[] | undefined): boolean {
  return (effects ?? []).some((e) => 'lethal' in e);
}

describe('prueba: escenas del acto 2', () => {
  // Vistas tipadas: `satisfies Scene` conserva el tipo literal; asignar a Scene expone todas las propiedades opcionales.
  const escalera: Scene = p_escalera;
  const cripta: Scene = p_cripta;
  const finTesoro: Scene = p_fin_tesoro;
  const finHuida: Scene = p_fin_huida;

  it('tiene los cuatro ids esperados', () => {
    expect([p_escalera, p_cripta, p_fin_tesoro, p_fin_huida].map((s) => s.id)).toEqual(['p_escalera', 'p_cripta', 'p_fin_tesoro', 'p_fin_huida']);
  });

  it('la escalera anuncia la escena mortal y esconde la opción de las runas', () => {
    const anuncia = escalera.text.some((p) => typeof p === 'string' && p.includes('Un fallo acá te puede matar'));
    expect(anuncia).toBe(true);
    const runas = escalera.choices.find((c) => c.id === 'estudiar_runas');
    expect(runas?.requires).toEqual({ trait: 'aprendiz_de_escriba' });
    expect(runas?.lockedHint).toBeUndefined();
    expect(runas?.outcome?.effects).toEqual([{ set: 'char:prueba.vio_la_cripta' }]);
    expect(runas?.outcome?.next).toBe('p_cripta');
  });

  it('la cripta es la escena mortal: lethal solo en fallos de cruzar y conjurar', () => {
    expect(cripta.lethal).toBe(true);
    const conLethal = cripta.choices.filter((c) => desenlaces(c).some((o) => tieneLethal(o.effects))).map((c) => c.id);
    expect(conLethal.sort()).toEqual(['conjurar', 'cruzar']);
    const tantear = cripta.choices.find((c) => c.id === 'tantear');
    expect(tantear?.roll?.tags).toEqual(['percepcion']);
    const retroceder = cripta.choices.find((c) => c.id === 'retroceder');
    expect(retroceder?.outcome?.next).toBe('p_escalera');
  });

  it('los finales tienen ending y cero opciones', () => {
    expect(finTesoro.kind).toBe('ending');
    expect(finTesoro.ending?.id).toBe('fin_tesoro');
    expect(finTesoro.choices).toEqual([]);
    expect(finHuida.kind).toBe('ending');
    expect(finHuida.ending?.id).toBe('fin_huida');
    expect(finHuida.choices).toEqual([]);
  });
});

describe('prueba: campaña completa', () => {
  const escenas: Scene[] = Object.values(campaign.scenes);

  it('pasa parseCampaign sin lanzar y conserva su id', () => {
    const parsed = parseCampaign(campaign);
    expect(parsed.id).toBe('prueba');
    expect(Object.keys(parsed.scenes).length).toBe(10);
  });

  it('start existe en scenes y es el umbral', () => {
    expect(campaign.start).toBe('p_umbral');
    expect(campaign.scenes[campaign.start]).toBeDefined();
  });

  it('la clave de cada escena coincide con su id', () => {
    for (const [clave, scene] of Object.entries(campaign.scenes)) {
      expect(scene.id).toBe(clave);
    }
  });

  it('toda escena no-ending tiene entre 4 y 9 opciones y al menos 4 sin requires; los endings tienen 0', () => {
    for (const scene of escenas) {
      if (scene.kind === 'ending') {
        expect(scene.choices.length, scene.id).toBe(0);
        expect(scene.ending, scene.id).toBeDefined();
        expect(campaign.endings[scene.ending?.id ?? ''], scene.id).toBeDefined();
      } else {
        expect(scene.choices.length, scene.id).toBeGreaterThanOrEqual(4);
        expect(scene.choices.length, scene.id).toBeLessThanOrEqual(9);
        expect(sinRequires(scene), scene.id).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('toda opción tiene exactamente uno de roll u outcome', () => {
    for (const scene of escenas) {
      for (const choice of scene.choices) {
        const cuantos = (choice.roll !== undefined ? 1 : 0) + (choice.outcome !== undefined ? 1 : 0);
        expect(cuantos, `${scene.id}/${choice.id}`).toBe(1);
      }
    }
  });

  it('hay exactamente una escena lethal y meta.lethalScenes es 1', () => {
    const letales = escenas.filter((s) => s.lethal === true).map((s) => s.id);
    expect(letales).toEqual(['p_cripta']);
    expect(campaign.lethalScenes).toBe(1);
  });

  it('el efecto lethal solo aparece en outcomes de tirada de la escena lethal', () => {
    for (const scene of escenas) {
      for (const choice of scene.choices) {
        if (choice.outcome !== undefined) {
          expect(tieneLethal(choice.outcome.effects), `${scene.id}/${choice.id}`).toBe(false);
        }
        if (choice.roll !== undefined && scene.lethal !== true) {
          for (const o of desenlaces(choice)) {
            expect(tieneLethal(o.effects), `${scene.id}/${choice.id}`).toBe(false);
          }
        }
      }
    }
  });

  it('a la escena lethal solo se llega por outcome de opciones sin tirada', () => {
    for (const scene of escenas) {
      for (const r of scene.redirect ?? []) expect(r.to, `${scene.id} redirect`).not.toBe('p_cripta');
      for (const choice of scene.choices) {
        if (choice.roll !== undefined) {
          for (const o of desenlaces(choice)) expect(o.next, `${scene.id}/${choice.id}`).not.toBe('p_cripta');
        }
      }
    }
  });

  it('todo next y todo redirect.to apunta a una escena existente', () => {
    for (const scene of escenas) {
      for (const destino of destinos(scene)) {
        expect(campaign.scenes[destino], `${scene.id} -> ${destino}`).toBeDefined();
      }
    }
  });

  it('declara reloj, hito y finales del contrato', () => {
    expect(campaign.clocks['pelea']).toEqual({ max: 2, label: 'Pelea' });
    expect(campaign.milestones['entrar_a_la_torre']?.label.length).toBeGreaterThan(0);
    expect(campaign.endings['fin_tesoro']?.title).toBe('El tesoro de la torre');
    expect(campaign.endings['fin_huida']?.title).toBe('Con vida');
  });
});

describe('prueba: continuidad tras vencer al centinela (ronda de arreglo 1)', () => {
  /** Estado recién armado en el umbral, con `flags` de partida a gusto (`run:centinela_vencido`, típicamente). */
  function estadoConFlags(flagsDePartida: string[]) {
    return makeState({
      run: {
        campaignId: campaign.id,
        contentVersion: campaign.contentVersion,
        sceneId: campaign.start,
        flags: flagsDePartida,
      },
    });
  }

  it('con el centinela vencido, la biblioteca muestra un texto distinto y no lo describe bloqueando', () => {
    const primeraVez = render(campaign, enter(campaign, estadoConFlags([]), 'p_biblioteca'));
    const vencido = render(campaign, enter(campaign, estadoConFlags(['run:centinela_vencido']), 'p_biblioteca'));

    expect(vencido.paragraphs).not.toEqual(primeraVez.paragraphs);
    const textoVencido = vencido.paragraphs.map((p) => p.text).join(' \n ');
    expect(textoVencido).not.toMatch(/Nadie sube/);
    expect(textoVencido).not.toMatch(/pasar por encima/);
    expect(textoVencido).not.toMatch(/Date la vuelta/);
  });

  it('con el centinela vencido, entrar al patio no deja al jugador en una ronda de combate', () => {
    const vista = render(campaign, enter(campaign, estadoConFlags(['run:centinela_vencido']), 'p_patio'));

    // El redirect de p_patio saltea el encuentro entero: la escena resuelta ya no es el patio en combate.
    expect(vista.sceneId).toBe('p_victoria');
    expect(vista.kind).not.toBe('encounter');
    expect(vista.choices.some((c) => c.id === 'golpear')).toBe(false);
  });
});

describe('prueba: p_victoria no renarra un forcejeo que no ocurrió (ronda de arreglo 2)', () => {
  const FRASES_DEL_FORCEJEO = [/tirado contra el aljibe/, /respirando con un silbido/, /No lo mataste/];

  it('vía pacífica: vencido sin haber peleado nunca, el patio no describe el forcejeo físico', () => {
    // run:centinela_vencido sin run:centinela_abatido: se lo convenció hablando o se lo trabó con la llave, nunca se peleó.
    const estado = makeState({
      run: {
        campaignId: campaign.id,
        contentVersion: campaign.contentVersion,
        sceneId: campaign.start,
        flags: ['run:centinela_vencido'],
      },
    });
    const vista = render(campaign, enter(campaign, estado, 'p_patio'));

    expect(vista.sceneId).toBe('p_victoria');
    const texto = vista.paragraphs.map((p) => p.text).join(' \n ');
    for (const frase of FRASES_DEL_FORCEJEO) {
      expect(texto).not.toMatch(frase);
    }
  });

  it('revisita tras el combate: no vuelve a narrar la pelea en presente', () => {
    // Ya peleó y ganó (abatido) y ya visitó p_victoria una vez antes.
    const estado = makeState({
      run: {
        campaignId: campaign.id,
        contentVersion: campaign.contentVersion,
        sceneId: campaign.start,
        flags: ['run:centinela_vencido', 'run:centinela_abatido'],
        visited: { p_victoria: 1 },
      },
    });
    const vista = render(campaign, enter(campaign, estado, 'p_victoria'));

    const texto = vista.paragraphs.map((p) => p.text).join(' \n ');
    for (const frase of FRASES_DEL_FORCEJEO) {
      expect(texto).not.toMatch(frase);
    }
  });
});
