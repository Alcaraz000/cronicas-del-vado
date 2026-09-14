import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CLASSES } from '@/content/catalog';
import type { Campaign, Scene } from '@/content/schema';
import { fortuneMax } from '@/engine/progression';
import { render as renderScene } from '@/engine/resolve';
import type { LogEntry, RenderedScene, SeenMap } from '@/engine/types';
import { selectGameState } from '@/state/selectors';
import { useStore } from '@/state/store';
import { precargarImagen } from '@/ui/assets';
import { Ficha } from '@/ui/components/Ficha';
import { Imagen } from '@/ui/components/Imagen';
import { OptionList } from '@/ui/components/OptionList';
import { indiceDeLaPlaca, useNombresDePnj } from '@/ui/components/Parrafos';
import { RollPanel } from '@/ui/components/RollPanel';
import { StatusBar } from '@/ui/components/StatusBar';
import { TextColumn } from '@/ui/components/TextColumn';
import { useReducedMotion } from '@/ui/hooks/useReducedMotion';
import { useRevelado } from '@/ui/hooks/useRevelado';
import { hayModalAbierto } from '@/ui/modales';
import { S } from '@/ui/strings.es';
import { esCampoDeTexto, esControlActivable } from '@/ui/teclado';
import { CargandoScreen } from './CargandoScreen';
import styles from './EscenaScreen.module.css';

// Referencias estables para cuando todavía no hay partida (`gs === null`): `useRevelado` es
// un hook, tiene que llamarse siempre antes del `return` temprano de más abajo, con algo que
// pasarle. Un array/objeto literal nuevo en cada render dispararía su efecto de reinicio sin
// parar (ver el comentario de cabecera de `useRevelado.ts`).
const LOG_VACIO: LogEntry[] = [];
const SEEN_VACIO: SeenMap = {};

/** Id de archivo del fondo (con la variante, si la escena declara una), resuelto vía `Place`. */
function fondoIdDe(campaign: Campaign, rendered: RenderedScene): string {
  const place = campaign.places[rendered.place];
  const base = place?.background ?? rendered.place;
  if (rendered.variant === undefined) return base;
  return place?.variants?.[rendered.variant] ?? `${base}.${rendered.variant}`;
}

/**
 * Id de archivo del sprite de un PNJ, resuelto vía `Npc.portrait` (no siempre es el id del
 * PNJ). El recorte comparte el id con el retrato a propósito: sale del mismo máster, y lo que
 * los separa es el tipo, que va en la ruta (`src/assets/<tipo>/<id>.webp`).
 */
function spriteIdDe(campaign: Campaign, npcId: string): string {
  return campaign.npcs[npcId]?.portrait ?? npcId;
}

/**
 * Nombre para la placa: **el hablante de la entrada**, leído hacia atrás desde el último párrafo
 * YA VISIBLE. La regla, dicha sin ambigüedad porque el recorrido hacia atrás confunde:
 *
 * - Mientras se tipea, la placa dice quién habla AHORA y no quién va a hablar al final del
 *   párrafo que todavía no empezó. Por eso se cuenta sobre lo revelado y no sobre la entrada
 *   entera. (Es la misma cuenta que hace el motor para elegir el sprite, `ultimoHablante` en
 *   `engine/resolve.ts`, pero recortada por el revelado.)
 * - **La placa SE QUEDA PUESTA aunque después venga narración del mismo bloque.** En
 *   `[Orell habla, narración]` la placa sigue diciendo "Sargento Orell" cuando el segundo
 *   párrafo aparece. No es un descuido del `for` hacia atrás: es la regla.
 * - Solo desaparece cuando NINGÚN párrafo visible tiene hablante — o sea, una entrada de
 *   narración pura. Ahí no hay placa, igual que en cualquier novela visual.
 *
 * **Por qué se queda, para que nadie lo "arregle" dentro de seis meses.** Sacarla en cuanto
 * aparece un párrafo de narración parece más prolijo y es peor:
 *
 * El prefijo del hablante que la placa repite está escondido a la VISTA dentro de la caja
 * (`TextColumn.module.css` lo saca con `position: absolute` + `clip-path`, no con
 * `display: none`, así que un lector de pantalla sigue recibiendo "Orell: …" y el efecto es
 * puramente visual). Sacar la placa en una entrada `[Orell habla, narración]` dejaría ese
 * diálogo **visualmente sin atribución**: el jugador lee una línea entrecomillada y no hay nada
 * en pantalla que diga quién la dijo. Contados sobre la campaña `vado` publicada (381 bloques de
 * texto entre escenas, desenlaces de opción y de banda, y finales): **14 bloques** tienen un
 * párrafo con hablante seguido de narración, y en **13** de ellos el bloque TERMINA en narración
 * — o sea, 13 diálogos que quedarían huérfanos en pantalla. Ren'Py también deja la placa puesta
 * entre líneas del mismo hablante.
 *
 * **El bloque con dos hablantes.** Hay 5 (`a1_ronda`, `c1_acusacion`, `a2_fuera_sotano`,
 * `cl_desenlace`, `cl_halvar`) donde la placa nombra al último que habló. Eso está bien —nombra
 * a quien habla ahora— y lo que estaba mal era esconder TAMBIÉN el prefijo del anterior, que
 * dejaba su línea dibujada debajo del cartel del otro. Se esconde solo el prefijo que la placa
 * repite; el del hablante anterior se queda a la vista. La cuenta de cuál es ese párrafo es
 * `indiceDeLaPlaca`, compartida con `Parrafos`, que es quien lo marca.
 *
 * Ojo con `rendered.portraitNpc`, que NO sirve para esto: cuando ningún párrafo tiene `speaker`
 * cae al primer PNJ de la escena, y ese está presente pero no está hablando.
 */
function hablanteVisible(
  log: LogEntry[],
  parrafosVisibles: number,
  caracteresVisibles: number,
): string | null {
  const ultima = log[log.length - 1];
  if (ultima === undefined || (ultima.kind !== 'scene' && ultima.kind !== 'outcome')) return null;
  // La cuenta no se hace acá: sale de `indiceDeLaPlaca`, la misma función con la que `Parrafos`
  // decide a qué prefijo esconder. Es a propósito y es lo único que garantiza que el cartel y el
  // prefijo que ese cartel reemplaza sean SIEMPRE el mismo párrafo, también a mitad del revelado.
  const i = indiceDeLaPlaca(ultima.paragraphs, parrafosVisibles, caracteresVisibles);
  return i === null ? null : (ultima.paragraphs[i]?.speaker ?? null);
}

/**
 * Fondos (con su variante) de las escenas a las que esta escena puede llevar directamente
 * desde sus opciones, para pedirlos de antemano y que el cambio de escena no parpadee.
 * Solo mira destinos directos (`outcome.next` y los `next` de cada banda de una tirada):
 * no seguimos `redirect`, que depende de evaluar condiciones, y esto es solo precarga de
 * imágenes, no una regla del juego.
 */
function proximosFondos(scene: Scene, campaign: Campaign): string[] {
  const ids = new Set<string>();
  const agregar = (sceneId: string): void => {
    const destino = campaign.scenes[sceneId];
    if (destino === undefined) return;
    const place = campaign.places[destino.place];
    const base = place?.background ?? destino.place;
    ids.add(destino.variant === undefined ? base : (place?.variants?.[destino.variant] ?? `${base}.${destino.variant}`));
  };
  for (const choice of scene.choices) {
    if (choice.outcome !== undefined) agregar(choice.outcome.next);
    if (choice.roll !== undefined) {
      const { success, partial, failure, crit, fumble } = choice.roll.outcomes;
      for (const outcome of [success, partial, failure, crit, fumble]) {
        if (outcome !== undefined) agregar(outcome.next);
      }
    }
  }
  return [...ids];
}

export function EscenaScreen() {
  const campaign = useStore((s) => s.ui.campaign);
  const pending = useStore((s) => s.ui.pending);
  const showOdds = useStore((s) => s.prefs.showOdds);
  const cps = useStore((s) => s.prefs.cps);
  const gs = useStore(useShallow(selectGameState));
  const choose = useStore((s) => s.choose);
  const beginRoll = useStore((s) => s.beginRoll);
  const rerollDie = useStore((s) => s.rerollDie);
  const usePower = useStore((s) => s.usePower);
  const commitRoll = useStore((s) => s.commitRoll);
  const abandonRun = useStore((s) => s.abandonRun);

  const [fichaAbierta, setFichaAbierta] = useState(false);
  const accionesRef = useRef<HTMLDivElement>(null);

  const rendered = useMemo(
    () => (campaign !== null && gs !== null ? renderScene(campaign, gs) : null),
    [campaign, gs],
  );

  const nombres = useNombresDePnj();

  const reducida = useReducedMotion();
  const revelado = useRevelado({
    log: gs?.run.log ?? LOG_VACIO,
    seen: gs?.seen ?? SEEN_VACIO,
    cps,
    instantaneo: cps === 0 || reducida,
  });
  const { avanzar, terminado } = revelado;

  // Al entrar a la escena, se piden de antemano los fondos de las escenas a las que puede
  // llevar: simple caché del navegador, sin bloquear el render ni evaluar reglas.
  useEffect(() => {
    if (campaign === null || rendered === null) return;
    const scene = campaign.scenes[rendered.sceneId];
    if (scene === undefined) return;
    for (const fondoId of proximosFondos(scene, campaign)) precargarImagen('fondo', fondoId);
  }, [campaign, rendered]);

  // La tecla C abre la Ficha: mirar el personaje es seguro en cualquier momento, incluso con
  // una tirada pendiente. Mismas guardas que OptionList para 1-9: si el foco está en un campo
  // de texto, si ya hay un modal abierto, o si es un atajo del navegador (Ctrl/Meta/Alt+C),
  // no dispara nada.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (esCampoDeTexto(event.target)) return;
      if (hayModalAbierto()) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== 'c' && event.key !== 'C') return;
      setFichaAbierta(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Enter y Espacio hacen lo mismo que un clic en la columna de texto: completan el párrafo
  // en curso (o pasan al siguiente si ya estaba completo). Mismas guardas que la tecla C, más
  // `esControlActivable`: si el foco está en un botón o un enlace, la tecla es de ÉL. El
  // listener vive en `window` y ve todo lo que burbujea, así que sin esa guarda se queda con el
  // Enter de cualquier botón de la pantalla y cancela el click que el navegador iba a
  // sintetizar — el teclado deja de poder apretar nada.
  //
  // `preventDefault` (solo cuando la tecla sí es nuestra) porque la barra espaciadora además
  // scrollea la página, y la columna ya se está autoscrolleando sola para seguir al texto que
  // se revela: sin esto las dos cosas pelean y el jugador termina en otro punto del log.
  //
  // La dependencia es `revelado.avanzar`, memoizado en el hook, y no el objeto `revelado`
  // entero: ese objeto es nuevo en cada render y con el tipeo a 40 cps este listener se
  // registraría y desregistraría cuarenta veces por segundo.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (esCampoDeTexto(event.target)) return;
      if (esControlActivable(event.target)) return;
      if (hayModalAbierto()) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      avanzar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [avanzar]);

  // Al abrirse una tirada, la región de acciones vuelve a su tope.
  //
  // `.acciones` es el MISMO nodo del DOM con la lista de opciones y con el panel: React cambia
  // los hijos, no el contenedor, así que su `scrollTop` sobrevive al cambio de estado. Si el
  // jugador había scrolleado la lista para llegar a la séptima opción, el panel de tirada nace
  // desplazado y lo primero que se pierde es la línea del objetivo, que está arriba de todo y es
  // la que dice contra qué se tiró.
  //
  // Por qué un `scrollTop = 0` y no confiar en que el panel entre: el tope del 78 % de
  // `.acciones[data-tirada='true']` se midió a `--escala-fuente` 1, y el panel no escala parejo
  // —los dados tienen un tamaño fijo en `rem` y el resto crece con la escala—, así que a 1,25 y a
  // 1,5 el panel no entra en la región. Poner el scroll en cero no depende de que entre.
  useEffect(() => {
    if (pending === null) return;
    const region = accionesRef.current;
    if (region !== null) region.scrollTop = 0;
  }, [pending]);

  // Acá vivía un efecto que, al terminar el revelado, traía las opciones a la vista con
  // `scrollIntoView`: hasta el rediseño el texto y las acciones scrolleaban JUNTOS, y como el
  // autoscroll de `TextColumn` clava la última línea contra el borde de abajo, lo que nacía
  // después quedaba justo fuera del recorte.
  //
  // Ahora las acciones son su propia región de la caja, con su propio alto y su propio scroll
  // (ver el comentario largo de `.columna` en `EscenaScreen.module.css`), así que no pueden
  // nacer fuera de vista: la garantía pasó de un efecto a la estructura, que es más fuerte. Lo
  // que sigue moviendo el scroll dentro de esa región es el foco, que `OptionList` manda a la
  // primera opción y `RollPanel` a "Continuar".

  const onPick = useCallback(
    (choiceId: string): void => {
      if (rendered === null) return;
      const choice = rendered.choices.find((c) => c.id === choiceId);
      if (choice === undefined) return;
      if (choice.preview !== undefined) beginRoll(choiceId);
      else choose(choiceId);
    },
    [rendered, beginRoll, choose],
  );

  if (campaign === null || gs === null || rendered === null) return <CargandoScreen />;

  const placeName = campaign.places[rendered.place]?.name ?? rendered.place;
  const fondoId = fondoIdDe(campaign, rendered);
  const enEscena = rendered.portraitNpc !== undefined ? (nombres[rendered.portraitNpc] ?? rendered.portraitNpc) : null;
  const hablante = hablanteVisible(gs.run.log, revelado.parrafosVisibles, revelado.caracteresVisibles);

  return (
    <div className={styles.pantalla}>
      {/* El arte llena el marco y todo lo demás se apoya encima. El velo no está para oscurecer
          la imagen: es lo único que hace legible el texto sin taparla. */}
      <div className={styles.fondo}>
        <Imagen tipo="fondo" id={fondoId} aspect="16:9" alt={`${S.placeholder.fondo}: ${placeName}`} />
      </div>
      <div className={styles.velo} aria-hidden="true" />

      <div className={styles.cromo}>
        <StatusBar
          placeName={placeName}
          wounds={gs.run.wounds}
          fortune={gs.run.fortune}
          fortuneMax={fortuneMax(gs.character.level)}
          conditions={gs.run.conditions}
          onAbandon={abandonRun}
          onOpenFicha={() => setFichaAbierta(true)}
          abandonDisabled={pending !== null}
        />
      </div>
      <Ficha abierto={fichaAbierta} onCerrar={() => setFichaAbierta(false)} />

      {/* El sprite recortado (tarea 1), no el retrato: un cuadro 3:4 CON fondo pegado sobre el
          arte se lee como una foto pegada encima. `retrato` sigue siendo lo correcto en la
          creación de personaje y en la Ficha. Se apoya en el suelo de la escena y la caja le
          tapa de la mitad para abajo — eso es lo que lo pone DENTRO del cuarto. */}
      {rendered.portraitNpc !== undefined && enEscena !== null && (
        <div className={styles.sprite} data-reducida={reducida ? 'true' : 'false'}>
          <Imagen
            tipo="sprite"
            id={spriteIdDe(campaign, rendered.portraitNpc)}
            aspect="3:4"
            alt={`${S.placeholder.sprite}: ${enEscena}`}
          />
        </div>
      )}

      <main className={styles.caja}>
        {/* `aria-hidden` a propósito: el nombre ya viaja en la prosa (`Parrafos` lo dibuja como
            prefijo del párrafo) y esa es la copia que anuncia la región viva de `TextColumn`.
            Sin esto, cada línea de diálogo se leería con el nombre dos veces. */}
        {hablante !== null && (
          <span className={styles.placa} data-testid="placa-hablante" aria-hidden="true">
            {nombres[hablante] ?? hablante}
          </span>
        )}
        <div className={styles.columna}>
          {revelado.puedeSaltarLeido && (
            <button
              type="button"
              className={styles.saltarLeido}
              onClick={revelado.saltarLeido}
              title={S.escena.saltarLeidoTitulo}
            >
              {S.escena.saltarLeido}
            </button>
          )}
          <TextColumn log={gs.run.log} revelado={revelado} />
        </div>
        {/* Las acciones son su propia región de la caja, con su propio scroll: ver el comentario
            largo de `.columna` en el CSS. Mientras el revelado no termina está vacía y mide 0. */}
        <div
          ref={accionesRef}
          className={styles.acciones}
          data-testid="acciones"
          data-tirada={pending !== null ? 'true' : 'false'}
        >
          {terminado &&
            (pending !== null ? (
              <RollPanel
                pending={pending}
                powerName={CLASSES[gs.character.classId].power.name}
                onReroll={rerollDie}
                onPower={usePower}
                onContinue={commitRoll}
              />
            ) : (
              <OptionList choices={rendered.choices} showOdds={showOdds} wounds={gs.run.wounds} onPick={onPick} />
            ))}
        </div>
      </main>
    </div>
  );
}
