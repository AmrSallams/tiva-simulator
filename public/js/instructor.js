// Instructor remote: time control, vital-sign overrides, events, drug levels
// and the case log. FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { connect, station, withStation } from './link.js';
import { drawTrend, DRUG_COLORS } from './trend.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const VITALS = [
  ['hr', 'Heart rate', '/min', 1, 0],
  ['sys', 'Systolic BP', 'mmHg', 1, 0],
  ['dia', 'Diastolic BP', 'mmHg', 1, 0],
  ['spo2', 'SpO2', '%', 1, 0],
  ['rr', 'Resp rate', '/min', 1, 0],
  ['etco2', 'EtCO2', 'kPa', 0.1, 1],
  ['se', 'Entropy SE', '', 1, 0],
  ['re', 'Entropy RE', '', 1, 0],
  ['temp', 'Temperature', '°C', 0.1, 1],
  ['cvp', 'CVP', 'mmHg', 1, 0],
  ['tofCount', 'TOF count', '', 1, 0],
  ['tofRatio', 'TOF ratio', '%', 5, 0],
];
const MODULES = {
  ecg: 'ECG', spo2: 'SpO2', co2: 'EtCO2', art: 'Art line', cvp: 'CVP', resp: 'Resp', entropy: 'Entropy',
  temp: 'Temperature', nibp: 'NIBP', nmt: 'NMT',
};
const PRESETS = {
  adult: 'Fit adult (40 y, 70 kg, 170 cm, male)',
  elderly: 'Frail elderly (82 y, 58 kg, 160 cm, female)',
  obese: 'Obese adult (45 y, 130 kg, 170 cm, male)',
  child: 'Child (6 y, 20 kg, 115 cm, male)',
  anxious: 'Anxious young adult (24 y, 65 kg, 168 cm, female)',
};
const DRUG_UNITS = { propofol: 'mcg/mL', ketamine: 'mcg/mL', remifentanil: 'ng/mL', sufentanil: 'ng/mL', dexmedetomidine: 'ng/mL' };

let state = null;
let ramp = 30;
const dirty = new Set(); // vital rows the instructor is typing in

// ---------- build the fixed parts once ----------

$('vitals').innerHTML = VITALS.map(([key, label, unit, step]) => `
  <div class="vital" data-key="${key}">
    <div class="v-name">${label} <small>${unit}</small></div>
    <div class="v-now" id="now-${key}">--</div>
    <div class="stepper">
      <button type="button" data-step="-1" aria-label="Decrease ${label}">&minus;</button>
      <input type="number" inputmode="decimal" step="${step}" id="in-${key}" aria-label="${label} value to set">
      <button type="button" data-step="1" aria-label="Increase ${label}">+</button>
    </div>
    <button type="button" class="set" data-set>Set</button>
    <button type="button" class="auto" data-auto>Auto</button>
  </div>`).join('');

$('modules').innerHTML = Object.entries(MODULES)
  .map(([id, name]) => `<label class="check"><input type="checkbox" data-mod="${id}"> ${name}</label>`)
  .join('');
$('preset').innerHTML = Object.entries(PRESETS).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('');
$('stationName').textContent = `Station ${station}`;
$('home').href = withStation('index.html');
$('openMonitor').href = withStation('monitor.html');
$('openPump').href = withStation('pump.html');
$('exportLog').href = `/api/log?s=${encodeURIComponent(station)}`;

// ---------- show the live state ----------

function onState(next) {
  const firstState = state == null;
  state = next;
  const ins = state.instructor;

  $('clock').textContent = state.clock;
  $('pause').textContent = state.paused ? 'Resume' : 'Pause';
  $('pause').classList.toggle('on', state.paused);
  document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === state.speed));

  for (const [key, , , , decimals] of VITALS) {
    const shown = state.vitals[key].toFixed(decimals);
    const overridden = ins.overridden.includes(key);
    const row = document.querySelector(`.vital[data-key=${key}]`);
    row.classList.toggle('overridden', overridden);
    $(`now-${key}`).innerHTML = overridden
      ? `${shown}<small>model ${ins.model[key].toFixed(decimals)}</small>`
      : `${shown}<small>automatic</small>`;
    const input = $(`in-${key}`);
    if (!dirty.has(key) && document.activeElement !== input) input.value = shown;
  }

  document.querySelectorAll('#stim button').forEach((b) => b.classList.toggle('on', b.dataset.stim === ins.stimLevel));
  $('stimNow').textContent = `Stimulation now: ${ins.stimNow} / 10 (before the effect of analgesia)`;
  document.querySelectorAll('#vent button').forEach((b) => b.classList.toggle('on', (b.dataset.vent === '1') === ins.ventilated));
  $('bleeding').classList.toggle('on', ins.bleeding);
  $('bloodLoss').textContent = ins.bloodLoss ? `Blood volume lost: about ${ins.bloodLoss}%` : '';
  $('line').classList.toggle('on', !ins.lineConnected);
  // Only redraw these buttons when they change; redrawing mid-click would drop the click.
  const occlusionHtml = state.pumps
    .map((p) => `<button type="button" class="toggle ${p.occluded ? 'on' : ''}" data-occlude="${p.id}">Occlude pump ${p.id}</button>`)
    .join('');
  if ($('occlusions').dataset.html !== occlusionHtml) {
    $('occlusions').dataset.html = occlusionHtml;
    $('occlusions').innerHTML = occlusionHtml;
  }

  const drugs = Object.entries(ins.levels);
  $('levels').innerHTML = drugs.length
    ? `<table><tr><th>Drug</th><th>Patient Cp</th><th>Patient Ce</th><th>Pump shows</th></tr>${drugs.map(([drug, l]) => {
        const pumpValues = state.pumps.filter((p) => p.drug === drug).map((p) => p.pumpCe.toFixed(2));
        const pumpText = pumpValues.length ? pumpValues.join(' + ') : 'pump off';
        const differs = pumpValues.length && Math.abs(pumpValues.reduce((a, b) => a + Number(b), 0) - l.ce) > 0.05 * Math.max(0.2, l.ce);
        return `<tr><td><i style="background:${DRUG_COLORS[drug]}"></i>${esc(drug)} <small>${DRUG_UNITS[drug]}</small></td>
          <td>${l.cp.toFixed(2)}</td><td><b>${l.ce.toFixed(2)}</b></td><td class="${differs ? 'warn' : ''}">${pumpText}</td></tr>`;
      }).join('')}</table>`
    : '<p class="hint">No drug given yet.</p>';
  drawTrend($('trend'), state.history, state.trendShow);
  document.querySelectorAll('[data-line]').forEach((box) => (box.checked = state.trendShow[box.dataset.line]));
  $('showTrend').checked = state.showTrend;
  $('lockMonitor').checked = state.monitorLocked;

  document.querySelectorAll('#modules input').forEach((box) => (box.checked = state.modules.includes(box.dataset.mod)));
  if (firstState) $('preset').value = ins.preset;

  const log = $('log');
  const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
  log.innerHTML = ins.log.map((e) => `<li><time>${e.time}</time> ${esc(e.text)}</li>`).join('');
  if (atBottom || firstState) log.scrollTop = log.scrollHeight;
}

const send = connect(onState, (ok) => document.body.classList.toggle('offline', !ok));

// ---------- controls ----------

$('pause').addEventListener('click', () => send({ type: 'setPaused', paused: !state.paused }));
$('speed').addEventListener('click', (e) => {
  const speed = Number(e.target.dataset?.speed);
  if (speed) send({ type: 'setSpeed', speed });
});
$('ramp').addEventListener('click', (e) => {
  if (e.target.dataset?.ramp == null) return;
  ramp = Number(e.target.dataset.ramp);
  document.querySelectorAll('#ramp button').forEach((b) => b.classList.toggle('on', b === e.target));
});

$('vitals').addEventListener('input', (e) => dirty.add(e.target.closest('.vital').dataset.key));
$('vitals').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') e.target.closest('.vital').querySelector('[data-set]').click();
});
$('vitals').addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  const key = button.closest('.vital').dataset.key;
  const [, , , step, decimals] = VITALS.find((v) => v[0] === key);
  const input = $(`in-${key}`);
  if (button.dataset.step) {
    input.value = (Number(input.value) + Number(button.dataset.step) * step).toFixed(decimals);
    dirty.add(key);
  } else if ('set' in button.dataset) {
    const value = Number(input.value);
    if (input.value !== '' && Number.isFinite(value)) send({ type: 'override', key, value, seconds: ramp });
    dirty.delete(key);
  } else if ('auto' in button.dataset) {
    send({ type: 'release', key });
    dirty.delete(key);
  }
});
$('releaseAll').addEventListener('click', () => {
  dirty.clear();
  send({ type: 'release' });
});

document.querySelectorAll('[data-event]').forEach((b) =>
  b.addEventListener('click', () => {
    send({ type: 'event', name: b.dataset.event });
    b.classList.add('flash');
    setTimeout(() => b.classList.remove('flash'), 600);
  }),
);
$('stim').addEventListener('click', (e) => e.target.dataset?.stim && send({ type: 'event', name: 'stim', level: e.target.dataset.stim }));
$('vent').addEventListener('click', (e) => e.target.dataset?.vent && send({ type: 'event', name: 'ventilation', on: e.target.dataset.vent === '1' }));
$('bleeding').addEventListener('click', () => send({ type: 'event', name: 'bleeding', on: !state.instructor.bleeding }));
$('line').addEventListener('click', () => send({ type: 'event', name: 'line', connected: !state.instructor.lineConnected }));
$('occlusions').addEventListener('click', (e) => {
  const id = Number(e.target.dataset?.occlude);
  if (!id) return;
  const p = state.pumps.find((x) => x.id === id);
  send({ type: 'event', name: 'occlusion', pump: id, on: !p.occluded });
});
document.querySelectorAll('[data-line]').forEach((box) =>
  box.addEventListener('change', () => send({ type: 'trendShow', line: box.dataset.line, on: box.checked })),
);
$('lockMonitor').addEventListener('change', (e) => send({ type: 'lockMonitor', on: e.target.checked }));
fetch('/api/info')
  .then((r) => r.json())
  .then((info) => {
    $('addresses').textContent = info.addresses.length
      ? `On the same Wi-Fi, open ${info.addresses.join(' or ')} and enter station code ${station}.`
      : 'This computer is not on a network. Connect it to Wi-Fi or a phone hotspot first.';
  })
  .catch(() => ($('addresses').textContent = 'Address not available.'));
$('showTrend').addEventListener('change', (e) => send({ type: 'showTrend', on: e.target.checked }));
$('modules').addEventListener('change', () =>
  send({ type: 'setModules', modules: [...document.querySelectorAll('#modules input:checked')].map((b) => b.dataset.mod) }),
);
$('reset').addEventListener('click', () => {
  if (confirm('Start a new case? The current patient, pumps and log will be cleared.')) {
    dirty.clear();
    send({ type: 'reset', preset: $('preset').value });
  }
});
