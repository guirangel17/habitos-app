#!/usr/bin/env python3
"""Cria e agenda os treinos do ciclo Pampulha no Garmin Connect.

Uso:
    python3 criar.py --piloto    # só o teste 5km (29/07) + treino de força de terça
    python3 criar.py --corrida   # todos os treinos de corrida agendados
    python3 criar.py --forca     # todos os treinos de força agendados
    python3 criar.py --tudo      # tudo
    python3 criar.py --limpar    # apaga TUDO que estes scripts criaram
"""
import copy
import sys

import garmin_api as api
from treinos_corrida import AGENDA, CATALOGO
from treinos_forca import AGENDA_FORCA, CATALOGO_FORCA


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


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "--piloto"
    usuario = api.conectar()
    print(f"Conectado como: {usuario}\n")

    if arg == "--limpar":
        api.limpar_tudo()
        print("Limpeza concluída.")
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
