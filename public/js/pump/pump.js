// Pump page: draws each pump and passes key presses to it.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
// The pumps themselves run on the server; this page shows them and sends key presses.
import { connect, station, withStation } from '../link.js';
import { drawTrend } from '../trend.js';

const $ = (id) => document.getElementById(id);
const pumpsEl = $('pumps');
const MAX_PUMPS = 4;
const STYLE_NAMES = { generic: 'Generic TCI pump', alaris: 'Alaris PK style', agilia: 'Agilia style', space: 'Space style' };
const els = new Map(); // pump id -> element
let state = null;
let audioCtx = null;
let soundOn = false;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- drawing the screen ----------

function listHtml(s, tap) {
  // Show a window of up to five options around the selected one.
  const first = Math.max(0, Math.min(s.index - 2, s.options.length - 5));
  return s.options
    .slice(first, first + 5)
    .map((o, i) => {
      const index = first + i;
      const cls = index === s.index ? 'opt sel' : 'opt';
      const sub = o.sub ? `<small>${esc(o.sub)}</small>` : '';
      return tap
        ? `<button type="button" class="${cls}" data-select="${index}">${esc(o.label)}${sub}</button>`
        : `<div class="${cls}">${esc(o.label)}${sub}</div>`;
    })
    .join('');
}

function screenHtml(s, style) {
  // `style` is the pump's state from the server (for tapToSelect)
  const w = s.words;
  const soft = (left, mid, right) =>
    `<div class="soft">${[left, mid, right]
      .map((k) => k ?? [])
      .map(([key, label]) => (key ?`<button type="button" data-key="${key}">${esc(label)}</button>` : '<span></span>'))
      .join('')}</div>`;
  const title = (text, right = '') =>
    `<div class="lcd-title" style="--drug:${s.color}"><span>${esc(text)}</span><span>${esc(right ?? '')}</span></div>`;
  const alarm = s.alarm
    ? `<div class="lcd-alarm ${s.alarmAcked ? 'acked' : ''}">${esc(s.alarm)}${s.alarmAcked ? '' : ` · press ${esc(w.ok)}`}</div>`
    : '';
  const message = s.message ? `<div class="lcd-msg">${esc(s.message)}</div>` : '';

  switch (s.type) {
    case 'off':
      return '<div class="lcd-off">Pump is off<br><small>Press the power button</small></div>';
    case 'list':
      return title(s.title, s.progress) + alarm + `<div class="lcd-body list">${listHtml(s, style.tapToSelect)}</div>` + message +
        soft(['BACK', w.back], null, ['OK', w.ok]);
    case 'number':
      return title(s.title, s.progress) + alarm +
        `<div class="lcd-body num"><b>${s.value}</b><span>${esc(s.unit)}</span>${s.cursor ? `<small>◀ ▶ step ${s.cursor}</small>` : ''}</div>` +
        message + soft(['BACK', w.back], null, ['OK', w.ok]);
    case 'error':
      return title(s.title) + `<div class="lcd-body err">${s.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` +
        soft(['BACK', w.back], null, ['OK', w.ok]);
    case 'confirm':
      return title('Confirm settings', s.progress) +
        `<div class="lcd-body sum">
          <p><b>${esc(s.header)}</b></p><p>${esc(s.sub)}</p><p>${esc(s.patient)}</p><p>${esc(s.syringe)}</p>
          <p class="hl">${esc(s.target)}</p>
          ${s.induction ? `<p>Induction: ${esc(s.induction)}</p>` : ''}
        </div>` +
        (message || `<div class="lcd-msg">Press ${esc(w.start)} to begin</div>`) +
        soft(['BACK', w.back], null, ['START', w.start]);
    case 'run': {
      const conc = (label, value) => `<div class="conc"><label>${label}</label><b>${value ?? '--'}</b></div>`;
      return title(s.header, s.elapsed) + alarm +
        `<div class="lcd-body run">
          <div class="run-sub"><span>${esc(s.sub)}</span><span class="state ${s.held ? 'held' : ''}">${esc(s.state)}</span></div>
          <div class="run-main">
            <div class="target"><label>${esc(s.targetLabel)}</label><b>${s.pending ?? s.target}</b><span>${esc(s.targetUnit)}</span></div>
            <div class="concs">${conc('Cp', s.cp)}${conc('Ce', s.ce)}<small>${esc(s.concUnit)}</small></div>
          </div>
          ${s.pending ? `<div class="pending">New ${esc(s.targetLabel.toLowerCase())} ${s.pending} (was ${s.target}): ${esc(w.ok)} to confirm</div>` : ''}
          <div class="run-row"><span>Rate <b>${s.rate}</b> mL/h</span><span>${esc(s.perKg)}</span></div>
          <div class="run-row"><span>Volume <b>${s.volume}</b> mL</span><span>Dose ${esc(s.dose)}</span></div>
          <div class="run-row"><span class="syr"><i style="width:${Math.round(s.syringeFraction * 100)}%"></i></span><span>Syringe ${s.syringeLeft} mL</span></div>
          <div class="run-row dim"><span>${esc(s.decrement)}</span><span>${esc(s.patient)}</span></div>
        </div>` + message +
        soft(s.pending ? ['BACK', w.back] : ['MENU', w.menu], null, s.pending ? ['OK', w.ok] : s.held ? ['START', w.start] : null);
    }
  }
  return '';
}

// Replace an element's content only when it has changed. Rewriting a button
// between the press and the release of a click makes the browser drop the
// click, which made the pumps ignore presses while values were updating.
function setHtml(el, html) {
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  el.innerHTML = html;
}

function render(p) {
  let el = els.get(p.id);
  if (!el) {
    el = document.createElement('section');
    el.innerHTML = `
      <div class="pump-top">
        <button type="button" class="power" data-power aria-label="Power on or off">&#9211;</button>
        <span class="label"></span>
        <button type="button" class="remove" data-remove aria-label="Remove this pump">&times;</button>
      </div>
      <div class="lcd" aria-live="off"><div class="lcd-main"></div><div class="lcd-softkeys"></div></div>
      <div class="keys"></div>`;
    el.addEventListener('click', (e) => onPumpClick(p.id, e.target.closest('button')));
    els.set(p.id, el);
    pumpsEl.append(el);
  }
  const s = p.screen;
  el.className = `pump style-${p.styleId}${s.on ? '' : ' is-off'}${p.alarmSounding ? ' alarming' : ''}`;
  // The changing values and the softkeys are drawn separately, so that the
  // softkeys stay in place while the numbers above them update.
  const html = screenHtml(s, p);
  const cut = html.lastIndexOf('<div class="soft">');
  setHtml(el.querySelector('.lcd-main'), cut < 0 ? html : html.slice(0, cut));
  setHtml(el.querySelector('.lcd-softkeys'), cut < 0 ? '' : html.slice(cut));
  el.querySelector('.label').textContent = `Pump ${p.id} · ${p.styleName}`;
  const keysEl = el.querySelector('.keys');
  if (keysEl.dataset.style !== p.styleId) {
    keysEl.dataset.style = p.styleId;
    keysEl.innerHTML = p.keys
      .map((row) => `<div class="key-row">${row.map(([key, label, cls = '']) => `<button type="button" class="key ${cls}" data-key="${key}">${esc(label)}</button>`).join('')}</div>`)
      .join('');
  }
}

function onPumpClick(id, button) {
  if (!button) return;
  const p = state.pumps.find((x) => x.id === id);
  const infusing = p?.infusing;
  if (button.dataset.key) send({ type: 'pumpKey', pump: id, key: button.dataset.key });
  else if (button.dataset.select) send({ type: 'pumpSelect', pump: id, index: Number(button.dataset.select) });
  else if ('power' in button.dataset) {
    if (p.screen.on && infusing && !confirm('Switch this pump off? The infusion will stop.')) return;
    send({ type: 'pumpPower', pump: id });
  } else if ('remove' in button.dataset) {
    if (infusing && !confirm('Remove this pump? The infusion will stop.')) return;
    send({ type: 'removePump', pump: id });
  }
}

function onState(next) {
  state = next;
  for (const [id, el] of els) {
    if (!state.pumps.some((p) => p.id === id)) {
      el.remove();
      els.delete(id);
    }
  }
  state.pumps.forEach(render);
  $('addPump').disabled = state.pumps.length >= MAX_PUMPS;
  $('style').value = state.styleId;
  $('simInfo').textContent = `Station ${station} · ${state.clock}${state.paused ? ' · PAUSED' : state.speed > 1 ? ` · x${state.speed}` : ''}`;
  $('pausedBanner').hidden = !state.paused;
  $('trendBox').hidden = !state.showTrend;
  if (state.showTrend) drawTrend($('trend'), state.history, state.trendShow);
}

const send = connect(onState, (ok) => document.body.classList.toggle('offline', !ok));

// ---------- alarm sound ----------

setInterval(() => {
  if (!soundOn || !state?.pumps.some((p) => p.alarmSounding)) return;
  for (const delay of [0, 0.22, 0.44]) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 2400;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + 0.12);
  }
}, 2500);

// ---------- top bar ----------

const styleSelect = $('style');
styleSelect.innerHTML = Object.entries(STYLE_NAMES).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('');
styleSelect.addEventListener('change', () => send({ type: 'setStyle', style: styleSelect.value }));
$('addPump').addEventListener('click', () => send({ type: 'addPump' }));
$('sound').addEventListener('click', (e) => {
  soundOn = !soundOn;
  if (soundOn) {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
  }
  e.currentTarget.textContent = soundOn ? 'Sound: on' : 'Sound: off';
  e.currentTarget.classList.toggle('on', soundOn);
});
$('home').href = withStation('index.html');
