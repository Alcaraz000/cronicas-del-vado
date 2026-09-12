# Fase F — UI completa

**Fecha:** 12 de septiembre de 2026
**Estado:** aprobado por Gabriel
**Depende de:** spec de diseño `2026-09-10-juegorol-design.md`, §6 (Experiencia de juego y UI) y §12 (roadmap, fila F)

---

## 0. Alcance

La Fase F convierte una UI que **funciona** en una que **se siente como una novela visual**. Es la última fase antes del pulido y el lanzamiento (H).

Es casi enteramente trabajo de interfaz: el motor ya expone todo lo que hace falta y la UI no lo consume. Antes de escribir nada conviene saber qué hay:

| Ya existe en el motor, sin lector en la UI | Dónde |
|---|---|
| Cada ventaja/desventaja con su origen y si se anuló | `RollPreview.sources: RollSource[]`, con `origin` y `cancelled` |
| Hash por párrafo mostrado y mapa de lo leído | `LogEntry.scene.hashes`, `SeenMap` (`seen[escena] = hashes`) |
| Preferencias de lectura | `Prefs { cps, showOdds, fontScale, reducedMotion }`, declarado y muerto salvo `showOdds` |
| Nivel, XP, tope de campaña, reliquias, Caídos | `Character`, `WorldState.fallen`, `progression.ts` |

Y qué parte de la §6 ya está construida, para no rehacerla: `OptionList` ya muestra el chip de atributo con el modificador neto, las fuentes de ventaja con su tachado, la etiqueta de riesgo, los porcentajes de las tres bandas, la calavera de escena mortal, la marca "ya elegida" y el teclado 1-9. `EscenaScreen` ya precarga los fondos de las escenas hijas. `TextColumn` ya acumula toda la partida.

### 0.1 Lo que entra

1. **Tirada animada** con dados SVG, chips que entran con su origen y las anulaciones tachadas, sello de banda.
2. **Lectura**: máquina de escribir por párrafo, clic que completa, **saltar leído** que frena en la variante nueva.
3. **Ficha** como cajón con tecla C, con **Recuerdos** y crónica canónica.
4. **Canon legible**: `memories` en el contenido, regla r12 del validador, y "lo que el mundo recordará" en la pantalla de fin.
5. **Preferencias y accesibilidad**: cps, escala de fuente 100/125/150 %, `prefers-reduced-motion`, foco visible, Esc, diálogos propios en vez de `window.confirm`, fundido cruzado del fondo.

### 0.2 Lo que NO entra

- **Móvil** (fondo arriba y hoja inferior). La §6 lo manda explícitamente a la Fase H.
- **Cajón de Menú** aparte: las opciones ya viven en un modal y no hay nada más que meter ahí.
- Los hallazgos del informe de la Fase E (tiradas evitables, alcance de `fin_heredero`, exceso de palabras). Son decisiones de diseño de contenido, no de UI, y Gabriel las decide por separado.
- Cualquier cambio en `engine/`. Si una tarea cree que necesita tocar el motor, es señal de que entendió mal el dato que ya está expuesto: que lo diga en vez de cambiarlo.

---

## 1. El dato nuevo: `memories`

Los flags de canon tienen descripción en `flags.ts`, pero está escrita para el autor: *"Lo enciende `p_puente.intimidar`; `a1_orell_mesa.recordarle_el_puente` lo limpia"*. No sirve para mostrarle nada al jugador. Y hoy la pantalla de fin **no muestra los `canonFlags` en absoluto**: el "lo que el mundo recordará" de la §6 nunca se implementó.

### 1.1 Contenido

Un archivo `memories.ts` por campaña, con una línea por flag de canon:

    export const memories: Record<string, string> = {
      "char:vado.tome_enterrado": "Le diste sepultura a Tomé en la vega, con el agua subiendo.",
      // … una línea por flag de canon
    };

Una línea **en voz del narrador, en segunda persona, en pasado**, como el resto de la prosa del juego. Es lo que el jugador lee en la Ficha meses después, cuando ya no se acuerda de la partida. Son 8 líneas para el vado: 6 `char:vado.*` y 2 `world:vado.*`.

### 1.2 Esquema

`Campaign` gana `memories: Record<string, string>` (obligatorio, puede ir vacío en una campaña sin canon), con su espejo zod `z.record(z.string(), z.string())`. La campaña de humo `prueba/` lo declara aunque sea vacío.

### 1.3 Regla r12 del validador

Simétrica a las once que ya hay, ERROR, con su fixture roto:

- Todo flag de canon declarado en `campaign.flags` — los que empiezan con `char:<id>.` o `world:<id>.` — **tiene** su línea en `memories`.
- Toda clave de `memories` **es** un flag de canon declarado: ni huérfanas, ni flags `run:` (que mueren con la partida y nunca se leen en la Ficha), ni espacios compartidos de `world/flags.ts` (`char:met.*`, `char:place.*`, …), que el motor deriva y se muestran con el nombre del PNJ o del lugar, no con una línea escrita.

El mensaje de error dice qué flag es y por qué: igual que r11, la regla explica el borde, no solo lo marca.

---

## 2. Recuerdos y crónica canónica

Derivación pura en `src/ui/memoria.ts`, fuera de los componentes, con su test propio. Toma `GameState` + `Campaign` y devuelve la estructura que la Ficha dibuja.

Cuatro grupos:

1. **Gente** — `char:met.<id>` → nombre del PNJ, vía `campaign.npcs` (que el store ya entrega con el mundo adentro).
2. **Lugares** — `char:place.<id>` → nombre del lugar.
3. **Lo que hiciste** — flags de canon del personaje (`char:<campaña>.*`) → su línea de `memories`.
4. **Lo que el mundo recuerda** — flags `world:<campaña>.*` → su línea, más los **Caídos** (`world.fallen`: nombre, clase, nivel y campaña donde murió) y las **reliquias** que lleva el personaje.

Más la **crónica canónica** por campaña jugada: `campaignLog[id].canonEnding` → título del final desde `campaign.endings`, con partidas jugadas y finales vistos.

**Lo apostado no se muestra.** Durante la partida, `run.stagedFlags` son apuestas que una derrota no escribe. La Ficha muestra solo canon consolidado, así que en la primera partida los Recuerdos están casi vacíos a propósito: la memoria crece entre partidas, que es el pilar 4 del juego.

Un flag de canon sin línea en `memories` no puede llegar a producción (lo corta r12), pero si llegara, la derivación lo **omite** en silencio en vez de mostrar el id crudo: la Ficha nunca muestra un identificador.

---

## 3. Lectura: revelado y saltar leído

### 3.1 Revelado

Hook `useRevelado(log, prefs)` en `src/ui/hooks/`. Estado solo de UI, **no persistido**.

- Solo anima **la última entrada** del log (`scene` u `outcome`). Todo lo de arriba es historial y se muestra completo.
- Dentro de la entrada, párrafo por párrafo a `prefs.cps` caracteres por segundo.
- **Primer clic (o Enter/Espacio) completa el párrafo actual; el segundo avanza al siguiente.** Es la regla de la §6.
- Al terminar el último párrafo, aparecen las opciones o el panel de tirada.
- `cps: 0` o `reducedMotion` activo → todo instantáneo, opciones de inmediato.
- Al recargar, la última entrada se muestra completa y sin animación: nunca se pierde texto por una animación a medias.

**Las opciones aparecen recién cuando el texto terminó.** Decisión tomada: es la convención de novela visual y es lo que hace que "saltar leído" signifique algo. El clic en cualquier parte de la columna completa, así que el costo para el jugador apurado es un clic.

### 3.2 Saltar leído

El motor deriva `seen` al **salir** de la escena (`memory.ts`), así que mientras la leés `seen[escena]` todavía tiene los hashes de la visita anterior. Comparar `entry.hashes[i]` contra ese conjunto dice exactamente qué párrafo es nuevo.

El botón aparece **solo** cuando la entrada en curso tiene al menos un párrafo ya visto sin revelar. Al pulsarlo: revela de golpe todos los párrafos consecutivos ya vistos y **frena en el primero cuyo hash no está en `seen`**, que arranca a tipearse normal. Frena también al terminar la entrada, porque lo que sigue es una decisión o una tirada.

Es la única función del juego que le da valor mecánico a la memoria de párrafo, y su test es el que verifica el pilar: una escena repetida cuya variante nueva detiene el salto.

---

## 4. Tirada animada

Reemplaza el `RollPanel` actual, que son 61 líneas de números pelados.

**Secuencia** (~700 ms en total, según la §6):

1. La línea de objetivo en palabras (ya viene en `preview.targetLine`).
2. Los dados giran 700 ms y se asientan en su valor. Con ventaja o desventaja son tres y **el descartado se apaga** (`pending.kept` son índices).
3. Los chips entran uno a uno con su origen: atributo, dificultad, Veterano si no es cero, y cada `RollSource` con su etiqueta. **Los `cancelled` entran tachados**, porque el jugador tiene que ver que había ventaja y desventaja y se anularon — si no, el modo "normal" parece un error.
4. Total y sello: **Éxito / Con costo / Fallo / ¡Crítico! / Grave**, con icono y texto, nunca solo color.
5. Recién ahí aparecen "Fortuna: repetir este dado" y "Poder", si corresponden.

**Cualquier clic salta la animación** y muestra el estado final. Con `prefers-reduced-motion` se muestra el final directo, sin giro ni entrada de chips.

Al repetir un dado con Fortuna, **solo re-anima el dado repetido**: `pending.rerolls` trae los índices en orden y el último es el que acaba de cambiar. Los demás se quedan quietos, que es lo que deja ver que el resto de la tirada no se tocó.

Los chips salen de un componente `Chips` compartido con `OptionList`, para que un modificador se vea igual cuando lo mirás antes de decidir y cuando lo mirás en el resultado.

---

## 5. Ficha, cajones y diálogos

**`Cajon`**: componente genérico, panel lateral sobre la escena con `role="dialog"`, `aria-modal`, foco atrapado, Esc cierra y el foco vuelve a donde estaba. Nada de librerías: son unas pocas decenas de líneas y las necesitamos exactas.

**`Ficha`** encima de `Cajon`, se abre con el botón de la barra o con **C**: atributos, clase con su Poder y su Debilidad, rasgos, habilidades, objetos de la partida, reliquias, Heridas con su etiqueta, condiciones, XP y nivel **con el tope de la campaña visible**, y Recuerdos. La tecla no dispara si el foco está en un campo de texto (`OptionList` ya tiene ese guardia y se reutiliza).

**`Dialogo`**: reemplaza los dos `window.confirm` que hoy usan la escena mortal y abandonar. El de la escena mortal es la **confirmación consciente del estado**: texto distinto para Sano, Herido y Malherido, desde `strings.es.ts`, sin texto por escena — el motor ya sabe las Heridas y la escena ya está marcada `lethal`. Es la mitigación del riesgo 9 de la spec y no puede quedar en un `confirm` del navegador que el jugador cierra sin leer.

---

## 6. Preferencias, accesibilidad y fundidos

`OpcionesModal` gana los controles de lo que ya está declarado: máquina de escribir (40 cps / instantáneo), escala de fuente 100/125/150 %, movimiento reducido (auto / siempre), y mostrar probabilidades, que ya existe pero no tiene control.

`usePrefsCss` escribe la escala como variable CSS en la raíz; `tokens.css` ya centraliza tipografía y colores, así que ningún `*.module.css` cambia de tamaño a mano.

`useReducedMotion` combina `prefs.reducedMotion` con `prefers-reduced-motion`. **jsdom no implementa `window.matchMedia`**: el hook lee con guarda (si no existe, no hay preferencia del sistema) y `tests/setup.ts` trae un shim para poder probar las dos ramas.

Accesibilidad: foco visible en todo lo enfocable, contraste 4,5:1 verificado sobre los tokens, resultados con icono **y** texto, `aria-live` en la columna para que el texto que aparece se anuncie.

**Fundido cruzado del fondo**: `Imagen` espera a `decode()` y funde; con movimiento reducido, corta. La precarga de las escenas hijas ya está hecha.

---

## 7. Archivos

**Nuevos:** `src/content/campaigns/vado/memories.ts`, `src/content/campaigns/prueba/memories.ts`, `tools/lib/validate/rules/r12_memories.ts`, `src/ui/memoria.ts`, `src/ui/hooks/useRevelado.ts`, `useReducedMotion.ts`, `usePrefsCss.ts`, `src/ui/components/Cajon.tsx`, `Ficha.tsx`, `Recuerdos.tsx`, `Dados.tsx`, `Chips.tsx`, `Dialogo.tsx`, con sus `.module.css` y sus tests.

**Tocados:** `schema.ts` (+`memories`), `campaign.ts` de las dos campañas, `tools/lib/validate/index.ts` (registrar r12), `RollPanel.tsx` (reescrito sobre `Dados` y `Chips`), `OptionList.tsx` (usa `Chips` y `Dialogo`), `TextColumn.tsx` y `Parrafos.tsx` (revelado), `EscenaScreen.tsx` (cajón, teclas, saltar leído), `StatusBar.tsx` (botón Ficha), `FinScreen.tsx` (lo que el mundo recordará, finales vistos con los no vistos en silueta), `OpcionesModal.tsx` (preferencias), `Imagen.tsx` (fundido), `strings.es.ts`, `tests/setup.ts` (shim de `matchMedia`).

Componentes chicos con un propósito cada uno: `resolve.ts` y `store.ts` ya quedaron grandes y la deuda está anotada; no la repetimos en la UI.

---

## 8. Pruebas

- **Revelado**: relojes falsos; el texto aparece por párrafo; el primer clic completa y el segundo avanza; `cps: 0` y movimiento reducido muestran todo de una.
- **Saltar leído**: se juega una escena dos veces con el motor real y se verifica que el salto **frena exactamente en la variante nueva**. Es el test que protege el pilar de la memoria.
- **Tirada**: con ventaja y desventaja a la vez aparecen los dos chips **tachados** y el modo es `cancelled`; el dado descartado se apaga; repetir con Fortuna re-anima solo ese dado; con movimiento reducido no hay animación.
- **Ficha**: C la abre, Esc la cierra, el foco vuelve; C no dispara desde un campo de texto; los Recuerdos muestran la línea de `memories` y **nunca** un id crudo.
- **r12**: fixture roto por cada mitad de la regla (flag de canon sin línea, línea sin flag), como las otras once.
- **`memoria.ts`**: derivación pura, con un estado que tiene canon, Caídos y reliquias.
- El circuito completo sigue verde: `npm test`, `npm run validate` en perfil `release` sobre el vado, `npm run build`.

---

## 9. Criterio de listo

Lo que la §12 pide para la fila F, sin agregados:

1. **Una tirada con Fortuna se entiende sin que nadie te la explique**: se ve de dónde salió cada punto del total y qué se anuló.
2. **Saltar leído se frena en una variante nueva**, verificado en una partida real, no solo en un test.
3. La Ficha muestra Recuerdos legibles y la crónica canónica; ningún identificador a la vista.
4. `validate` en verde con r12 incluida, `npm test` en verde, `build` en verde.
5. Sin errores de consola jugando una partida entera.
