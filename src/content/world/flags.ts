/**
 * Espacios de flags compartidos entre campañas. Ninguna campaña los declara en su `flags`:
 * el motor los deriva (met, place, caido) o los escribe la progresión (origen, leyenda).
 * El validador acepta por prefijo cualquier flag que empiece con una de estas claves (sin el asterisco).
 */
export const flags: Record<string, string> = {
  'char:met.*': 'PNJ que el personaje ya conoció: char:met.<idDePnj>. Lo deriva el motor al salir de una escena con ese PNJ.',
  'char:place.*': 'Lugares que el personaje ya visitó: char:place.<idDeLugar>. Lo deriva el motor al salir de una escena en ese lugar.',
  'char:origen.*': 'Rasgos de origen del personaje: char:origen.<idDeRasgo>. Lo escribe la creación de personaje.',
  'char:leyenda': 'El personaje alcanzó el nivel 10.',
  'world:caido.*': 'Un personaje del perfil murió en esa campaña: world:caido.<idDeCampana>. Lo escribe el motor al morir.',
};
