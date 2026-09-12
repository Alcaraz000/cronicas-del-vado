# Crónicas del Vado

RPG narrativo tipo novela visual, de fantasía medieval, que corre en el navegador sin servidor. Un personaje persistente atraviesa campañas cortas, ramificadas y resueltas con dados (2d6 con éxito parcial); el mundo lo recuerda dentro de la partida, entre partidas y entre campañas.

El diseño aprobado está en `docs/superpowers/specs/2026-09-10-juegorol-design.md`.

## Requisitos

- Node 24 y npm 11.
- Windows 11 con PowerShell o Git Bash (los scripts no dependen del shell).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | instala las dependencias |
| `npm run dev` | servidor de desarrollo con recarga en caliente |
| `npm test` | Vitest en modo watch |
| `npm run test:run` | corre todos los tests una vez |
| `npm run typecheck` | `tsc --noEmit` sobre `src`, `tests` y `tools` |
| `npm run validate` | valida el contenido de las campañas (`tools/validate.ts`) |
| `npm run simulate` | simula carreras de partidas y escribe `design/sim-report.md` (`tools/simulate.ts`) |
| `npm run build` | tests + tipos + `vite build` a `dist/` |
| `npm run preview` | sirve `dist/` en local |

## Estructura

- `src/app/` arranque de la app y tokens CSS.
- `src/engine/` motor puro de reglas (sin React ni store).
- `src/content/` catálogo, esquema y campañas (solo datos).
- `src/state/` store de Zustand con persistencia en `localStorage`.
- `src/ui/` pantallas y componentes.
- `tools/` scripts de Node (validador de contenido).
- `tests/` tests de Vitest (`tests/**/*.test.{ts,tsx}`).

Alias de import: `@/` apunta a `src/`.

## Deploy

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: instala, corre `npm run build` con `VITE_BASE=/<repo>/` y publica `dist/` en GitHub Pages. Requisito único por repositorio: en *Settings → Pages → Build and deployment → Source* elegir **GitHub Actions**.

## Guardado

La partida se guarda en `localStorage` bajo la clave `juegorol` en cada cambio de estado. Safari e iOS borran ese almacenamiento tras 7 días sin visitas; en esos navegadores conviene exportar la partida (opción disponible en fases posteriores).
