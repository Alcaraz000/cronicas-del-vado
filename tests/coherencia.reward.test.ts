import { describe, expect, it } from 'vitest';
import type { Effect } from '@/content/schema';
import { endRun } from '@/engine/resolve';
import { conMundo } from '@/state/store';
import { r11_reward } from '../tools/lib/validate/rules/r11_reward';
import { mundoDePrueba } from './fixtures/campaigns/broken/base';
import { conReward } from './fixtures/campaigns/broken/r11';
import { makeState } from './fixtures/state';

/**
 * El validador y el motor tienen que contar la misma historia sobre `endings[*].reward`.
 *
 * `r11_reward` dice qué efectos ACEPTA en un reward; `applyReward` (src/engine/resolve.ts) dice
 * cuáles APLICA. Se escribieron por separado, así que el riesgo real es que se separen: si el
 * validador deja pasar un efecto que el motor ignora en silencio, el autor escribe un premio, el
 * validador le dice que está bien y el jugador no ve nada. Ese es exactamente el agujero que se
 * estaba cerrando, solo que movido del motor al validador.
 *
 * Este archivo lo comprueba a máquina y no a ojo: recorre las doce formas de `Effect` del esquema y,
 * para cada una, pregunta a las dos partes. La invariante dura es una implicación en un solo
 * sentido —**lo que r11 acepta, el motor lo aplica**—; al revés el motor puede ser más permisivo,
 * que es la postura elegida (motor permisivo, validador estricto) y está anotada abajo.
 */

const CAMPANA = 'base';
const FINAL = 'fin_b';

/** Cierra una partida ganada con ese reward, con el mundo fusionado como lo hace el store. */
function cierre(reward: Effect[]): string {
  const campaign = conMundo(conReward(reward), mundoDePrueba);
  const state = makeState({ run: { outcome: { kind: 'ending', endingId: FINAL } } });
  return JSON.stringify(endRun(campaign, state));
}

/** ¿El motor hace algo observable con este efecto en un reward? */
function motorLoAplica(effect: Effect): boolean {
  return cierre([effect]) !== cierre([]);
}

/** ¿El validador lo deja pasar? */
function r11LoAcepta(effect: Effect): boolean {
  const campaign = conMundo(conReward([effect]), mundoDePrueba);
  return r11_reward(campaign, { world: mundoDePrueba, profile: 'release' }).length === 0;
}

/**
 * Las doce formas de `Effect`, con las tres que se bifurcan por su contenido desdobladas: `set`
 * según el espacio del flag y `give` según si el objeto es reliquia.
 */
const FORMAS: { nombre: string; effect: Effect }[] = [
  { nombre: 'set de un char: de la campaña', effect: { set: `char:${CAMPANA}.recuerdo` } },
  { nombre: 'set de un world: de la campaña', effect: { set: `world:${CAMPANA}.sello_perdido` } },
  { nombre: 'set de un run:', effect: { set: 'run:b_hablo' } },
  { nombre: 'set de un espacio compartido', effect: { set: 'char:met.viajero' } },
  { nombre: 'clear', effect: { clear: `char:${CAMPANA}.recuerdo` } },
  { nombre: 'give de una reliquia', effect: { give: 'reliquia_de_prueba' } },
  { nombre: 'give de un objeto normal', effect: { give: 'b_llave' } },
  { nombre: 'take', effect: { take: 'b_llave' } },
  { nombre: 'wound', effect: { wound: 1 } },
  { nombre: 'heal', effect: { heal: 1 } },
  { nombre: 'addCondition', effect: { addCondition: 'exhausto' } },
  { nombre: 'removeCondition', effect: { removeCondition: 'all' } },
  { nombre: 'clock', effect: { clock: 'b_pelea', delta: 1 } },
  { nombre: 'milestone', effect: { milestone: 'b_llegar' } },
  { nombre: 'fortune', effect: { fortune: 1 } },
  { nombre: 'lethal', effect: { lethal: true } },
];

describe('reward: el validador y el motor dicen lo mismo', () => {
  it('las formas de la tabla cubren las doce claves de Effect', () => {
    const claves = new Set(FORMAS.map((f) => Object.keys(f.effect)[0]));
    expect([...claves].sort()).toEqual([
      'addCondition', 'clear', 'clock', 'fortune', 'give', 'heal',
      'lethal', 'milestone', 'removeCondition', 'set', 'take', 'wound',
    ]);
  });

  // La invariante que importa: nada aceptado se ignora después.
  it.each(FORMAS)('$nombre: si r11 lo acepta, applyReward lo aplica', ({ effect }) => {
    if (!r11LoAcepta(effect)) return;
    expect(motorLoAplica(effect), `r11 acepta ${JSON.stringify(effect)} y el motor lo ignora`).toBe(true);
  });

  it('r11 acepta exactamente las dos formas con semántica: give de reliquia y set con prefijo de campaña', () => {
    const aceptadas = FORMAS.filter((f) => r11LoAcepta(f.effect)).map((f) => f.nombre);
    expect(aceptadas).toEqual([
      'set de un char: de la campaña',
      'set de un world: de la campaña',
      'give de una reliquia',
    ]);
  });

  /**
   * El otro sentido, anotado a propósito: el motor promociona CUALQUIER flag `char:`/`world:`, así
   * que un `char:met.*` de un espacio compartido se aplicaría. El validador lo prohíbe por dos vías
   * (r07 no deja escribir espacios compartidos, r11 exige el prefijo de la campaña), y esa es la
   * postura: motor permisivo para no romperle el cierre a nadie, validador estricto para que el
   * contenido no llegue así. Si algún día el motor deja de aceptarlo, este test avisa.
   */
  it('el motor es más permisivo que r11 solo en los flags de espacios compartidos', () => {
    const divergentes = FORMAS.filter((f) => motorLoAplica(f.effect) && !r11LoAcepta(f.effect));
    expect(divergentes.map((f) => f.nombre)).toEqual(['set de un espacio compartido']);
  });
});
