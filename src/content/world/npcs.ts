import type { Npc } from '@/content/schema';

/**
 * PNJ compartidos entre campañas.
 *
 * Los tres del Vado están acá porque los reutiliza la segunda campaña y porque cada uno tiene razón
 * de ficción para ser global: Orell es la ley de la frontera y sobrevive a todo, Ilse es el vínculo
 * que `char:vado.vinculo_ilse` existe para que alguien lo lea, y Halvar es un antagonista de casa
 * comercial transregional. Ninguna campaña los redeclara en su `npcs`: r07 lo rechaza.
 *
 * Ojo con el marco de memoria: `r08_memory_frame` calcula "PNJ local" como un `speaker` que está en
 * `campaign.npcs` y NO acá, así que un párrafo de Orell, Ilse o Halvar con `met`, `knows` o
 * `endingSeen` COMPILA y rompe el marco igual. Se escriben como si fueran locales.
 */
export const npcs: Record<string, Npc> = {
  orell: {
    id: 'orell',
    name: 'Sargento Orell',
    portrait: 'orell',
    voice:
      'Militar y seca, casi sin adjetivos; frases de una sola cláusula, imperativo o infinitivo. Mide en relevos y guardias. Nunca miente: si no puede decir la verdad se calla con una fórmula ("Eso no te lo puedo decir"). Nunca amenaza con algo que no vaya a cumplir y nunca nombra a Dravos sin el rango. Su enojo se ve en que se calla.',
    canonPrompt:
      'Orell, man of 51, frontier sergeant. Weathered square face, grey beard cropped close, a white scar through the left eyebrow, deep-set tired eyes. Slate-grey gambeson under a short mail shirt, oiled steel that is clean but dented, a plain sergeant’s sash of undyed wool, crossbow strap across the chest. Palette: slate grey, oiled steel, undyed wool, cold blue shadow.',
  },
  ilse: {
    id: 'ilse',
    name: 'Ilse',
    portrait: 'ilse',
    voice:
      'Frases cortas y filosas; contesta antes de que termines. Habla de cosas pesables —sacos, arrobas, escalones— y las usa de metáfora sin avisar. Ironía seca, cero autocompasión: nunca ruega, nunca dice "por favor", y si está por llorar cambia de tema a una tarea.',
    canonPrompt:
      'Ilse, young woman of 19, miller’s helper and mayor’s daughter. Strong jaw, sunburnt nose, copper-red hair in one thick braid over the shoulder, flour dust on the forearms. Mustard-ochre linen dress, sleeves rolled and tied, a man’s leather apron too big for her, a plain cord at the throat. Palette: mustard ochre, copper red, flour white, worn leather brown.',
  },
  halvar: {
    id: 'halvar',
    name: 'Halvar',
    portrait: 'halvar',
    voice:
      'Cortesía comercial excesiva y sintaxis de traducción: el orden de la frase le sale del revés ("Mucho no me gusta, esto"). Vosea igual que todos; lo extranjero está en el orden, no en el pronombre. Mide en monedas y peajes, y todo lo enumera. Muletillas: "amigo", "digamos", "cerremos". Nunca amenaza y nunca dice "no" directo.',
    canonPrompt:
      'Halvar, man of 50, foreign river merchant. Broad pale face, pale blond beard braided in two short plaits, shrewd pale-blue eyes, heavy silver rings on three fingers. Teal-green brocade coat with marten fur at the collar, thick travelling boots, a leather ledger case on a strap across the chest. Palette: teal green, dark fur brown, cold silver, ivory.',
  },
};
