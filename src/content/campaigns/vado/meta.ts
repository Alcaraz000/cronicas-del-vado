import type { CampaignMeta } from '@/content/schema';

/**
 * Meta estática de "El vado de Aldamar". El registro la importa sin cargar las escenas.
 *
 * Los valores son los del punto 1 del contrato (`design/01-outline.md` §8) y no son negociables:
 * `id: 'vado'` en particular sostiene a r07, que exige que todo flag de canon empiece con
 * `char:vado.` / `world:vado.`.
 *
 * `hidden` ya no está: era de la Fase C, para no ofrecerle al jugador una campaña cuyo texto
 * todavía decía `TODO`. La Fase D lo saca junto con el cambio de `lintProfile` a `'release'`.
 * Se saca omitiendo la clave, no poniéndola en `false`: el esquema la declara
 * `z.literal(true).optional()`, así que `hidden: false` no valida.
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
  lintProfile: 'release',
};
