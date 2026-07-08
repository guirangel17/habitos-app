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
