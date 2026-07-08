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
