#!/usr/bin/env python3
"""Testes das funções puras do pipeline (sem rede): python3 pipeline/test_analisar.py"""
import unittest

from analisar import (
    TIPOS_CORRIDA, ZONAS_FC, calcular_tendencias, compactar_atividade, corrida_do_dia,
    eh_corrida_z2, extrair_fc_details, fmt_pace, pace_seg, proxima_corrida, resumir_splits,
    tipo_atividade, validar_ia, zonas_de_pontos,
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
        self.assertFalse(eh_corrida_z2(c))  # FC 158 > 152
        c2 = dict(c, fcMedia=145, distanciaKm=10.0)
        self.assertTrue(eh_corrida_z2(c2))

    def test_tendencias(self):
        corridas = [
            {"date": "2026-04-01", "paceSeg": 450, "fcMedia": 145, "distanciaKm": 10, "cadencia": 158, "vo2max": 46},
            {"date": "2026-04-15", "paceSeg": 440, "fcMedia": 148, "distanciaKm": 12, "cadencia": 159, "vo2max": 46},
            {"date": "2026-06-20", "paceSeg": 415, "fcMedia": 147, "distanciaKm": 12, "cadencia": 162, "vo2max": 48},
            {"date": "2026-07-01", "paceSeg": 410, "fcMedia": 146, "distanciaKm": 14, "cadencia": 163, "vo2max": 48},
            {"date": "2026-07-06", "paceSeg": 590, "fcMedia": 170, "distanciaKm": 5, "cadencia": 165, "vo2max": 48},  # não-Z2
        ]
        t = calcular_tendencias(corridas, "2026-07-08")
        self.assertEqual(len(t["paceZ2Serie"]), 4)  # a de FC 170 fica fora
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


if __name__ == "__main__":
    unittest.main(verbosity=1)
