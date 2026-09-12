import type { Scene } from '@/content/schema';

/**
 * ESQUELETO — Clímax y finales de "El vado de Aldamar" (outline §2, tabla "Clímax" y "Finales").
 *
 * Ocho escenas: `cl_molino`, `cl_dravos` (encounter), `cl_halvar`, `cl_desenlace` y los cuatro
 * finales `fin_hundido`, `fin_dravos`, `fin_crecida`, `fin_heredero`.
 *
 * Toda la prosa va `TODO` (`lintProfile: 'smoke'`; r10 no la mira todavía). Lo que NO es provisorio:
 * ids, `kind`, `place`/`variant`, `npcs`, `redirect`, `onEnter`, `effects`, dificultades y `next`.
 *
 * Invariantes de este módulo, en el orden en que se rompen si alguien no las lee:
 *
 * 1. **`cl_dravos` está en 9 opciones = `LIMITS.maxChoices`. NO ADMITE NI UNA OPCIÓN MÁS, NUNCA**
 *    (outline §5/r03 y §8.3). Si un lote necesita algo nuevo acá, saca otra cosa primero.
 * 2. **La piedra está en el molino en toda ruta** (biblia §1.2): ninguna opción de `cl_desenlace`
 *    usa `{ item: 'sello_del_vado' }` como `requires`. El objeto cambia el precio, nunca el acceso.
 * 3. **`cl_molino.onEnter` resetea el reloj `pelea`** con `{ clock: 'pelea', delta: -3 }`:
 *    `applyClock` clampea a `[0, max]`, así que el clímax arranca en cero se haya peleado o no en
 *    el cuello 1.
 * 4. **PNJ declarados = presentes en TODA ruta** (outline §7, conflicto 12). Por eso `cl_molino` y
 *    `cl_halvar` no declaran a Ilse (viene con `run:con_ilse`) y `cl_dravos` no declara a Orell
 *    (viene con `run:orell_confia`): a los dos los nombra el narrador, sin `speaker`. `cl_desenlace`
 *    sí declara a `ilse`, `berta` y `orell`.
 * 5. **Ningún `set`/`clear` sobre espacio compartido.** Los cuatro finales escriben `char:vado.*` y
 *    `world:vado.*`, que son de la campaña; `char:met.*`, `char:place.*` y `world:caido.*` los
 *    deriva el motor y acá solo se leerían.
 * 6. **`fin_heredero` no hace `give` de la reliquia**: la entrega `endings.fin_heredero.reward` en
 *    `campaign.ts` (y hoy `endRun` todavía no lo aplica — tarea abierta, biblia §13.1).
 * 7. Las cuatro escenas del clímax llevan `onEnter` con hito o reloj, que es lo que corta los bucles
 *    de `outcome` (`cl_dravos → cl_dravos`) en el test de contenido.
 *
 * Revisión a mano pendiente para la pasada de voz (r08 no la frena): los párrafos de **Halvar** en
 * `cl_molino` y `cl_halvar` y los de **Orell** e **Ilse** en `cl_desenlace` no pueden llevar `met`,
 * `knows` ni `endingSeen`, aunque compilen (outline §5/r08 c).
 */

// ---------------------------------------------------------------------------
// Clímax — el molino inundado
// ---------------------------------------------------------------------------

/** 7 opciones / 4 libres · 1 tirada. Entrada única del clímax; resetea el reloj `pelea`. */
export const cl_molino = {
  id: 'cl_molino',
  kind: 'normal',
  place: 'molino_de_tome',
  variant: 'inundado',
  npcs: ['dravos', 'halvar', 'pell'],
  onEnter: [{ clock: 'pelea', delta: -3 }],
  text: ['TODO'],
  choices: [
    {
      id: 'escuchar',
      label: 'Escuchar desde atrás de los sacos de harina',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo', 'percepcion'],
        outcomes: {
          success: { next: 'cl_halvar' },
          partial: { next: 'cl_halvar' },
          // El fallo enciende `run:dravos_sabe` (flags.ts: "el fallo de cl_molino.escuchar").
          failure: { effects: [{ set: 'run:dravos_sabe' }], next: 'cl_dravos' },
        },
      },
    },
    {
      id: 'encarar_a_dravos',
      label: 'Encarar a Dravos delante de todos',
      outcome: { next: 'cl_dravos' },
    },
    {
      id: 'sentarte_a_la_mesa_con_halvar',
      label: 'Sentarte a la mesa con Halvar',
      outcome: { next: 'cl_halvar' },
    },
    {
      id: 'llamar_a_pell_aparte',
      label: 'Llamar a Pell aparte',
      outcome: { next: 'cl_dravos' },
    },
    {
      // Exclusiva de quien cruzó el vado de frente: es la única ruta que llega sin `run:dravos_sabe`.
      id: 'interrumpir_antes_de_que_firmen',
      label: 'Interrumpirlos antes de que firmen',
      requires: { not: { flag: 'run:dravos_sabe' } },
      lockedHint: 'Dravos ya sabe que estás acá: no hay sorpresa.',
      outcome: { next: 'cl_halvar' },
    },
    {
      id: 'rendirte_de_entrada',
      label: 'Rendirte de entrada y bajar las manos',
      requires: { flag: 'run:acusado' },
      lockedHint: 'Nadie te acusó de nada todavía.',
      outcome: { effects: [{ set: 'run:dravos_sabe' }], next: 'cl_dravos' },
    },
    {
      id: 'mandar_a_ilse_al_sotano',
      label: 'Mandar a Ilse al sótano mientras hablás',
      requires: { flag: 'run:con_ilse' },
      lockedHint: 'Ilse no está en el molino.',
      outcome: { next: 'cl_halvar' },
    },
  ],
} satisfies Scene;

/**
 * ENCOUNTER · 3 rondas · **9 opciones / 4 libres · 4 tiradas**.
 *
 * ⚠ NUEVE ES `LIMITS.maxChoices`: esta escena está cerrada y no admite ninguna opción más.
 *
 * r06 se satisface con las cuatro libres solas: 3 atributos distintos (Vigor, Astucia, Presencia),
 * cinco opciones sin tirada y `huir_escaleras_abajo` con tag `huida`. Las dos `[Clase]` no cuentan.
 * La salida del bucle está por partida doble: el `redirect` sobre `pelea >= 3` y `rematarlo`, con
 * `requires: { clock: 'pelea', gte: 2 }`.
 *
 * Dravos no muere en escena (biblia §3): queda roto, preso, degradado o huido.
 */
export const cl_dravos = {
  id: 'cl_dravos',
  kind: 'encounter',
  place: 'molino_de_tome',
  variant: 'inundado',
  // Orell NO va acá: su presencia depende de `run:orell_confia` y lo nombra el narrador.
  npcs: ['dravos'],
  redirect: [{ when: { clock: 'pelea', gte: 3 }, to: 'cl_desenlace' }],
  onEnter: [{ milestone: 'enfrentar_a_dravos' }],
  text: ['TODO'],
  choices: [
    {
      id: 'cargarlo',
      label: 'Cargarlo contra la mesa',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: { effects: [{ clock: 'pelea', delta: 1 }], next: 'cl_dravos' },
          partial: { effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }], next: 'cl_dravos' },
          failure: { effects: [{ wound: 1 }], next: 'cl_dravos' },
        },
      },
    },
    {
      id: 'usar_la_maquinaria',
      label: 'Soltar la muela y usar el molino contra él',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        advantageIf: { item: 'farol_de_sebo' },
        outcomes: {
          success: { effects: [{ clock: 'pelea', delta: 1 }], next: 'cl_dravos' },
          partial: { effects: [{ clock: 'pelea', delta: 1 }, { addCondition: 'exhausto' }], next: 'cl_dravos' },
          failure: { effects: [{ wound: 1 }], next: 'cl_dravos' },
        },
      },
    },
    {
      id: 'quebrarle_la_moral',
      label: 'Quebrarle la moral delante de sus hombres',
      roll: {
        attr: 'presencia',
        difficulty: 'dificil',
        tags: ['social'],
        outcomes: {
          // Único `crit` de la escena (cupo de r04): cierra el encuentro de una.
          crit: { effects: [{ clock: 'pelea', delta: 3 }], next: 'cl_desenlace' },
          success: { effects: [{ clock: 'pelea', delta: 2 }], next: 'cl_dravos' },
          partial: { effects: [{ clock: 'pelea', delta: 1 }], next: 'cl_dravos' },
          failure: { effects: [{ addCondition: 'asustado' }], next: 'cl_dravos' },
        },
      },
    },
    {
      id: 'huir_escaleras_abajo',
      label: 'Huir escaleras abajo, hacia el sótano',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['huida'],
        outcomes: {
          success: { next: 'cl_desenlace' },
          partial: { effects: [{ addCondition: 'perseguido' }], next: 'cl_desenlace' },
          failure: { effects: [{ wound: 1 }], next: 'cl_dravos' },
        },
      },
    },
    {
      id: 'rendir_el_sello',
      label: 'Rendirle el sello y terminar con esto',
      requires: { item: 'sello_del_vado' },
      lockedHint: 'No tenés el sello encima.',
      outcome: {
        effects: [{ take: 'sello_del_vado' }, { set: 'run:trato_con_halvar' }, { clock: 'pelea', delta: 3 }],
        next: 'cl_desenlace',
      },
    },
    {
      // La opción de ronda posterior que r06 pide: `requires` sobre el reloj.
      id: 'rematarlo',
      label: 'Rematarlo mientras está en el piso',
      requires: { clock: 'pelea', gte: 2 },
      lockedHint: 'Todavía está en pie.',
      outcome: { effects: [{ clock: 'pelea', delta: 1 }], next: 'cl_desenlace' },
    },
    {
      id: 'que_orell_lo_detenga',
      label: 'Pedirle a Orell que lo detenga',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no va a levantar la mano por vos.',
      outcome: { effects: [{ clock: 'pelea', delta: 3 }], next: 'cl_desenlace' },
    },
    {
      // [Guerrero] — sabor y atajo, nunca llave (outline §5/r02).
      id: 'trabar_el_eje',
      label: 'Trabar el eje con el hombro',
      requires: { class: 'guerrero' },
      lockedHint: 'Ese eje no lo traba cualquiera con el hombro.',
      outcome: { effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }], next: 'cl_dravos' },
    },
    {
      // [Mago] — cierra el encuentro sin pelear, al precio de quedar Agotado.
      id: 'apagar_la_runa_un_latido',
      label: 'Apagar la runa un latido',
      requires: { class: 'mago' },
      lockedHint: 'Solo un Mago le hace callar una runa.',
      outcome: { effects: [{ addCondition: 'agotado' }, { clock: 'pelea', delta: 3 }], next: 'cl_desenlace' },
    },
  ],
} satisfies Scene;

/**
 * 7 opciones / 4 libres · 2 tiradas. La ruta diplomática del clímax, y la del personaje mínimo.
 * `cerrar_el_trato` es el Burnt Bridge de la escena (uno solo, y sin dado).
 */
export const cl_halvar = {
  id: 'cl_halvar',
  kind: 'normal',
  place: 'molino_de_tome',
  variant: 'inundado',
  // Ilse NO va acá: viene con `run:con_ilse` y la nombra el narrador.
  npcs: ['halvar', 'dravos'],
  onEnter: [{ milestone: 'enfrentar_a_dravos' }],
  text: ['TODO'],
  choices: [
    {
      id: 'regatear_el_precio',
      label: 'Regatear el precio delante de Dravos',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: { next: 'cl_desenlace' },
          partial: { next: 'cl_desenlace' },
          failure: { effects: [{ set: 'run:dravos_sabe' }], next: 'cl_dravos' },
        },
      },
    },
    {
      id: 'leerle_el_libro_de_rutas',
      label: 'Leerle en voz alta su propio libro de rutas',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber'],
        advantageIf: { flag: 'run:sabe_de_halvar' },
        outcomes: {
          success: { next: 'cl_desenlace' },
          partial: { next: 'cl_desenlace' },
          failure: { next: 'cl_dravos' },
        },
      },
    },
    {
      // Burnt Bridge: cierra la rama y no se vuelve. Sin tirada, por la regla de la biblia §10.
      id: 'cerrar_el_trato',
      label: 'Cerrar el trato y cobrar tu parte',
      outcome: { effects: [{ set: 'run:trato_con_halvar' }, { set: 'run:dravos_sabe' }], next: 'cl_desenlace' },
    },
    {
      id: 'bajar_al_sotano_sin_contestar',
      label: 'Bajar al sótano sin contestarle',
      outcome: { next: 'cl_desenlace' },
    },
    {
      // La tercera vía a `run:berta_miente`, y el único trabajo del premio exclusivo de la rama A.
      id: 'leerle_lo_que_firmo_berta',
      label: 'Leerle lo que firmó Berta, con la fecha',
      requires: { item: 'carta_de_halvar' },
      lockedHint: 'No tenés la carta de Halvar encima.',
      outcome: { effects: [{ take: 'carta_de_halvar' }, { set: 'run:berta_miente' }], next: 'cl_desenlace' },
    },
    {
      // [Clérigo] — abre una negociación que no existe sin Clérigo.
      id: 'ofrecer_el_juicio_del_templo',
      label: 'Ofrecer el juicio del templo',
      requires: { class: 'clerigo' },
      lockedHint: 'No es tu oficio invocar un juicio del templo.',
      outcome: { next: 'cl_desenlace' },
    },
    {
      id: 'que_ilse_hable',
      label: 'Dejar que hable Ilse',
      requires: { flag: 'run:con_ilse' },
      lockedHint: 'Ilse no está en el molino.',
      outcome: { next: 'cl_desenlace' },
    },
  ],
} satisfies Scene;

/**
 * Abanico final: 7 opciones / 4 libres · 2 tiradas, y las cuatro libres cubren tres de los cuatro
 * finales (outline §5/r02 b). Las dos tiradas llevan **las tres bandas al mismo final**: cambian el
 * precio, nunca el destino.
 *
 * Ninguna opción pide `{ item: 'sello_del_vado' }`: la piedra está al lado del zócalo en toda ruta.
 */
export const cl_desenlace = {
  id: 'cl_desenlace',
  kind: 'normal',
  place: 'sotano_del_sello',
  npcs: ['ilse', 'berta', 'orell'],
  onEnter: [{ milestone: 'cerrar_la_cronica' }],
  text: ['TODO'],
  choices: [
    {
      id: 'devolver_el_sello_a_la_piedra',
      label: 'Devolver el sello a su piedra',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        // Sin el medallón el sello cierra mal, y el epílogo de `fin_hundido` lo dice (biblia §5).
        advantageIf: { item: 'medallon_de_tome' },
        outcomes: {
          crit: { effects: [{ take: 'sello_del_vado' }, { take: 'medallon_de_tome' }], next: 'fin_hundido' },
          success: { effects: [{ take: 'sello_del_vado' }, { take: 'medallon_de_tome' }], next: 'fin_hundido' },
          partial: { effects: [{ take: 'sello_del_vado' }, { addCondition: 'exhausto' }], next: 'fin_hundido' },
          failure: { effects: [{ take: 'sello_del_vado' }, { addCondition: 'empapado' }], next: 'fin_hundido' },
        },
      },
    },
    {
      // El único camino sin `requires` a `fin_dravos`, y por eso se llama así: la guarnición cobra
      // igual esté Dravos entero, preso o huido (biblia §3).
      id: 'dejar_que_la_guardia_cruce_con_la_piedra',
      label: 'Dejar que la guardia cruce con la piedra',
      outcome: { effects: [{ take: 'sello_del_vado' }], next: 'fin_dravos' },
    },
    {
      id: 'ponersela_en_las_manos_a_ilse',
      label: 'Ponérsela en las manos a Ilse',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social', 'fe'],
        advantageIf: { flag: 'run:ilse_confia' },
        outcomes: {
          success: { effects: [{ take: 'sello_del_vado' }], next: 'fin_crecida' },
          partial: { effects: [{ take: 'sello_del_vado' }], next: 'fin_crecida' },
          failure: { effects: [{ take: 'sello_del_vado' }], next: 'fin_crecida' },
        },
      },
    },
    {
      id: 'subir_y_dejar_que_el_agua_decida',
      label: 'Subir y dejar que el agua decida',
      outcome: { next: 'fin_crecida' },
    },
    {
      // La única puerta al final oculto. No es condición de clase: `isSatisfiable` la da por
      // verdadera para las cuatro, así que r02 sigue en verde.
      id: 'quedarte_con_el_sello',
      label: 'Quedarte con el sello y salir por el caz',
      requires: { flag: 'char:vado.sabe_del_sello' },
      lockedHint: 'No sabés qué es esa piedra ni para qué sirve.',
      outcome: { next: 'fin_heredero' },
    },
    {
      id: 'cerrar_la_compuerta_con_orell',
      label: 'Cerrar la compuerta con Orell',
      requires: { flag: 'run:orell_confia' },
      lockedHint: 'Orell no va a mover un dedo por vos.',
      outcome: { effects: [{ take: 'sello_del_vado' }], next: 'fin_hundido' },
    },
    {
      id: 'venderselo_vos_a_halvar',
      label: 'Vendérselo vos a Halvar',
      requires: { flag: 'run:trato_con_halvar' },
      lockedHint: 'No cerraste ningún trato con Halvar.',
      outcome: { effects: [{ take: 'sello_del_vado' }], next: 'fin_dravos' },
    },
  ],
} satisfies Scene;

// ---------------------------------------------------------------------------
// Los cuatro finales — `kind: 'ending'`, 0 opciones, epílogo `TODO`
// ---------------------------------------------------------------------------

/** No escribe canon de mundo a propósito: devuelve el vado a como siempre estuvo (biblia §7.3). */
export const fin_hundido = {
  id: 'fin_hundido',
  kind: 'ending',
  place: 'sotano_del_sello',
  onEnter: [{ set: 'char:vado.sello_hundido' }],
  text: ['TODO'],
  choices: [],
  ending: { id: 'fin_hundido', epilogue: ['TODO'] },
} satisfies Scene;

export const fin_dravos = {
  id: 'fin_dravos',
  kind: 'ending',
  place: 'vado_oculto',
  variant: 'crecido',
  onEnter: [{ set: 'char:vado.vendido' }, { set: 'world:vado.sello_perdido' }],
  text: ['TODO'],
  choices: [],
  ending: { id: 'fin_dravos', epilogue: ['TODO'] },
} satisfies Scene;

export const fin_crecida = {
  id: 'fin_crecida',
  kind: 'ending',
  place: 'molino_de_tome',
  variant: 'inundado',
  onEnter: [{ set: 'char:vado.vinculo_ilse' }, { set: 'world:vado.aldamar_inundada' }],
  text: ['TODO'],
  choices: [],
  ending: { id: 'fin_crecida', epilogue: ['TODO'] },
} satisfies Scene;

/**
 * Final oculto. La reliquia la entrega `endings.fin_heredero.reward` en `campaign.ts`, NO un
 * `give` de acá: si se diera dos veces, la ranura de mochila se contaría mal.
 */
export const fin_heredero = {
  id: 'fin_heredero',
  kind: 'ending',
  place: 'puente_viejo',
  variant: 'amanecer',
  onEnter: [{ set: 'char:vado.heredero' }, { set: 'world:vado.sello_perdido' }],
  text: ['TODO'],
  choices: [],
  ending: { id: 'fin_heredero', epilogue: ['TODO'] },
} satisfies Scene;
