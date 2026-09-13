# Lectura editorial — una ruta por clase

Fase H · tarea 8. **Esto es una lista para decidir, no un parche.** No se tocó una sola palabra de la
campaña: los 15 hallazgos vienen con la cita textual y con un reemplazo concreto, y la decisión es de
Gabriel, que es de quien es la prosa.

Está ordenado **por gravedad, no por orden de aparición**. Los cuatro primeros son los que valen el
rato; de ahí para abajo baja rápido. Al final hay una sección de **lo que está muy bien**, que sirve
para saber qué no tocar.

---

## Cómo se leyó

Cuatro rutas completas, una por clase, cada una terminando en un final distinto. Se leyó lo que ve el
jugador —el `text` de la escena con la variante que le toca, el desenlace de la opción elegida y las
etiquetas que tiene delante— y no el archivo.

| Clase | Rama | Camino, en corto | Final |
|---|---|---|---|
| **Guerrero** | A, "Con la ley" | `p_puente` (intimidar, parcial) → `p_puente_rechazo` → `p_puente_amanecer` → hub ×4 con taberna, alcaldesa y molino → `c1_cuerpo` → `c1_acusacion` (ceder) → torre, cartas, Halvar, la escalera de Ilse → `c2_orilla` (la barca) → `cl_molino` → `cl_halvar` | **`fin_hundido`** |
| **Explorador** | B, "Contra la ley" | `p_puente` → molino primero (Pell adentro) → posada → taberna → alcaldesa → `c1_acusacion` (resistirte) → `c1_refriega` ×2 → el sótano entero → `c2_vado_crecido` (por las piedras) → `cl_dravos` ×3 | **`fin_crecida`** |
| **Clérigo** | B, **segunda partida** (con `endingSeen: 'fin_crecida'`) | tres atajos `[Recuerdo]` → `a1_ilse_patio` (le pregunta por el sello) → sótano por `a2_amanecer` → `c2_vado_crecido` (atar el bulto a la cadena) → `c2_otra_orilla` (levantar la cadena) → `cl_halvar` | **`fin_heredero`** |
| **Mago** | A, sin pasar nunca por el puente | `p_camino` (rodear por la orilla) → `p_vado_oculto` → *nombrar el agua* → taberna → `a1_orell_mesa` → `a1_ilse_patio` (acompañarla al molino) → `c1_acusacion` (ceder) → torre → el sigilo lacrado → Halvar → `c2_orilla` (el azud) → `cl_molino` → `cl_halvar` | **`fin_dravos`** |

**El margen de presupuesto.** El linter mide 16.715 palabras contra 15.930 de presupuesto; el tope
duro con la tolerancia del 5 % son **16.726**, así que la campaña está a **11 palabras**. Cada
hallazgo dice cuánto suma o resta su propuesta. **Los quince juntos dan −16**: aplicados todos, la
campaña queda en 16.699 y el margen pasa de 11 a 27.

**Las dos pasadas grandes de esta fase, revisadas en sus costuras.** No encontré ni un desenlace que
haya quedado cojo por el recorte de la tarea 4 (ver la sección final). De los seis costos anunciados
de la tarea 2, cinco se entienden solos; el sexto es el hallazgo 12. Y de la prosa muerta por
`when: { item: X }` dentro de un desenlace que hace `take: X`: **escaneé las 46 escenas y no hay una
tercera**. Hay exactamente tres variantes por objeto en toda la campaña, y las otras dos son legales
(`c2_vado_crecido.atar_lo_que_llevas_a_la_cadena`, cuyo desenlace no hace `take`, y la de
`fin_hundido`, que vive en el `epilogue`).

---

# Los hallazgos

## 1. Ilse aparece en el clímax sin que ninguna escena la haya llevado hasta ahí

**Escenas:** `cl_molino.mandar_a_ilse_al_sotano` y `cl_halvar.que_ilse_hable`. **Ruta:** Mago.

> «La escalera la conozco mejor que vos», te contesta, y ya está bajando con el farol pegado al
> cuerpo.

**Qué tiene de malo.** Las dos opciones piden `run:con_ilse`, y ese flag se enciende en el **acto 1**,
en `a1_ilse_patio.acompanarla_hasta_el_molino` —ayudarla a empujar la carretilla—, y **nada de la
rama A lo apaga**. En la ruta del Mago, la última vez que vi a Ilse fue tres escenas antes, en
`a2_ley_berta`, tres escalones arriba de su madre y con un saco de harina entre las botas; después
crucé el azud solo, de noche, con el agua alta. En el molino inundado me contesta desde al lado.

No es solo mío: `a2_amanecer` y `a2_fuera_fuga` la ponen con vos de verdad, y el `lockedHint` de las
dos opciones dice **«Ilse no está en el molino»**, o sea que la campaña ya sabe que eso puede ser
falso. Lo que falla es que el flag de "está con vos" también signifique "le diste una mano con los
sacos anoche".

**Propuesta — 0 palabras.** Agregarle a las dos opciones `{ flag: 'run:contra_la_ley' }` en el
`requires`, que es exactamente el bando en el que Ilse va con vos (rama B la enciende en el `onEnter`
de `a2_fuera_fuga`, y los dos cruces de rama A → B también). Ninguna de las dos es una opción libre,
así que r03 no se mueve. Si preferís conservarlas en rama A, la otra salida es un
`clear: 'run:con_ilse'` en las dos opciones de `a2_amanecer` que eligen la torre: también 0 palabras.

---

## 2. Pell te delata en la prosa y te debe el silencio en la ficha

**Escena:** `a1_molino_pell.hablarle_de_frente`, banda **parcial**. **Ruta:** Explorador.

> Le ganás la conversación y él se da cuenta. Se pone colorado y contesta lo que no le preguntaste.
> **Después va a contarle al cabo lo que vio, que eso sí lo sabe hacer.**

**Qué tiene de malo.** Esa banda hace `set: 'run:pell_amigo'`, y el flag está declarado en `flags.ts`
como *«Pell te debe el silencio»*. Lo que la frase describe —que va y cuenta lo que vio— es
literalmente el otro flag, `run:pell_delato`, que es el de la banda de **fallo**. El jugador lee que
el chico lo entregó y el motor anota que el chico lo tapó.

Y se paga dos escenas después, a la vista: en `c1_acusacion`, con `run:pell_amigo` encendido, se lee
*«En la segunda fila está el chico del casco grande. Cuando el capitán pregunta quién más bajó al
vado, mira el barro y tarda»*. El que te delató te está cubriendo.

**Propuesta — +3 palabras.** Que el parcial cobre el ruido sin convertirlo en delación, y que el +1
de `sospecha` tenga el sujeto que la biblia §2.5 pide (el cabo pregunta él, Pell no ofrece nada):

> Después va a contarle al cabo lo que vio, que eso sí lo sabe hacer. *(15 palabras)*

→

> El cabo lo para en la puerta y le pregunta qué hacía adentro. Pell no termina de contestar.
> *(18 palabras)*

De paso le devuelve su tic —empieza, se corrige, no termina— en la escena que es suya.

---

## 3. El momento en que sabés que Tomé está muerto se apoya en un detalle que nunca se muestra

**Escena:** `a1_taberna.contarle_lo_del_bulto`. **Rutas:** Explorador y Mago.

> Le contás lo del bulto de arpillera, **largo, atado en tres vueltas**.
> —**¿De tres vueltas?** Esa la ata él y nadie más.
> Deja la jarra a medio llenar, y es la primera vez en la noche que la ves dejar algo a medias. Nadie
> saca de un molino **un bulto largo atado en tres vueltas** si adentro hay alguien vivo.

**Qué tiene de malo.** Dos cosas, y la segunda es peor que la primera.

**(a)** La opción solo pide `run:pista_molino`, que lo enciende el `onEnter` de `a1_molino` y también
`a1_ilse_patio`. En cuanto el molino **no** es tu primera pista, el tercer párrafo de `a1_molino` es
la variante del candado forzado o la de la trampilla abierta de par en par: **en ninguna de las dos
hay un bulto**, porque en las dos Pell ya se fue con la ronda. Le contás a Mausi algo que no viste.
Es la ruta del Mago, y no es rebuscada: taberna primero, molino después.

**(b)** Aun en la ruta donde sí lo ves —molino primero, Pell adentro, que es la del Explorador—, el
bulto está descrito en `a1_molino_pell` como *«atado con soga de sirga, mide un antebrazo»*. Ni
«largo» ni «tres vueltas» están escritos en ninguna parte de la campaña. Y sobre las tres vueltas se
apoyan la respuesta de Mausi, el remate y el `set: 'run:cuerpo_hallado'`: el beat entero cuelga de un
dato que el jugador no tiene.

**Propuesta — −4 palabras.** Anclar la escena en lo único que el molino muestra en **todas** sus
variantes, que es su primer párrafo, el que no tiene `when`: *«Bajo el piso de tablones el caz golpea
[…] La muela está quieta»*. Y dejar que la inferencia la haga Mausi, que para eso es la que conoce
las costumbres de Tomé.

> Le contás lo del bulto de arpillera, largo, atado en tres vueltas. *(12)*
> —¿De tres vueltas? Esa la ata él y nadie más. *(10)*
> Deja la jarra […] Nadie saca de un molino un bulto largo atado en tres vueltas si adentro hay
> alguien vivo. *(38)* — **total 60**

→

> Le contás lo del molino: la rueda dando vueltas y la muela quieta. *(13)*
> —¿La rueda suelta? Esa la traba él antes de irse, siempre. *(11)*
> Deja la jarra a medio llenar, y es la primera vez en la noche que la ves dejar algo a medias. Nadie
> deja una rueda girando sola once días si piensa volver. *(32)* — **total 56**

Se conserva todo: la jarra a medias, el saber de Mausi, el remate y el flag. Y ahora es verdad en las
tres variantes del molino.

---

## 4. En `cl_halvar` ganás la negociación y no cambia nada — y el final que abrías se te cierra

**Escena:** `cl_halvar`, las dos tiradas. **Rutas:** Guerrero, Clérigo y Mago (tres de las cuatro).

> **éxito de `regatear_el_precio`:** Le ponés precio a lo que él daba por regalado, y no bajás la voz.
> Halvar tacha una cifra y anota otra. A Dravos la tachadura le interesa más que la cifra.
>
> **éxito de `leerle_el_libro_de_rutas`:** Das vuelta el libro y leés en voz alta los peajes del año
> que viene. Están anotados para un vado que ya no se cruza. Halvar deja los dedos quietos en la tapa.

**Qué tiene de malo.** Las dos tiradas tienen **el éxito y el parcial con `effects: []`** y el mismo
destino, así que ganar y ganar a medias son la misma jugada, y la prosa tampoco nombra ninguna
ganancia: los dedos quietos en la tapa no son un objeto, ni un flag, ni una puerta. Es la escena
diplomática del clímax, la que juega el personaje que no pelea, y las cuatro bandas buenas de sus dos
tiradas no dicen qué se ganó.

Y hay un efecto de segundo orden que se ve una pantalla después: en `cl_desenlace`, la opción
`venderselo_vos_a_halvar` pide `run:trato_con_halvar`. **Ganarle el regateo a Halvar no lo enciende;
`cerrar_el_trato`, que no tira un dado, sí.** O sea: el que se sienta a la mesa y le gana sale con
menos opciones que el que dice que sí.

**Propuesta — 0 palabras.** Copiar la gramática que la propia campaña ya escribió en la escena
hermana, `a2_ley_halvar.regatear_el_precio`: éxito `{ set: 'run:trato_con_halvar' }`, parcial lo
mismo más `{ clock: 'sospecha', delta: 1 }`. Ahí la prosa ya dice lo que cambió —«Halvar tacha una
cifra y anota otra»— y lo único que falta es que el motor lo anote. No mueve r03 (ninguna de las dos
es libre) ni agrega una palabra.

*(Si preferís que el clímax no reparta tratos, la alternativa es escribir la ganancia en el texto;
pero cuesta palabras y el margen son 11.)*

---

## 5. Orell te saluda de buen modo tres pantallas después de sacarte del puente del brazo

**Escena:** `p_puente_amanecer`. **Ruta:** Guerrero (`intimidar_al_sargento`, parcial →
`p_puente_rechazo` → `acampar_hasta_el_relevo`).

> —Pasá. Doce guardias y ninguna novedad. —Corre un tablón con la bota—. La alcaldesa está en la
> plaza a esta hora.

**Qué tiene de malo.** Dos cosas que viajan juntas.

El párrafo **no tiene variantes**: es la única línea de Orell en la escena y la lee igual el que lo
convenció, el que se coló por la zarza y el que se le paró encima hasta que el chico dio un paso
atrás y él se lo vio dar. Al Guerrero que acaba de leer *«Te saca del puente del brazo»* le contesta
un sargento cordial.

Y debajo: el `onEnter` hace `set: 'run:orell_confia'` y **no** hace `clear: 'run:orell_humillado'`.
Es la única fuente del flag que no limpia a su par —la de la rama A lo limpia, y
`a1_orell_mesa.recordarle_el_puente` también—, así que el resto de la partida corre con los dos
encendidos: el hub te muestra el párrafo del humillado (*«un hombre de gambesón gris de cara al
pueblo. No se mueve en todo el rato que estás»*) mientras `c1_acusacion.pedirle_a_orell_que_hable` y
`c2_orilla.cruzar_con_orell` se te abren porque Orell te debe algo.

**Propuesta — +1 palabra.** No hace falta una variante (costaría 17): alcanza con que la línea sea
cierta en los dos casos. Orell se enoja callándose y no mirando, que es lo que su ficha dice.

> —Pasá. Doce guardias y ninguna novedad. —Corre un tablón con la bota—. La alcaldesa está en la
> plaza a esta hora. *(21)*

→

> —Pasá. Doce guardias y ninguna novedad. —Corre un tablón con la bota y no te mira—. La alcaldesa
> está en la plaza. *(22)*

Y aparte, **0 palabras**: agregarle `{ clear: 'run:orell_humillado' }` al `onEnter`, que es lo que
hacen las otras dos fuentes del flag.

---

## 6. El Origen para la rueda y la escena siguiente la pone a girar otra vez

**Escenas:** `a1_molino.trabar_la_rueda_como_te_ensenaron` `[Origen hijo_de_molinero]` →
`a1_molino_rueda`. **Encontrado cruzando destinos**, no en una de las cuatro rutas: ninguno de mis
cuatro personajes llevaba ese rasgo.

> **`a1_molino`:** La compuerta del caz se baja con el pie y la aguja se traba con media vuelta: te lo
> enseñaron antes de saber leer. **La rueda se para y el molino se queda sin ruido.**
>
> **`a1_molino_rueda`, texto base, sin variantes:** Afuera, del lado del caz, **la rueda gira vacía**.
> El eje se queja una vez por vuelta, siempre en el mismo punto, y entre queja y queja entra el agua
> en los álabes.

**Qué tiene de malo.** Es una contradicción a una pantalla de distancia, y la escena destino no tiene
manera de saberlo: `a1_molino_rueda` no lleva variante de ninguna clase en su primer párrafo.

El mismo agujero vuelve **sin ningún rasgo**: `a1_molino_rueda.trabar_la_rueda` (éxito o parcial)
también para la rueda, y como la escena no tiene variante `visited`, cualquier re-entrada —por
`a1_molino_trampilla` → `a1_molino` → `descolgar_el_farol`— la vuelve a describir girando.

**Propuesta — −2 palabras.** Que el rasgo entregue el **saber** y no el hecho consumado, que es
además lo que la escena siguiente necesita para que su tirada tenga sentido:

> La compuerta del caz se baja con el pie y la aguja se traba con media vuelta: te lo enseñaron antes
> de saber leer. **La rueda se para y el molino se queda sin ruido.** *(35)*

→

> La compuerta del caz se baja con el pie y la aguja se traba con media vuelta: te lo enseñaron antes
> de saber leer. **Pero la compuerta está afuera, del lado del agua.** *(33)*

*(Queda anotado y sin propuesta el caso de la re-entrada: arreglarlo pide una variante `visited` en
`a1_molino_rueda`, y eso son palabras que hoy no hay. Es menos visible que el del rasgo, porque entre
una cosa y la otra pasan dos escenas.)*

---

## 7. «Entrar sin que te vean» a una sala en la que ya estás, delante de alguien que ya te habló

**Escena:** `a2_ley_torre.entrar_sin_que_te_vean`. **Rutas:** Guerrero y Mago.

> **etiqueta:** Entrar cuando el brasero tape el ruido
> **éxito:** Esperás el carbón que revienta y en ese ruido cruzás hasta la mesa. Sacás la de arriba de
> todo, la del lacre verde, y **salís antes de que el capitán levante la cabeza**.

**Qué tiene de malo.** Las dos entradas a la escena te meten adentro —`entrar_con_el_a_la_torre`
dice *«Subís los escalones detrás de él. Arriba la puerta está entornada»*— y el párrafo de Dravos
**no tiene variantes**: te dice «Sentate si querés» en toda ruta. No existe la partida en la que
entres sin que te vean, y «salís antes de que levante la cabeza» describe a alguien que todavía no
sabe que estás ahí. El movimiento que la escena sí permite no es entrar: es **llegar a la mesa**
mientras él sigue en lo suyo, que es lo que el primer párrafo ya montó con el brasero.

**Propuesta — neto −1 palabra.**

- etiqueta: *Entrar cuando el brasero tape el ruido* (7 palabras, 37 caracteres) → **Cruzar a la mesa
  cuando reviente el carbón** (8 palabras, 41 caracteres; el tope son 60). **+1**
- éxito, última cláusula: *…y salís antes de que el capitán levante la cabeza.* (33 en total) → **…y
  él sigue escribiendo sin levantar la cabeza.** (31). **−2**

---

## 8. La imagen firma de Aldamar —las tres ventanas encendidas— se cuenta cuatro veces en el acto 1

**Escenas:** `a1_plaza` (base y variante de memoria), `a1_molino_rueda.seguir_el_caz_hasta_el_azud`,
`a1_molino.volver_a_la_plaza`. **Ruta:** Mago (las cuatro en la misma partida).

> Sesenta y cuatro casas y **tres ventanas con luz**.
> Volvés a la plaza […] **Contás las luces de nuevo: siguen tres.**
> Seguís el canal hasta el azud. Desde ahí se ve Aldamar entera: **tres ventanas encendidas.**
> Dejás el molino como lo encontraste y cruzás de vuelta. **Las ventanas encendidas de Aldamar se
> cuentan con una mano.**

**Qué tiene de malo.** La cuenta es de la plaza y funciona ahí: es lo primero que ves del pueblo y la
variante de revisita la usa bien (el que vuelve cuenta, no mira). Las dos del molino la gastan sin
agregar nada, y una de ellas **ni siquiera cierra**: «con una mano» son hasta cinco, y el hub dijo
tres, dos escenas antes.

**Propuesta — +3 palabras netas.** Dejar la cuenta en el hub, que es de quien es, y que las dos
salidas del molino miren otra cosa. La del azud además está desperdiciando el único sitio del acto 1
que el jugador va a volver a necesitar dos actos más tarde, en `c2_orilla.subir_por_el_azud`:

> Seguís el canal hasta el azud. Desde ahí se ve Aldamar entera: tres ventanas encendidas. *(15)*
> → Seguís el canal hasta el azud: un muro de un palmo de ancho, con el agua a ras. *(18)* — **+3**

> Dejás el molino como lo encontraste y cruzás de vuelta. Las ventanas encendidas de Aldamar se
> cuentan con una mano. *(19)*
> → Dejás el molino como lo encontraste y cruzás de vuelta. El barro del pueblo empieza donde se
> termina la grava. *(19)* — **0**

---

## 9. «Del tamaño de una uña» tres veces en la misma partida

**Escenas:** `c1_cuerpo.revisar_el_cuerpo`, `a2_fuera_sello` (base), `a2_fuera_medallon` (base).
**Rutas:** Explorador y Clérigo. *(En la rama A son dos: `c1_cuerpo` y
`a2_ley_berta.hablarle_a_ilse_en_la_escalera`.)*

> …un cordón con un engarce vacío **del tamaño de una uña**, con polvo gris.
> …una mella fresca, **del tamaño de una uña**, con la piedra clara adentro…
> Es una lasca oscura **del tamaño de una uña**, montada en alambre de atar sacos…

**Qué tiene de malo.** La medida es lo que hace encajar las tres piezas —el engarce vacío del cuello
de Tomé, la mella del sello, la lasca de Ilse— y por eso **tiene que repetirse una vez**: la gracia
es que el jugador la reconozca. A la tercera deja de ser un reconocimiento y es una muletilla. Y la
tercera es además la más prescindible: el párrafo siguiente ya dice *«Entra en la mella sin
probarlo»*, que es la misma información y mejor contada.

**Propuesta — −5 palabras.** Sacarla del medallón, que es la pieza que la escena ya presenta
encajando, y dejarla en el cuerpo (donde se ve el hueco) y en el sello (donde se ve el negativo).

> Es una lasca oscura **del tamaño de una uña**, montada en alambre de atar sacos por alguien que sabe
> nudos y no joyas. *(23)*
> → Es una lasca oscura, montada en alambre de atar sacos por alguien que sabe nudos y no joyas. *(18)*

---

## 10. El mismo horno, la misma piedra tibia y la misma ropa, dos veces en la misma noche

**Escenas:** `a2_fuera_refugio.secarte_junto_al_horno` y `c2_otra_orilla.esperar_a_que_pase_la_ronda`.
**Ruta:** Explorador.

> Hacés fuego chico adentro del horno, donde no se ve desde el agua, y te sentás pegado a la piedra
> hasta que **la ropa deja de gotear**.
> Te metés en el horno viejo, con la espalda contra **la piedra tibia**, hasta que **la ropa deja de
> pesar**.

**Qué tiene de malo.** Son el mismo horno —los dos están en la isla— y el mismo gesto, con dos actos
de diferencia, y el segundo lee como si el motor hubiera repetido una pantalla. El linter ya lo ve
por otro lado: marca «con la espalda contra la» compartido entre `a1_taberna` y `c2_otra_orilla`.

El primero es el que se gana el horno: es la `rest`, hace `removeCondition: 'all'` y la frase «donde
no se ve desde el agua» está haciendo trabajo. El segundo solo saca `empapado`.

**Propuesta — −7 palabras.** Que el segundo se escurra donde la escena ya te puso, que es abajo del
tablón desbordado —la imagen propia de `c2_otra_orilla`, que su primer párrafo ya montó.

> Te metés en el horno viejo, con la espalda contra la piedra tibia, hasta que la ropa deja de pesar.
> La ronda pasa dos veces; la segunda, uno mira las huellas. *(31)*

→

> Te metés abajo del tablón, fuera del viento, y aguantás ahí hasta escurrirte. La ronda pasa dos
> veces; la segunda, uno mira las huellas. *(24)*

---

## 11. «Recordarle lo del puente» a un sargento con el que nunca estuviste en el puente

**Escena:** `a1_orell_mesa.recordarle_el_puente`. **Ruta:** Mago.

> **etiqueta:** Recordarle lo del puente y ofrecerle la mano
> **base:** —Estabas en tu derecho. Yo estaba en el mío. —Te da la mano—. Ninguno de los dos decide
> nada.

**Qué tiene de malo.** El Mago bajó por la orilla en `p_camino`, cruzó por el vado y entró a Aldamar
sin ver la barricada. Orell le debuta en `a1_taberna`, con el párrafo de presentación que la biblia
§3 puso ahí justamente porque el puente es salteable. Y la primera cosa que la campaña le ofrece
hacer con él es saldar una cuenta que no existe: «Estabas en tu derecho, yo estaba en el mío»
describe un encontronazo que en esa ruta no pasó.

Gatearlo con `visited: p_puente…` **no se puede**: `a1_orell_mesa` tiene 4 opciones y las 4 son
libres, así que un `requires` más la deja en 3 y rompe r03.

**Propuesta — +1 palabra.** Que la línea hable del **puente cerrado**, que sí vio todo el mundo —está
en el texto base de `p_camino`, la escena que nadie puede saltear—, y no de un encontronazo personal.
La variante con `run:orell_humillado` se queda como está: esa solo se lee si hubo barricada.

> **etiqueta:** Recordarle lo del puente y ofrecerle la mano *(8)*
> → Hablarle del puente cerrado y ofrecerle la mano *(8, 46 caracteres)* — **0**

> **base:** —Estabas en tu derecho. Yo estaba en el mío. —Te da la mano—. Ninguno de los dos decide
> nada. *(19)*
> → —El puente lo cierro yo y no lo decido yo. —Te da la mano—. Ninguno de los dos decide nada. *(20)*
> — **+1**

---

## 12. Ocho escalones acá, nueve escalones allá

**Escenas:** `a1_molino_trampilla` (base) y `a2_amanecer.ir_derecho_al_sotano`. **Ruta:** Clérigo.

> Abajo hay una escalera de las que se atan arriba y **nueve escalones** hasta un piso de agua quieta.
> Las piernas te llevan antes que la cabeza: la trampilla, **los ocho escalones**, el olor a piedra
> fría. No vas a buscar: vas a confirmar.

**Qué tiene de malo.** Es chiquito y es exactamente donde más se nota. El sótano es el sitio donde la
campaña cuenta cosas —siete piedras, once días, once dedos de agua, cuarenta arrobas— y la que mide
en escalones es Ilse, que baja ahí. Una cuenta que no cierra en el único lugar donde contar es un tic
del mundo. Y la frase es *«las piernas te llevan antes que la cabeza»*: el cuerpo se acuerda mal.

**Propuesta — 0 palabras.** *los ocho escalones* → **los nueve escalones**.

---

## 13. La etiqueta manda al molino; el texto encuentra la cuerda de este lado

**Escena:** `c2_anochece.buscar_una_cuerda`. **Rutas:** las cuatro.

> **etiqueta:** Buscar una cuerda de sirga en el molino
> **texto:** En **el embarcadero de este lado** hay una sirga de tres brazas, dura de brea. La
> enrollás al hombro.

**Qué tiene de malo.** El molino está del otro lado del agua y la escena entera es el aviso T−2 de
que esta noche no se cruza: la etiqueta ofrece ir al único sitio al que la escena acaba de decir que
no se va. El texto está bien; la etiqueta es la que miente, y es la pantalla donde el jugador está
midiendo qué puede y qué no.

**Propuesta — 0 palabras.** *Buscar una cuerda de sirga en el molino* → **Buscar una cuerda de sirga
en el embarcadero** (8 palabras, 44 caracteres).

---

## 14. Le dejás la capa al muerto y en la escena siguiente te chorrea encima

**Escenas:** `c1_cuerpo.taparlo_y_volver_al_pueblo` → `c1_acusacion` (base). **Ruta:** Guerrero.

> Le tirás **la capa** encima y le trabás las puntas con dos piedras. El agua le levanta el borde
> igual. Subís sin darte vuelta.
> Te suben a la plaza **con la capa chorreando** y la rueda de gente se arma sola.

**Qué tiene de malo.** La prenda que acabás de dejar sobre el cuerpo te vuelve puesta una pantalla
después. Es el único sitio donde el cuello 1 pierde el hilo de un objeto, y se arregla sacando dos
palabras que la escena no necesita: que venís chorreando ya lo dice todo lo demás. *(El otro medio
crujido de esa costura —que el que sube por su cuenta lee «te suben»— lo cubre la convergencia y no
propongo tocarlo: la ruta del floodgate llega con la ronda y ahí «te suben» es exacto.)*

**Propuesta — −3 palabras.** *Te suben a la plaza con la capa chorreando y la rueda de gente se arma
sola.* (17) → **Te suben a la plaza chorreando y la rueda de gente se arma sola.** (14)

---

## 15. Los mapas del río tapan la pared tres veces

**Escenas:** `a1_alcaldesa`, `a1_berta_despacho`, `a2_ley_berta`. **Rutas:** Guerrero y Mago.

> Las paredes están **tapadas de mapas del río, clavados uno encima del otro**.
> **Cuatro mapas del río tapan la pared, uno encima del otro.** El de arriba es el más nuevo.
> Adentro la casa está seca y caliente y **los mapas del río tapan la pared en capas**.

**Qué tiene de malo.** La segunda es la que hace trabajo: «el de arriba es el más nuevo» es una pista
y engancha con el rollo del vado que aparece en la torre. La primera y la tercera repiten el
decorado, y el decorado ya está pintado en el fondo —biblia §2.2: *«el fondo pintado ya hace lo
visual»*. La tercera es la más cara de las tres, porque `a2_ley_berta` ya está 63 palabras por encima
de su celda.

**Propuesta — −2 palabras.** Sacar la tercera y dejar en su lugar algo que sí cambió entre la primera
noche y la tercera: que esa casa lleva toda la noche encendida.

> Adentro la casa está seca y caliente y los mapas del río tapan la pared en capas. *(17)*
> → Adentro la casa está seca y caliente y el fuego lleva toda la noche encendido. *(15)*

---

# Lo que está muy bien

No es cortesía. Es la lista de lo que no hay que tocar cuando se apliquen los quince de arriba.

**El cuello 2 es el mejor tramo escrito de la campaña, y la telegrafía de muerte es la razón.** Tres
pantallas, un solo número, cero adjetivos:

> `c2_anochece`: El que vuelve del vado lo dice sin que le pregunten: el agua tapa cuatro de las siete
> piedras. Anoche se veían seis.
> `c2_orilla`: Contás lo que se ve: tres piedras, y las tres con el agua encima. De las otras cuatro
> no hay manera de saber dónde están.
> `c2_vado_crecido`: De acá a la isla hay veinte pasos de espuma marrón y, abajo, las siete piedras.
> No se ve ninguna.

La cuenta baja sola y el jugador la termina antes que el texto. No le cambiaría una coma.

**Los ocho hablan distinto y no hace falta mirar el nombre.** Cuatro de la misma escena o casi:

> `a2_ley_torre` **Dravos:** —Sentate si querés. Hay once meses de sueldo atrasado en esa caja, y
> adentro no hay nada. *(mide en meses y hombres, nunca en monedas, y no dice «yo»)*
> `cl_halvar` **Halvar:** —Poco me cuesta sumarte a la lista. Mucho me cuesta restarte. *(el orden de
> la frase del revés, y la amenaza leída como una factura)*
> `cl_molino` **Pell:** —Pase. Digo, no pase.
> `a2_ley_berta` **Ilse:** «Esto pesa menos», dice, y cierra la puerta.

Ese último es el mejor de los cuatro: rechazo, orgullo y su unidad de medida en tres palabras, sin
una sola de autocompasión.

**El cuerpo de Tomé cumple la regla de plano al pie y encima es la mejor prosa del acto 1.**

> Lo mirás desde tres pasos. La ropa se le hinchó y tira de las costuras; las manos están abiertas y
> blancas, con los dedos para arriba. Sobre el agua hay un olor dulce que no es de río y llega en
> tandas, cuando el viento cambia.

Sin cara, sin interior, y el olor llegando por tandas, que es lo único de una escena así que no se
puede poner en escena. Los tres movimientos de §1.4 funcionan.

**La soga cortada es la rejugabilidad prometida y entregada.** Un desvío opcional del hub, dos actos
antes:

> `a1_plaza.mirar_el_pozo`: La cortaron cerca del nudo, de un tajo limpio, y el cabo quedó colgando.
> Una soga de pozo es de todos.
> `c1_cuerpo` (variante): La soga es la del pozo de la plaza: el corte fresco del brocal está en esta
> punta.

El que miró el pozo ve un asesinato donde el que no miró ve un accidente, y no costó una escena.

**La mentira de Berta tiene cara una sola vez y no pide perdón.**

> `cl_desenlace`, con `run:berta_miente`: —Mirá, ya sé que lo sabés, así que no te hago el número otra
> vez. Firmé antes de escribirte.

Toda la campaña persiguiendo eso y se resuelve sin una disculpa y sin subir la voz, que es
exactamente lo que su ficha promete.

**La escalera de presentación de Orell en `c1_acusacion`** —tres variantes según cómo lo conociste, y
la tercera para el que no lo conoció— es la prosa condicional mejor armada del proyecto. Ninguna de
las tres se nota.

**Las etiquetas de la tarea 2 se leen como decisiones, no como advertencias.** «Dejar la piedra donde
está y que el agua decida» anuncia que perdés el sello sin nombrar una mecánica ni una ficha, y al
lado de las otras seis opciones del abanico no se distingue por el tono. Es la parte de la pasada de
costos que salió sola.

**Y el recorte de la tarea 4 no se ve.** Lo busqué a propósito en las costuras: los desenlaces más
cortos de la campaña —`a1_orell_mesa.dejarlo_tomar_en_paz` (9 palabras: *«No preguntás nada. Al
levantarse te corre la banqueta»*), `a1_taberna_trastienda.agarrar_el_farol_del_clavo` (12),
`a1_molino_trampilla.volver_al_cuerpo_del_molino` (14)— están por debajo del piso de 20 de la biblia
§2.3, pero leen como sequedad buscada y no como amputación. No encontré una sola frase coja ni un
párrafo al que le falte el segundo movimiento. Y el modo que la pasada dejó para los objetos que
pueden no estar se resuelve en tres palabras y sin variante, en `a1_posada`: *«La carta, si la tenés,
vuelve al trapo encerado»*.

*(Nota al pie sobre el linter: el aviso de que «usted» aparece fuera de la boca de Pell en `p_puente`
y `a1_molino` es un falso positivo. En los dos casos es el narrador citándolo, que es lo que la
biblia §3 manda hacer mientras el chico no tenga nombre.)*
