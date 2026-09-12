/** Flags propios de la campaña de humo. Los `run:` mueren con la partida; el `char:prueba.*` se apuesta y se vuelve canon al terminar por un final. */
export const flags: Record<string, string> = {
  'run:tiene_pista': 'Leíste la inscripción del dintel: sabés que la llave de hierro abre la puerta de la escalera.',
  'run:centinela_vencido': 'El centinela ya no bloquea la escalera (lo convenciste, lo venciste o lo trabaste afuera).',
  'run:centinela_abatido': 'La pelea con el centinela es el camino: le conectaste al menos un golpe y todavía nadie la resolvió por las buenas. Lo fija todo desenlace que suma al reloj `pelea` y lo limpia toda resolución pacífica, así que cuando el reloj se llena marca que lo dejaste tirado en el patio, a diferencia de convencerlo o trabarlo afuera.',
  'char:prueba.vio_la_cripta': 'Estudiaste las runas del escalón y conocés el plano del puente de la cripta.',
};
