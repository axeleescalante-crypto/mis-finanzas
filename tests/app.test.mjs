// Pruebas con datos inventados (nunca con datos reales). Correr: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from '../vendor/fflate.js';
import { summary, variableRows, copyBudget, debtsOverview, paydayInfo, emptyMonth } from '../js/calc.js';
import { parseAmount, shiftKey } from '../js/format.js';
import { buildWorkbook } from '../js/xlsx-export.js';

function month() {
  const m = emptyMonth();
  m.ingresos = [{ id: 'i1', name: 'Salario', est: 1000, real: 1000 }];
  m.ahorros = [{ id: 'a1', name: 'Emergencia', est: 100, real: null }];
  m.fijos = [
    { id: 'f1', name: 'Alquiler', est: 300, real: 300 },
    { id: 'f2', name: 'Internet', est: 25.5, real: null },
  ];
  m.variables = [{ id: 'v1', name: 'Gasolina', est: 80 }];
  m.deudas = [{ id: 'd1', name: 'Carro', est: 125, real: 125 }];
  m.tx = [
    { id: 't1', cat: 'Gasolina', amount: 40, date: '2026-05-02', note: '' },
    { id: 't2', cat: 'gasolina ', amount: 10.1, date: '2026-05-09', note: '' },
    { id: 't3', cat: 'Cine', amount: 12, date: '2026-05-10', note: '' },
  ];
  return m;
}

test('resumen igual que las fórmulas del Excel', () => {
  const s = summary(month());
  assert.deepEqual(s.ingresos, { est: 1000, real: 1000 });
  assert.deepEqual(s.fijos, { est: 325.5, real: 300 });
  assert.deepEqual(s.variables, { est: 80, real: 62.1 });
  assert.deepEqual(s.sinUsar, { est: 1000 - (100 + 325.5 + 80 + 125), real: 1000 - (300 + 62.1 + 125) });
  assert.equal(s.porPagar, 125.5);
  assert.equal(s.teQuedaria, s.sinUsar.real - 125.5);
});

test('gastos sin categoría en el presupuesto no se pierden', () => {
  const rows = variableRows(month());
  assert.equal(rows.find((r) => r.name === 'Gasolina').real, 50.1);
  const extra = rows.find((r) => r.extra);
  assert.equal(extra.name, 'Cine');
  assert.equal(extra.real, 12);
});

test('el ingreso pendiente cuenta para lo que quedaría', () => {
  const m = month();
  m.ingresos[0].real = null;
  const s = summary(m);
  assert.equal(s.ingresoPendiente, 1000);
  assert.equal(s.teQuedaria, Math.round((0 - 487.1 + 1000 - 125.5) * 100) / 100);
});

test('copiar presupuesto deja lo real en blanco', () => {
  const c = copyBudget(month());
  assert.equal(c.fijos.length, 2);
  assert.ok(c.fijos.every((it) => it.real === null));
  assert.equal(c.tx.length, 0);
  assert.equal(c.variables[0].est, 80);
});

test('deudas: saldo restante y meses que faltan', () => {
  const state = { months: { '2026-05': month(), '2026-06': month() }, debts: [{ name: 'Carro', balance: 1000, since: '2026-06' }] };
  const ov = debtsOverview(state, '2026-06');
  const carro = ov.active.find((d) => d.name === 'Carro');
  assert.equal(carro.balance.remaining, 875);
  assert.equal(carro.balance.monthsLeft, 7);
  assert.equal(carro.paidYear, 250);
});

test('día de pago en febrero cae el último día', () => {
  const info = paydayInfo(30, new Date(2026, 1, 20));
  assert.equal(info.date.getDate(), 28);
  assert.equal(info.days, 8);
  assert.equal(paydayInfo(30, new Date(2026, 9, 30)).days, 0);
});

test('montos escritos de varias formas', () => {
  assert.equal(parseAmount('2,345.60'), 2345.6);
  assert.equal(parseAmount('19,95'), 19.95);
  assert.equal(parseAmount('$ 30'), 30);
  assert.equal(parseAmount('abc'), null);
  assert.equal(shiftKey('2026-01', -1), '2025-12');
});

test('la exportación produce un .xlsx con todas las hojas', () => {
  const state = { months: { '2026-05': month() }, debts: [], settings: { payday: 30 }, meta: {} };
  const files = unzipSync(buildWorkbook(state));
  const wb = strFromU8(files['xl/workbook.xml']);
  assert.match(wb, /Resumen 2026/);
  assert.match(wb, /May 2026/);
  assert.match(wb, /Deudas/);
  assert.ok(files['xl/worksheets/sheet2.xml']);
});

test('plantilla sugerida para empezar desde cero', async () => {
  const { templateMonth } = await import('../js/calc.js');
  const m = templateMonth({ base: 1000, extra: null, ded: 20, dedMode: 'pct' });
  assert.equal(m.ingresos[0].est, 800);
  assert.equal(m.ingresos[0].pay.base, 1000);
  assert.ok(m.fijos.length >= 5 && m.variables.length >= 4);
  assert.ok(m.fijos.every((it) => it.est === null && it.real === null));
  assert.equal(summary(m).porPagar, 0);
});

test('monedas y montos con formato europeo', async () => {
  const { setCurrency, fmt, fmtCompact } = await import('../js/format.js');
  setCurrency('GTQ');
  assert.match(fmt(1500), /Q/);
  assert.match(fmtCompact(1500), /^Q1\.5K$/);
  setCurrency('EUR');
  assert.match(fmt(10), /€/);
  setCurrency('USD');
  assert.equal(fmt(1500), '$1,500.00');
  assert.equal(parseAmount('2.345,60'), 2345.6);
  assert.equal(parseAmount('Q 150'), 150);
});

test('salario variable: base + horas extra − descuentos', async () => {
  const { payBreakdown, receivedAmount, copyBudget } = await import('../js/calc.js');
  const pct = payBreakdown({ base: 1000, extra: 200, ded: 10, dedMode: 'pct' });
  assert.deepEqual(pct, { base: 1000, extra: 200, gross: 1200, ded: 120, net: 1080, estimate: 900 });
  const amt = payBreakdown({ base: 1000, extra: 200, ded: 150, dedMode: 'amt' });
  assert.equal(amt.net, 1050);
  assert.equal(amt.estimate, 850);
  const it = { id: 'x', name: 'Salario', est: 900, real: null, pay: { base: 1000, extra: 200, ded: 10, dedMode: 'pct' } };
  assert.equal(receivedAmount(it), 1080);
  const m = emptyMonth();
  m.ingresos = [it];
  assert.equal(summary(m).ingresoPendiente, 1080);
  const next = copyBudget(m);
  assert.equal(next.ingresos[0].pay.extra, null);
  assert.equal(next.ingresos[0].est, 900);
});
