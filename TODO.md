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

# v7 — ideias futuras

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
