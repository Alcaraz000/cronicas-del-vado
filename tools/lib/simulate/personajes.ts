import {
  ATTRS,
  CLASSES,
  LIMITS,
  SKILLS,
  TRAITS,
  isSkillAllowed,
  isTraitAllowed,
  type Attr,
  type ClassId,
  type SkillId,
  type TraitId,
} from '@/content/catalog';
import type { Character } from '@/engine/types';

/** Rasgos que la regla de identidad le permite a la clase, en el orden del catálogo. */
export function rasgosPermitidos(classId: ClassId): TraitId[] {
  return (Object.keys(TRAITS) as TraitId[]).filter((t) => isTraitAllowed(classId, t));
}

/** Habilidades que la regla de identidad le permite a la clase, en el orden del catálogo. */
export function habilidadesPermitidas(classId: ClassId): SkillId[] {
  return (Object.keys(SKILLS) as SkillId[]).filter((s) => isSkillAllowed(classId, s));
}

/** Todos los pares de rasgos posibles para la clase, en orden fijo: 7 sobre 2 = 21 pares. */
export function paresDeRasgos(classId: ClassId): [TraitId, TraitId][] {
  const permitidos = rasgosPermitidos(classId);
  const pares: [TraitId, TraitId][] = [];
  for (let i = 0; i < permitidos.length; i += 1) {
    for (let j = i + 1; j < permitidos.length; j += 1) {
      pares.push([permitidos[i] as TraitId, permitidos[j] as TraitId]);
    }
  }
  return pares;
}

/** Reparto inicial 2/1/1/0 con el 2 en el atributo de la clase (spec §4). */
function repartoInicial(classId: ClassId): Record<Attr, number> {
  const principal = CLASSES[classId].attr;
  const resto = ATTRS.filter((a) => a !== principal);
  const attrs = { vigor: 0, astucia: 0, saber: 0, presencia: 0 } satisfies Record<Attr, number>;
  attrs[principal] = 2;
  const sobrantes = [1, 1, 0];
  resto.forEach((a, i) => {
    attrs[a] = sobrantes[i] ?? 0;
  });
  return attrs;
}

/**
 * Personaje determinista para una carrera. Mismo `carrera` = mismo personaje, siempre.
 *
 * Los rasgos (y la habilidad de nivel 3) ROTAN con el índice de la carrera: sin eso las 500 carreras
 * de una combinación tendrían el mismo personaje y las opciones `[Origen]` y `[Habilidad]` no se
 * visitarían nunca. Rotar cubre los 21 pares de rasgos de cada clase.
 *
 * Subir de nivel sigue la regla de `premiosPorSubir`: niveles pares +1 atributo (al de la clase,
 * hasta el techo; si llegó al techo, al siguiente que pueda), impares una habilidad permitida.
 */
export function personajeDeCarrera(classId: ClassId, nivel: number, carrera: number): Character {
  const pares = paresDeRasgos(classId);
  const par = pares[carrera % pares.length] as [TraitId, TraitId];
  const attrs = repartoInicial(classId);
  const habilidades = habilidadesPermitidas(classId);
  const skills: SkillId[] = [];

  for (let n = 2; n <= nivel; n += 1) {
    if (n % 2 === 0) {
      const destino = ATTRS.find((a) => attrs[a] < LIMITS.maxAttr && a === CLASSES[classId].attr)
        ?? ATTRS.find((a) => attrs[a] < LIMITS.maxAttr);
      if (destino !== undefined) attrs[destino] += 1;
    } else {
      const elegida = habilidades[(carrera + skills.length) % habilidades.length];
      if (elegida !== undefined && !skills.includes(elegida)) skills.push(elegida);
    }
  }

  return {
    id: `sim_${classId}_${nivel}_${carrera}`,
    name: `${CLASSES[classId].name} ${carrera}`,
    portrait: `${classId}_01`,
    classId,
    attrs,
    traits: [...par],
    skills,
    level: nivel,
    xp: LIMITS.xpPerLevel * (nivel - 1),
    flags: par.map((t) => `char:origen.${t}`),
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
  };
}
