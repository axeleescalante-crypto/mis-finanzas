import { html, useState } from '../../vendor/preact-htm.js';
import { useStore, go, Icon, Dot, Money, Segmented, Empty } from '../components.js';
import { SECTIONS, OUT_KEYS, yearSummary, sectionOf } from '../calc.js';
import { fmt, MONTHS, MONTHS_SHORT } from '../format.js';
import { GroupedBars, Donut, BarsLegend } from '../charts.js';

const SHORT = { ingresos: 'Ingresos', ahorros: 'Ahorros', fijos: 'Fijos', variables: 'Variables', deudas: 'Deudas' };

export function YearView({ yearParam }) {
  const state = useStore();
  const year = /^\d{4}$/.test(yearParam || '') ? +yearParam : new Date().getFullYear();
  const [k, setK] = useState('ingresos');
  const [showTable, setShowTable] = useState(false);
  const { rows, total } = yearSummary(state.months, year);
  const withData = rows.filter((r) => r.has);

  return html`<div>
    <div class="month-switch">
      <button class="icon-btn" aria-label="Año anterior" onClick=${() => go(`anio/${year - 1}`)}><${Icon} name="left" /></button>
      <h1 class="title">${year}</h1>
      <button class="icon-btn" aria-label="Año siguiente" onClick=${() => go(`anio/${year + 1}`)}><${Icon} name="right" /></button>
    </div>
    ${!withData.length
      ? html`<div class="card"><${Empty} icon="year" title=${`Sin datos en ${year}`} text="Cuando registres meses de este año, aquí verás el resumen." /></div>`
      : html`
        <div class="kpis">
          <div class="kpi"><div class="stat-label">Ingresos</div><div class="stat-value">${fmt(total.ingresos.real)}</div></div>
          <div class="kpi"><div class="stat-label">Usado</div><div class="stat-value">${fmt(total.usado.real)}</div></div>
          <div class="kpi"><div class="stat-label">Ahorrado</div><div class="stat-value">${fmt(total.ahorros.real)}</div></div>
          <div class="kpi"><div class="stat-label">Sin usar</div><div class="stat-value"><${Money} value=${total.sinUsar.real} /></div></div>
        </div>

        <div class="card">
          <div class="card-title">Mes a mes</div>
          <${Segmented} compact options=${SECTIONS.map((s) => ({ value: s.key, label: SHORT[s.key] }))} value=${k} onChange=${setK} label="Categoría" />
          <div style="height:8px"></div>
          <${GroupedBars} key=${k} capLabels=${false}
            groups=${rows.map((r) => ({ k, label: MONTHS_SHORT[r.month - 1], title: `${sectionOf(k).label} · ${MONTHS[r.month - 1]}`, est: r.s?.[k].est || 0, real: r.s?.[k].real || 0 }))} />
          <${BarsLegend} k=${k} />
          <button class="btn small secondary" style="margin-top:12px" onClick=${() => setShowTable(!showTable)}>${showTable ? 'Ocultar tabla' : 'Ver tabla'}</button>
          ${showTable &&
          html`<table class="table" style="margin-top:12px">
            <thead><tr><th>Mes</th><th>Presupuesto</th><th>Real</th></tr></thead>
            <tbody>
              ${withData.map((r) => html`<tr key=${r.key}><td>${MONTHS[r.month - 1]}</td><td>${fmt(r.s[k].est)}</td><td>${fmt(r.s[k].real)}</td></tr>`)}
              <tr class="total"><td>Total</td><td>${fmt(total[k].est)}</td><td>${fmt(total[k].real)}</td></tr>
            </tbody>
          </table>`}
        </div>

        <div class="card">
          <div class="card-title">Distribución del año</div>
          <${Donut} items=${OUT_KEYS.map((key) => ({ k: key, label: sectionOf(key).label, value: total[key].real }))} centerLabel="Usado en el año" />
        </div>

        <div class="card">
          <div class="card-title">Resumen por mes</div>
          <table class="table">
            <thead><tr><th>Mes</th><th>Ingresos</th><th>Usado</th><th>Sin usar</th></tr></thead>
            <tbody>
              ${withData.map(
                (r) => html`<tr key=${r.key} onClick=${() => go(`mes/${r.key}/resumen`)} style="cursor:pointer">
                  <td>${MONTHS_SHORT[r.month - 1].replace(/^./, (c) => c.toUpperCase())}</td>
                  <td>${fmt(r.s.ingresos.real)}</td>
                  <td>${fmt(r.s.usado.real)}</td>
                  <td><${Money} value=${r.s.sinUsar.real} /></td>
                </tr>`,
              )}
              <tr class="total">
                <td>Total</td>
                <td>${fmt(total.ingresos.real)}</td>
                <td>${fmt(total.usado.real)}</td>
                <td><${Money} value=${total.sinUsar.real} /></td>
              </tr>
            </tbody>
          </table>
          <p class="card-note">Toca un mes para ver su detalle. Montos reales.</p>
        </div>

        <div class="card flush">
          ${SECTIONS.map(
            (s) => html`<div class="row" key=${s.key}>
              <${Dot} k=${s.key} />
              <span class="grow">${s.label}</span>
              <span class="small num"><span class="strong">${fmt(total[s.key].real)}</span> <span class="muted">de ${fmt(total[s.key].est)}</span></span>
            </div>`,
          )}
        </div>
      `}
  </div>`;
}
