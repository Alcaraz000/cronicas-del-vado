# Informe de simulación — El vado de Aldamar

Lo escribe `npm run simulate`. Es determinista: con la misma `--seed` sale exactamente este archivo, así que se puede comparar entre commits con un diff. No lleva fecha a propósito.

- Campaña `vado`, contentVersion 1
- Semilla 20260912 · carreras por combinación 100 · partidas por carrera 4
- 3200 carreras, 12490 partidas simuladas con el motor real
- Combinaciones: 4 clases × niveles {1, 3} × 4 políticas

## Las cuatro aserciones

| # | Aserción | Resultado | Detalle |
|---|---|---|---|
| 1 | Ninguna escena fuera de una condición de memoria queda inalcanzable | PASA | todas visitadas |
| 2 | Muerte a nivel 1 con política codiciosa < 3.0 % | PASA | 0.0 % sobre 1600 partidas |
| 3 | Los cuatro finales se alcanzan con las cuatro clases | PASA | las cuatro clases llegaron a los cuatro finales |
| 4 | La política codiciosa hace al menos 3 tiradas por partida | PASA | 3.4 tiradas de media |

## Avisos

- mago nivel 1 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- mago nivel 3 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- El final `fin_heredero` sale en 1.3 % de las partidas que llegan a un final.


## Cobertura

- Escenas visitadas: **46 de 46** (100.0 %)
- Opciones elegidas: **252 de 252** (100.0 %)

### Escenas que nunca se visitaron

_ninguna: la simulación tocó las 46_


### Opciones que nunca se eligieron

De las 0 sin elegir, 0 están detrás de una condición de memoria.

_ninguna: la simulación eligió las 252_


## Finales

### Por clase

| Clase | `fin_hundido` | `fin_dravos` | `fin_crecida` | `fin_heredero` |
|---|---|---|---|---|
| guerrero | 165 | 1721 | 391 | 17 |
| explorador | 212 | 1758 | 533 | 35 |
| mago | 208 | 1743 | 288 | 32 |
| clerigo | 368 | 1101 | 984 | 42 |

### Por número de partida dentro de la carrera

| Partida de la carrera | `fin_hundido` | `fin_dravos` | `fin_crecida` | `fin_heredero` | Total |
|---|---|---|---|---|---|
| 1 | 255 | 1685 | 497 | 10 | 2447 |
| 2 | 244 | 1557 | 559 | 36 | 2396 |
| 3 | 231 | 1546 | 567 | 33 | 2377 |
| 4 | 223 | 1535 | 573 | 47 | 2378 |

## Longitud, derrota y dificultad

- Longitud por partida: **25.1 (mediana 28.0, 6–34)** escenas distintas (el objetivo de diseño es 24–30; cae dentro el 75.4 %), **40.9 (mediana 42.0, 6–91)** pantallas contando las vueltas al hub
- Palabras leídas por partida: **5860.3 (mediana 6054.0, 908–12327)**
- Derrota 21.6 % · muerte 1.6 % · heridas al terminar 1.09
- Tiradas por partida 6.4 · Fallo en los dados 23.7 % · Fallo después de Fortuna y Poder 11.3 %
- Partidas colgadas 0 · escenas sin salida 0 · logs recortados 0

### Por combinación

| Clase | Nivel | Política | Partidas | Pantallas | Distintas | Distintas en objetivo | Palabras | Derrota | Muerte | Heridas | Hitos | Tiradas | Fallo (dados) | Fallo (final) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| guerrero | 1 | aleatoria | 397 | 42.0 | 24.8 | 72.8 % | 6063 | 23.2 % | 0.5 % | 1.37 | 8.4 | 7.1 | 30.2 % | 12.2 % |
| guerrero | 1 | codiciosa | 400 | 43.9 | 29.1 | 100.0 % | 6306 | 2.0 % | 0.0 % | 1.19 | 9.0 | 2.8 | 2.7 % | 0.3 % |
| guerrero | 1 | temeraria | 343 | 34.4 | 18.3 | 23.0 % | 4929 | 65.9 % | 9.0 % | 2.62 | 5.2 | 14.5 | 32.8 % | 20.2 % |
| guerrero | 1 | prudente | 400 | 43.8 | 29.0 | 100.0 % | 6216 | 0.0 % | 0.0 % | 1.30 | 9.0 | 1.0 | 9.5 % | 0.2 % |
| guerrero | 3 | aleatoria | 397 | 41.0 | 24.0 | 65.0 % | 5892 | 32.5 % | 0.3 % | 1.58 | 8.1 | 7.0 | 36.0 % | 19.0 % |
| guerrero | 3 | codiciosa | 400 | 43.7 | 29.1 | 100.0 % | 6298 | 3.3 % | 0.0 % | 1.16 | 9.0 | 3.0 | 5.8 % | 0.2 % |
| guerrero | 3 | temeraria | 326 | 33.5 | 18.7 | 15.6 % | 4820 | 65.6 % | 14.4 % | 2.69 | 5.4 | 14.2 | 40.6 % | 28.4 % |
| guerrero | 3 | prudente | 400 | 43.6 | 29.0 | 100.0 % | 6194 | 1.5 % | 0.0 % | 1.19 | 9.0 | 1.0 | 16.5 % | 1.7 % |
| explorador | 1 | aleatoria | 400 | 43.7 | 25.0 | 78.0 % | 6302 | 15.0 % | 0.0 % | 1.03 | 8.5 | 7.3 | 20.3 % | 5.6 % |
| explorador | 1 | codiciosa | 400 | 40.8 | 29.0 | 100.0 % | 5823 | 0.0 % | 0.0 % | 0.17 | 8.1 | 5.2 | 2.4 % | 0.0 % |
| explorador | 1 | temeraria | 364 | 36.8 | 17.1 | 27.5 % | 5221 | 62.9 % | 5.8 % | 2.35 | 4.8 | 15.4 | 23.6 % | 10.5 % |
| explorador | 1 | prudente | 400 | 42.3 | 29.0 | 100.0 % | 6076 | 0.0 % | 0.0 % | 0.00 | 9.0 | 1.3 | 2.0 % | 0.0 % |
| explorador | 3 | aleatoria | 400 | 43.7 | 25.0 | 75.5 % | 6295 | 16.3 % | 0.3 % | 1.03 | 8.4 | 7.4 | 21.6 % | 7.1 % |
| explorador | 3 | codiciosa | 400 | 40.4 | 29.0 | 100.0 % | 5755 | 0.0 % | 0.0 % | 0.20 | 8.0 | 6.4 | 1.9 % | 0.0 % |
| explorador | 3 | temeraria | 395 | 36.7 | 17.3 | 30.9 % | 5242 | 60.3 % | 1.8 % | 2.22 | 5.0 | 15.8 | 22.5 % | 11.2 % |
| explorador | 3 | prudente | 400 | 42.4 | 29.0 | 100.0 % | 6091 | 0.0 % | 0.0 % | 0.00 | 9.0 | 1.4 | 2.4 % | 0.0 % |
| mago | 1 | aleatoria | 398 | 40.4 | 24.4 | 73.6 % | 5843 | 21.1 % | 0.3 % | 1.29 | 8.3 | 6.7 | 29.7 % | 6.0 % |
| mago | 1 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6066 | 0.0 % | 0.0 % | 0.00 | 9.8 | 0.8 | 1.3 % | 0.0 % |
| mago | 1 | temeraria | 353 | 34.1 | 16.0 | 13.3 % | 4808 | 78.8 % | 8.5 % | 2.80 | 4.1 | 13.6 | 29.6 % | 12.4 % |
| mago | 1 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6059 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 3 | aleatoria | 398 | 40.3 | 23.5 | 65.3 % | 5810 | 29.9 % | 0.5 % | 1.50 | 7.8 | 6.5 | 35.7 % | 8.9 % |
| mago | 3 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6068 | 0.0 % | 0.0 % | 0.00 | 10.0 | 1.0 | 2.0 % | 0.0 % |
| mago | 3 | temeraria | 325 | 33.3 | 16.0 | 11.1 % | 4737 | 74.8 % | 14.2 % | 2.82 | 4.1 | 13.2 | 33.4 % | 16.3 % |
| mago | 3 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6059 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| clerigo | 1 | aleatoria | 400 | 42.6 | 25.5 | 77.5 % | 6144 | 10.0 % | 0.0 % | 0.92 | 8.8 | 7.1 | 22.0 % | 8.0 % |
| clerigo | 1 | codiciosa | 400 | 42.0 | 27.8 | 100.0 % | 6052 | 0.0 % | 0.0 % | 0.07 | 9.1 | 3.8 | 3.0 % | 0.3 % |
| clerigo | 1 | temeraria | 396 | 39.7 | 17.6 | 30.6 % | 5539 | 72.0 % | 0.5 % | 2.46 | 4.7 | 16.6 | 23.0 % | 12.9 % |
| clerigo | 1 | prudente | 400 | 43.1 | 29.0 | 100.0 % | 6156 | 0.0 % | 0.0 % | 0.31 | 9.0 | 1.7 | 9.0 % | 0.0 % |
| clerigo | 3 | aleatoria | 400 | 43.8 | 25.4 | 82.0 % | 6288 | 14.5 % | 0.0 % | 1.06 | 8.6 | 7.3 | 27.2 % | 11.7 % |
| clerigo | 3 | codiciosa | 400 | 41.8 | 27.3 | 100.0 % | 6024 | 0.0 % | 0.0 % | 0.03 | 9.1 | 4.6 | 1.7 % | 0.1 % |
| clerigo | 3 | temeraria | 398 | 39.1 | 17.6 | 27.1 % | 5460 | 78.1 % | 0.8 % | 2.59 | 4.7 | 16.4 | 25.7 % | 16.2 % |
| clerigo | 3 | prudente | 400 | 43.2 | 29.0 | 100.0 % | 6164 | 0.0 % | 0.0 % | 0.10 | 9.0 | 1.5 | 12.4 % | 1.0 % |

## Rejugar: ¿se trivializa?

| Partida de la carrera | Partidas | Nivel al empezar | Fallo (dados) | Fallo (final) | Escenas | Palabras |
|---|---|---|---|---|---|---|
| 1 | 3200 | 2.00 | 22.9 % | 10.2 % | 40.7 | 5856 |
| 2 | 3146 | 3.24 | 23.3 % | 11.0 % | 41.0 | 5858 |
| 3 | 3099 | 3.44 | 24.1 % | 11.7 % | 40.9 | 5849 |
| 4 | 3045 | 3.54 | 24.6 % | 12.2 % | 41.1 | 5879 |

- Nivel al terminar la carrera: **3.5 (mediana 4.0, 1–4)**
- XP al terminar la carrera: **165.7 (mediana 180.0, 0–180)**

## Lo que nunca se alcanzó

### Flags declarados que nunca se encendieron

_ninguno_


### Hitos que nunca se alcanzaron

_ninguno_


### Finales que nunca se alcanzaron

_ninguno_

