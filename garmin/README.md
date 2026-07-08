# Garmin — treinos estruturados e renovação do token do pipeline

Scripts locais (rodam em qualquer máquina, não no Actions) para duas tarefas:
**renovar o token** quando o pipeline acusar `garmin_auth` e **criar/agendar/
limpar os treinos estruturados** do plano no Garmin Connect.

Pré-requisito: Python 3.10+ instalado (Windows: python.org ou Microsoft Store;
Mac/Linux: já vem). A rede precisa alcançar a Garmin (casa ou hotspot — teste
abrindo https://connect.garmin.com no navegador).

## Renovar o token do pipeline (status `garmin_auth` na saúde do app)

```bash
git clone https://github.com/guirangel17/habitos-app.git && cd habitos-app/garmin
pip install garth                # Windows: py -m pip install garth
python3 login-garmin.py          # pede email/senha/MFA — salva a sessão em ~/.garth
python3 -c "import garth; garth.resume('~/.garth'); print(garth.client.dumps())"
```

Copie a saída inteira e cole no GitHub → repo `habitos-app` → Settings →
Secrets and variables → Actions → `GARMIN_TOKEN` → **Update secret**. Depois
toque o 🛰️ na aba Treino do app e confira a saúde em Ajustes.

## Criar os treinos do plano no relógio

```bash
cd habitos-app/garmin

# 2. Instale a biblioteca (uma vez)
pip install garth          # Windows: py -m pip install garth

# 3. Login na Garmin (uma vez — pede email/senha/MFA no terminal)
python3 login-garmin.py    # Windows: py login-garmin.py

# 4. Piloto: cria só 2 treinos para conferir no app
python3 criar.py --piloto
#    -> abra o app Garmin Connect, Calendário: 29/07 (corrida) e 14/07 (força)

# 5. Se o piloto apareceu certinho, crie tudo:
python3 criar.py --tudo

# Se quiser desfazer tudo que foi criado:
python3 criar.py --limpar
```

## O que será criado

- 43 treinos de corrida estruturados (paces calibrados), agendados em 66 datas
  de 08/07 a 06/12 — incluindo a prova com a estratégia de largada embutida.
- 8 treinos de força (com variantes por fase: hipertrofia → força máxima em
  setembro → manutenção em outubro → polimento em novembro), em 94 datas.
- Registro local em `garmin-criados.json` — é ele que permite o `--limpar`.

Obs.: os nomes de exercícios de força usam o catálogo da Garmin quando existe
correspondência; quando não existe (ex.: tibial anterior), o nome real vai na
descrição do passo. Se a API rejeitar algum mapeamento, o script degrada
sozinho e cria com descrições.
