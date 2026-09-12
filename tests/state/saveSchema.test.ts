import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { PersistedSliceSchema, SaveFileSchema, parseSave } from '@/state/saveSchema';
import type { PersistedSlice } from '@/state/store';
import { PERSIST_VERSION } from '@/state/migrations';

function guardadoMinimo(): PersistedSlice {
  return {
    characters: [],
    activeCharacterId: null,
    world: { flags: [], fallen: [] },
    seen: {},
    prefs: { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
  };
}

function archivo(state: PersistedSlice, version = PERSIST_VERSION): string {
  return JSON.stringify({ state, version });
}

describe('saveSchema: tipos', () => {
  it('z.infer<typeof PersistedSliceSchema> y PersistedSlice son intercambiables', () => {
    expectTypeOf<z.infer<typeof PersistedSliceSchema>>().toMatchTypeOf<PersistedSlice>();
    expectTypeOf<PersistedSlice>().toMatchTypeOf<z.infer<typeof PersistedSliceSchema>>();
  });

  it('SaveFileSchema describe el wrapper { state, version } de persist', () => {
    const parsed = SaveFileSchema.parse({ state: guardadoMinimo(), version: PERSIST_VERSION });
    expect(parsed.version).toBe(PERSIST_VERSION);
    expect(parsed.state.characters).toEqual([]);
  });
});

describe('parseSave', () => {
  it('acepta un guardado bien formado', () => {
    const r = parseSave(archivo(guardadoMinimo()));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.prefs.cps).toBe(40);
  });

  it('rechaza texto que no es JSON', () => {
    const r = parseSave('{ esto no es json');
    expect(r).toEqual({ ok: false, error: expect.stringContaining('JSON') as unknown as string });
  });

  it('rechaza un JSON sin el wrapper', () => {
    const r = parseSave(JSON.stringify({ characters: [] }));
    expect(r.ok).toBe(false);
  });

  it('rechaza un guardado de una versión más nueva', () => {
    const r = parseSave(archivo(guardadoMinimo(), PERSIST_VERSION + 5));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('más nueva');
  });

  it('rechaza un estado con la forma rota y dice dónde', () => {
    const roto = { ...guardadoMinimo(), prefs: { cps: 40, showOdds: true, fontScale: 3, reducedMotion: 'auto' } };
    const r = parseSave(JSON.stringify({ state: roto, version: PERSIST_VERSION }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('prefs.fontScale');
  });

  it('migra desde una versión vieja antes de validar', () => {
    const r = parseSave(archivo(guardadoMinimo(), 0));
    expect(r.ok).toBe(true);
  });

  it('repara un activeCharacterId que no apunta a ningún personaje', () => {
    const r = parseSave(archivo({ ...guardadoMinimo(), activeCharacterId: 'fantasma' }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.activeCharacterId).toBeNull();
  });
});
