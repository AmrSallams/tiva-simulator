// The simulated patient: how vital signs and entropy respond to the drugs
// actually delivered, to surgical stimulation and to instructor events.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
//
// The drug kinetics use the published pump models. The RESPONSE to the drugs
// (blood pressure, heart rate, breathing, saturation) is a simplified teaching
// model with plausible directions and sizes, not a validated physiological one.
// The hypnosis surface follows Bouillon et al., Anesthesiology 2004;100:1353-72
// (propofol C50 4.47 mcg/mL, remifentanil C50 19.3 ng/mL, additive, slope 1.43).

import { advance, emptyState } from '../engine/pk.js';

export const PRESETS = {
  adult: { name: 'Fit adult (40 y, 70 kg, 170 cm, male)', hr: 72, sys: 124, dia: 76, rr: 13, spo2: 99, temp: 36.7,
    hypnoticSens: 1, hypotensionSens: 1, safeApnoea: 240, ventRate: 12 },
  elderly: { name: 'Frail elderly (82 y, 58 kg, 160 cm, female)', hr: 68, sys: 152, dia: 78, rr: 15, spo2: 96, temp: 36.3,
    hypnoticSens: 1.4, hypotensionSens: 1.7, safeApnoea: 120, ventRate: 12 },
  obese: { name: 'Obese adult (45 y, 130 kg, 170 cm, male)', hr: 84, sys: 142, dia: 86, rr: 16, spo2: 96, temp: 36.8,
    hypnoticSens: 1, hypotensionSens: 1.1, safeApnoea: 75, ventRate: 14 },
  child: { name: 'Child (6 y, 20 kg, 115 cm, male)', hr: 102, sys: 98, dia: 58, rr: 22, spo2: 99, temp: 36.9,
    hypnoticSens: 0.8, hypotensionSens: 0.8, safeApnoea: 60, ventRate: 20 },
  anxious: { name: 'Anxious young adult (24 y, 65 kg, 168 cm, female)', hr: 98, sys: 136, dia: 84, rr: 18, spo2: 99, temp: 36.8,
    hypnoticSens: 0.75, hypotensionSens: 0.8, safeApnoea: 240, ventRate: 12 },
};

export const STIM_LEVELS = { none: 0, light: 2, moderate: 4, strong: 7 };

const lag = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));
const sat = (x, half) => (x <= 0 ? 0 : x / (x + half));

export class Patient {
  constructor(presetId = 'adult') {
    this.presetId = PRESETS[presetId] ? presetId : 'adult';
    const P = (this.preset = PRESETS[this.presetId]);
    this.lines = new Map(); // one drug store per programmed infusion
    this.stimLevel = 0; // sustained surgical stimulation, 0 to 10
    this.stimPulse = 0; // short-lived stimulation (intubation, incision)
    this.ventilated = false;
    this.preoxygenated = true;
    this.ventilatedFor = 0;
    this.apnoeaTime = 0;
    this.bleeding = false;
    this.deficit = 0; // blood volume lost, 0 to 0.8
    this.pressor = 0; // vasopressor effect, decays
    this.chrono = 0; // anticholinergic effect, decays
    this.paco2 = 5.2;
    this.v = { hr: P.hr, spo2: P.spo2, sys: P.sys, dia: P.dia, etco2: 4.9, rr: P.rr, temp: P.temp,
      se: 89, re: 98, cvp: 8, tofCount: 4, tofRatio: 100 };
  }

  /** Patient plasma and effect-site concentration of each drug. */
  levels() {
    const out = {};
    for (const line of this.lines.values()) {
      const cp = line.state[0] / line.model.v1;
      const ce = line.model.ke0 == null ? cp : line.state[3];
      const d = (out[line.drug] ??= { cp: 0, ce: 0 });
      d.cp += cp;
      d.ce += ce;
    }
    return out;
  }

  /**
   * Advance one or more seconds.
   * @param {{infusion: object, drug: string, rate: number}[]} deliveries
   *   what each pump actually delivered into the patient (dose units per minute)
   */
  step(deliveries, dt = 1) {
    // --- drug kinetics ---
    const rates = new Map();
    for (const d of deliveries) {
      if (!this.lines.has(d.infusion)) {
        this.lines.set(d.infusion, { drug: d.drug, model: d.infusion.model, stepper: d.infusion.second, state: emptyState() });
      }
      rates.set(d.infusion, d.rate);
    }
    for (const [key, line] of this.lines) {
      for (let i = 0; i < dt; i++) line.state = advance(line.stepper, line.state, rates.get(key) ?? 0);
    }

    const P = this.preset;
    const v = this.v;
    const c = this.levels();
    const ce = (drug) => c[drug]?.ce ?? 0;
    const prop = ce('propofol') * P.hypnoticSens;
    const opioid = ce('remifentanil') + 12 * ce('sufentanil'); // remifentanil-equivalent ng/mL (rough potency)
    const dex = ce('dexmedetomidine');
    const ket = ce('ketamine');

    // --- hypnosis and stimulation ---
    const u = prop / 4.47 + opioid / 19.3 + dex / 2.5;
    const hyp = u ** 1.43 / (1 + u ** 1.43); // 0 awake, 1 very deep
    const analgesia = sat(opioid + 3 * ket, 3);
    this.stimPulse *= Math.exp(-dt / 120);
    const stim = Math.min(10, this.stimLevel + this.stimPulse) * (1 - analgesia) * (1 - 0.4 * hyp);

    const seTarget = Math.min(91, 91 * (1 - hyp) + 3 * stim + 8 * sat(ket, 0.5) * hyp);
    const reTarget = Math.min(100, seTarget + 2 + 7 * (seTarget / 91) ** 2 + 1.2 * stim);

    // --- circulation ---
    if (this.bleeding) this.deficit = Math.min(0.8, this.deficit + dt / 600);
    this.pressor *= Math.exp(-dt / 240);
    this.chrono *= Math.exp(-dt / 300);
    const x = (prop / 4.5) ** 1.5;
    const drop = Math.min(0.7, P.hypotensionSens * ((0.4 * x) / (1 + x) + 0.15 * sat(opioid, 5) + 0.15 * sat(dex, 1)));
    const sysTarget =
      P.sys * (1 - drop) * (1 + 0.035 * stim) * (1 - 0.5 * this.deficit) * (1 + 0.3 * this.pressor) * (1 + 0.15 * sat(ket, 1));
    let hrTarget =
      P.hr * (1 - 0.22 * sat(opioid, 6)) * (1 - 0.25 * sat(dex, 1.2)) * (1 - 0.08 * hyp) * (1 + 0.04 * stim) *
      (1 + 0.7 * this.deficit) * (1 + 0.35 * this.chrono) * (1 + 0.15 * sat(ket, 1));
    if (v.spo2 < 70) hrTarget *= 0.6 + 0.4 * Math.max(0, (v.spo2 - 40) / 30); // severe hypoxia slows the heart

    // --- breathing ---
    const depress = (opioid / 1.5) * (1 + prop / 3) + prop / 8 + dex / 20;
    const effort = 1 - (depress ** 2.5 / (1 + depress ** 2.5)) * (1 - 0.03 * stim);
    let rrSpont = P.rr * effort;
    if (rrSpont < 4) rrSpont = 0;
    const rrTarget = this.ventilated ? P.ventRate : rrSpont;
    v.rr = rrTarget === 0 ? 0 : lag(Math.max(v.rr, 3), rrTarget, dt, 8);
    const apnoea = v.rr === 0;

    this.ventilatedFor = this.ventilated ? this.ventilatedFor + dt : 0;
    if (this.ventilatedFor > 60) this.preoxygenated = true;
    if (apnoea) {
      this.apnoeaTime += dt;
      const safe = this.preoxygenated ? P.safeApnoea : P.safeApnoea * 0.25;
      if (this.apnoeaTime > safe) {
        const over = this.apnoeaTime - safe;
        v.spo2 = Math.max(40, v.spo2 - Math.min(0.6, 0.05 + over * 0.004) * dt);
        this.preoxygenated = false;
      }
      this.paco2 = Math.min(11, this.paco2 + (0.45 / 60) * dt);
    } else {
      this.apnoeaTime = 0;
      const spo2Target = this.ventilated ? Math.max(P.spo2, 99) : P.spo2 - 7 * (1 - effort) ** 2;
      v.spo2 = lag(v.spo2, spo2Target, dt, 15);
      const paco2Target = this.ventilated ? 4.9 : Math.min(9, 5.2 / Math.max(0.35, effort) ** 0.6);
      this.paco2 = lag(this.paco2, paco2Target, dt, this.ventilated ? 90 : 120);
    }
    v.etco2 = apnoea ? 0 : this.paco2 - 0.3;

    // --- lagged outputs ---
    v.se = lag(v.se, seTarget, dt, 8);
    v.re = Math.max(v.se, lag(v.re, reTarget, dt, 6));
    v.sys = lag(v.sys, sysTarget, dt, 25);
    v.dia = P.dia * (v.sys / P.sys) ** 0.9;
    v.hr = lag(v.hr, hrTarget, dt, 12);
    v.cvp = lag(v.cvp, 8 * (1 - this.deficit), dt, 60);
    if (hyp > 0.4) v.temp = Math.max(34.5, v.temp - (0.5 / 3600) * dt);
    return v;
  }
}
