import { html } from '../../vendor/preact-htm.js';
import { useStore, ui, Icon, isStandalone } from '../components.js';
import { setPayday, resetAll, setCurrencyCode } from '../store.js';
import { importExcelFlow, exportExcel, saveBackup, restoreBackup } from '../actions.js';
import { fmtDate, CURRENCIES } from '../format.js';
import { VERSION } from '../version.js';

function ActionRow({ icon, title, meta, onClick }) {
  return html`<button class="row" onClick=${onClick}>
    <span style="color: var(--ink-2); display:flex"><${Icon} name=${icon} /></span>
    <div class="grow"><div class="name">${title}</div><div class="meta">${meta}</div></div>
    <span class="chev"><${Icon} name="right" size=${20} /></span>
  </button>`;
}

export function SettingsView() {
  const state = useStore();
  const last = state.meta.lastBackup;
  const payday = state.settings.payday;
  const hasData = Object.keys(state.months).length > 0;

  return html`<div>
    <h1 class="title" style="margin-top:12px">Ajustes</h1>

    <h2 class="subtitle">Tus datos</h2>
    <div class="card flush">
      <${ActionRow} icon="file" title="Importar desde Excel" meta="Trae los meses de tu archivo .xlsx" onClick=${importExcelFlow} />
      <${ActionRow} icon="download" title="Exportar a Excel" meta="Todo en un archivo .xlsx" onClick=${exportExcel} />
      <${ActionRow} icon="share" title="Guardar respaldo" meta=${last ? `Último respaldo: ${fmtDate(last.slice(0, 10))}` : 'Aún no tienes un respaldo'} onClick=${saveBackup} />
      <${ActionRow} icon="upload" title="Restaurar respaldo" meta="Reemplaza tus datos con un respaldo .json" onClick=${restoreBackup} />
    </div>
    <p class="card-note" style="margin: 0 4px">Tus datos se guardan solo en este iPhone; no se envían a ningún servidor. Guarda un respaldo en Archivos o iCloud Drive de vez en cuando.</p>

    <h2 class="subtitle">Preferencias</h2>
    <div class="card flush">
      <div class="row">
        <div class="grow"><div class="name">Día de pago</div><div class="meta">El día del mes en que te pagan</div></div>
        <button class="icon-btn" aria-label="Un día antes" disabled=${payday <= 1} onClick=${() => setPayday(payday - 1)}><${Icon} name="left" /></button>
        <span class="strong num" style="min-width:24px;text-align:center">${payday}</span>
        <button class="icon-btn" aria-label="Un día después" disabled=${payday >= 31} onClick=${() => setPayday(payday + 1)}><${Icon} name="right" /></button>
      </div>
      <label class="row">
        <div class="grow"><div class="name">Moneda</div><div class="meta">${CURRENCIES[state.settings.currency].label}</div></div>
        <select class="select" value=${state.settings.currency} onChange=${(e) => setCurrencyCode(e.target.value)} aria-label="Moneda">
          ${Object.keys(CURRENCIES).map((code) => html`<option key=${code} value=${code}>${code}</option>`)}
        </select>
      </label>
    </div>

    <h2 class="subtitle">Ayuda</h2>
    <div class="card flush">
      <${ActionRow} icon="info" title="Ver guía de bienvenida" meta="Cómo funciona la app, en 3 pasos" onClick=${() => ui.open('welcome', { mode: 'guide' })} />
    </div>

    ${!isStandalone() &&
    html`<h2 class="subtitle">Instalar en tu iPhone</h2>
      <div class="card">
        <ol class="steps">
          <li>Abre esta página en <b>Safari</b>.</li>
          <li>Toca el botón <b>Compartir</b> (el cuadrito con la flecha hacia arriba).</li>
          <li>Elige <b>Agregar a pantalla de inicio</b> y toca <b>Agregar</b>.</li>
          <li>Abre la app desde el ícono <b>Finanzas</b> en tu pantalla de inicio.</li>
        </ol>
        <p class="card-note">Los datos que guardes en Safari y en la app instalada son distintos: empieza a usarla desde el ícono.</p>
      </div>`}

    ${hasData &&
    html`<div class="btn-row" style="margin-top:32px">
      <button class="btn danger" onClick=${() => ui.open('confirm', {
        title: 'Borrar todo',
        message: 'Se borrarán todos tus meses, gastos y deudas de este iPhone. Si no tienes un respaldo, no se pueden recuperar.',
        confirmLabel: 'Borrar todo',
        onConfirm: () => { resetAll(); ui.toast('Datos borrados'); },
      })}>Borrar todos los datos</button>
    </div>`}

    <p class="footer-note">Mis Finanzas ${VERSION}</p>
  </div>`;
}
