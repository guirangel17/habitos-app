#!/usr/bin/env python3
"""Pipeline de análise de corridas: Garmin Connect → Gemini → data/*.json.

Roda no GitHub Actions (a env GARTH_TOKEN autentica o garth sozinho — ver
workflows/analisar-corridas.yml) ou localmente (export GARTH_TOKEN=..., ou
~/.garth; nesta VM a Garmin só responde com o túnel SOCKS na porta 1080).

Saídas (commitadas pelo workflow, servidas pelo GitHub Pages ao PWA):
  data/analises.json        análise por corrida (stats + parecer da IA)
  data/historico.json       todas as corridas (métricas compactas) + tendências
  data/pipeline-status.json saúde do pipeline (exibido em Ajustes no app)

Sem GPS em lugar nenhum: da série temporal só a FC é extraída; lat/lon são
descartados na leitura e nunca tocam os JSONs.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path

warnings.filterwarnings("ignore", category=DeprecationWarning)  # garth 0.8.0 (pinado)

RAIZ = Path(__file__).resolve().parent.parent
ARQ_ANALISES = RAIZ / "data" / "analises.json"
ARQ_HISTORICO = RAIZ / "data" / "historico.json"
ARQ_STATUS = RAIZ / "data" / "pipeline-status.json"
ARQ_FORCA = RAIZ / "data" / "forca-analises.json"
ARQ_PLANO = Path(__file__).resolve().parent / "plano.json"  # gerado por dump-plano.mjs

# Zonas CANÔNICAS do plano (plano-hibrido-pampulha.md, FCmax 190). O relógio está
# configurado assim, mas o Connect web usa defaults de fábrica — por isso as zonas
# são recalculadas aqui a partir da série de FC, nunca lidas do hrTimeInZones.
FC_MAX = 190
ZONAS_FC = [("z1", 0, 132), ("z2", 133, 152), ("z3", 153, 165), ("z4", 166, 177), ("z5", 178, 999)]

TIPOS_CORRIDA = {"running", "trail_running", "track_running", "treadmill_running"}
PARADO_MAX_PCT = 10    # corrida social (quintas) tem 15-40% de tempo parado e pace de grupo —
                       # fica fora das tendências de pace/cadência; treino de verdade para <4%
MAX_POR_RUN = 3        # protege a quota do Gemini; o resto fica pro próximo cron
JANELA_DIAS = 7        # só analisa corridas dos últimos N dias
DIST_MINIMA_M = 1000   # ignora atividades-teste
MODELO_GEMINI = "gemini-2.5-flash"
BRT = timezone(timedelta(hours=-3))

SYSTEM_PROMPT = """Você é o treinador de corrida do Guilherme (M, 31, 180cm ~84kg, atleta híbrido \
corrida+musculação 5x/sem; prova-alvo: Volta Internacional da Pampulha, 18 km, 06/12/2026; Meta A \
6:15-6:25/km). Sua ÚNICA tarefa é analisar UMA corrida executada, comparando com o treino planejado \
do dia e com o histórico fornecido. NÃO redesenhe o plano, NÃO mude volume nem estrutura da semana, \
NÃO recalibre paces (recalibragens acontecem só nos checkpoints de 29/07 e 23/09). Responda em \
português, direto ao ponto, APENAS o JSON no schema pedido.

REGRAS FIXAS DO PLANO (aplique, não questione):
- Zonas de FC (FCmax 190): Z1 <133 · Z2 133-152 · Z3 153-165 · Z4 166-177 · Z5 178+. As porcentagens \
de zona fornecidas já usam essa régua; ignore qualquer classificação de zona do Garmin.
- Longão, social run e corrida leve: a FC manda (Z1-Z2, teto 152) e o pace é consequência — pace \
lento com FC baixa é execução CORRETA e merece elogio. Pace resultante típico 6:50-7:15/km.
- Tiros: o pace manda (a FC atrasa e só alcança no fim do tiro). O pace MÉDIO da atividade inclui \
aquecimento e trote de recuperação — julgue pelos splits e pela descrição do treino, nunca pela média. \
Recuperação entre tiros (quando visível nos splits): a FC deve voltar a ≲152 (topo da Z2) antes do \
tiro seguinte; FC de recuperação subindo tiro a tiro = descanso curto — sugira +30s de caminhada \
ativa no próximo, para proteger a velocidade dos tiros restantes.
- Tempo run: FC ~163-170, pace 6:05-6:20. Limiar estimado: ~168-172 bpm.
- Calor (>28°C), noite mal dormida e ressaca inflam a FC — quando a temperatura da corrida indicar \
calor, trate FC alta como resposta fisiológica esperada, não como problema.
- O limitador nº 1 do atleta em prova é ansiedade (não físico): controle de ritmo no início é sempre \
um ponto forte digno de nota.
- Proteção estrutural (histórico: canelite crônica na canela direita e sensibilidade na coxa \
esquerda — sem dor ativa; a integridade até 06/12 é prioridade absoluta): CADÊNCIA é a métrica-guarda \
da tíbia — alvo 165+ spm nos leves/longos, evolução gradual até ~170, sem forçar. Cadência caindo \
nos splits finais = passada esticando sob fadiga = mais impacto tibial: aponte como ajuste \
biomecânico gentil (passos mais curtos e frequentes), nunca como falha.
- Relevo: BH é cidade de ladeiras — use elevacaoM antes de julgar pace: ganho alto explica pace acima \
da faixa com FC correta (execução certa). Subida = passada curta; descida = cadência ALTA sem frear \
com o calcanhar (de novo a canela). Splits oscilando em percurso ondulado com FC estável = leitura \
madura de esforço, elogie.
- derivaCardiacaPct (só nos longões ≥8 km) = quanto o custo cardíaco subiu da 1ª pra 2ª metade: \
<5% é base aeróbica sólida pra distância (celebre nomeando a métrica); 5-8% é normal em calor ou \
volume novo; >8% sugere começo rápido demais, hidratação ou limite atual de resistência — trate \
como dado de calibragem do longão seguinte, nunca como falha.

TOM (regra inegociável do app onde a análise aparece):
- ZERO linguagem punitiva. PROIBIDO: "falhou", "ruim", "fraco", "erro", "abaixo do esperado", \
"deveria ter". Desvio do plano = fato + causa provável + ajuste construtivo e específico \
(ex.: "pace 15s acima da faixa com 29°C — o corpo priorizou a FC certa; comece 10s/km mais lento").
- PROIBIDO também clichê motivacional e apelido ("campeão", "guerreiro", "fera", "monstro"). \
Celebre com calor genuíno e ESPECÍFICO dos dados, como treinador que conhece o atleta; quando \
explicar um mecanismo, use a fisiologia correta e nomeie a métrica — o atleta é técnico e gosta \
de entender o porquê.
- Sempre pelo menos 1 ponto forte REAL dos dados (nunca invente). pontos_atencao são observações \
acionáveis, não críticas.
- proxima_dica: UMA ação concreta e específica para o próximo treino do calendário (está no contexto).
- nota_execucao: aderência ao ESTÍMULO planejado do dia, 1-10 (pace lento com FC certa em dia Z2 = \
nota alta). Se não havia treino planejado, omita."""

SCHEMA_IA = {
    "type": "OBJECT",
    "properties": {
        "resumo": {"type": "STRING", "description": "2-3 frases: o que foi a corrida"},
        "comparacao_plano": {"type": "STRING", "description": "executado vs planejado (pace, FC, distância); se não havia plano, contextualize na semana"},
        "pontos_fortes": {"type": "ARRAY", "items": {"type": "STRING"}},
        "pontos_atencao": {"type": "ARRAY", "items": {"type": "STRING"}},
        "proxima_dica": {"type": "STRING"},
        "nota_execucao": {"type": "INTEGER", "nullable": True},
    },
    "required": ["resumo", "comparacao_plano", "pontos_fortes", "pontos_atencao", "proxima_dica"],
}


# ---------------- helpers puros (cobertos por test_analisar.py) ----------------

def fmt_pace(seg_por_km):
    """230.4 → '3:50' (min/km)."""
    if not seg_por_km or seg_por_km <= 0:
        return None
    s = round(seg_por_km)
    return f"{s // 60}:{s % 60:02d}"


def pace_seg(dist_m, dur_s):
    """segundos por km; None se dados insuficientes."""
    if not dist_m or not dur_s or dist_m < 100:
        return None
    return dur_s / (dist_m / 1000.0)


def fmt_tempo(seg):
    """7000 → '1h57'; 2400 → '40 min'."""
    if not seg or seg <= 0:
        return None
    h, m = int(seg // 3600), round((seg % 3600) / 60)
    if m == 60:
        h, m = h + 1, 0
    return f"{h}h{m:02d}" if h else f"{m} min"


def projecao_18k(corridas, hoje):
    """Riegel (t2 = t1·(d2/d1)^k) a partir do melhor esforço de prova das últimas 12 semanas
    (limpa, ≥4 km, FC média ≥155). Faixa k=1.06 (otimista) a 1.10 (conservador — o salto de
    distância é grande). Recalibra sozinha quando um teste/prova mais recente e rápido chega."""
    corte = (datetime.strptime(hoje, "%Y-%m-%d") - timedelta(days=84)).strftime("%Y-%m-%d")
    cands = [c for c in corridas
             if eh_corrida_limpa(c) and c.get("paceSeg") and c["date"] >= corte
             and (c.get("fcMedia") or 0) >= 155 and (c.get("distanciaKm") or 0) >= 4]
    if not cands:
        return None
    base = min(cands, key=lambda c: c["paceSeg"])
    t_base = base["paceSeg"] * base["distanciaKm"]
    fator = 18 / base["distanciaKm"]

    def proj(k):
        t = t_base * fator ** k
        return {"tempo": fmt_tempo(t), "pace": fmt_pace(t / 18)}

    return {
        "base": {"date": base["date"], "km": base["distanciaKm"], "pace": fmt_pace(base["paceSeg"])},
        "otimista": proj(1.06),
        "conservador": proj(1.10),
    }


def zonas_de_pontos(pontos):
    """pontos = [(fc, ts_ms|None), ...] → {'z1': %, ..., 'z5': %} somando 100, ou None.
    Peso de cada amostra = intervalo até a próxima (uniforme sem timestamp; buracos
    de pausa são limitados a 60s para não distorcer)."""
    pontos = [(fc, ts) for fc, ts in pontos if fc]
    if len(pontos) < 10:
        return None
    acum = {z: 0.0 for z, _, _ in ZONAS_FC}
    total = 0.0
    for i, (fc, ts) in enumerate(pontos):
        if ts is not None and i + 1 < len(pontos) and pontos[i + 1][1] is not None:
            dt = min(max((pontos[i + 1][1] - ts) / 1000.0, 0.0), 60.0)
        else:
            dt = 1.0
        for z, lo, hi in ZONAS_FC:
            if lo <= fc <= hi:
                acum[z] += dt
                break
        total += dt
    if total <= 0:
        return None
    pct = {z: round(100 * acum[z] / total) for z in acum}
    dif = 100 - sum(pct.values())
    if dif:
        pct[max(pct, key=pct.get)] += dif
    return pct


def extrair_fc_details(details):
    """Do payload de /details, extrai só [(fc, ts_ms)] — lat/lon descartados aqui."""
    descs = details.get("metricDescriptors") or []
    idx = {d.get("key"): d.get("metricsIndex") for d in descs}
    i_fc, i_ts = idx.get("directHeartRate"), idx.get("directTimestamp")
    if i_fc is None:
        return []
    out = []
    for m in details.get("activityDetailMetrics") or []:
        v = m.get("metrics") or []
        fc = v[i_fc] if i_fc < len(v) else None
        ts = v[i_ts] if i_ts is not None and i_ts < len(v) else None
        if fc:
            out.append((fc, ts))
    return out


def resumir_splits(lap_dtos):
    """lapDTOs → [{km, pace, fc}] (último parcial só se ≥200m)."""
    out = []
    for i, lap in enumerate(lap_dtos or []):
        dist = lap.get("distance") or 0
        dur = lap.get("movingDuration") or lap.get("duration")
        if dist < 200:
            continue
        out.append({
            "km": i + 1,
            "pace": fmt_pace(pace_seg(dist, dur)),
            "fc": round(lap["averageHR"]) if lap.get("averageHR") else None,
        })
    return out


def tipo_atividade(a):
    """typeKey da atividade — na API crua vem aninhado em activityType.typeKey."""
    t = a.get("activityType")
    return (t.get("typeKey") if isinstance(t, dict) else t) or a.get("typeKey")


def deriva_cardiaca(lap_dtos):
    """Decoupling FC×pace: custo cardíaco (batimentos/metro) da 2ª metade vs a 1ª, em %.
    <5% = base aeróbica sólida pra distância; >8% = resistência/calor/hidratação no limite.
    Só faz sentido em corrida contínua longa: ≥8 km com FC por split."""
    laps = [l for l in (lap_dtos or [])
            if (l.get("distance") or 0) >= 200 and l.get("averageHR")
            and (l.get("movingDuration") or l.get("duration"))]
    total = sum(l["distance"] for l in laps)
    if total < 8000 or len(laps) < 6:
        return None
    metade1, metade2, acumulado = [], [], 0
    for l in laps:
        (metade1 if acumulado < total / 2 else metade2).append(l)
        acumulado += l["distance"]
    if not metade1 or not metade2:
        return None

    def custo(ls):  # batimentos por metro
        bat = sum(l["averageHR"] * (l.get("movingDuration") or l["duration"]) / 60 for l in ls)
        return bat / sum(l["distance"] for l in ls)

    return round((custo(metade2) / custo(metade1) - 1) * 100, 1)


def corrida_do_dia(date, corridas):
    """CORRIDAS é lista de [data, tipo, nome]; retorna dict ou None."""
    for d, tipo, nome in corridas:
        if d == date:
            return {"date": d, "tipo": tipo, "nome": nome}
    return None


def proxima_corrida(date, corridas):
    for d, tipo, nome in corridas:
        if d > date:
            return {"date": d, "tipo": tipo, "nome": nome}
    return None


def compactar_atividade(a, corridas):
    """Item da lista do Garmin → entrada do historico.json."""
    date = (a.get("startTimeLocal") or "")[:10]
    dur = a.get("movingDuration") or a.get("duration")
    ps = pace_seg(a.get("distance"), dur)
    plano = corrida_do_dia(date, corridas)
    return {
        "date": date,
        "activityId": a.get("activityId"),
        "distanciaKm": round((a.get("distance") or 0) / 1000, 2),
        "paceMedio": fmt_pace(ps),
        "paceSeg": round(ps) if ps else None,
        "fcMedia": round(a["averageHR"]) if a.get("averageHR") else None,
        "fcMax": round(a["maxHR"]) if a.get("maxHR") else None,
        "cadencia": round(a["averageRunningCadenceInStepsPerMinute"]) if a.get("averageRunningCadenceInStepsPerMinute") else None,
        "vo2max": a.get("vO2MaxValue"),
        "teAerobico": round(a["aerobicTrainingEffect"], 1) if a.get("aerobicTrainingEffect") is not None else None,
        "paradoPct": round(100 * (1 - a["movingDuration"] / a["duration"])) if a.get("movingDuration") and a.get("duration") else None,
        # eficiência aeróbica: metros percorridos por batimento — sobe quando o motor melhora,
        # comparável entre corridas de esforços diferentes (controla a FC por construção)
        "ef": round((a.get("distance") or 0) / (a["averageHR"] * dur / 60), 3) if a.get("averageHR") and dur and (a.get("distance") or 0) >= 1000 else None,
        "tipoPlano": plano["tipo"] if plano else None,
    }


def compactar_forca(a):
    """Item da lista do Garmin (treino de força) → entrada compacta do historico.json.
    Só o suficiente pra confirmação de 1 toque no app — sem análise de IA.
    duration TOTAL de propósito: movingDuration só conta movimento e faz uma
    sessão de 50 min parecer 13 (descanso entre séries não é pausa)."""
    dur = a.get("duration") or a.get("movingDuration")
    return {
        "date": (a.get("startTimeLocal") or "")[:10],
        "activityId": a.get("activityId"),
        "minutos": round(dur / 60) if dur else None,
        "nome": a.get("activityName"),
    }


def eh_corrida_limpa(c):
    """Treino de verdade: ≥3 km e sem paradas de corrida social."""
    return (c.get("distanciaKm") or 0) >= 3 and (c.get("paradoPct") or 0) <= PARADO_MAX_PCT


def eh_corrida_z2(c):
    return (bool(c.get("fcMedia")) and c["fcMedia"] <= 152
            and bool(c.get("paceSeg")) and eh_corrida_limpa(c))


def media_pace(corridas):
    v = [c["paceSeg"] for c in corridas if c.get("paceSeg")]
    return round(sum(v) / len(v)) if v else None


def calcular_tendencias(corridas, hoje):
    """corridas em ordem cronológica ASC → bloco de tendências do historico.json."""
    z2 = [c for c in corridas if eh_corrida_z2(c)]
    serie = [{"date": c["date"], "seg": c["paceSeg"]} for c in z2]
    atual = media_pace(z2[-3:])
    ref = (datetime.strptime(hoje, "%Y-%m-%d") - timedelta(days=56)).strftime("%Y-%m-%d")
    antigas = [c for c in z2 if c["date"] <= ref]
    ha8sem = media_pace(antigas[-3:]) if antigas else None
    corte4sem = (datetime.strptime(hoje, "%Y-%m-%d") - timedelta(days=28)).strftime("%Y-%m-%d")
    ult4 = [c for c in corridas if c["date"] >= corte4sem]
    cad = [c["cadencia"] for c in ult4 if c.get("cadencia") and (c.get("paradoPct") or 0) <= PARADO_MAX_PCT]
    vo2 = [c["vo2max"] for c in corridas if c.get("vo2max")]
    vo2_antigas = [c["vo2max"] for c in corridas if c.get("vo2max") and c["date"] <= ref]

    # eficiência aeróbica: corridas limpas até Z3 (FC ≤165) — mais pontos que só-Z2, sem a
    # distorção de tiro/prova (anaeróbio infla) nem de longão muito longo (deriva derruba)
    efs = [c for c in corridas if c.get("ef") and eh_corrida_limpa(c)
           and c.get("fcMedia") and c["fcMedia"] <= 165]
    ef_media = lambda cs: round(sum(c["ef"] for c in cs) / len(cs), 3) if cs else None
    ef_antigas = [c for c in efs if c["date"] <= ref]

    # volume: 12 semanas fechando na semana de `hoje` (segunda a segunda, semanas vazias = 0)
    dt_hoje = datetime.strptime(hoje, "%Y-%m-%d")
    seg_atual = dt_hoje - timedelta(days=dt_hoje.weekday())
    km_semanas = []
    for i in range(11, -1, -1):
        ini = seg_atual - timedelta(days=7 * i)
        fim = ini + timedelta(days=6)
        km = sum(c["distanciaKm"] for c in corridas
                 if ini.strftime("%Y-%m-%d") <= c["date"] <= fim.strftime("%Y-%m-%d"))
        km_semanas.append({"semana": ini.strftime("%Y-%m-%d"), "km": round(km, 1)})

    # longão: a maior corrida de cada mês, do primeiro mês com dado até hoje
    longao = {}
    for c in corridas:
        mes = c["date"][:7]
        if (c.get("distanciaKm") or 0) > longao.get(mes, {}).get("km", 0):
            longao[mes] = {"mes": mes, "km": c["distanciaKm"], "date": c["date"]}

    return {
        "paceZ2Serie": serie,
        "paceZ2Atual": fmt_pace(atual),
        "paceZ2Ha8Sem": fmt_pace(ha8sem),
        "vo2max": {"atual": vo2[-1] if vo2 else None, "ha8Sem": vo2_antigas[-1] if vo2_antigas else None},
        "cadencia4Sem": round(sum(cad) / len(cad)) if cad else None,
        "kmPorSemana4Sem": round(sum(c["distanciaKm"] for c in ult4) / 4, 1),
        "efSerie": [{"date": c["date"], "ef": c["ef"]} for c in efs],
        "efAtual": ef_media(efs[-3:]),
        "efHa8Sem": ef_media(ef_antigas[-3:]),
        "kmSemanas": km_semanas,
        "longaoMes": [longao[m] for m in sorted(longao)],
        "projecao18k": projecao_18k(corridas, hoje),
    }


def validar_ia(ia):
    for k in ("resumo", "comparacao_plano", "proxima_dica"):
        if not isinstance(ia.get(k), str) or not ia[k].strip():
            raise ValueError(f"resposta da IA sem campo '{k}'")
    for k in ("pontos_fortes", "pontos_atencao"):
        if not isinstance(ia.get(k), list):
            raise ValueError(f"resposta da IA sem lista '{k}'")
    if not ia["pontos_fortes"]:
        raise ValueError("resposta da IA sem nenhum ponto forte")
    return ia


# ---------------- Garmin / Gemini (rede) ----------------

# Desde mar/2026 o Cloudflare da Garmin bloqueia (429) a troca OAuth1→OAuth2 vinda
# dos runners — que roda quando o OAuth2 (vida de 24h) expira. Sem isso o pipeline
# "perde o token" a cada 24h mesmo com o OAuth1 de 1 ano válido. Só trocar o
# User-Agent NÃO bastou (testado 10/07/2026): o bloqueio é por fingerprint TLS, e o
# python-requests não parece navegador em nenhum UA. A troca é refeita abaixo com
# curl_cffi (TLS de Chrome de verdade) — abordagem da comunidade pós-deprecação do
# garth (matin/garth#222).
UA_NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"


def _exchange_navegador(oauth1, client, *, login=False):
    """Substitui garth.sso.exchange: assina o OAuth1 na mão (oauthlib, mesmo HMAC-SHA1
    do garth) e envia com curl_cffi impersonando Chrome, que passa no fingerprint TLS."""
    import requests
    from curl_cffi import requests as crequests
    from garth import sso
    from garth.auth_tokens import OAuth2Token
    from oauthlib.oauth1 import Client as OAuth1Signer

    if not sso.OAUTH_CONSUMER:
        sso.OAUTH_CONSUMER = requests.get(sso.OAUTH_CONSUMER_URL, timeout=10).json()
    data = {}
    if login:
        data["audience"] = "GARMIN_CONNECT_MOBILE_ANDROID_DI"
    if getattr(oauth1, "mfa_token", None):
        data["mfa_token"] = oauth1.mfa_token
    url, headers, corpo = OAuth1Signer(
        sso.OAUTH_CONSUMER["consumer_key"],
        client_secret=sso.OAUTH_CONSUMER["consumer_secret"],
        resource_owner_key=oauth1.oauth_token,
        resource_owner_secret=oauth1.oauth_token_secret,
    ).sign(
        f"https://connectapi.{client.domain}/oauth-service/oauth/exchange/user/2.0",
        "POST",
        urllib.parse.urlencode(data),
        {"User-Agent": UA_NAVEGADOR, "Content-Type": "application/x-www-form-urlencoded"},
    )
    for tentativa in (1, 2):
        resp = crequests.post(url, headers=dict(headers), data=corpo, impersonate="chrome", timeout=15)
        if resp.status_code == 200:
            return OAuth2Token(**sso.set_expirations(resp.json()))
        if resp.status_code in (429, 403) and tentativa == 1:
            time.sleep(42)  # regra de velocidade do WAF — a comunidade relata que pausa de 30-45s passa
            continue
        break
    # "oauth" + código no texto: a classificação de erro do main() depende disso;
    # server/cf-ray + corpo diagnosticam Cloudflare (HTML) vs rate-limit da Garmin (JSON)
    raise RuntimeError(
        f"oauth exchange {resp.status_code} server={resp.headers.get('server')} "
        f"cf-ray={'sim' if resp.headers.get('cf-ray') else 'não'}: {resp.text[:160]}"
    )


def garmin_get(path, **params):
    import garth
    from garth import sso
    sso.exchange = _exchange_navegador  # refresh_oauth2 resolve sso.exchange em runtime
    garth.client.sess.headers["User-Agent"] = UA_NAVEGADOR  # chamadas de dados
    if not os.environ.get("GARTH_TOKEN"):
        garth.resume(str(Path.home() / ".garth"))  # uso local
    if params:
        path += ("&" if "?" in path else "?") + urllib.parse.urlencode(params)
    return garth.connectapi(path)


def chamar_gemini(chave, contexto, system=None):
    corpo = {
        "systemInstruction": {"parts": [{"text": system or SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": json.dumps(contexto, ensure_ascii=False, indent=1)}]}],
        "generationConfig": {"temperature": 0.4, "responseMimeType": "application/json", "responseSchema": SCHEMA_IA},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO_GEMINI}:generateContent",
        data=json.dumps(corpo).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": chave},
        method="POST",
    )
    for tentativa in (1, 2):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                resp = json.load(r)
            texto = resp["candidates"][0]["content"]["parts"][0]["text"]
            return validar_ia(json.loads(texto))
        except (urllib.error.HTTPError, urllib.error.URLError) as e:
            code = getattr(e, "code", None)
            if tentativa == 1 and code in (429, 500, 503):
                time.sleep(30)
                continue
            raise


def analisar_uma(a, detalhe, splits, deriva, zonas, plano_dia, guia, hist_ctx, prox, chave):
    date = (a.get("startTimeLocal") or "")[:10]
    dur = a.get("movingDuration") or a.get("duration")
    sumario = (detalhe or {}).get("summaryDTO") or {}
    te_label = sumario.get("trainingEffectLabel") or (detalhe or {}).get("trainingEffectLabel")
    garmin = {
        "nome": a.get("activityName"),
        "inicio": a.get("startTimeLocal"),
        "distanciaKm": round((a.get("distance") or 0) / 1000, 2),
        "duracaoMin": round((dur or 0) / 60, 1),
        "paceMedio": fmt_pace(pace_seg(a.get("distance"), dur)),
        "fcMedia": round(a["averageHR"]) if a.get("averageHR") else None,
        "fcMax": round(a["maxHR"]) if a.get("maxHR") else None,
        "cadencia": round(a["averageRunningCadenceInStepsPerMinute"]) if a.get("averageRunningCadenceInStepsPerMinute") else None,
        "elevacaoM": round(a["elevationGain"]) if a.get("elevationGain") else 0,
        "trainingEffect": {
            "aerobico": round(a["aerobicTrainingEffect"], 1) if a.get("aerobicTrainingEffect") is not None else None,
            "anaerobico": round(a["anaerobicTrainingEffect"], 1) if a.get("anaerobicTrainingEffect") is not None else None,
            "label": te_label,
            "carga": round(sumario["activityTrainingLoad"]) if sumario.get("activityTrainingLoad") else None,
        },
        "vo2max": a.get("vO2MaxValue"),
        "temperaturaC": a.get("maxTemperature"),
        "splits": splits,
        "zonasFc": zonas,  # canônicas (FCmax 190) — None se a série de FC não veio
        "derivaCardiacaPct": deriva,  # decoupling FC×pace nos longões (≥8 km); None nos curtos
    }
    plano = None
    if plano_dia:
        plano = {
            "tipo": plano_dia["tipo"],
            "nome": plano_dia["nome"],
            "paceAlvo": (guia or {}).get("pace"),
            "fcAlvo": (guia or {}).get("fc"),
            "observacao": plano_dia.get("observacao"),
        }
    contexto = {
        "corrida_executada": garmin,
        "treino_planejado_do_dia": plano or "nenhum treino de corrida planejado para este dia — avalie o esforço no contexto da semana, deixando claro (sem desencorajar) que volume extra pode custar a qualidade do próximo treino-chave",
        "historico": hist_ctx,
        "proxima_corrida_do_calendario": prox,
        "zonas_de_fc_do_atleta": "FCmax 190 · Z1 <133 · Z2 133-152 · Z3 153-165 · Z4 166-177 · Z5 178+",
    }
    ia = chamar_gemini(chave, contexto)
    if not plano:
        ia["nota_execucao"] = None
    return {
        "date": date,
        "activityId": a.get("activityId"),
        "geradoEm": datetime.now(BRT).isoformat(timespec="seconds"),
        "garmin": garmin,
        "plano": plano,
        "historico": {"paceZ2Atual": hist_ctx["pace_z2"]["hoje"], "paceZ2Ha8Sem": hist_ctx["pace_z2"]["ha_8_semanas"]},
        "ia": ia,
    }


# ---------------- main ----------------

def carregar_json(arq, padrao):
    try:
        return json.loads(arq.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return padrao


def escrever_json(arq, doc):
    arq.parent.mkdir(parents=True, exist_ok=True)
    arq.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")


def main():
    agora = datetime.now(BRT)
    hoje = agora.strftime("%Y-%m-%d")
    status = {"ultimaExecucao": agora.isoformat(timespec="seconds"), "status": "ok", "mensagem": "", "ultimaAnalise": None, "pendentes": 0}
    codigo_saida = 0
    try:
        plano_doc = json.loads(ARQ_PLANO.read_text())
        corridas_plano = plano_doc["CORRIDAS"]
        guias = plano_doc["CORRIDA_GUIA"]
        doc = carregar_json(ARQ_ANALISES, {"schema": 1, "atualizadoEm": None, "analises": []})
        processados = {x["activityId"] for x in doc["analises"]}

        atividades = garmin_get("/activitylist-service/activities/search/activities", limit=200, start=0, activityType="running")
        atividades = [a for a in atividades if tipo_atividade(a) in TIPOS_CORRIDA]
        atividades.sort(key=lambda a: a.get("startTimeLocal") or "")
        print(f"{len(atividades)} corridas no Garmin")

        # treinos de força: só datas/duração para a confirmação de 1 toque no app.
        # A busca só filtra por categoria-pai (strength_training mora em
        # fitness_equipment — typeKey direto dá 400); nunca derruba a análise de corrida.
        forcas, brutas_forca = [], []
        try:
            brutas = garmin_get("/activitylist-service/activities/search/activities", limit=200, start=0, activityType="fitness_equipment")
            brutas_forca = [a for a in brutas
                            if tipo_atividade(a) == "strength_training" and (a.get("duration") or 0) >= 300]
            forcas = sorted((compactar_forca(a) for a in brutas_forca), key=lambda f: f["date"])
            print(f"{len(forcas)} treinos de força no Garmin")
        except Exception as e:
            print(f"[aviso] treinos de força indisponíveis nesta execução: {e}", file=sys.stderr)

        # histórico completo + tendências (rebuild barato e idempotente a cada run)
        compactas = [compactar_atividade(a, corridas_plano) for a in atividades]
        tend = calcular_tendencias(compactas, hoje)
        escrever_json(ARQ_HISTORICO, {
            "schema": 1, "atualizadoEm": status["ultimaExecucao"], "fcMax": FC_MAX,
            "zonas": {z: [lo, hi] for z, lo, hi in ZONAS_FC},
            "corridas": compactas, "forcas": forcas, "tendencias": tend,
        })

        corte = (agora - timedelta(days=JANELA_DIAS)).strftime("%Y-%m-%d")
        novas = [a for a in atividades
                 if a.get("activityId") not in processados
                 and (a.get("startTimeLocal") or "")[:10] >= corte
                 and (a.get("distance") or 0) >= DIST_MINIMA_M]
        status["pendentes"] = max(0, len(novas) - MAX_POR_RUN)
        novas = novas[:MAX_POR_RUN]
        print(f"{len(novas)} nova(s) para analisar")

        geradas, falhas = 0, 0
        if novas:
            chave = os.environ["GEMINI_API_KEY"]
            ja_no_dia = {}
            for x in doc["analises"]:
                ja_no_dia[x["date"]] = ja_no_dia.get(x["date"], 0) + 1
            for a in novas:
                aid = a.get("activityId")
                date = (a.get("startTimeLocal") or "")[:10]
                try:
                    detalhe = garmin_get(f"/activity-service/activity/{aid}")
                    laps = (garmin_get(f"/activity-service/activity/{aid}/splits") or {}).get("lapDTOs")
                    splits = resumir_splits(laps)
                    deriva = deriva_cardiaca(laps)
                    try:
                        pontos = extrair_fc_details(garmin_get(f"/activity-service/activity/{aid}/details", maxChartSize=2000))
                        zonas = zonas_de_pontos(pontos)
                    except Exception as e:  # série de FC é opcional
                        print(f"[aviso] sem série de FC em {aid}: {e}")
                        zonas = None
                    plano_dia = corrida_do_dia(date, corridas_plano)
                    if plano_dia and ja_no_dia.get(date):
                        plano_dia = dict(plano_dia, observacao="segunda corrida do dia — o treino planejado já foi coberto pela anterior; trate como volume extra e avalie o custo de recuperação")
                    guia = guias.get(plano_dia["tipo"]) if plano_dia else None
                    mesmo_tipo = [c for c in compactas if plano_dia and c.get("tipoPlano") == plano_dia["tipo"] and c["activityId"] != aid][-3:]
                    hist_ctx = {
                        "ultimas_do_mesmo_tipo": [{"date": c["date"], "pace": c["paceMedio"], "fcMedia": c["fcMedia"], "km": c["distanciaKm"]} for c in mesmo_tipo],
                        "pace_z2": {"hoje": tend["paceZ2Atual"], "ha_8_semanas": tend["paceZ2Ha8Sem"]},
                        "vo2max": tend["vo2max"],
                        "km_por_semana_ultimas_4": tend["kmPorSemana4Sem"],
                    }
                    prox = proxima_corrida(date, corridas_plano)
                    if prox:
                        prox = dict(prox, paceAlvo=(guias.get(prox["tipo"]) or {}).get("pace"))
                    entrada = analisar_uma(a, detalhe, splits, deriva, zonas, plano_dia, guia, hist_ctx, prox, chave)
                    doc["analises"].append(entrada)
                    ja_no_dia[date] = ja_no_dia.get(date, 0) + 1
                    geradas += 1
                    print(f"[ok] análise gerada: {date} · {a.get('activityName')} ({aid})")
                except Exception as e:
                    falhas += 1
                    print(f"[erro] atividade {aid}: {e}", file=sys.stderr)

        if geradas:
            doc["analises"].sort(key=lambda x: (x["date"], x.get("geradoEm") or ""), reverse=True)
            doc["atualizadoEm"] = status["ultimaExecucao"]
            escrever_json(ARQ_ANALISES, doc)
        if doc["analises"]:
            status["ultimaAnalise"] = doc["analises"][0]["date"]
        if falhas and not geradas:
            status.update(status="gemini_quota" if falhas else "erro", mensagem=f"{falhas} análise(s) falharam — o próximo cron tenta de novo")
            codigo_saida = 1

        # ---- análise de musculação (v7.7) — NUNCA derruba a análise de corrida ----
        try:
            import forca as F
            doc_forca = carregar_json(ARQ_FORCA, {"schema": 1, "atualizadoEm": None, "analises": []})
            antes_forca = len(doc_forca["analises"])
            processados_f = {x["activityId"] for x in doc_forca["analises"]}
            gym_treinos = plano_doc.get("GYM_TREINOS") or {}
            gym_nomes = plano_doc.get("GYM_POR_DIA") or []
            gym_fases = plano_doc.get("GYM_FASE_POR_MES") or {}
            novas_f = sorted((a for a in brutas_forca
                              if a.get("activityId") not in processados_f
                              and (a.get("startTimeLocal") or "") >= corte),
                             key=lambda a: a.get("startTimeLocal") or "")
            orcamento = max(0, MAX_POR_RUN - geradas)  # corridas primeiro; o resto fica pro próximo cron
            status["pendentes"] += max(0, len(novas_f) - orcamento)
            novas_f = novas_f[:orcamento]
            if novas_f:
                print(f"{len(novas_f)} sessão(ões) de força para analisar")
            for a in novas_f:
                aid = a.get("activityId")
                date = (a.get("startTimeLocal") or "")[:10]
                try:
                    sets = garmin_get(f"/activity-service/activity/{aid}/exerciseSets")
                    exercicios = F.normalizar_sets(sets)
                    dur = a.get("duration") or a.get("movingDuration")  # total: descanso entre séries conta
                    minutos = round(dur / 60) if dur else None
                    gerado_em = datetime.now(BRT).isoformat(timespec="seconds")
                    if not exercicios:
                        # sessão livre / shape inesperado: entrada compacta SEM parecer (o app tolera);
                        # amostra de chaves no log = diagnóstico caso a API mude
                        amostra = sorted(sets.keys()) if isinstance(sets, dict) else type(sets).__name__
                        print(f"[aviso] força {aid} sem sets estruturados (payload: {amostra}) — sem parecer")
                        doc_forca["analises"].append({"date": date, "activityId": aid, "geradoEm": gerado_em,
                                                      "sessao": {"minutos": minutos, "series": 0, "volumeKg": None, "exercicios": []}})
                        continue
                    baseline = F.baseline_mesmo_dia(date, aid, doc_forca["analises"])
                    sessao = F.resumir_sessao(minutos, exercicios, baseline)
                    dia = F.dia_semana_js(date)
                    plano_dia = None
                    if gym_treinos.get(str(dia)):
                        plano_dia = {"nome": gym_nomes[dia] if dia < len(gym_nomes) else None,
                                     "exercicios": gym_treinos[str(dia)]}
                    # estagnação e skips recorrentes: sessão atual + 2 anteriores do MESMO dia da semana
                    anteriores_dia = [x for x in doc_forca["analises"]
                                      if x.get("activityId") != aid and x.get("date") and x["date"] <= date
                                      and F.dia_semana_js(x["date"]) == dia
                                      and (x.get("sessao") or {}).get("exercicios")]
                    anteriores_dia.sort(key=lambda x: (x["date"], x.get("geradoEm") or ""), reverse=True)
                    anteriores_dia = anteriores_dia[:2]
                    estagnados, skips = [], []
                    for ex in sessao["exercicios"]:
                        mesmos = [nx for x in anteriores_dia for nx in x["sessao"]["exercicios"]
                                  if nx.get("nome") and nx.get("nome") == ex.get("nome")]
                        if ex["status"] == "igual" and F.estagnado([ex] + mesmos):
                            estagnados.append(ex.get("nome"))
                        if ex["status"] == "pulado" and any(nx.get("status") == "pulado" for nx in mesmos):
                            skips.append({"nome": ex.get("nome"), "pulado_tambem_na_sessao_anterior": True})
                    fase = gym_fases.get(str(int(date[5:7]))) if len(date) >= 7 else None
                    deload = F.eh_semana_deload(date, corridas_plano)
                    contexto = F.digest_forca(sessao, plano_dia, fase, deload, estagnados, skips)
                    ia = chamar_gemini(os.environ["GEMINI_API_KEY"], contexto, system=F.SYSTEM_PROMPT_FORCA)
                    if not plano_dia:
                        ia["nota_execucao"] = None
                    doc_forca["analises"].append({"date": date, "activityId": aid, "geradoEm": gerado_em,
                                                  "sessao": sessao, "ia": ia})
                    print(f"[ok] parecer de força: {date} · {a.get('activityName')} ({aid})")
                except Exception as e:
                    print(f"[aviso] sessão de força {aid}: {e}", file=sys.stderr)
            if len(doc_forca["analises"]) > antes_forca:
                doc_forca["analises"].sort(key=lambda x: (x["date"], x.get("geradoEm") or ""), reverse=True)
                doc_forca["analises"] = doc_forca["analises"][:60]  # baseline cabe folgado; JSON não cresce sem limite
                doc_forca["atualizadoEm"] = status["ultimaExecucao"]
                escrever_json(ARQ_FORCA, doc_forca)
        except Exception as e:
            print(f"[aviso] análise de musculação indisponível nesta execução: {e}", file=sys.stderr)
    except KeyError as e:
        status.update(status="erro", mensagem=f"variável/campo ausente: {e}")
        codigo_saida = 1
    except Exception as e:
        s = str(e)
        # 401 = token de fato inválido (renovar). 429/403 na URL do oauth = Cloudflare
        # bloqueou o runner — o token está OK e renovar não resolve; o próximo cron tenta.
        auth = "401" in s or "Unauthorized" in s
        bloqueio = not auth and ("429" in s or "403" in s) and "oauth" in s.lower()
        status.update(
            status="garmin_auth" if auth else "erro",
            mensagem="Conexão com a Garmin expirou — rodar login-garmin.py local e atualizar o Secret GARMIN_TOKEN (runbook no CLAUDE.md)" if auth
            else f"Garmin bloqueou o acesso deste runner — NÃO é o token; próximo cron tenta de novo. Detalhe: {s[:220]}" if bloqueio
            else s[:300],
        )
        print(f"[fatal] {e}", file=sys.stderr)
        codigo_saida = 1
    escrever_json(ARQ_STATUS, status)
    print(f"status: {status['status']} · {status['mensagem'] or 'ok'}")
    sys.exit(codigo_saida)


if __name__ == "__main__":
    main()
