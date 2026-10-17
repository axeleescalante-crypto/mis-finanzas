// Pruebas con datos inventados (nunca con datos reales). Correr: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8, unzipSync, strFromU8 } from '../vendor/fflate.js';
import { summary, variableRows, copyBudget, debtsOverview, paydayInfo, emptyMonth } from '../js/calc.js';
import { parseAmount, shiftKey } from '../js/format.js';
import { parseBudgetWorkbook, keysFor, monthFromSheetName } from '../js/xlsx-import.js';
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

test('nombres de hojas', () => {
  assert.equal(monthFromSheetName('Sept'), 9);
  assert.equal(monthFromSheetName('SEPTIEMBRE'), 9);
  assert.equal(monthFromSheetName('Ene'), 1);
  assert.equal(monthFromSheetName('Resumen del año'), null);
});

// Excel mínimo con el mismo acomodo que la plantilla original.
function templateXlsx(cells) {
  const strings = [];
  const si = (s) => (strings.includes(s) ? strings.indexOf(s) : strings.push(s) - 1);
  const rows = {};
  for (const [ref, v] of Object.entries(cells)) {
    const r = +ref.match(/\d+/)[0];
    const xml = typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="s"><v>${si(v)}</v></c>`;
    (rows[r] ||= []).push(xml);
  }
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${Object.keys(rows)
    .sort((a, b) => a - b)
    .map((r) => `<row r="${r}">${rows[r].join('')}</row>`)
    .join('')}</sheetData></worksheet>`;
  return zipSync({
    'xl/workbook.xml': strToU8(`<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><sheets><sheet name="Resumen del año" sheetId="1" r:id="rId1"/><sheet name="Mayo" sheetId="2" r:id="rId2"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>`),
    'xl/worksheets/sheet1.xml': strToU8('<worksheet><sheetData/></worksheet>'),
    'xl/worksheets/sheet2.xml': strToU8(sheet),
    'xl/sharedStrings.xml': strToU8(`<sst>${strings.map((s) => `<si><t>${s.replace(/&/g, '&amp;')}</t></si>`).join('')}</sst>`),
  });
}

test('importa una hoja con el formato de la plantilla', () => {
  const bytes = templateXlsx({
    F4: 'Ingresos', K4: 'Ahorros', P4: 'Gastos fijos', U4: 'Gastos variables', Z4: 'Transacciones',
    F6: 'Salario', G6: 900, H6: 900, F15: 'Total',
    K6: 'Emergencia', L6: 50, K15: 'Total',
    P6: 'Alquiler', Q6: 200, R6: 200, P7: 'Gym', Q7: 30, P26: 'Total',
    U6: 'Comida', V6: 120, U27: 'Total',
    F17: 'Notas', F18: 'Mes tranquilo',
    K17: 'Deudas', K19: 'Carro', L19: 125, M19: 125, K28: 'Total',
    Z6: 'Comida', AA6: 35.5, AB6: 46143, AC6: 'Súper', Z7: 'Supermercado',
  });
  const res = parseBudgetWorkbook(bytes);
  assert.equal(res.year, 2026);
  const [{ key, month: m }] = keysFor(res, res.year);
  assert.equal(key, '2026-05');
  assert.deepEqual(m.fijos.map((i) => [i.name, i.est, i.real]), [['Alquiler', 200, 200], ['Gym', 30, null]]);
  assert.equal(m.deudas[0].name, 'Carro');
  assert.equal(m.tx.length, 1);
  assert.deepEqual([m.tx[0].date, m.tx[0].amount, m.tx[0].note], ['2026-05-01', 35.5, 'Súper']);
  assert.equal(m.notes, 'Mes tranquilo');
  assert.equal(summary(m).sinUsar.real, 900 - 200 - 35.5 - 125);
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
