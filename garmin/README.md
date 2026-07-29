# Garmin — treinos estruturados e renovação do token do pipeline

Scripts locais (rodam em qualquer máquina, não no Actions) para duas tarefas:
**renovar o token** quando o pipeline acusar `garmin_auth` e **criar/agendar/
limpar os treinos estruturados** do plano no Garmin Connect.

Pré-requisito: Python 3.10+ instalado (Windows: python.org ou Microsoft Store;
Mac/Linux: já vem). A rede precisa alcançar a Garmin (casa ou hotspot — teste
abrindo https://connect.garmin.com no navegador).

## Renovar o token do pipeline — automático (recomendado)

Contexto: desde mar/2026 o Cloudflare da Garmin bloqueia o endpoint de oauth
para os runners do GitHub. O OAuth2 do Secret vive 24h e a troca que o renovaria
só passa de IP residencial — então a renovação roda AQUI, agendada, e atualiza
o Secret via API do GitHub. Setup (uma vez):

```bash
git clone https://github.com/guirangel17/habitos-app.git && cd habitos-app/garmin
pip install garth pynacl requests curl_cffi   # Windows: py -m pip install garth pynacl requests curl_cffi
python3 login-garmin.py             # pede email/senha/MFA — salva a sessão em ~/.garth
# crie um PAT fine-grained (repo habitos-app, permissão "Secrets: Read and write")
# e salve o token puro no arquivo ~/.habitos-pat
python3 renovar-token.py            # testa: renova o OAuth2 e atualiza o Secret
```

Agendar (só faz efeito com o notebook ligado; o app acende o aviso âmbar em
Ajustes se o pipeline ficar >24h parado):

```powershell
# Windows (Agendador de Tarefas): diário 08:30 REPETINDO a cada 2h + ao acordar do
# sleep + a cada logon. Bateria LIBERADA.
# ATENÇÃO 1 (14/07/2026): NUNCA use "py"/"python" no Execute — se o Python veio da
# Microsoft Store/instalador novo, são App Execution Aliases (reparse points em
# WindowsApps) que o Agendador NÃO executa: a tarefa falha com 0x80070002, o Secret
# nunca renova e o pipeline cai em "oauth exchange 429". Use o python.exe REAL.
# ATENÇÃO 2 (22/07/2026 — causa do treino não detectado em 20-21/07): um gatilho ÚNICO
# diário + bateria NÃO liberada é frágil demais num NOTEBOOK. -AllowStartIfOnBatteries
# não estava de fato aplicado e o padrão do Agendador é "só na tomada" + "para se for pra
# bateria": desplugado às 08:30 a tarefa NÃO roda, e sem repetição/wake ela só tenta no
# dia seguinte. O OAuth2 (vida ~24-29h) venceu por ~48h e TODO run virou garmin_bloqueio
# o dia inteiro, em silêncio. Fix: bateria liberada + repetição 2h + gatilho de acordar
# (evento Kernel-Power 107). Confirme os campos REAIS (o cmdlet inverte o nome):
#   (Get-ScheduledTask RenovarGarmin).Settings | fl DisallowStartIfOnBatteries,StopIfGoingOnBatteries
#   -> os DOIS têm que ser False.
$py = (python -c "import sys; print(sys.executable)")   # ex.: ...\pythoncore-3.14-64\python.exe
$dir = "C:\caminho\para\habitos-app\garmin"
$action = New-ScheduledTaskAction -Execute $py -Argument "$dir\renovar-token.py" -WorkingDirectory $dir

# 1) diário 08:30 repetindo a cada 2h por ~23h (cobre qualquer hora com o note ligado)
$tDaily = New-ScheduledTaskTrigger -Daily -At 08:30
$tDaily.Repetition = (New-ScheduledTaskTrigger -Once -At 08:30 -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Hours 23)).Repetition
# 2) a cada logon
$tLogon = New-ScheduledTaskTrigger -AtLogOn -User "$env:COMPUTERNAME\$env:USERNAME"
# 3) ao ACORDAR do sleep (evento Kernel-Power 107 no log System) — renova assim que o note volta
$cls = Get-CimClass -Namespace ROOT\Microsoft\Windows\TaskScheduler -ClassName MSFT_TaskEventTrigger
$tWake = New-CimInstance -CimClass $cls -ClientOnly; $tWake.Enabled = $true
$tWake.Subscription = "<QueryList><Query Id='0' Path='System'><Select Path='System'>*[System[Provider[@Name='Microsoft-Windows-Kernel-Power'] and (EventID=107)]]</Select></Query></QueryList>"

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "RenovarGarmin" -Action $action -Trigger $tDaily,$tLogon,$tWake -Settings $settings -Force

# Teste de verdade (rodar na mão NÃO testa o agendamento):
Start-ScheduledTask RenovarGarmin; Start-Sleep 45
(Get-ScheduledTaskInfo RenovarGarmin).LastTaskResult   # tem que ser 0
```

Defesa em software (v7.19): mesmo que a renovação pare, o app não fica mais no escuro —
>20h de garmin_bloqueio sem nenhum run "ok" acende âmbar no ⚙️ e manda um push
"Renovação do Garmin parou — abra/pluge o notebook". Antes, o bloqueio era 100%
silencioso e só se descobria abrindo o app e não vendo a análise.

```bash
# Mac/Linux (cron): de hora em hora é barato (1 request por execução)
# crontab -e →  30 * * * * cd /caminho/habitos-app/garmin && python3 renovar-token.py
```

## Renovar na mão (fallback — vale por 24h)

```bash
cd habitos-app/garmin && python3 login-garmin.py
python3 -c "import garth; garth.resume('~/.garth'); print(garth.client.dumps())"
```

Copie a saída inteira e cole no GitHub → repo `habitos-app` → Settings →
Secrets and variables → Actions → `GARMIN_TOKEN` → **Update secret**. Depois
toque o 🛰️ na aba Treino do app e confira a saúde em Ajustes.

## Criar os treinos do plano no relógio

```bash
cd habitos-app/garmin

# 2. Instale a biblioteca (uma vez)
pip install garth curl_cffi # Windows: py -m pip install garth curl_cffi

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

## Recalibrar paces sem recriar nada (`--atualizar`)

Quando um checkpoint recalibra os paces (ex.: o teste de 5 km de 29/07/2026), NÃO use
`--limpar` + `--tudo`: os agendamentos apontam para o `workoutId`, então sobrescrever o
treino no lugar faz todas as datas já agendadas herdarem o conteúdo novo — sem apagar
nem reagendar nada.

```bash
# 1. edite as constantes de pace no topo de treinos_corrida.py
# 2. veja o que MUDARIA, sem tocar na conta (não precisa nem de login):
python3 criar.py --atualizar --dry-run
# 3. piloto num treino só, e confira no app Garmin Connect:
python3 criar.py --atualizar "Tiros 5x800m"
# 4. o resto (sem nomes = a lista RECALIBRADOS do criar.py):
python3 criar.py --atualizar
```

O dry-run imprime, por treino, as faixas de pace de cada passo e **quais datas futuras**
são afetadas — é o que dá pra conferir antes de gravar.

**Pegadinha:** o `workoutId` é compartilhado por TODAS as datas daquele treino, passadas
inclusive. Antes de atualizar, olhe a coluna de datas: se o treino só tem data passada,
atualizar só reescreve histórico do relógio sem beneficiar nada (foi o caso do
`Tiros 6x400m` em 29/07 — ficou de fora de propósito). E cuidado com treinos que
*coincidem* com uma faixa sem serem daquele tipo: o `Tempo Run 6km CHECKPOINT` usava a
constante `TEMPO` só porque a faixa antiga batia, mas ele é ensaio de RITMO DE PROVA —
virou `TEMPO_CHECKPOINT`, pinado, senão o relógio passaria a pedir pace de limiar num
dia de prova simulada.

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
