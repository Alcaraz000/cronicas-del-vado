import type { Campaign, Condition } from '@/content/schema';
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
/**
 * "Ya diste un paso adentro de Aldamar". El prólogo entra al acto 1 por tres puertas y sólo por
 * esas tres —`a1_plaza`, `a1_molino` y `a1_molino_trampilla`—, así que con una visita COMPLETA a
 * cualquiera de ellas el jugador ya está en el pueblo. (`visited` cuenta la visita al elegir, no al
 * entrar: por eso la PRIMERA pantalla de Aldamar todavía muestra el objetivo de la campaña entera,
 * y el objetivo se vuelve específico a partir de la primera elección. Es un renglón, no un bug.)
 *
 * No se usa `knows` ni `met`, que serían más directos, porque son `char:` y sobreviven a la
 * partida: en la segunda partida del mismo personaje ya estarían encendidos en el prólogo.
 */
const EN_ALDAMAR: Condition = {
  any: [{ visited: 'a1_plaza' }, { visited: 'a1_molino' }, { visited: 'a1_molino_trampilla' }],
};

/**
 * "El acto 1 se terminó". Las dos maneras de cruzar el cuello 1: la ronda de Dravos (que enciende
 * `run:dravos_sabe` al entrar a `a1_ronda`) y el vado con las tres pistas. Se miran las dos porque
 * `visited: c1_cuerpo` recién vale al SALIR del cuerpo, y por la ronda se llega al acto 2 con una
 * pista sola: sin `run:dravos_sabe` el objetivo diría "No hablaste con Berta" parado en el vado.
 */
const ACTO_2_EMPEZADO: Condition = {
  any: [{ flag: 'run:dravos_sabe' }, { visited: 'c1_cuerpo' }],
};

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
  /**
   * ═══ LOS OBJETIVOS SON UN BORRADOR PARA QUE GABRIEL CORRIJA ═══
   *
   * Están todos juntos acá a propósito: se edita el `texto` y nada más, sin tocar código. Lo único
   * que llega a la pantalla es esa línea; las pistas (`run:pista_*`) siguen siendo estado interno y
   * el jugador no las ve nunca.
   *
   * **DOS REGLAS PARA QUIEN LOS EDITE:**
   *
   * 1. **CORTOS: hasta ~32 caracteres.** Está MEDIDO en el navegador (tarea 2): en un teléfono de
   *    375 px, si el título pasa de ~190 px de ancho, las marcas de Heridas y Fortuna se van a un
   *    renglón propio y el cromo le come 32 px más al arte. 29 caracteres miden 171 px y entran;
   *    54 miden 325 y no. Hay un test que lo fija (`tests/content/vado.test.ts`).
   * 2. **El orden es PRIORIDAD, no cronología.** El motor (`objetivoActivo`) muestra el PRIMERO de
   *    la lista cuyo `when` se cumple y cuyo `hecho` todavía no. Por eso el del acto 2 va primero:
   *    una vez que el acto 1 se terminó, ninguno de los suyos puede volver a asomar. Y por eso los
   *    tres lugares van encadenados por `hecho` en vez de una condición por combinación: son tres
   *    objetivos en lugar de seis, el orden de la lista decide cuál se nombra primero cuando falta
   *    más de uno, y cada uno se cumple con su propia pista, sin mirar a los otros dos.
   *
   * **UNA TRAMPA DEL MOTOR:** una condición ausente NO es una condición falsa. `evaluate(undefined)`
   * devuelve `true`, así que un objetivo sin `when` está en juego desde el principio. `hecho` lleva
   * su propia guarda en `objetivoActivo` y un objetivo sin `hecho` se muestra hasta que otro lo
   * reemplace: el último de la lista no lleva ninguno de los dos, y ése es justamente su trabajo.
   */
  objetivos: [
    // El acto 2 manda sobre todo lo del acto 1. Sin `hecho`: queda hasta el final de la partida.
    // ESTE TEXTO NO ESTABA EN EL BORRADOR APROBADO: lo escribió la tarea 3 porque sin él los
    // objetivos del acto 1 se colaban en el acto 2 (ver el informe).
    { id: 'obj_acto2', texto: 'Averiguá quién lo tiró al agua', when: ACTO_2_EMPEZADO },
    // El de la campaña entera, mientras el prólogo dura.
    { id: 'obj_llegar', texto: 'Averiguá qué pasó con Tomé', hecho: EN_ALDAMAR },
    // En el pueblo y sin ninguna pista.
    {
      id: 'obj_preguntar',
      texto: 'Preguntá en el pueblo',
      hecho: {
        any: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }],
      },
    },
    // Los tres lugares, encadenados. El orden de acá es el orden en que se nombran.
    { id: 'obj_molino', texto: 'Todavía no viste el molino', hecho: { flag: 'run:pista_molino' } },
    { id: 'obj_taberna', texto: 'No pasaste por el Ancla Seca', hecho: { flag: 'run:pista_taberna' } },
    { id: 'obj_berta', texto: 'No hablaste con Berta', hecho: { flag: 'run:pista_alcaldesa' } },
    // Con las tres. Sin `when` ni `hecho`: es la cola de la lista y sólo se llega acá con los tres
    // anteriores cumplidos, que es exactamente "tenés las tres pistas".
    { id: 'obj_cierra', texto: 'Hay algo que no cierra' },
  ],
};
