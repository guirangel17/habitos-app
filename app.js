// Rotina — painel de execução do Protocolo de Hábitos
const VERSAO_APP = '7.13'; // manter em sincronia com VERSAO do sw.js
// chave pública VAPID (não é secreta — a privada mora só no Secret VAPID_PRIVATE_KEY do repo)
const VAPID_PUBLIC_KEY = 'BL_iF6KiwVFtImwEIwv1ew0dDN1djLynA-IYKh_73TNft_74xUDhGiTLNIhYDyvSAaix-jU9Y9qj4Igf2yyTSgI';
import {
  REFEICOES, MEAL_IDS, TIPO_POR_DIA_SEMANA, METAS_DIA, TREINO_POR_DIA, GATILHOS,
  SOS_SCRIPTS, RESSACA_PASSOS, PROVA, FIM_DEFICIT, METAS_30D,
  FRASE_IDENTIDADE, AJUSTES_AMBIENTE, HORARIOS_SAIDA,
  CORRIDAS, TIPO_CORRIDA_ICONE, GYM_TREINOS, GYM_FASE_POR_MES, CORRIDA_GUIA, CHECKPOINTS, VIAGEM_GUIA,
} from './data.js';
import * as D from './derive.js';
import * as S from './store.js';

// ---------- tempo (com override de dev: ?hoje=YYYY-MM-DD&agora=HH:MM) ----------
const params = new URLSearchParams(location.search);
// tema: ?tema= (dev) > escolha salva em Ajustes > automático (media query do sistema)
function aplicarTema(v) {
  if (v && v !== 'auto') document.documentElement.dataset.tema = v;
  else delete document.documentElement.dataset.tema;
  const cores = { dark: '#0d0d0d', light: '#f9f9f7' };
  document.querySelectorAll('meta[name="theme-color"]').forEach((mt) => {
    if (v && v !== 'auto') mt.setAttribute('content', cores[v]);
    else mt.setAttribute('content', (mt.getAttribute('media') || '').includes('dark') ? cores.dark : cores.light);
  });
}
aplicarTema(params.get('tema') || S.getState().settings.tema || 'auto');
function agora() {
  const base = params.get('hoje') ? D.parseKey(params.get('hoje')) : new Date();
  if (params.get('agora')) {
    const [h, m] = params.get('agora').split(':').map(Number);
    base.setHours(h, m, 0, 0);
  } else if (params.get('hoje')) {
    const real = new Date();
    base.setHours(real.getHours(), real.getMinutes());
  }
  return base;
}
const hojeKey = () => D.dateKey(agora());

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const viagensCfg = () => S.getState().settings.viagens || []; // períodos de manutenção (v7.9)
const DIA_NOME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
// applicationServerKey da Push API espera Uint8Array, não a string base64url
function urlBase64ToUint8Array(base64String) {
  const base64 = (base64String + '='.repeat((4 - base64String.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from([...atob(base64)].map((c) => c.charCodeAt(0)));
}

let abaAtiva = ['hoje', 'dieta', 'treino', 'evolucao', 'relatorio', 'ajustes'].includes(params.get('aba')) ? params.get('aba') : 'hoje';
let periodoRelatorio = 30; // 30 | 90 | 0 (tudo)
let diaTreinoSel = null; // dia selecionado no card Semana da aba Treino (null = hoje)
let semTreinoIni = null; // segunda (dateKey) da semana exibida na aba Treino (null = semana atual)
if (params.get('dia')) { // dev: ?aba=treino&dia=YYYY-MM-DD
  diaTreinoSel = params.get('dia');
  const w = D.inicioSemana(diaTreinoSel);
  if (w !== D.inicioSemana(hojeKey())) semTreinoIni = w; // dia de outra semana abre já naquela semana
}
if (params.get('viagem')) { // dev: ?viagem=YYYY-MM-DD:YYYY-MM-DD — cadastra a viagem (persiste, como o seed)
  const [vIni, vFim] = params.get('viagem').split(':');
  if (vIni && vFim && vFim >= vIni) S.setSetting('viagens', [...(S.getState().settings.viagens || []).filter((v) => v.ini !== vIni), { ini: vIni, fim: vFim }]);
}

// ---------- seed de demonstração (dev/testes: ?seed=1 com store vazio) ----------
if (params.get('seed') && S.getState().events.length === 0) {
  const key = hojeKey();
  const rnd = (n) => Math.floor(Math.random() * n);
  for (let i = 45; i >= 0; i--) {
    const d = D.addDays(key, -i);
    if (i % 2 === 0 || i < 7) S.addEvent({ type: 'weight', date: d, valor: Math.round((84.2 + i * 0.035 + (Math.random() - 0.5) * 0.6) * 10) / 10 });
    if (i % 7 === 0) S.addEvent({ type: 'waist', date: d, valor: Math.round((91 + i * 0.03) * 2) / 2 });
    const nRef = i === 12 ? 2 : 3 + rnd(3);
    ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'].slice(0, nRef).forEach((meal) =>
      S.addEvent({ type: 'meal', date: d, meal, status: rnd(6) ? 'ok' : 'sub' }));
  }
  const tsEm = (d, h) => D.parseKey(d).getTime() + h * 3600e3;
  S.addEvent({ type: 'delivery', date: D.addDays(key, -20), trigger: 'preguiça', ts: tsEm(D.addDays(key, -20), 21) });
  S.addEvent({ type: 'delivery', date: D.addDays(key, -9), trigger: 'preguiça', ts: tsEm(D.addDays(key, -9), 20) });
  S.addEvent({ type: 'sweet', date: D.addDays(key, -15), trigger: '15h', ts: tsEm(D.addDays(key, -15), 15) });
  S.addEvent({ type: 'sweet', date: D.addDays(key, -4), trigger: 'bug', ts: tsEm(D.addDays(key, -4), 17) });
  S.addEvent({ type: 'sweet', date: D.addDays(key, -25), trigger: 'tédio', ts: tsEm(D.addDays(key, -25), 16) });
  S.addEvent({ type: 'sos', kind: 'doce', outcome: 'surfed', date: D.addDays(key, -3), trigger: '15h', ts: tsEm(D.addDays(key, -3), 15) });
  S.addEvent({ type: 'sos', kind: 'ifood', outcome: 'surfed', date: D.addDays(key, -2), trigger: 'preguiça', ts: tsEm(D.addDays(key, -2), 21) });
  S.addEvent({ type: 'sos', kind: 'doce', outcome: 'surfed', date: D.addDays(key, -10), trigger: 'call tensa', ts: tsEm(D.addDays(key, -10), 11) });
  for (let i = 45; i >= 1; i--) {
    const d = D.addDays(key, -i);
    const plano = D.treinoDoDia(d);
    if (plano.corrida && rnd(8)) S.addEvent({ type: 'workout', date: d, kind: 'corrida', done: true });
    if (plano.gym && rnd(6)) S.addEvent({ type: 'workout', date: d, kind: 'gym', done: true });
  }
  const sem = (n) => D.addDays(D.inicioSemana(key), -7 * n);
  S.addEvent({ type: 'review', week: sem(3), nota: null, ajuste: null });
  S.addEvent({ type: 'review', week: sem(2), nota: 'semana de sprint apertada', ajuste: 'Bloquear 10 min de buffer entre calls na agenda' });
  S.addEvent({ type: 'review', week: sem(1), nota: null, ajuste: 'Repor a prateleira de emergência (frango + arroz congelados em porções)' });
  S.addEvent({ type: 'night_out', date: D.addDays(key, -13), drinks: 3 });
  const dRess = D.addDays(key, -12);
  S.addEvent({ type: 'hangover_on', date: dRess });
  ['agua', 'cafe', 'caminhada'].forEach((step) => S.addEvent({ type: 'hangover_step', date: dRess, step }));
  ['cafe', 'lanche1', 'almoco', 'lanche2'].forEach((meal) => S.addEvent({ type: 'meal', date: dRess, meal, status: 'ok' }));
  S.addEvent({ type: 'hangover_off', date: dRess });
  S.setSetting('baseline', { delivery: 4, sweet: 5, drinks: 5 });
  S.setSetting('startKey', D.addDays(key, -45));
}

// ---------- snackbar com desfazer ----------
let snackTimer = null;
function snackbar(msg, undoFn) {
  $('.snackbar')?.remove();
  clearTimeout(snackTimer);
  const sb = el(`<div class="snackbar"><span>${esc(msg)}</span>${undoFn ? '<button>Desfazer</button>' : ''}</div>`);
  if (undoFn) sb.querySelector('button').onclick = () => { undoFn(); sb.remove(); };
  document.body.appendChild(sb);
  snackTimer = setTimeout(() => sb.remove(), 6000);
}

// ---------- sheet genérico ----------
function abrirSheet(conteudoEl) {
  fecharSheet();
  const fundo = el('<div class="sheet-fundo"><div class="sheet"></div></div>');
  fundo.querySelector('.sheet').appendChild(conteudoEl);
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fecharSheet(); });
  document.body.appendChild(fundo);
  protegerVoltar();
}
function fecharSheet() { $('.sheet-fundo')?.remove(); }

// ---------- chips de gatilho ----------
function chipsGatilho(onPick) {
  const wrap = el('<div><p style="font-size:.8rem;color:var(--muted);margin:10px 0 8px">O que disparou? (opcional — vira diagnóstico no domingo)</p><div class="chips"></div></div>');
  const chips = wrap.querySelector('.chips');
  for (const g of GATILHOS) {
    const b = el(`<button>${esc(g)}</button>`);
    b.onclick = () => { chips.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); onPick(g); };
    chips.appendChild(b);
  }
  return wrap;
}

// ================================================================
// TELA HOJE — 1 hero (a decisão de agora) + linhas compactas + slot contextual
// ================================================================
function refeicaoDaVez(meals) {
  // a primeira pendente cuja janela ainda não fechou; senão a última pendente
  const agoraMin = agora().getHours() * 60 + agora().getMinutes();
  const pendentes = REFEICOES.filter((r) => !['ok', 'sub', 'skip', 'off'].includes(meals[r.id]));
  if (!pendentes.length) return null;
  for (const r of pendentes) {
    const [h2, m2] = r.horaFim.split(':').map(Number);
    if (agoraMin <= h2 * 60 + m2) return r;
  }
  return pendentes[pendentes.length - 1];
}

// ticker de 1s dos anéis do dashboard — limpo no render() e quando o card sai da tela
let hojeTimer = null;
function iniciarTickHoje() {
  clearInterval(hojeTimer);
  const CIRC = 2 * Math.PI * 52;
  const tick = () => {
    const card = $('.card-tempo');
    if (!card || !card.isConnected) { clearInterval(hojeTimer); return; }
    const st = S.getState();
    const inicioTs = D.parseKey(st.settings.startKey || hojeKey()).getTime();
    const agoraTs = Date.now();
    let proxFlor = null;
    card.querySelectorAll('.tempo-anel').forEach((a) => {
      const type = a.dataset.tipo;
      const t = D.tempoLimpo(D.ultimoSlipTs(st.events, type, inicioTs, viagensCfg()), agoraTs);
      const m = D.proximoMarco(t.totalDias);
      a.querySelector('.ta-dias').textContent = t.dias;
      a.querySelector('.ta-hms').textContent =
        `${String(t.horas).padStart(2, '0')}:${String(t.min).padStart(2, '0')}:${String(t.seg).padStart(2, '0')}`;
      a.querySelector('.ta-prog').style.strokeDasharray = `${CIRC * m.frac} ${CIRC}`;
      a.querySelector('.ta-marco').textContent = `marco de ${m.alvo}d em ${Math.max(1, Math.ceil(m.alvo - t.totalDias))}d`;
      const flor = MARCOS_FLOR.find((f) => f > t.totalDias);
      if (flor) {
        const dias = Math.max(1, Math.ceil(flor - t.totalDias));
        if (!proxFlor || dias < proxFlor.dias) proxFlor = { dias, flor, icone: type === 'delivery' ? '🛵' : '🍫' };
      }
    });
    const prox = card.querySelector('.tempo-prox');
    prox.innerHTML = proxFlor
      ? `próxima conquista: ${miniFlorSVG()} <b>flor nova no jardim</b> — em ${proxFlor.dias}d, no marco de ${proxFlor.flor} do ${proxFlor.icone}`
      : `próxima conquista: ${miniEstrelaSVG()} cada onda surfada no SOS vira estrela no céu do jardim`;
  };
  tick();
  hojeTimer = setInterval(tick, 1000);
}

function renderHoje(root) {
  const st = S.getState();
  const key = hojeKey();
  const ressaca = D.ressacaDoDia(st.events, key);
  if (ressaca.on) return renderRessaca(root, ressaca);

  const tipo = D.tipoDoDia(key, st.settings.dayTypeOverrides);
  const fase = D.fase(key);
  const meals = D.mealsOfDay(st.events, key);
  const feitas = D.mealsDone(meals);
  const agoraMin = agora().getHours() * 60 + agora().getMinutes();

  // ---- slot contextual: NO MÁXIMO um card condicional por vez ----
  root.append(...slotContextual(st, key));

  const planoT = D.treinoDoDia(key);
  const feitoT = D.workoutsDoDia(st.events, key);
  const md = D.marcoDashboard(st.events, st.settings, key, Date.now());
  const icTipo = { delivery: '🛵', sweet: '🍫' };

  // ---- HERO: a refeição da vez OU a colheita do dia (peak-end) ----
  const rv = refeicaoDaVez(meals);
  const jantarFechado = ['ok', 'sub', 'skip', 'off'].includes(meals.jantar);
  const mostrarColheita = !rv || (jantarFechado && agora().getHours() >= 20);
  if (!mostrarColheita) {
    const ouroDomingo = rv.id === 'jantar' && tipo === 'DESCANSO';
    const destaque16 = rv.id === 'lanche2' && agoraMin >= 13 * 60;
    // pós-almoço: o outro pico de vontade de doce — 90 min após registrar o almoço
    const evAlmoco = [...st.events].reverse().find((e) => e.type === 'meal' && e.date === key && e.meal === 'almoco');
    const posAlmoco = !destaque16 && rv.id === 'lanche2' && evAlmoco && ['ok', 'sub'].includes(evAlmoco.status)
      && agora().getTime() - evAlmoco.ts < 90 * 60 * 1000;
    const escudo = destaque16 ? ' · escudo anti-doce das 15h' : posAlmoco ? ' · escudo pós-almoço' : '';
    const ajuste = rv.ajuste[tipo];
    const [rvH, rvM] = rv.hora.split(':').map(Number);
    const rotulo = agoraMin >= rvH * 60 + rvM - 45 ? 'AGORA' : 'PRÓXIMA';
    const hero = el(`<div class="card hero-refeicao ${escudo ? 'destaque-16h' : ''}">
      <div class="hero-rotulo"><span>${rotulo}${escudo}</span><span class="hero-placar num">${feitas}/5 hoje</span></div>
      <h1>${esc(rv.nome)} <span class="hora num">${esc(rv.hora)}</span></h1>
      <p class="cardapio">${esc(rv.principal)}</p>
      ${ouroDomingo ? '<span class="badge-ouro">★ Hoje o jantar é INTENSO — pré-carga do Longão. NÃO corta o carbo.</span>' : ''}
      ${ajuste && !ouroDomingo ? `<p class="ajuste-dia">Hoje (${tipo}): ${esc(ajuste)}</p>` : ''}
      ${escudo ? (D.docePlanejadoDaSemana(st.events, key)?.date === key
    ? '<span class="badge-ouro">🍰 Doce planejado hoje — a vontade tem hora marcada. Guarda ela pra ele.</span>'
    : `<button class="escudo-sos" id="hero-sos">🍫 Bateu a vontade agora? <b>SOS doce</b> — 10 min de onda, sem julgamento ›</button>`) : ''}
      <div class="hero-acoes">
        <button class="acao-primaria" id="hero-feita">✓ Feita</button>
        <button class="acao-secundaria" id="hero-opcoes">substituições / pulei ›</button>
      </div>
    </div>`);
    hero.querySelector('#hero-sos')?.addEventListener('click', () => sosScript('doce'));
    hero.querySelector('#hero-feita').onclick = () => {
      const e = S.addEvent({ type: 'meal', date: key, meal: rv.id, status: 'ok' });
      snackbar(`${rv.nome}: feita ✓`, () => S.removeEvent(e.id));
    };
    hero.querySelector('#hero-opcoes').onclick = () => sheetRefeicao(rv, meals[rv.id] || 'none', key);
    root.append(hero);
  } else {
    // colheita do dia: a memória do dia é dominada pelo fim — o fim mostra a evidência
    const amanha = (D.parseKey(key).getDay() + 1) % 7;
    const limpoHoje = !D.slipDays(st.events, 'delivery', viagensCfg()).includes(key) && !D.slipDays(st.events, 'sweet', viagensCfg()).includes(key);
    const eh = md.escolhido;
    const partes = [];
    if (planoT.corrida) partes.push(`${TIPO_CORRIDA_ICONE[planoT.corrida.tipo]} ${planoT.corrida.nome}${feitoT.corrida ? ' ✓' : ''}`);
    if (planoT.gym) partes.push(`🏋️ ${planoT.gym.split(' — ')[0]}${feitoT.gym ? ' ✓' : ''}`);
    const florMarco = MARCOS_FLOR.includes(eh.marco) ? ' → flor nova no jardim' : '';
    const marcoTxt = eh.batidoHa24h
      ? `${icTipo[eh.tipo]} marco de ${eh.marcoAnterior} dias é seu ✓ · próximo: ${eh.marco}`
      : `${icTipo[eh.tipo]} faltam ${Math.max(1, Math.ceil(eh.marco - eh.totalDias))} dias para o marco de ${eh.marco}${florMarco}`;
    root.append(el(`<div class="card hero-refeicao completo">
      <div class="hero-rotulo">COLHEITA DO DIA</div>
      <h1>${feitas}/5 no plano ✓</h1>
      <div class="colheita">
        ${partes.length ? `<p>${esc(partes.join(' · '))}</p>` : ''}
        ${limpoHoje ? '<p>🌱 Dia limpo — amanhã o jardim cresce mais uma folha.</p>' : ''}
        <p>${esc(marcoTxt)}</p>
      </div>
      <p class="cardapio">${feitas === 5 ? 'Todas as refeições do dia. É assim que a identidade se constrói.' : 'Tendência conta mais que perfeição — o dia está colhido.'}</p>
      <p class="ajuste-dia">Amanhã: ${esc(TREINO_POR_DIA[amanha])}</p>
    </div>`));
  }

  // ---- abertura de semana (fresh start): só segunda de manhã ----
  if (D.parseKey(key).getDay() === 1 && agora().getHours() < 12) {
    const ab = D.aberturaSemana(st.events, key, viagensCfg());
    const abre = planoT.corrida && planoT.corrida.tipo === 'longo' ? 'o Longão de hoje abre ela' : 'ela começa hoje';
    const txt = ab.verdesSeguidas >= 2 ? `${ab.verdesSeguidas} semanas verdes seguidas — ${abre}.`
      : ab.verdeAnterior ? `semana verde fechada ✓ — ${abre}.`
      : `placar novo, 0 a 0 — ${abre}.`;
    root.append(el(`<div class="linha-streaks linha-fresh">🌅 <span><b>Semana nova</b> <small>(${ab.restantes} até a Pampulha)</small> — ${esc(txt)}</span></div>`));
  }

  // ---- treino de hoje: check por modalidade + atalho para a aba ----
  const linhaT = el('<div class="linha-streaks linha-treino"><span class="lt-itens"></span><button class="tr-ver" aria-label="abrir aba Treino">›</button></div>');
  const itens = linhaT.querySelector('.lt-itens');
  if (planoT.corrida || planoT.gym) {
    const addCheck = (kind, icone, nome) => {
      const ok = !!feitoT[kind];
      const b = el(`<button class="lt-check ${ok ? 'feito' : ''}"><span class="caixa">${ok ? '✓' : ''}</span>${icone} ${esc(nome)}</button>`);
      b.onclick = () => {
        const e = S.addEvent({ type: 'workout', date: key, kind, done: !ok });
        if (!ok) snackbar('Treino no papel. 👊', () => S.removeEvent(e.id));
      };
      itens.append(b);
    };
    if (planoT.corrida) addCheck('corrida', TIPO_CORRIDA_ICONE[planoT.corrida.tipo], planoT.corrida.nome);
    if (planoT.gym) addCheck('gym', '🏋️', planoT.gym.split(' — ')[0]);
  } else {
    itens.append(el('<span style="color:var(--muted)">😴 Descanso — o treino de hoje é dormir 7–8h</span>'));
  }
  // previsão da próxima janela de treino (pipeline → data/clima.json); só em dia com corrida
  const cli = planoT.corrida ? climaProximaJanela(key) : null;
  if (cli) {
    const quente = cli.temp >= 28;
    const chuva = (cli.chuvaPct ?? 0) >= 50;
    const dica = quente ? ' — calor infla a FC; o pace é consequência' : chuva ? ' — se chover, esteira ou remarca sem culpa' : '';
    linhaT.append(el(`<small class="lt-clima">${quente ? '🥵' : chuva ? '🌧' : '🌤'} <b class="num">${cli.temp}°C</b> às ${esc(cli.rotulo)}${cli.chuvaPct != null ? ` · chuva ${cli.chuvaPct}%` : ''}${dica}</small>`));
  }
  linhaT.querySelector('.tr-ver').onclick = () => { diaTreinoSel = null; abaAtiva = 'treino'; render(); };
  root.append(linhaT);

  // ---- aviso never-miss-twice (só quando acionável) ----
  const cDeliv = D.contadorResiliente(st.events, 'delivery', key, st.settings.startKey, viagensCfg());
  const cDoce = D.contadorResiliente(st.events, 'sweet', key, st.settings.startKey, viagensCfg());
  for (const [nome, c] of [['iFood', cDeliv], ['doce', cDoce]]) {
    if (c.amassado) {
      root.append(el(`<div class="card aviso-nmt"><b>Contador de ${nome} amassado — não quebrado.</b>
        Um ponto fora da curva. A próxima refeição volta ao script — nunca duas vezes seguidas.</div>`));
      break;
    }
    if (c.quebradoHoje) {
      root.append(el(`<div class="card aviso-nmt"><b>Recomeço no ${nome} — e recomeço conta.</b>
        O estrago real seria a semana inteira. Recorde de ${c.recorde} dias continua seu.</div>`));
      break;
    }
  }

  // ---- TEMPO LIMPO ao vivo: os dois anéis no dashboard (toque → jardim + detalhes) ----
  const cardTempo = el(`<button class="card card-tempo">
    <h2>Tempo limpo <small>· toque para abrir o jardim →</small></h2>
    <div class="tempo-aneis"></div>
    <p class="tempo-prox"></p>
  </button>`);
  const taWrap = cardTempo.querySelector('.tempo-aneis');
  [['delivery', '🛵'], ['sweet', '🍫']].forEach(([type, icone], i) => {
    taWrap.append(el(`<div class="tempo-anel" data-tipo="${type}">
      <svg viewBox="0 0 120 120" class="ta-svg" aria-hidden="true">
        <defs><linearGradient id="gradHoje${i}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3987e5"/><stop offset="100%" stop-color="#1baf7a"/>
        </linearGradient></defs>
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--grid)" stroke-width="7"/>
        <circle class="ta-prog" cx="60" cy="60" r="52" fill="none" stroke="url(#gradHoje${i})" stroke-width="7"
          stroke-linecap="round" transform="rotate(-90 60 60)"/>
      </svg>
      <div class="ta-centro">
        <span class="ta-icone">${icone}</span>
        <span class="ta-dias num">–</span>
        <span class="ta-hms num">--:--:--</span>
      </div>
      <span class="ta-marco"></span>
    </div>`));
  });
  cardTempo.onclick = contadoresOverlay;
  root.append(cardTempo);
  iniciarTickHoje();

  // ---- o objetivo sempre à vista: strip da prova ----
  const iniPlano = st.settings.startKey || key;
  const pct = Math.min(100, Math.max(0, Math.round((D.diffDays(iniPlano, key) / Math.max(1, D.diffDays(iniPlano, PROVA))) * 100)));
  const strip = el(`<button class="card card-pampulha">
    <div class="cp-topo"><span>🏁 Volta da Pampulha 18k</span><b class="num">${D.semanasAteProva(key)} semanas</b></div>
    <div class="cp-barra"><span style="width:${pct}%"></span></div>
    <div class="cp-sub"><span>${pct}% do caminho percorrido</span><span>06/12/2026</span></div>
  </button>`);
  strip.onclick = () => { diaTreinoSel = null; abaAtiva = 'evolucao'; render(); };
  root.append(strip);

  // ---- peso contextual: só de manhã, sem registro hoje ----
  const pesos = D.serie(st.events, 'weight');
  const ultimo = pesos[pesos.length - 1];
  const pesouHoje = ultimo && ultimo.date === key;
  if (!pesouHoje && agora().getHours() < 10) {
    const p = el(`<button class="linha-streaks"><span>⚖️ Pesar agora</span>
      <span style="color:var(--muted)">${ultimo ? `último: ${ultimo.valor.toFixed(1).replace('.', ',')} kg` : 'em jejum, mesma hora, mesma balança'}</span>
      <span class="seta">→</span></button>`);
    p.onclick = () => sheetPeso(key);
    root.append(p);
  }

  // ---- registrar (tudo que "já aconteceu" mora aqui) ----
  const reg = el('<button class="acao-registrar">+ Registrar <span>peso · delivery · doce · noite fora</span></button>');
  reg.onclick = () => sheetRegistrar(key);
  root.append(reg);
}

// slot contextual — renderiza no máximo UM card, por prioridade
function slotContextual(st, key) {
  const horaAgora = agora().getHours();

  // 1. oferta de modo ressaca (manhã após saída)
  const ofertaRessaca = D.saiuOntem(st.events, key) && horaAgora < 14
    && !st.events.some((e) => e.type === 'hangover_dismiss' && e.date === key);
  if (ofertaRessaca) {
    const c = el(`<div class="card ressaca-banner"><b>Saiu ontem à noite?</b>
      Se acordou de ressaca, ative o script do dia seguinte — zero decisões, só execução.
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="acao-primaria" style="margin:0;padding:11px" id="on">Ativar Modo Ressaca</button>
        <button class="acao-secundaria" style="margin:0;width:auto" id="nao">Estou bem</button>
      </div></div>`);
    c.querySelector('#on').onclick = () => S.addEvent({ type: 'hangover_on', date: key });
    c.querySelector('#nao').onclick = () => S.addEvent({ type: 'hangover_dismiss', date: key });
    return [c];
  }

  // 2. contrato da noite ativo → placar 1x1
  const ct = D.contratoAtivo(st.events, key, horaAgora);
  if (ct) return [placarContrato(ct)];

  // 2b. contrato de ontem ficou aberto → fechar com os drinks contados
  const ontem = D.addDays(key, -1);
  const ctOntem = D.contratoAtivo(st.events, ontem, 22);
  if (ctOntem && horaAgora >= 6) {
    const c = el(`<div class="card ressaca-banner"><b>Fechar a noite de ontem?</b>
      Placar do contrato: ${ctOntem.drinks} drink${ctOntem.drinks === 1 ? '' : 's'} (meta era ≤ ${ctOntem.maxDrinks}).
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="acao-primaria" style="margin:0;padding:11px" id="fechar">Confirmar ${ctOntem.drinks} drinks</button>
        <button class="acao-secundaria" style="margin:0;width:auto" id="editar">Corrigir</button>
      </div></div>`);
    c.querySelector('#fechar').onclick = () => S.addEvent({ type: 'night_out', date: ontem, drinks: ctOntem.drinks });
    c.querySelector('#editar').onclick = () => sheetNoite(ontem, ctOntem.drinks);
    return [c];
  }

  // 2c. checkpoint do plano — o treino que recalibra os paces: véspera (≥17h) e o dia.
  // Vem antes da revisão de propósito: a véspera cai sempre em terça, mesmo dia em que a
  // revisão pendente ainda mora no slot — e o checkpoint tem hora marcada.
  const cpHoje = CHECKPOINTS.find((c) => c.date === key);
  if (cpHoje && D.workoutsDoDia(st.events, key).corrida === undefined) {
    const c = el(`<button class="card card-revisao card-checkpoint">
      <span><b>🎯 Hoje: ${esc(cpHoje.titulo)}</b><br><small>O dia que define ${esc(cpHoje.define)}. Como executar — 2 min de leitura</small></span>
      <span class="seta">→</span></button>`);
    c.onclick = () => sheetCheckpoint(cpHoje);
    return [c];
  }
  const cpAmanha = CHECKPOINTS.find((c) => c.date === D.addDays(key, 1));
  if (cpAmanha && horaAgora >= 17) {
    const c = el(`<button class="card card-revisao card-checkpoint">
      <span><b>📌 Amanhã: ${esc(cpAmanha.titulo)}</b><br><small>${esc(cpAmanha.vespera)}</small></span>
      <span class="seta">→</span></button>`);
    c.onclick = () => sheetCheckpoint(cpAmanha);
    return [c];
  }

  // 3. revisão de domingo pendente
  const semanaRev = D.revisaoPendente(st.events, key, horaAgora);
  if (semanaRev) {
    const c = el(`<button class="card card-revisao">
      <span><b>Revisão da semana</b><br><small>5 minutos, os números já estão prontos — feche a semana.</small></span>
      <span class="seta">→</span>
    </button>`);
    c.onclick = () => wizardRevisao(semanaRev);
    return [c];
  }

  // 4. corrida confirmada pelo Garmin sem check no app → 1 toque (nunca automático)
  const pend = analisePendenteConfirmacao(st, key);
  if (pend) {
    const g = pend.analise.garmin;
    return [cardGarminPendente({
      kind: 'corrida', dataReal: pend.date, sugestaoData: pend.sugestaoData,
      resumo: `${String(g.distanciaKm).replace('.', ',')} km em pace ${g.paceMedio || '–'}/km — a análise está na aba Treino.`,
      dispensarChave: `garminDispensado_${pend.date}`,
    })];
  }

  // 5. treino de força registrado no Garmin sem check no app → 1 toque (nunca automático)
  const forca = forcaPendenteConfirmacao(st, key);
  if (forca) {
    return [cardGarminPendente({
      kind: 'gym', dataReal: forca.date, sugestaoData: forca.sugestaoData,
      resumo: forca.minutos ? `${forca.minutos} min de sessão. ` : '',
      dispensarChave: `garminDispensadoGym_${forca.date}`,
    })];
  }

  // 6. volta de viagem (fresh start da reentrada) — ontem/anteontem foi o último dia
  const voltaDe = viagensCfg().find((v) => v.fim === D.addDays(key, -1) || v.fim === D.addDays(key, -2));
  if (voltaDe && !st.settings[`voltaDispensada_${voltaDe.fim}`]) {
    const longa = D.diffDays(voltaDe.ini, voltaDe.fim) + 1 >= 10;
    const c = el(`<div class="card ressaca-banner"><b>🔙 De volta.</b>
      Fresh start: mercado hoje, corrida leve amanhã.${longa ? ' Primeira semana com volume reduzido — o corpo volta rápido; a pressa é que machuca.' : ''}
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="acao-primaria" style="margin:0;padding:11px" id="ok">✓ Bora</button>
      </div></div>`);
    c.querySelector('#ok').onclick = () => S.setSetting(`voltaDispensada_${voltaDe.fim}`, true);
    return [c];
  }

  // 7. viagem ativa — modo manutenção com a dica do dia (rotação determinística pelo dia da viagem)
  const vg = D.viagemDoDia(key, viagensCfg());
  if (vg) {
    const [dicaT, dicaD] = VIAGEM_GUIA[(vg.dia - 1) % VIAGEM_GUIA.length];
    const c = el(`<div class="card card-viagem"><b>✈️ Viagem · dia ${vg.dia} de ${vg.total}</b>
      <span style="display:block;margin-top:6px"><b style="font-weight:600">${esc(dicaT)}.</b> ${esc(dicaD)}</span>
      <button class="acao-secundaria" style="margin-top:10px" id="guia">guia completo da viagem ›</button></div>`);
    c.querySelector('#guia').onclick = () => sheetGuiaViagem();
    return [c];
  }

  return [];
}

// guia completo do modo viagem — evidência sem sermão, no tom do app
function sheetGuiaViagem() {
  const box = el('<div><h3>✈️ Guia de viagem</h3><p style="font-size:.78rem;color:var(--muted);margin:-4px 0 10px">Meta: voltar inteiro, não voltar melhor. O plano espera você.</p><div class="exercicios"></div></div>');
  const lista = box.querySelector('.exercicios');
  VIAGEM_GUIA.forEach(([t, d], i) => {
    lista.append(el(`<div class="exercicio"><span class="ex-num">${i + 1}</span><span class="ex-nome">${esc(t)}<small>${esc(d)}</small></span></div>`));
  });
  abrirSheet(box);
}

// cadastrar viagem (Ajustes) — só o range de datas; o modo liga e desliga sozinho
function sheetViagem(key) {
  const box = el(`<div><h3>✈️ Nova viagem</h3>
    <p style="font-size:.8rem;color:var(--muted)">Só as datas — o resto o app cuida quando o dia chegar.</p>
    <p style="font-size:.75rem;color:var(--muted);margin:10px 0 4px">Primeiro dia</p>
    <input type="date" id="ini" class="input-data" value="${key}">
    <p style="font-size:.75rem;color:var(--muted);margin:10px 0 4px">Último dia</p>
    <input type="date" id="fim" class="input-data" value="${key}">
    <button class="acao-primaria" id="ok">Adicionar viagem ✓</button></div>`);
  box.querySelector('#ok').onclick = () => {
    const ini = box.querySelector('#ini').value, fim = box.querySelector('#fim').value;
    if (!ini || !fim || fim < ini) { snackbar('Confere as datas: o último dia vem depois do primeiro.'); return; }
    S.setSetting('viagens', [...viagensCfg(), { ini, fim }]);
    fecharSheet();
    snackbar(`Viagem ${fmtData(ini)} – ${fmtData(fim)} cadastrada. Boa viagem — o plano espera você. ✈️`);
  };
  abrirSheet(box);
}

function placarContrato(ct) {
  const c = el(`<div class="card placar">
    <div class="placar-topo">
      <span><b>Contrato da noite</b> · ${ct.horaSaida === 'sem limite' ? 'sem hora' : 'até ' + ct.horaSaida}</span>
      <span class="num ${ct.drinks > ct.maxDrinks ? 'estourou' : ''}">${ct.drinks}/${ct.maxDrinks} 🍺 · ${ct.aguas} 💧</span>
    </div>
    <div class="placar-botoes">
      <button id="drink">+1 drink</button>
      <button id="agua">+1 água</button>
      <button id="fim">encerrar noite</button>
    </div>
    ${ct.drinks >= ct.maxDrinks ? `<p class="placar-nota">${ct.drinks === ct.maxDrinks ? 'Número fechado — o próximo copo é água com limão (1x1). Ninguém repara no conteúdo, só no copo.' : 'Estourou em ' + (ct.drinks - ct.maxDrinks) + ' — amassa, não quebra. Água agora e horário de saída valendo.'}</p>` : ''}
  </div>`);
  c.querySelector('#drink').onclick = () => S.addEvent({ type: 'contract_tick', date: ct.date, kind: 'drink' });
  c.querySelector('#agua').onclick = () => S.addEvent({ type: 'contract_tick', date: ct.date, kind: 'agua' });
  c.querySelector('#fim').onclick = () => {
    S.addEvent({ type: 'night_out', date: ct.date, drinks: ct.drinks });
    snackbar(ct.drinks <= ct.maxDrinks ? 'Contrato cumprido. 👊 Água na cabeceira antes de dormir.' : 'Noite fechada. Água na cabeceira — amanhã tem script.');
  };
  return c;
}

// ---------- sheets da tela Hoje ----------
function sheetRefeicao(r, statusAtual, key) {
  const st = S.getState();
  const tipo = D.tipoDoDia(key, st.settings.dayTypeOverrides);
  const ajuste = r.ajuste[tipo];
  const box = el(`<div><h3>${esc(r.nome)} <small style="color:var(--muted);font-weight:400">${esc(r.hora)} · ${esc(r.kcal)}</small></h3>
    <div class="sheet-cardapio">
      <b>Principal:</b> ${esc(r.principal)}<br>
      <b>Sub 1:</b> ${esc(r.subs[0])}<br>
      <b>Sub 2:</b> ${esc(r.subs[1])}
      ${ajuste ? `<br><b>Hoje (${tipo}):</b> ${esc(ajuste)}` : ''}
    </div>
    <div class="opcoes"></div></div>`);
  const ops = box.querySelector('.opcoes');
  const add = (label, small, status) => {
    const b = el(`<button class="opcao">${label}${small ? `<small>${esc(small)}</small>` : ''}</button>`);
    b.onclick = () => {
      const e = S.addEvent({ type: 'meal', date: key, meal: r.id, status });
      fecharSheet();
      snackbar(`${r.nome}: registrado.`, () => S.removeEvent(e.id));
    };
    ops.append(b);
  };
  add('✓ Feita como no plano', r.principal, 'ok');
  add('✓ Fiz uma substituição', `${r.subs[0]} · ou · ${r.subs[1]}`, 'sub');
  add('– Pulei esta refeição', 'Tudo bem — a próxima volta ao script.', 'skip');
  add('✕ Comi fora do plano', 'Registrado sem culpa. Vira dado, não julgamento.', 'off');
  if (statusAtual !== 'none') {
    const b = el('<button class="opcao">↩︎ Desmarcar</button>');
    b.onclick = () => { S.addEvent({ type: 'meal', date: key, meal: r.id, status: 'none' }); fecharSheet(); };
    ops.append(b);
  }
  abrirSheet(box);
}

function sheetEvento(tipo, key) {
  const nomes = { delivery: 'Pedi delivery', sweet: 'Doce fora do plano' };
  let gatilho = null;
  const box = el(`<div><h3>${nomes[tipo]}</h3></div>`);
  box.append(chipsGatilho((g) => { gatilho = g; }));
  const btn = el('<button class="acao-primaria">Registrar</button>');
  btn.onclick = () => {
    const e = S.addEvent({ type: tipo, date: key, ...(gatilho ? { trigger: gatilho } : {}) });
    fecharSheet();
    snackbar('Registrado. A próxima refeição volta ao script.', () => S.removeEvent(e.id));
  };
  box.append(btn);
  abrirSheet(box);
}

// sheet consolidado de registro — tudo que "já aconteceu" (ou vai acontecer) mora aqui
function sheetRegistrar(key) {
  const box = el(`<div><h3>Registrar</h3>
    <p style="font-size:.78rem;color:var(--muted);margin:-6px 0 10px">Já aconteceu? Registra sem culpa — vira dado, não julgamento.</p>
    <div class="opcoes">
      <button class="opcao" id="r-peso">⚖️ Peso / cintura</button>
      <button class="opcao" id="r-delivery">🛵 Pedi delivery</button>
      <button class="opcao" id="r-sweet">🍫 Doce<small>já aconteceu (registrar) — ou planejar um da semana</small></button>
      <button class="opcao" id="r-noite">🍻 Noite fora<small>vou sair (contrato) ou já saí (registrar)</small></button>
    </div>
    <button class="acao-secundaria" id="r-sos">Bateu a vontade AGORA e ainda não cedeu? → Abrir SOS</button></div>`);
  box.querySelector('#r-peso').onclick = () => sheetPeso(key);
  box.querySelector('#r-delivery').onclick = () => sheetEvento('delivery', key);
  box.querySelector('#r-sweet').onclick = () => sheetDoce(key);
  box.querySelector('#r-noite').onclick = () => sheetNoiteFora(key);
  box.querySelector('#r-sos').onclick = () => { fecharSheet(); abrirSOS(); };
  abrirSheet(box);
}

// duas rotas: pré-decisão (contrato, Protocolo 3A) ou registro após o fato
function sheetNoiteFora(key) {
  const box = el(`<div><h3>Noite fora</h3>
    <div class="opcoes">
      <button class="opcao" id="vou">📝 Vou sair — fechar contrato antes<small>Decida AGORA o número de drinks e o horário — nunca no bar.</small></button>
      <button class="opcao" id="ja">🍻 Já saí — registrar<small>Quantos drinks foram, sem culpa.</small></button>
    </div></div>`);
  box.querySelector('#vou').onclick = () => sheetContrato(key);
  box.querySelector('#ja').onclick = () => sheetNoite(key);
  abrirSheet(box);
}

// duas rotas, como a noite fora: pré-decisão (doce planejado, v7.9) ou registro após o fato.
// A pré-decisão é a única porta do "planejado" — registrar depois nunca vira planejado
// (sem racionalização retroativa; o valor do pré-compromisso é decidir ANTES da vontade).
function sheetDoce(key) {
  const box = el(`<div><h3>Doce</h3>
    <div class="opcoes">
      <button class="opcao" id="plano">📝 Planejar um doce — sem quebrar nada<small>Decida ANTES: doce planejado não é deslize — não reseta anel nem jardim.</small></button>
      <button class="opcao" id="ja">🍫 Já aconteceu — registrar<small>Sem culpa — vira dado.</small></button>
    </div></div>`);
  box.querySelector('#plano').onclick = () => sheetDocePlanejado(key);
  box.querySelector('#ja').onclick = () => sheetEvento('sweet', key);
  abrirSheet(box);
}

function sheetDocePlanejado(key) {
  const st = S.getState();
  let dia = key;
  const box = el(`<div><h3>🍰 Doce planejado</h3>
    <p style="font-size:.8rem;color:var(--muted)">Planejado e saboreado — sem culpa, sem reset. Para quando?</p>
    <div class="chips" id="dias"></div>
    <input type="date" id="data" class="input-data" min="${key}" value="${key}">
    <div id="guarda"></div>
    <button class="acao-primaria" id="ok">Planejar doce ✓</button>
    <div id="existentes"></div>
    <p style="font-size:.72rem;color:var(--muted);margin-top:10px">1 por semana é o teto que protege a meta do §4 — restrição flexível funciona quando é limitada.</p></div>`);
  // planejados de hoje em diante: mudar de ideia = remover (o evento é o próprio registro)
  const futuros = st.events.filter((e) => e.type === 'sweet' && e.planejado && e.date >= key);
  for (const f of futuros) {
    const row = el(`<div class="ajuste-linha"><span>🍰 ${fmtData(f.date)} — planejado ✓</span><button class="acao-secundaria" style="width:auto;margin:0">remover</button></div>`);
    row.querySelector('button').onclick = () => { S.removeEvent(f.id); fecharSheet(); snackbar('Doce planejado removido.'); };
    box.querySelector('#existentes').append(row);
  }
  const chips = [['hoje', key], ['amanhã', D.addDays(key, 1)], ['sábado', D.addDays(D.inicioSemana(key), 5) >= key ? D.addDays(D.inicioSemana(key), 5) : D.addDays(D.inicioSemana(key), 12)]];
  const dataEl = box.querySelector('#data');
  const atualizarGuarda = () => {
    const jaTem = D.docePlanejadoDaSemana(st.events, dia);
    box.querySelector('#guarda').innerHTML = jaTem
      ? `<p style="font-size:.78rem;color:var(--ink-2);margin:8px 0 0">O planejado dessa semana já foi (${fmtData(jaTem.date)}). Um segundo entra como doce normal — ou joga pra semana que vem.</p>`
      : '';
    box.querySelector('#ok').style.display = jaTem ? 'none' : '';
  };
  const diasEl = box.querySelector('#dias');
  for (const [rotulo, d] of chips) {
    const b = el(`<button class="${d === dia ? 'sel' : ''}">${rotulo}</button>`);
    b.onclick = () => { dia = d; dataEl.value = d; diasEl.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); atualizarGuarda(); };
    diasEl.append(b);
  }
  dataEl.onchange = () => { if (dataEl.value >= key) { dia = dataEl.value; diasEl.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); atualizarGuarda(); } };
  box.querySelector('#ok').onclick = () => {
    const e = S.addEvent({ type: 'sweet', date: dia, planejado: true });
    fecharSheet();
    snackbar(`Doce de ${fmtData(dia)} planejado. Anel e jardim seguem intactos — aproveita de verdade.`, () => S.removeEvent(e.id));
  };
  atualizarGuarda();
  abrirSheet(box);
}

function sheetContrato(key) {
  let drinks = 3;
  let hora = HORARIOS_SAIDA[1];
  let lanche = false;
  const box = el(`<div><h3>Contrato da noite</h3>
    <p style="font-size:.8rem;color:var(--muted)">Quantos drinks hoje? (meta do protocolo: ≤ 3)</p>
    <div class="stepper">
      <button id="menos">−</button>
      <div class="valor num" id="v">3<small> drinks</small></div>
      <button id="mais">+</button>
    </div>
    <p style="font-size:.8rem;color:var(--muted);margin-bottom:8px">Volto para casa até…</p>
    <div class="chips" id="horas"></div>
    <button class="check-passo" id="lanche" style="margin-top:12px">
      <span class="caixa"></span>
      <span><span class="t">Lanche proteico feito antes de sair</span>
      <span class="d" style="display:block">Álcool de estômago vazio = pico mais rápido + fome de madrugada.</span></span>
    </button>
    <button class="acao-primaria" id="fechar">Fechar contrato</button>
    <button class="acao-secundaria" id="share">📣 Anunciar a um amigo (compromisso público)</button></div>`);
  const v = box.querySelector('#v');
  box.querySelector('#menos').onclick = () => { drinks = Math.max(0, drinks - 1); v.innerHTML = `${drinks}<small> drinks</small>`; };
  box.querySelector('#mais').onclick = () => { drinks = Math.min(10, drinks + 1); v.innerHTML = `${drinks}<small> drinks</small>`; };
  const horasEl = box.querySelector('#horas');
  for (const h of HORARIOS_SAIDA) {
    const b = el(`<button class="${h === hora ? 'sel' : ''}">${h}</button>`);
    b.onclick = () => { hora = h; horasEl.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); };
    horasEl.append(b);
  }
  const lancheBtn = box.querySelector('#lanche');
  lancheBtn.onclick = () => { lanche = !lanche; lancheBtn.classList.toggle('feito', lanche); lancheBtn.querySelector('.caixa').textContent = lanche ? '✓' : ''; };
  box.querySelector('#fechar').onclick = () => {
    S.addEvent({ type: 'contract', date: key, maxDrinks: drinks, horaSaida: hora, lancheAntes: lanche });
    fecharSheet();
    snackbar(`Contrato fechado: ${drinks} drinks, volta ${hora}. O placar fica na tela Hoje.`);
  };
  box.querySelector('#share').onclick = async () => {
    const texto = `Contrato da noite: hoje são ${drinks} drinks e volto ${hora === 'sem limite' ? 'quando der' : 'até ' + hora}. Tô treinando pra Pampulha 🌊 Me cobra!`;
    try { await navigator.share({ text: texto }); } catch { /* cancelado */ }
  };
  abrirSheet(box);
}

function sheetNoite(key, inicial = 3) {
  let drinks = inicial;
  const box = el(`<div><h3>Saí e bebi</h3>
    <p style="font-size:.8rem;color:var(--muted)">Quantos drinks? (meta do protocolo: ≤ 3 por saída)</p>
    <div class="stepper">
      <button id="menos">−</button>
      <div class="valor num" id="v">${inicial}<small> drinks</small></div>
      <button id="mais">+</button>
    </div></div>`);
  const v = box.querySelector('#v');
  box.querySelector('#menos').onclick = () => { drinks = Math.max(0, drinks - 1); v.innerHTML = `${drinks}<small> drinks</small>`; };
  box.querySelector('#mais').onclick = () => { drinks = Math.min(20, drinks + 1); v.innerHTML = `${drinks}<small> drinks</small>`; };
  const btn = el('<button class="acao-primaria">Registrar</button>');
  btn.onclick = () => {
    const e = S.addEvent({ type: 'night_out', date: key, drinks });
    fecharSheet();
    snackbar(drinks <= 3 ? 'Dentro do contrato. 👊' : 'Registrado. Amanhã: script de ressaca, sem culpa.', () => S.removeEvent(e.id));
  };
  box.append(btn);
  abrirSheet(box);
}

function sheetPeso(key) {
  const st = S.getState();
  const pesos = D.serie(st.events, 'weight');
  const cinturas = D.serie(st.events, 'waist');
  let kg = pesos.length ? pesos[pesos.length - 1].valor : 84.0;
  let cm = cinturas.length ? cinturas[cinturas.length - 1].valor : null;
  let cmAtivo = false;

  const box = el(`<div><h3>Peso e cintura</h3>
    <div class="stepper">
      <button id="kg-menos">−</button>
      <div class="valor num" id="kg-v"></div>
      <button id="kg-mais">+</button>
    </div>
    <div style="text-align:center"><button class="acao-secundaria" id="cm-toggle" style="width:auto">+ registrar cintura</button></div>
    <div class="stepper" id="cm-box" style="display:none">
      <button id="cm-menos">−</button>
      <div class="valor num" id="cm-v"></div>
      <button id="cm-mais">+</button>
    </div>
    <div id="spark"></div></div>`);
  const kgV = box.querySelector('#kg-v'), cmV = box.querySelector('#cm-v');
  const showKg = () => { kgV.innerHTML = `${kg.toFixed(1).replace('.', ',')}<small> kg</small>`; };
  const showCm = () => { cmV.innerHTML = `${(cm ?? 90).toFixed(1).replace('.', ',')}<small> cm</small>`; };
  showKg();
  box.querySelector('#kg-menos').onclick = () => { kg = Math.round((kg - 0.1) * 10) / 10; showKg(); };
  box.querySelector('#kg-mais').onclick = () => { kg = Math.round((kg + 0.1) * 10) / 10; showKg(); };
  box.querySelector('#cm-toggle').onclick = () => { cmAtivo = true; cm = cm ?? 90; box.querySelector('#cm-box').style.display = 'flex'; box.querySelector('#cm-toggle').style.display = 'none'; showCm(); };
  box.querySelector('#cm-menos').onclick = () => { cm = Math.round((cm - 0.5) * 10) / 10; showCm(); };
  box.querySelector('#cm-mais').onclick = () => { cm = Math.round((cm + 0.5) * 10) / 10; showCm(); };

  const btn = el('<button class="acao-primaria">Salvar</button>');
  btn.onclick = () => {
    S.addEvent({ type: 'weight', date: key, valor: kg });
    if (cmAtivo && cm) S.addEvent({ type: 'waist', date: key, valor: cm });
    // micro-recompensa: sparkline dos últimos 30 dias
    const serie30 = D.serie(S.getState().events, 'weight').filter((p) => p.date >= D.addDays(key, -29));
    box.querySelector('#spark').innerHTML = serie30.length >= 2
      ? `<p style="font-size:.75rem;color:var(--muted);margin:8px 0 4px">Últimos 30 dias:</p>${sparklineSVG(serie30)}`
      : '<p style="font-size:.8rem;color:var(--good-text);margin-top:8px">Primeiro ponto no gráfico. A tendência começa aqui. ✓</p>';
    btn.textContent = 'Salvo ✓';
    btn.onclick = fecharSheet;
  };
  box.append(btn);
  abrirSheet(box);
}

function sparklineSVG(pontos) {
  const w = 280, h = 48, pad = 4;
  const vs = pontos.map((p) => p.valor);
  const min = Math.min(...vs), max = Math.max(...vs), range = max - min || 1;
  const x = (i) => pad + (i / (pontos.length - 1)) * (w - 2 * pad);
  const y = (v) => h - pad - ((v - min) / range) * (h - 2 * pad);
  const path = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const fim = pontos[pontos.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path d="${path}" fill="none" stroke="var(--serie-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(pontos.length - 1)}" cy="${y(fim.valor)}" r="4" fill="var(--serie-1)" stroke="var(--surface)" stroke-width="2"/>
  </svg>`;
}

// ================================================================
// MODO RESSACA
// ================================================================
function renderRessaca(root, ressaca) {
  const st = S.getState();
  const key = hojeKey();
  const meals = D.mealsOfDay(st.events, key);
  const feitas = D.mealsDone(meals);

  root.append(el(`<div class="card ressaca-banner">
    <b>Modo Ressaca — hoje você não decide nada, só executa.</b>
    Autocontrole zerado é fisiologia, não fraqueza. O script abaixo quebra o dominó de 36h.
    <b style="margin-top:8px">Proibido compensar jejuando.</b> Pular refeição de ressaca = binge às 15h.
  </div>`));

  const card = el('<div class="card"><h2>O script (nesta ordem)</h2><div style="display:grid;gap:8px" id="passos"></div></div>');
  const wrap = card.querySelector('#passos');
  for (const p of RESSACA_PASSOS) {
    const feito = ressaca.steps.has(p.id);
    const b = el(`<button class="check-passo ${feito ? 'feito' : ''}">
      <span class="caixa">${feito ? '✓' : ''}</span>
      <span><span class="t">${esc(p.t)}</span><span class="d" style="display:block">${esc(p.d)}</span></span>
    </button>`);
    b.onclick = () => { if (!feito) S.addEvent({ type: 'hangover_step', date: key, step: p.id }); };
    wrap.append(b);
  }
  root.append(card);

  // refeições do dia MODERADO forçado
  const cardRef = el(`<div class="card"><h2>As 5 refeições — dia MODERADO, normal, sem culpa</h2>
    <p style="font-size:.78rem;color:var(--ink-2);margin-bottom:10px">${feitas}/5 · siga o cardápio base. Errou uma? A próxima volta ao script — nunca duas seguidas.</p>
    <div class="refeicoes" id="refs"></div></div>`);
  const lista = cardRef.querySelector('#refs');
  for (const r of REFEICOES) {
    const status = meals[r.id] || 'none';
    const ok = status === 'ok' || status === 'sub';
    const item = el(`<button class="refeicao ${ok ? 'feita' : ''}">
      <span class="marca">${ok ? '✓' : ''}</span>
      <span><span class="nome">${esc(r.nome)}<span class="hora">${esc(r.hora)}</span></span>
      <span class="desc">${esc(r.id === 'cafe' ? 'Ovos mexidos + pão + fruta + sal normal (fixo de ressaca)' : r.principal)}</span></span>
      <span class="status-txt">${ok ? '✓' : ''}</span>
    </button>`);
    item.onclick = () => S.addEvent({ type: 'meal', date: key, meal: r.id, status: ok ? 'none' : 'ok' });
    lista.append(item);
  }
  root.append(cardRef);

  if (ressaca.completo) {
    root.append(el(`<div class="domino">🁢 Dominó quebrado.<br>
      <span style="font-weight:400;font-size:.82rem;color:var(--ink-2)">Uma noite grande NÃO virou um dia perdido. Isso vale mais que qualquer streak.</span></div>`));
  }

  const sair = el('<button class="acao-secundaria">Encerrar modo ressaca</button>');
  sair.onclick = () => S.addEvent({ type: 'hangover_off', date: key });
  root.append(sair);
}

// ================================================================
// SOS
// ================================================================
let sosTimer = null;
function abrirSOS() {
  fecharSOS();
  const tela = el(`<div class="sos-tela">
    <button class="fechar">✕</button>
    <h2>O que está batendo?</h2>
    <p class="nomeacao">Sem julgamento — escolhe e o script decide por você.</p>
    <div class="sos-opcoes-grandes">
      <button class="opcao" data-k="ifood">🛵 Vontade de iFood<small>Não é fome — é fadiga de decisão às 20h.</small></button>
      <button class="opcao" data-k="doce">🍫 Ansiedade + vontade de doce<small>Isso é regulação emocional, não fome.</small></button>
      <button class="opcao" data-k="ressaca">🥴 Acordei de ressaca<small>Ativa o script do dia seguinte — zero decisões.</small></button>
    </div>
  </div>`);
  tela.querySelector('.fechar').onclick = fecharSOS;
  tela.querySelectorAll('.opcao').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'ressaca') { S.addEvent({ type: 'hangover_on', date: hojeKey() }); fecharSOS(); abaAtiva = 'hoje'; render(); }
      else sosScript(k);
    };
  });
  document.body.appendChild(tela);
  protegerVoltar();
}
function fecharSOS() { clearInterval(sosTimer); $('.sos-tela')?.remove(); }

function sosScript(kind, passoInicial = 0) {
  const script = SOS_SCRIPTS[kind];
  let passo = Math.min(passoInicial, SOS_SCRIPTS[kind].passos.length - 1);
  fecharSOS();
  const tela = el(`<div class="sos-tela">
    <button class="fechar">✕</button>
    <h2>${esc(script.titulo)}</h2>
    <p class="nomeacao">${esc(script.nomeacao)}</p>
    <div class="sos-passo" id="corpo"></div>
  </div>`);
  tela.querySelector('.fechar').onclick = fecharSOS;
  document.body.appendChild(tela);
  protegerVoltar();
  const corpo = tela.querySelector('#corpo');

  const mostrar = () => {
    clearInterval(sosTimer);
    const p = script.passos[passo];
    const ultimo = passo === script.passos.length - 1;
    corpo.innerHTML = `
      <div class="num-passo">PASSO ${passo + 1} DE ${script.passos.length}</div>
      <h3>${esc(p.t)}</h3>
      <p>${esc(p.d)}</p>
      ${p.breathing ? '<div class="respira"><div class="circulo">inspira ×2<br>solta looongo</div></div>' : ''}
      ${ultimo ? ondaHTML() : ''}
      <div id="acoes"></div>`;
    const acoes = corpo.querySelector('#acoes');
    if (!ultimo) {
      const btn = el('<button class="acao-primaria">Feito → próximo passo</button>');
      btn.onclick = () => { passo++; mostrar(); };
      acoes.append(btn);
    } else {
      iniciarOnda(corpo);
      const passou = el('<button class="acao-primaria">🌊 A vontade passou</button>');
      const cedeu = el('<button class="acao-secundaria">Pedi / comi mesmo assim</button>');
      passou.onclick = () => desfecho(kind, 'surfed');
      cedeu.onclick = () => desfecho(kind, 'gave_in');
      acoes.append(passou, cedeu);
    }
  };

  const desfecho = (k, outcome) => {
    let gatilho = null;
    corpo.innerHTML = `<div class="num-passo">${outcome === 'surfed' ? 'ONDA SURFADA' : 'REGISTRADO — SEM CULPA'}</div>
      <h3>${outcome === 'surfed' ? 'A onda passou. +1 pra conta.' : 'O protocolo permite — foi de propósito, não no piloto automático.'}</h3>
      <p>${outcome === 'surfed' ? 'Quase nenhum craving sobrevive a 10 minutos + água. Você acabou de provar.' : 'Um ponto fora da curva. A próxima refeição volta ao script — nunca duas seguidas.'}</p>
      <div id="chips"></div><div id="fim"></div>`;
    corpo.querySelector('#chips').append(chipsGatilho((g) => { gatilho = g; }));
    const btn = el('<button class="acao-primaria">Fechar</button>');
    btn.onclick = () => {
      S.addEvent({ type: 'sos', kind: k, outcome, date: hojeKey(), ...(gatilho ? { trigger: gatilho } : {}) });
      fecharSOS(); render();
    };
    corpo.querySelector('#fim').append(btn);
  };

  mostrar();
}

function ondaHTML() {
  return `<div class="onda-wrap">
    <div class="tempo num" id="onda-tempo">10:00</div>
    <div class="frase">A onda sobe, faz pico e desce sozinha. Seu único trabalho é não alimentá-la.</div>
    <svg viewBox="0 0 300 80" width="100%" height="80" id="onda-svg">
      <path d="M0,70 C60,70 90,12 150,12 C210,12 240,70 300,70" fill="none" stroke="var(--grid)" stroke-width="2"/>
      <path id="onda-prog" d="M0,70 C60,70 90,12 150,12 C210,12 240,70 300,70" fill="none" stroke="var(--serie-1)" stroke-width="2.5" stroke-linecap="round"/>
      <circle id="onda-dot" r="6" fill="var(--serie-1)" stroke="var(--surface)" stroke-width="2"/>
    </svg>
  </div>`;
}

function iniciarOnda(corpo) {
  const DUR = 10 * 60; // segundos
  let t = 0;
  const prog = corpo.querySelector('#onda-prog');
  const dot = corpo.querySelector('#onda-dot');
  const tempo = corpo.querySelector('#onda-tempo');
  const len = prog.getTotalLength();
  prog.style.strokeDasharray = `0 ${len}`;
  const tick = () => {
    const frac = Math.min(1, t / DUR);
    prog.style.strokeDasharray = `${len * frac} ${len}`;
    const pt = prog.getPointAtLength(len * frac);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    const resta = Math.max(0, DUR - t);
    tempo.textContent = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}`;
    if (t >= DUR) { clearInterval(sosTimer); tempo.textContent = 'A onda desceu. 🌊'; tempo.style.fontSize = '1.3rem'; }
    t++;
  };
  tick();
  sosTimer = setInterval(tick, 1000);
}

// ================================================================
// ANÁLISES GARMIN — consome data/*.json gerados pelo pipeline (GitHub Actions)
// Com PAT em Ajustes: lê pela API do GitHub (sem cache) e dispara o workflow.
// Sem PAT: fetch relativo via Pages (SW faz network-first em /data/).
// ================================================================
const REPO_API = 'https://api.github.com/repos/guirangel17/habitos-app';
let dadosAnalises = null;   // { doc, porData: {date: [entradas]} }
let dadosHistorico = null;
let dadosForca = null; // forca-analises.json — pareceres de musculação (v7.7)
let dadosClima = null;      // { atualizadoEm, janelas: [{quando, temp, chuvaPct, umidade}] }

// próxima janela de treino com previsão (6h/19h) a partir de agora; null sem dado fresco
function climaProximaJanela(key) {
  const j = dadosClima?.janelas || [];
  const agoraIso = `${key}T${String(agora().getHours()).padStart(2, '0')}:00`;
  const p = j.find((x) => x.quando >= agoraIso);
  if (!p) return null;
  const [d, h] = p.quando.split('T');
  const rotulo = `${d === key ? '' : 'amanhã '}${parseInt(h, 10)}h`;
  return { ...p, rotulo };
}
let analisesCarregando = null; // promise em voo do fetch, ou null
let analisesTentou = false;
let analiseAguardando = false; // polling pós-disparo em andamento
let pollAnalise = null;

const patGarmin = () => S.getState().settings.garminPat || null;

async function fetchDados(nome) {
  const pat = patGarmin();
  if (pat) {
    try {
      const r = await fetch(`${REPO_API}/contents/data/${nome}?ref=main`, {
        headers: { Accept: 'application/vnd.github.raw+json', Authorization: `Bearer ${pat}` },
        cache: 'no-store',
      });
      if (r.ok) return await r.json();
    } catch { /* cai no fallback do Pages */ }
  }
  try {
    const r = await fetch(`./data/${nome}`, { cache: 'no-cache' });
    if (r.ok) return await r.json();
  } catch { /* offline sem cache */ }
  return null;
}

function carregarAnalises(force = false) {
  if (analisesCarregando) return analisesCarregando; // promise em voo
  if ((dadosAnalises || analisesTentou) && !force) return Promise.resolve();
  analisesCarregando = (async () => {
    const antes = dadosAnalises?.doc?.atualizadoEm ?? null;
    const antesForca = dadosForca?.doc?.atualizadoEm ?? null;
    const antesHist = dadosHistorico?.atualizadoEm ?? null;
    const [an, hist, cli, fa] = await Promise.all([fetchDados('analises.json'), fetchDados('historico.json'), fetchDados('clima.json'), fetchDados('forca-analises.json')]);
    analisesTentou = true;
    if (hist) dadosHistorico = hist;
    if (cli) dadosClima = cli;
    const indexar = (doc) => {
      const porData = {};
      for (const x of doc.analises || []) (porData[x.date] = porData[x.date] || []).push(x);
      return { doc, porData };
    };
    if (fa) dadosForca = indexar(fa);
    if (an) dadosAnalises = indexar(an);
    // historico também re-renderiza: os badges ✨ e o limite do ‹ da aba Treino dependem dele
    if ((an && an.atualizadoEm !== antes) || (fa && fa.atualizadoEm !== antesForca) || (hist && hist.atualizadoEm !== antesHist)) render();
  })().finally(() => { analisesCarregando = null; });
  return analisesCarregando;
}

const analisesDoDia = (key) => dadosAnalises?.porData?.[key] || [];
const forcaAnalisesDoDia = (key) => dadosForca?.porData?.[key] || [];

// dispara o workflow do Actions (caminho rápido ~2-4 min) — exige PAT
async function dispararAnalise(origem) {
  const pat = patGarmin();
  if (!pat) return false;
  const ultimo = Number(S.getState().settings.garminUltimoDisparo || 0);
  if (origem === 'auto' && Date.now() - ultimo < 20 * 60e3) return false;
  try {
    const r = await fetch(`${REPO_API}/actions/workflows/analisar-corridas.yml/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (r.status !== 204) throw new Error(`HTTP ${r.status}`);
    S.setSetting('garminUltimoDisparo', Date.now());
    iniciarPollingAnalise();
    if (origem !== 'auto') snackbar('Análise disparada — chega em ~2-4 min 🛰️');
    return true;
  } catch {
    if (origem !== 'auto') snackbar('Não consegui disparar — confira o token em Ajustes e a rede.');
    return false;
  }
}

function iniciarPollingAnalise() {
  clearInterval(pollAnalise);
  const fim = Date.now() + 8 * 60e3;
  analiseAguardando = true;
  pollAnalise = setInterval(async () => {
    if (Date.now() > fim) { clearInterval(pollAnalise); analiseAguardando = false; render(); return; }
    const antes = dadosAnalises?.doc?.atualizadoEm ?? null;
    const antesForca = dadosForca?.doc?.atualizadoEm ?? null;
    await carregarAnalises(true);
    const veioCorrida = (dadosAnalises?.doc?.atualizadoEm ?? null) !== antes;
    const veioForca = (dadosForca?.doc?.atualizadoEm ?? null) !== antesForca;
    if (veioCorrida || veioForca) {
      clearInterval(pollAnalise);
      analiseAguardando = false;
      snackbar(veioCorrida ? 'Análise da corrida pronta ✨' : 'Parecer da musculação pronto ✨');
      render();
    }
  }, 30e3);
}

// auto-disparo ao abrir/focar: dia com corrida planejada e ainda sem análise
function autoDispararAnalise() {
  const key = hojeKey();
  if (!patGarmin() || agora().getHours() < 7) return;
  if (!D.treinoDoDia(key).corrida || analisesDoDia(key).length) return;
  dispararAnalise('auto');
}

// card de confirmação do card Hoje (slots 4/5): direto quando a atividade caiu no dia certo do
// plano, ou com a sugestão de remanejamento quando caiu noutro dia (ex.: longão feito atrasado)
function cardGarminPendente({ kind, dataReal, sugestaoData, resumo, dispensarChave }) {
  const nomeDia = (d) => `${DIA_NOME[D.parseKey(d).getDay()]} (${fmtData(d)})`;
  if (sugestaoData) {
    const planoAlvo = kind === 'corrida' ? D.treinoDoDia(sugestaoData).corrida?.nome : D.treinoDoDia(sugestaoData).gym;
    const c = el(`<div class="card ressaca-banner"><b>🛰️ O Garmin registrou ${kind === 'corrida' ? 'uma corrida' : 'um treino de força'} de ${nomeDia(dataReal)} fora do plano</b>
      ${resumo} Foi o treino de ${nomeDia(sugestaoData)}${planoAlvo ? ` — ${esc(planoAlvo)}` : ''} que faltou?
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
        <button class="acao-primaria" style="margin:0;padding:11px" id="sim">✓ Sim, foi esse</button>
        <button class="acao-secundaria" style="margin:0;width:auto" id="extra">treino extra</button>
        <button class="acao-secundaria" style="margin:0;width:auto" id="nao">agora não</button>
      </div></div>`);
    c.querySelector('#sim').onclick = () => {
      S.addEvent({ type: 'workout', date: sugestaoData, kind, done: true, origemData: dataReal });
      snackbar('Treino no papel. 👊');
    };
    c.querySelector('#extra').onclick = () => {
      S.addEvent({ type: 'workout', date: dataReal, kind, done: true });
      snackbar('Registrado como treino extra. 👊');
    };
    c.querySelector('#nao').onclick = () => S.setSetting(dispensarChave, true);
    return c;
  }
  const c = el(`<div class="card ressaca-banner"><b>🛰️ O Garmin registrou ${kind === 'corrida' ? 'sua corrida' : 'seu treino de força'} de ${fmtData(dataReal)}</b>
    ${resumo} Marcar o treino como feito?
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="acao-primaria" style="margin:0;padding:11px" id="sim">✓ Marcar feito</button>
      <button class="acao-secundaria" style="margin:0;width:auto" id="nao">agora não</button>
    </div></div>`);
  c.querySelector('#sim').onclick = () => {
    S.addEvent({ type: 'workout', date: dataReal, kind, done: true });
    snackbar('Treino no papel. 👊');
  };
  c.querySelector('#nao').onclick = () => S.setSetting(dispensarChave, true);
  return c;
}

// confirmação de 1 toque: Garmin registrou corrida planejada sem check no app (últimos 3 dias)
function analisePendenteConfirmacao(st, key) {
  if (!dadosAnalises) return null;
  for (const [date, lista] of Object.entries(dadosAnalises.porData)) {
    if (date > key || date < D.addDays(key, -3)) continue;
    if (st.settings[`garminDispensado_${date}`]) continue;
    if (D.workoutsDoDia(st.events, date).corrida !== undefined) continue;
    if (D.treinoDoDia(date).corrida) return { date, analise: lista[0] };
    // fora do plano — sugere remanejar pro dia certo (ex.: longão perdido, feito noutro dia)
    const sugestaoData = D.sugestaoRemanejamento(st.events, date, 'corrida');
    if (sugestaoData) return { date, analise: lista[0], sugestaoData };
  }
  return null;
}

// confirmação de 1 toque: Garmin registrou força em dia com gym planejado sem check (últimos 3 dias)
function forcaPendenteConfirmacao(st, key) {
  if (!dadosHistorico?.forcas) return null;
  for (const f of [...dadosHistorico.forcas].reverse()) {
    if (f.date > key || f.date < D.addDays(key, -3)) continue;
    if (st.settings[`garminDispensadoGym_${f.date}`]) continue;
    if (D.workoutsDoDia(st.events, f.date).gym !== undefined) continue;
    if (D.treinoDoDia(f.date).gym) return f;
    const sugestaoData = D.sugestaoRemanejamento(st.events, f.date, 'gym');
    if (sugestaoData) return { ...f, sugestaoData };
  }
  return null;
}

// datas com sessão de força no Garmin (EVIDÊNCIA visual — nunca marca feito sozinha)
const forcasPorData = () => new Set((dadosHistorico?.forcas || []).map((f) => f.date));

// segunda mais antiga navegável na aba Treino: min(startKey, 1ª sessão de força do Garmin);
// sem nenhum dos dois, a semana atual (a seta ‹ nasce desabilitada)
function limiteSemanaTreino(key) {
  const datas = [S.getState().settings.startKey, ...(dadosHistorico?.forcas || []).map((f) => f.date)].filter(Boolean);
  return D.inicioSemana(datas.length ? datas.reduce((a, b) => (a < b ? a : b)) : key);
}

// guia de execução do checkpoint — ensina a distribuir o esforço (o teste se perde no km 1)
function sheetCheckpoint(cp) {
  const box = el(`<div><h3>🎯 ${esc(cp.titulo)}</h3>
    <p class="detalhe-fase">${esc(cp.porque)}</p>
    <div class="exercicios">${cp.passos.map(([ic, t, d]) => `
      <div class="exercicio"><span class="ex-num">${ic}</span><span class="ex-nome">${esc(t)}<small>${esc(d)}</small></span></div>`).join('')}</div>
    <p style="font-size:.78rem;color:var(--muted);margin-top:12px;line-height:1.45">Terminou? A análise chega sozinha no app (✨ no cronograma) e ${esc(cp.define)} se recalibram a partir do resultado — inclusive a projeção da Pampulha na Evolução.</p>
  </div>`);
  abrirSheet(box);
}

const ROTULO_TE = {
  RECOVERY: 'Recuperação', AEROBIC_BASE: 'Base aeróbica', TEMPO: 'Tempo', LACTATE_THRESHOLD: 'Limiar',
  VO2MAX: 'VO2max', ANAEROBIC_CAPACITY: 'Anaeróbico', SPRINT: 'Sprint',
};

function blocoAnalise(a) {
  const g = a.garmin, ia = a.ia;
  const stat = (l, v) => `<div class="ana-stat"><span class="l">${l}</span><b class="num">${v ?? '–'}</b></div>`;
  const zonas = g.zonasFc ? `<div class="ana-zonas">
      <div class="ana-zbar">${['z1', 'z2', 'z3', 'z4', 'z5'].map((z, i) => (g.zonasFc[z] ? `<span style="width:${g.zonasFc[z]}%;background:var(--zona-${i + 1})"></span>` : '')).join('')}</div>
      <div class="ana-zleg">${['z1', 'z2', 'z3', 'z4', 'z5'].map((z, i) => (g.zonasFc[z] ? `<span class="item"><i style="background:var(--zona-${i + 1})"></i>${z.toUpperCase()} <b class="num">${g.zonasFc[z]}%</b></span>` : '')).join('')}</div>
    </div>` : '';
  const splits = g.splits?.length ? `<div class="ana-splits">${g.splits.map((s) => `<span class="num">${s.km}k ${s.pace}${s.fc ? ` · ${s.fc}` : ''}</span>`).join('')}</div>` : '';
  return el(`<div class="analise">
    <div class="ana-cab">SUA CORRIDA · GARMIN${ia.nota_execucao ? `<span class="ana-nota num">execução ${ia.nota_execucao}/10</span>` : ''}</div>
    <div class="ana-stats">
      ${stat('pace', g.paceMedio ? `${g.paceMedio}/km` : null)}
      ${stat('distância', `${String(g.distanciaKm).replace('.', ',')} km`)}
      ${stat('tempo', `${g.duracaoMin} min`)}
      ${stat('FC méd/máx', g.fcMedia ? `${g.fcMedia}/${g.fcMax}` : null)}
      ${stat('cadência', g.cadencia ? `${g.cadencia} spm` : null)}
      ${stat('Garmin diz', ROTULO_TE[g.trainingEffect?.label] || '–')}
      ${g.derivaCardiacaPct != null ? stat('deriva FC', `${g.derivaCardiacaPct > 0 ? '+' : ''}${String(g.derivaCardiacaPct).replace('.', ',')}%`) : ''}
    </div>
    ${zonas}${splits}
    <div class="ana-ia">
      <p>${esc(ia.resumo)}</p>
      <p class="ana-comp">${esc(ia.comparacao_plano)}</p>
      ${(ia.pontos_fortes || []).map((p) => `<p class="ana-item">💪 ${esc(p)}</p>`).join('')}
      ${(ia.pontos_atencao || []).map((p) => `<p class="ana-item atencao">👀 ${esc(p)}</p>`).join('')}
      <p class="ana-dica">→ ${esc(ia.proxima_dica)}</p>
    </div>
  </div>`);
}

// parecer de musculação (forca-analises.json) — espelha blocoAnalise; tolera entrada sem ia
function blocoAnaliseForca(a) {
  const s = a.sessao || {}, ia = a.ia;
  const stat = (l, v) => `<div class="ana-stat"><span class="l">${l}</span><b class="num">${v ?? '–'}</b></div>`;
  // nomes vêm como chaves do catálogo Garmin (BARBELL_BENCH_PRESS) — suaviza pra exibir
  const nomeEx = (ex) => {
    const cru = [ex.nome, ex.categoria].find((v) => v && v !== 'UNKNOWN') || 'exercício';
    return cru.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  };
  const badge = (ex) => ({
    carga_up: `▲ carga${ex.deltaCarga ? ` +${String(ex.deltaCarga).replace('.', ',')} kg` : ''}`,
    reps_up: `▲ reps${ex.deltaReps ? ` +${ex.deltaReps}` : ''}`,
    igual: '= manteve', ajuste: 'ajuste', novo: 'novo', pulado: '— pulado',
  }[ex.status] || '');
  const resumoSeries = (ex) => {
    const ss = ex.series || [];
    if (!ss.length || ex.status === 'pulado') return '—';
    const reps = ss.map((x) => x.reps).filter((r) => r > 0);
    if (!reps.length) return `${ss.length} × ${Math.round(ss.reduce((acc, x) => acc + (x.s || 0), 0) / ss.length)}s`; // por tempo (prancha)
    const maxKg = Math.max(...ss.map((x) => x.kg || 0));
    const faixa = Math.min(...reps) === Math.max(...reps) ? `${reps[0]}` : `${Math.min(...reps)}-${Math.max(...reps)}`;
    return `${ss.length} × ${faixa}${maxKg ? ` · ${String(maxKg).replace('.', ',')} kg` : ''}`;
  };
  const tabela = s.exercicios?.length ? `<div class="exercicios">${s.exercicios.map((ex, i) => `
      <div class="exercicio">
        <span class="ex-num num">${i + 1}</span>
        <span class="ex-nome">${esc(nomeEx(ex))}<small>${esc(badge(ex))}</small></span>
        <span class="ex-series num">${resumoSeries(ex)}</span>
      </div>`).join('')}</div>` : '';
  const blocoIa = ia ? `<div class="ana-ia">
      <p>${esc(ia.resumo)}</p>
      <p class="ana-comp">${esc(ia.comparacao_plano)}</p>
      ${(ia.pontos_fortes || []).map((p) => `<p class="ana-item">💪 ${esc(p)}</p>`).join('')}
      ${(ia.pontos_atencao || []).map((p) => `<p class="ana-item atencao">👀 ${esc(p)}</p>`).join('')}
      <p class="ana-dica">→ ${esc(ia.proxima_dica)}</p>
    </div>` : '';
  return el(`<div class="analise">
    <div class="ana-cab">SUA SESSÃO · GARMIN${ia?.nota_execucao ? `<span class="ana-nota num">execução ${ia.nota_execucao}/10</span>` : ''}</div>
    <div class="ana-stats">
      ${stat('volume', s.volumeKg ? `${s.volumeKg.toLocaleString('pt-BR')} kg` : null)}
      ${stat('séries', s.series || null)}
      ${stat('tempo', s.minutos ? `${s.minutos} min` : null)}
    </div>
    ${tabela}${blocoIa}
  </div>`);
}

// ================================================================
// TELA DIETA — consulta e registro do plano alimentar (100% read-only sobre data.js)
// ================================================================
function renderDieta(root) {
  const st = S.getState();
  const key = hojeKey();
  const tipo = D.tipoDoDia(key, st.settings.dayTypeOverrides);
  const faseAtual = D.fase(key);
  const metas = (faseAtual === 'deficit' ? METAS_DIA.deficit : METAS_DIA.manutencao)[tipo];
  const meals = D.mealsOfDay(st.events, key);
  const rv = refeicaoDaVez(meals);

  // contexto do dia: o "porquê" do tipo de hoje — em viagem, vira o modo manutenção
  const vgDieta = D.viagemDoDia(key, viagensCfg());
  if (vgDieta) {
    const regras = [VIAGEM_GUIA[1], VIAGEM_GUIA[3], VIAGEM_GUIA[5]]; // proteína, álcool 1×1, never miss twice
    const cardVg = el(`<div class="card dieta-contexto">
      <h2>✈️ Viagem · dia ${vgDieta.dia} de ${vgDieta.total}</h2>
      <p class="dieta-porque">Modo manutenção — o plano volta em ${fmtData(D.addDays(vgDieta.fim, 1))}. Registrar refeição é opcional; nada aqui cobra.</p>
      <div class="exercicios" style="margin-top:8px">${regras.map(([t, d]) => `<div class="exercicio"><span class="ex-num">›</span><span class="ex-nome">${esc(t)}<small>${esc(d)}</small></span></div>`).join('')}</div>
      <button class="acao-secundaria" id="guia-vg" style="margin-top:10px">guia completo da viagem ›</button>
    </div>`);
    cardVg.querySelector('#guia-vg').onclick = () => sheetGuiaViagem();
    root.append(cardVg);
  } else {
    const faseTxt = { deficit: 'déficit', manutencao: 'manutenção', carga: '★ carga de carbo', prova: '🏁 prova' }[faseAtual];
    const docePlan = D.docePlanejadoDaSemana(st.events, key);
    root.append(el(`<div class="card dieta-contexto">
      <h2>Dia ${tipo} · fase ${esc(faseTxt)}</h2>
      <p><b class="num">${esc(metas.kcal)} kcal</b> · P ${esc(metas.p)} · C ${esc(metas.c)} · G ${esc(metas.g)}</p>
      <p class="dieta-porque">Por quê: ${esc(TREINO_POR_DIA[D.parseKey(key).getDay()])}</p>
      ${docePlan && docePlan.date >= key ? `<p class="dieta-porque">🍰 Doce planejado ${docePlan.date === key ? 'hoje' : fmtData(docePlan.date)} — guarda a vontade pra ele.</p>` : ''}
    </div>`));
  }

  // trilha das 5 refeições (toque abre opções de registro)
  const trilha = el('<div class="card trilha-card"><div class="trilha"></div></div>');
  const tWrap = trilha.querySelector('.trilha');
  for (const r of REFEICOES) {
    const status = meals[r.id] || 'none';
    const cls = { ok: 'feita', sub: 'feita', skip: 'pulada', off: 'fora' }[status] || '';
    const daVez = rv && rv.id === r.id;
    const dot = el(`<button class="trilha-item ${cls} ${daVez ? 'da-vez' : ''}" aria-label="${esc(r.nome)}">
      <span class="marca">${status === 'ok' || status === 'sub' ? '✓' : status === 'skip' ? '–' : status === 'off' ? '✕' : ''}</span>
      <span class="t-nome">${esc(r.nome.split(' ')[0])}</span>
      <span class="t-hora num">${esc(r.hora.slice(0, 5))}</span>
    </button>`);
    dot.onclick = () => sheetRefeicao(r, status, key);
    tWrap.append(dot);
  }
  root.append(trilha);

  // cardápio do dia inteiro (principal + ajuste do tipo, sem abrir sheet por sheet).
  // Em viagem não faz sentido — o card de contexto já traz as regras de sobrevivência.
  if (vgDieta) { root.append(semanaEmNumeros(st, key)); return; }
  const cardCardapio = el('<div class="card"><h2>Cardápio de hoje <small>· toque para registrar / ver substituições</small></h2><div class="cardapio-dia"></div></div>');
  const cw = cardCardapio.querySelector('.cardapio-dia');
  for (const r of REFEICOES) {
    const status = meals[r.id] || 'none';
    const feita = status === 'ok' || status === 'sub';
    const ajuste = r.ajuste[tipo];
    const ouro = r.id === 'jantar' && tipo === 'DESCANSO';
    const item = el(`<button class="cardapio-item ${feita ? 'feita' : ''}">
      <span class="c-hora num">${esc(r.hora)}</span>
      <span class="c-corpo"><b>${esc(r.nome)}</b> <small>${esc(r.kcal)}</small><br>${esc(r.principal)}
        ${ouro ? '<span class="badge-ouro">★ Domingo: jantar INTENSO — pré-carga do Longão. NÃO corta o carbo.</span>'
    : ajuste ? `<span class="c-ajuste">Hoje (${tipo}): ${esc(ajuste)}</span>` : ''}</span>
      <span class="c-status">${feita ? '✓' : '›'}</span>
    </button>`);
    item.onclick = () => sheetRefeicao(r, status, key);
    cw.append(item);
  }
  root.append(cardCardapio);

  // semana em números (§4) — movido da Evolução
  root.append(semanaEmNumeros(st, key));
}

// card "Semana" da Dieta (§4) — meta de refeições ajustada por dias de viagem sem registro
function semanaEmNumeros(st, key) {
  const m = D.metricasSemana(st.events, key);
  const b = st.settings.baseline;
  let refSemana = 0, cobrados = 7;
  for (let i = 0; i < 7; i++) {
    const d = D.addDays(m.ini, i);
    const n = D.mealsDone(D.mealsOfDay(st.events, d));
    refSemana += n;
    if (n === 0 && D.emViagem(d, viagensCfg())) cobrados--;
  }
  const metaRef = D.metaSemanaRefeicoes(cobrados);
  const alvoRef = cobrados * 5;
  return el(`<div class="card"><h2>Semana <small>· metas de 30 dias do protocolo</small></h2>
    <div class="tiles">
      ${tileMetrica('Delivery por impulso', m.delivery, b.delivery, 'delivery')}
      ${tileMetrica('Doces fora do plano', m.sweet, b.sweet, 'sweet')}
      ${tileMetrica('Drinks por saída', m.drinks, b.drinks, 'drinks')}
    </div>
    ${m.sweetPlanejado ? `<p style="font-size:.72rem;color:var(--muted);margin-top:6px">🍰 ${m.sweetPlanejado} dos doces foi planejado — conta no consumo, não como deslize.</p>` : ''}
    <p class="const-linha">Refeições no plano: <b class="num">${refSemana}/${alvoRef}</b> ${cobrados < 7 ? '<small style="color:var(--muted)">· ✈️ semana com viagem</small> ' : ''}${cobrados > 0 && refSemana >= metaRef ? '<span style="color:var(--good-text)">✓ semana verde</span>' : `<small style="color:var(--muted)">· verde a partir de ${metaRef} (80%)</small>`}</p>
    ${b.delivery == null ? '<p style="font-size:.72rem;color:var(--muted);margin-top:8px">Defina seu baseline em Ajustes (⚙️ no topo) para ativar as metas de −50%.</p>' : ''}
  </div>`);
}

// ================================================================
// TELA TREINO — hoje, semana e o cronograma de corridas inteiro
// ================================================================
function renderTreino(root) {
  const st = S.getState();
  const key = hojeKey();
  carregarAnalises(); // re-renderiza sozinho quando o JSON chegar
  if (diaTreinoSel === key) diaTreinoSel = null; // tocar no dia de hoje = voltar ao padrão
  if (semTreinoIni === D.inicioSemana(key)) semTreinoIni = null; // navegar até a semana atual = padrão
  const alvo = diaTreinoSel || key; // dia exibido no card de treino
  const plano = D.treinoDoDia(alvo);
  const feito = D.workoutsDoDia(st.events, alvo);
  const futuro = alvo > key;

  // semana — cada dia é um botão que troca o card de treino abaixo; ‹ › navegam semanas passadas
  const sem = D.semanaTreino(st.events, semTreinoIni || key, viagensCfg());
  const semanaAtualIni = D.inicioSemana(key);
  const limite = limiteSemanaTreino(key);
  const cardSem = el(`<div class="card"><div class="treino-cab">
    <h2>Semana <small>· ${fmtData(sem.ini)} – ${fmtData(D.addDays(sem.ini, 6))}${semTreinoIni ? '' : ' · toque num dia para ver o treino'}</small></h2>
    <div class="sem-nav">
      <button class="sem-nav-btn" id="sem-ant" aria-label="semana anterior" ${sem.ini <= limite ? 'disabled' : ''}>‹</button>
      <button class="sem-nav-btn" id="sem-prox" aria-label="semana seguinte" ${sem.ini >= semanaAtualIni ? 'disabled' : ''}>›</button>
    </div></div>
    ${semTreinoIni ? '<button class="chip-voltar" id="sem-atual">‹ voltar para esta semana</button>' : ''}
    <div class="sem-treino"></div>
    <div class="sem-resumo">
      <span>🏋️ Academia <b class="num">${sem.gymFeito}/${sem.gymPlan}</b></span>
      <span>🏃 Corrida <b class="num">${sem.corridaFeita}/${sem.corridaPlan}</b></span>
    </div></div>`);
  const navegarSemana = (delta) => {
    const novo = D.addDays(sem.ini, 7 * delta);
    semTreinoIni = novo === semanaAtualIni ? null : novo;
    diaTreinoSel = null; // trocar de semana limpa o dia selecionado
    render();
  };
  if (sem.ini > limite) cardSem.querySelector('#sem-ant').onclick = () => navegarSemana(-1);
  if (sem.ini < semanaAtualIni) cardSem.querySelector('#sem-prox').onclick = () => navegarSemana(1);
  if (semTreinoIni) cardSem.querySelector('#sem-atual').onclick = () => { semTreinoIni = null; diaTreinoSel = null; render(); };
  const semWrap = cardSem.querySelector('.sem-treino');
  const letras = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const forcasGarmin = forcasPorData();
  sem.dias.forEach((d, i) => {
    // dia de viagem sem nenhum check = um único dot neutro ✈️ (nunca "perdido")
    const soViagem = d.viagem && !d.feito.corrida && !d.feito.gym;
    const col = el(`<button class="sem-dia ${d.date === key ? 'hoje' : ''} ${d.date === alvo ? 'sel' : ''}" aria-pressed="${d.date === alvo}" aria-label="ver treino de ${fmtData(d.date)}">
      <span class="sem-letra">${letras[i]}</span>
      ${soViagem ? '<span class="sem-dot viagem">✈️</span>' : `
      ${d.plano.corrida ? `<span class="sem-dot ${d.feito.corrida ? 'ok' : d.viagem ? 'viagem' : d.date < key ? 'perdido' : ''}">${TIPO_CORRIDA_ICONE[d.plano.corrida.tipo]}</span>` : ''}
      ${d.plano.gym ? `<span class="sem-dot ${d.feito.gym ? 'ok' : d.viagem ? 'viagem' : forcasGarmin.has(d.date) && d.date < key ? 'evid' : d.date < key ? 'perdido' : ''}">🏋️</span>` : ''}
      ${!d.plano.corrida && !d.plano.gym ? '<span class="sem-dot descanso">–</span>' : ''}`}
    </button>`);
    col.onclick = () => { diaTreinoSel = d.date === key ? null : d.date; render(); };
    semWrap.append(col);
  });
  root.append(cardSem);

  // treino do dia exibido (hoje por padrão; outro dia se selecionado na semana)
  const titulo = diaTreinoSel
    ? `Treino de ${DIA_NOME[D.parseKey(alvo).getDay()]} <small>· ${fmtData(alvo)}</small>`
    : 'Treino de hoje';
  const cardHoje = el(`<div class="card"><div class="treino-cab"><h2>${titulo}</h2>${diaTreinoSel ? '<button class="chip-voltar" id="voltar-hoje">‹ voltar para hoje</button>' : ''}</div>
    <div style="display:grid;gap:8px" id="tr"></div></div>`);
  if (diaTreinoSel) cardHoje.querySelector('#voltar-hoje').onclick = () => { diaTreinoSel = null; render(); };
  const tr = cardHoje.querySelector('#tr');
  const linhaTreino = (kind, icone, nome) => {
    const ok = !!feito[kind];
    const pulado = !ok && D.foiPulado(st.events, alvo, kind);
    const row = el(`<div class="treino-row ${ok ? 'feito' : ''}">
      ${futuro
    ? `<div class="check-passo tr-plano"><span><span class="t">${icone} ${esc(nome)}</span></span></div>`
    : `<button class="check-passo tr-check ${ok ? 'feito' : pulado ? 'pulado' : ''}">
        <span class="caixa">${ok ? '✓' : pulado ? '–' : ''}</span>
        <span><span class="t">${icone} ${esc(nome)}</span></span>
      </button>`}
      <button class="tr-ver" aria-label="ver treino completo">›</button>
    </div>`);
    if (!futuro) {
      row.querySelector('.tr-check').onclick = () => {
        const e = S.addEvent({ type: 'workout', date: alvo, kind, done: !ok });
        if (!ok) snackbar(alvo === key ? 'Treino no papel. 👊' : `Registrado em ${fmtData(alvo)} ✓`, () => S.removeEvent(e.id));
      };
    }
    row.querySelector('.tr-ver').onclick = () => sheetTreinoDetalhe(kind, plano, alvo);
    return row;
  };
  // treino extra: sem plano nesse dia, mas com check ou análise do Garmin (ex.: "registrar como
  // treino extra" no card de Hoje, ou dia visitado antes de confirmar) — sem isso ficava invisível
  const extraCorrida = !plano.corrida && (feito.corrida !== undefined || analisesDoDia(alvo).length > 0);
  const extraGym = !plano.gym && (feito.gym !== undefined || forcaAnalisesDoDia(alvo).length > 0);
  if (plano.corrida) tr.append(linhaTreino('corrida', TIPO_CORRIDA_ICONE[plano.corrida.tipo], plano.corrida.nome));
  if (plano.gym) tr.append(linhaTreino('gym', '🏋️', plano.gym + (forcaAnalisesDoDia(D.origemAtividade(st.events, alvo, 'gym')).length ? ' ✨' : '')));
  if (extraCorrida) tr.append(linhaTreino('corrida', '🏃', 'Corrida extra' + (analisesDoDia(alvo).length ? ' ✨' : '')));
  if (extraGym) tr.append(linhaTreino('gym', '🏋️', 'Treino de força extra' + (forcaAnalisesDoDia(alvo).length ? ' ✨' : '')));
  if (!plano.corrida && !plano.gym && !extraCorrida && !extraGym) tr.append(el(`<p style="font-size:.85rem;color:var(--muted)">Descanso — ${futuro ? 'o treino é' : 'hoje o treino é'} dormir 7–8h. Metade da recuperação acontece dormindo.</p>`));
  root.append(cardHoje);

  // ações pro dia sem check: vincular manualmente a uma atividade do Garmin por perto (a
  // sugestão automática em Hoje foi dispensada, ou passou da janela de 4 dias) OU marcar como
  // pulado de propósito (v7.12) — pra diferenciar "não fiz mas vou fazer noutro dia" (some da
  // lista de pendências) de "não fiz e não vou fazer" (fica registrado, sem culpa, sem nagging)
  if (!futuro) {
    // "último vence": pega só o estado ATUAL de cada dia, não qualquer done:true que já existiu
    // na história (ex.: checkbox tocado e desfeito na sequência não pode contar como usado)
    const usadas = (kind) => {
      const ultimoPorData = new Map();
      for (const e of st.events) if (e.type === 'workout' && e.kind === kind) ultimoPorData.set(e.date, e);
      const s = new Set();
      for (const e of ultimoPorData.values()) if (e.done) { s.add(e.date); if (e.origemData) s.add(e.origemData); }
      return s;
    };
    const acaoPular = (kind, rotulo) => {
      const l = el(`<button class="linha-streaks">– <span>Pular ${rotulo} (não vou fazer)</span><span class="seta">→</span></button>`);
      l.onclick = () => {
        const e = S.addEvent({ type: 'workout', date: alvo, kind, done: false, pulado: true });
        snackbar('Sem culpa — registrado. 🌊', () => S.removeEvent(e.id));
      };
      return l;
    };
    if (plano.corrida && !feito.corrida && !D.foiPulado(st.events, alvo, 'corrida')) {
      const usadasC = usadas('corrida');
      const candidatos = (dadosHistorico?.corridas || [])
        .filter((c) => c.date >= D.addDays(alvo, -13) && c.date <= key && !usadasC.has(c.date))
        .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
      if (candidatos.length) {
        const l = el('<button class="linha-streaks">🔗 <span>Vincular a uma corrida do Garmin</span><span class="seta">→</span></button>');
        l.onclick = () => sheetVincularGarmin('corrida', alvo, candidatos);
        root.append(l);
      }
      root.append(acaoPular('corrida', 'essa corrida'));
    }
    if (plano.gym && !feito.gym && !D.foiPulado(st.events, alvo, 'gym')) {
      const usadasG = usadas('gym');
      const candidatos = (dadosHistorico?.forcas || [])
        .filter((f) => f.date >= D.addDays(alvo, -13) && f.date <= key && !usadasG.has(f.date))
        .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
      if (candidatos.length) {
        const l = el('<button class="linha-streaks">🔗 <span>Vincular a um treino de força do Garmin</span><span class="seta">→</span></button>');
        l.onclick = () => sheetVincularGarmin('gym', alvo, candidatos);
        root.append(l);
      }
      root.append(acaoPular('gym', 'esse treino'));
    }
  }

  // disparo rápido da análise (só com PAT configurado em Ajustes)
  if (patGarmin()) {
    const l = el(`<button class="linha-streaks">🛰️ <span>${analiseAguardando ? 'analisando o treino… (~2-4 min)' : 'Buscar análise do último treino'}</span><span class="seta">${analiseAguardando ? '⏳' : '→'}</span></button>`);
    if (!analiseAguardando) l.onclick = () => dispararAnalise('manual');
    root.append(l);
  }

  // cronograma completo de corridas
  const stats = D.corridasStats(st.events, key);
  const cardCron = el(`<div class="card"><h2>Cronograma de corridas <small>· ${stats.feitas}/${stats.passadas} feitas até hoje · ${stats.total} até a prova</small></h2>
    <div class="cronograma" id="cron"></div></div>`);
  const cron = cardCron.querySelector('#cron');
  const feitasCorrida = new Map();
  for (const e of st.events) if (e.type === 'workout' && e.kind === 'corrida') feitasCorrida.set(e.date, e.done);
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  let mesAtual = '';
  let alvoScroll = null;
  for (const [data, tipo, nome] of CORRIDAS) {
    const mes = MESES[D.parseKey(data).getMonth()];
    if (mes !== mesAtual) {
      mesAtual = mes;
      cron.append(el(`<div class="cron-mes">${mes}/26</div>`));
    }
    const ok = !!feitasCorrida.get(data);
    const passada = data < key;
    const hoje = data === key;
    const temAnalise = analisesDoDia(D.origemAtividade(st.events, data, 'corrida')).length > 0;
    const viagem = D.emViagem(data, viagensCfg()); // corrida em viagem sem check: neutra, nunca "perdida"
    const pulado = !ok && D.foiPulado(st.events, data, 'corrida'); // decisão consciente ≠ "perdida"
    const item = el(`<div class="cron-item ${ok ? 'feita' : ''} ${passada && !ok && !temAnalise && !viagem && !pulado ? 'perdida' : ''} ${hoje ? 'hoje' : ''}">
      <button class="cron-toggle">
        <span class="caixa">${ok ? '✓' : ''}</span>
        <span class="cron-data num">${fmtData(data)}</span>
        <span class="cron-nome">${TIPO_CORRIDA_ICONE[tipo]} ${esc(nome)}${temAnalise ? ' <span class="cron-badge">✨</span>' : ''}${viagem && !ok ? ' <span class="cron-badge">✈️</span>' : ''}${pulado ? ' <span class="cron-badge">– pulado</span>' : ''}</span>
      </button>
      <button class="tr-ver cron-ver" aria-label="ver guia da corrida">›</button>
    </div>`);
    item.querySelector('.cron-toggle').onclick = () => S.addEvent({ type: 'workout', date: data, kind: 'corrida', done: !ok });
    item.querySelector('.cron-ver').onclick = () => sheetTreinoDetalhe('corrida', { corrida: { tipo, nome } }, data);
    if (!alvoScroll && data >= key) alvoScroll = item;
    cron.append(item);
  }
  root.append(cardCron);
  // sem seleção/navegação ativa — senão cada toque em ‹ › ou num dia pula a viewport pro cronograma
  if (alvoScroll && !diaTreinoSel && !semTreinoIni) setTimeout(() => alvoScroll.scrollIntoView({ block: 'center' }), 40);
}

// sheet: o treino completo do dia (exercícios da academia / guia de pace da corrida)
function sheetTreinoDetalhe(kind, plano, key) {
  // dia remanejado: a análise do Garmin mora na data REAL da atividade, não na data do plano
  const dataAnalise = D.origemAtividade(S.getState().events, key, kind);
  let box;
  if (kind === 'gym') {
    const exercicios = plano.gym ? (GYM_TREINOS[D.parseKey(key).getDay()] || []) : [];
    const fase = plano.gym ? GYM_FASE_POR_MES[D.parseKey(key).getMonth() + 1] : null;
    box = el(`<div><h3>🏋️ ${esc(plano.gym || 'Treino de força extra')}</h3>
      ${!plano.gym ? '<p class="detalhe-fase">Fora do plano — não substitui nenhum treino planejado.</p>' : ''}
      ${fase ? `<p class="detalhe-fase">${esc(fase)}</p>` : ''}
      <div class="exercicios">${exercicios.map(([ex, sr, obs], i) => `
        <div class="exercicio">
          <span class="ex-num num">${i + 1}</span>
          <span class="ex-nome">${esc(ex)}${obs ? `<small>${esc(obs)}</small>` : ''}</span>
          <span class="ex-series num">${esc(sr)}</span>
        </div>`).join('')}</div></div>`);
    for (const a of forcaAnalisesDoDia(dataAnalise)) box.append(blocoAnaliseForca(a));
    // dia passado sem parecer detalhado, mas com sessão registrada no relógio (historico.json)
    const sess = (dadosHistorico?.forcas || []).find((f) => f.date === dataAnalise);
    if (!forcaAnalisesDoDia(dataAnalise).length && sess) {
      box.append(el(`<div class="analise"><div class="ana-cab">SUA SESSÃO · GARMIN</div>
        <p style="font-size:.82rem;color:var(--ink-2)">🛰️ ${esc(sess.nome || 'Treino de força')} · ${sess.minutos} min — registrado no relógio, sem parecer detalhado.</p></div>`));
    }
  } else {
    const c = plano.corrida;
    const g = c ? (CORRIDA_GUIA[c.tipo] || {}) : {};
    box = el(`<div><h3>${c ? `${TIPO_CORRIDA_ICONE[c.tipo]} ${esc(c.nome)}` : '🏃 Corrida extra'}</h3>
      ${!c ? '<p class="detalhe-fase">Fora do plano — não substitui nenhum treino planejado.</p>' : `
      <div class="exercicios">
        <div class="exercicio"><span class="ex-num">⏱</span><span class="ex-nome">Pace alvo<small>${esc(g.pace || '—')}</small></span></div>
        <div class="exercicio"><span class="ex-num">❤️</span><span class="ex-nome">Frequência cardíaca<small>${esc(g.fc || '—')}</small></span></div>
        <div class="exercicio"><span class="ex-num">🗣</span><span class="ex-nome">Sensação<small>${esc(g.sensacao || '—')}</small></span></div>
        ${g.extra ? `<div class="exercicio"><span class="ex-num">☝️</span><span class="ex-nome">Execução<small>${esc(g.extra)}</small></span></div>` : ''}
      </div>`}</div>`);
    // checkpoint do plano: o sheet do dia ganha o guia de execução completo
    const cp = CHECKPOINTS.find((x) => x.date === key);
    if (cp) {
      const b = el('<button class="acao-primaria" style="margin-top:12px">🎯 Plano do checkpoint — como executar ›</button>');
      b.onclick = () => sheetCheckpoint(cp);
      box.append(b);
    }
    // análise da corrida executada (pipeline Garmin → IA), quando existir para o dia
    for (const a of analisesDoDia(dataAnalise)) box.append(blocoAnalise(a));
  }
  abrirSheet(box);
}

// sheet: lista curta de atividades do Garmin sem vínculo, pra religar manualmente a um dia do
// plano (fallback de "vincular a uma corrida do Garmin" — sem digitar nada, só toque)
function sheetVincularGarmin(kind, alvo, candidatos) {
  const box = el(`<div><h3>Vincular a ${kind === 'corrida' ? 'uma corrida' : 'um treino de força'} do Garmin</h3>
    <p class="detalhe-fase">Qual atividade foi o treino de ${DIA_NOME[D.parseKey(alvo).getDay()]} (${fmtData(alvo)})?</p>
    <div class="exercicios" id="lista"></div></div>`);
  const lista = box.querySelector('#lista');
  for (const c of candidatos) {
    const resumo = kind === 'corrida'
      ? `${String(c.distanciaKm).replace('.', ',')} km${c.paceMedio ? ` · ${c.paceMedio}/km` : ''}`
      : `${c.minutos ? `${c.minutos} min` : 'sessão'}${c.nome ? ` · ${esc(c.nome)}` : ''}`;
    const item = el(`<button class="exercicio" style="width:100%;text-align:left;cursor:pointer">
      <span class="ex-num">🛰️</span>
      <span class="ex-nome">${DIA_NOME[D.parseKey(c.date).getDay()]} (${fmtData(c.date)})<small>${resumo}</small></span>
    </button>`);
    item.onclick = () => {
      S.addEvent({ type: 'workout', date: alvo, kind, done: true, origemData: c.date });
      fecharSheet();
      snackbar('Treino no papel. 👊');
    };
    lista.append(item);
  }
  abrirSheet(box);
}

// ================================================================
// JARDIM DO TEMPO LIMPO — recompensa viva e determinística
// cada dia limpo cresce a planta · cada marco vira flor · cada onda surfada vira estrela
// ================================================================
const MARCOS_FLOR = [3, 7, 14, 21, 30, 45, 60, 90, 120]; // marcos que viram flor no jardim

function jardimSVG(plantas, estrelas) {
  const W = 420, H = 200, CHAO = 168;
  const marcosFlor = MARCOS_FLOR;
  let out = '';

  // céu: estrelas (ondas surfadas), posições determinísticas
  const nEst = Math.min(estrelas, 14);
  for (let i = 0; i < nEst; i++) {
    const x = 24 + ((i * 89) % 372);
    const y = 14 + ((i * 53) % 76);
    const r = 1.4 + ((i * 7) % 3) * 0.55;
    out += `<circle class="estrela" style="animation-delay:${(i % 5) * 0.7}s" cx="${x}" cy="${y}" r="${r}" fill="var(--jardim-estrela)"/>`;
  }

  // chão
  out += `<ellipse cx="${W / 2}" cy="${CHAO + 42}" rx="${W * 0.62}" ry="52" fill="var(--jardim-solo)"/>`;

  // grama: cresce com o total de dias
  const totalDias = plantas.reduce((s, p) => s + p.dias, 0);
  const nGrama = Math.min(6 + totalDias, 46);
  for (let i = 0; i < nGrama; i++) {
    const x = 18 + ((i * 61) % 384);
    const h = 5 + ((i * 13) % 8);
    const dx = ((i * 17) % 7) - 3;
    out += `<path d="M${x},${CHAO + 6} q${dx},-${h} ${dx * 1.6},-${h + 3}" stroke="var(--jardim-folha)" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  }

  // plantas
  plantas.forEach((p, pi) => {
    const cx = W * (plantas.length === 1 ? 0.5 : pi === 0 ? 0.34 : 0.66);
    const d = Math.max(0, p.dias);
    const altura = 22 + Math.min(d, 30) / 30 * 92;
    const topo = CHAO - altura;
    const curva = pi === 0 ? -10 : 10;
    let g = `<g>`;
    g += `<path d="M${cx},${CHAO + 4} Q${cx + curva},${CHAO - altura * 0.55} ${cx + curva * 0.6},${topo}" stroke="var(--jardim-caule)" stroke-width="${3 + Math.min(d, 30) / 18}" fill="none" stroke-linecap="round"/>`;

    // folhas: uma a cada 2 dias
    const nFolhas = Math.min(2 + Math.floor(d / 2), 10);
    for (let i = 0; i < nFolhas; i++) {
      const frac = 0.22 + (i / nFolhas) * 0.66;
      const fy = CHAO - altura * frac;
      const fx = cx + curva * frac * 0.8;
      const lado = i % 2 ? 1 : -1;
      const tam = 7 + Math.min(d, 30) / 6 + (i % 3);
      const ang = lado === 1 ? -28 : 208;
      g += `<ellipse cx="${fx + lado * tam * 0.75}" cy="${fy}" rx="${tam}" ry="${tam * 0.42}"
        transform="rotate(${ang} ${fx} ${fy})" fill="var(--jardim-folha)" opacity="${0.75 + (i % 2) * 0.2}"/>`;
    }

    // flores: uma por marco atingido
    const nFlores = marcosFlor.filter((m) => d >= m).length;
    for (let i = 0; i < nFlores; i++) {
      const principal = i === 0;
      const frac = principal ? 1 : 0.35 + ((i * 29) % 55) / 100;
      const fy = CHAO - altura * frac - (principal ? 6 : 0);
      const fx = cx + curva * frac * 0.7 + (principal ? 0 : (i % 2 ? 16 : -16));
      const r = principal ? 8 : 5.5;
      if (!principal) g += `<path d="M${cx + curva * frac * 0.8},${CHAO - altura * frac} L${fx},${fy}" stroke="var(--jardim-caule)" stroke-width="1.8" fill="none"/>`;
      for (let pt = 0; pt < 6; pt++) {
        const a = (Math.PI / 3) * pt + (i * 0.5);
        g += `<circle cx="${fx + Math.cos(a) * r}" cy="${fy + Math.sin(a) * r}" r="${r * 0.62}" fill="var(--jardim-petala-${pi + 1})"/>`;
      }
      g += `<circle cx="${fx}" cy="${fy}" r="${r * 0.5}" fill="var(--jardim-miolo)"/>`;
    }

    // broto recém-plantado
    if (d === 0) {
      g += `<ellipse cx="${cx - 5}" cy="${CHAO - 6}" rx="6" ry="3" transform="rotate(-30 ${cx - 5} ${CHAO - 6})" fill="var(--jardim-folha)"/>
        <ellipse cx="${cx + 5}" cy="${CHAO - 6}" rx="6" ry="3" transform="rotate(30 ${cx + 5} ${CHAO - 6})" fill="var(--jardim-folha)"/>`;
    }
    g += '</g>';
    out += g;

    // etiqueta da planta
    out += `<text x="${cx}" y="${H - 4}" text-anchor="middle" font-size="10.5" fill="var(--ink-2)" font-weight="600">${p.icone} ${p.dias}d</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" class="jardim">${out}</svg>`;
}

// miniaturas das recompensas do jardim — a referência visual do que se ganha
function miniFolhaSVG(t = 14) {
  return `<svg viewBox="0 0 24 24" width="${t}" height="${t}" style="display:inline-block;vertical-align:-3px">
    <ellipse cx="9" cy="14" rx="8" ry="3.4" transform="rotate(-28 9 14)" fill="var(--jardim-folha)"/>
    <ellipse cx="16" cy="10" rx="7" ry="3" transform="rotate(24 16 10)" fill="var(--jardim-folha)" opacity="0.8"/>
  </svg>`;
}
function miniFlorSVG(t = 14) {
  let petalas = '';
  for (let pt = 0; pt < 6; pt++) {
    const a = (Math.PI / 3) * pt;
    petalas += `<circle cx="${12 + Math.cos(a) * 5.6}" cy="${12 + Math.sin(a) * 5.6}" r="3.7" fill="var(--jardim-petala-1)"/>`;
  }
  return `<svg viewBox="0 0 24 24" width="${t}" height="${t}" style="display:inline-block;vertical-align:-3px">${petalas}<circle cx="12" cy="12" r="3" fill="var(--jardim-miolo)"/></svg>`;
}
function miniEstrelaSVG(t = 14) {
  return `<svg viewBox="0 0 24 24" width="${t}" height="${t}" style="display:inline-block;vertical-align:-3px">
    <circle cx="12" cy="12" r="3.2" fill="var(--jardim-estrela)"/>
    <path d="M12 3.5v4.5M12 16v4.5M3.5 12H8M16 12h4.5" stroke="var(--jardim-estrela)" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`;
}

// legenda do jardim: o que cada elemento significa + a próxima flor de cada planta
function legendaJardim(st, key) {
  const inicioTs = D.parseKey(st.settings.startKey || key).getTime();
  const prox = ['delivery', 'sweet'].map((type) => {
    const icone = type === 'delivery' ? '🛵' : '🍫';
    const t = D.tempoLimpo(D.ultimoSlipTs(st.events, type, inicioTs, viagensCfg()), Date.now());
    const flor = MARCOS_FLOR.find((f) => f > t.totalDias);
    if (!flor) return `${icone} todas as flores de marco até 120d já são suas`;
    return `${icone} próxima flor: marco de ${flor} dias — faltam ${Math.max(1, Math.ceil(flor - t.totalDias))}d`;
  });
  return el(`<div class="jardim-legenda">
    <div class="jl-itens">
      <span>${miniFolhaSVG()} folha nova a cada 2 dias limpos</span>
      <span>${miniFlorSVG()} flor a cada marco (3·7·14·21·30…)</span>
      <span>${miniEstrelaSVG()} estrela por onda surfada no SOS</span>
    </div>
    <div class="jl-prox">${prox.map((l) => `<span>${l}</span>`).join('')}</div>
  </div>`);
}

function dadosJardim(st, key) {
  const inicioTs = D.parseKey(st.settings.startKey || key).getTime();
  const dias = (type) => Math.floor(D.tempoLimpo(D.ultimoSlipTs(st.events, type, inicioTs, viagensCfg()), Date.now()).totalDias);
  return {
    plantas: [
      { icone: '🛵', dias: dias('delivery') },
      { icone: '🍫', dias: dias('sweet') },
    ],
    estrelas: D.ondasSurfadas(st.events),
  };
}

// ================================================================
// CONTADORES — overlay estilo SugarCut (anel + tempo vivo)
// ================================================================
let contadorTimer = null;
function contadoresOverlay() {
  fecharSOS();
  clearInterval(contadorTimer);
  const st = S.getState();
  const key = hojeKey();
  const inicioTs = D.parseKey(st.settings.startKey || key).getTime();

  const jardim = dadosJardim(st, key);
  const tela = el(`<div class="sos-tela">
    <button class="fechar">✕</button>
    <h2>Tempo limpo</h2>
    <p class="nomeacao">Cada dia limpo cresce o jardim · cada marco vira flor · cada onda surfada vira estrela.</p>
    ${jardimSVG(jardim.plantas, jardim.estrelas)}
    <div id="jardim-leg"></div>
    <div class="aneis" id="aneis"></div>
  </div>`);
  tela.querySelector('#jardim-leg').append(legendaJardim(st, key));
  tela.querySelector('.fechar').onclick = () => { clearInterval(contadorTimer); tela.remove(); };
  document.body.appendChild(tela);
  protegerVoltar();
  const wrap = tela.querySelector('#aneis');

  const defs = [
    { type: 'delivery', icone: '🛵', nome: 'Sem iFood por impulso' },
    { type: 'sweet', icone: '🍫', nome: 'Sem doce fora do plano' },
  ];
  const anelEls = defs.map((d, i) => {
    const c = D.contadorResiliente(st.events, d.type, key, st.settings.startKey, viagensCfg());
    const box = el(`<div class="anel-card">
      <svg viewBox="0 0 200 200" class="anel-svg">
        <defs><linearGradient id="grad${i}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3987e5"/><stop offset="100%" stop-color="#1baf7a"/>
        </linearGradient></defs>
        <circle cx="100" cy="100" r="86" fill="none" stroke="var(--grid)" stroke-width="10"/>
        <circle class="anel-prog" cx="100" cy="100" r="86" fill="none" stroke="url(#grad${i})" stroke-width="10"
          stroke-linecap="round" transform="rotate(-90 100 100)"/>
      </svg>
      <div class="anel-centro">
        <span class="anel-icone">${d.icone}</span>
        <span class="anel-dias num">–</span>
        <span class="anel-hms num">--:--:--</span>
      </div>
      <div class="anel-info">
        <b>${d.nome}</b>
        <span class="anel-marco"></span>
        <span class="anel-sub">recorde ${c.recorde}d · streak resiliente ${c.streak}d · ${c.limpos30}/${c.janela} dias limpos</span>
      </div>
    </div>`);
    wrap.append(box);
    return { box, type: d.type };
  });

  const CIRC = 2 * Math.PI * 86;
  const tick = () => {
    const eventos = S.getState().events;
    const agoraTs = Date.now();
    for (const a of anelEls) {
      const desde = D.ultimoSlipTs(eventos, a.type, inicioTs, viagensCfg());
      const t = D.tempoLimpo(desde, agoraTs);
      const marco = D.proximoMarco(t.totalDias);
      a.box.querySelector('.anel-dias').textContent = t.dias;
      a.box.querySelector('.anel-hms').textContent =
        `${String(t.horas).padStart(2, '0')}:${String(t.min).padStart(2, '0')}:${String(t.seg).padStart(2, '0')}`;
      a.box.querySelector('.anel-prog').style.strokeDasharray = `${CIRC * marco.frac} ${CIRC}`;
      const faltam = marco.alvo - t.totalDias;
      a.box.querySelector('.anel-marco').textContent =
        `próximo marco: ${marco.alvo} dias — faltam ${Math.floor(faltam)}d ${Math.floor((faltam % 1) * 24)}h`;
    }
  };
  tick();
  contadorTimer = setInterval(tick, 1000);
}

// ================================================================
// REVISÃO DE DOMINGO — wizard de 5 passos (Protocolo §4)
// ================================================================
// export do backup (Ajustes + lembrete mensal no wizard) — share nativo com fallback download
async function exportarBackup() {
  const json = S.exportJSON();
  const nome = `rotina-backup-${hojeKey()}.json`;
  const file = new File([json], nome, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: nome });
    } else { throw new Error('share indisponível'); }
  } catch {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = nome; a.click(); URL.revokeObjectURL(a.href);
  }
  S.setSetting('lastBackupTs', Date.now());
}

// dias de CALENDÁRIO desde o último backup — backup ontem à noite = 1, nunca 0
// (floor de (agora-ts)/24h dizia "backup hoje" para qualquer backup de menos de 24h atrás)
function diasDesdeBackup(st) {
  return st.settings.lastBackupTs ? D.diffDays(D.dateKey(new Date(st.settings.lastBackupTs)), hojeKey()) : null;
}

function wizardRevisao(semanaIni, passoInicial = 0) {
  const st = S.getState();
  const m = D.metricasSemana(st.events, semanaIni);
  const mAnt = D.metricasSemana(st.events, D.addDays(semanaIni, -7));
  const b = st.settings.baseline;
  const gat = st.events
    .filter((e) => e.trigger && (e.date || '') >= semanaIni && (e.date || '') <= D.addDays(semanaIni, 6))
    .reduce((acc, e) => { acc[e.trigger] = (acc[e.trigger] || 0) + 1; return acc; }, {});
  const gatOrd = Object.entries(gat).sort((a, x) => x[1] - a[1]);

  let nota = '';
  let ajuste = null;
  let passo = passoInicial;

  fecharSOS();
  const tela = el(`<div class="sos-tela">
    <button class="fechar">✕</button>
    <h2>Revisão da semana</h2>
    <p class="nomeacao">${fmtData(semanaIni)} – ${fmtData(D.addDays(semanaIni, 6))} · os números já estão contados, você só interpreta.</p>
    <div class="sos-passo" id="corpo"></div>
  </div>`);
  tela.querySelector('.fechar').onclick = fecharSOS;
  document.body.appendChild(tela);
  protegerVoltar();
  const corpo = tela.querySelector('#corpo');

  const linhaMetrica = (nome, v, vAnt, alvo, okFn) => {
    const delta = vAnt === null || v === null ? '' : v < vAnt ? ' ↓' : v > vAnt ? ' ↑' : ' =';
    const vTxt = v === null ? '–' : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(1).replace('.', ',') : v;
    const okTxt = v !== null && okFn(v) ? ' <b style="color:var(--good-text)">✓ na meta</b>' : '';
    return `<div class="rev-metrica"><span>${nome}</span>
      <span class="num">${vTxt}<small style="color:var(--muted)"> (antes: ${vAnt === null ? '–' : String(vAnt).replace('.', ',')})${delta}</small>${okTxt}</span>
      <small style="color:var(--muted)">meta ${alvo}</small></div>`;
  };

  const passos = [
    () => {
      const diasViagem = Array.from({ length: 7 }, (_, i) => D.addDays(semanaIni, i)).filter((d) => D.emViagem(d, viagensCfg())).length;
      corpo.innerHTML = `<div class="num-passo">PASSO 1 DE 6 · OS TRÊS NÚMEROS</div>
        ${diasViagem ? `<p style="color:var(--ink-2);font-size:.85rem">✈️ ${diasViagem} dia${diasViagem > 1 ? 's' : ''} de viagem nesta semana — modo manutenção, leia os números com esse desconto.</p>` : ''}
        ${linhaMetrica('🛵 Delivery por impulso', m.delivery, mAnt.delivery, b.delivery != null ? `≤ ${String(b.delivery * 0.5).replace('.', ',')}` : '−50% do baseline', (v) => b.delivery != null && v <= b.delivery * 0.5)}
        ${linhaMetrica('🍫 Doces fora do plano', m.sweet, mAnt.sweet, b.sweet != null ? `≤ ${String(b.sweet * 0.5).replace('.', ',')}` : '−50% do baseline', (v) => b.sweet != null && v <= b.sweet * 0.5)}
        ${linhaMetrica('🍻 Drinks por saída', m.drinks, mAnt.drinks, '≤ 3', (v) => v <= 3)}
        <p style="color:var(--ink-2);font-size:.85rem">Meta é tendência, não perfeição — de 5 para 2 é vitória enorme.</p>
        <div id="acoes"></div>`;
    },
    () => {
      // a semana do atleta — números prontos do Garmin (historico.json) + checks do app
      const fimSem = D.addDays(semanaIni, 6);
      const corr = (dadosHistorico?.corridas || []).filter((c) => c.date >= semanaIni && c.date <= fimSem);
      const km = corr.reduce((s, c) => s + (c.distanciaKm || 0), 0);
      let gymPlan = 0, gymFeito = 0, corrPlan = 0;
      for (let d = semanaIni; d <= fimSem; d = D.addDays(d, 1)) {
        const p = D.treinoDoDia(d), f = D.workoutsDoDia(st.events, d);
        if (p.gym) { gymPlan++; if (f.gym) gymFeito++; }
        if (p.corrida) corrPlan++;
      }
      const longao = corr.filter((c) => c.tipoPlano === 'longo').sort((a, x) => (x.distanciaKm || 0) - (a.distanciaKm || 0))[0];
      const efs = corr.filter((c) => c.ef && (c.paradoPct || 0) <= 10 && c.fcMedia && c.fcMedia <= 165);
      const efSem = efs.length ? (efs.reduce((s, c) => s + c.ef, 0) / efs.length) : null;
      corpo.innerHTML = `<div class="num-passo">PASSO 2 DE 6 · O ATLETA</div>
        ${corr.length || gymPlan ? `
          <div class="rev-metrica"><span>🏃 Corridas</span><span class="num"><b>${corr.length}</b>/${corrPlan} · ${km.toFixed(1).replace('.', ',')} km</span></div>
          ${longao ? `<div class="rev-metrica"><span>📏 Longão</span><span class="num"><b>${String(longao.distanciaKm).replace('.', ',')} km</b> · ${longao.paceMedio}/km${longao.fcMedia ? ` · FC ${longao.fcMedia}` : ''}</span></div>` : ''}
          <div class="rev-metrica"><span>🏋️ Academia</span><span class="num"><b>${gymFeito}</b>/${gymPlan}</span></div>
          ${efSem ? `<div class="rev-metrica"><span>⚡ Eficiência aeróbica</span><span class="num"><b>${efSem.toFixed(2).replace('.', ',')}</b> m/bat</span></div>` : ''}
          <p style="color:var(--ink-2);font-size:.85rem;margin-top:8px">Treino feito em semana difícil vale dobrado — constância vence volume.</p>`
          : '<h3>Semana sem treinos registrados</h3><p>O Garmin conta as corridas sozinho; a academia é 1 toque na linha do treino.</p>'}
        <div id="acoes"></div>`;
    },
    () => {
      corpo.innerHTML = `<div class="num-passo">PASSO 3 DE 6 · O QUE DISPAROU</div>
        ${gatOrd.length
          ? `<div style="display:grid;gap:6px">${gatOrd.map(([g, n]) => `<div class="rev-metrica"><span>${esc(g)}</span><span class="num">${n}×</span></div>`).join('')}</div>
             <p style="color:var(--ink-2);font-size:.85rem;margin-top:8px">Ataque o estressor, não o chocolate.</p>`
          : '<h3>Semana sem gatilhos registrados</h3><p>Ou foi limpa de verdade, ou os chips ficaram sem uso — os dois valem saber.</p>'}
        <div id="acoes"></div>`;
    },
    () => {
      corpo.innerHTML = `<div class="num-passo">PASSO 4 DE 6 · UMA LINHA</div>
        <h3>O que disparou os deslizes da semana?</h3>
        <input class="rev-input" id="nota" maxlength="120" placeholder="opcional — ex.: sprint atrasada, 3 calls seguidas…" value="${esc(nota)}">
        <div id="acoes"></div>`;
      corpo.querySelector('#nota').oninput = (e) => { nota = e.target.value; };
    },
    () => {
      corpo.innerHTML = `<div class="num-passo">PASSO 5 DE 6 · UM AJUSTE DE AMBIENTE</div>
        <h3>Para a próxima semana, mude o ambiente — não a força de vontade.</h3>
        <div class="opcoes" id="ops" style="margin-top:8px"></div>
        <div id="acoes"></div>`;
      const ops = corpo.querySelector('#ops');
      for (const a of AJUSTES_AMBIENTE) {
        const btn = el(`<button class="opcao ${ajuste === a ? 'sel-opcao' : ''}" style="font-size:.85rem;padding:11px 13px">${esc(a)}</button>`);
        btn.onclick = () => {
          ajuste = a;
          ops.querySelectorAll('.opcao').forEach((x) => x.classList.remove('sel-opcao'));
          btn.classList.add('sel-opcao');
          const prox = corpo.querySelector('#acoes button');
          if (prox) prox.textContent = 'Próximo →';
        };
        ops.append(btn);
      }
    },
    () => {
      const ident = D.identidadeAssinada([...st.events, { type: 'review', week: semanaIni }], D.addDays(semanaIni, 8));
      const diasBk = diasDesdeBackup(st);
      const bkVelho = diasBk === null || diasBk > 30;
      corpo.innerHTML = `<div class="num-passo">PASSO 6 DE 6 · FECHADO</div>
        <h3>“${FRASE_IDENTIDADE}”</h3>
        <p>Mais uma semana de evidência. ${ident.assinada ? 'Frase assinada — 4 domingos seguidos. ✍️' : `Assinatura: ${Math.min(ident.progresso + 1, 4)}/4 domingos de revisão.`}</p>
        ${ajuste ? `<p style="color:var(--ink-2)">Ajuste da semana: <b>${esc(ajuste)}</b></p>` : ''}
        ${bkVelho ? `<button class="escudo-sos" id="bkp">📥 ${diasBk === null ? 'Seus dados vivem só neste aparelho e ainda não têm backup' : `Último backup há ${diasBk} dias`} — <b>exportar agora</b> (30 s, manda pro seu Drive/WhatsApp) ›</button>` : ''}
        <div id="acoes"></div>`;
      corpo.querySelector('#bkp')?.addEventListener('click', () => { exportarBackup(); });
    },
  ];

  const mostrar = () => {
    passos[passo]();
    const acoes = corpo.querySelector('#acoes');
    if (passo < passos.length - 1) {
      const btn = el(`<button class="acao-primaria">${passo === 4 && !ajuste ? 'Pular ajuste →' : 'Próximo →'}</button>`);
      btn.onclick = () => { passo++; mostrar(); };
      acoes.append(btn);
    } else {
      const btn = el('<button class="acao-primaria">Fechar a semana ✓</button>');
      btn.onclick = () => {
        S.addEvent({ type: 'review', week: semanaIni, nota: nota || null, ajuste });
        fecharSOS();
        snackbar('Semana revisada. A rota até a Pampulha ganhou um segmento.');
      };
      acoes.append(btn);
    }
  };
  mostrar();
}

// ================================================================
// TELA EVOLUÇÃO
// ================================================================
function renderEvolucao(root) {
  const st = S.getState();
  const key = hojeKey();
  const fase = D.fase(key);
  const faseTxt = { deficit: `cutting leve até ${fmtData(FIM_DEFICIT)} · depois manutenção`, manutencao: 'manutenção — pico de corrida', carga: '★ semana da prova — carga de carbo', prova: '🏁 dia de prova' }[fase];

  // hero: rumo à Pampulha (mesma linguagem visual do hero da home)
  root.append(el(`<div class="card hero-refeicao hero-evo">
    <div class="hero-rotulo">RUMO À PAMPULHA · 06/12</div>
    <h1>${D.semanasAteProva(key)} <span class="hora">semanas restantes</span></h1>
    <p class="ajuste-dia">${esc(faseTxt)}</p>
    <div class="grafico-wrap" style="margin-top:8px">${rotaSVG(st, key)}</div>
    <div class="legenda">
      <span class="item"><span class="faixa" style="background:var(--serie-1)"></span>semana fechada</span>
      <span class="item"><span class="ponto" style="background:var(--serie-1)"></span>você está aqui</span>
    </div>
  </div>`));

  // jardim do tempo limpo (toque → contadores ao vivo)
  const jardim = dadosJardim(st, key);
  const cardJardim = el(`<button class="card card-jardim">
    <h2>Jardim do tempo limpo <small>· toque para ver ao vivo →</small></h2>
    ${jardimSVG(jardim.plantas, jardim.estrelas)}
  </button>`);
  cardJardim.append(legendaJardim(st, key));
  cardJardim.onclick = contadoresOverlay;
  root.append(cardJardim);

  // identidade
  const ident = D.identidadeAssinada(st.events, key);
  const cDeliv = D.contadorResiliente(st.events, 'delivery', key, st.settings.startKey, viagensCfg());
  const cDoce = D.contadorResiliente(st.events, 'sweet', key, st.settings.startKey, viagensCfg());
  root.append(el('<div class="secao">IDENTIDADE</div>'));
  root.append(el(`<div class="card ${ident.assinada ? 'card-assinado' : ''}">
    <p class="frase-identidade ${ident.assinada ? 'assinada' : ''}">“${FRASE_IDENTIDADE}”</p>
    <p class="frase-status">${ident.assinada ? '✍️ Assinada — 4 domingos de revisão seguidos.' : `Assinatura: ${ident.progresso}/4 domingos de revisão seguidos.`}</p>
    <div class="agregados">
      <div class="contador"><div class="rotulo">🌊 Ondas surfadas</div><div class="valor num">${D.ondasSurfadas(st.events)}</div><div class="sub">cravings que passaram sem vencer você</div></div>
      <div class="contador"><div class="rotulo">🁢 Dominós quebrados</div><div class="valor num">${D.dominosQuebrados(st.events, key)}</div><div class="sub">ressacas que NÃO viraram dia perdido</div></div>
      <div class="contador"><div class="rotulo">↩︎ Recuperações</div><div class="valor num">${cDeliv.recuperacoes + cDoce.recuperacoes}</div><div class="sub">deslizes que não viraram dois</div></div>
      <div class="contador"><div class="rotulo">📋 Revisões feitas</div><div class="valor num">${D.semanasComRevisao(st.events).size}</div><div class="sub">domingos de 5 minutos</div></div>
    </div>
  </div>`));

  root.append(el('<div class="secao">CORPO</div>'));

  // peso
  const pesos = D.serie(st.events, 'weight');
  const cardPeso = el('<div class="card"><h2>Peso — a linha que importa é a média de 7 dias</h2><div class="tiles" id="tiles" style="margin-bottom:12px"></div><div class="grafico-wrap" id="g"></div><div id="rit"></div><div class="legenda" id="leg"></div></div>');
  if (pesos.length >= 2) {
    const mm = D.mediaMovel7(pesos);
    const mmFim = mm[mm.length - 1];
    const emData = (dk) => { let r = null; for (const p of mm) if (p.date <= dk) r = p; return r; };
    const delta = (ref) => (ref ? mmFim.valor - ref.valor : null);
    const d30 = delta(emData(D.addDays(key, -30)));
    const dTotal = delta(mm[0]);
    const fmtDelta = (v) => (v === null ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}`);
    cardPeso.querySelector('#tiles').innerHTML = `
      <div class="tile"><div class="l">Agora (média 7d)</div><div class="v num">${mmFim.valor.toFixed(1).replace('.', ',')}<small> kg</small></div></div>
      <div class="tile"><div class="l">Últimos 30 dias</div><div class="v num">${fmtDelta(d30)}<small> kg</small></div></div>
      <div class="tile"><div class="l">Desde o início</div><div class="v num">${fmtDelta(dTotal)}<small> kg</small></div></div>`;
    cardPeso.querySelector('#g').innerHTML = graficoLinha(pesos, mm, key, true);
    cardPeso.querySelector('#leg').innerHTML = `
      <span class="item"><span class="traco" style="background:var(--serie-1)"></span>média 7 dias</span>
      <span class="item"><span class="ponto" style="background:var(--muted);opacity:.5"></span>pesagens</span>
      <span class="item"><span class="faixa" style="background:var(--serie-1-wash)"></span>corredor −0,3 a −0,5 kg/sem</span>`;
    const ritmo = D.ritmoSemanal(mm);
    if (ritmo !== null && fase === 'deficit') {
      const r = cardPeso.querySelector('#rit');
      if (ritmo < -0.55) { r.className = 'ritmo alerta'; r.textContent = `Ritmo: ${ritmo.toFixed(2).replace('.', ',')} kg/sem — caindo rápido demais. O plano manda subir ~150 kcal.`; }
      else if (ritmo <= -0.25) { r.className = 'ritmo ok'; r.textContent = `Ritmo: ${ritmo.toFixed(2).replace('.', ',')} kg/sem — dentro do corredor. É exatamente isso.`; }
      else { r.className = 'ritmo'; r.textContent = `Ritmo: ${ritmo.toFixed(2).replace('.', ',')} kg/sem — acima do corredor. Tendência manda mais que o dia; segura o plano.`; }
    }
    // pós-viagem: mesmo racional da nota de glicogênio da semana da prova — subida ≠ gordura
    const posViagem = viagensCfg().some((v) => key >= v.ini && key <= D.addDays(v.fim, 7));
    if (posViagem) {
      cardPeso.querySelector('#rit').insertAdjacentHTML('afterend',
        '<p style="font-size:.75rem;color:var(--muted);margin-top:6px">✈️ Viagem recente: os primeiros dias de subida são água/glicogênio/sódio — espera a média de 7d assentar antes de ler tendência.</p>');
    }
  } else {
    cardPeso.querySelector('#g').innerHTML = '<p style="font-size:.85rem;color:var(--muted)">Registre o peso 2+ vezes para ver a tendência. O valor do dia é ruído; a média de 7 dias é o sinal.</p>';
  }
  root.append(cardPeso);

  // cintura (gráfico separado — nunca dois eixos)
  const cinturas = D.serie(st.events, 'waist');
  if (cinturas.length >= 2) {
    const card = el('<div class="card"><h2>Cintura</h2><div class="grafico-wrap" id="g"></div></div>');
    card.querySelector('#g').innerHTML = graficoLinha(cinturas, D.mediaMovel7(cinturas), key, false);
    root.append(card);
  }

  // corrida: tendências do histórico do Garmin (pipeline v7) — só com dados disponíveis
  carregarAnalises();
  const tend = dadosHistorico?.tendencias;
  if (tend?.paceZ2Serie?.length >= 3) {
    root.append(el('<div class="secao">CORRIDA</div>'));
    const v = tend.vo2max || {};
    const dVo2 = v.atual != null && v.ha8Sem != null ? Math.round((v.atual - v.ha8Sem) * 10) / 10 : null;
    const card = el(`<div class="card"><h2>Pace em Z2 — o motor aeróbico <small>· corridas com FC ≤152 · ↓ = mais rápido</small></h2>
      <div class="tiles" style="margin-bottom:12px">
        <div class="tile"><div class="l">Pace Z2 agora</div><div class="v num">${tend.paceZ2Atual || '–'}<small> /km</small></div></div>
        <div class="tile"><div class="l">Há 8 semanas</div><div class="v num">${tend.paceZ2Ha8Sem || '–'}<small> /km</small></div></div>
        <div class="tile"><div class="l">VO2max</div><div class="v num">${v.atual ?? '–'}${dVo2 ? `<small> ${dVo2 > 0 ? '+' : ''}${String(dVo2).replace('.', ',')}</small>` : ''}</div></div>
      </div>
      <div class="grafico-wrap">${graficoPaceZ2(tend.paceZ2Serie, key)}</div>
      <p style="font-size:.75rem;color:var(--muted);margin-top:8px">Cadência (4 sem): <b class="num" style="color:var(--ink)">${tend.cadencia4Sem || '–'} spm</b> · volume: <b class="num" style="color:var(--ink)">${String(tend.kmPorSemana4Sem ?? '–').replace('.', ',')} km/sem</b></p>
    </div>`);
    root.append(card);

    // eficiência aeróbica: quantos metros cada batimento rende — vale para TODA corrida limpa
    if (tend.efSerie?.length >= 3) {
      const fmtEf = (x) => (x == null ? '–' : x.toFixed(2).replace('.', ','));
      root.append(el(`<div class="card"><h2>Eficiência aeróbica <small>· metros por batimento · corridas até Z3 · ↑ = motor melhor</small></h2>
        <div class="tiles" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
          <div class="tile"><div class="l">Agora</div><div class="v num">${fmtEf(tend.efAtual)}<small> m/bat</small></div></div>
          <div class="tile"><div class="l">Há 8 semanas</div><div class="v num">${fmtEf(tend.efHa8Sem)}<small> m/bat</small></div></div>
        </div>
        <div class="grafico-wrap">${graficoEF(tend.efSerie, key)}</div>
        <p style="font-size:.75rem;color:var(--muted);margin-top:8px">Distância ÷ batimentos da corrida: sobe quando você corre mais rápido na mesma FC. Vale todo esforço aeróbico (FC ≤165) — tiros e provas ficam fora de propósito.</p>
      </div>`));
    }

    // rampa de volume: 12 semanas
    if (tend.kmSemanas?.length) {
      root.append(el(`<div class="card"><h2>Volume semanal <small>· últimas 12 semanas · social conta</small></h2>
        <div class="grafico-wrap">${graficoVolume(tend.kmSemanas)}</div>
        <p style="font-size:.75rem;color:var(--muted);margin-top:8px">Base pros 18 km se constrói com semanas parecidas, não com picos. Média (4 sem): <b class="num" style="color:var(--ink)">${String(tend.kmPorSemana4Sem ?? '–').replace('.', ',')} km</b>.</p>
      </div>`));
    }

    // progressão do longão: a maior corrida de cada mês, com a régua da prova
    if (tend.longaoMes?.length >= 2) {
      const escala = Math.max(18, ...tend.longaoMes.map((m) => m.km)) * 1.08;
      const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      root.append(el(`<div class="card"><h2>Longão do mês <small>· a maior corrida de cada mês</small></h2>
        <div class="longoes" style="--prova:${(18 / escala).toFixed(3)}">
          ${tend.longaoMes.map((m) => `<div class="longao-linha">
            <span class="longao-mes">${MES[+m.mes.slice(5) - 1]}</span>
            <span class="longao-trilho"><i style="width:${(m.km / escala * 100).toFixed(1)}%"></i></span>
            <b class="num">${String(m.km).replace('.', ',')}</b>
          </div>`).join('')}
          <div class="longao-prova num">18 km · prova</div>
        </div>
      </div>`));
    }

    // história dos checkpoints: alvo × executado — acende quando o primeiro teste rodar
    const cpLinhas = CHECKPOINTS.map((cp) => ({
      cp,
      run: (dadosHistorico?.corridas || [])
        .filter((c) => c.date === cp.date && (c.distanciaKm || 0) >= 4)
        .sort((a, x) => (x.distanciaKm || 0) - (a.distanciaKm || 0))[0],
    }));
    if (cpLinhas.some((x) => x.run)) {
      root.append(el(`<div class="card"><h2>Checkpoints <small>· alvo × executado</small></h2>
        <div style="display:grid;gap:7px">
          ${cpLinhas.map(({ cp, run }) => `<div class="rev-metrica">
            <span>🎯 ${fmtData(cp.date)} · ${esc(cp.titulo.split(' — ')[0])}</span>
            ${run
              ? `<span class="num"><b>${run.paceMedio}/km</b>${run.fcMedia ? ` · FC ${run.fcMedia}` : ''} <small style="color:var(--muted)">alvo ${esc(cp.alvo)}</small></span>`
              : `<span style="color:var(--muted);font-size:.78rem">alvo ${esc(cp.alvo)}</span>`}
          </div>`).join('')}
          <div class="rev-metrica"><span>🏁 ${fmtData(PROVA)} · VOLTA DA PAMPULHA 18k</span><span style="color:var(--muted);font-size:.78rem">alvo 6:15–6:30</span></div>
        </div>
      </div>`));
    }

    // projeção da prova: Riegel do melhor esforço recente — recalibra sozinha a cada teste
    if (tend.projecao18k) {
      const pj = tend.projecao18k;
      const proxCp = CHECKPOINTS.find((c) => c.date > key);
      root.append(el(`<div class="card"><h2>Projeção Pampulha 18k <small>· se a prova fosse hoje</small></h2>
        <div class="tiles" style="grid-template-columns:1fr 1fr;margin-bottom:10px">
          <div class="tile"><div class="l">Faixa de chegada</div><div class="v num">${pj.otimista.tempo}–${pj.conservador.tempo}</div></div>
          <div class="tile"><div class="l">Pace</div><div class="v num">${pj.otimista.pace}–${pj.conservador.pace}<small> /km</small></div></div>
        </div>
        <p style="font-size:.75rem;color:var(--muted);line-height:1.5">Fórmula de Riegel sobre seu melhor esforço recente (${String(pj.base.km).replace('.', ',')} km a ${pj.base.pace}/km em ${fmtData(pj.base.date)}). Meta A: 1h52–1h55 (6:15–6:25). A faixa recalibra sozinha a cada teste${proxCp ? ` — o próximo (🎯 ${fmtData(proxCp.date)}) deixa ela mais precisa` : ''}.</p>
      </div>`));
    }
  }

  // métricas semanais do §4 moraram aqui até a v5 — hoje vivem na aba Dieta ("Semana")

  // força: musculação semana a semana — ✨ = sessão no Garmin sem check (evidência, não conta no total)
  const forcasGarmin = forcasPorData();
  if (st.events.some((e) => e.type === 'workout' && e.kind === 'gym') || forcasGarmin.size) {
    root.append(el('<div class="secao">FORÇA</div>'));
    const nSem = Math.min(16, Math.floor(D.diffDays(limiteSemanaTreino(key), D.inicioSemana(key)) / 7) + 1);
    const gf = D.gradeForca(st.events, key, nSem, forcasGarmin, viagensCfg());
    const cardFor = el(`<div class="card"><h2>Musculação por semana <small>· Ter–Sáb · toque numa semana para abrir na aba Treino</small></h2>
      <div class="for-cab"><span></span>${['T', 'Q', 'Q', 'S', 'S'].map((l) => `<span>${l}</span>`).join('')}<span></span></div>
      <div class="for-linhas"></div></div>`);
    const linhas = cardFor.querySelector('.for-linhas');
    for (const s of gf) {
      const row = el(`<button class="for-sem" aria-label="abrir a semana de ${fmtData(s.ini)} na aba Treino">
        <span class="const-label num">${fmtData(s.ini)}</span>
        ${s.dias.map((d) => `<span class="cel ${d.estado}">${d.estado === 'evidencia' ? '✨' : d.estado === 'viagem' ? '✈️' : ''}</span>`).join('')}
        <span class="const-total num ${s.completa ? 'verde' : ''}">${s.plan === 0 ? '✈️' : `${s.feitos}/${s.plan}${s.completa ? ' ✓' : ''}`}</span>
      </button>`);
      row.onclick = () => { // mesma mecânica dos botões da nav — render() re-arma o protegerVoltar
        semTreinoIni = s.ini === D.inicioSemana(key) ? null : s.ini;
        diaTreinoSel = null;
        abaAtiva = 'treino';
        render();
      };
      linhas.append(row);
    }
    root.append(cardFor);
  }

  // constância: uma linha legível por semana, meta = 80% (28/35), não perfeição
  root.append(el('<div class="secao">CONSTÂNCIA</div>'));
  const hm = D.heatmapConstancia(st.events, key, 8, viagensCfg());
  const cardHm = el(`<div class="card"><h2>Constância <small>· refeições no plano · meta da semana: 28/35 (80%)</small></h2>
    <div class="const-cab"><span></span>${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l) => `<span>${l}</span>`).join('')}<span></span></div>
    ${hm.map((sem) => {
      const nums = sem.dias.filter((n) => typeof n === 'number');
      const total = nums.reduce((s, n) => s + n, 0);
      const fechada = sem.dias.every((n) => n !== null);
      const meta = D.metaSemanaRefeicoes(nums.length); // dias de viagem sem registro saem da meta
      const verde = fechada && nums.length > 0 && total >= meta;
      return `<div class="const-sem">
        <span class="const-label num">${fmtData(sem.ini)}</span>
        ${sem.dias.map((n) => n === null ? '<span class="cel vazio"></span>' : n === 'viagem' ? '<span class="cel viagem" title="viagem">✈️</span>' : `<span class="cel n${n}" title="${n}/5"></span>`).join('')}
        <span class="const-total num ${verde ? 'verde' : ''}">${total}${verde ? ' ✓' : ''}</span>
      </div>`;
    }).join('')}
  </div>`);
  root.append(cardHm);

  // última revisão (o que foi decidido no domingo)
  root.append(el('<div class="secao">PADRÕES</div>'));
  const revs = st.events.filter((e) => e.type === 'review').sort((a, x) => (a.week < x.week ? -1 : 1));
  const ultRev = revs[revs.length - 1];
  if (ultRev && ultRev.ajuste) {
    root.append(el(`<div class="card" style="font-size:.82rem;color:var(--ink-2)">
      <h2>Ajuste da última revisão</h2>${esc(ultRev.ajuste)}${ultRev.nota ? `<br><span style="color:var(--muted)">“${esc(ultRev.nota)}”</span>` : ''}
    </div>`));
  }

  // gatilhos: com ≥2 semanas de dados vira mapa gatilho × período; antes, barras simples
  const gp = D.gatilhosPorPeriodo(st.events, key, 28);
  const gat = D.gatilhosFrequentes(st.events, 28, key);
  if (gat.length) {
    const doisSemanas = (() => {
      const dias = st.events.filter((e) => e.trigger).map((e) => e.date || '').filter(Boolean).sort();
      return dias.length >= 2 && D.diffDays(dias[0], dias[dias.length - 1]) >= 14;
    })();
    let corpoGat;
    if (doisSemanas && gp.total >= 6) {
      const maxCel = Math.max(...Object.values(gp.mapa).flat());
      corpoGat = `<div class="gat-mapa">
        <div class="gat-linha gat-cab"><span></span>${D.PERIODOS.map((p) => `<span>${p}</span>`).join('')}</div>
        ${Object.entries(gp.mapa).sort((a, x) => x[1].reduce((s, n) => s + n, 0) - a[1].reduce((s, n) => s + n, 0)).map(([g, linha]) => `
          <div class="gat-linha"><span class="gat-nome">${esc(g)}</span>
          ${linha.map((n) => `<span class="cel ${n ? 'n' + Math.min(5, Math.ceil((n / maxCel) * 5)) : 'n0'}" title="${n}">${n || ''}</span>`).join('')}</div>`).join('')}
      </div>`;
    } else {
      const max = gat[0][1];
      corpoGat = `<div style="display:grid;gap:6px">${gat.map(([g, n]) => `
        <div style="display:grid;grid-template-columns:80px 1fr 24px;gap:8px;align-items:center;font-size:.8rem">
          <span style="color:var(--ink-2)">${esc(g)}</span>
          <svg height="14" width="100%" preserveAspectRatio="none" viewBox="0 0 100 14"><rect x="0" y="1" width="${(n / max) * 100}" height="12" rx="4" fill="var(--serie-1)"/></svg>
          <span class="num" style="color:var(--muted)">${n}</span>
        </div>`).join('')}</div>`;
    }
    root.append(el(`<div class="card"><h2>Gatilhos — últimos 28 dias <small>· ataque o estressor, não o chocolate</small></h2>
      ${corpoGat}
      ${gat.find(([g]) => g === '15h') ? '<p style="font-size:.75rem;color:var(--warning);margin-top:8px">Pico às 15h detectado → confira o lanche das 16h. Pular a refeição da tarde é o maior preditor do ataque de doce.</p>' : ''}
    </div>`));
  }
}

// timeline horizontal: início do uso → prova, com marcos fixos e semanas pintadas
function rotaSVG(st, key) {
  const ini = D.inicioSemana(st.settings.startKey || key);
  const fim = PROVA;
  const total = Math.max(1, D.diffDays(ini, fim));
  const w = 420, h = 84, padX = 14, y = 44;
  const x = (dk) => padX + (Math.min(Math.max(D.diffDays(ini, dk), 0), total) / total) * (w - 2 * padX);

  // segmentos semanais: pintado quando a semana tem revisão OU ≥28 refeições no plano
  const revisadas = D.semanasComRevisao(st.events);
  let segs = '';
  for (let s = ini; s < fim; s = D.addDays(s, 7)) {
    const fimSeg = D.addDays(s, 7) > fim ? fim : D.addDays(s, 7);
    let refeicoes = 0;
    for (let d = 0; d < 7; d++) refeicoes += D.mealsDone(D.mealsOfDay(st.events, D.addDays(s, d)));
    const cumprida = revisadas.has(s) || refeicoes >= 28;
    const passada = fimSeg <= key;
    segs += `<line x1="${x(s) + 1.5}" x2="${x(fimSeg) - 1.5}" y1="${y}" y2="${y}"
      stroke="${cumprida ? 'var(--serie-1)' : passada ? 'var(--baseline)' : 'var(--grid)'}" stroke-width="${cumprida ? 5 : 3}" stroke-linecap="round"/>`;
  }

  const marcos = [
    [ini, 'início', 'baixo'],
    [FIM_DEFICIT, 'fim do déficit', 'cima'],
    ['2026-12-04', 'carga', 'baixo'],
    [fim, '🏁 prova 06/12', 'cima'],
  ];
  let marcosSVG = '';
  for (const [dk, nome, pos] of marcos) {
    if (dk < ini) continue;
    marcosSVG += `<line x1="${x(dk)}" x2="${x(dk)}" y1="${y - 7}" y2="${y + 7}" stroke="var(--baseline)" stroke-width="1.5"/>
      <text x="${x(dk)}" y="${pos === 'cima' ? y - 13 : y + 21}" text-anchor="${dk === fim ? 'end' : dk === ini ? 'start' : 'middle'}" font-size="9" fill="var(--muted)">${nome}</text>`;
  }

  const voce = `<circle cx="${x(key)}" cy="${y}" r="6" fill="var(--serie-1)" stroke="var(--surface)" stroke-width="2.5"/>
    <text x="${Math.min(Math.max(x(key), 30), w - 30)}" y="${y + 34}" text-anchor="middle" font-size="9.5" font-weight="650" fill="var(--ink)">${fmtData(key)}</text>`;

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="min-width:320px">${segs}${marcosSVG}${voce}</svg>`;
}

function tileMetrica(rotulo, valor, baseline, tipo) {
  const temValor = valor !== null && valor !== undefined;
  const alvo = tipo === 'drinks' ? METAS_30D.drinks : baseline != null ? Math.round(baseline * METAS_30D[tipo] * 10) / 10 : null;
  const ok = D.metaAtingida(tipo, temValor ? valor : null, baseline);
  const vTxt = !temValor ? '–' : tipo === 'drinks' ? valor.toFixed(1).replace('.', ',') : valor;
  return `<div class="tile">
    <div class="l">${esc(rotulo)}</div>
    <div class="v num">${vTxt}<small>${tipo === 'drinks' ? ' média' : '/sem'}</small></div>
    <div class="meta ${ok ? 'ok' : ''}">${alvo !== null ? `meta ≤ ${String(alvo).replace('.', ',')} ${ok === true ? '✓' : ''}` : 'sem baseline'}</div>
  </div>`;
}

// gráfico de linha: pontos crus esmaecidos + média móvel protagonista + corredor
function graficoLinha(pontos, mm, hojeKey, comCorredor) {
  const w = 420, h = 190, padL = 34, padR = 12, padT = 12, padB = 22;
  const d0 = pontos[0].date, d1 = hojeKey > pontos[pontos.length - 1].date ? hojeKey : pontos[pontos.length - 1].date;
  const spanDias = Math.max(1, D.diffDays(d0, d1));
  const corredor = comCorredor ? D.corredorMeta(mm, hojeKey) : null;

  let vs = pontos.map((p) => p.valor);
  if (corredor) { const c = corredor(d1); vs = vs.concat([c.alto, c.baixo]); }
  let min = Math.min(...vs), max = Math.max(...vs);
  const folga = Math.max(0.5, (max - min) * 0.12);
  min -= folga; max += folga;

  const x = (dk) => padL + (D.diffDays(d0, dk) / spanDias) * (w - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);

  // gridlines horizontais em números redondos
  const passo = (max - min) > 8 ? 2 : (max - min) > 3 ? 1 : 0.5;
  let grid = '';
  for (let v = Math.ceil(min / passo) * passo; v <= max; v += passo) {
    grid += `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)" stroke-width="1"/>
      <text x="${padL - 5}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="var(--muted)" class="num">${v % 1 ? v.toFixed(1).replace('.', ',') : v}</text>`;
  }

  // corredor (wash)
  let faixa = '';
  if (corredor) {
    const passos = 24;
    const topo = [], base = [];
    for (let i = 0; i <= passos; i++) {
      const dk = D.addDays(d0, Math.round((spanDias * i) / passos));
      const c = corredor(dk);
      topo.push(`${x(dk).toFixed(1)},${y(c.alto).toFixed(1)}`);
      base.unshift(`${x(dk).toFixed(1)},${y(c.baixo).toFixed(1)}`);
    }
    faixa = `<polygon points="${topo.join(' ')} ${base.join(' ')}" fill="var(--serie-1-wash)"/>`;
  }

  // marco de fase (fim do déficit) se estiver no intervalo
  let marcos = '';
  if (d0 <= FIM_DEFICIT && FIM_DEFICIT <= d1) {
    marcos = `<line x1="${x(FIM_DEFICIT)}" x2="${x(FIM_DEFICIT)}" y1="${padT}" y2="${h - padB}" stroke="var(--baseline)" stroke-width="1"/>
      <text x="${x(FIM_DEFICIT) + 3}" y="${padT + 8}" font-size="8.5" fill="var(--muted)">fim do déficit 04/10</text>`;
  }

  const dots = pontos.map((p) => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.valor).toFixed(1)}" r="2.5" fill="var(--muted)" opacity="0.45"/>`).join('');
  const path = mm.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const fim = mm[mm.length - 1];
  const rotuloFim = `<circle cx="${x(fim.date)}" cy="${y(fim.valor)}" r="4.5" fill="var(--serie-1)" stroke="var(--surface)" stroke-width="2"/>
    <text x="${Math.min(x(fim.date) + 7, w - padR - 2)}" y="${y(fim.valor) - 7}" font-size="10.5" font-weight="650" fill="var(--ink)" text-anchor="${x(fim.date) > w - 60 ? 'end' : 'start'}" class="num">${fim.valor.toFixed(1).replace('.', ',')}</text>`;

  // eixo x: primeira e última data
  const eixoX = `<text x="${padL}" y="${h - 6}" font-size="9" fill="var(--muted)">${fmtData(d0)}</text>
    <text x="${w - padR}" y="${h - 6}" font-size="9" fill="var(--muted)" text-anchor="end">${fmtData(d1)}</text>`;

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="min-width:300px">
    ${grid}${faixa}${marcos}${dots}
    <path d="${path}" fill="none" stroke="var(--serie-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${rotuloFim}${eixoX}
  </svg>`;
}

function fmtData(key) {
  const d = D.parseKey(key);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// gráfico do pace em Z2 (serie = [{date, seg}]): pontos crus esmaecidos + média móvel 7d;
// eixo Y em m:ss/km (menor = mais rápido — linha descendo é evolução)
// linhas verticais dos checkpoints do plano (quando caem no domínio do gráfico)
function marcasCheckpoint(x, d0, d1, padT, yFim) {
  return CHECKPOINTS.filter((c) => c.date > d0 && c.date <= d1)
    .map((c) => `<line x1="${x(c.date).toFixed(1)}" x2="${x(c.date).toFixed(1)}" y1="${padT}" y2="${yFim}" stroke="var(--baseline)" stroke-width="1" stroke-dasharray="3 4"/>
      <text x="${x(c.date).toFixed(1)}" y="${padT - 3}" text-anchor="middle" font-size="8" fill="var(--muted)">🎯 ${fmtData(c.date)}</text>`).join('');
}

function graficoPaceZ2(serie, hojeKey) {
  const pontos = serie.map((p) => ({ date: p.date, valor: p.seg }));
  const mm = D.mediaMovel7(pontos);
  const w = 420, h = 170, padL = 40, padR = 12, padT = 12, padB = 22;
  const d0 = pontos[0].date, d1 = hojeKey > pontos[pontos.length - 1].date ? hojeKey : pontos[pontos.length - 1].date;
  const spanDias = Math.max(1, D.diffDays(d0, d1));
  const vs = pontos.map((p) => p.valor);
  let min = Math.min(...vs), max = Math.max(...vs);
  const folga = Math.max(8, (max - min) * 0.12);
  min -= folga; max += folga;
  const x = (dk) => padL + (D.diffDays(d0, dk) / spanDias) * (w - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  const fmtSeg = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
  const passo = (max - min) > 90 ? 30 : 15; // gridlines a cada 15/30s de pace
  let grid = '';
  for (let v = Math.ceil(min / passo) * passo; v <= max; v += passo) {
    grid += `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)" stroke-width="1"/>
      <text x="${padL - 5}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="var(--muted)" class="num">${fmtSeg(v)}</text>`;
  }
  const dots = pontos.map((p) => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.valor).toFixed(1)}" r="2.5" fill="var(--muted)" opacity="0.45"/>`).join('');
  const path = mm.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const fim = mm[mm.length - 1];
  const rotuloFim = `<circle cx="${x(fim.date)}" cy="${y(fim.valor)}" r="4.5" fill="var(--serie-2)" stroke="var(--surface)" stroke-width="2"/>
    <text x="${Math.min(x(fim.date) + 7, w - padR - 2)}" y="${y(fim.valor) - 7}" font-size="10.5" font-weight="650" fill="var(--ink)" text-anchor="${x(fim.date) > w - 60 ? 'end' : 'start'}" class="num">${fmtSeg(fim.valor)}</text>`;
  const eixoX = `<text x="${padL}" y="${h - 6}" font-size="9" fill="var(--muted)">${fmtData(d0)}</text>
    <text x="${w - padR}" y="${h - 6}" font-size="9" fill="var(--muted)" text-anchor="end">${fmtData(d1)}</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="min-width:300px">
    ${grid}${marcasCheckpoint(x, d0, d1, padT, h - padB)}${dots}
    <path d="${path}" fill="none" stroke="var(--serie-2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${rotuloFim}${eixoX}
  </svg>`;
}

function graficoEF(serie, hojeKey) {
  const pontos = serie.map((p) => ({ date: p.date, valor: p.ef }));
  const mm = D.mediaMovel7(pontos);
  const w = 420, h = 170, padL = 40, padR = 12, padT = 12, padB = 22;
  const d0 = pontos[0].date, d1 = hojeKey > pontos[pontos.length - 1].date ? hojeKey : pontos[pontos.length - 1].date;
  const spanDias = Math.max(1, D.diffDays(d0, d1));
  const vs = pontos.map((p) => p.valor);
  let min = Math.min(...vs), max = Math.max(...vs);
  const folga = Math.max(0.02, (max - min) * 0.12);
  min -= folga; max += folga;
  const x = (dk) => padL + (D.diffDays(d0, dk) / spanDias) * (w - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  const passo = (max - min) > 0.3 ? 0.1 : 0.05;
  let grid = '';
  for (let v = Math.ceil(min / passo) * passo; v <= max; v += passo) {
    grid += `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)" stroke-width="1"/>
      <text x="${padL - 5}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="var(--muted)" class="num">${v.toFixed(2).replace('.', ',')}</text>`;
  }
  const dots = pontos.map((p) => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.valor).toFixed(1)}" r="2.5" fill="var(--muted)" opacity="0.45"/>`).join('');
  const path = mm.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const fim = mm[mm.length - 1];
  const rotuloFim = `<circle cx="${x(fim.date)}" cy="${y(fim.valor)}" r="4.5" fill="var(--serie-1)" stroke="var(--surface)" stroke-width="2"/>
    <text x="${Math.min(x(fim.date) + 7, w - padR - 2)}" y="${y(fim.valor) - 7}" font-size="10.5" font-weight="650" fill="var(--ink)" text-anchor="${x(fim.date) > w - 60 ? 'end' : 'start'}" class="num">${fim.valor.toFixed(2).replace('.', ',')}</text>`;
  const eixoX = `<text x="${padL}" y="${h - 6}" font-size="9" fill="var(--muted)">${fmtData(d0)}</text>
    <text x="${w - padR}" y="${h - 6}" font-size="9" fill="var(--muted)" text-anchor="end">${fmtData(d1)}</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="min-width:300px">
    ${grid}${marcasCheckpoint(x, d0, d1, padT, h - padB)}${dots}
    <path d="${path}" fill="none" stroke="var(--serie-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${rotuloFim}${eixoX}
  </svg>`;
}

function graficoVolume(kmSemanas) {
  const w = 420, h = 150, padL = 30, padR = 8, padT = 14, padB = 22;
  const max = Math.max(10, ...kmSemanas.map((s) => s.km)) * 1.12;
  const n = kmSemanas.length;
  const passoX = (w - padL - padR) / n;
  const larg = Math.min(24, passoX - 6);
  const y = (v) => padT + (1 - v / max) * (h - padT - padB);
  let grid = '';
  const passo = max > 30 ? 10 : 5;
  for (let v = passo; v <= max; v += passo) {
    grid += `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)" stroke-width="1"/>
      <text x="${padL - 5}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="var(--muted)" class="num">${v}</text>`;
  }
  const iMax = kmSemanas.reduce((m, s, i) => (s.km > kmSemanas[m].km ? i : m), 0);
  const barras = kmSemanas.map((s, i) => {
    const bx = padL + i * passoX + (passoX - larg) / 2;
    const atual = i === n - 1; // semana corrente, ainda aberta
    const rotulo = (i === iMax && s.km > 0) || (atual && s.km > 0)
      ? `<text x="${bx + larg / 2}" y="${y(s.km) - 4}" text-anchor="middle" font-size="9" font-weight="650" fill="var(--ink)" class="num">${String(s.km).replace('.', ',')}</text>` : '';
    return `<rect x="${bx.toFixed(1)}" y="${y(s.km).toFixed(1)}" width="${larg.toFixed(1)}" height="${Math.max(0, h - padB - y(s.km)).toFixed(1)}" rx="3"
      fill="var(--serie-1)" opacity="${atual ? 0.45 : 1}"/>${rotulo}`;
  }).join('');
  const eixoX = `<text x="${padL}" y="${h - 6}" font-size="9" fill="var(--muted)">${fmtData(kmSemanas[0].semana)}</text>
    <text x="${w - padR}" y="${h - 6}" font-size="9" fill="var(--muted)" text-anchor="end">semana atual</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="min-width:300px">${grid}${barras}${eixoX}</svg>`;
}

// resumo do mês vigente em texto compartilhável — só evidência, nada de decoração
function textoResumoMensal(st, key) {
  const ini = key.slice(0, 8) + '01';
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const r = D.resumoPeriodo(st.events, ini, key, viagensCfg());
  const bl = st.settings.baseline || {};
  const v = (x, casas = 1) => x.toFixed(casas).replace('.', ',');
  const linhas = [`📊 Rotina — ${MESES[+key.slice(5, 7) - 1]} (até ${fmtData(key)})`];
  if (r.diasObs) linhas.push(`🍽 Adesão: ${Math.round(r.adesao * 100)}% (${Math.round(r.adesao * r.diasObs * 5)}/${r.diasObs * 5} refeições)`);
  linhas.push(`🛵 iFood: ${r.delivery}${bl.delivery ? ` (baseline era ${bl.delivery}/sem)` : ''} · 🍫 doces: ${r.sweet}`);
  if (r.saidas) linhas.push(`🍻 Saídas: ${r.saidas} · média ${v(r.drinksMedia)} drinks (meta ≤ 3)`);
  if (r.treinoPlan) linhas.push(`💪 Treinos: ${r.treinoFeito}/${r.treinoPlan}`);
  const corr = (dadosHistorico?.corridas || []).filter((c) => c.date >= ini && c.date <= key);
  if (corr.length) {
    const km = corr.reduce((s, c) => s + (c.distanciaKm || 0), 0);
    linhas.push(`🏃 Corridas: ${corr.length} · ${v(km)} km · maior: ${v(Math.max(...corr.map((c) => c.distanciaKm || 0)))} km`);
  }
  const t = dadosHistorico?.tendencias;
  if (t?.efAtual && t?.efHa8Sem) linhas.push(`⚡ Eficiência aeróbica: ${v(t.efAtual, 2)} m/bat (há 8 sem: ${v(t.efHa8Sem, 2)})`);
  if (r.pesoDelta !== null) linhas.push(`⚖️ Peso: ${r.pesoDelta > 0 ? '+' : ''}${v(r.pesoDelta)} kg no mês (média 7d)`);
  linhas.push(`🏁 Volta da Pampulha: faltam ${D.semanasAteProva(key)} semanas`);
  return linhas.join('\n');
}

// ================================================================
// TELA RELATÓRIO — o mês em números + cruzamentos que testam o protocolo
// ================================================================
function renderRelatorio(root) {
  const st = S.getState();
  const key = hojeKey();
  const inicio = st.settings.startKey || key;

  // seletor de período
  const chips = el(`<div class="chips" style="padding:2px 4px">${[[30, '30 dias'], [90, '90 dias'], [0, 'Tudo']]
    .map(([v, l]) => `<button data-v="${v}" class="${periodoRelatorio === v ? 'sel' : ''}">${l}</button>`).join('')}</div>`);
  chips.querySelectorAll('button').forEach((b) => {
    b.onclick = () => { periodoRelatorio = Number(b.dataset.v); render(); };
  });
  root.append(chips);

  const dias = periodoRelatorio || Math.max(1, D.diffDays(inicio, key) + 1);
  const ini = periodoRelatorio ? D.addDays(key, -dias + 1) : inicio;
  const agora_ = D.resumoPeriodo(st.events, ini, key, viagensCfg());
  const antes = periodoRelatorio ? D.resumoPeriodo(st.events, D.addDays(ini, -dias), D.addDays(ini, -1), viagensCfg()) : null;

  // placar do período — delta vs período anterior (verde quando na direção certa)
  const delta = (v, vAnt, bomQuandoCai, fmt = (x) => x) => {
    if (v === null || v === undefined) return '<small class="rel-delta">–</small>';
    if (!antes || vAnt === null || vAnt === undefined) return '';
    const d = v - vAnt;
    if (Math.abs(d) < 1e-9) return '<small class="rel-delta">=</small>';
    const bom = bomQuandoCai ? d < 0 : d > 0;
    return `<small class="rel-delta ${bom ? 'bom' : 'ruim'}">${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))}</small>`;
  };
  const pct = (v) => (v === null ? '–' : Math.round(v * 100));
  const num1 = (v) => (v === null || v === undefined ? '–' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ','));
  root.append(el('<div class="secao">PLACAR · ' + (periodoRelatorio ? `ÚLTIMOS ${dias} DIAS VS ${dias} ANTERIORES` : 'DESDE O INÍCIO') + '</div>'));
  root.append(el(`<div class="card"><div class="tiles" style="grid-template-columns:1fr 1fr 1fr">
    <div class="tile"><div class="l">🛵 iFood impulso</div><div class="v num">${agora_.delivery}</div>${delta(agora_.delivery, antes?.delivery, true)}</div>
    <div class="tile"><div class="l">🍫 Doces fora</div><div class="v num">${agora_.sweet}</div>${delta(agora_.sweet, antes?.sweet, true)}</div>
    <div class="tile"><div class="l">🍻 Drinks/saída</div><div class="v num">${num1(agora_.drinksMedia)}</div>${delta(agora_.drinksMedia, antes?.drinksMedia, true, num1)}</div>
    <div class="tile"><div class="l">🍽 Adesão refeições</div><div class="v num">${pct(agora_.adesao)}<small>%</small></div>${delta(agora_.adesao, antes?.adesao, false, (x) => Math.round(x * 100) + 'pp')}</div>
    <div class="tile"><div class="l">👟 Treinos feitos</div><div class="v num">${agora_.treinoPlan ? Math.round((agora_.treinoFeito / agora_.treinoPlan) * 100) : '–'}<small>%</small></div><small class="rel-delta">${agora_.treinoFeito}/${agora_.treinoPlan}</small></div>
    <div class="tile"><div class="l">⚖️ Peso (média 7d)</div><div class="v num">${agora_.pesoDelta === null ? '–' : (agora_.pesoDelta > 0 ? '+' : '') + num1(agora_.pesoDelta)}<small> kg</small></div></div>
  </div></div>`));

  // insights — só aparecem com amostra mínima; é aqui que o protocolo é testado com dados reais
  root.append(el('<div class="secao">INSIGHTS · TESTANDO O PROTOCOLO COM OS SEUS DADOS</div>'));
  const insights = [];

  const ld = D.insightLancheDoce(st.events, key, 90);
  if (ld) {
    const razao = ld.taxaCom > 0 ? ld.taxaSem / ld.taxaCom : null;
    insights.push(`🛡 <b>O escudo das 16h ${ld.taxaSem > ld.taxaCom ? 'funciona' : 'ainda não aparece nos dados'}:</b>
      em dias SEM o lanche da tarde você comeu doce em <b>${Math.round(ld.taxaSem * 100)}%</b> dos dias (${ld.sem.doces}/${ld.sem.dias});
      com o lanche feito, <b>${Math.round(ld.taxaCom * 100)}%</b> (${ld.com.doces}/${ld.com.dias})${razao && razao >= 1.5 ? ` — <b>${num1(razao)}× mais risco</b> sem o lanche, exatamente o que o protocolo (2C) previa` : ''}.`);
  }

  const dm = D.insightDomino(st.events, key);
  if (dm) {
    insights.push(`🁢 <b>O dominó de 36h ${dm.pos < dm.normal - 0.1 ? 'é real nos seus dados' : 'está sob controle'}:</b>
      sua adesão no dia seguinte a uma saída é <b>${Math.round(dm.pos * 100)}%</b> vs <b>${Math.round(dm.normal * 100)}%</b> nos demais dias (${dm.nSaidas} manhãs pós-saída observadas)${dm.pos >= dm.normal - 0.1 ? ' — o protocolo de ressaca está segurando a onda' : ' — vale caprichar no Modo Ressaca'}.`);
  }

  const stx = D.sosTaxa(st.events);
  if (stx) {
    insights.push(`🌊 <b>O timer de 10 minutos venceu ${Math.round((stx.surfed / stx.total) * 100)}% das vezes:</b>
      de ${stx.total} SOS com desfecho, ${stx.surfed} ondas passaram sem você ceder. O §0 do protocolo em números.`);
  }

  const svp = D.insightSemanaVerdePeso(st.events, key);
  if (svp) {
    insights.push(`✅ <b>Semana verde mexe na balança:</b> nas ${svp.verdes.n} semanas com ≥80% de adesão a média móvel variou
      <b>${num1(svp.verdes.delta)} kg/sem</b>; nas outras ${svp.outras.n}, <b>${num1(svp.outras.delta)} kg/sem</b>.`);
  }

  const eco = D.economiaEstimada(st.events, st.settings, key);
  if (eco && eco.evitados > 0) {
    insights.push(`💰 <b>~R$ ${eco.valor} que não viraram delivery:</b> no ritmo do seu baseline (${st.settings.baseline.delivery}/sem)
      seriam ~${eco.esperado} pedidos em ${eco.semanas} semanas — foram ${eco.reais}. Estimativa a R$ ${D.PRECO_DELIVERY}/pedido.`);
  }

  if (insights.length) {
    for (const i of insights) root.append(el(`<div class="card insight">${i}</div>`));
  } else {
    root.append(el(`<div class="card" style="font-size:.82rem;color:var(--muted);line-height:1.5">
      Os insights nascem dos cruzamentos (lanche das 16h × doce, saída × dia seguinte, semana verde × balança…)
      e só aparecem quando há amostra suficiente para não mentir. Continue registrando — em 2-3 semanas isso aqui acorda.</div>`));
  }

  // deslizes por dia da semana
  const ds = D.deslizesPorDiaSemana(st.events, key, 90);
  if (ds) {
    const max = Math.max(...ds.map((d) => d.delivery + d.sweet), 1);
    const letras = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const pior = ds.reduce((im, d, i) => (d.delivery + d.sweet > ds[im].delivery + ds[im].sweet ? i : im), 0);
    const W = 420, H = 130, padB = 22, bw = 34, gap = (W - 7 * bw) / 8;
    let barras = '';
    ds.forEach((d, i) => {
      const x = gap + i * (bw + gap);
      const hDel = ((H - padB - 14) * d.delivery) / max;
      const hSwe = ((H - padB - 14) * d.sweet) / max;
      const yDel = H - padB - hDel;
      const ySwe = yDel - 2 - hSwe;
      if (d.delivery) barras += `<rect x="${x}" y="${yDel}" width="${bw}" height="${hDel}" rx="4" fill="var(--serie-1)"/>`;
      if (d.sweet) barras += `<rect x="${x}" y="${ySwe}" width="${bw}" height="${hSwe}" rx="4" fill="var(--jardim-petala-2)"/>`;
      const tot = d.delivery + d.sweet;
      if (tot) barras += `<text x="${x + bw / 2}" y="${ySwe > yDel ? yDel : ySwe - 4}" text-anchor="middle" font-size="10" fill="var(--ink-2)" class="num">${tot}</text>`;
      barras += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="${i === pior ? 'var(--ink)' : 'var(--muted)'}" font-weight="${i === pior ? 700 : 400}">${letras[i]}</text>`;
    });
    root.append(el(`<div class="card"><h2>Deslizes por dia da semana <small>· últimos 90 dias</small></h2>
      <svg viewBox="0 0 ${W} ${H}" width="100%">
        <line x1="0" x2="${W}" y1="${H - padB}" y2="${H - padB}" stroke="var(--baseline)" stroke-width="1"/>
        ${barras}</svg>
      <div class="legenda"><span class="item"><span class="faixa" style="background:var(--serie-1)"></span>delivery</span>
        <span class="item"><span class="faixa" style="background:var(--jardim-petala-2)"></span>doce</span></div>
      <p style="font-size:.75rem;color:var(--ink-2);margin-top:8px">${letras[pior]} é o seu dia mais vulnerável — vale pré-decidir o jantar desse dia no domingo (1B).</p>
    </div>`));
  }

  // resumo do mês em texto — pro "me cobra!" funcionar também no macro
  const share = el('<button class="acao-primaria" style="margin-top:4px">📤 Compartilhar resumo do mês</button>');
  share.onclick = async () => {
    const texto = textoResumoMensal(st, key);
    if (navigator.share) { try { await navigator.share({ text: texto }); } catch { /* cancelado */ } }
    else { await navigator.clipboard.writeText(texto); snackbar('Resumo copiado 📋'); }
  };
  root.append(share);

  // totais desde o início
  const tudo = D.resumoPeriodo(st.events, inicio, key, viagensCfg());
  const cs = D.corridasStats(st.events, key);
  root.append(el('<div class="secao">DESDE O INÍCIO · ' + fmtData(inicio) + '</div>'));
  root.append(el(`<div class="card"><div class="tiles" style="grid-template-columns:1fr 1fr 1fr">
    <div class="tile"><div class="l">Refeições no plano</div><div class="v num">${Math.round((tudo.adesao || 0) * tudo.diasObs * 5)}</div></div>
    <div class="tile"><div class="l">Corridas feitas</div><div class="v num">${cs.feitas}<small>/${cs.passadas}</small></div></div>
    <div class="tile"><div class="l">Dias registrados</div><div class="v num">${tudo.diasObs}</div></div>
    <div class="tile"><div class="l">🌊 Ondas surfadas</div><div class="v num">${D.ondasSurfadas(st.events)}</div></div>
    <div class="tile"><div class="l">🁢 Dominós quebrados</div><div class="v num">${D.dominosQuebrados(st.events, key)}</div></div>
    <div class="tile"><div class="l">📋 Revisões</div><div class="v num">${D.semanasComRevisao(st.events).size}</div></div>
  </div></div>`));
}

// ================================================================
// TELA AJUSTES
// ================================================================
// ---------- saúde do sistema: nada para sem o usuário ver ----------
const ROTULO_PIPE = {
  garmin_auth: 'conexão com a Garmin expirou — ver guia',
  gemini_quota: 'IA sem quota — o próximo ciclo tenta sozinho',
  erro: 'erro na última execução — ver guia',
};

function checarSaude(st, sp) {
  const horasDesde = (iso) => (iso ? Math.round((Date.now() - new Date(iso).getTime()) / 36e5) : null);
  const itens = [];
  if (!sp?.ultimaExecucao) itens.push({ n: 'warn', txt: 'Pipeline Garmin sem execuções — configurar Secrets no repo' });
  else {
    const h = horasDesde(sp.ultimaExecucao);
    if (sp.status !== 'ok') itens.push({ n: 'warn', txt: `Pipeline: ${ROTULO_PIPE[sp.status] || sp.status}` });
    else if (h > 26) itens.push({ n: 'warn', txt: `Pipeline não roda há ${Math.round(h / 24)} dia(s) — métricas de corrida podem estar velhas` });
    else itens.push({ n: 'ok', txt: `Pipeline Garmin · rodou há ${h < 1 ? 'menos de 1h' : `${h}h`}` });
  }
  const seteD = D.addDays(hojeKey(), -7);
  const semAnalise = (dadosHistorico?.corridas || []).filter((c) => c.date >= seteD && c.date <= hojeKey()
    && (c.distanciaKm || 0) >= 1
    && !(dadosAnalises?.porData?.[c.date] || []).some((a) => a.activityId === c.activityId));
  itens.push(semAnalise.length
    ? { n: 'warn', txt: `${semAnalise.length} corrida(s) da semana sem análise — toque o 🛰️ na aba Treino` }
    : { n: 'ok', txt: 'Análises de corrida em dia' });
  const hc = horasDesde(dadosClima?.atualizadoEm);
  itens.push(hc === null ? { n: 'info', txt: 'Previsão do tempo ainda sem dados' }
    : hc > 26 ? { n: 'warn', txt: `Previsão do tempo parada há ${Math.round(hc / 24)} dia(s)` }
      : { n: 'ok', txt: 'Previsão do tempo atualizada' });
  itens.push(patGarmin()
    ? { n: 'ok', txt: 'Token do GitHub salvo — disparo rápido ativo' }
    : { n: 'info', txt: 'Sem token do GitHub — análises só nos horários automáticos' });
  const diasBk = diasDesdeBackup(st);
  itens.push(diasBk === null ? { n: 'warn', txt: 'Nenhum backup ainda — os dados vivem só neste aparelho' }
    : diasBk > 30 ? { n: 'warn', txt: `Último backup há ${diasBk} dias` }
      : { n: 'ok', txt: `Backup em dia (${diasBk === 0 ? 'hoje' : diasBk === 1 ? 'ontem' : `há ${diasBk}d`})` });
  return itens;
}

// bolinha âmbar no ⚙️ quando o pipeline está parado/quebrado — o aviso que não depende de abrir Ajustes
async function atualizarBadgeSaude() {
  const sp = await fetchDados('pipeline-status.json');
  const h = sp?.ultimaExecucao ? (Date.now() - new Date(sp.ultimaExecucao).getTime()) / 36e5 : Infinity;
  $('#btn-ajustes')?.classList.toggle('alerta', !sp || sp.status !== 'ok' || h > 48);
}

function sheetGuiaProblemas() {
  const item = (ic, t, d) => `<div class="exercicio"><span class="ex-num">${ic}</span><span class="ex-nome">${t}<small>${d}</small></span></div>`;
  abrirSheet(el(`<div><h3>🛟 Guia de problemas</h3>
    <p class="detalhe-fase">O card de saúde em Ajustes diz O QUE parou; aqui está o que fazer em cada caso.</p>
    <div class="exercicios">
      ${item('🛰️', 'Conexão com a Garmin expirou (garmin_auth)', 'Abra uma sessão do Claude no servidor e peça "renova o token do Garmin" — o passo a passo (túnel + login + Secret) está no CLAUDE.md do repo, leva ~5 min. Nenhuma corrida se perde: tudo fica na Garmin e é analisado quando voltar.')}
      ${item('⏳', 'IA sem quota (gemini_quota)', 'Resolve sozinho no próximo horário automático. Se passar de 1 dia, conferir a chave GEMINI_API_KEY nos Secrets do repo (GitHub → Settings → Actions).')}
      ${item('✨', 'Análise não apareceu', 'Com token: 2–4 min depois do 🛰️. Sem token: espera os horários automáticos (manhã, noite e 14h). Corrida com +1 dia sem análise = ver o status na saúde.')}
      ${item('📵', 'App preso em versão antiga', 'Saia do app e volte (ele checa sozinho ao voltar). Persistiu: Buscar atualização aqui em Ajustes e espere na Hoje. Teimou: guia anônima na URL do app pra ver o que o servidor entrega; último recurso: chrome://serviceworker-internals → Unregister do escopo do app — é seguro, NÃO apaga dados. O que NUNCA fazer: "Limpar dados do site" — isso apaga seus registros.')}
      ${item('📊', 'Métricas de corrida desatualizadas', 'Quase sempre é o pipeline parado — a saúde diz há quanto tempo e o motivo. O ⚙️ do header ganha uma bolinha âmbar quando isso acontece, pra você não passar semanas sem ver.')}
      ${item('💾', 'Troquei ou perdi o celular', 'Instale o app de novo pelo Chrome (guirangel17.github.io/habitos-app) e use Ajustes → Importar backup com o último export. É por isso que o lembrete mensal de backup existe.')}
    </div></div>`));
}

function renderAjustes(root) {
  const st = S.getState();
  const key = hojeKey();

  // saúde do sistema — primeiro card: é o que responde "tá tudo de pé?"
  const cardSaude = el(`<div class="card"><h2>Saúde do sistema <small>· pra nada parar sem você ver</small></h2>
    <div id="saude-itens" style="display:grid;gap:7px;font-size:.8rem;line-height:1.4"><span style="color:var(--muted)">verificando…</span></div>
    <button class="acao-secundaria" id="guia" style="margin-top:8px">🛟 Guia de problemas ›</button></div>`);
  cardSaude.querySelector('#guia').onclick = sheetGuiaProblemas;
  root.append(cardSaude);
  Promise.all([fetchDados('pipeline-status.json'), carregarAnalises()]).then(([sp]) => {
    const box = cardSaude.querySelector('#saude-itens');
    if (!box || !box.isConnected) return;
    box.innerHTML = checarSaude(S.getState(), sp).map((i) => `<div style="display:flex;gap:8px;align-items:baseline">
      <span>${i.n === 'ok' ? '✅' : i.n === 'warn' ? '⚠️' : 'ℹ️'}</span>
      <span style="color:${i.n === 'warn' ? 'var(--ink)' : 'var(--ink-2)'}">${i.txt}</span></div>`).join('');
    atualizarBadgeSaude();
  });

  // aparência
  const temaAtual = st.settings.tema || 'auto';
  const cardTema = el(`<div class="card"><h2>Aparência</h2><div class="chips" style="margin-top:4px">
    ${[['auto', 'Automático'], ['light', '☀️ Claro'], ['dark', '🌙 Escuro']].map(([v, l]) => `<button data-v="${v}" class="${temaAtual === v ? 'sel' : ''}">${l}</button>`).join('')}
  </div></div>`);
  cardTema.querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      S.setSetting('tema', b.dataset.v);
      aplicarTema(b.dataset.v);
      cardTema.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
    };
  });
  root.append(cardTema);

  // baseline
  const card = el(`<div class="card"><h2>Baseline <small>· estimativa da semana típica ANTES do protocolo — as metas de −50% partem daqui</small></h2><div id="linhas"></div></div>`);
  const linhas = card.querySelector('#linhas');
  const bl = [
    ['delivery', 'Delivery por impulso / semana'],
    ['sweet', 'Doces fora do plano / semana'],
    ['drinks', 'Drinks por saída (média)'],
  ];
  for (const [k, nome] of bl) {
    const v = st.settings.baseline[k];
    const linha = el(`<div class="ajuste-linha"><span>${nome}</span>
      <span class="mini-stepper"><button>−</button><span class="v num">${v ?? '–'}</span><button>+</button></span></div>`);
    const [menos, mais] = linha.querySelectorAll('button');
    const span = linha.querySelector('.v');
    menos.onclick = () => { const nv = Math.max(0, (st.settings.baseline[k] ?? 1) - 1); S.setSetting(`baseline.${k}`, nv); span.textContent = nv; };
    mais.onclick = () => { const nv = (st.settings.baseline[k] ?? 0) + 1; S.setSetting(`baseline.${k}`, nv); span.textContent = nv; };
    linhas.append(linha);
  }
  root.append(card);

  // tipo do dia (override)
  const tipoAtual = D.tipoDoDia(key, st.settings.dayTypeOverrides);
  const cardTipo = el(`<div class="card"><h2>Hoje é dia…</h2>
    <p style="font-size:.75rem;color:var(--muted);margin-bottom:8px">Trocou o treino? Mude só hoje — amanhã volta ao calendário do plano.</p>
    <div class="chips" id="tipos"></div></div>`);
  const tipos = cardTipo.querySelector('#tipos');
  for (const t of ['INTENSO', 'MODERADO', 'LEVE', 'DESCANSO']) {
    const b = el(`<button class="${t === tipoAtual ? 'sel' : ''}">${t}</button>`);
    b.onclick = () => {
      const ov = { ...st.settings.dayTypeOverrides };
      if (TIPO_POR_DIA_SEMANA[D.parseKey(key).getDay()] === t) delete ov[key]; else ov[key] = t;
      S.setSetting('dayTypeOverrides', ov);
    };
    tipos.append(b);
  }
  root.append(cardTipo);

  // viagens (v7.9): modo manutenção com datas — liga e desliga sozinho
  const cardVg = el(`<div class="card"><h2>✈️ Viagens <small>· modo manutenção — liga e desliga sozinho nas datas</small></h2>
    <p style="font-size:.75rem;color:var(--muted);margin-bottom:8px">Durante a viagem: treinos e refeições saem da cobrança, anéis e jardim ficam protegidos, e a Hoje mostra a dica do dia.</p>
    <div id="vg-lista"></div>
    <button class="acao-secundaria" id="vg-add">＋ Adicionar viagem</button></div>`);
  const vgLista = cardVg.querySelector('#vg-lista');
  const listaVgs = [...viagensCfg()].sort((a, b2) => (a.ini < b2.ini ? -1 : 1));
  if (!listaVgs.length) vgLista.append(el('<p style="font-size:.78rem;color:var(--muted)">Nenhuma viagem cadastrada.</p>'));
  for (const v of listaVgs) {
    const nDias = D.diffDays(v.ini, v.fim) + 1;
    const passada = v.fim < key;
    const row = el(`<div class="ajuste-linha" ${passada ? 'style="opacity:.55"' : ''}><span>${passada ? '' : '✈️ '}${fmtData(v.ini)} – ${fmtData(v.fim)} · ${nDias} dia${nDias > 1 ? 's' : ''}${D.emViagem(key, [v]) ? ' <b style="color:var(--serie-1)">· agora</b>' : ''}</span><button class="acao-secundaria" style="width:auto;margin:0" aria-label="remover viagem">✕</button></div>`);
    row.querySelector('button').onclick = () => {
      S.setSetting('viagens', viagensCfg().filter((x) => !(x.ini === v.ini && x.fim === v.fim)));
      snackbar('Viagem removida.', () => S.setSetting('viagens', [...viagensCfg(), v]));
    };
    vgLista.append(row);
  }
  cardVg.querySelector('#vg-add').onclick = () => sheetViagem(key);
  root.append(cardVg);

  // backup
  const dias = diasDesdeBackup(st);
  const cardBk = el(`<div class="card"><h2>Backup <small>· dados ficam SÓ neste aparelho</small></h2>
    <p style="font-size:.78rem;color:var(--ink-2);margin-bottom:10px">${st.events.length} eventos registrados · ${dias === null ? 'nenhum backup ainda' : dias === 0 ? 'backup hoje ✓' : dias === 1 ? 'último backup ontem' : `último backup há ${dias} dias${dias > 30 ? ' — bora fazer um' : ''}`}</p>
    <button class="acao-primaria" id="exp" style="margin-top:0">Exportar backup (JSON)</button>
    <button class="acao-secundaria" id="imp">Importar backup</button>
    <input type="file" accept="application/json,.json" id="arquivo" style="display:none">
    <p style="font-size:.7rem;color:var(--muted);margin-top:8px" id="storage-status"></p></div>`);
  cardBk.querySelector('#exp').onclick = exportarBackup;
  const inputArq = cardBk.querySelector('#arquivo');
  cardBk.querySelector('#imp').onclick = () => inputArq.click();
  inputArq.onchange = async () => {
    try {
      const novos = S.importJSON(await inputArq.files[0].text());
      snackbar(`Backup importado: ${novos} eventos novos.`);
    } catch (e) { snackbar(`Erro ao importar: ${e.message}`); }
  };
  S.pedirStoragePersistente().then((ok) => {
    cardBk.querySelector('#storage-status').textContent = ok
      ? '✓ Armazenamento persistente ativo — o Android não apaga estes dados em limpeza automática.'
      : 'Armazenamento persistente não garantido — faça backups com regularidade.';
  });
  root.append(cardBk);

  // lembretes locais (best-effort, opt-in — sem servidor de push)
  const lem = st.settings.lembretes || {};
  const cardLem = el(`<div class="card"><h2>Lembretes <small>· experimental — dependem do app aberto ou recente</small></h2>
    <div class="ajuste-linha"><span>Lanche das 16h pendente<div class="d">avisa ~15h45 se o lanche da tarde não foi marcado</div></span>
      <button class="toggle ${lem.lanche ? 'on' : ''}" id="t-lanche"><span></span></button></div>
    <div class="ajuste-linha"><span>Revisão de domingo<div class="d">avisa domingo às 18h se a semana não foi revisada</div></span>
      <button class="toggle ${lem.revisao ? 'on' : ''}" id="t-revisao"><span></span></button></div>
  </div>`);
  const liga = async (chave, btn) => {
    const atual = (S.getState().settings.lembretes || {})[chave];
    if (!atual && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') { snackbar('Sem permissão de notificação — lembrete não ativado.'); return; }
    }
    S.setSetting(`lembretes.${chave}`, !atual);
    btn.classList.toggle('on', !atual);
    agendarLembretes();
  };
  cardLem.querySelector('#t-lanche').onclick = (e) => liga('lanche', e.currentTarget);
  cardLem.querySelector('#t-revisao').onclick = (e) => liga('revisao', e.currentTarget);
  root.append(cardLem);

  // notificação push real (v7.10) — GitHub Actions avisa quando o pipeline identifica uma
  // corrida/força nova, mesmo com o app fechado. Setup: colar a inscrição 1x num Secret do repo.
  const cardPush = el(`<div class="card"><h2>Notificação de atividade <small>· funciona com o app fechado</small></h2>
    <div class="ajuste-linha"><span>Avisar quando o Garmin identificar corrida/força<div class="d">a IA já analisou — só falta confirmar em Hoje</div></span>
      <button class="toggle ${st.settings.pushAtivo ? 'on' : ''}" id="t-push"><span></span></button></div>
    <div id="push-setup" style="display:none"></div>
  </div>`);
  const setupPush = cardPush.querySelector('#push-setup');
  const mostrarSetupPush = (sub) => {
    setupPush.style.display = '';
    setupPush.innerHTML = `<p style="font-size:.72rem;color:var(--muted);margin:10px 0 6px">Cole isto no Secret <b>PUSH_SUBSCRIPTION</b> do repo — Settings → Secrets and variables → Actions → New repository secret. Só precisa fazer 1 vez (refaça só se desinstalar o app).</p>
      <textarea readonly style="width:100%;min-height:64px;font-size:.65rem;font-family:monospace;padding:8px;border-radius:8px;border:1px solid var(--grid);background:transparent;color:inherit" id="sub-json"></textarea>
      <button class="acao-secundaria" style="margin-top:6px" id="sub-copiar">Copiar inscrição</button>`;
    setupPush.querySelector('#sub-json').value = JSON.stringify(sub);
    setupPush.querySelector('#sub-copiar').onclick = async () => {
      try { await navigator.clipboard.writeText(JSON.stringify(sub)); snackbar('Copiado ✓'); } catch { snackbar('Não consegui copiar — selecione o texto acima manualmente.'); }
    };
  };
  if (st.settings.pushAtivo && st.settings.pushSubscription) mostrarSetupPush(st.settings.pushSubscription);
  cardPush.querySelector('#t-push').onclick = async (e) => {
    const btn = e.currentTarget;
    if (S.getState().settings.pushAtivo) {
      S.setSetting('pushAtivo', false);
      btn.classList.remove('on');
      setupPush.style.display = 'none';
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        await sub?.unsubscribe();
      } catch { /* desliga no app mesmo se a unsubscribe do navegador falhar */ }
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { snackbar('Este navegador não suporta notificação push.'); return; }
    if (Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') { snackbar('Sem permissão de notificação — não foi possível ativar.'); return; }
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })).toJSON();
      S.setSetting('pushAtivo', true);
      S.setSetting('pushSubscription', sub);
      btn.classList.add('on');
      mostrarSetupPush(sub);
      snackbar('Inscrição criada ✓ — falta colar no Secret do GitHub.');
    } catch {
      snackbar('Não consegui criar a inscrição de push neste aparelho.');
    }
  };
  root.append(cardPush);

  // integração Garmin — análises automáticas de corrida (pipeline v7)
  const temPat = !!st.settings.garminPat;
  const cardGar = el(`<div class="card"><h2>Análises Garmin <small>· pipeline no GitHub Actions</small></h2>
    <p id="gar-status" style="font-size:.78rem;color:var(--muted);margin-bottom:10px">carregando status…</p>
    <p style="font-size:.72rem;color:var(--muted);margin-bottom:8px">Token do GitHub (fine-grained, só o repo habitos-app: Actions RW + Contents R) ativa o disparo rápido pós-corrida e a leitura sem cache. Fica salvo SÓ neste aparelho.</p>
    <div style="display:flex;gap:8px">
      <input class="rev-input" style="margin:0;flex:1" type="password" id="gar-pat" placeholder="${temPat ? '•••••••• (token salvo)' : 'github_pat_…'}">
      <button class="acao-primaria" style="margin:0;width:auto;padding:11px 14px" id="gar-salvar">Salvar</button>
    </div>
    ${temPat ? '<button class="acao-secundaria" id="gar-remover" style="margin-top:6px">remover token deste aparelho</button>' : ''}
  </div>`);
  cardGar.querySelector('#gar-salvar').onclick = () => {
    const v = cardGar.querySelector('#gar-pat').value.trim();
    if (!v) return snackbar('Cole o token no campo antes de salvar.');
    S.setSetting('garminPat', v);
    snackbar('Token salvo neste aparelho ✓');
  };
  cardGar.querySelector('#gar-remover')?.addEventListener('click', () => {
    S.setSetting('garminPat', null);
    snackbar('Token removido.');
  });
  fetchDados('pipeline-status.json').then((s) => {
    const alvo = cardGar.querySelector('#gar-status');
    if (!alvo || !alvo.isConnected) return;
    if (!s || !s.ultimaExecucao) { alvo.textContent = 'Pipeline ainda sem execuções — configure os Secrets no repo e rode o workflow.'; return; }
    const rot = {
      ok: '✓ ok', garmin_auth: '⚠ conexão com a Garmin expirou — renovar o token (runbook no CLAUDE.md)',
      gemini_quota: '⏳ quota da IA — o próximo ciclo tenta de novo', erro: '⚠ erro na última execução',
    }[s.status] || s.status;
    alvo.textContent = `${rot} · executou ${s.ultimaExecucao.slice(0, 16).replace('T', ' ')}${s.ultimaAnalise ? ` · última análise ${fmtData(s.ultimaAnalise)}` : ''}`;
  });
  root.append(cardGar);

  // versão + atualização manual (o CDN do Pages pode atrasar ~10 min)
  const cardUpd = el(`<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
    <div><h2 style="margin-bottom:2px">Versão do app</h2>
    <div style="font-size:.85rem;color:var(--ink-2)">v${VERSAO_APP}</div></div>
    <button class="acao-primaria" style="width:auto;margin:0;padding:11px 16px" id="upd">Buscar atualização</button>
  </div>`);
  cardUpd.querySelector('#upd').onclick = async (e) => {
    e.target.textContent = 'Buscando…';
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.update();
    } catch { /* offline */ }
    setTimeout(() => location.reload(), 1200);
  };
  root.append(cardUpd);

  root.append(el(`<div class="rodape-nota">Rotina v${VERSAO_APP} · executa o Protocolo de Hábitos + Plano Nutricional (jul/2026).<br>
    Meta é tendência, não perfeição. Nunca duas vezes seguidas.</div>`));
}

// lembretes best-effort: só funcionam com o app aberto/recente (sem push server)
let lembreteTimer = null;
function agendarLembretes() {
  clearTimeout(lembreteTimer);
  const st = S.getState();
  const lem = st.settings.lembretes || {};
  if ((!lem.lanche && !lem.revisao) || !('Notification' in window) || Notification.permission !== 'granted') return;

  const agr = agora();
  const key = hojeKey();
  const alvos = [];
  if (lem.lanche) {
    const alvo = new Date(agr); alvo.setHours(15, 45, 0, 0);
    alvos.push({ quando: alvo, guarda: `notifLanche_${key}`, checa: () => !['ok', 'sub', 'skip', 'off'].includes(D.mealsOfDay(S.getState().events, hojeKey()).lanche2), titulo: 'Lanche das 16h', corpo: 'O escudo anti-doce das 15h. Pular a tarde é o maior preditor do ataque à gaveta.' });
  }
  if (lem.revisao && agr.getDay() === 0) {
    const alvo = new Date(agr); alvo.setHours(18, 0, 0, 0);
    alvos.push({ quando: alvo, guarda: `notifRevisao_${key}`, checa: () => !!D.revisaoPendente(S.getState().events, hojeKey(), 18), titulo: 'Revisão da semana — 5 min', corpo: 'Os números já estão contados. Feche a semana e pinte a rota.' });
  }
  const pendentes = alvos.filter((a) => a.quando > agr && !st.settings[a.guarda]);
  if (!pendentes.length) return;
  const prox = pendentes.sort((a, b) => a.quando - b.quando)[0];
  lembreteTimer = setTimeout(async () => {
    if (prox.checa() && !S.getState().settings[prox.guarda]) {
      S.setSetting(prox.guarda, true);
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) reg.showNotification(prox.titulo, { body: prox.corpo, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png' });
      else new Notification(prox.titulo, { body: prox.corpo, icon: 'icons/icon-192.png' });
    }
    agendarLembretes();
  }, Math.min(prox.quando - agr, 2 ** 31 - 1));
}

// ================================================================
// render principal + navegação
// ================================================================
function render() {
  clearInterval(hojeTimer);
  const st = S.getState();
  if (!st.settings.startKey) S.setSetting('startKey', hojeKey());

  const key = hojeKey();
  const tipo = D.tipoDoDia(key, st.settings.dayTypeOverrides);
  const faseAtual = D.fase(key);
  const metas = (faseAtual === 'deficit' ? METAS_DIA.deficit : METAS_DIA.manutencao)[tipo];
  const vgChip = D.viagemDoDia(key, viagensCfg());
  $('#chip-dia').innerHTML = vgChip
    ? `<span class="tipo">✈️ VIAGEM</span><span class="metas num">dia ${vgChip.dia}/${vgChip.total}</span>`
    : `<span class="tipo">${tipo}</span><span class="metas num">${metas.kcal} · P ${metas.p}</span>`;

  const root = $('#conteudo');
  root.innerHTML = '';
  if (abaAtiva === 'hoje') renderHoje(root);
  else if (abaAtiva === 'dieta') renderDieta(root);
  else if (abaAtiva === 'treino') renderTreino(root);
  else if (abaAtiva === 'evolucao') renderEvolucao(root);
  else if (abaAtiva === 'relatorio') renderRelatorio(root);
  else renderAjustes(root);

  document.querySelectorAll('nav.abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === abaAtiva));
  $('#btn-ajustes').classList.toggle('ativa', abaAtiva === 'ajustes');
  if (temCamadaAberta()) protegerVoltar();
}

// ---------- botão voltar do Android ----------
// O voltar fecha UMA camada por vez: sheet/overlay → dia selecionado no Treino → volta pra
// aba Hoje → (na Hoje, sem nada aberto) sai do app — padrão Material de bottom nav.
// Mecânica: uma entrada-sentinela no history; o popstate desfaz a camada do topo e re-arma
// a sentinela enquanto houver camada. Overlays novos DEVEM chamar protegerVoltar() ao abrir.
let sentinelaVoltar = false;
function protegerVoltar() {
  if (!sentinelaVoltar) { sentinelaVoltar = true; history.pushState({ pampulha: 1 }, ''); }
}
function temCamadaAberta() {
  return !!$('.sheet-fundo') || !!$('.sos-tela') || diaTreinoSel !== null || semTreinoIni !== null || abaAtiva !== 'hoje';
}
window.addEventListener('popstate', () => {
  sentinelaVoltar = false;
  if ($('.sheet-fundo')) fecharSheet();
  else if ($('.sos-tela')) { clearInterval(contadorTimer); fecharSOS(); }
  else if (diaTreinoSel !== null) { diaTreinoSel = null; render(); }
  else if (semTreinoIni !== null) { semTreinoIni = null; render(); }
  else if (abaAtiva !== 'hoje') { abaAtiva = 'hoje'; render(); }
  if (temCamadaAberta()) protegerVoltar();
});

document.querySelectorAll('nav.abas button').forEach((b) => {
  b.onclick = () => { if (b.dataset.aba !== 'treino') { diaTreinoSel = null; semTreinoIni = null; } abaAtiva = b.dataset.aba; render(); };
});
$('#btn-ajustes').onclick = () => { diaTreinoSel = null; semTreinoIni = null; abaAtiva = 'ajustes'; render(); };
$('#sos-fab').onclick = abrirSOS;

S.onChange(render);
render();
agendarLembretes();
carregarAnalises();
autoDispararAnalise();
atualizarBadgeSaude();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  carregarAnalises(true);
  autoDispararAnalise();
  atualizarBadgeSaude();
});
// atalho do ícone do PWA (?sos=1) e helpers de dev/verificação
if (params.get('sos')) {
  if (SOS_SCRIPTS[params.get('sos')]) sosScript(params.get('sos'), Number(params.get('passo') || 0));
  else abrirSOS();
}
if (params.get('ressaca') && !D.ressacaDoDia(S.getState().events, hojeKey()).on) {
  S.addEvent({ type: 'hangover_on', date: hojeKey() });
}
if (params.get('contadores')) contadoresOverlay();
if (params.get('detalhe')) {
  // espera as análises pra o sheet já nascer com a seção SUA CORRIDA (dev/screenshots)
  carregarAnalises().then(() => sheetTreinoDetalhe(params.get('detalhe'), D.treinoDoDia(hojeKey()), hojeKey()));
}
if (params.get('wizard') === 'revisao') {
  carregarAnalises().then(() => wizardRevisao(
    D.revisaoPendente(S.getState().events, hojeKey(), 20) || D.addDays(D.inicioSemana(hojeKey()), -7),
    +params.get('passo') || 0,
  ));
}
if (params.get('contrato') && !D.contratoAtivo(S.getState().events, hojeKey(), agora().getHours())) {
  S.addEvent({ type: 'contract', date: hojeKey(), maxDrinks: 3, horaSaida: '00:30' });
  S.addEvent({ type: 'contract_tick', date: hojeKey(), kind: 'drink' });
  S.addEvent({ type: 'contract_tick', date: hojeKey(), kind: 'agua' });
  S.addEvent({ type: 'contract_tick', date: hojeKey(), kind: 'drink' });
}
if (params.get('posalmoco')) { // dev: estado "acabei de almoçar" pro escudo pós-almoço
  ['cafe', 'lanche1', 'almoco'].forEach((m) => S.addEvent({ type: 'meal', date: hojeKey(), meal: m, status: 'ok' }));
}
if (params.get('checkpoint')) { // dev: abre o guia do próximo checkpoint
  const cp = CHECKPOINTS.find((c) => c.date >= hojeKey()) || CHECKPOINTS[CHECKPOINTS.length - 1];
  sheetCheckpoint(cp);
}

// service worker + atualização
// PWA standalone no Android quase nunca morre ao "fechar" — sem navegação nova, o browser não
// checa o sw.js e o app fica preso na versão velha. Por isso: (1) checar update sempre que o
// app volta ao foco; (2) quando o SW novo assume, RECARREGAR a página (o shell antigo continua
// rodando até um reload — só o snackbar não atualizava nada). Dados vivem no localStorage.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js');
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    try { (await navigator.serviceWorker.getRegistration())?.update(); } catch { /* offline */ }
  });
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregou) return; recarregou = true;
    if (temCamadaAberta()) snackbar('Atualização pronta — feche e abra para aplicar.');
    else location.reload();
  });
}
