// Pampulha — painel de execução do Protocolo de Hábitos
const VERSAO_APP = '6.1'; // manter em sincronia com VERSAO do sw.js
import {
  REFEICOES, MEAL_IDS, TIPO_POR_DIA_SEMANA, METAS_DIA, TREINO_POR_DIA, GATILHOS,
  SOS_SCRIPTS, RESSACA_PASSOS, PROVA, FIM_DEFICIT, METAS_30D,
  FRASE_IDENTIDADE, AJUSTES_AMBIENTE, HORARIOS_SAIDA,
  CORRIDAS, TIPO_CORRIDA_ICONE, GYM_TREINOS, GYM_FASE_POR_MES, CORRIDA_GUIA,
} from './data.js';
import * as D from './derive.js';
import * as S from './store.js';

// ---------- tempo (com override de dev: ?hoje=YYYY-MM-DD&agora=HH:MM) ----------
const params = new URLSearchParams(location.search);
if (params.get('tema')) document.documentElement.dataset.tema = params.get('tema');
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

let abaAtiva = ['hoje', 'dieta', 'treino', 'evolucao', 'relatorio', 'ajustes'].includes(params.get('aba')) ? params.get('aba') : 'hoje';
let periodoRelatorio = 30; // 30 | 90 | 0 (tudo)
let diaTreinoSel = null; // dia selecionado no card Semana da aba Treino (null = hoje)
if (params.get('dia')) diaTreinoSel = params.get('dia'); // dev: ?aba=treino&dia=YYYY-MM-DD

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
      const t = D.tempoLimpo(D.ultimoSlipTs(st.events, type, inicioTs), agoraTs);
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
    const ajuste = rv.ajuste[tipo];
    const [rvH, rvM] = rv.hora.split(':').map(Number);
    const rotulo = agoraMin >= rvH * 60 + rvM - 45 ? 'AGORA' : 'PRÓXIMA';
    const hero = el(`<div class="card hero-refeicao ${destaque16 ? 'destaque-16h' : ''}">
      <div class="hero-rotulo"><span>${rotulo}${destaque16 ? ' · escudo anti-doce das 15h' : ''}</span><span class="hero-placar num">${feitas}/5 hoje</span></div>
      <h1>${esc(rv.nome)} <span class="hora num">${esc(rv.hora)}</span></h1>
      <p class="cardapio">${esc(rv.principal)}</p>
      ${ouroDomingo ? '<span class="badge-ouro">★ Hoje o jantar é INTENSO — pré-carga do Longão. NÃO corta o carbo.</span>' : ''}
      ${ajuste && !ouroDomingo ? `<p class="ajuste-dia">Hoje (${tipo}): ${esc(ajuste)}</p>` : ''}
      <div class="hero-acoes">
        <button class="acao-primaria" id="hero-feita">✓ Feita</button>
        <button class="acao-secundaria" id="hero-opcoes">substituições / pulei ›</button>
      </div>
    </div>`);
    hero.querySelector('#hero-feita').onclick = () => {
      const e = S.addEvent({ type: 'meal', date: key, meal: rv.id, status: 'ok' });
      snackbar(`${rv.nome}: feita ✓`, () => S.removeEvent(e.id));
    };
    hero.querySelector('#hero-opcoes').onclick = () => sheetRefeicao(rv, meals[rv.id] || 'none', key);
    root.append(hero);
  } else {
    // colheita do dia: a memória do dia é dominada pelo fim — o fim mostra a evidência
    const amanha = (D.parseKey(key).getDay() + 1) % 7;
    const limpoHoje = !D.slipDays(st.events, 'delivery').includes(key) && !D.slipDays(st.events, 'sweet').includes(key);
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
    const ab = D.aberturaSemana(st.events, key);
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
  linhaT.querySelector('.tr-ver').onclick = () => { diaTreinoSel = null; abaAtiva = 'treino'; render(); };
  root.append(linhaT);

  // ---- aviso never-miss-twice (só quando acionável) ----
  const cDeliv = D.contadorResiliente(st.events, 'delivery', key, st.settings.startKey);
  const cDoce = D.contadorResiliente(st.events, 'sweet', key, st.settings.startKey);
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

  return [];
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
      <button class="opcao" id="r-sweet">🍫 Doce fora do plano</button>
      <button class="opcao" id="r-noite">🍻 Noite fora<small>vou sair (contrato) ou já saí (registrar)</small></button>
    </div>
    <button class="acao-secundaria" id="r-sos">Bateu a vontade AGORA e ainda não cedeu? → Abrir SOS</button></div>`);
  box.querySelector('#r-peso').onclick = () => sheetPeso(key);
  box.querySelector('#r-delivery').onclick = () => sheetEvento('delivery', key);
  box.querySelector('#r-sweet').onclick = () => sheetEvento('sweet', key);
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

  // contexto do dia: o "porquê" do tipo de hoje
  const faseTxt = { deficit: 'déficit', manutencao: 'manutenção', carga: '★ carga de carbo', prova: '🏁 prova' }[faseAtual];
  root.append(el(`<div class="card dieta-contexto">
    <h2>Dia ${tipo} · fase ${esc(faseTxt)}</h2>
    <p><b class="num">${esc(metas.kcal)} kcal</b> · P ${esc(metas.p)} · C ${esc(metas.c)} · G ${esc(metas.g)}</p>
    <p class="dieta-porque">Por quê: ${esc(TREINO_POR_DIA[D.parseKey(key).getDay()])}</p>
  </div>`));

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

  // cardápio do dia inteiro (principal + ajuste do tipo, sem abrir sheet por sheet)
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
  const m = D.metricasSemana(st.events, key);
  const b = st.settings.baseline;
  let refSemana = 0;
  for (let i = 0; i < 7; i++) refSemana += D.mealsDone(D.mealsOfDay(st.events, D.addDays(m.ini, i)));
  root.append(el(`<div class="card"><h2>Semana <small>· metas de 30 dias do protocolo</small></h2>
    <div class="tiles">
      ${tileMetrica('Delivery por impulso', m.delivery, b.delivery, 'delivery')}
      ${tileMetrica('Doces fora do plano', m.sweet, b.sweet, 'sweet')}
      ${tileMetrica('Drinks por saída', m.drinks, b.drinks, 'drinks')}
    </div>
    <p class="const-linha">Refeições no plano: <b class="num">${refSemana}/35</b> ${refSemana >= 28 ? '<span style="color:var(--good-text)">✓ semana verde</span>' : '<small style="color:var(--muted)">· verde a partir de 28 (80%)</small>'}</p>
    ${b.delivery == null ? '<p style="font-size:.72rem;color:var(--muted);margin-top:8px">Defina seu baseline em Ajustes (⚙️ no topo) para ativar as metas de −50%.</p>' : ''}
  </div>`));
}

// ================================================================
// TELA TREINO — hoje, semana e o cronograma de corridas inteiro
// ================================================================
function renderTreino(root) {
  const st = S.getState();
  const key = hojeKey();
  if (diaTreinoSel === key) diaTreinoSel = null; // tocar no dia de hoje = voltar ao padrão
  const alvo = diaTreinoSel || key; // dia exibido no card de treino
  const plano = D.treinoDoDia(alvo);
  const feito = D.workoutsDoDia(st.events, alvo);
  const futuro = alvo > key;

  // semana — cada dia é um botão que troca o card de treino abaixo
  const sem = D.semanaTreino(st.events, key);
  const cardSem = el(`<div class="card"><h2>Semana <small>· ${fmtData(sem.ini)} – ${fmtData(D.addDays(sem.ini, 6))} · toque num dia para ver o treino</small></h2>
    <div class="sem-treino"></div>
    <div class="sem-resumo">
      <span>🏋️ Academia <b class="num">${sem.gymFeito}/${sem.gymPlan}</b></span>
      <span>🏃 Corrida <b class="num">${sem.corridaFeita}/${sem.corridaPlan}</b></span>
    </div></div>`);
  const semWrap = cardSem.querySelector('.sem-treino');
  const letras = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  sem.dias.forEach((d, i) => {
    const col = el(`<button class="sem-dia ${d.date === key ? 'hoje' : ''} ${d.date === alvo ? 'sel' : ''}" aria-pressed="${d.date === alvo}" aria-label="ver treino de ${fmtData(d.date)}">
      <span class="sem-letra">${letras[i]}</span>
      ${d.plano.corrida ? `<span class="sem-dot ${d.feito.corrida ? 'ok' : d.date < key ? 'perdido' : ''}">${TIPO_CORRIDA_ICONE[d.plano.corrida.tipo]}</span>` : ''}
      ${d.plano.gym ? `<span class="sem-dot ${d.feito.gym ? 'ok' : d.date < key ? 'perdido' : ''}">🏋️</span>` : ''}
      ${!d.plano.corrida && !d.plano.gym ? '<span class="sem-dot descanso">–</span>' : ''}
    </button>`);
    col.onclick = () => { diaTreinoSel = d.date === key ? null : d.date; render(); };
    semWrap.append(col);
  });
  root.append(cardSem);

  // treino do dia exibido (hoje por padrão; outro dia se selecionado na semana)
  const DIA_NOME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const titulo = diaTreinoSel
    ? `Treino de ${DIA_NOME[D.parseKey(alvo).getDay()]} <small>· ${fmtData(alvo)}</small>`
    : 'Treino de hoje';
  const cardHoje = el(`<div class="card"><div class="treino-cab"><h2>${titulo}</h2>${diaTreinoSel ? '<button class="chip-voltar" id="voltar-hoje">‹ voltar para hoje</button>' : ''}</div>
    <div style="display:grid;gap:8px" id="tr"></div></div>`);
  if (diaTreinoSel) cardHoje.querySelector('#voltar-hoje').onclick = () => { diaTreinoSel = null; render(); };
  const tr = cardHoje.querySelector('#tr');
  const linhaTreino = (kind, icone, nome) => {
    const ok = !!feito[kind];
    const row = el(`<div class="treino-row ${ok ? 'feito' : ''}">
      ${futuro
    ? `<div class="check-passo tr-plano"><span><span class="t">${icone} ${esc(nome)}</span></span></div>`
    : `<button class="check-passo tr-check ${ok ? 'feito' : ''}">
        <span class="caixa">${ok ? '✓' : ''}</span>
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
  if (plano.corrida) tr.append(linhaTreino('corrida', TIPO_CORRIDA_ICONE[plano.corrida.tipo], plano.corrida.nome));
  if (plano.gym) tr.append(linhaTreino('gym', '🏋️', plano.gym));
  if (!plano.corrida && !plano.gym) tr.append(el(`<p style="font-size:.85rem;color:var(--muted)">Descanso — ${futuro ? 'o treino é' : 'hoje o treino é'} dormir 7–8h. Metade da recuperação acontece dormindo.</p>`));
  root.append(cardHoje);

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
    const item = el(`<div class="cron-item ${ok ? 'feita' : ''} ${passada && !ok ? 'perdida' : ''} ${hoje ? 'hoje' : ''}">
      <button class="cron-toggle">
        <span class="caixa">${ok ? '✓' : ''}</span>
        <span class="cron-data num">${fmtData(data)}</span>
        <span class="cron-nome">${TIPO_CORRIDA_ICONE[tipo]} ${esc(nome)}</span>
      </button>
      <button class="tr-ver cron-ver" aria-label="ver guia da corrida">›</button>
    </div>`);
    item.querySelector('.cron-toggle').onclick = () => S.addEvent({ type: 'workout', date: data, kind: 'corrida', done: !ok });
    item.querySelector('.cron-ver').onclick = () => sheetTreinoDetalhe('corrida', { corrida: { tipo, nome } }, data);
    if (!alvoScroll && data >= key) alvoScroll = item;
    cron.append(item);
  }
  root.append(cardCron);
  if (alvoScroll) setTimeout(() => alvoScroll.scrollIntoView({ block: 'center' }), 40);
}

// sheet: o treino completo do dia (exercícios da academia / guia de pace da corrida)
function sheetTreinoDetalhe(kind, plano, key) {
  let box;
  if (kind === 'gym') {
    const exercicios = GYM_TREINOS[D.parseKey(key).getDay()] || [];
    const fase = GYM_FASE_POR_MES[D.parseKey(key).getMonth() + 1];
    box = el(`<div><h3>🏋️ ${esc(plano.gym)}</h3>
      ${fase ? `<p class="detalhe-fase">${esc(fase)}</p>` : ''}
      <div class="exercicios">${exercicios.map(([ex, sr, obs], i) => `
        <div class="exercicio">
          <span class="ex-num num">${i + 1}</span>
          <span class="ex-nome">${esc(ex)}${obs ? `<small>${esc(obs)}</small>` : ''}</span>
          <span class="ex-series num">${esc(sr)}</span>
        </div>`).join('')}</div></div>`);
  } else {
    const c = plano.corrida;
    const g = CORRIDA_GUIA[c.tipo] || {};
    box = el(`<div><h3>${TIPO_CORRIDA_ICONE[c.tipo]} ${esc(c.nome)}</h3>
      <div class="exercicios">
        <div class="exercicio"><span class="ex-num">⏱</span><span class="ex-nome">Pace alvo<small>${esc(g.pace || '—')}</small></span></div>
        <div class="exercicio"><span class="ex-num">❤️</span><span class="ex-nome">Frequência cardíaca<small>${esc(g.fc || '—')}</small></span></div>
        <div class="exercicio"><span class="ex-num">🗣</span><span class="ex-nome">Sensação<small>${esc(g.sensacao || '—')}</small></span></div>
        ${g.extra ? `<div class="exercicio"><span class="ex-num">☝️</span><span class="ex-nome">Execução<small>${esc(g.extra)}</small></span></div>` : ''}
      </div></div>`);
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
    const t = D.tempoLimpo(D.ultimoSlipTs(st.events, type, inicioTs), Date.now());
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
  const dias = (type) => Math.floor(D.tempoLimpo(D.ultimoSlipTs(st.events, type, inicioTs), Date.now()).totalDias);
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
  const wrap = tela.querySelector('#aneis');

  const defs = [
    { type: 'delivery', icone: '🛵', nome: 'Sem iFood por impulso' },
    { type: 'sweet', icone: '🍫', nome: 'Sem doce fora do plano' },
  ];
  const anelEls = defs.map((d, i) => {
    const c = D.contadorResiliente(st.events, d.type, key, st.settings.startKey);
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
      const desde = D.ultimoSlipTs(eventos, a.type, inicioTs);
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
function wizardRevisao(semanaIni) {
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
  let passo = 0;

  fecharSOS();
  const tela = el(`<div class="sos-tela">
    <button class="fechar">✕</button>
    <h2>Revisão da semana</h2>
    <p class="nomeacao">${fmtData(semanaIni)} – ${fmtData(D.addDays(semanaIni, 6))} · os números já estão contados, você só interpreta.</p>
    <div class="sos-passo" id="corpo"></div>
  </div>`);
  tela.querySelector('.fechar').onclick = fecharSOS;
  document.body.appendChild(tela);
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
      corpo.innerHTML = `<div class="num-passo">PASSO 1 DE 5 · OS TRÊS NÚMEROS</div>
        ${linhaMetrica('🛵 Delivery por impulso', m.delivery, mAnt.delivery, b.delivery != null ? `≤ ${String(b.delivery * 0.5).replace('.', ',')}` : '−50% do baseline', (v) => b.delivery != null && v <= b.delivery * 0.5)}
        ${linhaMetrica('🍫 Doces fora do plano', m.sweet, mAnt.sweet, b.sweet != null ? `≤ ${String(b.sweet * 0.5).replace('.', ',')}` : '−50% do baseline', (v) => b.sweet != null && v <= b.sweet * 0.5)}
        ${linhaMetrica('🍻 Drinks por saída', m.drinks, mAnt.drinks, '≤ 3', (v) => v <= 3)}
        <p style="color:var(--ink-2);font-size:.85rem">Meta é tendência, não perfeição — de 5 para 2 é vitória enorme.</p>
        <div id="acoes"></div>`;
    },
    () => {
      corpo.innerHTML = `<div class="num-passo">PASSO 2 DE 5 · O QUE DISPAROU</div>
        ${gatOrd.length
          ? `<div style="display:grid;gap:6px">${gatOrd.map(([g, n]) => `<div class="rev-metrica"><span>${esc(g)}</span><span class="num">${n}×</span></div>`).join('')}</div>
             <p style="color:var(--ink-2);font-size:.85rem;margin-top:8px">Ataque o estressor, não o chocolate.</p>`
          : '<h3>Semana sem gatilhos registrados</h3><p>Ou foi limpa de verdade, ou os chips ficaram sem uso — os dois valem saber.</p>'}
        <div id="acoes"></div>`;
    },
    () => {
      corpo.innerHTML = `<div class="num-passo">PASSO 3 DE 5 · UMA LINHA</div>
        <h3>O que disparou os deslizes da semana?</h3>
        <input class="rev-input" id="nota" maxlength="120" placeholder="opcional — ex.: sprint atrasada, 3 calls seguidas…" value="${esc(nota)}">
        <div id="acoes"></div>`;
      corpo.querySelector('#nota').oninput = (e) => { nota = e.target.value; };
    },
    () => {
      corpo.innerHTML = `<div class="num-passo">PASSO 4 DE 5 · UM AJUSTE DE AMBIENTE</div>
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
      corpo.innerHTML = `<div class="num-passo">PASSO 5 DE 5 · FECHADO</div>
        <h3>“${FRASE_IDENTIDADE}”</h3>
        <p>Mais uma semana de evidência. ${ident.assinada ? 'Frase assinada — 4 domingos seguidos. ✍️' : `Assinatura: ${Math.min(ident.progresso + 1, 4)}/4 domingos de revisão.`}</p>
        ${ajuste ? `<p style="color:var(--ink-2)">Ajuste da semana: <b>${esc(ajuste)}</b></p>` : ''}
        <div id="acoes"></div>`;
    },
  ];

  const mostrar = () => {
    passos[passo]();
    const acoes = corpo.querySelector('#acoes');
    if (passo < passos.length - 1) {
      const btn = el(`<button class="acao-primaria">${passo === 3 && !ajuste ? 'Pular ajuste →' : 'Próximo →'}</button>`);
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
  const cDeliv = D.contadorResiliente(st.events, 'delivery', key, st.settings.startKey);
  const cDoce = D.contadorResiliente(st.events, 'sweet', key, st.settings.startKey);
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

  // métricas semanais do §4 moraram aqui até a v5 — hoje vivem na aba Dieta ("Semana")

  // constância: uma linha legível por semana, meta = 80% (28/35), não perfeição
  root.append(el('<div class="secao">CONSTÂNCIA</div>'));
  const hm = D.heatmapConstancia(st.events, key, 8);
  const cardHm = el(`<div class="card"><h2>Constância <small>· refeições no plano · meta da semana: 28/35 (80%)</small></h2>
    <div class="const-cab"><span></span>${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l) => `<span>${l}</span>`).join('')}<span></span></div>
    ${hm.map((sem) => {
      const total = sem.dias.reduce((s, n) => s + (n || 0), 0);
      const fechada = sem.dias.every((n) => n !== null);
      const verde = fechada && total >= 28;
      return `<div class="const-sem">
        <span class="const-label num">${fmtData(sem.ini)}</span>
        ${sem.dias.map((n) => n === null ? '<span class="cel vazio"></span>' : `<span class="cel n${n}" title="${n}/5"></span>`).join('')}
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
  const agora_ = D.resumoPeriodo(st.events, ini, key);
  const antes = periodoRelatorio ? D.resumoPeriodo(st.events, D.addDays(ini, -dias), D.addDays(ini, -1)) : null;

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

  // totais desde o início
  const tudo = D.resumoPeriodo(st.events, inicio, key);
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
function renderAjustes(root) {
  const st = S.getState();
  const key = hojeKey();

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

  // backup
  const dias = st.settings.lastBackupTs ? Math.floor((Date.now() - st.settings.lastBackupTs) / 86400000) : null;
  const cardBk = el(`<div class="card"><h2>Backup <small>· dados ficam SÓ neste aparelho</small></h2>
    <p style="font-size:.78rem;color:var(--ink-2);margin-bottom:10px">${st.events.length} eventos registrados · ${dias === null ? 'nenhum backup ainda' : dias === 0 ? 'backup hoje ✓' : `último backup há ${dias} dias${dias > 30 ? ' — bora fazer um' : ''}`}</p>
    <button class="acao-primaria" id="exp" style="margin-top:0">Exportar backup (JSON)</button>
    <button class="acao-secundaria" id="imp">Importar backup</button>
    <input type="file" accept="application/json,.json" id="arquivo" style="display:none">
    <p style="font-size:.7rem;color:var(--muted);margin-top:8px" id="storage-status"></p></div>`);
  cardBk.querySelector('#exp').onclick = async () => {
    const json = S.exportJSON();
    const nome = `pampulha-backup-${hojeKey()}.json`;
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
  };
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

  root.append(el(`<div class="rodape-nota">Pampulha v${VERSAO_APP} · executa o Protocolo de Hábitos + Plano Nutricional (jul/2026).<br>
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
      if (reg) reg.showNotification(prox.titulo, { body: prox.corpo, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
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
  $('#chip-dia').innerHTML = `<span class="tipo">${tipo}</span><span class="metas num">${metas.kcal} · P ${metas.p}</span>`;
  $('#countdown').innerHTML = `<b class="num">${D.semanasAteProva(key)} sem</b><br>até a Pampulha`;

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
}

document.querySelectorAll('nav.abas button').forEach((b) => {
  b.onclick = () => { if (b.dataset.aba !== 'treino') diaTreinoSel = null; abaAtiva = b.dataset.aba; render(); };
});
$('#btn-ajustes').onclick = () => { diaTreinoSel = null; abaAtiva = 'ajustes'; render(); };
$('#sos-fab').onclick = abrirSOS;

S.onChange(render);
render();
agendarLembretes();
// atalho do ícone do PWA (?sos=1) e helpers de dev/verificação
if (params.get('sos')) {
  if (SOS_SCRIPTS[params.get('sos')]) sosScript(params.get('sos'), Number(params.get('passo') || 0));
  else abrirSOS();
}
if (params.get('ressaca') && !D.ressacaDoDia(S.getState().events, hojeKey()).on) {
  S.addEvent({ type: 'hangover_on', date: hojeKey() });
}
if (params.get('contadores')) contadoresOverlay();
if (params.get('detalhe')) sheetTreinoDetalhe(params.get('detalhe'), D.treinoDoDia(hojeKey()), hojeKey());
if (params.get('wizard') === 'revisao') {
  wizardRevisao(D.revisaoPendente(S.getState().events, hojeKey(), 20) || D.addDays(D.inicioSemana(hojeKey()), -7));
}
if (params.get('contrato') && !D.contratoAtivo(S.getState().events, hojeKey(), agora().getHours())) {
  S.addEvent({ type: 'contract', date: hojeKey(), maxDrinks: 3, horaSaida: '00:30' });
  S.addEvent({ type: 'contract_tick', date: hojeKey(), kind: 'drink' });
  S.addEvent({ type: 'contract_tick', date: hojeKey(), kind: 'agua' });
  S.addEvent({ type: 'contract_tick', date: hojeKey(), kind: 'drink' });
}

// service worker + aviso de atualização
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js');
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregou) return; recarregou = true;
    snackbar('App atualizado ✓');
  });
}
