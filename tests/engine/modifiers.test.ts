import { describe, expect, it } from 'vitest';
import type { Attr, Difficulty, Tag } from '@/content/catalog';
import type { Outcome, Roll } from '@/content/schema';
import { rollMode, rollSources } from '@/engine/modifiers';
import type { RollSource } from '@/engine/types';
import { contextoPrueba } from '../fixtures/modifiers';

/** Tirada de prueba: los outcomes no importan para los modificadores, solo attr, dificultad, tags y condiciones. */
function tirada(
  attr: Attr,
  difficulty: Difficulty,
  tags: Tag[],
  extra: Pick<Roll, 'advantageIf' | 'disadvantageIf'> = {},
): Roll {
  const salida: Outcome = { next: 'inicio' };
  return { attr, difficulty, tags, ...extra, outcomes: { success: salida, partial: salida, failure: salida } };
}

function fuente(kind: RollSource['kind'], label: string, origin: RollSource['origin'], cancelled = false): RollSource {
  return { kind, label, origin, cancelled };
}

describe('rollMode', () => {
  it('sin fuentes es normal', () => {
    expect(rollMode([])).toBe('normal');
  });

  it('solo ventajas es advantage', () => {
    expect(rollMode([fuente('advantage', 'Aprendiz de escriba', 'trait')])).toBe('advantage');
    expect(rollMode([fuente('advantage', 'A', 'trait'), fuente('advantage', 'B', 'item')])).toBe('advantage');
  });

  it('solo desventajas es disadvantage', () => {
    expect(rollMode([fuente('disadvantage', 'Debilidad: Mago', 'class')])).toBe('disadvantage');
  });

  it('ventaja y desventaja juntas es cancelled', () => {
    expect(
      rollMode([fuente('advantage', 'A', 'trait', true), fuente('disadvantage', 'B', 'condition', true)]),
    ).toBe('cancelled');
  });

  it('no muta la lista recibida', () => {
    const lista = [fuente('advantage', 'A', 'trait')];
    rollMode(lista);
    expect(lista).toEqual([fuente('advantage', 'A', 'trait')]);
  });
});

describe('rollSources: rasgos, habilidades y clase', () => {
  it('tirada de saber: el rasgo Aprendiz de escriba da una sola ventaja', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('saber', 'normal', ['saber']), ctx);
    expect(fuentes).toEqual([fuente('advantage', 'Aprendiz de escriba', 'trait')]);
    expect(rollMode(fuentes)).toBe('advantage');
  });

  it('tirada de sigilo: el rasgo Cazador furtivo da ventaja', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([fuente('advantage', 'Cazador furtivo', 'trait')]);
  });

  it('tirada sin tags que coincidan no tiene fuentes', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('presencia', 'normal', ['social']), ctx);
    expect(fuentes).toEqual([]);
    expect(rollMode(fuentes)).toBe('normal');
  });

  it('una tirada con dos tags puede sumar dos rasgos', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo', 'saber']), ctx);
    expect(fuentes).toHaveLength(2);
    expect(fuentes.map((f) => f.label)).toEqual(['Aprendiz de escriba', 'Cazador furtivo']);
    expect(fuentes.every((f) => f.kind === 'advantage' && !f.cancelled)).toBe(true);
  });

  it('una habilidad cuyo tag coincide da ventaja con origin skill', () => {
    const ctx = contextoPrueba({ character: { traits: [], skills: ['erudito_de_runas'] } });
    const fuentes = rollSources(tirada('saber', 'normal', ['saber']), ctx);
    expect(fuentes).toEqual([fuente('advantage', 'Erudito de runas', 'skill')]);
  });

  it('tirada de vigor con tag fisico: el mago tiene desventaja por su Debilidad', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('vigor', 'dificil', ['fisico']), ctx);
    expect(fuentes).toEqual([fuente('disadvantage', 'Debilidad: Mago', 'class')]);
    expect(rollMode(fuentes)).toBe('disadvantage');
  });

  it('la Debilidad depende de la clase: un guerrero la tiene en sigilo, no en fisico', () => {
    const guerrero = contextoPrueba({ character: { classId: 'guerrero', traits: [] } });
    expect(rollSources(tirada('vigor', 'normal', ['fisico']), guerrero)).toEqual([]);
    expect(rollSources(tirada('astucia', 'normal', ['sigilo']), guerrero)).toEqual([
      fuente('disadvantage', 'Debilidad: Guerrero', 'class'),
    ]);
  });
});
