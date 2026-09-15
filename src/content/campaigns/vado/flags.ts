/**
 * Los flags declarados de "El vado de Aldamar" (biblia §7.2 y §7.3): 26 `run:`, 6 `char:vado.*` y
 * 2 `world:vado.*`.
 *
 * Los `run:` mueren con la partida. Los `char:vado.*` se apuestan en `run.stagedFlags` y se vuelven
 * canon del personaje al terminar por un final; los `world:vado.*` van a la crónica del mundo.
 *
 * Acá NO se declara ningún espacio compartido (`char:met.*`, `char:place.*`, `char:origen.*`,
 * `char:leyenda`, `world:caido.*`): los declara `src/content/world/flags.ts`, los deriva el motor y
 * el contenido solo los LEE en `requires`, `advantageIf` y `when`. Un `set` o un `clear` sobre ellos
 * lo rechaza r07.
 */
export const flags: Record<string, string> = {
  // --- Relación y prólogo -------------------------------------------------
  'run:orell_confia':
    'Orell te dejó pasar o te debe una copa. Lo encienden el convencer del puente, el amanecer en la barricada, reconocer el escudo [Guerrero], la mesa del Ancla Seca y —desde la Fase H— el ÉXITO de preguntarle por la orden escrita en la rama A, nunca el solo hecho de entrar a la torre. Abre opciones en la ronda, la acusación, la refriega, la orilla, la escena mortal, el clímax y el desenlace.',
  'run:orell_humillado':
    'Lo intimidaste en el puente y no lo va a olvidar. Lo enciende `p_puente.intimidar`; `a1_orell_mesa.recordarle_el_puente` lo limpia. Cambia variantes del hub.',
  'run:vio_runas':
    'Tenés las palabras del sello en la cabeza. Dos fuentes: las runas del pilar del puente y las marcas de la trampilla del molino. Es el camino B a `char:vado.sabe_del_sello`. La copla del Ancla Seca es sabor y no lo enciende.',

  // --- Las tres pistas del acto 1 ----------------------------------------
  'run:pista_taberna':
    'Sabés que Tomé debía plata. Lo fija `a1_taberna.onEnter`, nunca una tirada: el redirect de las tres pistas tiene que ser siempre alcanzable.',
  'run:pista_alcaldesa':
    'Escuchaste la versión oficial de Berta. Lo fija `a1_alcaldesa.onEnter`. Además es el `requires` de `a1_plaza.volver_al_despacho`.',
  'run:pista_molino':
    'Viste la luz del molino que debería estar vacío. Lo fijan `a1_molino.onEnter` y `a1_ilse_patio`.',

  // --- Pell ----------------------------------------------------------------
  'run:pell_amigo':
    'Pell te debe el silencio. Lo encienden el éxito de `a1_molino_pell` y `.mentirle_con_la_carta`. Lo leen variantes de la acusación y del clímax, y el `requires` de `a2_amanecer.preguntarle_a_pell_por_la_orden`.',
  'run:pell_delato':
    'Pell te vio y avisó a la torre. Lo encienden los fallos de `a1_molino_pell` y de `a1_molino.mirar_por_la_ventana`.',

  // --- Lo que averiguás ----------------------------------------------------
  'run:sabe_de_halvar':
    'Sabés que hay un mercader del otro lado metido en esto. Dos fuentes en el acto 1: robarle el libro de fiados a Mausi con éxito, u Orell en la tercera jarra. Da ventaja y variantes en la rama A y en `cl_halvar.leerle_el_libro_de_rutas`.',
  'run:cobro_el_adelanto':
    'Ya cobraste la tercera parte que promete la carta. Lo enciende `a1_alcaldesa.reclamar_el_adelanto`, que es la opción que lo narra, y es el `requires: { not: … }` de esa misma opción: el adelanto se cobra UNA vez por partida. El motor no tiene dinero y no se le agrega; lo que el flag registra es el cobro, no la plata.',
  'run:tapa_forzada':
    'Viste que a la trampilla del molino le forzaron el herraje, y no del lado de adentro. Lo enciende `a1_molino.subir_por_la_rueda` [Explorador], que es la única que lo mira desde arriba. Es un hallazgo forense, hermano de `run:la_soga_cortada`. TODAVÍA NO LO LEE NADIE: le falta su variante de narrador en `c1_cuerpo`. Medido en la tarea 5 de la fase «objetivos»: la variante hermana mide 28 palabras y el presupuesto de prosa quedó en el tope exacto (16.726 de 16.726), así que no entra hasta que se liberen 28.',
  'run:berta_miente':
    'Pescaste a la alcaldesa en una mentira. Dos fuentes en el acto 1 (Mausi en la celda última de la taberna; Berta con la capa puesta en la celda última de su casa) y una tercera, pagando, en `cl_halvar.leerle_lo_que_firmo_berta`. Lo lee el párrafo de Berta en `cl_desenlace` y los cuatro epílogos.',
  'run:ilse_confia':
    'Ilse te habla de verdad. Una fuente por acto: el patio en el acto 1; `a2_ley_berta` o `a2_fuera_sotano` en el acto 2, una por rama. Da ventaja en la escalera de Berta y en `cl_desenlace.ponersela_en_las_manos_a_ilse`, y baja al sótano sin tirada de sigilo.',
  'run:cuerpo_hallado':
    'Sabías que Tomé estaba muerto antes de encontrar el cuerpo. Lo encienden la rueda del molino y el bulto de Pell reconocido por Mausi. Cambia al narrador en `c1_cuerpo` y `c1_acusacion`.',
  'run:la_soga_cortada':
    'Viste que al pozo de la plaza le cortaron la soga. Lo enciende `a1_plaza.mirar_el_pozo`. El cuerpo del vado estaba atado con esa misma soga, y el narrador lo dice.',

  // --- El bando ------------------------------------------------------------
  'run:acusado':
    'Dravos te acusó en público en la plaza. Lo fija `c1_acusacion.onEnter`. Lo leen variantes de todo el acto 2, los epílogos y el `requires` de `cl_molino.rendirte_de_entrada`.',
  'run:con_la_ley':
    'Rama A: elegiste quedarte del lado de la guardia. Es mutuamente excluyente con `run:contra_la_ley`: toda opción que enciende uno hace `clear` del otro, porque los leen variantes del clímax y de los cuatro epílogos.',
  'run:contra_la_ley':
    'Rama B: elegiste irte con Ilse y moverte por fuera de la ley. Es mutuamente excluyente con `run:con_la_ley` y se maneja igual, con `set` de uno y `clear` del otro.',
  'run:cruzo_de_rama':
    'Ya cambiaste de bando una vez. Lo encienden las tres opciones de cruce (`a2_ley_orell`, `a2_ley_berta`, `a2_fuera_fuga`) y es el `requires: { not: … }` de esas mismas tres: el cruce es único en la partida.',

  // --- El sello ------------------------------------------------------------
  'run:vio_el_sello':
    'Viste el sello, o su hueco en el zócalo, con tus propios ojos. Lo encienden la trampilla del molino, revisar el cuerpo, el sigilo y el mapa de la torre y `a2_fuera_sotano.onEnter`. Va siempre junto al hito `ver_el_sello`. Vía gratuita: una por rama (el mapa en la A, el sótano en la B); leer el sigilo delante de Dravos paga +1 de sospecha.',
  'run:piedra_leida':
    'Ya intentaste entender la piedra esta noche. Lo encienden las TRES bandas de `a2_ley_cartas.reconocer_el_sigilo` y de `a2_fuera_sello.leer_la_piedra`, y es el `requires: { not: … }` de esas dos: la puerta al final oculto se intenta una sola vez por partida.',
  'run:sello_escondido':
    'Ataste lo que llevabas a la cadena del azud, a mitad del vado. Lo enciende `c2_vado_crecido.atar_lo_que_llevas_a_la_cadena`; `c2_otra_orilla.levantar_la_cadena` lo limpia en éxito. Si sigue encendido en el clímax, la piedra quedó en el agua y los cuatro epílogos lo dicen.',

  // --- Compañía, trato y ruido --------------------------------------------
  'run:con_ilse':
    'Ilse está con vos. Lo encienden el patio del acto 1, `a2_amanecer.buscar_a_ilse` y `a2_fuera_fuga.onEnter`. Es el `requires` de `cl_molino.mandar_a_ilse_al_sotano` y de `cl_halvar.que_ilse_hable`, y en el clímax la nombra el narrador, nunca `npcs`.',
  'run:trato_con_halvar':
    'Pactaste un precio con el mercader. Lo encienden `a2_ley_halvar`, entregar lo que llevás en el vado crecido, cerrar el trato en `cl_halvar` y rendir el sello en `cl_dravos`. Es el `requires` de `cl_desenlace.venderselo_vos_a_halvar`.',
  'run:dravos_sabe':
    'Dravos sabe que vos sabés, y el trato ya se está cerrando. Lo encienden `a1_ronda.onEnter`, los fallos con Berta o con Dravos, las cuatro vías lentas de `c2_orilla`, dos opciones de la escena mortal, esperar la ronda en la otra orilla y el fallo de `cl_molino.escuchar`. Su AUSENCIA abre `cl_molino.interrumpir_antes_de_que_firmen`.',
  'run:mausi_informo':
    'Mausi mandó tu nombre a la torre. Lo enciende salir del Ancla Seca después de preguntar por Tomé de frente, y es uno de los tics de `sospecha` que el narrador hace notar sin acusar.',

  // --- Canon del personaje (se apuesta y se promociona al terminar) --------
  'char:vado.sabe_del_sello':
    'Sabés qué es realmente el sello: no una piedra tallada, sino lo que contiene la crecida. Lo escriben los tres caminos de la biblia §9.4. Es el `requires` de `cl_desenlace.quedarte_con_el_sello`, la única puerta al final oculto.',
  'char:vado.tome_enterrado':
    'Le diste sepultura a Tomé. Lo escriben `c1_cuerpo.enterrarlo` (libre, +1 de sospecha), `.darle_el_ultimo_rito` [Clérigo] (sin el tic) y `a2_fuera_medallon.rezar_por_tome`.',
  'char:vado.sello_hundido': 'Devolviste el sello a su piedra y el río bajó. Lo escribe `fin_hundido.onEnter`.',
  'char:vado.vendido': 'Dejaste que el sello cruzara el río. Lo escribe `fin_dravos.onEnter`.',
  'char:vado.vinculo_ilse':
    'Ilse y vos abrieron el sello juntos, y el pueblo lo sabe. Lo escribe `fin_crecida.onEnter`. Dice lo que pasó y deja el juicio para la crónica.',
  'char:vado.heredero': 'Te llevaste el sello del vado. Lo escribe `fin_heredero.onEnter`, y es el final que entrega la reliquia.',

  // --- Canon del mundo -----------------------------------------------------
  'world:vado.aldamar_inundada':
    'La vega de Aldamar quedó bajo el agua y el vado no se cruza más. Lo escribe `fin_crecida.onEnter`.',
  'world:vado.sello_perdido':
    'El sello ya no está en el vado. Lo escriben `fin_dravos.onEnter` y `fin_heredero.onEnter`.',
};
