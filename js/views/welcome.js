// Guía de bienvenida: 3 pantallas que explican la app y, la primera vez,
// un paso para elegir moneda, ingreso y cómo empezar.

import { html, useState } from '../../vendor/preact-htm.js';
import { ui, Icon, Dot } from '../components.js';
import { finishOnboarding, setOnboarded } from '../store.js';
import { CURRENCIES, currentKey, parseAmount, MONTHS, fmt } from '../format.js';
import { payBreakdown } from '../calc.js';

const SLIDES = [
  {
    icon: 'wallet',
    title: 'Bienvenido a Mis Finanzas',
    text: 'Cada mes anotas cuánto piensas ganar y gastar, y la app lo compara con lo que de verdad pasó.',
    points: ['Tus datos se guardan solo en este teléfono.', 'No necesitas cuenta ni internet.'],
  },
  {
    icon: 'month',
    title: 'Tu presupuesto en 5 partes',
    text: 'Ingresos, ahorros, gastos fijos, gastos variables y deudas.',
    sections: true,
    points: ['Toca el círculo de un renglón cuando lo pagues.', 'Toca «+ Gasto» cada vez que compres algo: se suma solo a su categoría.'],
  },
  {
    icon: 'year',
    title: 'Lo que te queda: «Sin usar»',
    text: 'Sin usar = Ingresos − (Ahorros + Gastos fijos + Gastos variables + Deudas).',
    points: ['En Inicio ves cuánto te queda y cuánto falta por pagar.', 'En Año ves tu resumen mes a mes con gráficos.'],
  },
];

const SECTION_LABELS = [
  ['ingresos', 'Ingresos'],
  ['ahorros', 'Ahorros'],
  ['fijos', 'Gastos fijos'],
  ['variables', 'Gastos variables'],
  ['deudas', 'Deudas'],
];

function Slide({ s }) {
  return html`<div class="welcome-slide">
    <span class="art"><${Icon} name=${s.icon} size=${32} /></span>
    <h2>${s.title}</h2>
    <p>${s.text}</p>
    ${s.sections &&
    html`<div class="welcome-sections">
      ${SECTION_LABELS.map(([k, l]) => html`<span key=${k}><${Dot} k=${k} />${l}</span>`)}
    </div>`}
    <ul>${s.points.map((p) => html`<li key=${p}><${Icon} name="check" size=${18} stroke=${2.2} />${p}</li>`)}</ul>
  </div>`;
}

function Setup({ onBack }) {
  const [currency, setCurrency] = useState('USD');
  const [base, setBase] = useState('');
  const [ded, setDed] = useState('');
  const [payday, setPayday] = useState(30);
  const [err, setErr] = useState('');

  const preview = payBreakdown(parseAmount(base) > 0 ? { base: parseAmount(base), ded: parseAmount(ded), dedMode: 'pct' } : null);

  const start = (template) => {
    const b = base.trim() ? parseAmount(base) : null;
    if (base.trim() && !(b > 0)) return setErr('Revisa tu salario base.');
    const d = ded.trim() ? parseAmount(ded) : null;
    if (d != null && (d < 0 || d >= 100)) return setErr('Los descuentos van en porcentaje (de 0 a 99).');
    const pay = b ? { base: b, extra: null, ded: d, dedMode: 'pct' } : null;
    finishOnboarding(currentKey(), { currency, payday, pay, template });
    if (template) location.hash = `#/mes/${currentKey()}/presupuesto`;
  };

  return html`<div class="welcome-slide setup">
    <h2>Vamos a empezar</h2>
    <p>Puedes cambiar todo esto después en Ajustes.</p>
    <label class="field">
      <span>Moneda</span>
      <select value=${currency} onChange=${(e) => setCurrency(e.target.value)}>
        ${Object.entries(CURRENCIES).map(([code, c]) => html`<option key=${code} value=${code}>${c.label} (${code})</option>`)}
      </select>
    </label>
    <div class="field-row" style="margin:10px 0">
      <label class="field">
        <span>Salario base al mes</span>
        <input inputmode="decimal" placeholder="Opcional" value=${base} onInput=${(e) => setBase(e.target.value)} />
      </label>
      <label class="field">
        <span>Descuentos de ley (%)</span>
        <input inputmode="decimal" placeholder="Ej. 15" value=${ded} onInput=${(e) => setDed(e.target.value)} />
      </label>
    </div>
    ${preview && html`<p class="card-note" style="margin:-2px 4px 8px">Te llegarían unos <b>${fmt(preview.net)}</b> al mes. Si haces horas extra o recibes bonos, los agregas cada mes en tu ingreso.</p>`}
    <label class="field">
      <span>¿Qué día del mes te pagan?</span>
      <select value=${payday} onChange=${(e) => setPayday(+e.target.value)}>
        ${Array.from({ length: 31 }, (_, i) => i + 1).map((d) => html`<option key=${d} value=${d}>${d}</option>`)}
      </select>
    </label>
    ${err && html`<p class="error">${err}</p>`}
    <div class="stack" style="margin-top:16px">
      <button class="btn primary" onClick=${() => start('plantilla')}>Usar plantilla sugerida</button>
      <p class="card-note" style="margin:-2px 4px 2px;text-align:center">Trae categorías comunes (alquiler, supermercado, transporte…) para que solo pongas los montos de ${MONTHS[new Date().getMonth()].toLowerCase()}.</p>
      <button class="btn secondary" onClick=${() => start('blanco')}>Empezar en blanco</button>
    </div>
    <button class="welcome-back" onClick=${onBack}>Atrás</button>
  </div>`;
}

// mode "first": pantalla completa la primera vez. mode "guide": desde Ajustes.
export function Welcome({ mode = 'first' }) {
  const [i, setI] = useState(0);
  const total = SLIDES.length + (mode === 'first' ? 1 : 0);
  const close = () => (mode === 'first' ? setOnboarded() : ui.close());
  const last = i === total - 1;

  return html`<div class=${mode === 'first' ? 'welcome' : 'welcome in-sheet'}>
    <div class="welcome-top">
      ${i < SLIDES.length && html`<button class="welcome-skip" onClick=${mode === 'first' ? () => setI(SLIDES.length) : close}>${mode === 'first' ? 'Saltar' : 'Cerrar'}</button>`}
    </div>
    ${i < SLIDES.length ? html`<${Slide} s=${SLIDES[i]} />` : html`<${Setup} onBack=${() => setI(i - 1)} />`}
    ${i < SLIDES.length &&
    html`<div class="welcome-nav">
      <div class="welcome-dots">${Array.from({ length: total }, (_, k) => html`<span key=${k} class=${k === i ? 'on' : ''}></span>`)}</div>
      <div class="btn-row">
        ${i > 0 && html`<button class="btn secondary" onClick=${() => setI(i - 1)}>Atrás</button>`}
        <button class="btn primary" onClick=${() => (last ? close() : setI(i + 1))}>${last ? 'Listo' : 'Siguiente'}</button>
      </div>
    </div>`}
  </div>`;
}
