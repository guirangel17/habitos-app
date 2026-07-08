# Pampulha 🌊

PWA pessoal de adesão ao protocolo de engenharia de hábitos + plano alimentar, rumo à **Volta da Pampulha 18k (06/12/2026)**.

Não é um habit tracker genérico — é um **painel de execução** de um protocolo específico (Fogg B=MAP, Atomic Habits, TCC/prevenção de recaída):

- **Hoje** — 5 refeições do plano com 1 toque (tipo de dia auto-inferido pelo calendário do plano, incluindo a regra de ouro do jantar de domingo), contadores resilientes *never miss twice* (deslize isolado não zera; só dois seguidos), registro de eventos sem culpa, peso em 2 toques.
- **SOS** — cartão de emergência interativo: scripts se-então um passo por tela + timer de *urge surfing* de 10 minutos em forma de onda.
- **Modo Ressaca** — o dia vira um script de zero decisões; completar = "dominó quebrado" (vitória, não dia perdido).
- **Evolução** — peso/cintura com média móvel de 7 dias protagonista e corredor de −0,3 a −0,5 kg/sem, métricas semanais do protocolo com metas de −50%, heatmap de constância, capital acumulado (ondas surfadas, dominós quebrados, recuperações).

## Stack

HTML/CSS/JS vanilla, ES modules, sem build e sem dependências. Dados 100% locais (`localStorage`) com export/import de backup JSON. Service worker cache-first (offline total).

## Rodar local

```bash
python3 -m http.server 8741
# http://localhost:8741
```

Parâmetros de dev: `?hoje=2026-07-07&agora=15:30` (simular data/hora), `?seed=1` (dados de demonstração num store vazio), `?aba=evolucao`, `?tema=dark|light`, `?sos=doce&passo=3`, `?ressaca=1`, `?wizard=revisao`, `?contrato=1`, `?contadores=1`, `?aba=treino`, `?detalhe=gym|corrida`.

Testes das funções de derivação: `node test/test-derive.mjs`.

## Instalar no celular (Android)

Abrir a URL publicada no Chrome → menu ⋮ → **Adicionar à tela inicial**.

## Deploy

GitHub Pages a partir do branch `main` (raiz). Ao mudar arquivos do shell, **bumpar `VERSAO` em `sw.js`** para o update chegar nos aparelhos.
