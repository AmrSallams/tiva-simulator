# TIVA Simulator: Drugs, PK Models and TCI Controller

> **For education only. Not for clinical use.** The constants below come from the published papers, but they have not been certified against any pump. Items marked **verify** could not be confirmed against a source.

Source files: `src/engine/models.js`, `src/engine/pk.js`, `src/engine/infusion.js`.

---

## 1. Units

| Quantity | Unit |
|---|---|
| Time | minutes. Rate constants are per minute. The simulation steps in seconds. |
| Volume | litres |
| Clearance | litres per minute |
| Drug amount | the drug's **dose unit**: mg for propofol and ketamine; mcg for remifentanil, sufentanil and dexmedetomidine |
| Concentration | dose unit per litre, which is the same number as the target unit: mg/L = mcg/mL, and mcg/L = ng/mL |
| Infusion rate (engine) | dose units per minute |
| Infusion rate (display) | mL/h = rate ÷ syringe concentration × 60 |

---

## 2. Drugs

| Drug | Target unit | Dose unit | Syringe concentrations (per mL) | Default target | Maximum target | Target step |
|---|---|---|---|---|---|---|
| Propofol | mcg/mL | mg | 10 (1%), 20 (2%) | 4 | 15 | 0.1 |
| Remifentanil | ng/mL | mcg | 20, 40, 50 | 3 | 20 | 0.1 |
| Sufentanil | ng/mL | mcg | 1, 5 | 0.3 | 2 | 0.01 |
| Dexmedetomidine | ng/mL | mcg | 4, 8 | 0.6 | 3 | 0.1 |
| Ketamine | mcg/mL | mg | 10, 50 | 0.2 | 3 | 0.05 |

Display details (`DRUG_UI` in `pump-unit.js`):

| Drug | Label colour | Per-kg rate shown | Decrement time to | Default manual bolus |
|---|---|---|---|---|
| Propofol | yellow `#ffd84d` | mg/kg/h | 1.5 mcg/mL | 20 mg |
| Remifentanil | blue `#6cb6ff` | mcg/kg/min | 1.0 ng/mL | 20 mcg |
| Sufentanil | blue `#6cb6ff` | mcg/kg/h | 0.1 ng/mL | 5 mcg |
| Dexmedetomidine | orange `#ffab66` | mcg/kg/h | 0.2 ng/mL | 10 mcg |
| Ketamine | yellow `#ffd84d` | mg/kg/h | 0.1 mcg/mL | 10 mg |

---

## 3. Body-size formulas

**James lean body mass** (Schnider, Minto):

- Male: LBM = 1.1·W − 128·(W/H)²
- Female: LBM = 1.07·W − 148·(W/H)²

The formula is a parabola. Above its apex weight (male 1.1·H²/256, female 1.07·H²/296) LBM falls as weight rises, which is wrong. The pump refuses such patients with the message "weight is too high for this height: lean body mass cannot be calculated", as real pumps do.

**Al-Sallami fat-free mass** (Eleveld), with H in metres:

- Male: FFM = (0.88 + 0.12 / (1 + (age/13.4)^−12.7)) · 42.92·H²·W / (30.93·H² + W)
- Female: FFM = (1.11 − 0.11 / (1 + (age/7.1)^−1.1)) · 37.99·H²·W / (35.98·H² + W)

---

## 4. Models

W = weight (kg), H = height (cm), A = age (years). Volumes are in L and clearances in L/min. A model given as rate constants is converted with V2 = V1·k12/k21, V3 = V1·k13/k31, CL1 = V1·k10, CL2 = V1·k12 and CL3 = V1·k13.

### 4.1 Propofol

| Model | Parameters | ke0 (/min) | Limits | Inputs |
|---|---|---|---|---|
| **Marsh** | V1 = 0.228·W; k10 0.119, k12 0.112, k13 0.0419, k21 0.055, k31 0.0033 | 0.26 | A 16–100, W 30–150 | W |
| **Marsh (modified, fast ke0)** | as Marsh | 1.2 | as Marsh | W |
| **Schnider** | V1 4.27; V2 18.9 − 0.391·(A−53); V3 238; CL1 1.89 + 0.0456·(W−77) − 0.0681·(LBM−59) + 0.0264·(H−177); CL2 1.29 − 0.024·(A−53); CL3 0.836 | 0.456 | A 16–100, W 30–200, H 130–220 | A, W, H, sex |
| **Eleveld** | see §4.4 | 0.146·(W/70)^−0.25 | A 1–100, W 5–200, H 50–220 | A, W, H, sex |
| **Paedfusor** | V1 = 0.4584·W, k10 = 0.1527·W^−0.3; k12 0.114, k13 0.0419, k21 0.055, k31 0.0033. Ages 13, 14, 15 and ≥16 use V1/kg 0.400, 0.342, 0.284, 0.229 and k10 0.0678, 0.0792, 0.0954, 0.119 (**verify**) | none (plasma only) | A 1–16, W 5–61 | A, W |
| **Kataria** | V1 0.41·W; V2 0.78·W + 3.1·A − 16; V3 6.9·W; CL1 0.035·W; CL2 0.077·W; CL3 0.026·W (**verify**) | none (plasma only) | A 3–11, W 15–61 | A, W |

### 4.2 Opioids, dexmedetomidine and ketamine

| Model | Drug | Parameters | ke0 (/min) | Limits |
|---|---|---|---|---|
| **Minto** | remifentanil | V1 5.1 − 0.0201·(A−40) + 0.072·(LBM−55); V2 9.82 − 0.0811·(A−40) + 0.108·(LBM−55); V3 5.42; CL1 2.6 − 0.0162·(A−40) + 0.0191·(LBM−55); CL2 2.05 − 0.0301·(A−40); CL3 0.076 − 0.00113·(A−40) | 0.595 − 0.007·(A−40) | A 12–100, W 30–200, H 130–220 |
| **Eleveld** | remifentanil | see §4.5 | 1.09·e^(−0.0289·(A−35)) | A 1–100, W 5–200, H 50–220 |
| **Gepts** | sufentanil | V1 14.3; k10 0.0645, k12 0.1086, k13 0.0229, k21 0.0245, k31 0.0013 | 0.112 (**verify**) | A 12–100, W 30–200 |
| **Hannivoort** | dexmedetomidine | V1 1.78·(W/70); V2 30.3·(W/70); V3 52.0·(W/70); CL1 0.686·(W/70)^0.75; CL2 2.98·(V2/30.3)^0.75; CL3 0.602·(V3/52)^0.75 | 0.0428 (Colin 2017 sedation) | A 18–100, W 40–160 |
| **Domino** | ketamine | V1 0.063·W; k10 0.4381, k12 0.5921, k13 0.59, k21 0.247, k31 0.0146 | none (plasma only) | A 18–100, W 40–160 |

### 4.3 References

| Model | Reference |
|---|---|
| Marsh | Marsh B et al., Br J Anaesth 1991;67:41–48 |
| Marsh fast ke0 | Struys MM et al., Anesthesiology 2000;92:399–406 |
| Schnider | Schnider TW et al., Anesthesiology 1998;88:1170–1182 and 1999;90:1502–1516 |
| Eleveld propofol | Eleveld DJ et al., Br J Anaesth 2018;120:942–959 |
| Paedfusor | Absalom A, Kenny G, Br J Anaesth 2005;95:110 |
| Kataria | Kataria BK et al., Anesthesiology 1994;80:104–122 |
| Minto | Minto CF et al., Anesthesiology 1997;86:10–23 |
| Eleveld remifentanil | Eleveld DJ et al., Anesthesiology 2017;126:1005–1018 |
| Gepts | Gepts E et al., Anesthesiology 1995;83:1194–1204 |
| Hannivoort | Hannivoort LN et al., Anesthesiology 2015;123:357–367; ke0 from Colin PJ et al., Br J Anaesth 2017;119:200–210 |
| Domino | Domino EF et al., Clin Pharmacol Ther 1984;36:645–653 |
| Response surface | Bouillon TW et al., Anesthesiology 2004;100:1353–1372 |
| Effect-site TCI algorithm | Shafer SL, Gregg KM, J Pharmacokinet Biopharm 1992;20:147–169 |

### 4.4 Eleveld propofol (arterial, opioids present)

Reference individual: 35 y, 70 kg, 170 cm, male. PMA (post-menstrual age, in weeks) = A·52 + 40. sig(x, E50, γ) = x^γ / (x^γ + E50^γ).

| Parameter | Formula |
|---|---|
| V1 | 6.28 · sig(W, 33.6, 1) / sig(70, 33.6, 1) |
| V2 | 25.5 · (W/70) · e^(−0.0156·(A−35)) |
| V3 | 273 · FFM/FFM_ref · e^(−0.0138·A) |
| CL1 | (male 1.79, female 2.10) · (W/70)^0.75 · sig(PMA, 42.3, 9.06)/sig(PMA_ref, 42.3, 9.06) · e^(−0.00286·A) |
| CL2 | 1.75 · (V2/25.5)^0.75 · (1 + 1.30·(1 − sig(PMA, 68.3, 1))) |
| CL3 | 1.11 · (V3/273)^0.75 · sig(PMA, 68.3, 1)/sig(PMA_ref, 68.3, 1) |

The code uses the exact log-scale constants from the paper's NONMEM file (for example V1 = e^1.83786). The opioid terms (the age effect on V3 and CL1) are on by default, because pumps assume an opioid is given at the same time. `buildModel(id, p, { opioids: false })` turns them off.

### 4.5 Eleveld remifentanil

size = FFM / FFM_ref; maturation = sig(W, 2.88, 2) / sig(70, 2.88, 2). For females only: sexFactor = 1 + 0.47·sig(A, 12, 6)·(1 − sig(A, 45, 6)).

| Parameter | Formula |
|---|---|
| V1 | 5.81 · size · e^(−0.00554·(A−35)) |
| V2 | 8.82 · size · e^(−0.00327·(A−35)) · sexFactor |
| V3 | 5.03 · size · e^(−0.0315·(A−35)) · e^(−0.0260·(W−70)) |
| CL1 | 2.58 · size^0.75 · e^(−0.00327·(A−35)) · sexFactor · maturation |
| CL2 | 1.72 · (V2/8.82)^0.75 · e^(−0.00554·(A−35)) · sexFactor |
| CL3 | 0.124 · (V3/5.03)^0.75 · e^(−0.00554·(A−35)) |

### 4.6 Patient validation (`validatePatient`)

A patient is refused, and the pump shows every reason, when any of these is true:

- A required field is missing. Age is always required.
- Age, weight or height is outside the model's limits.
- The model needs sex and none is given.
- The model uses James LBM and the weight is above the apex weight.
- Any volume or clearance comes out ≤ 0.

---

## 5. Compartment model (`pk.js`)

State `s = [a1, a2, a3, ce]`: the drug amounts in the three compartments, and the effect-site concentration.

```
da1/dt = R − (k10 + k12 + k13)·a1 + k21·a2 + k31·a3
da2/dt = k12·a1 − k21·a2
da3/dt = k13·a1 − k31·a3
dce/dt = ke0·(a1/V1 − ce)
Cp = a1 / V1
```

with k10 = CL1/V1, k12 = CL2/V1, k13 = CL3/V1, k21 = CL2/V2 and k31 = CL3/V3.

**Linear stepper.** The system is linear and the rate R is constant within a step, so a step of length Δt is exactly `s' = A·s + B·R`. `buildStepper(model, Δt)` computes the 4×4 matrix A and the vector B once. It integrates each unit vector, and a unit rate, with RK4 using at least 10 sub-steps (10 per second of Δt). Each simulation step is then a 4×4 multiplication. Steppers are built for Δt = 1 s (pump prediction and patient) and Δt = 10 s (controller look-ahead).

**Time to peak effect** (`timeToPeakEffect`): simulate a unit bolus and find when Ce peaks. `ke0FromTimeToPeak` does the reverse with a log-scale bisection. It is used in tests and is available for models published with a time to peak effect.

---

## 6. TCI controller (`Infusion`)

Each pump has an `Infusion` holding its own prediction of the patient (`state`) for the chosen model and entered patient details.

| Constant | Value |
|---|---|
| Controller interval | 10 s |
| Effect-site look-ahead | 360 intervals (1 h) |
| Maximum pump rate | 1200 mL/h (= 20 mL/min × concentration in dose units per minute) |

### 6.1 Plasma targeting

At the start of each interval:

```
coast = a1 after 10 s with R = 0
R = (Cpt·V1 − coast) / B_10s[0]
R = clamp(R, 0, Rmax)
```

The plasma concentration reaches the target at the end of the interval, or as close as the maximum rate allows. It is then held there. Raising the target gives a fast loading infusion. Lowering it stops the pump until Cp falls to the new target.

### 6.2 Effect-site targeting (Shafer and Gregg)

At the start of each interval:

1. `coast[k]` = Ce at the end of interval k (k = 1 to 360) if nothing more is given.
2. `unit[k]` = Ce at the end of interval k after a unit rate for one interval and then nothing. This is precomputed once.
3. peak(R) = max over k of (coast[k] + R·unit[k]).
4. If peak(0) ≥ target, R = 0. If peak(Rmax) ≤ target, R = Rmax. Otherwise find, by bisection (50 iterations), the largest R with peak(R) ≤ target.

The result is the classic effect-site induction. The pump runs at full rate briefly, Cp overshoots, and Ce rises to the target without exceeding it. The pump then maintains it. Lowering the target stops the pump until Ce falls to the new value.

### 6.3 Manual mode and bolus

- Manual: a fixed rate in mL/h, from 0 to 1200.
- Bolus (manual mode only): the dose is given at the maximum rate, then the manual rate resumes. The pump refuses a bolus during TCI.

### 6.4 Pause, resume and stop

- `pause()` stops delivery but keeps the target. `resume()` recalculates at once.
- `stop()` clears the mode, target, manual rate and any bolus remaining.

### 6.5 Decrement time

The time for the predicted concentration to fall to a set level if the pump stopped now. It uses Ce when the model has a ke0, otherwise Cp. It is found by simulating forward in 10 s steps up to 24 h. The result is 0 if the concentration is already below the level, or "--:--" (Infinity) beyond 24 h.

### 6.6 Induction preview (confirmation screen)

`previewInduction` copies the infusion, runs it from zero, and reports the dose given until the rate first drops below half of its starting rate (at most 15 min). The confirmation screen shows this as "Induction: 112 mg over 0:38".

---

## 7. Reference checks

These values are enforced by `test/engine.test.js`. "±" is the relative tolerance.

| Check | Expected |
|---|---|
| Marsh, 70 kg | V1 15.96 L, V2 32.4 L, V3 202.5 L, k10 0.119, ke0 0.26 |
| Schnider, 40 y, 70 kg, 170 cm, male | V1 4.27, V2 24.0, k10 0.384, k12 0.375, k13 0.196, k21 0.067, k31 0.0035 |
| Minto, 40 y, 80 kg, 180 cm, male; 50 mcg bolus | Cp 8.84 ng/mL at 0 s and 3.88 at 60 s (PyTCI reference trace) |
| Eleveld propofol, reference individual, no opioid | V1 6.28, V2 25.5, V3 273, CL1 1.79, CL2 1.83, CL3 1.11, ke0 0.146 |
| Paedfusor at 16 y | equals Marsh kinetics |
| Time to peak effect | Schnider 1.6 min (±0.1); Marsh with fast ke0 1.6 min; Marsh (ke0 0.26) between 3.5 and 5 min; ke0 for a 1.6 min peak on Marsh kinetics ≈ 1.2 |
| Constant infusion for 30 days | every compartment settles at rate / CL1 |
| One 60 s step | equals sixty 1 s steps (to 1e-7) |
| Marsh plasma TCI 4 mcg/mL, 70 kg | Cp = 4 at 30 s; loading dose between 63.8 and 75 mg; Cp never above 4.02; rate tends to 4 × CL1 |
| Schnider effect-site TCI 4 mcg/mL | Ce reaches 4 within 4 min, never above 4.02; Cp overshoots above 6 |
| Lowering an effect-site target | the pump stops until Ce reaches the new target |
| Every model | holds its default target in plasma mode |
