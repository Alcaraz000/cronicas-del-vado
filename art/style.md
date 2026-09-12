# Estilo visual congelado — Crónicas del Vado

Resultado de la prueba de estilo de la Fase G, corrida el 12 de septiembre de 2026 sobre 20 imágenes
(5 retratos, 5 fondos, 5 objetos, 5 escenas) más 3 objetos de corrección.

**Veredicto: el look pictórico converge.** No hace falta cambiar de modelo ni entrenar un LoRA propio
para empezar a producir. Lo que sí hace falta es un prompt distinto por tipo de imagen: usar el mismo
para todo fue el único error real de la primera tanda.

## Entorno

| Pieza | Valor |
|---|---|
| Interfaz | ComfyUI Portable 0.35.0 (build NVIDIA), en `C:\ComfyUI\ComfyUI_windows_portable` |
| Arranque | `run_nvidia_gpu.bat`, o el `python_embeded\python.exe -s ComfyUI\main.py --port 8188` que usa el script |
| API | `http://127.0.0.1:8188` |
| Placa | RTX 3060 Ti, 8 GB (7,5 GB libres con el modelo cargado) |
| PyTorch | 2.13.0+cu130 |
| RAM del sistema | 17,1 GB. La spec sugería 32 GB: **no hizo falta**, no hubo swap ni caída de velocidad |

## Parámetros congelados

| Parámetro | Valor | Por qué |
|---|---|---|
| Checkpoint | `zavychromaxl_v100.safetensors` | El recomendado por la investigación; da el look pintado sin LoRA |
| VAE | `sdxl_vae_fp16fix.safetensors` | Evita artefactos en precisión media |
| Pasos | 28 | Probado; 20 ya da buen resultado, 28 gana detalle sin costar tiempo notable |
| CFG | 5.0 | Más alto satura y endurece la pincelada |
| Sampler | `dpmpp_2m_sde` | — |
| Scheduler | `karras` | — |

**Licencias.** ZavyChromaXL v100 se distribuye bajo CreativeML Open RAIL++-M, que permite uso comercial.
El VAE fp16-fix es MIT. Real-ESRGAN x4 es BSD-3. Todos se bajaron de espejos de HuggingFace sin token.

## Tiempos medidos

21 segundos por imagen, en los tres tamaños usados (1024×1024, 896×1152 y 1344×768), con una
consistencia notable: mínimo 21,1 s y máximo 21,2 s en 15 corridas seguidas. La primera imagen de
cada sesión tarda 40 s porque carga el modelo.

El presupuesto de la spec era 25-30 s, así que estamos holgados. Las ~430 generaciones que estima la
Fase G son unas **2 horas y media de máquina desatendida**, no un fin de semana.

## Prompt base

Positivo, que antecede al prompt propio de cada imagen:

```
painterly digital illustration, semi-realistic fantasy concept art, oil painting texture,
visible brushwork, dramatic chiaroscuro lighting, muted earthy palette with warm lantern accents,
medieval european setting, cinematic composition, highly detailed,
painted by a concept artist for a dark fantasy game
```

Negativo:

```
photo, photorealistic, 3d render, cgi, anime, manga, cartoon, cel shading, flat vector,
smooth airbrush, plastic skin, text, watermark, signature, logo, blurry, lowres,
extra limbs, deformed hands, oversaturated, neon colors, modern clothing
```

## Recetas por tipo, que es lo que la prueba vino a determinar

### Fondos de lugar — listos para producción
1344×768, sin cambios sobre el prompt base. **Es lo que mejor sale.** Terminar el prompt con
`wide establishing shot, no people` es obligatorio: sin eso mete figuras que después estorban,
porque los personajes van como retrato aparte.

### Retratos de personaje — buenos, con dos disciplinas que faltaron
896×1152. El estilo sale bien a la primera y la cara respeta la descripción canónica.
Lo que la prueba mostró que hay que forzar:
- **El encuadre se va a plano de cintura.** Hay que repetir el encuadre dos veces en el prompt
  (`head and shoulders only, tight crop at the collarbone`) o recortar en el post-proceso.
  La spec pide encuadre idéntico entre personajes: es lo que hace que se vean de la misma colección.
- **El fondo neutro lo ignora** y arma arquitectura. Queda lindo, pero rompe la uniformidad.
  Agregar `plain dark vignette background, no architecture, no scenery` y reforzarlo en el negativo.

### Objetos — necesitan su propia receta, no la base
1024×1024. La primera tanda salió fotográfica y con decorado (hojas de palmera, bombillas) porque el
prompt decía `studio lighting` y `object study`, que empujan a foto de producto. **Sacar esas dos
frases lo arregla.** La receta que funciona:

```
... single object centered on a plain flat grey background, no scenery, no props, no decoration,
painted item icon for a dark fantasy game
```
y en el negativo, además del base:
```
scenery, background objects, foliage, plants, palm leaves, lanterns, table, cloth, hands,
multiple objects, collage, border, frame
```
Con eso el fondo queda plano y uniforme, que es la condición para recortarlo con canal alfa.

### Escenas narrativas — la limitación real del modelo
1344×768. **Acá el modelo no cumple.** Pedirle "un capitán señalando con el dedo a un viajero en un
careo tenso, con aldeanos mirando desde los umbrales" devuelve una calle preciosa con dos figuras
lejanas que no hacen nada. Es la debilidad que la investigación ya anticipaba para SDXL: buena
atmósfera, mala adherencia a composiciones con varios personajes en acción.

Tres salidas, en orden de preferencia:
1. **Replantear las escenas como planos cerrados de un sujeto** (una mano sobre un sello, un cuerpo
   junto a la piedra del molino, una figura cruzando el vado). Eso el modelo sí lo ejecuta, y
   narrativamente suele ser más fuerte que el plano general.
2. **Aceptarlas como atmósfera** y que el texto cargue la acción, que es lo que hace una novela visual.
3. Solo si 1 y 2 no alcanzan, probar un modelo con mejor adherencia para esas seis imágenes puntuales.

La decisión 1 es la recomendada y no cuesta nada: es reescribir seis prompts.

## Lo que queda pendiente de la Fase G

- Recorte con canal alfa para objetos e iconos: falta instalar los pesos de BiRefNet.
- ControlNet de profundidad, para generar variantes de un mismo lugar (noche, tormenta, inundado)
  manteniendo la composición.
- Ampliado de fondos con Real-ESRGAN, que ya está descargado.
- Curación: elegir una imagen maestra por entidad entre varios candidatos y registrar su semilla.
