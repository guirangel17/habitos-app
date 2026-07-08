// Persistência local — localStorage com store JSON versionado, eventos append-only.
const KEY = 'pampulha.v1';

const vazio = () => ({
  schema: 1,
  createdAt: Date.now(),
  events: [],
  settings: {
    baseline: { delivery: null, sweet: null, drinks: null },
    dayTypeOverrides: {},
    startKey: null, // primeira data de uso (âncora dos contadores)
    lastBackupTs: null,
  },
});

let state = null;
const listeners = [];

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : vazio();
  } catch {
    state = vazio();
  }
  if (!state.settings) state.settings = vazio().settings;
  return state;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn(state));
}

export function onChange(fn) { listeners.push(fn); }
export function getState() { return load(); }

let seq = 0;
export function addEvent(ev) {
  load();
  const e = { id: `${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`, ts: Date.now(), ...ev };
  state.events.push(e);
  save();
  return e;
}

export function removeEvent(id) {
  load();
  state.events = state.events.filter((e) => e.id !== id);
  save();
}

export function setSetting(path, value) {
  load();
  const parts = path.split('.');
  let obj = state.settings;
  for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]] = obj[parts[i]] || {};
  obj[parts[parts.length - 1]] = value;
  save();
}

export function exportJSON() {
  load();
  return JSON.stringify({ app: 'pampulha', schema: state.schema, exportedAt: new Date().toISOString(), ...state }, null, 1);
}

export function importJSON(text) {
  load();
  const data = JSON.parse(text);
  if (!Array.isArray(data.events)) throw new Error('Backup inválido: sem lista de eventos.');
  const ids = new Set(state.events.map((e) => e.id));
  let novos = 0;
  for (const e of data.events) {
    if (e && e.id && !ids.has(e.id)) { state.events.push(e); ids.add(e.id); novos++; }
  }
  state.events.sort((a, b) => a.ts - b.ts);
  if (data.settings) {
    state.settings = {
      ...state.settings,
      ...data.settings,
      baseline: { ...state.settings.baseline, ...(data.settings.baseline || {}) },
      dayTypeOverrides: { ...state.settings.dayTypeOverrides, ...(data.settings.dayTypeOverrides || {}) },
    };
  }
  save();
  return novos;
}

export async function pedirStoragePersistente() {
  try {
    if (navigator.storage?.persist) {
      const ja = await navigator.storage.persisted();
      return ja || (await navigator.storage.persist());
    }
  } catch { /* indisponível */ }
  return false;
}
