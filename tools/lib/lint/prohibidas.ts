import type { Campaign } from '@/content/schema';
import { aviso, error, info, type LintCheck, type LintIssue } from './types';
import { normalizar, oraciones, palabras, textosDe, variantes } from './texto';

const PROHIBIDAS = 'prohibidas';
const CLICHES = 'cliches';
const ANACRONISMOS = 'anacronismos';
const CUPOS = 'cupos';
const TICS = 'tics';

/**
 * Biblia §2.6, lista dura: formas peninsulares o neutras que rompen el voseo rioplatense.
 * La biblia dice, con todas las letras, que `lint-text` las grepea **sin contexto**.
 *
 * Las nueve ambiguas (`mira`, `ven`, `haz`, `di`, `sal`, `deja`, `oye`, `espera`, `escucha`) NO están
 * acá a propósito: son homógrafas de formas válidas en tercera persona o de sustantivos y un lint que
 * las busque sueltas falla lotes correctos. Se revisan en la pasada de voz.
 */
export const PALABRAS_PROHIBIDAS: readonly string[] = [
  'tú', 'ti', 'contigo', 'vosotros', 'os', 'vuestro', 'vuestra', 'vuestros', 'vuestras',
  'tienes', 'quieres', 'puedes', 'sabes', 'haces', 'dices', 'vienes', 'eres', 'debes',
  'piensas', 'crees', 'sientes', 'ten', 'pon', 'siéntate', 'cállate', 'fíjate',
  'coger', 'vale', 'chaval', 'tío', 'joder', 'hostia',
];

/** Biblia §2.6, clichés duros. Se buscan como frase sobre el texto normalizado. */
export const CLICHES_DUROS: readonly string[] = [
  'el elegido', 'la profecía', 'el destino quiso', 'un antiguo mal', 'las sombras se ciernen',
  'un escalofrío recorre tu espalda', 'se te hiela la sangre', 'el corazón te late desbocado',
  'tus instintos te gritan', 'el silencio es ensordecedor', 'el tiempo parece detenerse',
  'nada volverá a ser igual', 'poco sabías', 'el aire está cargado de magia',
  'runas que brillan con luz propia', 'ojos como brasas', 'una figura encapuchada',
  'una sonrisa torcida', 'el viento susurra', 'las arenas del tiempo', 'el reino caerá',
];

/** Biblia §2.6, anacronismos y unidades sin ambigüedad posible. */
export const ANACRONISMOS_DUROS: readonly string[] = ['metros', 'metro', 'kilómetros', 'kilómetro', 'ok'];

/**
 * Unidades de tiempo: la biblia las prohíbe **como medida**, no como hora del día ni como ordinal.
 * «a esta hora el río está bajo» y «el segundo arco» son prosa correcta; «dos horas», «unos segundos»
 * y «media hora» no lo son. Por eso solo cuentan cuando las precede un cuantificador.
 */
export const MEDIDAS_DE_TIEMPO: readonly string[] = ['segundo', 'segundos', 'minuto', 'minutos', 'hora', 'horas'];

const CUANTIFICADORES = new Set([
  'un', 'una', 'unos', 'unas', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'doce', 'veinte', 'cien', 'media', 'medio', 'varias', 'varios', 'pocas', 'pocos', 'muchas', 'muchos',
  'algunas', 'algunos', 'cuantas', 'cuantos', 'otras', 'otros', 'cada', 'tres',
]);

/** Cuenta las unidades de tiempo usadas **como medida**: las que llevan un cuantificador delante. */
export function contarMedidaDeTiempo(normalizado: string, unidad: string): number {
  const tokens = palabras(normalizado);
  let total = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] !== unidad) continue;
    const previo = tokens[i - 1];
    if (previo === undefined || !CUANTIFICADORES.has(previo)) continue;
    // «a una hora en que nadie debería estar escribiendo» es la hora del día, no una medida.
    if (tokens[i - 2] === 'a') continue;
    total += 1;
  }
  return total;
}

export interface Cupo { nombre: string; tope: number; frases: readonly string[]; soloDe?: string }

/** Cupos de campaña de la biblia §2.6 y §1.4, en registro corrido sobre toda la prosa escrita. */
export const CUPOS_CAMPANA: readonly Cupo[] = [
  { nombre: 'usted', tope: 8, frases: ['usted'], soloDe: 'pell' },
  { nombre: 'puteadas', tope: 8, frases: ['mierda', 'carajo', 'la puta madre', 'hijo de puta'] },
  { nombre: 'de repente / de pronto', tope: 4, frases: ['de repente', 'de pronto'] },
  { nombre: 'muy', tope: 12, frases: ['muy'] },
  { nombre: 'lentamente / rápidamente', tope: 4, frases: ['lentamente', 'rápidamente'] },
  { nombre: 'parece que', tope: 8, frases: ['parece que'] },
  { nombre: 'como si fuera', tope: 6, frases: ['como si fuera'] },
  { nombre: 'no podés evitar', tope: 2, frases: ['no podés evitar'] },
  { nombre: 'una mezcla de', tope: 1, frases: ['una mezcla de'] },
  { nombre: 'de alguna manera', tope: 2, frases: ['de alguna manera'] },
  { nombre: 'realmente / literalmente / increíblemente / absolutamente', tope: 0, frases: ['realmente', 'literalmente', 'increíblemente', 'absolutamente'] },
];

/** Biblia §2.7: un desenlace nunca arranca con estas fórmulas. */
export const ARRANQUES_VEDADOS: readonly string[] = ['lo lográs', 'fallás', 'conseguís', 'por suerte', 'por desgracia', 'finalmente'];

/** Biblia §2.6: máximo un adverbio en -mente por escena. */
export const TOPE_MENTE_POR_ESCENA = 1;
/** Biblia §2.7: la oración sin verbo tiene cupo de una por escena. */
export const TOPE_SIN_VERBO_POR_ESCENA = 1;

/** Cuenta apariciones de una frase (una o más palabras) en un texto ya normalizado, con borde de palabra. */
export function contarFrase(normalizado: string, frase: string): number {
  const tokens = palabras(frase);
  if (tokens.length === 0) return 0;
  const cuerpo = ` ${normalizado} `;
  const objetivo = ` ${tokens.join(' ')} `;
  let total = 0;
  let desde = 0;
  for (;;) {
    const i = cuerpo.indexOf(objetivo, desde);
    if (i === -1) return total;
    total += 1;
    desde = i + objetivo.length - 1;
  }
}

/** Largo máximo, en palabras, de una oración que la heurística se anima a llamar "sin verbo". */
export const LARGO_MAXIMO_SIN_VERBO = 5;

/**
 * ¿La oración tiene algo que parezca un verbo? Heurística deliberadamente **generosa**: ante la duda
 * dice que sí, porque un falso negativo (una oración sin verbo que no se informa) es mucho más barato
 * que un falso positivo, que empuja al autor a escribir torcido para esquivar el lint. Por eso solo
 * mira oraciones de hasta cinco palabras, que es donde vive el fragmento nominal de verdad
 * («Orden del capitán Dravos.», «Once días.»), y por eso el informe dice que es una heurística.
 */
const FORMAS_VERBALES = new Set([
  'es', 'son', 'era', 'eran', 'fue', 'fueron', 'sos', 'soy', 'sea', 'sean', 'será', 'serán',
  'está', 'están', 'estás', 'estoy', 'estaba', 'estaban', 'estuvo', 'esté', 'estar',
  'hay', 'había', 'hubo', 'haya', 'he', 'has', 'ha', 'han', 'habías', 'habría',
  'va', 'van', 'vas', 'voy', 'iba', 'iban', 'fui', 'vaya', 've', 'ves', 'ven', 'vio', 'vi',
  'da', 'dan', 'das', 'dio', 'di', 'dice', 'dicen', 'decís', 'dijo', 'dijeron',
  'tiene', 'tienen', 'tenés', 'tengo', 'tuvo', 'tenía', 'tenían', 'tené',
  'hace', 'hacen', 'hacés', 'hizo', 'hacía', 'hacé', 'pone', 'ponen', 'puso', 'poné',
  'sabe', 'saben', 'sabés', 'supo', 'sabía', 'puede', 'pueden', 'podés', 'pudo', 'podía',
  'quiere', 'quieren', 'querés', 'quiso', 'queda', 'quedan', 'quedó', 'pasa', 'pasan', 'pasó',
  'suena', 'suenan', 'sonó', 'huele', 'huelen', 'cae', 'caen', 'cayó', 'sube', 'suben', 'subió',
  'baja', 'bajan', 'bajó', 'corre', 'corren', 'corrió', 'mira', 'miran', 'mirá', 'vení', 'andá',
  'abre', 'abren', 'abrió', 'cierra', 'cierran', 'cerró', 'lleva', 'llevan', 'llevó',
  'deja', 'dejan', 'dejó', 'llega', 'llegan', 'llegó', 'sale', 'salen', 'salió', 'entra', 'entran',
  'sigue', 'siguen', 'siguió', 'vuelve', 'vuelven', 'volvió', 'sostiene', 'tira', 'tiran', 'tiró',
  'no', 'sí',
]);

/**
 * Terminaciones que delatan un verbo. Incluye el voseo (`bajás`, `volvés`, `salís`, `mirá`, `vení`),
 * que es la forma dominante de esta campaña, el pretérito (`cedió`, `miró`), el gerundio con clítico
 * (`agarrándote`) y el imperativo con clítico (`sentate`, `traelo`, `acordate`).
 */
const SUFIJOS_VERBALES = /(?:ando|iendo|yendo|ándo\p{L}+|iéndo\p{L}+|ados?|adas?|idos?|idas?|aban?|ían?|aron|ieron|aste|iste|amos|emos|imos|arán?|erán?|irán?|aría|ería|iría|[aei]rse|[aei]rte|[aei]rlos?|[aei]rlas?|[aei]rme|[aei]rnos|[áéí]s|[áéíó]|[aei]te|[aei]lo|[aei]la|[aei]me)$/u;

/** Un clítico o un pronombre sujeto casi nunca viaja sin verbo: «se toma su tiempo», «lo llevo yo». */
const CLITICOS = new Set(['me', 'te', 'se', 'nos', 'le', 'les', 'lo', 'la', 'los', 'las']);

export function pareceSinVerbo(oracion: string): boolean {
  const tokens = palabras(normalizar(oracion));
  if (tokens.length === 0 || tokens.length > LARGO_MAXIMO_SIN_VERBO) return false;
  if (tokens.length > 1 && tokens.some((t, i) => CLITICOS.has(t) && i < tokens.length - 1)) return false;
  return !tokens.some((t) => FORMAS_VERBALES.has(t) || SUFIJOS_VERBALES.test(t) || (t.length > 4 && /(?:ar|er|ir)$/u.test(t)));
}

interface Pieza { sceneId: string; speaker?: string; texto: string; esDesenlace: boolean }

function piezas(campaign: Campaign): Pieza[] {
  const lista: Pieza[] = [];
  for (const scene of Object.values(campaign.scenes)) {
    for (const text of textosDe(scene)) {
      const esDesenlace = text !== scene.text && text !== scene.ending?.epilogue;
      for (const p of text) {
        if (typeof p === 'string') { lista.push({ sceneId: scene.id, texto: p, esDesenlace }); continue; }
        for (const v of p.variants) {
          const pieza: Pieza = p.speaker === undefined
            ? { sceneId: scene.id, texto: v.text, esDesenlace }
            : { sceneId: scene.id, speaker: p.speaker, texto: v.text, esDesenlace };
          lista.push(pieza);
        }
      }
    }
    for (const choice of scene.choices) {
      lista.push({ sceneId: scene.id, texto: choice.label, esDesenlace: false });
      if (choice.lockedHint !== undefined) lista.push({ sceneId: scene.id, texto: choice.lockedHint, esDesenlace: false });
    }
  }
  return lista;
}

export const chequearProhibidas: LintCheck = (campaign) => {
  const issues: LintIssue[] = [];
  const todas = piezas(campaign);

  // --- lista dura de peninsularismos ---
  for (const pieza of todas) {
    const norm = normalizar(pieza.texto);
    for (const palabra of PALABRAS_PROHIBIDAS) {
      const n = contarFrase(norm, palabra);
      if (n > 0) {
        issues.push(error(PROHIBIDAS, `«${palabra}» ×${n} (biblia §2.6, lista dura): «${recorte(pieza.texto, palabra)}»`, pieza.sceneId));
      }
    }
  }

  // --- clichés ---
  for (const pieza of todas) {
    const norm = normalizar(pieza.texto);
    for (const frase of CLICHES_DUROS) {
      const n = contarFrase(norm, frase);
      if (n > 0) issues.push(error(CLICHES, `cliché «${frase}» ×${n}: «${recorte(pieza.texto, frase)}»`, pieza.sceneId));
    }
  }

  // --- anacronismos y unidades ---
  for (const pieza of todas) {
    const norm = normalizar(pieza.texto);
    for (const palabra of ANACRONISMOS_DUROS) {
      const n = contarFrase(norm, palabra);
      if (n > 0) issues.push(error(ANACRONISMOS, `unidad o anacronismo «${palabra}» ×${n} (biblia §2.6): «${recorte(pieza.texto, palabra)}»`, pieza.sceneId));
    }
    for (const unidad of MEDIDAS_DE_TIEMPO) {
      const n = contarMedidaDeTiempo(norm, unidad);
      if (n > 0) issues.push(error(ANACRONISMOS, `el tiempo no se mide en «${unidad}» (biblia §2.6) ×${n}: «${recorte(pieza.texto, unidad)}»`, pieza.sceneId));
    }
  }

  // --- cupos de campaña, en registro corrido ---
  for (const cupo of CUPOS_CAMPANA) {
    let total = 0;
    const donde = new Map<string, number>();
    const ajenas: string[] = [];
    for (const pieza of todas) {
      const norm = normalizar(pieza.texto);
      let n = 0;
      for (const frase of cupo.frases) n += contarFrase(norm, frase);
      if (n === 0) continue;
      total += n;
      donde.set(pieza.sceneId, (donde.get(pieza.sceneId) ?? 0) + n);
      if (cupo.soloDe !== undefined && pieza.speaker !== cupo.soloDe) ajenas.push(`${pieza.sceneId}${pieza.speaker === undefined ? ' (narrador)' : ` (${pieza.speaker})`}`);
    }
    const detalle = [...donde].map(([id, n]) => `${id}×${n}`).join(' · ');
    if (total > cupo.tope) {
      issues.push(error(CUPOS, `«${cupo.nombre}»: ${total} usos contra un cupo de ${cupo.tope} — ${detalle}`));
    } else if (total > 0) {
      issues.push(info(CUPOS, `«${cupo.nombre}»: ${total}/${cupo.tope} — ${detalle}`));
    }
    if (ajenas.length > 0) {
      // Aviso y no error: el narrador puede estar citando al dueño («repite lo que le hicieron
      // aprender: "usted disculpe"»), que es prosa correcta y frecuente en esta campaña.
      issues.push(aviso(CUPOS, `«${cupo.nombre}» tiene dueño (${cupo.soloDe ?? '?'}) y aparece fuera de su boca — revisar si es una cita: ${[...new Set(ajenas)].join(', ')}`));
    }
  }

  // --- tics con cupo por escena ---
  for (const scene of Object.values(campaign.scenes)) {
    let mente = 0;
    let sinVerbo = 0;
    const ejemplosMente: string[] = [];
    const ejemplosSinVerbo: string[] = [];
    for (const text of textosDe(scene)) {
      for (const v of variantes(text)) {
        for (const t of palabras(normalizar(v.text))) {
          if (t.length > 6 && t.endsWith('mente')) { mente += 1; ejemplosMente.push(t); }
        }
        for (const o of oraciones(v.text)) {
          if (pareceSinVerbo(o)) { sinVerbo += 1; ejemplosSinVerbo.push(o.trim()); }
        }
      }
    }
    if (mente > TOPE_MENTE_POR_ESCENA) {
      issues.push(aviso(TICS, `${mente} adverbios en -mente (tope ${TOPE_MENTE_POR_ESCENA} por escena): ${[...new Set(ejemplosMente)].join(', ')}`, scene.id));
    }
    if (sinVerbo > TOPE_SIN_VERBO_POR_ESCENA) {
      issues.push(aviso(TICS, `${sinVerbo} oraciones sin verbo (cupo ${TOPE_SIN_VERBO_POR_ESCENA} por escena, heurística): ${ejemplosSinVerbo.slice(0, 4).map((o) => `«${o}»`).join(' · ')}`, scene.id));
    }
  }

  // --- arranques vedados de desenlace (biblia §2.7) ---
  for (const pieza of todas) {
    if (!pieza.esDesenlace) continue;
    const norm = normalizar(pieza.texto);
    for (const vedado of ARRANQUES_VEDADOS) {
      if (norm === vedado || norm.startsWith(`${vedado} `)) {
        issues.push(aviso(TICS, `un desenlace arranca con «${vedado}», vedado por la biblia §2.7`, pieza.sceneId));
      }
    }
  }
  return issues;
};

function recorte(texto: string, alrededorDe: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  const i = limpio.toLocaleLowerCase('es').indexOf(palabras(alrededorDe)[0] ?? '');
  const desde = Math.max(0, i - 28);
  const trozo = limpio.slice(desde, desde + 72);
  return `${desde > 0 ? '…' : ''}${trozo}${desde + 72 < limpio.length ? '…' : ''}`;
}
