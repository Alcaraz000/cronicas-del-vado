import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useStore } from '@/state/store';
import { S } from '@/ui/strings.es';
import styles from './OpcionesModal.module.css';

export interface OpcionesModalProps {
  onCerrar: () => void;
}

/** `2026-09-12`, para el nombre del archivo. */
function hoy(): string {
  const d = new Date();
  const dos = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/**
 * Baja el guardado como archivo. Devuelve false donde el navegador no deja
 * (o en jsdom, que no implementa createObjectURL): ahí el texto de la caja de
 * abajo sigue siendo la vía de salida, así que nunca se pierde el guardado.
 */
function descargar(json: string, nombre: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opciones (spec §6): preferencias de lectura, más exportar e importar el guardado.
 *
 * Los cuatro controles de preferencias son grupos de radios (no `select`): con dos o tres
 * valores nada más, conviene verlos todos de una. Cada uno lee y escribe directo con
 * `setPrefs`, sin estado propio.
 *
 * `exportSave` arma el JSON y `importSave` lo valida con zod y migra; la pantalla solo
 * muestra el motivo cuando el store dice que no.
 */
export function OpcionesModal({ onCerrar }: OpcionesModalProps) {
  const exportSave = useStore((s) => s.exportSave);
  const importSave = useStore((s) => s.importSave);
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);

  const tituloId = useId();
  const grupoCps = useId();
  const grupoFontScale = useId();
  const grupoReducedMotion = useId();
  const grupoShowOdds = useId();
  const cerrarRef = useRef<HTMLButtonElement>(null);

  const [guardado] = useState<string>(() => exportSave());
  const [pegado, setPegado] = useState('');
  const [aviso, setAviso] = useState<{ tono: 'error' | 'exito'; texto: string } | null>(null);

  useEffect(() => {
    cerrarRef.current?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCerrar();
      }
    },
    [onCerrar],
  );

  const alDescargar = (): void => {
    const ok = descargar(guardado, S.ajustes.exportar.nombreArchivo(hoy()));
    setAviso(ok ? null : { tono: 'error', texto: S.ajustes.exportar.sinDescarga });
  };

  const alImportar = (): void => {
    if (pegado.trim() === '') {
      setAviso({ tono: 'error', texto: S.ajustes.importar.vacio });
      return;
    }
    const r = importSave(pegado);
    // Con `ok` el store ya se reemplazó entero y volvió al inicio: el modal se va con él.
    if (r.ok) setAviso({ tono: 'exito', texto: S.ajustes.importar.exito });
    else setAviso({ tono: 'error', texto: S.ajustes.importar.error(r.error ?? '') });
  };

  return (
    <div
      className={styles.fondo}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className={styles.caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onKeyDown={onKeyDown}
      >
        <header className={styles.cabecera}>
          <h2 id={tituloId} className={styles.titulo}>
            {S.ajustes.titulo}
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            className={styles.secundario}
            data-testid="cerrar-opciones"
            onClick={onCerrar}
          >
            {S.ajustes.cerrar}
          </button>
        </header>

        {aviso !== null && (
          <p className={styles.aviso} data-tono={aviso.tono} role="alert">
            {aviso.texto}
          </p>
        )}

        <section className={styles.seccion}>
          <h3 className={styles.subtitulo}>{S.ajustes.preferencias.titulo}</h3>

          <fieldset className={styles.grupo}>
            <legend>{S.ajustes.preferencias.maquinaDeEscribir.leyenda}</legend>
            {/* `cps` es `number` sin acotar en el guardado: cualquier valor que no sea 0
                cuenta como "Normal", así un guardado importado con un cps intermedio
                (p. ej. 20) no deja el grupo sin ninguna opción marcada. */}
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoCps}
                checked={prefs.cps !== 0}
                onChange={() => setPrefs({ cps: 40 })}
              />
              {S.ajustes.preferencias.maquinaDeEscribir.normal}
            </label>
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoCps}
                checked={prefs.cps === 0}
                onChange={() => setPrefs({ cps: 0 })}
              />
              {S.ajustes.preferencias.maquinaDeEscribir.instantaneo}
            </label>
          </fieldset>

          <fieldset className={styles.grupo}>
            <legend>{S.ajustes.preferencias.tamanoDeLetra.leyenda}</legend>
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoFontScale}
                checked={prefs.fontScale === 1}
                onChange={() => setPrefs({ fontScale: 1 })}
              />
              {S.ajustes.preferencias.tamanoDeLetra.n100}
            </label>
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoFontScale}
                checked={prefs.fontScale === 1.25}
                onChange={() => setPrefs({ fontScale: 1.25 })}
              />
              {S.ajustes.preferencias.tamanoDeLetra.n125}
            </label>
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoFontScale}
                checked={prefs.fontScale === 1.5}
                onChange={() => setPrefs({ fontScale: 1.5 })}
              />
              {S.ajustes.preferencias.tamanoDeLetra.n150}
            </label>
          </fieldset>

          <fieldset className={styles.grupo}>
            <legend>{S.ajustes.preferencias.movimiento.leyenda}</legend>
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoReducedMotion}
                checked={prefs.reducedMotion === 'auto'}
                onChange={() => setPrefs({ reducedMotion: 'auto' })}
              />
              {S.ajustes.preferencias.movimiento.segunElSistema}
            </label>
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoReducedMotion}
                checked={prefs.reducedMotion === 'on'}
                onChange={() => setPrefs({ reducedMotion: 'on' })}
              />
              {S.ajustes.preferencias.movimiento.reducidoSiempre}
            </label>
          </fieldset>

          <fieldset className={styles.grupo}>
            <legend>{S.ajustes.preferencias.probabilidades.leyenda}</legend>
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoShowOdds}
                checked={prefs.showOdds}
                onChange={() => setPrefs({ showOdds: true })}
              />
              {S.ajustes.preferencias.probabilidades.si}
            </label>
            <label className={styles.opcion}>
              <input
                type="radio"
                name={grupoShowOdds}
                checked={!prefs.showOdds}
                onChange={() => setPrefs({ showOdds: false })}
              />
              {S.ajustes.preferencias.probabilidades.no}
            </label>
          </fieldset>
        </section>

        <section className={styles.seccion}>
          <h3 className={styles.subtitulo}>{S.ajustes.exportar.titulo}</h3>
          <p className={styles.ayuda}>{S.ajustes.exportar.ayuda}</p>
          <button type="button" className={styles.primario} data-testid="descargar-guardado" onClick={alDescargar}>
            {S.ajustes.exportar.descargar}
          </button>
          <label className={styles.etiqueta} htmlFor="opciones-exportado">
            {S.ajustes.exportar.etiquetaTexto}
          </label>
          <textarea
            id="opciones-exportado"
            className={styles.texto}
            data-testid="guardado-exportado"
            readOnly
            rows={6}
            value={guardado}
          />
        </section>

        <section className={styles.seccion}>
          <h3 className={styles.subtitulo}>{S.ajustes.importar.titulo}</h3>
          <p className={styles.ayuda}>{S.ajustes.importar.ayuda}</p>
          <label className={styles.etiqueta} htmlFor="opciones-importar">
            {S.ajustes.importar.etiquetaTexto}
          </label>
          <textarea
            id="opciones-importar"
            className={styles.texto}
            data-testid="guardado-para-importar"
            rows={6}
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
          />
          <button type="button" className={styles.primario} data-testid="importar-guardado" onClick={alImportar}>
            {S.ajustes.importar.boton}
          </button>
        </section>
      </div>
    </div>
  );
}
