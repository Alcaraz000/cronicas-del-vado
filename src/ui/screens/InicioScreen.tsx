import { useRef, useState } from 'react';
import { campaignTitle } from '@/content/campaigns';
import { CLASSES } from '@/content/catalog';
import { selectActiveCharacter } from '@/state/selectors';
import { useStore } from '@/state/store';
import { OpcionesModal } from '@/ui/components/OpcionesModal';
import { useEnfocarAlEntrar } from '@/ui/hooks/useEnfocarAlEntrar';
import { S } from '@/ui/strings.es';
import styles from './InicioScreen.module.css';

/**
 * Inicio (spec §6): Continuar si hay partida, el camino a las campañas y Opciones.
 *
 * No lista campañas: eso es el hub. Sin personaje el botón lleva a la creación, que es
 * el único camino para tener uno; con personaje lleva al hub, que es donde se elige
 * campaña y se cambia o se crea otro personaje.
 */
export function InicioScreen() {
  const characters = useStore((s) => s.characters);
  const activo = useStore(selectActiveCharacter);
  const goTo = useStore((s) => s.goTo);
  const continueRun = useStore((s) => s.continueRun);

  const [opciones, setOpciones] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEnfocarAlEntrar(titulo);

  const sinPersonajes = characters.length === 0;
  const enCurso = activo?.run ?? null;

  return (
    <div className={styles.pantalla}>
      <h1 ref={titulo} tabIndex={-1} className={styles.titulo}>
        {S.titulo}
      </h1>
      <p className={styles.personaje}>
        {activo === null
          ? S.inicio.sinPersonaje
          : S.inicio.personajeActivo(activo.name, CLASSES[activo.classId].name, activo.level)}
      </p>
      {enCurso !== null && <p className={styles.personaje}>{S.inicio.partidaEnCurso(campaignTitle(enCurso.campaignId))}</p>}
      {activo?.dead !== undefined && <p className={styles.aviso}>{S.inicio.personajeMuerto(activo.name)}</p>}

      <div className={styles.botones}>
        {enCurso !== null && (
          <button type="button" className={styles.primario} onClick={() => void continueRun()}>
            {S.inicio.continuar}
          </button>
        )}
        <button
          type="button"
          className={enCurso === null ? styles.primario : styles.secundario}
          onClick={() => goTo(sinPersonajes ? 'creacion' : 'hub')}
        >
          {sinPersonajes ? S.inicio.crearPersonaje : S.inicio.campanas}
        </button>
        <button type="button" className={styles.secundario} onClick={() => setOpciones(true)}>
          {S.inicio.opciones}
        </button>
      </div>

      {opciones && <OpcionesModal onCerrar={() => setOpciones(false)} />}
    </div>
  );
}
