// Video guía: escenas animadas tipo "historias" que muestran cómo usar la app.
// Se reproduce sola; tocar a la derecha avanza, a la izquierda regresa y en el centro pausa.

import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { ui, Icon, Dot } from '../components.js';
import { setTourSeen } from '../store.js';
import { currencySymbol } from '../format.js';

const SCENE_SECONDS = 7;

// Dedo animado: llega al punto (x, y en % del escenario) y toca en el segundo `at`.
const Finger = ({ x, y, at }) => html`<span class="t-finger" style=${`left:${x}%;top:${y}%;--d:${at}s`}></span>`;
// Contenido que aparece (o desaparece) en el segundo `at`.
const After = ({ at, children }) => html`<span class="t-after" style=${`--d:${at}s`}>${children}</span>`;
// Cambia un contenido por otro en el segundo `at` (los dos ocupan el mismo lugar).
const Swap = ({ at, from, to }) => html`<span class="t-swap" style=${`--d:${at}s`}><span class="t-from">${from}</span><span class="t-to">${to}</span></span>`;

function SceneHome() {
  const $ = currencySymbol();
  return html`<div class="card hero t-glow" style="--d:0.6s">
      <div class="hero-label">Sin usar</div>
      <div class="hero-value">${$}432.73</div>
      <div class="hero-sub">de ${$}1,572.00 que te entraron este mes</div>
      <div class="hero-split">
        <div class="t-glow" style="--d:2.4s"><div class="stat-label">Por pagar</div><div class="stat-value">${$}357.30</div></div>
        <div class="t-glow" style="--d:3.6s"><div class="stat-label">Te quedaría al final</div><div class="stat-value">${$}75.43</div></div>
      </div>
    </div>
    <div class="card flush">
      ${[['ingresos', 'Ingresos', 100], ['fijos', 'Gastos fijos', 80], ['variables', 'Gastos variables', 45], ['deudas', 'Deudas', 50]].map(
        ([k, l, p]) => html`<div class="row" key=${k}><div class="grow">
          <div class="head-row"><span class="name" style="display:flex;align-items:center;gap:8px"><${Dot} k=${k} />${l}</span></div>
          <div class="meter" style=${`--c: var(--c-${k})`}><span class="t-grow" style=${`--w:${p}%;--d:1.2s`}></span></div>
        </div></div>`,
      )}
    </div>`;
}

function SceneGasto() {
  const $ = currencySymbol();
  return html`<div class="t-stage-home">
      <div class="card hero"><div class="hero-label">Sin usar</div><div class="hero-value">
        <${Swap} at=${5.2} from=${`${$}432.73`} to=${`${$}420.23`} />
      </div></div>
      <span class="fab t-static">＋ Gasto</span>
    </div>
    <${Finger} x=${82} y=${26} at=${0.6} />
    <div class="t-sheet" style="--d:1.4s">
      <div class="field big"><span>¿Cuánto gastaste?</span>
        <div class="money-input"><b>${$}</b><span class="t-type">
          ${['1', '2', '.', '5', '0'].map((c, i) => html`<${After} at=${2 + i * 0.25}>${c}<//>`)}
        </span></div>
      </div>
      <div class="field"><span>Categoría</span>
        <div class="chips">
          <span class="t-chip">Supermercado</span>
          <span class="t-chip t-on" style="--d:3.8s">Gasolina</span>
          <span class="t-chip">Salidas</span>
        </div>
      </div>
      <span class="btn primary t-press" style="--d:4.8s">Guardar</span>
      <${Finger} x=${48} y=${60} at=${3.4} />
      <${Finger} x=${50} y=${88} at=${4.4} />
    </div>`;
}

function ScenePagar() {
  const $ = currencySymbol();
  const rows = [['Alquiler', '250.00', 1.4], ['Internet', '25.00', 3.2]];
  return html`<div class="card flush">
    <div class="row"><${Dot} k="fijos" /><span class="grow strong">Gastos fijos</span></div>
    ${rows.map(
      ([n, v, at]) => html`<div class="row" key=${n} style="padding-left:12px">
        <span class="check on" style="--c: var(--c-fijos)">
          <${Swap} at=${at + 0.4} from=${html`<span style="color:var(--axis);display:flex"><${Icon} name="circle" size=${26} /></span>`} to=${html`<${Icon} name="checked" size=${26} />`} />
        </span>
        <div class="grow"><div class="name">${n}</div><div class="meta">Planeado ${$}${v}</div></div>
        <div class="end">
          <div class="amount"><${Swap} at=${at + 0.4} from="—" to=${`${$}${v}`} /></div>
          <div class="meta"><${Swap} at=${at + 0.4} from="Pendiente" to="Pagado" /></div>
        </div>
      </div>`,
    )}
    <div class="row"><div class="grow"><div class="name">Supermercado</div><div class="meta">Planeado ${$}250.00</div></div><div class="end"><div class="amount">—</div><div class="meta">Pendiente</div></div></div>
    <${Finger} x=${9} y=${36} at=${1.4} />
    <${Finger} x=${9} y=${57} at=${3.2} />
  </div>`;
}

function SceneSueldo() {
  const $ = currencySymbol();
  return html`<div class="card hero">
    <div class="hero-label">Sin usar</div>
    <div class="hero-value"><${Swap} at=${2.2} from=${`${$}0.00`} to=${`${$}1,458.12`} /></div>
    <div class="notice t-hide" style="--d:2.2s">
      <div class="grow">Tu ingreso de <b>${$}1,300.00</b> todavía no está marcado como recibido.</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <span class="btn small primary">Recibido</span>
        <span class="btn small secondary t-press" style="--d:1.9s;background:var(--card)">Otro monto</span>
      </div>
    </div>
    <div class="t-reveal" style="--d:2.4s">
      <p class="card-note pos" style="margin-top:12px">Te llegaron ${$}158.12 más de lo normal (horas extra).</p>
    </div>
    <${Finger} x=${80} y=${80} at=${1.2} />
  </div>`;
}

function SceneDeuda() {
  const $ = currencySymbol();
  return html`<div class="card">
    <div class="head-row"><span class="strong" style="font-size:17px">Carro</span><span class="small muted num">Cuota ${$}125.00</span></div>
    <div class="stat-value" style="margin-top:8px">Te faltan ${$}2,500.00</div>
    <div class="meter" style="--c: var(--c-deudas)"><span class="t-grow" style="--w:17%;--d:1s"></span></div>
    <div class="small muted" style="margin-top:6px">Pagado ${$}500.00 de ${$}3,000.00 · unos 20 meses más</div>
  </div>
  <div class="card t-glow" style="--d:2.6s">
    <div class="head-row"><span class="strong" style="font-size:17px">Préstamo</span><span class="small muted num">Cuota ${$}232.30</span></div>
    <div class="small muted" style="margin-top:6px">Toca la deuda y escribe cuánto debes para ver cuánto te falta.</div>
  </div>
  <${Finger} x=${50} y=${33} at=${3.2} />`;
}

function SceneMes() {
  return html`<div class="card"><div class="empty" style="padding:16px 8px">
    <span class="art"><${Icon} name="copy" size=${28} /></span>
    <h3>Noviembre está vacío</h3>
    <p>Copia el presupuesto del mes anterior. Lo real queda en blanco para que lo vayas marcando.</p>
    <span class="btn primary t-press" style="--d:2s">Copiar de Octubre</span>
  </div></div>
  <div class="card t-after block" style="--d:2.4s">
    <div class="small muted">¡Listo! Mismos ingresos, gastos y deudas.</div>
  </div>
  <${Finger} x=${50} y=${41} at=${1.2} />`;
}

function SceneRespaldo() {
  return html`<div class="card flush">
    <div class="row"><span style="color:var(--ink-2);display:flex"><${Icon} name="download" /></span><div class="grow"><div class="name">Exportar a Excel</div><div class="meta">Todo en un archivo .xlsx</div></div></div>
    <div class="row t-glow" style="--d:1.6s"><span style="color:var(--ink-2);display:flex"><${Icon} name="share" /></span><div class="grow"><div class="name">Guardar respaldo</div><div class="meta">Guárdalo en Archivos, iCloud o Google Drive</div></div></div>
    <div class="row"><span style="color:var(--ink-2);display:flex"><${Icon} name="upload" /></span><div class="grow"><div class="name">Restaurar respaldo</div><div class="meta">Si cambias de teléfono</div></div></div>
  </div>
  <${Finger} x=${50} y=${18} at=${1.2} />`;
}

const SCENES = [
  { title: 'Tu mes de un vistazo', text: 'En Inicio ves cuánto te queda sin usar, lo que falta por pagar y cuánto te quedaría al final del mes.', tab: 'Inicio', View: SceneHome },
  { title: 'Anota cada gasto', text: 'Toca «+ Gasto», escribe cuánto gastaste y elige la categoría. Se resta solo de lo que te queda.', tab: 'Inicio', View: SceneGasto },
  { title: 'Marca lo que pagas', text: 'En Mes → Presupuesto, toca el círculo cuando pagues algo fijo: alquiler, internet, el gym…', tab: 'Mes', View: ScenePagar },
  { title: 'Cuando te pagan', text: 'Toca «Recibido» si te llegó lo normal, u «Otro monto» si te llegó distinto (con horas extra, por ejemplo).', tab: 'Inicio', View: SceneSueldo },
  { title: 'Controla tus deudas', text: 'En Deudas, escribe cuánto debes y verás cuánto te falta y en cuántos meses terminas.', tab: 'Deudas', View: SceneDeuda },
  { title: 'Cada mes nuevo', text: 'Al empezar el mes, copia el presupuesto del anterior con un toque. No tienes que escribir todo otra vez.', tab: 'Mes', View: SceneMes },
  { title: 'No pierdas tus datos', text: 'Tus datos viven solo en tu teléfono. Una vez al mes, ve a Ajustes → Guardar respaldo.', tab: 'Ajustes', View: SceneRespaldo },
];

export function Tour() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const last = i === SCENES.length - 1;

  const close = () => {
    setTourSeen();
    ui.close();
  };
  const next = () => (last ? setDone(true) : setI(i + 1));
  const prev = () => (done ? setDone(false) : setI(Math.max(0, i - 1)));
  useEffect(() => setPaused(false), [i, done]);

  const onTap = (e) => {
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) prev();
    else if (x > 0.7) next();
    else setPaused(!paused);
  };

  if (done) {
    return html`<div class="tour">
      <div class="tour-end">
        <span class="art"><${Icon} name="check" size=${32} stroke=${2.4} /></span>
        <h2>¡Ya sabes usar Finanzas!</h2>
        <p>Recuerda: anota tus gastos, marca lo que pagas y guarda un respaldo cada mes.</p>
        <div class="stack" style="width:100%">
          <button class="btn primary" onClick=${close}>Empezar a usarla</button>
          <button class="btn secondary" onClick=${() => { setDone(false); setI(0); }}>Ver de nuevo</button>
        </div>
      </div>
    </div>`;
  }

  const s = SCENES[i];
  return html`<div class=${`tour ${paused ? 'paused' : ''}`}>
    <div class="tour-bars">
      ${SCENES.map((_, k) => html`<span key=${k}><i class=${k < i ? 'full' : k === i ? 'run' : ''} style=${k === i ? `animation-duration:${SCENE_SECONDS}s` : ''}
        onAnimationEnd=${k === i ? next : null}></i></span>`)}
    </div>
    <div class="tour-top">
      <span class="tour-tab">${s.tab}</span>
      <button class="tour-close" aria-label="Cerrar guía" onClick=${close}><${Icon} name="plus" size=${26} /></button>
    </div>
    <div class="tour-stage" key=${i} onClick=${onTap}>
      <div class="tour-screen"><${s.View} /></div>
      <div class="tour-caption">
        <h2>${s.title}</h2>
        <p>${s.text}</p>
      </div>
      ${paused && html`<div class="tour-paused">Pausado · toca para seguir</div>`}
    </div>
    <div class="tour-hint">← Atrás · Toca en medio para pausar · Siguiente →</div>
  </div>`;
}

// Pantalla completa, sin el marco de hoja modal.
Tour.bare = true;
