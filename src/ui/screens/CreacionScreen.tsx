import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ATTRS,
  ATTR_NAMES,
  CLASSES,
  TRAITS,
  isTraitAllowed,
  type Attr,
  type ClassId,
  type TraitId,
} from '@/content/catalog';
import { useStore } from '@/state/store';
import { existeImagen } from '@/ui/assets';
import { Imagen } from '@/ui/components/Imagen';
import { useEnfocarAlEntrar } from '@/ui/hooks/useEnfocarAlEntrar';
import { S } from '@/ui/strings.es';
import styles from './CreacionScreen.module.css';

/** Pasos de la spec §6: clase → retrato y nombre → dos rasgos → resumen. */
type Paso = 1 | 2 | 3 | 4;
const PASOS = 4;
const MAX_NOMBRE = 24;
const RASGOS_A_ELEGIR = 2;

const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

/**
 * El cupo de rasgos se explica UNA sola vez, así que el párrafo es uno solo y todas las tarjetas
 * que ese cupo bloquea lo señalan con el mismo `aria-describedby`. Antes cada tarjeta pintaba su
 * propio párrafo idéntico: con dos rasgos elegidos y uno prohibido por la Debilidad de la clase,
 * el mismo texto salía CINCO veces (ocho rasgos − dos elegidos − uno bloqueado por la regla).
 */
const ID_CUPO = 'creacion-cupo-rasgos';
/** Lo que falta para poder seguir. Vive en el pie, al lado del botón que bloquea. */
const ID_PENDIENTE = 'creacion-pendiente';

/**
 * El arte del fondo de esta pantalla: **la plaza de Aldamar, un 16:9**.
 *
 * Es una constante de pantalla y no sale del contenido, porque la creación ocurre ANTES de elegir
 * campaña: acá no hay `meta.cover` que leer. Se elige por archivo y no se deriva de lo que el
 * jugador va eligiendo, y eso es un cambio deliberado sobre el primer intento, que ponía el
 * retrato elegido a sangre detrás de todo. Por qué se tiró:
 *
 * - **Repetía el sujeto en vez de acompañarlo.** En los pasos 2, 3 y 4 el retrato ya está adelante
 *   y grande (242-388 px). El mismo archivo ampliado 2,13x detrás no agrega nada. En el paso 2 era
 *   peor: la pregunta es "¿cuál de estos tres?" y el fondo ya contestaba uno.
 * - **Era la cabeza flotante otra vez.** Un 3:4 recortado por el alto es lo que la tarea 2 midió y
 *   trató como defecto en el sprite de la escena (el commit se llama "el sprite deja de ser una
 *   cabeza"). A 1919x905 un 3:4 a sangre deja ver el **35,4 %** de arriba del archivo; un 16:9, el
 *   **83,8 %**.
 * - **El encuadre cambiaba de carácter con la ventana**: en el teléfono se veía la figura entera y
 *   en el monitor, media cara.
 *
 * Y por qué la plaza y no `puente_viejo.amanecer`, que era el otro candidato:
 *
 * 1. **Medido sobre el recorte que se ve a 1919x905**, en la franja donde van los paneles (x 179 a
 *    1740, y 100 a 800): la plaza da luminancia media **56,5** con desvío 39,5 y p95 138; el puente
 *    al amanecer, **69,2** con desvío 45,3 y p95 155. El puente concentra su luz —la luna y la
 *    taberna encendida— justo donde va la columna de contenido; la plaza la tiene en los bordes,
 *    que es la parte que queda a la vista.
 * 2. **Es un plano de establecimiento sin sujeto**: no compite con el retrato que está adelante.
 * 3. `puente_viejo.amanecer` es una **variante** (una re-iluminación, ver `places.ts`) que usa una
 *    sola escena del prólogo, a la que el jugador llega minutos después de crear el personaje: es
 *    el mismo "repetir el sujeto", un nivel más arriba.
 */
const FONDO = 'aldamar_plaza';

/** Los tres retratos de una clase: `guerrero_01`… `clerigo_03`. */
function retratosDe(classId: ClassId): string[] {
  return ['01', '02', '03'].map((n) => `${classId}_${n}`);
}

/** Reparto inicial 2/1/1/0: la clase fija el 2, el jugador elige dónde va el 0. */
function repartir(classId: ClassId, flojo: Attr): Record<Attr, number> {
  const principal = CLASSES[classId].attr;
  const attrs: Record<Attr, number> = { vigor: 0, astucia: 0, saber: 0, presencia: 0 };
  for (const a of ATTRS) attrs[a] = a === principal ? 2 : a === flojo ? 0 : 1;
  return attrs;
}

/**
 * El 0 arranca en el último atributo que no es el de la clase: una elección
 * cualquiera pero visible, para que el paso 4 nunca muestre un reparto incompleto.
 * El jugador la cambia con un clic.
 */
function flojoPorDefecto(classId: ClassId): Attr {
  const principal = CLASSES[classId].attr;
  return ATTRS.filter((a) => a !== principal).at(-1) ?? 'presencia';
}

/**
 * Creación de personaje en cuatro pasos (spec §6). Navega con `goTo`, igual que el resto
 * de las pantallas: el router solo decide cuál se dibuja.
 *
 * **Una pregunta por pantalla, con el arte grande**, sobre el mismo vocabulario visual que el hub
 * y la escena: el arte a sangre detrás de todo, el velo que lo hace legible sin taparlo, y el
 * contenido en una columna acotada y centrada encima. Antes eran cuatro pasos apretados en una
 * columna de 720 px —la única pantalla del juego con cero reglas `@media`—, que a 1919×905 dejaba
 * 1199 px de margen muerto (62,5 % del ancho) y el 72 % del viewport sin pintar, con los 12
 * retratos de clase de 900×1200 saliendo a 160 px de ancho. Las mediciones están en el informe de
 * la tarea 4.
 */
export function CreacionScreen() {
  const createCharacter = useStore((s) => s.createCharacter);
  const goTo = useStore((s) => s.goTo);
  const hayPersonajes = useStore((s) => s.characters.length > 0);

  const [paso, setPaso] = useState<Paso>(1);
  const [classId, setClassId] = useState<ClassId | null>(null);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [verTodos, setVerTodos] = useState(false);
  const [nombre, setNombre] = useState<string>(S.creacion.nombrePorDefecto);
  const [traits, setTraits] = useState<TraitId[]>([]);
  const [flojo, setFlojo] = useState<Attr | null>(null);
  const [errorAlCrear, setErrorAlCrear] = useState<string | null>(null);
  const subtitulo = useRef<HTMLHeadingElement>(null);
  useEnfocarAlEntrar(subtitulo, paso);

  /**
   * La clase condiciona todo lo demás: fija el retrato por defecto, el atributo
   * principal y qué rasgos quedan prohibidos (regla de identidad). Cambiarla suelta
   * el rasgo que pasó a chocar con la Debilidad nueva, en vez de dejarlo elegido
   * y bloquear el paso 4 sin decir por qué.
   */
  const elegirClase = useCallback((id: ClassId): void => {
    setClassId(id);
    setPortrait(`${id}_01`);
    setVerTodos(false);
    setTraits((previos) => previos.filter((t) => isTraitAllowed(id, t)));
    setFlojo((previo) => (previo !== null && previo !== CLASSES[id].attr ? previo : flojoPorDefecto(id)));
  }, []);

  const alternarRasgo = useCallback((id: TraitId): void => {
    setTraits((previos) =>
      previos.includes(id)
        ? previos.filter((t) => t !== id)
        : previos.length >= RASGOS_A_ELEGIR
          ? previos
          : [...previos, id],
    );
  }, []);

  const nombreLimpio = nombre.trim();

  /** Por qué no se puede seguir. `null` = se puede. Es también el texto que se muestra. */
  const motivoBloqueo = useMemo<string | null>(() => {
    if (paso === 1) return classId === null ? S.creacion.faltaClase : null;
    if (paso === 2) return nombreLimpio === '' ? S.creacion.faltaNombre : null;
    if (paso === 3) {
      const faltan = RASGOS_A_ELEGIR - traits.length;
      return faltan > 0 ? S.creacion.faltanRasgos(faltan) : null;
    }
    return null;
  }, [paso, classId, nombreLimpio, traits.length]);

  // Desde el paso 1 se sale de la pantalla: al hub si ya hay con quién jugar, al inicio si no.
  const volver = useCallback((): void => {
    if (paso === 1) {
      goTo(hayPersonajes ? 'hub' : 'inicio');
      return;
    }
    setPaso((p) => (p - 1) as Paso);
  }, [paso, goTo, hayPersonajes]);

  const siguiente = useCallback((): void => {
    if (motivoBloqueo !== null) return;
    setPaso((p) => (p < PASOS ? ((p + 1) as Paso) : p));
  }, [motivoBloqueo]);

  const crear = useCallback((): void => {
    if (classId === null) return;
    const donde = flojo ?? flojoPorDefecto(classId);
    try {
      // `createCharacter` ya deja activo al personaje nuevo: de acá se sale al hub a elegir campaña.
      createCharacter({
        name: nombreLimpio,
        classId,
        portrait: portrait ?? `${classId}_01`,
        traits: [...traits],
        attrs: repartir(classId, donde),
      });
      setErrorAlCrear(null);
      goTo('hub');
    } catch (e) {
      setErrorAlCrear(e instanceof Error ? e.message : String(e));
    }
  }, [classId, flojo, portrait, traits, nombreLimpio, createCharacter, goTo]);

  const puedeSeguir = motivoBloqueo === null;

  return (
    <div className={styles.pantalla}>
      {/* Si el archivo no estuviera no se dibuja nada: `Imagen` caería al `Placeholder`, que es
          una caja gris con su etiqueta, y a sangre eso no es un fondo sino un error a pantalla
          completa. `alt=""` y `aria-hidden` porque es decorativo, igual que en el hub. */}
      {existeImagen('fondo', FONDO) && (
        <div className={styles.fondo} aria-hidden="true">
          <Imagen tipo="fondo" id={FONDO} aspect="16:9" alt="" />
        </div>
      )}
      <div className={styles.velo} aria-hidden="true" />

      <header className={styles.cabecera}>
        <h1 className={styles.titulo}>{S.creacion.titulo}</h1>
        {/* El título del paso salía DOS veces y a dos líneas de distancia: acá y en el <h2> de
            abajo. Esta línea se queda con el número de paso, que es lo que no dice el <h2>. */}
        <p className={styles.pasoTexto} data-testid="paso">
          {S.creacion.paso(paso, PASOS)}
        </p>
        {/* `aria-valuemin={0}` y no 1: con el mínimo en 1, el paso 1 se anunciaba como 0 % de
            avance mientras la barra pintaba 25 %. Lo que se ve y lo que se lee en voz alta ahora
            salen de la misma cuenta — hay un test que compara las dos. */}
        <div
          className={styles.progreso}
          role="progressbar"
          aria-label={S.creacion.progreso}
          aria-valuemin={0}
          aria-valuemax={PASOS}
          aria-valuenow={paso}
          aria-valuetext={`${S.creacion.paso(paso, PASOS)}: ${S.creacion.titulos[paso]}`}
        >
          <span className={styles.avance} style={{ width: `${(paso / PASOS) * 100}%` }} />
        </div>
      </header>

      <main className={styles.cuerpo}>
        <h2 ref={subtitulo} tabIndex={-1} className={styles.pregunta}>
          {S.creacion.titulos[paso]}
        </h2>

        {paso === 1 && <PasoClase elegida={classId} onElegir={elegirClase} />}

        {paso === 2 && classId !== null && (
          <PasoRetrato
            classId={classId}
            portrait={portrait}
            verTodos={verTodos}
            nombre={nombre}
            onVerTodos={() => setVerTodos((v) => !v)}
            onPortrait={setPortrait}
            onNombre={setNombre}
          />
        )}

        {paso === 3 && classId !== null && (
          <PasoRasgos
            classId={classId}
            portrait={portrait ?? `${classId}_01`}
            nombre={nombreLimpio}
            elegidos={traits}
            onAlternar={alternarRasgo}
          />
        )}

        {paso === 4 && classId !== null && (
          <PasoResumen
            classId={classId}
            portrait={portrait ?? `${classId}_01`}
            nombre={nombreLimpio}
            traits={traits}
            flojo={flojo ?? flojoPorDefecto(classId)}
            onFlojo={setFlojo}
          />
        )}
      </main>

      <footer className={styles.pie}>
        {motivoBloqueo !== null && (
          <p className={styles.pendiente} id={ID_PENDIENTE}>
            {motivoBloqueo}
          </p>
        )}
        {errorAlCrear !== null && (
          <p className={styles.error} role="alert">
            {S.creacion.errorAlCrear(errorAlCrear)}
          </p>
        )}
        <div className={styles.botones}>
          <button type="button" className={styles.secundario} data-testid="volver" onClick={volver}>
            {S.creacion.volver}
          </button>
          {paso < PASOS ? (
            // Este sí lleva `disabled` nativo, y no es una contradicción con las tarjetas: el
            // motivo está acá al lado, visible y en el mismo bloque, así que no hace falta
            // enfocarlo para enterarse. La tarjeta de un rasgo bloqueado era otra cosa —el motivo
            // solo llegaba por `aria-describedby`, o sea solo a quien pudiera enfocarla—.
            <button
              type="button"
              className={styles.primario}
              data-testid="siguiente"
              disabled={!puedeSeguir}
              aria-describedby={puedeSeguir ? undefined : ID_PENDIENTE}
              onClick={siguiente}
            >
              {S.creacion.siguiente}
            </button>
          ) : (
            <button type="button" className={styles.primario} data-testid="crear" onClick={crear}>
              {S.creacion.crear}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/**
 * El retrato de una tarjeta o de la columna de identidad. El `<span>` no es decorativo: es lo que
 * le da a `CreacionScreen.module.css` un selector de tres clases con el que ganarle al
 * `max-width: 160px` que `Imagen.module.css` le pone a todo `[data-aspect='3:4']` (0,2,0) sin
 * depender del orden de importación, que ningún CSS Module garantiza. Es el mismo camino que
 * `HubScreen.module.css` usa con la portada.
 */
function Arte({ id, alt }: { id: string; alt: string }) {
  return (
    <span className={styles.arte}>
      <Imagen tipo="retrato" id={id} aspect="3:4" alt={alt} />
    </span>
  );
}

/**
 * Quién sos hasta acá: el retrato grande, el nombre y la clase. Acompaña a las dos preguntas que
 * no tienen arte propio —los rasgos y el resumen— y es lo que saca al paso 3 de ser ocho cajitas
 * de texto en una página de 1920 px. No inventa arte: muestra el retrato que el jugador acaba de
 * elegir.
 */
function Escenario({ classId, portrait, nombre }: { classId: ClassId; portrait: string; nombre: string }) {
  const clase = CLASSES[classId];
  return (
    <aside className={styles.escenario}>
      <h3 className={styles.grupo}>{S.creacion.tuPersonaje}</h3>
      <Arte id={portrait} alt={S.creacion.retratoEtiqueta(portrait)} />
      <p className={styles.nombreHeroe}>{nombre}</p>
      <p className={styles.claseHeroe}>
        {clase.name} · {S.creacion.potencia(ATTR_NAMES[clase.attr])}
      </p>
    </aside>
  );
}

function PasoClase({ elegida, onElegir }: { elegida: ClassId | null; onElegir: (id: ClassId) => void }) {
  return (
    <ul className={styles.tarjetas} data-paso="1">
      {CLASS_IDS.map((id) => {
        const clase = CLASSES[id];
        const debilidad = S.tags[clase.weakness];
        return (
          <li key={id}>
            <button
              type="button"
              className={styles.tarjeta}
              data-testid={`clase-${id}`}
              aria-pressed={elegida === id}
              onClick={() => onElegir(id)}
            >
              <Arte id={`${id}_01`} alt={S.creacion.retratoEtiqueta(`${id}_01`)} />
              <span className={styles.nombreClase}>{clase.name}</span>
              {/* Tres datos distintos, tres tratamientos: qué potencia (una etiqueta), qué te da
                  (el Poder) y qué te cuesta (la Debilidad). Los tres compartían la clase `.linea`
                  y los mismos 13 px, así que la tarjeta se leía como una fila de planilla. */}
              <span className={styles.potencia}>{S.creacion.potencia(ATTR_NAMES[clase.attr])}</span>
              <span className={styles.poder}>
                <strong>{S.creacion.poder}:</strong> {clase.power.name}. {clase.power.description}
              </span>
              <span className={styles.debilidad}>
                <strong>{S.creacion.debilidad}:</strong> {debilidad}. {S.creacion.debilidadDetalle(debilidad)}.
              </span>
              {elegida === id && <span className={styles.elegido}>{S.creacion.elegido}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface PasoRetratoProps {
  classId: ClassId;
  portrait: string | null;
  verTodos: boolean;
  nombre: string;
  onVerTodos: () => void;
  onPortrait: (id: string) => void;
  onNombre: (nombre: string) => void;
}

function PasoRetrato({
  classId,
  portrait,
  verTodos,
  nombre,
  onVerTodos,
  onPortrait,
  onNombre,
}: PasoRetratoProps) {
  const propios = retratosDe(classId);
  const ajenos = CLASS_IDS.filter((c) => c !== classId).flatMap(retratosDe);

  const galeria = (ids: string[]) => (
    <ul className={styles.retratos}>
      {ids.map((id) => (
        <li key={id}>
          {/* El nombre accesible del botón sale del `alt` de la imagen. Antes ese mismo texto se
              pintaba ADEMÁS como una línea debajo de la miniatura, y no es un nombre: es el id del
              archivo («Retrato clerigo 01»), que debajo de doce cuadritos se lee como una planilla
              de inventario. Sigue siendo el nombre que anuncia un lector de pantalla. */}
          <button
            type="button"
            className={styles.retrato}
            data-testid={`retrato-${id}`}
            aria-pressed={portrait === id}
            onClick={() => onPortrait(id)}
          >
            <Arte id={id} alt={S.creacion.retratoEtiqueta(id)} />
            {portrait === id && <span className={styles.elegido}>{S.creacion.retratoElegido}</span>}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.galeriaYNombre}>
      <div className={styles.columna}>
        <h3 className={styles.grupo}>{S.creacion.retratosDeLaClase(CLASSES[classId].name)}</h3>
        {galeria(propios)}

        <button type="button" className={styles.secundario} data-testid="ver-todos" onClick={onVerTodos}>
          {verTodos ? S.creacion.verSoloLosDeLaClase : S.creacion.verTodos}
        </button>

        {verTodos && (
          <>
            <h3 className={styles.grupo}>{S.creacion.retratosDelResto}</h3>
            {galeria(ajenos)}
          </>
        )}
      </div>

      <div className={styles.campo}>
        <label className={styles.grupo} htmlFor="creacion-nombre">
          {S.creacion.nombreEtiqueta}
        </label>
        <input
          id="creacion-nombre"
          className={styles.input}
          type="text"
          value={nombre}
          maxLength={MAX_NOMBRE}
          aria-describedby="creacion-nombre-ayuda"
          onChange={(e) => onNombre(e.target.value)}
        />
        <p className={styles.ayuda} id="creacion-nombre-ayuda">
          {S.creacion.nombreAyuda(MAX_NOMBRE)}
        </p>
      </div>
    </div>
  );
}

interface PasoRasgosProps {
  classId: ClassId;
  portrait: string;
  nombre: string;
  elegidos: TraitId[];
  onAlternar: (id: TraitId) => void;
}

function PasoRasgos({ classId, portrait, nombre, elegidos, onAlternar }: PasoRasgosProps) {
  const clase = CLASSES[classId];
  const completo = elegidos.length >= RASGOS_A_ELEGIR;

  return (
    <div className={styles.conArte}>
      <Escenario classId={classId} portrait={portrait} nombre={nombre} />

      <div className={styles.respuesta}>
        <p className={styles.ayuda}>{S.creacion.rasgosAyuda}</p>
        {/* El aviso de cupo, UNA vez y en el mismo renglón que el contador, que es donde el
            jugador está mirando cuando se queda sin lugar. Lo pintaba cada tarjeta bloqueada por
            su cuenta: cinco párrafos idénticos, uno abajo del otro. Las cinco lo señalan con
            `aria-describedby`, así que no se pierde nada de lo que se leía en voz alta. En el
            mismo renglón y no debajo porque aparecer le costaba una fila entera a la lista: 35 px
            medidos a 1280×800, que eran justo los que faltaban para no scrollear. */}
        <div className={styles.estado}>
          <p className={styles.contador}>{S.creacion.rasgosContador(elegidos.length, RASGOS_A_ELEGIR)}</p>
          {completo && (
            <p className={styles.cupo} id={ID_CUPO}>
              {S.creacion.motivoDosRasgos}
            </p>
          )}
        </div>

        <ul className={styles.tarjetas} data-paso="3">
          {TRAIT_IDS.map((id) => {
            const rasgo = TRAITS[id];
            const elegido = elegidos.includes(id);
            // Dos bloqueos distintos y NO son lo mismo: la Debilidad de la clase es una regla dura
            // del juego (no se abre nunca) y el cupo es temporal (soltá uno y volvés a elegir).
            // Se veían iguales, con la misma itálica ámbar.
            const porRegla = !isTraitAllowed(classId, id);
            const porCupo = !porRegla && !elegido && completo;
            const bloqueado = porRegla || porCupo;
            const idRegla = `rasgo-${id}-motivo`;
            return (
              <li key={id}>
                {/* `aria-disabled` y no el `disabled` nativo: aquel saca la tarjeta del orden de
                    tabulación, así que quien juega con teclado NUNCA la enfocaba y por lo tanto
                    nunca escuchaba el `aria-describedby` que explica el bloqueo. Era un callejón
                    sin salida: la única explicación estaba atrás de una puerta cerrada. Enfocable
                    no es elegible — el `onClick` corta igual, que es donde vive la regla. */}
                <button
                  type="button"
                  className={styles.tarjeta}
                  data-testid={`rasgo-${id}`}
                  aria-pressed={elegido}
                  aria-disabled={bloqueado ? true : undefined}
                  aria-describedby={porRegla ? idRegla : porCupo ? ID_CUPO : undefined}
                  onClick={() => {
                    if (!bloqueado) onAlternar(id);
                  }}
                >
                  <span className={styles.nombreClase}>{rasgo.name}</span>
                  <span className={styles.potencia}>{S.creacion.rasgoPotencia(S.tags[rasgo.tag])}</span>
                  <span className={styles.linea}>{rasgo.description}</span>
                  {/* El motivo, ADENTRO de la tarjeta que explica. Era hermano del <button>, y
                      como el botón ya se pasaba 26 px de su celda, el párrafo caía afuera del
                      <li>: 88,5 px de texto colgando a 1280×800, 96,1 a 1919×905. */}
                  {porRegla && (
                    <span className={styles.regla} id={idRegla}>
                      {S.creacion.motivoDebilidad(clase.name, S.tags[rasgo.tag])}
                    </span>
                  )}
                  {elegido && <span className={styles.elegido}>{S.creacion.elegido}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

interface PasoResumenProps {
  classId: ClassId;
  portrait: string;
  nombre: string;
  traits: TraitId[];
  flojo: Attr;
  onFlojo: (attr: Attr) => void;
}

function PasoResumen({ classId, portrait, nombre, traits, flojo, onFlojo }: PasoResumenProps) {
  const clase = CLASSES[classId];
  const attrs = repartir(classId, flojo);
  const debilidad = S.tags[clase.weakness];

  return (
    <div className={styles.conArte}>
      <Escenario classId={classId} portrait={portrait} nombre={nombre} />

      <div className={styles.respuesta}>
        {/* El nombre y la clase no se repiten acá: los dice la columna de la izquierda, que es la
            misma que acompaña al paso 3. Este lado se queda con lo que aquella no muestra. */}
        <dl className={styles.datos}>
          <dt>{S.creacion.poder}</dt>
          <dd>
            {clase.power.name}. {clase.power.description}
          </dd>
          <dt>{S.creacion.debilidad}</dt>
          <dd>
            {debilidad}. {S.creacion.debilidadDetalle(debilidad)}.
          </dd>
          <dt>{S.creacion.resumenRasgos}</dt>
          <dd>
            <ul className={styles.listaSimple}>
              {traits.map((t) => (
                <li key={t}>
                  {TRAITS[t].name} — {S.creacion.rasgoPotencia(S.tags[TRAITS[t].tag])}
                </li>
              ))}
            </ul>
          </dd>
        </dl>

        <h3 className={styles.grupo}>{S.creacion.resumenAtributos}</h3>
        <p className={styles.ayuda}>{S.creacion.atributosAyuda}</p>
        <ul className={styles.atributos}>
          {ATTRS.map((a) => (
            <li key={a} className={styles.atributo} data-testid={`atributo-${a}`} data-principal={a === clase.attr}>
              <span>{ATTR_NAMES[a]}</span>
              <strong>{attrs[a]}</strong>
            </li>
          ))}
        </ul>

        <fieldset className={styles.reparto}>
          <legend className={styles.grupo}>{S.creacion.flojoPregunta}</legend>
          {ATTRS.filter((a) => a !== clase.attr).map((a) => (
            <button
              key={a}
              type="button"
              className={styles.secundario}
              data-testid={`flojo-${a}`}
              aria-pressed={flojo === a}
              onClick={() => onFlojo(a)}
            >
              {S.creacion.flojoBoton(ATTR_NAMES[a])}
            </button>
          ))}
        </fieldset>

        <p className={styles.ayuda}>{S.creacion.nivelInicial}</p>
      </div>
    </div>
  );
}
