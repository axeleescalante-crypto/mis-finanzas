import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { useStore, ui, go, Icon, Dot, Meter, Money, Segmented } from '../components.js';
import { SECTIONS, OUT_KEYS, summary, isMonthEmpty, rowsOf, diffOf, sectionOf } from '../calc.js';
import { togglePaid, setNotes, clearMonth } from '../store.js';
import { fmt, monthLabel, currentKey, shiftKey, fmtDateLong } from '../format.js';
import { GroupedBars, Donut, BarsLegend } from '../charts.js';
import { EmptyMonth, TxRow, sortTx } from './common.js';

const TABS = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'gastos', label: 'Gastos' },
];
const SHORT = { ahorros: 'Ahorros', fijos: 'Fijos', variables: 'Variables', deudas: 'Deudas' };

export function MonthView({ keyParam, tabParam }) {
  const state = useStore();
  const key = /^\d{4}-(0[1-9]|1[0-2])$/.test(keyParam || '') ? keyParam : currentKey();
  const tab = TABS.some((t) => t.value === tabParam) ? tabParam : 'resumen';
  const m = state.months[key];
  const empty = isMonthEmpty(m);

  return html`<div>
    <div class="month-switch">
      <button class="icon-btn" aria-label="Mes anterior" onClick=${() => go(`mes/${shiftKey(key, -1)}/${tab}`)}><${Icon} name="left" /></button>
      <h1 class="title">${monthLabel(key)}</h1>
      <button class="icon-btn" aria-label="Mes siguiente" onClick=${() => go(`mes/${shiftKey(key, 1)}/${tab}`)}><${Icon} name="right" /></button>
    </div>
    <${Segmented} options=${TABS} value=${tab} onChange=${(v) => go(`mes/${key}/${v}`)} label="Secciones del mes" />
    ${tab === 'gastos'
      ? html`<${TxList} m=${m} monthKey=${key} />`
      : empty
        ? html`<${EmptyMonth} monthKey=${key} />`
        : tab === 'presupuesto'
          ? html`<${Budget} m=${m} monthKey=${key} />`
          : html`<${MonthSummary} m=${m} monthKey=${key} />`}
    <button class="fab" onClick=${() => ui.open('tx', { monthKey: key })}><${Icon} name="plus" size=${22} stroke=${2.2} />Gasto</button>
  </div>`;
}

function MonthSummary({ m, monthKey }) {
  const s = summary(m);
  const [mode, setMode] = useState('real');
  return html`
    <div class="card">
      <table class="table">
        <thead><tr><th>Categoría</th><th>Presupuesto</th><th>Real</th></tr></thead>
        <tbody>
          ${SECTIONS.map(
            (sec) => html`<tr key=${sec.key}>
              <td><span class="cat"><${Dot} k=${sec.key} />${sec.label}</span></td>
              <td>${fmt(s[sec.key].est)}</td>
              <td>${fmt(s[sec.key].real)}</td>
            </tr>`,
          )}
          <tr class="total">
            <td>Sin usar</td>
            <td><${Money} value=${s.sinUsar.est} /></td>
            <td><${Money} value=${s.sinUsar.real} /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-title">¿A dónde se fue tu dinero?</div>
      <${Segmented} options=${[{ value: 'real', label: 'Real' }, { value: 'est', label: 'Presupuesto' }]} value=${mode} onChange=${setMode} label="Ver" />
      <div style="height:12px"></div>
      <${Donut} key=${mode} items=${OUT_KEYS.map((k) => ({ k, label: sectionOf(k).label, value: s[k][mode] }))} centerLabel=${mode === 'real' ? 'Usado' : 'Presupuestado'} />
    </div>

    <div class="card">
      <div class="card-title">Presupuesto vs real</div>
      <${GroupedBars} groups=${OUT_KEYS.map((k) => ({ k, label: SHORT[k], title: sectionOf(k).label, est: s[k].est, real: s[k].real }))} />
      <${BarsLegend} multi />
    </div>

    <${Notes} monthKey=${monthKey} value=${m.notes} />

    <div class="btn-row" style="margin-top:24px">
      <button class="btn danger" onClick=${() => ui.open('confirm', {
        title: 'Vaciar mes',
        message: `Se borrará todo lo de ${monthLabel(monthKey)}: presupuesto, gastos y notas.`,
        confirmLabel: 'Vaciar mes',
        onConfirm: () => clearMonth(monthKey),
      })}>Vaciar este mes</button>
    </div>
  `;
}

function Notes({ monthKey, value }) {
  const [text, setText] = useState(value || '');
  const timer = useRef(null);
  useEffect(() => setText(value || ''), [monthKey]);
  const flush = (v) => {
    clearTimeout(timer.current);
    if (v !== (value || '')) setNotes(monthKey, v);
  };
  return html`<div class="card">
    <div class="card-title">Notas</div>
    <textarea class="notes" placeholder="Escribe tus notas del mes" value=${text}
      onInput=${(e) => { const v = e.target.value; setText(v); clearTimeout(timer.current); timer.current = setTimeout(() => flush(v), 700); }}
      onBlur=${(e) => flush(e.target.value)}></textarea>
  </div>`;
}

function diffNote(sec, it) {
  if (it.real == null || it.extra) return null;
  const d = diffOf(sec.key, it);
  if (Math.abs(d) < 0.005) return null;
  if (sec.income) return html`<span class=${d > 0 ? 'pos' : 'neg'}>${d > 0 ? `${fmt(d)} más` : `${fmt(-d)} menos`}</span>`;
  return html`<span class=${d > 0 ? 'pos' : 'neg'}>${d > 0 ? `Te sobró ${fmt(d)}` : `Te pasaste ${fmt(-d)}`}</span>`;
}

function Budget({ m, monthKey }) {
  const s = summary(m);
  return html`${SECTIONS.map((sec) => {
    const rows = rowsOf(m, sec.key);
    return html`<div class="card flush" key=${sec.key}>
      <div class="row">
        <${Dot} k=${sec.key} />
        <span class="grow strong">${sec.label}</span>
        <span class="small num"><span class="strong">${fmt(s[sec.key].real)}</span> <span class="muted">de ${fmt(s[sec.key].est)}</span></span>
      </div>
      ${rows.map((it) => (sec.auto ? html`<${VarRow} key=${it.id} it=${it} monthKey=${monthKey} />` : html`<${ItemRow} key=${it.id} it=${it} sec=${sec} monthKey=${monthKey} />`))}
      <button class="row add" onClick=${() => ui.open('item', { monthKey, section: sec.key })}><${Icon} name="plus" size=${20} />Agregar</button>
    </div>`;
  })}
  <p class="card-note" style="margin: 0 4px">Toca el círculo para marcar algo como pagado o recibido (copia el presupuesto al real). Toca el renglón para cambiar montos.</p>`;
}

function ItemRow({ it, sec, monthKey }) {
  const quincenal = useStore().settings.payFreq === 'quincenal';
  const paid = it.real != null;
  const note = diffNote(sec, it);
  return html`<div class="row tap" style="padding-left:12px">
    <button class=${`check ${paid ? 'on' : ''}`} style=${`--c: var(--c-${sec.key})`} aria-pressed=${paid}
      aria-label=${`${paid ? 'Desmarcar' : 'Marcar'} ${it.name} como ${sec.paidLabel.toLowerCase()}`}
      onClick=${() => togglePaid(monthKey, sec.key, it.id)}>
      <${Icon} name=${paid ? 'checked' : 'circle'} size=${26} />
    </button>
    <button class="grow" style="display:flex;align-items:center;gap:12px;text-align:left;min-width:0" onClick=${() => ui.open('item', { monthKey, section: sec.key, item: it })}>
      <div class="grow">
        <div class="name">${it.name}</div>
        <div class="meta">${quincenal ? `${it.q || 1}ª quincena · ` : ''}${it.est ? `Planeado ${fmt(it.est)}` : 'Sin monto planeado'}${note ? ' · ' : ''}${note}</div>
      </div>
      ${paid
        ? html`<div class="end">
            <div class="amount edit-amount">${fmt(it.real)}<${Icon} name="pencil" size=${15} /></div>
            <div class="meta">${sec.paidLabel}</div>
          </div>`
        : html`<span class="edit-pill"><${Icon} name="pencil" size=${15} />${it.est ? 'Anotar' : 'Poner monto'}</span>`}
    </button>
  </div>`;
}

function VarRow({ it, monthKey }) {
  const over = it.est > 0 && it.real - it.est > 0.004;
  return html`<button class="row" onClick=${() => ui.open('item', { monthKey, section: 'variables', item: it })}>
    <div class="grow">
      <div class="head-row">
        <span class="name">${it.name}</span>
        <span class="small num" style="display:inline-flex;align-items:center;gap:6px"><span><span class="strong">${fmt(it.real)}</span> <span class="muted">de ${it.est ? fmt(it.est) : '—'}</span></span><span class="muted" style="display:flex"><${Icon} name="pencil" size=${14} /></span></span>
      </div>
      <${Meter} k="variables" value=${it.real} max=${it.est || 0} />
      ${it.extra && html`<div class="meta" style="margin-top:4px">Sin presupuesto · toca para agregarla</div>`}
      ${over && html`<div class="small neg" style="margin-top:4px">Te pasaste por ${fmt(it.real - it.est)}</div>`}
    </div>
  </button>`;
}

function TxList({ m, monthKey }) {
  const tx = m ? sortTx(m.tx) : [];
  if (!tx.length) {
    return html`<div class="card"><div class="empty">
      <span class="art"><${Icon} name="wallet" size=${28} /></span>
      <h3>Sin gastos todavía</h3>
      <p>Cada vez que compres algo, toca «+ Gasto». El total de cada categoría se suma solo en tu presupuesto.</p>
    </div></div>`;
  }
  const total = tx.reduce((a, t) => a + (t.amount || 0), 0);
  const groups = [];
  for (const t of tx) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, items: [t] });
  }
  return html`
    <div class="card" style="display:flex;justify-content:space-between;align-items:baseline">
      <span class="muted">${tx.length} ${tx.length === 1 ? 'gasto' : 'gastos'}</span>
      <span class="stat-value">${fmt(total)}</span>
    </div>
    ${groups.map(
      (g) => html`<div key=${g.date || 'none'}>
        <p class="eyebrow" style="margin: 16px 4px 6px">${fmtDateLong(g.date).replace(/^./, (c) => c.toUpperCase())}</p>
        <div class="card flush" style="margin-top:0">
          ${g.items.map((t) => html`<${TxRow} key=${t.id} monthKey=${monthKey} tx=${t} showDate=${false} />`)}
        </div>
      </div>`,
    )}
  `;
}
