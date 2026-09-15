# El objetivo en pantalla y el loop del acto 1 — plan de implementación

> **Para quien lo ejecute:** SUB-SKILL OBLIGATORIA: usar `superpowers:subagent-driven-development`
> para implementar este plan tarea por tarea.

**Objetivo:** que el jugador siempre sepa qué está tratando de hacer, que el acto 1 deje de ser un
racimo de doce escenas sin salida por decisión, y que ninguna herramienta vuelva a ser ciega a esto.

**Arquitectura:** la campaña declara una lista ordenada de objetivos con condiciones; el motor
deriva cuál está activo con una función pura; la interfaz lo dibuja. Se reusa `Condition`, que el
motor ya evalúa. Las pistas siguen existiendo por dentro y el jugador no las ve nunca.

**Herramientas:** Vite 8.3, React 19, TypeScript 5.9.3 (**clavado**), Vitest 5 con jsdom y Testing
Library, zod 4, zustand 5.

## Restricciones globales

- **No se toca la estructura del acto 1** —los tres lugares, sus escenas, su prosa— ni **las
  etiquetas de las opciones**. Se señaliza, no se rediseña.
- **El presupuesto de prosa está a once palabras del tope.** Los objetivos son texto de interfaz y
  **no cuentan** contra el presupuesto de escenas; verificalo con `npm run lint:text` antes y después.
- **`src/engine/`** sólo recibe la derivación del objetivo activo, que es una función pura más.
- **No se tocan** las fases anteriores: escalado, reparto en dos columnas, historial, revelado,
  salto de lo leído, teclado, foco, preferencias.
- **Cero colores y tamaños literales** en los `*.module.css`; todo `font-size` lleva
  `var(--escala-fuente)`; todo el texto de jugador en `strings.es.ts` o en el contenido.
- Comentarios en castellano rioplatense, explicando el *porqué* y **con mediciones verificadas**.

### Las tres lecciones de la fase anterior, que valen acá

1. **Verificá cada número antes de escribirlo.** Se corrigieron diecisiete números falsos escritos
   como si fueran mediciones. Si alguno de los míos no te da, **PARÁ y reportá**.
2. **Mutá el código para ver si el test se cae.** Se encontraron doce pruebas que parecían cubrir
   algo y no cubrían nada, y **las doce aparecieron rompiendo a propósito, ninguna leyendo**.
3. **La trampa del dev server**, que mordió a seis: puerto propio, verificado por HTTP con un
   identificador (no un comentario: esbuild los borra), y **posterior a tus ediciones**.

---

### Tarea 1: que el bug sea detectable antes de arreglarlo

**Archivos:**
- Crear: `tools/lib/validate/rules/r13_progreso.ts`
- Modificar: `tools/lib/validate/rules/index.ts`, `tools/lib/simulate/politicas.ts`,
  `tools/simulate.ts`
- Test: `tests/fixtures/campaigns/broken/r13.ts`, casos en `tests/tools/validate.test.ts`

**Interfaces:** produce la regla 13 y un simulador que ve bucles. No consume nada.

Es la tarea que **prueba que el bug existe** antes de tocarlo. Al terminar, la regla 13 tiene que
**fallar sobre el `main` de hoy** y el simulador tiene que **reportar partidas colgadas**.

**La regla 13, `r13_progreso`**, comprueba dos cosas sobre cada campaña:

1. **Desde toda escena no final se alcanza un final usando sólo opciones libres** (sin `requires` y
   sin tirada). Hoy se cumple, pero nada lo vigila.
2. **Ninguna región del grafo depende exclusivamente de un `redirect` para salir.** Calculá las
   componentes fuertemente conexas contando **sólo aristas de `choice`**; si una componente con más
   de una escena no tiene ninguna arista de `choice` que salga de ella, es un error. **Sobre el
   contenido de hoy esto falla con el racimo de doce escenas del acto 1**, que es exactamente lo que
   queremos.

Seguí la convención del repo: la regla vive en su archivo, el error lleva el id de la regla, y el
caso de test usa una fixture rota en `tests/fixtures/campaigns/broken/r13.ts` más un caso en
`validate.test.ts` con `soloRegla`.

**El simulador deja de ser ciego.** `candidatas()` en `tools/lib/simulate/politicas.ts` le saca al
simulador toda opción que ya eligió en esa escena — le prohíbe la conducta que produce el bucle, y
su propio comentario lo admite. Agregá una política **`insistente`** que **no** filtre lo ya elegido,
y hacé que el conteo de partidas colgadas **se imprima por consola**. Hoy sale sólo en
`sim-report.md` línea 69, diciendo "0" sobre 12.492 partidas.

- [ ] **Paso 1: los tests que fallan** — la fixture rota de r13 y su caso; un caso que fije que la
  política `insistente` no filtra; un caso que fije que el conteo de colgadas se imprime.
- [ ] **Paso 2: correr y verificar que fallan.**
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4: correr `npm run validate` sobre el contenido real y CONFIRMAR que la regla 13 falla
  con el racimo del acto 1.** Pegá la salida en el informe: es la prueba de que el bug existe.
- [ ] **Paso 5: correr `npm run simulate` con la política nueva** y reportar cuántas partidas se
  cuelgan. La referencia medida es **452 de 2000 con el motor real, en 28 ciclos distintos**;
  verificá vos el número, no lo copies.
- [ ] **Paso 6: commitear.**

```bash
npm test && npx tsc --noEmit
git add -A
git commit -m "test(tools): la regla 13 y un simulador que ve los bucles"
```

**Ojo:** `npm run validate` va a quedar en rojo hasta la tarea 3. Es a propósito y hay que decirlo en
el informe.

---

### Tarea 2: el objetivo actual

**Archivos:**
- Modificar: `src/content/schema.ts`, `src/engine/` (una función nueva), `src/ui/components/StatusBar.tsx`
  y su `.module.css`, `src/ui/screens/EscenaScreen.tsx`
- Test: `tests/engine/objetivos.test.ts` (nuevo), `tests/ui/StatusBar.test.tsx`

**Interfaces:**
- Consume: `Condition` y su evaluador, que ya existen.
- Produce: `objetivoActivo(campaign, state)`, que la tarea 3 usa para escribir los objetivos.

**El esquema.** `Campaign` gana un campo opcional:

```ts
export interface Objetivo {
  id: string;
  /** La línea que lee el jugador. En la voz de la campaña. */
  texto: string;
  /** Cuándo este objetivo pasa a estar en juego. Sin `when`, desde el principio. */
  when?: Condition;
  /** Cuándo se considera cumplido y deja de mostrarse. */
  hecho?: Condition;
}
```

`objetivos?: Objetivo[]` en `Campaign`, **opcional**, para que las fixtures y la campaña de humo
sigan validando sin tocarse. El esquema de zod no es `.strict()`, así que agregar un campo opcional
es puramente aditivo.

**La derivación**, función pura, en `src/engine/`:

```ts
/**
 * El objetivo activo: el PRIMERO de la lista cuyo `when` se cumple y cuyo `hecho` no.
 * El orden de la lista es la prioridad, y lo decide el autor: así una campaña puede poner
 * primero lo urgente aunque se haya habilitado después.
 */
export function objetivoActivo(campaign: Campaign, state: GameState): Objetivo | null
```

**La interfaz.** El objetivo se dibuja en el cromo, **debajo del lugar**, con la serif del juego y en
el color de acento atenuado. No es un dato más de la barra: es lo que estás tratando de hacer. Si no
hay objetivo activo, no se dibuja nada (ni un hueco).

- [ ] **Paso 1: los tests que fallan.** Que sin `objetivos` devuelva `null`; que elija el primero
  cuyo `when` se cumple; que saltee los que tienen `hecho` cumplido; que el orden de la lista mande
  sobre el orden en que se habilitaron; que la barra lo dibuje y que **no dibuje nada** cuando es
  `null`.
- [ ] **Paso 2: correr y verificar que fallan.**
- [ ] **Paso 3: implementar.** La campaña real todavía no declara objetivos: eso es la tarea 3.
- [ ] **Paso 4: verificar que no se rompió nada.** Los tests de `StatusBar`, de la barra móvil y del
  contraste tienen que pasar **sin modificarse**. Si alguno se cae, PARÁ y reportá.
- [ ] **Paso 5: commitear.**

```bash
npm test && npx tsc --noEmit
git add -A
git commit -m "feat(engine): el objetivo activo, derivado del estado"
```

---

### Tarea 3: el acto 1 deja de ser un laberinto

**Archivos:**
- Modificar: `src/content/campaigns/vado/campaign.ts` (la lista de objetivos),
  `src/content/campaigns/vado/scenes/acto1_pueblo.ts` y `acto1_pistas.ts` (los `redirect`)
- Test: `tests/content/vado.test.ts`

**Interfaces:** consume `objetivoActivo` de la tarea 2 y la regla 13 de la tarea 1.

**El `redirect` de las tres pistas se copia a las doce escenas del racimo**, con **la condición sin
el `visited(a1_plaza) >= 3`**:

```ts
{ when: { all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }] }, to: 'c1_cuerpo' }
```

Las doce son: `a1_plaza`, `a1_taberna`, `a1_taberna_trastienda`, `a1_orell_mesa`, `a1_alcaldesa`,
`a1_berta_despacho`, `a1_ilse_patio`, `a1_molino`, `a1_molino_pell`, `a1_molino_rueda`,
`a1_molino_trampilla`, `a1_posada`. **El de `sospecha >= 4` se queda sólo en la plaza**, que es donde
tiene sentido: es la puerta del jugador temerario y ya funciona.

**Cuidado con el orden:** `enter()` resuelve los `redirect` **al entrar**, antes de dibujar. Un
redirect en la escena donde el jugador ya está no se dispara hasta que entre de nuevo a alguna. Con
las doce cubiertas, la siguiente elección lo saca. Verificalo jugando.

**Los objetivos de la campaña.** Escribí la lista en la voz de la campaña, en este orden y con estas
condiciones. **Son un borrador para que Gabriel corrija**, así que dejalos juntos y fáciles de
editar, con un comentario que lo diga:

| cuándo | objetivo |
|---|---|
| desde el principio | *Llegá a Aldamar y averiguá qué pasó con Tomé, el molinero.* |
| en el pueblo, sin ninguna pista | *Preguntá en el pueblo: la taberna, la casa de la alcaldesa y el molino.* |
| con 1 o 2 pistas | *Todavía te falta ver [lo que falte].* |
| con las tres pistas | *Volvé sobre lo que viste: hay algo que no cierra.* |
| tras `c1_cuerpo` | *(el objetivo del acto 2)* |

El de "todavía te falta" puede ser un objetivo por combinación, o tres objetivos encadenados que se
van cumpliendo. **Elegí la forma más simple que funcione y explicá por qué.**

- [ ] **Paso 1: los tests que fallan.** Que las doce escenas declaren el redirect; que la condición
  **no** tenga `visited`; que la campaña declare objetivos y que el activo cambie al conseguir cada
  pista.
- [ ] **Paso 2: correr y verificar que fallan.**
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4: la prueba que da sentido a la fase.** Corré el recorredor de la tarea 1 con la
  política `insistente`, **2000 partidas**, y confirmá que **las 452 partidas colgadas bajan a
  cero**. Si no bajan a cero, reportá cuántas quedan y en qué ciclos: es el número que decide si la
  tarea está hecha.
- [ ] **Paso 5: `npm run validate` tiene que pasar**, con la regla 13 en verde. Era roja desde la
  tarea 1.
- [ ] **Paso 6: verificar jugando** a 1919×905, con servidor propio verificado. Entrá a la casa de
  Berta y elegí lo mismo una y otra vez, como hizo Gabriel: el objetivo tiene que decirte qué falta.
- [ ] **Paso 7: commitear.**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "feat(vado): el acto 1 tiene salida y el juego dice que estas haciendo"
```

---

### Tarea 4: lo que la prosa promete, el estado lo registra

**Archivos:** `src/content/campaigns/vado/flags.ts`, `scenes/acto1_pueblo.ts`,
`scenes/acto1_pistas.ts`, `scenes/prologo.ts`, `scenes/desenlace.ts`, `scenes/acto2_ley.ts`
**Test:** `tests/content/vado.test.ts`

Cinco casos, cada uno con su test. **Ninguno cambia una etiqueta de opción.**

1. **`a1_alcaldesa.reclamar_el_adelanto`** — la prosa dice *"te adelanta la tercera parte"* y la
   opción no tiene efectos. Agregá una bandera de campaña (`run:cobro_el_adelanto` o el nombre que
   siga la convención de `flags.ts`) y una **variante de texto** para cuando ya cobraste, de modo que
   la segunda vez diga otra cosa. El motor **no tiene dinero** y no se lo va a agregar.
2. **`a1_molino.subir_por_la_rueda`** — *"La tapa tiene el herraje forzado, y no de este lado"* es un
   hallazgo forense, no ambiente. Va su bandera.
3. **`cl_molino.escuchar`, banda de éxito** — Halvar dice que el peaje del medio es suyo, que es
   literalmente lo que significa `run:sabe_de_halvar`, y la bandera ya existe (`flags.ts:37`). Va el
   `set`.
4. **`c2_anochece.cerrar_los_postigos`** — *"te da medio pan"*: no hay comida en el juego. **Es texto
   de campaña, así que tocarlo toca el presupuesto de prosa**, que está a once palabras del tope.
   Medí con `npm run lint:text` antes y después; si no entra, decilo y proponé.
5. **`p_puente_rechazo.colarte_por_el_terraplen`, banda parcial** — *"con una bota menos"*: no hay
   calzado. Mismo criterio que la anterior.

**Para 4 y 5, el criterio es este:** o el efecto existe en el vocabulario del motor, o la frase no
puede afirmar que pasó. Preferí **la frase** antes que inventar vocabulario nuevo: agregar comida o
calzado al motor por una línea cada uno es la clase de cambio que después nadie mantiene.

- [ ] **Paso 1: los tests que fallan**, uno por caso, que muerdan.
- [ ] **Paso 2: correr y verificar que fallan.**
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4: `npm run lint:text`** y reportar el presupuesto antes y después.
- [ ] **Paso 5: commitear.**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "fix(vado): lo que el texto dice que paso, el estado lo registra"
```

---

### Tarea 5: verificación y cierre

- [ ] **Paso 1: los ocho puntos del §7 del diseño**, uno por uno, con evidencia.
- [ ] **Paso 2: una partida entera jugada** a 1919×905 y a 375×812, con la consola abierta. Cero
  errores.
- [ ] **Paso 3: la tabla de objetivos para Gabriel**, en el informe: qué dice cada uno y cuándo
  aparece, para que los corrija de una pasada.
- [ ] **Paso 4: el circuito**

```bash
npm test && npx tsc --noEmit && npm run validate && npm run build && npm run captura
```

- [ ] **Paso 5: commitear.**
