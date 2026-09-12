import type { Tag } from '@/content/catalog';

/**
 * Nombre visible de cada tag. El catálogo guarda los ids (`engano`, `percepcion`);
 * la interfaz nunca los muestra crudos.
 */
const TAGS_ES: Record<Tag, string> = {
  fisico: 'Físico',
  sigilo: 'Sigilo',
  percepcion: 'Percepción',
  social: 'Social',
  engano: 'Engaño',
  saber: 'Saber',
  magia: 'Magia',
  fe: 'Fe',
  supervivencia: 'Supervivencia',
  huida: 'Huida',
};

/**
 * Todas las cadenas de la interfaz en español. Ningún componente escribe texto
 * de UI "a mano": lo toma de acá. Las funciones son plantillas con parámetros.
 */
export const S = {
  titulo: 'Crónicas del Vado — prototipo',
  tags: TAGS_ES,
  /** Cadenas compartidas por más de una superficie (Cajon, Dialogo, y lo que venga). */
  comun: {
    cerrar: 'Cerrar',
    cancelar: 'Cancelar',
    confirmar: 'Confirmar',
  },
  inicio: {
    continuar: 'Continuar',
    campanas: 'Campañas',
    crearPersonaje: 'Crear personaje',
    opciones: 'Opciones',
    sinPersonaje: 'Todavía no tenés un personaje. Creá uno para empezar a jugar.',
    personajeActivo: (nombre: string, clase: string, nivel: number): string =>
      `${nombre} · ${clase} · nivel ${nivel}`,
    partidaEnCurso: (titulo: string): string => `Tenés una partida en curso en «${titulo}».`,
    personajeMuerto: (nombre: string): string =>
      `${nombre} murió y no vuelve a jugar. Creá otro personaje para seguir.`,
  },
  hub: {
    titulo: 'Campañas',
    volver: 'Volver al inicio',
    opciones: 'Opciones',
    personaje: {
      titulo: 'Tu personaje',
      sinPersonaje: 'Todavía no tenés un personaje activo. Creá uno para elegir campaña.',
      ficha: (nombre: string, clase: string, nivel: number): string => `${nombre} · ${clase} · nivel ${nivel}`,
      atributo: (nombre: string, valor: number): string => `${nombre} ${valor}`,
      xp: (xp: number, falta: number): string => `${xp} XP · faltan ${falta} para el próximo nivel`,
      nivelMaximo: (xp: number): string => `${xp} XP · nivel máximo`,
      muerto: (nombre: string): string => `${nombre} murió y no vuelve a jugar. Creá otro personaje para seguir.`,
      crear: 'Crear personaje',
      crearOtro: 'Crear otro personaje',
      sinCupo: (max: number): string => `Ya tenés ${max} personajes, que es el máximo. Borrá uno para crear otro.`,
      todos: 'Tus personajes',
      enJuego: 'en juego',
      elegir: (nombre: string, clase: string, nivel: number): string =>
        `Jugar con ${nombre}, ${clase} de nivel ${nivel}`,
      borrar: (nombre: string): string => `Borrar a ${nombre}`,
      borrarConfirmar: (nombre: string): string =>
        `Borrar a ${nombre} es para siempre: se pierde el personaje y la partida que tenga en curso. ¿Borrarlo?`,
    },
    campana: {
      portadaAlt: (titulo: string): string => `Portada de ${titulo}`,
      nivelSugerido: (rango: readonly [number, number]): string =>
        rango[0] === rango[1] ? `Nivel sugerido ${rango[0]}` : `Nivel sugerido ${rango[0]} a ${rango[1]}`,
      duracion: (minutos: readonly [number, number]): string =>
        minutos[0] === minutos[1] ? `${minutos[0]} min` : `${minutos[0]} a ${minutos[1]} min`,
      tope: (nivel: number): string => `Te sube hasta nivel ${nivel}`,
      topeAlcanzado: 'Ya no te da XP: le sacaste todo lo que tenía para tu nivel.',
      mortales: (n: number): string =>
        n === 0 ? 'Sin escenas mortales' : n === 1 ? '1 escena mortal' : `${n} escenas mortales`,
      reglaMortal:
        'En una escena mortal un Fallo aplica 2 Heridas: si estás Malherido morís para siempre, si estás Herido quedás fuera de la campaña y si estás sano quedás Malherido. Siempre hay una salida sin tirada, y se entra con una confirmación que te dice cómo estás.',
      finales: (vistos: number, total: number): string => `${vistos} de ${total} finales`,
      finalesSinTotal: (vistos: number): string => (vistos === 1 ? '1 final visto' : `${vistos} finales vistos`),
      partidas: (n: number): string =>
        n === 0 ? 'Nunca la jugaste' : n === 1 ? '1 partida jugada' : `${n} partidas jugadas`,
      comenzar: 'Comenzar',
      continuar: 'Continuar',
      enCurso: 'Tenés una partida en curso acá.',
      necesitaPersonaje: 'Creá un personaje para jugar esta campaña.',
      personajeMuerto: 'Tu personaje murió. Creá otro para volver a jugar.',
    },
    etiqueta: {
      mortal: 'Mortal',
      exigente: 'Exigente',
      pareja: 'Pareja',
      tranquila: 'Tranquila',
      paseo: 'Paseo',
    },
    etiquetaDetalle: {
      mortal: 'Te lleva dos niveles o más de ventaja.',
      exigente: 'Estás un nivel por debajo del mínimo.',
      pareja: 'Estás dentro del rango de la campaña.',
      tranquila: 'Estás por encima del rango.',
      paseo: 'Estás muy por encima del rango.',
    },
    veterano: (modificador: number): string => `${modificador} Veterano del Vado`,
    veteranoTitulo:
      'La campaña te quedó chica: todas tus tiradas llevan esta penalización y la XP rinde menos.',
    confirmar: {
      mortal:
        'Mortal: la campaña te lleva dos niveles o más de ventaja. Vas a fallar la mayoría de las tiradas y una escena mortal puede matar a tu personaje para siempre.',
      exigente:
        'Exigente: estás un nivel por debajo del mínimo. Las tiradas van a salir caras y las heridas se acumulan.',
      seguir: '¿Empezar igual?',
    },
    confirmarPerderPartida: (titulo: string): string =>
      `Tenés una partida en curso en «${titulo}». Empezar otra campaña la cierra como derrota: conservás la XP de los hitos, pero perdés el final y el canon.`,
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
    volverAlHub: 'Volver a las campañas',
    volverAlInicio: 'Volver al inicio',
    // Progreso (spec §4: la XP es por descubrimiento y la campaña tiene un tope).
    progreso: 'Lo que te llevás',
    xpGanada: (xp: number): string => `+${xp} XP`,
    sinXp: 'Esta partida no te dejó XP nueva: ya habías visto todo lo que da.',
    desglose: 'De dónde salió',
    nivelActual: (nivel: number, xp: number): string => `Nivel ${nivel} · ${xp} XP`,
    subiste: (desde: number, hasta: number): string =>
      hasta - desde === 1 ? `Subiste al nivel ${hasta}` : `Subiste del nivel ${desde} al ${hasta}`,
    descartada: (xp: number, tope: number): string =>
      `Esta campaña ya no te sube más: se descartaron ${xp} XP porque no lleva más allá del nivel ${tope}.`,
    topeAlcanzado: (tope: number): string =>
      `Esta campaña ya no te sube más: su tope es el nivel ${tope} y ya lo tenés.`,
    // Premios de nivel. Los de elección los gasta el jugador acá mismo.
    premioAtributo: 'Elegí el atributo que sube',
    premioHabilidad: 'Elegí una habilidad',
    premioFortuna: 'Desde el nivel 5 empezás cada partida con 4 de Fortuna.',
    premioLeyenda: 'Llegaste al nivel 10: tu personaje es una leyenda.',
    faltaElegirPremio: 'Elegí tu premio de nivel antes de salir: después no se puede.',
    atributoBoton: (nombre: string, de: number, a: number): string => `${nombre} ${de} → ${a}`,
    habilidadBoton: (nombre: string, tag: string): string => `${nombre} — potencia ${tag}`,
    motivoTecho: (max: number): string => `Ya está en el techo de ${max}.`,
    motivoDebilidad: (tag: string, clase: string): string =>
      `No se puede: ${tag} es la Debilidad del ${clase}.`,
    motivoRepetida: 'Ya la tenés.',
  },
  ficha: {
    caido: (nombre: string, clase: string, nivel: number, campana: string): string =>
      `${nombre}, ${clase} de nivel ${nivel}, murió en ${campana}`,
    caidoSinCampana: (nombre: string, clase: string, nivel: number): string =>
      `${nombre}, ${clase} de nivel ${nivel}`,
  },
  /**
   * El modal de Opciones (spec §6): preferencias de lectura, más exportar e importar el
   * guardado. Se llama `ajustes` y no `opciones` porque `S.opciones` ya es la lista de
   * opciones de una escena; el texto que ve el jugador sí dice "Opciones".
   */
  ajustes: {
    titulo: 'Opciones',
    cerrar: 'Cerrar',
    preferencias: {
      titulo: 'Preferencias',
      maquinaDeEscribir: {
        leyenda: 'Máquina de escribir',
        normal: 'Normal (40 cps)',
        instantaneo: 'Instantáneo',
      },
      tamanoDeLetra: {
        leyenda: 'Tamaño de letra',
        n100: '100 %',
        n125: '125 %',
        n150: '150 %',
      },
      movimiento: {
        leyenda: 'Movimiento',
        segunElSistema: 'Según el sistema',
        reducidoSiempre: 'Reducido siempre',
      },
      probabilidades: {
        leyenda: 'Mostrar probabilidades',
        si: 'Sí',
        no: 'No',
      },
    },
    exportar: {
      titulo: 'Exportar el guardado',
      ayuda: 'Bajate el archivo o copiá el texto: es todo tu perfil, con los personajes y el mundo.',
      descargar: 'Descargar el guardado',
      etiquetaTexto: 'Tu guardado, en texto',
      sinDescarga: 'Este navegador no dejó descargar el archivo. Copiá el texto de acá abajo.',
      nombreArchivo: (fecha: string): string => `cronicas-del-vado-${fecha}.json`,
    },
    importar: {
      titulo: 'Importar un guardado',
      ayuda: 'Pegá acá un guardado exportado. Reemplaza todo lo que tenés ahora, y no se puede deshacer.',
      etiquetaTexto: 'Guardado para importar',
      boton: 'Importar',
      vacio: 'Pegá un guardado antes de importar.',
      error: (motivo: string): string => `No se pudo importar: ${motivo}`,
      exito: 'Guardado importado.',
    },
  },
  creacion: {
    titulo: 'Personaje nuevo',
    paso: (n: number, total: number): string => `Paso ${n} de ${total}`,
    progreso: 'Progreso de la creación',
    volver: 'Volver',
    siguiente: 'Siguiente',
    crear: 'Crear personaje',
    titulos: {
      1: 'Elegí tu clase',
      2: 'Retrato y nombre',
      3: 'Dos rasgos de origen',
      4: 'Revisá y confirmá',
    },
    // Paso 1
    potencia: (atributo: string): string => `Potencia tiradas de ${atributo}`,
    poder: 'Poder',
    debilidad: 'Debilidad',
    debilidadDetalle: (tag: string): string => `Desventaja permanente en ${tag}`,
    faltaClase: 'Elegí una clase para seguir.',
    // Paso 2
    retratosDeLaClase: (clase: string): string => `Retratos de ${clase}`,
    retratosDelResto: 'Los demás retratos',
    verTodos: 'Ver todos los retratos',
    verSoloLosDeLaClase: 'Ver solo los de mi clase',
    retratoEtiqueta: (id: string): string => `Retrato ${id.replace('_', ' ')}`,
    retratoElegido: 'Retrato elegido',
    nombreEtiqueta: 'Nombre',
    nombrePorDefecto: 'Bruna de Aldamar',
    nombreAyuda: (maximo: number): string => `Hasta ${maximo} caracteres.`,
    faltaNombre: 'Escribí un nombre para seguir.',
    // Paso 3
    rasgosAyuda: 'Elegí dos. Cada rasgo da ventaja permanente en su etiqueta y abre opciones propias.',
    rasgoPotencia: (tag: string): string => `Potencia: ${tag}`,
    motivoDebilidad: (clase: string, tag: string): string =>
      `No se puede: ${tag} es la Debilidad del ${clase} y una Debilidad no se tapa con un rasgo.`,
    motivoDosRasgos: 'Ya elegiste dos rasgos. Soltá uno si querés cambiarlo.',
    faltanRasgos: (n: number): string => (n === 1 ? 'Falta un rasgo.' : `Faltan ${n} rasgos.`),
    elegido: 'Elegido',
    // Paso 4
    resumenClase: 'Clase',
    resumenNombre: 'Nombre',
    resumenRasgos: 'Rasgos de origen',
    resumenAtributos: 'Atributos',
    atributosAyuda: 'El reparto inicial es 2 / 1 / 1 / 0. Tu clase fija el 2; vos elegís dónde va el 0.',
    flojoPregunta: '¿En qué atributo sos flojo?',
    flojoBoton: (atributo: string): string => `Dejar ${atributo} en 0`,
    nivelInicial: 'Empezás en nivel 1, sin habilidades: se ganan subiendo de nivel.',
    errorAlCrear: (motivo: string): string => `No se pudo crear el personaje: ${motivo}`,
  },
  placeholder: {
    fondo: 'Fondo',
    retrato: 'Retrato',
  },
} as const;
