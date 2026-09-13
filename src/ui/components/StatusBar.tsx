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
  abandonDisabled = false,
}: StatusBarProps) {
  const [confirmando, setConfirmando] = useState(false);
  const nombresCondiciones = nombresDeCondiciones(conditions);

  return (
    <header className={styles.barra}>
      <span className={styles.lugar}>{placeName}</span>
      <span className={styles.dato} title={S.barra.heridas}>
        {S.barra.heridas}: <span aria-hidden="true">{marcas(wounds, 3, '●', '○')}</span> {WOUND_LABELS[wounds]}
      </span>
      <span className={styles.dato} title={S.barra.fortuna}>
        {S.barra.fortuna}: <span aria-hidden="true">{marcas(fortune, fortuneMax, '◆', '◇')}</span> {fortune}/{fortuneMax}
      </span>
      <span className={styles.dato}>
        {S.barra.condiciones}: {nombresCondiciones}
      </span>
      <div className={styles.acciones}>
        <button type="button" className={styles.ficha} onClick={onOpenFicha} title={S.barra.fichaTitulo}>
          {S.barra.ficha}
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
