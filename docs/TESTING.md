# TIVA Simulator: Testing

> **For education only. Not for clinical use.**

---

## 1. Automated tests

```bash
npm test
```

This runs `node --test`, which finds every `test/*.test.js` file. There are 29 tests, and no packages are needed. They test the engine and the simulation directly, without a browser or server.

### 1.1 `test/engine.test.js` (22 tests): PK models and TCI

| Test | Checks | Requirement |
|---|---|---|
| Marsh: published volumes for 70 kg | V1 15.96, V2 32.4, V3 202.5, ke0 0.26 | PU-5 |
| Schnider: published values | V1 4.27, V2 24.0 and the rate constants | PU-5 |
| Minto: PyTCI reference trace | Cp after a 50 mcg bolus at 0 s and 60 s | PU-5 |
| Eleveld propofol: reference individual | V1, V2, V3, CL1, CL2, CL3, ke0 | PU-5 |
| Eleveld propofol: opioid and female effects | the opioid terms lower V3 and CL1; females have higher CL1 | PU-5 |
| Eleveld remifentanil: reference and female | reference values; the female factor | PU-5 |
| Paedfusor: 6 y, 20 kg | V1 and k10 for a child | PU-5 |
| Paedfusor at 16 y equals Marsh | | PU-5 |
| Kataria, Hannivoort, Gepts, Domino | basic parameters | PU-5 |
| Every model builds and belongs to a known drug | | PU-5 |
| Patient limits are enforced like a pump | out of range, missing sex, James LBM apex | PU-6 |
| Time to peak effect | Schnider and fast-ke0 Marsh 1.6 min; Marsh 3.5–5 min | |
| A constant infusion settles at rate / clearance | 5 models, every compartment | |
| One 60 s step equals sixty 1 s steps | stepper accuracy | |
| Plasma TCI, Marsh 4 mcg/mL | loading dose, held at target, no overshoot, rate never above 1200 mL/h | PU-3 |
| Effect-site TCI, Schnider 4 mcg/mL | Ce reaches target in under 4 min without overshoot; Cp overshoots | PU-3 |
| Lowering an effect-site target | the pump stops, then resumes at the new target without undershoot | PU-8 |
| Effect-site refused for plasma-only models | | PU-5 |
| Every model holds its default target | in plasma mode and, where allowed, effect-site mode | PU-4 |
| Manual rate and bolus | dose and volume add up; returns to the set rate | PU-9 |
| Pause | delivery stops, Cp falls, resume returns to target | PU-9 |
| Decrement time | grows with infusion length; 0 when already below | PU-7 |

### 1.2 `test/sim.test.js` (7 tests): patient and station

These tests program pumps through the real key presses (`pumpPower`, then OK through every step, then `START`). They run the station second by second.

| Test | Checks | Requirement |
|---|---|---|
| Awake patient stays at baseline | no drift without drugs | |
| Propofol and remifentanil TCI | the patient falls asleep (SE falls), BP falls, apnoea, then desaturation | PHYSIOLOGY §3 |
| Stimulation | HR and BP rise more without an opioid | IN-4 |
| Disconnected line | the pump display rises but the patient's level does not | IN-4, IN-5 |
| Drug stays after the pump is switched off | the patient's level falls gradually | PHYSIOLOGY §2 |
| Override and release | the value ramps, then returns to the model | IN-2, IN-3 |
| Bleeding and occlusion | BP falls and HR rises; occlusion alarms and stops the pump | IN-4, PU-11 |

### 1.3 Adding tests

- Use `node:test` and `node:assert/strict`.
- For a new PK model, add a test that compares it with published values or a reference implementation (for example PyTCI or STANPUMP).
- For a new pump style, add a test that programs a pump through the style's flow with `program()` from `sim.test.js`.
- Engine tests must not depend on timing or randomness. The patient model has no randomness; the monitor's random variation is in the browser only.

---

## 2. Manual browser checks

Run `npm start`, then open the pages in a browser.

| # | Check | Expected |
|---|---|---|
| B-1 | Open `/`, change the code to `2`, and open each screen | The address shows `?s=2`, and screens with the same code share a patient |
| B-2 | Monitor: Setup → untick Art, tick CVP | The modules change on every monitor of the station and on the instructor page |
| B-3 | Monitor: press the SpO2 tile and set 88 over 30 s | Moves down gradually, SpO2 LOW alarm, logged on the instructor page |
| B-4 | Instructor: Lock the monitor, then try B-3 | The value fields are hidden, Setup is hidden, alarm limits still editable |
| B-5 | NIBP: Measure now | The cuff falls for 18 s, then a reading appears with its MAP |
| B-6 | Pump (Generic): program propofol Schnider Ce 4 for a 40 y, 70 kg, 170 cm male | The confirm screen shows an induction dose. After Start, Ce rises to 4.0 and SE falls. |
| B-7 | Press ▲ while running, then OK | Pending target shown, then applied, and logged |
| B-8 | Change the style to Space and program a pump | Asks syringe first, then weight, height, age, sex; ◀ ▶ move the digit |
| B-9 | Program Schnider for 130 kg, 170 cm | The error screen explains the lean body mass problem |
| B-10 | Instructor: occlude pump 1 | The pump stops and the OCCLUSION alarm blinks. OK acknowledges it. Clearing the occlusion and pressing Start restarts the pump. |
| B-11 | Instructor: disconnect the line | The "Pump shows" column is highlighted; the patient's Ce falls |
| B-12 | Speed ×10 | The clock advances 10 s per second; pumps still respond to every key press |
| B-13 | Tap pump keys quickly while values update (×10) | No key press is lost |
| B-14 | Pause | A banner shows on the monitor and pump pages; values stop changing |
| B-15 | Trend: tick Cp, Ce and Rate off and on | The lines appear and disappear on both the instructor and pump graphs |
| B-16 | Download the case log | A CSV with time and event columns |
| B-17 | Turn on Sound on the monitor and pump | Pulse beep with pitch falling as SpO2 falls; alarm tones |
| B-18 | Stop the server, then start it again | A red bar shows, then the screens reconnect by themselves (to a new case) |
| B-19 | Phone width (360 px) | No horizontal scroll; buttons can be pressed |

---

## 3. Workshop acceptance checklist

Do this on the actual devices and network the day before, or on the morning of, the workshop.

- [ ] The server laptop is on mains power, with sleep turned off.
- [ ] `npm test` passes.
- [ ] Every tablet opens the address shown on the instructor page.
- [ ] Each station code is written on a card at its station.
- [ ] Two screens of the same station show the same clock and values.
- [ ] A pump key press on a tablet shows on the screen in under half a second.
- [ ] Sound works on each device after pressing Sound (iPads: the mute switch is off and the volume is up).
- [ ] A full induction case runs for 15 minutes at ×1 without disconnection.
- [ ] Each pump style matches the step order of the pumps used locally, or the trainees are told about the differences.
- [ ] The education-only warning is mentioned in the briefing.

---

## 4. Not yet verified

| Item | Status |
|---|---|
| Use on tablets over venue Wi-Fi with 4 stations | Not tested |
| Sound on iPad Safari | Not tested |
| Brand-style step orders | Approximations; need checking against real pumps |
| Kataria parameters, Paedfusor at 13–16 years, Gepts ke0 | Need checking against a pump manual |
| Haemodynamic and respiratory response sizes | Teaching approximation; check that faculty find them realistic |
