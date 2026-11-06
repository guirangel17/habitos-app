// Dados estáticos do plano — transcritos de ~/dieta/Dieta-Resumo-Rapido.md
// e ~/habitos/Protocolo-Habitos.md. Fonte da verdade são os MDs; aqui é execução.

export const PROVA = '2026-12-06'; // Volta da Pampulha 18k
export const FIM_DEFICIT = '2026-10-04'; // a partir de 05/10: manutenção
export const CARGA_CARBO = ['2026-12-04', '2026-12-05'];

// 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb
export const TIPO_POR_DIA_SEMANA = [
  'DESCANSO', 'INTENSO', 'MODERADO', 'INTENSO', 'INTENSO', 'MODERADO', 'LEVE',
];

export const METAS_DIA = {
  deficit: {
    INTENSO:  { kcal: '~2.550', p: '170–180 g', c: '~320 g', g: '~60 g' },
    MODERADO: { kcal: '~2.350', p: '170–180 g', c: '~250 g', g: '~70 g' },
    LEVE:     { kcal: '~2.200', p: '170–180 g', c: '~210 g', g: '~70 g' },
    DESCANSO: { kcal: '~2.100', p: '170–180 g', c: '~175 g', g: '~80 g' },
  },
  manutencao: {
    INTENSO:  { kcal: '~2.700–2.800', p: '170–180 g', c: 'alto', g: '~60 g' },
    MODERADO: { kcal: '~2.500–2.600', p: '170–180 g', c: 'médio', g: '~70 g' },
    LEVE:     { kcal: '~2.500–2.600', p: '170–180 g', c: 'médio', g: '~70 g' },
    DESCANSO: { kcal: '~2.400', p: '170–180 g', c: 'moderado', g: '~80 g' },
  },
};

export const TREINO_POR_DIA = [
  'Descanso (jantar = pré-carga do Longão)', 'Longão', 'Empurrar',
  'Tiros + Costas', 'Corrida leve + Pernas A', 'Upper C + Core', 'Pernas B preventivo',
];

// Refeições do cardápio base (dia MODERADO) com ajustes por tipo de dia.
export const REFEICOES = [
  {
    id: 'cafe', nome: 'Café da manhã', hora: '07:00', horaFim: '09:30',
    kcal: '~470 kcal · P30 C50 G15',
    principal: '3 ovos mexidos + 2 fatias de pão integral + 1 banana + café s/ açúcar',
    subs: [
      'Mingau proteico: 40 g aveia + 1 scoop whey + 200 ml leite desnatado + canela + ½ banana',
      'Crepioca (2 ovos + 30 g goma) + 30 g queijo minas light + 1 fruta',
    ],
    ajuste: { DESCANSO: 'Corta o pão — troca por +1 ovo ou 50 g de abacate.' },
  },
  {
    id: 'lanche1', nome: 'Lanche da manhã', hora: '10:00', horaFim: '11:30',
    kcal: '~300 kcal · P30 C30 G6',
    principal: 'Iogurte natural desnatado (170 g) + 1 scoop whey + 1 maçã',
    subs: [
      'Shake: 1 scoop whey + 1 banana + 15 g aveia, batido com água e gelo',
      '1 iogurte proteico pronto + 1 fruta + 3 castanhas',
    ],
    ajuste: {},
  },
  {
    id: 'almoco', nome: 'Almoço', hora: '12:30', horaFim: '14:30',
    kcal: '~620 kcal · P50 C65 G14',
    principal: '140 g frango grelhado + 150 g arroz + 80 g feijão + salada + azeite',
    subs: [
      'Proteína: 140 g patinho moído OU 180 g tilápia (mesmos acompanhamentos)',
      'Carbo: troque o arroz por 250 g batata-doce OU 180 g macarrão',
    ],
    ajuste: {
      INTENSO: 'Arroz 150 → 250 g (ou batata-doce 250 → 400 g).',
      LEVE: 'Arroz 150 → 100 g (ou batata-doce 250 → 150 g).',
      DESCANSO: 'Arroz 150 → 100 g.',
    },
  },
  {
    id: 'lanche2', nome: 'Lanche da tarde', hora: '16:00', horaFim: '18:00',
    kcal: '~380 kcal · P30 C45 G9', preTreino: true,
    principal: 'Sanduíche: 2 fatias pão integral + 100 g frango desfiado c/ requeijão light + 1 fruta',
    subs: [
      '“Sobremesa fit”: 1 banana + 20 g pasta de amendoim + 1 scoop whey com água',
      'Tapioca (50 g goma) + 1 ovo + 2 fatias peito de peru',
    ],
    ajuste: { DESCANSO: 'Corta a fruta.' },
  },
  {
    id: 'jantar', nome: 'Jantar', hora: '20:30', horaFim: '22:30',
    kcal: '~580 kcal · P45 C55 G16',
    principal: '140 g patinho/alcatra + 200 g batata-doce + legumes + 20 g chocolate 70%',
    subs: [
      'Omelete de forno (3 ovos + 2 claras + queijo minas + tomate) + 150 g arroz + salada',
      '170 g tilápia ou salmão + 250 g purê de batata + legumes no vapor',
    ],
    ajuste: {
      INTENSO: 'Batata-doce 200 → 300 g.',
      DESCANSO: '★ NÃO CORTA — carbo ALTO: 200 g arroz ou 300 g batata-doce (pré-carga do Longão).',
    },
  },
];

export const MEAL_IDS = REFEICOES.map((r) => r.id);

// Tags de gatilho (Protocolo 2C — o post-it digital)
export const GATILHOS = ['bug', 'call tensa', 'tédio', '15h', 'preguiça', 'social', 'outro'];

// Scripts do cartão de emergência (Protocolo §5) — um passo por tela
export const SOS_SCRIPTS = {
  ifood: {
    titulo: 'Vontade de iFood',
    nomeacao: 'Não é fome — é fadiga de decisão. O jantar bom está a 5 minutos.',
    passos: [
      { t: 'Coma 1 iogurte com whey AGORA', d: 'Antes de qualquer decisão. Proteína no estômago tira ~80% da força do craving.' },
      { t: 'Ligue o micro-ondas com a porção de frango congelada', d: 'Prateleira de emergência: frango + arroz congelados, 3 minutos. Zero decisões.' },
      { t: 'Agora surfe a onda — 10 minutos', d: 'Ainda quiser depois de comer? Pode pedir. O protocolo permite — de propósito, não por impulso.' },
    ],
  },
  doce: {
    titulo: 'Ansiedade + vontade de doce',
    nomeacao: 'Diga em voz baixa: “isso é ansiedade, não fome”.',
    passos: [
      { t: 'Suspiro fisiológico — 5 ciclos', d: '2 inspirações pelo nariz (longa + curta em cima) e expiração looonga pela boca. É o freio mais rápido do sistema nervoso.', breathing: true },
      { t: 'Um copo d’água', d: 'Resposta oral/motora que o gatilho de ansiedade pede — sem o crash do açúcar.' },
      { t: 'Opcional: 15 agachamentos ou 5 min longe da tela', d: 'Contração curta e intensa descarrega cortisol de verdade. Você é atleta — use isso.' },
      { t: 'Agora surfe a onda — 10 minutos', d: 'A vontade sobe, faz pico e desce sozinha. Você não resiste para sempre; espera 10 minutos.' },
    ],
  },
};

export const RESSACA_PASSOS = [
  { id: 'agua', t: '500–700 ml de água + eletrólitos', d: 'Isotônico ou água com pitada de sal e limão. Beba sem negociar. Depois, café.' },
  { id: 'cafe', t: 'Café da manhã fixo: ovos mexidos + pão + fruta + sal normal', d: 'Salgado, proteico, carbo simples — exatamente o que a ressaca pede quando pede junk. Você entrega de forma controlada.' },
  { id: 'caminhada', t: 'Caminhada leve de 20–30 min no sol', d: 'Sem pace, sem culpa — não é treino. Luz + movimento tiram você do sofá, e o sofá é onde a ressaca vira delivery.' },
];

// Metas do sistema de acompanhamento (Protocolo §4)
export const METAS_30D = { delivery: 0.5, sweet: 0.5, drinks: 3 }; // -50%, -50%, ≤3

// Frase de identidade (Clear: hábito é identidade — Protocolo §4/3A)
export const FRASE_IDENTIDADE = 'Sou um atleta que sai com os amigos e treina bem.';

// Ajustes de AMBIENTE para a revisão de domingo (§4: ajuste o ambiente, não a força de vontade)
export const AJUSTES_AMBIENTE = [
  'Repor a prateleira de emergência (frango + arroz congelados em porções)',
  'Tirar doce do alcance do braço (mesa, gaveta, mochila)',
  'Deixar o kit 2-minutos visível (crepioca / iogurte+whey no balcão)',
  'Bloquear 10 min de buffer entre calls na agenda',
  'Desinstalar o app de delivery de novo / apagar cartão salvo',
  'Trocar um bar da semana por social run / almoço / churrasco',
  'Garrafa de água sempre cheia na mesa de trabalho',
];

// Opções de horário-limite do Contrato da Noite (Protocolo 3A)
export const HORARIOS_SAIDA = ['23:00', '00:30', '02:00', 'sem limite'];

// ---- TREINO (de ~/treino-pampulha/plano-hibrido-pampulha.md) ----

// Musculação por dia da semana (0=Dom … 6=Sáb)
export const GYM_POR_DIA = [
  null,
  null,
  'Empurrar — peito/ombro/tríceps (~19 séries)',
  'Puxar — costas/bíceps (~18 séries, RIR 1-2 na barra)',
  'Pernas A — dia pesado único (~21 séries, após a corrida)',
  'Upper C + Core (~16 séries + core)',
  'Pernas B — preventivo/leve (RIR 3-4, protege o longão)',
];

// Calendário de corrida consolidado (Seção 7 do plano) — [data, tipo, descrição]
// tipo: prova | longo | tiros | tempo | social | leve
export const CORRIDAS = [
  ['2026-07-05', 'prova', 'PROVA 5 km ⚡ — soltar o corpo, sem cobrança de pace'],
  ['2026-07-08', 'leve', '5 km leve — cadência 165+ spm'],
  ['2026-07-09', 'social', 'Social Run 5 km regenerativo'],
  ['2026-07-13', 'longo', 'LONGO 10 km (Z2)'],
  ['2026-07-15', 'tiros', 'Fartlek 6 × 400 m a 5:35–5:50 — rec. trote leve'],
  ['2026-07-16', 'social', 'Social Run 5 km leve'],
  ['2026-07-20', 'longo', 'LONGO 12 km (Z2)'],
  ['2026-07-22', 'tiros', 'Fartlek 6 × 400 m a 5:35–5:50 — rec. trote leve'],
  ['2026-07-23', 'social', 'Social Run 5 km leve'],
  ['2026-07-27', 'longo', 'LONGO 12 km (Z2)'],
  ['2026-07-29', 'tiros', 'TESTE 5 km contrarrelógio — define os paces de agosto'],
  ['2026-07-30', 'social', 'Social Run 5 km leve'],
  ['2026-08-03', 'longo', 'LONGO 12 km — últimos 2 km em ritmo de prova'],
  ['2026-08-05', 'tiros', '5 × 800 m em ritmo de 5 km — rec. 2 min ativa'],
  ['2026-08-06', 'social', 'Social Run 5 km Z1 + 4 strides de 100 m'],
  ['2026-08-10', 'longo', 'LONGO 13 km — últimos 2 km em ritmo de prova'],
  ['2026-08-12', 'tiros', '5 × 800 m ritmo de 5 km — rec. 2 min ativa'],
  ['2026-08-13', 'social', 'Social Run 5 km regenerativo'],
  // ---- Reestruturado em 13/08/2026 por FASCITE PLANTAR (diagnóstico 12/08). Ver TODO v7.27. ----
  // Janela sem impacto de 17/08 a 04/09 (cai em cima das viagens, que já furavam o bloco),
  // retorno gradual a partir de 07/09 e TESTE de 5 km empurrado de 30/09 para 07/10.
  ['2026-08-17', 'leve', 'SEM CORRIDA — fascite: caminhada 30–40 min ou bike leve'],
  ['2026-08-19', 'leve', 'Zero impacto — bike ou corrida na água funda 30 min'],
  ['2026-08-20', 'leve', 'Zero impacto — bike/piscina + reabilitação da fáscia'],
  ['2026-08-24', 'leve', 'Zero impacto — bike ou água funda 40 min'],
  ['2026-08-26', 'leve', 'Zero impacto — bike/piscina + reabilitação da fáscia'],
  ['2026-08-27', 'leve', 'Zero impacto — bike ou água funda 30 min'],
  ['2026-08-31', 'leve', 'Zero impacto — bike/piscina + reabilitação da fáscia'],
  ['2026-09-02', 'leve', 'Zero impacto — bike ou água funda 40 min'],
  ['2026-09-03', 'leve', 'Zero impacto — último dia da janela sem corrida'],
  ['2026-09-07', 'leve', 'RETORNO 5 km em run/walk (5 min corre / 1 min anda) — regra das 24h: o placar é a dor do PRIMEIRO PASSO de amanhã de manhã, não a de hoje'],
  ['2026-09-09', 'leve', '5 km fácil contínuo — sem pace, cadência 170+ (volta pro run/walk se a manhã de terça acordou pior)'],
  ['2026-09-10', 'social', 'Social Run 5 km regenerativo — sem strides'],
  ['2026-09-14', 'longo', 'LONGO 8 km fácil — primeiro longo pós-fascite'],
  ['2026-09-16', 'leve', '6 km fácil'],
  ['2026-09-17', 'social', 'Social Run 5 km leve — sem strides'],
  ['2026-09-21', 'longo', 'LONGO 8 km fácil — repõe o de 14/09, que não aconteceu (longões andaram 1 semana)'],
  ['2026-09-23', 'tempo', 'Tempo Run 3 km a 5:46–5:56 — primeiro estímulo forte pós-fascite. Só se o longão de 21/09 saiu sem dor no primeiro passo de 22/09; senão, 5 km fácil'],
  ['2026-09-24', 'social', 'Social Run 6 km regenerativo + 4 strides de 100 m — 1ª exposição gradual ao antepé rápido'],
  ['2026-09-28', 'longo', 'LONGO 8 km fácil — o de 21/09 não aconteceu; a escada de longões recomeça aqui (maior treino desde 03/08: 6,1 km)'],
  ['2026-09-30', 'tempo', 'Tempo Run 5 km a 6:05–6:20 — checkpoint do RITMO DE PROVA (não é limiar: ignore a faixa 5:41–5:56 do guia de tempo). Se esse ritmo sair duro, os tiros de outubro calibram 10–15 s/km mais lentos'],
  ['2026-10-01', 'social', 'Social Run 6 km leve + 6 strides de 100 m — mantém o antepé exposto antes do tempo run de 07/10'],
  ['2026-10-05', 'longo', 'LONGO 10 km (academia: metade das séries) — segundo degrau da escada'],
  ['2026-10-07', 'tempo', 'Tempo Run 4 km a 6:05–6:20 — CALIBRA A PROVA DE 10 KM de 18/10: o pace que sair aqui é o que você leva para os primeiros 5 km de lá. Se sair duro, desce 10–15 s/km na prova e nos tiros de outubro'],
  ['2026-10-08', 'social', 'Social Run 4-5 km CONTÍNUO, sem strides — o único que o médico liberou (07/10). Contínuo importa: o formato social normal tem ~27% do tempo parado e cada re-arranque é trabalho concentrado de quadríceps'],
  // ---- Reestruturado em 07/10/2026 pelo ORTOPEDISTA (joelho). Ver TODO v7.36. ----
  // Hipótese dele: síndrome da dor patelofemoral OU condromalácia patelar — a ressonância
  // decide (a 2ª implica infiltração além do fortalecimento). Conduta até o resultado:
  // PARAR de correr, mantendo só o social (negociado na consulta), e manter perna na academia
  // com AMPLITUDE REDUZIDA. A escada de longões e as duas provas de outubro saem.
  ['2026-10-12', 'leve', 'Zero impacto — bike ou natação 30-40 min. Corrida parada por ordem médica até a ressonância'],
  ['2026-10-14', 'leve', 'Zero impacto — bike/natação 40 min. Aqui era o LONGO 12 km'],
  ['2026-10-15', 'social', 'Social Run — o ÚNICO que o médico liberou. Curto (4-5 km) e CONTÍNUO: o formato social normal tem ~27% do tempo parado, e cada re-arranque é trabalho concentrado de quadríceps. Sem strides'],
  ['2026-10-18', 'leve', 'PROVA DE 10 KM CANCELADA — corrida parada por ordem médica. Zero impacto no lugar'],
  ['2026-10-19', 'leve', 'Zero impacto — bike ou natação 30 min'],
  ['2026-10-21', 'leve', 'Zero impacto — bike/natação 40 min. Aqui era o LONGO 14 km'],
  ['2026-10-22', 'social', 'Social Run 4-5 km contínuo, sem strides'],
  ['2026-10-24', 'leve', 'PROVA DE 5 KM CANCELADA — corrida parada por ordem médica'],
  ['2026-10-26', 'leve', 'Zero impacto — bike/natação 40 min. Aqui era o LONGO 16 km'],
  ['2026-10-28', 'leve', 'Zero impacto — bike ou natação 30-40 min. Aqui eram os 5 × 1 km'],
  ['2026-10-29', 'social', 'Social Run 4-5 km contínuo, sem strides'],
  ['2026-11-02', 'leve', 'Zero impacto — corrida parada por ordem médica (a Volta Completa de 18 km saiu)'],
  ['2026-11-04', 'leve', 'Zero impacto — bike ou natação 30-40 min'],
  ['2026-11-05', 'social', 'Social Run 4-5 km contínuo, sem strides'],
  // ---- Replanejado em 06/11/2026: objetivo virou só COMPLETAR os 18 km. Ver TODO v7.38. ----
  // Joelho melhorando, fisio terminando. O corte da prova é 2h30 (regulamento 2026, item 5.c)
  // e vale em qualquer ponto do percurso (5.d) — andar grande parte não cabe. Método: corre/anda
  // 4:1 desde o km 0, longões de segunda 7 → 10 → 13, social de quinta e bike na quarta.
  ['2026-11-09', 'longo', 'LONGÃO 7 km CORRE/ANDA 4:1 — 4 min correndo a ~7:00 + 1 min andando rápido, desde o km 0. Regra do joelho: até 3/10 de dor durante, e a manhã seguinte não pode estar pior. Se piorar, repete este degrau na semana que vem'],
  ['2026-11-11', 'leve', 'Zero impacto — bike 30-40 min'],
  ['2026-11-12', 'social', 'Social Run 5 km contínuo, sem strides'],
  ['2026-11-16', 'longo', 'LONGÃO 10 km CORRE/ANDA 4:1 — mesmo ritmo do de 7 km. Leve o gel e teste no km 6, como na prova'],
  ['2026-11-18', 'leve', 'Zero impacto — bike 30-40 min'],
  ['2026-11-19', 'social', 'Social Run 5 km contínuo, sem strides'],
  ['2026-11-23', 'longo', 'LONGÃO 13 km CORRE/ANDA 4:1 — o maior do ciclo e o ensaio geral: horário da largada, café 3h antes, gel nos km 6 e 12. Média até ~7:40/km = os 18 km cabem no corte com folga'],
  ['2026-11-25', 'leve', 'Zero impacto — bike 30 min'],
  ['2026-11-26', 'social', 'Social Run 5 km leve, contínuo'],
  ['2026-11-30', 'leve', '6 km CORRE/ANDA 4:1 solto — último treino com alguma duração'],
  ['2026-12-02', 'leve', '3 km ativação — trote leve + 3 acelerações curtas'],
  ['2026-12-06', 'prova', '🏅 VOLTA INTERNACIONAL DA PAMPULHA — 18 KM — objetivo: COMPLETAR. Corre/anda 4:1, alvo ~2h15 (corte 2h30)'],
];

export const TIPO_CORRIDA_ICONE = { prova: '🏅', longo: '🏃', tiros: '⚡', tempo: '⏱️', social: '👥', leve: '🌤️' };

// Marcos dos contadores (estilo SugarCut: próximo marco vira a meta do anel)
export const MARCOS_DIAS = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 150];

// Treinos de musculação completos (Seção 2 do plano) — por dia da semana
export const GYM_TREINOS = {
  2: [
    ['Supino Reto (barra ou halter)', '4 × 9-11'],
    ['Supino Inclinado (halteres)', '3 × 9-11'],
    ['Desenvolvimento Máquina', '3 × 9-11'],
    ['Elevação Lateral (halteres)', '3 × 10-12'],
    ['Tríceps Pulley (barra reta)', '3 × 9-11'],
    ['Tríceps Testa', '3 × 9-11'],
  ],
  3: [
    ['Barra Fixa ou Puxada Alta', '4 × 9-11', 'RIR 1-2, sem falha'],
    ['Remada Baixa (triângulo)', '3 × 9-11'],
    ['Remada Máquina (apoiada)', '3 × 9-11'],
    ['Crucifixo Inverso', '3 × 10-12'],
    ['Rosca Direta (halteres)', '3 × 9-11'],
    ['Rosca Martelo', '2 × 10-12'],
  ],
  4: [
    ['V-Squat ou Leg Press', '4 × 8-10', 'RIR 2'],
    ['Elevação Pélvica', '3 × 8-12'],
    ['Afundo com Step ou Búlgaro', '3 × 10-12', 'o mais transferível para corrida — não pule'],
    ['Cadeira Flexora', '3 × 10-12'],
    ['Stiff', '2-3 × 10-12', 'RIR 3 nas semanas de tiro forte'],
    ['Panturrilha em Pé', '3 × 10-12'],
    ['Tibial Anterior', '3 × 15-20'],
  ],
  5: [
    ['Crossover ou Supino Inclinado (halteres)', '3 × 10-15'],
    ['Desenvolvimento com Halteres', '3 × 8-10'],
    ['Elevação Lateral (polia)', '3 × 12-15'],
    ['Face Pull', '3 × 12-15'],
    ['Tríceps Francês (corda)', '2 × 10-12'],
    ['Rosca Scott', '2 × 10-12'],
    ['Core: Abdominal Polia', '3 × 12-15'],
    ['Core: Pallof Press', '3 × 10/lado'],
  ],
  6: [
    ['Abdução de Quadril ou Monster Walk', '3 × 12-15', 'protege o joelho'],
    ['Copenhagen Plank (joelho apoiado)', '3 × 20-30 s/lado', 'adutores e púbis'],
    ['Cadeira Extensora leve', '2 × 12-15', 'tendão patelar'],
    ['Panturrilha Sentado', '4 × 12-15', 'sóleo — o músculo mais exigido na corrida'],
    ['Tibial Anterior', '3 × 15-20', 'canela'],
    ['Prancha Lateral com Abdução', '3 × 30 s/lado', 'glúteo médio + core'],
  ],
};

// Fases do dia de PERNA (quinta) — [inicio, fim, rotulo, exercicios]
// FONTE ÚNICA das fases: o relógio (garmin/treinos_forca.py) monta a agenda a partir destas
// mesmas datas, e o app monta o detalhe da quinta daqui. Até a v7.29 os dois tinham listas
// próprias: o relógio entrou em Força Máxima em 03/09 enquanto o app seguia mostrando 4 × 8-10
// de hipertrofia — ele viu a diferença na quinta de 17/09. Mexeu numa, mexa na outra.
// GYM_TREINOS[4] continua valendo como base (hipertrofia, até 27/08).
export const GYM_PERNA_FASES = [
  ['2026-09-03', '2026-10-01', 'Força Máxima', 'Compostos 4-5 × 4-6 a 80-87%, descanso 2-3 min, RIR 2 — nunca à falha. Isoladores 10-12.', [
    ['V-Squat ou Leg Press PESADO 80-87%', '5 × 5', 'RIR 2 — descanso 3 min. TETO DE RAMPA: +10% de carga por semana sobre a sessão anterior, nunca mais. Em 24/09/2026 o leg press pulou de 30 kg (máximo da semana anterior) para 70 kg — +133% num dia, e 75% acima do recorde do ano — e 4 dias depois apareceu a dor femoropatelar no joelho. A porcentagem de 1RM aqui diz ONDE chegar, não em quantas semanas: partindo de 40 kg, 80-87% real leva ~8 semanas de rampa.'],
    ['Elevação Pélvica pesada', '4 × 6'],
    ['Búlgaro', '3 × 8', 'o mais transferível para corrida — não pule'],
    ['Cadeira Flexora', '3 × 10'],
    ['Panturrilha em Pé', '4 × 10'],
    ['Tibial Anterior', '3 × 15'],
  ]],
  // 08/10/2026 (TODO v7.37): o deload existia pra deixar perna fresca pro teste de 5 km de
  // 07/10, que saiu na v7.32 — já estava obsoleto antes do joelho. A manutenção de outubro
  // tinha Búlgaro e leg press pesado, contraindicados. Os dois viram esta fase. Espelha
  // CATALOGO_FORCA/FASES_PERNA em garmin/treinos_forca.py — mexeu numa, mexa na outra.
  // 06/11/2026 (v7.38): estendida até a prova no lugar do Polimento (leg press pesado 3 × 5),
  // que não cabe com joelho em reabilitação. Perna, até 06/12, é o que a fisio passar.
  ['2026-10-08', '2026-11-26', 'Joelho — amplitude reduzida', 'Joelho em reabilitação (conflito femoropatelar): perna com amplitude reduzida até a prova. Prioridade invertida — glúteo médio e abdutores vêm primeiro, porque são o tratamento, não acessório. Carga leve, repetições altas, NADA de dor durante. O que a fisio passar tem precedência sobre esta lista.', [
    ['Abdução de Quadril ou Monster Walk', '3 × 15', 'o tratamento — glúteo médio. Vem primeiro de propósito'],
    ['Prancha Lateral com Abdução', '3 × 30 s/lado', 'glúteo médio + core'],
    ['Elevação Pélvica', '3 × 10', 'dominante de quadril, joelho parado — zero carga na patela'],
    ['Cadeira Flexora', '3 × 12', 'posterior, não carrega a patela'],
    ['Leg Press AMPLITUDE PARCIAL', '3 × 10', '~30 kg (o patamar estável de julho a setembro, NÃO os 70 kg de 24/09). Pare bem antes de 60-70° de joelho dobrado: é onde a força na articulação femoropatelar dispara'],
    ['Panturrilha Sentado', '3 × 13', 'sóleo — o músculo mais exigido na corrida'],
    ['Tibial Anterior', '3 × 18', 'canela, e serve à fáscia'],
  ]],
  // FORA desta fase, de propósito: Búlgaro e Afundo (flexão profunda unilateral sob carga),
  // Cadeira Extensora (cadeia aberta — é exatamente o movimento que dói) e Stiff.
];

// Periodização da musculação (Seção 3) — nota por mês
export const GYM_FASE_POR_MES = {
  7: 'Fase: Hipertrofia (8-12 reps).',
  8: 'Fase: Hipertrofia (8-12 reps). Deload na semana de 31/08: mesmas cargas, metade das séries.',
  // RE-ENTRADA (v7.28): força máxima não pode ser a 1ª semana de volta de ~3 semanas sem treinar
  // (12/08 a 06/09). 80-87% de um 1RM velho é carga que ele não tem hoje, e a DOMS da 1ª sessão
  // pesada de perna cairia justo no Longão de segunda. Duas semanas de re-entrada e o bloco de
  // força máxima começa em 21/09 — sem custo nenhum pro plano, que só cobra força em outubro.
  9: 'Fase: RE-ENTRADA nas semanas de 07/09 e 14/09 — mesmos exercícios, ~70-75% da carga de agosto, 8-10 reps, RIR 3, sem falha e sem sessão até a exaustão. De 21/09 em diante: Força Máxima (no relógio o bloco pesado começou em 03/09 — ver v7.30) — compostos 4-5 × 4-6 a 80-87%, descanso 2-3 min, RIR 2; isoladores 10-12. Deload na semana de 05/10 (o do plano de corrida, que andou junto com o teste de 5 km).',
  10: 'Fase: Manutenção + Potência — compostos 3 × 3-5 pesado (volume −40%) + pliometria leve 2×/sem (40-60 contatos). Semana de 05/10 é DELOAD (metade das séries) — perna fresca pro teste de 07/10. Pliometria só depois do teste, e nunca em dia de tiro.',
  11: 'Fase: joelho em reabilitação — perna leve com amplitude reduzida (ou o que a fisio passar), superior normal. Nada de perna pesada antes da prova.',
  12: 'Semana da prova: ZERO perna. Upper leve até quarta 02/12 no máximo.',
};

// Paces e execução por tipo de corrida (Seções 4 e 5 do plano)
export const CORRIDA_GUIA = {
  longo: { pace: '6:50–7:15 /km (Z1/Z2)', fc: '≤ 152 bpm — a FC manda, não o pace', sensacao: 'Conversa completa possível', extra: 'Em novembro os longões são CORRE/ANDA 4:1: o pace vale para os 4 min correndo; o minuto andando é rápido, braço ativo.' },
  social: { pace: '6:50–7:15 /km (Z1/Z2)', fc: '≤ 152 bpm', sensacao: 'Conversa completa — é social de verdade', extra: 'Strides (quando indicados): 100 m progressivos até ~90% e solta.' },
  leve: { pace: '6:50–7:15 /km ou mais leve', fc: '≤ 152 bpm', sensacao: 'Regenerativo — errar para baixo', extra: null },
  // TEMPO RUN recalibrado em 29/07/2026 pelo mesmo teste e o mesmo método dos tiros abaixo:
  // a faixa era pace de 5 km +7 a +22 s (6:05–6:20 sobre o 5:58 submáximo), então sobre o 5:34
  // real vira 5:41–5:56. Continua ~15-20 s/km mais lento que o pace de 5 km, que é exatamente
  // onde o limiar deve cair — a FC (~163–170) segue mandando e não mudou.
  tempo: { pace: '5:41–5:56 /km contínuo', fc: '~163–170 (logo abaixo do limiar)', sensacao: 'Só frases curtas, não uma conversa', extra: 'Aquecimento: 10 min de trote. Desaquecimento: 8-10 min muito leve.' },
  // TIROS RECALIBRADOS em 29/07/2026 pelo checkpoint "TESTE 5 km contrarrelógio" (o dia que o
  // plano define como árbitro dos paces de agosto). Resultado: 5,03 km em 28:00 = 5:34/km,
  // contra o 5:58/km submáximo que ancorava a tabela anterior → tudo desce 24 s/km.
  // MÉTODO (não são valores novos inventados; é a lógica interna da própria tabela aplicada ao
  // dado novo): a tabela antiga era construída em offsets fixos sobre o pace de 5 km —
  //   1,5 km ≈ pace de 5 km (−3 a +7 s) · 800 m–1 km ≈ −13 a +2 s · 400 m ≈ −23 a −8 s
  // Os offsets foram preservados e só o ancoradouro mudou (5:58 → 5:34). Confere com a previsão
  // escrita no próprio checkpoint (data.js CHECKPOINTS): "vindo em 5:30–5:44/km, os tiros descem
  // um degrau inteiro". Ancorar no 5:34 é conservador de propósito — o teste foi a 30 °C e com os
  // km do meio segurados (splits 5:47/5:49/5:45/5:27/5:05), então o 5 km real dele é mais rápido.
  // Ao receber a tabela oficial do plano-hibrido-pampulha.md, confira contra estes valores.
  tiros: { pace: '400 m: 5:11–5:26 · 800 m–1 km: 5:21–5:36 · 1,5 km: 5:31–5:41', fc: 'Mande pelo pace (FC atrasa no tiro); 9/10 no último', sensacao: 'Forte, mas não é sprint', extra: 'Aquecimento INEGOCIÁVEL: 15 min trote + 4 × 100 m progressivos. NUNCA fique parado entre tiros — descanso ativo (trote/caminhada). Desaquecimento 8-10 min.' },
  prova: { pace: 'Corre/anda 4:1 — correndo a ~7:00, andando rápido · média ~7:26/km (≈ 2h15)', fc: 'Nos 2 primeiros km, não olhe a FC (a adrenalina infla). Depois, correndo até ~150 na primeira metade', sensacao: 'Objetivo é COMPLETAR dentro do corte de 2h30 — conversa possível nos trechos correndo', extra: 'O plano completo está no botão abaixo. Gel nos km 6 e 12, água em todo posto.' },
};

// Checkpoints do plano (plano-hibrido-pampulha.md, seção de paces): os dias que recalibram tudo.
// O app trata como evento especial — slot na véspera/dia + guia de execução + marcador nos gráficos.
export const CHECKPOINTS = [
  {
    date: '2026-07-29',
    titulo: 'TESTE 5 km contrarrelógio',
    define: 'os paces de agosto',
    alvo: '5:45–5:50 /km',
    porque: 'Seu 5 km real está subestimado (o recorde 5:58/km foi submáximo, no meio do volume da meia). O teste é o árbitro final: vindo em 5:30–5:44/km, os tiros descem um degrau inteiro.',
    passos: [
      ['🔥', 'Aquecimento inegociável', '15 min de trote + 4 × 100 m progressivos. Contrarrelógio sem aquecer = km 1 mentiroso.'],
      ['🐢', 'Km 1: o difícil é SEGURAR', 'Comece no 5:45–5:50, mesmo parecendo fácil — vai parecer. Teste não se ganha no km 1; se perde lá (igual à prova).'],
      ['⚙️', 'Km 2–3: firme e constante', 'Segure o ritmo. Frases curtas impossíveis — é assim mesmo.'],
      ['📈', 'Km 4: aperta', 'Se ainda tem perna, desce 5–10 s no pace. Se não tem, manter já é o teste certo.'],
      ['🚀', 'Último km + 400 m finais: tudo', 'Esvazia o tanque. Bônus: o pico de FC nesses 400 m revela sua FCmax REAL — depois confira no Garmin se bate com 190 e corrija se preciso.'],
    ],
    vespera: 'Hoje: jantar com carbo e dormir 7–8h. E leia o plano do teste — 2 minutos que valem o mês.',
  },
  {
    date: '2026-09-30',
    titulo: 'Tempo Run 5 km — checkpoint do alvo',
    define: 'o alvo da Pampulha',
    alvo: '6:05–6:20 /km',
    porque: 'É o teste de fogo do ritmo de prova: sustentar 6:10–6:20 confortável aqui trava a Meta A (6:15–6:25) para os 18 km.',
    passos: [
      ['🔥', 'Aquecimento', '10 min de trote leve.'],
      ['🎯', '5 km contínuos a 6:05–6:20', 'Logo abaixo do limiar (FC ~163–170). Só frases curtas. Encurtado de 6 para 5 km: é a 4ª semana de volta da fascite.'],
      ['🧠', 'A pergunta do dia', 'Está CONFORTÁVEL nesse pace? Confortável = alvo da prova travado. Sofrido = ajustamos sem drama — checkpoint existe pra isso.'],
      ['🧊', 'Desaquecimento', '8–10 min muito leve.'],
    ],
    vespera: 'Hoje: jantar com carbo e sono em dia — o dado só vale se o corpo chegar inteiro.',
  },
  // MOVIDO PARA 07/10 em 13/08/2026 por causa da FASCITE PLANTAR (diagnóstico 12/08). Um 5 km
  // contrarrelógio é carga máxima de antepé — o gesto que mais estressa a fáscia — e em 30/09
  // cairia só 3 semanas depois de voltar a correr. Em 07/10 são 4 semanas de retorno, ainda com
  // 8 semanas de prova pela frente, e a semana de DELOAD passou para 05/10 (perna fresca
  // preservada). Se o pé não estiver 100% em 07/10: tempo run controlado e calibra por baixo.
  // O bloco de tiros anda 1 semana (começa em 14/10) e ainda cabem 5 sessões antes de 02/11.
  //
  // Histórico — inserido em 05/08/2026 no lugar do "Tempo Run 4 km moderado" (a sessão de
  // qualidade mais barata do calendário). POR QUE 30/09 e não meio de setembro, na época:
  //   · setembro não tem NENHUM tiro (o bloco acaba em 26/08 e só volta em 07/10), então a
  //     faixa dos tiros não é exercitada no mês — o prazo real é "antes de 07/10", não "setembro";
  //   · viagens de 18–26/08 e 31/08–04/09 furam o bloco: testar logo depois mediria a viagem,
  //     não o preparo, e um âncora ruim é PIOR que âncora velho (travaria outubro mais lento);
  //   · 30/09 dá 4 semanas de treino consistente (07/09 em diante) e cai em semana de DELOAD
  //     (28/09), ou seja perna fresca — teste honesto;
  //   · não amassa o checkpoint de 23/09, que é pinado de propósito como ensaio de ritmo de
  //     prova e NÃO recalibra a faixa dos tiros;
  //   · fim de setembro em BH é seco/ameno — âncora justo, ao contrário dos 30 °C de 29/07.
  // O alvo 5:30–5:35 segue o mesmo método do teste anterior: começar ~11-16 s/km mais lento que
  // o resultado esperado e fechar acelerando (em 29/07 largou em 5:45–5:50 e fechou em 5:34).
  {
    date: '2026-10-07',
    titulo: 'Tempo Run 4 km — 2ª passada no ritmo de prova',
    define: 'a confiança no alvo, não os paces',
    alvo: '6:05–6:20 /km',
    porque: 'Era o TESTE de 5 km contrarrelógio. Saiu em 24/09, com a revisão dos dois meses: o último estímulo forte foi 05/08 (7 semanas), o treino mais longo desde 03/08 tem 6,1 km e três longões seguidos furaram. Contrarrelógio nessa perna é carga máxima de antepé por um âncora que sairia pessimista e travaria outubro inteiro mais lento. O âncora de 29/07 (5:34/km) segue valendo, e quem decide o alvo da prova agora é a Volta Completa de 02/11, não um teste de 5 km.',
    passos: [
      ['🦶', 'O pé continua sendo o porteiro', 'Acordou com dor no primeiro passo nesta semana? Então hoje é 5 km fácil, sem faixa de pace. Tempo run não vale uma recaída.'],
      ['🔥', 'Aquecimento', '10 min de trote leve + 4 × 100 m progressivos.'],
      ['🎯', '4 km a 6:05–6:20', 'Mesma faixa do checkpoint de 30/09, de propósito: duas exposições ao ritmo de prova valem mais que um máximo isolado. Frases curtas, sem apertar no fim.'],
      ['🧠', 'A pergunta do dia', 'Ficou mais confortável que em 30/09? Então o alvo está no caminho. Ficou pior, e os dois foram sem dor no pé? O ritmo da prova desce pra 6:40–7:00 e a gente para de fingir.'],
      ['🧊', 'Desaquecimento', '8–10 min muito leve.'],
    ],
    vespera: 'Hoje: jantar com carbo e dormir 7–8h. Semana de academia reduzida — o tempo run é a única coisa dura da semana.',
  },
  // v7.38 (06/11/2026): o dia da prova virou checkpoint para reaproveitar o slot da véspera e o
  // guia de execução — ele vai largar com o relógio em corrida LIVRE (alerta demais dá ansiedade),
  // então o plano mora SÓ aqui, para ler antes. `chamada` e `rodape` substituem os textos de
  // "recalibra os paces", que não fazem sentido numa prova.
  {
    date: '2026-12-06',
    titulo: 'Volta da Pampulha 18 km — plano de prova',
    define: 'a medalha',
    alvo: 'corre/anda 4:1 · ~7:26/km de média (≈ 2h15)',
    chamada: 'Objetivo: só completar. O plano de prova — 2 min de leitura antes de largar',
    porque: 'Um objetivo só: terminar dentro do corte. O corte é 2h30 (regulamento, item 5.c) e vale em QUALQUER ponto do percurso (5.d), então a média precisa ficar abaixo de 8:18/km a prova inteira. O plano é corre/anda 4:1 desde o km 0 mirando ~2h15, o que deixa folga mesmo se o corte for contado das 06h00 e não da sua onda.',
    passos: [
      ['☕', 'Antes da largada', 'Café 3h antes, o mesmo do longão de 13 km. Nada novo hoje: roupa, tênis e gel, tudo já testado. Confira sua onda no número de peito e chegue cedo.'],
      ['🐢', 'Largada no fundo do pelotão', 'Deixe todo mundo passar e ande o primeiro minuto. A adrenalina vai pedir 6:30/km, e é assim que o joelho se queima no km 3.'],
      ['🔁', '4 min correndo + 1 min andando, desde o km 0', 'Sem alerta no relógio: ande sempre que o tempo de prova chegar num minuto terminado em 4 ou 9 (4, 9, 14, 19…) e volte a correr no minuto seguinte. Correndo a ~7:00, leve. Andando RÁPIDO, braço ativo: é na caminhada que se ganha a folga. A pausa entra antes do cansaço, nunca depois.'],
      ['🦵', 'Passada curta', 'Passos curtos e rápidos (cadência 165+). Na descida, encurte ainda mais ou ande. Passada longa com cadência baixa foi o que carregou a patela em setembro.'],
      ['📍', 'Pontos de controle', 'Km 6 ≈ 45 min · km 12 ≈ 1h30 · chegada ≈ 2h15. Passou no km 12 com mais de 1h40? Encurte as caminhadas para 30 s. Não aumente.'],
      ['💧', 'Água e gel', 'Um gole em todo posto, mesmo sem sede: BH em dezembro esquenta rápido. Gel nos km 6 e 12, como nos longões.'],
      ['🩹', 'Se o joelho apertar', 'Primeiro passe para 3 min correndo + 1 andando. Continua? 2 + 1. Se a dor mudar o seu jeito de pisar, pare: medalha nenhuma vale meses de fisio.'],
    ],
    vespera: 'Amanhã é só completar. Jantar com carbo, roupa e número separados, despertador cedo. Leia o plano de prova: 2 minutos.',
    rodape: 'Terminou? Pega a medalha, bebe água e come alguma coisa. A análise chega sozinha no app.',
  },
];

// ---- Guia de viagem (v7.9) — modo manutenção, evidência sem sermão ----
// Cada item [título, texto]. A dica do slot da Hoje rotaciona pelo dia da viagem (determinístico).
export const VIAGEM_GUIA = [
  ['Meta de viagem = manutenção', 'Pausa planejada não é retrocesso: breaks de dieta programados não pioram o resultado final (estudo MATADOR). O ganho típico de uma viagem é 0,3–0,5 kg — e boa parte é água, não gordura.'],
  ['Proteína primeiro no café', 'SE tiver buffet, ENTÃO prato único e proteína primeiro. Segura a fome até a tarde e protege o resto do dia sem precisar pensar.'],
  ['Caminhar conta como treino', 'Turismo costuma passar de 10 mil passos — isso é um dia LEVE honesto. Não existe dívida de treino em viagem.'],
  ['Álcool é o maior driver de ganho', 'O 1×1 do contrato vale em qualquer cidade: um copo de água por drink. É a única regra de bar que sobrevive a férias.'],
  ['Treino é bônus, não dívida', 'Duas corridas curtas na semana seguram o aeróbico (menos de 2 semanas parado = perda mínima). Força aguenta 3–4 semanas sozinha. Se der, ótimo; se não der, o plano absorve.'],
  ['Never miss twice — em qualquer fuso', 'Um dia ruim de viagem não vira a viagem inteira. A PRÓXIMA refeição volta ao razoável — a regra de casa viaja com você.'],
  ['Planeje a volta antes de ir', 'Fresh start: mercado no 1º dia, corrida leve no 2º. Quem volta com a geladeira vazia decide com fome — e fome decide mal.'],
];

// ---- Promessa (v7.39): 13 semanas sem doce — momentânea, liga/desliga só por estas datas ----
// Último doce em 25/10/2026 (dom) → dia 1 = 26/10 (seg), dia 91 = 24/01/2027 (dom). Natal (24–25/12)
// é a única exceção, DENTRO das 13 semanas. Decisão dele: deslize fora do Natal RECOMEÇA as 13
// semanas (mais rígido que o never-miss-twice do resto do app — é uma promessa, escolhida por ele).
// Depois do fim + posFimDias de celebração, a Hoje volta sozinha ao card Tempo limpo.
export const PROMESSA = { ini: '2026-10-26', semanas: 13, excecoes: ['2026-12-24', '2026-12-25'], posFimDias: 3 };

// Benefícios por dia da tentativa vigente. SÓ o que tem ciência por trás, com a força da evidência e
// a população do estudo à vista (pesquisa de 06/11/2026). Ficaram de fora DE PROPÓSITO, por falta de
// evidência ou por ser outra intervenção/população: insulina/glicemia/HbA1c em não diabéticos (Hengist
// 2024: efeito mínimo), microbiota (idem), PCR/inflamação, sono e "mais energia" no longo prazo, acne
// (Smith 2007 é dieta de baixa carga glicêmica), "vício"/abstinência tipo droga (Avena 2008 = ratos),
// "paladar recalibra em 2 semanas" e "hábito em 21 dias". Não adicione item sem fonte revisada.
export const PROMESSA_BENEFICIOS = [
  { dia: 1, icone: '🦷', titulo: 'Menos ataques ácidos nos dentes',
    texto: 'Depois de cada doce, o pH da placa fica abaixo do nível crítico por ~20–60 min (curva de Stephan). Menos vezes de açúcar livre = menos cárie — a frequência pesa tanto quanto a quantidade.',
    forca: 'forte', populacao: 'revisão sistemática da OMS, várias populações',
    fonte: 'Moynihan PJ, Kelly SA. J Dent Res 2014;93(1):8-18', url: 'https://pubmed.ncbi.nlm.nih.gov/24323509/' },
  { dia: 1, icone: '⚡', titulo: 'Você não perde "pique" nenhum',
    texto: 'O "sugar rush" não existe: açúcar não melhora o humor e, na primeira hora depois, deixa as pessoas mais cansadas e menos alertas. O doce das 15h não estava te dando energia.',
    forca: 'moderada', populacao: 'meta-análise, 31 estudos, 1.259 adultos (efeito agudo)',
    fonte: 'Mantantzis K et al. Neurosci Biobehav Rev 2019;101:45-67', url: 'https://doi.org/10.1016/j.neubiorev.2019.03.016' },
  { dia: 3, icone: '🌊', titulo: 'O pior costuma ser o começo',
    texto: 'Aviso honesto, não benefício: algumas pessoas relatam vontade forte, dor de cabeça e menos concentração nos primeiros dias, e isso diminui depois. A evidência é fraca — se não sentiu nada, normal.',
    forca: 'fraca', populacao: 'estudo pequeno, sem controle: adolescentes, 3 dias sem refrigerante',
    fonte: 'Falbe J et al. Appetite 2019;133:130-137', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6488513/' },
  { dia: 10, icone: '🫀', titulo: 'Gordura no fígado pode cair rápido',
    texto: 'Trocar açúcar por amido, sem perder peso, baixou a gordura no fígado de ~7,2% para ~3,8% em 9 dias. O fígado é o primeiro órgão a responder ao açúcar — e também o primeiro a responder à falta dele.',
    forca: 'moderada', populacao: 'CRIANÇAS e adolescentes com obesidade, sem grupo controle',
    fonte: 'Schwarz JM et al. Gastroenterology 2017;153(3):743-752', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5813289/' },
  { dia: 14, icone: '🩸', titulo: 'Triglicerídeos e colesterol em queda',
    texto: 'Ensaios de 2 semanas ou mais mostram que mais açúcar sobe triglicerídeos e colesterol total/LDL — e menos açúcar faz o caminho inverso. Efeito modesto (TG ~0,11 mmol/L), mas real.',
    forca: 'moderada', populacao: 'meta-análise de ensaios em adultos (≥2 semanas)',
    fonte: 'Te Morenga LA et al. Am J Clin Nutr 2014;100(1):65-79', url: 'https://doi.org/10.3945/ajcn.113.081521' },
  { dia: 42, icone: '🫀', titulo: 'Fígado: agora em adultos',
    texto: 'Em 6 semanas cortando frutose, adultos com fígado gorduroso reduziram a gordura hepática em ~0,7 ponto percentual. Efeito pequeno, mas de ensaio randomizado duplo-cego.',
    forca: 'moderada', populacao: '44 adultos com sobrepeso e fígado gorduroso (restrição de frutose)',
    fonte: 'Simons N et al. Am J Clin Nutr 2021;113(2):391-400', url: 'https://pubmed.ncbi.nlm.nih.gov/33381794/' },
  { dia: 56, icone: '💓', titulo: 'Possível queda leve da pressão',
    texto: 'O efeito do açúcar na pressão apareceu mais nos ensaios de 8 semanas ou mais. É "possível", não garantido: quase toda a evidência vem de estudos que ADICIONARAM açúcar.',
    forca: 'fraca', populacao: 'meta-análise, 12 ensaios de pressão em adultos',
    fonte: 'Te Morenga LA et al. Am J Clin Nutr 2014;100(1):65-79', url: 'https://doi.org/10.3945/ajcn.113.081521' },
  { dia: 60, icone: '👅', titulo: 'Paladar: talvez o doce fique mais intenso',
    texto: 'Um estudo viu doces parecerem MAIS DOCES a partir do 2º–3º mês de pouco açúcar — mas o quanto as pessoas gostavam não mudou. Um ensaio maior, de 6 meses, não achou mudança nenhuma. Honesto: talvez fique mais intenso; não espere deixar de gostar.',
    forca: 'fraca', populacao: '29 adultos, 3 meses (financiado pela PepsiCo) × 180 adultos, 6 meses (com financiamento da indústria)',
    fonte: 'Wise PM et al. AJCN 2016;103(1):50-60 · Čad EM et al. AJCN 2026;123(1):101073', url: 'https://doi.org/10.1016/j.ajcnut.2025.09.041' },
  { dia: 66, icone: '🔁', titulo: 'Ponto típico do hábito automático',
    texto: 'A mediana para um comportamento novo ficar automático é ~59–66 dias — mas varia de 18 a 254 (até 335) dias entre pessoas. Os "21 dias" são mito. Repetição no mesmo contexto é o que mais acelera.',
    forca: 'moderada', populacao: '96 voluntários (Lally) · revisão de 20 estudos, 2.601 adultos (Singh)',
    fonte: 'Lally P et al. Eur J Soc Psychol 2010;40:998-1009 · Singh B et al. Healthcare 2024;12(23):2488', url: 'https://doi.org/10.3390/healthcare12232488' },
  { dia: 84, icone: '🧠', titulo: 'Menos vontade de doce',
    texto: 'A vontade de um alimento parece cair quando você o come MENOS VEZES — não só em menor quantidade. É exatamente o que a promessa faz.',
    forca: 'fraca', populacao: 'meta-análise de dietas hipocalóricas em pessoas com obesidade (outra intervenção)',
    fonte: 'Kahathuduwa CN et al. Obes Rev 2017;18(10):1090-1101', url: 'https://doi.org/10.1111/obr.12566' },
  { dia: 91, icone: '🏁', titulo: 'LDL e gordura corporal menores',
    texto: 'Em 12 semanas com menos de 5% das calorias de açúcar livre, adultos saudáveis baixaram LDL e gordura corporal. No peso, a média é ~0,8 kg a menos — mas só se as calorias do doce não voltarem por outro caminho.',
    forca: 'moderada', populacao: 'ensaio randomizado em adultos saudáveis · meta-análise de ensaios em adultos',
    fonte: 'Hengist A et al. Cell Rep Med 2024;5(8):101667 · Te Morenga L et al. BMJ 2013;346:e7492', url: 'https://doi.org/10.1016/j.xcrm.2024.101667' },
];
