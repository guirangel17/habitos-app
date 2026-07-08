import * as D from '../derive.js';

let falhas = 0;
const ok = (cond, msg) => { if (!cond) { falhas++; console.error('FALHA:', msg); } else console.log('ok:', msg); };

// tipo de dia (2026-07-07 é terça)
ok(D.tipoDoDia('2026-07-07') === 'MODERADO', 'terça = MODERADO');
ok(D.tipoDoDia('2026-07-06') === 'INTENSO', 'segunda = INTENSO');
ok(D.tipoDoDia('2026-07-11') === 'LEVE', 'sábado = LEVE');
ok(D.tipoDoDia('2026-07-12') === 'DESCANSO', 'domingo = DESCANSO');
ok(D.tipoDoDia('2026-07-07', { '2026-07-07': 'LEVE' }) === 'LEVE', 'override vence');

// fases
ok(D.fase('2026-10-04') === 'deficit', '04/10 ainda déficit');
ok(D.fase('2026-10-05') === 'manutencao', '05/10 manutenção');
ok(D.fase('2026-12-04') === 'carga', '04/12 carga');
ok(D.fase('2026-12-06') === 'prova', '06/12 prova');

// semana começa na segunda
ok(D.inicioSemana('2026-07-07') === '2026-07-06', 'início da semana = segunda 06/07');
ok(D.inicioSemana('2026-07-06') === '2026-07-06', 'segunda é início dela mesma');
ok(D.inicioSemana('2026-07-12') === '2026-07-06', 'domingo pertence à semana da segunda anterior');

// contador resiliente
const ev = (type, date, extra = {}) => ({ id: date + type + Math.random(), ts: D.parseKey(date).getTime(), type, date, ...extra });

// sem deslizes: streak = dias desde startKey
let c = D.contadorResiliente([], 'delivery', '2026-07-07', '2026-06-27');
ok(c.streak === 10 && !c.amassado, 'sem deslizes: 10 dias desde início');

// deslize isolado ontem: amassado, streak NÃO zera
c = D.contadorResiliente([ev('delivery', '2026-07-06')], 'delivery', '2026-07-07', '2026-06-27');
ok(c.amassado === true, 'deslize ontem → amassado');
ok(c.streak === 10, `deslize isolado não zera streak (${c.streak})`);
ok(c.recuperacoes === 1, 'recuperação contada após 1 dia limpo');

// deslize hoje: amassado, ainda sem recuperação
c = D.contadorResiliente([ev('delivery', '2026-07-07')], 'delivery', '2026-07-07', '2026-06-27');
ok(c.amassado === true && c.recuperacoes === 0, 'deslize hoje → amassado, sem recuperação ainda');

// dois dias seguidos: quebra — streak recomeça no 2º deslize
c = D.contadorResiliente([ev('delivery', '2026-07-03'), ev('delivery', '2026-07-04')], 'delivery', '2026-07-07', '2026-06-27');
ok(c.streak === 3, `2 seguidos: streak recomeça (3 dias desde 04/07, veio ${c.streak})`);
ok(c.recorde >= 6, `recorde preserva o segmento anterior (${c.recorde})`);
ok(!c.amassado, 'não está amassado (deslize há 3 dias)');

// sos gave_in conta como deslize do tipo
c = D.contadorResiliente([ev('sos', '2026-07-06', { kind: 'ifood', outcome: 'gave_in' })], 'delivery', '2026-07-07', '2026-06-27');
ok(c.amassado === true, 'sos ifood gave_in conta como deslize de delivery');
c = D.contadorResiliente([ev('sos', '2026-07-06', { kind: 'ifood', outcome: 'surfed' })], 'delivery', '2026-07-07', '2026-06-27');
ok(c.amassado === false, 'sos surfado NÃO conta como deslize');

// métricas da semana (semana de 06/07 a 12/07)
const evs = [
  ev('delivery', '2026-07-06'),
  ev('sos', '2026-07-07', { kind: 'ifood', outcome: 'gave_in' }),
  ev('sweet', '2026-07-07'),
  ev('night_out', '2026-07-06', { drinks: 4 }),
  ev('night_out', '2026-07-07', { drinks: 2 }),
  ev('delivery', '2026-07-05'), // semana anterior — não conta
];
const m = D.metricasSemana(evs, '2026-07-07');
ok(m.delivery === 2, `delivery da semana = 2 (veio ${m.delivery})`);
ok(m.sweet === 1, 'sweet da semana = 1');
ok(m.drinks === 3, `média de drinks = 3 (veio ${m.drinks})`);

// média móvel 7d
const pesos = [
  { date: '2026-07-01', valor: 84 }, { date: '2026-07-03', valor: 85 },
  { date: '2026-07-08', valor: 83 },
];
const mm = D.mediaMovel7(pesos);
ok(mm[1].valor === 84.5, 'MM inclui pontos na janela de 7 dias');
ok(mm[2].valor === 84, 'MM ignora pontos fora da janela (01/07 fora da janela de 08/07)');

// refeições
const mEvs = [
  ev('meal', '2026-07-07', { meal: 'cafe', status: 'ok' }),
  ev('meal', '2026-07-07', { meal: 'almoco', status: 'skip' }),
  ev('meal', '2026-07-07', { meal: 'almoco', status: 'sub' }), // último vence
];
const mm2 = D.mealsOfDay(mEvs, '2026-07-07');
ok(D.mealsDone(mm2) === 2, 'ok + sub contam; último evento vence');

// ressaca
const rEvs = [
  ev('hangover_on', '2026-07-07'),
  ev('hangover_step', '2026-07-07', { step: 'agua' }),
  ev('hangover_step', '2026-07-07', { step: 'cafe' }),
  ev('hangover_step', '2026-07-07', { step: 'caminhada' }),
  ...['cafe', 'lanche1', 'almoco', 'lanche2'].map((meal) => ev('meal', '2026-07-07', { meal, status: 'ok' })),
];
const r = D.ressacaDoDia(rEvs, '2026-07-07');
ok(r.on && r.completo, 'ressaca: 3 passos + 4 refeições = dominó quebrado');
ok(D.dominosQuebrados(rEvs, '2026-07-08') === 1, 'dominós quebrados = 1');

// corredor
const cor = D.corredorMeta([{ date: '2026-07-01', valor: 84 }], '2026-07-07');
const c14 = cor('2026-07-15');
ok(Math.abs(c14.alto - (84 - 0.3 * 2)) < 1e-9, 'corredor -0,3/sem em 2 semanas');
const cPos = cor('2026-12-01');
const diasDeficit = D.diffDays('2026-07-01', '2026-10-04');
ok(Math.abs(cPos.alto - (84 - (0.3 / 7) * diasDeficit)) < 1e-9, 'corredor achata após fim do déficit');

// heatmap
const hm = D.heatmapConstancia(mEvs, '2026-07-07', 4);
ok(hm.length === 4 && hm[3].dias[1] === 2 && hm[3].dias[2] === null, 'heatmap: terça=2 refeições, quarta=futuro');

// semanas até a prova
ok(D.semanasAteProva('2026-12-06') === 0, 'dia da prova: 0 semanas');
ok(D.semanasAteProva('2026-11-29') === 1, '1 semana antes');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas ? 1 : 0);
