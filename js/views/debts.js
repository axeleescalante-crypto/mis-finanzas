import { html } from '../../vendor/preact-htm.js';
import { useStore, ui, Meter, Empty } from '../components.js';
import { debtsOverview } from '../calc.js';
import { fmt, currentKey, monthLabel } from '../format.js';

export function DebtsView() {
  const state = useStore();
  const ov = debtsOverview(state, currentKey());
  const all = [...ov.active, ...ov.past];

  return html`<div>
    <h1 class="title" style="margin-top:12px">Deudas</h1>
    ${!all.length
      ? html`<div class="card"><${Empty} icon="debt" title="Sin deudas registradas" text="Cuando agregues pagos en la sección Deudas de tu presupuesto, aparecerán aquí." /></div>`
      : html`
        <div class="card hero">
          ${ov.totalRemaining > 0
            ? html`<div class="hero-label">Te falta pagar</div>
                <div class="hero-value">${fmt(ov.totalRemaining)}</div>
                <div class="hero-sub">Llevas ${fmt(ov.paidYear)} pagados en ${ov.year}</div>`
            : html`<div class="hero-label">Pagado en ${ov.year}</div>
                <div class="hero-value">${fmt(ov.paidYear)}</div>
                <div class="hero-sub">Toca una deuda y agrega su saldo para ver cuánto te falta.</div>`}
          <div class="hero-split">
            <div><div class="stat-label">Cuotas al mes</div><div class="stat-value">${fmt(ov.active.reduce((a, d) => a + d.cuota, 0))}</div></div>
            <div><div class="stat-label">Deudas activas</div><div class="stat-value">${ov.active.length}</div></div>
          </div>
        </div>

        ${ov.active.length > 0 && html`<h2 class="subtitle">Activas</h2>`}
        ${ov.active.map((d) => html`<${DebtCard} key=${d.key} d=${d} year=${ov.year} />`)}

        ${ov.past.length > 0 &&
        html`<h2 class="subtitle">Anteriores</h2>
          <div class="card flush">
            ${ov.past.map(
              (d) => html`<button class="row" key=${d.key} onClick=${() => ui.open('debt', { name: d.name })}>
                <div class="grow"><div class="name">${d.name}</div><div class="meta">Último pago: ${monthLabel(d.payments[d.payments.length - 1].key)}</div></div>
                <div class="end"><div class="amount">${fmt(d.paidTotal)}</div><div class="meta">pagado</div></div>
              </button>`,
            )}
          </div>
          <p class="card-note" style="margin: 0 4px">Son deudas que ya no aparecen en tu presupuesto reciente.</p>`}
      `}
  </div>`;
}

function DebtCard({ d, year }) {
  const b = d.balance;
  return html`<button class="card" style="display:block;width:100%;text-align:left" onClick=${() => ui.open('debt', { name: d.name })}>
    <div class="head-row">
      <span class="strong" style="font-size:17px">${d.name}</span>
      <span class="small muted num">Cuota ${fmt(d.cuota)}</span>
    </div>
    ${b
      ? html`
        <div class="stat-value" style="margin-top:8px">${b.remaining > 0 ? `Te faltan ${fmt(b.remaining)}` : '¡Pagada!'}</div>
        <${Meter} k="deudas" value=${b.paid} max=${b.start} />
        <div class="small muted" style="margin-top:6px">
          Pagado ${fmt(b.paid)} de ${fmt(b.start)}${b.monthsLeft ? ` · unos ${b.monthsLeft} ${b.monthsLeft === 1 ? 'mes' : 'meses'} más` : ''}
        </div>`
      : html`<div class="small muted" style="margin-top:6px">Pagado en ${year}: ${fmt(d.paidYear)} · Toca para agregar el saldo</div>`}
  </button>`;
}
