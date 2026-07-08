# Rotina — contexto completo para manutenção e novas funcionalidades

> **Nome**: o app se chama **Rotina** desde a v7.1 (antes "Pampulha" — renomeado porque o nome
> não expressava o que o app faz; "Pampulha" agora se refere só à prova). Os identificadores
> internos continuam `pampulha` de propósito (localStorage `pampulha.v1`, `app: 'pampulha'` no
> export JSON, `.card-pampulha`, sentinela do history) — NÃO renomeie: a chave do storage
> carrega todos os dados do usuário.

> Leia este arquivo INTEIRO antes de mexer em qualquer coisa. Ele existe porque o app foi
> construído em várias iterações com decisões de design deliberadas — várias coisas que
> parecem "faltando" ou "estranhas" são escolhas intencionais documentadas aqui.

## O que é

PWA pessoal (usuário único: Guilherme, Tech Lead frontend, 31 anos, BH) que **executa** dois
documentos — não os substitui:

- `~/habitos/Protocolo-Habitos.md` — protocolo de engenharia de hábitos (Fogg B=MAP, Atomic
  Habits/Clear, TCC/prevenção de recaída). Três gatilhos: **iFood noturno** (fadiga de decisão),
  **doce por ansiedade no trabalho**, **álcool social + efeito dominó da ressaca de 36h**.
- `~/dieta/Dieta-Resumo-Rapido.md` + `~/dieta/Plano-Nutricional-Completo.md` — 5 refeições/dia,
  tipos de dia por dia da semana, fases do calendário.
- `~/treino-pampulha/plano-hibrido-pampulha.md` — plano híbrido corrida+musculação rumo à
  **Volta Internacional da Pampulha 18k em 06/12/2026** (o arco narrativo de tudo).

**Esses MDs são a fonte da verdade.** Os dados deles estão transcritos em `data.js` (cardápio,
calendário de 67 corridas, exercícios de academia, paces). Se o usuário mudar o plano, atualize
`data.js` a partir dos MDs — nunca invente valores nem crie um "editor de dieta" no app.

## Stack e arquivos

Vanilla JS com ES modules. **Zero build, zero dependências, zero backend.** pt-BR em toda a UI.

| Arquivo | Papel |
|---|---|
| `index.html` | shell: header (chip do dia + ⚙️ Ajustes — o countdown saiu na v6.2: a strip da Pampulha na Hoje faz esse papel), `#conteudo`, FAB SOS, nav de 5 abas (Hoje·Dieta·Treino·Evolução·Relatório) |
| `styles.css` | tokens de cor (paleta validada p/ daltonismo, claro+escuro), todos os componentes |
| `data.js` | constantes do plano: refeições, tipos de dia, corridas, treinos gym, paces, scripts SOS |
| `derive.js` | **funções puras** (sem DOM/storage) — toda regra de negócio derivável. Testável via node |
| `store.js` | localStorage `pampulha.v1`, eventos append-only, export/import JSON |
| `app.js` | UI inteira: renders por aba, sheets, overlays, SOS, seed de demo. `VERSAO_APP` no topo |
| `sw.js` | service worker cache-first; `VERSAO` versiona o cache |
| `test/test-derive.mjs` | ~55 asserts das funções de `derive.js` — `node test/test-derive.mjs` |
| `TODO.md` | histórico do que foi feito por versão, ideias futuras e **ideias descartadas de propósito** |

## Modelo de dados (localStorage `pampulha.v1`)

```js
{ schema: 1, createdAt, events: [...], settings: {...} }
```

Eventos são **append-only** com `id` e `ts` (timestamp real — usado pelos contadores ao vivo e
pelo mapa gatilho×período). Tipos:

- `meal {date, meal: cafe|lanche1|almoco|lanche2|jantar, status: ok|sub|skip|off|none}` — **último vence** (corrigir = novo evento)
- `delivery {date, trigger?}` · `sweet {date, trigger?}` — deslizes; trigger ∈ GATILHOS (2C do protocolo)
- `night_out {date, drinks}` — fecha contrato se houver
- `sos {date, kind: ifood|doce, outcome: surfed|gave_in, trigger?}` — `gave_in` CONTA como deslize do tipo
- `weight {date, valor}` · `waist {date, valor}` — último do dia vence
- `hangover_on/off/step/dismiss {date, step?: agua|cafe|caminhada}`
- `contract {date, maxDrinks, horaSaida, lancheAntes}` · `contract_tick {date, kind: drink|agua}` · `contract_cancel`
- `review {week: dateKey da segunda, nota?, ajuste?}` — revisão de domingo
- `workout {date, kind: corrida|gym, done}` — último vence

`settings`: `baseline {delivery, sweet, drinks}`, `dayTypeOverrides {date: TIPO}`, `startKey`
(primeira data de uso — âncora dos contadores), `lastBackupTs`, `lembretes {lanche, revisao}`,
chaves `notifLanche_*`/`notifRevisao_*` (guarda de notificação disparada).

## Regras de negócio críticas (implementadas em `derive.js`, cobertas por testes)

- **Semana começa na SEGUNDA** (`inicioSemana`) — o plano gira em torno do Longão de segunda.
- **Tipos de dia**: Seg/Qua/Qui INTENSO · Ter/Sex MODERADO · Sáb LEVE · Dom DESCANSO. **Regra de
  ouro: o JANTAR de domingo é INTENSO** (pré-carga do Longão — nunca cortar esse carbo).
- **Fases**: déficit até 04/10 → manutenção a partir de 05/10 → carga de carbo 04–05/12 → prova
  06/12. Metas kcal mudam por fase (`METAS_DIA`).
- **Never miss twice (3B.6)**: a streak resiliente SÓ quebra com deslizes em 2 dias consecutivos.
  Deslize isolado = estado "amassado" (âmbar) por 24h, streak continua. Recuperações são contadas
  como conquista. `contadorResiliente` implementa isso.
- **Métricas semanais (§4)**: delivery/sem, doces/sem (metas = −50% do baseline), drinks/saída
  (meta ≤ 3). Calculadas dos eventos, nunca digitadas.
- **Peso**: a média móvel de 7 dias é a protagonista; pontos crus são esmaecidos. Corredor
  saudável −0,3 a −0,5 kg/sem que ACHATA após 04/10. Ganho na semana da prova = glicogênio, não
  gordura (o gráfico anota isso).
- **Semana verde de constância** = ≥28/35 refeições (80%) — nunca exigir 35/35.
- **Contrato da noite**: vale da criação até 06h do dia seguinte; fecha com `night_out`.
- **Dominó quebrado** (dia de ressaca vitorioso) = 3 passos do script + ≥4/5 refeições.

## Princípios de design — NÃO REGREDIR

Estes vieram de feedback real do usuário e de um protocolo clínico. Violar qualquer um é bug:

1. **Zero linguagem punitiva.** Nada de vermelho em deslize, nada de "falhou", streak nunca
   "zera" na cara do usuário. Deslize registrado recebe resposta factual + lembrete do
   never-miss-twice. Culpa é o que transforma 1 deslize no dominó de 36h.
2. **A home responde "o que eu faço AGORA" em 2 segundos.** Desde a v6 a Hoje é um dashboard
   canônico: UM hero (refeição da vez; à noite, com jantar fechado, vira "colheita do dia") +
   linhas de altura única (fresh start de segunda, treino de hoje, anel do marco, peso matinal)
   + slot contextual. **Esse layout é o teto — nenhuma funcionalidade nova ganha card ou linha
   permanente na Hoje**; tudo condicional disputa o *slot contextual único* (prioridade:
   ressaca > contrato > fechar contrato de ontem > checkpoint do plano (véspera ≥17h/dia —
   antes da revisão de propósito: a véspera cai sempre em terça, onde a revisão pendente ainda
   mora) > revisão pendente > corrida do Garmin a confirmar), no máximo 1 visível por vez. A trilha das 5 refeições e o cardápio moram na aba
   Dieta.
3. **Sem gestos escondidos.** O usuário reclamou de toque longo — toda ação secundária tem
   affordance visível (botão `›`, sheet). Toque simples = ação primária óbvia.
4. **Recompensa = evidência de dados, não decoração.** Sem XP, níveis, badges, mascotes
   (decisão explícita, ver TODO.md). As recompensas são: jardim generativo, anéis com tempo vivo,
   recordes, heatmaps, frase de identidade que "assina" com 4 domingos de revisão. Desde a v6.1
   a recompensa é sempre NOMEADA E VISÍVEL antes de ser ganha: `legendaJardim` (miniaturas SVG
   de folha/flor/estrela + "próxima flor em Xd") vive no overlay e no card do jardim, e o
   dashboard diz o que o próximo marco entrega — feedback do usuário: saber O QUE ganha é o
   que gera desejo.
5. **O jardim é determinístico** — função pura dos dados (dia limpo = folha, marco = flor, onda
   surfada = estrela). `Math.random()` em render é proibido (o jardim mudaria a cada abertura).
6. **Custo de registro mínimo**: caminho feliz do dia = ~6 toques, zero digitação. Qualquer
   funcionalidade que adicione digitação obrigatória diária vai ser abandonada.
7. **Gráficos**: nunca dois eixos Y num gráfico; um matiz por série; texto nunca na cor do dado;
   tendência > valor bruto. A paleta em `styles.css` foi validada para daltonismo — use os tokens
   (`--serie-1`, `--seq-*`, `--grad`...), não invente hex novos.
8. **SOS ≠ Registrar**: SOS é "a vontade bateu AGORA" (prevenção, urge surfing de 10 min);
   Registrar é "já aconteceu" (dado). Manter os dois eixos separados e com cross-link.
9. Estética de referência do usuário: app **SugarCut** (Android) — anéis, gradientes, números
   grandes, dark. Gradiente da marca: `--grad` (azul→aqua). Ele acha telas cheias de card
   confusas — na dúvida, esconda atrás de 1 toque.
10. **O voltar do Android fecha uma camada por vez** (sheet/overlay → dia selecionado no
   Treino → aba Hoje → sai do app; padrão Material de bottom nav). Mecânica: entrada-sentinela
   no history (`protegerVoltar`/`popstate` no app.js). Todo overlay novo que usar
   `document.body.appendChild` DEVE chamar `protegerVoltar()` ao abrir — senão o voltar fecha
   o app no meio do fluxo.

## Deploy e ambiente — PEGADINHAS IMPORTANTES

- **Hospedagem**: GitHub Pages do repo público `guirangel17/habitos-app` (conta PESSOAL
  guirangel17 — nunca usar contas/servidores GitHub corporativos para este projeto).
  URL: `https://guirangel17.github.io/habitos-app/`. Branch `main`, raiz.
- **Atenção à rede**: o servidor onde este app foi criado ficava numa rede restritiva que
  bloqueava `api.github.com` (logo o `gh` CLI não funcionava para github.com), SSH (22 e 443) e
  `*.github.io`. Se os mesmos sintomas aparecerem (connection reset nesses hosts), o caminho que
  funciona é git puro via HTTPS para `github.com` — e a verificação da URL publicada é feita no
  celular do usuário. Em rede normal, nada disso se aplica e o `gh` pode ser usado à vontade.
- **Push**: credencial (fine-grained PAT) em `~/.git-credentials` via credential.helper store.
  Se expirar (criado ~jul/2026, 90 dias), o usuário gera outro token no navegador
  (Settings → Developer settings → fine-grained, repo `habitos-app`, Contents: RW) e refaz:
  `printf "https://guirangel17:TOKEN@github.com\n" > ~/.git-credentials`.
- **Commits**: `git -c user.name="Guilherme Moura" -c user.email="guirangel17@users.noreply.github.com" commit`.
- **A CADA DEPLOY que muda arquivos do shell: bumpar `VERSAO` em `sw.js` E `VERSAO_APP` em
  `app.js` (mantêm-se em sincronia).** Sem isso o service worker cache-first nunca entrega a
  versão nova. O CDN do Pages segura ~10 min. Desde a v6.3 o app checa update ao voltar ao
  foco (`visibilitychange` → `reg.update()`) e **recarrega sozinho** quando o SW novo assume
  (`controllerchange` → `location.reload()`; com sheet/overlay aberto, avisa por snackbar) —
  antes disso, "fechar e abrir" NÃO atualizava: PWA standalone no Android não morre ao fechar
  e a página continuava rodando o shell velho. Fallback manual: Ajustes → Buscar atualização.
  A versão instalada aparece em Ajustes.
- Dados do usuário ficam SÓ no aparelho dele (localStorage) — deploy nunca afeta dados. Backup =
  export JSON em Ajustes.
- **Debug de "app preso na versão velha" (aprendido na v7.1)**: (1) da rede restritiva dá para
  verificar o deploy SEM acessar *.github.io: as páginas web de `github.com` funcionam via
  WebFetch — `…/actions/workflows/pages/pages-build-deployment` lista os builds e a página de
  um run individual mostra o commit deployado. (2) Pedir ao usuário para CLICAR num link do
  escopo do app não testa nada: o Android abre o link dentro do PWA instalado (service worker
  velho responde) — o teste válido é **guia anônima** no Chrome (não usa SW) abrindo
  `…/habitos-app/sw.js`. (3) Se o SW travar mesmo com o servidor certo:
  `chrome://serviceworker-internals` → Unregister no escopo do app é seguro (não toca no
  localStorage); fechar e reabrir o app com internet reconstrói tudo. NUNCA "limpar dados do
  site" — apaga os dados do usuário. (4) Lembrar que o update chegando com sheet/overlay
  aberto não recarrega sozinho (só snackbar) — testar atualização parado na aba Hoje.

## Pipeline de análise de corridas (v7) — Garmin → Gemini → data/*.json

Terminou a corrida → GitHub Actions busca no Garmin, o Gemini analisa e o app exibe.

- **Arquivos**: `pipeline/analisar.py` (o pipeline; funções puras testadas em
  `pipeline/test_analisar.py` — `python3 pipeline/test_analisar.py`), `pipeline/dump-plano.mjs`
  (data.js → plano.json, fonte única do calendário), `.github/workflows/analisar-corridas.yml`
  (dispatch + crons nas janelas de treino BRT). Saídas commitadas: `data/analises.json`,
  `data/historico.json` (+ tendências), `data/pipeline-status.json` (Ajustes lê).
- **Auth Garmin**: garth 0.8.0 (pinado; deprecado mas funcional) via Secret `GARMIN_TOKEN` —
  o garth auto-autentica pela env `GARTH_TOKEN`. Token OAuth1 vive ~1 ano. **Runbook quando
  status=garmin_auth**: local `cd ~/treino-pampulha/garmin && python3 login-garmin.py`, depois
  `python3 -c "import garth; garth.resume('~/.garth'); print(garth.client.dumps())"` e colar no
  Secret. Secret `GEMINI_API_KEY` = chave do AI Studio.
- **Zonas de FC CANÔNICAS** (nunca usar as do Garmin/Connect — variam com a config do relógio):
  FCmax 190 → Z1 <133 · Z2 133–152 · Z3 153–165 · Z4 166–177 · Z5 178+ (const `ZONAS_FC` no
  analisar.py, espelha plano-hibrido-pampulha.md). Calculadas da série temporal de FC
  (endpoint `details`); **lat/lon são descartados na leitura e NUNCA entram nos JSONs**.
- **Tom da IA**: system prompt com as regras do plano (Z2 por FC manda nos fáceis; tiros por
  splits, nunca pace médio) e zero linguagem punitiva — mesma regra do app (princípio 1).
- **Disparo rápido**: o app dispara `workflow_dispatch` e lê os JSONs pela API do GitHub usando
  um PAT fine-grained (repo habitos-app, Actions RW + Contents R) salvo em `settings.garminPat`
  (SÓ no aparelho, nunca commitado). Sem PAT, tudo degrada pros crons + fetch via Pages.
- **Pegadinha**: `sw.js` faz network-first para `/data/` (cache-first congelaria as análises).
- **v7.3**: `tendencias.projecao18k` = Riegel (k 1.06–1.10) do melhor esforço de prova das
  últimas 12 semanas (limpa, ≥4 km, FC média ≥155) — recalibra sozinha quando teste/prova nova
  chega; `pipeline/clima.py` (open-meteo BH, sem chave) grava `data/clima.json` com as janelas
  6h/19h de hoje+amanhã no mesmo workflow — o app mostra a PRÓXIMA janela na linha do treino.
- Confirmação de treino feito é SEMPRE 1 toque (slot contextual, prioridade mais baixa) — nunca
  automática. Dispensa fica em `settings.garminDispensado_{date}`.

## Fluxo de desenvolvimento e verificação

```bash
cd ~/habitos-app
python3 -m http.server 8741          # servir local
node test/test-derive.mjs            # testes das regras (mantenha-os passando e ADICIONE para regra nova)
node --check app.js                  # sanity de sintaxe
```

**Parâmetros de dev** (query string): `?hoje=2026-07-07&agora=15:30` (simular data/hora — TODA
lógica de tempo passa por `hojeKey()`/`agora()`, nunca use `new Date()` direto em lógica),
`?seed=1` (dados demo em store vazio), `?aba=hoje|dieta|treino|evolucao|relatorio|ajustes`,
`?tema=dark|light`, `?sos=ifood|doce&passo=N`, `?ressaca=1`, `?wizard=revisao`, `?contadores=1`,
`?contrato=1`, `?detalhe=gym|corrida`, `?dia=YYYY-MM-DD` (dia selecionado na semana do Treino),
`?posalmoco=1` (registra café/lanche1/almoço agora → escudo pós-almoço no hero; use `hoje` = data
REAL, senão o delta de 90 min entre ts real e relógio simulado esconde o escudo),
`?checkpoint=1` (abre o guia do próximo checkpoint — CHECKPOINTS em data.js).

**Screenshots headless** (o Chrome clampa janela em ~500px; o truque é scale factor 2):
```bash
google-chrome --headless=new --disable-gpu --no-sandbox --force-device-scale-factor=2 \
  --window-size=780,3000 --hide-scrollbars --virtual-time-budget=3500 \
  --screenshot=out.png "http://localhost:8741/?seed=1&hoje=2026-07-07&tema=dark"
```
(emojis viram tofu no headless — é só fonte faltando, no Android renderiza). Ícones do app:
gerados com PIL (`python3` + Pillow disponíveis). Sempre olhe o screenshot antes de publicar —
os dois temas se a mudança mexe em CSS.

## Mapa do app (v6, jul/2026)

- **Hoje (dashboard)**: slot contextual (máx 1) → hero da refeição da vez (badge anti-doce 16h,
  badge ouro domingo, ajuste por tipo de dia, placar X/5 no rótulo; à noite com jantar fechado
  vira **colheita do dia** — peak-end: refeições, treino, dia limpo→jardim, marco) → linha de
  **abertura de semana** (só segunda <12h — fresh start: recomeço ou momentum de semanas verdes)
  → linha **treino de hoje** (check por modalidade + › para a aba Treino) → aviso
  never-miss-twice (só quando acionável) → card **TEMPO LIMPO** com os 2 anéis AO VIVO
  (dias + hh:mm:ss, ticker de 1s em `hojeTimer` — sempre `clearInterval` no `render()`; arco =
  frac do próximo marco; rodapé "próxima conquista: flor em Xd"; toque → overlay) → **strip da
  Pampulha** (gradiente `--grad`, semanas restantes + barra de % do caminho; toque → Evolução)
  → peso contextual (manhã) → "+ Registrar" (sheet: peso/delivery/doce/noite fora + link SOS).
  O hero da refeição é COMPACTO de propósito (v6.1: a dieta não pode dominar o dashboard).
- **Dieta**: contexto do dia (tipo + kcal/macros da fase + porquê) → trilha de 5 marcadores
  (migrada da Hoje; toque → sheet da refeição) → cardápio de hoje inteiro (principal + ajuste
  do tipo + badge ouro domingo) → semana em números (3 métricas §4, movidas da Evolução +
  refeições X/35 com selo verde a 28). 100% read-only sobre data.js — NUNCA vira editor.
- **Modo Ressaca**: sequestra a Hoje por 24h; checklist de zero decisões; completo = "dominó
  quebrado". Oferecido (nunca automático) na manhã após `night_out`.
- **SOS** (FAB + atalho do ícone PWA): iFood/doce = script do §5 passo a passo + suspiro
  fisiológico animado + timer-onda de 10 min; desfecho surfed/gave_in + chip de gatilho.
- **Treino**: Semana (7 dias como BOTÕES — tocar troca o card de baixo para "Treino de terça ·
  15/07" com chip "‹ voltar para hoje"; dia passado = check retroativo, dia futuro = read-only
  com `›`; estado `diaTreinoSel`, resetado ao trocar de aba) → Treino do dia (checks + `›` com
  exercícios/série×reps + fase de periodização do mês, ou guia de pace da corrida) → linha
  "🛰️ Buscar análise da última corrida" (só com PAT; vira "analisando…" durante o polling) →
  Cronograma das 67 corridas (tick + `›` por linha, ✨ quando há análise do Garmin — o sheet
  da corrida ganha a seção SUA CORRIDA: stats, zonas canônicas, splits e parecer da IA).
- **Evolução**: hero gradiente com rota até a prova (semanas pintadas) → jardim (toque → overlay
  de anéis ao vivo) → IDENTIDADE (frase + 4 evidências) → CORPO (tiles + gráficos peso/cintura)
  → CORRIDA (v7: pace em Z2 ao longo do tempo + VO2max + cadência/volume; v7.2: eficiência
  aeróbica m/batimento até Z3, volume semanal 12 sem, longão do mês com régua dos 18 km — tudo
  lendo historico.json, só aparece com dados do pipeline. Corridas sociais >10% paradas ficam
  fora das tendências de pace/cadência/EF de propósito, mas contam no volume) → CONSTÂNCIA (linhas semanais, ✓ verde a
  28/35) → PADRÕES (ajuste da última revisão + gatilho×período quando ≥2 sem de dados, senão
  barras). As métricas da semana atual moraram aqui até a v5 — hoje vivem na aba Dieta.
- **Relatório**: seletor de período (30/90/tudo) → placar com deltas vs período anterior (iFood, doces, drinks/saída, adesão %, treinos %, Δ peso) → insights automáticos COM GUARDA DE AMOSTRA MÍNIMA que testam as teses do protocolo (lanche 16h × doce; saída × adesão do dia seguinte; taxa de sucesso do SOS; semana verde × Δ peso; R$ economizados vs baseline) → deslizes por dia da semana (barras empilhadas delivery/doce) → totais desde o início. Insights usam `diasObservados` (dia com ≥1 refeição registrada) para não contar dias sem uso do app.
- **Ajustes** (acessível pelo ⚙️ no header, NÃO pela nav — decisão de UX da v6: destino de
  manutenção ~1×/semana não merece slot na zona do polegar; 6 abas não cabem bem em 360px):
  baseline, override do tipo de dia, backup export/import, lembretes opt-in (best-effort, sem
  push server — dependem do app aberto), versão + buscar atualização.
- **Wizard de revisão** (domingo ≥18h até terça): 5 passos — métricas prontas → gatilhos →
  1 pergunta → 1 ajuste de AMBIENTE (lista do protocolo) → frase de identidade.

## Ideias futuras e descartadas

Ver `TODO.md` — tem a lista v5 e, mais importante, as **ideias descartadas de propósito** com o
motivo. Não ressuscite nenhuma sem checar o porquê (ex.: streak que zera, XP/badges, editor de
cardápio, ressaca automática, notificação como dependência).

## Sobre o usuário

Fala português; é dev sênior — aceita (e prefere) explicação técnica honesta. Feedbacks dele
moldaram o app: "muita coisa na tela" → v2; "cadê horas/minutos + SugarCut" → v3; "quero ver o
treino completo + Evolução feia" → v4. Quando pedir funcionalidade grande, ele gosta de plan
mode + workflows com múltiplas perspectivas antes de codar. Teste real dele: instala no Android
(Chrome) e usa no dia a dia — a prova final é sempre no aparelho dele, não no servidor.
