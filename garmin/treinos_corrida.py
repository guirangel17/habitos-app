"""Todos os treinos de corrida do ciclo Pampulha (jul-dez/2026), com datas.

Paces calibrados (07/07/2026): Z2 6:50-7:15 · RP 6:15-6:30 · tempo 6:10-6:25 ·
tiros 1km/800m 5:50-6:05 · tiros 400m 5:40-5:55. Fonte: plano-hibrido-pampulha.md
"""
from garmin_api import treino_corrida, passo, repeticao, alvo_pace

Z2 = alvo_pace("7:15", "6:50")
Z3 = alvo_pace("6:45", "6:20")
RP = alvo_pace("6:30", "6:15")          # ritmo de prova
RP_LARGADA = alvo_pace("6:40", "6:30")  # primeiros km da prova (anti-ansiedade)
TEMPO = alvo_pace("6:20", "6:05")
TEMPO_MOD = alvo_pace("6:30", "6:15")
TIRO_1K = alvo_pace("6:00", "5:45")
TIRO_1K_F = alvo_pace("5:50", "5:40")
TIRO_15 = alvo_pace("6:05", "5:55")
TIRO_400 = alvo_pace("5:50", "5:35")
Z1 = alvo_pace("7:40", "7:10")

AQUECE = lambda: passo("warmup", "time", 900, Z2, "Aquecimento 15min + 4x100m progressivos")
DESAQ = lambda: passo("cooldown", "time", 600, Z1, "Desaquecimento trote leve")


def facil(nome, km, alvo=Z2, desc=None):
    return treino_corrida(nome, [passo("interval", "distance", km * 1000, alvo, desc)])


def facil_strides(nome, km):
    return treino_corrida(nome, [
        passo("interval", "distance", km * 1000, Z2, "Rodagem leve"),
        repeticao(4, [
            passo("interval", "distance", 100, None, "Stride: progressivo até ~90%"),
            passo("recovery", "time", 60, Z1, "Volta trotando"),
        ]),
    ])


def tiros(nome, n, dist_m, alvo, rec_s, desc_tiro):
    return treino_corrida(nome, [
        AQUECE(),
        repeticao(n, [
            passo("interval", "distance", dist_m, alvo, desc_tiro),
            passo("recovery", "time", rec_s, Z1, "Rec ATIVA: trote leve, nunca parado"),
        ]),
        DESAQ(),
    ])


def tempo_run(nome, km, alvo=TEMPO, desc="Contínuo, só frases curtas"):
    aquece10 = passo("warmup", "time", 600, Z2, "Aquecimento 10min + 4x100m progressivos")
    return treino_corrida(nome, [aquece10, passo("interval", "distance", km * 1000, alvo, desc), DESAQ()])


def longao_blocos(nome, blocos, desc=None):
    """blocos = [(km, alvo, descricao), ...]"""
    return treino_corrida(
        nome, [passo("interval", "distance", km * 1000, alvo, d) for km, alvo, d in blocos], desc
    )


# ---------- catálogo (nome único -> builder) ----------

CATALOGO = {
    "Rodagem 5km leve": facil("Rodagem 5km leve", 5, Z2, "Cadência 165+ spm"),
    "Social Run 5km": facil("Social Run 5km", 5, Z2, "Regenerativo — FC até 152"),
    "Social Run 5km + strides": facil_strides("Social Run 5km + strides", 5),
    "Social Run 6km": facil("Social Run 6km", 6, Z2, "Regenerativo — FC até 152"),
    "Social Run 6km + strides": facil_strides("Social Run 6km + strides", 6),
    "Social Run 7km": facil("Social Run 7km", 7, Z2, "Regenerativo — FC até 152"),
    "Social Run 8km": facil("Social Run 8km", 8, Z2, "Regenerativo — FC até 152"),
    "Social Run 8km + strides": facil_strides("Social Run 8km + strides", 8),
    "Longao 10km Z2": facil("Longao 10km Z2", 10),
    "Longao 12km Z2": facil("Longao 12km Z2", 12),
    "Longao 10km DELOAD": facil("Longao 10km DELOAD", 10, Z2, "Semana de deload — academia: metade das séries"),
    "Longao 12km DELOAD": facil("Longao 12km DELOAD", 12, Z2, "Deload pós-tempo run"),
    "Tiros 6x400m": tiros("Tiros 6x400m", 6, 400, TIRO_400, 105, "Forte, não é sprint"),
    "TESTE 5km contrarrelogio": treino_corrida("TESTE 5km contrarrelogio", [
        AQUECE(),
        passo("interval", "distance", 5000, None, "5km MÁXIMOS bem distribuídos — pico de FC no final = FC máx real"),
        DESAQ(),
    ], "Define os paces de agosto. Não sair voando no km 1."),
    "Tiros 5x800m": tiros("Tiros 5x800m", 5, 800, TIRO_1K, 120, "Ritmo de 5km — 9/10 no último"),
    "Tiros 6x800m": tiros("Tiros 6x800m", 6, 800, TIRO_1K, 120, "Ritmo de 5km — 9/10 no último"),
    "Longao 12km final RP": longao_blocos("Longao 12km final RP",
        [(10, Z2, "Base confortável"), (2, RP, "Ritmo de prova")]),
    "Longao 13km final RP": longao_blocos("Longao 13km final RP",
        [(11, Z2, "Base confortável"), (2, RP, "Ritmo de prova")]),
    "Longao 14km final RP": longao_blocos("Longao 14km final RP",
        [(12, Z2, "Base confortável"), (2, RP, "Ritmo de prova")]),
    "Longao 14km final 3km RP": longao_blocos("Longao 14km final 3km RP",
        [(11, Z2, "Base confortável"), (3, RP, "Ritmo de prova")]),
    "Tempo Run 4km": tempo_run("Tempo Run 4km", 4),
    "Tempo Run 5km": tempo_run("Tempo Run 5km", 5),
    "Tempo Run 6km CHECKPOINT": tempo_run("Tempo Run 6km CHECKPOINT", 6, TEMPO,
        "Teste de fogo: se sair confortável, alvo da prova = 6:15-6:25"),
    "Tempo Run 4km moderado": tempo_run("Tempo Run 4km moderado", 4, TEMPO_MOD, "Moderado — semana de deload"),
    "Longao 14km 5-5-4": longao_blocos("Longao 14km 5-5-4",
        [(5, Z2, "Entrada"), (5, Z3, "Bloco Z3"), (4, Z2, "Volta à calma")]),
    "Longao 15km 5-6-4": longao_blocos("Longao 15km 5-6-4",
        [(5, Z2, "Entrada"), (6, Z3, "Bloco Z3"), (4, Z2, "Volta à calma")]),
    "Longao 15km 4-7-4": longao_blocos("Longao 15km 4-7-4",
        [(4, Z2, "Entrada"), (7, Z3, "Bloco Z3"), (4, Z2, "Volta à calma")]),
    "Tiros 4x1km": tiros("Tiros 4x1km", 4, 1000, TIRO_1K, 150, "Rec: 1min caminhando + 1min30 trote"),
    "Tiros 5x1km forte": tiros("Tiros 5x1km forte", 5, 1000, TIRO_1K_F, 150, "Rec: 1min caminhando + 1min30 trote"),
    "Longao 15km constante": facil("Longao 15km constante", 15, Z2, "Ritmo o mais constante possível"),
    "Longao 16km cadencia": facil("Longao 16km cadencia", 16, Z2, "Passos curtos e rápidos — proteger a tíbia"),
    "Longao 16km progressivo": longao_blocos("Longao 16km progressivo",
        [(10, Z2, "Segura"), (4, Z3, "Aperta"), (2, RP, "Termina em ritmo de prova)")]),
    "Volta Completa 18km SIMULACAO": longao_blocos("Volta Completa 18km SIMULACAO",
        [(4, Z2, "Largada ensaiada: calmo, SEM olhar FC"),
         (8, Z2, "Percurso real — gel km 6 e 12 (pochete), água nos pontos dos postos"),
         (6, RP, "Últimos 6km em ritmo de prova — 'eu já fiz isso aqui'")],
        "Ensaio geral NO PERCURSO da Pampulha (~17,8km + trote = 18): café 3h antes, mesma roupa/tênis/horário da prova"),
    "Longao 15km 10+5RP": longao_blocos("Longao 15km 10+5RP",
        [(10, Z2, "Base"), (5, RP, "Travar o ritmo de prova")]),
    "Tiros 3x1500m": tiros("Tiros 3x1500m", 3, 1500, TIRO_15, 180, "Resiliência — rec 1min caminhando + 2min trote"),
    "Longao 14km Z2 taper": facil("Longao 14km Z2 taper", 14, Z2, "Início da redução"),
    "Tempo Run 5km taper": tempo_run("Tempo Run 5km taper", 5, alvo_pace("6:20", "6:10"), "Firme e controlado"),
    "Taper 12km c/ 5km RP": longao_blocos("Taper 12km c/ 5km RP",
        [(4, Z2, "Entrada"), (5, RP, "Ritmo de prova"), (3, Z2, "Solta")]),
    "Taper 10km c/ 3km RP": longao_blocos("Taper 10km c/ 3km RP",
        [(7, Z2, "Base"), (3, RP, "Ritmo de prova no final")]),
    "Rodagem 4km giro": facil("Rodagem 4km giro", 4, Z1, "Só giro articular"),
    "Ativacao pre-prova 3km": treino_corrida("Ativacao pre-prova 3km", [
        passo("interval", "distance", 3000, Z1, "Trote bem leve"),
        repeticao(3, [
            passo("interval", "distance", 50, None, "Aceleração curta"),
            passo("recovery", "time", 60, Z1, "Solta"),
        ]),
    ]),
    "Trote leve 4km": facil("Trote leve 4km", 4, Z1, "Tirar a ansiedade — pode caminhar"),
    "PROVA Pampulha 18km": longao_blocos("PROVA Pampulha 18km",
        [(4, RP_LARGADA, "SEM OLHAR FC — deixa todo mundo passar"),
         (6, RP, "Assenta no ritmo — FC vira guia (<=165)"),
         (8, RP, "Recolhe quem passou — libera progressivo")],
        "Meta A: 6:15-6:25/km (1h52-1h55). Café 3h antes, gel como treinado."),
}

# ---------- agenda (data -> nome do treino) ----------

AGENDA = [
    ("2026-07-08", "Rodagem 5km leve"),
    ("2026-07-09", "Social Run 5km"),
    ("2026-07-13", "Longao 10km Z2"),
    ("2026-07-15", "Tiros 6x400m"),
    ("2026-07-16", "Social Run 5km"),
    ("2026-07-20", "Longao 12km Z2"),
    ("2026-07-22", "Tiros 6x400m"),
    ("2026-07-23", "Social Run 5km"),
    ("2026-07-27", "Longao 12km Z2"),
    ("2026-07-29", "TESTE 5km contrarrelogio"),
    ("2026-07-30", "Social Run 5km"),
    ("2026-08-03", "Longao 12km final RP"),
    ("2026-08-05", "Tiros 5x800m"),
    ("2026-08-06", "Social Run 5km + strides"),
    ("2026-08-10", "Longao 13km final RP"),
    ("2026-08-12", "Tiros 5x800m"),
    ("2026-08-13", "Social Run 5km"),
    ("2026-08-17", "Longao 14km final RP"),
    ("2026-08-19", "Tiros 6x800m"),
    ("2026-08-20", "Social Run 5km + strides"),
    ("2026-08-24", "Longao 14km final 3km RP"),
    ("2026-08-26", "Tiros 6x800m"),
    ("2026-08-27", "Social Run 5km"),
    ("2026-08-31", "Longao 10km DELOAD"),
    ("2026-09-02", "Tempo Run 4km"),
    ("2026-09-03", "Social Run 6km"),
    ("2026-09-07", "Longao 14km 5-5-4"),
    ("2026-09-09", "Tempo Run 5km"),
    ("2026-09-10", "Social Run 6km"),
    ("2026-09-14", "Longao 15km 5-6-4"),
    ("2026-09-16", "Tempo Run 5km"),
    ("2026-09-17", "Social Run 6km + strides"),
    ("2026-09-21", "Longao 15km 4-7-4"),
    ("2026-09-23", "Tempo Run 6km CHECKPOINT"),
    ("2026-09-24", "Social Run 6km"),
    ("2026-09-28", "Longao 12km DELOAD"),
    ("2026-09-30", "Tempo Run 4km moderado"),
    ("2026-10-01", "Social Run 7km"),
    ("2026-10-05", "Longao 15km constante"),
    ("2026-10-07", "Tiros 4x1km"),
    ("2026-10-08", "Social Run 7km"),
    ("2026-10-12", "Longao 15km constante"),
    ("2026-10-14", "Tiros 4x1km"),
    ("2026-10-15", "Social Run 8km + strides"),
    ("2026-10-19", "Longao 16km cadencia"),
    ("2026-10-21", "Tiros 5x1km forte"),
    ("2026-10-22", "Social Run 8km"),
    ("2026-10-26", "Longao 16km progressivo"),
    ("2026-10-28", "Tiros 5x1km forte"),
    ("2026-10-29", "Social Run 8km"),
    ("2026-11-02", "Volta Completa 18km SIMULACAO"),
    ("2026-11-04", "Tiros 4x1km"),
    ("2026-11-05", "Social Run 6km"),
    ("2026-11-09", "Longao 15km 10+5RP"),
    ("2026-11-11", "Tiros 3x1500m"),
    ("2026-11-12", "Social Run 6km"),
    ("2026-11-16", "Longao 14km Z2 taper"),
    ("2026-11-18", "Tempo Run 5km taper"),
    ("2026-11-19", "Social Run 5km"),
    ("2026-11-23", "Taper 12km c/ 5km RP"),
    ("2026-11-25", "Rodagem 4km giro"),
    ("2026-11-26", "Social Run 5km"),
    ("2026-11-30", "Taper 10km c/ 3km RP"),
    ("2026-12-02", "Ativacao pre-prova 3km"),
    ("2026-12-03", "Trote leve 4km"),
    ("2026-12-06", "PROVA Pampulha 18km"),
]
