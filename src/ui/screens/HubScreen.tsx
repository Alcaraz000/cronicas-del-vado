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
      <Imagen tipo="portada" id={meta.id} aspect="3:4" alt={S.hub.campana.portadaAlt(meta.title)} />
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

      {/* La regla de la muerte, alcanzable con el teclado (details) y al pasar el cursor (title). */}
      <details className={styles.mortales}>
        <summary title={S.hub.campana.reglaMortal}>
          <span aria-hidden="true">{meta.lethalScenes > 0 ? '☠ ' : ''}</span>
          {S.hub.campana.mortales(meta.lethalScenes)}
        </summary>
        <p className={styles.regla}>{S.hub.campana.reglaMortal}</p>
      </details>

      {sinJugo && <p className={styles.aviso}>{S.hub.campana.topeAlcanzado}</p>}
      {enCurso && <p className={styles.aviso}>{S.hub.campana.enCurso}</p>}

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
    </li>
  );
}

export function HubScreen() {
  const characters = useStore((s) => s.characters);
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  const startRun = useStore((s) => s.startRun);
  const continueRun = useStore((s) => s.continueRun);
  const goTo = useStore((s) => s.goTo);
  const selectCharacter = useStore((s) => s.selectCharacter);
  const deleteCharacter = useStore((s) => s.deleteCharacter);

  const [opciones, setOpciones] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEnfocarAlEntrar(titulo);

  const metas = useMemo(() => listCampaigns(false), []);
  const totales = useTotalDeFinales(metas);

  const activo = useStore(selectActiveCharacter);
  const enCursoEn = (id: string): boolean => activo?.run?.campaignId === id;

  /**
   * Todo lo que el jugador tiene que saber ANTES de arrancar, en una sola confirmación:
   * el riesgo de la dificultad (Exigente o Mortal) y, si venía jugando otra campaña, que
   * empezar esta la cierra como derrota (es lo que hace `startRun` al llamar a endRun).
   * Nunca bloquea: elegir mal está permitido, elegir a ciegas no.
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
    if (avisos.length > 0 && !window.confirm([...avisos, S.hub.confirmar.seguir].join('\n\n'))) return;

    void startRun(meta.id);
  };

  /**
   * Borrar es definitivo y se lleva la partida en curso del personaje: se pregunta antes.
   * Es la única salida cuando el perfil está lleno de personajes muertos, así que el hub
   * la ofrece siempre y no solo cuando no queda cupo.
   */
  const borrar = (id: string, nombre: string): void => {
    if (window.confirm(S.hub.personaje.borrarConfirmar(nombre))) deleteCharacter(id);
  };

  const sinCupo = characters.length >= LIMITS.maxCharacters;

  return (
    <div className={styles.pantalla}>
      <header className={styles.encabezado}>
        <h1 ref={titulo} tabIndex={-1} className={styles.titulo}>
          {S.hub.titulo}
        </h1>
        <button type="button" className={styles.secundario} onClick={() => setOpciones(true)}>
          {S.hub.opciones}
        </button>
        <button type="button" className={styles.secundario} onClick={() => goTo('inicio')}>
          {S.hub.volver}
        </button>
      </header>

      <section className={styles.personaje} aria-labelledby="hub-personaje">
        <h2 id="hub-personaje" className={styles.subtitulo}>
          {S.hub.personaje.titulo}
        </h2>

        {activo === null ? (
          <p className={styles.suave}>{S.hub.personaje.sinPersonaje}</p>
        ) : (
          <>
            <p className={styles.ficha}>
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
            <h3 className={styles.subtitulo}>{S.hub.personaje.todos}</h3>
            <ul className={styles.otros}>
              {characters.map((c) => (
                <li key={c.id} className={styles.fila}>
                  {c.id === activeCharacterId ? (
                    <span className={styles.suave}>
                      {S.hub.personaje.ficha(c.name, CLASSES[c.classId].name, c.level)} · {S.hub.personaje.enJuego}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.secundario}
                      data-testid={`elegir-${c.id}`}
                      onClick={() => selectCharacter(c.id)}
                    >
                      {S.hub.personaje.elegir(c.name, CLASSES[c.classId].name, c.level)}
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.secundario}
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
      </section>

      <ul className={styles.grilla}>
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

      {opciones && <OpcionesModal onCerrar={() => setOpciones(false)} />}
    </div>
  );
}
