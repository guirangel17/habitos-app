// Pampulha — painel de execução do Protocolo de Hábitos
import {
  REFEICOES, MEAL_IDS, TIPO_POR_DIA_SEMANA, METAS_DIA, TREINO_POR_DIA, GATILHOS,
  SOS_SCRIPTS, RESSACA_PASSOS, PROVA, FIM_DEFICIT, METAS_30D,
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

let abaAtiva = ['hoje', 'evolucao', 'ajustes'].includes(params.get('aba')) ? params.get('aba') : 'hoje';
let refeicaoExpandida = null;

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
  S.addEvent({ type: 'delivery', date: D.addDays(key, -20), trigger: 'preguiça' });
  S.addEvent({ type: 'delivery', date: D.addDays(key, -9), trigger: 'preguiça' });
  S.addEvent({ type: 'sweet', date: D.addDays(key, -15), trigger: '15h' });
  S.addEvent({ type: 'sweet', date: D.addDays(key, -4), trigger: 'bug' });
  S.addEvent({ type: 'sos', kind: 'doce', outcome: 'surfed', date: D.addDays(key, -3), trigger: '15h' });
  S.addEvent({ type: 'sos', kind: 'ifood', outcome: 'surfed', date: D.addDays(key, -2), trigger: 'preguiça' });
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
// TELA HOJE
// ================================================================
function renderHoje(root) {
  const st = S.getState();
  const key = hojeKey();
  const ressaca = D.ressacaDoDia(st.events, key);
  if (ressaca.on) return renderRessaca(root, ressaca);

  const tipo = D.tipoDoDia(key, st.settings.dayTypeOverrides);
  const fase = D.fase(key);
  const meals = D.mealsOfDay(st.events, key);
  const feitas = D.mealsDone(meals);

  // oferta de modo ressaca na manhã seguinte a uma saída
  const ofertaRessaca = D.saiuOntem(st.events, key) && !ressaca.on && agora().getHours() < 14
    && !st.events.some((e) => e.type === 'hangover_dismiss' && e.date === key);

  root.append(el(`<div class="card">
    <div class="dia-resumo">
      ${anelSVG(feitas, 5)}
      <div class="texto">
        <div style="font-weight:650">${feitas}/5 refeições no plano</div>
        <div class="treino">${esc(TREINO_POR_DIA[D.parseKey(key).getDay()])}</div>
        ${fase === 'manutencao' ? '<div class="fase-nota">Fase de manutenção — calorias mais altas, foco em performance.</div>' : ''}
        ${fase === 'carga' ? '<div class="fase-nota">★ Carga de carbo — 6–8 g/kg, gordura baixa, pouca fibra.</div>' : ''}
        ${fase === 'prova' ? '<div class="fase-nota">🏁 É hoje (ou já foi!). Volta da Pampulha.</div>' : ''}
      </div>
    </div>
  </div>`));

  if (ofertaRessaca) {
    const c = el(`<div class="card ressaca-banner"><b>Saiu ontem à noite?</b>
      Se acordou de ressaca, ative o script do dia seguinte — zero decisões, só execução.
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="acao-primaria" style="margin:0;padding:11px" id="btn-ressaca-on">Ativar Modo Ressaca</button>
        <button class="acao-secundaria" style="margin:0;width:auto" id="btn-ressaca-nao">Estou bem</button>
      </div></div>`);
    c.querySelector('#btn-ressaca-on').onclick = () => S.addEvent({ type: 'hangover_on', date: key });
    c.querySelector('#btn-ressaca-nao').onclick = () => S.addEvent({ type: 'hangover_dismiss', date: key });
    root.append(c);
  }

  // refeições
  const cardRef = el('<div class="card"><h2>Refeições de hoje <small>· toque = feito · toque longo = opções</small></h2><div class="refeicoes"></div></div>');
  const lista = cardRef.querySelector('.refeicoes');
  const agoraMin = agora().getHours() * 60 + agora().getMinutes();
  let atualMarcada = false;

  for (const r of REFEICOES) {
    const status = meals[r.id] || 'none';
    const [h1, m1] = r.hora.split(':').map(Number);
    const [h2, m2] = r.horaFim.split(':').map(Number);
    const ehAtual = !atualMarcada && status === 'none' && agoraMin >= h1 * 60 + m1 - 45 && agoraMin <= h2 * 60 + m2;
    if (ehAtual) atualMarcada = true;
    const destaque16 = r.id === 'lanche2' && status === 'none' && agoraMin >= 13 * 60;
    const ouroDomingo = r.id === 'jantar' && tipo === 'DESCANSO';
    const ajuste = r.ajuste[tipo];
    const cls = { ok: 'feita', sub: 'sub', skip: 'pulada', off: 'fora' }[status] || '';
    const statusTxt = { ok: 'feita ✓', sub: 'substituição ✓', skip: 'pulada', off: 'fora do plano' }[status] || '';

    const item = el(`<button class="refeicao ${cls} ${ehAtual ? 'atual' : ''} ${destaque16 ? 'destaque-16h' : ''}">
      <span class="marca">${status === 'ok' || status === 'sub' ? '✓' : status === 'skip' ? '–' : status === 'off' ? '✕' : ''}</span>
      <span>
        <span class="nome">${esc(r.nome)}<span class="hora">${esc(r.hora)}</span></span>
        <span class="desc">${esc(r.principal)}</span>
        ${ouroDomingo ? '<span class="badge-ouro">★ Jantar = INTENSO — pré-carga do Longão. NÃO corta o carbo.</span>' : ''}
      </span>
      <span class="status-txt">${statusTxt}</span>
      ${refeicaoExpandida === r.id ? `<span class="ref-detalhe">
        <b>${esc(r.kcal)}</b><br>
        <b>Sub 1:</b> ${esc(r.subs[0])}<br>
        <b>Sub 2:</b> ${esc(r.subs[1])}
        ${ajuste && !ouroDomingo ? `<br><b>Hoje (${tipo}):</b> ${esc(ajuste)}` : ''}
      </span>` : ''}
    </button>`);

    // toque = alterna feito; toque longo = sheet de opções
    let pressTimer = null; let longPress = false;
    item.addEventListener('pointerdown', () => {
      longPress = false;
      pressTimer = setTimeout(() => { longPress = true; sheetRefeicao(r, status, key); }, 480);
    });
    item.addEventListener('pointerup', () => clearTimeout(pressTimer));
    item.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    item.addEventListener('click', () => {
      if (longPress) return;
      if (status === 'none') {
        S.addEvent({ type: 'meal', date: key, meal: r.id, status: 'ok' });
      } else {
        refeicaoExpandida = refeicaoExpandida === r.id ? null : r.id;
        render();
      }
    });
    lista.append(item);
  }
  root.append(cardRef);

  // contadores resilientes
  const cDeliv = D.contadorResiliente(st.events, 'delivery', key, st.settings.startKey);
  const cDoce = D.contadorResiliente(st.events, 'sweet', key, st.settings.startKey);
  root.append(el(`<div class="card"><h2>Contadores <small>· never miss twice: deslize isolado não zera</small></h2>
    <div class="contadores">
      ${contadorHTML('Sem iFood por impulso', cDeliv)}
      ${contadorHTML('Sem doce fora do plano', cDoce)}
    </div>
  </div>`));

  // peso rápido
  const pesos = D.serie(st.events, 'weight');
  const ultimo = pesos[pesos.length - 1];
  const cardPeso = el(`<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
    <div><h2 style="margin-bottom:2px">Peso</h2>
    <div style="font-size:.85rem;color:var(--ink-2)">${ultimo ? `${ultimo.valor.toFixed(1).replace('.', ',')} kg <span style="color:var(--muted)">· ${ultimo.date === key ? 'hoje' : 'em ' + fmtData(ultimo.date)}</span>` : 'nenhum registro ainda'}</div></div>
    <button class="acao-primaria" style="width:auto;margin:0;padding:11px 18px" id="btn-peso">Registrar</button>
  </div>`);
  cardPeso.querySelector('#btn-peso').onclick = () => sheetPeso(key);
  root.append(cardPeso);

  // eventos sem culpa
  const cardEv = el(`<div class="card"><h2>Aconteceu? Registra e segue <small>· sem culpa — dado vira diagnóstico</small></h2>
    <div class="eventos">
      <button class="btn-evento" id="ev-delivery"><span class="icone">🛵</span>Pedi delivery</button>
      <button class="btn-evento" id="ev-sweet"><span class="icone">🍫</span>Doce fora do plano</button>
      <button class="btn-evento" id="ev-night"><span class="icone">🍻</span>Saí e bebi</button>
    </div>
  </div>`);
  cardEv.querySelector('#ev-delivery').onclick = () => sheetEvento('delivery', key);
  cardEv.querySelector('#ev-sweet').onclick = () => sheetEvento('sweet', key);
  cardEv.querySelector('#ev-night').onclick = () => sheetNoite(key);
  root.append(cardEv);
}

function contadorHTML(rotulo, c) {
  const cls = c.amassado ? 'amassado' : c.quebradoHoje ? 'quebrado' : '';
  const aviso = c.amassado
    ? '<div class="aviso">Ponto fora da curva — a próxima refeição volta ao script.</div>'
    : c.quebradoHoje ? '<div class="aviso">Recomeço conta. O estrago real seria a semana inteira.</div>' : '';
  return `<div class="contador ${cls}">
    <div class="rotulo">${esc(rotulo)}</div>
    <div class="valor num">${c.streak}<small> dias</small></div>
    <div class="sub">recorde ${c.recorde} · ${c.limpos30}/${c.janela} últimos dias limpos${c.recuperacoes ? ` · ${c.recuperacoes} deslize${c.recuperacoes > 1 ? 's' : ''} absorvido${c.recuperacoes > 1 ? 's' : ''}` : ''}</div>
    ${aviso}
  </div>`;
}

function anelSVG(v, total) {
  const r = 26, c = 2 * Math.PI * r, frac = Math.min(1, v / total);
  return `<svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label="${v} de ${total} refeições">
    <circle cx="34" cy="34" r="${r}" fill="none" stroke="var(--grid)" stroke-width="6"/>
    <circle cx="34" cy="34" r="${r}" fill="none" stroke="var(--serie-1)" stroke-width="6"
      stroke-linecap="round" stroke-dasharray="${c * frac} ${c}" transform="rotate(-90 34 34)"/>
    <text x="34" y="39" text-anchor="middle" font-size="16" font-weight="650" fill="var(--ink)">${v}/${total}</text>
  </svg>`;
}

// ---------- sheets da tela Hoje ----------
function sheetRefeicao(r, statusAtual, key) {
  const box = el(`<div><h3>${esc(r.nome)} <small style="color:var(--muted);font-weight:400">${esc(r.hora)}</small></h3>
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

function sheetNoite(key) {
  let drinks = 3;
  const box = el(`<div><h3>Saí e bebi</h3>
    <p style="font-size:.8rem;color:var(--muted)">Quantos drinks? (meta do protocolo: ≤ 3 por saída)</p>
    <div class="stepper">
      <button id="menos">−</button>
      <div class="valor num" id="v">3<small> drinks</small></div>
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
// TELA EVOLUÇÃO
// ================================================================
function renderEvolucao(root) {
  const st = S.getState();
  const key = hojeKey();
  const semanas = D.semanasAteProva(key);
  const fase = D.fase(key);
  const faseTxt = { deficit: `cutting leve até ${fmtData(FIM_DEFICIT)} · depois manutenção`, manutencao: 'manutenção — pico de corrida', carga: '★ semana da prova — carga de carbo', prova: '🏁 dia de prova' }[fase];

  root.append(el(`<div class="card hero">
    <div class="n num">${semanas}</div>
    <div class="l">semanas até a Volta da Pampulha · 06/12/2026</div>
    <div class="fase">${esc(faseTxt)}</div>
  </div>`));

  // peso
  const pesos = D.serie(st.events, 'weight');
  const cardPeso = el('<div class="card"><h2>Peso — a linha que importa é a média de 7 dias</h2><div class="grafico-wrap" id="g"></div><div id="rit"></div><div class="legenda" id="leg"></div></div>');
  if (pesos.length >= 2) {
    const mm = D.mediaMovel7(pesos);
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

  // métricas semanais do protocolo §4
  const m = D.metricasSemana(st.events, key);
  const b = st.settings.baseline;
  root.append(el(`<div class="card"><h2>Semana atual <small>· metas de 30 dias do protocolo</small></h2>
    <div class="tiles">
      ${tileMetrica('Delivery por impulso', m.delivery, b.delivery, 'delivery')}
      ${tileMetrica('Doces fora do plano', m.sweet, b.sweet, 'sweet')}
      ${tileMetrica('Drinks por saída', m.drinks, b.drinks, 'drinks')}
    </div>
    ${b.delivery === null ? '<p style="font-size:.72rem;color:var(--muted);margin-top:8px">Defina seu baseline em Ajustes para ativar as metas de −50%.</p>' : ''}
  </div>`));

  // heatmap de constância
  const hm = D.heatmapConstancia(st.events, key, 16);
  const cardHm = el(`<div class="card"><h2>Constância <small>· refeições no plano por dia, 16 semanas</small></h2>
    <div class="heatmap-wrap">
      <div class="heatmap-dias"><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span><span>D</span></div>
      <div class="heatmap">${hm.map((sem) => sem.dias.map((n) =>
        n === null ? '<span class="cel vazio"></span>' : `<span class="cel n${n}" title="${n}/5"></span>`).join('')).join('')}</div>
    </div>
    <div class="legenda" style="margin-top:8px"><span class="item">0</span>
      <span class="item"><span class="faixa cel n1" style="width:10px;height:10px;background:var(--seq-1)"></span></span>
      <span class="item"><span class="faixa" style="width:10px;height:10px;background:var(--seq-3)"></span></span>
      <span class="item"><span class="faixa" style="width:10px;height:10px;background:var(--seq-5)"></span></span>
      <span class="item">5/5 · semana verde = 80% (28/35), não perfeição</span></div>
  </div>`);
  root.append(cardHm);

  // agregados de recompensa
  const cDeliv = D.contadorResiliente(st.events, 'delivery', key, st.settings.startKey);
  const cDoce = D.contadorResiliente(st.events, 'sweet', key, st.settings.startKey);
  root.append(el(`<div class="card"><h2>Capital acumulado <small>· isso ninguém tira</small></h2>
    <div class="agregados">
      <div class="contador"><div class="rotulo">🌊 Ondas surfadas</div><div class="valor num">${D.ondasSurfadas(st.events)}</div><div class="sub">cravings que passaram sem vencer você</div></div>
      <div class="contador"><div class="rotulo">🁢 Dominós quebrados</div><div class="valor num">${D.dominosQuebrados(st.events, key)}</div><div class="sub">ressacas que NÃO viraram dia perdido</div></div>
      <div class="contador"><div class="rotulo">↩︎ Recuperações</div><div class="valor num">${cDeliv.recuperacoes + cDoce.recuperacoes}</div><div class="sub">deslizes que não viraram dois — never miss twice</div></div>
      <div class="contador"><div class="rotulo">🏆 Recordes</div><div class="valor num">${Math.max(cDeliv.recorde, cDoce.recorde)}<small> dias</small></div><div class="sub">maior streak (iFood ${cDeliv.recorde} · doce ${cDoce.recorde})</div></div>
    </div>
  </div>`));

  // gatilhos frequentes (dados dos chips)
  const gat = D.gatilhosFrequentes(st.events, 14, key);
  if (gat.length) {
    const max = gat[0][1];
    root.append(el(`<div class="card"><h2>Gatilhos — últimos 14 dias <small>· ataque o estressor, não o chocolate</small></h2>
      <div style="display:grid;gap:6px">${gat.map(([g, n]) => `
        <div style="display:grid;grid-template-columns:80px 1fr 24px;gap:8px;align-items:center;font-size:.8rem">
          <span style="color:var(--ink-2)">${esc(g)}</span>
          <svg height="14" width="100%" preserveAspectRatio="none" viewBox="0 0 100 14"><rect x="0" y="1" width="${(n / max) * 100}" height="12" rx="4" fill="var(--serie-1)"/></svg>
          <span class="num" style="color:var(--muted)">${n}</span>
        </div>`).join('')}</div>
      ${gat.find(([g]) => g === '15h') ? '<p style="font-size:.75rem;color:var(--warning);margin-top:8px">Pico às 15h detectado → confira o lanche das 16h. Pular a refeição da tarde é o maior preditor do ataque de doce.</p>' : ''}
    </div>`));
  }
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

  root.append(el(`<div class="rodape-nota">Pampulha · executa o Protocolo de Hábitos + Plano Nutricional (jul/2026).<br>
    Meta é tendência, não perfeição. Nunca duas vezes seguidas.</div>`));
}

// ================================================================
// render principal + navegação
// ================================================================
function render() {
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
  else if (abaAtiva === 'evolucao') renderEvolucao(root);
  else renderAjustes(root);

  document.querySelectorAll('nav.abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === abaAtiva));
}

document.querySelectorAll('nav.abas button').forEach((b) => {
  b.onclick = () => { abaAtiva = b.dataset.aba; refeicaoExpandida = null; render(); };
});
$('#sos-fab').onclick = abrirSOS;

S.onChange(render);
render();
// atalho do ícone do PWA (?sos=1) e helpers de dev/verificação
if (params.get('sos')) {
  if (SOS_SCRIPTS[params.get('sos')]) sosScript(params.get('sos'), Number(params.get('passo') || 0));
  else abrirSOS();
}
if (params.get('ressaca') && !D.ressacaDoDia(S.getState().events, hojeKey()).on) {
  S.addEvent({ type: 'hangover_on', date: hojeKey() });
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
