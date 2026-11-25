# TIVA Simulator: Architecture

> **For education only. Not for clinical use.**

This document explains how the simulator is built. A developer can use it to change the simulator, or to rebuild it in another language or framework. Read it with [SPECIFICATION.md](SPECIFICATION.md).

---

## 1. Design principles

1. **One source of truth.** All simulation runs on the server. Screens hold no patient or pump state apart from display smoothing, the monitor's NIBP cycle and the monitor's alarm limits. Two screens on the same station always agree.
2. **The pump's model and the patient are separate.** Each pump predicts Cp and Ce with its own copy of the model. The patient receives only the drug that is actually delivered. This lets a disconnected line, an occlusion or an empty syringe make the pump display and the patient differ, which is a key teaching point.
3. **No dependencies.** The server uses only Node.js built-in modules. The browser code is plain ES modules with no build step. The project can be copied to a laptop and run without internet access.
4. **Engine code runs on both sides.** `src/engine` is plain JavaScript with no Node or browser APIs. The server imports it, and it is also served at `/engine/` for future browser use.
5. **Fail safe during a workshop.** One station's error pauses that station only. A screen that loses its connection reconnects by itself.

---

## 2. Components

```
server.js ─────────────── HTTP server, static files, station loop, SSE broadcast
  └─ src/sim/station.js ── Station: patient + pumps + overrides + log + history; applies actions
       ├─ src/sim/patient.js ── Patient: drug kinetics in the body, vital-sign response, events
       │     └─ src/engine/pk.js
       └─ src/sim/pump-unit.js ─ PumpUnit: one pump's screens, keys, alarms (4 styles)
             ├─ src/engine/models.js ── drugs, PK models, patient limits, buildModel()
             └─ src/engine/infusion.js ─ Infusion: pump-side prediction + TCI controller
                   └─ src/engine/pk.js ── 3-compartment + effect-site maths (RK4, linear stepper)

public/index.html ─────── start page (station code, links)
public/monitor.html ───── js/monitor/monitor.js
                            ├─ vitals.js      smoothed values, noise, alarm limits
                            ├─ waveforms.js   ECG, pleth, Art, CVP, CO2, Resp, EEG signal generator + Trace drawing
                            └─ audio.js       pulse tone and alarm tones (WebAudio)
public/pump.html ──────── js/pump/pump.js   draws pumps from state, sends key presses
public/instructor.html ── js/instructor.js  controls, levels table, log
shared:                   js/link.js        SSE connection + send(action)
                          js/trend.js       Cp/Ce/rate canvas graph
```

### 2.1 File list

| Path | Lines | Role |
|---|---|---|
| `server.js` | 171 | HTTP, static files, station loop, API |
| `src/engine/pk.js` | 87 | Compartment maths |
| `src/engine/models.js` | 387 | Drugs, models, limits |
| `src/engine/infusion.js` | 210 | Pump prediction and TCI controller |
| `src/sim/patient.js` | 153 | Patient response |
| `src/sim/pump-unit.js` | 517 | Pump user interface logic |
| `src/sim/station.js` | 293 | Station, actions, events |
| `public/js/link.js` | 28 | Connection helper |
| `public/js/trend.js` | 168 | Trend graph |
| `public/js/monitor/*.js` | 847 | Monitor |
| `public/js/pump/pump.js` | 202 | Pump page |
| `public/js/instructor.js` | 208 | Instructor page |
| `public/*.html`, `public/css/*.css` | | Page shells and styles |
| `test/*.test.js` | 432 | Automated tests (`node --test`) |
| `tools/make-code-doc.js` | 132 | Builds SOURCE-CODE.md/html |

---

## 3. Data flow

```
 pump.html                     server.js                         monitor.html
 ─────────                     ─────────                         ────────────
 key press ──POST /api/action──► Station.action(a)
                                   └─ PumpUnit.key()             
                                 broadcast(state) ──SSE──────────► onState(): vitals.set(..., 1.2 s)
          ◄──────────SSE──────── broadcast(state)                  waveforms at 250 Hz, alarms every 1 s
 render(state.pumps)
                                 every 50 ms: debt += 0.05 × speed
                                 while debt ≥ 1: Station.tick()   (one simulated second)
                                   ├─ PumpUnit.tick(1) → Infusion.tick(1)  (pump prediction, rate)
                                   ├─ deliveries = rate × (line connected ? 1 : 0)
                                   ├─ Patient.step(deliveries, 1)
                                   └─ every 15 s: history.push({t, cp, ce, rate, se})
                                 broadcast if ≥ 240 ms since last
```

### 3.1 One simulated second (`Station.tick`)

1. Skip if paused. Increase `simTime` by 1.
2. For each pump: `unit.tick(1)`. This advances the pump's `Infusion`, which runs its TCI controller every 10 s. It also checks for syringe alarms and occlusion.
3. Build `deliveries`: for each infusing pump, `{ infusion, drug, rate }`, where `rate` is `deliveredRate` (dose units per minute), or 0 when the instructor has disconnected the IV line.
4. `patient.step(deliveries, 1)`. This advances the patient's own drug stores and then the vital signs.
5. Every 15 s, add a point to `history`: Cp, Ce and the average rate in mL/h for each drug, plus SE. Keep at most 480 points (2 hours).

### 3.2 Timing

| Loop | Where | Period |
|---|---|---|
| Station tick scheduler | server `setInterval` | 50 ms real time; runs ⌊debt⌋ simulated seconds |
| Simulated step | `Station.tick` | 1 simulated second |
| TCI controller | `Infusion` | every 10 simulated seconds |
| PK integration | `pk.js` | exact linear stepper, precomputed for 1 s and 10 s steps |
| Broadcast | server | after each action, and after a tick if ≥ 240 ms since the last |
| Monitor drawing | browser `requestAnimationFrame` | 250 samples per second of waveform; tiles and alarms once a second |
| Trend history | `Station` | every 15 simulated seconds |

At ×10, the server runs 10 simulated seconds per real second. These come in batches of 0.5 per 50 ms tick, so one step every 100 ms. The broadcast throttle keeps the update rate to tablets at about 4 per second.

---

## 4. Server (`server.js`)

- `rooms: Map<code, { station, clients: Set<ServerResponse>, debt, sentAt }>`.
- `room(code)` normalises the code (upper case, A–Z and 0–9 only, at most 8 characters, default `1`). It creates the station on first use. It throws an error once 12 stations exist.
- **Static files.** `/engine/*` is served from `src/engine/`, and everything else from `public/`. Paths are normalised and must stay inside the mounted folder. All responses use `Cache-Control: no-store` so that updates reach tablets at once.
- **Errors.** API errors return `400` with the message as plain text. A thrown error inside `Station.tick()` pauses that station and logs `Simulator fault, paused: …`.
- **Port.** `PORT` environment variable, default 8080. If the port is already in use (`EADDRINUSE`), it prints a plain message and exits.

Full endpoint details are in [CONNECTIVITY-API.md](CONNECTIVITY-API.md).

---

## 5. Simulation classes

### 5.1 `Station` (`src/sim/station.js`)

| Member | Purpose |
|---|---|
| `patient: Patient` | The simulated patient |
| `pumps: {id, unit: PumpUnit}[]` | 1 to 4 pumps. Ids are never reused within a case. |
| `styleId` | Pump style shared by all pumps |
| `overrides: {key: {from, to, start, duration}}` | Instructor or monitor overrides, applied as a linear ramp |
| `modules: string[]` | Monitor modules shown |
| `monitorLocked`, `showTrend`, `trendShow` | Display settings |
| `speed ∈ {1,2,5,10}`, `paused` | Time control |
| `lineConnected` | IV line event |
| `log[]` (max 1000), `history[]` (max 480) | Case log and trend |
| `tick()` | One simulated second |
| `vitals()` | Patient values with overrides applied. Keeps diastolic ≤ systolic − 5 and RE ≥ SE. |
| `state()` | The JSON object sent to screens |
| `action(a)` | Applies one action. Throws a readable error if the action is invalid. |
| `reset(preset)` | New patient, 2 pumps, cleared log and history. Speed returns to ×1. The pump style, modules, lock and trend tick boxes are kept. |

### 5.2 `PumpUnit` (`src/sim/pump-unit.js`)

A state machine for one pump's user interface. See [PUMP-FLOWS.md](PUMP-FLOWS.md).

- `cfg`: drug, concentration, syringeMl, modelId, mode, target, patient {age, weight, height, sex}.
- `view`: the current screen, one of `list`, `number`, `error`, `confirm` or `run`.
- `key(k)`, `select(i)`, `powerOn()`, `powerOff()`, `setStyle(id)`, `setOcclusion(on)`, `tick(s)`.
- `screen()`: plain data that the page draws. It contains no HTML.
- `infusion: Infusion | null`: set when the user presses Start.

### 5.3 `Infusion` (`src/engine/infusion.js`)

The pump's own PK prediction and its rate controller. See [PK-MODELS.md](PK-MODELS.md).

### 5.4 `Patient` (`src/sim/patient.js`)

Holds one drug store per infusion (`lines: Map<Infusion, {model, stepper, state}>`). This means each pump's drug enters the patient using the same model and patient details as that pump. It then computes the vital signs. See [PHYSIOLOGY.md](PHYSIOLOGY.md).

---

## 6. Rendering rules that prevent dropped clicks

Tablets dropped pump key presses while values were updating. The cause: a browser fires `click` only if the same element receives both `pointerdown` and `pointerup`. Replacing the button's HTML between the two cancels the click. The rules that fix this are:

1. **Change only what changed.** `setHtml(el, html)` compares the new HTML with `el.dataset.html` and writes only when it differs.
2. **Split static from changing parts.** The pump LCD has two containers. `.lcd-main` holds values that change every second. `.lcd-softkeys` holds the softkey buttons, which change only when the screen type changes.
3. **The keypad is built once per style.** It is rebuilt only when `styleId` changes.
4. **Event delegation.** One `click` listener on each pump element reads `data-key`, `data-select`, `data-power` and `data-remove` from the nearest button.
5. **Throttle broadcasts.** At high speed, updates are limited to about 4 per second.
6. The instructor page follows the same rule for the occlusion buttons, and does not overwrite a number box that the user is typing in (`dirty` set and `document.activeElement` check).

Any port of the simulator to another framework must keep these properties. A virtual-DOM framework that keeps element identity, such as React or Vue, does this by itself.

---

## 7. Client code

### 7.1 `link.js`

- `station`: the code from `?s=`, default `1`, upper case.
- `connect(onState, onStatus)` opens `EventSource('/api/events?s=CODE')` and returns `send(action)`, which POSTs JSON to `/api/action?s=CODE`. It returns `true` or `false` and logs refusals to the console.
- `withStation(href)` adds `?s=CODE` to links.

### 7.2 Monitor

- `Vitals` holds, for each value, `cur`, `target`, `rate`, `noise`, `low` and `high`. `set(key, v, seconds)` ramps towards the new value linearly. `wobble()` refreshes the noise once a second.
- `Signals.step(dt)` produces one sample of each waveform from the current values. `Trace` draws a sweeping line on a canvas.
- In linked mode (normal use), edits are sent as `override` actions with `from: 'monitor'` and come back in the state. Without a server (opening the HTML file directly), edits apply locally.
- Alarm limits, the NIBP interval and the CO2 unit are local to each monitor screen.
- `window.monitor` exposes `vitals`, `nibp`, `setVital`, `setModules` and `measureNibp` for testing in the browser console.

### 7.3 Pump page

- Draws one `<section class="pump style-…">` per pump in `state.pumps`. It removes sections for pumps that no longer exist.
- The pump styles are CSS custom properties (`--body`, `--lcd`, `--ink`, `--key` …) on `.style-alaris`, `.style-agilia` and `.style-space`.
- The alarm beep is three 2400 Hz square-wave beeps every 2.5 s while any pump's alarm is sounding and the page's sound is on.

### 7.4 Instructor page

- Builds the vital-sign rows, module tick boxes and patient list once, then updates them from each state.
- The log keeps its scroll position unless the user is already at the bottom.

---

## 8. Extending the simulator

| Task | Where |
|---|---|
| Add a drug | `DRUGS` in `models.js`; `DRUG_UI` in `pump-unit.js`; `DRUG_COLORS` in `trend.js`; `DRUG_UNITS` in `instructor.js`; its effect in `Patient.step` |
| Add a PK model | `MODELS` in `models.js` (drug, name, reference, needs, limits, plasmaOnly, `params(p)`); add a test with published values |
| Add a pump style | `STYLES` in `pump-unit.js` (steps, patientOrder, words, keys, options); CSS `.style-<id>`; `STYLE_NAMES` in `pump.js` |
| Add a monitor module | `MODULES` and `tileHtml` in `monitor.js`; a signal in `waveforms.js` if it has a waveform; the vital in `PARAMS` (`vitals.js`) and in `Patient.v`; `MODULES` and `VITALS` in `instructor.js` |
| Add an instructor event | `#event` in `station.js`; a button with `data-event` in `instructor.html`; its effect in `Patient` |
| Add a patient | `PRESETS` in `patient.js` and `instructor.js` |
| Save cases | Serialise `Station` (all state is plain data except the `Infusion` objects, which can be rebuilt from `cfg` and replayed) |
| Host on the internet | Put the server behind HTTPS and add a login or a station password. SSE works through most proxies if buffering is turned off. |

### 8.1 Porting notes

- Keep the engine units: minutes, litres, and dose units per litre equal to the target unit (see [PK-MODELS.md](PK-MODELS.md#1-units)).
- Keep the 1-second simulation step and the 10-second controller interval. Tests depend on them.
- Any push transport works in place of SSE (for example WebSocket or Socket.IO), as long as each screen receives the full state after each change.
