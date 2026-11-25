// Three-compartment model with an effect site.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
//
// State is [a1, a2, a3, ce]: drug amounts in the three compartments (dose
// units) and the effect-site concentration. Infusion rates are dose units per
// minute. Plasma concentration is a1 / v1.

function derivative(m, s, rate) {
  const ke0 = m.ke0 ?? 0;
  return [
    rate - (m.k10 + m.k12 + m.k13) * s[0] + m.k21 * s[1] + m.k31 * s[2],
    m.k12 * s[0] - m.k21 * s[1],
    m.k13 * s[0] - m.k31 * s[2],
    ke0 * (s[0] / m.v1 - s[3]),
  ];
}

function rk4(m, s, rate, h) {
  const add = (a, b, f) => a.map((x, i) => x + f * b[i]);
  const k1 = derivative(m, s, rate);
  const k2 = derivative(m, add(s, k1, h / 2), rate);
  const k3 = derivative(m, add(s, k2, h / 2), rate);
  const k4 = derivative(m, add(s, k3, h), rate);
  return s.map((x, i) => x + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/**
 * Precomputes the exact-enough linear step for a fixed time step, so that
 * advancing the model is a small matrix multiplication:
 *   next = A * state + B * rate      (rate constant during the step)
 */
export function buildStepper(model, dtSeconds) {
  const sub = Math.max(10, Math.ceil(dtSeconds * 10));
  const h = dtSeconds / 60 / sub;
  const run = (start, rate) => {
    let s = start;
    for (let i = 0; i < sub; i++) s = rk4(model, s, rate, h);
    return s;
  };
  const columns = [0, 1, 2, 3].map((i) => run([0, 0, 0, 0].map((_, j) => (i === j ? 1 : 0)), 0));
  const A = [0, 1, 2, 3].map((row) => columns.map((col) => col[row]));
  const B = run([0, 0, 0, 0], 1);
  return { A, B, dtSeconds };
}

/** Advances a state by one stepper interval at a constant infusion rate. */
export function advance(stepper, state, rate) {
  const { A, B } = stepper;
  const out = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    out[i] =
      A[i][0] * state[0] + A[i][1] * state[1] + A[i][2] * state[2] + A[i][3] * state[3] + B[i] * rate;
  }
  return out;
}

export const emptyState = () => [0, 0, 0, 0];

/** Minutes from an IV bolus to the peak effect-site concentration. */
export function timeToPeakEffect(model) {
  if (model.ke0 == null) return null;
  const stepper = buildStepper(model, 1);
  let s = [1, 0, 0, 0];
  let peak = 0;
  let peakAt = 0;
  for (let t = 1; t <= 4 * 3600; t++) {
    s = advance(stepper, s, 0);
    if (s[3] > peak) {
      peak = s[3];
      peakAt = t;
    } else if (t > peakAt + 60) break;
  }
  return peakAt / 60;
}

/** The ke0 (per minute) that gives the requested time to peak effect (minutes). */
export function ke0FromTimeToPeak(model, tPeakMinutes) {
  let lo = 0.005;
  let hi = 10;
  for (let i = 0; i < 40; i++) {
    const mid = Math.sqrt(lo * hi);
    // A larger ke0 gives an earlier peak.
    if (timeToPeakEffect({ ...model, ke0: mid }) > tPeakMinutes) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}
