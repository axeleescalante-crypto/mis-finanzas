// Hojas modales: gasto, renglón del presupuesto, deuda y confirmar.

import { html, useState } from '../../vendor/preact-htm.js';
import { useStore, ui, SheetHead, Segmented } from '../components.js';
import { emptyMonth, norm, sectionOf, debtsOverview, payBreakdown } from '../calc.js';
import { saveTx, deleteTx, saveItem, deleteItem, setDebtInfo, renameDebt } from '../store.js';
import { fmt, parseAmount, amountInput, todayISO, currentKey, monthLabel, monthName, daysInMonth, currencySymbol } from '../format.js';

function defaultDate(key) {
  const cur = currentKey();
  if (key === cur) return todayISO();
  return key < cur ? `${key}-${String(daysInMonth(key)).padStart(2, '0')}` : `${key}-01`;
}

export function TxSheet({ monthKey, tx }) {
  const state = useStore();
  const m = state.months[monthKey] || emptyMonth();
  const cats = [];
  for (const c of [...m.variables.map((v) => v.name), ...m.tx.map((t) => t.cat)]) {
    if (c?.trim() && !cats.some((x) => norm(x) === norm(c))) cats.push(c.trim());
  }
  const [amount, setAmount] = useState(tx ? amountInput(tx.amount) : '');
  const [cat, setCat] = useState(tx?.cat || (cats.length === 1 ? cats[0] : ''));
  const [newCat, setNewCat] = useState(false);
  const [date, setDate] = useState(tx?.date || defaultDate(monthKey));
  const [note, setNote] = useState(tx?.note || '');
  const [err, setErr] = useState('');

  const save = () => {
    const a = parseAmount(amount);
    if (!(a > 0)) return setErr('Escribe una cantidad mayor que cero.');
    if (!cat.trim()) return setErr('Elige o escribe una categoría.');
    saveTx(monthKey, { id: tx?.id, amount: a, cat, date, note });
    ui.close();
    ui.toast(tx ? 'Gasto actualizado' : 'Gasto guardado');
  };
  const remove = () => {
    deleteTx(monthKey, tx.id);
    ui.close();
    ui.toast('Gasto eliminado');
  };
  const otherMonth = date && date.slice(0, 7) !== monthKey;

  return html`
    <${SheetHead} title=${tx ? 'Editar gasto' : 'Nuevo gasto'} action=${save} />
    <label class="field big">
      <span>Cantidad</span>
      <input inputmode="decimal" enterkeyhint="done" placeholder="$0.00" value=${amount} onInput=${(e) => setAmount(e.target.value)} />
    </label>
    <div class="field">
      <span>Categoría</span>
      <div class="chips">
        ${cats.map(
          (c) => html`<button key=${c} class=${!newCat && norm(c) === norm(cat) ? 'on' : ''} onClick=${() => { setCat(c); setNewCat(false); }}>${c}</button>`,
        )}
        <button class=${newCat || !cats.length ? 'on' : ''} onClick=${() => { setNewCat(true); setCat(''); }}>+ Nueva</button>
      </div>
      ${(newCat || !cats.length) && html`<input placeholder="Nombre de la categoría" value=${cat} onInput=${(e) => setCat(e.target.value)} />`}
    </div>
    <label class="field">
      <span>Fecha</span>
      <input type="date" value=${date} onInput=${(e) => setDate(e.target.value)} />
    </label>
    ${otherMonth && html`<p class="card-note" style="margin: -4px 4px 6px">Se guarda en ${monthName(monthKey)}, aunque la fecha sea de otro mes.</p>`}
    <label class="field">
      <span>Nota</span>
      <input placeholder="Opcional" value=${note} onInput=${(e) => setNote(e.target.value)} />
    </label>
    ${err && html`<p class="error">${err}</p>`}
    <div class="btn-row"><button class="btn primary" onClick=${save}>Guardar</button></div>
    ${tx && html`<div class="btn-row"><button class="btn danger" onClick=${remove}>Eliminar gasto</button></div>`}
  `;
}

export function ItemSheet({ monthKey, section, item }) {
  const sec = sectionOf(section);
  const isVar = section === 'variables';
  const isIncome = section === 'ingresos';
  const editing = item && !item.extra;
  const p = item?.pay;
  const [name, setName] = useState(item?.name || '');
  const [est, setEst] = useState(amountInput(item?.est));
  const [real, setReal] = useState(isVar ? '' : amountInput(item?.real));
  const [mode, setMode] = useState(p ? 'variable' : 'fijo');
  const [base, setBase] = useState(amountInput(p?.base));
  const [extra, setExtra] = useState(amountInput(p?.extra));
  const [ded, setDed] = useState(p?.ded != null ? String(p.ded) : '');
  const [dedMode, setDedMode] = useState(p?.dedMode || 'pct');
  const [err, setErr] = useState('');

  const usePay = isIncome && mode === 'variable';
  const pay = usePay && parseAmount(base) > 0 ? { base: parseAmount(base), extra: parseAmount(extra), ded: parseAmount(ded), dedMode } : null;
  const calc = payBreakdown(pay);

  const save = () => {
    if (!name.trim()) return setErr('Escribe un nombre.');
    if (usePay && !calc) return setErr('Escribe tu salario base.');
    const e = usePay ? calc.estimate : est.trim() ? parseAmount(est) : null;
    let r = !isVar && real.trim() ? parseAmount(real) : null;
    if ((!usePay && est.trim() && e == null) || (!isVar && real.trim() && r == null)) return setErr('Revisa las cantidades.');
    // Si ya estaba marcado con el neto anterior, se actualiza con las horas extra nuevas.
    const oldNet = payBreakdown(p)?.net;
    if (usePay && r != null && oldNet != null && Math.abs(r - oldNet) < 0.005) r = calc.net;
    saveItem(monthKey, section, { id: editing ? item.id : null, name, est: e, real: r, pay: usePay ? pay : null });
    ui.close();
  };
  const remove = () => {
    deleteItem(monthKey, section, item.id);
    ui.close();
    ui.toast('Eliminado');
  };

  return html`
    <${SheetHead} title=${editing ? sec.label : `Agregar a ${sec.label.toLowerCase()}`} action=${save} />
    <label class="field">
      <span>Nombre</span>
      <input placeholder=${isVar ? 'Ej. Gasolina' : isIncome ? 'Ej. Salario' : section === 'deudas' ? 'Ej. Carro' : 'Ej. Alquiler'} value=${name} onInput=${(e) => setName(e.target.value)} />
    </label>
    ${isIncome &&
    html`<${Segmented} options=${[{ value: 'fijo', label: 'Monto fijo' }, { value: 'variable', label: 'Salario variable' }]} value=${mode} onChange=${setMode} label="Tipo de ingreso" />`}
    ${usePay
      ? html`
        <div class="field-row" style="margin-top:10px">
          <label class="field">
            <span>Salario base</span>
            <input inputmode="decimal" placeholder="0.00" value=${base} onInput=${(e) => setBase(e.target.value)} />
          </label>
          <label class="field">
            <span>Horas extra y bonos</span>
            <input inputmode="decimal" placeholder="Este mes" value=${extra} onInput=${(e) => setExtra(e.target.value)} />
          </label>
        </div>
        <div class="field" style="display:flex;align-items:center;gap:10px">
          <label style="flex:1"><span>Descuentos de ley</span>
            <input inputmode="decimal" placeholder=${dedMode === 'pct' ? 'Ej. 15' : '0.00'} value=${ded} onInput=${(e) => setDed(e.target.value)} />
          </label>
          <div class="seg" style="margin:0;width:96px">
            <button class=${dedMode === 'pct' ? 'on' : ''} onClick=${() => setDedMode('pct')}>%</button>
            <button class=${dedMode === 'amt' ? 'on' : ''} onClick=${() => setDedMode('amt')}>${currencySymbol()}</button>
          </div>
        </div>
        <p class="card-note" style="margin: -2px 4px 8px">Seguro social, pensión, renta… revisa tu boleta de pago. ${dedMode === 'pct' ? 'El porcentaje también se aplica a las horas extra.' : ''}</p>
        ${calc &&
        html`<div class="card" style="margin:8px 0">
          <div class="head-row small"><span class="muted">Salario base</span><span class="num">${fmt(calc.base)}</span></div>
          ${calc.extra > 0 && html`<div class="head-row small" style="margin-top:4px"><span class="muted">Horas extra y bonos</span><span class="num">+${fmt(calc.extra)}</span></div>`}
          <div class="head-row small" style="margin-top:4px"><span class="muted">Descuentos</span><span class="num">−${fmt(calc.ded)}</span></div>
          <div class="head-row" style="margin-top:8px;padding-top:8px;border-top:0.5px solid var(--line)"><span class="strong">Te llega este mes</span><span class="strong num">${fmt(calc.net)}</span></div>
          <div class="small muted" style="margin-top:4px">Presupuesto (solo el salario base): ${fmt(calc.estimate)}</div>
        </div>`}`
      : html`<label class="field">
          <span>Presupuesto (estimado)</span>
          <input inputmode="decimal" placeholder="0.00" value=${est} onInput=${(e) => setEst(e.target.value)} />
        </label>`}
    ${!isVar &&
    html`<label class="field">
        <span>${sec.paidLabel} (real)</span>
        <input inputmode="decimal" placeholder="Pendiente" value=${real} onInput=${(e) => setReal(e.target.value)} />
      </label>
      <div class="chips" style="margin: 0 2px 4px">
        ${usePay
          ? html`<button onClick=${() => setReal(amountInput(calc?.net))} disabled=${!calc}>Lo que me llega${calc ? ` (${fmt(calc.net)})` : ''}</button>`
          : html`<button onClick=${() => setReal(est)} disabled=${!est.trim()}>Igual al presupuesto</button>`}
        <button onClick=${() => setReal('')}>Pendiente</button>
      </div>`}
    ${isVar &&
    html`<p class="card-note" style="margin: 0 4px 8px">
      Lo real se calcula solo con tus gastos de esta categoría${item ? html` (${fmt(item.real)} este mes)` : ''}.
    </p>`}
    ${err && html`<p class="error">${err}</p>`}
    <div class="btn-row"><button class="btn primary" onClick=${save}>${editing ? 'Guardar' : 'Agregar'}</button></div>
    ${editing && html`<div class="btn-row"><button class="btn danger" onClick=${remove}>Eliminar</button></div>`}
    ${editing && isVar && item.real > 0 && html`<p class="card-note" style="text-align:center">Si la eliminas, sus gastos se conservan.</p>`}
  `;
}

export function DebtSheet({ name }) {
  const state = useStore();
  const ov = debtsOverview(state, currentKey());
  const d = [...ov.active, ...ov.past].find((x) => x.key === norm(name));
  const [balance, setBalance] = useState(amountInput(d?.info?.balance));
  const [since, setSince] = useState(d?.info?.since || currentKey());
  const [newName, setNewName] = useState(d?.name || name);
  const [err, setErr] = useState('');
  if (!d) return html`<${SheetHead} title="Deuda" /><p class="card-note">Esta deuda ya no existe.</p>`;

  const save = () => {
    const b = balance.trim() ? parseAmount(balance) : null;
    if (balance.trim() && !(b >= 0)) return setErr('Revisa el saldo.');
    if (!/^\d{4}-\d{2}$/.test(since)) return setErr('Elige el mes.');
    setDebtInfo(d.name, b != null ? { balance: b, since } : null);
    if (newName.trim() && norm(newName) !== d.key) renameDebt(d.name, newName);
    ui.close();
    ui.toast('Deuda actualizada');
  };

  return html`
    <${SheetHead} title=${d.name} action=${save} />
    <div class="card">
      <div class="card-title">¿Cuánto debías?</div>
      <div class="field-row">
        <label class="field" style="background: var(--field)">
          <span>Saldo</span>
          <input inputmode="decimal" placeholder="$0.00" value=${balance} onInput=${(e) => setBalance(e.target.value)} />
        </label>
        <label class="field" style="background: var(--field)">
          <span>Al inicio de</span>
          <input type="month" value=${since} onInput=${(e) => setSince(e.target.value)} />
        </label>
      </div>
      <p class="card-note">A ese saldo le restamos lo que marques como pagado desde ese mes. Si el banco te cobra intereses, actualiza el saldo de vez en cuando.</p>
    </div>
    <label class="field">
      <span>Nombre (en todos los meses)</span>
      <input value=${newName} onInput=${(e) => setNewName(e.target.value)} />
    </label>
    <p class="card-note" style="margin: -2px 4px 8px">Si le cambiaste el nombre a una deuda (por ejemplo «Credito» y «Prestamo»), ponles el mismo nombre para juntarlas.</p>
    ${err && html`<p class="error">${err}</p>`}
    <div class="btn-row"><button class="btn primary" onClick=${save}>Guardar</button></div>
    ${d.info && html`<div class="btn-row"><button class="btn danger" onClick=${() => { setDebtInfo(d.name, null); ui.close(); }}>Quitar saldo</button></div>`}
    <div class="subtitle" style="font-size:17px">Pagos</div>
    <div class="card flush">
      ${[...d.payments].reverse().map(
        (p) => html`<div class="row" key=${p.key}>
          <div class="grow"><div class="name">${monthLabel(p.key)}</div><div class="meta">Cuota ${fmt(p.est)}</div></div>
          <div class="end"><div class="amount">${p.real == null ? 'Pendiente' : fmt(p.real)}</div></div>
        </div>`,
      )}
    </div>
  `;
}

export function ConfirmSheet({ title, message, confirmLabel = 'Confirmar', danger = true, onConfirm }) {
  return html`
    <${SheetHead} title=${title} />
    <p style="margin: 8px 4px 4px; color: var(--ink-2); font-size: 16px">${message}</p>
    <div class="btn-row">
      <button class=${`btn ${danger ? 'danger' : 'primary'}`} onClick=${() => { ui.close(); onConfirm(); }}>${confirmLabel}</button>
    </div>
    <div class="btn-row"><button class="btn secondary" onClick=${ui.close}>Cancelar</button></div>
  `;
}
