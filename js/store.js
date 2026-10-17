// Estado de la app guardado en este dispositivo (localStorage).

import { emptyMonth, uid, norm, copyBudget, templateMonth, payBreakdown, receivedAmount } from './calc.js';
import { round2, CURRENCIES, setCurrency } from './format.js';

const STORAGE_KEY = 'mis-finanzas:v1';
const KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const listeners = new Set();
let saveError = null;

function initial() {
  return { version: 1, settings: { payday: 30, currency: 'USD' }, months: {}, debts: [], meta: { lastBackup: null, onboarded: false } };
}

const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? round2(v) : null);
const str = (v, max = 200) => (v == null ? '' : String(v).slice(0, max));

function sanitizeMonth(m) {
  const out = emptyMonth();
  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
  for (const k of ['ingresos', 'ahorros', 'fijos', 'deudas']) {
    out[k] = list(m?.[k]).map((it) => ({ id: str(it.id) || uid(), name: str(it.name), est: numOrNull(it.est), real: numOrNull(it.real) }));
  }
  list(m?.ingresos).forEach((it, i) => {
    const p = it.pay;
    if (p && numOrNull(p.base) > 0) {
      out.ingresos[i].pay = { base: numOrNull(p.base), extra: numOrNull(p.extra), ded: numOrNull(p.ded), dedMode: p.dedMode === 'amt' ? 'amt' : 'pct' };
    }
  });
  out.variables = list(m?.variables).map((it) => ({ id: str(it.id) || uid(), name: str(it.name), est: numOrNull(it.est) }));
  out.tx = list(m?.tx).map((t) => ({
    id: str(t.id) || uid(),
    cat: str(t.cat),
    amount: numOrNull(t.amount) ?? 0,
    date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : '',
    note: str(t.note, 500),
  }));
  out.notes = str(m?.notes, 5000);
  return out;
}

// Valida datos que vienen de un respaldo o de localStorage.
export function sanitize(raw) {
  const s = initial();
  if (!raw || typeof raw !== 'object') return s;
  const p = raw.settings?.payday;
  if (Number.isInteger(p) && p >= 1 && p <= 31) s.settings.payday = p;
  if (CURRENCIES[raw.settings?.currency]) s.settings.currency = raw.settings.currency;
  if (raw.months && typeof raw.months === 'object') {
    for (const [k, m] of Object.entries(raw.months)) if (KEY_RE.test(k)) s.months[k] = sanitizeMonth(m);
  }
  if (Array.isArray(raw.debts)) {
    s.debts = raw.debts
      .filter((d) => d && typeof d.name === 'string' && d.name.trim())
      .map((d) => ({ name: str(d.name).trim(), balance: numOrNull(d.balance), since: KEY_RE.test(d.since) ? d.since : null }))
      .filter((d) => d.balance != null && d.since);
  }
  if (typeof raw.meta?.lastBackup === 'string') s.meta.lastBackup = raw.meta.lastBackup;
  // Quien ya tenía datos no necesita la bienvenida.
  s.meta.onboarded = raw.meta?.onboarded === true || Object.keys(s.months).length > 0;
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch (e) {
    console.warn('No se pudieron leer los datos guardados', e);
  }
  return initial();
}

let state = load();
setCurrency(state.settings.currency);

export const getState = () => state;
export const getSaveError = () => saveError;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit(next) {
  if (next.settings.currency !== state.settings.currency) setCurrency(next.settings.currency);
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveError = null;
  } catch (e) {
    saveError = e;
  }
  listeners.forEach((fn) => fn(state));
}

const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

export function update(fn) {
  const draft = clone(state);
  fn(draft);
  commit(draft);
}

const monthOf = (d, key) => (d.months[key] ||= emptyMonth());

// Pide al sistema que no borre los datos de la app por falta de espacio.
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {}
}

// --- Acciones -----------------------------------------------------------------

export function saveItem(key, section, item) {
  update((d) => {
    const m = monthOf(d, key);
    const list = m[section];
    const name = item.name.trim();
    const existing = item.id && list.find((it) => it.id === item.id);
    if (section === 'variables') {
      if (existing) {
        // Renombrar la categoría también renombra sus gastos.
        if (norm(existing.name) !== norm(name)) for (const t of m.tx) if (norm(t.cat) === norm(existing.name)) t.cat = name;
        Object.assign(existing, { name, est: item.est });
      } else list.push({ id: uid(), name, est: item.est });
    } else {
      const data = { name, est: item.est, real: item.real ?? null };
      const target = existing || { id: uid() };
      Object.assign(target, data);
      if (section === 'ingresos') {
        if (item.pay) target.pay = item.pay;
        else delete target.pay;
      }
      if (!existing) list.push(target);
    }
  });
}

export function deleteItem(key, section, id) {
  update((d) => {
    const m = d.months[key];
    if (m) m[section] = m[section].filter((it) => it.id !== id);
  });
}

export function togglePaid(key, section, id) {
  update((d) => {
    const it = d.months[key]?.[section].find((x) => x.id === id);
    if (it) it.real = it.real == null ? receivedAmount(it) : null;
  });
}

export function markIncomeReceived(key) {
  update((d) => {
    for (const it of d.months[key]?.ingresos || []) if (it.real == null) it.real = receivedAmount(it);
  });
}

export function saveTx(key, tx) {
  update((d) => {
    const m = monthOf(d, key);
    const cat = tx.cat.trim();
    if (cat && !m.variables.some((v) => norm(v.name) === norm(cat)) && !m.tx.some((t) => t.id !== tx.id && norm(t.cat) === norm(cat))) {
      m.variables.push({ id: uid(), name: cat, est: null });
    }
    const data = { cat, amount: tx.amount, date: tx.date, note: tx.note.trim() };
    const existing = tx.id && m.tx.find((t) => t.id === tx.id);
    if (existing) Object.assign(existing, data);
    else m.tx.push({ id: uid(), ...data });
  });
}

export function deleteTx(key, id) {
  update((d) => {
    const m = d.months[key];
    if (m) m.tx = m.tx.filter((t) => t.id !== id);
  });
}

export function setNotes(key, notes) {
  update((d) => {
    monthOf(d, key).notes = notes;
  });
}

export function copyMonthFrom(key, fromKey) {
  update((d) => {
    const from = d.months[fromKey];
    if (!from) return;
    const copy = copyBudget(from);
    const cur = d.months[key];
    if (cur) {
      copy.tx = cur.tx;
      copy.notes = cur.notes;
      // Conserva las categorías nuevas que ya se usaron este mes.
      for (const v of cur.variables) if (!copy.variables.some((c) => norm(c.name) === norm(v.name))) copy.variables.push(v);
    }
    d.months[key] = copy;
  });
}

export function startTemplateMonth(key) {
  update((d) => {
    d.months[key] = templateMonth();
    d.meta.onboarded = true;
  });
}

// Primera vez: guarda moneda, día de pago y crea el mes con la plantilla.
export function finishOnboarding(key, { currency, payday, pay, template }) {
  update((d) => {
    d.settings.currency = currency;
    d.settings.payday = payday;
    d.meta.onboarded = true;
    if (template === 'plantilla') d.months[key] = templateMonth(pay);
  });
}

export function setCurrencyCode(code) {
  update((d) => {
    d.settings.currency = code;
  });
}

export function setOnboarded() {
  update((d) => {
    d.meta.onboarded = true;
  });
}

export function clearMonth(key) {
  update((d) => {
    delete d.months[key];
  });
}

export function importMonths(list) {
  update((d) => {
    for (const { key, month } of list) d.months[key] = clone(month);
    d.meta.onboarded = true;
  });
}

export function setDebtInfo(name, info) {
  update((d) => {
    d.debts = d.debts.filter((x) => norm(x.name) !== norm(name));
    if (info) d.debts.push({ name: name.trim(), balance: info.balance, since: info.since });
  });
}

// Cambia el nombre de una deuda en todos los meses (sirve para unir dos nombres).
export function renameDebt(oldName, newName) {
  const to = newName.trim();
  if (!to) return;
  update((d) => {
    for (const m of Object.values(d.months)) for (const it of m.deudas) if (norm(it.name) === norm(oldName)) it.name = to;
    const info = d.debts.find((x) => norm(x.name) === norm(oldName));
    if (info) {
      d.debts = d.debts.filter((x) => x === info || norm(x.name) !== norm(to));
      info.name = to;
    }
  });
}

export function setPayday(day) {
  update((d) => {
    d.settings.payday = day;
  });
}

export function markBackup() {
  update((d) => {
    d.meta.lastBackup = new Date().toISOString();
  });
}

export function replaceAll(raw) {
  const next = sanitize(raw);
  commit(next);
  return next;
}

export function resetAll() {
  // Sin la bienvenida, para poder restaurar un respaldo enseguida.
  const next = initial();
  next.meta.onboarded = true;
  next.settings.currency = state.settings.currency;
  commit(next);
}
