import { html, render, useState, useEffect } from '../vendor/preact-htm.js';
import { useRoute, useStore, Icon, SheetHost, watchKeyboard } from './components.js';
import { requestPersistence, getSaveError } from './store.js';
import { MessageSheet } from './actions.js';
import { Home } from './views/home.js';
import { MonthView } from './views/month.js';
import { DebtsView } from './views/debts.js';
import { YearView } from './views/year.js';
import { SettingsView } from './views/settings.js';
import { TxSheet, ItemSheet, DebtSheet, ConfirmSheet } from './views/sheets.js';
import { Welcome } from './views/welcome.js';

const SHEETS = { tx: TxSheet, item: ItemSheet, debt: DebtSheet, confirm: ConfirmSheet, message: MessageSheet, welcome: Welcome };

const TABS = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'mes', label: 'Mes', icon: 'month' },
  { id: 'deudas', label: 'Deudas', icon: 'debt' },
  { id: 'anio', label: 'Año', icon: 'year' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
];

// Avisa cuando hay una versión nueva de la app lista para usarse.
function useServiceWorker() {
  const [waiting, setWaiting] = useState(null);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloading) {
        reloading = true;
        location.reload();
      }
    });
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        const check = () => reg.waiting && navigator.serviceWorker.controller && setWaiting(reg.waiting);
        check();
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => sw.state === 'installed' && check());
        });
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
      })
      .catch(() => {});
  }, []);
  return waiting;
}

function App() {
  const [name, a, b] = useRoute();
  const waiting = useServiceWorker();
  const saveError = getSaveError();
  const state = useStore();
  const showWelcome = !state.meta.onboarded && !Object.keys(state.months).length;

  let view;
  if (name === 'mes') view = html`<${MonthView} keyParam=${a} tabParam=${b} />`;
  else if (name === 'deudas') view = html`<${DebtsView} />`;
  else if (name === 'anio') view = html`<${YearView} yearParam=${a} />`;
  else if (name === 'ajustes') view = html`<${SettingsView} />`;
  else view = html`<${Home} />`;
  const active = TABS.some((t) => t.id === name) ? name : 'inicio';

  return html`<div class="app">
    <main class="screen">
      ${saveError && html`<div class="notice" style="margin-bottom:12px; color: var(--bad)">No se pudieron guardar los últimos cambios (el iPhone no tiene espacio para esta app). Guarda un respaldo.</div>`}
      ${view}
    </main>
    ${waiting &&
    html`<div class="update-bar" role="status">
      <span class="grow">Hay una versión nueva de la app.</span>
      <button class="btn small primary" onClick=${() => waiting.postMessage({ type: 'SKIP_WAITING' })}>Actualizar</button>
    </div>`}
    <nav class="tabbar" aria-label="Secciones">
      ${TABS.map(
        (t) => html`<a href=${`#/${t.id}`} class=${`tab ${active === t.id ? 'on' : ''}`} aria-current=${active === t.id ? 'page' : null}
          onClick=${(e) => { if (active === t.id && !a) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
          style="text-decoration:none">
          <${Icon} name=${t.icon} size=${25} />
          <span>${t.label}</span>
        </a>`,
      )}
    </nav>
    ${showWelcome && html`<${Welcome} mode="first" />`}
    <${SheetHost} registry=${SHEETS} />
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));
watchKeyboard();
requestPersistence();

