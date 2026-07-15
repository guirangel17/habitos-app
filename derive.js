// Funções puras de derivação — sem DOM, sem storage. Testáveis via node.
import { TIPO_POR_DIA_SEMANA, FIM_DEFICIT, CARGA_CARBO, PROVA, MEAL_IDS, METAS_30D, CORRIDAS, GYM_POR_DIA, MARCOS_DIAS } from './data.js';

export const DAY_MS = 86400000;

export function dateKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(key, n) {
  return dateKey(new Date(parseKey(key).getTime() + n * DAY_MS));
}
export function diffDays(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / DAY_MS);
}

// ---- Fases do calendário (Dieta §5) ----
export function fase(key) {
  if (key >= PROVA) return 'prova';
  if (key >= CARGA_CARBO[0]) return 'carga';
  if (key > FIM_DEFICIT) return 'manutencao';
  return 'deficit';
}

export function tipoDoDia(key, overrides = {}) {
  if (overrides[key]) return overrides[key];
  return TIPO_POR_DIA_SEMANA[parseKey(key).getDay()];
}

export function semanasAteProva(key) {
  return Math.max(0, Math.ceil(diffDays(key, PROVA) / 7));
}

// ---- Eventos ----
// events: [{id, ts, type, ...}] append-only. Para refeições, o último evento
// do dia+refeição vence (permite corrigir/desfazer sem apagar histórico).
export function mealsOfDay(events, key) {
  const map = {};
  for (const e of events) {
    if (e.type === 'meal' && e.date === key) map[e.meal] = e.status; // ordem de inserção = cronológica
  }
  return map; // {cafe: 'ok'|'sub'|'skip'|'off'|'none', ...}
}

export function mealsDone(mealMap) {
  return MEAL_IDS.filter((m) => mealMap[m] === 'ok' || mealMap[m] === 'sub').length;
}

// o evento conta como deslize do tipo? Doce PLANEJADO (pré-decidido, v7.9) não é
// deslize — restrição flexível ≠ falha (Westenhoefer; evita o efeito violação da abstinência)
function ehDeslize(e, type) {
  if (e.planejado) return false;
  return e.type === type
    || (type === 'delivery' && e.type === 'sos' && e.kind === 'ifood' && e.outcome === 'gave_in')
    || (type === 'sweet' && e.type === 'sos' && e.kind === 'doce' && e.outcome === 'gave_in');
}

// ---- Viagens (v7.9): períodos de manutenção — settings.viagens = [{ini, fim}] ----
export function emViagem(key, viagens = []) {
  return viagens.some((v) => key >= v.ini && key <= v.fim);
}

export function viagemDoDia(key, viagens = []) {
  const v = viagens.find((x) => key >= x.ini && key <= x.fim);
  return v ? { ini: v.ini, fim: v.fim, dia: diffDays(v.ini, key) + 1, total: diffDays(v.ini, v.fim) + 1 } : null;
}

// doce planejado da semana de key (seg–dom), ou null — guarda suave de 1/semana
export function docePlanejadoDaSemana(events, key) {
  const ini = inicioSemana(key), fim = addDays(ini, 6);
  return events.find((e) => e.type === 'sweet' && e.planejado && e.date >= ini && e.date <= fim) || null;
}

export function slipDays(events, type, viagens = []) {
  // dias (dateKey) que tiveram pelo menos um deslize do tipo.
  // Deslize em dia de viagem fica de fora: viagem protege streak/anéis/jardim (vira só dado de Relatório)
  const s = new Set();
  for (const e of events) {
    if (!ehDeslize(e, type)) continue;
    const d = e.date || dateKey(new Date(e.ts));
    if (!emViagem(d, viagens)) s.add(d);
  }
  return [...s].sort();
}

// ---- Contador resiliente (never miss twice, Protocolo 3B.6) ----
// A streak só quebra com deslizes em DOIS dias consecutivos. Um deslize isolado
// deixa o contador "amassado" por 24h mas não zera a contagem resiliente.
export function contadorResiliente(events, type, hojeKey, startKey, viagens = []) {
  const slips = slipDays(events, type, viagens).filter((d) => d <= hojeKey);
  const inicio = startKey || (slips.length ? slips[0] : hojeKey);

  // segmentos de streak: quebra acontece no 2º dia de um par consecutivo
  const quebras = []; // dateKey do dia em que a streak recomeça
  for (let i = 1; i < slips.length; i++) {
    if (diffDays(slips[i - 1], slips[i]) === 1) quebras.push(slips[i]);
  }

  const ultimoSlip = slips[slips.length - 1] || null;
  const ultimaQuebra = quebras[quebras.length - 1] || null;

  // streak resiliente atual: dias desde a última QUEBRA (ou desde o início),
  // descontando nada — deslize isolado não zera.
  const base = ultimaQuebra || inicio;
  const streak = Math.max(0, diffDays(base, hojeKey));

  // recorde: maior intervalo entre quebras (aproximação honesta)
  const marcos = [inicio, ...quebras, hojeKey];
  let recorde = 0;
  for (let i = 1; i < marcos.length; i++) recorde = Math.max(recorde, diffDays(marcos[i - 1], marcos[i]));

  // dias limpos nos últimos 30
  const slipSet = new Set(slips);
  let limpos30 = 0;
  const janela = Math.min(30, diffDays(inicio, hojeKey) + 1);
  for (let i = 0; i < janela; i++) if (!slipSet.has(addDays(hojeKey, -i))) limpos30++;

  const diasDesdeUltimo = ultimoSlip ? diffDays(ultimoSlip, hojeKey) : streak;
  const amassado = ultimoSlip !== null && diasDesdeUltimo <= 1 && ultimoSlip !== ultimaQuebra;
  const quebradoHoje = ultimaQuebra !== null && diffDays(ultimaQuebra, hojeKey) === 0;

  return { streak, recorde, limpos30, janela, diasDesdeUltimo, amassado, quebradoHoje, recuperacoes: contaRecuperacoes(slips, hojeKey), temHistorico: slips.length > 0 };
}

function contaRecuperacoes(slips, hojeKey) {
  // recuperação = deslize NÃO seguido de deslize no dia seguinte (e já passou 1 dia)
  let n = 0;
  for (let i = 0; i < slips.length; i++) {
    const next = slips[i + 1];
    if (next ? diffDays(slips[i], next) > 1 : diffDays(slips[i], hojeKey) >= 1) n++;
  }
  return n;
}

// ---- Métricas semanais (Protocolo §4) ----
export function inicioSemana(key) {
  // semana começa na segunda (o plano gira em torno do Longão de segunda)
  const d = parseKey(key);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  return addDays(key, -dow);
}

export function metricasSemana(events, key) {
  const ini = inicioSemana(key), fim = addDays(ini, 6);
  const dentro = (e) => { const d = e.date || dateKey(new Date(e.ts)); return d >= ini && d <= fim; };
  // consumo HONESTO do §4: doce planejado e deslize em viagem CONTAM aqui (a proteção
  // de viagem/planejado vale para streak/anéis/jardim, não para a métrica de consumo)
  const delivery = events.filter((e) => dentro(e) && (e.type === 'delivery' || (e.type === 'sos' && e.kind === 'ifood' && e.outcome === 'gave_in'))).length;
  const sweet = events.filter((e) => dentro(e) && (e.type === 'sweet' || (e.type === 'sos' && e.kind === 'doce' && e.outcome === 'gave_in'))).length;
  const sweetPlanejado = events.filter((e) => dentro(e) && e.type === 'sweet' && e.planejado).length;
  const saidas = events.filter((e) => dentro(e) && e.type === 'night_out');
  const drinks = saidas.length ? saidas.reduce((s, e) => s + (e.drinks || 0), 0) / saidas.length : null;
  return { ini, fim, delivery, sweet, sweetPlanejado, drinks, saidas: saidas.length };
}

export function metaAtingida(metrica, valor, baseline) {
  if (valor === null) return null;
  if (metrica === 'drinks') return valor <= METAS_30D.drinks;
  const alvo = baseline != null ? baseline * METAS_30D[metrica] : null;
  return alvo === null ? null : valor <= alvo;
}

// ---- Peso / cintura ----
export function serie(events, type) {
  // um valor por dia (último vence), ordenado por data
  const map = new Map();
  for (const e of events) if (e.type === type) map.set(e.date || dateKey(new Date(e.ts)), e.valor);
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, valor]) => ({ date, valor }));
}

export function mediaMovel7(pontos) {
  // média dos valores nos 7 dias-calendário que terminam em cada ponto
  return pontos.map((p, i) => {
    const ini = addDays(p.date, -6);
    const win = pontos.filter((q, j) => j <= i && q.date >= ini);
    return { date: p.date, valor: win.reduce((s, q) => s + q.valor, 0) / win.length };
  });
}

export function corredorMeta(pontosMM, hojeKey) {
  // corredor -0,3 a -0,5 kg/semana a partir da 1ª média, achatando após o fim do déficit
  if (!pontosMM.length) return null;
  const a0 = pontosMM[0];
  const dias = (k) => Math.min(diffDays(a0.date, k), Math.max(0, diffDays(a0.date, FIM_DEFICIT)));
  return (k) => ({
    alto: a0.valor - (0.3 / 7) * dias(k),
    baixo: a0.valor - (0.5 / 7) * dias(k),
  });
}

export function ritmoSemanal(pontosMM) {
  // variação da média móvel nos últimos 7 dias (kg/semana)
  if (pontosMM.length < 2) return null;
  const fim = pontosMM[pontosMM.length - 1];
  const iniKey = addDays(fim.date, -7);
  let ref = null;
  for (const p of pontosMM) if (p.date <= iniKey) ref = p;
  if (!ref) return null;
  const d = diffDays(ref.date, fim.date);
  return d ? ((fim.valor - ref.valor) / d) * 7 : null;
}

// ---- Heatmap de constância ----
export function heatmapConstancia(events, hojeKey, semanas = 16, viagens = []) {
  // matriz [semana][diaDaSemana] com nº de refeições feitas (ok|sub); null = futuro/sem uso;
  // 'viagem' = dia de viagem sem registro (fora da cobrança — se registrou, conta normal)
  const out = [];
  for (let w = semanas - 1; w >= 0; w--) {
    const linha = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(addDays(inicioSemana(hojeKey), -7 * w), d);
      if (key > hojeKey) { linha.push(null); continue; }
      const n = mealsDone(mealsOfDay(events, key));
      linha.push(n === 0 && emViagem(key, viagens) ? 'viagem' : n);
    }
    out.push({ ini: addDays(inicioSemana(hojeKey), -7 * w), dias: linha });
  }
  return out;
}

// meta de refeições da semana ajustada por viagem: 80% de 5 refeições × dias cobrados (7 dias → 28)
export function metaSemanaRefeicoes(diasCobrados) {
  return Math.ceil(0.8 * 5 * diasCobrados);
}

// ---- Ressaca ----
export function ressacaDoDia(events, key) {
  const on = events.some((e) => e.type === 'hangover_on' && e.date === key && !events.some((x) => x.type === 'hangover_off' && x.date === key && x.ts > e.ts));
  const steps = new Set(events.filter((e) => e.type === 'hangover_step' && e.date === key).map((e) => e.step));
  const meals = mealsDone(mealsOfDay(events, key));
  const completo = steps.size >= 3 && meals >= 4;
  return { on, steps, completo };
}

export function dominosQuebrados(events, hojeKey) {
  const dias = new Set(events.filter((e) => e.type === 'hangover_on').map((e) => e.date));
  let n = 0;
  for (const d of dias) if (d <= hojeKey && ressacaDoDia(events, d).completo) n++;
  return n;
}

export function ondasSurfadas(events) {
  return events.filter((e) => e.type === 'sos' && e.outcome === 'surfed').length;
}

export function saiuOntem(events, hojeKey) {
  const ontem = addDays(hojeKey, -1);
  return events.some((e) => e.type === 'night_out' && (e.date || dateKey(new Date(e.ts))) === ontem);
}

// ---- Contrato da Noite (Protocolo 3A: decidir ANTES de sair) ----
// contract {date, maxDrinks, horaSaida} · contract_tick {date, kind:'drink'|'agua'}
// fecha ao registrar night_out com a mesma date (ou ao descartar com contract_cancel)
export function contratoAtivo(events, hojeKey, horaAgora = 12) {
  // um contrato vale da criação até as 06h do dia seguinte
  const candidatas = horaAgora < 6 ? [addDays(hojeKey, -1), hojeKey] : [hojeKey];
  for (const d of candidatas.reverse()) {
    const c = [...events].reverse().find((e) => e.type === 'contract' && e.date === d);
    if (!c) continue;
    const fechado = events.some((e) => (e.type === 'night_out' || e.type === 'contract_cancel') && e.date === d && e.ts >= c.ts);
    if (fechado) continue;
    const ticks = events.filter((e) => e.type === 'contract_tick' && e.date === d && e.ts >= c.ts);
    return {
      date: d, maxDrinks: c.maxDrinks, horaSaida: c.horaSaida,
      drinks: ticks.filter((t) => t.kind === 'drink').length,
      aguas: ticks.filter((t) => t.kind === 'agua').length,
    };
  }
  return null;
}

// ---- Revisão de domingo (Protocolo §4) ----
export function semanaRevisada(events, semanaIni) {
  return events.some((e) => e.type === 'review' && e.week === semanaIni);
}

// pendente de domingo 18h até terça (graça de 2 dias), sobre a semana que termina no domingo
export function revisaoPendente(events, hojeKey, horaAgora = 12) {
  const dow = parseKey(hojeKey).getDay(); // 0=Dom
  let semana = null;
  if (dow === 0 && horaAgora >= 18) semana = inicioSemana(hojeKey);
  else if (dow === 1 || dow === 2) semana = addDays(inicioSemana(hojeKey), -7);
  if (!semana) return null;
  return semanaRevisada(events, semana) ? null : semana;
}

export function semanasComRevisao(events) {
  return new Set(events.filter((e) => e.type === 'review').map((e) => e.week));
}

// identidade "assinada": as últimas 4 semanas FECHADAS têm revisão (Protocolo §4)
export function identidadeAssinada(events, hojeKey) {
  const rev = semanasComRevisao(events);
  const semanaAtual = inicioSemana(hojeKey);
  let ok = 0;
  for (let i = 1; i <= 4; i++) if (rev.has(addDays(semanaAtual, -7 * i))) ok++;
  return { assinada: ok === 4, progresso: ok };
}

// ---- Gatilho × período do dia (v2: heatmap de estressores) ----
export const PERIODOS = ['manhã', 'almoço', 'tarde', 'noite'];
export function periodoDoTs(ts) {
  const h = new Date(ts).getHours();
  if (h >= 6 && h < 12) return 0;
  if (h >= 12 && h < 15) return 1;
  if (h >= 15 && h < 19) return 2;
  return 3;
}

export function gatilhosPorPeriodo(events, hojeKey, dias = 28) {
  const ini = addDays(hojeKey, -dias + 1);
  const mapa = {};
  let total = 0;
  for (const e of events) {
    const d = e.date || dateKey(new Date(e.ts));
    if (!e.trigger || d < ini || d > hojeKey) continue;
    if (!mapa[e.trigger]) mapa[e.trigger] = [0, 0, 0, 0];
    mapa[e.trigger][periodoDoTs(e.ts)]++;
    total++;
  }
  return { mapa, total };
}

// ---- Treino (corrida do calendário + musculação da estrutura semanal) ----
const CORRIDA_POR_DATA = new Map(CORRIDAS.map(([d, tipo, nome]) => [d, { tipo, nome }]));

export function treinoDoDia(key) {
  return {
    corrida: CORRIDA_POR_DATA.get(key) || null,
    gym: GYM_POR_DIA[parseKey(key).getDay()] || null,
  };
}

// workout events: {type:'workout', date, kind:'corrida'|'gym', done, origemData?} — último vence
export function workoutsDoDia(events, key) {
  const out = {};
  for (const e of events) if (e.type === 'workout' && e.date === key) out[e.kind] = e.done;
  return out; // {corrida: true|false, gym: true|false}
}

// data real da atividade Garmin por trás do dia `date` (remanejamento) — sem remanejar, é a própria data
export function origemAtividade(events, date, kind) {
  let ultimo = null;
  for (const e of events) if (e.type === 'workout' && e.date === date && e.kind === kind) ultimo = e;
  return ultimo?.origemData || date;
}

// dia planejado mais recente (até `janelaDias` atrás) ainda sem check — sugestão de remanejamento
// quando uma atividade do Garmin cai num dia sem plano (ex.: Longão de segunda feito na quarta)
export function sugestaoRemanejamento(events, dataAtividade, kind, janelaDias = 4) {
  for (let i = 1; i <= janelaDias; i++) {
    const d = addDays(dataAtividade, -i);
    const planejado = kind === 'corrida' ? treinoDoDia(d).corrida : treinoDoDia(d).gym;
    if (planejado && workoutsDoDia(events, d)[kind] === undefined) return d;
  }
  return null;
}

export function semanaTreino(events, key, viagens = []) {
  const ini = inicioSemana(key);
  let gymPlan = 0, gymFeito = 0, corridaPlan = 0, corridaFeita = 0;
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(ini, i);
    const plano = treinoDoDia(d);
    const feito = workoutsDoDia(events, d);
    const viagem = emViagem(d, viagens);
    // dia de viagem sai do plano — a menos que tenha treinado mesmo assim (aí conta plano E feito)
    if (plano.gym && (!viagem || feito.gym)) { gymPlan++; if (feito.gym) gymFeito++; }
    if (plano.corrida && (!viagem || feito.corrida)) { corridaPlan++; if (feito.corrida) corridaFeita++; }
    dias.push({ date: d, plano, feito, viagem });
  }
  return { ini, dias, gymPlan, gymFeito, corridaPlan, corridaFeita };
}

// ---- Grade panorâmica de FORÇA (Evolução) ----
// Uma linha por semana (antiga→atual), colunas Ter–Sáb (os 5 dias com gym no plano).
// forcasDates: Set de dateKeys com sessão de força registrada no Garmin — vira estado
// 'evidencia' visual e NÃO soma em `feitos` (confirmação de treino é sempre manual).
export function gradeForca(events, hojeKey, semanas = 16, forcasDates = new Set(), viagens = []) {
  const iniAtual = inicioSemana(hojeKey);
  const out = [];
  for (let w = semanas - 1; w >= 0; w--) {
    const ini = addDays(iniAtual, -7 * w);
    const dias = [];
    let feitos = 0, plan = 5;
    for (let i = 1; i <= 5; i++) { // segunda+1 = Ter … segunda+5 = Sáb
      const date = addDays(ini, i);
      const feito = workoutsDoDia(events, date).gym === true;
      if (feito) feitos++;
      const estado = feito ? 'feito' // treinou em viagem = conta normal
        : emViagem(date, viagens) ? 'viagem'
          : forcasDates.has(date) && date <= hojeKey ? 'evidencia'
            : date < hojeKey ? 'perdido'
              : 'aberto'; // hoje ainda em aberto + futuro — nunca "perdido" antes do dia acabar
      if (estado === 'viagem') plan--;
      dias.push({ date, estado });
    }
    out.push({ ini, dias, feitos, plan, completa: plan > 0 && feitos === plan });
  }
  return out;
}

export function corridasStats(events, hojeKey) {
  const feitas = new Set(events.filter((e) => e.type === 'workout' && e.kind === 'corrida' && e.done).map((e) => e.date));
  const passadas = CORRIDAS.filter(([d]) => d <= hojeKey);
  return {
    feitas: passadas.filter(([d]) => feitas.has(d)).length,
    passadas: passadas.length,
    total: CORRIDAS.length,
  };
}

// ---- Contador com precisão de tempo (estilo SugarCut) ----
export function ultimoSlipTs(events, type, fallbackTs, viagens = []) {
  // doce planejado e deslize em viagem NÃO resetam o anel: ele segue contando
  // contíguo desde o deslize real anterior (determinístico, sem "pausa")
  let max = null;
  for (const e of events) {
    if (!ehDeslize(e, type)) continue;
    if (emViagem(e.date || dateKey(new Date(e.ts)), viagens)) continue;
    if (max === null || e.ts > max) max = e.ts;
  }
  return max ?? fallbackTs;
}

export function tempoLimpo(desdeTs, agoraTs) {
  const ms = Math.max(0, agoraTs - desdeTs);
  const s = Math.floor(ms / 1000);
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    min: Math.floor((s % 3600) / 60),
    seg: s % 60,
    totalDias: ms / 86400000,
  };
}

export function proximoMarco(totalDias) {
  const alvo = MARCOS_DIAS.find((m) => m > totalDias) ?? Math.ceil((totalDias + 30) / 30) * 30;
  const anterior = [...MARCOS_DIAS].reverse().find((m) => m <= totalDias) ?? 0;
  return { alvo, anterior, frac: Math.min(1, (totalDias - anterior) / (alvo - anterior)) };
}

// ---- Dashboard da Hoje (v6) ----
// Marco mais próximo entre os dois contadores: escolhe o de maior frac, então
// sempre há um "quase lá" na tela (goal gradient). Marco batido há <24h ganha
// prioridade para celebrar em vez de mostrar o anel novo quase vazio.
export function marcoDashboard(events, settings, key, agoraTs) {
  const inicioTs = parseKey(settings.startKey || key).getTime();
  const viagens = settings.viagens || [];
  const ambos = ['delivery', 'sweet'].map((tipo) => {
    const t = tempoLimpo(ultimoSlipTs(events, tipo, inicioTs, viagens), agoraTs);
    const m = proximoMarco(t.totalDias);
    return {
      tipo, dias: t.dias, totalDias: t.totalDias,
      marco: m.alvo, marcoAnterior: m.anterior, frac: m.frac,
      batidoHa24h: m.anterior > 0 && t.totalDias - m.anterior < 1,
    };
  });
  const celebrando = ambos.filter((c) => c.batidoHa24h).sort((a, b) => b.marcoAnterior - a.marcoAnterior)[0];
  const escolhido = celebrando || (ambos[1].frac > ambos[0].frac ? ambos[1] : ambos[0]);
  return { escolhido, ambos };
}

// ---- Abertura de semana (fresh start de segunda) ----
// Semana "verde" = ≥28/35 refeições no plano (80%, nunca exigir 35/35).
// O gate de "é segunda de manhã" fica na UI; aqui só os dados.
export function aberturaSemana(events, key, viagens = []) {
  const ini = inicioSemana(key);
  const semana = (s) => { // {ref, meta} — meta ajustada por dias de viagem sem registro
    let ref = 0, cobrados = 7;
    for (let i = 0; i < 7; i++) {
      const d = addDays(s, i);
      const n = mealsDone(mealsOfDay(events, d));
      ref += n;
      if (n === 0 && emViagem(d, viagens)) cobrados--;
    }
    return { ref, meta: metaSemanaRefeicoes(cobrados), cobrados };
  };
  const ant = semana(addDays(ini, -7));
  const verde = (s) => { const x = semana(s); return x.cobrados > 0 && x.ref >= x.meta; };
  let verdesSeguidas = 0;
  for (let s = addDays(ini, -7); verde(s) && verdesSeguidas < 52; s = addDays(s, -7)) verdesSeguidas++;
  return {
    ini,
    restantes: semanasAteProva(key),
    temDados: ant.ref > 0,
    verdeAnterior: ant.cobrados > 0 && ant.ref >= ant.meta,
    verdesSeguidas,
  };
}

// ================================================================
// RELATÓRIO — agregações e cruzamentos (cada insight tem guarda de amostra mínima)
// ================================================================

export function slipsNoPeriodo(events, ini, fim, type) {
  // deslizes REAIS (planejado fica de fora); deslize em viagem conta — Relatório é dado
  return events.filter((e) => {
    const d = e.date || dateKey(new Date(e.ts));
    return d >= ini && d <= fim && ehDeslize(e, type);
  }).length;
}

// dia "observado" = dia com pelo menos 1 registro de refeição (evita contar dias sem uso do app)
export function diasObservados(events, ini, fim) {
  const s = new Set();
  for (const e of events) if (e.type === 'meal' && e.date >= ini && e.date <= fim) s.add(e.date);
  return [...s].sort();
}

export function resumoPeriodo(events, ini, fim, viagens = []) {
  const obs = diasObservados(events, ini, fim);
  let refFeitas = 0;
  for (const d of obs) refFeitas += mealsDone(mealsOfDay(events, d));
  const saidas = events.filter((e) => e.type === 'night_out' && e.date >= ini && e.date <= fim);
  let treinoPlan = 0, treinoFeito = 0;
  for (let d = ini; d <= fim; d = addDays(d, 1)) {
    const plano = treinoDoDia(d);
    const feito = workoutsDoDia(events, d);
    const viagem = emViagem(d, viagens); // viagem sai do plano (a menos que tenha treinado)
    if (plano.corrida && (!viagem || feito.corrida)) { treinoPlan++; if (feito.corrida) treinoFeito++; }
    if (plano.gym && (!viagem || feito.gym)) { treinoPlan++; if (feito.gym) treinoFeito++; }
  }
  const mm = mediaMovel7(serie(events, 'weight').filter((p) => p.date <= fim));
  const mmIni = [...mm].reverse().find((p) => p.date <= ini);
  const mmFim = mm[mm.length - 1];
  return {
    delivery: slipsNoPeriodo(events, ini, fim, 'delivery'),
    sweet: slipsNoPeriodo(events, ini, fim, 'sweet'),
    saidas: saidas.length,
    drinksMedia: saidas.length ? saidas.reduce((s, e) => s + (e.drinks || 0), 0) / saidas.length : null,
    diasObs: obs.length,
    adesao: obs.length ? refFeitas / (obs.length * 5) : null,
    treinoPlan, treinoFeito,
    pesoDelta: mmIni && mmFim && mmFim.date > mmIni.date ? mmFim.valor - mmIni.valor : null,
  };
}

// Tese do protocolo 2C: pular o lanche da tarde prediz o ataque de doce. Guarda: ≥3 dias em cada grupo.
export function insightLancheDoce(events, hojeKey, dias = 90) {
  const ini = addDays(hojeKey, -dias + 1);
  const obs = diasObservados(events, ini, hojeKey);
  const doceEm = new Set(events.filter((e) => ehDeslize(e, 'sweet')).map((e) => e.date || dateKey(new Date(e.ts))));
  const grupo = { com: { dias: 0, doces: 0 }, sem: { dias: 0, doces: 0 } };
  for (const d of obs) {
    const lanche = mealsOfDay(events, d).lanche2;
    const g = lanche === 'ok' || lanche === 'sub' ? grupo.com : grupo.sem;
    g.dias++;
    if (doceEm.has(d)) g.doces++;
  }
  if (grupo.com.dias < 3 || grupo.sem.dias < 3) return null;
  return {
    ...grupo,
    taxaCom: grupo.com.doces / grupo.com.dias,
    taxaSem: grupo.sem.doces / grupo.sem.dias,
  };
}

// Tese do protocolo 3 (dominó de 36h): adesão no dia seguinte a uma saída vs dias normais. Guarda: ≥2 saídas.
export function insightDomino(events, hojeKey) {
  const saidas = new Set(events.filter((e) => e.type === 'night_out').map((e) => e.date || dateKey(new Date(e.ts))));
  const posSaida = new Set([...saidas].map((d) => addDays(d, 1)));
  const obs = diasObservados(events, addDays(hojeKey, -364), hojeKey);
  const g = { pos: { dias: 0, soma: 0 }, normal: { dias: 0, soma: 0 } };
  for (const d of obs) {
    const grupo = posSaida.has(d) ? g.pos : g.normal;
    grupo.dias++;
    grupo.soma += mealsDone(mealsOfDay(events, d)) / 5;
  }
  if (g.pos.dias < 2 || g.normal.dias < 5) return null;
  return { pos: g.pos.soma / g.pos.dias, normal: g.normal.soma / g.normal.dias, nSaidas: g.pos.dias };
}

// Em qual dia da semana os deslizes acontecem? Guarda: ≥5 deslizes no total. [0]=Seg … [6]=Dom
export function deslizesPorDiaSemana(events, hojeKey, dias = 90) {
  const ini = addDays(hojeKey, -dias + 1);
  const out = Array.from({ length: 7 }, () => ({ delivery: 0, sweet: 0 }));
  let total = 0;
  for (const e of events) {
    const d = e.date || dateKey(new Date(e.ts));
    if (d < ini || d > hojeKey) continue;
    const tipo = ehDeslize(e, 'delivery') ? 'delivery' : ehDeslize(e, 'sweet') ? 'sweet' : null;
    if (!tipo) continue;
    out[(parseKey(d).getDay() + 6) % 7][tipo]++;
    total++;
  }
  return total >= 5 ? out : null;
}

// O timer de 10 min funciona? Guarda: ≥3 SOS com desfecho.
export function sosTaxa(events) {
  const s = events.filter((e) => e.type === 'sos' && (e.outcome === 'surfed' || e.outcome === 'gave_in'));
  if (s.length < 3) return null;
  return { total: s.length, surfed: s.filter((e) => e.outcome === 'surfed').length };
}

// Semana verde (≥28/35 refeições) × variação da média móvel de peso. Guarda: ≥2 semanas em cada grupo.
export function insightSemanaVerdePeso(events, hojeKey) {
  const mm = mediaMovel7(serie(events, 'weight'));
  const mmEm = (dk) => { let r = null; for (const p of mm) { if (p.date <= dk) r = p; else break; } return r; };
  const g = { verdes: [], outras: [] };
  for (let s = inicioSemana(addDays(hojeKey, -7 * 16)); addDays(s, 6) < hojeKey; s = addDays(s, 7)) {
    let ref = 0;
    for (let i = 0; i < 7; i++) ref += mealsDone(mealsOfDay(events, addDays(s, i)));
    if (ref === 0) continue; // semana sem uso
    const a = mmEm(s), b = mmEm(addDays(s, 6));
    if (!a || !b || diffDays(a.date, b.date) < 4) continue; // sem pesagens suficientes na semana
    (ref >= 28 ? g.verdes : g.outras).push(b.valor - a.valor);
  }
  if (g.verdes.length < 2 || g.outras.length < 2) return null;
  const media = (arr) => arr.reduce((x, y) => x + y, 0) / arr.length;
  return { verdes: { n: g.verdes.length, delta: media(g.verdes) }, outras: { n: g.outras.length, delta: media(g.outras) } };
}

// Pedidos evitados vs baseline × preço médio (recompensa em R$ — estimativa honesta, rotulada como tal)
export const PRECO_DELIVERY = 45;
export function economiaEstimada(events, settings, hojeKey) {
  const base = settings.baseline?.delivery;
  if (base == null || !settings.startKey) return null;
  const semanas = Math.max(1, diffDays(settings.startKey, hojeKey) / 7);
  const esperado = Math.round(base * semanas);
  const reais = slipsNoPeriodo(events, settings.startKey, hojeKey, 'delivery');
  const evitados = Math.max(0, esperado - reais);
  return { evitados, reais, esperado, valor: evitados * PRECO_DELIVERY, semanas: Math.round(semanas) };
}

// ---- Gatilhos ----
export function gatilhosFrequentes(events, dias = 14, hojeKey) {
  const ini = addDays(hojeKey, -dias + 1);
  const cont = {};
  for (const e of events) {
    const d = e.date || dateKey(new Date(e.ts));
    if (e.trigger && d >= ini && d <= hojeKey) cont[e.trigger] = (cont[e.trigger] || 0) + 1;
  }
  return Object.entries(cont).sort((a, b) => b[1] - a[1]);
}
