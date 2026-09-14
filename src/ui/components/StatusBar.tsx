import { useState } from 'react';
import { WOUND_LABELS, type ConditionId } from '@/content/catalog';
import { Dialogo } from '@/ui/components/Dialogo';
import { nombresDeCondiciones } from '@/ui/memoria';
import { S } from '@/ui/strings.es';
import styles from './StatusBar.module.css';

export interface StatusBarProps {
  placeName: string;
  wounds: 0 | 1 | 2 | 3;
  fortune: number;
  fortuneMax: number;
  conditions: ConditionId[];
  onAbandon: () => void;
  /** Abre la Ficha (tarea 5). Ver la ficha es seguro en cualquier momento: nunca se deshabilita. */
  onOpenFicha: () => void;
  /**
   * Abre el historial de la partida (tarea 3). Como la Ficha: solo mira, así que tampoco se
   * deshabilita nunca, ni con una tirada pendiente.
   */
  onOpenHistorial: () => void;
  /**
   * true mientras hay una tirada pendiente. El store no limpia `run.pending` al
   * abandonar (tarea 13), así que la UI evita ese camino: en vez de ofrecer
   * "Abandonar", lo deshabilita hasta que la tirada se consolide o se descarte.
   */
  abandonDisabled?: boolean;
}

function marcas(llenas: number, total: number, lleno: string, vacio: string): string {
  return Array.from({ length: total }, (_, i) => (i < llenas ? lleno : vacio)).join(' ');
}

export function StatusBar({
  placeName,
  wounds,
  fortune,
  fortuneMax,
  conditions,
  onAbandon,
  onOpenFicha,
  onOpenHistorial,
  abandonDisabled = false,
}: StatusBarProps) {
  const [confirmando, setConfirmando] = useState(false);
  const nombresCondiciones = nombresDeCondiciones(conditions);
  const sinCondiciones = conditions.length === 0;

  return (
    <header className={styles.barra}>
      <span className={styles.lugar}>{placeName}</span>
      {/* La palabra ("Heridas", "Fortuna") va en su propio `span` para poder sacarla de la
          VISTA en el teléfono: ahí el cromo flota sobre el arte, y con las dos etiquetas
          enteras se va a tres renglones que se comen la mitad del fondo. Lo que NO se toca es
          el valor —las marcas, "Herido", "2/3"—, que es lo que el jugador necesita leer.
          Del árbol de accesibilidad la palabra no se va nunca: las marcas de al lado son
          `aria-hidden`, así que sin ella un lector de pantalla recibiría "2/3" a secas. Cómo
          se esconde (`clip-path`, no `display: none`) está en el bloque de móvil del CSS. */}
      <span className={styles.dato} title={S.barra.heridas}>
        <span className={styles.etiqueta}>{S.barra.heridas}: </span>
        <span aria-hidden="true">{marcas(wounds, 3, '●', '○')}</span> {WOUND_LABELS[wounds]}
      </span>
      <span className={styles.dato} title={S.barra.fortuna}>
        <span className={styles.etiqueta}>{S.barra.fortuna}: </span>
        <span aria-hidden="true">{marcas(fortune, fortuneMax, '◆', '◇')}</span> {fortune}/{fortuneMax}
      </span>
      {/* En la hoja móvil (Fase H, tarea 5; revisado en la oleada final) el lugar y las marcas
          de heridas/Fortuna se quedan siempre. "Condiciones: ..." se oculta con
          `.condicionesVacias` SOLO cuando no hay ninguna: si las hay, tienen que verse en el
          teléfono igual que en escritorio, porque son en su mayoría los costos que esta fase
          agregó (perseguido, empapado, agotado). `.dato` sigue puesta para no perder el
          color/tamaño de las otras dos líneas de la barra. */}
      <span className={`${styles.dato} ${styles.condiciones}${sinCondiciones ? ` ${styles.condicionesVacias}` : ''}`}>
        {S.barra.condiciones}: {nombresCondiciones}
      </span>
      {/* Los dos cajones juntos y el destructivo aparte, al final. "Ficha" e "Historial" se abren
          los dos con una letra (C y H), los dos solo miran y los dos se montan sobre el mismo
          `Cajon`: son la misma clase de cosa y se leen mejor como un par.

          Por qué el historial va ACÁ y no montado sobre el filo de la caja, que era la otra
          candidata. Medido en el navegador a 375×812: el cromo mide 91 px de alto con dos
          botones y 91 px con tres —el grupo pasa de 152 a 233 px y entra en el mismo renglón—,
          y 104 px en los dos casos a 125 % de letra. O sea, a la medida en la que se juega no
          le come ni un píxel más de arte; recién a 150 % suma un renglón (118 → 159 px, un 5 %
          de la pantalla), y ahí el cromo ya venía envuelto igual. Sobre el filo de la caja, en
          cambio, choca con la placa del hablante: con el nombre más ancho del reparto ("Capitán
          Dravos", borde derecho en 221 / 272 / 323 px según la escala) y el botón midiendo
          73 / 90 / 108 px pegado al borde derecho, se pisan 3 px a 125 % y 72 px a 150 %. Y al
          lado de "Saltar lo leído" costaba un renglón fijo de los 298 px de alto que tiene la
          columna de texto en esa pantalla, que es el espacio que menos sobra. */}
      <div className={styles.acciones}>
        <button type="button" className={styles.ficha} onClick={onOpenFicha} title={S.barra.fichaTitulo}>
          {S.barra.ficha}
        </button>
        <button type="button" className={styles.historial} onClick={onOpenHistorial} title={S.barra.historialTitulo}>
          {S.barra.historial}
        </button>
        <button
          type="button"
          className={styles.abandonar}
          onClick={() => setConfirmando(true)}
          disabled={abandonDisabled}
          title={abandonDisabled ? S.barra.abandonarDeshabilitado : undefined}
        >
          {S.barra.abandonar}
        </button>
      </div>
      <Dialogo
        titulo={S.barra.confirmarAbandonoTitulo}
        cuerpo={S.barra.confirmarAbandono}
        confirmar={S.barra.abandonar}
        cancelar={S.comun.cancelar}
        tono="peligro"
        abierto={confirmando}
        onConfirmar={() => {
          setConfirmando(false);
          onAbandon();
        }}
        onCancelar={() => setConfirmando(false)}
      />
    </header>
  );
}
