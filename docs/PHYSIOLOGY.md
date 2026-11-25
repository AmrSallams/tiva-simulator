# TIVA Simulator: Patient Model, Events and Monitor

> **For education only. Not for clinical use.** The drug kinetics use published models. The patient's **response** (blood pressure, heart rate, breathing, saturation) is a simplified teaching model. Its directions and sizes are plausible, but it is not a validated physiological model.

Source: `src/sim/patient.js`, `src/sim/station.js`, `public/js/monitor/*`.

---

## 1. Overview

```
pump deliveredRate ──(× 0 if line disconnected)──► patient drug stores (one per pump)
                                                         │ Ce per drug
                                                         ▼
     stimulation, events ──────────► hypnosis, analgesia, stimulation
                                                         │
                                 ┌───────────────────────┼─────────────────────┐
                                 ▼                       ▼                     ▼
                             Entropy             circulation (BP, HR)     breathing (RR, SpO2, CO2)
                                 │                       │                     │
                                 └─────── first-order lags ───────────────────┘
                                                         ▼
                                         patient.v  ──► overrides ──► monitor
```

`Patient.step(deliveries, dt = 1)` runs once per simulated second.

---

## 2. Drug kinetics inside the patient

- Each infusion has its own drug store in the patient (`lines`). It uses the same model and patient details as the pump that gives it, so if nothing goes wrong the patient matches the pump display exactly.
- The store receives the **delivered** rate, or 0 while the IV line is disconnected. It keeps running after the pump stops or is removed, so the drug washes out naturally.
- `levels()` adds Cp and Ce for each drug across all its stores. For plasma-only models, Ce = Cp.

**Teaching consequence.** If a trainee enters the wrong weight, both the pump and the patient follow that wrong model. Use the preset's real details when teaching about model choice. A future improvement could drive the patient from the preset's true details with a fixed reference model.

---

## 3. Drug effects

Each drug's Ce, scaled by the preset's sensitivity:

```
prop    = Ce_propofol × hypnoticSens                (mcg/mL)
opioid  = Ce_remifentanil + 12 × Ce_sufentanil      (remifentanil-equivalent ng/mL)
dex     = Ce_dexmedetomidine                        (ng/mL)
ket     = Ce_ketamine                               (mcg/mL)
```

### 3.1 Hypnosis (Bouillon response surface, additive)

```
U   = prop/4.47 + opioid/19.3 + dex/2.5
hyp = U^1.43 / (1 + U^1.43)                    0 = awake, 1 = very deep
analgesia = sat(opioid + 3·ket, 3)             sat(x, h) = x / (x + h)
```

### 3.2 Stimulation

```
stimPulse decays with τ = 120 s                 (intubation 8, incision 6)
stim = min(10, stimLevel + stimPulse) × (1 − analgesia) × (1 − 0.4·hyp)
```

Sustained levels: none 0, light 2, moderate 4, strong 7. Incision raises the sustained level to at least moderate.

### 3.3 Entropy

```
SE target = min(91, 91·(1 − hyp) + 3·stim + 8·sat(ket, 0.5)·hyp)
RE target = min(100, SE + 2 + 7·(SE/91)² + 1.2·stim)
SE lag τ = 8 s, RE lag τ = 6 s, RE ≥ SE
```

Ketamine keeps the entropy higher than its hypnotic depth would suggest. A fit adult with propofol Ce 4 and remifentanil Ce 3 settles at an SE of about 45.

### 3.4 Circulation

```
x     = (prop / 4.5)^1.5
drop  = min(0.7, hypotensionSens × (0.4·x/(1+x) + 0.15·sat(opioid, 5) + 0.15·sat(dex, 1)))
SYS*  = baseSys × (1 − drop) × (1 + 0.035·stim) × (1 − 0.5·deficit) × (1 + 0.3·pressor) × (1 + 0.15·sat(ket, 1))
HR*   = baseHR × (1 − 0.22·sat(opioid, 6)) × (1 − 0.25·sat(dex, 1.2)) × (1 − 0.08·hyp) × (1 + 0.04·stim)
              × (1 + 0.7·deficit) × (1 + 0.35·chrono) × (1 + 0.15·sat(ket, 1))
if SpO2 < 70:  HR* × (0.6 + 0.4·max(0, (SpO2 − 40)/30))       severe hypoxia slows the heart
SYS lag τ = 25 s; DIA = baseDia × (SYS/baseSys)^0.9; HR lag τ = 12 s
CVP → 8 × (1 − deficit), τ = 60 s
```

| Event state | Behaviour |
|---|---|
| `deficit` (blood volume lost) | +1/600 per second while bleeding (10% per minute), up to 0.8; a fluid bolus subtracts 0.2 |
| `pressor` | +1 per dose (up to 1.5), decays with τ = 240 s |
| `chrono` (anticholinergic) | +1 per dose (up to 1.5), decays with τ = 300 s |

### 3.5 Breathing and oxygenation

```
depress = (opioid/1.5)·(1 + prop/3) + prop/8 + dex/20
effort  = 1 − depress^2.5/(1 + depress^2.5) × (1 − 0.03·stim)
RR_spont = baseRR × effort;  below 4 → 0 (apnoea)
RR = ventilated ? ventRate : RR_spont      (lag τ = 8 s; apnoea is immediate)
```

**Apnoea:**

- The apnoea time counts up. The safe time is the preset's `safeApnoea` if the patient was preoxygenated, otherwise a quarter of it. A patient counts as preoxygenated at the start of a case, and again after 60 s of ventilation.
- After the safe time, SpO2 falls by min(0.6, 0.05 + 0.004 × seconds past the safe time) per second, down to 40%.
- PaCO2 rises by 0.45 kPa per minute, up to 11. EtCO2 shows 0.

**Breathing or ventilated:**

- SpO2 target: ventilated max(baseline, 99); spontaneous baseline − 7 × (1 − effort)². Lag τ = 15 s.
- PaCO2 target: ventilated 4.9 kPa; spontaneous min(9, 5.2 / max(0.35, effort)^0.6). Lag τ = 90 s if ventilated, 120 s if not.
- EtCO2 = PaCO2 − 0.3.

### 3.6 Temperature

While hyp > 0.4, temperature falls by 0.5 °C per hour, to no lower than 34.5 °C.

### 3.7 Values the model does not change

TOF count and ratio stay at 4 and 100% unless the instructor or monitor sets them. Neuromuscular blockers are not modelled.

---

## 4. Patient presets

| Preset | HR | SYS/DIA | RR | SpO2 | Temp | Hypnotic sensitivity | Hypotension sensitivity | Safe apnoea (s) | Ventilator rate |
|---|---|---|---|---|---|---|---|---|---|
| adult | 72 | 124/76 | 13 | 99 | 36.7 | 1.0 | 1.0 | 240 | 12 |
| elderly | 68 | 152/78 | 15 | 96 | 36.3 | 1.4 | 1.7 | 120 | 12 |
| obese | 84 | 142/86 | 16 | 96 | 36.8 | 1.0 | 1.1 | 75 | 14 |
| child | 102 | 98/58 | 22 | 99 | 36.9 | 0.8 | 0.8 | 60 | 20 |
| anxious | 98 | 136/84 | 18 | 99 | 36.8 | 0.75 | 0.8 | 240 | 12 |

Starting values: EtCO2 4.9 kPa, SE 89, RE 98, CVP 8, TOF 4 / 100%.

---

## 5. Overrides

- `override {key, value, seconds}` stores `{from: shown value now, to: value, start: now, duration: seconds}`. The shown value moves linearly from `from` to `to`, then holds. The model keeps running underneath. The instructor sees both values.
- `release {key}` returns to the model value at once.
- After overrides are applied, diastolic is limited to ≤ systolic − 5, and RE to ≥ SE.
- The monitor's own edits send the same action with `from: "monitor"`. They are refused while the monitor is locked.

---

## 6. Monitor behaviour

### 6.1 Display smoothing

When a new state arrives, each value moves to its new value over 1.2 s (`Vitals.set(key, v, 1.2)`). Small random variation is added once a second:

| Value | Variation (±) |
|---|---|
| HR | 1 |
| Systolic | 1.5 |
| Diastolic | 1 |
| EtCO2 | 0.05 |
| SE, RE | 1 |
| CVP | 0.5 |
| Others | 0 |

### 6.2 Waveforms (`waveforms.js`)

| Signal | How it is made |
|---|---|
| ECG | Lead II built from Gaussian P, Q, R, S and T waves. The R wave is at 0.16 s, and QT shortens as the rate rises. Each beat varies by ±1.5%. Flat line when HR is 0. |
| Pleth | A fixed-size pulse with a dicrotic wave, 0.2 s after the R wave |
| Art | Diastolic + (systolic − diastolic) × a pulse shape with a tidal wave and a dicrotic wave |
| CVP | A, C and V waves around the CVP value, with a swing that follows breathing |
| CO2 | For each breath at the RR: a baseline of 0 during inspiration (the first third), a fast upstroke, then a sloping plateau that reaches EtCO2. Flat during apnoea. |
| Resp | A smooth chest-impedance wave at the RR |
| EEG | Seven sine waves (1.3 to 27 Hz) plus noise. As SE falls, slow waves grow, fast waves shrink, and alpha peaks at middle depth. Below SE 25 there is burst suppression, with periods of near-flat EEG that get longer as SE falls. |

Each waveform is drawn as a sweep with an erase gap. The vertical ranges are fixed per module (Art 0–200 mmHg, CVP 0–20 mmHg, CO2 0–8 kPa).

### 6.3 Alarms

They are checked once a second, using the displayed values and the limits in [SPECIFICATION.md §3.2](SPECIFICATION.md#32-patient-monitor-monitorhtml).

- Messages: `HR LOW`/`HIGH`, `ASYSTOLE`, `SpO2 LOW`, `Art LOW`/`HIGH`, `NIBP LOW`/`HIGH` (last reading), `APNOEA`, `EtCO2 LOW`/`HIGH`, `RR LOW`/`HIGH`, `Temp LOW`/`HIGH`.
- Sound: high priority plays 5 beeps at 988 Hz every 3 s; medium plays 3 beeps at 660 Hz every 8 s.
- Silence: 2 minutes. Pressing the button again unsilences.
- Only modules that are shown can alarm.

### 6.4 NIBP

| Property | Value |
|---|---|
| Measurement time | 18 simulated seconds |
| Cuff | starts at min(280, systolic + 35) and falls linearly to 40 mmHg |
| Result | systolic and diastolic at the end of the measurement; no reading if systolic < 30 |
| Interval | Off, 1, 2.5, 5 (default), 10 or 15 min, measured from the last reading |
| First reading | 3 s after the module is shown |

---

## 7. Teaching scenarios

| Scenario | How to run it | What trainees should see |
|---|---|---|
| Standard induction | Fit adult. Propofol Schnider Ce 4, remifentanil Minto Ce 3. | Ce rises over about 2 min, SE falls to about 45, systolic BP falls by about a quarter, apnoea, then desaturation after 4 min unless ventilated |
| Elderly hypotension | Frail elderly, propofol Ce 4 | A larger fall in BP. Teaches titrating the target in steps. |
| Light anaesthesia | Intubation or incision with a low remifentanil target | HR, BP, SE and RE rise. A higher remifentanil target blunts this. |
| Line disconnection | Instructor: IV line disconnected | The pump shows a rising Ce but the patient's levels fall, entropy and HR rise, and the instructor table highlights the difference |
| Occlusion | Instructor: occlude pump 1 | Alarm, the pump stops, Ce falls |
| Empty syringe | 20 mL syringe, high rate | Near-end warning, then the end alarm. Practise changing the syringe. |
| Bleeding | Bleeding on; then fluid and vasopressor | BP falls, HR and CVP change; treatment reverses this |
| Emergence | Stop the pumps and read the decrement times | SE rises, breathing returns |
| Children | Child, propofol Paedfusor plasma target | Effect-site mode is not offered; teaches plasma targeting |
| Model limits | Obese, 130 kg, 170 cm, Schnider | The pump refuses (James LBM). Discuss the alternatives. |
