# Biblia de campaña — "El vado de Aldamar"

> Documento normativo de la Fase B. Integra las cuatro partes de diseño en una sola versión.
> Fuentes de verdad por encima de este documento: `docs/superpowers/specs/2026-09-10-juegorol-design.md` (§3, §4, §5, §11), `src/content/schema.ts`, `src/content/catalog.ts` y las 11 reglas de `tools/lib/validate/rules/`.
> **Si algo de acá choca con el validador, gana el validador**: el contenido que no compila no existe.

---

## 0. Cómo se usa este documento

El **outline** (`01-outline.md`) y la **prosa** (Fase D) copian los ids de acá sin inventar variantes. Cualquier id que no esté en este documento no existe.

**Reparto de autoridad entre los dos documentos.** Esta biblia manda en lo **cualitativo**: voces, tono, reglas de prosa, marco de memoria, ficción y canon. El outline manda en **todas las cuentas**: escenas, opciones, tiradas, dificultades, palabras y lotes. Donde este documento cita una cifra, la cifra está copiada del outline y se actualiza con él; si alguna vez discrepan, **gana el outline** y hay que corregir acá.

### 0.1 Contrato de ids

- `snake_case`, sin acentos ni `ñ`. Nombres visibles con acentos y en español.
- Prefijos de escena: `p_` (prólogo), `a1_` (acto 1), `c1_` (cuello 1), `a2_ley_` / `a2_fuera_` (acto 2, ramas A y B), `c2_` (cuello 2), `cl_` (clímax), `fin_` (finales). Las dos transiciones usan el prefijo de lo que abren (`a2_amanecer`, `c2_anochece`).
- `portrait`, `background` e `icon` repiten el id de la entidad (`npc/orell.png`, `place/molino_de_tome.inundado.png`, `item/sello_del_vado.png`).
- Los `canonPrompt` van en inglés y describen **solo identidad**. Encuadre, estilo y fondo neutro los fija `art/style.md`.
- El id de escena de un final y el id del final coinciden (`fin_crecida` es la escena y es `endings.fin_crecida`).

### 0.2 El meta de la campaña, fijado

`campaign.id` es **`vado`** y no es negociable: `r07_ids::prefijoCorrecto` exige que todo flag `char:`/`world:` empiece con `char:${campaign.id}.`, así que un id distinto rompe los ocho flags de canon de una.

```
id: 'vado'                      contentVersion: 1
title: 'El vado de Aldamar'     cover: 'molino_de_tome'
levelRange: [1, 3]              durationMin: [30, 45]
lethalScenes: 1                 lintProfile: 'smoke'   (pasa a 'release' en el lote 7)
premise: <§1.1, recortada a dos oraciones>
start: 'p_camino'
```

### 0.3 Renombres: lo que quedó viejo

Estos ids circularon en borradores y en la spec. **No se usan más**:

| Viejo | Nuevo | Por qué |
|---|---|---|
| `a1_puente`, `a1_puente_rechazo`, `a1_vado_oculto`, `a1_puente_amanecer` | `p_puente`, `p_puente_rechazo`, `p_vado_oculto`, `p_puente_amanecer` | el puente es prólogo; el prefijo lo dice |
| `a1_puente_runas` (escena) | opción `p_puente.runas` con `outcome` | el prólogo tiene 5 escenas exactas |
| `a2_molinero_muerto`, `a2_acusacion` | `c1_cuerpo`, `c1_acusacion` | prefijo de cuello |
| `a2_fuga_ilse`, `a2_sotano`, `a2_sotano_atajo` | `a2_fuera_fuga`, `a2_fuera_sotano` (el atajo entra ahí) | rama explícita en el id |
| `a3_*`, `a4_*` | `c2_*` y `cl_*` | no hay acto 3 ni 4 |
| `a3_fin_sello_hundido` | `fin_hundido` | |
| `taberna_mausi`, `casa_alcaldesa` | `taberna_ancla_seca`, `casa_de_berta` | el lugar se llama por el lugar |
| `sello_de_piedra`, `cuerda_de_sirga`, `bolsa_de_plata` | `sello_del_vado`, `cuerda_de_molinero`, — | un solo sello; la paga de Berta es prosa, no objeto |
| `run:tiene_sello` | `{ item: 'sello_del_vado' }` | la condición `item` ya existe; el flag era un espejo |
| `run:carta_segunda`, `run:berta_contrato_antes`, `run:berta_salia_de_noche` | `run:berta_miente` | tres formas de pescarla en lo mismo |
| `run:libro_de_fiados`, `run:orell_nombro_halvar` | `run:sabe_de_halvar` | mismo conocimiento, dos puertas |
| `run:vio_bulto_pell` | `run:cuerpo_hallado` | saber que Tomé está muerto antes del cuerpo |
| `run:ilse_a_solas`, `run:orell_respeta` | `run:ilse_confia`, `run:orell_confia` | |
| `c2_vado_crecido.esconder_el_sello` | `c2_vado_crecido.atar_lo_que_llevas_a_la_cadena` | un jugador de rama A puede llegar sin el sello; el label no puede mentirle |
| `cl_desenlace.dejar_que_dravos_se_lo_lleve` | `cl_desenlace.dejar_que_la_guardia_cruce_con_la_piedra` | el final no puede depender de que Dravos esté vivo y entero |
| `char:vado.sabe_de_berta`, `.debe_a_orell`, `.tiene_el_sello` | — (cubiertos por `run:berta_miente`, `run:orell_confia`, el final) | el cupo de canon es 6 |
| `world:vado.dravos_caido` | — (lo cuenta el final registrado en `campaignLog`) | el cupo de mundo es 2 |
| `variant: 'noche'` | sin `variant` | la noche es la imagen base |

---

## 1. Premisa, tono y verdad de la campaña

### 1.1 Premisa

Una carta lacrada de **Berta**, alcaldesa de **Aldamar**, te promete plata por encontrar a **Tomé**, el molinero, que hace **once días** que no aparece. Cuando llegás, el puente está cerrado por la guardia del capitán **Dravos** y el molino tiene luz aunque debería estar vacío. En dos noches descubrís que bajo el molino hay un **sello** antiguo que contiene la crecida del río, y que Dravos se lo está vendiendo a **Halvar**, un mercader del otro lado. La tercera noche, con la tormenta encima, decidís quién se queda con el sello, quién cruza el vado y quién no vuelve.

### 1.2 La verdad, en orden

1. Tomé encontró el sello en el sótano y, para probar si era piedra de verdad, **le arrancó una esquirla con el cincel**. La crecida empezó ese mismo día. Todo cuelga de ese gesto.
2. **Ilse** le sostuvo la escalera esa noche y se quedó con la esquirla: el `medallon_de_tome`. Cree que a Tomé lo mató su silencio.
3. **Orell** encontró el cuerpo antes que nadie y lo movió, para que no lo encontrara Ilse y para que el pueblo no saliera con la pala en la mano. Tiene la orden escrita de Dravos: *que el molinero no hable*.
4. **Dravos** no cree en el sello: para él es una piedra tallada, y con lo que paga Halvar cubre once meses de sueldo atrasado de una guarnición que ya roba gallinas.
5. **Halvar** no compra para tener: su casa **quiere la crecida**, porque cada carro que no cruza por Aldamar cruza tres días más arriba, por el puente de ellos, pagando peaje.
6. **La traición es de Berta.** Firmó la cesión del paso **antes** de mandarte la carta. No te llamó para encontrar a Tomé: te llamó para tener un forastero a quien señalar cuando el pueblo se entere. No es codicia: sin molino y sin paso, Aldamar se vacía en dos inviernos.

**La crecida no es solo una desgracia, y por eso *La crecida* es un final y no una derrota.** Abrir el sello a propósito inunda la vega esta noche y se lleva el año de siembra; pero el vado deja de ser cruzable para siempre y el puente viejo, sin la vega, queda inservible para carros. Aldamar deja de tener un paso que vender: es lo único que le saca a Halvar el negocio de las manos, y es lo que Ilse entendió antes que nadie. La spec lo resume en cuatro palabras —*«Ilse salva el pueblo»*— y ese es el sentido: lo salva mojándolo.

**Dónde está el sello en el clímax (canon duro, vale para TODA ruta).** Dravos bajó al sótano esa misma tarde. Si el jugador levantó la piedra en la rama B, la lleva encima; **si no la levantó nadie más que él, la subió Dravos y está sobre la mesa del molino, entre él y Halvar**, envuelta en un saco de harina. No hay ninguna ruta en la que el sello no esté en el molino al empezar `cl_molino`. De ahí sale la regla del clímax: **`{ item: 'sello_del_vado' }` nunca es condición de acceso, es precio.** Quien la trae encima resuelve sin tirada y sin ceder nada; quien no la trae hace lo mismo tirando, pagando o dejando que otro la toque primero. En `cl_desenlace` todos bajaron al sótano y la piedra está al lado del zócalo, la haya bajado quien la haya bajado.

### 1.3 Geografía canónica

El río corre de oeste a este. **Aldamar está en la orilla sur.** El **molino de Tomé está en la isla del vado**, entre el caz del molino y el canal grande; desde la plaza se lo ve al fondo, del otro lado del agua. La **única** manera de llegar a la isla es el **vado**: media legua río abajo, junto a un sauce partido, unas piedras planas que se cruzan a pie con el agua baja. Del lado norte del vado hay un banco de grava: ahí amarra Halvar. El **puente viejo** une sur y norte por encima de la isla y termina, del lado norte, en la **torre de la guardia**.

Esto hace tres cosas de una: el prólogo cruza el vado entero (norte → isla → sur) y pasa delante del molino a oscuras; el cuello 2 es obligatorio porque el clímax es en la isla; y la tercera noche el agua tapa las piedras y cruzar mata.

### 1.4 Tono

Fantasía medieval, adulto y cinematográfico. La escala es **un pueblo de frontera y un vado**: prohibido el vocabulario cósmico (reinos, imperios, la humanidad, el fin de los tiempos). Puede haber sangre, traición, pérdida y muerte, sin gore explícito. Nadie es un monstruo: los cinco que mienten tienen aritmética, no maldad.

**Forma de todo momento de violencia o de pérdida — tres movimientos, 30-60 palabras.** Es la misma forma que §11 fija para el desenlace letal y vale para el cuerpo de Tomé, las dos refriegas, cada Herida y cada muerte contada:
1. **el punto exacto en que algo cede** (una articulación, una cuerda, una frase, una respiración);
2. **una** imagen sensorial, no visual si se puede (el peso de la ropa mojada, el olor a hierro, el ruido del agua desde abajo);
3. **cierre corto y seco**. Nada de párrafo reflexivo: la consecuencia se muestra y se calla.

**Regla de plano: qué se nombra y qué queda fuera de cuadro.** Se nombra lo que un testigo diría: la posición del cuerpo, lo que el agua o el golpe hicieron con la ropa, el color, el frío, el olor. **Queda fuera de cuadro el interior del cuerpo**: nada de vísceras, huesos expuestos, descripción de heridas por dentro, ni detalle forense de la descomposición. Escrito una vez para que no se discuta lote por lote, `c1_cuerpo` es el caso resuelto: *el cuerpo lleva once días en el agua y el texto lo dice desde tres pasos, no desde encima* — se nombran la ropa hinchada, las manos, la cuerda que lo ataba a algo, el olor; no se nombra la cara. Que esté irreconocible es exactamente el punto: por eso hace falta el medallón para saber que es él.

**Lo soez, por dueño.** Hay puteada en esta campaña, poca y siempre de alguien concreto. Lista cerrada de permitidas: `mierda`, `carajo`, `la puta madre`, `hijo de puta`. Quién las usa: **Mausi** (las cuatro, es la única que putea suelta), **Ilse** (`mierda`, `carajo`, una vez cada una en toda la campaña), **Dravos** (`ninguna`, jamás, ni herido), **Orell** (`ninguna`; su enojo se ve en que se calla), **Halvar** (`ninguna`; es cortesía comercial), **Berta** (`ninguna`; dice "esto es un desastre"), **Pell** (`ninguna`; empieza una y no la termina), **Tomé** (`carajo`, una sola vez, en la última página del cuaderno). Cupo total de la campaña: **8 puteadas**, registradas en `design/cupos.md`. Las peninsulares (`joder`, `hostia`) siguen prohibidas por §2.6.

---

## 2. Reglas de prosa

### 2.1 Persona, tiempo y voz

Segunda persona, presente, **voseo también en la narración** (la narración le habla al jugador de vos). Rioplatense en la morfología; léxico sin marca moderna ni lunfardo. Nada de `che`, `laburo`, `guita`, `pibe`, `bárbaro`.

```
vos sos · tenés · podés · querés · sabés · hacés · decís · venís · vas · ves · oís · sentís · creés
imperativo: mirá · vení · tené · hacé · decí · andá · poné · salí · dejá · esperá · escuchá · acordate · fijate
posesivo: tu / tuyo / con vos / para vos     (nunca "contigo", "ti")
```

### 2.2 El detalle sensorial

**Exactamente uno por escena**, en el `text` de la escena, en una variante **sin `when`** (lo lee todo el mundo), nunca en un desenlace. Se prefiere no visual: el fondo pintado ya hace lo visual. Concreto y propio de ese lugar a esa hora. **No se repite**: cada lote actualiza `design/detalles-sensoriales.md` (escena → sentido → detalle) y lo lee antes de escribir.

**El detalle sensorial y la variante de memoria no viven en el mismo párrafo.** Como el motor elige la variante más específica que matchea, un veterano que lee la variante de memoria *no lee la base*: si el detalle estuviera ahí, el que vuelve perdería justamente lo que "lo lee todo el mundo". Regla: **el detalle va en un párrafo que no tiene variante de memoria.** Si la escena tiene un solo párrafo, la variante de memoria lleva **su propio** detalle, distinto, y se registra aparte en `design/detalles-sensoriales.md` con la marca `(memoria)`.

**Vedados por repetición, no por prohibición.** Cada lugar tiene su **sentido firma** (§4) y esa firma se usa **una vez**, en la primera escena de ese lugar; las demás escenas del mismo lugar tiran de otro sentido. Así el veto hace su trabajo —que no haya muletilla— sin chocar con la firma que la spec ya escribió para la plaza. Las cuatro imágenes que más riesgo tienen de volverse muletilla (*olor a humo viejo*, *olor a pan*, *frío en la nuca*, *olor a río*) se registran en `design/detalles-sensoriales.md` la primera vez que se usan y después quedan quemadas.

### 2.3 Longitudes

| Pieza | Rango | Objetivo |
|---|---|---|
| `scene.text` | 60-160 palabras | ~107, en 2-4 párrafos |
| Ronda de `encounter` | 40-80 | ~70 |
| `outcome.text` | 20-60 | ~28 |
| Banda de desenlace de tirada | 25-50 | ~35 |
| Variante de flag (texto condicionado) | 30-120 | según §9.2 y §7.2 |
| Epílogo de final | 120-200 | ~160 |
| `label` | ≤ 60 caracteres | 30-45, verbo primero |

Las longitudes se miden sobre **lo que lee una partida**: una variante por párrafo, la base (la última, sin `when`). Una variante de memoria en modo economía no pasa del **60 %** de la base que reemplaza.

**Piso dramático.** Toda escena con **dos o más PNJ declarados y cero tiradas** lleva por lo menos **350 palabras** de presupuesto total. Son cuatro (`a1_alcaldesa`, `c1_acusacion`, `a2_ley_berta`, `cl_halvar`) y son careos, no tránsito: la fórmula de presupuesto paga dados, y sin este piso la campaña gastaría más en la primera charla con la tabernera que en el careo con la alcaldesa que te traicionó.

**Las cuentas de palabras viven en `01-outline.md` §3.** Acá no se repiten para que no se desincronicen. Lo único que esta biblia fija es el orden de recorte si un lote se pasa: primero el cupo de **Fluff**, después las escenas de tránsito del acto 1 (`a1_taberna_trastienda`, `a1_orell_mesa`, `a1_molino_rueda`), y recién al final las variantes de memoria. **Nunca se recorta el piso dramático ni la telegrafía de muerte.**

### 2.4 Las dos prohibiciones duras

**(a) Una escena nunca describe el resultado de una tirada que ella misma propone.** El texto describe el obstáculo y lo que está en juego; el resultado lo escribe el desenlace. Vale también para el `label`: dice la intención, nunca el resultado, y nunca vocabulario mecánico ("Tirar Astucia").

**(b) El narrador nunca adelanta lo que el personaje no sabe.** Sabe tres cosas: lo que percibe ahora, lo que recuerda (memoria) y lo que le contaron en esta partida (`run:`). Un PNJ no se nombra hasta que se presenta o alguien lo nombra (*"el sargento de barba gris"*, *"el chico del casco grande"*). Nada de ironía dramática ni de presagios vagos: si hay peligro se dice **qué** se percibe.

### 2.5 Cómo se escribe un desenlace

- **Toda opción hace algo.** Cambia el texto que se lee, un flag, un objeto o el destino. Si no hace ninguna de las cuatro, **la opción se borra**, aunque la escena baje a cuatro. Esto es una casilla dura de §12, no una aspiración.
- **El fallo siempre avanza**: cierra una puerta, abre una peor, gasta tiempo, hace ruido. Nunca "no pasa nada" ni "volvés al principio". En las tiradas que son **puerta** —las que abren un contenido que no se consigue por otro lado en la misma escena— el fallo además **cierra la puerta**: enciende su `run:*_intentado` en las tres bandas y manda a otra escena, de modo que volver no sirve para repetir el dado. No hay repetición gratis en esta campaña.
- **El costo se ve en la ficción, no en la ficha**; uno solo por desenlace, de la lista cerrada: Herida (un golpe localizado), condición (un estado nombrado), objeto que cambia de mano, relación (una línea: *"no te va a olvidar"*), oportunidad (lo conseguís tarde o a medias), reloj +1 (**alguien te vio y se dice quién**).
- **Todo tic de `sospecha` se nombra en la ficción**, porque el jugador tiene que poder atribuirlo a su decisión.
- `crit` y `fumble` solo en tiradas memorables: **6 `crit` y 4 `fumble` en toda la campaña** (nombradas una por una en el outline §5/r04). Sin ellos el motor ya hace lo correcto.
- Las tres bandas de una tirada no arrancan con la misma palabra ni se parecen en estructura.

### 2.6 Palabras prohibidas y cupos

**Duras e inequívocas (rompen el lote; `lint-text` las grepea sin contexto).**
`tú · ti · contigo · vosotros · os · vuestro · tienes · quieres · puedes · sabes · haces · dices · vienes · eres · debes · piensas · crees · sientes · ten · pon · siéntate · cállate · fíjate · coger · vale (=de acuerdo) · chaval · tío · joder · hostia`.

**Ambiguas: solo prohibidas en imperativo, y no las mide `lint-text`.**
`mira · ven · haz · di · sal · deja · oye · espera · escucha`. Las nueve son homógrafas de formas perfectamente válidas en tercera persona o de sustantivos (*Orell mira el río*, *la lluvia deja charcos*, *los guardias ven la luz*, *un haz de luz del farol*, *la sal del pescado*). Un lint que las busque sueltas falla lotes correctos y empuja a escribir torcido para esquivarlas. Se revisan **en la pasada de voz**, y en la práctica casi no hace falta: con los pronombres peninsulares prohibidos, un imperativo peninsular aislado no entra.

**Clichés (duros).** `el elegido · la profecía · el destino quiso · un antiguo mal · las sombras se ciernen · un escalofrío recorre tu espalda · se te hiela la sangre · el corazón te late desbocado · tus instintos te gritan · el silencio es ensordecedor · el tiempo parece detenerse · nada volverá a ser igual · poco sabías · el aire está cargado de magia · runas que brillan con luz propia · ojos como brasas · una figura encapuchada · una sonrisa torcida · el viento susurra · las arenas del tiempo · el reino caerá`.

**Anacronismos y unidades (duros).** `segundos · minutos · horas (como medida) · metros · kilómetros · ok`. El tiempo se mide en cosas (*lo que tarda en apagarse un farol*, *dos relevos*, *antes del amanecer*, *once días*); la distancia también (*media legua*, *veinte pasos*, *a tiro de ballesta*).

**Cupos de campaña, en registro corrido.** Los cupos **no se dividen por lote**: dividir por siete convierte en cero todo lo que vale menos de siete, y a Pell —cuyo tic definitorio es el `usted`— lo dejaba diciéndolo dos veces en toda la campaña. El cupo es de campaña y cada lote **anota lo que gastó** en `design/cupos.md`, igual que ya hace con arranques y detalles sensoriales; `lint-text` lo mide al final contra el total.

| Palabra o giro | Cupo | Reparto sugerido |
|---|---:|---|
| `usted` | **8**, todas de Pell | 2 por escena de Pell: `p_puente`, `a1_molino`, `a1_molino_pell`, `cl_molino` |
| puteadas de la lista de §1.4 | **8** | Mausi 4 · Ilse 2 · Tomé 1 · una libre |
| `de repente` / `de pronto` | 4 | a mano, nunca dos en el mismo lote |
| `muy` | 12 | |
| `lentamente` / `rápidamente` | 4 | |
| `parece que` | 8 | |
| `como si fuera` | 6 | |
| `no podés evitar` | 2 | |
| `una mezcla de X y Y` | 1 | |
| `de alguna manera` | 2 | |
| `realmente` / `literalmente` / `increíblemente` / `absolutamente` | **0** | |

Máximo **un adverbio en -mente por escena**.

### 2.7 Arranques

Las **tres primeras palabras del texto base de cada escena son únicas en toda la campaña** y se registran en `design/arranques.md`.

La vieja regla *«nunca dos escenas seguidas empiezan con la misma palabra»* no era verificable: en un grafo con hub no existe "seguidas" (`a1_plaza` sigue a siete escenas y precede a seis). Se reemplaza por **dos reglas medibles**:

1. **Local:** ninguna escena empieza con la misma primera palabra que **ninguna de las escenas a las que apunta directamente**. Se chequea con `sceneEdges` y es un test de contenido de tres líneas.
2. **Global:** ninguna primera palabra se usa más de **tres veces** en las 46 escenas.

Quemados desde el primer uso: `El aire`, `La noche`, `El olor a`, `El silencio`, `La lluvia`, `Cuando`, `Mientras`, `Al entrar`, `Al llegar`, `Antes de que`, `Algo`, `Hay algo`, `No hay`, `Nadie`. Un desenlace nunca arranca con `Lo lográs`, `Fallás`, `Conseguís`, `Por suerte`, `Por desgracia`, `Finalmente`. Tics con cupo de uno por escena: la enumeración de tres, el "no X, sino Y" y la oración sin verbo.

---

## 3. Los 8 personajes

| id | Nombre | Vive en | Rol | Color firma | Escenas donde aparece (`npcs`) |
|---|---|---|---|---|---|
| `berta` | Berta | `vado/` | Alcaldesa; te mandó la carta | Vino / lana burdeos | `a1_alcaldesa`, `a1_berta_despacho`, `c1_acusacion`, `a2_ley_berta`, **`cl_desenlace`** |
| `ilse` | Ilse | **`world/`** | Hija de Berta; carga la harina y el secreto | Mostaza / trenza cobre | `a1_alcaldesa`, `a1_ilse_patio`, `a2_ley_berta`, `a2_fuera_fuga`, `a2_fuera_sotano`, `a2_fuera_medallon`, `a2_fuera_ilse`, `cl_desenlace` |
| `orell` | Sargento Orell | **`world/`** | La ley que todavía duda | Pizarra / acero engrasado | `p_puente`, `p_puente_rechazo`, `p_puente_amanecer`, `a1_taberna`, `a1_orell_mesa`, `a1_ronda`, `c1_acusacion`, `c1_refriega`, `a2_ley_orell`, `a2_ley_guardia`, **`c2_otra_orilla`**, **`cl_desenlace`** |
| `dravos` | Capitán Dravos | `vado/` | Cierra el puente y vende el sello | Índigo casi negro / plata | `a1_ronda`, `c1_acusacion`, `c1_refriega`, `a2_ley_torre`, `cl_molino`, `cl_dravos`, `cl_halvar` |
| `tome` | Tomé | `vado/` | El molinero muerto. Habla por escrito | Blanco de harina / marrón tibio | `c1_cuerpo` (cuerpo, no habla), `a2_fuera_sotano` (`speaker`, el cuaderno) |
| `halvar` | Halvar | **`world/`** | El comprador del otro lado | Verde azulado / piel y anillos | `a2_ley_halvar`, `cl_molino`, `cl_halvar` |
| `mausi` | Mausi | `vado/` | Tabernera del Ancla Seca | Naranja óxido / hollín | `a1_taberna`, `a1_taberna_trastienda`, `a1_posada` |
| `pell` | Pell | `vado/` | Guardia joven; la grieta | Pajizo / cuero sin teñir | `a1_molino`, `a1_molino_pell`, `cl_molino` |

**Regla de `npcs`, escrita una vez para toda la campaña.** Un PNJ va en `scene.npcs` **solo si está presente en toda ruta que entre a esa escena**; entonces puede tener `speaker`. Si su presencia es **condicional**, no se declara: **lo nombra el narrador** y ningún párrafo lleva su `speaker` (es la solución del conflicto 12 del outline, generalizada). Dos razones: r07 rechaza un `speaker` que no esté en `npcs`, y declarar un PNJ **deriva `char:met.<id>` aunque no hable**, así que declarar a alguien "por si acaso" le regala al jugador un conocido que nunca vio.

Los cuatro casos del clímax quedan así, y están escritos en la tabla §2 del outline: `cl_molino` y `cl_halvar` **no** declaran a Ilse (viene con `run:con_ilse`; la nombra el narrador); `cl_dravos` **no** declara a Orell (viene con `run:orell_confia`; lo nombra el narrador); `c2_otra_orilla` y `cl_desenlace` **sí** declaran a Orell, porque en toda ruta la guardia está del lado de la isla; `cl_desenlace` **sí** declara a Berta, que baja al sótano detrás de su hija en toda ruta.

**Pell no está en `p_puente`.** En la barricada es *el chico del casco grande*, sin nombre y sin `speaker`: el narrador lo reporta. Se lo conoce cara a cara en `a1_molino_pell` y nada más ahí, que es lo que §9.2 promete y lo que hace que el atajo `[Recuerdo]` de §9.3 sea de verdad un recuerdo y no algo que se abre en la escena 2 de la primera partida. Costo aceptado: en el prólogo no hay retrato de Pell.

**Por qué tres en `world/`.** Son los que la segunda campaña reutiliza (spec §12) y los tres tienen razón de ficción: Orell es la ley de la frontera y sobrevive a todo; Ilse es el vínculo que `char:vado.vinculo_ilse` existe para que alguien lo lea; Halvar es el antagonista que no es de acá, con una casa comercial transregional. Los otros cinco están atados a Aldamar y no ganan nada siendo globales.

### Regla de voz

El jugador tiene que saber quién habla sin mirar el nombre. Cada PNJ tiene **un tic de sintaxis**, nunca fonética escrita ("pa'", "'tá"). Voseo en todos, Halvar y Dravos incluidos: Halvar es extranjero en el **orden** de la frase, no en el pronombre.

**Cada uno mide en otra unidad, y los ocho tienen la suya.** Tres de los ocho cuantifican y hablan de plata en las mismas escenas (Berta, Dravos y Halvar comparten `cl_molino` y `cl_halvar`), así que la unidad es lo que los separa y no puede repetirse:

| PNJ | Unidad | Tic de sintaxis | Dos prohibiciones |
|---|---|---|---|
| `orell` | relevos y guardias | una cláusula, imperativo o infinitivo | nunca miente · nunca nombra a Dravos sin el rango |
| `halvar` | **monedas y peajes** | orden de frase invertido ("Mucho no me gusta, esto") | nunca dice "no" directo · nunca amenaza |
| `berta` | **días y bolsas** | frases largas y bien armadas, plural institucional | nunca dice "no sé" · nunca pide perdón |
| `dravos` | **meses de sueldo y hombres** ("once meses", "catorce hombres") | evita el "yo": *hay que*, *corresponde* | nunca grita · nunca dice el precio en monedas (eso es de Halvar) |
| `tome` | dedos de agua | refranes de harina; se corrige a sí mismo | nunca culpa a nadie que no sea él · nunca nombra a Ilse en el cuaderno |
| `mausi` | jarras | "Yo no digo nada, ¿eh?, pero…" | nunca da un nombre propio si hay gente · nunca te deja el vaso vacío |
| `ilse` | **peso: sacos, arrobas, escalones** | contesta antes de que termines | nunca ruega ni dice "por favor" · nunca se compadece de sí misma |
| `pell` | **ordenanzas numeradas** ("la séptima dice…") | empieza, se corrige, reempieza; `usted` mezclado con voseo | nunca dice que no a una orden · nunca termina una puteada |

### `berta`
Registro administrativo con calidez de pueblo; frases largas con cifras adentro; plural institucional (*el pueblo*, *nosotros*). Abre con "mirá" y cierra con "y bueno". Mide en **días y bolsas**.
*Secreto:* firmó la cesión del paso antes de mandarte la carta. *Dos vías sin `class`:* la celda "taberna última" y la celda "alcaldesa última" de la matriz (§9.2). Una tercera, solo en el clímax y pagando: `cl_halvar.leerle_lo_que_firmo_berta`, con `carta_de_halvar` en la mano. Escribe `run:berta_miente`.
*En el clímax:* baja al sótano detrás de Ilse. Su párrafo en `cl_desenlace` varía por `run:berta_miente` —que es un flag `run:` y por lo tanto legal en boca de un PNJ (§9.1)—: o te explica la aritmética del pueblo, o te la explica sabiendo que vos ya sabés. Es el único lugar donde la mentira que perseguiste toda la campaña tiene cara.
`canonPrompt:` *Berta, woman of 58, mayor of a river village. Broad face, deep vertical frown lines, iron-grey hair pinned back tight under a dark wool coif. Heavy burgundy wool overdress, cream linen collar, a tarnished brass chain of office worn like a necklace, ink-stained right hand. Palette: wine red, iron grey, warm cream, dull brass.*

### `ilse` — `world/`
Frases cortas y filosas; contesta antes de que termines; habla de **cosas pesables** (sacos, arrobas, escalones) y las usa de metáfora sin avisar. Ironía seca, cero autocompasión. Nunca ruega, nunca dice "por favor"; si está por llorar, cambia de tema a una tarea.
*Secreto:* fue la última en ver vivo a Tomé y se quedó con el medallón. *Vías, una por rama:* en la **rama B**, el sótano (`a2_fuera_sotano` → `a2_fuera_medallon`); en la **rama A**, `a2_ley_berta.hablarle_a_ilse_en_la_escalera`, tirada libre de Presencia con ventaja por `run:ilse_confia`. Las dos entregan `medallon_de_tome` y el hito `la_verdad_de_tome`. El atajo `[Recuerdo]` con `endingSeen: 'fin_crecida'` es un tercer acceso, más rápido, no el único.
`canonPrompt:` *Ilse, young woman of 19, miller's helper and mayor's daughter. Strong jaw, sunburnt nose, copper-red hair in one thick braid over the shoulder, flour dust on the forearms. Mustard-ochre linen dress, sleeves rolled and tied, a man's leather apron too big for her, a plain cord at the throat. Palette: mustard ochre, copper red, flour white, worn leather brown.*

### `orell` — `world/`
Militar seca, casi sin adjetivos; frases de una cláusula; mide en **relevos y guardias**. **Nunca miente**: si no puede decir la verdad se calla con una fórmula ("Eso no te lo puedo decir"). Nunca amenaza con algo que no vaya a cumplir; nunca nombra a Dravos sin el rango.
*Secreto:* guarda la orden escrita (*que el molinero no hable*) y movió el cuerpo. *Vías:* la taberna con `run:orell_confia`; confrontarlo delante de Dravos en `c1_acusacion`; la rama A entera, que es su confesión en cuotas.
*Presentación con variante `met`:* el párrafo de narrador que lo reconoce va en **`p_puente`**, y —porque el puente es salteable— **también en `a1_taberna` y en `c1_acusacion`**, condicionado además a que el jugador no haya pasado por la barricada. El personaje que aparece en doce escenas no puede debutar sin el beat.
`canonPrompt:` *Orell, man of 51, frontier sergeant. Weathered square face, grey beard cropped close, a white scar through the left eyebrow, deep-set tired eyes. Slate-grey gambeson under a short mail shirt, oiled steel that is clean but dented, a plain sergeant's sash of undyed wool, crossbow strap across the chest. Palette: slate grey, oiled steel, undyed wool, cold blue shadow.*

### `dravos`
Cortés, culto, sin una palabra alta. Evita el "yo": *hay que*, *corresponde*, *lo que falta entender es*. Mide en **meses de sueldo atrasado y en hombres**, nunca en monedas: el precio lo dice Halvar. Reformula lo que decís antes de contestarte. Nunca grita ni amenaza de frente: describe lo que "va a pasar igual".
*Secreto:* no cree en el sello; con lo que paga Halvar cubre once meses de sueldos. *Vías:* el libro de pagas en la torre; la negociación del clímax; Pell, que repite la orden que le hicieron olvidar.
`canonPrompt:` *Dravos, man of 44, garrison captain. Lean face, cropped black hair greying at the temples, a thin nose broken once and set well, close-shaved. Deep indigo-black surcoat over a riveted brigandine, silver captain's clasp at the shoulder, grey riding gloves tucked in the belt, no jewellery. Palette: indigo black, cold silver, dark steel, a single thread of dried-blood red at the cuff.*

### `tome`
Cálida, de oficio, con refranes de harina y de piedra; mide en **dedos de agua**; se repite, se corrige, se ríe de sí mismo; usa el "viste" para buscar compañía en el que lee. En el cuaderno la sintaxis se le rompe día a día hasta quedar en una línea por página. Nunca culpa a nadie que no sea él.
*Secreto:* no encontró el sello, **lo rompió**. *Vías:* el `cuaderno_de_tome`; el hueco con la esquirla faltante junto al cuerpo; el medallón de Ilse, que encaja.
*Nota técnica:* habla con `speaker: 'tome'` solo en `a2_fuera_sotano`, que lo declara en `npcs` (r07). Está declarado también en `c1_cuerpo` sin hablar, así que **toda ruta deriva `char:met.tome`**: es la frase del epílogo, "conociste a un hombre que ya estaba muerto". El chiste funciona en el epílogo y falla en la pantalla de Recuerdos, donde el jugador leería que conoce a alguien con quien nunca habló; se resuelve en la Fase C con `character.memoryNames` (§13.6).
`canonPrompt:` *Tomé, man of 46, village miller, seen in memory and in portraits of the dead. Round kind face, thick dark eyebrows, three days of stubble, deep laugh lines, a chipped front tooth. Bleached flour-dusted linen shirt, sleeves pushed up over heavy forearms, a canvas apron white with flour, a leather cord at the neck with an empty setting where a stone is missing. Palette: flour white, warm oak brown, dusty grain gold.*

### `halvar` — `world/`
Cortesía comercial excesiva y sintaxis de traducción: el orden de la frase le sale del revés ("Mucho no me gusta, esto"). Mide en **monedas y peajes**, y todo se enumera. Muletillas: "amigo", "digamos", "cerremos". Nunca amenaza: lee las consecuencias como quien lee una factura. Nunca dice "no" directo.
*Secreto:* su casa quiere la crecida, para cobrar peaje en su propio puente. *Vías:* las cartas de la torre; su libro de rutas, con los peajes del año que viene ya anotados (`cl_halvar.leerle_el_libro_de_rutas`); la negociación del clímax con `carta_de_halvar`.
*Presentación con variante `met`:* el párrafo va **en las dos escenas donde puede debutar** —`a2_ley_halvar` (rama A) y `cl_molino` (rama B)—, porque según la rama se lo conoce en una o en la otra y nunca se sabe de antemano cuál.
`canonPrompt:` *Halvar, man of 50, foreign river merchant. Broad pale face, pale blond beard braided in two short plaits, shrewd pale-blue eyes, heavy silver rings on three fingers. Teal-green brocade coat with marten fur at the collar, thick travelling boots, a leather ledger case on a strap across the chest. Palette: teal green, dark fur brown, cold silver, ivory.*

### `mausi`
Rápida y siempre haciendo otra cosa mientras habla. Mide en **jarras**. Preguntas retóricas, diminutivos, y el chisme con estructura defensiva: "Yo no digo nada, ¿eh?, pero…". Nunca da un nombre propio si hay gente escuchando ("el que se sentó ahí", "el de la capa"). Nunca te deja el vaso vacío. Es la única que putea suelta.
*Secreto:* le pasa a Dravos la lista de quién entra al pueblo, porque **Pell es su sobrino** y lo quiere vivo. *Vías:* el tic de `sospecha` al salir de la taberna, que el narrador hace notar sin acusar (`run:mausi_informo`); Pell, que lo deja escapar en el molino; confrontarla con `run:sabe_de_halvar`.
`canonPrompt:` *Mausi, woman of 39, riverside tavern keeper. Round flushed face, sharp quick eyes, dark hair escaping from a rust-orange headscarf, soot smudge on one cheek, forearms scalded pink from washing. Rust-orange scarf, undyed linen shirt with rolled sleeves, a leather apron shiny with grease, a brass tap key hanging from her belt. Palette: rust orange, greasy leather brown, soot black, copper.*

### `pell`
Atropellada: empieza una frase, la corrige, la vuelve a empezar. **Trata de usted y se le mezcla con el voseo** (único con cupo de `usted`: 8, dos por escena). Mide en **ordenanzas numeradas** y las recita cuando se pone nervioso, que es siempre. Nunca dice que no a una orden: dice "sí" y después no la cumple bien. La verdad se le escapa por el costado de una negación.
*Secreto:* estaba de guardia la noche que Tomé bajó al sótano y **vio quién entró detrás**. *Vías:* tratarlo con decencia en el molino (opción sin tirada); la taberna con Mausi delante; el atajo `[Recuerdo]` de su ronda, que solo existe si en una partida anterior lo conociste en el molino.
`canonPrompt:` *Pell, boy of 17, village militia guard. Thin freckled face, straw-blond hair cut badly by himself, ears that stick out, the first uneven attempt at a beard. Undyed leather jerkin two sizes too big over a russet tunic, a spear he holds too tight, a helmet that slips down over the eyebrows. Palette: straw yellow, russet brown, undyed leather, pale grey steel.*

### Quién puede morir

**Nadie de `world/` muere en ninguna ruta**: Orell puede terminar degradado, preso o roto; Ilse del otro lado del río; Halvar siempre se va, con o sin la piedra. **Tomé ya está muerto** y no hay ruta que lo salve. **Berta, Mausi y Pell** sobreviven a todo.

**Dravos no muere en escena.** `cl_dravos` lo deja roto, preso, degradado o huido, nunca muerto: la escena no puede matarlo porque `cl_desenlace.dejar_que_la_guardia_cruce_con_la_piedra` —la opción libre que produce `fin_dravos`— tiene que ser escribible en el estado exacto en el que el jugador llega, y una opción que dependiera de que Dravos siga entero rompería las cuatro libres de r03. Si muere, **lo cuenta el epílogo** y solo en algunas rutas; por eso el final se llama *Aldamar de Dravos* pero la opción se llama *dejar que la guardia cruce con la piedra*: la guarnición cobra igual y el paso se cede igual, esté él o no.

**El único que muere de verdad es el jugador**, y solo en `c2_vado_crecido`.

---

## 4. Los 8 lugares y las 4 variantes

| id | Nombre visible | Variante | Sentido firma | Escenas |
|---|---|---|---|---|
| `puente_viejo` | El puente viejo | `amanecer` | El río golpeando los pilares; olor a limo | `p_camino`, `p_puente`, `p_puente_rechazo`, `p_puente_amanecer`*, `fin_heredero`* |
| `vado_oculto` | El vado oculto | `crecido` | Piedra resbalosa; frío que sube por las piernas | `p_vado_oculto`, `c1_cuerpo`, `a2_ley_halvar`, `c2_orilla`*, `c2_vado_crecido`*, `fin_dravos`* |
| `aldamar_plaza` | La plaza de Aldamar | `tormenta` | Humo de leña mojada y pan que ya no se hornea | `a1_plaza`, `a1_ronda`, `c1_acusacion`, `c1_refriega`, `a2_amanecer`, `a2_fuera_fuga`, `c2_anochece`* |
| `taberna_ancla_seca` | El Ancla Seca | — | Grasa de cordero y cerveza agria | `a1_taberna`, `a1_taberna_trastienda`, `a1_orell_mesa`, `a1_posada` |
| `casa_de_berta` | La casa de la alcaldesa | — | Cera de abeja y papel seco | `a1_alcaldesa`, `a1_berta_despacho`, `a1_ilse_patio`, `a2_ley_berta` |
| `molino_de_tome` | El molino de Tomé | `inundado` | **El caz golpeando bajo el piso de tablones** | `a1_molino`, `a1_molino_pell`, `a1_molino_trampilla`, `a1_molino_rueda`, `a2_fuera_refugio`, `c2_otra_orilla`*, `cl_molino`*, `cl_dravos`*, `cl_halvar`*, `fin_crecida`* |
| `sotano_del_sello` | El sótano del sello | — | Una gota que cae contando el tiempo | `a2_fuera_sotano`, `a2_fuera_sello`, `a2_fuera_medallon`, `a2_fuera_ilse`, `cl_desenlace`, `fin_hundido` |
| `torre_de_dravos` | La torre de la guardia | — | Sebo quemado y tinta | `a2_ley_orell`, `a2_ley_torre`, `a2_ley_cartas`, `a2_ley_guardia` |

`*` = usa la variante. **Presupuesto exacto de la spec §7: 8 bases + 4 variantes.** Las variantes son **re-iluminaciones de la misma composición** (ControlNet depth del máster): un interior distinto no es una variante, es otra base. **Todo lo demás que parezca una variante (`salon`, `trastienda`, `despacho`, `patio`, `cuartel`, `escritorio`, `rueda`, `piedra`, `alba`, `dia`, `ronda`, `callejon`, `embarcadero`) no existe como `variant`: son escenas distintas en el mismo lugar, diferenciadas por prosa.** La noche es la imagen base de los ocho.

**La firma del molino es de oído, no de vista.** El molino es el lugar con más escenas de la campaña (diez) y hay que sacarle diez detalles distintos y no repetidos; una firma visual ("harina flotando en el aire del farol") no ayuda, porque el fondo pintado ya hace lo visual y porque no se puede variar diez veces. La firma es **el caz golpeando bajo el piso de tablones**, y de ahí salen la rueda girando sin carga, el piso que devuelve el agua, la harina que se pega a la piel mojada, el olor a grano caliente. La harina en el aire queda como imagen de fondo, no como firma.

**Consecuencia de calendario:** la campaña transcurre casi entera de noche. `a2_amanecer` no es de día: es la última hora de la noche, con la luz gris entrando, y el día pasa fuera de escena dentro de la primera escena de la rama elegida.

- **`puente_viejo`** — la base se compone **desde el camino embarrado**, con el puente a media distancia, para que `p_camino` y la barricada compartan fondo y no haga falta un noveno lugar. `canonPrompt:` *Old stone bridge over a wide brown river at night, seen from a muddy road in the foreground, three arches, a barricade of planks and barrels across the near end, two lanterns hanging on poles, a squat square guard tower at the far end, a dark village of shuttered houses beyond. Heavy rain, low black clouds. No figures. Palette: wet slate, black water, amber lantern light.*
- **`vado_oculto`** — `canonPrompt:` *Hidden river ford at night, a lightning-split willow leaning over the bank, flat stepping stones breaking the black water, reed beds on both sides, a low gravel spit, far hills as a flat silhouette. Overcast moonlight. No figures. Palette: black-green water, silver moon, dead willow grey.* La variante `crecido` (agua tapando las piedras, el sauce hasta media altura, espuma marrón) **es el fondo de la única escena mortal** y su aviso visual.
- **`aldamar_plaza`** — el hub. `canonPrompt:` *Muddy village square of a river frontier town at night, a stone well with a cut rope in the centre, low timber-and-daub houses with steep shingle roofs, three windows lit warm amber, a leaning notice post, the black bulk of a watermill across the water at the far end. Light rain, puddles reflecting the lit windows. No figures. Palette: mud brown, wet black timber, amber window light.*
- **`taberna_ancla_seca`** — *Interior of a small river tavern, heavy low beams, a rusted iron ship anchor hanging from the main beam, long trestle tables, a smoky hearth on the left, a plank bar with clay jugs, a closed back door with a bench beside it, fishing floats and a broken oar on the wall. Tallow candles, thick smoky air. No figures. Palette: smoke brown, ember orange, rust, dirty cream plaster.*
- **`casa_de_berta`** — *Interior of a village mayor's house, two-storey stair in the background, whitewashed walls covered in overlapping river maps pinned in layers, a broad writing table with sealed letters, a wax seal press and a brass candlestick, a tall stone hearth burning well, a locked oak chest. Warm even candlelight. No figures. Palette: beeswax gold, dry parchment, dark oak, whitewash.*
- **`molino_de_tome`** — *Interior of a working watermill at night, the great wooden gear wheel and millstone in the centre, a stack of burst flour sacks, a wooden stair to a loft, a trapdoor in the plank floor with a hasp, flour dust hanging in a single lantern beam, the wet mill race visible through an open hatch. No figures. Palette: flour white, wet oak black, lantern amber, green river damp.* La variante `inundado` es el fondo del clímax, la imagen que ve todo jugador en toda ruta.
- **`sotano_del_sello`** — *Round underground stone chamber older than the building above it, carved spiral channels in the floor leading to a central socket, a shallow ring of standing water, a wooden ladder coming down through a trapdoor, chalk writing scrawled across one curved wall, roots pushing between the blocks. Cold blue light from above, one lantern on the floor. No figures. Palette: cold grey stone, chalk white, black water, faint green moss.* El agua que sube se cuenta con texto, no con una imagen nueva.
- **`torre_de_dravos`** — *Interior of a square stone guard tower command room, a heavy campaign table with unrolled charts and a stack of sealed letters, a brass brazier of coals, a rack of crossbows on the wall, an untouched camp bed, a narrow arrow-slit window showing black river and rain, a strongbox under the table. Tallow lamp light, cold stone. No figures. Palette: cold grey stone, ember red, ink black, brass.*

---

## 5. Los 8 objetos

| id | Nombre | Dónde | `advantageTags` | Qué hace |
|---|---|---|---|---|
| `carta_lacrada` | Carta lacrada de Berta | `p_camino.onEnter` | `social` | Llave narrativa; **se gasta de cuatro maneras** |
| `farol_de_sebo` | Farol de sebo | Taberna o molino, acto 1 | `percepcion` | Ventaja en cuatro tiradas del acto 1; se pierde en el sótano y en la guardia |
| `palanca_de_molino` | Palanca de molino | Molino, acto 1 | `fisico` | Abre la trampilla sin tirada; **queda trabándola** |
| `cuerda_de_molinero` | Cuerda de molinero | Molino, sótano o `c2_anochece` | `huida`, `supervivencia` | Ventaja en el cruce; habilita cruzar atado al sauce |
| `cuaderno_de_tome` | El cuaderno de Tomé | Sótano, acto 2 | `saber` | Once días de anotaciones; es la voz de Tomé |
| `medallon_de_tome` | El medallón de Tomé | Ilse, cuando confiesa (las dos ramas) | `magia` | La esquirla que falta: **sin él el sello cierra mal** |
| `carta_de_halvar` | La carta de Halvar | Torre, acto 2 | `social` | Prueba física de la traición de Berta |
| `sello_del_vado` | **El sello del vado** | Sótano / clímax | `magia` | **`relic: true`, vive en `world/items.ts`** |

- **`carta_lacrada`** es el objeto que más trabaja: se pierde dándosela a Orell para cruzar, mostrándosela a Dravos en `c1_acusacion`, cruzando el vado con Éxito con costo (quedás `empapado` y el lacre se deshace) o **en el cruce de rama por `a2_ley_berta`, donde Berta te la arranca de la mano**. Quien la conserva llega al clímax con ventaja social; quien la gastó bien llegó por otro lado. La prosa la nombra ("todavía tenés la carta") para que se entienda que es perdible.
- **`farol_de_sebo`** tiene trabajo de verdad y no ocupa una ranura a cambio de nada: cuatro tiradas del acto 1 llevan `advantageIf: { item: 'farol_de_sebo' }` —`a1_molino_trampilla.bajar_la_escalera`, `a1_molino_rueda.trabar_la_rueda`, `a1_ilse_patio.mirar_lo_que_carga` y `a1_berta_despacho.revisar_el_escritorio`— y en el clímax es la ventaja de `cl_dravos.usar_la_maquinaria`. Se pierde en `a2_fuera_sotano.onEnter` (se te cae al charco del sótano) y en `a2_ley_guardia.onEnter` (lo dejás colgado en el poste del relevo), que son justo las dos escenas donde la mochila está por desbordar.
- **`palanca_de_molino`** existe sobre todo **para el Mago**: es la única fuente situacional de `fisico` y le cancela la Debilidad en la escena mortal. Se consume al **bajar por la trampilla por cualquier vía**, no solo al forzarla: queda trabando la tapa para que no se cierre sola. `a1_molino_trampilla` y `a2_fuera_sotano` la sacan las dos en su `onEnter`.
- **`medallon_de_tome`** lo entrega Ilse **en las dos ramas**: en la B, en `a2_fuera_medallon`; en la A, en `a2_ley_berta.hablarle_a_ilse_en_la_escalera`. Sin él, el sello **cierra mal**: `cl_desenlace.devolver_el_sello_a_la_piedra` lleva `advantageIf: { item: 'medallon_de_tome' }` y su banda de fallo cambia de precio sin él, y el epílogo de `fin_hundido` lo dice con todas las letras (el río baja, pero no del todo, y el vado queda inservible igual). No es una llave: es un precio.
- **`carta_de_halvar`** se usa, no se colecciona: `cl_halvar.leerle_lo_que_firmo_berta` la pide en `requires` y enciende `run:berta_miente` aunque no lo traigas del acto 1. Es el pago de toda la rama A.
- **`sello_del_vado`** es el único `relic` y el único declarado fuera de `vado/items.ts` (r07). Dentro de la campaña es un objeto normal; **persiste entre campañas solo por el `reward` del final** (§8), no por quedar en la mochila — y para eso el motor tiene que aprender a aplicar `reward`, que hoy no lo hace (§13.1).

### Regla dura de ranuras

`LIMITS.maxItems` es **6** (verificado en `catalog.ts`) y `giveItem` **no hace nada, en silencio**, si la mochila está llena (`effects.ts:38`). **Ninguna llave narrativa puede depender de que haya ranura libre**, así que el peor caso no se afirma: se muestra escena por escena. Un `take` de un objeto que no tenés es inocuo (filtra una lista), así que los `take` forzados se pueden declarar sin condiciones.

**Rama A — nunca baja al sótano**

| Momento | Entra | Sale | Ocupadas |
|---|---|---|---:|
| `p_camino.onEnter` | `carta_lacrada` | — | 1 |
| Acto 1, taberna o molino | `farol_de_sebo` | — | 2 |
| Acto 1, molino | `palanca_de_molino` | — | 3 |
| `a1_molino_trampilla.onEnter` | — | `palanca_de_molino` | 2 *(3 si nunca bajó)* |
| `a2_ley_torre` | `carta_de_halvar` | — | 3 *(4)* |
| `a2_ley_berta` (Ilse confiesa) | `medallon_de_tome` | — | 4 *(5)* |
| `a2_ley_guardia.onEnter` | — | `farol_de_sebo` | 3 *(4)* |
| `c2_anochece.buscar_una_cuerda` | `cuerda_de_molinero` | — | **4 *(5)*** |

**Rama B — baja al sótano**

| Momento | Entra | Sale | Ocupadas |
|---|---|---|---:|
| `p_camino.onEnter` | `carta_lacrada` | — | 1 |
| Acto 1 | `farol_de_sebo`, `palanca_de_molino` | — | 3 |
| `a2_fuera_sotano.onEnter` | — | `farol_de_sebo`, `palanca_de_molino` | 1 |
| `a2_fuera_sotano` | `cuaderno_de_tome` | — | 2 |
| `a2_fuera_sello` | `sello_del_vado` | — | 3 |
| `a2_fuera_medallon` | `medallon_de_tome` | — | 4 |
| `c2_anochece.buscar_una_cuerda` | `cuerda_de_molinero` | — | **5** |

**Cruce A → B por `a2_ley_berta`, el peor camino de los tres**

| Momento | Entra | Sale | Ocupadas |
|---|---|---|---:|
| Llega al cruce con | `carta_lacrada`, `farol`, `palanca`, `carta_de_halvar`, `medallon` | — | 5 |
| La opción de cruce | — | `carta_lacrada` *(Berta te la arranca de la mano)* | 4 |
| `a2_fuera_sotano.onEnter` | — | `farol`, `palanca` | 2 |
| El sótano | `cuaderno_de_tome`, `sello_del_vado` | — | 4 |
| `c2_anochece` | `cuerda_de_molinero` | — | **5** |

**Peor caso en cualquier ruta: 5 de 6. Margen: una ranura.** El atajo `[Recuerdo]` de `a2_amanecer` al sótano llega a 5 por el mismo camino. Ninguna escena hace `give` de una llave sin que la ruta haya hecho antes un `take` demostrable, y eso es una casilla de §12.

---

## 6. Estructura del grafo — 46 escenas

### 6.1 Lista

**Prólogo (5).** `p_camino` (start, `puente_viejo`) · `p_puente` (orell) · `p_puente_rechazo` (orell) · `p_vado_oculto` · `p_puente_amanecer` (orell, `amanecer`).

**Acto 1, Aldamar de noche (13).** `a1_plaza` (**hub**) · `a1_taberna` (mausi, orell) · `a1_taberna_trastienda` (mausi) · `a1_orell_mesa` (orell) · `a1_alcaldesa` (berta, ilse) · `a1_berta_despacho` (berta) · `a1_ilse_patio` (ilse) · `a1_molino` (pell) · `a1_molino_pell` (pell) · `a1_molino_trampilla` · `a1_molino_rueda` · `a1_posada` (**rest**, mausi) · `a1_ronda` (dravos, orell — floodgate de `sospecha`).

**Cuello 1 (3).** `c1_cuerpo` (tome, en el vado — **convergencia 1**) · `c1_acusacion` (dravos, orell, berta — Burnt Bridge de rama) · `c1_refriega` (**encounter**, dravos, orell).

**Transición A (1).** `a2_amanecer` — acá se compromete la rama.

**Acto 2 rama A, "Con la ley" (6).** `a2_ley_orell` (orell) · `a2_ley_torre` (dravos) · `a2_ley_cartas` · `a2_ley_halvar` (halvar) · `a2_ley_berta` (berta, ilse) · `a2_ley_guardia` (**rest**, orell).

**Acto 2 rama B, "Contra la ley" (6).** `a2_fuera_fuga` (ilse) · `a2_fuera_sotano` (ilse, tome) · `a2_fuera_sello` · `a2_fuera_medallon` (ilse) · `a2_fuera_ilse` (ilse) · `a2_fuera_refugio` (**rest**).

**Transición B (1).** `c2_anochece` — tercera noche, **primer aviso de muerte (T−2)**.

**Cuello 2 (3).** `c2_orilla` (**T−1**) · `c2_vado_crecido` (**`lethal: true`**) · `c2_otra_orilla` (orell).

**Clímax (4).** `cl_molino` (dravos, halvar, pell) · `cl_dravos` (**encounter**, dravos) · `cl_halvar` (halvar, dravos) · `cl_desenlace` (ilse, berta, orell — **convergencia 2**).

**Finales (4).** `fin_hundido` · `fin_dravos` · `fin_crecida` · `fin_heredero` (`hidden`).

**Cuenta:** 5 + 13 + 3 + 1 + 12 + 1 + 3 + 4 + 4 = **46** ✔. `encounter` 2 · `rest` 3 · `lethal` 1 (`lethalScenes: 1`) · `ending` 4 · hub 1 · `normal` 36.

### 6.2 Mapa de aristas

```
p_camino            → p_puente, p_vado_oculto
p_puente            → a1_plaza, p_puente_rechazo, p_vado_oculto, p_puente_amanecer
p_puente_rechazo    → a1_plaza, p_vado_oculto, p_puente_amanecer
p_vado_oculto       → a1_plaza, a1_molino, a1_molino_trampilla
p_puente_amanecer   → a1_plaza, p_vado_oculto

a1_plaza     [R1] sospecha>=4 → a1_ronda
             [R2] 3 pistas && visited(a1_plaza)>=3 → c1_cuerpo
             → a1_taberna, a1_alcaldesa, a1_molino, a1_posada, a1_plaza (×2, Fluff),
               a1_berta_despacho (gated), a1_molino_trampilla (atajo [Recuerdo])
a1_taberna            → a1_taberna_trastienda, a1_orell_mesa, a1_plaza
a1_taberna_trastienda → a1_taberna, a1_molino          a1_orell_mesa → a1_taberna
a1_alcaldesa          → a1_berta_despacho, a1_ilse_patio, a1_plaza
a1_berta_despacho     → a1_alcaldesa, a1_ilse_patio    a1_ilse_patio → a1_alcaldesa, a1_molino, a1_plaza
a1_molino             → a1_molino_pell (gated), a1_molino_rueda, a1_molino_trampilla, a1_plaza
a1_molino_pell        → a1_molino_trampilla, a1_molino, a1_molino_rueda
a1_molino_trampilla   → a1_molino_rueda, a1_molino, a1_plaza
a1_molino_rueda       → a1_molino_trampilla, a1_molino, a1_plaza
a1_posada             → a1_plaza, a1_taberna, a1_molino, a1_alcaldesa
a1_ronda              → c1_cuerpo

c1_cuerpo    → c1_acusacion                    ** CONVERGENCIA 1 **
c1_acusacion → a2_amanecer, c1_refriega
c1_refriega  [R] pelea>=2 → a2_amanecer  ·  → c1_refriega (ronda), a2_amanecer

a2_amanecer  → a2_ley_orell, a2_fuera_fuga, a2_fuera_sotano (atajo)   ** BIFURCACIÓN **

a2_ley_orell   → a2_ley_torre, a2_ley_cartas, a2_ley_guardia, a2_fuera_fuga (cruce)
a2_ley_torre   → a2_ley_cartas, a2_ley_berta, a2_ley_guardia
a2_ley_cartas  → a2_ley_halvar, a2_ley_berta          a2_ley_halvar → a2_ley_berta, a2_ley_guardia
a2_ley_berta   → a2_ley_guardia, a2_fuera_sotano (cruce)
a2_ley_guardia [R] sospecha>=4 → c2_anochece  ·  → c2_anochece, a2_ley_torre, a2_ley_berta

a2_fuera_fuga     → a2_fuera_sotano, a2_fuera_refugio, a2_ley_orell (cruce)
a2_fuera_sotano   → a2_fuera_sello, a2_fuera_medallon, a2_fuera_ilse, a2_fuera_refugio
a2_fuera_sello    → a2_fuera_medallon, a2_fuera_ilse, a2_fuera_refugio
a2_fuera_medallon → a2_fuera_ilse, a2_fuera_refugio        ← el sótano se recorre hacia adelante
a2_fuera_ilse     → a2_fuera_refugio
a2_fuera_refugio  [R] sospecha>=4 → c2_anochece  ·  → c2_anochece, a2_fuera_sotano, a2_fuera_ilse

c2_anochece     → c2_orilla                    ** CONVERGENCIA 2 **
c2_orilla       → c2_vado_crecido (¡solo por outcome sin tirada!), c2_otra_orilla
c2_vado_crecido → c2_otra_orilla
c2_otra_orilla  → cl_molino                    ** CONVERGENCIA 3 **

cl_molino    → cl_dravos, cl_halvar
cl_dravos    [R] pelea>=3 → cl_desenlace  ·  → cl_dravos (ronda), cl_desenlace
cl_halvar    → cl_desenlace, cl_dravos
cl_desenlace → fin_hundido, fin_dravos, fin_crecida, fin_heredero   ** ABANICO FINAL **
fin_*        → (0 opciones)
```

**Tres aristas que ya no existen y por qué.**
- `a1_ronda → c1_acusacion`: se borró. El floodgate de `sospecha` no puede **quitarte contenido** —saltear `c1_cuerpo` te dejaba sin el hito `hallar_a_tome`, sin `char:vado.tome_enterrado` y sin la frase del epílogo que paga todo el hilo—; tiene que cambiártelo. Ahora `a1_ronda` manda **siempre** a `c1_cuerpo`, y la ficción mejora: Dravos no te acusa en la plaza, te lleva al vado a mostrarte el cuerpo y a mirarte la cara mientras lo mirás. La "menos información" que el floodgate promete se mantiene igual, porque llegás con una pista sin resolver.
- `c2_orilla → c2_orilla` ("mirar el agua un rato más"): se borró. Era exactamente la opción que §2.5 prohíbe —no cierra puerta, no abre una peor, no gasta tiempo— y estaba en la escena de aviso T−1, justo donde el juego está tratando de que sientas la presión del agua. `c2_orilla` queda en 5 opciones, 4 libres.
- `a2_fuera_medallon → a2_fuera_sello`: se borró. Era un bucle de dos escenas que dejaba repetir gratis `leer_la_piedra`, la tirada `dificil` que es la puerta al final oculto. El sótano se recorre hacia adelante.

### 6.3 Invariantes de grafo que el validador NO comprueba

Estas cuatro se verifican a mano y con un test de contenido en `tests/content/vado.test.ts`, al estilo del centinela de la campaña de humo. **No confiar en r01 ni en r02 para ninguna de ellas.**

1. **Sin callejones sin salida.** `r02_reach` chequea tres cosas —alcanzabilidad desde `start`, alcanzabilidad de cada `ending` para las cuatro clases, y que todo `campaign.endings` tenga escena que lo produzca— y **no mira callejones**: una escena cuyas opciones apunten todas a sí misma pasa r02 sin ruido. Invariante: ninguna opción de una escena vuelve a esa misma escena, salvo (a) los dos `encounter`, donde volver es avanzar porque el reloj se movió, y (b) las dos opciones Fluff del hub, que son la única excepción declarada.
2. **Sin bucles de `outcome` sin salida.** `r01_targets` solo detecta **ciclos de `redirect` sin `onEnter` entre medio**; los bucles de `outcome` no los mira. Los tres bucles del grafo (el hub, las rondas de los dos `encounter`) tienen salida garantizada por `redirect` sobre reloj o por opción libre.
3. **Ninguna tirada se puede repetir gratis.** Toda tirada que sea **puerta** enciende su `run:*_intentado` en las tres bandas y lleva `requires: { not: { flag } }`. Hoy hay una: el camino A a `char:vado.sabe_del_sello` (`run:piedra_leida`).
4. **Exclusión mutua de bando.** `run:con_la_ley` y `run:contra_la_ley` nunca están encendidos a la vez: las tres opciones de cruce hacen `clear` del viejo además del `set` del nuevo (§7.2).

---

## 7. Estado: relojes, flags e hitos

### 7.1 Dos relojes

**`sospecha`, max 4 — "cuánto sabe Dravos de vos".** Nunca baja. Sube +1 en: Éxito con costo o Fallo en las sociales del puente · esperar/acampar en el prólogo (**tope de +2 en todo el prólogo**) · entrar a una de las dos `rest` **del acto 2** (`onEnter`) · **salir del Ancla Seca después de preguntar por Tomé de frente** (`run:mausi_informo`) · que Pell te vea (+1) o te delate (+2) · robar el libro de Mausi o revisar el escritorio de Berta y que salga mal · cruzar de rama · fallar una social con Berta, Halvar o Dravos · enterrar a Tomé (removés tierra y alguien lo nota) · esperar a que pase la ronda en `c2_otra_orilla` · **(Fase H) rendirse en la refriega delante de la línea** · **leer el sigilo lacrado delante de Dravos** · **remar hasta la isla a la vista del molino** · **irse del sótano de Halvar sin contestar, delante del capitán**. Son **~21 fuentes para un tope de 4**: no es un presupuesto holgado, es un recurso que se gasta rápido, y por eso **cada tic se nombra en la ficción** y se puede atribuir a una decisión.

**`a1_posada` no cobra `sospecha`.** El tic de descanso existe solo en las dos `rest` del acto 2, donde la `rest` **cura una Herida** y el tic es el precio de esa cura: ahí es una decisión. En `a1_posada`, que no cura Heridas y solo hace pasar la noche, cobrarlo era castigar dos veces al que ya iba perdiendo con un reloj que se llama "cuánto sabe Dravos de vos" pero medía cuánto dormiste.

Al llegar a 4: en el **acto 1** `a1_plaza` redirige a `a1_ronda` (Floodgate: te levantan con una pista sin resolver y entrás al cuello 1 con menos información); en el **acto 2** las dos `rest` redirigen a `c2_anochece` (se acaba el descanso y con él el farmeo de `heal`).

**`pelea`, max 3 — los dos encuentros.** Éxito +1 · Crítico +2 · Éxito con costo +1 y el enemigo te pega · Fallo 0 y el enemigo te pega · rendirse, huir o la palabra de Orell cierra el encuentro de una (+2 o +3). Umbrales: `c1_refriega` sale con `gte: 2` (2 rondas), `cl_dravos` con `gte: 3` (3 rondas); cinco rondas en total, el número de la spec. **Reset en `cl_molino.onEnter` con `{ clock: 'pelea', delta: -3 }`**: `applyClock` clampea a `[0, max]` (verificado en `src/engine/effects.ts`), así que es seguro hayas peleado o no en el cuello 1. No hay reloj de peligro.

### 7.2 Los 24 flags `run:`

**Regla de fuentes.** Un flag **revelador** (uno que cambia lo que el jugador *sabe*) tiene **como máximo dos fuentes en el acto 1**, y las dos son celdas distintas de la matriz de §9.2: si tiene cinco, el orden en que abrís las puertas deja de decidir *qué* sabés y pasa a decidir solo *cómo te lo cuentan*, y la segunda partida se vuelve la misma con dos frases cambiadas. Una **tercera** fuente solo puede existir en el clímax y solo **pagando** un objeto o una tirada. Los flags de **relación** (`run:orell_confia`, `run:ilse_confia`) admiten una fuente por acto.

| Flag | Significa | Lo enciende | Lo lee |
|---|---|---|---|
| `run:orell_confia` | Te dejó pasar o te debe una copa | `p_puente.convencer` éxito, `p_puente_amanecer`, `p_puente_rechazo.reconocer_el_escudo` `[Guerrero]`, `a1_orell_mesa`, `a2_ley_orell` | Opciones en `a1_ronda`, `c1_acusacion`, `c1_refriega`, `c2_orilla`, **`c2_vado_crecido` (5.ª opción)**, `cl_dravos`, `cl_desenlace`; variantes del hub |
| `run:orell_humillado` | Lo intimidaste en el puente | `p_puente.intimidar` | Variante del hub; `a1_orell_mesa.recordarle_el_puente`, que lo limpia |
| `run:vio_runas` | Tenés las palabras del sello en la cabeza | **Dos:** `p_puente.runas` · `a1_molino_trampilla.leer_las_marcas` | Camino B a `char:vado.sabe_del_sello`. *(La copla del Ancla Seca es sabor y pista de que hay runas; no enciende el flag)* |
| `run:pista_taberna` | Sabés que Tomé debía plata | `a1_taberna.onEnter` | Redirect del hub, `requires` de `a1_molino.hablar_con_el_chico`, variantes de posición |
| `run:pista_alcaldesa` | Escuchaste la versión de Berta | `a1_alcaldesa.onEnter` | ídem, más `requires` de `a1_plaza.volver_al_despacho` |
| `run:pista_molino` | Viste la luz del molino | `a1_molino.onEnter`, `a1_ilse_patio` | ídem |
| `run:pell_amigo` | Te debe el silencio | `a1_molino_pell` éxito, `.mentirle_con_la_carta` | Variantes en `c1_acusacion` y `cl_molino`; `requires` de `a2_amanecer.preguntarle_a_pell_por_la_orden` |
| `run:pell_delato` | Te vio y avisó | Fallos de `a1_molino_pell`, `a1_molino.mirar_por_la_ventana` | Variantes en `c1_acusacion`, texto de `a1_ronda` |
| `run:sabe_de_halvar` | Sabés que hay un mercader del otro lado metido | **Dos:** `a1_taberna.robar_el_libro` éxito · `a1_orell_mesa` (celda segunda: Orell borracho lo nombra) | Variantes y ventaja en `a2_ley_cartas`, `a2_ley_halvar`, `cl_halvar.leerle_el_libro_de_rutas` |
| `run:berta_miente` | La pescaste en una mentira | **Dos en el acto 1:** `a1_taberna` (celda última: ya le pagó a otro) · `a1_alcaldesa` (celda última: la capa puesta). **Una tercera, pagando:** `cl_halvar.leerle_lo_que_firmo_berta` (`requires: { item: 'carta_de_halvar' }`) | El párrafo de Berta en `cl_desenlace`; variantes de los cuatro epílogos |
| `run:ilse_confia` | Ilse te habla de verdad | Una por acto: `a1_ilse_patio` (acto 1) · `a2_ley_berta` o `a2_fuera_sotano` (acto 2, una por rama) | `advantageIf` de `cl_desenlace.ponersela_en_las_manos_a_ilse` y de `a2_ley_berta.hablarle_a_ilse_en_la_escalera`; bajada al sótano sin tirada de sigilo |
| `run:cuerpo_hallado` | Sabías que Tomé estaba muerto antes del cuerpo | `a1_molino_rueda`, el bulto de Pell reconocido por Mausi | Variantes de narrador en `c1_cuerpo` y `c1_acusacion` |
| `run:la_soga_cortada` | Viste que al pozo de la plaza le cortaron la soga | `a1_plaza.mirar_el_pozo` | Variante de narrador en `c1_cuerpo`: el cuerpo estaba atado con esa soga |
| `run:acusado` | Dravos te acusó en público | `c1_acusacion.onEnter` | Variantes de todo el acto 2 y de los epílogos; `requires` de `cl_molino.rendirte_de_entrada` |
| `run:con_la_ley` | Rama A | `c1_acusacion`, `c1_refriega.rendirte`, `a2_amanecer`, cruce desde B — **y los tres cruces hacen `clear` del otro** | Variantes de `cl_molino`, `cl_halvar`, `cl_desenlace`, epílogos |
| `run:contra_la_ley` | Rama B | `c1_acusacion.correr`/`.resistirte`, `c1_refriega`, `a2_amanecer`, cruce desde A — **ídem** | ídem |
| `run:cruzo_de_rama` | Ya cambiaste de bando una vez | Las tres opciones de cruce | `requires: { not: { flag } }` de esas mismas tres |
| `run:vio_el_sello` | Lo viste, o su hueco, con tus ojos | `a1_molino_trampilla`, `c1_cuerpo.revisar_el_cuerpo`, `a2_ley_torre.leer_el_sigilo`, `a2_ley_cartas.buscar_el_mapa`, `a2_fuera_sotano.onEnter` | Hito `ver_el_sello`; variantes de `cl_molino` y `cl_desenlace` |
| `run:piedra_leida` | Ya intentaste entender la piedra esta noche | Las **tres bandas** de `a2_ley_cartas.reconocer_el_sigilo` y de `a2_fuera_sello.leer_la_piedra` | `requires: { not: { flag } }` de esas dos mismas opciones. **Es la regla anti-repetición: la puerta al final oculto se intenta una vez por partida** |
| `run:sello_escondido` | Lo ataste a la cadena del azud, a mitad del vado | `c2_vado_crecido.atar_lo_que_llevas_a_la_cadena` | `requires` de `c2_otra_orilla.levantar_la_cadena`, que en éxito lo **limpia**. Si sigue encendido en el clímax, la piedra quedó en el agua: lo leen los cuatro epílogos |
| `run:con_ilse` | Ilse está con vos | `a1_ilse_patio.acompanarla`, `a2_amanecer.buscar_a_ilse`, `a2_fuera_fuga.onEnter` | `requires` de `cl_molino.mandar_a_ilse_al_sotano` y `cl_halvar.que_ilse_hable`; variantes de `cl_desenlace` |
| `run:trato_con_halvar` | Pactaste un precio | `a2_ley_halvar`, `c2_vado_crecido.entregar_lo_que_llevas`, `cl_halvar.cerrar_el_trato`, `cl_dravos.rendir_el_sello` | `requires` de `cl_desenlace.venderselo_vos_a_halvar`; epílogo de `fin_dravos` |
| `run:dravos_sabe` | Sabe que vos sabés, y el trato ya se está cerrando | `a1_ronda.onEnter`, fallos con Berta o Dravos, **las cuatro vías lentas de `c2_orilla`**, `c2_vado_crecido.entregar` y `.atar_lo_que_llevas_a_la_cadena`, `c2_otra_orilla.esperar_a_que_pase_la_ronda`, `cl_molino.escuchar` fallo | Variantes de `cl_molino`, `cl_dravos` y los epílogos. **Su ausencia abre `cl_molino.interrumpir_antes_de_que_firmen`**, la opción que solo ve quien cruzó el vado de frente |
| `run:mausi_informo` | Mausi mandó tu nombre a la torre | Salir del Ancla Seca después de preguntar de frente | Variante del hub; una línea de Pell en `cl_molino` |

**Llevar el sello encima no es un flag: es `{ item: 'sello_del_vado' }`** — y desde §1.2 no es llave de nada, es precio.

### 7.3 Los 6 `char:vado.*` y los 2 `world:vado.*`

| Flag | Significa | Lo enciende |
|---|---|---|
| `char:vado.sabe_del_sello` | Sabés qué es realmente el sello | Los tres caminos de §9.4 (queda en `run.stagedFlags` y ya es legible en esa partida) |
| `char:vado.tome_enterrado` | Le diste sepultura a Tomé | `c1_cuerpo.enterrarlo` (libre, +1 `sospecha`), `.darle_el_ultimo_rito` `[Clérigo]` (sin el tic), `a2_fuera_medallon.rezar_por_tome` |
| `char:vado.sello_hundido` | Lo devolviste a su piedra | `fin_hundido.onEnter` |
| `char:vado.vendido` | Dejaste que cruzara el río | `fin_dravos.onEnter` |
| `char:vado.vinculo_ilse` | Ilse y vos abrieron el sello juntos, y el pueblo lo sabe | `fin_crecida.onEnter` |
| `char:vado.heredero` | Te lo llevaste | `fin_heredero.onEnter` |
| `world:vado.aldamar_inundada` | La vega quedó bajo el agua y el vado no se cruza más | `fin_crecida.onEnter` |
| `world:vado.sello_perdido` | El sello ya no está en el vado | `fin_dravos.onEnter`, `fin_heredero.onEnter` |

`char:vado.vinculo_ilse` **no** dice "Ilse te debe el pueblo": el pueblo quedó bajo el agua y esa es la decisión que tomaron los dos. Dice lo que pasó y deja el juicio para la crónica.

`fin_hundido` no escribe mundo a propósito: es el final que devuelve el vado a como siempre estuvo, y como el canon se **reemplaza** atómicamente, no escribir nada equivale a borrar lo que dejó una crónica anterior.

**Espacios compartidos: solo lectura.** El contenido **lee** `char:met.*`, `char:place.*`, `char:origen.*`, `char:leyenda` y `world:caido.*` en `requires`, `advantageIf` y `when` (con el azúcar `met`, `knows`, `trait`), y **nunca** los escribe con `set` ni `clear`: r07 lo rechaza y `endRun` solo promociona lo apostado con prefijo de campaña.

### 7.4 Los 10 hitos

`llegar_al_puente` (`p_puente.onEnter`) · `llegar_a_aldamar` (`a1_plaza.onEnter`) · `hallar_a_tome` (`c1_cuerpo.onEnter`) · `elegir_bando` (`a2_amanecer.onEnter`) · `ver_el_sello` (junto a cada `set` de `run:vio_el_sello` y en `a2_fuera_sotano.onEnter`) · `la_verdad_de_tome` (`a2_fuera_ilse.onEnter`; `a2_ley_cartas.leer_las_cartas` éxito y parcial; `a2_ley_berta.hablarle_a_ilse_en_la_escalera` éxito y parcial) · `la_tormenta` (`c2_orilla.onEnter`) · `cruzar_el_vado_crecido` — etiqueta *Llegar a la isla del molino* (`c2_otra_orilla.onEnter`) · `enfrentar_a_dravos` (`cl_dravos.onEnter` y `cl_halvar.onEnter`) · `cerrar_la_cronica` (`cl_desenlace.onEnter`). Una primera partida completa toca entre 8 y 10.

`a2_ley_cartas.leer_las_cartas` y `a2_ley_cartas.reconocer_el_sigilo` **son dos opciones distintas**: la primera es una tirada libre de Saber · `normal` que escribe el hito; la segunda es la puerta al final oculto, Saber · `dificil`, con `requires: { not: { flag: 'run:piedra_leida' } }`.

---

## 8. Los cuatro finales y la muerte

Todos se eligen en `cl_desenlace`, que tiene **7 opciones y 4 sin `requires`** — y esas cuatro ya cubren tres de los cuatro finales. La piedra está al lado del zócalo en toda ruta (§1.2), así que **ninguna de las siete usa `{ item: 'sello_del_vado' }` como condición de acceso**: el objeto solo cambia el precio.

| id | Título | Cómo se llega | Canon | Reliquia |
|---|---|---|---|---|
| `fin_hundido` | **El sello se hunde** | `devolver_el_sello_a_la_piedra` (Vigor · normal · `fisico`, `advantageIf: { item: 'medallon_de_tome' }` — los tres desenlaces llegan al mismo final con distinto precio; sin el medallón el sello cierra mal y el epílogo lo dice) o `cerrar_la_compuerta_con_orell` (`run:orell_confia`) | `char:vado.sello_hundido` | — |
| `fin_dravos` | **Aldamar de Dravos** | `dejar_que_la_guardia_cruce_con_la_piedra` (sin tirada) o `venderselo_vos_a_halvar` (`run:trato_con_halvar`) | `char:vado.vendido`, `world:vado.sello_perdido` | — |
| `fin_crecida` | **La crecida** | `ponersela_en_las_manos_a_ilse` (Presencia · normal · `social`+`fe`, ventaja con `run:ilse_confia`) o `subir_y_dejar_que_el_agua_decida` (sin tirada) | `char:vado.vinculo_ilse`, `world:vado.aldamar_inundada` | — |
| `fin_heredero` | **El heredero** (`hidden`) | `quedarte_con_el_sello`, `requires: { flag: 'char:vado.sabe_del_sello' }` | `char:vado.heredero`, `world:vado.sello_perdido` | **`sello_del_vado`** vía `endings.fin_heredero.reward: [{ give: 'sello_del_vado' }]` |

**Por qué la reliquia se mudó a `fin_heredero`.** Estaba en `fin_crecida`, que se alcanzaba con la opción de **no hacer nada** (salir y dejar que el agua decida, sin tirada y sin `requires`): un jugador que optimiza se llevaba el objeto que persiste entre campañas por haberse ido caminando, y encima el final decía que Ilse usaba el sello mientras el `reward` te lo daba a vos. Ahora la reliquia está donde la ficción ya la ponía —*El heredero* se llama literalmente "te lo llevaste"— y cuesta el final oculto, que es la cosa más difícil de conseguir de la campaña. `fin_crecida` gana a cambio una decisión **activa** como camino principal (ponerle la piedra en las manos a Ilse) y deja la salida pasiva como la variante barata que es.

**Ruta libre de clase a cada final** (todas de opciones sin `requires`, personaje de nivel 1 sin rasgos):
`p_camino → p_puente` (esperar) `→ p_puente_amanecer → a1_plaza ×4 → c1_cuerpo → c1_acusacion` (ceder) `→ a2_amanecer → [rama cualquiera] → c2_anochece → c2_orilla → c2_vado_crecido` (atar lo que llevás a la cadena, Astucia normal, sin `lethal`) `→ c2_otra_orilla → cl_molino → cl_halvar → cl_desenlace →` los tres finales libres. Para `fin_heredero`, la misma ruta con `char:vado.sabe_del_sello` escrito por el **camino A** (§9.4), que es una tirada sin condición de clase.

**Verificación pedida por el encargo:** ninguna opción con `requires: { class }` es el único camino a ningún final ✔. Ningún final depende de una opción `lethal` ✔.

**La muerte no es un final.** No hay escena `fin_muerte`: la produce `{ lethal: true }` en `c2_vado_crecido` y la resuelve el motor con la regla de dos pasos. Sano → Malherido y seguís; Herido → Caído (campaña perdida, personaje vivo); Malherido → muerte real, `world.fallen` y `world:caido.vado` escritos **por el motor**. Ni la muerte ni la derrota reescriben el canon: `run.stagedFlags` se descarta.

---

## 9. Rejugabilidad y memoria

**La rejugabilidad no se produce agregando escenas: se produce decidiendo qué mitad no se lee.** Una partida lee alrededor de un tercio de lo escrito.

### 9.1 Quién puede recordar

| Va en… | `visited` | `knows` | `met` | `endingSeen` | `char:vado.*` | `run:*` | clase, rasgo, habilidad, objeto, Heridas, condición, reloj |
|---|---|---|---|---|---|---|---|
| Párrafo de **narrador** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Párrafo de un **PNJ** | ✅ *(solo revisitas de esta partida)* | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `requires` / `advantageIf` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

El motivo de ficción: dentro de *El vado de Aldamar*, cada partida es la misma noche otra vez. El personaje recuerda porque es el que vuelve; los PNJ la viven por primera vez, siempre.

**`visited` no es memoria entre partidas.** Vive en `Run.visited` (`types.ts:84`) y `conditions.ts` lo lee de `run.visited`: se borra al terminar la partida. Por eso un PNJ **sí** puede notar que volviste a entrar a la taberna esta misma noche —es lo mismo que ve en un flag `run:`— y por eso **una variante `{ visited: <id>, min: 1 }` en una escena de una sola visita nunca se dispara**: es prosa muerta. Las variantes de memoria de las escenas que se visitan una sola vez cuelgan de `knows`, `met`, `endingSeen` o `char:vado.*`, que sí cruzan partidas. r08 no mira `visited`: solo `met`, `knows`, `endingSeen` y `char:vado.*`.

**Los tres de `world/` no son la excepción.** `r08_memory_frame` calcula `pnjLocal` como un `speaker` que está en `campaign.npcs` y **no** en `world.npcs`, así que un párrafo de **Orell, Ilse o Halvar** con `met`, `knows` o `endingSeen` **compila igual y rompe el marco**. Regla de biblia: acá los tres se escriben como locales; se verifica a mano en la pasada de voz, sobre la lista de 21 escenas del outline §5/r08(c). Lo que sí pueden leer es un flag `run:`, `visited`, un rasgo, la clase, un objeto, tus Heridas o una condición: eso lo ven ahora, no lo recuerdan de otra partida.

Tres detalles del motor: toda `Paragraph` termina en una variante sin `when` (r08, la más específica arriba); `render` evalúa las condiciones **antes** de derivar la memoria de la escena actual (donde conocés a Pell no puede haber una variante `met: pell`); y la presencia condicional de un PNJ se resuelve con `redirect` o con narrador sin `speaker`, nunca con una variante vacía.

**Corrección canónica del error típico.** No se borra el recuerdo: se muda al narrador y la línea del PNJ queda intacta.
```
✗  { speaker: 'berta', variants: [ { when: { endingSeen: 'fin_crecida' }, text: '—Volviste. Ya sé cómo termina.' }, { text: '—Pasá.' } ] }
✓  { variants: [ { when: { endingSeen: 'fin_crecida' }, text: 'Berta dice lo mismo que la otra vez, con la misma pausa. Vos ya sabés cómo termina; ella no.' },
                 { text: 'La puerta se abre antes de que golpees dos veces.' } ] },
   { speaker: 'berta', variants: [ { text: '—Pasá. Está por llover otra vez.' } ] }
```

**Variantes que no son perezosas.** Una variante de memoria hace al menos una de tres cosas: **cambiar el foco** (el que ya estuvo no mira lo mismo), **economizar** (≤60 % de la base; "Saltar leído" se frena justo acá, así que esto es lo único que el veterano lee entero) o **habilitar** (información atada a una opción `[Recuerdo]` de la misma escena). Si no hace ninguna, se borra.

**Cuota: 14 escenas de 46 (30 %), con la condición de cada una fijada.**

| Escena | Condición de la variante | Por qué esa |
|---|---|---|
| `a1_plaza` | `visited`, min 1 | hub, se revisita 2-4 veces |
| `a1_taberna` | `visited`, min 1 | se vuelve desde `a1_orell_mesa` y `a1_taberna_trastienda` |
| `a1_alcaldesa` | `visited`, min 1 | se vuelve desde `a1_berta_despacho` y `a1_ilse_patio` |
| `a1_molino` | `visited`, min 1 | se vuelve desde las tres satélites |
| `a2_ley_torre` | `visited`, min 1 | se vuelve desde `a2_ley_guardia` |
| `a2_fuera_sotano` | `visited`, min 1 | se vuelve desde `a2_fuera_refugio` |
| `a2_fuera_ilse` | `visited`, min 1 | se vuelve desde `a2_fuera_refugio` |
| `p_camino` | `endingSeen` (cualquiera) | una sola visita por partida |
| `p_puente` | `met: 'orell'` | ídem |
| `p_vado_oculto` | `knows: 'vado_oculto'` | ídem — y la primera visita es justo la que lo deriva |
| `c1_cuerpo` | `{ flag: 'char:vado.tome_enterrado' }` | ídem: "la última vez lo enterraste" |
| `c2_orilla` | `knows: 'vado_oculto'` | ídem |
| `c2_vado_crecido` | `endingSeen: 'fin_hundido'` | ídem |
| `cl_desenlace` | `endingSeen: 'fin_crecida'` | ídem |

Siete con `visited` (revisitables dentro de la partida) y siete con condición que cruza partidas. Ninguna variante muerta.

Los tres PNJ de `world/` llevan **un párrafo de narrador con variante `met`** en toda escena donde puedan debutar: Orell en `p_puente`, `a1_taberna` y `c1_acusacion`; Ilse en `a1_alcaldesa` y `a2_fuera_fuga`; Halvar en `a2_ley_halvar` y `cl_molino`.

### 9.2 Las tres pistas: contenido exclusivo por orden

El acto 1 es un hub con tres puertas. Cada una fija su `run:pista_*` en el `onEnter` de la escena de entrada —nunca como premio de una tirada, para que el redirect de las tres pistas siempre sea alcanzable—. Una partida ve **tres celdas de nueve**. **La posición se lee con los otros dos `run:pista_*`, nunca con `visited`**, para que el texto diga *por qué* cambió y no solo *que* cambió.

| | Primero (0 pistas) | Segundo (1) | Último (2) |
|---|---|---|---|
| **Molino** | Pell está adentro: `a1_molino_pell`, el único lugar donde lo conocés cara a cara. Lo ves salir con un bulto envuelto en arpillera | Pell ya se fue; el candado forzado desde adentro, la rueda girando sola, dos juegos de huellas en la harina | La trampilla abierta de par en par y olor a río: la opción de Pell **no aparece** y hay una salida libre directa a `a1_molino_trampilla`. La vía más rápida y la más muda |
| **Taberna** | Orell recién salió de servicio y no habla; el viejo del rincón canta la **copla del vado** (pista de que hay runas, sin flag) | Orell va por la tercera jarra y **nombra a Halvar** (`run:sabe_de_halvar`), dos escenas antes de que aparezca | Mausi te pregunta de frente y admite que **Berta ya le pagó a alguien antes** (`run:berta_miente`) |
| **Alcaldesa** | Berta con la mesa puesta, versión oficial completa y el adelanto pagado (prosa, no objeto). Ilse no abre la boca | Recibida corta y fría; al salir, **Ilse te alcanza en el zaguán** (`a1_ilse_patio`) | Berta **con la capa puesta**, a punto de salir de noche, y miente sobre eso (`run:berta_miente`) |

**La celda "último" avisa que el acto se cierra.** En las tres puertas, la variante de tercera pista lleva un párrafo de narrador —condicionado por los otros dos `run:pista_*`, que son flags de partida, no memoria— que dice **sin metáfora** que ya no queda noche. Así la última decisión del acto 1 es una decisión y no una emboscada, incluso antes de volver al hub.

**El redirect del hub deja una vuelta más.** `a1_plaza` redirige a `c1_cuerpo` con `{ all: [pista_taberna, pista_alcaldesa, pista_molino, { visited: 'a1_plaza', min: 3 }] }`. La condición de `visited` existe para que el jugador que administra su noche —"voy al molino y después duermo"— tenga una pantalla de hub más, con la variante que le dice que se acabó, antes de que el acto se cierre. En la ruta típica eso es exactamente una vuelta.

**El molino ya no usa `redirect`.** La vieja versión mandaba de `a1_molino_pell` a `a1_molino_trampilla` sobre una etiqueta que le prometía al jugador un encuentro con Pell: se lo llevaba a otro lado sin causa visible. Ahora la opción **no existe** cuando las otras dos pistas están encendidas (`requires: { not: { all: [pista_taberna, pista_alcaldesa] } }`) y en su lugar hay una salida libre directa a la trampilla. El jugador elige lo que le pasa en vez de que se lo cambien.

**Dos cruces de pares, baratos y muy visibles:** **taberna → molino** (con `run:pista_taberna` aparece en `a1_molino` una opción libre para entrar por atrás en la ronda de Pell, sin esperar a conocerlo) y **molino → taberna** (si viste el bulto, Mausi lo reconoce: era del molinero, y es la única forma de saber que Tomé está muerto **antes** de encontrar el cuerpo → `run:cuerpo_hallado`).

### 9.3 Los atajos `[Recuerdo]`

| # | Opción | Dónde | `requires` | Qué ahorra / qué cuesta |
|---|---|---|---|---|
| 1 | Ir directo al vado que ya conocés | `p_puente`, `p_puente_rechazo` | `{ knows: 'vado_oculto' }` | Salta la tirada `rodear` y su rama de fallo: 1-2 escenas y una Herida temprana |
| 2 | Entrar al molino por atrás, durante la ronda de Pell | `a1_plaza` | `{ met: 'pell' }` | Resuelve la pista del molino en una escena. **Cuesta:** no hablás con Pell de frente, así que esa partida no ves el bulto |
| 3 | Ir derecho al sótano del molino | `a2_amanecer` | `{ flag: 'char:vado.sabe_del_sello' }` | Salta `a2_fuera_fuga` y compromete la rama B. **Cuesta:** entrás al sótano sin haber hablado con Ilse, y el clímax lo nota |
| 4-6 | Preguntarle a Ilse por el sello sin rodeos | `a1_ilse_patio`, `a2_ley_berta`, `a2_fuera_ilse` | `{ endingSeen: 'fin_crecida' }` | No ahorra nada: **escribe** `char:vado.sabe_del_sello`. Es el atajo *de información* |

Ninguno salta un cuello de botella. Los tres primeros se ganan **por haber estado**, no por haber tenido éxito: `char:place.*` y `char:met.*` los deriva `deriveMemory` de `scene.place` y `scene.npcs` al salir de la escena por cualquier elección, y **sobreviven a la derrota y al abandono**. Perder también enseña. Y cada atajo **suma** una opción: las cuatro libres siguen ahí (r03), así que el jugador puede ignorarlos.

**Dos notas técnicas, escritas para que nadie las "arregle" mal.**
- El atajo 2 funciona porque **Pell no está declarado en `p_puente.npcs`** (§3). Si alguien lo declara ahí, `deriveMemory` escribe `char:met.pell` en la escena 2 de la primera partida y el atajo queda abierto siempre, con badge `[Recuerdo]` incluido: `resolve.ts::badgeDe` devuelve `[Recuerdo]` para `met` sin preguntar de cuándo es.
- El atajo 1 se abre desde la segunda partida **también si el jugador nunca cruzó el vado por su cuenta**, porque `c1_cuerpo` usa `place: 'vado_oculto'` y es obligatoria. **Es correcto y es intencional:** el cuerpo de Tomé está en el vado, así que todo el que llegó al cuello 1 estuvo parado ahí y conoce el lugar. No se toca.

### 9.4 Los tres caminos a `char:vado.sabe_del_sello`

Cada uno tiene puerta en **las dos ramas** del acto 2, así que ninguna rama queda sin acceso al final oculto.

| | Camino | Condición | Puerta rama A | Puerta rama B |
|---|---|---|---|---|
| **A** | Leer la piedra | `requires: { not: { flag: 'run:piedra_leida' } }`. Tirada: Saber · `dificil` · `['saber','magia']`, `advantageIf: { any: [{class:'mago'},{skill:'vista_arcana'}] }`. Éxito y Éxito con costo escriben el flag; **las tres bandas encienden `run:piedra_leida` y mandan a otra escena** | `a2_ley_cartas.reconocer_el_sigilo` | `a2_fuera_sello.leer_la_piedra` |
| **B** | La segunda lectura de las runas | `{ all: [{flag:'run:vio_runas'}, {any:[{trait:'aprendiz_de_escriba'},{skill:'erudito_de_runas'}]}] }`, sin tirada | `a2_ley_cartas.releer_las_runas` | `a2_fuera_sello.releer_las_runas` |
| **C** | Preguntarle a Ilse `[Recuerdo]` | `{ endingSeen: 'fin_crecida' }`, sin tirada | `a2_ley_berta` | `a2_fuera_ilse` (+ `a1_ilse_patio`, antes de elegir rama) |

**Las cuatro clases llegan en la primera partida** por el camino A, que no tiene condición de clase: **41,7 % de Éxito+costo para el personaje mínimo, en un intento por partida**. El intento es uno solo a propósito: `run:piedra_leida` es lo que impide volver por el bucle del sótano y tirar hasta que salga. Fallar significa que esa noche no entendiste la piedra, y la banda de fallo te empuja hacia adelante (en la rama B, a `a2_fuera_medallon`; en la A, a `a2_ley_berta`). B y C son aceleradores para quien trae rasgo, habilidad o una partida anterior.

`isSatisfiable` solo devuelve `false` para condiciones de clase, así que `{ not: { flag } }` no afecta a r02 y el final sigue siendo alcanzable para las cuatro ✔.

### 9.5 Cobertura por clase y por rasgo

**Contrato de las opciones `[Clase]`: sabor y atajo, nunca llave.** Cada una resuelve sin tirada algo que las demás tiran, o abre un párrafo que nadie más lee. **Ninguna da una ventaja mecánica global que las otras clases no puedan conseguir por otro lado.** Son **doce**, tres por clase, una por tramo:

- **Guerrero** (Vigor, Debilidad `sigilo`): `p_puente_rechazo.reconocer_el_escudo` (sin tirada → `run:orell_confia`) · `a2_ley_torre.ofrecerte_de_escolta` (entra **sin tirada de sigilo**: le tapa su propia Debilidad) · `cl_dravos.trabar_el_eje` (+1 `pelea` sin tirada, con 1 Herida).
- **Explorador** (Astucia, Debilidad `social`): `p_puente.leer_la_orilla` (sin tirada al vado) · `a1_molino.subir_por_la_rueda` (ves la trampilla sin tocar el candado) · `a2_fuera_sotano.marcar_con_tiza` (evita la Herida de perderse al volver).
- **Mago** (Saber, Debilidad `fisico`): `p_vado_oculto.nombrar_el_agua` (cruza sin Herida) · `a2_fuera_sello.escuchar_el_sello` (párrafo exclusivo: la piedra contesta) · `cl_dravos.apagar_la_runa_un_latido` (cierra el encuentro sin pelear).
- **Clérigo** (Presencia, Debilidad `engano`): `a1_alcaldesa.bendecir_la_casa` (Ilse te habla aunque no sea la segunda pista) · `c1_cuerpo.darle_el_ultimo_rito` (escribe `char:vado.tome_enterrado` **sin el +1 de `sospecha`** que cuesta enterrarlo a mano) · `cl_halvar.ofrecer_el_juicio_del_templo` (abre una negociación que no existe sin Clérigo).

**El rito del Clérigo ya no da `sospecha` −1.** En un reloj de máximo 4 que gobierna el floodgate del acto 1 y toda la cura del acto 2, un −1 es el 25 % de un recurso global que las otras tres clases no tienen forma de recuperar: eso no es sabor, era la ventaja mecánica más grande de la campaña y estaba escondida en una nota de §7.1. Ahora el rito le da **lo mismo que las otras clases consiguen enterrando el cuerpo**, y lo único que se ahorra es el tic que cuesta remover tierra a escondidas. Eso sí es atajo y no llave.

**Un `[Origen]` por rasgo**, cinco en el acto 1 (que es donde más se rejuega) y tres en el acto 2, uno por rama y uno en el cuello:

| Rasgo (tag) | Opción | Escena |
|---|---|---|
| `hijo_de_la_frontera` (`supervivencia`) | Leer el cielo y adelantarte a la tormenta | `p_camino` |
| `cazador_furtivo` (`sigilo`) | Bajar la escalera sin que cante | `a1_molino_trampilla` |
| `hijo_de_molinero` (`social`) | Trabar la rueda como te enseñaron | `a1_molino` |
| `huerfano_de_la_peste` (`percepcion`) | Mirar la casa antes de entrar | `a1_alcaldesa` |
| `aprendiz_de_escriba` (`saber`) | Volver sobre la segunda línea de las runas | `a2_ley_cartas` / `a2_fuera_sello` (camino B) |
| `criado_en_el_templo` (`fe`) | Cantar el responso que Berta no se anima a cantar | `c1_cuerpo` |
| `desertor` (`fisico`) | Nombrar a Dravos por su grado viejo | `a2_ley_torre` |
| `contrabandista` (`engano`) | Leer el código de contrabando en las cartas | `a2_ley_cartas` |

**Regla de identidad:** ninguna clase puede tomar el rasgo cuyo tag es su Debilidad (un Guerrero nunca es `cazador_furtivo`, un Explorador nunca es `hijo_de_molinero`, un Mago nunca es `desertor`, un Clérigo nunca es `contrabandista`). Como las ocho opciones son opcionales y ninguna es llave, no recorta nada — pero se rechequea cada vez que se agrega un `[Origen]`.

### 9.6 Curva de dificultad

Personaje mínimo = nivel 1, atributo en 0, con Debilidad si el tag coincide. Éxito + Éxito con costo: Fácil 72,2 % (con Debilidad 47,7) · Normal 58,3 (31,9) · Difícil 41,7 (**19,4**) · Muy difícil 27,8 (**10,6**).

De ahí, dos reglas duras:
1. **La ruta crítica no tiene ninguna tirada obligatoria.** Toda escena de cuello ofrece al menos una opción sin tirada (esperar en el puente, ceder en la acusación, entregar o atar a la cadena en el vado, las cuatro libres de `cl_desenlace`). El conjunto de tiradas de ruta crítica queda vacío y el AVISO del 25 % nunca se dispara.
2. **`muy_dificil` existe en exactamente dos lugares**, las dos tiradas con `lethal` de `c2_vado_crecido`, y las dos son opcionales. `extrema` está prohibida por r09.

**Esta campaña es de investigación y de conversación, y hay que decirlo.** De las 42 escenas no finales, **13 no tienen ni un dado** y **29 sí**: sin dados quedan `p_puente_amanecer`, `a1_plaza`, `a1_taberna_trastienda`, `a1_orell_mesa`, `a1_alcaldesa`, `a1_posada`, `c1_acusacion`, `a2_amanecer`, `a2_ley_guardia`, `a2_fuera_fuga`, `a2_fuera_refugio`, `c2_anochece` y `c2_orilla`. No es un error del presupuesto: `c2_orilla` y `c1_acusacion` son escenas de **decisión**, no de habilidad, y meterles un dado las empeoraría. La regla real, la que sí restringe algo, es la de §2.5 y el conflicto 1 del outline: **toda escena con al menos una tirada ofrece además una salida sin tirada, y ninguna escena concentra todas sus tiradas en un solo atributo.**

**El reparto de tiradas por tramo y por dificultad vive en `01-outline.md` §3 y §5/r09.** Son **41 tiradas escritas**: prólogo 5 · acto 1 9 · cuello 1 4 · acto 2 10 (6 rama A, 4 rama B) · cuello 2 4 · clímax 9. Por dificultad: 3 fáciles, 30 normales, 6 difíciles, 2 muy difíciles, 0 extremas.

Otras reglas de curva: **todo Fallo avanza** · **ninguna tirada `dificil` cuyo tag sea la Debilidad de una clase es la única de su escena** (la rama B está cargada de `sigilo` y `supervivencia` y ofrece siempre una vía `vigor`/`fisico` o una sin tirada; la rama A está cargada de `social` y `saber` y ofrece siempre una `astucia`/`sigilo`) · **el costo de un Éxito con costo nunca es una condición cuyo tag ya sea Debilidad permanente** de la clase que la sacó: se cambia por Herida, reloj o relación.

**Presupuesto de Heridas.** El cuello 1 puede costar 2; el clímax 2 más. `a1_posada` **no cura Heridas** (limpia condiciones y hace pasar la noche) y tampoco cobra `sospecha`: en el acto 1 casi no hay Heridas todavía y su función es el tiempo. Las dos `rest` del acto 2 curan 1 cada una a cambio de +1 de `sospecha`, y desde `sospecha` 4 dejan de existir. Hay que medirlo con `simulate` antes de escribir prosa: si la escena mortal queda decorativa, lo siguiente que se saca es el `heal` de la rama A.

**Segunda y tercera partida.** Primera victoria → nivel 3; segunda con final nuevo → nivel 4, tope. A nivel 4 Aldamar pasa a **Tranquila** y el chip **−1 Veterano** convierte una `muy_dificil` de 27,8 % a 58,3 %. Es intencional: **la primera partida se sobrevive, la tercera se gana**; la tercera es la que cruza el vado con el sello bajo las ballestas. El interés se muda de "¿la paso?" a "¿qué no vi todavía?".

### 9.7 Qué pasa al perder

| | **Caído** (3 Heridas) | **Abandonar** | **Muerte permanente** |
|---|---|---|---|
| El personaje | sigue | sigue | **se pierde** (`world.fallen`) |
| XP de hitos nuevos | se conserva | se conserva | en el perfil, no en nadie |
| Flags `run:`, relojes, `visited` | se borran | se borran | se borran |
| Canon apostado | **se descarta** | se descarta | se descarta |
| Crónica canónica anterior | **intacta** | intacta | muere con el personaje |
| `char:met.*`, `char:place.*` | **se conservan** | se conservan | mueren con el personaje |
| `seen` y preferencias | se conservan | se conservan | **se conservan** |
| `world:caido.vado` | — | — | **se escribe, para siempre** |

La fila que importa es la de `char:met.*` y `char:place.*`: **la derrota no borra el mapa**. Perder en el cuello 1 después de haber conocido a Pell y cruzado el vado significa arrancar la partida siguiente con dos atajos que antes no tenías.

La pantalla de **Caído** usa tres registros fijos y ninguno reprocha: *lo que te llevás* / *lo que queda sin saberse* / *tu crónica canónica del Vado sigue siendo…*. El **abandono** usa la misma con el primer párrafo cambiado y un aviso previo sin eufemismos. La de **muerte** es la única que rompe el tono de consuelo y la única que deja algo escrito en el mundo. Nada de esto castiga: repetir un hito da 0 XP (no hay nada que farmear abandonando), la memoria compartida se deriva al salir de cada escena y no al terminar, y la muerte exige dos pasos con confirmación del estado real.

---

## 10. Taxonomía de decisiones

Cuatro tipos. **Cada opción se etiqueta en el esqueleto**, antes de escribir una palabra. **El tipo lo define quién LEE el flag, no quién lo escribe**: en cuanto un `requires` o un `redirect` lee un flag, la opción que lo escribía dejó de ser Spice y es Floodgate. En la revisión de cada lote se listan los lectores de cada flag nuevo, y de paso se chequea la exclusión mutua de los pares (`con_la_ley`/`contra_la_ley`, `orell_confia`/`orell_humillado`).

**Fluff — sabor puro.** Sin flags, mismo `next` que sus hermanas. *Nunca es "no pasa nada"*: devuelve información de mundo, de personaje o de PNJ que ninguna otra opción da; si el desenlace se pudiera borrar sin pérdida, la opción no va. Forma: `outcome` sin tirada, sin `effects`, `text` obligatorio de 25-45 palabras, label neutro. *Ejemplo:* `a1_taberna.pagar_una_ronda` — Mausi cuenta por qué el molino tuvo luz el invierno pasado, y es lo único que dice del molino gratis.

**Spice — cambia el texto que viene.** Escribe un flag `run:` que **solo leen variantes de texto**. *Ejemplos:* `run:pell_amigo` (Pell te cubre con la cara y no con la boca en `c1_acusacion`), `run:cuerpo_hallado` (el narrador de `c1_cuerpo` no describe el descubrimiento, describe la confirmación) y `run:la_soga_cortada` (el cuerpo estaba atado con la soga del pozo de la plaza, y solo lo sabe el que miró el pozo).

**Floodgate — abre o cierra contenido.** Escribe un flag o mueve un reloj que alguna otra escena lee en un `requires` o un `redirect`. *Ejemplos:* cada +1 de `sospecha` (y al llegar a 4, el redirect del hub); `run:orell_confia`, que abre la palabra de Orell en el cuello 1 y la quinta opción de la escena mortal; `run:dravos_sabe`, cuya **ausencia** abre la opción exclusiva de `cl_molino`; `char:vado.sabe_del_sello`, que abre el final oculto entre partidas. El `label` deja ver que algo se gana o se pierde, sin nombrar la mecánica; el badge lo deriva el motor del `requires`.

**Burnt Bridge — cierra una rama para siempre.** Tres reglas duras: **la rama la cierra la decisión, nunca el dado** (preferentemente sin tirada; si lleva tirada, las tres bandas cierran y solo cambia el precio); **el `label` anuncia el cierre en ficción** (*"…y no volver"*, *"…delante de todos"*); **máximo una cosa quemada por escena**, y el texto de la escena ya nombró antes lo que se pierde. Los **nueve** de la campaña: `c1_acusacion.delatar_a_orell` (limpia `run:orell_confia` sin recuperación) · el compromiso de rama en `a2_amanecer` · `a2_ley_torre.encarar_a_dravos` · `a2_ley_berta.acusarla_en_su_casa` · `a2_fuera_ilse.presionarla` · `a2_fuera_sello.arrancar_el_sello_de_una` · `c2_vado_crecido.entregar_lo_que_llevas` · `c2_otra_orilla.dejar_el_sello_en_la_cadena` · `cl_halvar.cerrar_el_trato`.

**Reparto sobre 252 opciones en 42 escenas no finales (media 6,0):** Fluff ~45 (18 %) · Spice ~80 (32 %) · Floodgate ~118 (47 %) · Burnt Bridge 9 (3 %). Dos invariantes por escena: **al menos una opción Fluff o Spice** (siempre existe una salida que no cobra peaje) y **al menos una Floodgate o Burnt Bridge** (si no, es una escena que no debería existir).

**La excepción de las bisagra (Fase H, decisión de Gabriel).** La primera invariante vale en las **escenas de exploración lateral**, que son la enorme mayoría, y **no** vale en las **diez escenas bisagra** —los cuellos por los que pasa toda partida: `c1_cuerpo`, `c1_acusacion`, `c1_refriega`, `a2_amanecer`, `c2_anochece`, `c2_orilla`, `cl_molino`, `cl_dravos`, `cl_halvar`, `cl_desenlace`—. Ahí la salida sin tirada **sigue existiendo** (la spec §4 la exige y el jugador que no quiere arriesgar la necesita) pero **cobra peaje**: un objeto, un tic de reloj, una condición, una Herida o una relación. El motivo está medido: sin eso, un jugador que cede siempre recorría las 46 escenas con cero tiradas, cero Heridas y nueve de los diez hitos, y el sistema de reglas no se encendía nunca. Dos de las diez quedan exentas y el motivo se escribe en cada una: `a2_amanecer` (el Burnt Bridge es la escena, no la opción, y no hay un solo PNJ declarado que pueda mirar) y `c2_anochece` (escena de aviso, cuya asimetría correcta ya es la `cuerda_de_molinero`). El detalle, escena por escena, en `design/04-informe-fase-h.md`.

**Y el corolario que vale para toda la campaña: un costo que nadie lee no es un costo.** Antes de cobrar un flag hay que listar quién lo lee **después** de la escena que lo enciende. Dos casos reales que se corrigieron en la Fase H: `run:dravos_sabe` cobrado en `cl_molino` (su único `requires` y su única variante viven en esa misma escena y se evalúan antes de elegir) y la condición `agotado` cobrada en el clímax (es tag `magia` y en el clímax no queda ni una tirada con ese tag).

---

## 11. La escena mortal: `c2_vado_crecido`

`kind: 'normal'`, `lethal: true`, `place: 'vado_oculto'`, `variant: 'crecido'`, `npcs: []`, `onEnter: []` **vacío** (el hito `cruzar_el_vado_crecido` vive en `c2_otra_orilla.onEnter`, que es la forma más limpia de cumplir el primer chequeo de r05).

**Entrada única y sin dados.** Solo por `c2_orilla.bajar_al_vado`, opción con `outcome` y sin `roll` (r05). Ningún `redirect` y ningún desenlace de tirada apuntan acá. El motor muestra la confirmación consciente del estado.

### Las cinco opciones

| # | id | Tirada | Atributo · dificultad · tags | `lethal` | Precio |
|---|---|---|---|---|---|
| 1 | `cruzar_de_frente` | sí | **Vigor · muy_dificil · `['fisico','supervivencia']`**, `advantageIf: { item: 'cuerda_de_molinero' }` | **Fallo y Fallo grave** | ninguno: **no enciende `run:dravos_sabe`** |
| 2 | `cruzar_por_las_piedras` | sí | **Astucia · muy_dificil · `['sigilo','supervivencia']`** | **Fallo** | ninguno: **no enciende `run:dravos_sabe`** |
| 3 | `entregar_lo_que_llevas` | **no** | — · `take sello_del_vado`, `set run:trato_con_halvar`, `set run:dravos_sabe`, **`addCondition perseguido`** (Fase H) | no | el sello, el bando y la salida |
| 4 | `atar_lo_que_llevas_a_la_cadena` | sí | **Astucia · normal · `['engano','supervivencia']`** · `set run:sello_escondido`, `set run:dravos_sabe` | no | **tiempo**: llegás con el trato cerrado |
| 5 | `esperar_a_orell` | **no** | `requires: { flag: 'run:orell_confia' }` | no | tiempo, pero sin `run:dravos_sabe` |

Las cuatro primeras no llevan `requires` (r03: 5 opciones, 4 libres).

**Por qué la opción segura ya no domina.** Antes, la 4 era Normal (58,3 %), no podía matarte, llegaba al mismo lugar y recuperaba el sello entero: no había una sola cosa que las dos letales dieran y ella no, así que elegirlas era un error de lectura y no un dilema. Ahora las dos caras están puestas:
- La 4 **cuesta tiempo**: enciende `run:dravos_sabe` igual que las cuatro salidas lentas de `c2_orilla`, y recuperar la piedra desde la isla (`c2_otra_orilla.levantar_la_cadena`) es **una tirada que puede fallar**: si falla, la cadena se corta y el sello se queda en el agua. Perdés el objeto, no el final.
- Las 1 y 2 son **las únicas** que te ponen en el molino **antes** de que el trato se cierre. `cl_molino` varía por `{ not: { flag: 'run:dravos_sabe' } }` y ahí Dravos todavía está negociando: hay una opción de clímax —`interrumpir_antes_de_que_firmen`— que no ve nadie más.

La opción 1 se llama *de frente* y no *con el sello* porque un jugador de rama A puede llegar sin él; la 3 y la 4 se llaman *lo que llevás* por lo mismo (un `take` de un objeto que no tenés es inocuo, verificado en `effects.ts`, y el desenlace de la 4 varía por `{ item: 'sello_del_vado' }`: el que no lo trae ata el farol y una piedra, para marcar el sitio). La opción 2 **no** lleva `disadvantageIf: { condition: 'empapado' }`: `empapado` ya es `sigilo` y el motor no apila dos fuentes. Todos los desenlaces van a `c2_otra_orilla`: la escena mortal no ramifica el grafo, solo el estado.

**Chequeo r05:** `onEnter` sin `{ lethal: true }` ✔ · `lethal` solo en desenlaces de tirada ✔ · se entra solo por `outcome.next` de una opción sin tirada ✔ · hay opciones sin `lethal` (3, 4, 5) ✔ · hay tirada sin tag `fisico` (2 y 4) ✔ · `lethalScenes: 1` ✔. **r09:** `muy_dificil`, nunca `extrema` ✔.

**Cada clase tiene su puerta.** Guerrero: opción 1 sin desventaja, y **Furia** convierte su Fallo. Explorador: 1, 2 y 4 sin desventaja, y **Sombra** cubre `sigilo`, `huida` y `supervivencia`. Mago: 2 o 4 (la 1 va en desventaja por `fisico`), o la `palanca_de_molino` como fuente situacional, y **Conjuro** convierte cualquier Fallo. Clérigo: 1 o 2 (la 4 va en desventaja por `engano`), y **Plegaria** cura 1 Herida **antes** de bajar, desde la ficha. La 5 está abierta a todas si trataron bien a Orell y la 3 no tira dados nunca. **Ninguna opción `[Clase]` va en esta escena, a propósito**: son cinco y se quedan en cinco.

### El anuncio, en tres tiempos

**T−2 · el hecho físico (`c2_anochece`).** En **toda** ruta, un párrafo de narrador en la variante base dice, sin metáfora y sin hedging, que el río sube, con una **medida concreta**: *"El agua ya tapa la tercera piedra del vado. Ayer se veían cinco."* Y una opción libre (`buscar_una_cuerda`) entrega la `cuerda_de_molinero`: el aviso viene con la herramienta. **Ninguna ruta al vado tiene menos de dos escenas de aviso**, incluido el redirect por `sospecha` llena, que también pasa por `c2_anochece`.

**T−1 · la consecuencia nombrada (`c2_orilla`).** Qué le pasa a la gente que cruza así, como hecho verificable en boca del narrador: *"Dos carreteros se ahogaron ahí el martes. Los sacaron media legua abajo, o sacaron lo que quedó."* El `label` de la opción de entrada nombra el vado y el verbo de cruzar, sin eufemismo: **"Bajar al vado"**. La escena ofrece cuatro maneras de **no** bajar (la barca de Tomé, esperar a que baje, subir por el azud, cruzar con Orell); todas menos la de Orell fijan `run:dravos_sabe` y te hacen llegar al molino con el trato ya cerrado.

**T0 · la escena.** El texto describe las tres formas de pasar y el precio físico de cada una, sin traducir nada a mecánica.

### Lo que el texto NO puede hacer

1. **Esconder el riesgo.** Si al leer la escena en voz alta no queda claro que se puede morir, está mal escrita.
2. **Exagerarlo.** Las opciones que **no** pueden matar tienen que **leerse como más seguras**. Prohibido el vocabulario de muerte en la 3, la 4 y la 5: si todo suena mortal, la calavera deja de informar.
3. **Prometer.** Nada de *"si sos rápido, cruzás"*.
4. **Dar números.** Dificultades, atributos y probabilidades son de la UI.
5. **Culpar después.** El fallo letal no dice *"te lo avisaron"*: muestra la consecuencia y calla.
6. **Rescatar a último momento.** Sin manos que aparecen de la nada.
7. **Ser la única puerta.** Ninguna de las dos opciones con `lethal` es la única vía a un final ✔ (§8).

**Forma del desenlace letal**, 30-60 palabras en los tres movimientos de §1.4: el punto exacto en que el cuerpo pierde; **una** imagen sensorial (el frío, el peso de la ropa, el ruido del agua desde abajo); un cierre corto y seco. Nada de párrafo reflexivo: el epílogo lo pone la pantalla de muerte.

### Los dos encuentros (para contraste)

`c1_refriega` (2 rondas, `redirect` con `pelea gte 2` → `a2_amanecer`), **seis opciones, cuatro libres**: `abrirse_paso` (Vigor/normal/`fisico`, `crit`) · `confundirlos` (Astucia/normal/`engano`) · `huir_al_rio` (Astucia/normal/**`huida`**) · `rendirte` (sin tirada, fija `run:con_la_ley` y limpia `run:contra_la_ley`) · `rematar_la_linea` (`requires: { clock: 'pelea', gte: 1 }`) · `que_orell_te_cubra` (`run:orell_confia`).

`cl_dravos` (3 rondas, `redirect` con `pelea gte 3` → `cl_desenlace`), **nueve opciones, cuatro libres — y nueve es `LIMITS.maxChoices`, así que esta escena no admite ni una opción más nunca**: `cargarlo` (Vigor/normal/`fisico`) · `usar_la_maquinaria` (Astucia/normal/`percepcion`, `advantageIf: { item: 'farol_de_sebo' }`) · `quebrarle_la_moral` (Presencia/dificil/`social`, Éxito da **+2**, `crit`) · `huir_escaleras_abajo` (Astucia/normal/**`huida`**) · `rendir_el_sello` (`requires: { item: 'sello_del_vado' }`) · `rematarlo` (`pelea gte 2`) · `que_orell_lo_detenga` (`run:orell_confia`; Orell **no** está en `npcs`, lo nombra el narrador) · `trabar_el_eje` `[Guerrero]` · `apagar_la_runa_un_latido` `[Mago]`.

Las rondas se distinguen por variantes de narrador encadenadas por `{clock:'pelea',gte:…}` y `{wounds:{gte:…}}`, y por las opciones con `requires` sobre el reloj. Las opciones `[Clase]` **no cuentan** para los mínimos de r06: cada encuentro necesita sus libres aparte.

---

## 12. Plantilla de escena

Lo genera el outline y lo completa cada lote. El agente devuelve **solo el objeto `Scene` con `satisfies Scene`**, más las líneas de los tres registros (`detalles-sensoriales`, `arranques`, `cupos`); después corre `npm run validate` y `lint-text` y corrige antes del lote siguiente.

```
════════════════════════════════════════════════════════════════
ESCENA  <id con prefijo de tramo>
kind:   normal | hub | encounter | rest | ending        lethal: no
lugar:  <uno de los 8>    variante: <solo si es una de las 4>
hora:   <noche 1 / filo del día / noche 2 / tormenta, tercera noche>
PNJ declarados (npcs): <id> …   ← solo los presentes en TODA ruta
PNJ presentes sin declarar:     <id> (condición) → lo nombra el narrador, SIN speaker
────────────────────────────────────────────────────────────────
VOZ  (uno por PNJ que habla acá)
  <pnj>: unidad de medida <…> · tic de sintaxis <…> · muletillas <…>
         NUNCA: <dos prohibiciones de §3>
────────────────────────────────────────────────────────────────
SE LLEGA DESDE
  · <escena>.<opcion>.<banda>       · <escena>.<opcion> (sin tirada)
  · redirect desde <escena> cuando <condición>
FLAGS DE ENTRADA
  garantizados: <flag> …            posibles: <flag> → qué cambia en el texto
  estado posible: Heridas 0-2 · sospecha 0-4 · condiciones probables
RANURAS OCUPADAS AL ENTRAR (peor caso): <n> de 6      ← obligatorio si la escena da un objeto
  take forzado antes del give: <objeto> en <escena>.<momento>
────────────────────────────────────────────────────────────────
MAPA DE PÁRRAFOS  (el detalle sensorial NO comparte párrafo con una variante de memoria)
  1. narrador — DETALLE SENSORIAL: <sentido> — <detalle>   (firma del lugar: ¿ya usada? sí/no)
  2. narrador — variante de memoria: visited (solo si la escena se revisita en la misma
     partida) | knows | met | endingSeen | char:vado.*   → foco / economía / habilita
  3. <pnj> (speaker) — variantes: solo run: / clase / rasgo / objeto / Heridas / condición
PROHIBIDO EN ESTA ESCENA
  · que <pnj> varíe por met / knows / endingSeen / char:vado.*
  · adelantar: <lo que el jugador todavía no puede saber acá>
TELEGRAFÍA DE MUERTE: no | T−2 | T−1
LONGITUD: text <n>-<m> palabras en <k> párrafos · variantes de flag <n> palabras
────────────────────────────────────────────────────────────────
OPCIONES  (total: N · sin requires: ≥4 · ninguna repite verbo inicial)
1. <id_opcion> — "<label ≤60, verbo primero>"
   tipo: Fluff | Spice | Floodgate | Burnt Bridge
   qué cambia: texto | flag | objeto | destino     ← si no cambia ninguno, se BORRA
   requires: <condición o —>        badge que deriva el motor: <[Recuerdo] / —>
   lockedHint: "<qué le dice al jugador que no la puede tomar, ≤60>"   (solo si hay requires)
   roll: <attr> / <dificultad> / tags [<…>]     riesgo: Seguro|Arriesgado|Peligroso
   advantageIf: <…>   disadvantageIf: <…>
     éxito  → efectos: <…>  next: <escena>  qué pasa: <una línea>
     costo  → efectos: <UN costo de la lista cerrada>  next: <…>  qué pasa: <…>
     fallo  → efectos: <…>  next: <…>  qué pasa y cómo AVANZA: <…>
   (o, sin tirada)   outcome → efectos: <…>  next: <…>
     texto de outcome: sí (<n>-<m> palabras) | no
   ¿es puerta? sí → set run:<algo>_intentado en las TRES bandas + requires not flag
TOTAL de outcomes con texto en esta escena: <n>   ← tiene que cuadrar con outline §3
════════════════════════════════════════════════════════════════
```

### Autoverificación antes de entregar el lote (14 casillas)

```
[ ] 4-9 opciones, y al menos 4 SIN requires (0 si es ending)
[ ] Cada opción tiene exactamente uno de roll u outcome; toda tirada declara éxito, costo y fallo
[ ] Toda opción cambia el texto, un flag, un objeto o el destino — si no, se borró
[ ] Ninguna dificultad extrema; muy_dificil solo en c2_vado_crecido
[ ] Toda Paragraph termina en una variante SIN when; la más específica arriba
[ ] Ningún PNJ varía por met / knows / endingSeen / char:vado.* — tampoco Orell, Ilse ni Halvar.
    visited SÍ puede (es de esta partida); y ninguna variante visited en escena de una sola visita
[ ] Todo speaker está en scene.npcs; ningún PNJ declarado que no esté presente en toda ruta
[ ] Ningún set/clear sobre char:met.* char:place.* char:origen.* char:leyenda world:caido.*
[ ] Toda escena que hace give de una llave hizo antes un take demostrable en esa misma ruta,
    y la cuenta de ranuras del peor caso está escrita
[ ] Segunda persona + presente + voseo en todo, narración incluida
[ ] Un (1) detalle sensorial, en la variante base, en párrafo SIN variante de memoria, registrado
[ ] El texto no dice el resultado de ninguna tirada que la escena ofrece, ni adelanta lo que el
    jugador no sabe; el desenlace letal y toda pérdida van en los tres movimientos de §1.4
[ ] Cero palabras de la lista dura inequívoca; cupos anotados en design/cupos.md; las 3 primeras
    palabras no están en design/arranques.md y no repiten la de ninguna escena a la que apunta
[ ] Tipos etiquetados: ≥1 Fluff/Spice, ≥1 Floodgate/Burnt Bridge, ≤1 cosa quemada
```

---

## 13. Verificaciones abiertas (para la Fase C y la D)

1. **`reward` ya está vivo (cerrado en la Fase C).** `endRun` aplica `campaign.endings[id].reward` en la rama `outcome.kind === 'ending'` con `applyReward` (`src/engine/resolve.ts`): un `{ give: <relic> }` suma la reliquia a `character.relics` con tope de 2 y sin duplicar, y un `{ set: 'char:…' | 'world:…' }` se une al canon que escribe el final. El resto de los efectos se ignora en silencio y los prohíbe el validador con la regla `r11_reward` (outline §5). La reliquia se resuelve contra la campaña **fusionada con WORLD** (`conMundo`, `src/state/store.ts`), que es lo que hace el store al cargar: sin esa fusión `sello_del_vado` no existiría para el motor, porque r07 exige que las reliquias vivan solo en `world/items.ts`. Verificado de punta a punta en `tests/content/vado.test.ts` —las cuatro clases juegan hasta `fin_heredero` y terminan con `sello_del_vado` en el perfil, y los otros tres finales no entregan nada— y la coherencia entre motor y validador en `tests/coherencia.reward.test.ts`. **Queda abierto:** `EndSummary` no dice qué reliquia se sumó, así que la pantalla de fin de campaña (spec §5) todavía no puede mostrarla; hace falta un campo nuevo (p. ej. `relicGained?: string`).

2. **r08 no cubre a `world/`.** Un párrafo de Orell, Ilse o Halvar con `met`/`knows`/`endingSeen` compila. Hasta que r08 gane una opción "campaña donde este PNJ debuta", depende de la pasada de voz y de la casilla 6 de la checklist, sobre la lista de 21 escenas del outline §5/r08(c).
3. **r02 no chequea callejones.** Las cuatro invariantes de §6.3 no las mira ningún validador. Se implementan como test de contenido en `tests/content/vado.test.ts` en el lote 0, junto con las dos reglas de arranques de §2.7.
4. **Escenas `rest` y muerte.** Medir con `simulate` que la escena mortal no quede decorativa. Si lo queda, se saca el `heal` de `a2_ley_guardia`.
5. **Duración.** 27-31 escenas por ruta, y una tercera partida con los tres atajos puede caer bajo los 30 minutos; el AVISO solo mide rutas de personaje nuevo. Verificar con `simulate` en un perfil veterano con `seedFlags`. Si aun así cae, se baja `durationMin` a `[25, 45]` en el meta en vez de inflar el contenido.
6. **`character.memoryNames` tampoco lo escribe nadie.** Existe en `types.ts:39` y se inicializa vacío en `store.ts:141`. Hace falta para que la pantalla de Recuerdos no le diga al jugador que "conoce" a Tomé a secas: la entrada tiene que poder decir *«Tomé, el molinero — lo encontraste tarde»*. Tarea de Fase C; si no entra, la alternativa es sacar `tome` de `c1_cuerpo.npcs` y derivar la frase del epílogo de `char:vado.tome_enterrado`, que ya existe.
7. **Archivos de estado compartido.** `design/detalles-sensoriales.md`, `design/arranques.md` y `design/cupos.md` no existen todavía y nadie los mantiene si no son entregable de cada lote. Se crean con el lote 1.
8. **`advantageIf: { item: 'carta_lacrada' }` en la primera tirada del puente** se cumple siempre en la primera partida. Es aceptable como tutorial, pero la prosa tiene que nombrarla ("todavía tenés la carta") para que se entienda que es perdible.
9. **`tome` y `mausi` sin tilde en los ids, `Tomé` con tilde en el nombre visible.** Ningún `speaker`, `met:` ni nombre de archivo de arte puede escribirse `tomé`.
```
