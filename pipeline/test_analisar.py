#!/usr/bin/env python3
"""Testes das funções puras do pipeline (sem rede): python3 pipeline/test_analisar.py"""
import unittest

import forca

from clima import extrair_janelas
from analisar import (
    TIPOS_CORRIDA, ZONAS_FC, calcular_tendencias, compactar_atividade, compactar_forca,
    corrida_do_dia, deriva_cardiaca, eh_corrida_z2, extrair_fc_details, fmt_pace, pace_seg,
    proxima_corrida, resumir_splits, tipo_atividade, validar_ia, zonas_de_pontos,
)

CORRIDAS = [
    ["2026-07-05", "prova", "PROVA 5 km"],
    ["2026-07-08", "leve", "5 km leve"],
    ["2026-07-13", "longo", "LONGO 10 km (Z2)"],
]


class TestPuras(unittest.TestCase):
    def test_fmt_pace(self):
        self.assertEqual(fmt_pace(391), "6:31")
        self.assertEqual(fmt_pace(360), "6:00")
        self.assertIsNone(fmt_pace(None))

    def test_pace_seg(self):
        # 4860 m em 1900 s → 391,0 s/km
        self.assertAlmostEqual(pace_seg(4860.4, 1900.4), 391.0, places=1)
        self.assertIsNone(pace_seg(50, 30))  # curto demais

    def test_zonas_cobrem_todas_as_fcs(self):
        for fc in range(40, 220):
            faixas = [z for z, lo, hi in ZONAS_FC if lo <= fc <= hi]
            self.assertEqual(len(faixas), 1, f"fc {fc} em {faixas}")

    def test_zonas_de_pontos_uniforme(self):
        # 50 amostras em Z2 (140) + 50 em Z4 (170), sem timestamp → 50/50
        pontos = [(140, None)] * 50 + [(170, None)] * 50
        z = zonas_de_pontos(pontos)
        self.assertEqual(z["z2"], 50)
        self.assertEqual(z["z4"], 50)
        self.assertEqual(sum(z.values()), 100)

    def test_zonas_de_pontos_com_timestamp_e_buraco(self):
        # buraco de 10 min entre amostras é limitado a 60s
        pontos = [(140, 0), (140, 1000), (170, 601_000), (170, 602_000)]
        z = zonas_de_pontos(pontos * 5)  # ≥10 amostras
        self.assertEqual(sum(z.values()), 100)

    def test_zonas_poucas_amostras(self):
        self.assertIsNone(zonas_de_pontos([(140, None)] * 5))

    def test_extrair_fc_details_descarta_gps(self):
        details = {
            "metricDescriptors": [
                {"key": "directLatitude", "metricsIndex": 0},
                {"key": "directHeartRate", "metricsIndex": 1},
                {"key": "directTimestamp", "metricsIndex": 2},
            ],
            "activityDetailMetrics": [
                {"metrics": [-19.85, 145, 1000]},
                {"metrics": [-19.86, 150, 2000]},
                {"metrics": [-19.87, None, 3000]},
            ],
        }
        pts = extrair_fc_details(details)
        self.assertEqual(pts, [(145, 1000), (150, 2000)])
        self.assertNotIn(-19.85, [p[0] for p in pts])

    def test_resumir_splits(self):
        laps = [
            {"distance": 1000, "movingDuration": 405, "averageHR": 148.4},
            {"distance": 1000, "movingDuration": 391, "averageHR": 155.0},
            {"distance": 120, "movingDuration": 50, "averageHR": 160},  # parcial curto: fora
        ]
        s = resumir_splits(laps)
        self.assertEqual(len(s), 2)
        self.assertEqual(s[0], {"km": 1, "pace": "6:45", "fc": 148})

    def test_tipo_atividade(self):
        # forma CRUA da API (a que o Actions recebe): typeKey aninhado em activityType —
        # foi o bug que zerava o filtro e deixava historico/analises vazios
        self.assertEqual(tipo_atividade({"activityType": {"typeKey": "running"}}), "running")
        self.assertIn(tipo_atividade({"activityType": {"typeKey": "treadmill_running"}}), TIPOS_CORRIDA)
        self.assertEqual(tipo_atividade({"typeKey": "running"}), "running")  # forma achatada
        self.assertNotIn(tipo_atividade({"activityType": {"typeKey": "cycling"}}), TIPOS_CORRIDA)
        self.assertIsNone(tipo_atividade({}))

    def test_extrair_janelas_clima(self):
        horas = [f"2026-07-08T{h:02d}:00" for h in range(24)] + [f"2026-07-09T{h:02d}:00" for h in range(24)]
        hourly = {
            "time": horas,
            "temperature_2m": [15 + i * 0.5 for i in range(48)],
            "precipitation_probability": list(range(48)),
            "relative_humidity_2m": [60] * 48,
        }
        j = extrair_janelas(hourly, "2026-07-08")
        self.assertEqual([p["quando"] for p in j],
                         ["2026-07-08T06:00", "2026-07-08T19:00", "2026-07-09T06:00", "2026-07-09T19:00"])
        self.assertEqual(j[0], {"quando": "2026-07-08T06:00", "temp": 18, "chuvaPct": 6, "umidade": 60})
        self.assertEqual(j[2]["temp"], 30)  # índice 30 → 15 + 15
        self.assertEqual(extrair_janelas({}, "2026-07-08"), [])

    def test_projecao_18k(self):
        corridas = [
            {"date": "2026-05-13", "paceSeg": 360, "fcMedia": 165, "distanciaKm": 5.0},  # melhor esforço
            {"date": "2026-06-20", "paceSeg": 415, "fcMedia": 147, "distanciaKm": 12},   # Z2, não conta
        ]
        p = calcular_tendencias(corridas, "2026-07-08")["projecao18k"]
        self.assertEqual(p["base"], {"date": "2026-05-13", "km": 5.0, "pace": "6:00"})
        self.assertEqual(p["otimista"], {"tempo": "1h57", "pace": "6:29"})
        self.assertEqual(p["conservador"], {"tempo": "2h03", "pace": "6:49"})
        # esforço com mais de 12 semanas não serve de base → sem projeção
        velho = [{"date": "2026-03-01", "paceSeg": 360, "fcMedia": 165, "distanciaKm": 5.0}]
        self.assertIsNone(calcular_tendencias(velho, "2026-07-08")["projecao18k"])

    def test_deriva_cardiaca(self):
        # 10 km a 6:00/km: 1ª metade FC 145, 2ª metade FC 152 no mesmo pace →
        # custo cardíaco sobe 152/145 - 1 = +4.8%
        laps = [{"distance": 1000, "movingDuration": 360.0, "averageHR": 145 if i < 5 else 152}
                for i in range(10)]
        self.assertAlmostEqual(deriva_cardiaca(laps), 4.8, places=1)
        # FC e pace idênticos nas duas metades → deriva 0
        constantes = [{"distance": 1000, "movingDuration": 360.0, "averageHR": 148} for _ in range(10)]
        self.assertEqual(deriva_cardiaca(constantes), 0.0)
        # curta demais (<8 km) ou sem FC → None
        self.assertIsNone(deriva_cardiaca(laps[:6]))
        self.assertIsNone(deriva_cardiaca([{"distance": 1000, "movingDuration": 360.0}] * 10))
        self.assertIsNone(deriva_cardiaca(None))

    def test_corrida_do_dia_e_proxima(self):
        self.assertEqual(corrida_do_dia("2026-07-08", CORRIDAS)["tipo"], "leve")
        self.assertIsNone(corrida_do_dia("2026-07-09", CORRIDAS))
        self.assertEqual(proxima_corrida("2026-07-08", CORRIDAS)["tipo"], "longo")

    def test_compactar_e_z2(self):
        a = {"activityId": 1, "startTimeLocal": "2026-07-05 08:22:20", "distance": 4860.4,
             "duration": 1903.0, "movingDuration": 1900.4, "averageHR": 158.0, "maxHR": 172.0,
             "averageRunningCadenceInStepsPerMinute": 161.3, "vO2MaxValue": 48.0,
             "aerobicTrainingEffect": 3.79, "typeKey": "running"}
        c = compactar_atividade(a, CORRIDAS)
        self.assertEqual(c["date"], "2026-07-05")
        self.assertEqual(c["tipoPlano"], "prova")
        self.assertEqual(c["paceMedio"], "6:31")
        self.assertEqual(c["paradoPct"], 0)  # 1900.4s em movimento de 1903s totais
        self.assertAlmostEqual(c["ef"], 4860.4 / (158.0 * 1900.4 / 60), places=3)  # m/batimento
        self.assertFalse(eh_corrida_z2(c))  # FC 158 > 152
        c2 = dict(c, fcMedia=145, distanciaKm=10.0)
        self.assertTrue(eh_corrida_z2(c2))
        # corrida social: FC baixa e distância ok, mas 27% parado — fora da curva Z2
        self.assertFalse(eh_corrida_z2(dict(c2, paradoPct=27)))
        self.assertTrue(eh_corrida_z2(dict(c2, paradoPct=None)))  # sem movingDuration = confia

    def test_compactar_forca(self):
        a = {"activityId": 9, "startTimeLocal": "2026-07-09 19:02:11", "duration": 2710.0,
             "movingDuration": 2400.0, "activityName": "Força B — inferiores",
             "activityType": {"typeKey": "strength_training"}}
        f = compactar_forca(a)
        self.assertEqual(f, {"date": "2026-07-09", "activityId": 9, "minutos": 40,
                             "nome": "Força B — inferiores"})
        self.assertIsNone(compactar_forca({"activityId": 1})["minutos"])  # sem duração

    def test_tendencias(self):
        corridas = [
            {"date": "2026-04-01", "paceSeg": 450, "fcMedia": 145, "distanciaKm": 10, "cadencia": 158, "vo2max": 46, "ef": 0.90},
            {"date": "2026-04-15", "paceSeg": 440, "fcMedia": 148, "distanciaKm": 12, "cadencia": 159, "vo2max": 46, "ef": 0.91},
            {"date": "2026-06-20", "paceSeg": 415, "fcMedia": 147, "distanciaKm": 12, "cadencia": 162, "vo2max": 48, "ef": 0.95},
            {"date": "2026-07-01", "paceSeg": 410, "fcMedia": 146, "distanciaKm": 14, "cadencia": 163, "vo2max": 48, "ef": 0.97},
            {"date": "2026-07-02", "paceSeg": 481, "fcMedia": 127, "distanciaKm": 6, "cadencia": 120, "vo2max": 47, "paradoPct": 27, "ef": 1.10},  # social
            {"date": "2026-07-06", "paceSeg": 590, "fcMedia": 170, "distanciaKm": 5, "cadencia": 165, "vo2max": 48, "ef": 0.88},  # não-Z2
        ]
        t = calcular_tendencias(corridas, "2026-07-08")
        self.assertEqual(len(t["paceZ2Serie"]), 4)  # FC 170 e a social (27% parada) ficam fora
        self.assertEqual(t["cadencia4Sem"], round((162 + 163 + 165) / 3))  # social não derruba a cadência
        # EF usa as limpas até Z3: FC 170 (esforço anaeróbio) e social ficam fora
        self.assertEqual(len(t["efSerie"]), 4)
        self.assertEqual(t["efAtual"], round((0.91 + 0.95 + 0.97) / 3, 3))
        self.assertEqual(t["efHa8Sem"], round((0.90 + 0.91) / 2, 3))  # só as ≤ 2026-05-13
        # 12 semanas de volume, segunda a segunda, semana vazia = 0
        self.assertEqual(len(t["kmSemanas"]), 12)
        self.assertEqual(t["kmSemanas"][-1], {"semana": "2026-07-06", "km": 5})
        self.assertEqual(t["kmSemanas"][-2], {"semana": "2026-06-29", "km": 20.0})  # 14 + social 6 (volume conta tudo)
        self.assertEqual(t["kmSemanas"][0]["km"], 0)
        # longão por mês
        self.assertEqual(t["longaoMes"], [
            {"mes": "2026-04", "km": 12, "date": "2026-04-15"},
            {"mes": "2026-06", "km": 12, "date": "2026-06-20"},
            {"mes": "2026-07", "km": 14, "date": "2026-07-01"},
        ])
        self.assertEqual(t["paceZ2Ha8Sem"], fmt_pace((450 + 440) / 2))  # só as ≤ 2026-05-13
        self.assertIsNotNone(t["paceZ2Atual"])
        self.assertEqual(t["vo2max"]["atual"], 48)
        self.assertEqual(t["vo2max"]["ha8Sem"], 46)
        self.assertGreater(t["kmPorSemana4Sem"], 0)

    def test_validar_ia(self):
        ok = {"resumo": "x", "comparacao_plano": "y", "proxima_dica": "z",
              "pontos_fortes": ["a"], "pontos_atencao": []}
        self.assertEqual(validar_ia(ok), ok)
        with self.assertRaises(ValueError):
            validar_ia(dict(ok, pontos_fortes=[]))
        with self.assertRaises(ValueError):
            validar_ia(dict(ok, resumo=""))



class TestForca(unittest.TestCase):
    """Funções puras da análise de musculação (forca.py)."""

    def _sets(self, *itens):
        return {"exerciseSets": list(itens)}

    def _set(self, reps, peso_g, dur=45, nome="BARBELL_BENCH_PRESS", cat="BENCH_PRESS", tipo="ACTIVE"):
        return {"setType": tipo, "repetitionCount": reps, "weight": peso_g, "duration": dur,
                "exercises": [{"name": nome, "category": cat}]}

    def _ex(self, series, nome="BARBELL_BENCH_PRESS", cat="BENCH_PRESS"):
        return {"nome": nome, "categoria": cat, "series": series}

    def test_normalizar_sets(self):
        payload = self._sets(
            self._set(10, 60000),
            {"setType": "REST", "duration": 90},                      # descartado
            self._set(11, 60000),
            self._set(12, 14000, nome="DUMBBELL_LATERAL_RAISE", cat="LATERAL_RAISE"),
            self._set(8, None, nome="PULL_UP", cat="PULL_UP"),        # peso corporal
        )
        exs = forca.normalizar_sets(payload)
        self.assertEqual([e["nome"] for e in exs], ["BARBELL_BENCH_PRESS", "DUMBBELL_LATERAL_RAISE", "PULL_UP"])
        self.assertEqual(exs[0]["series"], [{"reps": 10, "kg": 60.0, "s": 45}, {"reps": 11, "kg": 60.0, "s": 45}])
        self.assertIsNone(exs[2]["series"][0]["kg"])                  # null ≠ 0
        self.assertEqual(forca.normalizar_sets({}), [])
        self.assertEqual(forca.normalizar_sets(None), [])

    def test_eh_pulado(self):
        self.assertTrue(forca.eh_pulado([{"reps": 0, "kg": None, "s": 2}, {"reps": 0, "kg": 0, "s": 1}]))
        # exercício por TEMPO (prancha): reps 0 mas 30s de duração = executado
        self.assertFalse(forca.eh_pulado([{"reps": 0, "kg": None, "s": 30}]))
        self.assertFalse(forca.eh_pulado([{"reps": 0, "kg": 20.0, "s": 2}]))
        self.assertFalse(forca.eh_pulado([]))

    def test_dia_semana_js(self):
        self.assertEqual(forca.dia_semana_js("2026-07-09"), 4)   # quinta
        self.assertEqual(forca.dia_semana_js("2026-07-12"), 0)   # domingo
        self.assertEqual(forca.dia_semana_js("2026-07-13"), 1)   # segunda

    def test_parear_exercicios(self):
        atual = [self._ex([{"reps": 10, "kg": 60.0, "s": 45}]),
                 self._ex([{"reps": 12, "kg": 30.0, "s": 40}], nome="DUMBBELL_LUNGE", cat="LUNGE"),
                 self._ex([{"reps": 15, "kg": 25.0, "s": 40}], nome="NOVO_EXERCICIO", cat=None)]
        anterior = [self._ex([{"reps": 9, "kg": 60.0, "s": 45}]),
                    self._ex([{"reps": 10, "kg": 28.0, "s": 40}], nome="BULGARIAN_SPLIT_SQUAT", cat="LUNGE")]
        pares = forca.parear_exercicios(atual, anterior)
        self.assertEqual(pares[0][1]["nome"], "BARBELL_BENCH_PRESS")     # nome exato
        self.assertEqual(pares[1][1]["nome"], "BULGARIAN_SPLIT_SQUAT")   # substituição via categoria
        self.assertIsNone(pares[2][1])                                    # sem par = novo

    def test_status_progressao(self):
        ex = lambda kg, reps: self._ex([{"reps": reps, "kg": kg, "s": 45}])
        up = forca.status_progressao(ex(62.5, 9), ex(60.0, 11))
        self.assertEqual(up["status"], "carga_up")                        # ciclo da progressão dupla
        self.assertEqual(up["deltaCarga"], 2.5)
        self.assertEqual(up["deltaReps"], -2)                             # reps caindo = método funcionando
        self.assertEqual(forca.status_progressao(ex(60.0, 11), ex(60.0, 10))["status"], "reps_up")
        self.assertEqual(forca.status_progressao(ex(60.0, 10), ex(60.0, 10))["status"], "igual")
        self.assertEqual(forca.status_progressao(ex(55.0, 10), ex(60.0, 10))["status"], "ajuste")
        self.assertEqual(forca.status_progressao(ex(60.0, 10), None)["status"], "novo")
        pulado = self._ex([{"reps": 0, "kg": 0, "s": 2}])
        self.assertEqual(forca.status_progressao(pulado, ex(60.0, 10))["status"], "pulado")

    def test_estagnado(self):
        s = lambda: {"series": [{"reps": 10, "kg": 60.0, "s": 45}]}
        self.assertTrue(forca.estagnado([s(), s(), s()]))
        self.assertFalse(forca.estagnado([s(), s()]))
        diferente = {"series": [{"reps": 11, "kg": 60.0, "s": 45}]}
        self.assertFalse(forca.estagnado([s(), s(), diferente]))

    def test_volume_kg(self):
        exs = [self._ex([{"reps": 10, "kg": 60.0, "s": 45}, {"reps": 8, "kg": None, "s": 45}]),
               self._ex([{"reps": 0, "kg": 0, "s": 2}], nome="TIBIALIS", cat=None)]
        self.assertEqual(forca.volume_kg(exs), 600)                       # None e pulado contam 0

    def test_eh_semana_deload(self):
        corridas = [["2026-08-31", "longo", "LONGO 10 km — DELOAD (academia: metade das séries)"],
                    ["2026-09-07", "longo", "LONGO 14km dividido"]]
        self.assertTrue(forca.eh_semana_deload("2026-09-02", corridas))   # qua da semana do deload
        self.assertTrue(forca.eh_semana_deload("2026-09-06", corridas))   # domingo ainda é a mesma semana
        self.assertFalse(forca.eh_semana_deload("2026-09-09", corridas))
        self.assertFalse(forca.eh_semana_deload("2026-08-30", corridas))  # domingo ANTES do deload

    def test_resumir_sessao_e_baseline(self):
        exercicios = [self._ex([{"reps": 11, "kg": 60.0, "s": 45}] * 4),
                      self._ex([{"reps": 0, "kg": 0, "s": 2}] * 3, nome="TIBIALIS_RAISE", cat=None)]
        baseline = {"date": "2026-07-02", "activityId": 1, "geradoEm": "x",
                    "sessao": {"exercicios": [self._ex([{"reps": 10, "kg": 60.0, "s": 45}] * 4)]}}
        sessao = forca.resumir_sessao(52, exercicios, baseline)
        self.assertEqual(sessao["series"], 7)
        self.assertEqual(sessao["volumeKg"], 4 * 11 * 60)
        self.assertEqual(sessao["exercicios"][0]["status"], "reps_up")
        self.assertEqual(sessao["exercicios"][1]["status"], "pulado")
        # baseline: mesmo weekday mais recente; a 1ª do dia vira baseline da 2ª
        analises = [baseline,
                    {"date": "2026-07-09", "activityId": 2, "geradoEm": "a",
                     "sessao": {"exercicios": [self._ex([{"reps": 1, "kg": 1, "s": 5}])]}},
                    {"date": "2026-07-08", "activityId": 3, "geradoEm": "b",
                     "sessao": {"exercicios": [self._ex([{"reps": 1, "kg": 1, "s": 5}])]}}]
        b = forca.baseline_mesmo_dia("2026-07-09", 99, analises)
        self.assertEqual(b["activityId"], 2)                              # qui 09/07 > qui 02/07; qua 08/07 fora
        self.assertIsNone(forca.baseline_mesmo_dia("2026-07-11", 99, analises))


if __name__ == "__main__":
    unittest.main(verbosity=1)
