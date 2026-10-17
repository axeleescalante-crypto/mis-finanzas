// Exportar y respaldar.

import { html } from '../vendor/preact-htm.js';
import { ui, pickFile, saveFile, SheetHead } from './components.js';
import { getState, markBackup, replaceAll, sanitize } from './store.js';
import { buildWorkbook } from './xlsx-export.js';
import { todayISO } from './format.js';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function MessageSheet({ title, message }) {
  return html`<${SheetHead} title=${title} cancelLabel="Cerrar" />
    <p style="margin: 8px 4px 16px; color: var(--ink-2); font-size: 16px">${message}</p>
    <button class="btn secondary" onClick=${ui.close}>Entendido</button>`;
}

const fail = (title, e) => ui.open('message', { title, message: e?.message || 'Ocurrió un error inesperado.' });

export async function exportExcel() {
  try {
    await saveFile(buildWorkbook(getState()), `Mis finanzas ${todayISO()}.xlsx`, XLSX_TYPE);
  } catch (e) {
    fail('No pude crear el Excel', e);
  }
}

export async function saveBackup() {
  const payload = JSON.stringify({ app: 'mis-finanzas', version: 1, exportedAt: new Date().toISOString(), data: getState() }, null, 1);
  try {
    if (await saveFile(new TextEncoder().encode(payload), `Respaldo mis finanzas ${todayISO()}.json`, 'application/json')) {
      markBackup();
      ui.toast('Respaldo listo');
    }
  } catch (e) {
    fail('No pude guardar el respaldo', e);
  }
}

export async function restoreBackup() {
  const file = await pickFile('.json,application/json');
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const data = raw?.app === 'mis-finanzas' ? raw.data : raw;
    if (!data || typeof data.months !== 'object') throw new Error('Este archivo no es un respaldo de Mis Finanzas.');
    const n = Object.keys(sanitize(data).months).length;
    ui.open('confirm', {
      title: 'Restaurar respaldo',
      message: `Tus datos actuales se reemplazarán por los del respaldo (${n} ${n === 1 ? 'mes' : 'meses'}).`,
      confirmLabel: 'Restaurar',
      onConfirm: () => {
        replaceAll(data);
        ui.toast('Respaldo restaurado');
      },
    });
  } catch (e) {
    fail('No pude leer el respaldo', e instanceof SyntaxError ? new Error('El archivo está dañado o no es un respaldo.') : e);
  }
}
