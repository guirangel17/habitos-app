#!/usr/bin/env python3
"""Login no Garmin Connect — roda UMA vez, salva o token em ~/.garth.

A senha vai direto para os servidores da Garmin (biblioteca garth);
nada é salvo além dos tokens de sessão em ~/.garth.
Se sua conta tiver MFA, o código será pedido no terminal.

Detecta sozinho o túnel reverso (ssh -R 1080) e a CA do Zscaler.
"""
import getpass

import garmin_api  # configura túnel + TLS ao importar
import garth

email = input("Email da conta Garmin: ").strip()
password = getpass.getpass("Senha Garmin (não aparece ao digitar): ")

garth.login(email, password)
garth.save("~/.garth")

profile = garth.connectapi("/userprofile-service/socialProfile")
print(f"\n✅ Logado como: {profile.get('displayName') or profile.get('fullName')}")
print("Token salvo em ~/.garth — agora é só avisar o Claude.")
