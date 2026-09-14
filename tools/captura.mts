import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import { partirBandera, tomarValor } from './lib/args';

/**
 * `npm run captura` — rehace `docs/captura-escena.png`, la foto que abre el README.
 *
 * Corre con tsx en Node puro, como el resto de `tools/`, y maneja el **Microsoft Edge que ya está
 * instalado en la máquina** (`channel: 'msedge'`) a través de `playwright-core`. Por eso
 * `playwright-core` y no `playwright`: el primero es la librería sola, sin navegadores propios, así
 * que **no hay que correr `npx playwright install` ni descargar 300 MB de Chromium** para sacar una
 * foto. Si el día de mañana la máquina no tiene Edge, Playwright lo dice con todas las letras y
 * `main` repite el mensaje.
 *
 * **Por qué un script y no `msedge --headless --screenshot=...`**, que sería gratis: el modo captura
 * del navegador dispara la foto apenas la página carga, y lo que hay ahí es la pantalla de inicio.
 * Para que se vea una ESCENA hay que crear un personaje, entrar a la partida y avanzar un paso; eso
 * es `jugarHastaLaEscena`, y no hay forma de hacerlo con una bandera de línea de comandos.
 *
 * Uso:
 *   npm run captura                                 levanta el dev server él solo y lo apaga al terminar
 *   npm run captura -- --url http://localhost:5173  usa uno que ya está prendido
 *   npm run captura -- --port 5180                  otro puerto para el que levanta él
 *   npm run captura -- --out docs/otra.png          otro destino
 *   npm run captura -- --ver                        con ventana, para mirar lo que hace
 */

/** La raíz del repo (o del worktree) desde el que se está corriendo: `tools/..`. */
const RAIZ = path.resolve(fileURLToPath(import.meta.url), '../..');

/**
 * Medida de la foto. **El alto no es decorativo: es lo que decide si la prosa entra en la caja.**
 *
 * `.caja` mide `height: 44%` de la pantalla (`EscenaScreen.module.css`), y adentro las opciones se
 * quedan con lo suyo y el texto con lo que sobra. O sea que el lugar para la prosa sale del ALTO de
 * la ventana y de nada más: medido con `a1_orell_mesa`, 1440×900 y 1600×900 dan exactamente el
 * mismo desborde (28 px), porque ensanchar reacomoda las líneas pero no cambia cuántas entran.
 *
 * Desborde medido a lo largo del alto: 800 → 55 px · 864 → 43 px · 900 → 28 px · 960 → 1 px ·
 * 970 → entra. De ahí este 970: a 960 entra por 1 px, que es empatar, y 970 es el primer redondo con
 * margen de verdad. Y de ahí también que 1440×900 —que parecía la medida obvia para un README— no
 * sirva: se queda a una línea.
 */
const ANCHO = 1440;
const ALTO = 970;

const SALIDA_POR_DEFECTO = 'docs/captura-escena.png';

/**
 * Puerto propio, y a propósito **no** el 5173 de `npm run dev`: lo más común es que el dev server
 * de siempre ya esté prendido, y quedarse con su puerto obligaría a apagarlo para sacar una foto.
 * Va con `--strictPort`, así que si este puerto está ocupado Vite falla en vez de correrse al
 * siguiente y dejarnos fotografiando a otro.
 */
const PUERTO_POR_DEFECTO = 5179;

/**
 * El camino hasta la escena que se fotografía: en qué escena hay que estar y qué opción se elige
 * para salir de ella. La última de la lista es la que sale en la foto.
 *
 * **Las cuatro opciones son `outcome` sin tirada**, y eso no es comodidad: con dados de por medio la
 * foto saldría distinta en cada corrida —otra banda, otro texto, otras Heridas— y una captura que
 * cambia sola no sirve para documentar nada.
 *
 * **Por qué `a1_orell_mesa` y no una escena más vistosa. Leé esto antes de "mejorar" la captura:
 * las dos escenas que dan más ganas ya se probaron y las dos se cayeron por medirlas.**
 *
 * Lo que tiene que verse es una escena con hablante (para que estén la placa y el recorte) **y con la
 * prosa entera adentro de la caja**. Que la prosa entre no es un capricho: la caja no crece, y lo que
 * no entra scrollea, así que la foto sale empezando a mitad de frase. El jugador nunca ve eso mal
 * —lee mientras se tipea y el autoscroll lo sigue—, pero una foto quieta que arranca en «aprender:
 * «El paso está cerrado…» se lee como texto roto.
 *
 * - **`p_puente`** (la barricada del prólogo, la primera elegida) es la que más juego muestra: dos
 *   tiradas con fichas, riesgo y probabilidades, una opción de clase y una cerrada con su motivo.
 *   Sus 7 opciones con fichas se llevan el tope del 60 % de la caja (`.acciones` en
 *   `EscenaScreen.module.css`) y a la columna le quedan cuatro líneas para 105 palabras: **223 px de
 *   más a 1280×800**, y como el lugar para la prosa sale del alto (ver `ALTO`), entrar entera le
 *   pediría **unos 2070 px de alto**. O sea que no es cuestión de agrandar la ventana: no entra nunca.
 * - **`c2_otra_orilla`** (el molino, acto 2) es la única escena corta con hablante que tiene una
 *   opción con tirada, así que sería la única capaz de mostrar prosa entera Y el sistema de dados, y
 *   encima sin ningún "ya elegida". Tiene camino sin dados —15 pasos por la rama de la ley— y
 *   **entra a 1450 px de alto** (a 1360 le faltan 36; a 1200, 107). Se descartó por la forma: a
 *   1280×1450 la imagen es VERTICAL, y ninguna ventana de navegador tiene esa forma — en un README se
 *   lee como una tira estirada. La del Ancla Seca parece una pantalla de juego, y el criterio es lo
 *   que dice un desconocido mirando la captura, no cuántas cosas entran en ella. Si el sistema de
 *   tiradas merece una frase, va en el texto del README, no en esta foto.
 *
 * Lo que esta escena NO muestra, para que nadie lo descubra de nuevo: sus cuatro opciones salen
 * marcadas "· ya elegida". Sale del DESTINO, no del id de la opción (`alreadySeen` en
 * `engine/resolve.ts`), y es estructural: la única arista de entrada a `a1_orell_mesa` viene de
 * `a1_taberna`, las cuatro opciones vuelven a `a1_taberna`, y `seen` se deriva al SALIR de una
 * escena — que es justo cómo se entró. Lo ve cualquier jugador la primera vez que se sienta en esa
 * mesa, así que la foto muestra lo que el juego hace.
 *
 * Escenas con hablante, ordenadas por lo que ocupan (palabras de prosa | opciones), con el desborde
 * medido a 1280×800, que es la medida con la que esto empezó:
 *
 *   60 | 4 | orell  | a1_orell_mesa          55 px de más  ← la elegida (entra a 970 de alto)
 *   68 | 4 | mausi  | a1_taberna_trastienda 151 px de más
 *   70 | 5 | orell  | p_puente_amanecer     141 px de más
 *   78 | 6 | ilse   | a2_fuera_fuga         más prosa y más opciones que la primera
 *   86 | 4 | orell  | c2_otra_orilla        más prosa que la primera
 *
 * A 1280×800 no entra NINGUNA: a esa altura la columna da para tres líneas y media, y una escena con
 * hablante son dos párrafos como mínimo. `a1_orell_mesa` es la que menos se pasa porque es la más
 * corta **y** porque se llega por un desenlace sin texto; las dos últimas no se midieron una por una
 * porque no pueden ganarle —más prosa, y encima se entra a las dos por desenlaces que sí llevan
 * párrafo—. Lo que resolvió el empate fue el alto de la ventana, que es de donde sale el lugar para
 * la prosa (ver `ALTO`).
 *
 * Si algún día `a1_orell_mesa` crece y deja de entrar, el script falla diciéndolo y la lista de acá
 * arriba es por dónde seguir: la siguiente que entre, con un camino sin tiradas hasta ella.
 *
 * Ojo con el último paso: `sentarte_en_la_mesa_de_orell` es un desenlace **sin texto**, y eso
 * también cuenta. La caja muestra lo que escribió el último paso (desenlace + escena, ver
 * `entradasDelUltimoPaso` en `TextColumn.tsx`), así que una opción con desenlace en prosa metería
 * ese párrafo arriba de la escena y se comería el lugar que la escena necesita para entrar.
 */
const RUTA = [
  { escena: 'p_camino', opcion: 'seguir_hasta_el_puente' },
  { escena: 'p_puente', opcion: 'entregarle_la_carta_para_cruzar' },
  { escena: 'a1_plaza', opcion: 'entrar_al_ancla_seca' },
  { escena: 'a1_taberna', opcion: 'sentarte_en_la_mesa_de_orell' },
];

/** La escena de la foto: a la que llega el último paso de `RUTA`. */
const ESCENA = 'a1_orell_mesa';

/**
 * Prefijos de los `alt` que escribe `EscenaScreen` (`S.placeholder` en `src/ui/strings.es.ts`).
 * Se usan para distinguir el fondo del recorte del PNJ entre las imágenes de la pantalla, y de paso
 * para exigir que los dos sean `<img>` de verdad: cuando falta el arte, `Imagen` cae a `Placeholder`,
 * que es una caja gris con `role="img"` y ningún `<img>` adentro. O sea que si el arte no está, esta
 * búsqueda no encuentra nada y la captura falla en vez de guardar dos rectángulos grises.
 */
const ALT_FONDO = 'Fondo: ';
const ALT_SPRITE = 'Personaje: ';

/** Tope para cada espera con condición (revelado, opciones, imágenes). */
const ESPERA_MS = 30_000;

/** Tope para que el dev server recién levantado conteste la primera vez. */
const ESPERA_SERVIDOR_MS = 90_000;

interface Args {
  url?: string;
  port?: number;
  out?: string;
  ver?: true;
}

const AYUDA = `Uso: npm run captura [-- opciones]

  --url <url>    usar un dev server ya prendido (si no, lo levanta y lo apaga él)
  --port <n>     puerto para el server que levanta él (por defecto ${String(PUERTO_POR_DEFECTO)})
  --out <ruta>   dónde escribir el PNG (por defecto ${SALIDA_POR_DEFECTO})
  --ver          abrir el navegador con ventana, para mirar lo que hace
  --help         esto`;

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {};
  let i = 0;
  while (i < argv.length) {
    const actual = argv[i] ?? '';
    const { nombre, inline } = partirBandera(actual);
    if (nombre === '--ver') {
      args.ver = true;
      i += 1;
    } else if (nombre === '--url') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      args.url = valor;
      i += salto;
    } else if (nombre === '--port') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      const puerto = Number(valor);
      if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
        throw new Error(`Puerto inválido: ${valor}`);
      }
      args.port = puerto;
      i += salto;
    } else if (nombre === '--out') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      args.out = valor;
      i += salto;
    } else {
      throw new Error(`Argumento desconocido: ${actual}`);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// La trampa: ¿este server es el nuestro?
// ---------------------------------------------------------------------------

/**
 * Marcadores para saber si el dev server que contesta está sirviendo ESTE worktree.
 *
 * **El problema que esto resuelve, que ya arruinó una captura.** El puerto de Vite es de quien lo
 * agarra primero: si alguien dejó `npm run dev` corriendo en el repo de al lado (otra rama, el
 * layout viejo), el script se conecta, atraviesa la creación de personaje sin chistar —las pantallas
 * son casi iguales— y guarda una foto perfecta **del otro checkout**. No hay error, no hay aviso: la
 * captura sale linda y muestra otra cosa.
 *
 * **Por qué son fragmentos de CÓDIGO y no de comentarios.** En desarrollo Vite sirve cada módulo
 * pasado por esbuild, y esbuild **borra los comentarios**. Buscar una frase de un comentario —que es
 * lo primero que uno intenta, porque los comentarios de este repo son bien distintivos— no encuentra
 * nunca nada y el chequeo falla siempre, o peor, se "arregla" aflojándolo hasta que no chequea nada.
 * Lo que sí sobrevive al transformado (que en dev no minifica ni renombra) son los identificadores y
 * las cadenas: `hablanteVisible`, `placa-hablante`, `styles.velo`.
 *
 * `ausente` son marcas del layout VIEJO, el de antes del rediseño de novela visual: el `.grid` con el
 * arte en un `<aside>` al costado. Que estén es prueba positiva de que el server es de otra rama, y
 * eso da un mensaje de error mucho más útil que "no encontré `placa-hablante`".
 *
 * Las dos listas se chequean **primero contra el archivo local**: si alguien renombra
 * `hablanteVisible`, el script no se queda callado ni empieza a fallar contra servers que están
 * bien — avisa que el marcador quedó viejo y hay que actualizarlo acá. Un marcador que nadie
 * verifica es un chequeo que un día deja de chequear sin que nadie se entere.
 */
interface Marca {
  /** Ruta del módulo tal cual la sirve Vite en desarrollo (la del archivo, desde la raíz). */
  ruta: string;
  presente: string[];
  ausente: string[];
}

const MARCAS: Marca[] = [
  {
    ruta: '/src/ui/screens/EscenaScreen.tsx',
    presente: ['hablanteVisible', 'placa-hablante', 'spriteIdDe', 'styles.velo', 'styles.sprite'],
    ausente: ['styles.grid', 'styles.visual'],
  },
  {
    ruta: '/src/ui/components/TextColumn.tsx',
    presente: ['entradasDelUltimoPaso', 'columna-texto'],
    ausente: [],
  },
];

async function pedir(url: string): Promise<string> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url);
  } catch (e) {
    const causa = e instanceof Error ? e.message : String(e);
    throw new Error(
      `No contesta nadie en ${url} (${causa}).\n` +
        'Si le pasaste --url, fijate que ese dev server esté prendido; si no, corré `npm run captura` a secas y lo levanta él.',
    );
  }
  if (!respuesta.ok) {
    throw new Error(`${url} contestó ${String(respuesta.status)} ${respuesta.statusText}, y esperábamos un 200.`);
  }
  return respuesta.text();
}

/**
 * Falla si el server de `base` no está sirviendo este worktree. Corre ANTES de abrir el navegador:
 * una captura equivocada no se detecta mirándola, así que la única defensa es no llegar a sacarla.
 */
async function verificarQueEsEsteWorktree(base: string): Promise<void> {
  const indice = await pedir(`${base}/`);
  if (!indice.includes('/src/main.tsx')) {
    throw new Error(
      `En ${base} hay algo contestando, pero su index.html no carga /src/main.tsx: no es el dev server de Crónicas del Vado.`,
    );
  }

  for (const marca of MARCAS) {
    const local = await readFile(path.join(RAIZ, marca.ruta), 'utf8');
    for (const fragmento of marca.presente) {
      if (!local.includes(fragmento)) {
        throw new Error(
          `El marcador «${fragmento}» ya no está en ${marca.ruta} de este worktree: quedó viejo.\n` +
            'Actualizá MARCAS en tools/captura.mts con un fragmento de código que sí exista hoy.',
        );
      }
    }
    for (const fragmento of marca.ausente) {
      if (local.includes(fragmento)) {
        throw new Error(
          `El marcador «${fragmento}» (layout viejo) aparece en ${marca.ruta} de este worktree, así que ya no sirve para distinguir nada.\n` +
            'Actualizá MARCAS en tools/captura.mts.',
        );
      }
    }

    const servido = await pedir(`${base}${marca.ruta}`);
    for (const fragmento of marca.ausente) {
      if (servido.includes(fragmento)) {
        throw new Error(
          `El dev server de ${base} sirve el layout VIEJO: su ${marca.ruta} todavía tiene «${fragmento}».\n` +
            'Es otro checkout (otra rama, otro worktree). Apagalo, o corré `npm run captura` a secas para que levante el suyo.',
        );
      }
    }
    for (const fragmento of marca.presente) {
      if (!servido.includes(fragmento)) {
        throw new Error(
          `El dev server de ${base} no está sirviendo este worktree: en su ${marca.ruta} no aparece «${fragmento}», que acá sí está.\n` +
            'Apagá ese server, o corré `npm run captura` a secas para que levante el suyo.',
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// El dev server
// ---------------------------------------------------------------------------

interface Servidor {
  base: string;
  apagar: () => void;
}

/**
 * Levanta Vite **en este worktree** y espera a que conteste.
 *
 * Se invoca `node node_modules/vite/bin/vite.js` y no `npm run dev`: en Windows, `npm` es un `.cmd`
 * y `spawn` sin `shell: true` no lo puede ejecutar, y con `shell: true` habría que empezar a pelear
 * con las comillas de una ruta que tiene un espacio en «Gabriel Agustin». El binario de Vite es
 * JavaScript y `process.execPath` es el mismo Node que está corriendo esto.
 *
 * `cwd: RAIZ` es lo que hace que el server sea de ESTE worktree y no de otro: Vite toma la raíz del
 * proyecto del directorio de trabajo. Igual no se confía en eso —`verificarQueEsEsteWorktree` corre
 * siempre, también sobre el server que levanta este script—, porque un `npm run dev` olvidado en
 * este mismo puerto contestaría antes que el nuestro.
 */
async function levantarServidor(puerto: number): Promise<Servidor> {
  const vite = path.join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js');
  const hijo: ChildProcess = spawn(process.execPath, [vite, '--port', String(puerto), '--strictPort'], {
    cwd: RAIZ,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Se guarda lo que el server escribe para poder mostrarlo si se muere: el motivo más común es
  // «Port 5179 is already in use», y sin esto el script solo diría «no contesta nadie».
  let salida = '';
  const anotar = (trozo: Buffer): void => {
    salida += trozo.toString();
  };
  hijo.stdout?.on('data', anotar);
  hijo.stderr?.on('data', anotar);

  const base = `http://localhost:${String(puerto)}`;
  const apagar = (): void => {
    if (hijo.exitCode === null && hijo.signalCode === null) hijo.kill();
  };

  // La espera es contra una condición real (que el server conteste un 200), no contra un reloj:
  // en una máquina lenta Vite tarda lo que tarda y en una rápida esto sale en el primer intento.
  const limite = Date.now() + ESPERA_SERVIDOR_MS;
  for (;;) {
    if (hijo.exitCode !== null) {
      throw new Error(`El dev server se murió con código ${String(hijo.exitCode)}:\n${salida.trim()}`);
    }
    try {
      const respuesta = await fetch(`${base}/`);
      if (respuesta.ok) {
        await respuesta.arrayBuffer();
        return { base, apagar };
      }
    } catch {
      // Todavía no levantó: se vuelve a intentar hasta el tope.
    }
    if (Date.now() > limite) {
      apagar();
      throw new Error(
        `El dev server no contestó en ${String(ESPERA_SERVIDOR_MS / 1000)} s en ${base}:\n${salida.trim()}`,
      );
    }
    await new Promise((listo) => setTimeout(listo, 200));
  }
}

// ---------------------------------------------------------------------------
// Jugar hasta la escena
// ---------------------------------------------------------------------------

/**
 * Espera a que la caja termine de revelar el texto y a que las opciones estén dibujadas.
 *
 * Las dos señales las publica la propia UI, así que no hay ningún `sleep` a ojo:
 *  - `[data-testid="columna-texto"]` lleva `aria-busy="true"` mientras la máquina de escribir
 *    tipea y pasa a `"false"` cuando el revelado termina (`TextColumn.tsx`).
 *  - `EscenaScreen` recién dibuja la lista de opciones cuando el revelado terminó, así que un
 *    botón dentro de `[data-testid="acciones"]` es la prueba de que la escena está lista para
 *    jugarse, que es justo el estado que la foto tiene que mostrar.
 *
 * El clic en la columna es el acelerador: a 40 caracteres por segundo (`DEFAULT_PREFS.cps`) una
 * escena del prólogo son más de veinte segundos de tipeo, y un clic completa el párrafo en curso.
 * Es lo mismo que hace un jugador apurado, y el estado final al que se llega es idéntico.
 */
async function esperarEscenaLista(page: Page, escena: string): Promise<void> {
  await page.locator(`[data-scene="${escena}"]`).waitFor({ state: 'attached', timeout: ESPERA_MS });
  const columna = page.locator('[data-testid="columna-texto"]');
  const limite = Date.now() + ESPERA_MS;
  while (!(await escenaListaYQuieta(page, escena))) {
    if (Date.now() > limite) {
      throw new Error(
        `La escena «${escena}» nunca quedó lista: o el revelado no terminó, o las opciones no se dibujaron. ` +
          'Con la captura a medio tipear no se guarda nada.',
      );
    }
    await columna.click();
  }
}

/**
 * ¿La escena está lista Y se quedó quieta? Las tres condiciones, comprobadas tres cuadros seguidos.
 *
 * Lo de los tres cuadros no es superstición, es por una ventana de UN cuadro que existe de verdad y
 * que ya mordió a este script: cuando el jugador elige una opción, la entrada nueva del log se
 * dibuja ANTES de que `useRevelado` la vea. El reinicio del revelado vive en un efecto —que corre
 * después de pintar—, así que en ese render el hook todavía tiene el progreso de la entrada
 * ANTERIOR, y si aquella tenía tantos párrafos como esta (o más) `terminado` da verdadero: por un
 * cuadro la escena nueva aparece con `aria-busy="false"` y con las opciones dibujadas. Mirando una
 * sola vez, el script se daba por satisfecho ahí, seguía de largo, y para cuando llegaba a sacar la
 * foto el revelado había arrancado de cero: escena sin placa y sin opciones.
 *
 * No hay ninguna marca en el DOM que distinga ese cuadro de uno bueno —se ve idéntico—, y por eso
 * lo que se mide es que el estado AGUANTE. La ventana dura un cuadro; tres seguidos la descartan.
 */
async function escenaListaYQuieta(page: Page, escena: string): Promise<boolean> {
  return page.evaluate(async (id: string) => {
    for (let i = 0; i < 3; i += 1) {
      await new Promise((listo) => requestAnimationFrame(() => listo(undefined)));
      if (document.querySelector(`[data-scene="${id}"]`) === null) return false;
      if (document.querySelector('[data-testid="columna-texto"]')?.getAttribute('aria-busy') !== 'false') return false;
      if (document.querySelectorAll('[data-testid="acciones"] button').length === 0) return false;
    }
    return true;
  }, escena);
}

/**
 * De la pantalla de inicio hasta la escena de la foto, siguiendo `RUTA` (ver allá el porqué de cada
 * escena y de cada opción).
 *
 * El personaje es un Explorador, pero en esta escena la clase no se ve: `a1_orell_mesa` no tiene
 * opciones de clase. Se elige una y listo, porque la creación no se puede saltear.
 */
async function jugarHastaLaEscena(page: Page, base: string): Promise<void> {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });

  // Contexto nuevo == `localStorage` vacío == no hay personajes, así que el botón dice
  // "Crear personaje" (`S.inicio.crearPersonaje`) y lleva derecho a la creación.
  await page.getByRole('button', { name: 'Crear personaje' }).click();

  // Paso 1 de 4: la clase. Fija sola el retrato `explorador_01`.
  await page.locator('[data-testid="clase-explorador"]').click();
  await page.locator('[data-testid="siguiente"]').click();

  // Paso 2: retrato y nombre. Los dos vienen con un valor por defecto válido, no hay nada que tocar.
  await page.locator('[data-testid="siguiente"]').click();

  // Paso 3: dos rasgos. Se eligen los dos primeros que la clase permita, sin saber cuáles son: la
  // Debilidad del Explorador bloquea algunos, y `:not([disabled])` ya deja afuera esos y también
  // los que se apagan al llegar al cupo de dos. El `:not([aria-pressed="true"])` es lo que evita
  // el chiste de clicar dos veces el mismo rasgo: el botón es un interruptor, así que el segundo
  // clic lo soltaría y el paso quedaría bloqueado pidiendo un rasgo más.
  for (let i = 0; i < 2; i += 1) {
    await page.locator('[data-testid^="rasgo-"]:not([disabled]):not([aria-pressed="true"])').first().click();
  }
  await page.locator('[data-testid="siguiente"]').click();

  // Paso 4: el reparto de atributos ya viene completo; se crea y el store deja al personaje activo.
  await page.locator('[data-testid="crear"]').click();

  // Hub: a jugar el vado. A nivel 1 la campaña es "pareja" y no hay partida en curso, así que no
  // sale ninguna confirmación (igual hay un manejador de diálogos en `sacarLaFoto`, por las dudas).
  await page.locator('[data-testid="jugar-vado"]').click();

  // Y ahora el camino: en cada escena se espera a que esté lista (revelado terminado y opciones
  // dibujadas) y se elige la opción que lleva a la siguiente.
  for (const paso of RUTA) {
    await esperarEscenaLista(page, paso.escena);
    await page.locator(`[data-testid="opcion-${paso.opcion}"]`).click();
  }
  await esperarEscenaLista(page, ESCENA);
}

/** Lo que la pantalla tiene que estar mostrando para que la foto valga. */
interface Estado {
  escena: string | null;
  placa: string | null;
  fondo: boolean;
  sprite: boolean;
  opciones: number;
  /** Cuánto texto queda fuera del recorte de la columna, en píxeles. Tiene que ser 0. */
  desborde: number;
}

/**
 * Ojo con lo que se escribe adentro de un `evaluate`: el código se serializa y se ejecuta en el
 * navegador, donde no existe nada de Node **ni los ayudantes que esbuild inyecta**. Una función con
 * nombre acá adentro (un `const cargada = () => …`) sale transformada a `__name(...)` por el
 * `keepNames` de tsx y la página tira «__name is not defined». Por eso todo lo de adentro son
 * funciones anónimas pasadas como argumento, que esbuild deja en paz.
 */
async function leerEstado(page: Page, altFondo: string, altSprite: string): Promise<Estado> {
  return page.evaluate(
    ([prefijoFondo, prefijoSprite]: [string, string]): Estado => {
      const dibujadas = [...document.images].filter((img) => img.complete && img.naturalWidth > 0).map((img) => img.alt);
      const seccion = document.querySelector('[data-scene]');
      const placa = document.querySelector('[data-testid="placa-hablante"]');
      // El que scrollea es el padre de la columna de texto (`.columna` de `EscenaScreen`); el
      // `data-testid` está en el hijo, que es el único nodo con nombre estable desde acá.
      const scroll = document.querySelector('[data-testid="columna-texto"]')?.parentElement ?? null;
      return {
        escena: seccion?.getAttribute('data-scene') ?? null,
        placa: placa?.textContent?.trim() ?? null,
        fondo: dibujadas.some((alt) => alt.startsWith(prefijoFondo)),
        sprite: dibujadas.some((alt) => alt.startsWith(prefijoSprite)),
        opciones: document.querySelectorAll('[data-testid="acciones"] button').length,
        desborde: scroll === null ? -1 : Math.max(0, scroll.scrollHeight - scroll.clientHeight),
      };
    },
    [altFondo, altSprite] as [string, string],
  );
}

/**
 * Espera lo que falta para que la foto no salga a medias y devuelve el estado ya verificado.
 *
 * Las imágenes se piden con `loading="lazy"` y `Imagen` las cambia recién después de `decode()`, así
 * que hay un rato en que la escena ya está jugable y el arte todavía no está pintado. Las
 * animaciones de entrada (el fundido de `Imagen`, los 320 ms del recorte) son cortas, pero salen en
 * la foto si uno no las espera: `getAnimations()` dice cuándo terminaron, que es más honesto que
 * adivinar los milisegundos. Ninguna animación de esta pantalla es infinita.
 */
async function esperarQueEstePintado(page: Page): Promise<void> {
  await page.waitForFunction(
    ([prefijoFondo, prefijoSprite]: [string, string]) =>
      [prefijoFondo, prefijoSprite].every((prefijo) =>
        [...document.images].some((img) => img.alt.startsWith(prefijo) && img.complete && img.naturalWidth > 0),
      ),
    [ALT_FONDO, ALT_SPRITE] as [string, string],
    { timeout: ESPERA_MS },
  );
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), undefined, {
    timeout: ESPERA_MS,
  });

  // Un cuadro más, para que lo último que se acomodó esté pintado antes de la foto.
  await page.evaluate(() => new Promise((listo) => requestAnimationFrame(() => listo(undefined))));
}

// ---------------------------------------------------------------------------
// La foto
// ---------------------------------------------------------------------------

/** Ancho y alto de un PNG, leídos del chunk IHDR (bytes 16-24). Sin abrir ninguna librería. */
function medirPng(png: Buffer): { ancho: number; alto: number } {
  return { ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) };
}

async function sacarLaFoto(base: string, destino: string, conVentana: boolean): Promise<Estado> {
  // `channel: 'msedge'` == el Edge instalado en la máquina. Sin esto Playwright busca un Chromium
  // propio que nunca descargamos y el error habla de `npx playwright install`, que es justo lo que
  // no queremos que nadie corra.
  const navegador: Browser = await chromium.launch({ channel: 'msedge', headless: !conVentana });
  try {
    const contexto = await navegador.newContext({
      viewport: { width: ANCHO, height: ALTO },
      // La foto se guarda a 1280×800 clavados: sin esto, en una pantalla con escalado el PNG
      // saldría al doble y el README mostraría otra medida.
      deviceScaleFactor: 1,
    });
    const page = await contexto.newPage();

    // Sin manejador, Playwright cancela cualquier `window.confirm` y el hub se quedaría sin empezar
    // la partida, en silencio. Hoy el camino que recorre este script no abre ninguno; si algún día
    // abre uno, que siga adelante y quede anotado en la salida.
    page.on('dialog', (dialogo) => {
      console.log(`Diálogo del navegador aceptado: ${dialogo.message()}`);
      void dialogo.accept();
    });

    // Un error de JavaScript deja la pantalla en el ErrorBoundary, que es una página que también se
    // fotografía perfecto. Se juntan acá para poder decir QUÉ pasó en vez de "no llegué a la escena".
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));

    await jugarHastaLaEscena(page, base);
    await esperarQueEstePintado(page);

    const estado = await leerEstado(page, ALT_FONDO, ALT_SPRITE);
    const problemas: string[] = [];
    if (estado.escena !== ESCENA) {
      problemas.push(`la pantalla está en «${estado.escena ?? 'ninguna escena'}» y esperábamos «${ESCENA}»`);
    }
    if (estado.placa === null || estado.placa === '') {
      problemas.push('no hay placa de hablante, así que esta escena no muestra a nadie hablando');
    }
    if (!estado.sprite) problemas.push('no está dibujado el recorte del PNJ');
    if (!estado.fondo) problemas.push('no está dibujado el fondo');
    if (estado.opciones === 0) problemas.push('no hay opciones dibujadas');
    // El texto tiene que entrar ENTERO en la caja. Ver el comentario de `RUTA`: si la columna
    // scrollea, la foto empieza a mitad de frase y se lee como texto roto.
    if (estado.desborde !== 0) {
      problemas.push(
        `la prosa no entra entera en la caja: se va ${String(estado.desborde)} px por debajo del recorte, ` +
          `así que la foto arrancaría a mitad de párrafo. Se arregla subiendo ALTO (la caja es el 44 % ` +
          `de la ventana, así que el ancho no cambia nada) o pasando a la escena que sigue en la lista de RUTA`,
      );
    }
    if (errores.length > 0) problemas.push(`la página tiró errores: ${errores.join(' · ')}`);
    if (problemas.length > 0) {
      throw new Error(`La pantalla no es la que hay que fotografiar:\n- ${problemas.join('\n- ')}`);
    }

    // La foto va primero a memoria y recién se escribe si mide lo que tiene que medir: una captura
    // mala no llega nunca al disco, que es lo que pide el brief.
    const png = await page.screenshot({ type: 'png' });
    const { ancho, alto } = medirPng(png);
    if (ancho !== ANCHO || alto !== ALTO) {
      throw new Error(
        `La captura salió de ${String(ancho)}×${String(alto)} y tiene que ser de ${String(ANCHO)}×${String(ALTO)}. No se guardó nada.`,
      );
    }
    await writeFile(destino, png);
    return estado;
  } finally {
    await navegador.close();
  }
}

// ---------------------------------------------------------------------------

async function main(argv: readonly string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(AYUDA);
    return 0;
  }
  const args = parseArgs(argv);
  const destino = path.resolve(RAIZ, args.out ?? SALIDA_POR_DEFECTO);

  const servidor =
    args.url !== undefined
      ? { base: args.url.replace(/\/+$/, ''), apagar: (): void => undefined }
      : await levantarServidor(args.port ?? PUERTO_POR_DEFECTO);

  try {
    console.log(`Dev server: ${servidor.base}`);
    await verificarQueEsEsteWorktree(servidor.base);
    console.log('Verificado: el server está sirviendo este worktree.');
    const estado = await sacarLaFoto(servidor.base, destino, args.ver === true);
    console.log(`Escena «${ESCENA}», con la placa de ${estado.placa ?? 'nadie'} y ${String(estado.opciones)} opciones.`);
    console.log(`Escrita ${path.relative(RAIZ, destino)} a ${String(ANCHO)}×${String(ALTO)}.`);
    return 0;
  } finally {
    servidor.apagar();
  }
}

// Se fija `process.exitCode` en vez de cortar el proceso a mano, por el mismo motivo que
// `tools/validate.ts`: en Windows las escrituras a stdout son asíncronas por tubería y una salida
// inmediata se puede llevar puesto el último mensaje, justo el que dice por qué falló.
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  },
);
