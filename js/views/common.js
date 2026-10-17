// Piezas que comparten Inicio y Mes.

import { html } from '../../vendor/preact-htm.js';
import { useStore, ui, go, Empty } from '../components.js';
import { previousBudgetKey } from '../calc.js';
import { copyMonthFrom, startBlankMonth, startTemplateMonth } from '../store.js';
import { fmt, fmtDate, monthName, monthLabel } from '../format.js';
import { importExcelFlow } from '../actions.js';

export function EmptyMonth({ monthKey }) {
  const state = useStore();
  const prev = previousBudgetKey(state.months, monthKey);
  const hasAny = Object.keys(state.months).length > 0;
  if (!hasAny) {
    return html`<div class="card">
      <${Empty} title="Empecemos" text="Usa la plantilla sugerida y solo pon tus montos, o trae los meses de tu Excel.">
        <button class="btn primary" onClick=${() => { startTemplateMonth(monthKey); go(`mes/${monthKey}/presupuesto`); }}>Usar plantilla sugerida</button>
        <button class="btn secondary" onClick=${() => { startBlankMonth(monthKey); go(`mes/${monthKey}/presupuesto`); }}>Empezar en blanco</button>
        <button class="btn secondary" onClick=${importExcelFlow}>Importar mi Excel</button>
      <//>
    </div>`;
  }
  return html`<div class="card">
    <${Empty} icon="copy" title=${`${monthName(monthKey)} está vacío`}
      text=${prev ? `Copia el presupuesto de ${monthLabel(prev)}: mismos ingresos, gastos, deudas y categorías. Lo real queda en blanco para que lo vayas marcando.` : 'Arma el presupuesto de este mes.'}>
      ${prev && html`<button class="btn primary" onClick=${() => { copyMonthFrom(monthKey, prev); ui.toast(`Presupuesto copiado de ${monthName(prev)}`); }}>Copiar de ${monthName(prev)}</button>`}
      <button class="btn secondary" onClick=${() => { startBlankMonth(monthKey); go(`mes/${monthKey}/presupuesto`); }}>Empezar en blanco</button>
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
