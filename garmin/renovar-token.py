#!/usr/bin/env python3
"""Renova o OAuth2 do pipeline a partir DESTA máquina (IP residencial) e atualiza
o Secret GARMIN_TOKEN do repo via API do GitHub — zero passo manual depois de agendado.

Por quê: desde mar/2026 o Cloudflare da Garmin bloqueia o endpoint de oauth para
IPs de datacenter (runners do GitHub Actions). O OAuth2 do dump vive 24h; a troca
OAuth1→OAuth2 que o renovaria só passa de IP residencial. Este script roda no
notebook (agendado — ver README) e mantém o Secret sempre com um OAuth2 fresco.

Pré-requisitos (uma vez):
  pip install garth pynacl requests curl_cffi
  python3 login-garmin.py            # sessão Garmin em ~/.garth (pede email/senha/MFA)
  PAT fine-grained do GitHub (repo habitos-app, permissão Secrets: Read and write)
  salvo em ~/.habitos-pat (arquivo com só o token) ou na env HABITOS_PAT
"""
import base64
import os
import sys
from pathlib import Path

import requests

import garmin_api  # túnel + TLS corporativo + UA de navegador ao importar  # noqa: F401
import garth

REPO = "guirangel17/habitos-app"
ARQ_PAT = Path.home() / ".habitos-pat"


def pat_github():
    if os.environ.get("HABITOS_PAT"):
        return os.environ["HABITOS_PAT"].strip()
    if ARQ_PAT.exists():
        return ARQ_PAT.read_text().strip()
    sys.exit(f"PAT não encontrado — crie um fine-grained (repo {REPO}, Secrets: RW) e salve em {ARQ_PAT}")


def atualizar_secret(nome, valor, token):
    """PUT no Secret do Actions — o valor vai cifrado com a chave pública do repo (libsodium)."""
    from nacl import encoding, public

    api = f"https://api.github.com/repos/{REPO}/actions/secrets"
    h = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    pk = requests.get(f"{api}/public-key", headers=h, timeout=15)
    pk.raise_for_status()
    pk = pk.json()
    caixa = public.SealedBox(public.PublicKey(pk["key"].encode(), encoding.Base64Encoder()))
    cifrado = base64.b64encode(caixa.encrypt(valor.encode())).decode()
    r = requests.put(f"{api}/{nome}", headers=h, timeout=15,
                     json={"encrypted_value": cifrado, "key_id": pk["key_id"]})
    r.raise_for_status()


def main():
    token_gh = pat_github()
    try:
        garth.resume("~/.garth")
    except Exception:
        sys.exit("Sessão Garmin não encontrada — rode antes: python3 login-garmin.py")
    garmin_api.confiar_zscaler()  # resume() remonta o adaptador HTTP — reaplica o TLS
    # OAuth2 novo (24h) assinado pelo OAuth1 (~1 ano), via curl_cffi — o refresh nativo
    # do garth usa python-requests, que o Cloudflare da Garmin bloqueia por TLS
    garth.client.oauth2_token = garmin_api.exchange_navegador(garth.client.oauth1_token)
    garth.save("~/.garth")  # mantém a sessão local fresca também
    perfil = garth.connectapi("/userprofile-service/socialProfile") or {}
    atualizar_secret("GARMIN_TOKEN", garth.client.dumps(), token_gh)
    print(f"✅ OAuth2 renovado ({perfil.get('displayName', '?')}) e Secret GARMIN_TOKEN atualizado.")


if __name__ == "__main__":
    main()
