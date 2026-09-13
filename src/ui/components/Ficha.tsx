import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ATTRS, ATTR_NAMES, CLASSES, SKILLS, TRAITS, WOUND_LABELS } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import { topeDeNivel, xpDelNivel } from '@/engine/progression';
import type { GameState } from '@/engine/types';
import { selectGameState } from '@/state/selectors';
import { useStore } from '@/state/store';
import { Cajon } from '@/ui/components/Cajon';
import { Recuerdos } from '@/ui/components/Recuerdos';
import {
  derivarCronica,
  derivarRecuerdos,
  nombresDeCondiciones,
  nombresDeItems,
  type Cronica,
  type Recuerdos as RecuerdosDatos,
} from '@/ui/memoria';
import { S } from '@/ui/strings.es';
import styles from './Ficha.module.css';

export interface FichaProps {
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * La ficha del personaje: encima de `Cajon`, se abre con la tecla C durante una partida.
 * Lee el store (la campaña y el `GameState` del personaje activo) y deriva lo que hace
 * falta con `derivarRecuerdos` / `derivarCronica`; el dibujo en sí vive acá y en `Recuerdos`.
 */
export function Ficha({ abierto, onCerrar }: FichaProps) {
  const campaign = useStore((s) => s.ui.campaign);
  const gs = useStore(useShallow(selectGameState));

  const datos = useMemo(() => {
    if (campaign === null || gs === null) return null;
    return {
      campaign,
      gs,
      recuerdos: derivarRecuerdos(campaign, gs),
      cronica: derivarCronica(campaign, gs.character),
    };
  }, [campaign, gs]);

  return (
    <Cajon titulo={S.ficha.titulo} abierto={abierto} onCerrar={onCerrar}>
      {datos !== null && (
        <FichaContenido campaign={datos.campaign} gs={datos.gs} recuerdos={datos.recuerdos} cronica={datos.cronica} />
      )}
    </Cajon>
  );
}

interface FichaContenidoProps {
  campaign: Campaign;
  gs: GameState;
  recuerdos: RecuerdosDatos;
  cronica: Cronica;
}

function FichaContenido({ campaign, gs, recuerdos, cronica }: FichaContenidoProps) {
  const { character, run } = gs;
  const clase = CLASSES[character.classId];
  const tope = topeDeNivel(campaign.levelRange);
  const siguiente = xpDelNivel(character.level + 1);
  const nombresCondiciones = nombresDeCondiciones(run.conditions);
  const objetos = nombresDeItems(run.items, campaign);
  const reliquias = nombresDeItems(character.relics, campaign);

  return (
    <>
      <section className={styles.seccion} aria-label={S.ficha.titulo}>
        <h3 className={styles.nombre}>{character.name}</h3>
        <p>{S.ficha.clase(clase.name)}</p>
        <p>{S.ficha.nivel(character.level, tope)}</p>
        <p>{S.ficha.xp(character.xp, siguiente)}</p>

        <ul className={styles.chips}>
          {ATTRS.map((attr) => (
            <li key={attr}>{S.hub.personaje.atributo(ATTR_NAMES[attr], character.attrs[attr])}</li>
          ))}
        </ul>

        <p>{S.ficha.poder(clase.power.name, clase.power.description)}</p>
        <p>{S.ficha.debilidad(S.tags[clase.weakness])}</p>

        <h4 className={styles.subtitulo}>{S.ficha.rasgos}</h4>
        <ul className={styles.chips}>
          {character.traits.map((id) => (
            <li key={id}>{TRAITS[id].name}</li>
          ))}
        </ul>

        <h4 className={styles.subtitulo}>{S.ficha.habilidades}</h4>
        {character.skills.length === 0 ? (
          <p className={styles.vacio}>{S.ficha.sinHabilidades}</p>
        ) : (
          <ul className={styles.chips}>
            {character.skills.map((id) => (
              <li key={id}>{SKILLS[id].name}</li>
            ))}
          </ul>
        )}

        <p>
          {S.barra.heridas}: {WOUND_LABELS[run.wounds]}
        </p>
        <p>
          {S.barra.condiciones}: {nombresCondiciones}
        </p>

        <h4 className={styles.subtitulo}>{S.ficha.objetos}</h4>
        {objetos.length === 0 ? (
          <p className={styles.vacio}>{S.ficha.sinObjetos}</p>
        ) : (
          <ul className={styles.chips}>
            {objetos.map((nombre, i) => (
              <li key={`${nombre}-${i}`}>{nombre}</li>
            ))}
          </ul>
        )}

        <h4 className={styles.subtitulo}>{S.ficha.reliquias}</h4>
        {reliquias.length === 0 ? (
          <p className={styles.vacio}>{S.ficha.sinReliquias}</p>
        ) : (
          <ul className={styles.chips}>
            {reliquias.map((nombre, i) => (
              <li key={`${nombre}-${i}`}>{nombre}</li>
            ))}
          </ul>
        )}
      </section>

      <Recuerdos recuerdos={recuerdos} cronica={cronica} />
    </>
  );
}
