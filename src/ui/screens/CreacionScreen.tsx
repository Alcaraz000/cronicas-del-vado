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

/** Los tres retratos de una clase: `guerrero_01`… `clerigo_03` (todavía cajas grises). */
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

  const idMotivo = 'creacion-motivo';

  return (
    <div className={styles.pantalla}>
      <header className={styles.cabecera}>
        <h1 className={styles.titulo}>{S.creacion.titulo}</h1>
        <div
          className={styles.progreso}
          role="progressbar"
          aria-label={S.creacion.progreso}
          aria-valuemin={1}
          aria-valuemax={PASOS}
          aria-valuenow={paso}
          aria-valuetext={`${S.creacion.paso(paso, PASOS)}: ${S.creacion.titulos[paso]}`}
        >
          <span className={styles.avance} style={{ width: `${(paso / PASOS) * 100}%` }} />
        </div>
        <p className={styles.pasoTexto} data-testid="paso">
          {S.creacion.paso(paso, PASOS)} · {S.creacion.titulos[paso]}
        </p>
      </header>

      <main className={styles.cuerpo}>
        <h2 ref={subtitulo} tabIndex={-1} className={styles.subtitulo}>
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
          <PasoRasgos classId={classId} elegidos={traits} onAlternar={alternarRasgo} />
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
          <p className={styles.motivo} id={idMotivo}>
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
            <button
              type="button"
              className={styles.primario}
              data-testid="siguiente"
              disabled={motivoBloqueo !== null}
              aria-describedby={motivoBloqueo !== null ? idMotivo : undefined}
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

function PasoClase({ elegida, onElegir }: { elegida: ClassId | null; onElegir: (id: ClassId) => void }) {
  return (
    <ul className={styles.tarjetas}>
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
              <Imagen tipo="retrato" id={`${id}_01`} aspect="3:4" alt={S.creacion.retratoEtiqueta(`${id}_01`)} />
              <span className={styles.nombreClase}>{clase.name}</span>
              <span className={styles.linea}>{S.creacion.potencia(ATTR_NAMES[clase.attr])}</span>
              <span className={styles.linea}>
                <strong>{S.creacion.poder}:</strong> {clase.power.name}. {clase.power.description}
              </span>
              <span className={styles.linea}>
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
          <button
            type="button"
            className={styles.retrato}
            data-testid={`retrato-${id}`}
            aria-pressed={portrait === id}
            onClick={() => onPortrait(id)}
          >
            <Imagen tipo="retrato" id={id} aspect="3:4" alt={S.creacion.retratoEtiqueta(id)} />
            <span className={styles.linea}>{S.creacion.retratoEtiqueta(id)}</span>
            {portrait === id && <span className={styles.elegido}>{S.creacion.retratoElegido}</span>}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
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

      <div className={styles.campo}>
        <label htmlFor="creacion-nombre">{S.creacion.nombreEtiqueta}</label>
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
  elegidos: TraitId[];
  onAlternar: (id: TraitId) => void;
}

function PasoRasgos({ classId, elegidos, onAlternar }: PasoRasgosProps) {
  const clase = CLASSES[classId];
  return (
    <div className={styles.columna}>
      <p className={styles.ayuda}>{S.creacion.rasgosAyuda}</p>
      <ul className={styles.tarjetas}>
        {TRAIT_IDS.map((id) => {
          const rasgo = TRAITS[id];
          const elegido = elegidos.includes(id);
          const permitido = isTraitAllowed(classId, id);
          // El motivo es texto visible y está asociado al control con aria-describedby:
          // un rasgo bloqueado nunca es "solo gris".
          const motivo = !permitido
            ? S.creacion.motivoDebilidad(clase.name, S.tags[rasgo.tag])
            : !elegido && elegidos.length >= RASGOS_A_ELEGIR
              ? S.creacion.motivoDosRasgos
              : null;
          const idMotivo = `rasgo-${id}-motivo`;
          return (
            <li key={id}>
              <button
                type="button"
                className={styles.tarjeta}
                data-testid={`rasgo-${id}`}
                aria-pressed={elegido}
                aria-describedby={motivo !== null ? idMotivo : undefined}
                disabled={motivo !== null}
                onClick={() => onAlternar(id)}
              >
                <span className={styles.nombreClase}>{rasgo.name}</span>
                <span className={styles.linea}>{S.creacion.rasgoPotencia(S.tags[rasgo.tag])}</span>
                <span className={styles.linea}>{rasgo.description}</span>
                {elegido && <span className={styles.elegido}>{S.creacion.elegido}</span>}
              </button>
              {motivo !== null && (
                <p className={styles.motivo} id={idMotivo}>
                  {motivo}
                </p>
              )}
            </li>
          );
        })}
      </ul>
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
    <div className={styles.columna}>
      <div className={styles.ficha}>
        <div className={styles.fichaRetrato}>
          <Imagen tipo="retrato" id={portrait} aspect="3:4" alt={S.creacion.retratoEtiqueta(portrait)} />
        </div>
        <dl className={styles.datos}>
          <dt>{S.creacion.resumenNombre}</dt>
          <dd>{nombre}</dd>
          <dt>{S.creacion.resumenClase}</dt>
          <dd>
            {clase.name} · {S.creacion.potencia(ATTR_NAMES[clase.attr])}
            <br />
            {S.creacion.poder}: {clase.power.name}. {clase.power.description}
            <br />
            {S.creacion.debilidad}: {debilidad}. {S.creacion.debilidadDetalle(debilidad)}.
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
      </div>

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
        <legend>{S.creacion.flojoPregunta}</legend>
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
  );
}
