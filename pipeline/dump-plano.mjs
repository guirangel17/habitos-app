// Dump do plano de corridas (data.js → JSON) para o pipeline python.
// Mantém data.js como fonte única do calendário — zero duplicação.
// Uso: node pipeline/dump-plano.mjs > pipeline/plano.json
import { CORRIDAS, CORRIDA_GUIA, PROVA } from '../data.js';
process.stdout.write(JSON.stringify({ CORRIDAS, CORRIDA_GUIA, PROVA }));
