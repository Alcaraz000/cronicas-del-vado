import type { CampaignMeta } from '@/content/schema';

/**
 * Meta estática de "El vado de Aldamar". El registro la importa sin cargar las escenas.
 *
 * Los valores son los del punto 1 del contrato (`design/01-outline.md` §8) y no son negociables:
 * `id: 'vado'` en particular sostiene a r07, que exige que todo flag de canon empiece con
 * `char:vado.` / `world:vado.`.
 *
 * `hidden: true` es de la Fase C: mientras el texto de las escenas sea `TODO`, la campaña no se
 * le ofrece al jugador. La Fase D lo saca junto con el cambio de `lintProfile` a `'release'`.
 */
export const meta: CampaignMeta = {
  id: 'vado',
  contentVersion: 1,
  title: 'El vado de Aldamar',
  premise:
    'Una carta lacrada de Berta, alcaldesa de Aldamar, te promete plata por encontrar a Tomé, el molinero, que hace once días que no aparece. En dos noches descubrís que bajo el molino hay un sello antiguo que contiene la crecida del río, y a la tercera, con la tormenta encima, decidís quién se queda con él, quién cruza el vado y quién no vuelve.',
  cover: 'molino_de_tome',
  levelRange: [1, 3],
  durationMin: [30, 45],
  lethalScenes: 1,
  lintProfile: 'smoke',
  hidden: true,
};
