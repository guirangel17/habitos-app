# Feito na v2 (jul/2026)

- ✅ Redesign da tela Hoje: hero único com a refeição da vez (progressive disclosure), trilha compacta de 5 marcadores, linha de streaks, slot contextual único (máx. 1 card condicional por vez), "+ Registrar" consolidado.
- ✅ Revisão de domingo guiada (wizard de 5 passos, tela cheia).
- ✅ Contrato da Noite: pré-decisão + share WhatsApp + placar 1x1 no slot contextual + fechamento na manhã seguinte.
- ✅ Mapa gatilho × período do dia (substitui as barras quando há ≥2 semanas de dados).
- ✅ Rota até a Pampulha (timeline com marcos e semanas pintadas — absorveu o hero de contagem).
- ✅ Painel de identidade com frase que "assina" após 4 domingos de revisão (absorveu o capital acumulado).
- ✅ Lembretes locais opt-in em Ajustes (best-effort, sem push server).

# Feito na v3 (jul/2026)

- ✅ Aba Treino: treino de hoje (corrida + academia com check), visão da semana (academia X/5 · corrida X/3) e o cronograma completo das 67 corridas do plano, tickável, com auto-scroll para a próxima.
- ✅ Contadores estilo SugarCut: overlay com anéis em gradiente, dias + hh:mm:ss ao vivo, próximo marco (1/3/7/14/21/30…), aberto pela linha de tempo limpo da home.
- ✅ Constância redesenhada: uma linha por semana com total e ✓ verde ao bater 28/35.
- ✅ Tiles de resumo do peso (média 7d atual, Δ30d, Δ total) acima do gráfico.
- ✅ Polimento visual: gradiente azul→aqua nos botões primários/SOS/anéis, hero com wash, raio 16px.

# Feito na v4 (jul/2026)

- ✅ Aba Treino reordenada (Semana → Treino de hoje → Cronograma) com botão › em cada treino abrindo o treino completo: exercícios com séries × reps + fase da periodização (academia) ou pace/FC/sensação/execução do plano (corrida).
- ✅ Jardim do tempo limpo: SVG generativo e determinístico — cada dia limpo cresce a planta, cada marco vira flor, cada onda surfada vira estrela piscando. Vive no overlay de contadores e como card na Evolução.
- ✅ Redesign da Evolução: hero com gradiente (rota dentro), rótulos de seção (IDENTIDADE/CORPO/HÁBITOS/CONSTÂNCIA/PADRÕES), card de identidade com borda em gradiente quando assinada, títulos de card em small caps em todo o app.

# Feito na v5 (jul/2026)

- ✅ Aba Relatório: placar do período (30/90/tudo) com deltas vs período anterior; insights automáticos com guarda de amostra mínima que testam o protocolo com os dados reais (escudo das 16h × doce, dominó pós-saída, taxa de sucesso do SOS, semana verde × balança, R$ economizados vs baseline); deslizes por dia da semana; totais desde o início.

# Feito na v6 (jul/2026)

- ✅ Aba Dieta: contexto do dia (tipo + kcal/macros + porquê), trilha das 5 refeições (migrada da Hoje), cardápio do dia inteiro com ajustes do tipo, semana em números (métricas §4 movidas da Evolução + X/35 verde a 28).
- ✅ Hoje redesenhada como dashboard: hero mantém a refeição da vez (+ placar X/5), linha de treino com check por modalidade, anel do marco mais próximo (goal gradient — substitui a linha de tempo limpo; celebra marco batido <24h), peso matinal, slot contextual intacto.
- ✅ Colheita do dia (peak-end rule): o hero da noite com jantar fechado mostra refeições, treino, dia limpo → folha no jardim e distância do marco.
- ✅ Abertura de semana (fresh start effect): linha na segunda de manhã — recomeço 0 a 0 ou momentum de semanas verdes seguidas, ancorada no Longão.
- ✅ Ajustes saiu da nav para o ⚙️ do header; a nav ganhou a aba Dieta (5 abas mantidas — 6 não cabem bem em 360px).
- ✅ Semana da aba Treino clicável: cada dia é botão; card vira "Treino de {dia}" com chip "‹ voltar para hoje"; passado = check retroativo, futuro = read-only.
- ✅ derive.js: `marcoDashboard` e `aberturaSemana` (+12 asserts novos); `proximoMarco` expõe o marco anterior. Dev param novo: `?dia=YYYY-MM-DD`.

# Feito na v6.1 (jul/2026) — feedback: "a Hoje ainda não parece um dashboard"

- ✅ Anéis de tempo limpo AO VIVO no dashboard (dias + hh:mm:ss + arco do marco, ticker 1s) no lugar da linha pequena de marco; toque abre o overlay.
- ✅ Strip da Pampulha em gradiente no dashboard (semanas restantes + % do caminho) — o countdown não fica mais só no header.
- ✅ Hero da refeição compactado (h1 menor, botões lado a lado) — dieta vira um bloco entre iguais.
- ✅ Legenda do jardim com miniaturas SVG (folha/flor/estrela) + "próxima flor: marco de N — faltam Xd" por planta, no overlay e no card da Evolução; o marco agora DIZ o que entrega ("→ flor nova no jardim").

# Feito na v6.2 (jul/2026)

- ✅ Countdown "N sem até a Pampulha" removido do header — redundante com a strip da prova no dashboard; o header ficou só chip do dia + ⚙️.

# Feito na v6.3 (jul/2026)

- ✅ Botão voltar do Android: fecha uma camada por vez (sheet/overlay → dia do Treino → aba Hoje → sai) via sentinela no history, em vez de fechar o app direto.
- ✅ Atualização confiável: `reg.update()` quando o app volta ao foco + `location.reload()` quando o SW novo assume (o snackbar antigo não recarregava o shell — era por isso que a versão "não subia" mesmo fechando e abrindo).

# Feito na v7 (jul/2026) — análise automática de corridas

- ✅ Pipeline Garmin → Gemini no GitHub Actions: corrida termina → stats (pace, FC, cadência, splits, training effect) + zonas de FC CANÔNICAS (FCmax 190, calculadas da série — nunca as do Connect) → análise da IA no tom do protocolo (zero punição) → data/analises.json publicado no Pages.
- ✅ Disparo quase-imediato (~2-4 min): o app dispara o workflow e lê os JSONs pela API do GitHub com PAT fine-grained salvo só no aparelho (Ajustes); crons como rede de segurança; polling com snackbar "análise pronta ✨".
- ✅ Aba Treino: ✨ no cronograma, seção SUA CORRIDA no sheet (stats + zonas + splits + parecer), botão "Buscar análise".
- ✅ Slot contextual: confirmação de 1 toque "O Garmin registrou sua corrida — marcar feito?" (nunca automático).
- ✅ Evolução: seção CORRIDA com pace-em-Z2 ao longo do tempo (historico.json + tendências determinísticas), VO2max, cadência e volume.
- ✅ Ajustes: campo do PAT + status do pipeline; sw.js network-first para /data/.
- Riscos documentados no CLAUDE.md (garth deprecado, token ~1 ano com runbook, quota Gemini).

# Feito na v7.1 (jul/2026) — rename + polish

- ✅ Hero da refeição: "✓ Feita" agora ocupa a largura toda e "substituições / pulei" virou linha discreta embaixo (feedback: lado a lado ficava feio).

- ✅ App renomeado **Pampulha → Rotina** (feedback: "Pampulha não expressa o que o app faz"). Mudou só o nome voltado ao usuário: manifest (name/short_name), `<title>`, rodapé de Ajustes, nome do arquivo de backup. Menções à Volta da Pampulha (prova) ficam. Identificadores internos NÃO mudam: localStorage `pampulha.v1`, `app: 'pampulha'` no export, classe `.card-pampulha`, sentinela do history — renomear a chave do storage arriscaria os dados do usuário sem ganho.

# Feito na v7.2 (jul/2026) — evolução real da corrida + feedback de UX

- ✅ Corrida social (>10% de tempo parado) fora das tendências de pace Z2 e cadência — continua contando no volume (feito na prática junto com a v7.1).
- ✅ Evolução → CORRIDA: **eficiência aeróbica** (metros/batimento, corridas limpas até Z3 — tiro/prova inflam, longão longo derruba), **volume semanal** (12 semanas em barras, semana atual translúcida), **longão do mês** (barras com régua tracejada dos 18 km da prova).
- ✅ Pipeline: **deriva cardíaca** (decoupling FC×pace, 2ª metade vs 1ª pelos splits) nos longões ≥8 km — stat "deriva FC" no sheet + interpretação no prompt do Gemini (<5% sólido, >8% calibrar).
- ✅ Sheet (bottom-sheet): alça visual no topo + respiro — o texto da análise estava colado na borda.
- ✅ Barra de zonas de FC: cores por matiz (`--zona-1..5`: cinza→azul→aqua→âmbar→laranja; Z2 = azul protagonista de propósito) e legenda com chips e espaço — era tudo azul e apertado.
- ✅ **Escudo pós-almoço**: 90 min após registrar o almoço, o hero ganha borda âmbar + botão de 1 toque pro SOS doce (mesmo botão aparece no escudo das 15h). Dev: `?posalmoco=1`.

# Feito na v7.3 (jul/2026) — checkpoint, projeção, clima e resumo

- ✅ **Checkpoint como evento especial** (`CHECKPOINTS` em data.js: TESTE 29/07 + Tempo Run 23/09): slot contextual na véspera ≥17h (acima da revisão — a véspera cai sempre em terça) e no dia; sheet de ensino com a distribuição do esforço ("o teste se perde no km 1"); botão do guia no sheet do treino do dia; linha tracejada 🎯 nos gráficos de pace Z2 e EF. Dev: `?checkpoint=1`.
- ✅ **Projeção Pampulha 18k** (pedido dele, ciente da margem pré-teste): Riegel k=1.06–1.10 sobre o melhor esforço de prova das últimas 12 semanas (limpa, ≥4 km, FC ≥155) → faixa 1h56–2h02 hoje; recalibra sozinha a cada teste. Card fecha a seção CORRIDA.
- ✅ **Clima das janelas de treino**: `pipeline/clima.py` (open-meteo, sem chave, janelas 6h/19h hoje+amanhã) → `data/clima.json`; linha do treino no Hoje mostra a próxima janela com dica de calor (≥28°C: "FC infla, pace é consequência") e chuva (≥50%).
- ✅ **Resumo do mês compartilhável** no Relatório (adesão, deslizes vs baseline, treinos, corridas/km do historico, EF, peso, semanas até a prova) — navigator.share com fallback de clipboard.

# Feito na v7.4 (jul/2026) — revisão completa + proteção de dados

- ✅ Wizard de domingo agora tem 6 passos: novo **PASSO 2 · O ATLETA** (corridas feitas×planejadas + km da semana via historico.json, longão com pace/FC, academia X/Y, EF da semana) — o ritual passou a revisar o atleta inteiro. Dev: `?wizard=revisao&passo=N`.
- ✅ **Lembrete mensal de backup** no fechamento do wizard (>30 dias ou nunca): botão âmbar de export direto; função `exportarBackup()` unificada com Ajustes.
- ✅ **História dos checkpoints** na Evolução: card alvo × executado (pace/FC real do historico) para 29/07 → 23/09 → prova; só acende quando o primeiro teste rodar. Campo `alvo` em CHECKPOINTS.

# Feito na v7.5 (jul/2026) — confiabilidade e conforto

- ✅ **Toggle de tema** em Ajustes (Automático/Claro/Escuro): `settings.tema` + `aplicarTema()` (ajusta também os meta theme-color); `?tema=` de dev continua com precedência.
- ✅ **Saúde do sistema** (primeiro card de Ajustes): pipeline (status + idade da execução, alerta >26h), análises pendentes da semana, clima, token, backup — `checarSaude()`. **Bolinha âmbar no ⚙️** quando o pipeline está quebrado/parado >48h (`atualizarBadgeSaude()` no boot e no foco) — métrica velha nunca mais passa despercebida.
- ✅ **Guia de problemas** (sheet em Ajustes): o que fazer em cada falha em linguagem de usuário — garmin_auth (chamar o Claude, runbook no repo), quota da IA, análise que não chegou, app preso em versão velha (e o alerta de NUNCA limpar dados do site), métricas desatualizadas, troca de celular.

# Feito na v7.5.1 (jul/2026) — repo autossuficiente

- ✅ Pasta `garmin/` no repo: scripts locais de renovação do token (login-garmin.py + garmin_api.py) e de criação dos treinos estruturados (criar.py + treinos_*.py + garmin-criados.json), com README de uso no notebook. A VM onde o app nasceu foi descomissionada — o repo agora carrega tudo que o app precisa pra viver. Fora do repo de propósito: dados brutos de atividade (saúde pessoal, repo é público) e a CA corporativa (o garmin_api.py a detecta como opcional).

# Feito na v7.6 (jul/2026) — pipeline sobrevive ao Cloudflare + força no radar

- ✅ Troca OAuth1→OAuth2 do garth reimplementada com curl_cffi (TLS de Chrome): o Cloudflare da Garmin passou a bloquear o fingerprint do python-requests nos runners (429) e o pipeline "perdia o token" a cada 24h — a vida do OAuth2 — mesmo com o OAuth1 de 1 ano válido. Só trocar o User-Agent não bastou (testado 10/07). Classificação de erro agora separa 401 real (`garmin_auth`, renovar) de bloqueio 429/403 (`erro` transiente).
- ✅ Confirmação de 1 toque para treino de FORÇA, igual à de corrida: o pipeline também busca `strength_training` (campo `forcas` no historico.json, só data/duração — sem análise de IA) e o slot contextual oferece "marcar feito" quando o Garmin registrou força em dia com gym planejado sem check (dispensa em `settings.garminDispensadoGym_{date}`).
- ✅ Backup em dias de CALENDÁRIO: backup de ontem à noite aparecia como "backup hoje ✓" (floor de 24h) na saúde do sistema, no card de backup e no wizard — agora conta virada de dia (hoje/ontem/há Xd).

# Feito na v7.7 (jul/2026) — o treinador chegou na academia

- ✅ Análise de musculação fim-a-fim: pipeline busca as séries executadas (`/exerciseSets`), valida a **Progressão Dupla** por exercício (carga_up/reps_up/igual/ajuste/novo/pulado — fatos em funções puras `pipeline/forca.py`, 9 testes), detecta estagnação (≥3 sessões iguais) e skips recorrentes, respeita deload (derivado do "DELOAD" nas CORRIDAS) e a fase do mês, e gera 1 parecer Gemini por sessão (`SYSTEM_PROMPT_FORCA`: canelite/tibial, 0×0 = pulado de propósito, musculação serve à corrida, zero punição) em `data/forca-analises.json` (últimas 60; orçamento de quota compartilhado, corridas primeiro; força nunca derruba corrida).
- ✅ App: sheet do treino de gym ganha "SUA SESSÃO · GARMIN" (volume/séries/tempo, tabela de exercícios com badges de progressão, parecer da IA) + ✨ na linha do treino; botão 🛰️ virou "Buscar análise do último treino".

# Feito na v7.8 (jul/2026) — o passado da musculação visível

- ✅ Navegação de semanas na aba Treino: setas ‹ › no card Semana (+ chip "voltar para esta semana"); limite para trás = min(startKey, 1ª sessão de força do Garmin). Dias de semanas passadas continuam checáveis retroativamente; dia com sessão no Garmin sem check ganha contorno + ✨ no dot (EVIDÊNCIA — nunca marca feito sozinho) e o sheet mostra a sessão crua do historico.json quando não há parecer. Estado `semTreinoIni` entrou na cadeia do voltar (sheet → dia → semana → Hoje) e o auto-scroll do cronograma só roda sem seleção/navegação ativa.
- ✅ Grade FORÇA na Evolução (entre CORRIDA e CONSTÂNCIA): musculação por semana (até 16), colunas Ter–Sáb, célula feito/evidência/perdido/aberto, total X/5 com ✓ verde na semana completa — evidência não soma no total (confirmação é sempre manual). Toque numa semana abre a aba Treino já naquela semana. `gradeForca` pura em derive.js com 8 asserts novos.

# Feito na v7.9 (jul/2026) — flexível não é frouxo: doce planejado + modo viagem

- ✅ **Doce planejado** (pré-compromisso, molde do contrato da noite): declarado ANTES pelo sheet do doce (bifurcação planejar/registrar — registro retroativo NUNCA vira planejado, sem racionalização), evento `sweet {planejado: true}` sem gatilho. Não reseta anéis/jardim, não conta para never-miss-twice nem para os insights de deslize — mas CONTA no consumo do §4 (`metricasSemana.sweetPlanejado` anotado nos tiles). Teto de 1/semana com guarda suave (nunca bloqueia registrar a verdade). Badge no hero das 15h e linha na Dieta quando há um planejado. Base: deviações hedônicas planejadas (Coelho do Vale 2016), restrição flexível (Westenhoefer), prevenção do efeito violação da abstinência (Marlatt).
- ✅ **Modo viagem** (`settings.viagens = [{ini, fim}]`, card em Ajustes, liga/desliga sozinho): deslize em viagem não reseta anéis/streak (vira só dado de Relatório); dias de viagem saem da cobrança de treino (dots ✈️, grade FORÇA e cronograma neutros, planos descontados — treinou mesmo assim, conta) e da meta de refeições (CONSTÂNCIA/semana verde com meta ajustada 80%×dias cobrados); chip do header vira ✈️; Dieta vira modo manutenção com regras de sobrevivência; slot contextual mostra dica do dia (rotação determinística por dia da viagem) + guia completo (`VIAGEM_GUIA` em data.js — MATADOR, detraining, 1×1, fresh start); slot de volta com plano de reentrada; nota pós-viagem no gráfico de peso. Centralização: `ehDeslize`/`emViagem` em derive.js (o pattern sweet||gave_in estava repetido em 6 funções).

# Feito na v7.20 (jul/2026) — o checkpoint cede o slot + paces de agosto

- ✅ **Tiros recalibrados pelo teste de 5 km de 29/07** (5,03 km em 28:00 = 5:34/km, contra o 5:58/km submáximo que ancorava a tabela): 400 m `5:11–5:26` · 800 m–1 km `5:21–5:36` · 1,5 km `5:31–5:41`. Método: os offsets da tabela antiga sobre o pace de 5 km foram preservados e só o ancoradouro mudou (−24 s/km) — é a previsão escrita no próprio checkpoint ("vindo em 5:30–5:44/km, os tiros descem um degrau inteiro"). Os títulos das corridas de out/nov no calendário foram alinhados junto (senão o guia dizia um pace e o treino do dia outro); os tiros já corridos (15/07, 22/07) ficaram intactos como histórico. **Tempo Run ficou fora do escopo desta recalibragem** — feito logo em seguida, na v7.21.
- 🐛 **Checkpoint segurava o slot contextual o dia inteiro.** No dia do checkpoint o card "como executar" tinha prioridade sobre o card de confirmar a corrida do Garmin e saía com `return` — então, justo no dia mais importante do plano, a corrida analisada NUNCA aparecia na Hoje, e o único jeito de 1 toque de confirmar era exatamente o card suprimido (o gate só liberava com a corrida já marcada). Agora o card cede quando a análise do próprio dia está no ar, e também respeita `foiPulado` — era o QUINTO lugar da família de gates documentada no CLAUDE.md.
- 🐛 **`pushErro` evaporava no run seguinte.** O status é remontado a cada run e a chave só era escrita quando havia push a enviar: o 410 Gone gravado às 18:58 de 29/07 sumiu no cron das 19:22, que rodou sem análise nova — a saúde em Ajustes voltou a ficar limpa com a inscrição morta, o mesmo modo de falha silenciosa que a v7.16 tinha ido consertar. `notificar_push` agora devolve `(enviou, erro)` e `resolver_push_erro()` (pura, 6 testes) só limpa o erro numa ENTREGA de fato — run que não tentou carrega o diagnóstico.

# Feito na v7.21 (jul/2026) — limiar recalibrado junto

- ✅ **Tempo Run recalibrado** pelo mesmo teste de 5 km e o mesmo método da v7.20: a faixa era pace de 5 km +7 a +22 s (6:05–6:20 sobre o 5:58 submáximo) → **5:41–5:56** sobre o 5:34 real. Segue ~15-20 s/km mais lento que o pace de 5 km, que é onde o limiar deve cair; a FC (~163–170) manda e não mudou. Títulos alinhados: 02/09, 09/09 e 16/09 (`5:41–5:56`) e 18/11 (`5:46–5:56`, que tinha faixa própria +12 a +22). Os Tempo Run sem pace cravado (23/09 "checkpoint do alvo da prova", 30/09 "moderado") seguem relativos de propósito. Com isso o plano inteiro passa a falar do 5:34 — não sobrou pace ancorado no 5:58 em treino futuro.

# Feito na v7.22 (jul/2026) — o relógio falando a mesma língua do app

- ✅ **Alvo do checkpoint tem precedência no sheet do treino** (`cp?.alvo || g.pace`, com rótulo "· alvo do checkpoint"): dia de checkpoint tem alvo próprio que nem sempre é a faixa do tipo de corrida. O de 23/09 é ensaio de RITMO DE PROVA num dia tipado `tempo`, cuja faixa é de LIMIAR — o sheet mostrava 5:41–5:56 enquanto o card do checkpoint dizia 6:05–6:20, com o número errado em destaque.
- ✅ **Treinos estruturados do Garmin recalibrados** (16 datas futuras, 10 treinos) via `criar.py --atualizar`, modo novo: `atualizar_workout()` faz PUT preservando o `workoutId`, então todas as datas agendadas herdam o conteúdo novo — sem `--limpar`, sem apagar, sem reagendar. Tem `--dry-run` (não precisa nem de login) que imprime as faixas por passo e as datas futuras afetadas. Fora de propósito: `Tiros 6x400m` (só datas passadas — atualizar reescreveria histórico do relógio sem beneficiar nada) e `Tempo Run 6km CHECKPOINT`, que virou a constante pinada `TEMPO_CHECKPOINT` (usava `TEMPO` só porque a faixa antiga coincidia). Z1/Z2/Z3 (governados por FC) e RP/RP_LARGADA (Meta A dos 18k) intactos — não derivam do teste.

# Feito na v7.23 (jul/2026) — a semana até aqui + o histórico de todas elas

- ✅ **Balanço semanal no topo do Relatório** (`D.balancoSemana`, pura, 25 asserts novos): manchete +
  3 barras com **marca de ritmo** (onde a meta parcial está HOJE, não onde a semana termina) +
  UMA alavanca acionável pros dias que faltam. Duas regras que o card impõe: **maçã com maçã**
  (semana em curso só se compara com o MESMO PONTO da semana anterior — seg→qui vs seg→qui) e
  **nada é "perdido" antes do dia acabar** (o treino de hoje fica em `hojePendente`).
  Deslize vira **orçamento da semana** (§4: −50% do baseline), nunca "erro"; a manchete NUNCA é
  negativa (o que falta é papel da alavanca); quando a semana verde sai de alcance o alvo MUDA
  ("3 dias limpos fecham a semana") em vez de virar derrota.
- ✅ **Histórico de semanas** com uma linha por semana (números + ✍️ revisada + ✨ com leitura da IA)
  → sheet com o retrato inteiro: os números, o atleta (corridas/km/longão/força/EF), o comparativo
  no mesmo ponto e **a nota + o ajuste que você escolheu no domingo** — até aqui o `review` era
  gravado pelo wizard e nunca mais lido. Semana fechada sem revisão ganha atalho pro wizard.
- ✅ **Leitura da semana por IA** (opt-in, `settings.geminiKey` em Ajustes): chamada DIRETO do
  aparelho pro Gemini, com os números derivados da semana (sem nome, sem localização, sem evento
  bruto), cache em `settings.iaSemana` (12 semanas) e assinatura pra avisar "os números mudaram
  desde esta leitura". Não passa pelo pipeline de propósito — o repo é público e a semana carrega
  peso e deslizes. Roda sozinha ao fechar o wizard de domingo. Nunca é dependência: sem chave ou
  com erro, o balanço segue inteiro no narrador determinístico.
- ✅ Dev: `?semana=YYYY-MM-DD` abre o sheet do balanço daquela semana.

# Feito na v7.24 (jul/2026) — a leitura da semana ficou inteligente de verdade

- ✅ **Modelo escolhível** em Ajustes (`settings.iaModelo`), padrão **`gemini-3.5-flash`**: é o mais
  capaz da linha e, ao contrário do `gemini-2.5-pro`, TEM free tier (o Pro exige faturamento ativo
  no projeto — $1,25/M entrada, $10/M saída). Onde a família aceita, vai `thinkingConfig.thinkingLevel`;
  se a API reclamar do campo, a chamada repete sem ele em vez de falhar. Erro agora vira mensagem
  acionável por código (400 chave, 403 acesso ao modelo, 404 modelo inexistente, 429 quota).
- ✅ **Contexto muito mais rico** — modelo bom com contexto pobre continua pobre. Além da semana vão:
  as **6 semanas anteriores** em resumo (com o ajuste escolhido em cada domingo, pra ele ver se pegou),
  os **pareceres que a IA do pipeline já escreveu** sobre cada corrida/sessão da semana (pra cruzar com
  hábito, não repetir), **o que o plano cobra no resto da semana e na próxima**, o próximo checkpoint e
  os escalares de tendência (pace Z2, EF, cadência, projeção 18k — as séries ficam fora de propósito).
- ✅ Campo novo **`padrao`** no schema: a leitura que só aparece olhando várias semanas. Com instrução
  explícita de devolver vazio quando a amostra não sustenta — inventar padrão é pior que calar.
- ✅ A leitura guarda qual modelo a gerou (aparece no rodapé do bloco).
- ✅ **O pipeline de corrida/força também subiu de modelo**: `MODELO_GEMINI` agora sai da env
  `GEMINI_MODELO` (input novo do workflow) com padrão `gemini-3.5-flash` e **fallback automático**
  pro `gemini-2.5-flash` — `modelo_indisponivel` e `trocar_de_modelo` são puras e testadas (6 asserts):
  403/404 troca na hora, 400 só troca se a mensagem citar o modelo (400 genérico é payload nosso e
  trocar esconderia o bug), 429 troca só depois dos retries (costuma passar sozinho), 500/503 nunca.
  A troca acontece uma vez e vale pro resto do run. `pipeline-status.json` ganhou `modeloIA` e
  `modeloTrocou`, visíveis na linha de status em Ajustes.

# Feito na v7.25 (ago/2026) — a deriva cardíaca não vale em longão com bloco final

- ✅ **Ressalva da `derivaCardiacaPct` no prompt da IA + docstring da função.** Achado no longão de
  03/08 (12 km com 2 km finais em ritmo de prova, 30 °C): a métrica marcou **+3,0%** e a IA celebrou
  como "base aeróbica extremamente sólida" — mas a parte fácil tinha derivado de **134 bpm no km 1
  (6:42/km) para 149 bpm no km 8 (7:12/km)**, ou seja ~15 bpm mais lento E mais alto. A deriva compara
  METADES, e os 2 km de ritmo de prova (6:12/6:15 com FC quase igual) derrubam o custo por metro da
  2ª metade e mascaram a deriva real. Agora o prompt manda não celebrar o número quando o plano
  indicar bloco de qualidade no fim, e ler a deriva pelos splits fáceis (1º km vs o último antes do
  bloco). **Não filtramos o bloco no cálculo de propósito**: exigiria adivinhar onde ele começa, e
  quem sabe isso é o nome do treino no plano, que a IA já recebe.
- Contexto do mesmo dia, sem mudança de código: a FC de 149 bpm nos 2 km de ritmo de prova NÃO era
  erro de sensor (era cinta XOSS X2, e o histórico tem 6:05/km a 149 bpm em 20/05) — e os 190 de
  FCmax do modelo canônico estão certos, com 188 bpm registrados em 08/03, 28/06 e no teste de 29/07.

# Feito na v7.26 (ago/2026) — teste de 5 km em 30/09 pra recalibrar o bloco de outubro

- ✅ **Novo checkpoint "TESTE 5 km contrarrelógio" em 30/09**, no lugar do "Tempo Run 4 km moderado"
  (`data.js` CORRIDAS + CHECKPOINTS, `garmin/treinos_corrida.py` AGENDA). Motivo: os 5 × 800 de
  05/08 saíram **inteiros** dentro da faixa (5:22/5:22/5:27/5:31/5:26) a **32 °C**, com FC em Z3,
  só **4% de Z4**, TE anaeróbico **0,0**, e o atleta confirmou que aguentaria mais uma repetição —
  ou seja, o âncora de 5:34/km (teste de 29/07, a 30 °C e com os km do meio segurados) está
  conservador. Como o bloco de 1 km de outubro **reusa a mesma faixa** `TIRO_1K` (5:21–5:36), sem
  âncora nova ele nasce folgado.
- **Por que 30/09 e não meio de setembro** (a ideia inicial): setembro **não tem nenhum tiro** — o
  bloco acaba em 26/08 e só volta em 07/10, então o prazo real é "antes de 07/10". Somando as
  viagens de 18–26/08 e 31/08–04/09, um teste em 09 ou 16/09 mediria a viagem e não o preparo, e
  **âncora ruim é pior que âncora velho** (travaria outubro num pace pior que o de hoje). 30/09 dá
  4 semanas de treino consistente, cai em semana de DELOAD (perna fresca), não amassa o checkpoint
  de 23/09 — que é pinado como ensaio de ritmo de prova e não recalibra tiro — e pega BH seca.
- Descrição do treino no catálogo do relógio generalizada ("Define os paces de agosto" → "Árbitro
  dos paces do bloco seguinte"), já que o mesmo `workoutId` agora serve duas datas.
- ⏳ **Pendente pós-teste**: recalibrar `CORRIDA_GUIA.tiros`/`tempo` (data.js) e as constantes
  `TIRO_*`/`TEMPO*` (treinos_corrida.py) pelo mesmo método de 29/07 — offsets fixos preservados,
  só o âncora muda — e rodar `criar.py atualizar` nos nomes de `RECALIBRADOS`.

# Feito na v7.27 (ago/2026) — calendário reestruturado por fascite plantar

- **Contexto**: diagnóstico de fascite plantar em 12/08/2026, tratado com Betatrinta
  intramuscular. Corticoide depot tira a dor por ~2–4 semanas **sem curar a fáscia**, então o
  corte de treino tem que ser por calendário e não por sensação — é exatamente na janela sem dor
  que se rompe a fáscia.
- **Janela sem impacto: 17/08 a 04/09.** As datas viram tipo `leve` com bike / corrida na água
  funda. O custo real é baixíssimo: 19, 20, 24, 26/08 e 31/08, 02, 03/09 **já caíam** pelas
  viagens de 18–26/08 e 31/08–04/09. A lesão custa 1 treino de verdade — o longão de 17/08.
- **Retorno gradual a partir de 07/09**, com o longão subindo 8 → 10 → 12 → 10 (deload) → 14 →
  15 → 16 → 18 (a Volta Completa de 02/11 fica intacta). Setembro perde os tempo runs de 5 km:
  o primeiro estímulo forte é um tempo de 3 km em 23/09.
- **TESTE de 5 km: 30/09 → 07/10.** Contrarrelógio é carga máxima de antepé; em 30/09 cairia 3
  semanas depois de voltar a correr. O DELOAD acompanha (28/09 → 05/10) pra manter perna fresca
  no teste. O bloco de tiros anda 1 semana (14/10) e ainda cabem 5 sessões antes de 02/11.
- **Checkpoint de ritmo de prova: 23/09 → 30/09**, e encurtado de 6 para 5 km (4ª semana de volta).
- Reabilitação entra no lugar do volume: protocolo de alta carga (elevação de panturrilha com
  toalha sob os dedos, 3s/2s/3s, dia sim dia não) ancorado em Pernas A (qui) e Pernas B (sáb) —
  na viagem, versão com mochila. Alongamento de gastrocnêmio **e** sóleo, e o alongamento
  específico da fáscia antes do primeiro passo da manhã.
- **A prova de 06/12 não está em risco**: são 16 semanas e novembro fica inteiro.
- ⏳ **Pendente**: `criar.py` precisa desagendar do relógio as datas de 17/08 a 04/09 e reagendar
  o bloco novo — `garmin-criados.json` ainda aponta os treinos antigos (inclusive o TESTE em
  30/09). Cadastrar as viagens em Ajustes → modo viagem ANTES de sair (retroativo mexe em streak
  e jardim pra trás).
- ⏳ **Rever se a fascite não ceder até 07/09**: o retorno inteiro escorrega 1 semana e aí o teste
  de 5 km sai de outubro — nesse caso calibrar outubro por tempo run, sem contrarrelógio.

# v8 — ideias futuras

- Sincronizar peso automaticamente do Garmin (o FR165 já pesa via app? avaliar export).
- Gráfico de aderência semanal × ritmo de perda (correlação visível).
- Modo semana da prova (04–05/12): checklist de carga de carbo no slot contextual.
- Exportar resumo mensal em texto para compartilhar.

# Descartado de propósito (não ressuscitar sem motivo)

- Streak clássica que zera no 1º erro — contradiz o protocolo (3B.6, §4).
- Níveis/XP/badges/mascotes — recompensa aqui é evidência de dados, não decoração.
- Editor de cardápio no app — o plano é estático nos MDs; isso viraria app genérico de dieta.
- Inventário da prateleira de emergência — chore diária que desatualiza e mina a confiança do SOS.
- Ativação automática do Modo Ressaca — sempre oferta de 1 toque, nunca automática.
- Cards permanentes novos na tela Hoje — tudo condicional disputa o slot contextual único.
