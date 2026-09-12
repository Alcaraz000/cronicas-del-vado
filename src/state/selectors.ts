import {
  ATTRS,
  LIMITS,
  SKILLS,
  isSkillAllowed,
  type Attr,
  type SkillId,
} from '@/content/catalog';
import type { Character, GameState, SeenMap } from '@/engine/types';
import type { PersistedSlice, Store } from '@/state/store';

/**
 * "Sin párrafos vistos" con referencia estable. `selectGameState` se usa con
 * `useShallow` en la UI: si acá devolviéramos un `{}` nuevo por llamada,
 * cada render vería un `seen` distinto y React entraría en bucle.
 */
const EMPTY_SEEN: SeenMap = {};

/** Arma el GameState del personaje activo, o null si no hay personaje activo o no tiene partida en curso. */
export function selectGameState(s: Store): GameState | null {
  const character = s.characters.find((c) => c.id === s.activeCharacterId);
  if (!character || !character.run) return null;
  return {
    world: s.world,
    character,
    run: character.run,
    seen: s.seen[character.run.campaignId] ?? EMPTY_SEEN,
  };
}

/** Reparte un GameState nuevo en las porciones persistidas del store. No muta nada. */
export function writeGameState(s: Store, gs: GameState): Partial<PersistedSlice> {
  const character: Character = { ...gs.character, run: gs.run };
  return {
    world: gs.world,
    characters: s.characters.map((c) => (c.id === character.id ? character : c)),
    seen: { ...s.seen, [gs.run.campaignId]: gs.seen },
  };
}

/** El personaje activo del perfil, o null si no hay ninguno. */
export function selectActiveCharacter(s: PersistedSlice): Character | null {
  return s.characters.find((c) => c.id === s.activeCharacterId) ?? null;
}

/**
 * Por qué una elección de subida de nivel no está disponible. Son códigos, no prosa:
 * el texto que ve el jugador vive en `ui/strings.es.ts`. La UI muestra la opción
 * deshabilitada CON el motivo (spec §4), nunca la esconde sin explicar.
 */
export type MotivoBloqueo = 'techo' | 'debilidad' | 'repetida';

export interface OpcionDePremio<T extends string> {
  id: T;
  enabled: boolean;
  motivo?: MotivoBloqueo;
}

/** Los cuatro atributos con su disponibilidad para el premio de nivel par (techo LIMITS.maxAttr). */
export function atributosParaSubir(character: Character): OpcionDePremio<Attr>[] {
  return ATTRS.map((attr) =>
    character.attrs[attr] >= LIMITS.maxAttr
      ? { id: attr, enabled: false, motivo: 'techo' as const }
      : { id: attr, enabled: true },
  );
}

/**
 * Las doce habilidades con su disponibilidad para el premio de nivel impar: la regla de
 * identidad bloquea las que comparten etiqueta con la Debilidad de la clase, y no se
 * puede elegir dos veces la misma.
 */
export function habilidadesParaElegir(character: Character): OpcionDePremio<SkillId>[] {
  return (Object.keys(SKILLS) as SkillId[]).map((skill) => {
    if (!isSkillAllowed(character.classId, skill)) return { id: skill, enabled: false, motivo: 'debilidad' };
    if (character.skills.includes(skill)) return { id: skill, enabled: false, motivo: 'repetida' };
    return { id: skill, enabled: true };
  });
}

/** Si queda algún premio que el jugador tenga que ELEGIR (fortuna y leyenda son automáticos). */
export function hayPremiosPorElegir(s: Store): boolean {
  const subida = s.ui.subidaPendiente;
  return subida !== null && subida.premios.some((p) => p.kind === 'atributo' || p.kind === 'habilidad');
}
