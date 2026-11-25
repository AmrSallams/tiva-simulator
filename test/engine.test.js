import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, validatePatient, modelsForDrug, MODELS, DRUGS } from '../src/engine/models.js';
import { buildStepper, advance, timeToPeakEffect, ke0FromTimeToPeak } from '../src/engine/pk.js';
import { Infusion } from '../src/engine/infusion.js';

const near = (actual, expected, relTol, label = '') =>
  assert.ok(
    Math.abs(actual - expected) <= Math.abs(expected) * relTol,
    `${label} expected ${expected} within ${relTol * 100}%, got ${actual}`,
  );

const adult = { age: 40, weight: 70, height: 170, sex: 'male' };
const eleveldRef = { age: 35, weight: 70, height: 170, sex: 'male' };

// ---------- Model parameters against published values ----------

test('Marsh: published volumes for 70 kg', () => {
  const m = buildModel('marsh', adult);
  near(m.v1, 15.96, 0.001, 'V1');
  near(m.v2, 32.4, 0.005, 'V2');
  near(m.v3, 202.5, 0.005, 'V3');
  assert.equal(m.k10, 0.119);
  assert.equal(m.ke0, 0.26);
});

test('Schnider: published values for 40 y, 70 kg, 170 cm male', () => {
  const m = buildModel('schnider', adult);
  assert.equal(m.v1, 4.27);
  near(m.v2, 24.0, 0.002, 'V2');
  near(m.k10, 0.384, 0.003, 'k10');
  near(m.k12, 0.375, 0.003, 'k12');
  near(m.k21, 0.067, 0.01, 'k21');
  near(m.k13, 0.196, 0.003, 'k13');
  near(m.k31, 0.0035, 0.01, 'k31');
});

test('Minto: 40 y, 80 kg, 180 cm male matches the PyTCI reference trace', () => {
  const m = buildModel('minto', { age: 40, weight: 80, height: 180, sex: 'male' });
  assert.equal(m.v3, 5.42);
  near(m.ke0, 0.595, 1e-9, 'ke0');
  const step = buildStepper(m, 1);
  let s = [50, 0, 0, 0];
  near(s[0] / m.v1, 8.84, 0.002, 'Cp at 0 s');
  for (let i = 0; i < 60; i++) s = advance(step, s, 0);
  near(s[0] / m.v1, 3.88, 0.015, 'Cp at 60 s');
});

test('Eleveld propofol: reference individual', () => {
  const m = buildModel('eleveldPropofol', eleveldRef, { opioids: false });
  near(m.v1, 6.28, 0.002, 'V1');
  near(m.v2, 25.5, 0.002, 'V2');
  near(m.v3, 273, 0.002, 'V3');
  near(m.cl1, 1.79, 0.002, 'CL');
  // Q2ref 1.75 is multiplied by the paper's Q3-maturation term, 1.046 in an adult.
  near(m.cl2, 1.83, 0.002, 'Q2');
  near(m.cl3, 1.11, 0.002, 'Q3');
  near(m.ke0, 0.146, 1e-9, 'ke0');
});

test('Eleveld propofol: opioid and female effects', () => {
  const withOpioids = buildModel('eleveldPropofol', eleveldRef);
  near(withOpioids.cl1, 1.6195, 0.001, 'CL with opioids');
  assert.ok(withOpioids.v3 < 273 * 0.7);
  const female = buildModel('eleveldPropofol', { ...eleveldRef, sex: 'female' }, { opioids: false });
  near(female.cl1, 2.1, 0.002, 'female CL');
  near(female.v3, 225, 0.005, 'female V3');
});

test('Eleveld remifentanil: reference individual and female', () => {
  const m = buildModel('eleveldRemifentanil', eleveldRef);
  near(m.v1, 5.81, 0.002, 'V1');
  near(m.v2, 8.82, 0.002, 'V2');
  near(m.v3, 5.03, 0.002, 'V3');
  near(m.cl1, 2.58, 0.002, 'CL');
  near(m.cl2, 1.72, 0.005, 'Q2');
  near(m.cl3, 0.124, 0.005, 'Q3');
  near(m.ke0, 1.09, 1e-9, 'ke0');
  const f = buildModel('eleveldRemifentanil', { ...eleveldRef, sex: 'female' });
  near(f.v1, 4.79, 0.003, 'female V1');
  near(f.v2, 10.06, 0.003, 'female V2');
  near(f.cl1, 3.09, 0.003, 'female CL');
});

test('Paedfusor: 6 y, 20 kg', () => {
  const m = buildModel('paedfusor', { age: 6, weight: 20 });
  near(m.v1, 9.2, 0.005, 'V1');
  near(m.v2, 19.0, 0.005, 'V2');
  near(m.v3, 117, 0.01, 'V3');
  near(m.k10, 0.0624, 0.01, 'k10');
  assert.equal(m.effectSiteTargeting, false);
});

test('Paedfusor at 16 y equals Marsh kinetics', () => {
  const p = buildModel('paedfusor', { age: 16, weight: 50 });
  const m = buildModel('marsh', { age: 16, weight: 50 });
  near(p.v1, m.v1, 0.01, 'V1');
  near(p.k10, 0.119, 1e-9, 'k10');
});

test('Kataria, Hannivoort, Gepts, Domino: basic parameters', () => {
  const k = buildModel('kataria', { age: 6, weight: 20 });
  near(k.v1, 8.2, 1e-9);
  near(k.v2, 18.2, 1e-9);
  near(k.cl1, 0.7, 1e-9);
  const h = buildModel('hannivoort', adult);
  near(h.v1, 1.78, 1e-9);
  near(h.cl1, 0.686, 1e-9);
  near(h.cl2, 2.98, 1e-9);
  const g = buildModel('gepts', adult);
  near(g.cl1, 0.92, 0.005);
  near(g.v2, 63.4, 0.005);
  const d = buildModel('domino', adult);
  near(d.v1, 4.41, 1e-9);
  assert.equal(d.ke0, null);
});

test('every model builds for a suitable patient and belongs to a known drug', () => {
  for (const id of Object.keys(MODELS)) {
    const patient = MODELS[id].limits.age[1] <= 16 ? { age: 6, weight: 20 } : adult;
    const m = buildModel(id, patient);
    for (const key of ['v1', 'v2', 'v3', 'k10', 'k12', 'k13', 'k21', 'k31']) {
      assert.ok(m[key] > 0, `${id}.${key}`);
    }
    assert.ok(DRUGS[m.drug], `${id} drug`);
  }
  assert.deepEqual(modelsForDrug('remifentanil'), ['minto', 'eleveldRemifentanil']);
});

// ---------- Patient limits ----------

test('patient limits are enforced like a pump', () => {
  assert.ok(validatePatient('marsh', { age: 10, weight: 35 }).length > 0);
  assert.ok(validatePatient('kataria', { age: 13, weight: 40 }).length > 0);
  assert.ok(validatePatient('paedfusor', { age: 6, weight: 70 }).length > 0);
  assert.ok(validatePatient('schnider', { age: 40, weight: 70, height: 170 }).length > 0); // no sex
  // James lean body mass fails in severe obesity (BMI over about 42 in men, 35 in women)
  assert.ok(validatePatient('schnider', { age: 40, weight: 130, height: 165, sex: 'male' }).length > 0);
  assert.ok(validatePatient('minto', { age: 40, weight: 100, height: 160, sex: 'female' }).length > 0);
  assert.deepEqual(validatePatient('eleveldPropofol', { age: 40, weight: 130, height: 165, sex: 'male' }), []);
  assert.throws(() => buildModel('marsh', { age: 10, weight: 35 }));
});

// ---------- Kinetics ----------

test('time to peak effect matches published values', () => {
  near(timeToPeakEffect(buildModel('schnider', adult)), 1.6, 0.1, 'Schnider');
  near(timeToPeakEffect(buildModel('marshModified', adult)), 1.6, 0.06, 'modified Marsh');
  const slow = timeToPeakEffect(buildModel('marsh', adult)); // usually quoted as about 4 to 4.5 min
  assert.ok(slow > 3.5 && slow < 5, `Marsh ke0 0.26 peak at ${slow} min`);
  near(ke0FromTimeToPeak(buildModel('marsh', adult), 1.6), 1.2, 0.06, 'ke0 for 1.6 min');
});

test('a constant infusion settles at rate / clearance', () => {
  for (const id of ['marsh', 'schnider', 'minto', 'eleveldPropofol', 'hannivoort']) {
    const m = buildModel(id, adult);
    const hour = buildStepper(m, 3600);
    let s = [0, 0, 0, 0];
    for (let i = 0; i < 24 * 30; i++) s = advance(hour, s, 10);
    near(s[0] / m.v1, 10 / m.cl1, 1e-4, `${id} Cp`);
    if (m.ke0 != null) near(s[3], 10 / m.cl1, 1e-4, `${id} Ce`);
    // at steady state every compartment has the same concentration
    near(s[1] / m.v2, 10 / m.cl1, 1e-4, `${id} C2`);
    near(s[2] / m.v3, 10 / m.cl1, 1e-3, `${id} C3`);
  }
});

test('one 60 s step equals sixty 1 s steps', () => {
  const m = buildModel('minto', adult);
  const one = buildStepper(m, 1);
  const sixty = buildStepper(m, 60);
  let a = [3, 1, 2, 0.5];
  for (let i = 0; i < 60; i++) a = advance(one, a, 7);
  const b = advance(sixty, [3, 1, 2, 0.5], 7);
  for (let i = 0; i < 4; i++) near(a[i], b[i], 1e-7, `state ${i}`);
});

// ---------- Target-controlled infusion ----------

test('plasma TCI, Marsh 4 mcg/mL: loading dose, hold, and maintenance rate', () => {
  const m = buildModel('marsh', adult);
  const pump = new Infusion({ model: m, concentration: 10 });
  pump.setTarget('plasma', 4);
  pump.tick(30);
  near(pump.cp, 4, 0.01, 'Cp at 30 s');
  assert.ok(pump.totalDose > 63.8 && pump.totalDose < 75, `loading dose ${pump.totalDose} mg`);
  let maxCp = 0;
  for (let i = 0; i < 60 * 60; i++) {
    pump.tick();
    maxCp = Math.max(maxCp, pump.cp);
    assert.ok(pump.rateMlH <= 1200 + 1e-9);
    if (pump.timeS % 10 === 0) near(pump.cp, 4, 0.005, `Cp at ${pump.timeS} s`);
  }
  assert.ok(maxCp < 4.02, `no overshoot, max ${maxCp}`);
  near(pump.volumeMl, pump.totalDose / 10, 1e-9, 'volume');
  // After many hours the rate approaches target x clearance.
  pump.tick(48 * 3600);
  near(pump.deliveredRate, 4 * m.cl1, 0.03, 'steady rate');
});

test('effect-site TCI, Schnider 4 mcg/mL: peaks at target without overshoot', () => {
  const m = buildModel('schnider', adult);
  const pump = new Infusion({ model: m, concentration: 10 });
  pump.setTarget('effect', 4);
  let maxCe = 0;
  let maxCp = 0;
  let reached = null;
  for (let i = 0; i < 30 * 60; i++) {
    pump.tick();
    maxCe = Math.max(maxCe, pump.ce);
    maxCp = Math.max(maxCp, pump.cp);
    if (reached == null && pump.ce >= 4 * 0.98) reached = pump.timeS;
    if (reached != null) near(pump.ce, 4, 0.025, `Ce at ${pump.timeS} s`);
  }
  assert.ok(maxCe <= 4 * 1.005, `Ce overshoot ${maxCe}`);
  assert.ok(maxCp > 6, `plasma overshoot expected, got ${maxCp}`);
  assert.ok(reached != null && reached < 4 * 60, `reached target at ${reached} s`);
});

test('effect-site TCI: lowering the target stops the pump until Ce arrives', () => {
  const pump = new Infusion({ model: buildModel('minto', adult), concentration: 50 });
  pump.setTarget('effect', 6);
  pump.tick(15 * 60);
  near(pump.ce, 6, 0.02);
  pump.setTarget('effect', 3);
  pump.tick(10);
  assert.equal(pump.deliveredRate, 0);
  let minCe = Infinity;
  for (let i = 0; i < 20 * 60; i++) {
    pump.tick();
    minCe = Math.min(minCe, pump.ce);
  }
  assert.ok(minCe > 3 * 0.97, `undershoot ${minCe}`);
  near(pump.ce, 3, 0.02);
  assert.ok(pump.deliveredRate > 0);
});

test('effect-site targeting is refused for plasma-only models', () => {
  const pump = new Infusion({ model: buildModel('domino', adult), concentration: 10 });
  assert.throws(() => pump.setTarget('effect', 0.2));
  pump.setTarget('plasma', 0.2);
  pump.tick(120);
  near(pump.cp, 0.2, 0.01);
  assert.equal(pump.ce, null);
});

test('every model holds its default target in plasma mode', () => {
  for (const id of Object.keys(MODELS)) {
    const patient = MODELS[id].limits.age[1] <= 16 ? { age: 6, weight: 20 } : adult;
    const model = buildModel(id, patient);
    const drug = DRUGS[model.drug];
    const pump = new Infusion({ model, concentration: drug.concentrations[0] });
    pump.setTarget('plasma', drug.defaultTarget);
    pump.tick(20 * 60);
    near(pump.cp, drug.defaultTarget, 0.01, id);
    if (model.effectSiteTargeting) {
      const e = new Infusion({ model, concentration: drug.concentrations[0] });
      e.setTarget('effect', drug.defaultTarget);
      let max = 0;
      for (let i = 0; i < 90 * 60; i++) {
        e.tick();
        max = Math.max(max, e.ce);
      }
      assert.ok(max <= drug.defaultTarget * 1.005, `${id} Ce overshoot ${max}`);
      near(e.ce, drug.defaultTarget, 0.03, `${id} Ce`);
    }
  }
});

// ---------- Manual mode, pause, decrement time ----------

test('manual rate and bolus account for dose and volume', () => {
  const pump = new Infusion({ model: buildModel('marsh', adult), concentration: 10 });
  pump.setManualRateMlH(60); // 600 mg/h = 10 mg/min
  pump.tick(600);
  near(pump.totalDose, 100, 1e-9, 'dose');
  near(pump.volumeMl, 10, 1e-9, 'volume');
  pump.bolus(50); // at 1200 mL/h = 200 mg/min, takes 15 s
  pump.tick(15);
  near(pump.totalDose, 150, 1e-9, 'dose after bolus');
  pump.tick(1);
  near(pump.rateMlH, 60, 1e-9, 'returns to the set rate');
});

test('pause stops delivery and the concentration falls', () => {
  const pump = new Infusion({ model: buildModel('schnider', adult), concentration: 10 });
  pump.setTarget('plasma', 3);
  pump.tick(300);
  const dose = pump.totalDose;
  pump.pause();
  pump.tick(120);
  assert.equal(pump.totalDose, dose);
  assert.ok(pump.cp < 2.5);
  pump.resume();
  pump.tick(60);
  near(pump.cp, 3, 0.01);
});

test('decrement time grows with the length of the infusion', () => {
  const pump = new Infusion({ model: buildModel('marsh', adult), concentration: 10 });
  pump.setTarget('effect', 4);
  pump.tick(15 * 60);
  const short = pump.decrementTime(1.5);
  pump.tick(4 * 3600);
  const long = pump.decrementTime(1.5);
  assert.ok(short > 60 && long > short, `short ${short} s, long ${long} s`);
  // Check the prediction by actually stopping the pump.
  pump.stop();
  pump.tick(long - 20);
  assert.ok(pump.ce > 1.5);
  pump.tick(40);
  assert.ok(pump.ce < 1.5);
  assert.equal(pump.decrementTime(10), 0);
});
