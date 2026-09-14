# Crónicas del Vado

Un RPG narrativo tipo novela visual, de fantasía medieval, que corre entero en el navegador: no hay que instalar nada ni crear una cuenta. Creás un personaje persistente y lo llevás a través de campañas cortas y ramificadas; el juego se acuerda de lo que hiciste dentro de la partida, entre partidas y entre campañas.

**Se juega acá:** https://alcaraz000.github.io/cronicas-del-vado/

## Cómo se juega

Elegís una de cuatro clases —Guerrero, Explorador, Mago o Clérigo— y una campaña. Cada decisión importante se resuelve tirando dos dados de seis más un atributo, con la posibilidad de un éxito a medias. Las heridas se acumulan, la campaña se puede perder, y en algunas escenas el personaje puede morir para siempre.

Hoy hay una sola campaña, **"El vado de Aldamar"**: 46 escenas, cuatro finales (uno de ellos oculto) y entre 30 y 45 minutos por partida.

Una escena se lee como una novela visual: el arte ocupa la pantalla entera, el personaje con el que estás hablando está parado adentro, y encima van la placa con su nombre, el texto y las opciones. Arriba, el lugar, las heridas, la Fortuna y las condiciones; lo que pasó antes se relee en **Historial**.

![Una escena de "El vado de Aldamar": la taberna del Ancla Seca ocupa toda la pantalla —vigas, faroles encendidos, una rueda de timón en la pared— y a la izquierda, recortado sobre el arte, está el Sargento Orell del pecho para arriba, de barba gris y gambesón, mirando a un costado y hundiéndose detrás de la caja de texto; encima del arte van la placa con su nombre, la línea que acaba de decir y las cuatro opciones de la escena](docs/captura-escena.png)

La partida se guarda sola en el navegador (no en un servidor): si cambiás de navegador, de máquina, o borrás los datos del sitio, la perdés. Para llevarla con vos, en **Opciones** hay botones para exportar el guardado a un archivo y para importarlo de vuelta.

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
| `npm run captura` | rehace `docs/captura-escena.png`, la foto de acá arriba (`tools/captura.mts`) |
| `npm run build` | tests + tipos + `vite build` a `dist/` |
| `npm run preview` | sirve `dist/` en local |

## Estructura

- `src/app/` arranque de la app y tokens CSS.
- `src/engine/` motor puro de reglas (sin React ni store).
- `src/content/` catálogo, esquema y campañas (solo datos).
- `src/state/` store de Zustand con persistencia en `localStorage`.
- `src/ui/` pantallas y componentes.
- `tools/` scripts de Node (validador de contenido, captura del README).
- `tests/` tests de Vitest (`tests/**/*.test.{ts,tsx}`).

Alias de import: `@/` apunta a `src/`.

## Deploy

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: instala, corre `npm run build` con `VITE_BASE=/<repo>/` y publica `dist/` en GitHub Pages. Requisito único por repositorio: en *Settings → Pages → Build and deployment → Source* elegir **GitHub Actions**.

## Guardado

La partida se guarda en `localStorage` bajo la clave `juegorol` en cada cambio de estado. Safari e iOS borran ese almacenamiento tras 7 días sin visitas; en esos navegadores conviene exportar la partida desde Opciones.
