import { html } from '../../vendor/preact-htm.js';
import { useStore, ui, Icon, isStandalone, InstallSteps } from '../components.js';
import { setPayday, resetAll, setCurrencyCode } from '../store.js';
import { exportExcel, saveBackup, restoreBackup } from '../actions.js';
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
      <${ActionRow} icon="download" title="Exportar a Excel" meta="Todo en un archivo .xlsx" onClick=${exportExcel} />
      <${ActionRow} icon="share" title="Guardar respaldo" meta=${last ? `Último respaldo: ${fmtDate(last.slice(0, 10))}` : 'Aún no tienes un respaldo'} onClick=${saveBackup} />
      <${ActionRow} icon="upload" title="Restaurar respaldo" meta="Reemplaza tus datos con un respaldo .json" onClick=${restoreBackup} />
    </div>
    <p class="card-note" style="margin: 0 4px">Tus datos se guardan solo en este teléfono; no se envían a ningún servidor. Guarda un respaldo en Archivos, iCloud Drive o Google Drive de vez en cuando.</p>

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
    html`<h2 class="subtitle">Instalar en tu teléfono</h2>
      <div class="card">
        <${InstallSteps} />
        <p class="card-note">Los datos que guardes en el navegador y en la app instalada pueden ser distintos: empieza a usarla desde el ícono.</p>
      </div>`}

    ${hasData &&
    html`<div class="btn-row" style="margin-top:32px">
      <button class="btn danger" onClick=${() => ui.open('confirm', {
        title: 'Borrar todo',
        message: 'Se borrarán todos tus meses, gastos y deudas de este teléfono. Si no tienes un respaldo, no se pueden recuperar.',
        confirmLabel: 'Borrar todo',
        onConfirm: () => { resetAll(); ui.toast('Datos borrados'); },
      })}>Borrar todos los datos</button>
    </div>`}

    <p class="footer-note">Mis Finanzas ${VERSION}</p>
  </div>`;
}
