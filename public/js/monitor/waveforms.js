// Waveform generators (ECG, pleth, arterial, CVP, CO2, EEG) and the sweeping
// trace that draws them. All shapes are synthetic and for teaching only.

const g = (x, mu, sd) => Math.exp(-0.5 * ((x - mu) / sd) ** 2);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export const SAMPLE_HZ = 250;
const PULSE_DELAY = 0.2; // seconds from R wave to the peripheral pulse
const R_TIME = 0.16; // seconds from the start of a beat (P wave) to the R wave

// One heartbeat of lead II; ts is seconds since the beat started.
function ecgBeat(ts, period) {
  if (ts < -0.1 || ts > 1.2) return 0;
  const k = Math.min(1.1, Math.max(0.6, Math.sqrt(period / 0.85))); // QT shortens with rate
  return (
    0.12 * g(ts, 0.06, 0.022) -
    0.08 * g(ts, R_TIME - 0.016, 0.008) +
    1.0 * g(ts, R_TIME, 0.009) -
    0.2 * g(ts, R_TIME + 0.02, 0.009) +
    0.28 * g(ts, R_TIME + 0.24 * k, 0.045 * k)
  );
}

const plethPulse = (p) => (p < -0.5 || p > 2.5 ? 0 : g(p, 0.24, 0.1) + 0.42 * g(p, 0.52, 0.15));
const artPulse = (p) =>
  p < -0.5 || p > 2.5 ? 0 : (g(p, 0.16, 0.07) + 0.38 * g(p, 0.4, 0.09) + 0.25 * g(p, 0.62, 0.18)) / 1.03;
const cvpPulse = (p) =>
  p < -0.5 || p > 2.5 ? 0 : g(p, 0.05, 0.05) + 0.5 * g(p, 0.2, 0.04) + 0.8 * g(p, 0.55, 0.1);

export class Signals {
  /** @param {(key: string) => number} value  reads the current vital-sign values */
  constructor(value) {
    this.value = value;
    this.t = 0;
    this.beat = { start: 0, period: 60 / 72 };
    this.prev = { start: -10, period: 1 };
    this.rFired = false;
    this.inBeat = true;
    this.resp = { start: 0, period: 5, peak: 4.8, active: true };
    this.co2 = 0;
    this.chest = 0;
    this.eegPhase = [0, 0, 0, 0, 0, 0, 0].map(() => Math.random() * 6.28);
    this.eegNoise = 0;
    this.suppressed = false;
    this.suppressUntil = 0;
    this.onBeat = null;
  }

  step(dt) {
    this.t += dt;
    const t = this.t;
    const hr = this.value('hr');

    // --- heart rhythm ---
    if (t - this.beat.start >= this.beat.period) {
      if (hr >= 1) {
        this.prev = this.beat;
        const start = this.inBeat ? this.beat.start + this.beat.period : t;
        this.beat = { start, period: (60 / hr) * (1 + (Math.random() - 0.5) * 0.03) };
        this.rFired = false;
        this.inBeat = true;
      } else {
        this.inBeat = false; // asystole
      }
    }
    if (this.inBeat && !this.rFired && t - this.beat.start >= R_TIME) {
      this.rFired = true;
      this.onBeat?.();
    }
    const a = this.beat;
    const b = this.prev;
    const ecg =
      ecgBeat(t - a.start, a.period) + ecgBeat(t - b.start, b.period) + (Math.random() - 0.5) * 0.015;

    const pa = (t - PULSE_DELAY - a.start) / a.period;
    const pb = (t - PULSE_DELAY - b.start) / b.period;
    const pleth = plethPulse(pa) + plethPulse(pb);
    const sys = this.value('sys');
    const dia = this.value('dia');
    const art = dia + (sys - dia) * Math.min(1.05, artPulse(pa + 0.06) + artPulse(pb + 0.06));

    // --- breathing and capnogram ---
    const rr = this.value('rr');
    if (t - this.resp.start >= this.resp.period) {
      if (rr >= 1) this.resp = { start: t, period: 60 / rr, peak: this.value('etco2'), active: true };
      else this.resp.active = false; // apnoea
    }
    let co2Target = 0;
    let breath = 0; // -1..1, used for respiratory swing
    let chestTarget = 0; // 0..1, chest expansion for the impedance trace
    if (this.resp.active) {
      const q = (t - this.resp.start) / this.resp.period;
      breath = Math.sin(q * 2 * Math.PI);
      chestTarget = q < 0.33 ? smooth(q / 0.33) : 1 - smooth((q - 0.33) / 0.5);
      if (q >= 0.33 && q < 0.95) {
        co2Target = this.resp.peak * (0.9 * smooth((q - 0.33) / 0.07) + 0.1 * ((q - 0.33) / 0.62));
      }
    }
    this.co2 += (co2Target - this.co2) * Math.min(1, dt * 28);
    this.chest += (chestTarget - this.chest) * Math.min(1, dt * 10);

    const cvp = this.value('cvp') - 1.2 + 2.2 * (cvpPulse(pa + 0.25) + cvpPulse(pb + 0.25)) - 1.2 * breath;

    return { ecg, pleth, art, cvp, co2: this.co2, resp: this.chest, eeg: this.#eeg(dt) };
  }

  // EEG that slows and grows as entropy falls, with burst suppression when very deep.
  #eeg(dt) {
    const se = this.value('se');
    const d = Math.min(1, se / 91);
    const freqs = [1.3, 2.6, 4.1, 9.4, 11.2, 19, 27];
    for (let i = 0; i < freqs.length; i++) {
      this.eegPhase[i] += 2 * Math.PI * freqs[i] * dt * (1 + 0.15 * Math.sin(this.t * (0.3 + i * 0.11)));
    }
    const s = this.eegPhase.map(Math.sin);
    const slow = 0.75 * (1 - d) ** 1.1;
    const alpha = 0.35 * Math.exp(-(((d - 0.5) / 0.2) ** 2)) * (0.6 + 0.4 * Math.sin(this.t * 1.7));
    const fast = 0.06 + 0.16 * d;
    this.eegNoise = this.eegNoise * 0.7 + (Math.random() - 0.5) * 0.6;
    let v =
      slow * (0.55 * s[0] + 0.35 * s[1] + 0.25 * s[2]) +
      alpha * (0.6 * s[3] + 0.4 * s[4]) +
      fast * (0.5 * s[5] + 0.5 * s[6] + this.eegNoise);

    if (se < 25) {
      if (this.t >= this.suppressUntil) {
        this.suppressed = !this.suppressed;
        const ratio = (25 - se) / 25; // share of time spent suppressed
        this.suppressUntil =
          this.t + (this.suppressed ? 1 + 6 * ratio * Math.random() + 2 * ratio : 0.8 + 2 * (1 - ratio) * Math.random());
      }
      if (this.suppressed) v *= 0.04;
    } else {
      this.suppressed = false;
    }
    return v;
  }
}

/** A monitor trace that sweeps left to right with an erase bar ahead of it. */
export class Trace {
  constructor(canvas, { color, range, sweepSeconds }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.color = color;
    this.range = range;
    this.sweepSeconds = sweepSeconds;
    this.x = 0;
    this.y = null;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = this.canvas.getBoundingClientRect();
    this.w = Math.max(10, Math.round(width * dpr));
    this.h = Math.max(10, Math.round(height * dpr));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.dpr = dpr;
    this.x = 0;
    this.y = null;
  }

  /** Draw a batch of samples taken at SAMPLE_HZ. */
  draw(samples) {
    const { ctx, w, h, dpr } = this;
    const [lo, hi] = this.range;
    const pad = 4 * dpr;
    const dx = w / (this.sweepSeconds * SAMPLE_HZ);
    const gap = 14 * dpr;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2 * dpr;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (this.y != null) ctx.moveTo(this.x, this.y);
    for (const v of samples) {
      const y = h - pad - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (h - 2 * pad);
      let x = this.x + dx;
      if (x >= w) {
        ctx.stroke();
        ctx.beginPath();
        x = 0;
        ctx.clearRect(0, 0, gap, h);
        ctx.moveTo(x, y);
      } else {
        ctx.clearRect(Math.ceil(x), 0, gap, h);
        if (this.y == null) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      this.x = x;
      this.y = y;
    }
    ctx.stroke();
  }
}
