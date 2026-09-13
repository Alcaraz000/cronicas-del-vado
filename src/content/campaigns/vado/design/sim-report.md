# Informe de simulación — El vado de Aldamar

Lo escribe `npm run simulate`. Es determinista: con la misma `--seed` sale exactamente este archivo, así que se puede comparar entre commits con un diff. No lleva fecha a propósito.

- Campaña `vado`, contentVersion 1
- Semilla 20260912 · carreras por combinación 100 · partidas por carrera 4
- 3200 carreras, 12498 partidas simuladas con el motor real
- Combinaciones: 4 clases × niveles {1, 3} × 4 políticas

## Las cuatro aserciones

| # | Aserción | Resultado | Detalle |
|---|---|---|---|
| 1 | Ninguna escena fuera de una condición de memoria queda inalcanzable | PASA | todas visitadas |
| 2 | Muerte a nivel 1 con política codiciosa < 3.0 % | PASA | 0.0 % sobre 1600 partidas |
| 3 | Los cuatro finales se alcanzan con las cuatro clases | PASA | las cuatro clases llegaron a los cuatro finales |
| 4 | La política codiciosa hace al menos 3 tiradas por partida | PASA | 3.4 tiradas de media |

## Avisos

- guerrero nivel 1 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- guerrero nivel 3 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- explorador nivel 1 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- explorador nivel 3 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- mago nivel 1 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- mago nivel 3 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- clerigo nivel 1 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- clerigo nivel 3 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
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
| guerrero | 548 | 1390 | 400 | 18 |
| explorador | 229 | 1764 | 532 | 36 |
| mago | 248 | 1757 | 254 | 37 |
| clerigo | 425 | 1082 | 963 | 37 |

### Por número de partida dentro de la carrera

| Partida de la carrera | `fin_hundido` | `fin_dravos` | `fin_crecida` | `fin_heredero` | Total |
|---|---|---|---|---|---|
| 1 | 310 | 1654 | 497 | 13 | 2474 |
| 2 | 393 | 1440 | 560 | 28 | 2421 |
| 3 | 368 | 1451 | 548 | 45 | 2412 |
| 4 | 379 | 1448 | 544 | 42 | 2413 |

## Longitud, derrota y dificultad

- Longitud por partida: **25.1 (mediana 28.0, 6–34)** escenas distintas (el objetivo de diseño es 24–30; cae dentro el 75.9 %), **40.6 (mediana 42.0, 6–91)** pantallas contando las vueltas al hub
- Palabras leídas por partida: **5830.8 (mediana 6042.0, 908–12329)**
- Derrota 20.7 % · muerte 1.6 % · heridas al terminar 0.90
- Tiradas por partida 6.2 · Fallo en los dados 23.6 % · Fallo después de Fortuna y Poder 11.0 %
- Partidas colgadas 0 · escenas sin salida 0 · logs recortados 0

### Por combinación

| Clase | Nivel | Política | Partidas | Pantallas | Distintas | Distintas en objetivo | Palabras | Derrota | Muerte | Heridas | Hitos | Tiradas | Fallo (dados) | Fallo (final) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| guerrero | 1 | aleatoria | 397 | 41.7 | 24.6 | 73.3 % | 6019 | 22.2 % | 0.5 % | 1.34 | 8.4 | 6.9 | 30.2 % | 12.1 % |
| guerrero | 1 | codiciosa | 400 | 42.8 | 29.1 | 100.0 % | 6223 | 0.0 % | 0.0 % | 0.17 | 9.0 | 3.0 | 1.7 % | 0.1 % |
| guerrero | 1 | temeraria | 341 | 34.6 | 18.5 | 26.4 % | 4970 | 63.0 % | 9.4 % | 2.58 | 5.3 | 14.7 | 31.2 % | 18.6 % |
| guerrero | 1 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| guerrero | 3 | aleatoria | 400 | 41.2 | 24.2 | 66.8 % | 5922 | 27.0 % | 0.0 % | 1.42 | 8.2 | 6.9 | 36.0 % | 18.3 % |
| guerrero | 3 | codiciosa | 400 | 42.5 | 29.2 | 100.0 % | 6195 | 0.0 % | 0.0 % | 0.12 | 9.0 | 2.6 | 2.2 % | 0.0 % |
| guerrero | 3 | temeraria | 327 | 33.5 | 18.8 | 15.6 % | 4835 | 66.1 % | 14.7 % | 2.70 | 5.4 | 14.4 | 39.7 % | 27.5 % |
| guerrero | 3 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| explorador | 1 | aleatoria | 400 | 43.7 | 25.1 | 79.3 % | 6313 | 13.0 % | 0.0 % | 0.93 | 8.5 | 7.1 | 19.1 % | 4.4 % |
| explorador | 1 | codiciosa | 400 | 40.7 | 29.0 | 100.0 % | 5815 | 0.0 % | 0.0 % | 0.17 | 8.1 | 4.8 | 2.3 % | 0.0 % |
| explorador | 1 | temeraria | 366 | 36.7 | 17.3 | 30.3 % | 5228 | 61.2 % | 5.5 % | 2.29 | 4.9 | 15.4 | 21.9 % | 8.5 % |
| explorador | 1 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| explorador | 3 | aleatoria | 400 | 43.8 | 25.0 | 75.5 % | 6308 | 15.8 % | 0.0 % | 1.00 | 8.4 | 7.2 | 20.6 % | 6.7 % |
| explorador | 3 | codiciosa | 400 | 40.4 | 29.0 | 100.0 % | 5757 | 0.0 % | 0.0 % | 0.20 | 8.0 | 6.4 | 1.9 % | 0.0 % |
| explorador | 3 | temeraria | 396 | 36.9 | 17.5 | 33.6 % | 5274 | 59.6 % | 1.5 % | 2.18 | 5.1 | 15.9 | 21.5 % | 9.9 % |
| explorador | 3 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 1 | aleatoria | 398 | 40.4 | 24.6 | 73.9 % | 5850 | 19.1 % | 0.3 % | 1.22 | 8.3 | 6.5 | 29.1 % | 5.8 % |
| mago | 1 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6054 | 0.0 % | 0.0 % | 0.00 | 9.8 | 0.8 | 1.3 % | 0.0 % |
| mago | 1 | temeraria | 357 | 34.2 | 16.1 | 16.0 % | 4827 | 78.7 % | 8.1 % | 2.80 | 4.1 | 13.6 | 29.0 % | 11.8 % |
| mago | 1 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 3 | aleatoria | 398 | 40.6 | 23.7 | 65.3 % | 5848 | 26.6 % | 0.5 % | 1.40 | 7.9 | 6.4 | 35.9 % | 8.8 % |
| mago | 3 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6056 | 0.0 % | 0.0 % | 0.00 | 10.0 | 1.0 | 2.0 % | 0.0 % |
| mago | 3 | temeraria | 324 | 33.5 | 16.1 | 13.0 % | 4765 | 73.1 % | 15.1 % | 2.80 | 4.1 | 13.4 | 32.5 % | 15.6 % |
| mago | 3 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| clerigo | 1 | aleatoria | 400 | 42.5 | 25.5 | 77.3 % | 6133 | 9.0 % | 0.0 % | 0.82 | 8.8 | 6.9 | 21.6 % | 7.6 % |
| clerigo | 1 | codiciosa | 400 | 41.0 | 27.2 | 100.0 % | 5907 | 0.0 % | 0.0 % | 0.00 | 9.0 | 3.8 | 1.9 % | 0.1 % |
| clerigo | 1 | temeraria | 396 | 39.8 | 17.6 | 31.6 % | 5553 | 72.7 % | 0.5 % | 2.45 | 4.8 | 16.7 | 22.5 % | 12.5 % |
| clerigo | 1 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| clerigo | 3 | aleatoria | 400 | 43.9 | 25.5 | 82.0 % | 6311 | 12.3 % | 0.0 % | 0.89 | 8.7 | 7.1 | 26.5 % | 10.7 % |
| clerigo | 3 | codiciosa | 400 | 41.0 | 26.7 | 100.0 % | 5892 | 0.0 % | 0.0 % | 0.00 | 9.0 | 5.0 | 1.4 % | 0.0 % |
| clerigo | 3 | temeraria | 398 | 39.2 | 17.7 | 28.6 % | 5479 | 77.6 % | 0.8 % | 2.58 | 4.8 | 16.5 | 25.5 % | 16.0 % |
| clerigo | 3 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |

## Rejugar: ¿se trivializa?

| Partida de la carrera | Partidas | Nivel al empezar | Fallo (dados) | Fallo (final) | Escenas | Palabras |
|---|---|---|---|---|---|---|
| 1 | 3200 | 2.00 | 23.0 % | 10.0 % | 40.4 | 5828 |
| 2 | 3150 | 3.24 | 23.2 % | 10.8 % | 40.7 | 5827 |
| 3 | 3103 | 3.47 | 24.0 % | 11.6 % | 40.5 | 5817 |
| 4 | 3045 | 3.57 | 24.3 % | 11.9 % | 40.8 | 5851 |

- Nivel al terminar la carrera: **3.6 (mediana 4.0, 1–4)**
- XP al terminar la carrera: **166.6 (mediana 180.0, 0–180)**

## Lo que nunca se alcanzó

### Flags declarados que nunca se encendieron

_ninguno_


### Hitos que nunca se alcanzaron

_ninguno_


### Finales que nunca se alcanzaron

_ninguno_

