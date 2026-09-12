import { useEffect, useState } from 'react';
import { cargarImagen, existeImagen, type TipoImagen } from '@/ui/assets';
import { Placeholder } from '@/ui/components/Placeholder';
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
 */
export function Imagen({ tipo, id, aspect, alt }: ImagenProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!existeImagen(tipo, id)) return;
    let vivo = true;
    void cargarImagen(tipo, id).then((resuelta) => {
      if (vivo) setUrl(resuelta);
    });
    return () => {
      vivo = false;
    };
  }, [tipo, id]);

  if (url === null) {
    return <Placeholder label={alt} aspect={aspect} />;
  }

  return (
    <div className={styles.marco} data-aspect={aspect}>
      {/* Si la URL igual falla en el navegador (archivo roto, etc.), cae al placeholder. */}
      <img src={url} alt={alt} loading="lazy" className={styles.imagen} onError={() => setUrl(null)} />
    </div>
  );
}
