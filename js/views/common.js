// Piezas que comparten Inicio y Mes.

import { html } from '../../vendor/preact-htm.js';
import { useStore, ui, go, Empty } from '../components.js';
import { previousBudgetKey } from '../calc.js';
import { copyMonthFrom, startTemplateMonth } from '../store.js';
import { fmt, fmtDate, monthName, monthLabel } from '../format.js';

export function EmptyMonth({ monthKey }) {
  const state = useStore();
  const prev = previousBudgetKey(state.months, monthKey);
  const hasAny = Object.keys(state.months).length > 0;
  if (!hasAny) {
    return html`<div class="card">
      <${Empty} title="Empecemos" text="Armamos tu presupuesto con categorías comunes; solo pones tus montos.">
        <button class="btn primary" onClick=${() => { startTemplateMonth(monthKey); go(`mes/${monthKey}/presupuesto`); }}>Empezar</button>
      <//>
    </div>`;
  }
  return html`<div class="card">
    <${Empty} icon="copy" title=${`${monthName(monthKey)} está vacío`}
      text=${prev ? `Copia el presupuesto de ${monthLabel(prev)}: mismos ingresos, gastos, deudas y categorías. Lo real queda en blanco para que lo vayas marcando.` : 'Armamos tu presupuesto con categorías comunes; solo pones tus montos.'}>
      ${prev && html`<button class="btn primary" onClick=${() => { copyMonthFrom(monthKey, prev); ui.toast(`Presupuesto copiado de ${monthName(prev)}`); }}>Copiar de ${monthName(prev)}</button>`}
      ${!prev && html`<button class="btn primary" onClick=${() => { startTemplateMonth(monthKey); go(`mes/${monthKey}/presupuesto`); }}>Empezar</button>`}
    <//>
  </div>`;
}

export function TxRow({ monthKey, tx, showDate = true }) {
  const note = tx.note && tx.note.trim().toLowerCase() !== tx.cat.trim().toLowerCase() ? tx.note : '';
  const meta = [note ? tx.cat : '', showDate ? fmtDate(tx.date) : ''].filter(Boolean).join(' · ');
  return html`<button class="row" onClick=${() => ui.open('tx', { monthKey, tx })}>
    <div class="grow">
      <div class="name">${note || tx.cat || 'Gasto'}</div>
      ${meta && html`<div class="meta">${meta}</div>`}
    </div>
    <div class="end"><div class="amount">${fmt(tx.amount)}</div></div>
  </button>`;
}

export const sortTx = (list) =>
  [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || list.indexOf(b) - list.indexOf(a));
