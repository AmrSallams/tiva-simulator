// One simulation station: a patient, its pumps, the monitor settings and the
// instructor controls. The server keeps one Station per room code and every
// screen in that room shows the same state.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { PumpUnit, STYLES } from './pump-unit.js';
import { Patient, PRESETS, STIM_LEVELS } from './patient.js';

const DEFAULT_MODULES = ['ecg', 'spo2', 'co2', 'art', 'resp', 'entropy', 'temp', 'nibp'];
const SPEEDS = [1, 2, 5, 10];
const MAX_PUMPS = 4;
const HISTORY_EVERY_S = 15;
const HISTORY_MAX = 480;

const stamp = (s) =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export class Station {
  constructor(id) {
    this.id = id;
    this.styleId = 'generic';
    this.monitorLocked = false;
    this.trendShow = { cp: true, ce: true, rate: true }; // which lines the trend graph draws
    this.modules = [...DEFAULT_MODULES];
    this.reset('adult');
  }

  reset(presetId) {
    this.patient = new Patient(presetId);
    this.simTime = 0;
    this.speed = 1;
    this.paused = false;
    this.overrides = {};
    this.lineConnected = true;
    this.showTrend = false;
    this.log = [];
    this.history = [];
    this.volumeSinceSample = {}; // mL pumped per drug since the last history point
    this.pumps = [];
    this.nextPumpId = 1;
    this.addPump();
    this.addPump();
    this.note(`New case: ${this.patient.preset.name}`);
  }

  note(text) {
    this.log.push({ t: this.simTime, time: stamp(this.simTime), text });
    if (this.log.length > 1000) this.log.shift();
  }

  addPump() {
    if (this.pumps.length >= MAX_PUMPS) return;
    const id = this.nextPumpId++;
    this.pumps.push({ id, unit: new PumpUnit(this.styleId, (text) => this.note(`Pump ${id}: ${text}`)) });
  }

  /** Advance one simulated second. */
  tick() {
    if (this.paused) return;
    this.simTime++;
    const deliveries = [];
    for (const p of this.pumps) {
      p.unit.tick(1);
      const infusion = p.unit.infusion;
      if (infusion) {
        const drug = p.unit.cfg.drug;
        this.volumeSinceSample[drug] = (this.volumeSinceSample[drug] ?? 0) + infusion.rateMlH / 3600;
        deliveries.push({ infusion, drug: p.unit.cfg.drug, rate: this.lineConnected ? infusion.deliveredRate : 0 });
      }
    }
    this.patient.step(deliveries, 1);
    if (this.simTime % HISTORY_EVERY_S === 0) {
      const ce = {};
      const cp = {};
      const rate = {}; // mL/h, averaged over the sample interval
      for (const [drug, level] of Object.entries(this.patient.levels())) {
        ce[drug] = Number(level.ce.toFixed(3));
        cp[drug] = Number(level.cp.toFixed(3));
        rate[drug] = Number((((this.volumeSinceSample[drug] ?? 0) * 3600) / HISTORY_EVERY_S).toFixed(1));
      }
      this.volumeSinceSample = {};
      this.history.push({ t: this.simTime, ce, cp, rate, se: Math.round(this.vitals().se) });
      if (this.history.length > HISTORY_MAX) this.history.shift();
    }
  }

  /** Vital signs as shown on the monitor: the model, unless the instructor has overridden a value. */
  vitals() {
    const out = { ...this.patient.v };
    for (const [key, o] of Object.entries(this.overrides)) {
      const done = o.duration <= 0 ? 1 : Math.min(1, (this.simTime - o.start) / o.duration);
      out[key] = o.from + (o.to - o.from) * done;
    }
    if (out.dia > out.sys - 5) out.dia = Math.max(0, out.sys - 5);
    if (out.re < out.se) out.re = out.se;
    return out;
  }

  /** Everything the screens need. Sent to every screen in the room after each change. */
  state() {
    const levels = this.patient.levels();
    const pt = this.patient;
    return {
      station: this.id,
      simTime: this.simTime,
      clock: stamp(this.simTime),
      speed: this.speed,
      paused: this.paused,
      vitals: this.vitals(),
      modules: this.modules,
      styleId: this.styleId,
      showTrend: this.showTrend,
      monitorLocked: this.monitorLocked,
      trendShow: this.trendShow,
      history: this.history,
      pumps: this.pumps.map((p) => ({
        id: p.id,
        styleId: p.unit.styleId,
        styleName: p.unit.style.name,
        keys: p.unit.style.keys,
        tapToSelect: !!p.unit.style.tapToSelect,
        screen: p.unit.screen(),
        alarmSounding: p.unit.alarmSounding,
        occluded: p.unit.occluded,
        infusing: p.unit.infusion != null,
        drug: p.unit.infusion ? p.unit.cfg.drug : null,
        pumpCe: p.unit.infusion ? p.unit.infusion.ce ?? p.unit.infusion.cp : null,
      })),
      // For the instructor screen only
      instructor: {
        preset: pt.presetId,
        model: pt.v,
        overridden: Object.keys(this.overrides),
        levels,
        stimLevel: Object.keys(STIM_LEVELS).find((k) => STIM_LEVELS[k] === pt.stimLevel) ?? 'none',
        stimNow: Number((pt.stimLevel + pt.stimPulse).toFixed(1)),
        ventilated: pt.ventilated,
        bleeding: pt.bleeding,
        bloodLoss: Math.round(pt.deficit * 100),
        lineConnected: this.lineConnected,
        log: this.log.slice(-80),
      },
    };
  }

  logCsv() {
    return ['time,event', ...this.log.map((e) => `${e.time},"${e.text.replaceAll('"', '""')}"`)].join('\n');
  }

  /** Apply one action from a screen. Throws an Error with a readable message if it is not valid. */
  action(a) {
    const pump = () => {
      const p = this.pumps.find((x) => x.id === a.pump);
      if (!p) throw new Error('No such pump');
      return p;
    };
    const pt = this.patient;
    switch (a.type) {
      // ----- pump screens -----
      case 'pumpKey':
        pump().unit.key(String(a.key));
        break;
      case 'pumpSelect':
        pump().unit.select(Number(a.index));
        break;
      case 'pumpPower': {
        const p = pump();
        if (p.unit.on) {
          if (p.unit.infusion) this.note(`Pump ${p.id}: Pump switched off`);
          p.unit.powerOff();
        } else p.unit.powerOn();
        break;
      }
      case 'addPump':
        this.addPump();
        break;
      case 'removePump': {
        const p = pump();
        if (p.unit.infusion) this.note(`Pump ${p.id}: removed while infusing`);
        this.pumps = this.pumps.filter((x) => x !== p);
        break;
      }
      case 'setStyle':
        if (!STYLES[a.style]) throw new Error('Unknown pump style');
        this.styleId = a.style;
        for (const p of this.pumps) p.unit.setStyle(a.style);
        break;

      // ----- monitor -----
      case 'setModules':
        if (a.from === 'monitor' && this.monitorLocked) throw new Error('The monitor is locked by the instructor');
        if (!Array.isArray(a.modules)) throw new Error('modules must be a list');
        this.modules = a.modules.map(String).slice(0, 20);
        break;
      case 'override': {
        if (a.from === 'monitor' && this.monitorLocked) throw new Error('The monitor is locked by the instructor');
        if (!(a.key in pt.v) || !Number.isFinite(a.value)) throw new Error('Unknown vital sign or value');
        const seconds = Math.max(0, Number(a.seconds) || 0);
        this.overrides[a.key] = { from: this.vitals()[a.key], to: a.value, start: this.simTime, duration: seconds };
        this.note(`${a.from === 'monitor' ? 'Monitor screen' : 'Instructor'} set ${a.key} to ${a.value}${seconds ? ` over ${seconds} s` : ''}`);
        break;
      }
      case 'release':
        if (a.key) delete this.overrides[a.key];
        else this.overrides = {};
        this.note(`Instructor returned ${a.key ?? 'all values'} to automatic`);
        break;

      // ----- instructor: time and case -----
      case 'setSpeed':
        if (!SPEEDS.includes(a.speed)) throw new Error('Unknown speed');
        this.speed = a.speed;
        break;
      case 'setPaused':
        this.paused = !!a.paused;
        this.note(this.paused ? 'Simulation paused' : 'Simulation resumed');
        break;
      case 'reset':
        if (!PRESETS[a.preset]) throw new Error('Unknown patient');
        this.reset(a.preset);
        break;
      case 'lockMonitor':
        this.monitorLocked = !!a.on;
        break;
      case 'trendShow':
        if (!(a.line in this.trendShow)) throw new Error('Unknown graph line');
        this.trendShow[a.line] = !!a.on;
        break;
      case 'showTrend':
        this.showTrend = !!a.on;
        break;

      // ----- instructor: events -----
      case 'event':
        this.#event(a);
        break;
      default:
        throw new Error(`Unknown action: ${a.type}`);
    }
  }

  #event(a) {
    const pt = this.patient;
    switch (a.name) {
      case 'intubation':
        pt.stimPulse = Math.max(pt.stimPulse, 8);
        this.note('Event: laryngoscopy and intubation');
        break;
      case 'incision':
        pt.stimPulse = Math.max(pt.stimPulse, 6);
        if (pt.stimLevel < STIM_LEVELS.moderate) pt.stimLevel = STIM_LEVELS.moderate;
        this.note('Event: skin incision (surgery ongoing)');
        break;
      case 'stim':
        if (!(a.level in STIM_LEVELS)) throw new Error('Unknown stimulation level');
        pt.stimLevel = STIM_LEVELS[a.level];
        this.note(`Surgical stimulation: ${a.level}`);
        break;
      case 'ventilation':
        pt.ventilated = !!a.on;
        this.note(pt.ventilated ? 'Ventilation started' : 'Ventilation stopped (spontaneous breathing)');
        break;
      case 'bleeding':
        pt.bleeding = !!a.on;
        this.note(pt.bleeding ? 'Event: bleeding started' : 'Bleeding controlled');
        break;
      case 'fluid':
        pt.deficit = Math.max(0, pt.deficit - 0.2);
        this.note('Fluid bolus given');
        break;
      case 'pressor':
        pt.pressor = Math.min(1.5, pt.pressor + 1);
        this.note('Vasopressor given');
        break;
      case 'anticholinergic':
        pt.chrono = Math.min(1.5, pt.chrono + 1);
        this.note('Anticholinergic given');
        break;
      case 'line':
        this.lineConnected = !!a.connected;
        this.note(this.lineConnected ? 'IV line reconnected' : 'Event: IV line disconnected (pumps run, no drug reaches patient)');
        break;
      case 'occlusion': {
        const p = this.pumps.find((x) => x.id === a.pump);
        if (!p) throw new Error('No such pump');
        p.unit.setOcclusion(!!a.on);
        this.note(`Pump ${p.id}: ${a.on ? 'Event: line occluded' : 'occlusion cleared'}`);
        break;
      }
      default:
        throw new Error(`Unknown event: ${a.name}`);
    }
  }
}
