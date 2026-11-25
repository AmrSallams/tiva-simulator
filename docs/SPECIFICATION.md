# TIVA Simulator: Product Specification

Version 0.1.0 · November 2026

> **For education only. Not for clinical use.** The simulator must never be used to guide real drug dosing. Every screen shows this warning or links to a page that does.

This document describes what the simulator does and how it must behave. The other documents in this folder describe how it is built:

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, data flow, timing, file layout |
| [CONNECTIVITY-API.md](CONNECTIVITY-API.md) | Network set-up, HTTP endpoints, the state message, every action |
| [PK-MODELS.md](PK-MODELS.md) | Drugs, pharmacokinetic models, the TCI controller |
| [PUMP-FLOWS.md](PUMP-FLOWS.md) | Pump styles, programming steps, keys, running screen, alarms |
| [PHYSIOLOGY.md](PHYSIOLOGY.md) | The patient model, events and the monitor |
| [TESTING.md](TESTING.md) | Automated tests and the workshop acceptance checklist |
| [SOURCE-CODE.md](SOURCE-CODE.md) | The complete source code |

---

## 1. Purpose

Junior anaesthetists learn total intravenous anaesthesia (TIVA) and target-controlled infusion (TCI) at a workshop. Each station has:

- a **patient monitor** that trainees watch;
- one to four **TCI syringe pumps** that trainees program and run;
- an **instructor remote** that the faculty member uses to run the case.

All three share one simulated patient. Drugs given by the pumps change the patient's depth of anaesthesia, blood pressure, heart rate, breathing and saturation. The instructor can let the physiology run by itself or override any value.

### 1.1 Learning goals supported

1. Programming a TCI pump: drug, concentration, model, patient details, mode and target.
2. Understanding the difference between plasma (Cp) and effect-site (Ce) targeting, and the induction dose a pump gives.
3. Choosing a model for the patient (for example Schnider in the elderly, Paedfusor in children), and recognising when a pump refuses a patient.
4. Recognising the effects of propofol and remifentanil: loss of consciousness, hypotension, apnoea and desaturation.
5. Responding to stimulation (intubation, incision) by adjusting targets.
6. Recognising faults: a disconnected IV line (the pump shows a rising Ce but the patient wakes), an occlusion and an empty syringe.
7. Reading decrement times and planning emergence.

### 1.2 Users

| User | Device | What they do |
|---|---|---|
| Trainee | Tablet or laptop | Operates the pump screen and watches the monitor |
| Instructor | Phone, tablet or laptop | Runs the instructor remote |
| Organiser | One laptop | Starts the server and connects the devices |

### 1.3 Out of scope

- Real pump hardware, and any connection to real medical devices.
- Arrhythmias other than sinus rhythm and asystole.
- Volatile anaesthetics and neuromuscular-blocker pharmacokinetics. NMT values are set by hand.
- User accounts and saved cases. Restarting the server clears all stations.

---

## 2. System overview

```
               ┌───────────── one laptop ──────────────┐
               │  node server.js                       │
               │   ├─ Station "1"  (patient + pumps)    │
               │   ├─ Station "2"                       │
               │   └─ ... up to 12                      │
               └───────────────┬───────────────────────┘
                     Wi-Fi / hotspot / localhost
        ┌───────────────┬──────┴────────┬────────────────┐
   monitor.html?s=1  pump.html?s=1  instructor.html?s=1  monitor.html?s=2 ...
```

- The simulation runs on the server only. Screens show the state and send key presses and commands.
- A **station code** (1 to 8 letters or digits, default `1`) groups screens. Screens with the same code share one patient.
- Any number of screens can open the same station. For example, two tablets can both show the monitor.

---

## 3. Functional requirements

Each requirement has an ID. [TESTING.md](TESTING.md) maps tests to these IDs.

### 3.1 Start page (`index.html`)

| ID | Requirement |
|---|---|
| ST-1 | Shows a station-code box (default `1`, upper-case letters and digits, up to 8 characters). |
| ST-2 | Has three links, to the patient monitor, the TCI pumps and the instructor remote. Each link carries the station code as `?s=CODE`. |
| ST-3 | Shows the network addresses that other devices can use (from `/api/info`). |
| ST-4 | Shows the education-only warning. |

### 3.2 Patient monitor (`monitor.html`)

The monitor uses a dark layout similar to a GE-style anaesthesia monitor: waveforms on the left with a number tile beside each, and a strip of number-only tiles along the bottom.

| ID | Requirement |
|---|---|
| MO-1 | **Modules.** Ten modules can each be shown or hidden. **Waveform modules:** ECG (lead II, heart rate), SpO2 (pleth), EtCO2 (capnogram, EtCO2 and RR), Art line (invasive BP with MAP), CVP, Resp (impedance), Entropy (EEG, RE and SE). **Strip modules:** Temperature, NIBP, NMT (TOF count and ratio). Default: all except CVP and NMT. |
| MO-2 | A **Setup** button opens a list of modules with tick boxes. Removing a module from a tile's dialog also hides it. The module list is shared with the server, so every monitor in the station shows the same modules. |
| MO-3 | **Waveforms** are drawn at 250 samples per second as a sweeping trace with an erase bar. ECG, pleth, Art, CVP and EEG sweep in about 8 s. CO2 and Resp sweep in about 24 s. The pulse follows the R wave by 0.2 s. |
| MO-4 | The ECG is sinus rhythm at the current heart rate with about 3% beat-to-beat variation. A heart rate of 0 shows a flat line (asystole). |
| MO-5 | The capnogram follows the respiratory rate, with its plateau at EtCO2. It is flat during apnoea. |
| MO-6 | The EEG slows and grows as SE falls. Below SE 25 it shows burst suppression. |
| MO-7 | **Editing values.** Pressing any tile opens a dialog where the trainee or instructor can type new values, choose a change time (at once, 30 s, 1 min or 3 min) and set alarm limits. When the monitor is locked by the instructor, values cannot be edited and modules cannot be removed. Alarm limits can still be changed. |
| MO-8 | Changing SE in the entropy dialog also updates RE (RE = SE + 2 + 7·(SE/91)²), unless the user has edited RE directly. RE is never below SE. |
| MO-9 | Diastolic BP is never higher than systolic minus 5. |
| MO-10 | **NIBP** measures on demand ("Measure now") or automatically every 1, 2.5, 5, 10 or 15 minutes, or never (Off). A measurement takes 18 s of simulated time. During it the tile shows the cuff pressure falling. The result is the systolic and diastolic pressure at the end of the measurement. If systolic is below 30 the tile shows "No reading". The tile shows how long ago the last reading was taken. |
| MO-11 | EtCO2 can be shown in kPa (default) or mmHg (×7.5). |
| MO-12 | **Alarms.** Each alarmed value has a low and a high limit (see the table below). A breach shows the tile in alarm colour and adds a message to the alarm bar. High priority is red with fast beeps. Medium priority is yellow with slower beeps. Messages are sorted with high priority first. |
| MO-13 | Heart rate 0 gives **ASYSTOLE** (high priority). Respiratory rate 0 gives **APNOEA** (high priority) on the Resp and CO2 tiles. |
| MO-14 | "Silence alarms" mutes the alarm sound for 2 minutes. The visual alarms stay. |
| MO-15 | **Sound.** A pulse beep sounds on each R wave. Its pitch falls as SpO2 falls (880 Hz at 100%, one octave lower at 80%). Sound starts off and is turned on with a button, because browsers require a user gesture. |
| MO-16 | Values shown move smoothly to new server values over 1.2 s and have a small random variation, so that they look like a real monitor. |
| MO-17 | Shows "SIMULATION · STATION n", the wall-clock time, and a banner while the simulation is paused. |

**Default alarm limits**

| Value | Low | High | High priority when |
|---|---|---|---|
| Heart rate | 50 | 120 | < 40 or > 150 |
| SpO2 | 92 | none | < 85 |
| Systolic (Art and NIBP) | 90 | 160 | < 70 |
| EtCO2 (kPa) | 3.5 | 6.5 | never |
| Respiratory rate | 8 | 30 | never |
| Temperature | 35.5 | 38.0 | never |

### 3.3 TCI pumps (`pump.html`)

Full details are in [PUMP-FLOWS.md](PUMP-FLOWS.md).

| ID | Requirement |
|---|---|
| PU-1 | A station starts with two pumps, both switched off. Up to four can be added. Each pump can be removed. Removing a pump or switching it off while it is infusing asks for confirmation. |
| PU-2 | A **style** selector applies to all pumps in the station: Generic, Alaris PK style, Agilia style or Space style. Each style has its own step order, patient-question order, wording and keypad. No manufacturer logos or trademarks are copied. |
| PU-3 | **Programming** asks for: drug, concentration, syringe size, model, patient details (only those the model needs, in the style's order), mode (effect-site TCI, plasma TCI or manual mL/h), and target. A confirmation screen then shows the patient, syringe, target and predicted induction dose and time. |
| PU-4 | Drugs: propofol (10 and 20 mg/mL), remifentanil (20, 40 and 50 mcg/mL), sufentanil (1 and 5 mcg/mL), dexmedetomidine (4 and 8 mcg/mL), ketamine (10 and 50 mg/mL). |
| PU-5 | Models: propofol Marsh, Marsh with fast ke0, Schnider, Eleveld, Paedfusor and Kataria; remifentanil Minto and Eleveld; sufentanil Gepts; dexmedetomidine Hannivoort; ketamine Domino. Plasma-only models (Paedfusor, Kataria, Domino) do not offer effect-site mode. |
| PU-6 | The pump refuses a patient outside the model's age, weight or height range, or whose weight is too high for the James lean-body-mass formula, and shows the reason. |
| PU-7 | **Running screen** shows: drug and concentration; model and mode; elapsed time; state (infusing or paused); target; the pump's predicted Cp and Ce; rate in mL/h and per kg; volume and dose given; syringe volume left with a bar; and decrement time to a drug-specific level. |
| PU-8 | **Changing the target** while running: the up and down keys show a pending new target, which OK confirms and Back cancels. |
| PU-9 | **Stop** pauses delivery and **Start** resumes it. **Bolus** is available in manual mode only. In TCI mode the pump says to raise the target instead. |
| PU-10 | **Menu** while running: New syringe, Purge line 2 mL (only while paused), Return to infusion, and End case and power off. |
| PU-11 | **Alarms**: NEAR END OF SYRINGE (≤ 20% left and ≤ 5 min at the current rate, or ≤ 2 mL left), END OF SYRINGE (stops the pump), and OCCLUSION (instructor event; stops the pump). An alarm blinks and beeps until OK or Back acknowledges it. |
| PU-12 | Generic-style list screens accept a tap on an option. Other styles need the arrow keys and OK, like the real devices. |
| PU-13 | The trend graph can be shown under the pumps when the instructor turns it on. |
| PU-14 | Key presses never get lost while the values on the screen update. This was a real bug and is now a design rule (see [ARCHITECTURE.md §6](ARCHITECTURE.md#6-rendering-rules-that-prevent-dropped-clicks)). |

### 3.4 Instructor remote (`instructor.html`)

| ID | Requirement |
|---|---|
| IN-1 | **Time:** shows the simulated clock; Pause or Resume; speed ×1, ×2, ×5 or ×10. |
| IN-2 | **Vital signs:** one row each for HR, systolic BP, diastolic BP, SpO2, RR, EtCO2, SE, RE, temperature, CVP, TOF count and TOF ratio. Each row shows the current value and whether it is automatic or overridden (with the model value alongside). It has − and + buttons, a number box, **Set** and **Auto**. |
| IN-3 | **Change over** (0, 30 s, 1 min or 3 min) sets how long an override takes to reach its value. **All to automatic** releases every override. |
| IN-4 | **Events:** intubation, skin incision, surgical stimulation (none, light, moderate or strong), spontaneous or ventilated, bleeding (on or off, shows the blood volume lost), fluid bolus, vasopressor, anticholinergic, IV line disconnected (toggle), and occlude pump n (one toggle per pump). |
| IN-5 | **Drug levels:** a table of each drug's patient Cp and Ce, and what the pump shows. The pump value is highlighted when it differs from the patient's by more than 5%, for example after a line disconnection. |
| IN-6 | **Trend graph:** Cp (dashed), Ce (solid) and rate (stepped, in its own panel), each with a tick box. Concentrations in mcg/mL use the left axis and those in ng/mL the right axis. A sample is taken every 15 s, up to 2 hours (480 points). Tick boxes also control whether the graph is shown on the pump screen. |
| IN-7 | **Monitor:** tick boxes for the monitor modules; **Lock the monitor** to stop trainees editing values. |
| IN-8 | **Case:** choose a patient (fit adult, frail elderly, obese adult, child, anxious young adult) and **Start new case**, which clears the patient, pumps and log after confirmation. |
| IN-9 | **Case log:** every pump action, alarm, event and override with its simulated time. Downloadable as CSV. |
| IN-10 | Shows the address and station code that other devices should use. |

### 3.5 Shared behaviour

| ID | Requirement |
|---|---|
| SH-1 | Every screen shows a red "connection lost, reconnecting" bar when it cannot reach the server, and reconnects by itself. |
| SH-2 | Screens work at phone width (360 px) up to large monitors, and on touch screens with targets of at least 38 px. |
| SH-3 | No internet connection is needed. There are no external fonts, scripts or CDNs. |
| SH-4 | A fault in one station pauses that station, writes the fault to its log, and does not affect other stations. |

---

## 4. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NF-1 | Stations per server | 12 maximum; designed for 2 to 4 |
| NF-2 | Screens per station | No hard limit; tested with 3 to 6 |
| NF-3 | Latency from a key press to the screen update | < 300 ms on a local network |
| NF-4 | State updates to screens | At least once per simulated second at ×1, at most about 4 per real second at high speed |
| NF-5 | Simulated time accuracy | 1 s steps; speed ×1 to ×10 |
| NF-6 | Install | Node.js 18 or newer (20 recommended); no npm packages |
| NF-7 | Browsers | Current Chrome, Edge, Safari (including iPad) and Firefox |
| NF-8 | Security | For a trusted local network only. There are no logins. Actions are validated, and file serving cannot leave the `public` and `src/engine` folders. Request bodies are limited to 20 kB. |
| NF-9 | Branding | Generic pump styles only. No manufacturer names on screens other than "… style". No copied logos. |

---

## 5. Patients

| Preset | Description | Baseline HR / BP / RR / SpO2 | Notes |
|---|---|---|---|
| `adult` | Fit adult, 40 y, 70 kg, 170 cm, male | 72 / 124/76 / 13 / 99 | Reference sensitivity; safe apnoea 240 s |
| `elderly` | Frail elderly, 82 y, 58 kg, 160 cm, female | 68 / 152/78 / 15 / 96 | Hypnotic ×1.4, hypotension ×1.7; safe apnoea 120 s |
| `obese` | Obese adult, 45 y, 130 kg, 170 cm, male | 84 / 142/86 / 16 / 96 | Safe apnoea 75 s |
| `child` | Child, 6 y, 20 kg, 115 cm, male | 102 / 98/58 / 22 / 99 | Hypnotic ×0.8; safe apnoea 60 s; ventilated at 20/min |
| `anxious` | Anxious young adult, 24 y, 65 kg, 168 cm, female | 98 / 136/84 / 18 / 99 | Hypnotic ×0.75 |

The trainee enters the patient's age, weight, height and sex into the pump themselves. The pump does not read them from the preset. This is deliberate: entering the wrong weight is a teaching point. The patient's own kinetics use the model that the trainee chose, with the details the trainee entered (see [PHYSIOLOGY.md §2](PHYSIOLOGY.md#2-drug-kinetics-inside-the-patient)).

---

## 6. Known limits and items to verify

- The brand-style step orders are approximations and must be checked against real pumps before a workshop that depends on them.
- These constants could not be confirmed and should be checked against a pump manual: the Kataria parameter set, the Paedfusor values for ages 13 to 16, and the Gepts (sufentanil) ke0 of 0.112/min.
- The haemodynamic and respiratory responses are teaching approximations, not a validated physiological model.
- The following have not been tested at a real workshop: tablets on venue Wi-Fi, and sound on iPads.
