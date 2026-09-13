import type { Campaign } from '@/content/schema';
import {
  LARGO_OBJETIVO,
  PISO_TIRADAS_CODICIOSA,
  TOPE_MUERTE_CODICIOSA,
  type Agregado,
  type DatosPorPartida,
  type FilaCombinacion,
  type Resumen,
} from './agregado';
import { CLASES, type ConfigSim } from './types';

function pct(v: number): string {
  return `${(v * 100).toFixed(1)} %`;
}

function dec(v: number, decimales = 1): string {
  return v.toFixed(decimales);
}

function resumenBreve(r: Resumen): string {
  return `${dec(r.media)} (mediana ${dec(r.mediana)}, ${r.min}–${r.max})`;
}

function lista(ids: readonly string[], vacio: string): string {
  return ids.length === 0 ? vacio : ids.map((id) => `\`${id}\``).join(', ');
}

function bloqueLista(ids: readonly string[], vacio: string): string {
  if (ids.length === 0) return `_${vacio}_\n`;
  return `${ids.map((id) => `- \`${id}\``).join('\n')}\n`;
}

/** Las cuatro aserciones duras de la spec §10 y la Fase H, con su veredicto. */
export function lineasDeAserciones(agregado: Agregado): { titulo: string; detalle: string; pasa: boolean }[] {
  const a = agregado.aserciones;
  return [
    {
      titulo: 'Ninguna escena fuera de una condición de memoria queda inalcanzable',
      detalle:
        a.escenasInalcanzables.length === 0
          ? 'todas visitadas'
          : `sin visitar: ${lista(a.escenasInalcanzables, '')}`,
      pasa: a.escenasInalcanzables.length === 0,
    },
    {
      titulo: `Muerte a nivel 1 con política codiciosa < ${pct(TOPE_MUERTE_CODICIOSA)}`,
      detalle: `${pct(a.muerteNivel1Codiciosa)} sobre ${a.partidasNivel1Codiciosa} partidas`,
      pasa: a.muerteNivel1Codiciosa < TOPE_MUERTE_CODICIOSA,
    },
    {
      titulo: 'Los cuatro finales se alcanzan con las cuatro clases',
      detalle:
        a.finalesFaltantesPorClase.length === 0
          ? 'las cuatro clases llegaron a los cuatro finales'
          : a.finalesFaltantesPorClase.map((f) => `${f.clase}: falta ${lista(f.faltan, '')}`).join(' · '),
      pasa: a.finalesFaltantesPorClase.length === 0,
    },
    {
      titulo: `La política codiciosa hace al menos ${PISO_TIRADAS_CODICIOSA} tiradas por partida`,
      detalle: `${dec(a.tiradasMediaCodiciosa)} tiradas de media`,
      pasa: a.tiradasMediaCodiciosa >= PISO_TIRADAS_CODICIOSA,
    },
  ];
}

function tablaCombinaciones(filas: readonly FilaCombinacion[]): string {
  const cabecera = [
    '| Clase | Nivel | Política | Partidas | Pantallas | Distintas | Distintas en objetivo | Palabras | Derrota | Muerte | Heridas | Hitos | Tiradas | Fallo (dados) | Fallo (final) |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  const cuerpo = filas.map(
    (f) =>
      `| ${f.clase} | ${f.nivel} | ${f.politica} | ${f.partidas} | ${dec(f.escenas.media)} | ${dec(f.escenasDistintas.media)} | ${pct(f.enObjetivo)} | ${Math.round(f.palabras.media)} | ${pct(f.derrota)} | ${pct(f.muerte)} | ${dec(f.heridasMedia, 2)} | ${dec(f.hitosMedia)} | ${dec(f.tiradasMedia)} | ${pct(f.tasaFalloCruda)} | ${pct(f.tasaFallo)} |`,
  );
  return [...cabecera, ...cuerpo].join('\n');
}

function tablaFinalesPorClase(campaign: Campaign, agregado: Agregado): string {
  const ids = Object.keys(campaign.endings);
  const cabecera = [
    `| Clase | ${ids.map((id) => `\`${id}\``).join(' | ')} |`,
    `|---|${ids.map(() => '---').join('|')}|`,
  ];
  const cuerpo = CLASES.map((clase) => {
    const fila = agregado.finalesPorClase[clase] ?? {};
    return `| ${clase} | ${ids.map((id) => String(fila[id] ?? 0)).join(' | ')} |`;
  });
  return [...cabecera, ...cuerpo].join('\n');
}

function tablaFinalesPorPartida(campaign: Campaign, agregado: Agregado): string {
  const ids = Object.keys(campaign.endings);
  const numeros = Object.keys(agregado.finalesPorPartida)
    .map(Number)
    .sort((a, b) => a - b);
  const cabecera = [
    `| Partida de la carrera | ${ids.map((id) => `\`${id}\``).join(' | ')} | Total |`,
    `|---|${ids.map(() => '---').join('|')}|---|`,
  ];
  const cuerpo = numeros.map((n) => {
    const fila = agregado.finalesPorPartida[n] ?? {};
    const total = ids.reduce((s, id) => s + (fila[id] ?? 0), 0);
    return `| ${n} | ${ids.map((id) => String(fila[id] ?? 0)).join(' | ')} | ${total} |`;
  });
  return [...cabecera, ...cuerpo].join('\n');
}

/** Tasa de Fallo y longitud por número de partida: es donde se ve si rejugar trivializa. */
function tablaTrivializacion(porPartida: Map<number, DatosPorPartida>): string {
  const numeros = [...porPartida.keys()].sort((a, b) => a - b);
  const cabecera = [
    '| Partida de la carrera | Partidas | Nivel al empezar | Fallo (dados) | Fallo (final) | Escenas | Palabras |',
    '|---|---|---|---|---|---|---|',
  ];
  const media = (xs: readonly number[]): number => xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length);
  const cuerpo = numeros.map((n) => {
    const d = porPartida.get(n);
    if (d === undefined) return '';
    const crudo = d.tiradas === 0 ? 0 : d.fallosCrudos / d.tiradas;
    const final = d.tiradas === 0 ? 0 : d.fallos / d.tiradas;
    return `| ${n} | ${d.escenas.length} | ${dec(media(d.nivel), 2)} | ${pct(crudo)} | ${pct(final)} | ${dec(media(d.escenas))} | ${Math.round(media(d.palabras))} |`;
  });
  return [...cabecera, ...cuerpo].join('\n');
}

/** Informe completo en Markdown. Sin fecha ni rutas absolutas: tiene que diffear limpio. */
export function informeMarkdown(
  campaign: Campaign,
  config: ConfigSim,
  agregado: Agregado,
  porPartida: Map<number, DatosPorPartida>,
): string {
  const aserciones = lineasDeAserciones(agregado);
  const g = agregado.global;
  const partes: string[] = [];

  partes.push(`# Informe de simulación — ${campaign.title}`);
  partes.push(
    [
      'Lo escribe `npm run simulate`. Es determinista: con la misma `--seed` sale exactamente este archivo,',
      'así que se puede comparar entre commits con un diff. No lleva fecha a propósito.',
    ].join(' '),
  );
  partes.push(
    [
      `- Campaña \`${campaign.id}\`, contentVersion ${campaign.contentVersion}`,
      `- Semilla ${config.semilla} · carreras por combinación ${config.n} · partidas por carrera ${config.k}`,
      `- ${agregado.carreras} carreras, ${agregado.partidas} partidas simuladas con el motor real`,
      `- Combinaciones: 4 clases × niveles {${[...new Set(agregado.filas.map((f) => f.nivel))].join(', ')}} × 4 políticas`,
    ].join('\n'),
  );

  partes.push('## Las cuatro aserciones');
  partes.push(
    [
      '| # | Aserción | Resultado | Detalle |',
      '|---|---|---|---|',
      ...aserciones.map((a, i) => `| ${i + 1} | ${a.titulo} | ${a.pasa ? 'PASA' : 'FALLA'} | ${a.detalle} |`),
    ].join('\n'),
  );

  partes.push('## Avisos');
  partes.push(
    agregado.avisos.length === 0
      ? '_nada que mirar: todo cae dentro de lo esperado._\n'
      : `${agregado.avisos.map((a) => `- ${a}`).join('\n')}\n`,
  );

  partes.push('## Cobertura');
  partes.push(
    [
      `- Escenas visitadas: **${agregado.escenasVisitadas} de ${agregado.escenasTotales}** (${pct(agregado.escenasVisitadas / agregado.escenasTotales)})`,
      `- Opciones elegidas: **${agregado.opcionesElegidas} de ${agregado.opcionesTotales}** (${pct(agregado.opcionesElegidas / agregado.opcionesTotales)})`,
    ].join('\n'),
  );
  partes.push('### Escenas que nunca se visitaron');
  partes.push(bloqueLista(agregado.escenasNuncaVisitadas, 'ninguna: la simulación tocó las 46'));
  partes.push('### Opciones que nunca se eligieron');
  partes.push(
    `De las ${agregado.opcionesNuncaElegidas.length} sin elegir, ${agregado.opcionesNuncaElegidas.length - agregado.opcionesNuncaElegidasSinMemoria.length} están detrás de una condición de memoria.`,
  );
  partes.push(bloqueLista(agregado.opcionesNuncaElegidas, 'ninguna: la simulación eligió las 252'));

  partes.push('## Finales');
  partes.push('### Por clase');
  partes.push(tablaFinalesPorClase(campaign, agregado));
  partes.push('### Por número de partida dentro de la carrera');
  partes.push(tablaFinalesPorPartida(campaign, agregado));

  partes.push('## Longitud, derrota y dificultad');
  partes.push(
    [
      `- Longitud por partida: **${resumenBreve(g.escenasDistintas)}** escenas distintas (el objetivo de diseño es ${LARGO_OBJETIVO[0]}–${LARGO_OBJETIVO[1]}; cae dentro el ${pct(g.enObjetivo)}), **${resumenBreve(g.escenas)}** pantallas contando las vueltas al hub`,
      `- Palabras leídas por partida: **${resumenBreve(g.palabras)}**`,
      `- Derrota ${pct(g.derrota)} · muerte ${pct(g.muerte)} · heridas al terminar ${dec(g.heridasMedia, 2)}`,
      `- Tiradas por partida ${dec(g.tiradasMedia)} · Fallo en los dados ${pct(g.tasaFalloCruda)} · Fallo después de Fortuna y Poder ${pct(g.tasaFallo)}`,
      `- Partidas colgadas ${g.colgadas} · escenas sin salida ${g.sinSalida} · logs recortados ${agregado.partidasConLogRecortado}`,
    ].join('\n'),
  );
  partes.push('### Por combinación');
  partes.push(tablaCombinaciones(agregado.filas));

  partes.push('## Rejugar: ¿se trivializa?');
  partes.push(tablaTrivializacion(porPartida));
  partes.push(
    [
      `- Nivel al terminar la carrera: **${resumenBreve(agregado.nivelFinal)}**`,
      `- XP al terminar la carrera: **${resumenBreve(agregado.xpFinal)}**`,
    ].join('\n'),
  );

  partes.push('## Lo que nunca se alcanzó');
  partes.push('### Flags declarados que nunca se encendieron');
  partes.push(bloqueLista(agregado.flagsNuncaEncendidos, 'ninguno'));
  partes.push('### Hitos que nunca se alcanzaron');
  partes.push(bloqueLista(agregado.hitosNuncaAlcanzados, 'ninguno'));
  partes.push('### Finales que nunca se alcanzaron');
  partes.push(bloqueLista(agregado.finalesNuncaAlcanzados, 'ninguno'));

  return `${partes.join('\n\n')}\n`;
}

/** Resumen corto para la consola: lo que Gabriel mira sin abrir el archivo. */
export function resumenConsola(campaign: Campaign, config: ConfigSim, agregado: Agregado, ruta: string): string {
  const g = agregado.global;
  const lineas: string[] = [];
  lineas.push(`Simulación de ${campaign.title} (${campaign.id}) · semilla ${config.semilla}`);
  lineas.push(`${agregado.carreras} carreras × ${config.k} partidas = ${agregado.partidas} partidas`);
  lineas.push(
    `Cobertura: ${agregado.escenasVisitadas}/${agregado.escenasTotales} escenas, ${agregado.opcionesElegidas}/${agregado.opcionesTotales} opciones`,
  );
  lineas.push(
    `Longitud ${dec(g.escenasDistintas.media)} escenas distintas (${pct(g.enObjetivo)} en ${LARGO_OBJETIVO[0]}–${LARGO_OBJETIVO[1]}) · ${dec(g.escenas.media)} pantallas · ${Math.round(g.palabras.media)} palabras`,
  );
  lineas.push(
    `Derrota ${pct(g.derrota)} · muerte ${pct(g.muerte)} · heridas ${dec(g.heridasMedia, 2)} · Fallo ${pct(g.tasaFalloCruda)} en dados, ${pct(g.tasaFallo)} final`,
  );
  lineas.push(
    `Finales: ${Object.entries(agregado.finales)
      .map(([id, n]) => `${id} ${n}`)
      .join(' · ')}`,
  );
  if (agregado.escenasNuncaVisitadas.length > 0) {
    lineas.push(`Escenas muertas: ${agregado.escenasNuncaVisitadas.join(', ')}`);
  }
  for (const aviso of agregado.avisos) lineas.push(`Aviso: ${aviso}`);
  for (const [i, a] of lineasDeAserciones(agregado).entries()) {
    lineas.push(`Aserción ${i + 1} ${a.pasa ? 'PASA' : 'FALLA'}: ${a.titulo} (${a.detalle})`);
  }
  lineas.push(`Informe: ${ruta}`);
  return lineas.join('\n');
}
