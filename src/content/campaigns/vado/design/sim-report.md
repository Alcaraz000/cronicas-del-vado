# Informe de simulación — El vado de Aldamar

Lo escribe `npm run simulate`. Es determinista: con la misma `--seed` sale exactamente este archivo, así que se puede comparar entre commits con un diff. No lleva fecha a propósito.

- Campaña `vado`, contentVersion 1
- Semilla 20260912 · carreras por combinación 100 · partidas por carrera 4
- 2400 carreras, 9298 partidas simuladas con el motor real
- Combinaciones: 4 clases × niveles {1, 3} × 3 políticas

## Las tres aserciones

| # | Aserción | Resultado | Detalle |
|---|---|---|---|
| 1 | Ninguna escena fuera de una condición de memoria queda inalcanzable | PASA | todas visitadas |
| 2 | Muerte a nivel 1 con política codiciosa < 3.0 % | PASA | 0.0 % sobre 1600 partidas |
| 3 | Los cuatro finales se alcanzan con las cuatro clases | PASA | las cuatro clases llegaron a los cuatro finales |

## Avisos

- La partida media recorre 23.9 escenas distintas (40.3 pantallas) y el objetivo de diseño es 24–30.
- guerrero nivel 1 con política codiciosa termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- guerrero nivel 3 con política codiciosa termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- explorador nivel 1 con política codiciosa termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- explorador nivel 3 con política codiciosa termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- mago nivel 1 con política codiciosa termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- mago nivel 3 con política codiciosa termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- clerigo nivel 1 con política codiciosa termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- clerigo nivel 3 con política codiciosa termina la campaña sin tirar un solo dado: siempre hay una opción sin tirada disponible.
- El final `fin_heredero` sale en 2.0 % de las partidas que llegan a un final.


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
| guerrero | 208 | 930 | 400 | 18 |
| explorador | 229 | 964 | 532 | 36 |
| mago | 248 | 957 | 254 | 37 |
| clerigo | 425 | 982 | 263 | 37 |

### Por número de partida dentro de la carrera

| Partida de la carrera | `fin_hundido` | `fin_dravos` | `fin_crecida` | `fin_heredero` | Total |
|---|---|---|---|---|---|
| 1 | 285 | 979 | 397 | 13 | 1674 |
| 2 | 284 | 949 | 360 | 28 | 1621 |
| 3 | 266 | 953 | 348 | 45 | 1612 |
| 4 | 275 | 952 | 344 | 42 | 1613 |

## Longitud, derrota y dificultad

- Longitud por partida: **23.9 (mediana 26.0, 6–34)** escenas distintas (el objetivo de diseño es 24–30; cae dentro el 67.7 %), **40.3 (mediana 42.0, 6–91)** pantallas contando las vueltas al hub
- Palabras leídas por partida: **5777.0 (mediana 6042.0, 908–12329)**
- Derrota 27.8 % · muerte 2.1 % · heridas al terminar 1.18
- Tiradas por partida 7.1 · Fallo en los dados 27.2 % · Fallo después de Fortuna y Poder 12.9 %
- Partidas colgadas 0 · escenas sin salida 0 · logs recortados 0

### Por combinación

| Clase | Nivel | Política | Partidas | Pantallas | Distintas | Distintas en objetivo | Palabras | Derrota | Muerte | Heridas | Tiradas | Fallo (dados) | Fallo (final) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| guerrero | 1 | aleatoria | 397 | 41.7 | 24.6 | 73.3 % | 6019 | 22.2 % | 0.5 % | 1.34 | 6.9 | 30.2 % | 12.1 % |
| guerrero | 1 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 0.0 | 0.0 % | 0.0 % |
| guerrero | 1 | temeraria | 341 | 34.6 | 18.5 | 26.4 % | 4970 | 63.0 % | 9.4 % | 2.58 | 14.7 | 31.2 % | 18.6 % |
| guerrero | 3 | aleatoria | 400 | 41.2 | 24.2 | 66.8 % | 5922 | 27.0 % | 0.0 % | 1.42 | 6.9 | 36.0 % | 18.3 % |
| guerrero | 3 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 0.0 | 0.0 % | 0.0 % |
| guerrero | 3 | temeraria | 327 | 33.5 | 18.8 | 15.6 % | 4835 | 66.1 % | 14.7 % | 2.70 | 14.4 | 39.7 % | 27.5 % |
| explorador | 1 | aleatoria | 400 | 43.7 | 25.1 | 79.3 % | 6313 | 13.0 % | 0.0 % | 0.93 | 7.1 | 19.1 % | 4.4 % |
| explorador | 1 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 0.0 | 0.0 % | 0.0 % |
| explorador | 1 | temeraria | 366 | 36.7 | 17.3 | 30.3 % | 5228 | 61.2 % | 5.5 % | 2.29 | 15.4 | 21.9 % | 8.5 % |
| explorador | 3 | aleatoria | 400 | 43.8 | 25.0 | 75.5 % | 6308 | 15.8 % | 0.0 % | 1.00 | 7.2 | 20.6 % | 6.7 % |
| explorador | 3 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 0.0 | 0.0 % | 0.0 % |
| explorador | 3 | temeraria | 396 | 36.9 | 17.5 | 33.6 % | 5274 | 59.6 % | 1.5 % | 2.18 | 15.9 | 21.5 % | 9.9 % |
| mago | 1 | aleatoria | 398 | 40.4 | 24.6 | 73.9 % | 5850 | 19.1 % | 0.3 % | 1.22 | 6.5 | 29.1 % | 5.8 % |
| mago | 1 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 0.0 | 0.0 % | 0.0 % |
| mago | 1 | temeraria | 357 | 34.2 | 16.1 | 16.0 % | 4827 | 78.7 % | 8.1 % | 2.80 | 13.6 | 29.0 % | 11.8 % |
| mago | 3 | aleatoria | 398 | 40.6 | 23.7 | 65.3 % | 5848 | 26.6 % | 0.5 % | 1.40 | 6.4 | 35.9 % | 8.8 % |
| mago | 3 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 0.0 | 0.0 % | 0.0 % |
| mago | 3 | temeraria | 324 | 33.5 | 16.1 | 13.0 % | 4765 | 73.1 % | 15.1 % | 2.80 | 13.4 | 32.5 % | 15.6 % |
| clerigo | 1 | aleatoria | 400 | 42.5 | 25.5 | 77.3 % | 6133 | 9.0 % | 0.0 % | 0.82 | 6.9 | 21.6 % | 7.6 % |
| clerigo | 1 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 0.0 | 0.0 % | 0.0 % |
| clerigo | 1 | temeraria | 396 | 39.8 | 17.6 | 31.6 % | 5553 | 72.7 % | 0.5 % | 2.45 | 16.7 | 22.5 % | 12.5 % |
| clerigo | 3 | aleatoria | 400 | 43.9 | 25.5 | 82.0 % | 6311 | 12.3 % | 0.0 % | 0.89 | 7.1 | 26.5 % | 10.7 % |
| clerigo | 3 | codiciosa | 400 | 42.0 | 29.0 | 100.0 % | 6047 | 0.0 % | 0.0 % | 0.00 | 0.0 | 0.0 % | 0.0 % |
| clerigo | 3 | temeraria | 398 | 39.2 | 17.7 | 28.6 % | 5479 | 77.6 % | 0.8 % | 2.58 | 16.5 | 25.5 % | 16.0 % |

## Rejugar: ¿se trivializa?

| Partida de la carrera | Partidas | Nivel al empezar | Fallo (dados) | Fallo (final) | Escenas | Palabras |
|---|---|---|---|---|---|---|
| 1 | 2400 | 2.00 | 25.0 % | 10.9 % | 40.0 | 5758 |
| 2 | 2350 | 3.16 | 27.1 % | 12.8 % | 40.4 | 5779 |
| 3 | 2303 | 3.39 | 28.3 % | 13.8 % | 40.2 | 5765 |
| 4 | 2245 | 3.51 | 28.8 % | 14.2 % | 40.5 | 5808 |

- Nivel al terminar la carrera: **3.5 (mediana 4.0, 1–4)**
- XP al terminar la carrera: **163.6 (mediana 180.0, 0–180)**

## Lo que nunca se alcanzó

### Flags declarados que nunca se encendieron

_ninguno_


### Hitos que nunca se alcanzaron

_ninguno_


### Finales que nunca se alcanzaron

_ninguno_

