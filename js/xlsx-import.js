// Lee el Excel de presupuesto (una hoja por mes) directamente en el teléfono.
// Nada se sube a internet: el archivo se descomprime y se lee aquí mismo.

import { unzipSync, strFromU8 } from '../vendor/fflate.js';
import { emptyMonth, uid, norm, hasMoney } from './calc.js';
import { round2, monthKey } from './format.js';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) =>
  s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|(amp|lt|gt|quot|apos));/g, (_, d, h, n) =>
    d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : ENTITIES[n],
  );

const textOf = (xml) => {
  let s = '';
  for (const t of xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '').matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) s += decode(t[1]);
  return s;
};

const attr = (attrs, name) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];

function sharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
}

// Devuelve un Map "A1" -> valor (número, texto o booleano).
function parseSheet(xml, ss) {
  const cells = new Map();
  for (const m of xml.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = attr(m[1], 'r');
    if (!ref) continue;
    const t = attr(m[1], 't') || 'n';
    const body = m[2] || '';
    const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
    let val = null;
    if (t === 's') val = v != null ? ss[+v] ?? null : null;
    else if (t === 'inlineStr') val = textOf(body);
    else if (t === 'str') val = v != null ? decode(v) : null;
    else if (t === 'b') val = v === '1';
    else if (t === 'e') val = null;
    else if (v != null && v !== '') val = Number(v);
    if (val !== null && val !== '' && !(typeof val === 'number' && !Number.isFinite(val))) cells.set(ref, val);
  }
  return cells;
}

const colToNum = (col) => [...col].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const numToCol = (n) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const splitRef = (ref) => {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  return { col: m[1], row: +m[2] };
};
const offset = (col, n) => numToCol(colToNum(col) + n);
const simple = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

function findCell(cells, text, { col, minRow = 1, maxRow = Infinity } = {}) {
  let best = null;
  for (const [ref, v] of cells) {
    if (typeof v !== 'string' || simple(v) !== simple(text)) continue;
    const p = splitRef(ref);
    if (p.row < minRow || p.row > maxRow || (col && p.col !== col)) continue;
    if (!best || p.row < best.row || (p.row === best.row && colToNum(p.col) < colToNum(best.col))) best = p;
  }
  return best;
}

const MONTH_PREFIXES = [['ene', 'jan'], ['feb'], ['mar'], ['abr', 'apr'], ['may'], ['jun'], ['jul'], ['ago', 'aug'], ['sep'], ['oct'], ['nov'], ['dic', 'dec']];

export function monthFromSheetName(name) {
  const n = simple(name);
  const i = MONTH_PREFIXES.findIndex((ps) => ps.some((p) => n.startsWith(p)));
  return i >= 0 ? i + 1 : null;
}

const money = (v) => (typeof v === 'number' && Number.isFinite(v) ? round2(v) : null);

function serialToISO(v, date1904) {
  if (typeof v === 'number' && v > 0) {
    const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    return new Date(base + Math.floor(v) * 86400000).toISOString().slice(0, 10);
  }
  if (typeof v === 'string') {
    const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v.trim());
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  }
  return '';
}

// Lee renglones "nombre | estimado | real" hasta encontrar "Total".
function readRows(cells, nameCol, fromRow, toRow, withReal = true) {
  const items = [];
  for (let r = fromRow; r <= toRow; r++) {
    const name = cells.get(nameCol + r);
    if (typeof name === 'string' && simple(name) === 'total') break;
    if (name == null || !String(name).trim()) continue;
    const it = { id: uid(), name: String(name).trim(), est: money(cells.get(offset(nameCol, 1) + r)) };
    if (withReal) it.real = money(cells.get(offset(nameCol, 2) + r));
    items.push(it);
  }
  return items;
}

function readMonthSheet(cells, date1904) {
  const tx = findCell(cells, 'Transacciones', { maxRow: 15 });
  if (!tx) return null;
  const h = tx.row;
  const head = (label) => findCell(cells, label, { minRow: h, maxRow: h });
  const ing = head('Ingresos');
  const aho = head('Ahorros');
  const fij = head('Gastos fijos');
  const vari = head('Gastos variables');
  if (!ing || !aho || !fij || !vari) return null;
  const deu = findCell(cells, 'Deudas', { col: aho.col, minRow: h + 2 });
  const notas = findCell(cells, 'Notas', { col: ing.col, minRow: h + 2 });
  const lastRow = Math.max(...[...cells.keys()].map((r) => splitRef(r).row));

  const m = emptyMonth();
  m.ingresos = readRows(cells, ing.col, h + 2, (notas ? notas.row : h + 12) - 1);
  m.ahorros = readRows(cells, aho.col, h + 2, (deu ? deu.row : h + 12) - 1);
  m.deudas = deu ? readRows(cells, aho.col, deu.row + 2, deu.row + 40) : [];
  m.fijos = readRows(cells, fij.col, h + 2, h + 80);
  m.variables = readRows(cells, vari.col, h + 2, h + 80, false);

  const c = tx.col;
  for (let r = h + 2; r <= lastRow; r++) {
    const amount = money(cells.get(offset(c, 1) + r));
    if (amount == null) continue;
    const cat = cells.get(c + r);
    const note = cells.get(offset(c, 3) + r);
    m.tx.push({ id: uid(), cat: cat == null ? '' : String(cat).trim(), amount, date: serialToISO(cells.get(offset(c, 2) + r), date1904), note: note == null ? '' : String(note).trim() });
  }

  if (notas) {
    const text = cells.get(notas.col + (notas.row + 1));
    if (typeof text === 'string' && !/^escrib/.test(simple(text))) m.notes = text.trim();
  }
  return m;
}

// Lee el archivo y devuelve los meses encontrados (los vacíos se omiten).
export function parseBudgetWorkbook(bytes) {
  let files;
  try {
    files = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  } catch {
    throw new Error('El archivo no es un Excel válido (.xlsx).');
  }
  const read = (p) => (files[p] ? strFromU8(files[p]) : null);
  const wb = read('xl/workbook.xml');
  const rels = read('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new Error('El archivo no es un Excel válido (.xlsx).');

  const relMap = {};
  for (const m of rels.matchAll(/<Relationship\s([^>]*?)\/?>/g)) relMap[attr(m[1], 'Id')] = attr(m[1], 'Target');
  const date1904 = /<workbookPr[^>]*\sdate1904="(1|true)"/.test(wb);
  const ss = sharedStrings(read('xl/sharedStrings.xml'));

  const found = [];
  const skipped = [];
  for (const m of wb.matchAll(/<sheet\s([^>]*?)\/?>/g)) {
    const name = decode(attr(m[1], 'name') || '');
    const month = monthFromSheetName(name);
    if (!month) continue;
    const rid = /(?:^|\s)[\w]+:id="([^"]*)"/.exec(m[1])?.[1];
    let target = relMap[rid];
    if (!target) continue;
    target = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const xml = read(target);
    if (!xml) continue;
    const data = readMonthSheet(parseSheet(xml, ss), date1904);
    if (!data) {
      skipped.push({ sheet: name, reason: 'formato no reconocido' });
      continue;
    }
    if (!hasMoney(data) && !data.notes) {
      skipped.push({ sheet: name, reason: 'vacío' });
      continue;
    }
    found.push({ sheet: name, month, data });
  }
  if (!found.length) {
    throw new Error(skipped.some((s) => s.reason === 'formato no reconocido')
      ? 'No reconozco el formato de las hojas de este Excel.'
      : 'No encontré meses con datos en este Excel.');
  }

  // El Excel no guarda el año: lo deducimos de las fechas de los gastos.
  const years = {};
  for (const f of found) for (const t of f.data.tx) if (t.date) years[t.date.slice(0, 4)] = (years[t.date.slice(0, 4)] || 0) + 1;
  const guess = Object.entries(years).sort((a, b) => b[1] - a[1])[0]?.[0];
  const year = guess ? +guess : new Date().getFullYear();

  // Varias hojas del mismo mes: gana la que tenga más datos.
  const byMonth = new Map();
  for (const f of found) {
    const prev = byMonth.get(f.month);
    const size = (x) => x.data.tx.length + x.data.fijos.length + x.data.deudas.length;
    if (!prev || size(f) > size(prev)) byMonth.set(f.month, f);
  }
  const months = [...byMonth.values()].sort((a, b) => a.month - b.month);
  return { year, months, skipped };
}

export const keysFor = (result, year) => result.months.map((f) => ({ key: monthKey(year, f.month), month: f.data, sheet: f.sheet }));
