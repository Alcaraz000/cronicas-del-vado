import type { Cronica, RecuerdoLinea, Recuerdos as RecuerdosDatos } from '@/ui/memoria';
import { S } from '@/ui/strings.es';
import styles from './Recuerdos.module.css';

export interface RecuerdosProps {
  recuerdos: RecuerdosDatos;
  cronica: Cronica;
}

interface GrupoDef {
  clave: keyof RecuerdosDatos;
  titulo: string;
}

/** Los seis grupos de `Recuerdos`, en el orden en que se leen. */
const GRUPOS: GrupoDef[] = [
  { clave: 'gente', titulo: S.ficha.recuerdos.gente },
  { clave: 'lugares', titulo: S.ficha.recuerdos.lugares },
  { clave: 'hechos', titulo: S.ficha.recuerdos.hechos },
  { clave: 'mundo', titulo: S.ficha.recuerdos.mundo },
  { clave: 'reliquias', titulo: S.ficha.recuerdos.reliquias },
  { clave: 'caidos', titulo: S.ficha.recuerdos.caidos },
];

/** Un grupo vacío no se dibuja. */
function Grupo({ titulo, lineas }: { titulo: string; lineas: RecuerdoLinea[] }) {
  if (lineas.length === 0) return null;
  return (
    <div className={styles.grupo}>
      <h4 className={styles.subtitulo}>{titulo}</h4>
      <ul className={styles.lista}>
        {lineas.map((l) => (
          <li key={l.id}>{l.texto}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Componente tonto: recibe lo que `derivarRecuerdos` y `derivarCronica` ya derivaron y lo
 * dibuja. No repite esa derivación acá. Si los seis grupos están vacíos, muestra
 * `S.ficha.sinRecuerdos` en vez de seis secciones sin nada adentro.
 */
export function Recuerdos({ recuerdos, cronica }: RecuerdosProps) {
  const hayAlgo = GRUPOS.some((g) => recuerdos[g.clave].length > 0);

  return (
    <section className={styles.seccion} aria-label={S.ficha.recuerdos.titulo}>
      <h3 className={styles.titulo}>{S.ficha.cronica.titulo}</h3>
      <p className={styles.campana}>{cronica.titulo}</p>
      <p className={styles.linea}>
        {cronica.finalCanonico !== null
          ? S.ficha.cronica.finalCanonico(cronica.finalCanonico)
          : S.ficha.cronica.sinFinalCanonico}
      </p>
      <p className={styles.linea}>{S.hub.campana.partidas(cronica.partidas)}</p>
      <p className={styles.linea}>{S.hub.campana.finales(cronica.finalesVistos, cronica.finalesTotales)}</p>

      <h3 className={styles.titulo}>{S.ficha.recuerdos.titulo}</h3>
      {hayAlgo ? (
        GRUPOS.map((g) => <Grupo key={g.clave} titulo={g.titulo} lineas={recuerdos[g.clave]} />)
      ) : (
        <p className={styles.vacio}>{S.ficha.sinRecuerdos}</p>
      )}
    </section>
  );
}
