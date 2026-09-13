import { useEffect, useState } from 'react';
import { cargarImagen, existeImagen, type TipoImagen } from '@/ui/assets';
import { Placeholder } from '@/ui/components/Placeholder';
import { useReducedMotion } from '@/ui/hooks/useReducedMotion';
import styles from './Imagen.module.css';

export interface ImagenProps {
  tipo: TipoImagen;
  id: string;
  aspect: '16:9' | '3:4';
  /** Texto accesible. Tiene que ser útil (un nombre, no el id crudo): sirve de `alt` y, si no hay arte, de etiqueta del placeholder. */
  alt: string;
}

/**
 * Arte real cuando existe; si no, la misma caja gris de siempre (`Placeholder`), sin romper
 * nada — la campaña de humo `prueba` no tiene arte y tiene que seguir jugándose igual.
 *
 * La imagen se pide con `loading="lazy"` y el marco reserva el espacio por `aspect-ratio`
 * antes de que la URL resuelva, así que el layout no salta ni mientras carga.
 *
 * El cambio de una imagen a otra (fondo de escena, retrato) no pisa lo que se ve hasta que
 * la nueva terminó de decodificar: `mostrado` solo se actualiza después de `img.decode()`,
 * así que la vieja se queda en pantalla en vez de parpadear a un placeholder o pintarse a
 * medio cargar. Una vez lista, `key={mostrado}` fuerza un `<img>` nuevo y la animación de
 * `Imagen.module.css` lo hace entrar con un fundido corto; con `useReducedMotion()`, ese
 * mismo CSS lo corta por el atributo `data-reducida` que se escribe más abajo. Los dados
 * llegan al mismo lugar por otro camino: `RollPanel` ya resuelve la preferencia antes de
 * pasarles la prop `girando`, así que `Dados` no necesita ningún `data-reducida` propio.
 *
 * `HTMLImageElement.decode` no existe en jsdom: la guarda `img.decode?.() ?? Promise.resolve()`
 * hace que el componente se porte igual en los tests (resuelve enseguida) que en el navegador.
 *
 * `mostrado` guarda la URL junto con el `alt` que le corresponde (no el `alt` del último
 * render): si guardara solo la URL, el `alt` de la prop cambiaría apenas el componente vuelve
 * a renderizar con el `id` nuevo, mientras la imagen vieja sigue ahí — un lector de pantalla
 * anunciaría el nombre nuevo sobre la imagen vieja. Los dos cambian juntos, recién cuando la
 * nueva terminó de decodificar.
 */
export function Imagen({ tipo, id, aspect, alt }: ImagenProps) {
  const [mostrado, setMostrado] = useState<{ url: string; alt: string } | null>(null);
  const reducida = useReducedMotion();

  useEffect(() => {
    if (!existeImagen(tipo, id)) {
      setMostrado(null);
      return;
    }
    let vivo = true;
    void cargarImagen(tipo, id).then(async (resuelta) => {
      if (resuelta === null) {
        if (vivo) setMostrado(null);
        return;
      }
      try {
        const previa = new Image();
        previa.src = resuelta;
        await (previa.decode?.() ?? Promise.resolve());
        if (vivo) setMostrado({ url: resuelta, alt });
      } catch {
        // Archivo roto o que no cargó: mismo destino que un error de la imagen ya montada.
        if (vivo) setMostrado(null);
      }
    });
    return () => {
      vivo = false;
    };
    // `alt` no entra en las dependencias a propósito: lo que dispara la carga es el par
    // tipo/id, y el `alt` que importa es el que corresponde a ESE par, capturado por el
    // cierre de esta misma llamada del efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, id]);

  if (mostrado === null) {
    return <Placeholder label={alt} aspect={aspect} />;
  }

  return (
    <div className={styles.marco} data-aspect={aspect}>
      {/* Si la URL igual falla en el navegador (archivo roto, etc.), cae al placeholder. */}
      <img
        key={mostrado.url}
        src={mostrado.url}
        alt={mostrado.alt}
        loading="lazy"
        className={styles.imagen}
        data-reducida={reducida ? 'true' : 'false'}
        onError={() => setMostrado(null)}
      />
    </div>
  );
}
