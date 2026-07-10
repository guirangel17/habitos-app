"""Cliente mínimo para criar/agendar/apagar treinos no Garmin Connect via garth.

Mantém um registro local (garmin-criados.json) com tudo que foi criado,
para permitir conferência e limpeza (--limpar) sem tocar em nada que
não tenha sido criado por estes scripts.
"""
import json
import os
import socket
import warnings
from pathlib import Path


def _proxy_reverso():
    """Se houver um túnel SOCKS local (ssh -R 1080), usa-o automaticamente."""
    try:
        s = socket.create_connection(("127.0.0.1", 1080), timeout=1)
        s.close()
        os.environ.setdefault("HTTPS_PROXY", "socks5h://127.0.0.1:1080")
        os.environ.setdefault("HTTP_PROXY", "socks5h://127.0.0.1:1080")
        print("(usando túnel reverso SOCKS em 127.0.0.1:1080)")
    except OSError:
        pass


_proxy_reverso()
warnings.filterwarnings("ignore", category=DeprecationWarning)
import garth  # noqa: E402
from garth import sso as _garth_sso  # noqa: E402

# Desde mar/2026 o Cloudflare da Garmin bloqueia (429) os User-Agents do app mobile
# que o garth usa — no login e na troca OAuth1→OAuth2. UA de navegador passa
# (matin/garth#222). Mesma correção existe em pipeline/analisar.py.
_UA_NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
garth.client.sess.headers["User-Agent"] = _UA_NAVEGADOR
_garth_sso.OAUTH_USER_AGENT["User-Agent"] = _UA_NAVEGADOR


_BUNDLE = Path(__file__).parent / "zscaler-ca.pem"


def _zscaler_adapter():
    import ssl
    import requests.adapters
    from urllib3.util.retry import Retry

    class _Adapter(requests.adapters.HTTPAdapter):
        def _ctx(self):
            ctx = ssl.create_default_context()
            ctx.load_verify_locations(str(_BUNDLE))
            ctx.verify_flags |= ssl.VERIFY_X509_PARTIAL_CHAIN
            return ctx

        def init_poolmanager(self, *a, **kw):
            kw["ssl_context"] = self._ctx()
            return super().init_poolmanager(*a, **kw)

        def proxy_manager_for(self, proxy, **kw):
            kw["ssl_context"] = self._ctx()
            return super().proxy_manager_for(proxy, **kw)

    return _Adapter(max_retries=Retry(total=3, backoff_factor=0.5))


def confiar_zscaler():
    """Rede corporativa com inspeção TLS (Zscaler): valida contra a CA extraída.

    Precisa ser (re)aplicado após garth.resume/configure — o configure() do
    garth remonta um HTTPAdapter novo em "https://" e descarta o nosso.
    """
    if "HTTPS_PROXY" not in os.environ or not _BUNDLE.exists():
        return
    garth.client.sess.mount("https://", _zscaler_adapter())
    print("(TLS verificado via CA Zscaler)")


confiar_zscaler()

REGISTRO = Path(__file__).parent / "garmin-criados.json"


def conectar():
    garth.resume("~/.garth")
    confiar_zscaler()  # o resume() remonta o adaptador HTTP — reaplica o TLS
    perfil = garth.connectapi("/userprofile-service/socialProfile")
    return perfil.get("displayName") or perfil.get("fullName")


def _registro():
    if REGISTRO.exists():
        return json.loads(REGISTRO.read_text())
    return {"workouts": {}, "agendamentos": []}


def _salvar(reg):
    REGISTRO.write_text(json.dumps(reg, indent=2, ensure_ascii=False))


def criar_workout(payload):
    """Cria o treino se ainda não existe (por nome). Retorna workoutId."""
    reg = _registro()
    nome = payload["workoutName"]
    if nome in reg["workouts"]:
        return reg["workouts"][nome]
    resp = garth.connectapi("/workout-service/workout", method="POST", json=payload)
    wid = resp["workoutId"]
    reg["workouts"][nome] = wid
    _salvar(reg)
    return wid


def agendar(workout_id, data_iso, nome=""):
    reg = _registro()
    chave = f"{workout_id}:{data_iso}"
    if any(a["chave"] == chave for a in reg["agendamentos"]):
        return
    resp = garth.connectapi(
        f"/workout-service/schedule/{workout_id}", method="POST", json={"date": data_iso}
    )
    reg["agendamentos"].append(
        {"chave": chave, "scheduleId": resp.get("workoutScheduleId"), "nome": nome, "data": data_iso}
    )
    _salvar(reg)


def limpar_tudo():
    """Remove agendamentos e treinos criados por estes scripts."""
    reg = _registro()
    for ag in reg["agendamentos"]:
        if ag.get("scheduleId"):
            try:
                garth.connectapi(
                    f"/workout-service/schedule/{ag['scheduleId']}", method="DELETE"
                )
            except Exception as e:
                print(f"  aviso: agendamento {ag['data']} {ag['nome']}: {e}")
    for nome, wid in reg["workouts"].items():
        try:
            garth.connectapi(f"/workout-service/workout/{wid}", method="DELETE")
            print(f"  apagado: {nome}")
        except Exception as e:
            print(f"  aviso: {nome}: {e}")
    _salvar({"workouts": {}, "agendamentos": []})


# ---------- blocos de construção (corrida) ----------

def _ms(pace):
    """'5:45' (min/km) -> m/s"""
    m, s = pace.split(":")
    return 1000.0 / (int(m) * 60 + int(s))


def alvo_pace(lento, rapido):
    return {
        "targetType": {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "pace.zone"},
        "targetValueOne": _ms(lento),
        "targetValueTwo": _ms(rapido),
    }


SEM_ALVO = {"targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"}}

_TIPOS = {"warmup": 1, "cooldown": 2, "interval": 3, "recovery": 4, "rest": 5, "repeat": 6}


def passo(tipo, fim, valor=None, alvo=None, desc=None):
    """fim: 'distance' (m), 'time' (s) ou 'lap' (botão)."""
    cond = {"distance": (3, "distance"), "time": (2, "time"), "lap": (1, "lap.button")}[fim]
    p = {
        "type": "ExecutableStepDTO",
        "stepType": {"stepTypeId": _TIPOS[tipo], "stepTypeKey": tipo},
        "endCondition": {"conditionTypeId": cond[0], "conditionTypeKey": cond[1]},
    }
    if valor is not None:
        p["endConditionValue"] = valor
    p.update(alvo or SEM_ALVO)
    if desc:
        p["description"] = desc
    return p


def repeticao(n, passos):
    return {
        "type": "RepeatGroupDTO",
        "stepType": {"stepTypeId": _TIPOS["repeat"], "stepTypeKey": "repeat"},
        "numberOfIterations": n,
        "smartRepeat": False,
        "endCondition": {"conditionTypeId": 7, "conditionTypeKey": "iterations"},
        "workoutSteps": passos,
    }


def _numerar(passos, inicio=1):
    n = inicio
    for p in passos:
        p["stepOrder"] = n
        n += 1
        if p.get("type") == "RepeatGroupDTO":
            n = _numerar(p["workoutSteps"], n)
    return n


def treino_corrida(nome, passos, descricao=None):
    _numerar(passos)
    w = {
        "workoutName": nome,
        "sportType": {"sportTypeId": 1, "sportTypeKey": "running"},
        "workoutSegments": [
            {
                "segmentOrder": 1,
                "sportType": {"sportTypeId": 1, "sportTypeKey": "running"},
                "workoutSteps": passos,
            }
        ],
    }
    if descricao:
        w["description"] = descricao
    return w
