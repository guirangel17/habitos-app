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

// ---- v3: treino ----
let td = D.treinoDoDia('2026-07-13'); // segunda: LONGO 10 km, sem academia
ok(td.corrida && td.corrida.nome.includes('LONGO 10') && td.gym === null, 'segunda 13/07: longão, sem academia');
td = D.treinoDoDia('2026-07-16'); // quinta: social run + Pernas A
ok(td.corrida && td.corrida.tipo === 'social' && td.gym.includes('Pernas A'), 'quinta 16/07: social + Pernas A');
td = D.treinoDoDia('2026-07-14'); // terça: só academia
ok(td.corrida === null && td.gym.includes('Empurrar'), 'terça: só Empurrar');
td = D.treinoDoDia('2026-07-12'); // domingo
ok(td.corrida === null && td.gym === null, 'domingo: descanso total');

const wEvs = [
  { id: 'w1', ts: 1, type: 'workout', date: '2026-07-13', kind: 'corrida', done: true },
  { id: 'w2', ts: 2, type: 'workout', date: '2026-07-14', kind: 'gym', done: true },
  { id: 'w3', ts: 3, type: 'workout', date: '2026-07-15', kind: 'gym', done: true },
  { id: 'w4', ts: 4, type: 'workout', date: '2026-07-15', kind: 'gym', done: false }, // desfez — último vence
];
const semT = D.semanaTreino(wEvs, '2026-07-15');
ok(semT.gymPlan === 5 && semT.gymFeito === 1, `semana treino: academia 1/5 (veio ${semT.gymFeito}/${semT.gymPlan})`);
ok(semT.corridaPlan === 3 && semT.corridaFeita === 1, `semana treino: corrida 1/3 (veio ${semT.corridaFeita}/${semT.corridaPlan})`);

const cs = D.corridasStats(wEvs, '2026-07-16');
ok(cs.feitas === 1 && cs.passadas === 6 && cs.total === 67, `corridas: 1/6 até 16/07, 67 no total (veio ${cs.feitas}/${cs.passadas}/${cs.total})`);

// ---- v7.10: remanejamento de treino pro dia certo do plano ----
// terça 14/07 não tem corrida planejada; o longão de segunda 13/07 ficou sem check
ok(D.sugestaoRemanejamento([], '2026-07-14', 'corrida') === '2026-07-13', 'sugere o longão de segunda pra atividade de terça sem plano');
// se segunda já foi confirmada, não sugere de novo
const jaFeito = [{ id: 'jf', ts: 1, type: 'workout', date: '2026-07-13', kind: 'corrida', done: true }];
ok(D.sugestaoRemanejamento(jaFeito, '2026-07-14', 'corrida') === null, 'não sugere dia já confirmado');
// janela curta sem dia planejado dentro dela: não sugere nada
ok(D.sugestaoRemanejamento([], '2026-07-18', 'corrida', 1) === null, 'nada a sugerir dentro da janela');

const remEvs = [{ id: 'r1', ts: 1, type: 'workout', date: '2026-07-13', kind: 'corrida', done: true, origemData: '2026-07-14' }];
ok(D.origemAtividade(remEvs, '2026-07-13', 'corrida') === '2026-07-14', 'origemAtividade acha a data real remanejada');
ok(D.origemAtividade(remEvs, '2026-07-16', 'corrida') === '2026-07-16', 'sem remanejamento: origem é a própria data');

// ---- v3: tempo limpo ----
const t0 = D.parseKey('2026-07-01').getTime();
const tl = D.tempoLimpo(t0, t0 + (2 * 86400 + 5 * 3600 + 30 * 60 + 10) * 1000);
ok(tl.dias === 2 && tl.horas === 5 && tl.min === 30 && tl.seg === 10, 'tempoLimpo decompõe d/h/m/s');
ok(D.ultimoSlipTs([{ id: 'a', ts: 100, type: 'delivery' }, { id: 'b', ts: 900, type: 'sos', kind: 'ifood', outcome: 'gave_in' }], 'delivery', 5) === 900, 'ultimoSlipTs pega o mais recente (inclui sos gave_in)');
ok(D.ultimoSlipTs([], 'delivery', 5) === 5, 'ultimoSlipTs usa fallback sem deslizes');
const marco = D.proximoMarco(4.5);
ok(marco.alvo === 7 && Math.abs(marco.frac - 0.375) < 1e-9, 'próximo marco: 7 dias, 37,5% do trecho 3→7');

// ---- v5: relatório ----
const mk = (type, date, extra = {}) => ({ id: type + date + Math.random(), ts: D.parseKey(date).getTime() + 12 * 3600e3, type, date, ...extra });
const meals5 = (date, n) => ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'].slice(0, n).map((meal) => mk('meal', date, { meal, status: 'ok' }));

// insightLancheDoce: 4 dias com lanche (1 doce), 3 dias sem lanche (2 doces)
const ldEvs = [
  ...['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'].flatMap((d) => meals5(d, 4)), // inclui lanche2
  ...['2026-07-05', '2026-07-06', '2026-07-07'].flatMap((d) => meals5(d, 3)), // sem lanche2
  mk('sweet', '2026-07-01'), mk('sweet', '2026-07-05'), mk('sweet', '2026-07-06'),
];
const ld = D.insightLancheDoce(ldEvs, '2026-07-07', 30);
ok(ld && ld.com.dias === 4 && ld.sem.dias === 3, `lanche×doce: grupos 4/3 (veio ${ld && ld.com.dias}/${ld && ld.sem.dias})`);
ok(ld && Math.abs(ld.taxaCom - 0.25) < 1e-9 && Math.abs(ld.taxaSem - 2 / 3) < 1e-9, 'lanche×doce: taxas 25% vs 67%');
ok(D.insightLancheDoce(ldEvs.slice(0, 8), '2026-07-07', 30) === null, 'lanche×doce: guarda de amostra mínima');

// insightDomino: 2 saídas, dias seguintes com adesão menor
const dmEvs = [
  mk('night_out', '2026-07-01', { drinks: 4 }), mk('night_out', '2026-07-04', { drinks: 3 }),
  ...meals5('2026-07-02', 2), ...meals5('2026-07-05', 3), // pós-saída: 2/5 e 3/5
  ...meals5('2026-07-03', 5), ...meals5('2026-07-06', 5), ...meals5('2026-07-07', 4),
  ...meals5('2026-06-30', 5), ...meals5('2026-06-29', 5), ...meals5('2026-06-28', 4),
];
const dm = D.insightDomino(dmEvs, '2026-07-07');
ok(dm && Math.abs(dm.pos - 0.5) < 1e-9 && dm.nSaidas === 2, `dominó: adesão pós-saída 50% (veio ${dm && dm.pos})`);
ok(dm && dm.normal > 0.9, `dominó: adesão normal ~93% (veio ${dm && dm.normal.toFixed(2)})`);

// deslizesPorDiaSemana: 5 deslizes, quarta (01/07/2026 é quarta) com 2
const dsEvs = [
  mk('delivery', '2026-07-01'), mk('sweet', '2026-07-01'),
  mk('delivery', '2026-07-06'), mk('sweet', '2026-07-03'), mk('delivery', '2026-06-24'),
];
const ds = D.deslizesPorDiaSemana(dsEvs, '2026-07-07', 90);
ok(ds && ds[2].delivery + ds[2].sweet === 3 && ds[0].delivery === 1, 'deslizes por dia da semana (qua=3, seg=1)');
ok(D.deslizesPorDiaSemana(dsEvs.slice(0, 3), '2026-07-07', 90) === null, 'deslizes/semana: guarda ≥5');

// sosTaxa
ok(D.sosTaxa([mk('sos', '2026-07-01', { outcome: 'surfed' }), mk('sos', '2026-07-02', { outcome: 'surfed' }), mk('sos', '2026-07-03', { outcome: 'gave_in' })]).surfed === 2, 'sosTaxa 2/3');
ok(D.sosTaxa([mk('sos', '2026-07-01', { outcome: 'surfed' })]) === null, 'sosTaxa: guarda ≥3');

// resumoPeriodo
const rp = D.resumoPeriodo([...meals5('2026-07-02', 4), ...meals5('2026-07-03', 5), mk('delivery', '2026-07-02'), mk('night_out', '2026-07-03', { drinks: 2 })], '2026-07-01', '2026-07-07');
ok(rp.delivery === 1 && rp.diasObs === 2 && Math.abs(rp.adesao - 0.9) < 1e-9 && rp.drinksMedia === 2, `resumoPeriodo (adesão ${rp.adesao})`);

// economiaEstimada
const eco = D.economiaEstimada([mk('delivery', '2026-07-05')], { baseline: { delivery: 4 }, startKey: '2026-06-23' }, '2026-07-07');
ok(eco && eco.evitados === 7 && eco.valor === 315, `economia: 7 pedidos evitados, R$315 (veio ${eco && eco.evitados}/${eco && eco.valor})`);

// marcoDashboard (v6): escolhe o contador de maior frac; celebra marco batido <24h
const meioDia = (date) => D.parseKey(date).getTime() + 12 * 3600e3;
// sem deslizes, início há 10 dias → ambos com 10d: marco 14, anterior 7, frac (10-7)/7
let mdash = D.marcoDashboard([], { startKey: '2026-06-27' }, '2026-07-07', meioDia('2026-07-07'));
ok(mdash.escolhido.marco === 14 && mdash.escolhido.dias === 10, `marcoDashboard: marco 14 aos 10d (veio ${mdash.escolhido.marco})`);
ok(Math.abs(mdash.escolhido.frac - 3.5 / 7) < 1e-9, 'marcoDashboard: frac 3,5/7 (10,5 dias limpos)');
ok(!mdash.escolhido.batidoHa24h, 'marcoDashboard: 10d não é celebração');
// doce deslizou há 6 dias (frac 3/4 rumo ao marco 7) vs delivery com 10,5d (frac 1/2) → doce vence
mdash = D.marcoDashboard([mk('sweet', '2026-07-01')], { startKey: '2026-06-27' }, '2026-07-07', meioDia('2026-07-07'));
ok(mdash.escolhido.tipo === 'sweet' && mdash.escolhido.marco === 7, `marcoDashboard: maior frac vence (${mdash.escolhido.tipo}→${mdash.escolhido.marco})`);
// marco de 7 batido há meio dia → celebração vence qualquer frac
mdash = D.marcoDashboard([mk('sweet', '2026-06-30')], { startKey: '2026-06-27' }, '2026-07-07', meioDia('2026-07-07') + 12 * 3600e3);
ok(mdash.escolhido.tipo === 'sweet' && mdash.escolhido.batidoHa24h && mdash.escolhido.marcoAnterior === 7, 'marcoDashboard: celebra marco 7 batido <24h');
ok(mdash.ambos.length === 2, 'marcoDashboard: retorna os dois contadores');
// proximoMarco agora expõe o marco anterior
ok(D.proximoMarco(10).anterior === 7 && D.proximoMarco(10).alvo === 14, 'proximoMarco expõe anterior');

// aberturaSemana (v6): fresh start de segunda — 2026-07-13 é segunda
const semVerde = (ini) => [0, 1, 2, 3, 4, 5].flatMap((i) => meals5(D.addDays(ini, i), 5)); // 30/35 ≥ 28
let ab = D.aberturaSemana([], '2026-07-13');
ok(ab.ini === '2026-07-13' && !ab.verdeAnterior && ab.verdesSeguidas === 0 && !ab.temDados, 'aberturaSemana: sem dados');
ab = D.aberturaSemana(semVerde('2026-07-06'), '2026-07-13');
ok(ab.verdeAnterior && ab.verdesSeguidas === 1, 'aberturaSemana: 1 semana verde anterior');
ab = D.aberturaSemana([...semVerde('2026-06-29'), ...semVerde('2026-07-06')], '2026-07-13');
ok(ab.verdesSeguidas === 2, `aberturaSemana: 2 verdes seguidas (veio ${ab.verdesSeguidas})`);
ab = D.aberturaSemana([...semVerde('2026-06-29'), ...meals5('2026-07-06', 3)], '2026-07-13');
ok(!ab.verdeAnterior && ab.verdesSeguidas === 0 && ab.temDados, 'aberturaSemana: semana anterior não-verde zera a sequência');
ok(D.aberturaSemana([], '2026-07-15').ini === '2026-07-13', 'aberturaSemana: quarta aponta para a segunda da semana');

// gradeForca (v7.8): grade semanal de musculação, Ter–Sáb — 2026-07-15 é quarta
const gEv = (date, done = true) => ({ id: 'g' + date + done + Math.random(), ts: D.parseKey(date).getTime(), type: 'workout', date, kind: 'gym', done });
let gf = D.gradeForca([gEv('2026-07-14')], '2026-07-15', 2, new Set(['2026-07-08']));
ok(gf.length === 2 && gf[0].ini === '2026-07-06' && gf[1].ini === '2026-07-13', 'gradeForca: linhas por segunda, antiga→atual');
ok(gf[1].dias.length === 5 && gf[1].dias[0].date === '2026-07-14' && gf[1].dias[4].date === '2026-07-18', 'gradeForca: colunas Ter–Sáb');
ok(gf[1].dias[0].estado === 'feito' && gf[1].feitos === 1, 'gradeForca: check manual = feito e soma');
ok(gf[1].dias[1].estado === 'aberto' && gf[1].dias[2].estado === 'aberto', 'gradeForca: hoje e futuro = aberto (nunca perdido antes da hora)');
ok(gf[0].dias[1].estado === 'evidencia' && gf[0].feitos === 0, 'gradeForca: Garmin sem check = evidência e NÃO conta no total');
ok(gf[0].dias[0].estado === 'perdido', 'gradeForca: passado sem nada = perdido');
gf = D.gradeForca(['2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11'].map((d) => gEv(d)), '2026-07-15', 2);
ok(gf[0].feitos === 5 && gf[0].completa, 'gradeForca: 5/5 = semana completa');
gf = D.gradeForca([gEv('2026-07-08', true), gEv('2026-07-08', false)], '2026-07-15', 2);
ok(gf[0].dias[1].estado === 'perdido' && gf[0].feitos === 0, 'gradeForca: desfazer check volta a perdido (último vence)');

// ---- v7.9: viagens + doce planejado ----
const VIAG = [{ ini: '2026-07-06', fim: '2026-07-10' }];

// emViagem / viagemDoDia: pontas inclusivas
ok(D.emViagem('2026-07-06', VIAG) && D.emViagem('2026-07-10', VIAG) && !D.emViagem('2026-07-11', VIAG) && !D.emViagem('2026-07-05', VIAG), 'emViagem: pontas inclusivas');
let vg = D.viagemDoDia('2026-07-08', VIAG);
ok(vg && vg.dia === 3 && vg.total === 5, `viagemDoDia: dia 3 de 5 (veio ${vg && vg.dia}/${vg && vg.total})`);
ok(D.viagemDoDia('2026-07-11', VIAG) === null, 'viagemDoDia: fora do range = null');
ok(D.emViagem('2026-08-02', [...VIAG, { ini: '2026-08-01', fim: '2026-08-03' }]), 'emViagem: 2 viagens (OR)');

// slipDays: doce planejado não é deslize; deslize em viagem sai quando viagens é passado
ok(!D.slipDays([mk('sweet', '2026-07-04', { planejado: true })], 'sweet').includes('2026-07-04'), 'slipDays: planejado não é deslize');
ok(D.slipDays([mk('sweet', '2026-07-08')], 'sweet').includes('2026-07-08'), 'slipDays: sem viagens, deslize conta');
ok(!D.slipDays([mk('sweet', '2026-07-08')], 'sweet', VIAG).includes('2026-07-08'), 'slipDays: deslize em viagem protegido');
ok(D.slipDays([mk('sos', '2026-07-04', { kind: 'doce', outcome: 'gave_in' })], 'sweet').includes('2026-07-04'), 'slipDays: sos gave_in segue contando');

// ultimoSlipTs: planejado e viagem não resetam o anel
const tsDe = (d) => D.parseKey(d).getTime() + 12 * 3600e3;
let uts = D.ultimoSlipTs([mk('sweet', '2026-07-02'), mk('sweet', '2026-07-08')], 'sweet', 0, VIAG);
ok(uts === tsDe('2026-07-02'), 'ultimoSlipTs: slip em viagem não reseta (anel conta do anterior)');
uts = D.ultimoSlipTs([mk('sweet', '2026-07-02'), mk('sweet', '2026-07-12', { planejado: true })], 'sweet', 0);
ok(uts === tsDe('2026-07-02'), 'ultimoSlipTs: doce planejado não reseta');

// contadorResiliente: 2 dias seguidos DENTRO da viagem não quebram streak
let cr = D.contadorResiliente([mk('sweet', '2026-07-07'), mk('sweet', '2026-07-08')], 'sweet', '2026-07-14', '2026-06-27', VIAG);
ok(cr.streak === 17 && !cr.amassado, `resiliente: par consecutivo em viagem não quebra (streak ${cr.streak})`);
cr = D.contadorResiliente([mk('sweet', '2026-07-12', { planejado: true }), mk('sweet', '2026-07-13')], 'sweet', '2026-07-14', '2026-06-27');
ok(cr.streak === 17 && cr.amassado, 'resiliente: planejado + deslize real no dia seguinte não vira par (só amassa)');

// docePlanejadoDaSemana: semana seg–dom
const dp = mk('sweet', '2026-07-15', { planejado: true });
ok(D.docePlanejadoDaSemana([dp], '2026-07-13') === dp && D.docePlanejadoDaSemana([dp], '2026-07-19') === dp, 'docePlanejadoDaSemana: acha na semana');
ok(D.docePlanejadoDaSemana([dp], '2026-07-12') === null && D.docePlanejadoDaSemana([dp], '2026-07-20') === null, 'docePlanejadoDaSemana: semana vizinha = null');

// metricasSemana: planejado conta no consumo e aparece separado
let ms = D.metricasSemana([mk('sweet', '2026-07-14'), mk('sweet', '2026-07-15', { planejado: true })], '2026-07-15');
ok(ms.sweet === 2 && ms.sweetPlanejado === 1, `metricasSemana: consumo honesto 2 (1 planejado) — veio ${ms.sweet}/${ms.sweetPlanejado}`);

// semanaTreino: viagem sai do plano; treino feito em viagem conta plano+feito
let stv = D.semanaTreino([], '2026-07-08', VIAG); // semana 06–12/07 toda com Ter–Sex em viagem (gym Ter–Sáb)
ok(stv.gymPlan === 1 && stv.dias[1].viagem, `semanaTreino: só sáb 11/07 cobra gym (plan ${stv.gymPlan})`);
stv = D.semanaTreino([gEv('2026-07-07')], '2026-07-08', VIAG);
ok(stv.gymPlan === 2 && stv.gymFeito === 1, 'semanaTreino: treino feito em viagem conta plano e feito');

// gradeForca: célula viagem, feito vence, plan ajustado
gf = D.gradeForca([], '2026-07-15', 2, new Set(), VIAG);
ok(gf[0].dias[0].estado === 'viagem' && gf[0].plan === 1 && !gf[0].completa, `gradeForca: Ter–Sex viagem → plan 1 (veio ${gf[0].plan})`);
gf = D.gradeForca([gEv('2026-07-07')], '2026-07-15', 2, new Set(), VIAG);
ok(gf[0].dias[0].estado === 'feito' && gf[0].plan === 2 && gf[0].feitos === 1, 'gradeForca: feito vence viagem e volta ao plano');
gf = D.gradeForca([], '2026-07-15', 2, new Set(), [{ ini: '2026-07-06', fim: '2026-07-12' }]);
ok(gf[0].plan === 0 && !gf[0].completa, 'gradeForca: semana toda em viagem → plan 0, nunca completa');

// heatmapConstancia: célula viagem só sem registro; meta ajustada
const hmv = D.heatmapConstancia(meals5('2026-07-07', 3), '2026-07-12', 1, VIAG);
ok(hmv[0].dias[0] === 'viagem' && hmv[0].dias[1] === 3, 'heatmap: viagem sem registro = célula viagem; com registro = número');
ok(D.metaSemanaRefeicoes(7) === 28 && D.metaSemanaRefeicoes(5) === 20 && D.metaSemanaRefeicoes(0) === 0, 'metaSemanaRefeicoes: 28 cheia, 20 com 2 dias fora');

// aberturaSemana: semana anterior verde com meta ajustada por viagem
const semViagemVerde = [0, 1, 2, 3].flatMap((i) => meals5(D.addDays('2026-07-09', i), 5)); // qui–dom 5/5 = 20 refeições
ab = D.aberturaSemana(semViagemVerde, '2026-07-13', [{ ini: '2026-07-06', fim: '2026-07-08' }]);
ok(ab.verdeAnterior === true, 'aberturaSemana: 20/20 com 3 dias de viagem = verde');
ab = D.aberturaSemana(semViagemVerde, '2026-07-13');
ok(ab.verdeAnterior === false, 'aberturaSemana: mesmas 20 refeições sem viagem = não-verde (meta 28)');

// resumoPeriodo: treinoPlan pula viagem (na semana 06–12/07 só o gym de sábado 11 fica cobrado)
let rpv = D.resumoPeriodo([], '2026-07-06', '2026-07-12', VIAG);
ok(rpv.treinoPlan === 1, `resumoPeriodo: viagem seg–sex deixa só o gym de sábado (plan ${rpv.treinoPlan})`);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas ? 1 : 0);
