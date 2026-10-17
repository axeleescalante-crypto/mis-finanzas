// Piezas compartidas de la interfaz: hooks, íconos, navegación y hojas modales.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { getState, subscribe } from './store.js';
import { fmt, fmtSigned } from './format.js';

// --- Estado de la interfaz (hoja abierta y mensajes) ---------------------------

const uiListeners = new Set();
const uiState = { sheet: null, toast: null };
const emitUI = () => uiListeners.forEach((fn) => fn());

export const ui = {
  open(type, props = {}) {
    uiState.sheet = { type, props, id: Date.now() };
    emitUI();
  },
  close() {
    uiState.sheet = null;
    emitUI();
  },
  toast(msg) {
    const id = Date.now();
    uiState.toast = { msg, id };
    emitUI();
    setTimeout(() => {
      if (uiState.toast?.id === id) {
        uiState.toast = null;
        emitUI();
      }
    }, 2600);
  },
};

function useForceUpdate(sub) {
  const [, set] = useState(0);
  useEffect(() => sub(() => set((n) => n + 1)), []);
}

export function useStore() {
  useForceUpdate(subscribe);
  return getState();
}

export function useUI() {
  useForceUpdate((fn) => {
    uiListeners.add(fn);
    return () => uiListeners.delete(fn);
  });
  return uiState;
}

// --- Rutas (#/inicio, #/mes/2026-10/gastos, ...) --------------------------------

export function useRoute() {
  const read = () => (location.hash.replace(/^#\/?/, '') || 'inicio').split('/');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path) => {
  location.hash = `#/${path}`;
};

// --- Íconos --------------------------------------------------------------------

const ICONS = {
  home: '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
  month: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/>',
  debt: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.8h19M6.5 15h4"/>',
  year: '<path d="M4 20.5h16"/><path d="M7.5 17v-5M12 17V6.5M16.5 17v-8" stroke-width="2.4"/>',
  settings: '<path d="M4 7h8.5M16.5 7H20M4 17h3.5M11.5 17H20"/><circle cx="14.5" cy="7" r="2"/><circle cx="9.5" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  right: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  checked: '<circle cx="12" cy="12" r="9.25" fill="currentColor" stroke="none"/><path d="m7.8 12.3 2.8 2.8 5.6-5.8" stroke="#fff" stroke-width="2"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
  file: '<path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3.5V9h5.5M8.5 13.5l3.5 4M12 13.5l-3.5 4"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6A2 2 0 0 0 13.5 4H6A2 2 0 0 0 4 6v7.5a2 2 0 0 0 2 2h2.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.8h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6.5A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-6.5A1.5 1.5 0 0 0 18 11h-1"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><path d="M15.5 12h4.5"/>',
};

export function Icon({ name, size = 24, stroke = 1.8 }) {
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: ICONS[name] || '' }}></svg>`;
}

// --- Piezas pequeñas -----------------------------------------------------------

export function Money({ value, signed = false, negRed = true, className = '' }) {
  const v = value || 0;
  const cls = `${className} ${negRed && v < -0.004 ? 'neg' : ''} ${signed && v > 0.004 ? 'pos' : ''}`.trim();
  return html`<span class=${cls}>${signed ? fmtSigned(v) : fmt(v)}</span>`;
}

export const Dot = ({ k }) => html`<span class="dot" style=${`--c: var(--c-${k})`}></span>`;

export function Meter({ k, value, max }) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : value > 0 ? 1 : 0;
  return html`<div class="meter" style=${`--c: var(--c-${k})`} role="img" aria-label=${`${Math.round(pct * 100)}%`}>
    <span style=${`width: ${pct * 100}%`}></span>
  </div>`;
}

export function Segmented({ options, value, onChange, compact = false, label }) {
  return html`<div class=${`seg ${compact ? 'compact' : ''}`} role="tablist" aria-label=${label}>
    ${options.map(
      (o) => html`<button role="tab" aria-selected=${o.value === value} class=${o.value === value ? 'on' : ''} onClick=${() => onChange(o.value)}>${o.label}</button>`,
    )}
  </div>`;
}

export function Empty({ icon = 'wallet', title, text, children }) {
  return html`<div class="empty">
    <span class="art"><${Icon} name=${icon} size=${28} /></span>
    <h3>${title}</h3>
    ${text && html`<p>${text}</p>`}
    <div class="stack">${children}</div>
  </div>`;
}

export function SheetHead({ title, onCancel = ui.close, cancelLabel = 'Cancelar', action, actionLabel = 'Guardar', actionDisabled }) {
  return html`<div>
    <div class="grabber"></div>
    <div class="sheet-head">
      <button class="side" onClick=${onCancel}>${cancelLabel}</button>
      <h2>${title}</h2>
      ${action ? html`<button class="side r" onClick=${action} disabled=${actionDisabled}>${actionLabel}</button>` : html`<span class="side"></span>`}
    </div>
  </div>`;
}

// Mantiene las hojas modales por encima del teclado del iPhone.
export function watchKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const on = () => {
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb', `${kb > 80 ? kb : 0}px`);
  };
  vv.addEventListener('resize', on);
  vv.addEventListener('scroll', on);
}

export function SheetHost({ registry }) {
  const { sheet, toast } = useUI();
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e) => e.key === 'Escape' && ui.close();
    addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [sheet?.id]);
  const Comp = sheet && registry[sheet.type];
  return html`
    ${Comp && html`<div class="overlay" onClick=${ui.close}></div>
      <div class="sheet" role="dialog" aria-modal="true" key=${sheet.id}><${Comp} ...${sheet.props} /></div>`}
    ${toast && html`<div class="toast" role="status" key=${toast.id}>${toast.msg}</div>`}
  `;
}

// Guarda un archivo: en iPhone abre el menú Compartir ("Guardar en Archivos").
export async function saveFile(bytes, filename, type) {
  const blob = new Blob([bytes], { type });
  const file = typeof File === 'function' ? new File([blob], filename, { type }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      if (e?.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = () => {
      resolve(input.files?.[0] || null);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
}

export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
