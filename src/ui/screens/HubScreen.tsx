import { useEffect, useMemo, useRef, useState } from 'react';
import { campaignTitle, CAMPAIGNS, listCampaigns } from '@/content/campaigns';
import { ATTRS, ATTR_NAMES, CLASSES, LIMITS } from '@/content/catalog';
import type { CampaignMeta } from '@/content/schema';
import {
  campaignLabel,
  topeAgotado,
  topeDeNivel,
  veteranModifier,
  xpDelNivel,
  type CampaignLabel,
} from '@/engine/progression';
import type { Character } from '@/engine/types';
import { selectActiveCharacter } from '@/state/selectors';
import { useStore } from '@/state/store';
import { existeImagen } from '@/ui/assets';
import { Dialogo } from '@/ui/components/Dialogo';
import { Imagen } from '@/ui/components/Imagen';
import { OpcionesModal } from '@/ui/components/OpcionesModal';
import { useEnfocarAlEntrar } from '@/ui/hooks/useEnfocarAlEntrar';
import { S } from '@/ui/strings.es';
import styles from './HubScreen.module.css';

/**
 * Cuántos finales declara cada campaña. No está en `CampaignMeta` —solo en la campaña
 * completa—, así que el hub lo pide con el `import()` dinámico del registro y lo cachea
 * por id. De paso calienta el chunk de la campaña que el jugador está por empezar.
 * Si la carga falla, la tarjeta muestra los finales vistos sin total y no rompe nada.
 */
const totalDeFinales = new Map<string, number>();

async function contarFinales(campaignId: string): Promise<void> {
  if (totalDeFinales.has(campaignId)) return;
  const entry = CAMPAIGNS[campaignId];
  if (entry === undefined) return;
  try {
    const campaign = await entry.load();
    totalDeFinales.set(campaignId, Object.keys(campaign.endings).length);
  } catch {
    // Campaña que no carga: la tarjeta se dibuja igual, sin el total de finales.
  }
}

function leerCache(ids: readonly string[]): Record<string, number> {
  const totales: Record<string, number> = {};
  for (const id of ids) {
    const total = totalDeFinales.get(id);
    if (total !== undefined) totales[id] = total;
  }
  return totales;
}

function useTotalDeFinales(metas: readonly CampaignMeta[]): Record<string, number> {
  // `clave` es una cadena para que el efecto no se dispare por identidad del array.
  const clave = metas.map((m) => m.id).join('|');
  const ids = useMemo(() => (clave === '' ? [] : clave.split('|')), [clave]);
  const [totales, setTotales] = useState<Record<string, number>>(() => leerCache(ids));

  useEffect(() => {
    let vivo = true;
    void Promise.all(ids.map(contarFinales)).then(() => {
      if (vivo) setTotales(leerCache(ids));
    });
    return () => {
      vivo = false;
    };
  }, [ids]);

  return totales;
}

interface TarjetaProps {
  meta: CampaignMeta;
  /** Personaje activo, o null si todavía no hay uno. Sin él no hay dificultad relativa. */
  personaje: Character | null;
  totalFinales: number | undefined;
  enCurso: boolean;
  onJugar: (meta: CampaignMeta) => void;
}

/**
 * La campaña como tarjeta grande con la imagen dominante, no como fila de catálogo: la
 * portada ocupa una columna entera a la izquierda y todo lo demás cuelga a su derecha. Es la
 * forma que tienen los slots de partida del género y la que justifica que el arte exista: el
 * archivo es de 900×1200 y hasta esta tarea salía a 160×213,33 px, el 17,8 % de su fuente,
 * por el `max-width: 160px` que `Imagen.module.css` escribió para la creación de personaje.
 * Quién lo anula, y por qué se puede desde acá, está en `HubScreen.module.css`.
 */
function TarjetaCampana({ meta, personaje, totalFinales, enCurso, onJugar }: TarjetaProps) {
  const muerto = personaje !== null && personaje.dead !== undefined;
  const etiqueta: CampaignLabel | null =
    personaje === null ? null : campaignLabel(meta.levelRange, personaje.level);
  const veterano = etiqueta === null ? 0 : veteranModifier(etiqueta);
  const registro = personaje?.campaignLog[meta.id];
  const vistos = registro?.endings.length ?? 0;
  const tope = topeDeNivel(meta.levelRange);
  const sinJugo = personaje !== null && topeAgotado(personaje.xp, meta.levelRange);

  const motivo = personaje === null
    ? S.hub.campana.necesitaPersonaje
    : muerto
      ? S.hub.campana.personajeMuerto
      : null;

  return (
    <li className={styles.tarjeta}>
      {/* Se busca por el id de la campaña, no por `meta.cover`: ver el comentario de `archivoDe` en `ui/assets`. */}
      <div className={styles.portada}>
        <Imagen tipo="portada" id={meta.id} aspect="3:4" alt={S.hub.campana.portadaAlt(meta.title)} />
      </div>

      <div className={styles.detalle}>
        <h3 className={styles.tituloCampana}>{meta.title}</h3>

        {etiqueta !== null && (
          <p className={styles.etiqueta} data-etiqueta={etiqueta} data-testid={`etiqueta-${meta.id}`}>
            <strong className={styles.palabra}>{S.hub.etiqueta[etiqueta]}</strong>{' '}
            <span className={styles.etiquetaDetalle}>{S.hub.etiquetaDetalle[etiqueta]}</span>
          </p>
        )}
        {veterano !== 0 && (
          <p className={styles.veterano} data-testid={`veterano-${meta.id}`} title={S.hub.veteranoTitulo}>
            {S.hub.veterano(veterano)}
          </p>
        )}

        <p className={styles.premisa}>{meta.premise}</p>

        <ul className={styles.datos}>
          <li>{S.hub.campana.nivelSugerido(meta.levelRange)}</li>
          <li>{S.hub.campana.duracion(meta.durationMin)}</li>
          <li>{S.hub.campana.tope(tope)}</li>
          <li>
            {totalFinales === undefined
              ? S.hub.campana.finalesSinTotal(vistos)
              : S.hub.campana.finales(vistos, totalFinales)}
          </li>
          <li>{S.hub.campana.partidas(registro?.runs ?? 0)}</li>
        </ul>

        {/* La regla de la muerte, a la vista. Era un `<details><summary>`: un acordeón nativo es
            la señal más inequívoca de "panel de configuración", y además escondía justo la
            regla que decide si el personaje vuelve o no. Con la tarjeta grande hay lugar para
            decirla entera. Si la campaña no tiene escenas mortales no hay regla que explicar:
            el chip dice "Sin escenas mortales" y ahí termina. */}
        <p className={styles.mortales}>
          <span aria-hidden="true">{meta.lethalScenes > 0 ? '☠ ' : ''}</span>
          {S.hub.campana.mortales(meta.lethalScenes)}
        </p>
        {meta.lethalScenes > 0 && <p className={styles.regla}>{S.hub.campana.reglaMortal}</p>}

        {sinJugo && <p className={styles.aviso}>{S.hub.campana.topeAlcanzado}</p>}
        {enCurso && <p className={styles.aviso}>{S.hub.campana.enCurso}</p>}

        <div className={styles.acciones}>
          <button
            type="button"
            className={styles.jugar}
            data-testid={`jugar-${meta.id}`}
            disabled={motivo !== null}
            onClick={() => onJugar(meta)}
          >
            {enCurso ? S.hub.campana.continuar : S.hub.campana.comenzar}
          </button>
          {motivo !== null && <p className={styles.motivo}>{motivo}</p>}
        </div>
      </div>
    </li>
  );
}

/**
 * Lo que está esperando una confirmación. Es una sola variable y no dos banderas porque no
 * puede haber dos preguntas abiertas a la vez: el `Dialogo` es modal y atrapa el foco.
 */
type Pendiente =
  | { tipo: 'jugar'; campaignId: string; cuerpo: string }
  | { tipo: 'borrar'; personajeId: string; nombre: string };

export function HubScreen() {
  const characters = useStore((s) => s.characters);
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  const startRun = useStore((s) => s.startRun);
  const continueRun = useStore((s) => s.continueRun);
  const goTo = useStore((s) => s.goTo);
  const selectCharacter = useStore((s) => s.selectCharacter);
  const deleteCharacter = useStore((s) => s.deleteCharacter);

  const [opciones, setOpciones] = useState(false);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEnfocarAlEntrar(titulo);

  const metas = useMemo(() => listCampaigns(false), []);
  const totales = useTotalDeFinales(metas);

  const activo = useStore(selectActiveCharacter);
  const enCursoEn = (id: string): boolean => activo?.run?.campaignId === id;

  /**
   * Qué portada se pinta a sangre detrás de todo: la de la partida en curso si hay una y, si
   * no, la de la primera campaña de la lista. La partida en curso primero porque el fondo es
   * lo que le dice al jugador dónde estaba, sin que ningún texto tenga que decirlo.
   *
   * Si esa campaña no tiene arte no se dibuja nada: `Imagen` caería al `Placeholder`, que es
   * una caja gris con su etiqueta, y a sangre eso no es un fondo sino un error a pantalla
   * completa. La campaña de humo `prueba` no tiene portada y tiene que seguir jugándose igual.
   */
  const destacada = metas.find((m) => enCursoEn(m.id)) ?? metas[0];
  const fondo = destacada !== undefined && existeImagen('portada', destacada.id) ? destacada : null;

  /**
   * Todo lo que el jugador tiene que saber ANTES de arrancar, en una sola confirmación:
   * el riesgo de la dificultad (Exigente o Mortal) y, si venía jugando otra campaña, que
   * empezar esta la cierra como derrota (es lo que hace `startRun` al llamar a endRun).
   * Nunca bloquea: elegir mal está permitido, elegir a ciegas no.
   *
   * Los avisos se unen con un espacio y no con el `\n\n` que llevaban: el `window.confirm` que
   * había antes respetaba los saltos de línea y el `<p>` del `Dialogo` los colapsa igual. Las
   * dos frases terminan en punto, así que el cuerpo se lee como un párrafo.
   */
  const jugar = (meta: CampaignMeta): void => {
    if (activo === null || activo.dead !== undefined) return;
    if (enCursoEn(meta.id)) {
      void continueRun();
      return;
    }

    const avisos: string[] = [];
    const etiqueta = campaignLabel(meta.levelRange, activo.level);
    if (etiqueta === 'mortal' || etiqueta === 'exigente') avisos.push(S.hub.confirmar[etiqueta]);
    const enCurso = activo.run;
    if (enCurso !== null) {
      avisos.push(S.hub.confirmarPerderPartida(campaignTitle(enCurso.campaignId)));
    }
    if (avisos.length > 0) {
      setPendiente({
        tipo: 'jugar',
        campaignId: meta.id,
        cuerpo: [...avisos, S.hub.confirmar.seguir].join(' '),
      });
      return;
    }

    void startRun(meta.id);
  };

  /**
   * Borrar es definitivo y se lleva la partida en curso del personaje: se pregunta antes.
   * Es la única salida cuando el perfil está lleno de personajes muertos, así que el hub
   * la ofrece siempre y no solo cuando no queda cupo.
   */
  const borrar = (id: string, nombre: string): void => {
    setPendiente({ tipo: 'borrar', personajeId: id, nombre });
  };

  const confirmar = (): void => {
    if (pendiente === null) return;
    if (pendiente.tipo === 'jugar') void startRun(pendiente.campaignId);
    else deleteCharacter(pendiente.personajeId);
    setPendiente(null);
  };

  const sinCupo = characters.length >= LIMITS.maxCharacters;

  return (
    <main className={styles.pantalla}>
      {/* 1. El arte, a sangre y detrás de TODO. `alt=""` y `aria-hidden` porque es decorativo:
             la misma portada se dibuja con su nombre dentro de la tarjeta, y anunciarla dos
             veces sería ruido para un lector de pantalla. */}
      {fondo !== null && (
        <div className={styles.fondo} aria-hidden="true">
          <Imagen tipo="portada" id={fondo.id} aspect="3:4" alt="" />
        </div>
      )}
      <div className={styles.velo} aria-hidden="true" />

      <header className={styles.encabezado}>
        <h1 ref={titulo} tabIndex={-1} className={styles.titulo}>
          {S.hub.titulo}
        </h1>
        <div className={styles.cromo}>
          <button type="button" className={styles.secundario} onClick={() => setOpciones(true)}>
            {S.hub.opciones}
          </button>
          <button type="button" className={styles.secundario} onClick={() => goTo('inicio')}>
            {S.hub.volver}
          </button>
        </div>
      </header>

      {/* El orden de lectura es el del juego: primero a qué se juega, después con quién. Estaba
          al revés —el ABM del perfil arriba de las campañas—, que es el orden de un panel de
          configuración y no el de un menú de juego. */}
      <div className={styles.contenido}>
        <section className={styles.seccion} aria-labelledby="hub-campanas">
          <h2 id="hub-campanas" className={styles.subtitulo}>
            {S.hub.campanas}
          </h2>
          <ul className={styles.grilla} aria-labelledby="hub-campanas">
            {metas.map((meta) => (
              <TarjetaCampana
                key={meta.id}
                meta={meta}
                personaje={activo}
                totalFinales={totales[meta.id]}
                enCurso={enCursoEn(meta.id)}
                onJugar={jugar}
              />
            ))}
          </ul>
        </section>

        <section className={styles.seccion} aria-labelledby="hub-personaje">
          <h2 id="hub-personaje" className={styles.subtitulo}>
            {S.hub.personaje.titulo}
          </h2>

          <div className={styles.panel}>
            {activo === null ? (
              <p className={styles.suave}>{S.hub.personaje.sinPersonaje}</p>
            ) : (
              <>
                <p className={styles.nombre}>
                  {S.hub.personaje.ficha(activo.name, CLASSES[activo.classId].name, activo.level)}
                </p>
                <ul className={styles.atributos}>
                  {ATTRS.map((attr) => (
                    <li key={attr} className={styles.atributo}>
                      {S.hub.personaje.atributo(ATTR_NAMES[attr], activo.attrs[attr])}
                    </li>
                  ))}
                </ul>
                <p className={styles.suave}>
                  {activo.level >= LIMITS.maxLevel
                    ? S.hub.personaje.nivelMaximo(activo.xp)
                    : S.hub.personaje.xp(activo.xp, Math.max(0, xpDelNivel(activo.level + 1) - activo.xp))}
                </p>
                {activo.dead !== undefined && <p className={styles.aviso}>{S.hub.personaje.muerto(activo.name)}</p>}
              </>
            )}

            {characters.length > 0 && (
              <>
                <h3 className={styles.subtituloChico}>{S.hub.personaje.todos}</h3>
                <ul className={styles.otros}>
                  {characters.map((c) => (
                    <li key={c.id} className={styles.fila}>
                      {c.id === activeCharacterId ? (
                        <span className={styles.enJuego}>
                          {S.hub.personaje.ficha(c.name, CLASSES[c.classId].name, c.level)} · {S.hub.personaje.enJuego}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.elegir}
                          data-testid={`elegir-${c.id}`}
                          onClick={() => selectCharacter(c.id)}
                        >
                          {S.hub.personaje.elegir(c.name, CLASSES[c.classId].name, c.level)}
                        </button>
                      )}
                      {/* Borrar es la única acción irreversible de la pantalla y hasta acá era
                          el MISMO botón que jugar con el personaje, pegado a 8 px. Ahora es
                          texto al final de la fila, con el rojo de peligro y empujado a la
                          derecha por `margin-inline-start: auto`: se alcanza igual con el
                          teclado y ya no se toca con el pulgar por error. */}
                      <button
                        type="button"
                        className={styles.borrar}
                        data-testid={`borrar-${c.id}`}
                        onClick={() => borrar(c.id, c.name)}
                      >
                        {S.hub.personaje.borrar(c.name)}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <button
              type="button"
              className={styles.secundario}
              data-testid="crear-personaje"
              disabled={sinCupo}
              onClick={() => goTo('creacion')}
            >
              {characters.length === 0 ? S.hub.personaje.crear : S.hub.personaje.crearOtro}
            </button>
            {sinCupo && <p className={styles.suave}>{S.hub.personaje.sinCupo(LIMITS.maxCharacters)}</p>}
          </div>
        </section>
      </div>

      {/* Las dos confirmaciones del hub eran los últimos `window.confirm` que quedaban en
          `src/`: el momento más dramático de la pantalla —arrancar una campaña que te puede
          matar el personaje— se resolvía con el cuadro gris del sistema operativo mientras el
          resto del juego usa `Dialogo`. Un solo `Dialogo` para las dos porque son modales y no
          pueden convivir; el tono es `peligro` en las dos porque las dos pueden costar el
          personaje. */}
      <Dialogo
        titulo={pendiente?.tipo === 'borrar' ? S.hub.personaje.borrarTitulo : S.hub.confirmar.titulo}
        cuerpo={
          pendiente === null
            ? ''
            : pendiente.tipo === 'borrar'
              ? S.hub.personaje.borrarConfirmar(pendiente.nombre)
              : pendiente.cuerpo
        }
        confirmar={pendiente?.tipo === 'borrar' ? S.hub.personaje.borrarBoton : S.hub.confirmar.empezar}
        cancelar={S.comun.cancelar}
        tono="peligro"
        abierto={pendiente !== null}
        onConfirmar={confirmar}
        onCancelar={() => setPendiente(null)}
      />

      {opciones && <OpcionesModal onCerrar={() => setOpciones(false)} />}
    </main>
  );
}
