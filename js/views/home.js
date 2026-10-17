import { html } from '../../vendor/preact-htm.js';
import { useStore, ui, go, Icon, Dot, Meter, Money } from '../components.js';
import { SECTIONS, summary, isMonthEmpty, paydayInfo } from '../calc.js';
import { markIncomeReceived } from '../store.js';
import { fmt, MONTHS, MONTHS_SHORT, currentKey, monthName } from '../format.js';
import { EmptyMonth, TxRow, sortTx } from './common.js';

function paydayText(days, date) {
  if (days === 0) return '¡Hoy es día de pago!';
  if (days === 1) return 'Mañana es día de pago';
  return `Faltan ${days} días para tu pago (${date.getDate()} ${MONTHS_SHORT[date.getMonth()]})`;
}

export function Home() {
  const state = useStore();
  const key = currentKey();
  const m = state.months[key];
  const today = new Date();
  const pay = paydayInfo(state.settings.payday, today);
  const empty = isMonthEmpty(m);

  return html`<div>
    <p class="eyebrow">Hoy, ${today.getDate()} de ${MONTHS[today.getMonth()].toLowerCase()}</p>
    <div class="head-row">
      <h1 class="title">${monthName(key)}</h1>
    </div>
    <span class="chip"><${Icon} name="calendar" size=${16} />${paydayText(pay.days, pay.date)}</span>
    ${empty ? html`<${EmptyMonth} monthKey=${key} />` : html`<${MonthOverview} m=${m} monthKey=${key} pay=${pay} />`}
    <${BackupReminder} />
    <button class="fab" onClick=${() => ui.open('tx', { monthKey: key })}><${Icon} name="plus" size=${22} stroke=${2.2} />Gasto</button>
  </div>`;
}

function MonthOverview({ m, monthKey, pay }) {
  const s = summary(m);
  const pendingIncome = m.ingresos.find((it) => it.real == null);
  const recent = sortTx(m.tx).slice(0, 5);
  const perDay = s.teQuedaria > 0 && pay.days > 0 && pay.date.getMonth() === new Date().getMonth() ? s.teQuedaria / pay.days : null;

  return html`
    <div class="card hero">
      <div class="hero-label">Sin usar</div>
      <div class=${`hero-value ${s.sinUsar.real < -0.004 ? 'neg' : ''}`}>${fmt(s.sinUsar.real)}</div>
      <div class="hero-sub">${s.ingresos.real > 0 ? `de ${fmt(s.ingresos.real)} que te entraron este mes` : 'Todavía no registras ingresos este mes'}</div>
      ${s.ingresoPendiente > 0 &&
      html`<div class="notice">
        <div class="grow">Tu ingreso de <b>${fmt(s.ingresoPendiente)}</b> todavía no está marcado como recibido.</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn small primary" onClick=${() => markIncomeReceived(monthKey)}>Recibido</button>
          ${pendingIncome && html`<button class="btn small secondary" style="background:var(--card)" onClick=${() => ui.open('item', { monthKey, section: 'ingresos', item: pendingIncome })}>Otro monto</button>`}
        </div>
      </div>`}
      <div class="hero-split">
        <div>
          <div class="stat-label">Por pagar</div>
          <div class="stat-value">${fmt(s.porPagar)}</div>
        </div>
        <div>
          <div class="stat-label">Te quedaría al final</div>
          <div class="stat-value"><${Money} value=${s.teQuedaria} /></div>
        </div>
      </div>
      ${perDay != null && html`<div class="hint">≈ ${fmt(perDay)} por día hasta el ${pay.date.getDate()}</div>`}
    </div>

    <div class="card flush">
      ${SECTIONS.map((sec) => {
        const t = s[sec.key];
        const over = !sec.income && t.est > 0 && t.real - t.est > 0.004;
        return html`<button class="row" key=${sec.key} onClick=${() => go(`mes/${monthKey}/presupuesto`)}>
          <div class="grow">
            <div class="head-row">
              <span class="name" style="display:flex;align-items:center;gap:8px"><${Dot} k=${sec.key} />${sec.label}</span>
              <span class="small num"><span class="strong">${fmt(t.real)}</span> <span class="muted">de ${fmt(t.est)}</span></span>
            </div>
            <${Meter} k=${sec.key} value=${t.real} max=${t.est} />
            ${over && html`<div class="small neg" style="margin-top:4px">Te pasaste por ${fmt(t.real - t.est)}</div>`}
          </div>
        </button>`;
      })}
    </div>

    <div class="head-row">
      <h2 class="subtitle">Últimos gastos</h2>
      ${m.tx.length > 0 && html`<button class="btn small secondary" style="margin-top:16px" onClick=${() => go(`mes/${monthKey}/gastos`)}>Ver todos</button>`}
    </div>
    <div class="card flush">
      ${recent.length
        ? recent.map((t) => html`<${TxRow} key=${t.id} monthKey=${monthKey} tx=${t} />`)
        : html`<p class="card-note" style="padding: 16px; margin: 0">Todavía no registras gastos este mes. Toca «+ Gasto» cada vez que compres algo.</p>`}
    </div>
  `;
}

function BackupReminder() {
  const state = useStore();
  const hasData = Object.keys(state.months).length > 0;
  const last = state.meta.lastBackup ? new Date(state.meta.lastBackup) : null;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (!hasData || (days != null && days < 30)) return null;
  return html`<div class="notice" style="margin-top:16px">
    <${Icon} name="info" size=${20} />
    <div class="grow">${last ? `Tu último respaldo fue hace ${days} días.` : 'Aún no guardas un respaldo de tus datos.'} Tus datos viven solo en este iPhone.</div>
    <button class="btn small secondary" onClick=${() => go('ajustes')}>Respaldar</button>
  </div>`;
}
