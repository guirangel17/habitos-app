#!/usr/bin/env python3
"""Cria e agenda os treinos do ciclo Pampulha no Garmin Connect.

Uso:
    python3 criar.py --piloto    # só o teste 5km (29/07) + treino de força de terça
    python3 criar.py --corrida   # todos os treinos de corrida agendados
    python3 criar.py --forca     # todos os treinos de força agendados
    python3 criar.py --tudo      # tudo
    python3 criar.py --limpar    # apaga TUDO que estes scripts criaram

    python3 criar.py --atualizar [--dry-run] [nome...]
        Reescreve no lugar treinos JÁ criados (recalibragem de pace), preservando
        workoutId e agendamentos. Sem nomes, atualiza os afetados por pace de corrida.
"""
import copy
import sys
from datetime import date

import garmin_api as api
from treinos_corrida import AGENDA, CATALOGO
from treinos_forca import AGENDA_FORCA, CATALOGO_FORCA

HOJE = date.today().isoformat()


def _sem_exercicios(payload, tirar_categoria=False):
    p = copy.deepcopy(payload)
    for seg in p["workoutSegments"]:
        for grupo in seg["workoutSteps"]:
            for step in grupo.get("workoutSteps", [grupo]):
                step.pop("exerciseName", None)
                if tirar_categoria:
                    step.pop("category", None)
    return p


def criar_forca_resiliente(payload):
    """Tenta com exercícios mapeados; se a API rejeitar, degrada com elegância."""
    try:
        return api.criar_workout(payload)
    except Exception:
        try:
            print(f"    (nomes de exercício rejeitados — tentando só categorias)")
            return api.criar_workout(_sem_exercicios(payload))
        except Exception:
            print(f"    (categorias rejeitadas — criando com descrições apenas)")
            return api.criar_workout(_sem_exercicios(payload, tirar_categoria=True))


def rodar(agenda, catalogo, forca=False):
    criados, agendados = set(), 0
    for data_iso, nome in agenda:
        payload = catalogo[nome]
        if nome not in criados:
            wid = criar_forca_resiliente(payload) if forca else api.criar_workout(payload)
            criados.add(nome)
        else:
            wid = api._registro()["workouts"][nome]
        api.agendar(wid, data_iso, nome)
        agendados += 1
        print(f"  {data_iso}  {nome}")
    print(f"-> {len(criados)} treinos únicos, {agendados} datas agendadas")


# Treinos cujo alvo de pace mudou na recalibragem de 29/07/2026. "Tiros 6x400m" NÃO entra:
# só tem datas passadas (15/07, 22/07) e o workoutId é compartilhado, então atualizar
# reescreveria aquele histórico no relógio sem nenhuma data futura para beneficiar.
# Pela MESMA razão, "Tempo Run 4km moderado" saiu em 05/08/2026: era usado só em 30/09, data que
# virou o TESTE de 5 km, então ele ficou com ZERO datas na AGENDA. O builder segue no catálogo
# (documenta o plano original e volta de graça se a data for reposta) — é só a atualização de
# pace no relógio que não faz mais sentido.
# Revisado em 13/08/2026 (fascite plantar, TODO v7.27) pela MESMA regra do parágrafo acima:
# saíram "Tiros 5x800m", "Tiros 6x800m", "Tempo Run 4km", "Tempo Run 5km" e
# "Tempo Run 6km CHECKPOINT" porque o calendário novo os deixou com ZERO datas futuras —
# atualizá-los só reescreveria histórico no relógio. Os builders seguem no catálogo.
RECALIBRADOS = [
    "Tiros 4x1km", "Tiros 5x1km forte", "Tiros 3x1500m",
    "Tempo Run 3km", "Tempo Run 5km CHECKPOINT", "Tempo Run 5km taper",
]


def _pace_do_payload(payload):
    """Faixas de pace (min/km) de cada passo com alvo — pra conferir o que foi/será gravado."""
    out = []
    for seg in payload["workoutSegments"]:
        for grupo in seg["workoutSteps"]:
            for st in grupo.get("workoutSteps", [grupo]):
                alvo = st.get("targetType") or {}
                if alvo.get("workoutTargetTypeKey") != "pace.zone":
                    continue
                lento, rapido = st.get("targetValueOne"), st.get("targetValueTwo")
                if lento and rapido:
                    # arredonda, não trunca: a Garmin devolve o m/s com 8 dígitos e o
                    # truncamento faz 7:14.9999 virar "7:14", sugerindo uma mudança que não existe
                    fmt = lambda ms: f"{round(1000 / ms) // 60}:{round(1000 / ms) % 60:02d}"
                    out.append(f"{fmt(rapido)}-{fmt(lento)}")
    return out


def atualizar(nomes, dry_run=False):
    datas = {}
    for data_iso, nome in AGENDA:
        datas.setdefault(nome, []).append(data_iso)
    for nome in nomes:
        payload = CATALOGO.get(nome)
        if not payload:
            print(f"  ?? {nome}: não está no catálogo — pulado")
            continue
        futuras = [d for d in datas.get(nome, []) if d > HOJE]
        marca = "DRY-RUN" if dry_run else "gravado"
        if dry_run:
            wid = api._registro()["workouts"].get(nome)
        else:
            wid = api.atualizar_workout(nome, payload)
        if not wid:
            print(f"  ?? {nome}: não existe no registro (nunca criado) — pulado")
            continue
        print(f"  [{marca}] {nome:26} id={wid}  paces={' · '.join(_pace_do_payload(payload))}")
        print(f"{'':13}{len(futuras)} data(s) futura(s): {', '.join(futuras) or '—'}")


def main():
    argv = sys.argv[1:]
    dry_run = "--dry-run" in argv
    argv = [a for a in argv if a != "--dry-run"]
    arg = argv[0] if argv else "--piloto"

    if arg == "--atualizar":
        nomes = argv[1:] or RECALIBRADOS
        if not dry_run:
            api.conectar()
        print(f"== ATUALIZANDO {len(nomes)} treino(s) {'(DRY-RUN)' if dry_run else ''} ==")
        atualizar(nomes, dry_run)
        return

    usuario = api.conectar()
    print(f"Conectado como: {usuario}\n")

    if arg == "--limpar":
        api.limpar_tudo()
        print("Limpeza concluída.")
        return

    # --desagendar DATA "Nome do treino": usar quando uma data troca de treino no plano.
    # rodar() agenda o novo mas não remove o antigo — sem isso o dia fica com os dois.
    if arg == "--desagendar":
        if len(argv) < 3:
            print('uso: criar.py --desagendar 2026-09-30 "Tempo Run 4km moderado"')
            return
        api.desagendar(argv[1], argv[2])
        return

    if arg in ("--piloto",):
        print("== PILOTO: corrida ==")
        rodar([("2026-07-29", "TESTE 5km contrarrelogio")], CATALOGO)
        print("\n== PILOTO: força ==")
        rodar([("2026-07-14", "TER Empurrar")], CATALOGO_FORCA, forca=True)
        print("\nConfira no app Garmin Connect (Calendário: 29/07 e 14/07).")
        return

    if arg in ("--corrida", "--tudo"):
        print("== CORRIDA ==")
        rodar(AGENDA, CATALOGO)
    if arg in ("--forca", "--tudo"):
        print("\n== FORÇA ==")
        rodar(AGENDA_FORCA, CATALOGO_FORCA, forca=True)


if __name__ == "__main__":
    main()
