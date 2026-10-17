// Cálculos del presupuesto. Replican las fórmulas del Excel original:
//   Diferencia (ingresos) = Real − Estimado
//   Diferencia (resto)    = Estimado − Real
//   Real de gastos variables = suma de los gastos del tracker con esa categoría
//   Sin usar = Ingresos − (Ahorros + Gastos fijos + Gastos variables + Deudas)

import { round2, parseKey } from './format.js';

export const SECTIONS = [
  { key: 'ingresos', label: 'Ingresos', income: true, paidLabel: 'Recibido' },
  { key: 'ahorros', label: 'Ahorros', paidLabel: 'Ahorrado' },
  { key: 'fijos', label: 'Gastos fijos', paidLabel: 'Pagado' },
  { key: 'variables', label: 'Gastos variables', auto: true },
  { key: 'deudas', label: 'Deudas', paidLabel: 'Pagado' },
];
export const OUT_KEYS = ['ahorros', 'fijos', 'variables', 'deudas'];
export const sectionOf = (key) => SECTIONS.find((s) => s.key === key);

export const norm = (s) => String(s ?? '').trim().toLowerCase();

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export function emptyMonth() {
  return { ingresos: [], ahorros: [], fijos: [], variables: [], deudas: [], tx: [], notes: '' };
}

export function isMonthEmpty(m) {
  if (!m) return true;
  return SECTIONS.every((s) => !m[s.key]?.length) && !m.tx?.length && !m.notes?.trim();
}

// Filas de gastos variables con su "real" calculado. Los gastos cuya categoría
// no está en el presupuesto aparecen como filas extra (en el Excel se perdían).
export function variableRows(m) {
  const totals = new Map();
  for (const t of m.tx) totals.set(norm(t.cat), (totals.get(norm(t.cat)) || 0) + (t.amount || 0));
  const known = new Set();
  const rows = m.variables.map((it) => {
    known.add(norm(it.name));
    return { ...it, real: round2(totals.get(norm(it.name)) || 0) };
  });
  for (const t of m.tx) {
    const k = norm(t.cat);
    if (known.has(k)) continue;
    known.add(k);
    rows.push({ id: `extra:${k}`, name: t.cat?.trim() || 'Sin categoría', est: null, real: round2(totals.get(k)), extra: true });
  }
  return rows;
}

export const rowsOf = (m, key) => (key === 'variables' ? variableRows(m) : m[key]);

export function diffOf(sectionKey, it) {
  const est = it.est || 0;
  const real = it.real || 0;
  return round2(sectionKey === 'ingresos' ? real - est : est - real);
}

export function sectionTotals(m, key) {
  let est = 0;
  let real = 0;
  for (const it of rowsOf(m, key)) {
    est += it.est || 0;
    real += it.real || 0;
  }
  return { est: round2(est), real: round2(real) };
}

export function summary(m) {
  const s = {};
  for (const sec of SECTIONS) s[sec.key] = sectionTotals(m, sec.key);
  const usado = { est: 0, real: 0 };
  for (const k of OUT_KEYS) {
    usado.est += s[k].est;
    usado.real += s[k].real;
  }
  s.usado = { est: round2(usado.est), real: round2(usado.real) };
  s.sinUsar = { est: round2(s.ingresos.est - usado.est), real: round2(s.ingresos.real - usado.real) };

  // Lo que falta: renglones sin "real" registrado todavía.
  let porPagar = 0;
  for (const k of ['ahorros', 'fijos', 'deudas']) for (const it of m[k]) if (it.real == null) porPagar += it.est || 0;
  let ingresoPendiente = 0;
  for (const it of m.ingresos) if (it.real == null) ingresoPendiente += it.est || 0;
  s.porPagar = round2(porPagar);
  s.ingresoPendiente = round2(ingresoPendiente);
  // Lo que quedaría al final del mes: con el ingreso esperado y pagando lo pendiente.
  s.teQuedaria = round2(s.sinUsar.real + ingresoPendiente - porPagar);
  s.gastosCount = m.tx.length;
  return s;
}

export function hasMoney(m) {
  if (!m) return false;
  return SECTIONS.some((s) => m[s.key].some((it) => it.est || it.real)) || m.tx.some((t) => t.amount);
}

// Copia el presupuesto de un mes: mismos renglones y estimados, real en blanco.
export function copyBudget(from) {
  const m = emptyMonth();
  for (const s of SECTIONS) {
    m[s.key] = from[s.key].map((it) => (s.auto ? { id: uid(), name: it.name, est: it.est ?? null } : { id: uid(), name: it.name, est: it.est ?? null, real: null }));
  }
  return m;
}

// Mes más reciente anterior a `key` que tenga presupuesto.
export function previousBudgetKey(months, key) {
  return Object.keys(months)
    .filter((k) => k < key && !isMonthEmpty(months[k]) && SECTIONS.some((s) => months[k][s.key].length))
    .sort()
    .pop() || null;
}

export function yearSummary(months, year) {
  const rows = [];
  for (let mm = 1; mm <= 12; mm++) {
    const key = `${year}-${String(mm).padStart(2, '0')}`;
    const m = months[key];
    rows.push({ key, month: mm, has: hasMoney(m), s: m ? summary(m) : null });
  }
  const total = {};
  for (const k of [...SECTIONS.map((s) => s.key), 'usado', 'sinUsar']) {
    total[k] = { est: 0, real: 0 };
    for (const r of rows) {
      if (!r.s) continue;
      total[k].est += r.s[k].est;
      total[k].real += r.s[k].real;
    }
    total[k] = { est: round2(total[k].est), real: round2(total[k].real) };
  }
  return { rows, total };
}

export function yearsWithData(months) {
  return [...new Set(Object.keys(months).filter((k) => hasMoney(months[k])).map((k) => parseKey(k)[0]))].sort();
}

// Deudas: junta los pagos de todos los meses por nombre y, si el usuario dio un
// saldo ("debía X al inicio de tal mes"), calcula cuánto falta.
export function debtsOverview(state, refKey) {
  const map = new Map();
  const entry = (name) => {
    const k = norm(name);
    if (!map.has(k)) map.set(k, { key: k, name: name.trim(), payments: [], info: null });
    return map.get(k);
  };
  for (const key of Object.keys(state.months).sort()) {
    for (const it of state.months[key].deudas) {
      if (!it.name?.trim()) continue;
      const e = entry(it.name);
      e.name = it.name.trim();
      e.payments.push({ key, est: it.est, real: it.real });
    }
  }
  for (const d of state.debts) entry(d.name).info = d;

  // Activas: las del último mes (hasta refKey) que tenga deudas, o con saldo pendiente.
  const lastKey = Object.keys(state.months).filter((k) => k <= refKey && state.months[k].deudas.length).sort().pop();
  const lastNames = new Set((lastKey ? state.months[lastKey].deudas : []).map((it) => norm(it.name)));
  const year = parseKey(refKey)[0];

  const list = [...map.values()].map((e) => {
    const paidYear = round2(e.payments.filter((p) => parseKey(p.key)[0] === year).reduce((a, p) => a + (p.real || 0), 0));
    const paidTotal = round2(e.payments.reduce((a, p) => a + (p.real || 0), 0));
    const withEst = e.payments.filter((p) => p.est && p.key <= refKey);
    const cuota = withEst.length ? withEst[withEst.length - 1].est : e.payments.length ? e.payments[e.payments.length - 1].est || 0 : 0;
    let balance = null;
    if (e.info && e.info.balance != null) {
      const paidSince = round2(e.payments.filter((p) => p.key >= e.info.since).reduce((a, p) => a + (p.real || 0), 0));
      const remaining = round2(Math.max(e.info.balance - paidSince, 0));
      balance = {
        start: e.info.balance,
        since: e.info.since,
        paid: paidSince,
        remaining,
        progress: e.info.balance > 0 ? Math.min(paidSince / e.info.balance, 1) : 1,
        monthsLeft: remaining > 0 && cuota > 0 ? Math.ceil(remaining / cuota - 1e-9) : remaining > 0 ? null : 0,
      };
    }
    const active = lastNames.has(e.key) || (balance && balance.remaining > 0);
    return { ...e, cuota: cuota || 0, paidYear, paidTotal, balance, active };
  });
  list.sort((a, b) => (b.balance?.remaining || 0) - (a.balance?.remaining || 0) || b.cuota - a.cuota || a.name.localeCompare(b.name));
  const totalRemaining = round2(list.reduce((a, d) => a + (d.balance?.remaining || 0), 0));
  const paidYear = round2(list.reduce((a, d) => a + d.paidYear, 0));
  return { active: list.filter((d) => d.active), past: list.filter((d) => !d.active), totalRemaining, paidYear, year };
}

// Días que faltan para el pago (día `payday`, o el último día si el mes es más corto).
export function paydayInfo(payday, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  let day = Math.min(payday, dim);
  let target = new Date(y, m, day);
  if (today.getDate() > day) {
    const dim2 = new Date(y, m + 2, 0).getDate();
    target = new Date(y, m + 1, Math.min(payday, dim2));
  }
  const start = new Date(y, m, today.getDate());
  const days = Math.round((target - start) / 86400000);
  return { days, date: target };
}
