/**
 * Migraciones del formato de guardado.
 *
 * `MIGRATIONS[i]` convierte un estado guardado con la versión `i` al formato de la versión `i + 1`.
 * `persist` llama a `runMigrations(estadoGuardado, versionGuardada)`, que aplica en orden
 * `MIGRATIONS.slice(versionGuardada)`. En la versión 1 no hay migraciones: cuando se agregue la
 * primera (de v1 a v2), va en el índice 1 (el índice 0 se rellena con la identidad `(s) => s`)
 * y `PERSIST_VERSION` pasa a 2.
 */
export type Migration = (state: unknown) => unknown;

export const PERSIST_VERSION: number = 1;

export const MIGRATIONS: Migration[] = [];

export function runMigrations(
  state: unknown,
  fromVersion: number,
  migrations: readonly Migration[] = MIGRATIONS,
): unknown {
  return migrations.slice(fromVersion).reduce<unknown>((acc, migrate) => migrate(acc), state);
}
