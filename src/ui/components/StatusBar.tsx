import { useState } from 'react';
import { WOUND_LABELS, type ConditionId } from '@/content/catalog';
import { Dialogo } from '@/ui/components/Dialogo';
import { nombresDeCondiciones } from '@/ui/memoria';
import { S } from '@/ui/strings.es';
import styles from './StatusBar.module.css';

export interface StatusBarProps {
  placeName: string;
  /**
   * La línea del objetivo activo, ya derivada por el motor (`objetivoActivo`), o `null` si no hay
   * ninguno. Llega el TEXTO y no el `Objetivo` entero a propósito: la barra no evalúa condiciones
   * ni conoce el vocabulario del contenido, solo dibuja una frase.
   *
   * Con `null` —o sin la prop— no se dibuja NADA: ni la línea ni el hueco donde iría.
   */
  objetivo?: string | null;
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
  objetivo = null,
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
      {/* El lugar y el objetivo son el título de la pantalla: dónde estás y qué estás tratando de
          hacer. Van juntos en una columna para que el objetivo quede DEBAJO del lugar y no se
          mezcle con las marcas en la fila de la barra — no es un dato más, es la línea que
          reemplaza a "recorré el mapa hasta acertar".

          ── LO QUE CUESTA EL CARTEL, MEDIDO ──
          En el navegador, jugando `p_camino` con el objetivo declarado en la campaña. Alto del
          `<header>`, que es lo que el cromo le come al arte:

            1919×905   sin objetivo 68,86 px · con objetivo 87,31 px   (+18,45, una línea)
            375×812    sin objetivo 91,95 px · con uno corto 111,73 px (+19,78, una línea)
                                              con uno largo 143,52 px (+51,57, DOS renglones)

          **Sin objetivo activo no se dibuja nada: ni el `span` ni un hueco.** `.titulo` no tiene
          alto mínimo, así que con un solo hijo mide exactamente lo que mide el lugar (29,27 px en
          escritorio, 26,27 en el teléfono) y el `<header>` queda igual que antes de esta tarea —
          los 91,95 px del teléfono son los mismos «91 px» que midió la Fase H y que están anotados
          más abajo, en el bloque del botón del historial.

          **En el teléfono el LARGO de la línea decide si cuesta uno o dos renglones.** La barra es
          un flex que envuelve: si `.titulo` pasa de ~190 px de ancho, las marcas ya no entran a su
          lado y se van a un renglón propio. Medido a 375 px: «Hablá con Berta, la alcaldesa»
          (29 caracteres) mide 171,36 px y las marcas se quedan al lado; «Cruzá el vado y llegá a
          Aldamar antes de que oscurezca» (54) mide 324,89 px y las empuja abajo, o sea 32 px más
          de cromo. La cuenta del tope: 351 px de renglón − 73,86 (Heridas) − 63,25 (Fortuna) − dos
          huecos de 12 = 189,89. **Los objetivos de la tarea 3 conviene escribirlos cortos.** */}
      <div className={styles.titulo}>
        <span className={styles.lugar}>{placeName}</span>
        {objetivo !== null && (
          <span className={styles.objetivo} data-testid="objetivo">
            {/* La palabra sola, escondida de la VISTA pero no del árbol de accesibilidad (mismo
                patrón que `.etiqueta` en móvil y que el prefijo del hablante en `TextColumn`).
                Sin ella, un lector de pantalla anuncia "Hablá con Berta, la alcaldesa" suelto
                entre el lugar y las Heridas, sin nada que diga qué es esa frase. A la vista
                sobra: el jugador ve una línea en la serif del juego debajo del lugar. */}
            <span className={styles.objetivoEtiqueta}>{S.barra.objetivo}: </span>
            {objetivo}
          </span>
        )}
      </div>
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

          ── LA MEDICIÓN QUE DECIDIÓ DÓNDE VA EL BOTÓN DEL HISTORIAL ──
          Vive acá y en ningún otro lado. Los tests que la invocan referencian este comentario en
          vez de copiar los números: ya divergieron una vez.

          Tomada en el navegador jugando el prólogo a 375×812, clonando el botón dentro del grupo
          y leyendo el alto del `<header>` con y sin él, en las tres escalas de letra:

            escala 1     cromo 91 px con dos botones · 91 px con tres · grupo 152 → 233 px
            escala 1,25  cromo 104 px · 104 px · grupo 187 → 285 px
            escala 1,5   cromo 118 px · 159 px · grupo 222 → 338 px

          O sea: a la medida en la que se juega el tercer botón no le come ni un píxel de arte
          —el grupo entra en el renglón que ya ocupaba—; recién a 150 % se lleva un renglón
          propio (+41 px, un 5 % de la pantalla), y ahí el cromo ya venía envuelto igual. A
          1280×800 el cromo es un solo renglón de 65 px y los tres botones terminan en x=1256 de
          1280: costo cero.

          Las dos alternativas midieron peor. Montado sobre el filo de la caja choca con la placa
          del hablante: con el nombre más ancho del reparto ("Capitán Dravos", borde derecho en
          221 / 272 / 323 px según la escala) y el botón midiendo 73 / 90 / 108 px pegado al borde
          derecho, se pisan 3 px a 125 % y 72 px a 150 %. Y al lado de "Saltar lo leído" costaba
          un renglón fijo (29 px a escala 1, 43 a 150 %) de la columna de texto, que a 375×812
          mide 174 px de alto con las opciones dibujadas —el espacio que menos sobra de la
          pantalla— y encima habría tapado texto, porque sería `sticky` como su vecino. */}
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
