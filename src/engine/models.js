// Drug and pharmacokinetic model definitions for the TIVA simulator.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
//
// Units used everywhere in the engine:
//   time        minutes (rate constants are per minute)
//   volume      litres
//   clearance   litres per minute
//   patient     age in years, weight in kg, height in cm, sex 'male' | 'female'
//   amounts     the drug's "dose unit" (mg or mcg), chosen so that
//               dose unit / litre equals the drug's target unit.

/** James lean body mass (kg), as used by the Schnider and Minto models. */
export function lbmJames(weight, height, sex) {
  // The James formula is a parabola in weight. Past its apex it falls, which is
  // physiologically wrong, so the weight is capped at the apex. Pumps refuse
  // such patients; validatePatient() reports it.
  const w = Math.min(weight, lbmJamesApexWeight(height, sex));
  return sex === 'female'
    ? 1.07 * w - 148 * (w / height) ** 2
    : 1.1 * w - 128 * (w / height) ** 2;
}

/** Weight (kg) above which the James formula is no longer valid for this height. */
export function lbmJamesApexWeight(height, sex) {
  return sex === 'female'
    ? (1.07 * height ** 2) / (2 * 148)
    : (1.1 * height ** 2) / (2 * 128);
}

/** Al-Sallami fat-free mass (kg), as used by the Eleveld models. */
export function ffmAlSallami(age, weight, height, sex) {
  const ht2 = (height / 100) ** 2;
  if (sex === 'female') {
    const mat = 1.11 + (1 - 1.11) / (1 + (age / 7.1) ** -1.1);
    return (mat * 37.99 * ht2 * weight) / (35.98 * ht2 + weight);
  }
  const mat = 0.88 + (1 - 0.88) / (1 + (age / 13.4) ** -12.7);
  return (mat * 42.92 * ht2 * weight) / (30.93 * ht2 + weight);
}

export const DRUGS = {
  propofol: {
    name: 'Propofol',
    targetUnit: 'mcg/mL',
    doseUnit: 'mg',
    concentrations: [10, 20], // dose unit per mL (1% and 2%)
    defaultTarget: 4,
    maxTarget: 15,
  },
  remifentanil: {
    name: 'Remifentanil',
    targetUnit: 'ng/mL',
    doseUnit: 'mcg',
    concentrations: [20, 40, 50],
    defaultTarget: 3,
    maxTarget: 20,
  },
  sufentanil: {
    name: 'Sufentanil',
    targetUnit: 'ng/mL',
    doseUnit: 'mcg',
    concentrations: [1, 5],
    defaultTarget: 0.3,
    maxTarget: 2,
  },
  dexmedetomidine: {
    name: 'Dexmedetomidine',
    targetUnit: 'ng/mL',
    doseUnit: 'mcg',
    concentrations: [4, 8],
    defaultTarget: 0.6,
    maxTarget: 3,
  },
  ketamine: {
    name: 'Ketamine',
    targetUnit: 'mcg/mL',
    doseUnit: 'mg',
    concentrations: [10, 50],
    defaultTarget: 0.2,
    maxTarget: 3,
  },
};

// Builds volumes and clearances from V1 (litres) and rate constants (per minute).
function fromRateConstants(v1, k10, k12, k13, k21, k31) {
  return {
    v1,
    v2: (v1 * k12) / k21,
    v3: (v1 * k13) / k31,
    cl1: v1 * k10,
    cl2: v1 * k12,
    cl3: v1 * k13,
  };
}

const sigmoid = (x, e50, gamma) => x ** gamma / (x ** gamma + e50 ** gamma);

function marshParams(p) {
  return fromRateConstants(0.228 * p.weight, 0.119, 0.112, 0.0419, 0.055, 0.0033);
}

function eleveldPropofol(p, opts = {}) {
  // Eleveld DJ et al., Br J Anaesth 2018;120:942-959. Arterial model.
  // Constants are the log-scale estimates from the paper's NONMEM control file.
  const opioids = opts.opioids !== false; // pumps assume an opioid is co-administered
  const { age, weight, height, sex } = p;
  const v1Ref = Math.exp(1.83786); // 6.28 L
  const v2Ref = Math.exp(3.23873); // 25.5 L
  const v3Ref = Math.exp(5.6088); // 273 L
  const clRef = sex === 'female' ? Math.exp(0.742043) : Math.exp(0.581983); // 2.10 / 1.79
  const q2Ref = Math.exp(0.559672); // 1.75
  const q3Ref = Math.exp(0.103046); // 1.11
  const clMatE50 = Math.exp(3.74422); // 42.3 weeks
  const clMatSlope = Math.exp(2.2033); // 9.06
  const v1E50 = Math.exp(3.51313); // 33.6 kg
  const q3MatE50 = Math.exp(4.22357); // 68.3 weeks

  const ffmRatio = ffmAlSallami(age, weight, height, sex) / ffmAlSallami(35, 70, 170, 'male');
  const pmaWeeks = age * 52 + 40;
  const pmaRef = 35 * 52 + 40;
  const clMat = sigmoid(pmaWeeks, clMatE50, clMatSlope) / sigmoid(pmaRef, clMatE50, clMatSlope);
  const q3Mat = sigmoid(pmaWeeks, q3MatE50, 1);
  const q3MatRef = sigmoid(pmaRef, q3MatE50, 1);

  const v1 = (v1Ref * sigmoid(weight, v1E50, 1)) / sigmoid(70, v1E50, 1);
  const v2 = v2Ref * (weight / 70) * Math.exp(-0.015633 * (age - 35));
  const v3 = v3Ref * ffmRatio * (opioids ? Math.exp(-0.0138166 * age) : 1);
  const cl1 =
    clRef * (weight / 70) ** 0.75 * clMat * (opioids ? Math.exp(-0.00285709 * age) : 1);
  const cl2 = q2Ref * (v2 / v2Ref) ** 0.75 * (1 + Math.exp(0.265642) * (1 - q3Mat));
  const cl3 = q3Ref * (v3 / v3Ref) ** 0.75 * (q3Mat / q3MatRef);
  return { v1, v2, v3, cl1, cl2, cl3, ke0: 0.146 * (weight / 70) ** -0.25 };
}

function eleveldRemifentanil(p) {
  // Eleveld DJ et al., Anesthesiology 2017;126:1005-1018.
  const { age, weight, height, sex } = p;
  const v1Ref = Math.exp(1.75911); // 5.81
  const v2Ref = Math.exp(2.17717); // 8.82
  const v3Ref = Math.exp(1.61445); // 5.03
  const clRef = Math.exp(0.946257); // 2.58
  const q2Ref = Math.exp(0.540315); // 1.72
  const q3Ref = Math.exp(-2.08388); // 0.124

  const size = ffmAlSallami(age, weight, height, sex) / ffmAlSallami(35, 70, 170, 'male');
  const maturation = sigmoid(weight, 2.87898, 2) / sigmoid(70, 2.87898, 2);
  const ageV1 = Math.exp(-0.00554481 * (age - 35)); // V1, Q2, Q3
  const ageV2 = Math.exp(-0.00326985 * (age - 35)); // V2, CL
  const ageV3 = Math.exp(-0.0315135 * (age - 35));
  const sexFactor =
    sex === 'female' ? 1 + 0.470405 * sigmoid(age, 12, 6) * (1 - sigmoid(age, 45, 6)) : 1;

  const v1 = v1Ref * size * ageV1;
  const v2 = v2Ref * size * ageV2 * sexFactor;
  const v3 = v3Ref * size * ageV3 * Math.exp(-0.0260496 * (weight - 70));
  const cl1 = clRef * size ** 0.75 * ageV2 * sexFactor * maturation;
  const cl2 = q2Ref * (v2 / v2Ref) ** 0.75 * ageV1 * sexFactor;
  const cl3 = q3Ref * (v3 / v3Ref) ** 0.75 * ageV1;
  return { v1, v2, v3, cl1, cl2, cl3, ke0: 1.09 * Math.exp(-0.0289 * (age - 35)) };
}

function paedfusor(p) {
  // Absalom A, Kenny G. Br J Anaesth 2005;95:110. Ages 13 to 16 step towards Marsh.
  const { age, weight } = p;
  let v1PerKg = 0.4584;
  let k10 = 0.1527 * weight ** -0.3;
  if (age >= 16) [v1PerKg, k10] = [0.229, 0.119];
  else if (age >= 15) [v1PerKg, k10] = [0.284, 0.0954];
  else if (age >= 14) [v1PerKg, k10] = [0.342, 0.0792];
  else if (age >= 13) [v1PerKg, k10] = [0.4, 0.0678];
  return fromRateConstants(v1PerKg * weight, k10, 0.114, 0.0419, 0.055, 0.0033);
}

// Each model: which drug it belongs to, patient limits, whether effect-site
// targeting is offered, and a function returning volumes, clearances and ke0.
export const MODELS = {
  marsh: {
    drug: 'propofol',
    name: 'Marsh',
    reference: 'Marsh B et al., Br J Anaesth 1991;67:41-48 (Diprifusor, ke0 0.26/min)',
    needs: ['weight'],
    limits: { age: [16, 100], weight: [30, 150] },
    params: (p) => ({ ...marshParams(p), ke0: 0.26 }),
  },
  marshModified: {
    drug: 'propofol',
    name: 'Marsh (modified, fast ke0)',
    reference: 'Marsh kinetics with ke0 1.2/min (Struys MM et al., Anesthesiology 2000;92:399-406)',
    needs: ['weight'],
    limits: { age: [16, 100], weight: [30, 150] },
    params: (p) => ({ ...marshParams(p), ke0: 1.2 }),
  },
  schnider: {
    drug: 'propofol',
    name: 'Schnider',
    reference: 'Schnider TW et al., Anesthesiology 1998;88:1170-1182 and 1999;90:1502-1516',
    needs: ['age', 'weight', 'height', 'sex'],
    usesJamesLbm: true,
    limits: { age: [16, 100], weight: [30, 200], height: [130, 220] },
    params: (p) => {
      const lbm = lbmJames(p.weight, p.height, p.sex);
      return {
        v1: 4.27,
        v2: 18.9 - 0.391 * (p.age - 53),
        v3: 238,
        cl1: 1.89 + 0.0456 * (p.weight - 77) - 0.0681 * (lbm - 59) + 0.0264 * (p.height - 177),
        cl2: 1.29 - 0.024 * (p.age - 53),
        cl3: 0.836,
        ke0: 0.456,
      };
    },
  },
  eleveldPropofol: {
    drug: 'propofol',
    name: 'Eleveld',
    reference: 'Eleveld DJ et al., Br J Anaesth 2018;120:942-959',
    needs: ['age', 'weight', 'height', 'sex'],
    limits: { age: [1, 100], weight: [5, 200], height: [50, 220] },
    params: eleveldPropofol,
  },
  paedfusor: {
    drug: 'propofol',
    name: 'Paedfusor',
    reference: 'Absalom A, Kenny G. Br J Anaesth 2005;95:110',
    needs: ['age', 'weight'],
    limits: { age: [1, 16], weight: [5, 61] },
    plasmaOnly: true,
    params: (p) => ({ ...paedfusor(p), ke0: null }),
  },
  kataria: {
    drug: 'propofol',
    name: 'Kataria',
    // Kataria published several parameter sets. This is the weight-and-age set
    // used by STANPUMP and commercial pumps; confirm against the pump manual.
    reference: 'Kataria BK et al., Anesthesiology 1994;80:104-122',
    needs: ['age', 'weight'],
    limits: { age: [3, 11], weight: [15, 61] },
    plasmaOnly: true,
    params: (p) => ({
      v1: 0.41 * p.weight,
      v2: 0.78 * p.weight + 3.1 * p.age - 16,
      v3: 6.9 * p.weight,
      cl1: 0.035 * p.weight,
      cl2: 0.077 * p.weight,
      cl3: 0.026 * p.weight,
      ke0: null,
    }),
  },
  minto: {
    drug: 'remifentanil',
    name: 'Minto',
    reference: 'Minto CF et al., Anesthesiology 1997;86:10-23',
    needs: ['age', 'weight', 'height', 'sex'],
    usesJamesLbm: true,
    limits: { age: [12, 100], weight: [30, 200], height: [130, 220] },
    params: (p) => {
      const lbm = lbmJames(p.weight, p.height, p.sex);
      return {
        v1: 5.1 - 0.0201 * (p.age - 40) + 0.072 * (lbm - 55),
        v2: 9.82 - 0.0811 * (p.age - 40) + 0.108 * (lbm - 55),
        v3: 5.42,
        cl1: 2.6 - 0.0162 * (p.age - 40) + 0.0191 * (lbm - 55),
        cl2: 2.05 - 0.0301 * (p.age - 40),
        cl3: 0.076 - 0.00113 * (p.age - 40),
        ke0: 0.595 - 0.007 * (p.age - 40),
      };
    },
  },
  eleveldRemifentanil: {
    drug: 'remifentanil',
    name: 'Eleveld',
    reference: 'Eleveld DJ et al., Anesthesiology 2017;126:1005-1018',
    needs: ['age', 'weight', 'height', 'sex'],
    limits: { age: [1, 100], weight: [5, 200], height: [50, 220] },
    params: eleveldRemifentanil,
  },
  gepts: {
    drug: 'sufentanil',
    name: 'Gepts',
    reference: 'Gepts E et al., Anesthesiology 1995;83:1194-1204 (ke0 0.112/min)',
    needs: [],
    limits: { age: [12, 100], weight: [30, 200] },
    params: () => ({
      ...fromRateConstants(14.3, 0.0645, 0.1086, 0.0229, 0.0245, 0.0013),
      ke0: 0.112,
    }),
  },
  hannivoort: {
    drug: 'dexmedetomidine',
    name: 'Hannivoort',
    // ke0 is the sedation (MOAA/S) value from Colin PJ et al., Br J Anaesth 2017;119:200-210.
    reference: 'Hannivoort LN et al., Anesthesiology 2015;123:357-367',
    needs: ['weight'],
    limits: { age: [18, 100], weight: [40, 160] },
    params: (p) => {
      const v2 = 30.3 * (p.weight / 70);
      const v3 = 52.0 * (p.weight / 70);
      return {
        v1: 1.78 * (p.weight / 70),
        v2,
        v3,
        cl1: 0.686 * (p.weight / 70) ** 0.75,
        cl2: 2.98 * (v2 / 30.3) ** 0.75,
        cl3: 0.602 * (v3 / 52.0) ** 0.75,
        ke0: 0.0428,
      };
    },
  },
  domino: {
    drug: 'ketamine',
    name: 'Domino',
    reference: 'Domino EF et al., Clin Pharmacol Ther 1984;36:645-653',
    needs: ['weight'],
    limits: { age: [18, 100], weight: [40, 160] },
    plasmaOnly: true,
    params: (p) => ({
      ...fromRateConstants(0.063 * p.weight, 0.4381, 0.5921, 0.59, 0.247, 0.0146),
      ke0: null,
    }),
  },
};

/** Model ids available for a drug, e.g. modelsForDrug('propofol'). */
export function modelsForDrug(drug) {
  return Object.keys(MODELS).filter((id) => MODELS[id].drug === drug);
}

/**
 * Reasons this patient cannot be used with this model, as a pump would report
 * them. Returns an empty array when the patient is acceptable.
 */
export function validatePatient(modelId, patient) {
  const def = MODELS[modelId];
  if (!def) return [`Unknown model: ${modelId}`];
  const errors = [];
  for (const field of ['age', 'weight', 'height']) {
    const range = def.limits[field];
    if (!range) continue;
    const value = patient[field];
    const required = def.needs.includes(field) || field === 'age';
    if (value == null || Number.isNaN(value)) {
      if (required) errors.push(`${field} is required`);
      continue;
    }
    if (value < range[0] || value > range[1]) {
      errors.push(`${field} ${value} is outside the ${def.name} range ${range[0]} to ${range[1]}`);
    }
  }
  if (def.needs.includes('sex') && patient.sex !== 'male' && patient.sex !== 'female') {
    errors.push('sex is required');
  }
  if (def.usesJamesLbm && errors.length === 0) {
    if (patient.weight > lbmJamesApexWeight(patient.height, patient.sex)) {
      errors.push('weight is too high for this height: lean body mass cannot be calculated');
    }
  }
  if (errors.length === 0) {
    const m = def.params(patient);
    if ([m.v1, m.v2, m.v3, m.cl1, m.cl2, m.cl3].some((x) => !(x > 0))) {
      errors.push(`${def.name} gives invalid parameters for this patient`);
    }
  }
  return errors;
}

/**
 * Builds the model for one patient: volumes, clearances, rate constants and ke0.
 * Throws if the patient is outside the model's limits.
 */
export function buildModel(modelId, patient, options = {}) {
  const errors = validatePatient(modelId, patient);
  if (errors.length) throw new Error(errors.join('; '));
  const def = MODELS[modelId];
  const m = def.params(patient, options);
  return {
    id: modelId,
    drug: def.drug,
    name: def.name,
    ...m,
    k10: m.cl1 / m.v1,
    k12: m.cl2 / m.v1,
    k13: m.cl3 / m.v1,
    k21: m.cl2 / m.v2,
    k31: m.cl3 / m.v3,
    effectSiteTargeting: m.ke0 != null && !def.plasmaOnly,
  };
}
