import type { Campaign } from '@/content/schema';
import { meta } from '@/content/campaigns/vado/meta';
import { npcs } from '@/content/campaigns/vado/npcs';
import { places } from '@/content/campaigns/vado/places';
import { items } from '@/content/campaigns/vado/items';
import { flags } from '@/content/campaigns/vado/flags';
import { memories } from '@/content/campaigns/vado/memories';

import * as prologo from '@/content/campaigns/vado/scenes/prologo';
import * as acto1_pueblo from '@/content/campaigns/vado/scenes/acto1_pueblo';
import * as acto1_pistas from '@/content/campaigns/vado/scenes/acto1_pistas';
import * as acto2_ley from '@/content/campaigns/vado/scenes/acto2_ley';
import * as acto2_fuera from '@/content/campaigns/vado/scenes/acto2_fuera';
import * as desenlace from '@/content/campaigns/vado/scenes/desenlace';

/**
 * "El vado de Aldamar", completa. El registro la carga con `import()` dinámico; nunca se importa
 * estáticamente desde la UI.
 *
 * **Las 46 escenas** viven en seis módulos y se juntan acá por spread del espacio de nombres, así
 * que cada módulo exporta sus escenas con `export const <id> = { … } satisfies Scene;` y el id de la
 * constante ES la clave del record. Un id que no esté en la tabla §2 del outline no existe:
 *
 * - `scenes/prologo.ts` — `p_camino` (start), `p_puente`, `p_puente_rechazo`, `p_vado_oculto`,
 *   `p_puente_amanecer`.
 * - `scenes/acto1_pueblo.ts` / `scenes/acto1_pistas.ts` — las 13 del acto 1: `a1_plaza` (hub),
 *   `a1_taberna`, `a1_taberna_trastienda`, `a1_orell_mesa`, `a1_alcaldesa`, `a1_berta_despacho`,
 *   `a1_ilse_patio`, `a1_molino`, `a1_molino_pell`, `a1_molino_trampilla`, `a1_molino_rueda`,
 *   `a1_posada` (rest), `a1_ronda`.
 * - `scenes/acto2_ley.ts` — el cuello 1 (`c1_cuerpo`, `c1_acusacion`, `c1_refriega`), `a2_amanecer`
 *   y la rama A: `a2_ley_orell`, `a2_ley_torre`, `a2_ley_cartas`, `a2_ley_halvar`, `a2_ley_berta`,
 *   `a2_ley_guardia` (rest).
 * - `scenes/acto2_fuera.ts` — la rama B (`a2_fuera_fuga`, `a2_fuera_sotano`, `a2_fuera_sello`,
 *   `a2_fuera_medallon`, `a2_fuera_ilse`, `a2_fuera_refugio` (rest)), la transición `c2_anochece` y
 *   el cuello 2 (`c2_orilla`, `c2_vado_crecido` con `lethal: true`, `c2_otra_orilla`).
 * - `scenes/desenlace.ts` — el clímax (`cl_molino`, `cl_dravos`, `cl_halvar`, `cl_desenlace`) y los
 *   cuatro finales (`fin_hundido`, `fin_dravos`, `fin_crecida`, `fin_heredero`).
 *
 * Los tres PNJ de `world/` (`orell`, `ilse`, `halvar`) y la reliquia `sello_del_vado` NO están en
 * `npcs` ni en `items` de acá: los resuelve el motor contra WORLD ∪ campaña y r07 rechaza que se
 * redeclaren.
 */
export const campaign: Campaign = {
  ...meta,
  start: 'p_camino',
  scenes: {
    ...prologo,
    ...acto1_pueblo,
    ...acto1_pistas,
    ...acto2_ley,
    ...acto2_fuera,
    ...desenlace,
  },
  npcs,
  places,
  items,
  flags,
  memories,
  /** Los 10 hitos de la biblia §7.4. Una primera partida completa toca entre 8 y 10. */
  milestones: {
    llegar_al_puente: { label: 'Llegar al puente viejo' },
    llegar_a_aldamar: { label: 'Llegar a Aldamar' },
    hallar_a_tome: { label: 'Hallar a Tomé' },
    elegir_bando: { label: 'Elegir bando' },
    ver_el_sello: { label: 'Ver el sello' },
    la_verdad_de_tome: { label: 'La verdad de Tomé' },
    la_tormenta: { label: 'La tormenta' },
    cruzar_el_vado_crecido: { label: 'Llegar a la isla del molino' },
    enfrentar_a_dravos: { label: 'Enfrentar a Dravos' },
    cerrar_la_cronica: { label: 'Cerrar la crónica' },
  },
  /**
   * Los dos relojes de la biblia §7.1. `sospecha` nunca baja y al llenarse redirige (a `a1_ronda`
   * en el acto 1, a `c2_anochece` desde las dos `rest` del acto 2). `pelea` lo comparten los dos
   * `encounter` y `cl_molino.onEnter` lo resetea con `{ clock: 'pelea', delta: -3 }`.
   */
  clocks: {
    sospecha: { max: 4, label: 'Sospecha' },
    pelea: { max: 3, label: 'Pelea' },
  },
  /**
   * Los cuatro finales de la biblia §8, todos elegidos en `cl_desenlace`. La reliquia se entrega
   * solo por `fin_heredero`, que es el final oculto y el más caro de conseguir.
   */
  endings: {
    fin_hundido: { title: 'El sello se hunde' },
    fin_dravos: { title: 'Aldamar de Dravos' },
    fin_crecida: { title: 'La crecida' },
    fin_heredero: { title: 'El heredero', hidden: true, reward: [{ give: 'sello_del_vado' }] },
  },
};
