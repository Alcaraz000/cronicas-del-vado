import { describe, expect, it } from 'vitest';
import { MIGRATIONS, PERSIST_VERSION, runMigrations, type Migration } from '@/state/migrations';

describe('migrations', () => {
  it('la versión 1 no tiene migraciones', () => {
    expect(PERSIST_VERSION).toBe(1);
    expect(MIGRATIONS).toEqual([]);
  });

  it('runMigrations sin migraciones devuelve el mismo estado', () => {
    const estado: unknown = { prefs: { cps: 20 } };
    expect(runMigrations(estado, 0)).toBe(estado);
    expect(runMigrations(estado, 1)).toBe(estado);
  });

  it('runMigrations aplica en orden solo las migraciones desde la versión guardada', () => {
    const migraciones: Migration[] = [
      (s) => ({ ...(s as object), a: 1 }),
      (s) => ({ ...(s as object), b: 2 }),
    ];
    expect(runMigrations({}, 0, migraciones)).toEqual({ a: 1, b: 2 });
    expect(runMigrations({}, 1, migraciones)).toEqual({ b: 2 });
    expect(runMigrations({ x: 1 }, 2, migraciones)).toEqual({ x: 1 });
  });

  it('runMigrations no muta el estado de entrada', () => {
    const migraciones: Migration[] = [(s) => ({ ...(s as object), a: 1 })];
    const entrada = { x: 1 };
    const salida = runMigrations(entrada, 0, migraciones);
    expect(entrada).toEqual({ x: 1 });
    expect(salida).not.toBe(entrada);
  });
});
