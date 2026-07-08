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

// ---- v2: contrato da noite ----
let ts = D.parseKey('2026-07-10').getTime() + 20 * 3600e3; // sexta 20h
const cEvs = [
  { id: 'c1', ts, type: 'contract', date: '2026-07-10', maxDrinks: 3, horaSaida: '00:30' },
  { id: 't1', ts: ts + 1e6, type: 'contract_tick', date: '2026-07-10', kind: 'drink' },
  { id: 't2', ts: ts + 2e6, type: 'contract_tick', date: '2026-07-10', kind: 'agua' },
  { id: 't3', ts: ts + 3e6, type: 'contract_tick', date: '2026-07-10', kind: 'drink' },
];
let ct = D.contratoAtivo(cEvs, '2026-07-10', 22);
ok(ct && ct.drinks === 2 && ct.aguas === 1 && ct.maxDrinks === 3, 'contrato ativo com placar 2 drinks / 1 água');
ct = D.contratoAtivo(cEvs, '2026-07-11', 2);
ok(ct && ct.date === '2026-07-10', 'contrato de ontem ainda ativo às 2h da manhã');
ct = D.contratoAtivo(cEvs, '2026-07-11', 12);
ok(ct === null, 'contrato expira às 6h do dia seguinte');
ct = D.contratoAtivo([...cEvs, { id: 'n1', ts: ts + 5e6, type: 'night_out', date: '2026-07-10', drinks: 2 }], '2026-07-10', 23);
ok(ct === null, 'night_out fecha o contrato');

// ---- v2: revisão de domingo ----
// 2026-07-12 é domingo; semana = 2026-07-06
ok(D.revisaoPendente([], '2026-07-12', 19) === '2026-07-06', 'domingo 19h: revisão pendente da semana');
ok(D.revisaoPendente([], '2026-07-12', 15) === null, 'domingo 15h: ainda não cobra');
ok(D.revisaoPendente([], '2026-07-13', 10) === '2026-07-06', 'segunda: graça para revisar semana anterior');
ok(D.revisaoPendente([], '2026-07-15', 10) === null, 'quarta: janela fechou');
const rev = [{ id: 'r', ts: 1, type: 'review', week: '2026-07-06' }];
ok(D.revisaoPendente(rev, '2026-07-12', 20) === null, 'revisão feita: não cobra mais');

// ---- v2: identidade assinada ----
const revs4 = ['2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29'].map((w, i) => ({ id: 'r' + i, ts: i, type: 'review', week: w }));
let ident = D.identidadeAssinada(revs4, '2026-07-08'); // semana atual 06/07; 4 anteriores revisadas
ok(ident.assinada && ident.progresso === 4, 'identidade assinada com 4 semanas revisadas');
ident = D.identidadeAssinada(revs4.slice(1), '2026-07-08');
ok(!ident.assinada && ident.progresso === 3, 'identidade 3/4 sem assinar');

// ---- v2: gatilho × período ----
const g1 = D.parseKey('2026-07-06').getTime();
const gEvs = [
  { id: 'g1', ts: g1 + 15.5 * 3600e3, type: 'sweet', date: '2026-07-06', trigger: '15h' },
  { id: 'g2', ts: g1 + 16 * 3600e3, type: 'sos', kind: 'doce', outcome: 'surfed', date: '2026-07-06', trigger: '15h' },
  { id: 'g3', ts: g1 + 21 * 3600e3, type: 'delivery', date: '2026-07-06', trigger: 'preguiça' },
];
const gp = D.gatilhosPorPeriodo(gEvs, '2026-07-07', 28);
ok(gp.total === 3 && gp.mapa['15h'][2] === 2 && gp.mapa['preguiça'][3] === 1, 'gatilhos agregados por período do dia');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas ? 1 : 0);
