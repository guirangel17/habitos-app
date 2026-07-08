# Pampulha — contexto completo para manutenção e novas funcionalidades

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
| `index.html` | shell: header (chip do dia + countdown), `#conteudo`, FAB SOS, nav de 4 abas |
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
2. **A home responde "o que eu faço AGORA" em 2 segundos.** UM hero (a refeição da vez), trilha
   compacta, linhas discretas. **Nenhuma funcionalidade nova ganha card permanente na Hoje** —
   tudo condicional disputa o *slot contextual único* (prioridade: ressaca > contrato > fechar
   contrato de ontem > revisão pendente), no máximo 1 visível por vez.
3. **Sem gestos escondidos.** O usuário reclamou de toque longo — toda ação secundária tem
   affordance visível (botão `›`, sheet). Toque simples = ação primária óbvia.
4. **Recompensa = evidência de dados, não decoração.** Sem XP, níveis, badges, mascotes
   (decisão explícita, ver TODO.md). As recompensas são: jardim generativo, anéis com tempo vivo,
   recordes, heatmaps, frase de identidade que "assina" com 4 domingos de revisão.
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

## Deploy e ambiente — PEGADINHAS IMPORTANTES

- **Hospedagem**: GitHub Pages do repo público `guirangel17/habitos-app` (conta PESSOAL
  guirangel17 — **NUNCA** usar o GitHub da Adtran/`github.adtran.com` para este projeto).
  URL: `https://guirangel17.github.io/habitos-app/`. Branch `main`, raiz.
- **O firewall da Adtran (rede do servidor) bloqueia**: `api.github.com` (logo `gh` CLI NÃO
  funciona para github.com), SSH (22 e 443) e `*.github.io` (não dá para verificar a URL daqui —
  o teste é no celular do usuário). **Funciona**: git via HTTPS para `github.com`.
- **Push**: credencial (fine-grained PAT) em `~/.git-credentials` via credential.helper store.
  Se expirar (criado ~jul/2026, 90 dias), o usuário gera outro token no navegador
  (Settings → Developer settings → fine-grained, repo `habitos-app`, Contents: RW) e refaz:
  `printf "https://guirangel17:TOKEN@github.com\n" > ~/.git-credentials`.
- **Commits**: `git -c user.name="Guilherme Moura" -c user.email="guirangel17@users.noreply.github.com" commit`.
- **A CADA DEPLOY que muda arquivos do shell: bumpar `VERSAO` em `sw.js` E `VERSAO_APP` em
  `app.js` (mantêm-se em sincronia).** Sem isso o service worker cache-first nunca entrega a
  versão nova. O CDN do Pages segura ~10 min; no celular: fechar e abrir o app 2×, ou
  Ajustes → "Buscar atualização". A versão instalada aparece em Ajustes.
- Dados do usuário ficam SÓ no aparelho dele (localStorage) — deploy nunca afeta dados. Backup =
  export JSON em Ajustes.

## Fluxo de desenvolvimento e verificação

```bash
cd ~/habitos-app
python3 -m http.server 8741          # servir local
node test/test-derive.mjs            # testes das regras (mantenha-os passando e ADICIONE para regra nova)
node --check app.js                  # sanity de sintaxe
```

**Parâmetros de dev** (query string): `?hoje=2026-07-07&agora=15:30` (simular data/hora — TODA
lógica de tempo passa por `hojeKey()`/`agora()`, nunca use `new Date()` direto em lógica),
`?seed=1` (dados demo em store vazio), `?aba=hoje|treino|evolucao|ajustes`, `?tema=dark|light`,
`?sos=ifood|doce&passo=N`, `?ressaca=1`, `?wizard=revisao`, `?contadores=1`, `?contrato=1`,
`?detalhe=gym|corrida`.

**Screenshots headless** (o Chrome clampa janela em ~500px; o truque é scale factor 2):
```bash
google-chrome --headless=new --disable-gpu --no-sandbox --force-device-scale-factor=2 \
  --window-size=780,3000 --hide-scrollbars --virtual-time-budget=3500 \
  --screenshot=out.png "http://localhost:8741/?seed=1&hoje=2026-07-07&tema=dark"
```
(emojis viram tofu no headless — é só fonte faltando, no Android renderiza). Ícones do app:
gerados com PIL (`python3` + Pillow disponíveis). Sempre olhe o screenshot antes de publicar —
os dois temas se a mudança mexe em CSS.

## Mapa do app (v4.2, jul/2026)

- **Hoje**: slot contextual (máx 1) → hero da refeição da vez (badge anti-doce 16h, badge ouro
  domingo, ajuste por tipo de dia) → trilha de 5 marcadores → aviso never-miss-twice (só quando
  acionável) → linha de tempo limpo ao vivo (toque → overlay) → peso contextual (manhã) →
  "+ Registrar" (sheet: peso/delivery/doce/noite fora + link SOS).
- **Modo Ressaca**: sequestra a Hoje por 24h; checklist de zero decisões; completo = "dominó
  quebrado". Oferecido (nunca automático) na manhã após `night_out`.
- **SOS** (FAB + atalho do ícone PWA): iFood/doce = script do §5 passo a passo + suspiro
  fisiológico animado + timer-onda de 10 min; desfecho surfed/gave_in + chip de gatilho.
- **Treino**: Semana (dots + academia X/5, corrida X/3) → Treino de hoje (checks + `›` com
  exercícios/série×reps + fase de periodização do mês, ou guia de pace da corrida) → Cronograma
  das 67 corridas (tick + `›` por linha, auto-scroll para a próxima).
- **Evolução**: hero gradiente com rota até a prova (semanas pintadas) → jardim (toque → overlay
  de anéis ao vivo) → IDENTIDADE (frase + 4 evidências) → CORPO (tiles + gráficos peso/cintura)
  → HÁBITOS DA SEMANA (3 métricas §4) → CONSTÂNCIA (linhas semanais, ✓ verde a 28/35) → PADRÕES
  (ajuste da última revisão + gatilho×período quando ≥2 sem de dados, senão barras).
- **Ajustes**: baseline, override do tipo de dia, backup export/import, lembretes opt-in
  (best-effort, sem push server — dependem do app aberto), versão + buscar atualização.
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
