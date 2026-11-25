// One syringe pump channel: the pump's own prediction of the patient plus the
// controller that decides the infusion rate.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
//
// The concentrations here are what the PUMP believes (its display values). The
// simulated patient is a separate model fed with `deliveredRate`, so that a
// disconnected line or a sensitive patient can differ from the pump's display.

import { buildStepper, advance, emptyState } from './pk.js';

const CONTROL_INTERVAL_S = 10; // the controller recalculates the rate this often
const EFFECT_HORIZON_STEPS = 360; // look-ahead for effect-site targeting (1 hour)

export const MODES = { OFF: 'off', PLASMA: 'plasma', EFFECT: 'effect', MANUAL: 'manual' };

export class Infusion {
  /**
   * @param {object} opts
   * @param {object} opts.model          from buildModel()
   * @param {number} opts.concentration  syringe concentration, dose units per mL
   * @param {number} [opts.maxRateMlH]   fastest the pump can run (default 1200 mL/h)
   */
  constructor({ model, concentration, maxRateMlH = 1200 }) {
    if (!(concentration > 0)) throw new Error('concentration must be positive');
    this.model = model;
    this.concentration = concentration;
    this.maxRateMlH = maxRateMlH;
    this.second = buildStepper(model, 1);
    this.interval = buildStepper(model, CONTROL_INTERVAL_S);

    // Effect-site response to one control interval at unit rate, then nothing.
    this.unitEffect = [];
    let s = advance(this.interval, emptyState(), 1);
    for (let k = 1; k <= EFFECT_HORIZON_STEPS; k++) {
      this.unitEffect.push(s[3]);
      s = advance(this.interval, s, 0);
    }

    this.state = emptyState();
    this.timeS = 0;
    this.mode = MODES.OFF;
    this.target = 0;
    this.manualRate = 0; // dose units per minute
    this.bolusRemaining = 0; // dose units
    this.paused = false;
    this.controlRate = 0;
    this.deliveredRate = 0; // dose units per minute during the last second
    this.totalDose = 0;
    this.untilControl = 0;
  }

  get maxRate() {
    return (this.maxRateMlH / 60) * this.concentration; // dose units per minute
  }
  get cp() {
    return this.state[0] / this.model.v1;
  }
  get ce() {
    return this.model.ke0 == null ? null : this.state[3];
  }
  get rateMlH() {
    return (this.deliveredRate / this.concentration) * 60;
  }
  get volumeMl() {
    return this.totalDose / this.concentration;
  }

  /** Start or change a target-controlled infusion. mode is 'plasma' or 'effect'. */
  setTarget(mode, target) {
    if (mode !== MODES.PLASMA && mode !== MODES.EFFECT) throw new Error(`Unknown TCI mode: ${mode}`);
    if (mode === MODES.EFFECT && !this.model.effectSiteTargeting) {
      throw new Error(`${this.model.name} does not support effect-site targeting`);
    }
    if (!(target >= 0)) throw new Error('target must be zero or more');
    this.mode = mode;
    this.target = target;
    this.bolusRemaining = 0;
    this.untilControl = 0; // recalculate immediately
  }

  /** Run at a fixed rate in mL/h (manual mode). */
  setManualRateMlH(mlH) {
    if (!(mlH >= 0) || mlH > this.maxRateMlH) throw new Error('rate is outside the pump range');
    this.mode = MODES.MANUAL;
    this.manualRate = (mlH / 60) * this.concentration;
  }

  /** Give a bolus (dose units) at the pump's maximum rate. Manual mode only. */
  bolus(dose) {
    if (this.mode === MODES.PLASMA || this.mode === MODES.EFFECT) {
      throw new Error('bolus is not available during TCI; raise the target instead');
    }
    if (!(dose > 0)) throw new Error('bolus dose must be positive');
    if (this.mode === MODES.OFF) this.mode = MODES.MANUAL;
    this.bolusRemaining += dose;
  }

  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    this.untilControl = 0;
  }
  stop() {
    this.mode = MODES.OFF;
    this.target = 0;
    this.manualRate = 0;
    this.bolusRemaining = 0;
  }

  /** Advance the pump by whole seconds of simulated time. */
  tick(seconds = 1) {
    for (let i = 0; i < seconds; i++) {
      let rate = 0;
      if (!this.paused) {
        if (this.mode === MODES.PLASMA || this.mode === MODES.EFFECT) {
          if (this.untilControl <= 0) {
            this.controlRate =
              this.mode === MODES.PLASMA ? this.#plasmaRate() : this.#effectRate();
            this.untilControl = CONTROL_INTERVAL_S;
          }
          this.untilControl--;
          rate = this.controlRate;
        } else if (this.mode === MODES.MANUAL) {
          if (this.bolusRemaining > 0) {
            rate = Math.min(this.maxRate, this.bolusRemaining * 60);
            this.bolusRemaining = Math.max(0, this.bolusRemaining - rate / 60);
          } else {
            rate = this.manualRate;
          }
        }
      }
      this.state = advance(this.second, this.state, rate);
      this.deliveredRate = rate;
      this.totalDose += rate / 60;
      this.timeS++;
    }
  }

  // Rate that brings the plasma concentration to target at the end of the interval.
  #plasmaRate() {
    const coasting = advance(this.interval, this.state, 0)[0];
    const rate = (this.target * this.model.v1 - coasting) / this.interval.B[0];
    return Math.min(this.maxRate, Math.max(0, rate));
  }

  // Shafer and Gregg's method: the largest rate for this interval whose
  // effect-site peak, with nothing given afterwards, does not exceed target.
  #effectRate() {
    const coasting = [];
    let s = advance(this.interval, this.state, 0);
    for (let k = 0; k < EFFECT_HORIZON_STEPS; k++) {
      coasting.push(s[3]);
      s = advance(this.interval, s, 0);
    }
    const peak = (rate) => {
      let max = -Infinity;
      for (let k = 0; k < EFFECT_HORIZON_STEPS; k++) {
        const v = coasting[k] + rate * this.unitEffect[k];
        if (v > max) max = v;
      }
      return max;
    };
    if (peak(0) >= this.target) return 0;
    if (peak(this.maxRate) <= this.target) return this.maxRate;
    let lo = 0;
    let hi = this.maxRate;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (peak(mid) > this.target) hi = mid;
      else lo = mid;
    }
    return lo;
  }

  /**
   * Seconds until the concentration falls to `level` if the infusion stopped
   * now (the pump's "decrement time"). Uses the effect site when the model has
   * one, otherwise plasma. Returns 0 if already below, Infinity if over 24 hours.
   */
  decrementTime(level) {
    const index = this.model.ke0 == null ? 0 : 3;
    const scale = index === 0 ? 1 / this.model.v1 : 1;
    let s = this.state;
    if (s[index] * scale <= level) return 0;
    for (let t = CONTROL_INTERVAL_S; t <= 24 * 3600; t += CONTROL_INTERVAL_S) {
      s = advance(this.interval, s, 0);
      // During the first minutes the effect site may still be rising.
      if (s[index] * scale <= level) return t;
    }
    return Infinity;
  }

  /** Display values for the pump screen. */
  snapshot() {
    return {
      timeS: this.timeS,
      mode: this.mode,
      paused: this.paused,
      target: this.target,
      cp: this.cp,
      ce: this.ce,
      rate: this.deliveredRate,
      rateMlH: this.rateMlH,
      volumeMl: this.volumeMl,
      totalDose: this.totalDose,
    };
  }
}
