# El objetivo en pantalla, y el loop del acto 1

**Fecha:** 14 de septiembre de 2026
**Estado:** aprobado por Gabriel
**Motivo:** Gabriel reportó *"a veces las decisiones me dejan en loops infinitos"*, con un ejemplo:
en la casa de Berta, eligiendo "Reclamar el adelanto" y "Revisar escritorio" una y otra vez. Tiene
razón, el bug es real y medible, y su idea de cómo arreglarlo es mejor que las cuatro que le
propuse.

---

## 0. El diagnóstico, medido

Todo lo de acá está medido con el motor real sobre `main`, no estimado.

### 0.1 El acto 1 no tiene salida por decisión

Las doce escenas de Aldamar (`a1_plaza`, `a1_taberna`, `a1_taberna_trastienda`, `a1_orell_mesa`,
`a1_alcaldesa`, `a1_berta_despacho`, `a1_ilse_patio`, `a1_molino`, `a1_molino_pell`,
`a1_molino_rueda`, `a1_molino_trampilla`, `a1_posada`) son una componente fuertemente conexa con
**cero aristas de salida**:

| | |
|---|---|
| Opciones en esas doce escenas | **71** (46 libres, 17 con `requires`, 8 de tirada) |
| Opciones que salen del racimo | **0** |
| Escenas con `redirect` | **1** — sólo `a1_plaza` |

Las dos únicas puertas del acto son los dos `redirect` de la plaza, que **el jugador nunca ve como
opción**:

```
a1_plaza --[cuando sospecha >= 4]--> a1_ronda
a1_plaza --[cuando las 3 pistas + visited(a1_plaza) >= 3]--> c1_cuerpo
```

Reproducido con el motor: **40 vueltas** de `a1_plaza → a1_taberna → a1_orell_mesa → a1_taberna →
a1_plaza` dejan `sospecha = 0`, `visited.a1_plaza = 40`, la partida sin terminar y **exactamente las
mismas seis opciones habilitadas que en la primera vuelta**. Nada en pantalla cambia.

### 0.2 Una de las dos puertas está cerrada para quien juega bien

**Ninguna de las 46 opciones libres del acto 1 mueve el reloj `sospecha`.** Sólo lo mueven bandas de
tirada. O sea que la puerta de `sospecha >= 4` **no existe** para un jugador que evita los dados —
que es, además, la estrategia que el juego premia.

### 0.3 El "a veces": acertar te deja adentro, fallar te salva

Medido sobre 2000 partidas con el motor real: **452 no terminaron en 400 pasos**.

> **Corrección del 14 de septiembre, hecha al implementar la tarea 1.** Ese "452 de 2000" **no es una
> tasa de cuelgue y no hay que citarlo como tal**. Eran 400 partidas de una política que siempre
> elige la última opción más 52 de una que siempre elige la primera, sobre cinco políticas de 400
> partidas cada una; las tres realistas (azar, evita-visitado, sin-repetir-opción) dieron **cero**.
> Remedido con un recorredor propio: al azar da **0 de 2000**, evitando los dados **1 de 2000**, y
> determinista **2000 de 2000** — pero el determinista **se cuelga 20 de 20 sobre `minimal`, que es
> una campaña sana**, así que es una máquina de falsos positivos y no sirve de instrumento.
> **Lo que el dato dice, bien contado: el jugador que insiste con la misma opción se cuelga; el que
> varía, no.** Que es exactamente la conducta que Gabriel reportó.

**El caso que explica el "a veces" es el del Clérigo en la taberna:** le **sale bien** la tirada
`preguntar_por_tome` y el éxito lo manda a la trastienda, que está dentro del bucle; al Guerrero, en
cambio, **fallarla lo expulsa a la plaza**. La misma secuencia de clics traba a uno y libera al otro.
Acertar te deja adentro; fallar te salva.

El ciclo más duro es `a1_molino_trampilla ↔ a1_molino_rueda`: 400 pasos con `sospecha = 0` **y**
`visited(a1_plaza) = 0`, o sea con las dos puertas del acto congeladas a la vez.

**Ninguna de las partidas trabadas es una cárcel:** a cada una se le corrieron 400 continuaciones al
azar y **todas encontraron salida**. El sufrimiento no es "no hay salida" sino *"ninguna de las
opciones que elijo cambia nada y la pantalla es idéntica"*.

### 0.4 El caso concreto de Gabriel: la prosa cobra y el estado no

En `a1_alcaldesa`, la opción **"Reclamar el adelanto que promete la carta"**:

> *"Preguntás por la plata antes que por el muerto. A Berta no le molesta: cuenta en voz alta, por
> días, **te adelanta la tercera parte** y abre la puerta del fondo."*

**Efectos de la opción: ninguno.** La prosa narra un pago y el estado del juego no lo registra, así
que la opción vuelve a ofrecer lo mismo cada vez. Y no puede registrarlo: **el motor no tiene
sistema de dinero** (`Effect` sólo tiene `set`/`clear`, `give`/`take`, `wound`/`heal`,
`addCondition`/`removeCondition`, `clock`, `milestone`, `fortune` y `lethal`).

Una auditoría leyó **las 252 opciones de la campaña** buscando más casos de "la prosa narra un
cambio que la opción no registra". De 19 sospechas, **15 refutadas y 4 sobreviven**, y ninguna de
las cuatro hace que el jugador repita. **El caso del adelanto es prácticamente único en su especie.**

### 0.5 Por qué ninguna herramienta lo vio

**El simulador no puede verlo por construcción.** `candidatas()`, en
`tools/lib/simulate/politicas.ts`, le saca al simulador **toda opción que ya eligió en esa escena** —
o sea que le prohíbe exactamente la conducta que produce el bucle; su propio comentario lo admite.
Por eso `sim-report.md` dice **"Partidas colgadas: 0" sobre 12.492 partidas**, y esa línea ni
siquiera se imprime por consola.

`npm run graph` tampoco lo habría mostrado, y **el validador no puede**: sus doce reglas no incluyen
ninguna sobre alcanzabilidad ni sobre progreso.

---

## 1. Lo que Gabriel quiere, en sus palabras

> *"debería de haber un objetivo genérico, por ejemplo: 'Ve a hablar con la alcaldesa' (¿podés hacer
> cosas antes? sí; ¿podés ir de diferentes maneras? también, pero el objetivo principal es ese, e irá
> cambiando a medida de que vayas haciendo cosas)"*

Y dos cosas más:

- **Las "pistas" no le sirven ni le interesan** como concepto de jugador. No quiere *"recorrer todo
  el mapa hasta elegir la opción correcta"*.
- *"No es lo mismo decir 'Ir al despacho' que 'Reclamar el adelanto', ese es el problema"* — que es
  el diagnóstico del §0.4, dicho por él antes de que lo midiéramos.

---

## 2. El objetivo actual

**La campaña declara una lista ordenada de objetivos con su condición; el motor deriva cuál está
activo; la interfaz lo dibuja.** Es la misma división de capas que el resto del juego: el contenido
declara, el motor calcula, la interfaz muestra.

- Un objetivo es **una línea de texto en la voz de la campaña** — *"Averiguá qué pasó con Tomé"*,
  *"Hablá con Berta, la alcaldesa"* — con una condición que dice cuándo aplica y otra que dice
  cuándo se cumplió.
- **Se reusa `Condition`**, que el motor ya sabe evaluar. Cero vocabulario nuevo.
- El objetivo activo es **el primero de la lista** cuyo `when` se cumple y cuyo `hecho` todavía no.
- **Las pistas siguen existiendo, y el jugador no las ve nunca.** Son el estado que mueve el
  objetivo por dentro.
- Se dibuja en el cromo, al lado del lugar, con la serif del juego. No es un dato más de la barra:
  es lo que estás tratando de hacer.

**Los textos los redacta Claude y los corrige Gabriel**, en una tabla aparte, sin tocar código.

---

## 3. Que el acto no dependa de pisar una baldosa

- **El `redirect` de las tres pistas se evalúa en las once escenas del racimo que no son el hub**,
  no sólo en la plaza. Apenas cumplís, avanzás desde donde estés.
- **Y la plaza gana una opción de verdad**, `bajar_al_rio`, que aparece cuando tenés las tres
  pistas: una decisión visible que saca del acto.

> **Corrección del 14 de septiembre, hecha al implementar la tarea 3.** Este párrafo decía "las doce
> escenas" y **así escrito no cumplía el §5 de este mismo diseño**: la regla 13 descarta las aristas
> de `redirect` a propósito al calcular los racimos, justamente porque el jugador no las ve. Medido
> tres veces: `main` da un error ("los **2** redirect"), el plan literal —doce redirect y ninguna
> opción nueva— da **el mismo error** ("los **13** redirect"), y sólo agregar una **opción** lo pone
> en verde. El hub tiene que **perder** su redirect y **ganar** la opción, porque `enter()` resuelve
> los redirect antes de dibujar y si no la opción sería contenido muerto. Verificado por mutación:
> con redirect en el hub, `validate` queda verde pero **33 tests se caen**; sin la opción, `validate`
> queda **rojo**. Hacen falta las dos cosas.
>
> Y el resultado es mejor que lo que yo había planeado: ahora **una decisión saca del acto**, que es
> literalmente lo que el autor echaba en falta.
- **Se saca la condición `visited(a1_plaza) >= 3`.** Con un objetivo que te lleva a los tres
  lugares, el contador de visitas no agrega nada: es fricción invisible. (Decisión de Gabriel.)
- **Los tres lugares se mantienen.** El acto sigue pidiendo la taberna, la casa de Berta y el
  molino; lo que cambia es que ahora el juego te dice a cuál ir. Deja de ser "recorré hasta acertar"
  y pasa a ser una investigación guiada. (Decisión de Gabriel.)
- **El `redirect` de `sospecha >= 4` se queda como está.** Es la puerta del jugador temerario y
  funciona; el §0.2 no es un bug de esa puerta sino la razón por la que no alcanza sola.

> **Corrección del 14 de septiembre, hecha al implementar la tarea 3.** Este §3, tal como está
> escrito, **no cumple el §5 y no pone la regla 13 en verde**, y eso está medido: con el `redirect`
> de las tres pistas en las doce escenas y ninguna opción nueva, `npm run validate` sigue dando el
> **mismo único error**, ahora redactado «sólo se sale por los 13 redirect del racimo». La razón es
> que la regla 13 calcula los racimos contando **sólo las aristas que nacen de una opción**, que es
> exactamente lo que pide la segunda mitad del §5 («ninguna región dependa exclusivamente de un
> `redirect` para salir»), y un `redirect` —por muchos que sean— no es una de esas aristas.
>
> Lo implementado, entonces, es el §3 **más una salida por decisión**, que es lo que le falta al
> acto según el título del propio §0.1:
>
> - el `redirect` de las tres pistas va en **once** escenas, las del racimo que no son el hub;
> - **el hub gana una opción**, `a1_plaza.bajar_al_rio`, con `requires` de las tres pistas, y
>   **pierde** su `redirect` de las tres pistas. Si lo conservara, la opción sería contenido muerto:
>   al entrar al hub con las tres pistas el `redirect` se resolvería antes de dibujar y nadie podría
>   elegirla nunca. Es la novena opción del hub, que tenía margen para exactamente una.
>
> Con eso, "avanzás desde donde estés" sigue valiendo en once de las doce escenas, y en la única
> donde se puede estar con las tres pistas sin haber avanzado todavía —el hub, al que sólo se llega
> eligiendo volver— el acto se cierra **eligiendo**. Va sin `outcome.text`: el §6 dice que el
> presupuesto de prosa no se toca y estaba a once palabras del tope; 24 palabras lo pasaban.

---

## 4. Que lo que el texto dice que pasó, quede registrado

- **"Reclamar el adelanto"** pasa a registrar el cobro con una bandera. Con eso el juego sabe que ya
  cobraste, y la opción puede dejar de prometer lo que ya te dio.
- **Las cuatro incoherencias que la auditoría confirmó** se resuelven cada una en su término: o el
  efecto que falta, o la frase que no se puede cumplir.

| dónde | qué narra | |
|---|---|---|
| `a1_molino.subir_por_la_rueda` | "La tapa tiene el herraje forzado, y no de este lado" | es un hallazgo forense, no ambiente |
| `cl_molino.escuchar` (éxito) | Halvar dice que el peaje del medio es suyo | `run:sabe_de_halvar` existe y significa exactamente eso |
| `c2_anochece.cerrar_los_postigos` | "te da medio pan" | no hay comida en el juego |
| `p_puente_rechazo.colarte_por_el_terraplen` (parcial) | "con una bota menos" | no hay calzado en el juego |

**No se renombran las opciones.** Las etiquetas con carácter son lo bueno de la escritura de la
campaña; el problema no era que dijeran "Reclamar el adelanto", era que el adelanto no se cobraba.

---

## 5. Que esto no pueda volver sin que nadie avise

Tres herramientas miraron este bug y ninguna lo vio. Eso se arregla acá:

- **El simulador deja de ser ciego.** `candidatas()` le prohíbe repetir opción, que es la conducta
  que produce el bucle. Tiene que poder simular a un jugador que insiste, y **reportar las partidas
  colgadas por consola**, no sólo en un archivo que nadie abre.
- **Una regla nueva del validador, la trece:** que desde toda escena no final se alcance un final
  **usando sólo opciones libres** (sin `requires` y sin tirada), y que **ninguna región del grafo
  dependa exclusivamente de un `redirect` para salir**. Es la regla que habría atrapado esto el día
  que se escribió el acto 1.

---

## 6. Lo que NO se toca

- **La estructura del acto 1**: los tres lugares, sus escenas y su prosa. Se señaliza, no se
  rediseña.
- **Las etiquetas de las opciones.**
- **El presupuesto de prosa**, que está a once palabras del tope. Los objetivos son texto de
  interfaz, no de campaña: van en `strings` de contenido, no en el presupuesto de escenas.
- **`src/engine/` más allá de derivar el objetivo activo**, que es una función pura más.
- Las fases anteriores: escalado, reparto, historial, revelado, teclado, foco, preferencias.

---

## 7. Criterio de listo

1. **El bucle de Gabriel no se puede reproducir**: entrando a la casa de Berta y eligiendo lo mismo
   una y otra vez, el juego dice qué falta y el acto avanza cuando corresponde.
2. **El objetivo activo se ve en pantalla** y cambia al avanzar.
3. **El bucle concreto no se puede caminar**: un test que arranque en `a1_alcaldesa` y elija
   siempre la misma opción, como hizo Gabriel, tiene que llegar a la salida del acto en una cantidad
   acotada de pasos. *(Reemplaza al criterio original —"los 452 bajan a cero"—, que **no es
   verificable**: el recorredor que quedó mide cero hoy, antes de arreglar nada. Ver la corrección
   del §0.3.)*
4. **El simulador los detecta y los reporta por consola** si vuelven.
5. **La regla 13 del validador falla** sobre el `main` de hoy y pasa sobre esta rama.
6. **"Reclamar el adelanto" registra el cobro**, y las cuatro incoherencias del §4 están resueltas.
7. Todo lo de las fases anteriores sigue funcionando.
8. `npm test`, `npx tsc --noEmit`, `npm run validate`, `npm run build` y `npm run captura`, los cinco
   en verde, y verificado jugando.
