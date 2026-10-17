// Genera un .xlsx con todos los datos (resumen por año, una hoja por mes y deudas).

import { zipSync, strToU8 } from '../vendor/fflate.js';
import { SECTIONS, rowsOf, diffOf, summary, yearSummary, debtsOverview, hasMoney } from './calc.js';
import { MONTHS, monthLabel, parseKey, currentKey, currencySymbol } from './format.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const colName = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// Estilos: 0 normal, 1 negrita, 2 moneda, 3 fecha, 4 moneda en negrita, 5 título
const S = { text: 0, bold: 1, money: 2, date: 3, moneyBold: 4, title: 5 };
const dateSerial = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
};

// Cada celda: valor simple o { v, s }.
function sheetXml(rows, widths) {
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => {
          if (cell == null) return '';
          const { v, s = 0 } = typeof cell === 'object' ? cell : { v: cell };
          if (v == null || v === '') return '';
          const ref = colName(c) + (r + 1);
          const st = s ? ` s="${s}"` : '';
          if (typeof v === 'number') return `<c r="${ref}"${st}><v>${Number.isFinite(v) ? v : 0}</v></c>`;
          return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
}

const money = (v) => ({ v: v ?? null, s: S.money });
const bold = (v) => ({ v, s: S.bold });

function summarySheet(months, year) {
  const { rows, total } = yearSummary(months, year);
  const keys = [...SECTIONS.map((s) => s.key), 'sinUsar'];
  const labels = [...SECTIONS.map((s) => s.label), 'Sin usar'];
  const out = [[{ v: `Resumen ${year}`, s: S.title }], [], [bold('Mes'), ...labels.flatMap((l) => [bold(`${l} (presup.)`), bold(`${l} (real)`)])]];
  for (const r of rows) {
    if (!r.has) continue;
    out.push([MONTHS[r.month - 1], ...keys.flatMap((k) => [money(r.s[k].est), money(r.s[k].real)])]);
  }
  out.push([bold('Total'), ...keys.flatMap((k) => [{ v: total[k].est, s: S.moneyBold }, { v: total[k].real, s: S.moneyBold }])]);
  return sheetXml(out, [14, ...keys.flatMap(() => [16, 14])]);
}

function monthSheet(m, key) {
  const s = summary(m);
  const out = [[{ v: monthLabel(key), s: S.title }], [], [bold('Resumen'), bold('Presupuesto'), bold('Real')]];
  for (const sec of SECTIONS) out.push([sec.label, money(s[sec.key].est), money(s[sec.key].real)]);
  out.push([bold('Sin usar'), { v: s.sinUsar.est, s: S.moneyBold }, { v: s.sinUsar.real, s: S.moneyBold }]);
  out.push([], [bold('Sección'), bold('Nombre'), bold('Presupuesto'), bold('Real'), bold('Diferencia')]);
  for (const sec of SECTIONS) {
    for (const it of rowsOf(m, sec.key)) out.push([sec.label, it.name, money(it.est), money(it.real), money(diffOf(sec.key, it))]);
  }
  out.push([], [bold('Gastos'), bold('Categoría'), bold('Cantidad'), bold('Nota')]);
  const tx = [...m.tx].sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  for (const t of tx) out.push([t.date ? { v: dateSerial(t.date), s: S.date } : 'Sin fecha', t.cat, money(t.amount), t.note]);
  if (m.notes) out.push([], [bold('Notas')], [m.notes]);
  return sheetXml(out, [18, 24, 14, 14, 30]);
}

function debtsSheet(state) {
  const { active, past } = debtsOverview(state, currentKey());
  const out = [[{ v: 'Deudas', s: S.title }], [], [bold('Deuda'), bold('Cuota mensual'), bold('Pagado (total)'), bold('Saldo inicial'), bold('Desde'), bold('Restante')]];
  for (const d of [...active, ...past]) {
    out.push([d.name, money(d.cuota), money(d.paidTotal), money(d.balance?.start), d.balance ? monthLabel(d.balance.since) : '', money(d.balance?.remaining)]);
  }
  return sheetXml(out, [24, 16, 16, 16, 18, 14]);
}

const styles = (sym) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;${esc(sym)}&quot;#,##0.00;[Red]\\-&quot;${esc(sym)}&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildWorkbook(state) {
  const sheets = [];
  const keys = Object.keys(state.months).filter((k) => hasMoney(state.months[k]) || state.months[k].notes).sort();
  const years = [...new Set(keys.map((k) => parseKey(k)[0]))];
  for (const y of years) sheets.push({ name: `Resumen ${y}`, xml: summarySheet(state.months, y) });
  for (const k of keys) {
    const [y, m] = parseKey(k);
    sheets.push({ name: `${MONTHS[m - 1].slice(0, 3)} ${y}`, xml: monthSheet(state.months[k], k) });
  }
  sheets.push({ name: 'Deudas', xml: debtsSheet(state) });

  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': styles(currencySymbol()),
  };
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = s.xml));
  const zipped = {};
  for (const [p, xml] of Object.entries(files)) zipped[p] = strToU8(xml);
  return zipSync(zipped, { level: 6 });
}

