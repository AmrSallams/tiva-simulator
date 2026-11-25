import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Station } from '../src/sim/station.js';

// Program pump `index` by pressing OK through every step, optionally changing
// the highlighted option at named steps, then press start.
function program(station, index, choices = {}) {
  const id = station.pumps[index].id;
  const key = (k) => station.action({ type: 'pumpKey', pump: id, key: k });
  station.action({ type: 'pumpPower', pump: id });
  for (let i = 0; i < 30; i++) {
    const s = station.pumps[index].unit.screen();
    if (s.type === 'confirm') break;
    for (let n = 0; n < (choices[s.title] ?? 0); n++) key('DOWN');
    key('OK');
  }
  key('START');
}
const run = (station, seconds) => {
  for (let i = 0; i < seconds; i++) station.tick();
};

test('awake patient stays at baseline', () => {
  const s = new Station('t');
  run(s, 300);
  const v = s.vitals();
  assert.ok(v.se > 85 && v.hr > 65 && v.hr < 80 && v.sys > 115 && v.spo2 > 97 && v.rr > 10, JSON.stringify(v));
});

test('propofol and remifentanil TCI: asleep, lower pressure, apnoea, then desaturation', () => {
  const s = new Station('t');
  program(s, 0); // propofol Marsh effect-site 4
  program(s, 1, { 'Select drug': 1 }); // remifentanil Minto effect-site 3
  assert.equal(s.pumps[1].unit.cfg.drug, 'remifentanil');
  run(s, 240);
  let v = s.vitals();
  assert.ok(v.se < 60, `SE ${v.se}`);
  assert.ok(v.sys < 110 && v.sys > 70, `sys ${v.sys}`);
  assert.ok(v.hr < 72, `HR ${v.hr}`);
  assert.equal(v.rr, 0, 'apnoeic');
  assert.ok(v.spo2 > 95, `preoxygenated, SpO2 ${v.spo2}`);
  run(s, 240);
  assert.ok(s.vitals().spo2 < 92, `desaturates without ventilation, SpO2 ${s.vitals().spo2}`);

  s.action({ type: 'event', name: 'ventilation', on: true });
  run(s, 120);
  v = s.vitals();
  assert.ok(v.spo2 > 96 && v.rr > 10 && v.etco2 > 4, JSON.stringify(v));
});

test('stimulation raises heart rate and pressure more without an opioid', () => {
  const respond = (withOpioid) => {
    const s = new Station('t');
    program(s, 0);
    if (withOpioid) program(s, 1, { 'Select drug': 1 });
    s.action({ type: 'event', name: 'ventilation', on: true });
    run(s, 600);
    const before = { ...s.vitals() };
    s.action({ type: 'event', name: 'intubation' });
    run(s, 40);
    const after = s.vitals();
    return { hr: after.hr - before.hr, sys: after.sys - before.sys, se: after.se - before.se };
  };
  const plain = respond(false);
  const covered = respond(true);
  assert.ok(plain.hr > 8 && plain.sys > 10 && plain.se > 3, JSON.stringify(plain));
  assert.ok(covered.hr < plain.hr / 2 && covered.sys < plain.sys / 2, JSON.stringify(covered));
});

test('disconnected line: the pump display rises but the patient gets nothing', () => {
  const s = new Station('t');
  s.action({ type: 'event', name: 'line', connected: false });
  program(s, 0);
  run(s, 300);
  assert.ok(s.pumps[0].unit.infusion.ce > 3.5);
  assert.ok((s.patient.levels().propofol?.ce ?? 0) < 0.01);
  assert.ok(s.vitals().se > 85);
});

test('drug stays in the patient after the pump is switched off', () => {
  const s = new Station('t');
  program(s, 0);
  run(s, 300);
  s.action({ type: 'pumpPower', pump: s.pumps[0].id });
  run(s, 10);
  assert.ok(s.patient.levels().propofol.ce > 3);
});

test('instructor override ramps a value and release returns it to the model', () => {
  const s = new Station('t');
  run(s, 10);
  s.action({ type: 'override', key: 'hr', value: 140, seconds: 60 });
  run(s, 30);
  const mid = s.vitals().hr;
  assert.ok(mid > 95 && mid < 115, `halfway ${mid}`);
  run(s, 60);
  assert.equal(s.vitals().hr, 140);
  s.action({ type: 'release', key: 'hr' });
  assert.ok(s.vitals().hr < 80);
});

test('bleeding lowers pressure and raises heart rate; occlusion alarms the pump', () => {
  const s = new Station('t');
  s.action({ type: 'event', name: 'bleeding', on: true });
  run(s, 300);
  const v = s.vitals();
  assert.ok(v.sys < 105 && v.hr > 90, JSON.stringify(v));

  program(s, 0);
  run(s, 60);
  s.action({ type: 'event', name: 'occlusion', pump: s.pumps[0].id, on: true });
  run(s, 5);
  const screen = s.pumps[0].unit.screen();
  assert.equal(screen.alarm, 'OCCLUSION');
  assert.equal(s.pumps[0].unit.infusion.deliveredRate, 0);
  assert.ok(s.log.some((e) => e.text.includes('OCCLUSION')));
  assert.throws(() => s.action({ type: 'nonsense' }));
});
