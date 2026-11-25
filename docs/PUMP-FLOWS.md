# TIVA Simulator: Pump Styles and Screen Flows

> **For education only. Not for clinical use.** The brand-style flows are approximations made for teaching. Check them against the real devices and their manuals before relying on them. No manufacturer logos or trademarks are used. Styles are named "… style".

Source: `src/sim/pump-unit.js` (logic) and `public/js/pump/pump.js` (drawing).

---

## 1. Styles

| | Generic | Alaris PK style | Agilia style | Space style |
|---|---|---|---|---|
| Step order | drug → concentration → syringe → model → patient → mode → target → confirm | drug + model → concentration → patient → syringe → mode → target → confirm | syringe → drug → concentration → patient → model → mode → target → confirm | syringe → drug → concentration → patient → model → mode → target → confirm |
| Patient question order | age, weight, height, sex | age, height, weight, sex | sex, age, height, weight | weight, height, age, sex |
| Start / stop words | Start / Stop | RUN / HOLD | START / STOP | START / STOP (one key) |
| Running / paused | INFUSING / PAUSED | INFUSING / ON HOLD | INFUSION / STOPPED | RUNNING / STOPPED |
| Menu / back / OK | Menu / Back / OK | OPTIONS / BACK / OK | MENU / C / OK | MENU / C / OK |
| Keypad row 1 | − −, −, +, + + | ⏶⏶, ⏶, ⏷, ⏷⏷ | ▲▲, ▲, ▼, ▼▼ | ◀, ▲, ▼, ▶ |
| Keypad row 2 | Start, Stop, Bolus, Menu | RUN, HOLD, PURGE / BOLUS, OPTIONS | START, STOP, BOLUS, MENU | START / STOP, BOL, MENU |
| Tap a list item | yes | no | no | no |
| Number entry | ± step, ±10 steps | ± step, ±10 steps | ± step, ±10 steps | ◀ ▶ choose the digit, ▲ ▼ change it |
| Look | dark | grey body, green-grey monochrome LCD | white body, white LCD, blue keys | light body, blue LCD |

Changing the style while a pump is programming restarts its programming at step 1 in the new order. A pump that is infusing keeps running.

**Patient questions.** When the model is chosen **before** the patient (Generic, Alaris), only the fields that the model needs are asked, plus age and weight. For example, Marsh asks age and weight only. When the patient comes first (Agilia, Space), all four are asked.

---

## 2. State machine

```
            power on
  OFF ───────────────► PROGRAMMING (step 1 … n)
   ▲                        │  OK = save and next, BACK = previous
   │                        │  after model + patient: validatePatient()
   │                        ├──► ERROR (reasons) ──OK/BACK──► same step
   │                        ▼
   │                     CONFIRM ──START──► RUNNING ◄─────────────────────┐
   │                                          │                          │
   │                                          ├─ ▲▼ → pending target ─OK─┤
   │                                          ├─ STOP → held ─START──────┤
   │                                          ├─ BOLUS (manual) → dose ─OK┤
   │                                          ├─ MENU → list ─────────────┤
   │                                          │     New syringe / Purge 2 mL (held) /
   │                                          │     Return / End case and power off
   └──────── power button / End case ◄────────┘
```

Screen types (the `view.type` field) are: `off`, `list`, `number`, `error`, `confirm` and `run`.

### 2.1 Step details

| Step | Screen | Options or range | Notes |
|---|---|---|---|
| `drug` | list | Propofol, Remifentanil, Sufentanil, Dexmedetomidine, Ketamine | Changing the drug clears the model and target, and sets the first concentration |
| `drugModel` | list | Every drug + model pair, for example "Propofol Schnider" | Alaris style. Sets both. |
| `concentration` | list | The drug's concentrations, for example "10 mg/mL (1%)" | |
| `syringe` | list | 20, 50 or 60 mL | Used for the syringe-empty alarms |
| `model` | list | The drug's models; "plasma only" shown under Paedfusor, Kataria and Domino | |
| `p:age`, `p:weight`, `p:height` | number | age 1–100 y, weight 5–200 kg, height 50–220 cm, steps of 1 | Defaults 40 y, 70 kg, 170 cm |
| `p:sex` | list | Male, Female | |
| `mode` | list | Effect-site TCI (only if the model allows it), Plasma TCI, Manual (mL/h) | Changing the mode clears the target |
| `target` | number | TCI: 0 to the drug maximum, in the drug's step. Manual: 0–1200 mL/h in steps of 0.1. | Defaults: drug default target, or 10 mL/h |
| `confirm` | confirm | Shows drug, model, mode, patient, syringe, target, induction | START begins. OK shows "Press Start to begin". |

The title bar shows progress, for example `3/9`.

### 2.2 Keys

| Key | Lists | Numbers | Running |
|---|---|---|---|
| UP / DOWN | move selection (wraps round) | ± one step, or ± the digit (Space) | start or change the pending target |
| BIGUP / BIGDOWN | move selection | ± 10 steps | pending target ± 10 steps |
| LEFT / RIGHT | none | Space: move the digit cursor (×10 or ÷10, between step and 100 × step) | pending target cursor |
| OK | choose and next | save and next | confirm the pending target |
| BACK | previous step | previous step | cancel the pending target; during a menu or bolus screen, return to running |
| START | on confirm: begin | | resume after a stop |
| STOP | | | pause (held) |
| STARTSTOP | Space style: acts as STOP while running, otherwise START | | |
| BOLUS | | | manual mode: open the bolus dose screen (1–500, default per drug). TCI: "No bolus in TCI: raise the target". Held: "Press Start before giving a bolus". |
| MENU | | | open the menu |

**Alarm acknowledgement.** While an alarm is sounding, the first OK or BACK only acknowledges it. The alarm bar stops blinking and turns amber, and the beep stops. The key does nothing else.

---

## 3. Running screen

```
┌ Propofol 10 mg/mL ───────────────────── 12:34 ┐   ← drug colour bar under the title
│ Schnider · Effect-site TCI          INFUSING   │
│ Target Cet                    Cp   4.21        │
│ 4.0 mcg/mL                    Ce   3.98        │
│                                     mcg/mL     │
│ Rate 32.5 mL/h                 4.64 mg/kg/h    │
│ Volume 18.2 mL                 Dose 182 mg     │
│ [██████████░░░░░] Syringe 31.8 mL              │
│ Time to 1.5: 9:40              40 y · 70 kg …  │
├────────────────────────────────────────────────┤
│ Menu                                           │   ← softkeys (separate container)
└────────────────────────────────────────────────┘
```

| Field | Source |
|---|---|
| Header | drug, concentration and dose unit per mL |
| Elapsed | `Infusion.timeS` |
| State | the style's running or hold word; amber when held |
| Target | current target, or the pending value while changing it |
| Cp, Ce | the **pump's** predictions. Ce shows "--" for plasma-only models. Shown to at least 2 decimals. |
| Rate | mL/h delivered in the last second; per-kg in the drug's unit |
| Volume, Dose | totals since start, including boluses |
| Syringe | syringe size − (volume since the last new syringe) − purged volume |
| Decrement | "Time to {level}: m:ss", if stopped now |
| Patient | age and weight, plus height and sex when the model uses them |
| Pending | "New target cet 5.0 (was 4.0): OK to confirm" |
| Softkeys | Menu, or Back with OK while a change is pending, or Start when held |

---

## 4. Alarms

| Alarm | Trigger | Effect | Clearing |
|---|---|---|---|
| NEAR END OF SYRINGE | ≤ 20% of the syringe left **and** ≤ 5 min at the current rate, or ≤ 2 mL left | Warning only; keeps infusing | OK acknowledges it; fitting a new syringe clears it |
| END OF SYRINGE | 0 mL left | Pump stops (held) | Menu → New syringe, then Start |
| OCCLUSION | Instructor "Occlude pump n" | Pump stops (held) | Instructor clears it ("Occlusion cleared: press Start"), then Start |

The 20% condition stops the brief high rate during induction from setting off the near-end alarm.

While an alarm is unacknowledged, the alarm bar blinks red, the pump outline turns red, `alarmSounding` is true, and the pump page beeps (3 × 2400 Hz every 2.5 s) if its sound is on. Every alarm is written to the case log.

---

## 5. The `screen` object

`PumpUnit.screen()` returns plain data. The page turns it into HTML.

| `type` | Fields (as well as `on`, `color`, `alarm`, `alarmAcked`, `message`, `words`) |
|---|---|
| `off` | none |
| `list` | `title`, `options[{value,label,sub?}]`, `index`, `progress` |
| `number` | `title`, `unit`, `value` (formatted text), `progress`, `cursor` (Space only) |
| `error` | `title`, `lines[]` |
| `confirm` | `header`, `sub`, `patient`, `syringe`, `target`, `induction`, `progress` |
| `run` | `header`, `sub`, `patient`, `state`, `held`, `targetLabel`, `targetUnit`, `target`, `pending`, `cp`, `ce`, `concUnit`, `rate`, `perKg`, `volume`, `dose`, `elapsed`, `syringeLeft`, `syringeFraction`, `decrement` |

The list window shows up to 5 options centred on the selected one.

---

## 6. Case log entries from pumps

All entries are prefixed with "Pump n:".

- `Started Propofol 10 mg/mL, Schnider, Effect-site TCI target 4 mcg/mL`
- `Changed to Effect-site TCI target 5 mcg/mL`
- `Infusion stopped by user` / `Infusion restarted`
- `Bolus 20 mg`
- `New syringe fitted` / `Purged 2 mL`
- `Pump alarm: NEAR END OF SYRINGE`, `Pump alarm: END OF SYRINGE`, `Pump alarm: OCCLUSION`
- `Pump switched off`, `removed while infusing`

---

## 7. Items to verify against real devices

1. The exact step order and patient-question order for each brand.
2. Whether each brand offers manual mode, bolus during TCI, and purge, and where they sit in its menus.
3. The syringe sizes offered and the near-end alarm thresholds.
4. The wording on screens and keys.
5. The models and concentrations available in each brand's local drug library.
