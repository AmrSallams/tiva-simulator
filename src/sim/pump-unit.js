// One syringe pump on screen: the programming steps, the running display and
// the alarms. The drug calculations come from the engine.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { DRUGS, MODELS, modelsForDrug, validatePatient, buildModel } from '../engine/models.js';
import { Infusion } from '../engine/infusion.js';

// Per-drug display details. Label colours follow the usual syringe-label
// convention (induction agents yellow, opioids blue).
const DRUG_UI = {
  propofol: { step: 0.1, decimals: 1, color: '#ffd84d', perKg: ['mg/kg/h', (r, w) => (r * 60) / w], decrement: 1.5, bolus: 20 },
  remifentanil: { step: 0.1, decimals: 1, color: '#6cb6ff', perKg: ['mcg/kg/min', (r, w) => r / w], decrement: 1.0, bolus: 20 },
  sufentanil: { step: 0.01, decimals: 2, color: '#6cb6ff', perKg: ['mcg/kg/h', (r, w) => (r * 60) / w], decrement: 0.1, bolus: 5 },
  dexmedetomidine: { step: 0.1, decimals: 1, color: '#ffab66', perKg: ['mcg/kg/h', (r, w) => (r * 60) / w], decrement: 0.2, bolus: 10 },
  ketamine: { step: 0.05, decimals: 2, color: '#ffd84d', perKg: ['mg/kg/h', (r, w) => (r * 60) / w], decrement: 0.1, bolus: 10 },
};

// The four pump styles. Each has its own order of programming steps, order of
// patient questions, wording and keypad. The brand-style sequences are
// approximations for teaching and should be checked against the real pumps.
export const STYLES = {
  generic: {
    name: 'Generic TCI pump',
    steps: ['drug', 'concentration', 'syringe', 'model', 'patient', 'mode', 'target', 'confirm'],
    patientOrder: ['age', 'weight', 'height', 'sex'],
    words: { start: 'Start', stop: 'Stop', hold: 'PAUSED', running: 'INFUSING', menu: 'Menu', back: 'Back', ok: 'OK' },
    keys: [
      [['BIGDOWN', '− −'], ['DOWN', '−'], ['UP', '+'], ['BIGUP', '+ +']],
      [['START', 'Start', 'go'], ['STOP', 'Stop', 'stop'], ['BOLUS', 'Bolus'], ['MENU', 'Menu']],
    ],
    tapToSelect: true,
  },
  alaris: {
    name: 'Alaris PK style',
    steps: ['drugModel', 'concentration', 'patient', 'syringe', 'mode', 'target', 'confirm'],
    patientOrder: ['age', 'height', 'weight', 'sex'],
    words: { start: 'RUN', stop: 'HOLD', hold: 'ON HOLD', running: 'INFUSING', menu: 'OPTIONS', back: 'BACK', ok: 'OK' },
    keys: [
      [['BIGUP', '⏶⏶'], ['UP', '⏶'], ['DOWN', '⏷'], ['BIGDOWN', '⏷⏷']],
      [['START', 'RUN', 'go'], ['STOP', 'HOLD', 'stop'], ['BOLUS', 'PURGE / BOLUS'], ['MENU', 'OPTIONS']],
    ],
  },
  agilia: {
    name: 'Agilia style',
    steps: ['syringe', 'drug', 'concentration', 'patient', 'model', 'mode', 'target', 'confirm'],
    patientOrder: ['sex', 'age', 'height', 'weight'],
    words: { start: 'START', stop: 'STOP', hold: 'STOPPED', running: 'INFUSION', menu: 'MENU', back: 'C', ok: 'OK' },
    keys: [
      [['BIGUP', '▲▲'], ['UP', '▲'], ['DOWN', '▼'], ['BIGDOWN', '▼▼']],
      [['START', 'START', 'go'], ['STOP', 'STOP', 'stop'], ['BOLUS', 'BOLUS'], ['MENU', 'MENU']],
    ],
  },
  space: {
    name: 'Space style',
    steps: ['syringe', 'drug', 'concentration', 'patient', 'model', 'mode', 'target', 'confirm'],
    patientOrder: ['weight', 'height', 'age', 'sex'],
    words: { start: 'START', stop: 'STOP', hold: 'STOPPED', running: 'RUNNING', menu: 'MENU', back: 'C', ok: 'OK' },
    keys: [
      [['LEFT', '◀'], ['UP', '▲'], ['DOWN', '▼'], ['RIGHT', '▶']],
      [['STARTSTOP', 'START / STOP', 'go'], ['BOLUS', 'BOL'], ['MENU', 'MENU']],
    ],
    digitCursor: true, // left/right choose which digit the up/down keys change
  },
};

const PATIENT_FIELDS = {
  age: { title: 'Age', unit: 'years', min: 1, max: 100, step: 1, decimals: 0 },
  weight: { title: 'Weight', unit: 'kg', min: 5, max: 200, step: 1, decimals: 0 },
  height: { title: 'Height', unit: 'cm', min: 50, max: 220, step: 1, decimals: 0 },
};
const MODE_NAMES = { effect: 'Effect-site TCI', plasma: 'Plasma TCI', manual: 'Manual (mL/h)' };
const SYRINGES = [20, 50, 60];
const PURGE_ML = 2;

const round = (v, decimals) => Number(v.toFixed(decimals));
const clock = (s) => {
  if (!Number.isFinite(s)) return '--:--';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

/** Dose and duration of the initial loading phase for a planned TCI. */
function previewInduction(model, concentration, mode, target) {
  const p = new Infusion({ model, concentration });
  p.setTarget(mode, target);
  p.tick(1);
  const first = p.deliveredRate;
  if (!(first > 0)) return null;
  let t = 1;
  while (t < 900 && p.deliveredRate >= first * 0.5) {
    p.tick(1);
    t++;
  }
  return { dose: p.totalDose, seconds: t };
}

export class PumpUnit {
  /** @param {(text: string) => void} [onEvent]  receives a line for the case log */
  constructor(styleId = 'generic', onEvent = () => {}) {
    this.styleId = styleId;
    this.onEvent = onEvent;
    this.occluded = false;
    this.powerOff();
  }

  get style() {
    return STYLES[this.styleId];
  }

  setStyle(styleId) {
    this.styleId = styleId;
    if (this.on && !this.infusion) this.#goto(0); // restart programming in the new order
  }

  powerOff() {
    this.on = false;
    this.infusion = null;
    this.cfg = { drug: 'propofol', concentration: 10, syringeMl: 50, modelId: null, mode: null, target: null,
      patient: { age: 40, weight: 70, height: 170, sex: 'male' } };
    this.pos = 0;
    this.view = null;
    this.alarm = null;
    this.alarmAcked = false;
    this.held = false;
    this.pending = null;
    this.message = null;
    this.syringeUsedAtChange = 0;
    this.purged = 0;
  }

  powerOn() {
    if (this.on) return;
    this.on = true;
    this.#goto(0);
  }

  // ---------- programming steps ----------

  // The full list of steps, with the patient questions expanded.
  #flow() {
    const out = [];
    const steps = this.style.steps;
    for (const step of steps) {
      if (step !== 'patient') {
        out.push(step);
        continue;
      }
      const modelFirst = steps.indexOf('patient') > Math.max(steps.indexOf('model'), steps.indexOf('drugModel'));
      const needs = modelFirst && this.cfg.modelId
        ? new Set([...MODELS[this.cfg.modelId].needs, 'age', 'weight'])
        : new Set(['age', 'weight', 'height', 'sex']);
      for (const f of this.style.patientOrder) if (needs.has(f)) out.push(`p:${f}`);
    }
    return out;
  }

  #goto(pos) {
    const flow = this.#flow();
    this.pos = Math.max(0, Math.min(flow.length - 1, pos));
    this.view = this.#viewFor(flow[this.pos]);
  }

  #next() {
    const flow = this.#flow();
    const step = flow[this.pos];
    // Once both the model and the patient are known, check the model accepts the patient.
    const patientDone = !flow.slice(this.pos + 1).some((s) => s.startsWith('p:'));
    const justFinished = step.startsWith('p:') || step === 'model' || step === 'drugModel';
    if (this.cfg.modelId && patientDone && justFinished) {
      const errors = validatePatient(this.cfg.modelId, this.cfg.patient);
      if (errors.length) {
        this.view = { type: 'error', title: `${MODELS[this.cfg.modelId].name}: not available`, lines: errors };
        return;
      }
    }
    this.#goto(this.pos + 1);
  }

  #list(title, options, current, onOk) {
    const index = Math.max(0, options.findIndex((o) => o.value === current));
    return { type: 'list', title, options, index, onOk };
  }

  #viewFor(step) {
    const cfg = this.cfg;
    const drug = DRUGS[cfg.drug];
    switch (step) {
      case 'drug':
        return this.#list('Select drug', Object.entries(DRUGS).map(([value, d]) => ({ value, label: d.name })), cfg.drug, (v) => {
          if (v !== cfg.drug) {
            cfg.drug = v;
            cfg.modelId = null;
            cfg.concentration = DRUGS[v].concentrations[0];
            cfg.target = null;
          }
        });
      case 'drugModel':
        return this.#list('Select drug and model',
          Object.entries(MODELS).map(([value, m]) => ({ value, label: `${DRUGS[m.drug].name} ${m.name}` })),
          cfg.modelId, (v) => {
            if (MODELS[v].drug !== cfg.drug) {
              cfg.drug = MODELS[v].drug;
              cfg.concentration = DRUGS[cfg.drug].concentrations[0];
              cfg.target = null;
            }
            cfg.modelId = v;
          });
      case 'concentration':
        return this.#list(`${drug.name} concentration`,
          drug.concentrations.map((c) => ({ value: c, label: `${c} ${drug.doseUnit}/mL${cfg.drug === 'propofol' ? ` (${c / 10}%)` : ''}` })),
          cfg.concentration, (v) => (cfg.concentration = v));
      case 'syringe':
        return this.#list('Confirm syringe', SYRINGES.map((v) => ({ value: v, label: `${v} mL syringe` })), cfg.syringeMl, (v) => (cfg.syringeMl = v));
      case 'model':
        return this.#list(`${drug.name} model`,
          modelsForDrug(cfg.drug).map((value) => ({ value, label: MODELS[value].name, sub: MODELS[value].plasmaOnly ? 'plasma only' : '' })),
          cfg.modelId, (v) => (cfg.modelId = v));
      case 'p:sex':
        return this.#list('Patient sex', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], cfg.patient.sex, (v) => (cfg.patient.sex = v));
      case 'mode': {
        const model = buildModel(cfg.modelId, cfg.patient);
        const options = ['effect', 'plasma', 'manual']
          .filter((m) => m !== 'effect' || model.effectSiteTargeting)
          .map((value) => ({ value, label: MODE_NAMES[value] }));
        return this.#list('Infusion mode', options, cfg.mode, (v) => {
          if (v !== cfg.mode) cfg.target = null;
          cfg.mode = v;
        });
      }
      case 'target':
        return this.#number(this.#targetSpec(), cfg.target, (v) => (cfg.target = v));
      case 'confirm':
        return { type: 'confirm' };
      default: {
        const field = step.slice(2);
        return this.#number(PATIENT_FIELDS[field], cfg.patient[field], (v) => (cfg.patient[field] = v));
      }
    }
  }

  // What the up/down keys edit: a TCI target or a manual rate.
  #targetSpec() {
    const { drug, mode } = this.cfg;
    const ui = DRUG_UI[drug];
    if (mode === 'manual') {
      return { title: 'Infusion rate', unit: 'mL/h', min: 0, max: 1200, step: 0.1, decimals: 1, initial: 10 };
    }
    return {
      title: mode === 'effect' ? 'Effect-site target (Cet)' : 'Plasma target (Cpt)',
      unit: DRUGS[drug].targetUnit, min: 0, max: DRUGS[drug].maxTarget, step: ui.step, decimals: ui.decimals,
      initial: DRUGS[drug].defaultTarget,
    };
  }

  #number(spec, current, onOk) {
    return { type: 'number', ...spec, value: current ?? spec.initial, cursor: spec.step, onOk };
  }

  #adjust(view, key) {
    if (key === 'LEFT') view.cursor = Math.min(view.cursor * 10, view.step * 100);
    else if (key === 'RIGHT') view.cursor = Math.max(view.cursor / 10, view.step);
    else {
      const unit = this.style.digitCursor ? view.cursor : view.step;
      const delta = { UP: unit, DOWN: -unit, BIGUP: unit * 10, BIGDOWN: -unit * 10 }[key] ?? 0;
      view.value = round(Math.min(view.max, Math.max(view.min, view.value + delta)), view.decimals);
    }
  }

  // ---------- keys ----------

  key(key) {
    if (!this.on) return;
    this.message = null;
    if (key === 'STARTSTOP') {
      key = this.infusion && !this.held && this.view.type === 'run' ? 'STOP' : 'START';
    }
    if (this.alarm && !this.alarmAcked && (key === 'OK' || key === 'BACK')) {
      this.alarmAcked = true;
      return;
    }
    const view = this.view;
    const handler = {
      list: () => {
        if (key === 'UP' || key === 'BIGUP') view.index = (view.index + view.options.length - 1) % view.options.length;
        else if (key === 'DOWN' || key === 'BIGDOWN') view.index = (view.index + 1) % view.options.length;
        else if (key === 'OK') {
          view.onOk(view.options[view.index].value);
          if (!view.stay) this.#next();
        } else if (key === 'BACK') this.#back();
      },
      number: () => {
        if (key === 'OK') {
          view.onOk(view.value);
          if (!view.stay) this.#next();
        } else if (key === 'BACK') this.#back();
        else this.#adjust(view, key);
      },
      error: () => {
        if (key === 'OK' || key === 'BACK') this.#goto(this.pos);
      },
      confirm: () => {
        if (key === 'START') this.#start();
        else if (key === 'BACK') this.#back();
        else if (key === 'OK') this.message = `Press ${this.style.words.start} to begin`;
      },
      run: () => this.#runKey(key),
    }[view.type];
    handler?.();
  }

  /** Choose a list item directly (touch-style pumps). */
  select(index) {
    if (this.view?.type !== 'list' || !this.style.tapToSelect) return;
    this.view.index = index;
    this.key('OK');
  }

  #back() {
    if (this.infusion) this.view = { type: 'run' };
    else this.#goto(this.pos - 1);
  }

  #start() {
    const cfg = this.cfg;
    const model = buildModel(cfg.modelId, cfg.patient);
    this.infusion = new Infusion({ model, concentration: cfg.concentration });
    this.#applyTarget(cfg.target);
    this.held = false;
    this.view = { type: 'run' };
    this.onEvent(`Started ${DRUGS[cfg.drug].name} ${cfg.concentration} ${DRUGS[cfg.drug].doseUnit}/mL, ${model.name}, ${this.#targetText()}`);
  }

  #targetText() {
    const { mode, target, drug } = this.cfg;
    return mode === 'manual' ? `manual ${target} mL/h` : `${MODE_NAMES[mode]} target ${target} ${DRUGS[drug].targetUnit}`;
  }

  /** Instructor event: block or unblock the line. A blocked pump alarms and stops. */
  setOcclusion(on) {
    this.occluded = on;
    if (on && this.infusion) {
      this.infusion.pause();
      this.held = true;
      this.#raise('OCCLUSION');
    } else if (!on && this.alarm === 'OCCLUSION') {
      this.alarm = null;
      this.message = `Occlusion cleared: press ${this.style.words.start}`;
    }
  }

  #applyTarget(value) {
    this.cfg.target = value;
    if (this.cfg.mode === 'manual') this.infusion.setManualRateMlH(value);
    else this.infusion.setTarget(this.cfg.mode, value);
  }

  #runKey(key) {
    const inf = this.infusion;
    const words = this.style.words;
    if (['UP', 'DOWN', 'BIGUP', 'BIGDOWN', 'LEFT', 'RIGHT'].includes(key)) {
      this.pending ??= { ...this.#targetSpec(), value: this.cfg.target };
      this.pending.cursor ??= this.pending.step;
      this.#adjust(this.pending, key);
    } else if (key === 'OK' && this.pending) {
      this.#applyTarget(this.pending.value);
      this.pending = null;
      this.onEvent(`Changed to ${this.#targetText()}`);
    } else if (key === 'BACK') {
      this.pending = null;
    } else if (key === 'STOP') {
      inf.pause();
      this.held = true;
      this.onEvent('Infusion stopped by user');
    } else if (key === 'START') {
      if (this.alarm === 'END OF SYRINGE') this.message = 'Fit a new syringe first (menu)';
      else if (this.occluded) this.message = 'Line is occluded: check the line';
      else if (this.held) {
        inf.resume();
        this.held = false;
        this.onEvent('Infusion restarted');
      }
    } else if (key === 'BOLUS') {
      if (this.cfg.mode !== 'manual') this.message = 'No bolus in TCI: raise the target';
      else if (this.held) this.message = `Press ${words.start} before giving a bolus`;
      else {
        const drug = DRUGS[this.cfg.drug];
        this.view = { type: 'number', title: 'Bolus dose', unit: drug.doseUnit, min: 1, max: 500, step: 1, decimals: 0,
          value: DRUG_UI[this.cfg.drug].bolus, cursor: 1, stay: true,
          onOk: (v) => {
            inf.bolus(v);
            this.onEvent(`Bolus ${v} ${drug.doseUnit}`);
            this.view = { type: 'run' };
          } };
      }
    } else if (key === 'MENU') {
      const options = [{ value: 'syringe', label: 'New syringe' }];
      if (this.held) options.push({ value: 'purge', label: `Purge line (${PURGE_ML} mL)` });
      options.push({ value: 'resume', label: 'Return to infusion' }, { value: 'off', label: 'End case and power off' });
      this.view = { type: 'list', title: words.menu, options, index: 0, stay: true, onOk: (v) => this.#menu(v) };
    }
  }

  #menu(choice) {
    this.view = { type: 'run' };
    if (choice === 'syringe') {
      this.syringeUsedAtChange = this.infusion.volumeMl;
      this.purged = 0;
      this.alarm = null;
      this.alarmAcked = false;
      this.message = 'New syringe fitted';
      this.onEvent('New syringe fitted');
    } else if (choice === 'purge') {
      this.purged += PURGE_ML;
      this.message = `Purged ${PURGE_ML} mL (not given to patient)`;
      this.onEvent(`Purged ${PURGE_ML} mL`);
    } else if (choice === 'off') {
      this.onEvent('Pump switched off');
      this.powerOff();
    }
  }

  // ---------- time ----------

  get syringeLeft() {
    if (!this.infusion) return this.cfg.syringeMl;
    return Math.max(0, this.cfg.syringeMl - (this.infusion.volumeMl - this.syringeUsedAtChange) - this.purged);
  }

  /** Advance by simulated seconds. */
  tick(seconds = 1) {
    const inf = this.infusion;
    if (!inf) return;
    if (this.occluded && !this.held) this.setOcclusion(true);
    for (let i = 0; i < seconds; i++) {
      inf.tick(1);
      const left = this.syringeLeft;
      if (left <= 0 && this.alarm !== 'END OF SYRINGE') {
        inf.pause();
        this.held = true;
        this.#raise('END OF SYRINGE');
      } else if (left > 0 && !this.alarm && !this.held) {
        const minutesLeft = inf.rateMlH > 0 ? left / (inf.rateMlH / 60) : Infinity;
        // The 20% condition stops the fast induction bolus from triggering the warning.
        const nearlyEmpty = left <= this.cfg.syringeMl * 0.2 && minutesLeft <= 5;
        if (nearlyEmpty || left <= 2) this.#raise('NEAR END OF SYRINGE');
      }
    }
  }

  #raise(alarm) {
    this.alarm = alarm;
    this.alarmAcked = false;
    this.onEvent(`Pump alarm: ${alarm}`);
  }

  /** True while an alarm is sounding (not yet acknowledged with OK). */
  get alarmSounding() {
    return this.on && this.alarm != null && !this.alarmAcked;
  }

  // ---------- what to show ----------

  /** Plain data describing the current screen, for the page to draw. */
  screen() {
    const words = this.style.words;
    const cfg = this.cfg;
    const drug = DRUGS[cfg.drug];
    const base = { on: this.on, color: DRUG_UI[cfg.drug].color, alarm: this.alarm, alarmAcked: this.alarmAcked, message: this.message, words };
    if (!this.on) return { ...base, type: 'off' };
    const view = this.view;
    const flow = this.#flow();
    const progress = this.infusion ? null : `${this.pos + 1}/${flow.length}`;
    if (view.type === 'list') return { ...base, type: 'list', title: view.title, options: view.options, index: view.index, progress };
    if (view.type === 'number') {
      return { ...base, type: 'number', title: view.title, unit: view.unit, value: view.value.toFixed(view.decimals), progress,
        cursor: this.style.digitCursor ? view.cursor : null };
    }
    if (view.type === 'error') return { ...base, type: 'error', title: view.title, lines: view.lines };

    const model = MODELS[cfg.modelId];
    const header = `${drug.name} ${cfg.concentration} ${drug.doseUnit}/mL`;
    const sub = `${model.name} · ${MODE_NAMES[cfg.mode]}`;
    const p = cfg.patient;
    const patient = `${p.age} y · ${p.weight} kg${model.needs.includes('height') ? ` · ${p.height} cm · ${p.sex}` : ''}`;
    const tDec = cfg.mode === 'manual' ? 1 : DRUG_UI[cfg.drug].decimals;
    const targetLabel = cfg.mode === 'manual' ? 'Rate' : cfg.mode === 'effect' ? 'Target Cet' : 'Target Cpt';
    const targetUnit = cfg.mode === 'manual' ? 'mL/h' : drug.targetUnit;

    if (view.type === 'confirm') {
      let induction = null;
      if (cfg.mode !== 'manual' && cfg.target > 0) {
        const pre = previewInduction(buildModel(cfg.modelId, p), cfg.concentration, cfg.mode, cfg.target);
        if (pre) induction = `${pre.dose.toFixed(pre.dose < 10 ? 1 : 0)} ${drug.doseUnit} over ${clock(pre.seconds)}`;
      }
      return { ...base, type: 'confirm', header, sub, patient, progress, syringe: `${cfg.syringeMl} mL syringe`,
        target: `${targetLabel} ${cfg.target.toFixed(tDec)} ${targetUnit}`, induction };
    }

    const inf = this.infusion;
    const [perKgUnit, perKg] = DRUG_UI[cfg.drug].perKg;
    const decLevel = DRUG_UI[cfg.drug].decrement;
    const cDec = Math.max(2, DRUG_UI[cfg.drug].decimals);
    return {
      ...base, type: 'run', header, sub, patient,
      state: this.held ? words.hold : words.running, held: this.held,
      targetLabel, targetUnit, target: cfg.target.toFixed(tDec),
      pending: this.pending ? this.pending.value.toFixed(tDec) : null,
      cp: inf.cp.toFixed(cDec), ce: inf.ce == null ? null : inf.ce.toFixed(cDec), concUnit: drug.targetUnit,
      rate: inf.rateMlH.toFixed(1), perKg: `${perKg(inf.deliveredRate, p.weight).toFixed(2)} ${perKgUnit}`,
      volume: inf.volumeMl.toFixed(1), dose: `${inf.totalDose.toFixed(inf.totalDose < 100 ? 1 : 0)} ${drug.doseUnit}`,
      elapsed: clock(inf.timeS),
      syringeLeft: this.syringeLeft.toFixed(1), syringeFraction: this.syringeLeft / cfg.syringeMl,
      decrement: `Time to ${decLevel}: ${clock(inf.decrementTime(decLevel))}`,
    };
  }
}
