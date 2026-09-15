# Informe de simulación — El vado de Aldamar

Lo escribe `npm run simulate`. Es determinista: con la misma `--seed` sale exactamente este archivo, así que se puede comparar entre commits con un diff. No lleva fecha a propósito.

- Campaña `vado`, contentVersion 1
- Semilla 20260912 · carreras por combinación 100 · partidas por carrera 4
- 4000 carreras, 15652 partidas simuladas con el motor real
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
- 6 partidas llegaron al tope del log: sus métricas están recortadas.


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
| guerrero | 292 | 1872 | 607 | 44 |
| explorador | 397 | 1906 | 1009 | 66 |
| mago | 388 | 1862 | 510 | 42 |
| clerigo | 856 | 1193 | 1281 | 62 |

### Por número de partida dentro de la carrera

| Partida de la carrera | `fin_hundido` | `fin_dravos` | `fin_crecida` | `fin_heredero` | Total |
|---|---|---|---|---|---|
| 1 | 557 | 1794 | 825 | 24 | 3200 |
| 2 | 462 | 1685 | 891 | 52 | 3090 |
| 3 | 470 | 1672 | 864 | 53 | 3059 |
| 4 | 444 | 1682 | 827 | 85 | 3038 |

## Longitud, derrota y dificultad

- Longitud por partida: **24.2 (mediana 26.0, 4–34)** escenas distintas (el objetivo de diseño es 24–30; cae dentro el 71.2 %), **37.2 (mediana 35.0, 5–134)** pantallas contando las vueltas al hub
- Palabras leídas por partida: **4912.1 (mediana 4739.0, 674–16641)**
- Derrota 19.5 % · muerte 1.3 % · heridas al terminar 1.27
- Tiradas por partida 6.5 · Fallo en los dados 27.5 % · Fallo después de Fortuna y Poder 13.4 %
- Partidas colgadas 0 · escenas sin salida 0 · logs recortados 6

### Por combinación

| Clase | Nivel | Política | Partidas | Pantallas | Distintas | Distintas en objetivo | Palabras | Derrota | Muerte | Heridas | Hitos | Tiradas | Fallo (dados) | Fallo (final) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| guerrero | 1 | aleatoria | 398 | 39.3 | 24.1 | 63.3 % | 5130 | 25.1 % | 0.3 % | 1.47 | 8.5 | 6.6 | 30.5 % | 12.5 % |
| guerrero | 1 | codiciosa | 400 | 36.1 | 27.1 | 100.0 % | 4853 | 0.3 % | 0.0 % | 1.24 | 9.0 | 1.8 | 4.9 % | 0.3 % |
| guerrero | 1 | temeraria | 346 | 27.4 | 20.6 | 16.5 % | 3678 | 53.8 % | 8.4 % | 2.30 | 7.0 | 14.1 | 35.9 % | 22.5 % |
| guerrero | 1 | prudente | 400 | 36.0 | 27.0 | 100.0 % | 4822 | 0.0 % | 0.0 % | 1.41 | 9.0 | 1.0 | 10.5 % | 0.0 % |
| guerrero | 1 | insistente | 394 | 44.7 | 21.5 | 49.0 % | 5740 | 40.1 % | 0.8 % | 1.77 | 7.4 | 7.2 | 31.7 % | 13.9 % |
| guerrero | 3 | aleatoria | 398 | 38.6 | 23.5 | 60.1 % | 5009 | 34.7 % | 0.5 % | 1.73 | 8.2 | 6.7 | 37.6 % | 19.7 % |
| guerrero | 3 | codiciosa | 400 | 36.2 | 27.2 | 100.0 % | 4864 | 0.0 % | 0.0 % | 1.18 | 9.0 | 2.0 | 2.3 % | 0.0 % |
| guerrero | 3 | temeraria | 345 | 25.4 | 19.4 | 7.8 % | 3421 | 68.1 % | 9.6 % | 2.62 | 6.5 | 13.1 | 42.9 % | 29.6 % |
| guerrero | 3 | prudente | 400 | 36.0 | 27.0 | 100.0 % | 4822 | 0.0 % | 0.0 % | 1.43 | 9.0 | 1.0 | 8.8 % | 0.0 % |
| guerrero | 3 | insistente | 400 | 44.6 | 20.8 | 44.3 % | 5710 | 44.8 % | 0.3 % | 1.90 | 7.1 | 7.3 | 34.5 % | 17.3 % |
| explorador | 1 | aleatoria | 400 | 41.1 | 24.5 | 72.3 % | 5353 | 16.5 % | 0.0 % | 1.12 | 8.5 | 7.0 | 22.0 % | 6.3 % |
| explorador | 1 | codiciosa | 400 | 32.4 | 26.2 | 100.0 % | 4388 | 0.3 % | 0.0 % | 0.30 | 8.1 | 4.6 | 3.6 % | 0.1 % |
| explorador | 1 | temeraria | 361 | 30.1 | 22.5 | 35.5 % | 4053 | 22.7 % | 4.4 % | 1.47 | 7.8 | 16.3 | 30.7 % | 16.9 % |
| explorador | 1 | prudente | 400 | 35.2 | 27.0 | 100.0 % | 4758 | 0.3 % | 0.0 % | 0.46 | 9.0 | 2.0 | 8.5 % | 0.5 % |
| explorador | 1 | insistente | 400 | 50.2 | 22.1 | 60.5 % | 6414 | 27.8 % | 0.0 % | 1.41 | 7.6 | 8.2 | 20.4 % | 6.2 % |
| explorador | 3 | aleatoria | 400 | 42.2 | 24.5 | 73.8 % | 5474 | 18.5 % | 0.0 % | 1.18 | 8.6 | 7.1 | 22.7 % | 7.7 % |
| explorador | 3 | codiciosa | 400 | 31.4 | 26.0 | 100.0 % | 4258 | 0.0 % | 0.0 % | 0.20 | 8.0 | 5.4 | 1.8 % | 0.0 % |
| explorador | 3 | temeraria | 392 | 29.8 | 22.5 | 33.7 % | 4012 | 25.3 % | 1.0 % | 1.50 | 7.8 | 16.6 | 34.1 % | 21.1 % |
| explorador | 3 | prudente | 400 | 35.0 | 27.0 | 100.0 % | 4739 | 0.0 % | 0.0 % | 0.45 | 9.0 | 2.0 | 6.4 % | 0.0 % |
| explorador | 3 | insistente | 398 | 49.5 | 21.8 | 59.0 % | 6288 | 29.6 % | 0.3 % | 1.46 | 7.5 | 8.1 | 21.1 % | 6.6 % |
| mago | 1 | aleatoria | 394 | 38.4 | 24.0 | 65.7 % | 5039 | 20.3 % | 0.8 % | 1.45 | 8.4 | 6.2 | 29.9 % | 6.1 % |
| mago | 1 | codiciosa | 400 | 34.0 | 27.0 | 100.0 % | 4678 | 0.0 % | 0.0 % | 1.00 | 9.8 | 0.8 | 1.3 % | 0.0 % |
| mago | 1 | temeraria | 331 | 29.1 | 21.2 | 28.7 % | 3890 | 50.5 % | 14.2 % | 2.38 | 7.0 | 14.6 | 33.2 % | 15.7 % |
| mago | 1 | prudente | 400 | 34.0 | 27.0 | 100.0 % | 4669 | 0.0 % | 0.0 % | 1.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 1 | insistente | 397 | 43.0 | 20.0 | 46.9 % | 5524 | 43.6 % | 0.3 % | 1.88 | 6.8 | 7.0 | 29.9 % | 7.5 % |
| mago | 3 | aleatoria | 400 | 38.1 | 23.1 | 64.3 % | 4977 | 30.5 % | 0.3 % | 1.63 | 8.0 | 6.0 | 36.7 % | 9.1 % |
| mago | 3 | codiciosa | 400 | 34.0 | 27.0 | 100.0 % | 4680 | 0.0 % | 0.0 % | 1.00 | 10.0 | 1.0 | 2.0 % | 0.0 % |
| mago | 3 | temeraria | 301 | 27.3 | 20.0 | 15.3 % | 3690 | 58.8 % | 21.3 % | 2.65 | 6.5 | 13.7 | 41.6 % | 24.1 % |
| mago | 3 | prudente | 400 | 34.0 | 27.0 | 100.0 % | 4669 | 0.0 % | 0.0 % | 1.00 | 9.0 | 0.0 | 0.0 % | 0.0 % |
| mago | 3 | insistente | 399 | 40.6 | 20.1 | 44.1 % | 5240 | 46.1 % | 0.3 % | 1.90 | 6.9 | 6.3 | 34.3 % | 9.1 % |
| clerigo | 1 | aleatoria | 400 | 39.7 | 24.9 | 76.0 % | 5197 | 8.0 % | 0.0 % | 0.89 | 8.9 | 6.7 | 23.9 % | 9.2 % |
| clerigo | 1 | codiciosa | 400 | 34.3 | 25.8 | 95.5 % | 4689 | 0.0 % | 0.0 % | 0.15 | 9.1 | 3.9 | 3.8 % | 0.5 % |
| clerigo | 1 | temeraria | 400 | 33.5 | 23.4 | 59.5 % | 4381 | 30.8 % | 0.0 % | 1.56 | 8.3 | 16.0 | 25.7 % | 15.0 % |
| clerigo | 1 | prudente | 400 | 35.6 | 27.0 | 100.0 % | 4792 | 0.0 % | 0.0 % | 0.41 | 9.0 | 1.8 | 11.1 % | 0.4 % |
| clerigo | 1 | insistente | 400 | 50.5 | 23.4 | 67.5 % | 6448 | 23.5 % | 0.0 % | 1.28 | 8.2 | 8.2 | 24.1 % | 10.0 % |
| clerigo | 3 | aleatoria | 398 | 40.4 | 24.5 | 74.1 % | 5266 | 13.6 % | 0.3 % | 1.06 | 8.7 | 6.6 | 25.9 % | 10.2 % |
| clerigo | 3 | codiciosa | 400 | 33.9 | 25.3 | 92.3 % | 4651 | 0.0 % | 0.0 % | 0.07 | 9.1 | 4.6 | 1.8 % | 0.2 % |
| clerigo | 3 | temeraria | 400 | 31.7 | 22.5 | 37.5 % | 4150 | 49.0 % | 0.0 % | 2.00 | 8.0 | 15.3 | 33.5 % | 23.2 % |
| clerigo | 3 | prudente | 400 | 35.5 | 27.0 | 100.0 % | 4779 | 0.0 % | 0.0 % | 0.27 | 9.0 | 1.5 | 13.6 % | 1.1 % |
| clerigo | 3 | insistente | 400 | 49.9 | 22.8 | 63.5 % | 6368 | 26.5 % | 0.0 % | 1.38 | 7.9 | 8.2 | 28.3 % | 14.1 % |

## Rejugar: ¿se trivializa?

| Partida de la carrera | Partidas | Nivel al empezar | Fallo (dados) | Fallo (final) | Escenas | Palabras |
|---|---|---|---|---|---|---|
| 1 | 4000 | 2.00 | 25.8 % | 11.2 % | 37.2 | 4935 |
| 2 | 3946 | 3.32 | 27.2 % | 13.3 % | 37.3 | 4924 |
| 3 | 3875 | 3.56 | 28.3 % | 14.3 % | 37.0 | 4888 |
| 4 | 3831 | 3.65 | 28.9 % | 15.0 % | 37.1 | 4901 |

- Nivel al terminar la carrera: **3.7 (mediana 4.0, 1–4)**
- XP al terminar la carrera: **171.4 (mediana 180.0, 0–180)**

## Lo que nunca se alcanzó

### Flags declarados que nunca se encendieron

_ninguno_


### Hitos que nunca se alcanzaron

_ninguno_


### Finales que nunca se alcanzaron

_ninguno_

