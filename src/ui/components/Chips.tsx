import { ATTR_NAMES, DIFFICULTY_NAMES } from '@/content/catalog';
import type { RollPreview, RollSource } from '@/engine/types';
import { S } from '@/ui/strings.es';
import styles from './Chips.module.css';

export type ChipTono = 'neutral' | 'ventaja' | 'desventaja';

export interface Chip {
  texto: string;
  tono: ChipTono;
  tachado: boolean;
}

function chipDeFuente(fuente: RollSource): Chip {
  return {
    texto: S.tirada.chip.fuente(S.tirada.chip.simbolo[fuente.kind], fuente.label),
    tono: fuente.kind === 'advantage' ? 'ventaja' : 'desventaja',
    tachado: fuente.cancelled,
  };
}

/**
 * Descompone `RollPreview.totalMod` en las partes que lo forman, para que un modificador
 * se vea igual cuando se decide una opción (`OptionList`) y cuando se ve el resultado de
 * la tirada (`RollPanel`): atributo con su propio valor, dificultad aparte (si pesa),
 * Veterano aparte (si pesa) y después cada fuente de ventaja o desventaja con su origen.
 *
 * Identidad que sostiene esta descomposición (ver `buildPreview` en `engine/modifiers.ts`):
 * `attrValue + difficultyMod + veteranMod === totalMod`. Las fuentes no suman al total:
 * cambian el modo de tirada (ventaja/desventaja/anulada), no el número.
 */
export function chipsDeTirada(preview: RollPreview): Chip[] {
  const chips: Chip[] = [
    {
      texto: S.tirada.chip.atributo(ATTR_NAMES[preview.attr], preview.attrValue),
      tono: 'neutral',
      tachado: false,
    },
  ];
  if (preview.difficultyMod !== 0) {
    chips.push({
      texto: S.tirada.chip.dificultad(DIFFICULTY_NAMES[preview.difficulty], preview.difficultyMod),
      tono: 'neutral',
      tachado: false,
    });
  }
  if (preview.veteranMod !== 0) {
    chips.push({ texto: S.tirada.chip.veterano(preview.veteranMod), tono: 'neutral', tachado: false });
  }
  for (const fuente of preview.sources) chips.push(chipDeFuente(fuente));
  return chips;
}

export interface ChipsProps {
  chips: Chip[];
}

/**
 * Fila de chips compartida entre `OptionList` (antes de tirar) y `RollPanel` (después de
 * tirar): el mismo modificador se lee igual en los dos lados. El tachado de una fuente
 * anulada nunca se comunica solo por color: además de `data-tachado` (que el CSS traduce
 * en `text-decoration: line-through`) queda el atributo para que un test lo pueda leer.
 */
export function Chips({ chips }: ChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div className={styles.chips}>
      {chips.map((chip, i) => (
        <span
          key={`${chip.texto}-${i}`}
          className={styles.chip}
          data-tono={chip.tono}
          data-tachado={chip.tachado ? 'true' : 'false'}
        >
          {chip.texto}
        </span>
      ))}
    </div>
  );
}
