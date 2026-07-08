// Pampulha — painel de execução do Protocolo de Hábitos
import {
  REFEICOES, MEAL_IDS, TIPO_POR_DIA_SEMANA, METAS_DIA, TREINO_POR_DIA, GATILHOS,
  SOS_SCRIPTS, RESSACA_PASSOS, PROVA, FIM_DEFICIT, METAS_30D,
  FRASE_IDENTIDADE, AJUSTES_AMBIENTE, HORARIOS_SAIDA,
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
  S.addEvent({ type: 'sos', kind: 'doce', outcome: 'surfed', date: D.addDays(key, -3), trigger: '15h', ts: tsEm(D.addDays(key, -3), 15) });
  S.addEvent({ type: 'sos', kind: 'ifood', outcome: 'surfed', date: D.addDays(key, -2), trigger: 'preguiça', ts: tsEm(D.addDays(key, -2), 21) });
  S.addEvent({ type: 'sos', kind: 'doce', outcome: 'surfed', date: D.addDays(key, -10), trigger: 'call tensa', ts: tsEm(D.addDays(key, -10), 11) });
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

  // ---- HERO: a refeição da vez (a única decisão do momento) ----
  const rv = refeicaoDaVez(meals);
  if (rv) {
    const ouroDomingo = rv.id === 'jantar' && tipo === 'DESCANSO';
    const destaque16 = rv.id === 'lanche2' && agoraMin >= 13 * 60;
    const ajuste = rv.ajuste[tipo];
    const [rvH, rvM] = rv.hora.split(':').map(Number);
    const rotulo = agoraMin >= rvH * 60 + rvM - 45 ? 'AGORA' : 'PRÓXIMA';
    const hero = el(`<div class="card hero-refeicao ${destaque16 ? 'destaque-16h' : ''}">
      <div class="hero-rotulo">${rotulo}${destaque16 ? ' · escudo anti-doce das 15h' : ''}</div>
      <h1>${esc(rv.nome)} <span class="hora num">${esc(rv.hora)}</span></h1>
      <p class="cardapio">${esc(rv.principal)}</p>
      ${ouroDomingo ? '<span class="badge-ouro">★ Hoje o jantar é INTENSO — pré-carga do Longão. NÃO corta o carbo.</span>' : ''}
      ${ajuste && !ouroDomingo ? `<p class="ajuste-dia">Hoje (${tipo}): ${esc(ajuste)}</p>` : ''}
      <div class="hero-acoes">
        <button class="acao-primaria" id="hero-feita">✓ Feita</button>
        <button class="acao-secundaria" id="hero-opcoes">substituições / pulei / fora do plano</button>
      </div>
    </div>`);
    hero.querySelector('#hero-feita').onclick = () => {
      const e = S.addEvent({ type: 'meal', date: key, meal: rv.id, status: 'ok' });
      snackbar(`${rv.nome}: feita ✓`, () => S.removeEvent(e.id));
    };
    hero.querySelector('#hero-opcoes').onclick = () => sheetRefeicao(rv, meals[rv.id] || 'none', key);
    root.append(hero);
  } else {
    const amanha = D.parseKey(key).getDay() === 6 ? 0 : D.parseKey(key).getDay() + 1;
    root.append(el(`<div class="card hero-refeicao completo">
      <div class="hero-rotulo">DIA FECHADO</div>
      <h1>${feitas}/5 no plano ✓</h1>
      <p class="cardapio">${feitas === 5 ? 'Todas as refeições do dia. É assim que a identidade se constrói.' : 'Dia registrado por inteiro — tendência conta mais que perfeição.'}</p>
      <p class="ajuste-dia">Amanhã: ${esc(TREINO_POR_DIA[amanha])}</p>
    </div>`));
  }

  // ---- trilha compacta do dia: 5 marcadores, toque abre opções ----
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

  // ---- linha de streaks compacta (detalhe mora na Evolução) ----
  const linha = el(`<button class="linha-streaks">
    <span>🛵 <b class="num">${cDeliv.streak}</b>d sem iFood</span>
    <span>🍫 <b class="num">${cDoce.streak}</b>d sem doce</span>
    <span class="seta">→</span>
  </button>`);
  linha.onclick = () => { abaAtiva = 'evolucao'; render(); };
  root.append(linha);

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

  // rota até a Pampulha: cada semana revisada/cumprida pinta um segmento
  root.append(el(`<div class="card">
    <h2>Rota até a Pampulha <small>· ${D.semanasAteProva(key)} semanas restantes · ${esc(faseTxt)}</small></h2>
    <div class="grafico-wrap">${rotaSVG(st, key)}</div>
    <div class="legenda">
      <span class="item"><span class="faixa" style="background:var(--serie-1)"></span>semana fechada com revisão</span>
      <span class="item"><span class="ponto" style="background:var(--serie-1)"></span>você está aqui</span>
    </div>
  </div>`));

  // painel de identidade: a frase + as evidências
  const ident = D.identidadeAssinada(st.events, key);
  const cDeliv = D.contadorResiliente(st.events, 'delivery', key, st.settings.startKey);
  const cDoce = D.contadorResiliente(st.events, 'sweet', key, st.settings.startKey);
  root.append(el(`<div class="card">
    <h2>Quem os dados dizem que eu sou</h2>
    <p class="frase-identidade ${ident.assinada ? 'assinada' : ''}">“${FRASE_IDENTIDADE}”</p>
    <p class="frase-status">${ident.assinada ? '✍️ Assinada — 4 domingos de revisão seguidos.' : `Assinatura: ${ident.progresso}/4 domingos de revisão seguidos.`}</p>
    <div class="agregados">
      <div class="contador"><div class="rotulo">🌊 Ondas surfadas</div><div class="valor num">${D.ondasSurfadas(st.events)}</div><div class="sub">cravings que passaram sem vencer você</div></div>
      <div class="contador"><div class="rotulo">🁢 Dominós quebrados</div><div class="valor num">${D.dominosQuebrados(st.events, key)}</div><div class="sub">ressacas que NÃO viraram dia perdido</div></div>
      <div class="contador"><div class="rotulo">🛵 Sem iFood impulso</div><div class="valor num">${cDeliv.streak}<small> dias</small></div><div class="sub">recorde ${cDeliv.recorde} · ${cDeliv.limpos30}/${cDeliv.janela} dias limpos</div></div>
      <div class="contador"><div class="rotulo">🍫 Sem doce fora</div><div class="valor num">${cDoce.streak}<small> dias</small></div><div class="sub">recorde ${cDoce.recorde} · ${cDoce.limpos30}/${cDoce.janela} dias limpos</div></div>
      <div class="contador"><div class="rotulo">↩︎ Recuperações</div><div class="valor num">${cDeliv.recuperacoes + cDoce.recuperacoes}</div><div class="sub">deslizes que não viraram dois</div></div>
      <div class="contador"><div class="rotulo">📋 Revisões feitas</div><div class="valor num">${D.semanasComRevisao(st.events).size}</div><div class="sub">domingos de 5 minutos</div></div>
    </div>
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

  // última revisão (o que foi decidido no domingo)
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

  root.append(el(`<div class="rodape-nota">Pampulha · executa o Protocolo de Hábitos + Plano Nutricional (jul/2026).<br>
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
  b.onclick = () => { abaAtiva = b.dataset.aba; render(); };
});
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
