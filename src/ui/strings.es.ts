/**
 * Todas las cadenas de la interfaz en español. Ningún componente escribe texto
 * de UI "a mano": lo toma de acá. Las funciones son plantillas con parámetros.
 */
export const S = {
  titulo: 'Crónicas del Vado — prototipo',
  inicio: {
    continuar: 'Continuar',
    nuevaPrueba: 'Nueva partida de prueba',
    jugarCampana: (titulo: string): string => `Jugar «${titulo}»`,
    sinPersonaje: 'Todavía no hay personaje. Cualquiera de las dos opciones crea uno (mago de nivel 3).',
    personajeActivo: (nombre: string, clase: string, nivel: number): string =>
      `${nombre} · ${clase} · nivel ${nivel}`,
  },
  cargando: 'Cargando…',
  error: {
    titulo: 'Algo salió mal',
    generico: 'Error desconocido',
    reintentar: 'Reintentar',
    recargar: 'Recargar la página',
  },
  barra: {
    heridas: 'Heridas',
    fortuna: 'Fortuna',
    condiciones: 'Condiciones',
    sinCondiciones: 'sin condiciones',
    abandonar: 'Abandonar',
    abandonarDeshabilitado: 'No podés abandonar mientras hay una tirada en curso',
    confirmarAbandono: 'Si abandonás, la campaña se pierde. Tu personaje conserva lo suyo. ¿Abandonar?',
  },
  opciones: {
    titulo: 'Opciones',
    yaElegida: '· ya elegida',
    exito: 'Éxito',
    conCosto: 'Con costo',
    fallo: 'Fallo',
    mortal: '☠',
    mortalTitulo: 'Lleva a una escena mortal',
    riesgo: { seguro: 'Seguro', arriesgado: 'Arriesgado', peligroso: 'Peligroso' },
    confirmMortal: {
      0: 'Estás sano: un Fallo te deja Malherido.',
      1: 'Estás Herido: un Fallo te deja fuera de la campaña.',
      2: 'Estás Malherido: un Fallo acá te mata.',
      3: 'Estás Malherido: un Fallo acá te mata.',
    },
  },
  tirada: {
    titulo: 'Tirada',
    total: 'Total',
    continuar: 'Continuar',
    repetir: (numeroDado: number): string => `Fortuna: repetir dado ${numeroDado}`,
    poder: (nombre: string): string => `Usar Poder (${nombre})`,
    banda: {
      crit: '¡Crítico!',
      success: 'Éxito',
      partial: 'Con costo',
      failure: 'Fallo',
      fumble: 'Fallo grave',
    },
    modo: {
      normal: 'Tirada normal: 2d6',
      advantage: 'Con ventaja: 3d6, se conservan los 2 mayores',
      disadvantage: 'Con desventaja: 3d6, se conservan los 2 menores',
      cancelled: 'Ventaja y desventaja se anulan: 2d6',
    },
  },
  log: {
    dados: 'Dados',
    total: 'Total',
    fortunaGastada: (n: number): string => (n === 1 ? '1 Fortuna gastada' : `${n} Fortuna gastadas`),
    poderUsado: 'Poder usado',
  },
  fin: {
    final: 'Final',
    derrota: 'Caíste. La campaña se pierde, tu personaje sigue.',
    muerte: 'Tu personaje ha muerto.',
    volver: 'Volver al inicio',
  },
  placeholder: {
    fondo: 'Fondo',
    retrato: 'Retrato',
  },
} as const;
