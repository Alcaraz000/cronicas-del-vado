# Fase H — Pulido y lanzamiento: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usá `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que el juego se pueda jugar de verdad —con dados, en un teléfono, con teclado— y que esté publicado en una URL.

**Arquitectura:** casi todo es contenido y CSS. La única pieza de código real es el simulador, que hoy no mide lo que dice medir. El motor no se toca. El deploy ya está construido desde la Fase A: falta el repositorio.

**Stack:** Vite 8.3 + React 19 + TypeScript 5.9.3 + Vitest 5 + zod 4 + zustand 5. Las herramientas de `tools/` corren con tsx en Node puro. `gh` 2.93 autenticado como `Alcaraz000`.

## Restricciones globales

- **No se toca `src/engine/`.** Ninguna tarea de esta fase lo necesita. Si una cree que sí, que lo diga en su informe en vez de cambiarlo.
- TypeScript queda en **5.9.3**. No actualizar: la 7.x elimina `baseUrl` y rompe el `tsconfig`.
- **Ningún `*.module.css` escribe un color ni un tamaño de fuente literal**: todo sale de `src/app/tokens.css`, y todo `font-size` se multiplica por `var(--escala-fuente)`.
- **Todo el texto que ve el jugador vive en `src/ui/strings.es.ts`.** El texto de la campaña vive en sus escenas. Castellano rioplatense con voseo.
- **La UI nunca muestra un identificador.**
- **La prosa nueva o corregida respeta la voz de la campaña**, que está definida en `src/content/campaigns/vado/design/00-biblia.md`: registro seco, segunda persona, presente, sin adjetivos de relleno.
- Tests en castellano, con `describe`/`it` importados explícitamente de vitest (el proyecto NO usa `globals: true`), y `/** @vitest-environment jsdom */` en la primera línea de los tests de componentes.
- **Un commit por tarea**, mensaje en castellano, con la línea `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` al final. Es textual.
- Antes de dar una tarea por terminada: `npm test`, `npx tsc --noEmit` y `npm run validate`, en verde. Las tareas de contenido corren además `npm run lint:text`.

## Mapa de archivos

**Se crean:**

| Archivo | Responsabilidad |
|---|---|
| `src/content/campaigns/vado/design/04-informe-fase-h.md` | Qué se cambió en la pasada de contenido y qué movió en la simulación |
| `src/content/campaigns/vado/design/05-lectura-editorial.md` | Los hallazgos de leer una ruta por clase, para que Gabriel decida |

**Se tocan:** `tools/lib/simulate/politicas.ts`, `types.ts`, `agregado.ts`, `informe.ts`, `partida.ts`; las escenas de `src/content/campaigns/vado/scenes/`; `src/ui/screens/EscenaScreen.module.css`; `README.md`; y los tests de `tests/tools/simulate*.test.ts`.

## Orden de las tareas

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. La 1 va primero porque es el instrumento con el que se miden la 2 y la 3. La 9 va última porque el primer push publica.

---

### Tarea 1: el simulador vuelve a medir

**Archivos:**
- Modificar: `tools/lib/simulate/politicas.ts`, `tools/lib/simulate/types.ts`, `tools/lib/simulate/agregado.ts`, `tools/lib/simulate/informe.ts`
- Test: `tests/tools/simulate.test.ts`

**Interfaces:**
- Consume: nada.
- Produce: la política `prudente`, la constante `PROB_LIBRE`, la columna de hitos en el informe y la aserción 4. Las tareas 2 y 3 se verifican leyendo lo que esto reporta.

El simulador tiene hoy tres políticas y una de ellas miente. `probExito` le da **1** a una opción sin tirada —no puede fallar— así que la política `codiciosa` **siempre** elige la opción libre, hace cero tiradas, y la aserción de muerte pasa con 0,0 % porque nunca se tocó un dado.

Hay que separar dos cosas que hoy están mezcladas:

- **`codiciosa`** tiene que ser lo que su nombre dice: la mejor jugada, incluidas las tiradas buenas.
- **`prudente`**, nueva, es el jugador que cede siempre: exactamente el comportamiento que `codiciosa` tiene hoy. Es el instrumento con el que se mide si ceder cuesta algo, que es de lo que se trata la tarea 2.

- [ ] **Paso 1: escribir los tests que fallan**

En `tests/tools/simulate.test.ts`, mirá primero cómo están escritos los que ya existen y seguí ese estilo.

```ts
describe('política codiciosa', () => {
  it('prefiere una tirada buena antes que ceder', () => {
    // opciones: una sin tirada, y una con odds.success = 0.8
    // la codiciosa tiene que elegir la tirada, porque 0.8 > PROB_LIBRE
  });

  it('cede cuando ninguna tirada llega al umbral', () => {
    // opciones: una sin tirada, y una con odds.success = 0.4
    // la codiciosa tiene que elegir la libre
  });
});

describe('política prudente', () => {
  it('siempre elige la opción sin tirada si la hay', () => {
    // aunque haya una tirada con odds.success = 0.99
  });

  it('si no hay ninguna sin tirada, elige la de mayor éxito', () => {
    // no puede quedarse sin elegir: toda escena tiene que poder avanzar
  });
});
```

- [ ] **Paso 2: correr y verificar que fallan**

Comando: `npx vitest run tests/tools/simulate.test.ts`
Esperado: falla porque `prudente` no existe y porque la codiciosa todavía cede siempre.

- [ ] **Paso 3: la constante y las dos políticas**

En `tools/lib/simulate/politicas.ts`:

```ts
/**
 * Lo que vale ceder, para la política codiciosa.
 *
 * Una opción sin tirada no puede fallar, así que su probabilidad de éxito real es 1 y con ese
 * número la codiciosa no tira un solo dado en toda la campaña: la aserción de muerte pasaba con
 * 0,0 % porque nunca se tocaba un dado. Acá ceder se puntúa como una tirada que gana 7 de cada 10
 * veces: si hay una mejor que eso, la toma.
 *
 * Es un botón de diseño, no una constante física. Subirlo hace al simulador más cobarde.
 */
export const PROB_LIBRE = 0.7;
```

`probExito` se queda como está —es la probabilidad de verdad y la usan el informe y la política prudente—. Lo que cambia es el **puntaje** que usa la codiciosa:

```ts
/** Puntaje de la política codiciosa: la probabilidad real, salvo ceder, que vale PROB_LIBRE. */
function puntajeCodicioso(opcion: RenderedChoice): number {
  return opcion.preview === undefined ? PROB_LIBRE : opcion.preview.odds.success;
}
```

Y en `elegirOpcion`, la codiciosa usa `puntajeCodicioso` y se agrega la rama de `prudente`: si hay alguna opción sin `preview`, la primera de ellas; si no hay ninguna, `indiceDelMaximo(opciones, probExito)`.

- [ ] **Paso 4: declarar la política nueva**

En `tools/lib/simulate/types.ts`, agregá `'prudente'` a `PoliticaId` y a `POLITICAS`, y documentala en el comentario de arriba junto a las otras tres:

```ts
 * - `prudente`: cede siempre que haya una opción sin tirada. Es el jugador que no quiere
 *   arriesgar, y el instrumento con el que se mide si ceder cuesta algo.
```

- [ ] **Paso 5: la columna de hitos**

El informe no dice cuántos hitos junta cada combinación, y sin ese número la tarea 2 no se puede verificar.

El dato ya se recoge: `ResultadoPartida` tiene `hitos: string[]` (`tools/lib/simulate/types.ts:60`). Lo que falta es agregarlo y mostrarlo. Sumá `hitosMedia` a `FilaCombinacion` en `agregado.ts`, calculado como el promedio de `p.hitos.length`, y una columna **Hitos** en `tablaCombinaciones` de `informe.ts`, entre Heridas y Tiradas.

- [ ] **Paso 6: la cuarta aserción**

En `agregado.ts`:

```ts
/** Piso de tiradas por partida con política codiciosa (aserción 4, Fase H). */
export const PISO_TIRADAS_CODICIOSA = 3;
```

Se suma a `Aserciones` como `tiradasMediaCodiciosa: number`, y a `lineasDeAserciones` en `informe.ts` como cuarta línea, con el mismo formato que las otras tres:

```ts
{
  titulo: `La política codiciosa hace al menos ${PISO_TIRADAS_CODICIOSA} tiradas por partida`,
  detalle: `${dec(a.tiradasMediaCodiciosa)} tiradas de media`,
  pasa: a.tiradasMediaCodiciosa >= PISO_TIRADAS_CODICIOSA,
},
```

Actualizá el texto que diga "las tres aserciones": ahora son cuatro. Buscalo con `grep -rn "tres aserciones" --include=*.ts --include=*.md .`

- [ ] **Paso 7: correr el simulador y anotar el antes**

```bash
npm run simulate
```

Anotá en el informe de la tarea, para la 2 y la 3: cuántas tiradas hace ahora la codiciosa, y cuántos hitos y qué tasa de derrota tiene la `prudente`. Esos son los números contra los que se va a comparar.

- [ ] **Paso 8: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate
git add -A
git commit -m "feat(sim): la codiciosa tira dados y la prudente mide lo que cuesta ceder"
```
---

### Tarea 2: que ceder cueste algo

**Archivos:**
- Modificar: `src/content/campaigns/vado/scenes/acto2_ley.ts`, `src/content/campaigns/vado/scenes/acto2_fuera.ts`, `src/content/campaigns/vado/scenes/desenlace.ts`
- Test: `tests/content/vado.test.ts`

**Interfaces:**
- Consume: la política `prudente` y la columna de hitos de la tarea 1, que son con lo que se verifica.
- Produce: nada para las siguientes.

Es el corazón de la fase. Hoy **41 de las 42 escenas no finales** ofrecen una opción sin tirada y sin `requires`, y un jugador que elija siempre lo seguro termina la campaña con 29 escenas distintas, 6.060 palabras, **0 tiradas, 0 Heridas, 9 de los 10 hitos** y el final `fin_dravos`. El sistema de reglas entero nunca se enciende.

**La opción libre NO se quita.** Que exista es lo que protege la regla de la spec §4 (toda escena mortal necesita una salida sin tirada) y al jugador que no quiere arriesgar. Lo que se corrige es que hoy es **gratis**: que ceder sea una decisión y no un almuerzo gratis.

**Y no se toca en las 41.** En una escena de exploración lateral, ceder gratis está bien. Se toca en las **bisagra**: los cuellos por los que pasa toda partida.

#### Las diez escenas bisagra

Salen del diagrama de `design/01-outline.md` §1.1 (`P → A1 → C1(cuello) → T1 → RAMA → T2 → C2(cuello) → CLÍMAX → FIN`), de las marcas de convergencia del propio código y del grafo generado:

| Escena | Archivo | Qué es |
|---|---|---|
| `c1_cuerpo` | `acto2_ley.ts` | entrada al Cuello 1 |
| `c1_acusacion` | `acto2_ley.ts` | la acusación pública |
| `c1_refriega` | `acto2_ley.ts` | encuentro (rondas) |
| `a2_amanecer` | `acto2_ley.ts` | T1, se compromete la rama |
| `c2_anochece` | `acto2_fuera.ts` | T2 |
| `c2_orilla` | `acto2_fuera.ts` | entrada al Cuello 2 |
| `cl_molino` | `desenlace.ts` | clímax |
| `cl_dravos` | `desenlace.ts` | encuentro (rondas) |
| `cl_halvar` | `desenlace.ts` | clímax |
| `cl_desenlace` | `desenlace.ts` | clímax, elige el final |

#### Qué se cambia, escena por escena

**`cl_dravos` no se toca.** Es la única de las diez que ya está bien: no tiene ninguna opción sin tirada y sin `requires`. Es la "1 de 42" que el informe reporta como excepción.

**En dos NO se cobra nada, a propósito.** Que estén en la lista no quiere decir que haya que taxarlas:

- **`a2_amanecer`** tiene sus cuatro opciones libres **por diseño explícito**: el outline (§ de rutas típicas) dice que "acá el Burnt Bridge es la escena, no la opción". El costo ya existe y es grande: comprometer la rama. Además el amanecer está vacío, no hay un solo PNJ declarado, y un tic de sospecha sin nadie que te vea rompería la regla de la biblia de que la sospecha necesita un sujeto que mire.
- **`c2_anochece`** es escena de aviso, y su propio comentario dice "sin tiradas: es escena de aviso, no de habilidad". La asimetría correcta ya está: `buscar_una_cuerda` da la `cuerda_de_molinero`, que es ventaja real en el vado crecido. Castigar a quien no la agarra sería penalizar la escena por hacer lo que tiene que hacer.

**Las seis que sí se cambian:**

| Escena | Opción que hoy sale gratis | Costo | Por qué es consistente |
|---|---|---|---|
| `c1_acusacion` | `ceder` — "Bajar la voz y dejar que te tomen nota" | **pierde `carta_lacrada`** | Es la escena más pública de la campaña: Dravos, Berta y la ronda entera están declarados en `npcs`. Ya existe `mostrarle_la_carta_a_dravos`, que gasta esa carta **a cambio de algo**. Si te dejás procesar sin jugar ninguna carta, el que te cachea la encuentra igual — y te quedás sin el beneficio de haberla mostrado vos. |
| `c1_refriega` | `rendirte` — "Abrir las manos y rendirte" | **`sospecha +1`** | Para llegar acá ya elegiste correr o resistirte. Rendirte de golpe en medio de la plaza, delante de Dravos y de la línea de guardia, es un cambio de conducta con testigos concretos. |
| `c2_orilla` | `remar_en_la_barca_de_tome` | **`sospecha +1`** | Es una inconsistencia, no una excepción: las otras dos formas de evitar el vado ya cuestan (esperar cuesta `sospecha +1`, subir por el azud cuesta una Herida). Y el texto de esta misma opción dice que del molino salió gente a mirar. Es la menos discreta de las tres y la única gratis. |
| `cl_halvar` | `bajar_al_sotano_sin_contestar` | **`sospecha +1`** | Dravos está declarado en la escena y pasó la noche fichando conductas. Irse de una negociación sin ofrecer nada ni dar un motivo, delante del capitán, se ve. |
| `cl_desenlace` | `subir_y_dejar_que_el_agua_decida` | **`{ take: 'sello_del_vado' }`** | **Esto ya estaba diagnosticado y sin hacer.** El encabezado de `desenlace.ts` dice, en su nota (e), que a esta opción "le falta un `{ take: 'sello_del_vado' }`, y es una línea". Hoy es la única de las siete sin ningún efecto, y por eso es la salida perfecta del jugador de cero tiradas. |
| `cl_molino` | *(indirecto, ver abajo)* | **`run:orell_confia` deja de regalarse** | `cl_dravos.que_orell_lo_detenga` pide `run:orell_confia`, que parece un requisito… pero ese flag lo enciende **gratis e incondicionalmente** el `onEnter` de `a2_ley_orell`, al que se llega por cualquier opción libre de `a2_amanecer`. O sea: el clímax se resuelve sin tirar, con un flag regalado. Que `run:orell_confia` dependa de una tirada o de una elección real, como ya pasa en el prólogo, donde solo el éxito de `convencer_a_la_guardia` lo enciende. |

#### Y los hitos

La ruta muda junta 9 de 10, y tres de esos hitos se marcan por entrar a una escena, no por resolver nada:

1. **`cerrar_la_cronica`** se dispara al entrar a `cl_desenlace`, **antes** de elegir el final. Movelo al `onEnter` de cada final (`fin_hundido`, `fin_dravos`, `fin_crecida`, `fin_heredero`): que marque haber cerrado algo, no haber bajado una escalera.
2. **`enfrentar_a_dravos`** se otorga por entrar a `cl_dravos` **o** a `cl_halvar`, aunque el enfrentamiento se resuelva con `que_orell_lo_detenga` sin tirar un dado. Con el arreglo de `run:orell_confia` de arriba queda casi resuelto; verificá que así sea y, si no, atalo a haber tirado.
3. **`ver_el_sello`** tiene tres puertas gratuitas además de la tirada de `c1_cuerpo`: `a2_ley_torre.leer_el_sigilo_de_la_mesa`, `a2_ley_cartas.buscar_el_mapa` y el `onEnter` de `a2_fuera_sotano`. Dejá **una sola vía gratuita por rama**: en la rama A hay dos y sobra una.

**`la_verdad_de_tome` no se toca**: es el ejemplo de un hito que el diseño ya cobra bien (exige tirada en sus dos puertas de la rama A), y es justamente el que la ruta muda no consigue.

- [ ] **Paso 1: leer antes de escribir**

Leé `src/content/campaigns/vado/design/00-biblia.md` §7.1 (los dos relojes) y §9 (el canon), y las seis escenas enteras. La `sospecha` llega a 4 y **redirige**: tres tics nuevos en la campaña cambian el ritmo de la partida, así que verificá contra el outline que no estás empujando a todo el mundo al redirect.

- [ ] **Paso 2: los tests que fallan**

En `tests/content/vado.test.ts`:

```ts
it('ceder en la acusación cuesta la carta lacrada', () => {
  const o = campaign.scenes.c1_acusacion?.choices.find((c) => c.id === 'ceder');
  expect(o?.outcome?.effects).toContainEqual({ take: 'carta_lacrada' });
});

it('rendirse en la refriega se paga con sospecha', () => {
  const o = campaign.scenes.c1_refriega?.choices.find((c) => c.id === 'rendirte');
  expect(o?.outcome?.effects).toContainEqual({ clock: 'sospecha', delta: 1 });
});

it('remar hasta la isla se paga con sospecha', () => {
  const o = campaign.scenes.c2_orilla?.choices.find((c) => c.id === 'remar_en_la_barca_de_tome');
  expect(o?.outcome?.effects).toContainEqual({ clock: 'sospecha', delta: 1 });
});

it('irse del sótano sin contestar se paga con sospecha', () => {
  const o = campaign.scenes.cl_halvar?.choices.find((c) => c.id === 'bajar_al_sotano_sin_contestar');
  expect(o?.outcome?.effects).toContainEqual({ clock: 'sospecha', delta: 1 });
});

it('dejar que el agua decida entrega el sello', () => {
  const o = campaign.scenes.cl_desenlace?.choices.find((c) => c.id === 'subir_y_dejar_que_el_agua_decida');
  expect(o?.outcome?.effects).toContainEqual({ take: 'sello_del_vado' });
});
it('orell_confia no se enciende por entrar a a2_ley_orell', () => {
  expect(campaign.scenes.a2_ley_orell?.onEnter ?? []).not.toContainEqual({ set: 'run:orell_confia' });
});
it('cerrar_la_cronica se marca al llegar a un final, no al entrar al desenlace', () => {
  expect(campaign.scenes.cl_desenlace?.onEnter ?? []).not.toContainEqual({ milestone: 'cerrar_la_cronica' });
  for (const fin of ['fin_hundido', 'fin_dravos', 'fin_crecida', 'fin_heredero']) {
    expect(campaign.scenes[fin]?.onEnter ?? []).toContainEqual({ milestone: 'cerrar_la_cronica' });
  }
});
```

- [ ] **Paso 3: correr y verificar que fallan**

Comando: `npx vitest run tests/content/vado.test.ts`

- [ ] **Paso 4: escribir los cambios**

Un costo **se ve antes de elegir**: si una opción pasa a costar la carta o un tic de sospecha, la etiqueta o el `badge` lo tienen que decir. Un costo escondido no es una decisión, es una trampa. Mirá cómo lo dicen las opciones que ya cobran algo y seguí ese patrón.

- [ ] **Paso 5: medir**

```bash
npm run simulate
```

Compará contra los números que anotó la tarea 1. Lo que tiene que pasar:

- la política **`prudente`** deja de juntar 9 hitos (la columna **Hitos** baja), y deja de tener 0,0 % de derrota;
- las escenas distintas por partida siguen dentro de **24-30**;
- las cuatro aserciones pasan;
- los cuatro finales se siguen alcanzando con las cuatro clases.

**Si la `prudente` sigue con 9 hitos y 0 % de derrota, la tarea no está hecha**, por más que los tests pasen.

- [ ] **Paso 6: escribir el informe**

Creá `src/content/campaigns/vado/design/04-informe-fase-h.md` con: qué se cambió en cada escena, la tabla de antes y después de la simulación, y qué NO se tocó y por qué (`a2_amanecer` y `c2_anochece`, con el motivo).

- [ ] **Paso 7: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate && npm run lint:text
git add -A
git commit -m "feat(vado): ceder cuesta algo en las escenas bisagra"
```
---

### Tarea 3: telegrafiar el sello, y la carta que nadie podía usar

**Archivos:**
- Modificar: `src/content/campaigns/vado/scenes/acto2_ley.ts`, `src/content/campaigns/vado/scenes/acto2_fuera.ts`, `src/content/campaigns/vado/scenes/desenlace.ts`
- Test: `tests/content/vado.test.ts`

**Interfaces:**
- Consume: nada de las tareas anteriores.
- Produce: nada para las siguientes.

Son dos arreglos chicos y sin relación entre sí, juntos porque los dos viven en el acto 2 y los dos son de contenido.

#### El sello es invisible, no inaccesible

Los datos, del informe de la Fase E §8.2: **solo el 14,4 % de las partidas enciende `char:vado.sabe_del_sello`**, pero de las que lo encienden y llegan a un final, **el 26,1 % termina en `fin_heredero`**. Y la brecha entre clases es de 1,58 % a 2,04 %: ruido. O sea que la puerta no es angosta ni está mal repartida — el jugador **no sabe que hay una puerta**.

La puerta es una tirada de Saber · difícil con un solo intento por partida (`run:piedra_leida`), en `a2_ley_cartas.reconocer_el_sigilo` y en `a2_fuera_sello.leer_la_piedra`. Un jugador que no sospecha que bajo la piedra hay algo no gasta ahí su único intento.

**No se toca la mecánica.** Ni la dificultad, ni el intento único, ni las vías. Lo único que cambia:

1. **Una línea de texto en cada una de esas dos escenas**, antes de la opción, que diga que la piedra tiene algo raro: que las marcas no son adorno, que el agua no las gastó como gastó todo lo demás, que están frescas. Que el jugador entienda que ahí hay algo que leer.
2. **Las dos etiquetas de opción se hacen más golosas.** "Leer la piedra" no promete nada; algo como "Leer lo que dice la piedra" sí. La etiqueta tiene que decir que hay algo escrito, no que hay una piedra.

Escribilo con la voz de la biblia: seco, concreto, sin adjetivos de relleno. Una línea, no un párrafo.

#### La carta que nadie podía usar

`carta_de_halvar` solo se consigue en `a2_ley_torre`, en la rama A. Quien juega la rama B llega a `cl_halvar` y ve `leerle_el_libro_de_rutas`, que **nunca** puede elegir. No rompe ninguna regla del validador, pero es una opción muerta en la escena más importante de la campaña.

**La salida es condicionar la opción, no escribirle una segunda fuente al objeto.** Agregale `requires` sobre el objeto y un `lockedHint` que diga qué falta. Es el patrón que la campaña ya usa en todas partes, no agrega prosa, y juega a favor de la rejugada: el jugador ve que hubo una carta que podría haber conseguido.

El `lockedHint` dice qué falta **sin spoilear dónde estaba**: algo como "Te falta lo que Halvar firmó", no "Tendrías que haber ido a la torre".

- [ ] **Paso 1: el test que falla**

En `tests/content/vado.test.ts`:

```ts
it('la opción de la carta en el clímax pide el objeto y explica qué falta', () => {
  const opcion = campaign.scenes.cl_halvar?.choices.find((c) => c.id === 'leerle_el_libro_de_rutas');
  expect(opcion?.requires).toBeDefined();
  expect(opcion?.lockedHint).toBeTruthy();
});

it('las dos escenas de la piedra dicen que hay algo escrito antes de ofrecer leerla', () => {
  // para cada una de a2_ley_cartas y a2_fuera_sello: el texto de la escena menciona
  // las marcas / lo escrito, y la etiqueta de la opción también
});
```

- [ ] **Paso 2: correr y verificar que fallan**

Comando: `npx vitest run tests/content/vado.test.ts`

- [ ] **Paso 3: escribir los cambios**

Primero leé `src/content/campaigns/vado/design/00-biblia.md` §9.4 (los tres caminos al sello) para no contradecir el canon, y las tres escenas que vas a tocar enteras antes de escribir una palabra.

- [ ] **Paso 4: verificar que el final oculto se volvió más frecuente**

```bash
npm run simulate
```

El simulador juega sin intención, así que **no esperes un salto grande**: telegrafiar le habla a una persona, no a una política. Lo que sí tiene que pasar es que nada empeore y que `fin_heredero` no baje. Anotá el número antes y después en el informe de la tarea.

- [ ] **Paso 5: correr todo y commitear**

```bash
npm test && npx tsc --noEmit && npm run validate && npm run lint:text
git add -A
git commit -m "feat(vado): la piedra se anuncia, y la carta del climax pide la carta"
```

---

### Tarea 4: recortar los desenlaces

**Archivos:**
- Modificar: las escenas de `src/content/campaigns/vado/scenes/` que el linter marque
- Test: ninguno nuevo; el criterio es `npm run lint:text`

**Interfaces:**
- Consume: nada.
- Produce: nada.

La prosa se pasó **+20,6 %** del presupuesto. El dato importante es **dónde**: el texto de escena está en +2 %, o sea perfecto, y el exceso está entero en los **desenlaces y bandas de tirada: +54 %**.

Esto era "estaría bueno" y la tarea 2 lo convirtió en urgente: ahora se van a tirar muchos más dados, así que esos desenlaces se van a leer mucho más que antes. Son ~3.200 palabras.

El presupuesto por pieza, que el linter ya conoce (`tools/lib/lint/presupuesto.ts`): escena 60-160 palabras, desenlace 20-60.

Las cinco peores celdas, del informe de la Fase E §8.3: `cl_molino` +216, `a1_molino_pell` +178, `a1_molino_trampilla` +165, `c1_acusacion` +163, `a1_ilse_patio` +146. Empezá por ahí.

- [ ] **Paso 1: ver el estado actual**

```bash
npm run lint:text -- --campaign=vado
```

Anotá cuántos errores y avisos hay y cuáles son las celdas peores. Ese es el punto de partida.

- [ ] **Paso 2: recortar, de a una celda**

**Recortar no es resumir.** Un desenlace de tirada tiene un trabajo: decir qué pasó y qué cambió. Lo que sobra suele ser: repetir lo que la escena ya dijo, explicar lo que el jugador acaba de elegir, y adjetivos que no agregan información. Lo que **no** se toca: lo que el jugador necesita para decidir lo siguiente, y las líneas que el linter cuenta como marco de ficción de la memoria.

Trabajá de a una escena y corré el linter después de cada una. No hagas una pasada global.

- [ ] **Paso 3: verificar**

```bash
npm run lint:text -- --campaign=vado
```
Esperado: **0 errores** en perfil `release`. Los avisos pueden quedar, pero anotá cuántos bajaron.

- [ ] **Paso 4: verificar que la partida no se acortó de más**

```bash
npm run simulate
```
Las escenas distintas por partida tienen que seguir dentro de 24-30, que es el objetivo de la spec §11. Si el recorte bajó las palabras por partida más de lo esperado, decilo.

- [ ] **Paso 5: commitear**

```bash
npm test && npm run validate
git add -A
git commit -m "feat(vado): los desenlaces de tirada entran en presupuesto"
```

---

### Tarea 5: móvil como hoja inferior

**Archivos:**
- Modificar: `src/ui/screens/EscenaScreen.module.css`
- Test: `tests/ui/EscenaScreen.test.tsx`

**Interfaces:**
- Consume: nada.
- Produce: nada.

Es lo único que la spec §6 mandó explícitamente a esta fase: *"Móvil: fondo arriba y hoja inferior, en pulido"*.

Hoy `EscenaScreen.module.css` tiene un solo `@media (max-width: 800px)` que apila las dos columnas y le saca el `max-height` a la columna de texto. Se juega, pero el fondo se come media pantalla y el texto queda abajo de todo.

**El layout objetivo, por debajo de 800 px:**

- `.grid` pasa a una sola columna con **dos filas**: la de arriba con altura fija en proporción de la pantalla (`38vh` es un buen punto de partida), la de abajo ocupando el resto.
- `.visual` va arriba, con la imagen recortada a esa altura (`object-fit: cover`) en vez de escalada.
- `.columna` es la hoja: ocupa la fila de abajo, tiene **su propio scroll**, fondo de `var(--color-superficie)`, esquinas de arriba redondeadas con `var(--radio)`, y una sombra hacia arriba que la despegue del fondo.
- El retrato del hablante se hace chico y se superpone sobre el borde de la hoja, o se va: decidí vos mirándolo y explicá cuál elegiste.
- La barra de estado se compacta: en móvil el lugar y las tres marcas entran, pero "Condiciones: sin condiciones" no.

**Sin librerías y sin gestos.** La hoja no se arrastra: es un layout, no un componente interactivo. Un `@media` y `grid`.

El botón de saltar lo leído es `position: sticky; top: 0` dentro de `.columna`: verificá que siga pegado arriba de la hoja y no se pierda.

- [ ] **Paso 1: el test que falla**

jsdom no calcula layout, así que el test verifica la **declaración**, no el resultado. Es poco, y por eso el paso 3 es el que manda.

```tsx
it('en móvil la columna es una hoja con su propio scroll', () => {
  // leer EscenaScreen.module.css y verificar que el bloque @media de móvil
  // declara overflow-y en .columna y una altura de fila para .visual
});
```

- [ ] **Paso 2: escribir el CSS**

- [ ] **Paso 3: jugarlo en un teléfono emulado**

Este es el paso que importa. Arrancá el servidor y emulá 375×812:

```bash
npm run dev
```

Y verificá, jugando de verdad:
1. Se entra a una escena y **el texto se lee sin scrollear el fondo**.
2. Las opciones se alcanzan con el pulgar.
3. La tirada entra en pantalla: dados, chips, sello y botones.
4. La Ficha se abre y se cierra.
5. El botón de saltar lo leído se ve.
6. Cero errores de consola.

Sacá una captura de la escena y otra de la tirada, y guardalas en el directorio de trabajo de la tarea.

- [ ] **Paso 4: commitear**

```bash
npm test && npx tsc --noEmit
git add -A
git commit -m "feat(ui): en movil el texto vive en una hoja inferior"
```

---

### Tarea 6: la app entera con el teclado

**Archivos:**
- Modificar: lo que el barrido encuentre, en `src/ui/`
- Test: `tests/ui/teclado.test.tsx`

**Interfaces:**
- Consume: nada.
- Produce: nada.

La Fase F dejó hecho el foco visible, el contraste medido, los diálogos con foco atrapado, las teclas 1-9, C, Enter, Espacio y Esc, y el contador de modales que hace que los atajos no se disparen por detrás.

Lo que **nunca se hizo** es recorrer la aplicación entera sin tocar el mouse.

- [ ] **Paso 1: el barrido**

```bash
npm run dev
```

Sin tocar el mouse ni una vez, desde que carga la página: crear un personaje (las cuatro pantallas del asistente), elegir la campaña, jugar hasta un final, abrir y cerrar la Ficha, abrir Opciones, cambiar una preferencia, y volver al hub.

**Anotá cada lugar donde te trabaste**, con la pantalla y qué esperabas que pasara. Los sospechosos habituales: un control que no es `<button>` y no recibe foco, un orden de tabulación que salta, un elemento que se enfoca pero no se activa, y foco que se pierde cuando la pantalla cambia.

Con la consola abierta todo el recorrido. **Cero errores de consola en escritorio** es uno de los criterios de listo de la fase y esta es la única tarea que recorre la aplicación entera: si aparece alguno, es tuyo aunque no tenga que ver con el teclado.

- [ ] **Paso 2: arreglar, de a uno**

Por cada cosa que anotaste, primero el test que la reproduce y después el arreglo. Si algo resulta más grande que un arreglo puntual, **paralo y reportalo** en vez de rediseñar una pantalla.

- [ ] **Paso 3: el test de recorrido**

Un test en `tests/ui/teclado.test.tsx` que haga el recorrido corto con teclado sobre el store real: desde la pantalla de inicio hasta estar dentro de una escena, sin un solo `click`.

- [ ] **Paso 4: commitear**

```bash
npm test && npx tsc --noEmit
git add -A
git commit -m "feat(ui): la aplicacion entera se recorre con el teclado"
```

---

### Tarea 7: el README que lee alguien de afuera

**Archivos:**
- Modificar: `README.md`

**Interfaces:** ninguna.

El README que hay está bien para quien va a tocar el código: requisitos, comandos, estructura, deploy. Le falta todo lo que le importa a alguien que llega desde la URL.

- [ ] **Paso 1: escribir lo que falta**

Arriba de todo, antes de "Requisitos":

- **Qué es**, en dos o tres oraciones, sin jerga de desarrollo. Es lo que se lee primero.
- **Dónde se juega**: la URL. Dejala escrita ya, `https://alcaraz000.github.io/cronicas-del-vado/`, aunque la tarea 9 todavía no la haya publicado.
- **Cómo se juega**, corto: creás un personaje de una de cuatro clases, elegís una campaña, y cada decisión se resuelve con dos dados de seis más un atributo. Las heridas se acumulan, la campaña se puede perder, y en algunas escenas el personaje se puede morir para siempre. El juego se acuerda de lo que hiciste entre partidas.
- **Una captura** de una escena, en `docs/`, referenciada desde el README. Sacala del juego corriendo, no la inventes.
- **Que el guardado vive en el navegador**, y que en Opciones se exporta e importa. Es lo primero que alguien pierde.

Mantené el tono del README actual: directo, sin marketing.

- [ ] **Paso 2: commitear**

```bash
git add -A
git commit -m "docs: el README le habla a quien llega a jugar"
```

---

### Tarea 8: la pasada editorial, una ruta por clase

**Archivos:**
- Crear: `src/content/campaigns/vado/design/05-lectura-editorial.md`

**Interfaces:** ninguna.

La spec §12 pide "lectura humana de una ruta por clase". La lectura humana final es de Gabriel, porque es su prosa. Lo que hace esta tarea es la pasada previa: leer y **anotar**, no corregir.

- [ ] **Paso 1: sacar las cuatro rutas**

Una ruta por clase, de la escena inicial a un final, leyendo el texto tal como lo vería el jugador. Que las cuatro rutas no terminen en el mismo final: elegí caminos distintos para ver los cuatro.

- [ ] **Paso 2: leer buscando cuatro cosas**

1. **Repeticiones**: la misma imagen, el mismo giro o la misma palabra rara dos veces en una partida.
2. **Saltos de voz**: un párrafo que no suena a la biblia (adjetivos de más, explicar lo que ya se mostró, un narrador que opina).
3. **Quiebres de continuidad**: el texto da por sabido algo que en esa ruta no pasó, o contradice un flag.
4. **Desenlaces que no dicen qué cambió**: la tirada se resolvió y el jugador no sabe qué gana o qué pierde.

- [ ] **Paso 3: escribir el informe**

Cada hallazgo con: la escena, la cita textual, qué tiene de malo y una propuesta concreta de reemplazo. Ordenado por gravedad. **No cambies ni una palabra de la campaña**: el informe es para que Gabriel decida.

Al final, una sección de "lo que está muy bien", con ejemplos. Sirve para saber qué no tocar.

- [ ] **Paso 4: commitear**

```bash
git add -A
git commit -m "docs(vado): lectura editorial de una ruta por clase"
```

---

### Tarea 9: publicar

**La ejecuta el coordinador, no un subagente.** Publica hacia afuera y usa credenciales de Gabriel.

**Archivos:** ninguno del repositorio.

Todo lo técnico está hecho desde la Fase A: `.github/workflows/deploy.yml` compila con `VITE_BASE=/<repo>/` y publica `dist/`, y `vite.config.ts` lee esa variable. Falta el repositorio.

Gabriel aprobó explícitamente que sea **público**, sabiendo que eso hace público el código, las 18.800 palabras de prosa con sus cuatro finales, la biblia, el outline y las imágenes.

- [ ] **Paso 1: verificar que todo está en verde antes de publicar**

```bash
npm run build
```
El primer push dispara el deploy: no se publica nada rojo.

- [ ] **Paso 2: crear el repositorio y subir**

```bash
gh repo create Alcaraz000/cronicas-del-vado --public --source=. --remote=origin --description "RPG narrativo tipo novela visual, en el navegador, sin servidor."
git push -u origin main
```

- [ ] **Paso 3: dejar Pages en GitHub Actions**

```bash
gh api -X POST /repos/Alcaraz000/cronicas-del-vado/pages -f build_type=workflow
```
Si responde que ya existe, el `-X PUT` sobre el mismo recurso lo actualiza.

- [ ] **Paso 4: mirar el workflow**

```bash
gh run watch
```

- [ ] **Paso 5: verificar la URL jugando**

Entrar a `https://alcaraz000.github.io/cronicas-del-vado/`, crear un personaje, jugar una escena con tirada, abrir la Ficha, y confirmar **cero errores de consola**. Que las imágenes carguen es lo primero que se rompe cuando `base` está mal.

- [ ] **Paso 6: dejar la URL escrita**

Si el README quedó con una URL distinta de la real, corregilo y commiteá.
