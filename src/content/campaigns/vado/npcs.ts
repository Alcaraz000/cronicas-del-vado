import type { Npc } from '@/content/schema';

/**
 * Los cinco PNJ propios de "El vado de Aldamar" (biblia §3).
 *
 * `orell`, `ilse` y `halvar` NO están acá: viven en `src/content/world/npcs.ts` porque los reutiliza
 * la segunda campaña, y r07 rechaza que una campaña redeclare un id del mundo. El motor resuelve
 * PNJ contra WORLD ∪ campaña, así que las escenas los nombran igual.
 *
 * Trampa de ids ya conocida: `tome` y `mausi` van SIN tilde en el id (y en `speaker`, en `met:` y en
 * los nombres de archivo de arte); los nombres visibles sí llevan "Tomé" y "Mausi".
 */
export const npcs: Record<string, Npc> = {
  berta: {
    id: 'berta',
    name: 'Berta',
    portrait: 'berta',
    voice:
      'Registro administrativo con calidez de pueblo; frases largas y bien armadas, con cifras adentro, y plural institucional ("el pueblo", "nosotros"). Abre con "mirá" y cierra con "y bueno". Mide en días y bolsas. Nunca dice "no sé" y nunca pide perdón.',
    canonPrompt:
      'Berta, woman of 58, mayor of a river village. Broad face, deep vertical frown lines, iron-grey hair pinned back tight under a dark wool coif. Heavy burgundy wool overdress, cream linen collar, a tarnished brass chain of office worn like a necklace, ink-stained right hand. Palette: wine red, iron grey, warm cream, dull brass.',
  },
  dravos: {
    id: 'dravos',
    name: 'Capitán Dravos',
    portrait: 'dravos',
    voice:
      'Cortés y culto, sin una palabra alta. Evita el "yo": "hay que", "corresponde", "lo que falta entender es". Mide en meses de sueldo atrasado y en hombres, nunca en monedas: el precio lo dice Halvar. Reformula lo que decís antes de contestarte. Nunca grita ni amenaza de frente: describe lo que va a pasar igual.',
    canonPrompt:
      'Dravos, man of 44, garrison captain. Lean face, cropped black hair greying at the temples, a thin nose broken once and set well, close-shaved. Deep indigo-black surcoat over a riveted brigandine, silver captain’s clasp at the shoulder, grey riding gloves tucked in the belt, no jewellery. Palette: indigo black, cold silver, dark steel, a single thread of dried-blood red at the cuff.',
  },
  tome: {
    id: 'tome',
    name: 'Tomé',
    portrait: 'tome',
    voice:
      'Cálida, de oficio, con refranes de harina y de piedra; mide en dedos de agua. Se repite, se corrige, se ríe de sí mismo y usa el "viste" para buscar compañía en el que lee. En el cuaderno la sintaxis se le rompe día a día hasta quedar en una línea por página. Nunca culpa a nadie que no sea él y nunca nombra a Ilse por escrito.',
    canonPrompt:
      'Tomé, man of 46, village miller, seen in memory and in portraits of the dead. Round kind face, thick dark eyebrows, three days of stubble, deep laugh lines, a chipped front tooth. Bleached flour-dusted linen shirt, sleeves pushed up over heavy forearms, a canvas apron white with flour, a leather cord at the neck with an empty setting where a stone is missing. Palette: flour white, warm oak brown, dusty grain gold.',
  },
  mausi: {
    id: 'mausi',
    name: 'Mausi',
    portrait: 'mausi',
    voice:
      'Rápida y siempre haciendo otra cosa mientras habla. Mide en jarras. Preguntas retóricas, diminutivos y el chisme con estructura defensiva: "Yo no digo nada, ¿eh?, pero…". Nunca da un nombre propio si hay gente escuchando y nunca te deja el vaso vacío. Es la única que putea suelta.',
    canonPrompt:
      'Mausi, woman of 39, riverside tavern keeper. Round flushed face, sharp quick eyes, dark hair escaping from a rust-orange headscarf, soot smudge on one cheek, forearms scalded pink from washing. Rust-orange scarf, undyed linen shirt with rolled sleeves, a leather apron shiny with grease, a brass tap key hanging from her belt. Palette: rust orange, greasy leather brown, soot black, copper.',
  },
  pell: {
    id: 'pell',
    name: 'Pell',
    portrait: 'pell',
    voice:
      'Atropellada: empieza una frase, la corrige y la vuelve a empezar. Trata de usted y se le mezcla con el voseo (es el único con cupo de "usted"). Mide en ordenanzas numeradas y las recita cuando se pone nervioso, que es siempre. Nunca dice que no a una orden: dice que sí y después no la cumple bien, y nunca termina una puteada.',
    canonPrompt:
      'Pell, boy of 17, village militia guard. Thin freckled face, straw-blond hair cut badly by himself, ears that stick out, the first uneven attempt at a beard. Undyed leather jerkin two sizes too big over a russet tunic, a spear he holds too tight, a helmet that slips down over the eyebrows. Palette: straw yellow, russet brown, undyed leather, pale grey steel.',
  },
};
