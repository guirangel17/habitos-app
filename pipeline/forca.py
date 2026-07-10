"""Análise de musculação — funções PURAS (sem rede/IO) + prompt do treinador.

Consumido por analisar.py (orquestração) e testado em test_analisar.py.
Fonte dos dados: /activity-service/activity/{id}/exerciseSets do Garmin —
shape documentado pela comunidade (garth deprecado), por isso o parsing é
100% defensivo: payload estranho degrada para lista vazia, nunca explode.

Convenções do atleta (importantes):
- Exercício PULADO = registrado com 0 reps × 0 kg no relógio (decisão dele,
  não buraco de dado).
- Progressão Dupla: sobe reps dentro da faixa; no topo, sobe carga e as reps
  voltam ao piso — reps caindo após subir carga é o método funcionando.
"""
from datetime import datetime

# ---------------- normalização dos sets ----------------


def dia_semana_js(date_str):
    """YYYY-MM-DD → dia da semana na convenção JS getDay() (0=domingo).

    GYM_TREINOS/GYM_POR_DIA do data.js são indexados assim; o weekday() do
    Python é 0=segunda — a conversão errada trocaria o treino do dia inteiro."""
    return (datetime.strptime(date_str, "%Y-%m-%d").weekday() + 1) % 7


def normalizar_sets(payload):
    """Payload cru do /exerciseSets → [{nome, categoria, series: [{reps, kg, s}]}].

    Agrupa sets ACTIVE por exercício preservando a ordem de primeira aparição.
    kg vem em GRAMAS na API (weight=60000 → 60.0); None = sem carga registrada
    (peso corporal) — diferente de 0, que junto com 0 reps significa pulado."""
    exercicios = []
    indice = {}
    for st in (payload or {}).get("exerciseSets") or []:
        if not isinstance(st, dict) or st.get("setType") != "ACTIVE":
            continue
        exs = st.get("exercises") or [{}]
        ex0 = exs[0] if isinstance(exs[0], dict) else {}
        nome, categoria = ex0.get("name"), ex0.get("category")
        chave = nome or categoria
        peso = st.get("weight")
        serie = {
            "reps": int(st.get("repetitionCount") or 0),
            "kg": round(peso / 1000, 1) if peso else None,
            "s": round(st.get("duration") or 0),
        }
        if chave not in indice:
            indice[chave] = {"nome": nome, "categoria": categoria, "series": []}
            exercicios.append(indice[chave])
        indice[chave]["series"].append(serie)
    return exercicios


def eh_pulado(series):
    """Convenção do atleta: TODO set 0 reps e 0/nenhum kg = pulado de propósito.
    O corte de 15s protege exercícios por TEMPO (prancha/Copenhagen: 0 reps,
    ~30s de duração — executados, não pulados)."""
    return bool(series) and all(
        s["reps"] == 0 and not s["kg"] and s["s"] < 15 for s in series
    )


def carga_topo(series):
    """(maior kg da sessão, reps nesse kg) — o 'melhor set', base da progressão
    dupla. Sem carga registrada → (None, maiores reps)."""
    com_kg = [s for s in series if s["kg"]]
    if not com_kg:
        return None, max((s["reps"] for s in series), default=0)
    topo = max(com_kg, key=lambda s: (s["kg"], s["reps"]))
    return topo["kg"], topo["reps"]


# ---------------- progressão dupla ----------------


def parear_exercicios(atuais, anteriores):
    """[(atual, anterior|None)] — match por nome exato → categoria → posição.
    A categoria cobre substituição de variação (Búlgaro→Afundo: ambos LUNGE)."""
    usados = set()
    pares = []
    for i, ex in enumerate(atuais):
        par = None
        for j, ant in enumerate(anteriores or []):
            if j in usados:
                continue
            if ex.get("nome") and ex.get("nome") == ant.get("nome"):
                par = (j, ant)
                break
        if not par:
            for j, ant in enumerate(anteriores or []):
                if j in usados:
                    continue
                if ex.get("categoria") and ex.get("categoria") == ant.get("categoria"):
                    par = (j, ant)
                    break
        if not par and anteriores and i < len(anteriores) and i not in usados:
            par = (i, anteriores[i])
        if par:
            usados.add(par[0])
            pares.append((ex, par[1]))
        else:
            pares.append((ex, None))
    return pares


def status_progressao(atual, anterior):
    """Status do exercício vs sessão anterior do mesmo treino (progressão dupla).

    carga_up | reps_up | igual | ajuste | novo | pulado. 'ajuste' (nunca
    'regressão'): qualquer queda — o parecer trata como calibragem, sem punição.
    Ciclo do método: 60×11 → 62,5×9 = carga_up com deltaReps negativo (correto)."""
    if eh_pulado(atual["series"]):
        return {"status": "pulado", "deltaCarga": None, "deltaReps": None}
    if not anterior or eh_pulado(anterior.get("series") or []):
        return {"status": "novo", "deltaCarga": None, "deltaReps": None}
    kg, reps = carga_topo(atual["series"])
    kg_ant, reps_ant = carga_topo(anterior["series"])
    d_kg = round(kg - kg_ant, 1) if kg is not None and kg_ant is not None else None
    d_reps = reps - reps_ant
    if d_kg is not None and d_kg > 0:
        return {"status": "carga_up", "deltaCarga": d_kg, "deltaReps": d_reps}
    if d_kg is not None and d_kg < 0:
        return {"status": "ajuste", "deltaCarga": d_kg, "deltaReps": d_reps}
    if d_reps > 0:
        return {"status": "reps_up", "deltaCarga": d_kg, "deltaReps": d_reps}
    if d_reps < 0:
        return {"status": "ajuste", "deltaCarga": d_kg, "deltaReps": d_reps}
    return {"status": "igual", "deltaCarga": d_kg, "deltaReps": 0}


def estagnado(sessoes_do_exercicio):
    """True quando a carga_topo (kg E reps) é idêntica em ≥3 sessões seguidas
    (a atual + 2 anteriores do mesmo treino)."""
    if len(sessoes_do_exercicio) < 3:
        return False
    topos = [carga_topo(s["series"]) for s in sessoes_do_exercicio[:3] if s.get("series")]
    return len(topos) == 3 and topos[0] != (None, 0) and topos.count(topos[0]) == 3


def volume_kg(exercicios):
    """Σ reps×kg da sessão (kg None conta 0) — tendência de volume total."""
    return round(sum(s["reps"] * (s["kg"] or 0) for ex in exercicios for s in ex["series"]))


# ---------------- sessão e contexto ----------------


def eh_semana_deload(date_str, corridas):
    """Deload derivado do PLANO (sem datas hardcoded): a semana (começa na
    SEGUNDA, regra do app) contém um longão com 'DELOAD' no nome."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    segunda = d.toordinal() - d.weekday()
    semana = {datetime.fromordinal(segunda + i).strftime("%Y-%m-%d") for i in range(7)}
    return any(len(c) >= 3 and c[0] in semana and "DELOAD" in (c[2] or "").upper()
               for c in corridas or [])


def baseline_mesmo_dia(date_str, activity_id, analises):
    """Sessão mais RECENTE do mesmo dia da semana em forca-analises.json.
    Duas sessões no mesmo dia: a primeira vira baseline da segunda."""
    alvo = dia_semana_js(date_str)
    cands = [a for a in analises or []
             if a.get("activityId") != activity_id and a.get("date") and a["date"] <= date_str
             and dia_semana_js(a["date"]) == alvo and (a.get("sessao") or {}).get("exercicios")]
    return max(cands, key=lambda a: (a["date"], a.get("geradoEm") or ""), default=None)


def resumir_sessao(minutos, exercicios, baseline):
    """Monta o bloco `sessao` da entrada de forca-analises.json, com status de
    progressão por exercício comparado ao baseline (mesma lógica do parear)."""
    anteriores = (baseline or {}).get("sessao", {}).get("exercicios") if baseline else None
    pares = parear_exercicios(exercicios, anteriores or [])
    saida = []
    for ex, ant in pares:
        st = status_progressao(ex, ant)
        saida.append({
            "nome": ex.get("nome"), "categoria": ex.get("categoria"),
            "series": ex["series"], **st,
        })
    return {
        "minutos": minutos,
        "series": sum(len(ex["series"]) for ex in exercicios),
        "volumeKg": volume_kg(exercicios),
        "exercicios": saida,
    }


def digest_forca(sessao, plano_dia, fase, deload, estagnados, skips_recorrentes):
    """Contexto enxuto para o Gemini — os fatos já vêm calculados."""
    return {
        "sessao_executada": sessao,
        "treino_planejado_do_dia": plano_dia or "nenhum treino de musculação planejado para este dia",
        "fase_do_mes": fase,
        "semana_deload": deload,
        "exercicios_estagnados_ha_3_sessoes": estagnados,
        "exercicios_pulados_em_sessoes_recentes": skips_recorrentes,
        "legenda_status": "carga_up=subiu carga · reps_up=subiu reps na faixa · igual=repetiu · "
                          "ajuste=carga/reps menores · novo=sem comparação · pulado=0×0 de propósito",
    }


SYSTEM_PROMPT_FORCA = """Você é o treinador de musculação do Guilherme (M, 31, 180cm ~84kg, atleta \
híbrido corrida+musculação 5x/sem rumo à Volta Internacional da Pampulha 18k em 06/12/2026; objetivo \
na academia: hipertrofia de braços/ombros/pernas SERVINDO à corrida). Sua ÚNICA tarefa é analisar UMA \
sessão de musculação executada, comparando com o treino planejado e a sessão anterior do mesmo treino. \
NÃO redesenhe o plano nem a periodização. Responda em português, direto ao ponto, APENAS o JSON no \
schema pedido.

REGRAS FIXAS (aplique, não questione):
- Método: PROGRESSÃO DUPLA — sobe reps dentro da faixa alvo; ao bater o topo, sobe a carga e as reps \
voltam ao piso. Reps caindo logo após subir carga = o método funcionando CORRETAMENTE, celebre. Reps \
no topo da faixa = deixe explícito que a próxima sessão pede carga maior (diga quanto: menor incremento \
disponível, ~2-2,5kg ou 5-10%).
- Os status e deltas por exercício JÁ FORAM CALCULADOS (legenda no contexto) — interprete, não recalcule.
- Set 0×0 = exercício PULADO DE PROPÓSITO (convenção do atleta), nunca "dado faltando". Pular consciente \
num dia corrido é gestão de carga, não falha.
- Tibial Anterior e os preventivos de sábado protegem a CANELITE CRÔNICA (canela direita) e o joelho — \
pulado recorrente merece lembrete gentil do PORQUÊ (integridade até 06/12 é prioridade absoluta), \
nunca cobrança.
- semana_deload=true: METADE das séries É o plano — volume baixo = execução correta, nota alta. \
PROIBIDO tratar como queda.
- A fase_do_mes manda: setembro = força máxima (4-6 reps, carga alta — reps "caindo" é o método); \
outubro = volume −40% planejado; novembro = polimento sem falha e sem DOMS.
- Exercício estagnado (≥3 sessões na mesma carga×reps, já sinalizado): sugira UM microajuste construtivo \
(microcarga, descanso maior, cadência de execução, variação) — nunca "estagnado/travado".
- Musculação serve à corrida: NUNCA sugira treinar até a falha nem volume extra — quinta antecede o \
social run e sábado protege o Longão de segunda (pernas leves é decisão de plano).
- Exercícios por tempo (prancha, Copenhagen): julgue pela duração dos sets, não por reps.

TOM (regra inegociável do app onde a análise aparece):
- ZERO linguagem punitiva. PROIBIDO: "falhou", "ruim", "fraco", "erro", "abaixo do esperado", \
"deveria ter". Desvio do plano = fato + causa provável + ajuste construtivo e específico.
- PROIBIDO também clichê motivacional e apelido ("campeão", "guerreiro", "fera", "monstro"). \
Celebre com calor genuíno e ESPECÍFICO dos dados, como treinador que conhece o atleta; quando \
explicar um mecanismo, use a fisiologia correta e nomeie (sobrecarga progressiva, volume efetivo) — \
o atleta é técnico e gosta de entender o porquê.
- Sempre pelo menos 1 ponto forte REAL dos dados (nunca invente). pontos_atencao são observações \
acionáveis, não críticas.
- proxima_dica: UMA ação concreta e específica para a PRÓXIMA sessão deste mesmo treino \
(ex.: "supino reto: bateu 4×11 — próxima terça sobe pra 32,5kg e volta pra 9").
- nota_execucao: aderência ao ESTÍMULO planejado do dia, 1-10 (pulado consciente com o resto bem \
executado = nota alta; deload cumprido = nota alta). Se não havia treino planejado, omita."""
