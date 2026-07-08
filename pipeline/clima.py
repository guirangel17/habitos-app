#!/usr/bin/env python3
"""Previsão do tempo para as janelas de treino (BH) → data/clima.json.

Open-Meteo, sem chave. Roda no mesmo workflow do pipeline de análises; o app
mostra o ponto da PRÓXIMA janela (6h/19h de hoje, 6h de amanhã) na linha do
treino de hoje. Função de extração é pura e testada em test_analisar.py.
"""
import json
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

BRT = timezone(timedelta(hours=-3))
LAT, LON = -19.92, -43.94  # Belo Horizonte
URL = (f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}"
       "&hourly=temperature_2m,precipitation_probability,relative_humidity_2m"
       "&timezone=America%2FSao_Paulo&forecast_days=2")
JANELAS_H = (6, 19)  # manhã e social/noite
ARQ = Path(__file__).resolve().parent.parent / "data" / "clima.json"


def extrair_janelas(hourly, hoje):
    """hourly do open-meteo → [{quando, hora, temp, chuvaPct, umidade}] só nas janelas de
    treino de hoje e amanhã. Puro (testável): `hoje` = 'YYYY-MM-DD'."""
    amanha = (datetime.strptime(hoje, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
    idx = {t: i for i, t in enumerate(hourly.get("time") or [])}
    out = []
    for dia in (hoje, amanha):
        for h in JANELAS_H:
            i = idx.get(f"{dia}T{h:02d}:00")
            if i is None:
                continue
            temp = (hourly.get("temperature_2m") or [None] * (i + 1))[i]
            if temp is None:
                continue
            out.append({
                "quando": f"{dia}T{h:02d}:00",
                "temp": round(temp),
                "chuvaPct": (hourly.get("precipitation_probability") or [None] * (i + 1))[i],
                "umidade": (hourly.get("relative_humidity_2m") or [None] * (i + 1))[i],
            })
    return out


def main():
    with urllib.request.urlopen(URL, timeout=30) as r:
        payload = json.load(r)
    agora = datetime.now(BRT)
    doc = {
        "atualizadoEm": agora.isoformat(timespec="seconds"),
        "janelas": extrair_janelas(payload.get("hourly") or {}, agora.strftime("%Y-%m-%d")),
    }
    ARQ.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    print(f"clima: {len(doc['janelas'])} janela(s) gravadas")


if __name__ == "__main__":
    main()
