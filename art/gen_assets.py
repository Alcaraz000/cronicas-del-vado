"""Generador por lotes contra la API de ComfyUI.

Carga un workflow en formato API, le sustituye prompt, semilla y tamaño, encola
el trabajo y espera a que termine. Guarda cada imagen en art/masters/<tipo>/<id>/.

Uso:
    python art/gen_assets.py --manifest art/prueba_estilo.json
    python art/gen_assets.py --manifest art/prueba_estilo.json --solo retrato

El servidor tiene que estar corriendo en http://127.0.0.1:8188.
"""

from __future__ import annotations

import argparse
import json
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

SERVIDOR = "http://127.0.0.1:8188"
RAIZ = Path(__file__).resolve().parent
SALIDA_COMFY = Path(r"C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\output")


def encolar(workflow: dict) -> str:
    datos = json.dumps({"prompt": workflow}).encode("utf-8")
    pedido = urllib.request.Request(
        f"{SERVIDOR}/prompt", data=datos, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(pedido, timeout=60) as respuesta:
        return json.load(respuesta)["prompt_id"]


def esperar(prompt_id: str, timeout: int = 900) -> dict:
    """Consulta el historial hasta que el trabajo aparece terminado."""
    limite = time.time() + timeout
    while time.time() < limite:
        with urllib.request.urlopen(f"{SERVIDOR}/history/{prompt_id}", timeout=30) as r:
            historial = json.load(r)
        if prompt_id in historial:
            return historial[prompt_id]
        time.sleep(1.5)
    raise TimeoutError(f"el trabajo {prompt_id} no terminó en {timeout}s")


def imagenes_de(resultado: dict) -> list[dict]:
    salidas = resultado.get("outputs", {})
    return [img for nodo in salidas.values() for img in nodo.get("images", [])]


def generar(entrada: dict, estilo: dict, workflow_base: dict) -> dict:
    wf = json.loads(json.dumps(workflow_base))
    positivo = f"{estilo['positivo']}, {entrada['prompt']}"
    wf["6"]["inputs"]["text"] = positivo
    wf["7"]["inputs"]["text"] = estilo["negativo"]
    wf["5"]["inputs"]["width"] = entrada.get("width", 1024)
    wf["5"]["inputs"]["height"] = entrada.get("height", 1024)
    wf["3"]["inputs"]["seed"] = entrada["seed"]
    wf["3"]["inputs"]["steps"] = estilo.get("pasos", 28)
    wf["3"]["inputs"]["cfg"] = estilo.get("cfg", 5.0)
    wf["3"]["inputs"]["sampler_name"] = estilo.get("sampler", "dpmpp_2m_sde")
    wf["3"]["inputs"]["scheduler"] = estilo.get("scheduler", "karras")
    wf["9"]["inputs"]["filename_prefix"] = f"{entrada['tipo']}_{entrada['id']}"

    comenzado = time.time()
    resultado = esperar(encolar(wf))
    segundos = time.time() - comenzado

    destino = RAIZ / "masters" / entrada["tipo"] / entrada["id"]
    destino.mkdir(parents=True, exist_ok=True)
    guardadas = []
    for img in imagenes_de(resultado):
        origen = SALIDA_COMFY / img.get("subfolder", "") / img["filename"]
        if origen.exists():
            final = destino / f"seed_{entrada['seed']}.png"
            shutil.copy2(origen, final)
            guardadas.append(str(final))

    return {
        "id": entrada["id"],
        "tipo": entrada["tipo"],
        "seed": entrada["seed"],
        "segundos": round(segundos, 1),
        "archivos": guardadas,
        "prompt": positivo,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--solo", default=None, help="generar solo este tipo")
    args = ap.parse_args()

    manifiesto = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    estilo = manifiesto["estilo"]
    workflow_base = json.loads(
        (RAIZ / "workflows" / manifiesto["workflow"]).read_text(encoding="utf-8")
    )

    entradas = manifiesto["entradas"]
    if args.solo:
        entradas = [e for e in entradas if e["tipo"] == args.solo]

    registro = []
    for i, entrada in enumerate(entradas, 1):
        print(f"[{i}/{len(entradas)}] {entrada['tipo']}/{entrada['id']} ...", flush=True)
        try:
            resultado = generar(entrada, estilo, workflow_base)
        except Exception as error:  # noqa: BLE001 - queremos seguir con el resto del lote
            print(f"    FALLÓ: {error}", flush=True)
            registro.append({"id": entrada["id"], "error": str(error)})
            continue
        print(f"    {resultado['segundos']}s -> {len(resultado['archivos'])} imagen(es)", flush=True)
        registro.append(resultado)

    reporte = RAIZ / "prueba_estilo_reporte.json"
    reporte.write_text(json.dumps(registro, ensure_ascii=False, indent=2), encoding="utf-8")

    tiempos = [r["segundos"] for r in registro if "segundos" in r]
    if tiempos:
        print(
            f"\n{len(tiempos)}/{len(entradas)} generadas. "
            f"Tiempo por imagen: min {min(tiempos)}s, mediana {sorted(tiempos)[len(tiempos)//2]}s, max {max(tiempos)}s"
        )
    print(f"Reporte: {reporte}")
    return 0 if len(tiempos) == len(entradas) else 1


if __name__ == "__main__":
    raise SystemExit(main())
