// Patient monitor screen. FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { Vitals, PARAMS, entropyGap } from './vitals.js';
import { Signals, Trace, SAMPLE_HZ } from './waveforms.js';
import { MonitorAudio } from './audio.js';
import { connect, station } from '../link.js';

// Parameter modules. 'wave' modules get a waveform row; 'strip' modules are
// numbers only and sit in the bottom strip.
const MODULES = {
  ecg: { name: 'ECG and heart rate', kind: 'wave', color: '#3ddc4a', waveLabel: 'II', signal: 'ecg', range: [-0.45, 1.3], sweep: 8, fields: ['hr'] },
  spo2: { name: 'SpO2', kind: 'wave', color: '#ffe14d', waveLabel: 'Pleth', signal: 'pleth', range: [-0.08, 1.12], sweep: 8, fields: ['spo2'] },
  co2: { name: 'EtCO2 (capnography)', kind: 'wave', color: '#f2f2f2', waveLabel: 'CO2', signal: 'co2', range: [0, 8], sweep: 24, fields: ['etco2', 'rr'] },
  art: { name: 'Art line (invasive BP)', kind: 'wave', color: '#ff5252', waveLabel: 'Art', signal: 'art', range: [0, 200], scale: ['200', '0'], sweep: 8, fields: ['sys', 'dia'] },
  cvp: { name: 'Central venous pressure', kind: 'wave', color: '#58a6ff', waveLabel: 'CVP', signal: 'cvp', range: [0, 20], scale: ['20', '0'], sweep: 8, fields: ['cvp'] },
  resp: { name: 'Resp (impedance)', kind: 'wave', color: '#e8e8e8', waveLabel: 'Imped.', signal: 'resp', range: [-0.25, 1.25], sweep: 24, fields: ['rr'] },
  entropy: { name: 'Entropy', kind: 'wave', color: '#f2f2f2', waveLabel: 'Entropy EEG', signal: 'eeg', range: [-1.25, 1.25], sweep: 8, fields: ['se', 're'] },
  temp: { name: 'Temperature', kind: 'strip', color: '#e6e6e6', fields: ['temp'] },
  nibp: { name: 'Non-invasive blood pressure', kind: 'strip', color: '#ff7a5c', fields: ['sys', 'dia'] },
  nmt: { name: 'Neuromuscular monitoring (TOF)', kind: 'strip', color: '#c7a6ff', fields: ['tofCount', 'tofRatio'] },
};
const ORDER = Object.keys(MODULES);
const ALARMED = ['hr', 'spo2', 'sys', 'etco2', 'rr', 'temp'];
const NIBP_SECONDS = 18;
const NIBP_INTERVALS = [0, 1, 2.5, 5, 10, 15];

const $ = (id) => document.getElementById(id);
const rowsEl = $('rows');
const stripEl = $('strip');

const vitals = new Vitals();
const signals = new Signals((key) => vitals.now(key));
const audio = new MonitorAudio();
const settings = { co2Unit: 'kPa' };
let active = new Set(['ecg', 'spo2', 'co2', 'art', 'resp', 'entropy', 'temp', 'nibp']);
let traces = {};
let tiles = {};
let simTime = 0;
let simSpeed = 1; // simulated seconds per real second (set by the instructor)
let linked = false; // true once the simulation server is sending values
let send = null;
let locked = false; // instructor has locked value editing on this screen
let alarms = [];
let silencedUntil = 0;
let nextAlarmSound = 0;
const nibp = { sys: null, dia: null, at: null, failed: false, measuring: false, startedAt: 0, cuffStart: 0, cuff: 0, intervalMin: 5, nextAt: 3 };

// ---------- units and formatting ----------

const factor = (key) => (key === 'etco2' && settings.co2Unit === 'mmHg' ? 7.5 : 1);
const unitOf = (key) => (key === 'etco2' ? settings.co2Unit : PARAMS[key].unit);
const decimalsOf = (key) => (factor(key) !== 1 ? 0 : PARAMS[key].decimals ?? 0);
const stepOf = (key) => (factor(key) !== 1 ? 1 : PARAMS[key].step);
const toDisplay = (key, v) => (v == null ? null : Number((v * factor(key)).toFixed(decimalsOf(key))));
const fmt = (key) => (vitals.shown(key) * factor(key)).toFixed(decimalsOf(key));
const mapOf = (sys, dia) => Math.round(dia + (sys - dia) / 3);

// Value last sent by the server (or set locally), rounded as displayed.
const toShown = (key) => Number(vitals.target(key).toFixed(PARAMS[key].decimals ?? 0));

function limitText(key) {
  const { low, high } = vitals.p[key];
  if (low == null && high == null) return '';
  const show = (v) => (v == null ? '--' : toDisplay(key, v));
  return `${show(low)} / ${show(high)}`;
}

const head = (title, unit, limitKey) =>
  `<div class="t-head"><b>${title}</b><span>${unit}</span>${limitKey ? `<span class="lim">${limitText(limitKey)}</span>` : ''}</div>`;

function tileHtml(id) {
  switch (id) {
    case 'ecg':
      return head('HR', '/min', 'hr') + `<div class="t-val">${fmt('hr')}<i class="heart">&#9829;</i></div>`;
    case 'spo2':
      return head('SpO2', '%', 'spo2') + `<div class="t-val">${fmt('spo2')}</div>`;
    case 'art': {
      const sys = vitals.shown('sys');
      const dia = Math.min(vitals.shown('dia'), sys);
      return head('Art', 'mmHg', 'sys') + `<div class="t-val long">${sys}/${dia}<small>(${mapOf(sys, dia)})</small></div>`;
    }
    case 'cvp':
      return head('CVP', 'mmHg') + `<div class="t-val long">(${fmt('cvp')})</div>`;
    case 'co2':
      return (
        head('EtCO2', unitOf('etco2'), 'etco2') +
        `<div class="t-val long">${fmt('etco2')}<div class="pair"><span>RR</span>${fmt('rr')}</div></div>`
      );
    case 'resp':
      return head('Resp', '/min', 'rr') + `<div class="t-val">${fmt('rr')}</div>`;
    case 'entropy': {
      const se = vitals.shown('se');
      const re = Math.max(se, vitals.shown('re'));
      return (
        head('Entropy', '') +
        `<div class="t-val long"><div class="pair big re"><span>RE</span>${re}</div><div class="pair big"><span>SE</span>${se}</div></div>`
      );
    }
    case 'nibp': {
      let value = '--/--';
      if (nibp.measuring) value = `<small>Cuff</small>${Math.round(nibp.cuff)}`;
      else if (nibp.failed) value = '<small>No reading</small>';
      else if (nibp.sys != null) value = `${nibp.sys}/${nibp.dia}<small>(${mapOf(nibp.sys, nibp.dia)})</small>`;
      const ago = nibp.at == null ? '' : `${Math.floor((simTime - nibp.at) / 60)} min ago`;
      const auto = nibp.intervalMin ? `Auto ${nibp.intervalMin} min` : 'Manual';
      return (
        head('NIBP', 'mmHg', 'sys') +
        `<div class="t-val">${value}</div><div class="t-sub">${[nibp.measuring ? 'Measuring' : ago, auto].filter(Boolean).join(' · ')}</div>`
      );
    }
    case 'temp':
      return head('T1', '°C', 'temp') + `<div class="t-val">${fmt('temp')}</div>`;
    case 'nmt': {
      const count = vitals.shown('tofCount');
      const ratio = count >= 4 ? `<small>${fmt('tofRatio')}%</small>` : '';
      return head('NMT', 'TOF') + `<div class="t-val">${count}${ratio}</div>`;
    }
  }
  return '';
}

// ---------- building the screen ----------

function build() {
  rowsEl.replaceChildren();
  stripEl.replaceChildren();
  traces = {};
  tiles = {};
  for (const id of ORDER) {
    if (!active.has(id)) continue;
    const mod = MODULES[id];
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.style.setProperty('--c', mod.color);
    tile.setAttribute('aria-label', `${mod.name}: change values`);
    tile.addEventListener('click', () => openEdit(id));
    tiles[id] = tile;
    if (mod.kind === 'wave') {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.setProperty('--c', mod.color);
      const wave = document.createElement('div');
      wave.className = 'wave';
      const scale = id === 'co2' ? [String(toDisplay('etco2', mod.range[1])), '0'] : mod.scale;
      wave.innerHTML =
        `<span class="wlabel">${mod.waveLabel}</span>` +
        (scale ? `<span class="wscale top">${scale[0]}</span><span class="wscale bottom">${scale[1]}</span>` : '') +
        '<canvas></canvas>';
      row.append(wave, tile);
      rowsEl.append(row);
      traces[id] = new Trace(wave.querySelector('canvas'), { color: mod.color, range: mod.range, sweepSeconds: mod.sweep });
    } else {
      stripEl.append(tile);
    }
  }
  layout();
  renderTiles();
}

function layout() {
  const first = rowsEl.firstElementChild;
  if (first) rowsEl.style.setProperty('--rowh', `${first.getBoundingClientRect().height}px`);
  for (const trace of Object.values(traces)) trace.resize();
}

function renderTiles() {
  for (const [id, tile] of Object.entries(tiles)) {
    tile.innerHTML = tileHtml(id);
    const alarm = alarms.find((a) => a.id === id);
    tile.classList.toggle('alarm-high', alarm?.priority === 'high');
    tile.classList.toggle('alarm-medium', alarm?.priority === 'medium');
  }
}

// ---------- alarms ----------

function findAlarms() {
  const found = [];
  const check = (id, key, name, value, highIf) => {
    const { low, high } = vitals.p[key];
    let text = null;
    if (low != null && value < low) text = `${name} LOW`;
    else if (high != null && value > high) text = `${name} HIGH`;
    if (text) found.push({ id, text, priority: highIf?.(value) ? 'high' : 'medium' });
  };
  if (active.has('ecg')) {
    const hr = vitals.shown('hr');
    if (hr === 0) found.push({ id: 'ecg', text: 'ASYSTOLE', priority: 'high' });
    else check('ecg', 'hr', 'HR', hr, (v) => v < 40 || v > 150);
  }
  if (active.has('spo2')) check('spo2', 'spo2', 'SpO2', vitals.shown('spo2'), (v) => v < 85);
  if (active.has('art')) check('art', 'sys', 'Art', vitals.shown('sys'), (v) => v < 70);
  if (active.has('nibp') && nibp.sys != null && !nibp.measuring) check('nibp', 'sys', 'NIBP', nibp.sys, (v) => v < 70);
  const breathing = ['resp', 'co2'].filter((id) => active.has(id));
  if (breathing.length) {
    if (vitals.shown('rr') === 0) {
      for (const id of breathing) found.push({ id, text: 'APNOEA', priority: 'high' });
    } else {
      if (active.has('co2')) check('co2', 'etco2', 'EtCO2', vitals.shown('etco2'));
      const rrTile = active.has('resp') ? 'resp' : 'co2';
      if (!found.some((a) => a.id === rrTile)) check(rrTile, 'rr', 'RR', vitals.shown('rr'));
    }
  }
  if (active.has('temp')) check('temp', 'temp', 'Temp', vitals.shown('temp'));
  found.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'high' ? -1 : 1));
  return found;
}

function showAlarms() {
  const el = $('alarmText');
  const top = alarms[0]?.priority;
  el.textContent = [...new Set(alarms.map((a) => a.text))].join('  ·  ');
  el.className = top ?? '';

  const now = performance.now();
  const silenced = now < silencedUntil;
  const btn = $('btnSilence');
  if (silenced) {
    const left = Math.ceil((silencedUntil - now) / 1000);
    btn.textContent = `Silenced ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  } else {
    btn.textContent = 'Silence alarms';
  }
  btn.classList.toggle('warn', silenced);
  if (top && !silenced && now >= nextAlarmSound) {
    audio.alarm(top);
    nextAlarmSound = now + (top === 'high' ? 3000 : 8000);
  }
}

// ---------- NIBP cycle ----------

function startNibp() {
  if (nibp.measuring) return;
  nibp.measuring = true;
  nibp.startedAt = simTime;
  nibp.cuffStart = Math.min(280, vitals.now('sys') + 35);
  nibp.cuff = nibp.cuffStart;
}

function updateNibp() {
  if (!active.has('nibp')) return;
  if (!nibp.measuring && nibp.intervalMin > 0 && simTime >= nibp.nextAt) startNibp();
  if (!nibp.measuring) return;
  const elapsed = simTime - nibp.startedAt;
  nibp.cuff = nibp.cuffStart - ((nibp.cuffStart - 40) * elapsed) / NIBP_SECONDS;
  if (elapsed >= NIBP_SECONDS) {
    const noise = () => Math.round((Math.random() - 0.5) * 6);
    const sys = Math.round(vitals.now('sys')) + noise();
    const dia = Math.min(sys - 5, Math.round(vitals.now('dia')) + noise());
    nibp.failed = sys < 30;
    nibp.sys = nibp.failed ? null : sys;
    nibp.dia = nibp.failed ? null : Math.max(0, dia);
    nibp.at = simTime;
    nibp.measuring = false;
    nibp.nextAt = simTime + nibp.intervalMin * 60;
  }
}

// ---------- main loop ----------

signals.onBeat = () => {
  if (!active.has('ecg') && !active.has('spo2')) return;
  audio.pulse(active.has('spo2') ? vitals.shown('spo2') : 100);
  const heart = tiles.ecg?.querySelector('.heart');
  if (heart) {
    heart.classList.add('beat');
    setTimeout(() => heart.classList.remove('beat'), 160);
  }
};

function everySecond() {
  vitals.wobble();
  updateNibp();
  alarms = findAlarms();
  renderTiles();
  showAlarms();
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let lastFrame = null;
let sampleDebt = 0;
let secondDebt = 1;
function frame(now) {
  const dt = lastFrame == null ? 0 : Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  simTime += dt * simSpeed;
  vitals.update(dt);
  sampleDebt += dt * SAMPLE_HZ;
  const n = Math.floor(sampleDebt);
  sampleDebt -= n;
  if (n > 0) {
    const buffers = { ecg: [], pleth: [], art: [], cvp: [], co2: [], resp: [], eeg: [] };
    for (let i = 0; i < n; i++) {
      const s = signals.step(1 / SAMPLE_HZ);
      for (const key in buffers) buffers[key].push(s[key]);
    }
    for (const [id, trace] of Object.entries(traces)) trace.draw(buffers[MODULES[id].signal]);
  }
  secondDebt += dt;
  if (secondDebt >= 1) {
    secondDebt -= 1;
    everySecond();
  }
  requestAnimationFrame(frame);
}

// ---------- edit dialog (opened by pressing a tile) ----------

function openEdit(id) {
  const mod = MODULES[id];
  const dlg = $('editDlg');
  const fieldHtml = (key) => `
    <div class="field">
      <label for="f-${key}">${PARAMS[key].label} <small>${unitOf(key)}</small></label>
      <div class="stepper">
        <button type="button" data-step="-1" data-for="${key}" aria-label="Decrease ${PARAMS[key].label}">&minus;</button>
        <input id="f-${key}" type="number" inputmode="decimal" step="${stepOf(key)}" value="${toDisplay(key, toShown(key))}">
        <button type="button" data-step="1" data-for="${key}" aria-label="Increase ${PARAMS[key].label}">+</button>
      </div>
    </div>`;
  const limitHtml = (key) => `
    <div class="field">
      <label>${PARAMS[key].label} <small>${unitOf(key)}</small></label>
      <div class="limits">
        <input id="lo-${key}" type="number" inputmode="decimal" step="${stepOf(key)}" value="${toDisplay(key, vitals.p[key].low) ?? ''}" placeholder="off" aria-label="${PARAMS[key].label} low limit">
        <span>to</span>
        <input id="hi-${key}" type="number" inputmode="decimal" step="${stepOf(key)}" value="${toDisplay(key, vitals.p[key].high) ?? ''}" placeholder="off" aria-label="${PARAMS[key].label} high limit">
      </div>
    </div>`;
  const limited = mod.fields.filter((k) => ALARMED.includes(k));
  const speeds = [['0', 'At once'], ['30', '30 s'], ['60', '1 min'], ['180', '3 min']];

  dlg.innerHTML = `
    <h2>${mod.name}</h2>
    ${locked ? '' : mod.fields.map(fieldHtml).join('')}
    ${id === 'nibp' ? `
      ${locked ? '' : '<p class="note">The cuff shows a new pressure only at its next measurement.</p>'}
      <h3>Measurement</h3>
      <div class="field">
        <label for="nibpInterval">Automatic interval</label>
        <select id="nibpInterval">${NIBP_INTERVALS.map((m) => `<option value="${m}" ${m === nibp.intervalMin ? 'selected' : ''}>${m ? `${m} min` : 'Off'}</option>`).join('')}</select>
      </div>` : ''}
    <div ${locked ? 'hidden' : ''}>
      <h3>Change over</h3>
      <div class="seg">${speeds.map(([v, t]) => `<label><input type="radio" name="speed" value="${v}" ${v === '30' ? 'checked' : ''}>${t}</label>`).join('')}</div>
    </div>
    ${limited.length ? `<h3>Alarm limits</h3>${limited.map(limitHtml).join('')}` : ''}
    <div class="actions">
      ${locked ? '' : '<button type="button" class="danger" data-act="remove">Remove</button>'}
      ${id === 'nibp' ? '<button type="button" data-act="measure">Measure now</button>' : ''}
      <button type="button" data-act="cancel">Cancel</button>
      <button type="button" class="primary" data-act="apply">Apply</button>
    </div>`;

  const input = (key) => dlg.querySelector(`#f-${key}`);
  let reTouched = false;
  const linkEntropy = () => {
    if (id !== 'entropy' || reTouched) return;
    const se = Number(input('se').value);
    input('re').value = Math.min(100, se + entropyGap(se));
  };
  dlg.querySelectorAll('[data-step]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = btn.dataset.for;
      const el = input(key);
      const f = factor(key);
      const next = Number(el.value) + Number(btn.dataset.step) * stepOf(key);
      const clamped = Math.min(PARAMS[key].max * f, Math.max(PARAMS[key].min * f, next));
      el.value = Number(clamped.toFixed(decimalsOf(key)));
      if (key === 're') reTouched = true;
      if (key === 'se') linkEntropy();
    }),
  );
  if (id === 'entropy' && !locked) {
    input('re').addEventListener('input', () => (reTouched = true));
    input('se').addEventListener('input', linkEntropy);
  }

  const apply = () => {
    const seconds = Number(dlg.querySelector('input[name=speed]:checked').value);
    const values = {};
    for (const key of locked ? [] : mod.fields) {
      const raw = input(key).value;
      if (raw !== '' && Number.isFinite(Number(raw))) values[key] = Number(raw) / factor(key);
    }
    if (values.sys != null && values.dia != null) values.dia = Math.min(values.dia, Math.max(0, values.sys - 5));
    if (values.se != null && values.re != null) values.re = Math.max(values.re, values.se);
    for (const [key, v] of Object.entries(values)) {
      if (Math.abs(v - toShown(key)) < 1e-9) continue;
      if (locked) continue;
      if (linked) send({ type: 'override', key, value: v, seconds, from: 'monitor' });
      else vitals.set(key, v, seconds);
    }
    for (const key of limited) {
      const read = (prefix) => {
        const raw = dlg.querySelector(`#${prefix}-${key}`).value;
        return raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw) / factor(key);
      };
      vitals.setLimits(key, read('lo'), read('hi'));
    }
    if (id === 'nibp') {
      const minutes = Number(dlg.querySelector('#nibpInterval').value);
      if (minutes !== nibp.intervalMin) {
        nibp.intervalMin = minutes;
        nibp.nextAt = (nibp.at ?? simTime) + minutes * 60;
      }
    }
  };

  dlg.querySelectorAll('[data-act]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'apply' || act === 'measure') apply();
      if (act === 'measure') startNibp();
      if (act === 'remove') {
        active.delete(id);
        build();
        shareModules();
      }
      dlg.close();
      everySecond();
    }),
  );
  dlg.showModal();
}

// ---------- parameters dialog (add and remove modules) ----------

function openSetup() {
  const dlg = $('setupDlg');
  dlg.innerHTML = `
    <h2>Parameters on this monitor</h2>
    ${ORDER.map((id) => `
      <label class="check">
        <input type="checkbox" data-mod="${id}" ${active.has(id) ? 'checked' : ''}>
        ${MODULES[id].name}<small>${MODULES[id].kind === 'wave' ? 'waveform' : 'number'}</small>
      </label>`).join('')}
    <h3>CO2 unit</h3>
    <div class="seg">${['kPa', 'mmHg'].map((u) => `<label><input type="radio" name="co2Unit" value="${u}" ${settings.co2Unit === u ? 'checked' : ''}>${u}</label>`).join('')}</div>
    <p class="note">Press any number on the monitor to change its value or alarm limits.</p>
    <div class="actions"><button type="button" class="primary" data-act="close">Done</button></div>`;
  dlg.querySelectorAll('[data-mod]').forEach((box) =>
    box.addEventListener('change', () => {
      if (box.checked) active.add(box.dataset.mod);
      else active.delete(box.dataset.mod);
      if (box.dataset.mod === 'nibp' && box.checked) nibp.nextAt = simTime + 3;
      build();
      shareModules();
    }),
  );
  dlg.querySelectorAll('input[name=co2Unit]').forEach((radio) =>
    radio.addEventListener('change', () => {
      settings.co2Unit = radio.value;
      build();
    }),
  );
  dlg.querySelector('[data-act=close]').addEventListener('click', () => dlg.close());
  dlg.showModal();
}

// ---------- top bar ----------

$('btnSetup').addEventListener('click', openSetup);
$('btnSound').addEventListener('click', (e) => {
  if (audio.enabled) audio.disable();
  else audio.enable();
  e.currentTarget.textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  e.currentTarget.classList.toggle('on', audio.enabled);
});
$('btnSilence').addEventListener('click', () => {
  silencedUntil = performance.now() < silencedUntil ? 0 : performance.now() + 120000;
  nextAlarmSound = 0;
  showAlarms();
});
$('btnFull').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});

// ---------- link to the simulation server ----------

const shareModules = () => linked && send({ type: 'setModules', modules: ORDER.filter((id) => active.has(id)), from: 'monitor' });

function onState(state) {
  linked = true;
  simSpeed = state.paused ? 0 : state.speed;
  $('pausedBanner').hidden = !state.paused;
  locked = state.monitorLocked;
  $('btnSetup').hidden = locked;
  for (const [key, value] of Object.entries(state.vitals)) {
    if (key in PARAMS && Math.abs(vitals.target(key) - value) > 1e-6) vitals.set(key, value, 1.2);
  }
  const wanted = state.modules.filter((id) => MODULES[id]);
  if (wanted.length !== active.size || wanted.some((id) => !active.has(id))) {
    if (wanted.includes('nibp') && !active.has('nibp')) nibp.nextAt = simTime + 3;
    active = new Set(wanted);
    build();
  }
  document.querySelector('.patient').firstChild.textContent = `SIMULATION · STATION ${station}`;
}
send = connect(onState);

new ResizeObserver(layout).observe(rowsEl);
build();
requestAnimationFrame(frame);

// Hooks for the instructor remote (added in a later step) and for testing.
window.monitor = {
  vitals,
  nibp,
  setVital: (key, value, seconds = 0) => vitals.set(key, value, seconds),
  setModules: (ids) => {
    active = new Set(ids.filter((id) => MODULES[id]));
    build();
  },
  measureNibp: startNibp,
};
