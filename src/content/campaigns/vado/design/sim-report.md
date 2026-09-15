# Informe de simulación — El vado de Aldamar

Lo escribe `npm run simulate`. Es determinista: con la misma `--seed` sale exactamente este archivo, así que se puede comparar entre commits con un diff. No lleva fecha a propósito.

- Campaña `vado`, contentVersion 1
- Semilla 20260912 · carreras por combinación 100 · partidas por carrera 4
- 4000 carreras, 15666 partidas simuladas con el motor real
- Combinaciones: 4 clases × niveles {1, 3} × 5 políticas

## Las cuatro aserciones

| # | Aserción | Resultado | Detalle |
|---|---|---|---|
| 1 | Ninguna escena fuera de una condición de memoria queda inalcanzable | PASA | todas visitadas |
| 2 | Muerte a nivel 1 con política codiciosa < 3.0 % | PASA | 0.0 % sobre 1600 partidas |
| 3 | Los cuatro finales se alcanzan con las cuatro clases | PASA | las cuatro clases llegaron a los cuatro finales |
| 4 | La política codiciosa hace al menos 3 tiradas por partida | PASA | 3.0 tiradas de media |

## Avisos

- mago nivel 1 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- mago nivel 3 con política prudente termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- El final `fin_heredero` sale en 1.7 % de las partidas que llegan a un final.
- 7 partidas llegaron al tope del log: sus métricas están recortadas.


## Cobertura

- Escenas visitadas: **46 de 46** (100.0 %)
- Opciones elegidas: **253 de 253** (100.0 %)

### Escenas que nunca se visitaron

_ninguna: la simulación tocó las 46_


### Opciones que nunca se eligieron

De las 0 sin elegir, 0 están detrás de una condición de memoria.

_ninguna: la simulación eligió las 252_


## Finales

### Por clase

| Clase | `fin_hundido` | `fin_dravos` | `fin_crecida` | `fin_heredero` |
|---|---|---|---|---|
| guerrero | 297 | 1869 | 611 | 45 |
| explorador | 400 | 1907 | 1007 | 64 |
| mago | 394 | 1870 | 512 | 38 |
| clerigo | 861 | 1197 | 1279 | 62 |

### Por número de partida dentro de la carrera

| Partida de la carrera | `fin_hundido` | `fin_dravos` | `fin_crecida` | `fin_heredero` | Total |
|---|---|---|---|---|---|
| 1 | 560 | 1800 | 827 | 22 | 3209 |
| 2 | 471 | 1684 | 883 | 49 | 3087 |
| 3 | 472 | 1674 | 877 | 51 | 3074 |
| 4 | 449 | 1685 | 822 | 87 | 3043 |

## Longitud, derrota y dificultad

- Longitud por partida: **24.2 (mediana 26.0, 4–34)** escenas distintas (el objetivo de diseño es 24–30; cae dentro el 71.3 %), **37.0 (mediana 35.0, 5–134)** pantallas contando las vueltas al hub
- Palabras leídas por partida: **4898.0 (mediana 4739.0, 674–16641)**
- Derrota 19.5 % · muerte 1.3 % · heridas al terminar 1.26
- Tiradas por partida 6.5 · Fallo en los dados 27.5 % · Fallo después de Fortuna y Poder 13.3 %
- Partidas colgadas 0 · escenas sin salida 0 · logs recortados 7

### Por combinación

| Clase | Nivel | Política | Partidas | Pantallas | Distintas | Distintas en objetivo | Palabras | Derrota | Muerte | Heridas | Hitos | Tiradas | Fallo (dados) | Fallo (final) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| guerrero | 1 | aleatoria | 400 | 39.1 | 24.1 | 64.0 % | 5103 | 26.5 % | 0.0 % | 1.50 | 8.4 | 6.5 | 30.9 % | 12.7 % |
| guerrero | 1 | codiciosa | 400 | 36.1 | 27.1 | 100.0 % | 4853 | 0.3 % | 0.0 % | 1.24 | 9.0 | 1.8 | 4.9 % | 0.3 % |
| guerrero | 1 | temeraria | 348 | 27.3 | 20.5 | 16.7 % | 3665 | 54.0 % | 8.0 % | 2.30 | 6.9 | 14.1 | 35.8 % | 22.4 % |
| guerrero | 1 | prudente | 400 | 36.0 | 27.0 | 100.0 % | 4822 | 0.0 % | 0.0 % | 1.41 | 9.0 | 1.0 | 10.5 % | 0.0 % |
| guerrero | 1 | insistente | 399 | 44.5 | 21.6 | 49.1 % | 5719 | 39.8 % | 0.3 % | 1.75 | 7.5 | 7.1 | 32.0 % | 14.0 % |
| guerrero | 3 | aleatoria | 397 | 38.2 | 23.5 | 61.5 % | 4973 | 33.8 % | 0.8 % | 1.72 | 8.2 | 6.6 | 37.9 % | 19.8 % |
| guerrero | 3 | codiciosa | 400 | 36.2 | 27.2 | 100.0 % | 4864 | 0.0 % | 0.0 % | 1.18 | 9.0 | 2.0 | 2.3 % | 0.0 % |
| guerrero | 3 | temeraria | 339 | 25.4 | 19.3 | 8.3 % | 3418 | 67.0 % | 10.6 % | 2.62 | 6.4 | 13.1 | 42.9 % | 29.5 % |
| guerrero | 3 | prudente | 400 | 36.0 | 27.0 | 100.0 % | 4822 | 0.0 % | 0.0 % | 1.43 | 9.0 | 1.0 | 8.8 % | 0.0 % |
| guerrero | 3 | insistente | 398 | 43.8 | 20.9 | 44.5 % | 5630 | 43.5 % | 0.8 % | 1.89 | 7.3 | 7.2 | 34.5 % | 16.6 % |
| explorador | 1 | aleatoria | 400 | 41.1 | 24.5 | 72.3 % | 5351 | 16.3 % | 0.0 % | 1.11 | 8.5 | 7.0 | 22.0 % | 6.3 % |
| explorador | 1 | codiciosa | 400 | 32.4 | 26.2 | 100.0 % | 4388 | 0.3 % | 0.0 % | 0.30 | 8.1 | 4.6 | 3.6 % | 0.1 % |
| explorador | 1 | temeraria | 361 | 30.1 | 22.5 | 35.5 % | 4053 | 22.7 % | 4.4 % | 1.47 | 7.8 | 16.3 | 30.7 % | 16.9 % |
| explorador | 1 | prudente | 400 | 35.2 | 27.0 | 100.0 % | 4758 | 0.3 % | 0.0 % | 0.46 | 9.0 | 2.0 | 8.5 % | 0.5 % |
| explorador | 1 | insistente | 400 | 49.9 | 22.1 | 60.0 % | 6377 | 28.5 % | 0.0 % | 1.41 | 7.6 | 8.1 | 20.4 % | 6.3 % |
| explorador | 3 | aleatoria | 400 | 42.2 | 24.5 | 73.8 % | 5471 | 18.0 % | 0.0 % | 1.18 | 8.6 | 7.1 | 22.8 % | 7.7 % |
| explorador | 3 | codiciosa | 400 | 31.4 | 26.0 | 100.0 % | 4258 | 0.0 % | 0.0 % | 0.20 | 8.0 | 5.4 | 1.8 % | 0.0 % |
| explorador | 3 | temeraria | 392 | 29.8 | 22.5 | 33.7 % | 4012 | 25.3 % | 1.0 % | 1.50 | 7.8 | 16.6 | 34.1 % | 21.1 % |
| explorador | 3 | prudente | 400 | 35.0 | 27.0 | 100.0 % | 4739 | 0.0 % | 0.0 % | 0.45 | 9.0 | 2.0 | 6.4 % | 0.0 % |
| explorador | 3 | insistente | 398 | 49.1 | 21.8 | 59.0 % | 6247 | 29.6 % | 0.3 % | 1.45 | 7.5 | 8.0 | 20.9 % | 6.4 % |
| mago | 1 | aleatoria | 394 | 38.3 | 24.0 | 66.5 % | 5028 | 20.1 % | 0.8 % | 1.44 | 8.4 | 6.2 | 29.8 % | 5.9 % |
| mago | 1 | codiciosa | 400 | 34.0 | 27.0 | 100.0 % | 4678 | 0.0 % | 0.0 % | 1.00 | 9.8 | 0.8 | 1.3 % | 0.0 % |
| mago | 1 | temeraria | 333 | 29.0 | 21.1 | 28.5 % | 3873 | 51.1 % | 13.8 % | 2.39 | 6.9 | 14.6 | 33.2 % | 15.6 % |
| mago | 1 | prudente | 400 | 34.0 | 27.0 | 100.0 % | 4669 | 0.0 % | 0.0 % | 1.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 1 | insistente | 400 | 42.4 | 20.0 | 47.3 % | 5455 | 42.3 % | 0.0 % | 1.83 | 6.8 | 6.8 | 29.9 % | 7.1 % |
| mago | 3 | aleatoria | 400 | 37.9 | 23.1 | 63.7 % | 4954 | 31.0 % | 0.5 % | 1.63 | 8.0 | 6.0 | 36.9 % | 9.2 % |
| mago | 3 | codiciosa | 400 | 34.0 | 27.0 | 100.0 % | 4680 | 0.0 % | 0.0 % | 1.00 | 10.0 | 1.0 | 2.0 % | 0.0 % |
| mago | 3 | temeraria | 309 | 27.0 | 19.7 | 14.6 % | 3636 | 63.4 % | 17.5 % | 2.66 | 6.3 | 13.6 | 41.6 % | 23.8 % |
| mago | 3 | prudente | 400 | 34.0 | 27.0 | 100.0 % | 4669 | 0.0 % | 0.0 % | 1.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 3 | insistente | 400 | 40.3 | 20.2 | 45.5 % | 5214 | 44.8 % | 0.0 % | 1.88 | 7.0 | 6.2 | 34.2 % | 8.7 % |
| clerigo | 1 | aleatoria | 400 | 39.7 | 24.9 | 75.8 % | 5198 | 7.5 % | 0.0 % | 0.88 | 8.9 | 6.7 | 23.7 % | 8.9 % |
| clerigo | 1 | codiciosa | 400 | 34.3 | 25.8 | 95.5 % | 4689 | 0.0 % | 0.0 % | 0.15 | 9.1 | 3.9 | 3.8 % | 0.5 % |
| clerigo | 1 | temeraria | 400 | 33.5 | 23.4 | 59.8 % | 4381 | 30.8 % | 0.0 % | 1.56 | 8.3 | 16.0 | 25.7 % | 15.0 % |
| clerigo | 1 | prudente | 400 | 35.6 | 27.0 | 100.0 % | 4792 | 0.0 % | 0.0 % | 0.41 | 9.0 | 1.8 | 11.1 % | 0.4 % |
| clerigo | 1 | insistente | 400 | 50.3 | 23.6 | 67.0 % | 6428 | 22.8 % | 0.3 % | 1.26 | 8.2 | 8.1 | 24.3 % | 10.0 % |
| clerigo | 3 | aleatoria | 398 | 40.3 | 24.5 | 74.4 % | 5258 | 13.6 % | 0.3 % | 1.05 | 8.7 | 6.6 | 26.0 % | 10.2 % |
| clerigo | 3 | codiciosa | 400 | 33.9 | 25.3 | 92.3 % | 4651 | 0.0 % | 0.0 % | 0.07 | 9.1 | 4.6 | 1.8 % | 0.2 % |
| clerigo | 3 | temeraria | 400 | 31.7 | 22.5 | 37.5 % | 4151 | 49.0 % | 0.0 % | 2.00 | 8.0 | 15.3 | 33.4 % | 23.2 % |
| clerigo | 3 | prudente | 400 | 35.5 | 27.0 | 100.0 % | 4779 | 0.0 % | 0.0 % | 0.27 | 9.0 | 1.5 | 13.6 % | 1.1 % |
| clerigo | 3 | insistente | 400 | 49.1 | 22.8 | 63.5 % | 6285 | 25.5 % | 0.3 % | 1.36 | 7.9 | 8.0 | 28.4 % | 14.0 % |

## Rejugar: ¿se trivializa?

| Partida de la carrera | Partidas | Nivel al empezar | Fallo (dados) | Fallo (final) | Escenas | Palabras |
|---|---|---|---|---|---|---|
| 1 | 4000 | 2.00 | 25.8 % | 11.2 % | 37.1 | 4926 |
| 2 | 3947 | 3.32 | 27.3 % | 13.3 % | 37.1 | 4903 |
| 3 | 3880 | 3.56 | 28.2 % | 14.1 % | 36.9 | 4874 |
| 4 | 3839 | 3.65 | 28.9 % | 14.8 % | 37.0 | 4888 |

- Nivel al terminar la carrera: **3.7 (mediana 4.0, 1–4)**
- XP al terminar la carrera: **171.5 (mediana 180.0, 0–180)**

## Lo que nunca se alcanzó

### Flags declarados que nunca se encendieron

_ninguno_


### Hitos que nunca se alcanzaron

_ninguno_


### Finales que nunca se alcanzaron

_ninguno_

