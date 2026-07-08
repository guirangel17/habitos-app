// Funções puras de derivação — sem DOM, sem storage. Testáveis via node.
import { TIPO_POR_DIA_SEMANA, FIM_DEFICIT, CARGA_CARBO, PROVA, MEAL_IDS, METAS_30D } from './data.js';

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

export function slipDays(events, type) {
  // dias (dateKey) que tiveram pelo menos um deslize do tipo
  const s = new Set();
  for (const e of events) {
    if (e.type === type) s.add(e.date || dateKey(new Date(e.ts)));
    if (type === 'delivery' && e.type === 'sos' && e.kind === 'ifood' && e.outcome === 'gave_in') s.add(e.date || dateKey(new Date(e.ts)));
    if (type === 'sweet' && e.type === 'sos' && e.kind === 'doce' && e.outcome === 'gave_in') s.add(e.date || dateKey(new Date(e.ts)));
  }
  return [...s].sort();
}

// ---- Contador resiliente (never miss twice, Protocolo 3B.6) ----
// A streak só quebra com deslizes em DOIS dias consecutivos. Um deslize isolado
// deixa o contador "amassado" por 24h mas não zera a contagem resiliente.
export function contadorResiliente(events, type, hojeKey, startKey) {
  const slips = slipDays(events, type).filter((d) => d <= hojeKey);
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
  const delivery = events.filter((e) => dentro(e) && (e.type === 'delivery' || (e.type === 'sos' && e.kind === 'ifood' && e.outcome === 'gave_in'))).length;
  const sweet = events.filter((e) => dentro(e) && (e.type === 'sweet' || (e.type === 'sos' && e.kind === 'doce' && e.outcome === 'gave_in'))).length;
  const saidas = events.filter((e) => dentro(e) && e.type === 'night_out');
  const drinks = saidas.length ? saidas.reduce((s, e) => s + (e.drinks || 0), 0) / saidas.length : null;
  return { ini, fim, delivery, sweet, drinks, saidas: saidas.length };
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
export function heatmapConstancia(events, hojeKey, semanas = 16) {
  // matriz [semana][diaDaSemana] com nº de refeições feitas (ok|sub); null = futuro/sem uso
  const out = [];
  for (let w = semanas - 1; w >= 0; w--) {
    const linha = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(addDays(inicioSemana(hojeKey), -7 * w), d);
      if (key > hojeKey) { linha.push(null); continue; }
      linha.push(mealsDone(mealsOfDay(events, key)));
    }
    out.push({ ini: addDays(inicioSemana(hojeKey), -7 * w), dias: linha });
  }
  return out;
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
