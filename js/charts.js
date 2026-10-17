// Gráficos en SVG: dona de distribución y barras de presupuesto vs real.
// Colores por rol (variables CSS --c-*); el presupuesto va en gris como contexto.

import { html, useState } from '../vendor/preact-htm.js';
import { fmt, fmtCompact } from './format.js';

function niceScale(max, ticks = 4) {
  if (!(max > 0)) return { max: 100, step: 25 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { max: step * Math.ceil(max / step - 1e-9), step };
}

// Barra vertical con esquinas superiores redondeadas (4px) y base recta.
function barPath(x, y, w, h) {
  if (h <= 0) return '';
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Barras agrupadas: por cada grupo, presupuesto (gris) y real (color del grupo).
 * groups: [{ label, title, est, real, k }]
 */
export function GroupedBars({ groups, height = 190, capLabels = true, hint = 'Toca una barra para ver el detalle' }) {
  const [sel, setSel] = useState(null);
  const W = 340;
  const m = { l: 40, r: 6, t: capLabels ? 18 : 8, b: 24 };
  const plotW = W - m.l - m.r;
  const plotH = height - m.t - m.b;
  const { max, step } = niceScale(Math.max(0, ...groups.flatMap((g) => [g.est || 0, g.real || 0])));
  const y = (v) => m.t + plotH - (Math.max(v, 0) / max) * plotH;
  const band = plotW / groups.length;
  const barW = Math.min(24, Math.max(4, (band - 10) / 2));
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(v);
  const g = sel != null ? groups[sel] : null;

  return html`<div class="chart">
    <div class="readout" aria-live="polite">
      ${g
        ? html`<b>${fmt(g.real)}</b> real · ${fmt(g.est)} presupuesto<span class="sub">${g.title || g.label}</span>`
        : html`<span class="sub">${hint}</span>`}
    </div>
    <svg viewBox=${`0 0 ${W} ${height}`} role="img" aria-label="Presupuesto contra real">
      ${ticks.map(
        (v) => html`<line class=${v === 0 ? 'base' : 'grid'} x1=${m.l} x2=${W - m.r} y1=${y(v)} y2=${y(v)} />
          <text class="axis-label" x=${m.l - 6} y=${y(v) + 3.5} text-anchor="end">${fmtCompact(v)}</text>`,
      )}
      ${groups.map((gr, i) => {
        const x0 = m.l + i * band + (band - (2 * barW + 2)) / 2;
        const dim = sel != null && sel !== i;
        const hEst = (Math.max(gr.est || 0, 0) / max) * plotH;
        const hReal = (Math.max(gr.real || 0, 0) / max) * plotH;
        return html`<g key=${i}>
          <path class=${`mark ${dim ? 'dim' : ''}`} d=${barPath(x0, y(gr.est || 0), barW, hEst)} fill="var(--c-presupuesto)" />
          <path class=${`mark ${dim ? 'dim' : ''}`} d=${barPath(x0 + barW + 2, y(gr.real || 0), barW, hReal)} fill=${`var(--c-${gr.k})`} />
          ${capLabels && gr.real > 0 && html`<text class="cap-label" x=${x0 + barW + 2 + barW / 2} y=${y(gr.real) - 5} text-anchor="middle">${fmtCompact(gr.real)}</text>`}
          <text class="axis-label" x=${m.l + i * band + band / 2} y=${height - 6} text-anchor="middle">${gr.label}</text>
          <rect class="hit" x=${m.l + i * band} y=${m.t - 10} width=${band} height=${plotH + 10 + m.b} tabindex="0"
            role="button" aria-label=${`${gr.title || gr.label}: real ${fmt(gr.real)}, presupuesto ${fmt(gr.est)}`}
            onClick=${() => setSel(i)} onFocus=${() => setSel(i)} />
        </g>`;
      })}
    </svg>
  </div>`;
}

function arcPath(cx, cy, R, r, a0, a1) {
  const p = (rad, a) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(R, a0)}A${R},${R} 0 ${large} 1 ${p(R, a1)}L${p(r, a1)}A${r},${r} 0 ${large} 0 ${p(r, a0)}Z`;
}

/**
 * Dona de distribución con leyenda (la leyenda lleva los montos y porcentajes).
 * items: [{ k, label, value }]
 */
export function Donut({ items, centerLabel = 'Total' }) {
  const [sel, setSel] = useState(null);
  const data = items.filter((d) => d.value > 0.004);
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!data.length) return html`<p class="card-note">Todavía no hay montos para mostrar.</p>`;
  const S = 200;
  const c = S / 2;
  const R = 94;
  const r = 64;
  const gap = data.length > 1 ? 2 / R : 0;
  let a = -Math.PI / 2;
  const arcs = data.map((d) => {
    const ang = (d.value / total) * Math.PI * 2;
    const start = a + gap / 2;
    const end = Math.max(a + ang - gap / 2, start + 0.002);
    a += ang;
    return { ...d, start, end };
  });
  const cur = sel != null ? data.find((d) => d.k === sel) : null;
  const pct = (v) => `${Math.round((v / total) * 100)}%`;

  return html`<div class="chart donut-wrap">
    <svg viewBox=${`0 0 ${S} ${S}`} role="img" aria-label="Distribución">
      ${arcs.length === 1
        ? html`<circle cx=${c} cy=${c} r=${(R + r) / 2} fill="none" stroke=${`var(--c-${arcs[0].k})`} stroke-width=${R - r} />`
        : arcs.map(
            (d) => html`<path key=${d.k} class=${`mark ${sel && sel !== d.k ? 'dim' : ''}`} d=${arcPath(c, c, R, r, d.start, d.end)} fill=${`var(--c-${d.k})`}
              tabindex="0" role="button" aria-label=${`${d.label}: ${fmt(d.value)}, ${pct(d.value)}`} style="cursor:pointer"
              onClick=${() => setSel(d.k)} onFocus=${() => setSel(d.k)} />`,
          )}
      <text class="donut-center-label" x=${c} y=${c - 8} text-anchor="middle">${cur ? cur.label : centerLabel}</text>
      <text class="donut-center-value" x=${c} y=${c + 16} text-anchor="middle">${fmt(cur ? cur.value : total)}</text>
    </svg>
    <div class="donut-legend">
      ${data.map(
        (d) => html`<button key=${d.k} class=${sel === d.k ? 'on' : ''} onClick=${() => setSel(sel === d.k ? null : d.k)}>
          <span class="swatch" style=${`--c: var(--c-${d.k})`}></span>
          <span>${d.label}</span>
          <span class="v">${fmt(d.value)}</span>
          <span class="p">${pct(d.value)}</span>
        </button>`,
      )}
    </div>
  </div>`;
}

export function BarsLegend({ multi = false, k }) {
  return html`<div class="legend">
    <span><i class="swatch" style="--c: var(--c-presupuesto)"></i>Presupuesto</span>
    <span><i class=${`swatch ${multi ? 'multi' : ''}`} style=${k ? `--c: var(--c-${k})` : ''}></i>Real</span>
  </div>`;
}
