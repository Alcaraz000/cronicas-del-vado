# Fase H — Pulido y lanzamiento

**Fecha:** 13 de septiembre de 2026
**Estado:** aprobado por Gabriel
**Depende de:** spec de diseño `2026-09-10-juegorol-design.md` (§12, fila H) y el informe de la Fase E, `src/content/campaigns/vado/design/02-informe-fase-e.md` §8

---

## 0. Alcance

Es la última fase antes de la v1. Cierra lo que el roadmap dejó para el final y publica el juego.

### 0.1 Lo que entra

1. **La pasada de contenido** sobre "El vado de Aldamar": cobrar la salida sin tirada, telegrafiar el final oculto, recortar los desenlaces y arreglar la opción inalcanzable del clímax.
2. **El simulador vuelve a medir**: la política codiciosa deja de esquivar todos los dados, y los umbrales del informe se promueven a aserciones.
3. **Móvil como hoja inferior**, que es lo único que la spec §6 mandó explícitamente a esta fase.
4. **README, accesibilidad y pasada editorial** de una ruta por clase.
5. **El deploy**: repositorio público, push, Pages por GitHub Actions.

### 0.2 Lo que NO entra

- **Los testers.** Conseguir 3 a 5 personas, mirarlas jugar y recoger lo que digan es de Gabriel. El criterio de listo de la spec ("los testers terminan una partida sin ayuda y al menos 2 rejuegan") se cierra después de esta fase, con datos que solo él puede traer.
- **La lectura humana final.** Acá se hace una pasada editorial y se deja la lista de hallazgos; leerla de punta a punta es de Gabriel, porque es su prosa.
- **Cualquier cosa de "Más adelante"** de la spec §12: ascensión elegible, cicatrices, audio, segunda campaña, traducción, service worker.
- **Tocar `src/engine/`.** Nada de esta fase lo necesita.

### 0.3 Dos correcciones al plan que se aprobó de palabra

El informe de la Fase E contradice, con datos, dos de las formas que se propusieron primero. Manda el informe:

- **Las tiradas evitables NO se arreglan sacando la opción sin tirada**, sino cobrándola. Que exista es lo que protege la regla de la spec §4 (toda escena mortal necesita una salida sin tirada) y al jugador que no quiere arriesgar. El problema es que hoy **es gratis**: *"que ceder siempre sea una decisión y no un almuerzo gratis"*.
- **El final oculto NO se arregla ensanchando las vías.** El 14,4 % de las partidas enciende `char:vado.sabe_del_sello`, pero de esas, el 26,1 % termina en `fin_heredero`. La puerta no es angosta: **es invisible**. Se arregla telegrafiando, no agregando caminos. Además, con 46.329 partidas la brecha entre clases es de 1,58 % a 2,04 %: ruido. No hay que escribirle una puerta extra a ninguna clase.

---

## 1. La pasada de contenido

Es el grueso de la fase y toca solo `src/content/campaigns/vado/`. Ninguna de estas cuatro cosas cambia el motor, el esquema ni las reglas.

### 1.1 Cobrar la salida sin tirada en las escenas bisagra

Hoy **41 de las 42 escenas no finales** ofrecen una opción sin tirada y sin `requires`. Un jugador que elija siempre lo seguro termina la campaña con 29 escenas distintas, 6.060 palabras, **0 tiradas, 0 Heridas, 9 de los 10 hitos** y el final `fin_dravos`. El sistema de reglas entero nunca se enciende.

La corrección **no es quitar la opción**. Es que en las escenas bisagra tenga un costo **diegético y visible antes de elegir**:

- un tic de `sospecha` (el reloj llega a 4 y redirige, así que ceder cuatro veces tiene consecuencia),
- un objeto que se pierde o que no se consigue,
- una relación que se enfría (`run:orell_confia`, `run:ilse_confia`),
- o un hito que no se marca.

**Qué es una escena bisagra:** los cuellos por los que pasa toda partida. Los cuatro cuellos de acto, la acusación, los dos encuentros y el clímax. Es alrededor de una docena de escenas, no las 41: en una escena de exploración lateral, ceder gratis está bien.

**Y la ruta muda deja de juntar 9 de 10 hitos.** Al menos tres hitos pasan a exigir que algo se resuelva, no que se esquive.

### 1.2 Telegrafiar el sello

Las escenas que preceden a `a2_ley_cartas.reconocer_el_sigilo` y a `a2_fuera_sello.leer_la_piedra` tienen que decirle al jugador **que ahí hay algo**. Una línea de texto y una etiqueta más golosa en la opción.

La mecánica no se toca: la tirada de Saber · difícil con un solo intento por partida (`run:piedra_leida`) se queda como está. Lo único que cambia es que la primera partida sepa dónde mirar.

### 1.3 Recortar ~3.200 palabras de los desenlaces

El exceso es del **+20,6 %** y **no está en la prosa de escena** (+2 %, que está perfecta) sino en los desenlaces y bandas de tirada: **+54 %**.

Esto pasa de "estaría bueno" a "hay que hacerlo" justamente por §1.1: la pasada hace que se tiren más dados, así que esos desenlaces se van a leer mucho más que hoy. Las cinco peores celdas, que el informe ya nombra: `cl_molino` +216, `a1_molino_pell` +178, `a1_molino_trampilla` +165, `c1_acusacion` +163, `a1_ilse_patio` +146.

`npm run lint:text` mide esto y tiene que quedar sin errores en perfil `release`.

### 1.4 La opción inalcanzable del clímax

`carta_de_halvar` solo se consigue en `a2_ley_torre`, así que quien juega la rama B llega a `cl_halvar` con `leerle_el_libro_de_rutas` imposible de elegir.

**La salida es condicionar la opción**, no escribirle una segunda fuente al objeto: `requires` sobre el objeto, más un `lockedHint` que diga qué falta. Es el patrón que la campaña ya usa en todas partes, no agrega prosa, y encima juega a favor de la rejugada — el jugador ve que hubo una carta que podría haber conseguido y no consiguió, que es exactamente lo que hace volver a jugar. Escribir una segunda fuente sería contenido nuevo en el acto 2 para tapar un agujero de continuidad.

---

## 2. El simulador vuelve a medir

### 2.1 Por qué no alcanza con §1.1

**El simulador mira `preview.odds`, no los efectos.** Una opción sin tirada le vale 1 —no puede fallar— y ningún costo que se le agregue en §1.1 aparece en ese número. O sea: cobrar la salida mejora el juego para una persona, y **no cambia ni un dígito de la simulación**.

Por eso el informe dice que (a) y (c) van juntas, y que "(c) sin (a) es maquillaje". Las dos, en esta fase.

### 2.2 El cambio

En `tools/lib/simulate/politicas.ts`, la política codiciosa deja de puntuar con 1 a la opción sin tirada. Pasa a valer una constante documentada, **`PROB_LIBRE = 0.7`**: para esta política, ceder equivale a una tirada que gana 7 de cada 10 veces, y si hay una tirada mejor que eso, la toma.

Es un solo número y es un botón de diseño: queda declarado como constante con nombre, con el comentario de qué modela.

Las otras dos políticas no se tocan. La aleatoria es la que da cobertura y la temeraria es la que busca el riesgo; las dos ya miden lo que tienen que medir.

### 2.3 Los umbrales

Hoy hay tres aserciones duras. Con la pasada hecha, se suma la cuarta que el informe pedía y que hasta ahora era solo una métrica:

4. **La política codiciosa hace al menos 3 tiradas por partida.** Es la guardia directa contra volver al estado de hoy, y solo tiene sentido una vez que §1.1 y §2.2 están hechas.

Las tres que ya existen se recalibran con los datos de la corrida nueva, sin aflojarlas.

---

## 3. Móvil como hoja inferior

La spec §6 lo dice así: *"Móvil: fondo arriba y hoja inferior, en pulido"*. Hoy hay un solo `@media (max-width: 800px)` en `EscenaScreen.module.css` que apila las dos columnas, y se juega, pero el fondo se come media pantalla.

El diseño: el fondo ocupa la parte de arriba con una altura fija en proporción, y el texto con sus opciones vive en una hoja que sube desde abajo y tiene su propio scroll. El retrato del hablante se hace chico y va sobre la hoja. La barra de estado se compacta.

**Sin librerías y sin gestos.** No hay que arrastrar la hoja: es un layout, no un componente interactivo. Un `@media` y algo de `grid`.

Se verifica con el emulador de móvil del navegador a 375×812, jugando de verdad: entrar a una escena, leer, tirar, abrir la Ficha.

---

## 4. README, accesibilidad y pasada editorial

**README:** ya existe y está bien armado (requisitos, comandos, estructura, deploy). Le falta lo que le importa a alguien que llega de afuera: qué es el juego, cómo se juega, la URL, y una captura.

**Accesibilidad:** la Fase F dejó hecho el foco visible, el contraste 4,5:1 medido, `aria-live` en la columna, los diálogos con foco atrapado y el teclado completo. Queda el barrido final: navegar la app entera **solo con teclado**, de la pantalla de inicio a un final, y anotar dónde se traba.

**Pasada editorial:** una ruta por clase leída de punta a punta buscando repeticiones, saltos de voz y quiebres de continuidad, con la lista de hallazgos en un informe. No se corrige prosa sin que Gabriel lo vea: la lista es para él.

---

## 5. El deploy

Todo lo técnico está hecho desde la Fase A: `.github/workflows/deploy.yml` compila con `VITE_BASE=/<repo>/` y publica `dist/`, y `vite.config.ts` lee esa variable. Falta solamente el repositorio.

`gh` está instalado y autenticado como `Alcaraz000`, así que no hace falta el navegador:

1. `gh repo create Alcaraz000/cronicas-del-vado --public --source=. --remote=origin --description=...`
2. `git push -u origin main`
3. Fuente de Pages en GitHub Actions, vía `gh api -X POST /repos/Alcaraz000/cronicas-del-vado/pages` con `build_type: workflow`.
4. Esperar el workflow y verificar que la URL carga y que se juega.

**Va último**, con todo lo demás en verde: el primer push dispara el deploy.

**Gabriel ya aprobó que el repositorio sea público**, sabiendo que eso hace público el código, las 18.800 palabras de prosa con sus cuatro finales, la biblia, el outline y las imágenes.

---

## 6. Criterio de listo

Lo que la spec §12 pide para la fila H, menos lo que depende de los testers:

1. **La política codiciosa tira dados y a veces pierde.** La aserción 2 mide algo, y la nueva aserción 4 pasa.
2. **La partida media entra en 30-45 minutos**, con el recorte hecho y `lint:text` sin errores en perfil `release`.
3. **El juego se juega en un teléfono**, verificado a 375×812 jugando de verdad.
4. **Hay URL pública** y el juego carga y se juega ahí.
5. **La app entera se navega solo con teclado.**
6. **Cero errores de consola**, en escritorio y en móvil.
7. `npm test`, `npx tsc --noEmit`, `npm run validate` y `npm run build`, los cuatro en verde.

Lo que queda para después, y es de Gabriel: los testers, la lectura humana final, y fijar la duración real de la partida con lo que ellos tarden.
