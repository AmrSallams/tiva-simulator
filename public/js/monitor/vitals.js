// Vital-sign values shown on the monitor. Each value moves gradually towards
// its target so that changes look physiological rather than jumping.

export const PARAMS = {
  hr: { label: 'Heart rate', unit: '/min', min: 0, max: 250, step: 1, value: 72, low: 50, high: 120, jitter: 1 },
  spo2: { label: 'SpO2', unit: '%', min: 40, max: 100, step: 1, value: 99, low: 92, high: null, jitter: 0 },
  sys: { label: 'Systolic BP', unit: 'mmHg', min: 0, max: 300, step: 1, value: 122, low: 90, high: 160, jitter: 1.5 },
  dia: { label: 'Diastolic BP', unit: 'mmHg', min: 0, max: 200, step: 1, value: 76, low: null, high: null, jitter: 1 },
  etco2: { label: 'EtCO2', unit: 'kPa', min: 0, max: 12, step: 0.1, decimals: 1, value: 4.8, low: 3.5, high: 6.5, jitter: 0.05 },
  rr: { label: 'Resp rate', unit: '/min', min: 0, max: 60, step: 1, value: 12, low: 8, high: 30, jitter: 0 },
  temp: { label: 'Temperature', unit: '°C', min: 30, max: 42, step: 0.1, decimals: 1, value: 36.6, low: 35.5, high: 38, jitter: 0 },
  se: { label: 'State entropy (SE)', unit: '', min: 0, max: 91, step: 1, value: 88, low: null, high: null, jitter: 1 },
  re: { label: 'Response entropy (RE)', unit: '', min: 0, max: 100, step: 1, value: 97, low: null, high: null, jitter: 1 },
  cvp: { label: 'CVP', unit: 'mmHg', min: 0, max: 30, step: 1, value: 8, low: null, high: null, jitter: 0.5 },
  tofCount: { label: 'TOF count', unit: '', min: 0, max: 4, step: 1, value: 4, low: null, high: null, jitter: 0 },
  tofRatio: { label: 'TOF ratio', unit: '%', min: 0, max: 100, step: 5, value: 100, low: null, high: null, jitter: 0 },
};

/** Typical gap between response and state entropy at a given SE. */
export const entropyGap = (se) => Math.round(2 + 7 * (se / 91) ** 2);

export class Vitals {
  constructor() {
    this.p = {};
    for (const [key, def] of Object.entries(PARAMS)) {
      this.p[key] = { cur: def.value, target: def.value, rate: 0, noise: 0, low: def.low, high: def.high };
    }
  }

  /** Move a value to `value`, taking `seconds` to get there (0 = at once). */
  set(key, value, seconds = 0) {
    const def = PARAMS[key];
    const p = this.p[key];
    p.target = Math.min(def.max, Math.max(def.min, value));
    if (seconds <= 0) p.cur = p.target;
    else p.rate = Math.abs(p.target - p.cur) / seconds;
  }

  setLimits(key, low, high) {
    this.p[key].low = low;
    this.p[key].high = high;
  }

  /** Smooth underlying value (drives the waveforms). */
  now(key) {
    return this.p[key].cur;
  }

  target(key) {
    return this.p[key].target;
  }

  /** Value as displayed: includes a little beat-to-beat variation. */
  shown(key) {
    const def = PARAMS[key];
    const p = this.p[key];
    const raw = p.cur <= def.min ? def.min : p.cur + p.noise;
    const v = Math.min(def.max, Math.max(def.min, raw));
    const f = 10 ** (def.decimals ?? 0);
    return Math.round(v * f) / f;
  }

  update(dt) {
    for (const p of Object.values(this.p)) {
      if (p.cur !== p.target) {
        const stepSize = p.rate * dt;
        if (Math.abs(p.target - p.cur) <= stepSize) p.cur = p.target;
        else p.cur += Math.sign(p.target - p.cur) * stepSize;
      }
    }
  }

  /** Called once a second: refreshes the small random variation. */
  wobble() {
    for (const [key, p] of Object.entries(this.p)) {
      const j = PARAMS[key].jitter;
      p.noise = j ? p.noise * 0.6 + (Math.random() - 0.5) * 2 * j * 0.8 : 0;
    }
  }
}
