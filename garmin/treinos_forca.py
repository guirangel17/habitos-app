"""Treinos de musculação (Garmin strength_training), com periodização por fase.

Mapeamento de exercícios para o catálogo da Garmin é best-effort — quando não
existe correspondência exata (ex.: tibial anterior), a descrição carrega o nome
real. criar.py tem fallback caso a API rejeite algum nome de exercício.
"""
from datetime import date, timedelta

from garmin_api import _TIPOS

SPORT_FORCA = {"sportTypeId": 5, "sportTypeKey": "strength_training"}


def ex(nome_desc, series, reps, categoria=None, exercicio=None, rest_s=90, tempo_s=None):
    """Um exercício = RepeatGroup(series x [set de reps + descanso])."""
    if tempo_s:
        fim = {"conditionTypeId": 2, "conditionTypeKey": "time"}
        valor = tempo_s
    else:
        fim = {"conditionTypeId": 10, "conditionTypeKey": "reps"}
        valor = reps
    set_step = {
        "type": "ExecutableStepDTO",
        "stepType": {"stepTypeId": _TIPOS["interval"], "stepTypeKey": "interval"},
        "endCondition": fim,
        "endConditionValue": valor,
        "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
        "description": nome_desc,
    }
    if categoria:
        set_step["category"] = categoria
    if exercicio:
        set_step["exerciseName"] = exercicio
    rest = {
        "type": "ExecutableStepDTO",
        "stepType": {"stepTypeId": _TIPOS["rest"], "stepTypeKey": "rest"},
        "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"},
        "endConditionValue": rest_s,
        "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
    }
    return {
        "type": "RepeatGroupDTO",
        "stepType": {"stepTypeId": _TIPOS["repeat"], "stepTypeKey": "repeat"},
        "numberOfIterations": series,
        "smartRepeat": False,
        "endCondition": {"conditionTypeId": 7, "conditionTypeKey": "iterations"},
        "workoutSteps": [set_step, rest],
    }


def treino_forca(nome, exercicios, descricao=None):
    n = 1
    for grupo in exercicios:
        grupo["stepOrder"] = n
        n += 1
        for p in grupo["workoutSteps"]:
            p["stepOrder"] = n
            n += 1
    w = {
        "workoutName": nome,
        "sportType": SPORT_FORCA,
        "workoutSegments": [{"segmentOrder": 1, "sportType": SPORT_FORCA, "workoutSteps": exercicios}],
    }
    if descricao:
        w["description"] = descricao
    return w


CATALOGO_FORCA = {
    "TER Empurrar": treino_forca("TER Empurrar", [
        ex("Supino Reto (RIR 1-2)", 4, 10, "BENCH_PRESS", "BARBELL_BENCH_PRESS", 150),
        ex("Supino Inclinado Halteres", 3, 10, "BENCH_PRESS", "INCLINE_DUMBBELL_BENCH_PRESS", 120),
        ex("Desenvolvimento Máquina", 3, 10, "SHOULDER_PRESS", "SMITH_MACHINE_OVERHEAD_PRESS", 120),
        ex("Elevação Lateral", 3, 12, "LATERAL_RAISE", "DUMBBELL_LATERAL_RAISE", 75),
        ex("Tríceps Pulley Barra", 3, 10, "TRICEPS_EXTENSION", "TRICEPS_PRESSDOWN", 75),
        ex("Tríceps Testa", 3, 10, "TRICEPS_EXTENSION", "DUMBBELL_LYING_TRICEPS_EXTENSION", 75),
    ], "Compostos RIR 1-2; falha só nos isoladores"),
    "QUA Puxar": treino_forca("QUA Puxar", [
        ex("Barra Fixa ou Puxada Alta (SEM falha)", 4, 10, "PULL_UP", "LAT_PULLDOWN", 150),
        ex("Remada Baixa Triângulo", 3, 10, "ROW", "SEATED_CABLE_ROW", 120),
        ex("Remada Máquina apoiada", 3, 10, "ROW", "CHEST_SUPPORTED_DUMBBELL_ROW", 120),
        ex("Crucifixo Inverso", 3, 12, "FLYE", "INCLINE_REVERSE_FLYE", 75),
        ex("Rosca Direta Halteres", 3, 10, "CURL", "STANDING_DUMBBELL_BICEPS_CURL", 75),
        ex("Rosca Martelo", 2, 12, "CURL", "DUMBBELL_HAMMER_CURL", 75),
    ], "Fazer >=6h antes dos tiros. Sem remada curvada (poupa lombar p/ quinta)"),
    "QUI Pernas A": treino_forca("QUI Pernas A", [
        ex("V-Squat ou Leg Press (RIR 2)", 4, 9, "SQUAT", "LEG_PRESS", 180),
        ex("Elevação Pélvica", 3, 10, "HIP_RAISE", "BARBELL_HIP_THRUST_WITH_BENCH", 120),
        ex("Afundo Step ou Búlgaro", 3, 11, "LUNGE", "DUMBBELL_BULGARIAN_SPLIT_SQUAT", 120),
        ex("Cadeira Flexora", 3, 11, "LEG_CURL", "LEG_CURL", 90),
        ex("Stiff (RIR 3 em semana de tiro forte)", 3, 11, "DEADLIFT", "BARBELL_STRAIGHT_LEG_DEADLIFT", 120),
        ex("Panturrilha em Pé", 3, 11, "CALF_RAISE", "STANDING_CALF_RAISE", 75),
        ex("Tibial Anterior", 3, 18, "CALF_RAISE", "SEATED_DUMBBELL_TOE_RAISE", 60),
    ], "ÚNICO dia pesado de perna — logo após o social run. NUNCA à falha"),
    "SEX Upper C + Core": treino_forca("SEX Upper C + Core", [
        ex("Crossover ou Supino Incl. Halteres", 3, 12, "FLYE", "CABLE_CROSSOVER", 90),
        ex("Desenvolvimento Halteres", 3, 9, "SHOULDER_PRESS", "SEATED_DUMBBELL_SHOULDER_PRESS", 120),
        ex("Elevação Lateral Polia", 3, 13, "LATERAL_RAISE", "ONE_ARM_CABLE_LATERAL_RAISE", 75),
        ex("Face Pull", 3, 13, "ROW", "FACE_PULL", 75),
        ex("Tríceps Francês Corda", 2, 11, "TRICEPS_EXTENSION", "CABLE_OVERHEAD_TRICEPS_EXTENSION", 75),
        ex("Rosca Scott", 2, 11, "CURL", "EZ_BAR_PREACHER_CURL", 75),
        ex("Abdominal Polia", 3, 13, "CRUNCH", "KNEELING_CABLE_CRUNCH", 60),
        ex("Pallof Press (10/lado)", 3, 10, "CORE", None, 60),
    ], "Volume reduzido de propósito — era redundante com terça"),
    "SAB Pernas B preventivo": treino_forca("SAB Pernas B preventivo", [
        ex("Abdução de Quadril ou Monster Walk", 3, 13, "BANDED_EXERCISES", "LATERAL_BAND_WALKS", 60),
        ex("Copenhagen Plank joelho apoiado (20-30s/lado)", 3, None, "PLANK", "SIDE_PLANK", 60, tempo_s=30),
        ex("Cadeira Extensora LEVE (RIR 4)", 2, 13, None, None, 75),
        ex("Panturrilha Sentado (sóleo)", 4, 13, "CALF_RAISE", "SEATED_CALF_RAISE", 60),
        ex("Tibial Anterior", 3, 18, "CALF_RAISE", "SEATED_DUMBBELL_TOE_RAISE", 60),
        ex("Prancha Lateral c/ Abdução (30s/lado)", 3, None, "PLANK", "SIDE_PLANK", 60, tempo_s=30),
    ], "RIR 3-4, NADA à falha — protege o longão de segunda"),
    "QUI Pernas FORCA MAX (set)": treino_forca("QUI Pernas FORCA MAX (set)", [
        ex("V-Squat ou Leg Press PESADO 80-87% (RIR 2)", 5, 5, "SQUAT", "LEG_PRESS", 180),
        ex("Elevação Pélvica pesada", 4, 6, "HIP_RAISE", "BARBELL_HIP_THRUST_WITH_BENCH", 180),
        ex("Búlgaro", 3, 8, "LUNGE", "DUMBBELL_BULGARIAN_SPLIT_SQUAT", 120),
        ex("Cadeira Flexora", 3, 10, "LEG_CURL", "LEG_CURL", 90),
        ex("Panturrilha em Pé", 4, 10, "CALF_RAISE", "STANDING_CALF_RAISE", 75),
        ex("Tibial Anterior", 3, 15, "CALF_RAISE", "SEATED_DUMBBELL_TOE_RAISE", 60),
    ], "Fase de força máxima: cargas altas, descanso completo, longe da falha"),
    "QUI Pernas MANUTENCAO (out)": treino_forca("QUI Pernas MANUTENCAO (out)", [
        ex("V-Squat ou Leg Press pesado", 3, 4, "SQUAT", "LEG_PRESS", 180),
        ex("Búlgaro", 2, 8, "LUNGE", "DUMBBELL_BULGARIAN_SPLIT_SQUAT", 120),
        ex("Cadeira Flexora", 2, 10, "LEG_CURL", "LEG_CURL", 90),
        ex("Panturrilha em Pé", 3, 10, "CALF_RAISE", "STANDING_CALF_RAISE", 75),
        ex("Tibial Anterior", 3, 15, "CALF_RAISE", "SEATED_DUMBBELL_TOE_RAISE", 60),
    ], "Pico de corrida: volume -40%. Pliometria leve 2x/sem à parte (40-60 contatos)"),
    "QUI Pernas POLIMENTO (nov)": treino_forca("QUI Pernas POLIMENTO (nov)", [
        ex("Leg Press pesado curto", 3, 5, "SQUAT", "LEG_PRESS", 180),
        ex("Elevação Pélvica", 2, 8, "HIP_RAISE", "BARBELL_HIP_THRUST_WITH_BENCH", 120),
        ex("Panturrilha em Pé", 3, 10, "CALF_RAISE", "STANDING_CALF_RAISE", 75),
    ], "Manter força neural SEM dano. Última pesada: 19/11. Sem DOMS a partir de 24/11"),
}


def _semanal(dia_semana, inicio, fim):
    """dia_semana: 0=seg ... 6=dom. Retorna datas ISO semanais no intervalo."""
    d = date.fromisoformat(inicio)
    while d.weekday() != dia_semana:
        d += timedelta(days=1)
    datas = []
    while d <= date.fromisoformat(fim):
        datas.append(d.isoformat())
        d += timedelta(weeks=1)
    return datas


AGENDA_FORCA = []
for dt in _semanal(1, "2026-07-07", "2026-11-24"):
    AGENDA_FORCA.append((dt, "TER Empurrar"))
for dt in _semanal(2, "2026-07-08", "2026-10-28"):
    AGENDA_FORCA.append((dt, "QUA Puxar"))
for dt in _semanal(3, "2026-07-09", "2026-08-27"):
    AGENDA_FORCA.append((dt, "QUI Pernas A"))
for dt in _semanal(3, "2026-09-03", "2026-10-01"):
    AGENDA_FORCA.append((dt, "QUI Pernas FORCA MAX (set)"))
for dt in _semanal(3, "2026-10-08", "2026-10-29"):
    AGENDA_FORCA.append((dt, "QUI Pernas MANUTENCAO (out)"))
for dt in _semanal(3, "2026-11-05", "2026-11-19"):
    AGENDA_FORCA.append((dt, "QUI Pernas POLIMENTO (nov)"))
for dt in _semanal(4, "2026-07-10", "2026-11-27"):
    AGENDA_FORCA.append((dt, "SEX Upper C + Core"))
for dt in _semanal(5, "2026-07-11", "2026-11-21"):
    AGENDA_FORCA.append((dt, "SAB Pernas B preventivo"))
AGENDA_FORCA.sort()
