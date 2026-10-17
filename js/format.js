// Formatos de dinero, fechas y meses.

// Monedas disponibles y el formato regional de cada una.
export const CURRENCIES = {
  USD: { label: 'Dólar estadounidense', locale: 'es-SV' },
  EUR: { label: 'Euro', locale: 'es-ES' },
  MXN: { label: 'Peso mexicano', locale: 'es-MX' },
  GTQ: { label: 'Quetzal', locale: 'es-GT' },
  HNL: { label: 'Lempira', locale: 'es-HN' },
  NIO: { label: 'Córdoba', locale: 'es-NI' },
  CRC: { label: 'Colón costarricense', locale: 'es-CR' },
  PAB: { label: 'Balboa', locale: 'es-PA' },
  DOP: { label: 'Peso dominicano', locale: 'es-DO' },
  COP: { label: 'Peso colombiano', locale: 'es-CO' },
  PEN: { label: 'Sol', locale: 'es-PE' },
  CLP: { label: 'Peso chileno', locale: 'es-CL' },
  ARS: { label: 'Peso argentino', locale: 'es-AR' },
  BOB: { label: 'Boliviano', locale: 'es-BO' },
  PYG: { label: 'Guaraní', locale: 'es-PY' },
  UYU: { label: 'Peso uruguayo', locale: 'es-UY' },
};

let money;
let symbol = '$';

export function setCurrency(code) {
  const c = CURRENCIES[code] ? code : 'USD';
  money = new Intl.NumberFormat(CURRENCIES[c].locale, { style: 'currency', currency: c });
  symbol = money.formatToParts(0).find((p) => p.type === 'currency')?.value || c;
}
setCurrency('USD');

export const currencySymbol = () => symbol;

export const round2 = (n) => Math.round((n || 0) * 100) / 100;

export const fmt = (n) => money.format(round2(n));

// Diferencias: "+$15.00" / "−$20.00"
export function fmtSigned(n) {
  const v = round2(n);
  if (v === 0) return money.format(0);
  return (v > 0 ? '+' : '−') + money.format(Math.abs(v));
}

// Ejes de gráficos: $0, $500, $1.5K
export function fmtCompact(n) {
  const v = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (v >= 1000) return `${sign}${symbol}${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return `${sign}${symbol}${Math.round(v)}`;
}

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

export function parseKey(key) {
  const [y, m] = key.split('-').map(Number);
  return [y, m];
}

export function shiftKey(key, delta) {
  const [y, m] = parseKey(key);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}

export const monthName = (key) => MONTHS[parseKey(key)[1] - 1];
export const monthLabel = (key) => `${monthName(key)} ${parseKey(key)[0]}`;

export function daysInMonth(key) {
  const [y, m] = parseKey(key);
  return new Date(y, m, 0).getDate();
}

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const currentKey = (d = new Date()) => monthKey(d.getFullYear(), d.getMonth() + 1);

// "17 oct"
export function fmtDate(iso) {
  if (!iso) return 'Sin fecha';
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

// "sáb 31 ene"
export function fmtDateLong(iso) {
  if (!iso) return 'Sin fecha';
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`;
}

// Acepta "2,345.60", "2.345,60", "19,95", "$ 30" y devuelve número o null.
export function parseAmount(str) {
  if (typeof str === 'number') return Number.isFinite(str) ? round2(str) : null;
  let s = String(str ?? '').replace(/[^\d.,-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    // El último separador es el decimal.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  }
  else if (/,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? round2(n) : null;
}

// Valor inicial de un campo de monto.
export const amountInput = (n) => (n == null ? '' : String(round2(n)));
