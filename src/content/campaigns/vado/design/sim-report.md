# Informe de simulación — El vado de Aldamar

Lo escribe `npm run simulate`. Es determinista: con la misma `--seed` sale exactamente este archivo, así que se puede comparar entre commits con un diff. No lleva fecha a propósito.

- Campaña `vado`, contentVersion 1
- Semilla 20260912 · carreras por combinación 100 · partidas por carrera 4
- 4000 carreras, 15667 partidas simuladas con el motor real
- Combinaciones: 4 clases × niveles {1, 3} × 4 políticas

## Las cuatro aserciones

| # | Aserción | Resultado | Detalle |
|---|---|---|---|
| 1 | Ninguna escena fuera de una condición de memoria queda inalcanzable | PASA | todas visitadas |
| 2 | Muerte a nivel 1 con política codiciosa < 3.0 % | PASA | 0.0 % sobre 1600 partidas |
| 3 | Los cuatro finales se alcanzan con las cuatro clases | PASA | las cuatro clases llegaron a los cuatro finales |
| 4 | La política codiciosa hace al menos 3 tiradas por partida | PASA | 3.3 tiradas de media |

## Avisos

- mago nivel 1 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- mago nivel 3 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- El final `fin_heredero` sale en 1.7 % de las partidas que llegan a un final.
- 11 partidas llegaron al tope del log: sus métricas están recortadas.


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
| guerrero | 279 | 1827 | 557 | 31 |
| explorador | 330 | 1880 | 757 | 55 |
| mago | 294 | 1835 | 440 | 46 |
| clerigo | 536 | 1237 | 1237 | 61 |

### Por número de partida dentro de la carrera

| Partida de la carrera | `fin_hundido` | `fin_dravos` | `fin_crecida` | `fin_heredero` | Total |
|---|---|---|---|---|---|
| 1 | 388 | 1799 | 722 | 18 | 2927 |
| 2 | 379 | 1671 | 754 | 52 | 2856 |
| 3 | 336 | 1657 | 761 | 57 | 2811 |
| 4 | 336 | 1652 | 754 | 66 | 2808 |

## Longitud, derrota y dificultad

- Longitud por partida: **24.4 (mediana 27.0, 4–34)** escenas distintas (el objetivo de diseño es 24–30; cae dentro el 71.6 %), **42.6 (mediana 42.0, 5–134)** pantallas contando las vueltas al hub
- Palabras leídas por partida: **5467.3 (mediana 5491.0, 674–17243)**
- Derrota 25.9 % · muerte 1.3 % · heridas al terminar 1.40
- Tiradas por partida 6.7 · Fallo en los dados 24.7 % · Fallo después de Fortuna y Poder 11.0 %
- Partidas colgadas 0 · escenas sin salida 0 · logs recortados 11

### Por combinación

| Clase | Nivel | Política | Partidas | Pantallas | Distintas | Distintas en objetivo | Palabras | Derrota | Muerte | Heridas | Hitos | Tiradas | Fallo (dados) | Fallo (final) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| guerrero | 1 | aleatoria | 397 | 42.0 | 24.7 | 71.5 % | 5430 | 26.2 % | 0.5 % | 1.50 | 8.4 | 7.1 | 30.5 % | 12.4 % |
| guerrero | 1 | codiciosa | 400 | 44.1 | 29.1 | 100.0 % | 5705 | 2.0 % | 0.0 % | 1.22 | 9.0 | 2.8 | 3.7 % | 0.2 % |
| guerrero | 1 | temeraria | 343 | 34.3 | 18.1 | 19.8 % | 4378 | 71.4 % | 9.3 % | 2.68 | 5.1 | 14.5 | 32.8 % | 20.2 % |
| guerrero | 1 | prudente | 400 | 44.0 | 29.0 | 100.0 % | 5636 | 0.0 % | 0.0 % | 1.33 | 9.0 | 1.0 | 11.3 % | 0.0 % |
| guerrero | 1 | insistente | 393 | 46.6 | 22.1 | 56.7 % | 5959 | 39.2 % | 0.8 % | 1.81 | 7.5 | 7.5 | 31.8 % | 13.9 % |
| guerrero | 3 | aleatoria | 397 | 41.0 | 24.0 | 64.7 % | 5277 | 35.0 % | 0.3 % | 1.69 | 8.1 | 7.0 | 36.2 % | 19.2 % |
| guerrero | 3 | codiciosa | 400 | 44.1 | 29.1 | 100.0 % | 5712 | 3.0 % | 0.0 % | 1.38 | 9.0 | 3.0 | 6.2 % | 0.2 % |
| guerrero | 3 | temeraria | 326 | 33.4 | 18.7 | 12.3 % | 4289 | 69.9 % | 14.4 % | 2.75 | 5.3 | 14.2 | 40.5 % | 28.3 % |
| guerrero | 3 | prudente | 400 | 44.0 | 29.0 | 100.0 % | 5634 | 0.5 % | 0.0 % | 1.43 | 9.0 | 1.0 | 17.2 % | 0.5 % |
| guerrero | 3 | insistente | 400 | 46.0 | 21.0 | 52.3 % | 5876 | 46.0 % | 0.3 % | 1.93 | 7.1 | 7.6 | 35.4 % | 17.7 % |
| explorador | 1 | aleatoria | 400 | 43.6 | 24.9 | 77.0 % | 5643 | 18.8 % | 0.0 % | 1.17 | 8.4 | 7.3 | 20.3 % | 5.5 % |
| explorador | 1 | codiciosa | 400 | 41.0 | 29.0 | 100.0 % | 5274 | 0.0 % | 0.0 % | 0.32 | 8.1 | 4.6 | 3.5 % | 0.1 % |
| explorador | 1 | temeraria | 364 | 36.7 | 17.1 | 25.5 % | 4630 | 65.4 % | 5.8 % | 2.40 | 4.7 | 15.4 | 23.5 % | 10.4 % |
| explorador | 1 | prudente | 400 | 43.1 | 29.0 | 100.0 % | 5558 | 0.0 % | 0.0 % | 0.47 | 9.0 | 2.0 | 8.0 % | 0.0 % |
| explorador | 1 | insistente | 400 | 53.2 | 22.4 | 65.3 % | 6761 | 30.5 % | 0.0 % | 1.44 | 7.5 | 8.7 | 19.2 % | 6.0 % |
| explorador | 3 | aleatoria | 400 | 43.7 | 24.9 | 74.3 % | 5627 | 20.0 % | 0.3 % | 1.19 | 8.4 | 7.3 | 21.7 % | 7.1 % |
| explorador | 3 | codiciosa | 400 | 40.4 | 29.0 | 100.0 % | 5187 | 0.0 % | 0.0 % | 0.20 | 8.0 | 5.4 | 1.8 % | 0.0 % |
| explorador | 3 | temeraria | 395 | 36.7 | 17.2 | 28.1 % | 4638 | 64.1 % | 1.8 % | 2.29 | 4.9 | 15.8 | 22.4 % | 11.0 % |
| explorador | 3 | prudente | 400 | 43.0 | 29.0 | 100.0 % | 5552 | 0.0 % | 0.0 % | 0.45 | 9.0 | 2.0 | 6.4 % | 0.0 % |
| explorador | 3 | insistente | 400 | 52.2 | 22.1 | 62.3 % | 6602 | 35.0 % | 0.0 % | 1.57 | 7.3 | 8.5 | 20.0 % | 6.6 % |
| mago | 1 | aleatoria | 400 | 40.4 | 24.3 | 71.5 % | 5238 | 27.5 % | 0.0 % | 1.55 | 8.2 | 6.7 | 29.8 % | 6.1 % |
| mago | 1 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 5491 | 0.0 % | 0.0 % | 1.00 | 9.8 | 0.8 | 1.3 % | 0.0 % |
| mago | 1 | temeraria | 353 | 34.1 | 16.0 | 12.7 % | 4280 | 79.3 % | 8.5 % | 2.80 | 4.1 | 13.5 | 29.6 % | 12.4 % |
| mago | 1 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 5482 | 0.0 % | 0.0 % | 1.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 1 | insistente | 394 | 44.6 | 20.4 | 49.7 % | 5705 | 45.4 % | 0.8 % | 1.91 | 6.8 | 7.1 | 28.8 % | 6.8 % |
| mago | 3 | aleatoria | 398 | 40.1 | 23.3 | 63.8 % | 5184 | 36.9 % | 0.5 % | 1.79 | 7.7 | 6.4 | 35.9 % | 9.1 % |
| mago | 3 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 5493 | 0.0 % | 0.0 % | 1.00 | 10.0 | 1.0 | 2.0 % | 0.0 % |
| mago | 3 | temeraria | 325 | 33.3 | 15.9 | 11.1 % | 4213 | 76.3 % | 14.2 % | 2.83 | 4.1 | 13.2 | 33.4 % | 16.3 % |
| mago | 3 | prudente | 400 | 42.0 | 29.0 | 100.0 % | 5482 | 0.0 % | 0.0 % | 1.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 3 | insistente | 396 | 42.1 | 20.1 | 46.2 % | 5392 | 51.3 % | 0.8 % | 2.00 | 6.7 | 6.6 | 33.8 % | 9.0 % |
| clerigo | 1 | aleatoria | 400 | 42.6 | 25.4 | 76.8 % | 5505 | 11.5 % | 0.0 % | 1.00 | 8.8 | 7.1 | 22.5 % | 8.2 % |
| clerigo | 1 | codiciosa | 400 | 42.3 | 27.8 | 100.0 % | 5506 | 0.0 % | 0.0 % | 0.16 | 9.1 | 3.9 | 4.6 % | 0.6 % |
| clerigo | 1 | temeraria | 396 | 39.7 | 17.5 | 30.6 % | 4926 | 73.0 % | 0.5 % | 2.48 | 4.7 | 16.6 | 23.0 % | 12.9 % |
| clerigo | 1 | prudente | 400 | 43.6 | 29.0 | 100.0 % | 5604 | 0.0 % | 0.0 % | 0.39 | 9.0 | 1.8 | 11.9 % | 0.7 % |
| clerigo | 1 | insistente | 397 | 53.8 | 24.0 | 70.5 % | 6840 | 21.9 % | 0.3 % | 1.28 | 8.2 | 8.6 | 22.3 % | 8.5 % |
| clerigo | 3 | aleatoria | 400 | 43.8 | 25.4 | 82.0 % | 5637 | 15.8 % | 0.0 % | 1.17 | 8.6 | 7.3 | 27.4 % | 12.0 % |
| clerigo | 3 | codiciosa | 400 | 41.9 | 27.3 | 100.0 % | 5469 | 0.0 % | 0.0 % | 0.04 | 9.1 | 4.6 | 1.8 % | 0.1 % |
| clerigo | 3 | temeraria | 398 | 39.1 | 17.6 | 26.6 % | 4857 | 79.1 % | 0.8 % | 2.62 | 4.7 | 16.4 | 25.7 % | 16.2 % |
| clerigo | 3 | prudente | 400 | 43.4 | 29.0 | 100.0 % | 5591 | 0.0 % | 0.0 % | 0.18 | 9.0 | 1.5 | 14.5 % | 1.5 % |
| clerigo | 3 | insistente | 395 | 52.2 | 23.2 | 68.1 % | 6621 | 26.8 % | 0.8 % | 1.45 | 7.8 | 8.6 | 27.5 % | 13.6 % |

## Rejugar: ¿se trivializa?

| Partida de la carrera | Partidas | Nivel al empezar | Fallo (dados) | Fallo (final) | Escenas | Palabras |
|---|---|---|---|---|---|---|
| 1 | 4000 | 2.00 | 23.6 % | 9.5 % | 42.5 | 5472 |
| 2 | 3943 | 3.20 | 24.3 % | 10.7 % | 42.7 | 5473 |
| 3 | 3891 | 3.45 | 25.0 % | 11.5 % | 42.5 | 5446 |
| 4 | 3833 | 3.58 | 26.0 % | 12.5 % | 42.7 | 5478 |

- Nivel al terminar la carrera: **3.6 (mediana 4.0, 1–4)**
- XP al terminar la carrera: **167.6 (mediana 180.0, 0–180)**

## Lo que nunca se alcanzó

### Flags declarados que nunca se encendieron

_ninguno_


### Hitos que nunca se alcanzaron

_ninguno_


### Finales que nunca se alcanzaron

_ninguno_

