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

describe('rollSources: objetos', () => {
  it('un objeto con advantageTags que intersecan los tags da ventaja con su nombre', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { items: ['llave_de_hierro'] } });
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([fuente('advantage', 'Llave de hierro', 'item')]);
  });

  it('un objeto sin advantageTags no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { items: ['piedra_lisa'] } });
    expect(rollSources(tirada('astucia', 'normal', ['sigilo']), ctx)).toEqual([]);
  });

  it('un objeto cuyo advantageTags no coincide no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { items: ['llave_de_hierro'] } });
    expect(rollSources(tirada('saber', 'normal', ['saber']), ctx)).toEqual([]);
  });

  it('un id de objeto que no existe en la campaña se ignora sin lanzar', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { items: ['inexistente'] } });
    expect(rollSources(tirada('astucia', 'normal', ['sigilo']), ctx)).toEqual([]);
  });

  it('objeto y rasgo con el mismo tag son dos fuentes distintas (la UI las muestra las dos)', () => {
    const ctx = contextoPrueba({ run: { items: ['llave_de_hierro'] } });
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([
      fuente('advantage', 'Cazador furtivo', 'trait'),
      fuente('advantage', 'Llave de hierro', 'item'),
    ]);
    expect(rollMode(fuentes)).toBe('advantage');
  });
});

describe('rollSources: condiciones', () => {
  it('una condición cuyo tag está en la tirada da desventaja', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { conditions: ['empapado'] } });
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([fuente('disadvantage', 'Empapado', 'condition')]);
  });

  it('una condición con tag all da desventaja en cualquier tirada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { conditions: ['envenenado'] } });
    expect(rollSources(tirada('presencia', 'normal', ['social']), ctx)).toEqual([
      fuente('disadvantage', 'Envenenado', 'condition'),
    ]);
    expect(rollSources(tirada('saber', 'normal', ['saber']), ctx)).toEqual([
      fuente('disadvantage', 'Envenenado', 'condition'),
    ]);
  });

  it('una condición con otro tag no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { conditions: ['asustado'] } });
    expect(rollSources(tirada('saber', 'normal', ['saber']), ctx)).toEqual([]);
  });

  it('sigilo con Empapado y Cazador furtivo: ambas fuentes quedan anuladas y el modo es cancelled', () => {
    const ctx = contextoPrueba({ run: { conditions: ['empapado'] } });
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([
      fuente('advantage', 'Cazador furtivo', 'trait', true),
      fuente('disadvantage', 'Empapado', 'condition', true),
    ]);
    expect(rollMode(fuentes)).toBe('cancelled');
  });
});

describe('rollSources: heridas', () => {
  it('Herido con tag fisico da desventaja wound "Herido"', () => {
    const ctx = contextoPrueba({ character: { classId: 'guerrero', traits: [] }, run: { wounds: 1 } });
    const fuentes = rollSources(tirada('vigor', 'normal', ['fisico']), ctx);
    expect(fuentes).toEqual([fuente('disadvantage', 'Herido', 'wound')]);
    expect(rollMode(fuentes)).toBe('disadvantage');
  });

  it('Herido sin tag fisico no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { wounds: 1 } });
    expect(rollSources(tirada('saber', 'normal', ['saber']), ctx)).toEqual([]);
  });

  it('Herido + fisico con el mago suma Debilidad y Herido, las dos desventajas', () => {
    const ctx = contextoPrueba({ run: { wounds: 1 } });
    const fuentes = rollSources(tirada('vigor', 'dificil', ['fisico']), ctx);
    expect(fuentes).toEqual([
      fuente('disadvantage', 'Debilidad: Mago', 'class'),
      fuente('disadvantage', 'Herido', 'wound'),
    ]);
    expect(rollMode(fuentes)).toBe('disadvantage');
  });

  it('Malherido da desventaja wound "Malherido" en cualquier tag', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { wounds: 2 } });
    expect(rollSources(tirada('presencia', 'normal', ['social']), ctx)).toEqual([
      fuente('disadvantage', 'Malherido', 'wound'),
    ]);
    expect(rollSources(tirada('saber', 'normal', ['magia']), ctx)).toEqual([
      fuente('disadvantage', 'Malherido', 'wound'),
    ]);
  });

  it('Malherido anula la ventaja del rasgo en una tirada de saber', () => {
    const ctx = contextoPrueba({ run: { wounds: 2 } });
    const fuentes = rollSources(tirada('saber', 'normal', ['saber']), ctx);
    expect(fuentes).toEqual([
      fuente('advantage', 'Aprendiz de escriba', 'trait', true),
      fuente('disadvantage', 'Malherido', 'wound', true),
    ]);
    expect(rollMode(fuentes)).toBe('cancelled');
  });

  it('Sano no aporta ninguna fuente de herida', () => {
    const ctx = contextoPrueba({ character: { classId: 'guerrero', traits: [] }, run: { wounds: 0 } });
    expect(rollSources(tirada('vigor', 'normal', ['fisico']), ctx)).toEqual([]);
  });
});

describe('rollSources: advantageIf y disadvantageIf', () => {
  it('advantageIf que se cumple da ventaja scene "Situación"', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { flags: ['run:tiene_pista'] } });
    const roll = tirada('saber', 'normal', ['saber'], { advantageIf: { flag: 'run:tiene_pista' } });
    expect(rollSources(roll, ctx)).toEqual([fuente('advantage', 'Situación', 'scene')]);
  });

  it('advantageIf que no se cumple no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] } });
    const roll = tirada('saber', 'normal', ['saber'], { advantageIf: { flag: 'run:tiene_pista' } });
    expect(rollSources(roll, ctx)).toEqual([]);
  });

  it('disadvantageIf que se cumple da desventaja scene "Situación"', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { wounds: 1 } });
    const roll = tirada('saber', 'normal', ['saber'], { disadvantageIf: { wounds: { gte: 1 } } });
    expect(rollSources(roll, ctx)).toEqual([fuente('disadvantage', 'Situación', 'scene')]);
  });

  it('advantageIf y disadvantageIf cumplidos a la vez se anulan', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { flags: ['run:tiene_pista'], wounds: 1 } });
    const roll = tirada('saber', 'normal', ['saber'], {
      advantageIf: { flag: 'run:tiene_pista' },
      disadvantageIf: { wounds: { gte: 1 } },
    });
    const fuentes = rollSources(roll, ctx);
    expect(fuentes).toEqual([
      fuente('advantage', 'Situación', 'scene', true),
      fuente('disadvantage', 'Situación', 'scene', true),
    ]);
    expect(rollMode(fuentes)).toBe('cancelled');
  });
});

describe('rollSources: orden y pureza', () => {
  it('lista primero todas las ventajas y después todas las desventajas', () => {
    const ctx = contextoPrueba({
      character: { skills: ['erudito_de_runas'] },
      run: { items: ['amuleto_de_runas'], conditions: ['envenenado'], wounds: 2, flags: ['run:tiene_pista'] },
    });
    const roll = tirada('saber', 'normal', ['saber'], { advantageIf: { flag: 'run:tiene_pista' } });
    const fuentes = rollSources(roll, ctx);
    expect(fuentes.map((f) => [f.kind, f.origin, f.label])).toEqual([
      ['advantage', 'trait', 'Aprendiz de escriba'],
      ['advantage', 'skill', 'Erudito de runas'],
      ['advantage', 'item', 'Amuleto de runas'],
      ['advantage', 'scene', 'Situación'],
      ['disadvantage', 'condition', 'Envenenado'],
      ['disadvantage', 'wound', 'Malherido'],
    ]);
    expect(fuentes.every((f) => f.cancelled)).toBe(true);
  });

  it('no muta el contexto ni la tirada', () => {
    const ctx = contextoPrueba({ run: { items: ['llave_de_hierro'], conditions: ['empapado'], wounds: 1 } });
    const roll = tirada('astucia', 'normal', ['sigilo', 'fisico'], { advantageIf: { flag: 'run:tiene_pista' } });
    const ctxAntes = JSON.stringify(ctx);
    const rollAntes = JSON.stringify(roll);
    rollSources(roll, ctx);
    expect(JSON.stringify(ctx)).toBe(ctxAntes);
    expect(JSON.stringify(roll)).toBe(rollAntes);
  });

  it('devuelve un arreglo nuevo en cada llamada', () => {
    const ctx = contextoPrueba();
    const roll = tirada('saber', 'normal', ['saber']);
    const a = rollSources(roll, ctx);
    const b = rollSources(roll, ctx);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
  });
});
