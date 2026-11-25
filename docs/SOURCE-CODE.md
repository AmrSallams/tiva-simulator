# TIVA Simulator: Source Code

Version 0.1.0 · generated 2026-11-22 · 27 files · 4,544 lines

> **For education only. Not for clinical use.** This simulator must never be used to guide real drug dosing.

## How to rebuild the project from this document

1. Install Node.js 18 or newer. No other packages are needed.
2. Create each file below at the path shown in its heading, with exactly the content in its code block.
3. Run `npm test` to check the engine, then `npm start` and open http://localhost:8080.

## Contents

- **Project files**
  - [README.md](#file-readme-md) (71 lines)
  - [package.json](#file-package-json) (12 lines)
  - [server.js](#file-server-js) (171 lines)
- **Simulation engine (src/engine)**
  - [src/engine/infusion.js](#file-src-engine-infusion-js) (210 lines)
  - [src/engine/models.js](#file-src-engine-models-js) (387 lines)
  - [src/engine/pk.js](#file-src-engine-pk-js) (87 lines)
- **Simulation model (src/sim)**
  - [src/sim/patient.js](#file-src-sim-patient-js) (153 lines)
  - [src/sim/pump-unit.js](#file-src-sim-pump-unit-js) (517 lines)
  - [src/sim/station.js](#file-src-sim-station-js) (293 lines)
- **Web pages (public/*.html)**
  - [public/index.html](#file-public-index-html) (53 lines)
  - [public/instructor.html](#file-public-instructor-html) (114 lines)
  - [public/monitor.html](#file-public-monitor-html) (28 lines)
  - [public/pump.html](#file-public-pump-html) (28 lines)
- **Styles (public/css)**
  - [public/css/instructor.css](#file-public-css-instructor-css) (101 lines)
  - [public/css/monitor.css](#file-public-css-monitor-css) (151 lines)
  - [public/css/pump.css](#file-public-css-pump-css) (151 lines)
- **Browser code (public/js)**
  - [public/js/instructor.js](#file-public-js-instructor-js) (208 lines)
  - [public/js/link.js](#file-public-js-link-js) (28 lines)
  - [public/js/monitor/audio.js](#file-public-js-monitor-audio-js) (53 lines)
  - [public/js/monitor/monitor.js](#file-public-js-monitor-monitor-js) (518 lines)
  - [public/js/monitor/vitals.js](#file-public-js-monitor-vitals-js) (80 lines)
  - [public/js/monitor/waveforms.js](#file-public-js-monitor-waveforms-js) (196 lines)
  - [public/js/pump/pump.js](#file-public-js-pump-pump-js) (202 lines)
  - [public/js/trend.js](#file-public-js-trend-js) (168 lines)
- **Tests (test)**
  - [test/engine.test.js](#file-test-engine-test-js) (314 lines)
  - [test/sim.test.js](#file-test-sim-test-js) (118 lines)
- **Tools (tools)**
  - [tools/make-code-doc.js](#file-tools-make-code-doc-js) (132 lines)

## File tree

```text
README.md                             71 lines
package.json                          12 lines
public/css/instructor.css            101 lines
public/css/monitor.css               151 lines
public/css/pump.css                  151 lines
public/index.html                     53 lines
public/instructor.html               114 lines
public/js/instructor.js              208 lines
public/js/link.js                     28 lines
public/js/monitor/audio.js            53 lines
public/js/monitor/monitor.js         518 lines
public/js/monitor/vitals.js           80 lines
public/js/monitor/waveforms.js       196 lines
public/js/pump/pump.js               202 lines
public/js/trend.js                   168 lines
public/monitor.html                   28 lines
public/pump.html                      28 lines
server.js                            171 lines
src/engine/infusion.js               210 lines
src/engine/models.js                 387 lines
src/engine/pk.js                      87 lines
src/sim/patient.js                   153 lines
src/sim/pump-unit.js                 517 lines
src/sim/station.js                   293 lines
test/engine.test.js                  314 lines
test/sim.test.js                     118 lines
tools/make-code-doc.js               132 lines
```

## Project files

<a id="file-readme-md"></a>

### README.md

````markdown
# TIVA simulator

A teaching simulator for total intravenous anaesthesia: a patient monitor, TCI pumps and an instructor remote that share one simulated patient.

**For education only. Not for clinical use.** The drug kinetics use published pump models, but the patient's response to the drugs is a simplified teaching model.

## Starting it

You need [Node.js](https://nodejs.org) 20 or later. Nothing else has to be installed, and no internet is needed.

```bash
npm start
```

Then open `http://localhost:8080` on the same computer. The terminal also prints the address for other devices, for example `http://192.168.1.20:8080`.

## Setting up a workshop

1. Connect the laptop that runs the simulator to the venue Wi-Fi, or to a phone hotspot if there is no Wi-Fi. Internet access is not needed, only a shared network.
2. Run `npm start` and leave the terminal open. Keep the laptop plugged in and stop it from sleeping.
3. Connect each tablet, laptop or phone to the same network and open the address printed in the terminal. The instructor page also shows this address.
4. On each device, type the **station code** and choose a screen:
   - **Patient monitor** for the screen trainees watch.
   - **TCI pumps** for the device trainees operate.
   - **Instructor remote** for your own phone or laptop.

Screens with the same station code share one patient. Use a different code for each station (for example 1, 2, 3 and 4). Up to 12 stations can run at once.

If a device cannot connect, check that it is on the same network as the laptop and that the laptop's firewall allows incoming connections for Node.js. Some guest and hospital Wi-Fi networks block devices from reaching each other; a phone hotspot avoids this.

## Running a case

- Choose the patient type on the instructor remote and press **Start new case**. Tell the trainees the patient's age, weight, height and sex so they can program the pumps.
- Trainees program and start the pumps. The patient's Entropy, blood pressure, heart rate, breathing and saturation respond to the drugs delivered.
- When the patient stops breathing, saturation falls after the preoxygenation time unless you select **Ventilated**.
- Use the event buttons for intubation, incision, ongoing stimulation, bleeding, a disconnected IV line or an occluded pump.
- Set any vital sign yourself at any time. **Auto** hands it back to the model.
- Use the speed buttons to run faster than real time, and **Pause** to stop and discuss.
- Tick **Lock the monitor** to stop trainees changing values on the monitor screen.
- Download the case log from the instructor remote for the debrief.

Each screen has a **Sound** button. Browsers only allow sound after a button has been pressed, so turn it on at each device.

## What is in the simulator

| Part | Details |
|---|---|
| Pump models | Propofol: Marsh, Marsh with fast ke0, Schnider, Eleveld, Paedfusor, Kataria. Remifentanil: Minto, Eleveld. Sufentanil: Gepts. Dexmedetomidine: Hannivoort. Ketamine: Domino. |
| Pump styles | Generic, Alaris PK style, Agilia style, Space style. The brand-style step orders are approximations and should be checked against the real pumps. |
| Monitor | ECG, SpO2, EtCO2, invasive arterial pressure, CVP, respiration, Entropy, temperature, NIBP and NMT, each of which can be added or removed. |
| Patients | Fit adult, frail elderly, obese adult, child, anxious young adult. |

## Known limits

- These constants could not be confirmed against a source and should be checked against a pump manual: the Kataria parameter set, the Paedfusor values for ages 13 to 16, and the sufentanil ke0.
- How far blood pressure, heart rate and breathing move with the drugs is a teaching approximation. The values are in `src/sim/patient.js`.
- The heart rhythm is sinus only, plus asystole at a heart rate of 0.
- Restarting the server clears every station.

## For developers

```bash
npm test
```

- `src/engine` holds the pharmacokinetic models and the TCI controller.
- `src/sim` holds the pump logic, the patient model and the station that ties them together.
- `public` holds the three screens.
- `server.js` serves the pages and runs the stations. Screens receive state over server-sent events and send actions with `POST /api/action`.

The full specification and developer documents are in [`docs/`](docs/README.md).
````

<a id="file-package-json"></a>

### package.json

```json
{
  "name": "tiva-simulator",
  "version": "0.1.0",
  "description": "TIVA / TCI teaching simulator. For education only, not for clinical use.",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node server.js",
    "test": "node --test",
    "docs:code": "node tools/make-code-doc.js"
  }
}
```

<a id="file-server-js"></a>

### server.js

```javascript
// Local web server for the TIVA simulator. No dependencies.
// Run with:  npm start   then open http://localhost:8080
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
//
// The simulation runs here. Each room code ("station") has its own patient and
// pumps. Screens receive the state as a live stream and send actions back:
//   GET  /api/events?s=CODE   live state (server-sent events)
//   POST /api/action?s=CODE   one action as JSON, e.g. {"type":"pumpKey","pump":1,"key":"OK"}
//   GET  /api/log?s=CODE      the case log as a CSV file
//   GET  /api/info            addresses other devices can use, and open stations
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Station } from './src/sim/station.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const MAX_STATIONS = 12;
const TICK_MS = 50;

// URL prefix -> folder on disk
const MOUNTS = [
  ['/engine/', join(ROOT, 'src', 'engine')],
  ['/', join(ROOT, 'public')],
];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ---------- stations ----------

const rooms = new Map(); // code -> { station, clients:Set<response>, debt }

function room(code) {
  const id = String(code || '1').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || '1';
  if (!rooms.has(id)) {
    if (rooms.size >= MAX_STATIONS) throw new Error('Too many stations are open');
    rooms.set(id, { station: new Station(id), clients: new Set(), debt: 0 });
  }
  return rooms.get(id);
}

function broadcast(r) {
  r.sentAt = Date.now();
  if (!r.clients.size) return;
  const message = `data: ${JSON.stringify(r.station.state())}\n\n`;
  for (const res of r.clients) res.write(message);
}

// Simulated time: each station advances `speed` simulated seconds per real second.
setInterval(() => {
  for (const r of rooms.values()) {
    if (r.station.paused) continue;
    r.debt += (TICK_MS / 1000) * r.station.speed;
    let ticked = false;
    while (r.debt >= 1) {
      r.debt -= 1;
      ticked = true;
      try {
        r.station.tick();
      } catch (err) {
        // Never let one station's fault stop the others during a workshop.
        console.error(`Station ${r.station.id}: ${err.stack ?? err}`);
        r.station.paused = true;
        r.station.note(`Simulator fault, paused: ${err.message}`);
        break;
      }
    }
    // At high speed several simulated seconds pass per real second; four
    // screen updates a second is plenty and keeps tablets responsive.
    if (ticked && Date.now() - (r.sentAt ?? 0) >= 240) broadcast(r);
  }
}, TICK_MS);

// ---------- http ----------

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 20000) reject(new Error('Request too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(`http://${net.address}:${PORT}`);
    }
  }
  return out;
}

async function api(req, res, url) {
  if (url.pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ addresses: lanAddresses(), stations: [...rooms.keys()] }));
    return;
  }
  const r = room(url.searchParams.get('s'));
  if (url.pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(r.station.state())}\n\n`);
    r.clients.add(res);
    req.on('close', () => r.clients.delete(res));
    return;
  }
  if (url.pathname === '/api/action' && req.method === 'POST') {
    r.station.action(JSON.parse(await readBody(req)));
    broadcast(r);
    res.writeHead(204).end();
    return;
  }
  if (url.pathname === '/api/log' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tiva-case-log-station-${r.station.id}.csv"`,
    });
    res.end(r.station.logCsv());
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    try {
      await api(req, res, url);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end(err.message);
    }
    return;
  }
  try {
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const [prefix, dir] = MOUNTS.find(([p]) => path.startsWith(p));
    const file = normalize(join(dir, path.slice(prefix.length)));
    if (file !== dir && !file.startsWith(dir + sep)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`TIVA simulator running at http://localhost:${PORT}`);
  for (const address of lanAddresses()) console.log(`Other devices on this network: ${address}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`The simulator is already running on port ${PORT}. Use that one, or stop it first (Ctrl+C in its terminal).`);
    console.error(`To run a second copy, choose another port:  PORT=8081 npm start`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
```

## Simulation engine (src/engine)

<a id="file-src-engine-infusion-js"></a>

### src/engine/infusion.js

```javascript
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
```

<a id="file-src-engine-models-js"></a>

### src/engine/models.js

```javascript
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
```

<a id="file-src-engine-pk-js"></a>

### src/engine/pk.js

```javascript
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
```

## Simulation model (src/sim)

<a id="file-src-sim-patient-js"></a>

### src/sim/patient.js

```javascript
// The simulated patient: how vital signs and entropy respond to the drugs
// actually delivered, to surgical stimulation and to instructor events.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
//
// The drug kinetics use the published pump models. The RESPONSE to the drugs
// (blood pressure, heart rate, breathing, saturation) is a simplified teaching
// model with plausible directions and sizes, not a validated physiological one.
// The hypnosis surface follows Bouillon et al., Anesthesiology 2004;100:1353-72
// (propofol C50 4.47 mcg/mL, remifentanil C50 19.3 ng/mL, additive, slope 1.43).

import { advance, emptyState } from '../engine/pk.js';

export const PRESETS = {
  adult: { name: 'Fit adult (40 y, 70 kg, 170 cm, male)', hr: 72, sys: 124, dia: 76, rr: 13, spo2: 99, temp: 36.7,
    hypnoticSens: 1, hypotensionSens: 1, safeApnoea: 240, ventRate: 12 },
  elderly: { name: 'Frail elderly (82 y, 58 kg, 160 cm, female)', hr: 68, sys: 152, dia: 78, rr: 15, spo2: 96, temp: 36.3,
    hypnoticSens: 1.4, hypotensionSens: 1.7, safeApnoea: 120, ventRate: 12 },
  obese: { name: 'Obese adult (45 y, 130 kg, 170 cm, male)', hr: 84, sys: 142, dia: 86, rr: 16, spo2: 96, temp: 36.8,
    hypnoticSens: 1, hypotensionSens: 1.1, safeApnoea: 75, ventRate: 14 },
  child: { name: 'Child (6 y, 20 kg, 115 cm, male)', hr: 102, sys: 98, dia: 58, rr: 22, spo2: 99, temp: 36.9,
    hypnoticSens: 0.8, hypotensionSens: 0.8, safeApnoea: 60, ventRate: 20 },
  anxious: { name: 'Anxious young adult (24 y, 65 kg, 168 cm, female)', hr: 98, sys: 136, dia: 84, rr: 18, spo2: 99, temp: 36.8,
    hypnoticSens: 0.75, hypotensionSens: 0.8, safeApnoea: 240, ventRate: 12 },
};

export const STIM_LEVELS = { none: 0, light: 2, moderate: 4, strong: 7 };

const lag = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));
const sat = (x, half) => (x <= 0 ? 0 : x / (x + half));

export class Patient {
  constructor(presetId = 'adult') {
    this.presetId = PRESETS[presetId] ? presetId : 'adult';
    const P = (this.preset = PRESETS[this.presetId]);
    this.lines = new Map(); // one drug store per programmed infusion
    this.stimLevel = 0; // sustained surgical stimulation, 0 to 10
    this.stimPulse = 0; // short-lived stimulation (intubation, incision)
    this.ventilated = false;
    this.preoxygenated = true;
    this.ventilatedFor = 0;
    this.apnoeaTime = 0;
    this.bleeding = false;
    this.deficit = 0; // blood volume lost, 0 to 0.8
    this.pressor = 0; // vasopressor effect, decays
    this.chrono = 0; // anticholinergic effect, decays
    this.paco2 = 5.2;
    this.v = { hr: P.hr, spo2: P.spo2, sys: P.sys, dia: P.dia, etco2: 4.9, rr: P.rr, temp: P.temp,
      se: 89, re: 98, cvp: 8, tofCount: 4, tofRatio: 100 };
  }

  /** Patient plasma and effect-site concentration of each drug. */
  levels() {
    const out = {};
    for (const line of this.lines.values()) {
      const cp = line.state[0] / line.model.v1;
      const ce = line.model.ke0 == null ? cp : line.state[3];
      const d = (out[line.drug] ??= { cp: 0, ce: 0 });
      d.cp += cp;
      d.ce += ce;
    }
    return out;
  }

  /**
   * Advance one or more seconds.
   * @param {{infusion: object, drug: string, rate: number}[]} deliveries
   *   what each pump actually delivered into the patient (dose units per minute)
   */
  step(deliveries, dt = 1) {
    // --- drug kinetics ---
    const rates = new Map();
    for (const d of deliveries) {
      if (!this.lines.has(d.infusion)) {
        this.lines.set(d.infusion, { drug: d.drug, model: d.infusion.model, stepper: d.infusion.second, state: emptyState() });
      }
      rates.set(d.infusion, d.rate);
    }
    for (const [key, line] of this.lines) {
      for (let i = 0; i < dt; i++) line.state = advance(line.stepper, line.state, rates.get(key) ?? 0);
    }

    const P = this.preset;
    const v = this.v;
    const c = this.levels();
    const ce = (drug) => c[drug]?.ce ?? 0;
    const prop = ce('propofol') * P.hypnoticSens;
    const opioid = ce('remifentanil') + 12 * ce('sufentanil'); // remifentanil-equivalent ng/mL (rough potency)
    const dex = ce('dexmedetomidine');
    const ket = ce('ketamine');

    // --- hypnosis and stimulation ---
    const u = prop / 4.47 + opioid / 19.3 + dex / 2.5;
    const hyp = u ** 1.43 / (1 + u ** 1.43); // 0 awake, 1 very deep
    const analgesia = sat(opioid + 3 * ket, 3);
    this.stimPulse *= Math.exp(-dt / 120);
    const stim = Math.min(10, this.stimLevel + this.stimPulse) * (1 - analgesia) * (1 - 0.4 * hyp);

    const seTarget = Math.min(91, 91 * (1 - hyp) + 3 * stim + 8 * sat(ket, 0.5) * hyp);
    const reTarget = Math.min(100, seTarget + 2 + 7 * (seTarget / 91) ** 2 + 1.2 * stim);

    // --- circulation ---
    if (this.bleeding) this.deficit = Math.min(0.8, this.deficit + dt / 600);
    this.pressor *= Math.exp(-dt / 240);
    this.chrono *= Math.exp(-dt / 300);
    const x = (prop / 4.5) ** 1.5;
    const drop = Math.min(0.7, P.hypotensionSens * ((0.4 * x) / (1 + x) + 0.15 * sat(opioid, 5) + 0.15 * sat(dex, 1)));
    const sysTarget =
      P.sys * (1 - drop) * (1 + 0.035 * stim) * (1 - 0.5 * this.deficit) * (1 + 0.3 * this.pressor) * (1 + 0.15 * sat(ket, 1));
    let hrTarget =
      P.hr * (1 - 0.22 * sat(opioid, 6)) * (1 - 0.25 * sat(dex, 1.2)) * (1 - 0.08 * hyp) * (1 + 0.04 * stim) *
      (1 + 0.7 * this.deficit) * (1 + 0.35 * this.chrono) * (1 + 0.15 * sat(ket, 1));
    if (v.spo2 < 70) hrTarget *= 0.6 + 0.4 * Math.max(0, (v.spo2 - 40) / 30); // severe hypoxia slows the heart

    // --- breathing ---
    const depress = (opioid / 1.5) * (1 + prop / 3) + prop / 8 + dex / 20;
    const effort = 1 - (depress ** 2.5 / (1 + depress ** 2.5)) * (1 - 0.03 * stim);
    let rrSpont = P.rr * effort;
    if (rrSpont < 4) rrSpont = 0;
    const rrTarget = this.ventilated ? P.ventRate : rrSpont;
    v.rr = rrTarget === 0 ? 0 : lag(Math.max(v.rr, 3), rrTarget, dt, 8);
    const apnoea = v.rr === 0;

    this.ventilatedFor = this.ventilated ? this.ventilatedFor + dt : 0;
    if (this.ventilatedFor > 60) this.preoxygenated = true;
    if (apnoea) {
      this.apnoeaTime += dt;
      const safe = this.preoxygenated ? P.safeApnoea : P.safeApnoea * 0.25;
      if (this.apnoeaTime > safe) {
        const over = this.apnoeaTime - safe;
        v.spo2 = Math.max(40, v.spo2 - Math.min(0.6, 0.05 + over * 0.004) * dt);
        this.preoxygenated = false;
      }
      this.paco2 = Math.min(11, this.paco2 + (0.45 / 60) * dt);
    } else {
      this.apnoeaTime = 0;
      const spo2Target = this.ventilated ? Math.max(P.spo2, 99) : P.spo2 - 7 * (1 - effort) ** 2;
      v.spo2 = lag(v.spo2, spo2Target, dt, 15);
      const paco2Target = this.ventilated ? 4.9 : Math.min(9, 5.2 / Math.max(0.35, effort) ** 0.6);
      this.paco2 = lag(this.paco2, paco2Target, dt, this.ventilated ? 90 : 120);
    }
    v.etco2 = apnoea ? 0 : this.paco2 - 0.3;

    // --- lagged outputs ---
    v.se = lag(v.se, seTarget, dt, 8);
    v.re = Math.max(v.se, lag(v.re, reTarget, dt, 6));
    v.sys = lag(v.sys, sysTarget, dt, 25);
    v.dia = P.dia * (v.sys / P.sys) ** 0.9;
    v.hr = lag(v.hr, hrTarget, dt, 12);
    v.cvp = lag(v.cvp, 8 * (1 - this.deficit), dt, 60);
    if (hyp > 0.4) v.temp = Math.max(34.5, v.temp - (0.5 / 3600) * dt);
    return v;
  }
}
```

<a id="file-src-sim-pump-unit-js"></a>

### src/sim/pump-unit.js

```javascript
// One syringe pump on screen: the programming steps, the running display and
// the alarms. The drug calculations come from the engine.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { DRUGS, MODELS, modelsForDrug, validatePatient, buildModel } from '../engine/models.js';
import { Infusion } from '../engine/infusion.js';

// Per-drug display details. Label colours follow the usual syringe-label
// convention (induction agents yellow, opioids blue).
const DRUG_UI = {
  propofol: { step: 0.1, decimals: 1, color: '#ffd84d', perKg: ['mg/kg/h', (r, w) => (r * 60) / w], decrement: 1.5, bolus: 20 },
  remifentanil: { step: 0.1, decimals: 1, color: '#6cb6ff', perKg: ['mcg/kg/min', (r, w) => r / w], decrement: 1.0, bolus: 20 },
  sufentanil: { step: 0.01, decimals: 2, color: '#6cb6ff', perKg: ['mcg/kg/h', (r, w) => (r * 60) / w], decrement: 0.1, bolus: 5 },
  dexmedetomidine: { step: 0.1, decimals: 1, color: '#ffab66', perKg: ['mcg/kg/h', (r, w) => (r * 60) / w], decrement: 0.2, bolus: 10 },
  ketamine: { step: 0.05, decimals: 2, color: '#ffd84d', perKg: ['mg/kg/h', (r, w) => (r * 60) / w], decrement: 0.1, bolus: 10 },
};

// The four pump styles. Each has its own order of programming steps, order of
// patient questions, wording and keypad. The brand-style sequences are
// approximations for teaching and should be checked against the real pumps.
export const STYLES = {
  generic: {
    name: 'Generic TCI pump',
    steps: ['drug', 'concentration', 'syringe', 'model', 'patient', 'mode', 'target', 'confirm'],
    patientOrder: ['age', 'weight', 'height', 'sex'],
    words: { start: 'Start', stop: 'Stop', hold: 'PAUSED', running: 'INFUSING', menu: 'Menu', back: 'Back', ok: 'OK' },
    keys: [
      [['BIGDOWN', '− −'], ['DOWN', '−'], ['UP', '+'], ['BIGUP', '+ +']],
      [['START', 'Start', 'go'], ['STOP', 'Stop', 'stop'], ['BOLUS', 'Bolus'], ['MENU', 'Menu']],
    ],
    tapToSelect: true,
  },
  alaris: {
    name: 'Alaris PK style',
    steps: ['drugModel', 'concentration', 'patient', 'syringe', 'mode', 'target', 'confirm'],
    patientOrder: ['age', 'height', 'weight', 'sex'],
    words: { start: 'RUN', stop: 'HOLD', hold: 'ON HOLD', running: 'INFUSING', menu: 'OPTIONS', back: 'BACK', ok: 'OK' },
    keys: [
      [['BIGUP', '⏶⏶'], ['UP', '⏶'], ['DOWN', '⏷'], ['BIGDOWN', '⏷⏷']],
      [['START', 'RUN', 'go'], ['STOP', 'HOLD', 'stop'], ['BOLUS', 'PURGE / BOLUS'], ['MENU', 'OPTIONS']],
    ],
  },
  agilia: {
    name: 'Agilia style',
    steps: ['syringe', 'drug', 'concentration', 'patient', 'model', 'mode', 'target', 'confirm'],
    patientOrder: ['sex', 'age', 'height', 'weight'],
    words: { start: 'START', stop: 'STOP', hold: 'STOPPED', running: 'INFUSION', menu: 'MENU', back: 'C', ok: 'OK' },
    keys: [
      [['BIGUP', '▲▲'], ['UP', '▲'], ['DOWN', '▼'], ['BIGDOWN', '▼▼']],
      [['START', 'START', 'go'], ['STOP', 'STOP', 'stop'], ['BOLUS', 'BOLUS'], ['MENU', 'MENU']],
    ],
  },
  space: {
    name: 'Space style',
    steps: ['syringe', 'drug', 'concentration', 'patient', 'model', 'mode', 'target', 'confirm'],
    patientOrder: ['weight', 'height', 'age', 'sex'],
    words: { start: 'START', stop: 'STOP', hold: 'STOPPED', running: 'RUNNING', menu: 'MENU', back: 'C', ok: 'OK' },
    keys: [
      [['LEFT', '◀'], ['UP', '▲'], ['DOWN', '▼'], ['RIGHT', '▶']],
      [['STARTSTOP', 'START / STOP', 'go'], ['BOLUS', 'BOL'], ['MENU', 'MENU']],
    ],
    digitCursor: true, // left/right choose which digit the up/down keys change
  },
};

const PATIENT_FIELDS = {
  age: { title: 'Age', unit: 'years', min: 1, max: 100, step: 1, decimals: 0 },
  weight: { title: 'Weight', unit: 'kg', min: 5, max: 200, step: 1, decimals: 0 },
  height: { title: 'Height', unit: 'cm', min: 50, max: 220, step: 1, decimals: 0 },
};
const MODE_NAMES = { effect: 'Effect-site TCI', plasma: 'Plasma TCI', manual: 'Manual (mL/h)' };
const SYRINGES = [20, 50, 60];
const PURGE_ML = 2;

const round = (v, decimals) => Number(v.toFixed(decimals));
const clock = (s) => {
  if (!Number.isFinite(s)) return '--:--';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

/** Dose and duration of the initial loading phase for a planned TCI. */
function previewInduction(model, concentration, mode, target) {
  const p = new Infusion({ model, concentration });
  p.setTarget(mode, target);
  p.tick(1);
  const first = p.deliveredRate;
  if (!(first > 0)) return null;
  let t = 1;
  while (t < 900 && p.deliveredRate >= first * 0.5) {
    p.tick(1);
    t++;
  }
  return { dose: p.totalDose, seconds: t };
}

export class PumpUnit {
  /** @param {(text: string) => void} [onEvent]  receives a line for the case log */
  constructor(styleId = 'generic', onEvent = () => {}) {
    this.styleId = styleId;
    this.onEvent = onEvent;
    this.occluded = false;
    this.powerOff();
  }

  get style() {
    return STYLES[this.styleId];
  }

  setStyle(styleId) {
    this.styleId = styleId;
    if (this.on && !this.infusion) this.#goto(0); // restart programming in the new order
  }

  powerOff() {
    this.on = false;
    this.infusion = null;
    this.cfg = { drug: 'propofol', concentration: 10, syringeMl: 50, modelId: null, mode: null, target: null,
      patient: { age: 40, weight: 70, height: 170, sex: 'male' } };
    this.pos = 0;
    this.view = null;
    this.alarm = null;
    this.alarmAcked = false;
    this.held = false;
    this.pending = null;
    this.message = null;
    this.syringeUsedAtChange = 0;
    this.purged = 0;
  }

  powerOn() {
    if (this.on) return;
    this.on = true;
    this.#goto(0);
  }

  // ---------- programming steps ----------

  // The full list of steps, with the patient questions expanded.
  #flow() {
    const out = [];
    const steps = this.style.steps;
    for (const step of steps) {
      if (step !== 'patient') {
        out.push(step);
        continue;
      }
      const modelFirst = steps.indexOf('patient') > Math.max(steps.indexOf('model'), steps.indexOf('drugModel'));
      const needs = modelFirst && this.cfg.modelId
        ? new Set([...MODELS[this.cfg.modelId].needs, 'age', 'weight'])
        : new Set(['age', 'weight', 'height', 'sex']);
      for (const f of this.style.patientOrder) if (needs.has(f)) out.push(`p:${f}`);
    }
    return out;
  }

  #goto(pos) {
    const flow = this.#flow();
    this.pos = Math.max(0, Math.min(flow.length - 1, pos));
    this.view = this.#viewFor(flow[this.pos]);
  }

  #next() {
    const flow = this.#flow();
    const step = flow[this.pos];
    // Once both the model and the patient are known, check the model accepts the patient.
    const patientDone = !flow.slice(this.pos + 1).some((s) => s.startsWith('p:'));
    const justFinished = step.startsWith('p:') || step === 'model' || step === 'drugModel';
    if (this.cfg.modelId && patientDone && justFinished) {
      const errors = validatePatient(this.cfg.modelId, this.cfg.patient);
      if (errors.length) {
        this.view = { type: 'error', title: `${MODELS[this.cfg.modelId].name}: not available`, lines: errors };
        return;
      }
    }
    this.#goto(this.pos + 1);
  }

  #list(title, options, current, onOk) {
    const index = Math.max(0, options.findIndex((o) => o.value === current));
    return { type: 'list', title, options, index, onOk };
  }

  #viewFor(step) {
    const cfg = this.cfg;
    const drug = DRUGS[cfg.drug];
    switch (step) {
      case 'drug':
        return this.#list('Select drug', Object.entries(DRUGS).map(([value, d]) => ({ value, label: d.name })), cfg.drug, (v) => {
          if (v !== cfg.drug) {
            cfg.drug = v;
            cfg.modelId = null;
            cfg.concentration = DRUGS[v].concentrations[0];
            cfg.target = null;
          }
        });
      case 'drugModel':
        return this.#list('Select drug and model',
          Object.entries(MODELS).map(([value, m]) => ({ value, label: `${DRUGS[m.drug].name} ${m.name}` })),
          cfg.modelId, (v) => {
            if (MODELS[v].drug !== cfg.drug) {
              cfg.drug = MODELS[v].drug;
              cfg.concentration = DRUGS[cfg.drug].concentrations[0];
              cfg.target = null;
            }
            cfg.modelId = v;
          });
      case 'concentration':
        return this.#list(`${drug.name} concentration`,
          drug.concentrations.map((c) => ({ value: c, label: `${c} ${drug.doseUnit}/mL${cfg.drug === 'propofol' ? ` (${c / 10}%)` : ''}` })),
          cfg.concentration, (v) => (cfg.concentration = v));
      case 'syringe':
        return this.#list('Confirm syringe', SYRINGES.map((v) => ({ value: v, label: `${v} mL syringe` })), cfg.syringeMl, (v) => (cfg.syringeMl = v));
      case 'model':
        return this.#list(`${drug.name} model`,
          modelsForDrug(cfg.drug).map((value) => ({ value, label: MODELS[value].name, sub: MODELS[value].plasmaOnly ? 'plasma only' : '' })),
          cfg.modelId, (v) => (cfg.modelId = v));
      case 'p:sex':
        return this.#list('Patient sex', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], cfg.patient.sex, (v) => (cfg.patient.sex = v));
      case 'mode': {
        const model = buildModel(cfg.modelId, cfg.patient);
        const options = ['effect', 'plasma', 'manual']
          .filter((m) => m !== 'effect' || model.effectSiteTargeting)
          .map((value) => ({ value, label: MODE_NAMES[value] }));
        return this.#list('Infusion mode', options, cfg.mode, (v) => {
          if (v !== cfg.mode) cfg.target = null;
          cfg.mode = v;
        });
      }
      case 'target':
        return this.#number(this.#targetSpec(), cfg.target, (v) => (cfg.target = v));
      case 'confirm':
        return { type: 'confirm' };
      default: {
        const field = step.slice(2);
        return this.#number(PATIENT_FIELDS[field], cfg.patient[field], (v) => (cfg.patient[field] = v));
      }
    }
  }

  // What the up/down keys edit: a TCI target or a manual rate.
  #targetSpec() {
    const { drug, mode } = this.cfg;
    const ui = DRUG_UI[drug];
    if (mode === 'manual') {
      return { title: 'Infusion rate', unit: 'mL/h', min: 0, max: 1200, step: 0.1, decimals: 1, initial: 10 };
    }
    return {
      title: mode === 'effect' ? 'Effect-site target (Cet)' : 'Plasma target (Cpt)',
      unit: DRUGS[drug].targetUnit, min: 0, max: DRUGS[drug].maxTarget, step: ui.step, decimals: ui.decimals,
      initial: DRUGS[drug].defaultTarget,
    };
  }

  #number(spec, current, onOk) {
    return { type: 'number', ...spec, value: current ?? spec.initial, cursor: spec.step, onOk };
  }

  #adjust(view, key) {
    if (key === 'LEFT') view.cursor = Math.min(view.cursor * 10, view.step * 100);
    else if (key === 'RIGHT') view.cursor = Math.max(view.cursor / 10, view.step);
    else {
      const unit = this.style.digitCursor ? view.cursor : view.step;
      const delta = { UP: unit, DOWN: -unit, BIGUP: unit * 10, BIGDOWN: -unit * 10 }[key] ?? 0;
      view.value = round(Math.min(view.max, Math.max(view.min, view.value + delta)), view.decimals);
    }
  }

  // ---------- keys ----------

  key(key) {
    if (!this.on) return;
    this.message = null;
    if (key === 'STARTSTOP') {
      key = this.infusion && !this.held && this.view.type === 'run' ? 'STOP' : 'START';
    }
    if (this.alarm && !this.alarmAcked && (key === 'OK' || key === 'BACK')) {
      this.alarmAcked = true;
      return;
    }
    const view = this.view;
    const handler = {
      list: () => {
        if (key === 'UP' || key === 'BIGUP') view.index = (view.index + view.options.length - 1) % view.options.length;
        else if (key === 'DOWN' || key === 'BIGDOWN') view.index = (view.index + 1) % view.options.length;
        else if (key === 'OK') {
          view.onOk(view.options[view.index].value);
          if (!view.stay) this.#next();
        } else if (key === 'BACK') this.#back();
      },
      number: () => {
        if (key === 'OK') {
          view.onOk(view.value);
          if (!view.stay) this.#next();
        } else if (key === 'BACK') this.#back();
        else this.#adjust(view, key);
      },
      error: () => {
        if (key === 'OK' || key === 'BACK') this.#goto(this.pos);
      },
      confirm: () => {
        if (key === 'START') this.#start();
        else if (key === 'BACK') this.#back();
        else if (key === 'OK') this.message = `Press ${this.style.words.start} to begin`;
      },
      run: () => this.#runKey(key),
    }[view.type];
    handler?.();
  }

  /** Choose a list item directly (touch-style pumps). */
  select(index) {
    if (this.view?.type !== 'list' || !this.style.tapToSelect) return;
    this.view.index = index;
    this.key('OK');
  }

  #back() {
    if (this.infusion) this.view = { type: 'run' };
    else this.#goto(this.pos - 1);
  }

  #start() {
    const cfg = this.cfg;
    const model = buildModel(cfg.modelId, cfg.patient);
    this.infusion = new Infusion({ model, concentration: cfg.concentration });
    this.#applyTarget(cfg.target);
    this.held = false;
    this.view = { type: 'run' };
    this.onEvent(`Started ${DRUGS[cfg.drug].name} ${cfg.concentration} ${DRUGS[cfg.drug].doseUnit}/mL, ${model.name}, ${this.#targetText()}`);
  }

  #targetText() {
    const { mode, target, drug } = this.cfg;
    return mode === 'manual' ? `manual ${target} mL/h` : `${MODE_NAMES[mode]} target ${target} ${DRUGS[drug].targetUnit}`;
  }

  /** Instructor event: block or unblock the line. A blocked pump alarms and stops. */
  setOcclusion(on) {
    this.occluded = on;
    if (on && this.infusion) {
      this.infusion.pause();
      this.held = true;
      this.#raise('OCCLUSION');
    } else if (!on && this.alarm === 'OCCLUSION') {
      this.alarm = null;
      this.message = `Occlusion cleared: press ${this.style.words.start}`;
    }
  }

  #applyTarget(value) {
    this.cfg.target = value;
    if (this.cfg.mode === 'manual') this.infusion.setManualRateMlH(value);
    else this.infusion.setTarget(this.cfg.mode, value);
  }

  #runKey(key) {
    const inf = this.infusion;
    const words = this.style.words;
    if (['UP', 'DOWN', 'BIGUP', 'BIGDOWN', 'LEFT', 'RIGHT'].includes(key)) {
      this.pending ??= { ...this.#targetSpec(), value: this.cfg.target };
      this.pending.cursor ??= this.pending.step;
      this.#adjust(this.pending, key);
    } else if (key === 'OK' && this.pending) {
      this.#applyTarget(this.pending.value);
      this.pending = null;
      this.onEvent(`Changed to ${this.#targetText()}`);
    } else if (key === 'BACK') {
      this.pending = null;
    } else if (key === 'STOP') {
      inf.pause();
      this.held = true;
      this.onEvent('Infusion stopped by user');
    } else if (key === 'START') {
      if (this.alarm === 'END OF SYRINGE') this.message = 'Fit a new syringe first (menu)';
      else if (this.occluded) this.message = 'Line is occluded: check the line';
      else if (this.held) {
        inf.resume();
        this.held = false;
        this.onEvent('Infusion restarted');
      }
    } else if (key === 'BOLUS') {
      if (this.cfg.mode !== 'manual') this.message = 'No bolus in TCI: raise the target';
      else if (this.held) this.message = `Press ${words.start} before giving a bolus`;
      else {
        const drug = DRUGS[this.cfg.drug];
        this.view = { type: 'number', title: 'Bolus dose', unit: drug.doseUnit, min: 1, max: 500, step: 1, decimals: 0,
          value: DRUG_UI[this.cfg.drug].bolus, cursor: 1, stay: true,
          onOk: (v) => {
            inf.bolus(v);
            this.onEvent(`Bolus ${v} ${drug.doseUnit}`);
            this.view = { type: 'run' };
          } };
      }
    } else if (key === 'MENU') {
      const options = [{ value: 'syringe', label: 'New syringe' }];
      if (this.held) options.push({ value: 'purge', label: `Purge line (${PURGE_ML} mL)` });
      options.push({ value: 'resume', label: 'Return to infusion' }, { value: 'off', label: 'End case and power off' });
      this.view = { type: 'list', title: words.menu, options, index: 0, stay: true, onOk: (v) => this.#menu(v) };
    }
  }

  #menu(choice) {
    this.view = { type: 'run' };
    if (choice === 'syringe') {
      this.syringeUsedAtChange = this.infusion.volumeMl;
      this.purged = 0;
      this.alarm = null;
      this.alarmAcked = false;
      this.message = 'New syringe fitted';
      this.onEvent('New syringe fitted');
    } else if (choice === 'purge') {
      this.purged += PURGE_ML;
      this.message = `Purged ${PURGE_ML} mL (not given to patient)`;
      this.onEvent(`Purged ${PURGE_ML} mL`);
    } else if (choice === 'off') {
      this.onEvent('Pump switched off');
      this.powerOff();
    }
  }

  // ---------- time ----------

  get syringeLeft() {
    if (!this.infusion) return this.cfg.syringeMl;
    return Math.max(0, this.cfg.syringeMl - (this.infusion.volumeMl - this.syringeUsedAtChange) - this.purged);
  }

  /** Advance by simulated seconds. */
  tick(seconds = 1) {
    const inf = this.infusion;
    if (!inf) return;
    if (this.occluded && !this.held) this.setOcclusion(true);
    for (let i = 0; i < seconds; i++) {
      inf.tick(1);
      const left = this.syringeLeft;
      if (left <= 0 && this.alarm !== 'END OF SYRINGE') {
        inf.pause();
        this.held = true;
        this.#raise('END OF SYRINGE');
      } else if (left > 0 && !this.alarm && !this.held) {
        const minutesLeft = inf.rateMlH > 0 ? left / (inf.rateMlH / 60) : Infinity;
        // The 20% condition stops the fast induction bolus from triggering the warning.
        const nearlyEmpty = left <= this.cfg.syringeMl * 0.2 && minutesLeft <= 5;
        if (nearlyEmpty || left <= 2) this.#raise('NEAR END OF SYRINGE');
      }
    }
  }

  #raise(alarm) {
    this.alarm = alarm;
    this.alarmAcked = false;
    this.onEvent(`Pump alarm: ${alarm}`);
  }

  /** True while an alarm is sounding (not yet acknowledged with OK). */
  get alarmSounding() {
    return this.on && this.alarm != null && !this.alarmAcked;
  }

  // ---------- what to show ----------

  /** Plain data describing the current screen, for the page to draw. */
  screen() {
    const words = this.style.words;
    const cfg = this.cfg;
    const drug = DRUGS[cfg.drug];
    const base = { on: this.on, color: DRUG_UI[cfg.drug].color, alarm: this.alarm, alarmAcked: this.alarmAcked, message: this.message, words };
    if (!this.on) return { ...base, type: 'off' };
    const view = this.view;
    const flow = this.#flow();
    const progress = this.infusion ? null : `${this.pos + 1}/${flow.length}`;
    if (view.type === 'list') return { ...base, type: 'list', title: view.title, options: view.options, index: view.index, progress };
    if (view.type === 'number') {
      return { ...base, type: 'number', title: view.title, unit: view.unit, value: view.value.toFixed(view.decimals), progress,
        cursor: this.style.digitCursor ? view.cursor : null };
    }
    if (view.type === 'error') return { ...base, type: 'error', title: view.title, lines: view.lines };

    const model = MODELS[cfg.modelId];
    const header = `${drug.name} ${cfg.concentration} ${drug.doseUnit}/mL`;
    const sub = `${model.name} · ${MODE_NAMES[cfg.mode]}`;
    const p = cfg.patient;
    const patient = `${p.age} y · ${p.weight} kg${model.needs.includes('height') ? ` · ${p.height} cm · ${p.sex}` : ''}`;
    const tDec = cfg.mode === 'manual' ? 1 : DRUG_UI[cfg.drug].decimals;
    const targetLabel = cfg.mode === 'manual' ? 'Rate' : cfg.mode === 'effect' ? 'Target Cet' : 'Target Cpt';
    const targetUnit = cfg.mode === 'manual' ? 'mL/h' : drug.targetUnit;

    if (view.type === 'confirm') {
      let induction = null;
      if (cfg.mode !== 'manual' && cfg.target > 0) {
        const pre = previewInduction(buildModel(cfg.modelId, p), cfg.concentration, cfg.mode, cfg.target);
        if (pre) induction = `${pre.dose.toFixed(pre.dose < 10 ? 1 : 0)} ${drug.doseUnit} over ${clock(pre.seconds)}`;
      }
      return { ...base, type: 'confirm', header, sub, patient, progress, syringe: `${cfg.syringeMl} mL syringe`,
        target: `${targetLabel} ${cfg.target.toFixed(tDec)} ${targetUnit}`, induction };
    }

    const inf = this.infusion;
    const [perKgUnit, perKg] = DRUG_UI[cfg.drug].perKg;
    const decLevel = DRUG_UI[cfg.drug].decrement;
    const cDec = Math.max(2, DRUG_UI[cfg.drug].decimals);
    return {
      ...base, type: 'run', header, sub, patient,
      state: this.held ? words.hold : words.running, held: this.held,
      targetLabel, targetUnit, target: cfg.target.toFixed(tDec),
      pending: this.pending ? this.pending.value.toFixed(tDec) : null,
      cp: inf.cp.toFixed(cDec), ce: inf.ce == null ? null : inf.ce.toFixed(cDec), concUnit: drug.targetUnit,
      rate: inf.rateMlH.toFixed(1), perKg: `${perKg(inf.deliveredRate, p.weight).toFixed(2)} ${perKgUnit}`,
      volume: inf.volumeMl.toFixed(1), dose: `${inf.totalDose.toFixed(inf.totalDose < 100 ? 1 : 0)} ${drug.doseUnit}`,
      elapsed: clock(inf.timeS),
      syringeLeft: this.syringeLeft.toFixed(1), syringeFraction: this.syringeLeft / cfg.syringeMl,
      decrement: `Time to ${decLevel}: ${clock(inf.decrementTime(decLevel))}`,
    };
  }
}
```

<a id="file-src-sim-station-js"></a>

### src/sim/station.js

```javascript
// One simulation station: a patient, its pumps, the monitor settings and the
// instructor controls. The server keeps one Station per room code and every
// screen in that room shows the same state.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { PumpUnit, STYLES } from './pump-unit.js';
import { Patient, PRESETS, STIM_LEVELS } from './patient.js';

const DEFAULT_MODULES = ['ecg', 'spo2', 'co2', 'art', 'resp', 'entropy', 'temp', 'nibp'];
const SPEEDS = [1, 2, 5, 10];
const MAX_PUMPS = 4;
const HISTORY_EVERY_S = 15;
const HISTORY_MAX = 480;

const stamp = (s) =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export class Station {
  constructor(id) {
    this.id = id;
    this.styleId = 'generic';
    this.monitorLocked = false;
    this.trendShow = { cp: true, ce: true, rate: true }; // which lines the trend graph draws
    this.modules = [...DEFAULT_MODULES];
    this.reset('adult');
  }

  reset(presetId) {
    this.patient = new Patient(presetId);
    this.simTime = 0;
    this.speed = 1;
    this.paused = false;
    this.overrides = {};
    this.lineConnected = true;
    this.showTrend = false;
    this.log = [];
    this.history = [];
    this.volumeSinceSample = {}; // mL pumped per drug since the last history point
    this.pumps = [];
    this.nextPumpId = 1;
    this.addPump();
    this.addPump();
    this.note(`New case: ${this.patient.preset.name}`);
  }

  note(text) {
    this.log.push({ t: this.simTime, time: stamp(this.simTime), text });
    if (this.log.length > 1000) this.log.shift();
  }

  addPump() {
    if (this.pumps.length >= MAX_PUMPS) return;
    const id = this.nextPumpId++;
    this.pumps.push({ id, unit: new PumpUnit(this.styleId, (text) => this.note(`Pump ${id}: ${text}`)) });
  }

  /** Advance one simulated second. */
  tick() {
    if (this.paused) return;
    this.simTime++;
    const deliveries = [];
    for (const p of this.pumps) {
      p.unit.tick(1);
      const infusion = p.unit.infusion;
      if (infusion) {
        const drug = p.unit.cfg.drug;
        this.volumeSinceSample[drug] = (this.volumeSinceSample[drug] ?? 0) + infusion.rateMlH / 3600;
        deliveries.push({ infusion, drug: p.unit.cfg.drug, rate: this.lineConnected ? infusion.deliveredRate : 0 });
      }
    }
    this.patient.step(deliveries, 1);
    if (this.simTime % HISTORY_EVERY_S === 0) {
      const ce = {};
      const cp = {};
      const rate = {}; // mL/h, averaged over the sample interval
      for (const [drug, level] of Object.entries(this.patient.levels())) {
        ce[drug] = Number(level.ce.toFixed(3));
        cp[drug] = Number(level.cp.toFixed(3));
        rate[drug] = Number((((this.volumeSinceSample[drug] ?? 0) * 3600) / HISTORY_EVERY_S).toFixed(1));
      }
      this.volumeSinceSample = {};
      this.history.push({ t: this.simTime, ce, cp, rate, se: Math.round(this.vitals().se) });
      if (this.history.length > HISTORY_MAX) this.history.shift();
    }
  }

  /** Vital signs as shown on the monitor: the model, unless the instructor has overridden a value. */
  vitals() {
    const out = { ...this.patient.v };
    for (const [key, o] of Object.entries(this.overrides)) {
      const done = o.duration <= 0 ? 1 : Math.min(1, (this.simTime - o.start) / o.duration);
      out[key] = o.from + (o.to - o.from) * done;
    }
    if (out.dia > out.sys - 5) out.dia = Math.max(0, out.sys - 5);
    if (out.re < out.se) out.re = out.se;
    return out;
  }

  /** Everything the screens need. Sent to every screen in the room after each change. */
  state() {
    const levels = this.patient.levels();
    const pt = this.patient;
    return {
      station: this.id,
      simTime: this.simTime,
      clock: stamp(this.simTime),
      speed: this.speed,
      paused: this.paused,
      vitals: this.vitals(),
      modules: this.modules,
      styleId: this.styleId,
      showTrend: this.showTrend,
      monitorLocked: this.monitorLocked,
      trendShow: this.trendShow,
      history: this.history,
      pumps: this.pumps.map((p) => ({
        id: p.id,
        styleId: p.unit.styleId,
        styleName: p.unit.style.name,
        keys: p.unit.style.keys,
        tapToSelect: !!p.unit.style.tapToSelect,
        screen: p.unit.screen(),
        alarmSounding: p.unit.alarmSounding,
        occluded: p.unit.occluded,
        infusing: p.unit.infusion != null,
        drug: p.unit.infusion ? p.unit.cfg.drug : null,
        pumpCe: p.unit.infusion ? p.unit.infusion.ce ?? p.unit.infusion.cp : null,
      })),
      // For the instructor screen only
      instructor: {
        preset: pt.presetId,
        model: pt.v,
        overridden: Object.keys(this.overrides),
        levels,
        stimLevel: Object.keys(STIM_LEVELS).find((k) => STIM_LEVELS[k] === pt.stimLevel) ?? 'none',
        stimNow: Number((pt.stimLevel + pt.stimPulse).toFixed(1)),
        ventilated: pt.ventilated,
        bleeding: pt.bleeding,
        bloodLoss: Math.round(pt.deficit * 100),
        lineConnected: this.lineConnected,
        log: this.log.slice(-80),
      },
    };
  }

  logCsv() {
    return ['time,event', ...this.log.map((e) => `${e.time},"${e.text.replaceAll('"', '""')}"`)].join('\n');
  }

  /** Apply one action from a screen. Throws an Error with a readable message if it is not valid. */
  action(a) {
    const pump = () => {
      const p = this.pumps.find((x) => x.id === a.pump);
      if (!p) throw new Error('No such pump');
      return p;
    };
    const pt = this.patient;
    switch (a.type) {
      // ----- pump screens -----
      case 'pumpKey':
        pump().unit.key(String(a.key));
        break;
      case 'pumpSelect':
        pump().unit.select(Number(a.index));
        break;
      case 'pumpPower': {
        const p = pump();
        if (p.unit.on) {
          if (p.unit.infusion) this.note(`Pump ${p.id}: Pump switched off`);
          p.unit.powerOff();
        } else p.unit.powerOn();
        break;
      }
      case 'addPump':
        this.addPump();
        break;
      case 'removePump': {
        const p = pump();
        if (p.unit.infusion) this.note(`Pump ${p.id}: removed while infusing`);
        this.pumps = this.pumps.filter((x) => x !== p);
        break;
      }
      case 'setStyle':
        if (!STYLES[a.style]) throw new Error('Unknown pump style');
        this.styleId = a.style;
        for (const p of this.pumps) p.unit.setStyle(a.style);
        break;

      // ----- monitor -----
      case 'setModules':
        if (a.from === 'monitor' && this.monitorLocked) throw new Error('The monitor is locked by the instructor');
        if (!Array.isArray(a.modules)) throw new Error('modules must be a list');
        this.modules = a.modules.map(String).slice(0, 20);
        break;
      case 'override': {
        if (a.from === 'monitor' && this.monitorLocked) throw new Error('The monitor is locked by the instructor');
        if (!(a.key in pt.v) || !Number.isFinite(a.value)) throw new Error('Unknown vital sign or value');
        const seconds = Math.max(0, Number(a.seconds) || 0);
        this.overrides[a.key] = { from: this.vitals()[a.key], to: a.value, start: this.simTime, duration: seconds };
        this.note(`${a.from === 'monitor' ? 'Monitor screen' : 'Instructor'} set ${a.key} to ${a.value}${seconds ? ` over ${seconds} s` : ''}`);
        break;
      }
      case 'release':
        if (a.key) delete this.overrides[a.key];
        else this.overrides = {};
        this.note(`Instructor returned ${a.key ?? 'all values'} to automatic`);
        break;

      // ----- instructor: time and case -----
      case 'setSpeed':
        if (!SPEEDS.includes(a.speed)) throw new Error('Unknown speed');
        this.speed = a.speed;
        break;
      case 'setPaused':
        this.paused = !!a.paused;
        this.note(this.paused ? 'Simulation paused' : 'Simulation resumed');
        break;
      case 'reset':
        if (!PRESETS[a.preset]) throw new Error('Unknown patient');
        this.reset(a.preset);
        break;
      case 'lockMonitor':
        this.monitorLocked = !!a.on;
        break;
      case 'trendShow':
        if (!(a.line in this.trendShow)) throw new Error('Unknown graph line');
        this.trendShow[a.line] = !!a.on;
        break;
      case 'showTrend':
        this.showTrend = !!a.on;
        break;

      // ----- instructor: events -----
      case 'event':
        this.#event(a);
        break;
      default:
        throw new Error(`Unknown action: ${a.type}`);
    }
  }

  #event(a) {
    const pt = this.patient;
    switch (a.name) {
      case 'intubation':
        pt.stimPulse = Math.max(pt.stimPulse, 8);
        this.note('Event: laryngoscopy and intubation');
        break;
      case 'incision':
        pt.stimPulse = Math.max(pt.stimPulse, 6);
        if (pt.stimLevel < STIM_LEVELS.moderate) pt.stimLevel = STIM_LEVELS.moderate;
        this.note('Event: skin incision (surgery ongoing)');
        break;
      case 'stim':
        if (!(a.level in STIM_LEVELS)) throw new Error('Unknown stimulation level');
        pt.stimLevel = STIM_LEVELS[a.level];
        this.note(`Surgical stimulation: ${a.level}`);
        break;
      case 'ventilation':
        pt.ventilated = !!a.on;
        this.note(pt.ventilated ? 'Ventilation started' : 'Ventilation stopped (spontaneous breathing)');
        break;
      case 'bleeding':
        pt.bleeding = !!a.on;
        this.note(pt.bleeding ? 'Event: bleeding started' : 'Bleeding controlled');
        break;
      case 'fluid':
        pt.deficit = Math.max(0, pt.deficit - 0.2);
        this.note('Fluid bolus given');
        break;
      case 'pressor':
        pt.pressor = Math.min(1.5, pt.pressor + 1);
        this.note('Vasopressor given');
        break;
      case 'anticholinergic':
        pt.chrono = Math.min(1.5, pt.chrono + 1);
        this.note('Anticholinergic given');
        break;
      case 'line':
        this.lineConnected = !!a.connected;
        this.note(this.lineConnected ? 'IV line reconnected' : 'Event: IV line disconnected (pumps run, no drug reaches patient)');
        break;
      case 'occlusion': {
        const p = this.pumps.find((x) => x.id === a.pump);
        if (!p) throw new Error('No such pump');
        p.unit.setOcclusion(!!a.on);
        this.note(`Pump ${p.id}: ${a.on ? 'Event: line occluded' : 'occlusion cleared'}`);
        break;
      }
      default:
        throw new Error(`Unknown event: ${a.name}`);
    }
  }
}
```

## Web pages (public/*.html)

<a id="file-public-index-html"></a>

### public/index.html

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TIVA simulator</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0d1117; color: #e6edf3;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: min(520px, calc(100% - 32px)); }
  h1 { font-size: 1.6rem; margin: 0 0 4px; }
  p { color: #9aa7b4; margin: 0 0 24px; }
  a { display: block; padding: 18px 20px; margin-bottom: 12px; border: 1px solid #2b3540; border-radius: 10px;
      color: inherit; text-decoration: none; font-size: 1.1rem; background: #151b23; }
  a:hover { border-color: #4da6ff; }
  a small { display: block; color: #9aa7b4; margin-top: 4px; }
  .station { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #9aa7b4; }
  .station input { width: 110px; height: 44px; font: inherit; font-size: 1.2rem; text-align: center; text-transform: uppercase;
                   background: #0d1117; color: #e6edf3; border: 1px solid #2b3540; border-radius: 8px; }
  .foot { font-size: .85rem; margin-top: 16px; }
</style>
</head>
<body>
<main>
  <h1>TIVA simulator</h1>
  <p>For education only. Not for clinical use.</p>
  <label class="station">Station code
    <input id="code" value="1" maxlength="8" autocomplete="off" autocapitalize="characters">
  </label>
  <a data-page="monitor.html" href="monitor.html">Patient monitor<small>Waveforms, vital signs, alarms</small></a>
  <a data-page="pump.html" href="pump.html">TCI pumps<small>Program and run propofol, remifentanil and other infusions</small></a>
  <a data-page="instructor.html" href="instructor.html">Instructor remote<small>Time, vital signs, events, drug levels and case log</small></a>
  <p class="foot">Screens with the same station code share one patient. Use a different code for each station.</p>
  <p class="foot" id="addresses"></p>
</main>
<script>
  const code = document.getElementById('code');
  const fromUrl = new URLSearchParams(location.search).get('s');
  if (fromUrl) code.value = fromUrl;
  const update = () => {
    const value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '') || '1';
    document.querySelectorAll('a[data-page]').forEach((a) => (a.href = a.dataset.page + '?s=' + encodeURIComponent(value)));
  };
  code.addEventListener('input', update);
  fetch('/api/info').then((r) => r.json()).then((info) => {
    if (info.addresses.length) {
      document.getElementById('addresses').textContent = 'Other devices on the same Wi-Fi: open ' + info.addresses.join(' or ');
    }
  }).catch(() => {});
  update();
</script>
</body>
</html>
```

<a id="file-public-instructor-html"></a>

### public/instructor.html

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instructor remote - TIVA simulator</title>
<link rel="stylesheet" href="css/instructor.css">
</head>
<body>
<header id="bar">
  <a class="brand" id="home" href="index.html">INSTRUCTOR<span id="stationName"></span></a>
  <span id="clock">00:00:00</span>
  <button type="button" id="pause">Pause</button>
  <div class="seg" id="speed" role="group" aria-label="Simulation speed">
    <button type="button" data-speed="1">x1</button>
    <button type="button" data-speed="2">x2</button>
    <button type="button" data-speed="5">x5</button>
    <button type="button" data-speed="10">x10</button>
  </div>
</header>
<div id="offline">Connection to the simulator lost. Reconnecting…</div>

<main>
  <section class="card" id="vitalsCard">
    <h2>Vital signs <button type="button" class="small" id="releaseAll">All to automatic</button></h2>
    <p class="hint">Values follow the drugs automatically. Set a value to take it over; "Auto" hands it back.</p>
    <div class="over">
      <span>Change over</span>
      <div class="seg" id="ramp" role="group" aria-label="Change over">
        <button type="button" data-ramp="0">At once</button>
        <button type="button" data-ramp="30" class="on">30 s</button>
        <button type="button" data-ramp="60">1 min</button>
        <button type="button" data-ramp="180">3 min</button>
      </div>
    </div>
    <div id="vitals"></div>
  </section>

  <section class="card">
    <h2>Events</h2>
    <h3>Stimulation</h3>
    <div class="row">
      <button type="button" data-event="intubation">Intubation</button>
      <button type="button" data-event="incision">Skin incision</button>
    </div>
    <div class="seg wide" id="stim" role="group" aria-label="Ongoing surgical stimulation">
      <button type="button" data-stim="none">None</button>
      <button type="button" data-stim="light">Light</button>
      <button type="button" data-stim="moderate">Moderate</button>
      <button type="button" data-stim="strong">Strong</button>
    </div>
    <p class="hint" id="stimNow"></p>

    <h3>Airway and breathing</h3>
    <div class="seg wide" id="vent" role="group" aria-label="Ventilation">
      <button type="button" data-vent="0">Spontaneous</button>
      <button type="button" data-vent="1">Ventilated</button>
    </div>

    <h3>Circulation</h3>
    <div class="row">
      <button type="button" class="toggle" id="bleeding">Bleeding</button>
      <button type="button" data-event="fluid">Fluid bolus</button>
      <button type="button" data-event="pressor">Vasopressor</button>
      <button type="button" data-event="anticholinergic">Anticholinergic</button>
    </div>
    <p class="hint" id="bloodLoss"></p>

    <h3>Lines and pumps</h3>
    <div class="row">
      <button type="button" class="toggle" id="line">IV line disconnected</button>
    </div>
    <div class="row" id="occlusions"></div>
  </section>

  <section class="card">
    <h2>Drug levels in the patient</h2>
    <div id="levels"></div>
    <canvas id="trend"></canvas>
    <div class="lines" role="group" aria-label="Lines shown on the graph">
      <span>Show on graph</span>
      <label class="check"><input type="checkbox" data-line="ce"> Ce <small>effect site, solid</small></label>
      <label class="check"><input type="checkbox" data-line="cp"> Cp <small>plasma, dashed</small></label>
      <label class="check"><input type="checkbox" data-line="rate"> Rate <small>mL/h</small></label>
    </div>
    <label class="check"><input type="checkbox" id="showTrend"> Show this graph on the pump screen</label>
  </section>

  <section class="card">
    <h2>Case</h2>
    <div class="row">
      <select id="preset" aria-label="Patient"></select>
      <button type="button" id="reset" class="danger">Start new case</button>
    </div>
    <h3>Monitor parameters</h3>
    <div id="modules" class="checks"></div>
    <label class="check"><input type="checkbox" id="lockMonitor"> Lock the monitor (trainees cannot change values or parameters)</label>
    <h3>Address for other devices</h3>
    <p class="hint" id="addresses">Looking up…</p>
    <h3>Open the other screens</h3>
    <div class="row">
      <a id="openMonitor" target="_blank" rel="noopener">Monitor</a>
      <a id="openPump" target="_blank" rel="noopener">Pumps</a>
    </div>
  </section>

  <section class="card" id="logCard">
    <h2>Case log <a id="exportLog" class="small">Download CSV</a></h2>
    <ol id="log"></ol>
  </section>
</main>
<script type="module" src="js/instructor.js"></script>
</body>
</html>
```

<a id="file-public-monitor-html"></a>

### public/monitor.html

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Patient monitor - TIVA simulator</title>
<link rel="stylesheet" href="css/monitor.css">
</head>
<body>
<header id="bar">
  <div class="patient">SIMULATION<span>Education only</span></div>
  <div id="alarmText" role="status" aria-live="polite"></div>
  <div class="tools">
    <button id="btnSilence" type="button">Silence alarms</button>
    <button id="btnSound" type="button">Sound: off</button>
    <button id="btnSetup" type="button">Parameters</button>
    <button id="btnFull" type="button">Full screen</button>
    <span id="clock"></span>
  </div>
</header>
<div id="pausedBanner" hidden>Simulation paused by the instructor</div>
<main id="rows"></main>
<footer id="strip"></footer>
<dialog id="editDlg"></dialog>
<dialog id="setupDlg"></dialog>
<script type="module" src="js/monitor/monitor.js"></script>
</body>
</html>
```

<a id="file-public-pump-html"></a>

### public/pump.html

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TCI pumps - TIVA simulator</title>
<link rel="stylesheet" href="css/pump.css">
</head>
<body>
<header id="bar">
  <a class="brand" id="home" href="index.html">TCI PUMPS<span>Simulation, education only</span></a>
  <span id="simInfo"></span>
  <label>Pump style
    <select id="style"></select>
  </label>
  <button type="button" id="addPump">Add pump</button>
  <button type="button" id="sound">Sound: off</button>
</header>
<div id="offline">Connection to the simulator lost. Reconnecting…</div>
<div id="pausedBanner" hidden>Simulation paused by the instructor. Time is stopped, so the pumps are not infusing.</div>
<main id="pumps"></main>
<section id="trendBox" hidden>
  <h2>Drug levels and infusion rates</h2>
  <canvas id="trend"></canvas>
</section>
<script type="module" src="js/pump/pump.js"></script>
</body>
</html>
```

## Styles (public/css)

<a id="file-public-css-instructor-css"></a>

### public/css/instructor.css

```css
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; background: #12171d; color: #e6edf3;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
button, select, input { font: inherit; color: inherit; }
button, select, a.small, .row a {
  min-height: 40px; padding: 0 12px; background: #1c242d; border: 1px solid #364250; border-radius: 6px;
  font-size: 14px; cursor: pointer;
}
button:hover, select:hover { border-color: #6b7c8d; }
button.on { background: #1d4f8c; border-color: #4da6ff; }
button.toggle.on { background: #8a1f1f; border-color: #ff6b6b; }
button.flash { background: #1f4d2b; border-color: #3ddc4a; }
button.danger { color: #ff9c9c; }
.small { min-height: 30px !important; font-size: 12px !important; padding: 0 8px !important; }

#bar {
  position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 16px; background: #0c1116; border-bottom: 1px solid #27313b;
}
.brand { font-weight: 600; letter-spacing: .04em; font-size: 14px; color: inherit; text-decoration: none; margin-right: auto; }
.brand span { display: block; font-weight: 400; font-size: 11px; color: #8b98a5; letter-spacing: 0; }
#clock { font-size: 22px; font-variant-numeric: tabular-nums; font-weight: 600; }
#pause { min-width: 84px; }
#pause.on { background: #7a5a00; border-color: #ffd500; }
.seg { display: flex; }
.seg button { border-radius: 0; margin-left: -1px; flex: 1; }
.seg button:first-child { border-radius: 6px 0 0 6px; margin-left: 0; }
.seg button:last-child { border-radius: 0 6px 6px 0; }
.seg button.on { position: relative; }
.seg.wide { width: 100%; }
#offline { display: none; padding: 8px 16px; background: #8a1f1f; font-size: 14px; }
body.offline #offline { display: block; }

main {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 14px;
  padding: 14px; max-width: 1500px; margin: 0 auto; align-items: start;
}
.card { background: #171e26; border: 1px solid #27313b; border-radius: 10px; padding: 14px; min-width: 0; }
.card h2 { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 8px; font-size: 16px; }
.card h3 { margin: 14px 0 6px; font-size: 12px; font-weight: 600; color: #9aa7b4; text-transform: uppercase; letter-spacing: .05em; }
.hint { margin: 4px 0 8px; font-size: 12px; color: #9aa7b4; }
.row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.row > button { flex: 1; white-space: nowrap; }
.row select { flex: 2; min-width: 0; }
.row a, a.small { display: inline-flex; align-items: center; color: #8ec5ff; text-decoration: none; }

/* vital signs */
.over { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 13px; color: #9aa7b4; }
.over .seg { flex: 1; }
.vital {
  display: grid; grid-template-columns: minmax(0, 1fr) 76px auto auto auto; gap: 6px; align-items: center;
  padding: 5px 0; border-top: 1px solid #222b35;
}
.v-name { font-size: 14px; }
.v-name small { color: #9aa7b4; }
.v-now { font-size: 20px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; line-height: 1.05; }
.v-now small { display: block; font-size: 10px; font-weight: 400; color: #9aa7b4; }
.vital.overridden .v-now { color: #ffb02e; }
.vital.overridden .v-now small { color: #ffb02e; }
.stepper { display: flex; gap: 4px; }
.stepper button { width: 40px; padding: 0; font-size: 20px; }
.stepper input {
  width: 68px; height: 40px; text-align: center; background: #0d1117; border: 1px solid #364250; border-radius: 6px;
  font-size: 16px; font-variant-numeric: tabular-nums;
}
.vital .set { background: #1d6fd1; border-color: #1d6fd1; font-weight: 600; }
.vital .auto { visibility: hidden; }
.vital.overridden .auto { visibility: visible; }

/* drug levels */
table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; margin-bottom: 10px; }
th { text-align: right; font-weight: 500; font-size: 12px; color: #9aa7b4; padding: 4px 6px; }
th:first-child, td:first-child { text-align: left; }
td { text-align: right; padding: 5px 6px; border-top: 1px solid #222b35; }
td i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; }
td small { color: #9aa7b4; }
td.warn { color: #ffb02e; font-weight: 600; }
#trend { display: block; width: 100%; height: 200px; background: #10151b; border: 1px solid #27313b; border-radius: 8px; }
.check { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 14px; cursor: pointer; }
.check input { width: 20px; height: 20px; }
.checks { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }

/* log */
#logCard { grid-column: 1 / -1; }
#log { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow: auto; font-size: 13px; }
#log li { padding: 3px 0; border-top: 1px solid #222b35; }
#log time { color: #9aa7b4; font-variant-numeric: tabular-nums; margin-right: 8px; }

@media (max-width: 480px) {
  .vital { grid-template-columns: minmax(0, 1fr) 64px; }
  .vital .stepper { grid-column: 1; }
  .vital .set, .vital .auto { grid-row: 3; }
}

/* graph line tick boxes */
#trend { height: 280px; }
.lines { display: flex; align-items: center; gap: 4px 16px; flex-wrap: wrap; margin-top: 6px; font-size: 13px; color: #9aa7b4; }
.lines .check { color: #e6edf3; }
.lines small { color: #9aa7b4; }
```

<a id="file-public-css-monitor-css"></a>

### public/css/monitor.css

```css
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0; display: flex; flex-direction: column; overflow: hidden;
  background: #000; color: #d7dde3;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-user-select: none; user-select: none;
}
button, input, select { font: inherit; }

/* ---------- top bar ---------- */
#bar {
  flex: none; display: flex; align-items: center; gap: 12px; min-height: 44px;
  padding: 4px 10px; background: #10151b; border-bottom: 1px solid #27313b;
}
.patient { font-weight: 600; letter-spacing: .04em; font-size: 14px; white-space: nowrap; }
.patient span { display: block; font-weight: 400; font-size: 11px; color: #8b98a5; letter-spacing: 0; }
#alarmText {
  flex: 1; min-width: 0; text-align: center; font-weight: 700; font-size: 16px;
  padding: 4px 8px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#alarmText.medium { background: #ffd500; color: #000; }
#alarmText.high { background: #ff2b2b; color: #fff; animation: flash-high .5s steps(2, jump-none) infinite; }
.tools { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.tools button {
  background: #1c242d; color: #d7dde3; border: 1px solid #364250; border-radius: 6px;
  padding: 6px 10px; font-size: 13px; cursor: pointer; white-space: nowrap;
}
.tools button:hover { border-color: #6b7c8d; }
.tools button.on { background: #1f4d2b; border-color: #3ddc4a; }
.tools button.warn { background: #5a4a00; border-color: #ffd500; }
#clock { font-variant-numeric: tabular-nums; font-size: 15px; padding: 0 4px; }

/* ---------- waveform rows ---------- */
#rows { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.row {
  flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) clamp(170px, 27vw, 340px);
  border-bottom: 1px solid #1c232b; color: var(--c);
}
.wave { position: relative; min-width: 0; min-height: 0; }
.wave canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.wave .wlabel { position: absolute; left: 8px; top: 4px; font-size: 13px; opacity: .85; z-index: 1; }
.wave .wscale { position: absolute; right: 6px; font-size: 11px; opacity: .6; z-index: 1; }
.wave .wscale.top { top: 3px; }
.wave .wscale.bottom { bottom: 3px; }

/* ---------- numeric tiles ---------- */
.tile {
  position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0;
  padding: 4px 10px; border: 0; border-left: 1px solid #1c232b; background: transparent;
  color: var(--c); text-align: left; cursor: pointer; overflow: hidden;
}
.tile:hover, .tile:focus-visible { background: #0f151b; outline: none; }
.tile:focus-visible { box-shadow: inset 0 0 0 2px #4da6ff; }
.t-head { display: flex; align-items: baseline; gap: 6px; font-size: 14px; white-space: nowrap; }
.t-head b { font-size: 16px; }
.t-head .lim { margin-left: auto; font-size: 12px; opacity: .7; font-variant-numeric: tabular-nums; }
.t-val {
  flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: .25em;
  font-weight: 500; line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums;
  font-size: min(calc(var(--rowh, 120px) * 0.58), 8vw);
}
.t-val.long { font-size: min(calc(var(--rowh, 120px) * 0.44), 4.8vw); }
.t-val small { font-size: .45em; opacity: .85; }
.t-val .pair { display: flex; flex-direction: column; align-items: flex-end; font-size: .5em; gap: .1em; }
.t-val .pair span { font-size: .55em; opacity: .8; margin-right: .3em; }
.t-sub { font-size: 12px; opacity: .8; white-space: nowrap; }
.heart { font-style: normal; font-size: .3em; opacity: .25; align-self: flex-start; }
.heart.beat { opacity: 1; }

.tile.alarm-medium { background: #ffd500; color: #000; }
.tile.alarm-high { background: #ff2b2b; color: #fff; animation: flash-high .5s steps(2, jump-none) infinite; }
@keyframes flash-high { 50% { background: #7a0000; } }

/* ---------- bottom strip (values with no waveform) ---------- */
#strip { flex: none; display: flex; border-top: 1px solid #27313b; }
#strip:empty { display: none; }
#strip .tile { flex: 1; height: clamp(84px, 15vh, 130px); border-left: 1px solid #1c232b; --rowh: clamp(84px, 15vh, 130px); }
#strip .tile:first-child { border-left: 0; }
#strip .t-val { justify-content: flex-start; font-size: min(calc(var(--rowh) * 0.42), 6vw); }

/* ---------- dialogs ---------- */
dialog {
  width: min(460px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow: auto;
  background: #161d25; color: #e6edf3; border: 1px solid #3a4756; border-radius: 12px; padding: 18px;
  -webkit-user-select: text; user-select: text;
}
dialog::backdrop { background: rgba(0, 0, 0, .6); }
dialog h2 { margin: 0 0 14px; font-size: 18px; }
dialog h3 { margin: 16px 0 8px; font-size: 13px; font-weight: 600; color: #9aa7b4; text-transform: uppercase; letter-spacing: .05em; }
.field { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; margin-bottom: 10px; }
.field label { font-size: 15px; }
.field label small { color: #9aa7b4; }
.stepper { display: flex; align-items: center; gap: 6px; }
.stepper button {
  width: 44px; height: 44px; border-radius: 8px; border: 1px solid #3a4756; background: #222c37; color: #e6edf3;
  font-size: 22px; line-height: 1; cursor: pointer;
}
.stepper button:active { background: #2f3c4a; }
dialog input[type=number], dialog select {
  height: 44px; border-radius: 8px; border: 1px solid #3a4756; background: #0d1117; color: #e6edf3;
  padding: 0 8px; font-size: 18px; text-align: center; font-variant-numeric: tabular-nums;
}
.stepper input { width: 84px; }
.limits { display: flex; align-items: center; gap: 8px; }
.limits input { width: 76px; font-size: 15px; height: 38px; }
.seg { display: flex; border: 1px solid #3a4756; border-radius: 8px; overflow: hidden; }
.seg label { flex: 1; text-align: center; padding: 10px 4px; font-size: 14px; cursor: pointer; background: #0d1117; }
.seg label + label { border-left: 1px solid #3a4756; }
.seg input { position: absolute; opacity: 0; pointer-events: none; }
.seg label:has(input:checked) { background: #1d4f8c; }
.seg label:has(input:focus-visible) { outline: 2px solid #4da6ff; outline-offset: -2px; }
.actions { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
.actions button {
  min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid #3a4756; background: #222c37;
  color: #e6edf3; font-size: 15px; cursor: pointer;
}
.actions .primary { background: #1d6fd1; border-color: #1d6fd1; font-weight: 600; margin-left: auto; }
.actions .danger { color: #ff8f8f; }
.check { display: flex; align-items: center; gap: 10px; padding: 9px 0; font-size: 16px; cursor: pointer; }
.check input { width: 22px; height: 22px; }
.check small { color: #9aa7b4; margin-left: auto; }
.note { color: #9aa7b4; font-size: 13px; margin: 8px 0 0; }

@media (max-width: 700px) {
  .patient span, #btnFull { display: none; }
  .tools button { padding: 6px 8px; font-size: 12px; }
  #bar { flex-wrap: wrap; }
  .tools { flex: 1; }
  #alarmText { font-size: 14px; order: 3; flex-basis: 100%; }
  #alarmText:empty { display: none; }
  .t-val { font-size: min(calc(var(--rowh, 120px) * 0.58), 14vw); }
  .t-val.long { font-size: min(calc(var(--rowh, 120px) * 0.44), 9vw); }
  #strip .t-val { font-size: min(calc(var(--rowh) * 0.42), 7vw); }
  .t-sub { overflow: hidden; text-overflow: ellipsis; }
  .t-head .lim { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  #alarmText.high, .tile.alarm-high { animation: none; }
}
.t-val .pair.big { font-size: .82em; }
.t-val .pair.re { color: #ff9f2e; }
/* Mid-width screens: give the alarm message its own line so it is never squeezed. */
@media (max-width: 1000px) {
  #bar { flex-wrap: wrap; }
  .tools { flex: 1; }
  #alarmText { order: 3; flex-basis: 100%; }
  #alarmText:empty { display: none; }
}
#pausedBanner { flex: none; padding: 6px 12px; background: #7a5a00; color: #fff; font-size: 15px; font-weight: 600; text-align: center; }
#pausedBanner[hidden] { display: none; }
```

<a id="file-public-css-pump-css"></a>

### public/css/pump.css

```css
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; background: #1b2026; color: #e6edf3;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
button, select { font: inherit; color: inherit; }

/* ---------- top bar ---------- */
#bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 16px; background: #10151b; border-bottom: 1px solid #27313b;
}
.brand { font-weight: 600; letter-spacing: .04em; font-size: 14px; margin-right: auto; }
.brand span { display: block; font-weight: 400; font-size: 11px; color: #8b98a5; letter-spacing: 0; }
#bar label { font-size: 13px; color: #9aa7b4; display: flex; align-items: center; gap: 6px; }
#bar select, #bar > button, .seg button {
  min-height: 38px; padding: 0 12px; background: #1c242d; border: 1px solid #364250; border-radius: 6px;
  font-size: 14px; cursor: pointer;
}
#bar > button:disabled { opacity: .4; cursor: default; }
#bar > button.on { background: #1f4d2b; border-color: #3ddc4a; }
.seg { display: flex; }
.seg button { border-radius: 0; margin-left: -1px; }
.seg button:first-child { border-radius: 6px 0 0 6px; margin-left: 0; }
.seg button:last-child { border-radius: 0 6px 6px 0; }
.seg button.on { background: #1d4f8c; border-color: #4da6ff; position: relative; }

/* ---------- pump body ---------- */
#pumps {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr));
  gap: 16px; padding: 16px; max-width: 1500px; margin: 0 auto;
}
.pump {
  display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 14px;
  background: var(--body, #2b333c); border: 1px solid #00000055; box-shadow: 0 2px 8px #0006;
}
.pump.alarming { box-shadow: 0 0 0 3px #ff2b2b, 0 2px 8px #0006; }
.pump-top { display: flex; align-items: center; gap: 10px; }
.pump-top .label { flex: 1; font-size: 13px; color: var(--body-text, #aab4bf); letter-spacing: .03em; }
.power, .remove {
  width: 40px; height: 40px; border-radius: 50%; border: 1px solid #0006; background: #0003;
  color: var(--body-text, #cfd6dd); font-size: 18px; cursor: pointer;
}
.pump:not(.is-off) .power { color: #3ddc4a; }
.remove { border-radius: 8px; font-size: 22px; line-height: 1; opacity: .6; }

/* ---------- display ---------- */
.lcd {
  display: flex; flex-direction: column; height: 330px; border-radius: 8px; overflow: hidden;
  background: var(--lcd, #0b0f14); color: var(--ink, #e6edf3); border: 2px solid #000a;
  font-family: var(--lcd-font, inherit); font-variant-numeric: tabular-nums;
}
.lcd-off { margin: auto; text-align: center; opacity: .45; font-size: 18px; }
.lcd-off small { font-size: 13px; }
.lcd-title {
  display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px; font-weight: 700; font-size: 15px;
  background: var(--title, #18212b); border-bottom: 4px solid var(--drug);
}
.lcd-alarm { padding: 5px 10px; background: #e01b1b; color: #fff; font-weight: 700; font-size: 14px; animation: blink 1s steps(2, jump-none) infinite; }
.lcd-alarm.acked { animation: none; background: #8a5a00; }
@keyframes blink { 50% { background: #7a0000; } }
.lcd-body { flex: 1; min-height: 0; padding: 8px 10px; overflow: hidden; }
.lcd-msg { padding: 4px 10px; font-size: 13px; background: var(--msg, #1d2a38); }
.soft { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; padding: 6px; border-top: 1px solid var(--line, #2a3541); }
.soft button {
  min-height: 40px; border: 1px solid var(--line, #3a4756); border-radius: 6px; background: var(--softkey, #1c242d);
  color: inherit; font-weight: 600; font-size: 14px; cursor: pointer;
}

.list { display: flex; flex-direction: column; gap: 4px; }
.opt {
  display: flex; justify-content: space-between; align-items: center; width: 100%; min-height: 42px; padding: 0 10px;
  border: 1px solid transparent; border-radius: 6px; background: transparent; color: inherit; font-size: 17px; text-align: left;
}
button.opt { cursor: pointer; border-color: var(--line, #2a3541); }
.opt small { font-size: 12px; opacity: .7; }
.opt.sel { background: var(--sel, #1d4f8c); color: var(--sel-ink, #fff); }
.num { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.num b { font-size: 76px; line-height: 1; font-weight: 600; }
.num span { font-size: 18px; opacity: .8; }
.num small { margin-top: 8px; font-size: 13px; opacity: .7; }
.err p { margin: 0 0 8px; font-size: 16px; }
.sum p { margin: 0 0 5px; font-size: 15px; }
.sum .hl { font-size: 20px; font-weight: 700; margin: 8px 0; }

.run { display: flex; flex-direction: column; gap: 5px; }
.run-sub, .run-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
.run-row b { font-size: 16px; }
.run-row.dim { opacity: .75; font-size: 12px; }
.state { font-weight: 700; color: var(--go, #3ddc4a); }
.state.held { color: var(--warn, #ffb02e); }
.run-main { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; flex: 1; min-height: 0; }
.target label, .conc label { display: block; font-size: 12px; opacity: .75; }
.target b { font-size: 64px; line-height: .95; font-weight: 600; }
.target span { font-size: 13px; opacity: .8; margin-left: 4px; }
.concs { text-align: right; }
.conc { display: flex; align-items: baseline; justify-content: flex-end; gap: 8px; }
.conc b { font-size: 26px; font-weight: 600; min-width: 3.2em; }
.concs small { font-size: 11px; opacity: .7; }
.pending { padding: 4px 8px; border-radius: 4px; background: var(--sel, #1d4f8c); color: var(--sel-ink, #fff); font-size: 13px; font-weight: 600; }
.syr { flex: 1; height: 12px; border: 1px solid currentColor; border-radius: 3px; align-self: center; overflow: hidden; opacity: .8; }
.syr i { display: block; height: 100%; background: currentColor; }

/* ---------- keypad ---------- */
.keys { display: flex; flex-direction: column; gap: 8px; }
.key-row { display: flex; gap: 8px; }
.key {
  flex: 1; min-height: 52px; border-radius: 10px; border: 1px solid #0007; background: var(--key, #3a444f);
  color: var(--key-ink, #fff); font-size: 17px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 0 #0006;
}
.key:active, .soft button:active { transform: translateY(1px); box-shadow: none; }
.key.go { background: #1f8a3b; color: #fff; }
.key.stop { background: #c0392b; color: #fff; }
.pump.is-off .keys { opacity: .35; pointer-events: none; }

/* ---------- the four styles (neutral look, no manufacturer branding) ---------- */
.style-alaris {
  --body: #d9dde2; --body-text: #3a4550; --lcd: #c9d3c2; --ink: #101410; --title: #b4c0ac; --line: #7f8b79;
  --softkey: #b4c0ac; --sel: #101410; --sel-ink: #c9d3c2; --msg: #b4c0ac; --go: #0b5c1d; --warn: #8a4b00;
  --key: #f3f5f7; --key-ink: #1b2026; --lcd-font: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
.style-agilia {
  --body: #eef1f4; --body-text: #3a4550; --lcd: #f7f9fb; --ink: #0d1117; --title: #dfe5ec; --line: #9aa7b4;
  --softkey: #dfe5ec; --sel: #0d1117; --sel-ink: #fff; --msg: #dfe5ec; --go: #0b6b24; --warn: #9a5200;
  --key: #2f6fb3; --key-ink: #fff;
}
.style-space {
  --body: #e6e8ea; --body-text: #3a4550; --lcd: #dbe9f4; --ink: #06243d; --title: #bcd5e8; --line: #6f93b0;
  --softkey: #bcd5e8; --sel: #06243d; --sel-ink: #dbe9f4; --msg: #bcd5e8; --go: #0b5c1d; --warn: #8a4b00;
  --key: #4b5560; --key-ink: #fff; --lcd-font: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
.style-alaris .power, .style-agilia .power, .style-space .power,
.style-alaris .remove, .style-agilia .remove, .style-space .remove { background: #fff8; }
.style-alaris:not(.is-off) .power, .style-agilia:not(.is-off) .power, .style-space:not(.is-off) .power { color: #0b6b24; }
.style-alaris .lcd-off, .style-agilia .lcd-off, .style-space .lcd-off { opacity: .6; }

@media (prefers-reduced-motion: reduce) { .lcd-alarm { animation: none; } }

/* ---------- linked to the server ---------- */
a.brand { color: inherit; text-decoration: none; }
#simInfo { font-size: 13px; color: #9aa7b4; font-variant-numeric: tabular-nums; }
#offline { display: none; padding: 8px 16px; background: #8a1f1f; color: #fff; font-size: 14px; }
body.offline #offline { display: block; }
#trendBox { max-width: 1500px; margin: 0 auto; padding: 0 16px 16px; }
#trendBox h2 { font-size: 14px; font-weight: 600; color: #9aa7b4; margin: 0 0 6px; }
#trend { display: block; width: 100%; height: 220px; background: #10151b; border: 1px solid #27313b; border-radius: 8px; }
#trend { height: 300px; }
#pausedBanner { padding: 10px 16px; background: #7a5a00; color: #fff; font-size: 15px; font-weight: 600; text-align: center; }
#pausedBanner[hidden] { display: none; }
.lcd-main { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.lcd-softkeys { display: contents; }
```

## Browser code (public/js)

<a id="file-public-js-instructor-js"></a>

### public/js/instructor.js

```javascript
// Instructor remote: time control, vital-sign overrides, events, drug levels
// and the case log. FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { connect, station, withStation } from './link.js';
import { drawTrend, DRUG_COLORS } from './trend.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const VITALS = [
  ['hr', 'Heart rate', '/min', 1, 0],
  ['sys', 'Systolic BP', 'mmHg', 1, 0],
  ['dia', 'Diastolic BP', 'mmHg', 1, 0],
  ['spo2', 'SpO2', '%', 1, 0],
  ['rr', 'Resp rate', '/min', 1, 0],
  ['etco2', 'EtCO2', 'kPa', 0.1, 1],
  ['se', 'Entropy SE', '', 1, 0],
  ['re', 'Entropy RE', '', 1, 0],
  ['temp', 'Temperature', '°C', 0.1, 1],
  ['cvp', 'CVP', 'mmHg', 1, 0],
  ['tofCount', 'TOF count', '', 1, 0],
  ['tofRatio', 'TOF ratio', '%', 5, 0],
];
const MODULES = {
  ecg: 'ECG', spo2: 'SpO2', co2: 'EtCO2', art: 'Art line', cvp: 'CVP', resp: 'Resp', entropy: 'Entropy',
  temp: 'Temperature', nibp: 'NIBP', nmt: 'NMT',
};
const PRESETS = {
  adult: 'Fit adult (40 y, 70 kg, 170 cm, male)',
  elderly: 'Frail elderly (82 y, 58 kg, 160 cm, female)',
  obese: 'Obese adult (45 y, 130 kg, 170 cm, male)',
  child: 'Child (6 y, 20 kg, 115 cm, male)',
  anxious: 'Anxious young adult (24 y, 65 kg, 168 cm, female)',
};
const DRUG_UNITS = { propofol: 'mcg/mL', ketamine: 'mcg/mL', remifentanil: 'ng/mL', sufentanil: 'ng/mL', dexmedetomidine: 'ng/mL' };

let state = null;
let ramp = 30;
const dirty = new Set(); // vital rows the instructor is typing in

// ---------- build the fixed parts once ----------

$('vitals').innerHTML = VITALS.map(([key, label, unit, step]) => `
  <div class="vital" data-key="${key}">
    <div class="v-name">${label} <small>${unit}</small></div>
    <div class="v-now" id="now-${key}">--</div>
    <div class="stepper">
      <button type="button" data-step="-1" aria-label="Decrease ${label}">&minus;</button>
      <input type="number" inputmode="decimal" step="${step}" id="in-${key}" aria-label="${label} value to set">
      <button type="button" data-step="1" aria-label="Increase ${label}">+</button>
    </div>
    <button type="button" class="set" data-set>Set</button>
    <button type="button" class="auto" data-auto>Auto</button>
  </div>`).join('');

$('modules').innerHTML = Object.entries(MODULES)
  .map(([id, name]) => `<label class="check"><input type="checkbox" data-mod="${id}"> ${name}</label>`)
  .join('');
$('preset').innerHTML = Object.entries(PRESETS).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('');
$('stationName').textContent = `Station ${station}`;
$('home').href = withStation('index.html');
$('openMonitor').href = withStation('monitor.html');
$('openPump').href = withStation('pump.html');
$('exportLog').href = `/api/log?s=${encodeURIComponent(station)}`;

// ---------- show the live state ----------

function onState(next) {
  const firstState = state == null;
  state = next;
  const ins = state.instructor;

  $('clock').textContent = state.clock;
  $('pause').textContent = state.paused ? 'Resume' : 'Pause';
  $('pause').classList.toggle('on', state.paused);
  document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === state.speed));

  for (const [key, , , , decimals] of VITALS) {
    const shown = state.vitals[key].toFixed(decimals);
    const overridden = ins.overridden.includes(key);
    const row = document.querySelector(`.vital[data-key=${key}]`);
    row.classList.toggle('overridden', overridden);
    $(`now-${key}`).innerHTML = overridden
      ? `${shown}<small>model ${ins.model[key].toFixed(decimals)}</small>`
      : `${shown}<small>automatic</small>`;
    const input = $(`in-${key}`);
    if (!dirty.has(key) && document.activeElement !== input) input.value = shown;
  }

  document.querySelectorAll('#stim button').forEach((b) => b.classList.toggle('on', b.dataset.stim === ins.stimLevel));
  $('stimNow').textContent = `Stimulation now: ${ins.stimNow} / 10 (before the effect of analgesia)`;
  document.querySelectorAll('#vent button').forEach((b) => b.classList.toggle('on', (b.dataset.vent === '1') === ins.ventilated));
  $('bleeding').classList.toggle('on', ins.bleeding);
  $('bloodLoss').textContent = ins.bloodLoss ? `Blood volume lost: about ${ins.bloodLoss}%` : '';
  $('line').classList.toggle('on', !ins.lineConnected);
  // Only redraw these buttons when they change; redrawing mid-click would drop the click.
  const occlusionHtml = state.pumps
    .map((p) => `<button type="button" class="toggle ${p.occluded ? 'on' : ''}" data-occlude="${p.id}">Occlude pump ${p.id}</button>`)
    .join('');
  if ($('occlusions').dataset.html !== occlusionHtml) {
    $('occlusions').dataset.html = occlusionHtml;
    $('occlusions').innerHTML = occlusionHtml;
  }

  const drugs = Object.entries(ins.levels);
  $('levels').innerHTML = drugs.length
    ? `<table><tr><th>Drug</th><th>Patient Cp</th><th>Patient Ce</th><th>Pump shows</th></tr>${drugs.map(([drug, l]) => {
        const pumpValues = state.pumps.filter((p) => p.drug === drug).map((p) => p.pumpCe.toFixed(2));
        const pumpText = pumpValues.length ? pumpValues.join(' + ') : 'pump off';
        const differs = pumpValues.length && Math.abs(pumpValues.reduce((a, b) => a + Number(b), 0) - l.ce) > 0.05 * Math.max(0.2, l.ce);
        return `<tr><td><i style="background:${DRUG_COLORS[drug]}"></i>${esc(drug)} <small>${DRUG_UNITS[drug]}</small></td>
          <td>${l.cp.toFixed(2)}</td><td><b>${l.ce.toFixed(2)}</b></td><td class="${differs ? 'warn' : ''}">${pumpText}</td></tr>`;
      }).join('')}</table>`
    : '<p class="hint">No drug given yet.</p>';
  drawTrend($('trend'), state.history, state.trendShow);
  document.querySelectorAll('[data-line]').forEach((box) => (box.checked = state.trendShow[box.dataset.line]));
  $('showTrend').checked = state.showTrend;
  $('lockMonitor').checked = state.monitorLocked;

  document.querySelectorAll('#modules input').forEach((box) => (box.checked = state.modules.includes(box.dataset.mod)));
  if (firstState) $('preset').value = ins.preset;

  const log = $('log');
  const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
  log.innerHTML = ins.log.map((e) => `<li><time>${e.time}</time> ${esc(e.text)}</li>`).join('');
  if (atBottom || firstState) log.scrollTop = log.scrollHeight;
}

const send = connect(onState, (ok) => document.body.classList.toggle('offline', !ok));

// ---------- controls ----------

$('pause').addEventListener('click', () => send({ type: 'setPaused', paused: !state.paused }));
$('speed').addEventListener('click', (e) => {
  const speed = Number(e.target.dataset?.speed);
  if (speed) send({ type: 'setSpeed', speed });
});
$('ramp').addEventListener('click', (e) => {
  if (e.target.dataset?.ramp == null) return;
  ramp = Number(e.target.dataset.ramp);
  document.querySelectorAll('#ramp button').forEach((b) => b.classList.toggle('on', b === e.target));
});

$('vitals').addEventListener('input', (e) => dirty.add(e.target.closest('.vital').dataset.key));
$('vitals').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') e.target.closest('.vital').querySelector('[data-set]').click();
});
$('vitals').addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  const key = button.closest('.vital').dataset.key;
  const [, , , step, decimals] = VITALS.find((v) => v[0] === key);
  const input = $(`in-${key}`);
  if (button.dataset.step) {
    input.value = (Number(input.value) + Number(button.dataset.step) * step).toFixed(decimals);
    dirty.add(key);
  } else if ('set' in button.dataset) {
    const value = Number(input.value);
    if (input.value !== '' && Number.isFinite(value)) send({ type: 'override', key, value, seconds: ramp });
    dirty.delete(key);
  } else if ('auto' in button.dataset) {
    send({ type: 'release', key });
    dirty.delete(key);
  }
});
$('releaseAll').addEventListener('click', () => {
  dirty.clear();
  send({ type: 'release' });
});

document.querySelectorAll('[data-event]').forEach((b) =>
  b.addEventListener('click', () => {
    send({ type: 'event', name: b.dataset.event });
    b.classList.add('flash');
    setTimeout(() => b.classList.remove('flash'), 600);
  }),
);
$('stim').addEventListener('click', (e) => e.target.dataset?.stim && send({ type: 'event', name: 'stim', level: e.target.dataset.stim }));
$('vent').addEventListener('click', (e) => e.target.dataset?.vent && send({ type: 'event', name: 'ventilation', on: e.target.dataset.vent === '1' }));
$('bleeding').addEventListener('click', () => send({ type: 'event', name: 'bleeding', on: !state.instructor.bleeding }));
$('line').addEventListener('click', () => send({ type: 'event', name: 'line', connected: !state.instructor.lineConnected }));
$('occlusions').addEventListener('click', (e) => {
  const id = Number(e.target.dataset?.occlude);
  if (!id) return;
  const p = state.pumps.find((x) => x.id === id);
  send({ type: 'event', name: 'occlusion', pump: id, on: !p.occluded });
});
document.querySelectorAll('[data-line]').forEach((box) =>
  box.addEventListener('change', () => send({ type: 'trendShow', line: box.dataset.line, on: box.checked })),
);
$('lockMonitor').addEventListener('change', (e) => send({ type: 'lockMonitor', on: e.target.checked }));
fetch('/api/info')
  .then((r) => r.json())
  .then((info) => {
    $('addresses').textContent = info.addresses.length
      ? `On the same Wi-Fi, open ${info.addresses.join(' or ')} and enter station code ${station}.`
      : 'This computer is not on a network. Connect it to Wi-Fi or a phone hotspot first.';
  })
  .catch(() => ($('addresses').textContent = 'Address not available.'));
$('showTrend').addEventListener('change', (e) => send({ type: 'showTrend', on: e.target.checked }));
$('modules').addEventListener('change', () =>
  send({ type: 'setModules', modules: [...document.querySelectorAll('#modules input:checked')].map((b) => b.dataset.mod) }),
);
$('reset').addEventListener('click', () => {
  if (confirm('Start a new case? The current patient, pumps and log will be cleared.')) {
    dirty.clear();
    send({ type: 'reset', preset: $('preset').value });
  }
});
```

<a id="file-public-js-link-js"></a>

### public/js/link.js

```javascript
// Connection between a screen and the simulation server.
// The room code comes from the page address, e.g. monitor.html?s=2 (default "1").

export const station = (new URLSearchParams(location.search).get('s') || '1').toUpperCase();

/**
 * Start receiving the live state. `onState` is called every simulated second
 * and after every action. Returns a `send(action)` function.
 */
export function connect(onState, onStatus = () => {}) {
  const events = new EventSource(`/api/events?s=${encodeURIComponent(station)}`);
  events.onmessage = (e) => onState(JSON.parse(e.data));
  events.onopen = () => onStatus(true);
  events.onerror = () => onStatus(false); // the browser reconnects by itself

  return async function send(action) {
    const res = await fetch(`/api/action?s=${encodeURIComponent(station)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!res.ok) console.warn('Action refused:', await res.text());
    return res.ok;
  };
}

/** Adds the room code to links so that navigation stays in the same station. */
export const withStation = (href) => `${href}?s=${encodeURIComponent(station)}`;
```

<a id="file-public-js-monitor-audio-js"></a>

### public/js/monitor/audio.js

```javascript
// Monitor sounds: pulse beep (pitch follows SpO2) and alarm tones.
// Browsers only allow sound after the user has pressed something, so sound
// starts switched off and is turned on with the Sound button.

export class MonitorAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  enable() {
    this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    this.ctx.resume();
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  #tone(freq, delay, duration, volume, type = 'sine') {
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.setValueAtTime(volume, start + duration - 0.015);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** One pulse beep. 100% is high-pitched; the pitch drops as SpO2 falls. */
  pulse(spo2) {
    if (!this.enabled) return;
    const freq = 880 * 2 ** ((Math.max(60, spo2) - 100) / 20);
    this.#tone(freq, 0, 0.07, 0.12);
  }

  /** One alarm burst: 'high' is five fast beeps, 'medium' is three slower ones. */
  alarm(priority) {
    if (!this.enabled) return;
    if (priority === 'high') {
      for (const d of [0, 0.15, 0.3, 0.6, 0.75]) this.#tone(988, d, 0.1, 0.2, 'triangle');
    } else {
      for (const d of [0, 0.28, 0.56]) this.#tone(660, d, 0.18, 0.16, 'triangle');
    }
  }
}
```

<a id="file-public-js-monitor-monitor-js"></a>

### public/js/monitor/monitor.js

```javascript
// Patient monitor screen. FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { Vitals, PARAMS, entropyGap } from './vitals.js';
import { Signals, Trace, SAMPLE_HZ } from './waveforms.js';
import { MonitorAudio } from './audio.js';
import { connect, station } from '../link.js';

// Parameter modules. 'wave' modules get a waveform row; 'strip' modules are
// numbers only and sit in the bottom strip.
const MODULES = {
  ecg: { name: 'ECG and heart rate', kind: 'wave', color: '#3ddc4a', waveLabel: 'II', signal: 'ecg', range: [-0.45, 1.3], sweep: 8, fields: ['hr'] },
  spo2: { name: 'SpO2', kind: 'wave', color: '#ffe14d', waveLabel: 'Pleth', signal: 'pleth', range: [-0.08, 1.12], sweep: 8, fields: ['spo2'] },
  co2: { name: 'EtCO2 (capnography)', kind: 'wave', color: '#f2f2f2', waveLabel: 'CO2', signal: 'co2', range: [0, 8], sweep: 24, fields: ['etco2', 'rr'] },
  art: { name: 'Art line (invasive BP)', kind: 'wave', color: '#ff5252', waveLabel: 'Art', signal: 'art', range: [0, 200], scale: ['200', '0'], sweep: 8, fields: ['sys', 'dia'] },
  cvp: { name: 'Central venous pressure', kind: 'wave', color: '#58a6ff', waveLabel: 'CVP', signal: 'cvp', range: [0, 20], scale: ['20', '0'], sweep: 8, fields: ['cvp'] },
  resp: { name: 'Resp (impedance)', kind: 'wave', color: '#e8e8e8', waveLabel: 'Imped.', signal: 'resp', range: [-0.25, 1.25], sweep: 24, fields: ['rr'] },
  entropy: { name: 'Entropy', kind: 'wave', color: '#f2f2f2', waveLabel: 'Entropy EEG', signal: 'eeg', range: [-1.25, 1.25], sweep: 8, fields: ['se', 're'] },
  temp: { name: 'Temperature', kind: 'strip', color: '#e6e6e6', fields: ['temp'] },
  nibp: { name: 'Non-invasive blood pressure', kind: 'strip', color: '#ff7a5c', fields: ['sys', 'dia'] },
  nmt: { name: 'Neuromuscular monitoring (TOF)', kind: 'strip', color: '#c7a6ff', fields: ['tofCount', 'tofRatio'] },
};
const ORDER = Object.keys(MODULES);
const ALARMED = ['hr', 'spo2', 'sys', 'etco2', 'rr', 'temp'];
const NIBP_SECONDS = 18;
const NIBP_INTERVALS = [0, 1, 2.5, 5, 10, 15];

const $ = (id) => document.getElementById(id);
const rowsEl = $('rows');
const stripEl = $('strip');

const vitals = new Vitals();
const signals = new Signals((key) => vitals.now(key));
const audio = new MonitorAudio();
const settings = { co2Unit: 'kPa' };
let active = new Set(['ecg', 'spo2', 'co2', 'art', 'resp', 'entropy', 'temp', 'nibp']);
let traces = {};
let tiles = {};
let simTime = 0;
let simSpeed = 1; // simulated seconds per real second (set by the instructor)
let linked = false; // true once the simulation server is sending values
let send = null;
let locked = false; // instructor has locked value editing on this screen
let alarms = [];
let silencedUntil = 0;
let nextAlarmSound = 0;
const nibp = { sys: null, dia: null, at: null, failed: false, measuring: false, startedAt: 0, cuffStart: 0, cuff: 0, intervalMin: 5, nextAt: 3 };

// ---------- units and formatting ----------

const factor = (key) => (key === 'etco2' && settings.co2Unit === 'mmHg' ? 7.5 : 1);
const unitOf = (key) => (key === 'etco2' ? settings.co2Unit : PARAMS[key].unit);
const decimalsOf = (key) => (factor(key) !== 1 ? 0 : PARAMS[key].decimals ?? 0);
const stepOf = (key) => (factor(key) !== 1 ? 1 : PARAMS[key].step);
const toDisplay = (key, v) => (v == null ? null : Number((v * factor(key)).toFixed(decimalsOf(key))));
const fmt = (key) => (vitals.shown(key) * factor(key)).toFixed(decimalsOf(key));
const mapOf = (sys, dia) => Math.round(dia + (sys - dia) / 3);

// Value last sent by the server (or set locally), rounded as displayed.
const toShown = (key) => Number(vitals.target(key).toFixed(PARAMS[key].decimals ?? 0));

function limitText(key) {
  const { low, high } = vitals.p[key];
  if (low == null && high == null) return '';
  const show = (v) => (v == null ? '--' : toDisplay(key, v));
  return `${show(low)} / ${show(high)}`;
}

const head = (title, unit, limitKey) =>
  `<div class="t-head"><b>${title}</b><span>${unit}</span>${limitKey ? `<span class="lim">${limitText(limitKey)}</span>` : ''}</div>`;

function tileHtml(id) {
  switch (id) {
    case 'ecg':
      return head('HR', '/min', 'hr') + `<div class="t-val">${fmt('hr')}<i class="heart">&#9829;</i></div>`;
    case 'spo2':
      return head('SpO2', '%', 'spo2') + `<div class="t-val">${fmt('spo2')}</div>`;
    case 'art': {
      const sys = vitals.shown('sys');
      const dia = Math.min(vitals.shown('dia'), sys);
      return head('Art', 'mmHg', 'sys') + `<div class="t-val long">${sys}/${dia}<small>(${mapOf(sys, dia)})</small></div>`;
    }
    case 'cvp':
      return head('CVP', 'mmHg') + `<div class="t-val long">(${fmt('cvp')})</div>`;
    case 'co2':
      return (
        head('EtCO2', unitOf('etco2'), 'etco2') +
        `<div class="t-val long">${fmt('etco2')}<div class="pair"><span>RR</span>${fmt('rr')}</div></div>`
      );
    case 'resp':
      return head('Resp', '/min', 'rr') + `<div class="t-val">${fmt('rr')}</div>`;
    case 'entropy': {
      const se = vitals.shown('se');
      const re = Math.max(se, vitals.shown('re'));
      return (
        head('Entropy', '') +
        `<div class="t-val long"><div class="pair big re"><span>RE</span>${re}</div><div class="pair big"><span>SE</span>${se}</div></div>`
      );
    }
    case 'nibp': {
      let value = '--/--';
      if (nibp.measuring) value = `<small>Cuff</small>${Math.round(nibp.cuff)}`;
      else if (nibp.failed) value = '<small>No reading</small>';
      else if (nibp.sys != null) value = `${nibp.sys}/${nibp.dia}<small>(${mapOf(nibp.sys, nibp.dia)})</small>`;
      const ago = nibp.at == null ? '' : `${Math.floor((simTime - nibp.at) / 60)} min ago`;
      const auto = nibp.intervalMin ? `Auto ${nibp.intervalMin} min` : 'Manual';
      return (
        head('NIBP', 'mmHg', 'sys') +
        `<div class="t-val">${value}</div><div class="t-sub">${[nibp.measuring ? 'Measuring' : ago, auto].filter(Boolean).join(' · ')}</div>`
      );
    }
    case 'temp':
      return head('T1', '°C', 'temp') + `<div class="t-val">${fmt('temp')}</div>`;
    case 'nmt': {
      const count = vitals.shown('tofCount');
      const ratio = count >= 4 ? `<small>${fmt('tofRatio')}%</small>` : '';
      return head('NMT', 'TOF') + `<div class="t-val">${count}${ratio}</div>`;
    }
  }
  return '';
}

// ---------- building the screen ----------

function build() {
  rowsEl.replaceChildren();
  stripEl.replaceChildren();
  traces = {};
  tiles = {};
  for (const id of ORDER) {
    if (!active.has(id)) continue;
    const mod = MODULES[id];
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.style.setProperty('--c', mod.color);
    tile.setAttribute('aria-label', `${mod.name}: change values`);
    tile.addEventListener('click', () => openEdit(id));
    tiles[id] = tile;
    if (mod.kind === 'wave') {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.setProperty('--c', mod.color);
      const wave = document.createElement('div');
      wave.className = 'wave';
      const scale = id === 'co2' ? [String(toDisplay('etco2', mod.range[1])), '0'] : mod.scale;
      wave.innerHTML =
        `<span class="wlabel">${mod.waveLabel}</span>` +
        (scale ? `<span class="wscale top">${scale[0]}</span><span class="wscale bottom">${scale[1]}</span>` : '') +
        '<canvas></canvas>';
      row.append(wave, tile);
      rowsEl.append(row);
      traces[id] = new Trace(wave.querySelector('canvas'), { color: mod.color, range: mod.range, sweepSeconds: mod.sweep });
    } else {
      stripEl.append(tile);
    }
  }
  layout();
  renderTiles();
}

function layout() {
  const first = rowsEl.firstElementChild;
  if (first) rowsEl.style.setProperty('--rowh', `${first.getBoundingClientRect().height}px`);
  for (const trace of Object.values(traces)) trace.resize();
}

function renderTiles() {
  for (const [id, tile] of Object.entries(tiles)) {
    tile.innerHTML = tileHtml(id);
    const alarm = alarms.find((a) => a.id === id);
    tile.classList.toggle('alarm-high', alarm?.priority === 'high');
    tile.classList.toggle('alarm-medium', alarm?.priority === 'medium');
  }
}

// ---------- alarms ----------

function findAlarms() {
  const found = [];
  const check = (id, key, name, value, highIf) => {
    const { low, high } = vitals.p[key];
    let text = null;
    if (low != null && value < low) text = `${name} LOW`;
    else if (high != null && value > high) text = `${name} HIGH`;
    if (text) found.push({ id, text, priority: highIf?.(value) ? 'high' : 'medium' });
  };
  if (active.has('ecg')) {
    const hr = vitals.shown('hr');
    if (hr === 0) found.push({ id: 'ecg', text: 'ASYSTOLE', priority: 'high' });
    else check('ecg', 'hr', 'HR', hr, (v) => v < 40 || v > 150);
  }
  if (active.has('spo2')) check('spo2', 'spo2', 'SpO2', vitals.shown('spo2'), (v) => v < 85);
  if (active.has('art')) check('art', 'sys', 'Art', vitals.shown('sys'), (v) => v < 70);
  if (active.has('nibp') && nibp.sys != null && !nibp.measuring) check('nibp', 'sys', 'NIBP', nibp.sys, (v) => v < 70);
  const breathing = ['resp', 'co2'].filter((id) => active.has(id));
  if (breathing.length) {
    if (vitals.shown('rr') === 0) {
      for (const id of breathing) found.push({ id, text: 'APNOEA', priority: 'high' });
    } else {
      if (active.has('co2')) check('co2', 'etco2', 'EtCO2', vitals.shown('etco2'));
      const rrTile = active.has('resp') ? 'resp' : 'co2';
      if (!found.some((a) => a.id === rrTile)) check(rrTile, 'rr', 'RR', vitals.shown('rr'));
    }
  }
  if (active.has('temp')) check('temp', 'temp', 'Temp', vitals.shown('temp'));
  found.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'high' ? -1 : 1));
  return found;
}

function showAlarms() {
  const el = $('alarmText');
  const top = alarms[0]?.priority;
  el.textContent = [...new Set(alarms.map((a) => a.text))].join('  ·  ');
  el.className = top ?? '';

  const now = performance.now();
  const silenced = now < silencedUntil;
  const btn = $('btnSilence');
  if (silenced) {
    const left = Math.ceil((silencedUntil - now) / 1000);
    btn.textContent = `Silenced ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  } else {
    btn.textContent = 'Silence alarms';
  }
  btn.classList.toggle('warn', silenced);
  if (top && !silenced && now >= nextAlarmSound) {
    audio.alarm(top);
    nextAlarmSound = now + (top === 'high' ? 3000 : 8000);
  }
}

// ---------- NIBP cycle ----------

function startNibp() {
  if (nibp.measuring) return;
  nibp.measuring = true;
  nibp.startedAt = simTime;
  nibp.cuffStart = Math.min(280, vitals.now('sys') + 35);
  nibp.cuff = nibp.cuffStart;
}

function updateNibp() {
  if (!active.has('nibp')) return;
  if (!nibp.measuring && nibp.intervalMin > 0 && simTime >= nibp.nextAt) startNibp();
  if (!nibp.measuring) return;
  const elapsed = simTime - nibp.startedAt;
  nibp.cuff = nibp.cuffStart - ((nibp.cuffStart - 40) * elapsed) / NIBP_SECONDS;
  if (elapsed >= NIBP_SECONDS) {
    const noise = () => Math.round((Math.random() - 0.5) * 6);
    const sys = Math.round(vitals.now('sys')) + noise();
    const dia = Math.min(sys - 5, Math.round(vitals.now('dia')) + noise());
    nibp.failed = sys < 30;
    nibp.sys = nibp.failed ? null : sys;
    nibp.dia = nibp.failed ? null : Math.max(0, dia);
    nibp.at = simTime;
    nibp.measuring = false;
    nibp.nextAt = simTime + nibp.intervalMin * 60;
  }
}

// ---------- main loop ----------

signals.onBeat = () => {
  if (!active.has('ecg') && !active.has('spo2')) return;
  audio.pulse(active.has('spo2') ? vitals.shown('spo2') : 100);
  const heart = tiles.ecg?.querySelector('.heart');
  if (heart) {
    heart.classList.add('beat');
    setTimeout(() => heart.classList.remove('beat'), 160);
  }
};

function everySecond() {
  vitals.wobble();
  updateNibp();
  alarms = findAlarms();
  renderTiles();
  showAlarms();
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let lastFrame = null;
let sampleDebt = 0;
let secondDebt = 1;
function frame(now) {
  const dt = lastFrame == null ? 0 : Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  simTime += dt * simSpeed;
  vitals.update(dt);
  sampleDebt += dt * SAMPLE_HZ;
  const n = Math.floor(sampleDebt);
  sampleDebt -= n;
  if (n > 0) {
    const buffers = { ecg: [], pleth: [], art: [], cvp: [], co2: [], resp: [], eeg: [] };
    for (let i = 0; i < n; i++) {
      const s = signals.step(1 / SAMPLE_HZ);
      for (const key in buffers) buffers[key].push(s[key]);
    }
    for (const [id, trace] of Object.entries(traces)) trace.draw(buffers[MODULES[id].signal]);
  }
  secondDebt += dt;
  if (secondDebt >= 1) {
    secondDebt -= 1;
    everySecond();
  }
  requestAnimationFrame(frame);
}

// ---------- edit dialog (opened by pressing a tile) ----------

function openEdit(id) {
  const mod = MODULES[id];
  const dlg = $('editDlg');
  const fieldHtml = (key) => `
    <div class="field">
      <label for="f-${key}">${PARAMS[key].label} <small>${unitOf(key)}</small></label>
      <div class="stepper">
        <button type="button" data-step="-1" data-for="${key}" aria-label="Decrease ${PARAMS[key].label}">&minus;</button>
        <input id="f-${key}" type="number" inputmode="decimal" step="${stepOf(key)}" value="${toDisplay(key, toShown(key))}">
        <button type="button" data-step="1" data-for="${key}" aria-label="Increase ${PARAMS[key].label}">+</button>
      </div>
    </div>`;
  const limitHtml = (key) => `
    <div class="field">
      <label>${PARAMS[key].label} <small>${unitOf(key)}</small></label>
      <div class="limits">
        <input id="lo-${key}" type="number" inputmode="decimal" step="${stepOf(key)}" value="${toDisplay(key, vitals.p[key].low) ?? ''}" placeholder="off" aria-label="${PARAMS[key].label} low limit">
        <span>to</span>
        <input id="hi-${key}" type="number" inputmode="decimal" step="${stepOf(key)}" value="${toDisplay(key, vitals.p[key].high) ?? ''}" placeholder="off" aria-label="${PARAMS[key].label} high limit">
      </div>
    </div>`;
  const limited = mod.fields.filter((k) => ALARMED.includes(k));
  const speeds = [['0', 'At once'], ['30', '30 s'], ['60', '1 min'], ['180', '3 min']];

  dlg.innerHTML = `
    <h2>${mod.name}</h2>
    ${locked ? '' : mod.fields.map(fieldHtml).join('')}
    ${id === 'nibp' ? `
      ${locked ? '' : '<p class="note">The cuff shows a new pressure only at its next measurement.</p>'}
      <h3>Measurement</h3>
      <div class="field">
        <label for="nibpInterval">Automatic interval</label>
        <select id="nibpInterval">${NIBP_INTERVALS.map((m) => `<option value="${m}" ${m === nibp.intervalMin ? 'selected' : ''}>${m ? `${m} min` : 'Off'}</option>`).join('')}</select>
      </div>` : ''}
    <div ${locked ? 'hidden' : ''}>
      <h3>Change over</h3>
      <div class="seg">${speeds.map(([v, t]) => `<label><input type="radio" name="speed" value="${v}" ${v === '30' ? 'checked' : ''}>${t}</label>`).join('')}</div>
    </div>
    ${limited.length ? `<h3>Alarm limits</h3>${limited.map(limitHtml).join('')}` : ''}
    <div class="actions">
      ${locked ? '' : '<button type="button" class="danger" data-act="remove">Remove</button>'}
      ${id === 'nibp' ? '<button type="button" data-act="measure">Measure now</button>' : ''}
      <button type="button" data-act="cancel">Cancel</button>
      <button type="button" class="primary" data-act="apply">Apply</button>
    </div>`;

  const input = (key) => dlg.querySelector(`#f-${key}`);
  let reTouched = false;
  const linkEntropy = () => {
    if (id !== 'entropy' || reTouched) return;
    const se = Number(input('se').value);
    input('re').value = Math.min(100, se + entropyGap(se));
  };
  dlg.querySelectorAll('[data-step]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = btn.dataset.for;
      const el = input(key);
      const f = factor(key);
      const next = Number(el.value) + Number(btn.dataset.step) * stepOf(key);
      const clamped = Math.min(PARAMS[key].max * f, Math.max(PARAMS[key].min * f, next));
      el.value = Number(clamped.toFixed(decimalsOf(key)));
      if (key === 're') reTouched = true;
      if (key === 'se') linkEntropy();
    }),
  );
  if (id === 'entropy' && !locked) {
    input('re').addEventListener('input', () => (reTouched = true));
    input('se').addEventListener('input', linkEntropy);
  }

  const apply = () => {
    const seconds = Number(dlg.querySelector('input[name=speed]:checked').value);
    const values = {};
    for (const key of locked ? [] : mod.fields) {
      const raw = input(key).value;
      if (raw !== '' && Number.isFinite(Number(raw))) values[key] = Number(raw) / factor(key);
    }
    if (values.sys != null && values.dia != null) values.dia = Math.min(values.dia, Math.max(0, values.sys - 5));
    if (values.se != null && values.re != null) values.re = Math.max(values.re, values.se);
    for (const [key, v] of Object.entries(values)) {
      if (Math.abs(v - toShown(key)) < 1e-9) continue;
      if (locked) continue;
      if (linked) send({ type: 'override', key, value: v, seconds, from: 'monitor' });
      else vitals.set(key, v, seconds);
    }
    for (const key of limited) {
      const read = (prefix) => {
        const raw = dlg.querySelector(`#${prefix}-${key}`).value;
        return raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw) / factor(key);
      };
      vitals.setLimits(key, read('lo'), read('hi'));
    }
    if (id === 'nibp') {
      const minutes = Number(dlg.querySelector('#nibpInterval').value);
      if (minutes !== nibp.intervalMin) {
        nibp.intervalMin = minutes;
        nibp.nextAt = (nibp.at ?? simTime) + minutes * 60;
      }
    }
  };

  dlg.querySelectorAll('[data-act]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'apply' || act === 'measure') apply();
      if (act === 'measure') startNibp();
      if (act === 'remove') {
        active.delete(id);
        build();
        shareModules();
      }
      dlg.close();
      everySecond();
    }),
  );
  dlg.showModal();
}

// ---------- parameters dialog (add and remove modules) ----------

function openSetup() {
  const dlg = $('setupDlg');
  dlg.innerHTML = `
    <h2>Parameters on this monitor</h2>
    ${ORDER.map((id) => `
      <label class="check">
        <input type="checkbox" data-mod="${id}" ${active.has(id) ? 'checked' : ''}>
        ${MODULES[id].name}<small>${MODULES[id].kind === 'wave' ? 'waveform' : 'number'}</small>
      </label>`).join('')}
    <h3>CO2 unit</h3>
    <div class="seg">${['kPa', 'mmHg'].map((u) => `<label><input type="radio" name="co2Unit" value="${u}" ${settings.co2Unit === u ? 'checked' : ''}>${u}</label>`).join('')}</div>
    <p class="note">Press any number on the monitor to change its value or alarm limits.</p>
    <div class="actions"><button type="button" class="primary" data-act="close">Done</button></div>`;
  dlg.querySelectorAll('[data-mod]').forEach((box) =>
    box.addEventListener('change', () => {
      if (box.checked) active.add(box.dataset.mod);
      else active.delete(box.dataset.mod);
      if (box.dataset.mod === 'nibp' && box.checked) nibp.nextAt = simTime + 3;
      build();
      shareModules();
    }),
  );
  dlg.querySelectorAll('input[name=co2Unit]').forEach((radio) =>
    radio.addEventListener('change', () => {
      settings.co2Unit = radio.value;
      build();
    }),
  );
  dlg.querySelector('[data-act=close]').addEventListener('click', () => dlg.close());
  dlg.showModal();
}

// ---------- top bar ----------

$('btnSetup').addEventListener('click', openSetup);
$('btnSound').addEventListener('click', (e) => {
  if (audio.enabled) audio.disable();
  else audio.enable();
  e.currentTarget.textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  e.currentTarget.classList.toggle('on', audio.enabled);
});
$('btnSilence').addEventListener('click', () => {
  silencedUntil = performance.now() < silencedUntil ? 0 : performance.now() + 120000;
  nextAlarmSound = 0;
  showAlarms();
});
$('btnFull').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});

// ---------- link to the simulation server ----------

const shareModules = () => linked && send({ type: 'setModules', modules: ORDER.filter((id) => active.has(id)), from: 'monitor' });

function onState(state) {
  linked = true;
  simSpeed = state.paused ? 0 : state.speed;
  $('pausedBanner').hidden = !state.paused;
  locked = state.monitorLocked;
  $('btnSetup').hidden = locked;
  for (const [key, value] of Object.entries(state.vitals)) {
    if (key in PARAMS && Math.abs(vitals.target(key) - value) > 1e-6) vitals.set(key, value, 1.2);
  }
  const wanted = state.modules.filter((id) => MODULES[id]);
  if (wanted.length !== active.size || wanted.some((id) => !active.has(id))) {
    if (wanted.includes('nibp') && !active.has('nibp')) nibp.nextAt = simTime + 3;
    active = new Set(wanted);
    build();
  }
  document.querySelector('.patient').firstChild.textContent = `SIMULATION · STATION ${station}`;
}
send = connect(onState);

new ResizeObserver(layout).observe(rowsEl);
build();
requestAnimationFrame(frame);

// Hooks for the instructor remote (added in a later step) and for testing.
window.monitor = {
  vitals,
  nibp,
  setVital: (key, value, seconds = 0) => vitals.set(key, value, seconds),
  setModules: (ids) => {
    active = new Set(ids.filter((id) => MODULES[id]));
    build();
  },
  measureNibp: startNibp,
};
```

<a id="file-public-js-monitor-vitals-js"></a>

### public/js/monitor/vitals.js

```javascript
// Vital-sign values shown on the monitor. Each value moves gradually towards
// its target so that changes look physiological rather than jumping.

export const PARAMS = {
  hr: { label: 'Heart rate', unit: '/min', min: 0, max: 250, step: 1, value: 72, low: 50, high: 120, jitter: 1 },
  spo2: { label: 'SpO2', unit: '%', min: 40, max: 100, step: 1, value: 99, low: 92, high: null, jitter: 0 },
  sys: { label: 'Systolic BP', unit: 'mmHg', min: 0, max: 300, step: 1, value: 122, low: 90, high: 160, jitter: 1.5 },
  dia: { label: 'Diastolic BP', unit: 'mmHg', min: 0, max: 200, step: 1, value: 76, low: null, high: null, jitter: 1 },
  etco2: { label: 'EtCO2', unit: 'kPa', min: 0, max: 12, step: 0.1, decimals: 1, value: 4.8, low: 3.5, high: 6.5, jitter: 0.05 },
  rr: { label: 'Resp rate', unit: '/min', min: 0, max: 60, step: 1, value: 12, low: 8, high: 30, jitter: 0 },
  temp: { label: 'Temperature', unit: '°C', min: 30, max: 42, step: 0.1, decimals: 1, value: 36.6, low: 35.5, high: 38, jitter: 0 },
  se: { label: 'State entropy (SE)', unit: '', min: 0, max: 91, step: 1, value: 88, low: null, high: null, jitter: 1 },
  re: { label: 'Response entropy (RE)', unit: '', min: 0, max: 100, step: 1, value: 97, low: null, high: null, jitter: 1 },
  cvp: { label: 'CVP', unit: 'mmHg', min: 0, max: 30, step: 1, value: 8, low: null, high: null, jitter: 0.5 },
  tofCount: { label: 'TOF count', unit: '', min: 0, max: 4, step: 1, value: 4, low: null, high: null, jitter: 0 },
  tofRatio: { label: 'TOF ratio', unit: '%', min: 0, max: 100, step: 5, value: 100, low: null, high: null, jitter: 0 },
};

/** Typical gap between response and state entropy at a given SE. */
export const entropyGap = (se) => Math.round(2 + 7 * (se / 91) ** 2);

export class Vitals {
  constructor() {
    this.p = {};
    for (const [key, def] of Object.entries(PARAMS)) {
      this.p[key] = { cur: def.value, target: def.value, rate: 0, noise: 0, low: def.low, high: def.high };
    }
  }

  /** Move a value to `value`, taking `seconds` to get there (0 = at once). */
  set(key, value, seconds = 0) {
    const def = PARAMS[key];
    const p = this.p[key];
    p.target = Math.min(def.max, Math.max(def.min, value));
    if (seconds <= 0) p.cur = p.target;
    else p.rate = Math.abs(p.target - p.cur) / seconds;
  }

  setLimits(key, low, high) {
    this.p[key].low = low;
    this.p[key].high = high;
  }

  /** Smooth underlying value (drives the waveforms). */
  now(key) {
    return this.p[key].cur;
  }

  target(key) {
    return this.p[key].target;
  }

  /** Value as displayed: includes a little beat-to-beat variation. */
  shown(key) {
    const def = PARAMS[key];
    const p = this.p[key];
    const raw = p.cur <= def.min ? def.min : p.cur + p.noise;
    const v = Math.min(def.max, Math.max(def.min, raw));
    const f = 10 ** (def.decimals ?? 0);
    return Math.round(v * f) / f;
  }

  update(dt) {
    for (const p of Object.values(this.p)) {
      if (p.cur !== p.target) {
        const stepSize = p.rate * dt;
        if (Math.abs(p.target - p.cur) <= stepSize) p.cur = p.target;
        else p.cur += Math.sign(p.target - p.cur) * stepSize;
      }
    }
  }

  /** Called once a second: refreshes the small random variation. */
  wobble() {
    for (const [key, p] of Object.entries(this.p)) {
      const j = PARAMS[key].jitter;
      p.noise = j ? p.noise * 0.6 + (Math.random() - 0.5) * 2 * j * 0.8 : 0;
    }
  }
}
```

<a id="file-public-js-monitor-waveforms-js"></a>

### public/js/monitor/waveforms.js

```javascript
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
```

<a id="file-public-js-pump-pump-js"></a>

### public/js/pump/pump.js

```javascript
// Pump page: draws each pump and passes key presses to it.
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
// The pumps themselves run on the server; this page shows them and sends key presses.
import { connect, station, withStation } from '../link.js';
import { drawTrend } from '../trend.js';

const $ = (id) => document.getElementById(id);
const pumpsEl = $('pumps');
const MAX_PUMPS = 4;
const STYLE_NAMES = { generic: 'Generic TCI pump', alaris: 'Alaris PK style', agilia: 'Agilia style', space: 'Space style' };
const els = new Map(); // pump id -> element
let state = null;
let audioCtx = null;
let soundOn = false;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- drawing the screen ----------

function listHtml(s, tap) {
  // Show a window of up to five options around the selected one.
  const first = Math.max(0, Math.min(s.index - 2, s.options.length - 5));
  return s.options
    .slice(first, first + 5)
    .map((o, i) => {
      const index = first + i;
      const cls = index === s.index ? 'opt sel' : 'opt';
      const sub = o.sub ? `<small>${esc(o.sub)}</small>` : '';
      return tap
        ? `<button type="button" class="${cls}" data-select="${index}">${esc(o.label)}${sub}</button>`
        : `<div class="${cls}">${esc(o.label)}${sub}</div>`;
    })
    .join('');
}

function screenHtml(s, style) {
  // `style` is the pump's state from the server (for tapToSelect)
  const w = s.words;
  const soft = (left, mid, right) =>
    `<div class="soft">${[left, mid, right]
      .map((k) => k ?? [])
      .map(([key, label]) => (key ?`<button type="button" data-key="${key}">${esc(label)}</button>` : '<span></span>'))
      .join('')}</div>`;
  const title = (text, right = '') =>
    `<div class="lcd-title" style="--drug:${s.color}"><span>${esc(text)}</span><span>${esc(right ?? '')}</span></div>`;
  const alarm = s.alarm
    ? `<div class="lcd-alarm ${s.alarmAcked ? 'acked' : ''}">${esc(s.alarm)}${s.alarmAcked ? '' : ` · press ${esc(w.ok)}`}</div>`
    : '';
  const message = s.message ? `<div class="lcd-msg">${esc(s.message)}</div>` : '';

  switch (s.type) {
    case 'off':
      return '<div class="lcd-off">Pump is off<br><small>Press the power button</small></div>';
    case 'list':
      return title(s.title, s.progress) + alarm + `<div class="lcd-body list">${listHtml(s, style.tapToSelect)}</div>` + message +
        soft(['BACK', w.back], null, ['OK', w.ok]);
    case 'number':
      return title(s.title, s.progress) + alarm +
        `<div class="lcd-body num"><b>${s.value}</b><span>${esc(s.unit)}</span>${s.cursor ? `<small>◀ ▶ step ${s.cursor}</small>` : ''}</div>` +
        message + soft(['BACK', w.back], null, ['OK', w.ok]);
    case 'error':
      return title(s.title) + `<div class="lcd-body err">${s.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` +
        soft(['BACK', w.back], null, ['OK', w.ok]);
    case 'confirm':
      return title('Confirm settings', s.progress) +
        `<div class="lcd-body sum">
          <p><b>${esc(s.header)}</b></p><p>${esc(s.sub)}</p><p>${esc(s.patient)}</p><p>${esc(s.syringe)}</p>
          <p class="hl">${esc(s.target)}</p>
          ${s.induction ? `<p>Induction: ${esc(s.induction)}</p>` : ''}
        </div>` +
        (message || `<div class="lcd-msg">Press ${esc(w.start)} to begin</div>`) +
        soft(['BACK', w.back], null, ['START', w.start]);
    case 'run': {
      const conc = (label, value) => `<div class="conc"><label>${label}</label><b>${value ?? '--'}</b></div>`;
      return title(s.header, s.elapsed) + alarm +
        `<div class="lcd-body run">
          <div class="run-sub"><span>${esc(s.sub)}</span><span class="state ${s.held ? 'held' : ''}">${esc(s.state)}</span></div>
          <div class="run-main">
            <div class="target"><label>${esc(s.targetLabel)}</label><b>${s.pending ?? s.target}</b><span>${esc(s.targetUnit)}</span></div>
            <div class="concs">${conc('Cp', s.cp)}${conc('Ce', s.ce)}<small>${esc(s.concUnit)}</small></div>
          </div>
          ${s.pending ? `<div class="pending">New ${esc(s.targetLabel.toLowerCase())} ${s.pending} (was ${s.target}): ${esc(w.ok)} to confirm</div>` : ''}
          <div class="run-row"><span>Rate <b>${s.rate}</b> mL/h</span><span>${esc(s.perKg)}</span></div>
          <div class="run-row"><span>Volume <b>${s.volume}</b> mL</span><span>Dose ${esc(s.dose)}</span></div>
          <div class="run-row"><span class="syr"><i style="width:${Math.round(s.syringeFraction * 100)}%"></i></span><span>Syringe ${s.syringeLeft} mL</span></div>
          <div class="run-row dim"><span>${esc(s.decrement)}</span><span>${esc(s.patient)}</span></div>
        </div>` + message +
        soft(s.pending ? ['BACK', w.back] : ['MENU', w.menu], null, s.pending ? ['OK', w.ok] : s.held ? ['START', w.start] : null);
    }
  }
  return '';
}

// Replace an element's content only when it has changed. Rewriting a button
// between the press and the release of a click makes the browser drop the
// click, which made the pumps ignore presses while values were updating.
function setHtml(el, html) {
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  el.innerHTML = html;
}

function render(p) {
  let el = els.get(p.id);
  if (!el) {
    el = document.createElement('section');
    el.innerHTML = `
      <div class="pump-top">
        <button type="button" class="power" data-power aria-label="Power on or off">&#9211;</button>
        <span class="label"></span>
        <button type="button" class="remove" data-remove aria-label="Remove this pump">&times;</button>
      </div>
      <div class="lcd" aria-live="off"><div class="lcd-main"></div><div class="lcd-softkeys"></div></div>
      <div class="keys"></div>`;
    el.addEventListener('click', (e) => onPumpClick(p.id, e.target.closest('button')));
    els.set(p.id, el);
    pumpsEl.append(el);
  }
  const s = p.screen;
  el.className = `pump style-${p.styleId}${s.on ? '' : ' is-off'}${p.alarmSounding ? ' alarming' : ''}`;
  // The changing values and the softkeys are drawn separately, so that the
  // softkeys stay in place while the numbers above them update.
  const html = screenHtml(s, p);
  const cut = html.lastIndexOf('<div class="soft">');
  setHtml(el.querySelector('.lcd-main'), cut < 0 ? html : html.slice(0, cut));
  setHtml(el.querySelector('.lcd-softkeys'), cut < 0 ? '' : html.slice(cut));
  el.querySelector('.label').textContent = `Pump ${p.id} · ${p.styleName}`;
  const keysEl = el.querySelector('.keys');
  if (keysEl.dataset.style !== p.styleId) {
    keysEl.dataset.style = p.styleId;
    keysEl.innerHTML = p.keys
      .map((row) => `<div class="key-row">${row.map(([key, label, cls = '']) => `<button type="button" class="key ${cls}" data-key="${key}">${esc(label)}</button>`).join('')}</div>`)
      .join('');
  }
}

function onPumpClick(id, button) {
  if (!button) return;
  const p = state.pumps.find((x) => x.id === id);
  const infusing = p?.infusing;
  if (button.dataset.key) send({ type: 'pumpKey', pump: id, key: button.dataset.key });
  else if (button.dataset.select) send({ type: 'pumpSelect', pump: id, index: Number(button.dataset.select) });
  else if ('power' in button.dataset) {
    if (p.screen.on && infusing && !confirm('Switch this pump off? The infusion will stop.')) return;
    send({ type: 'pumpPower', pump: id });
  } else if ('remove' in button.dataset) {
    if (infusing && !confirm('Remove this pump? The infusion will stop.')) return;
    send({ type: 'removePump', pump: id });
  }
}

function onState(next) {
  state = next;
  for (const [id, el] of els) {
    if (!state.pumps.some((p) => p.id === id)) {
      el.remove();
      els.delete(id);
    }
  }
  state.pumps.forEach(render);
  $('addPump').disabled = state.pumps.length >= MAX_PUMPS;
  $('style').value = state.styleId;
  $('simInfo').textContent = `Station ${station} · ${state.clock}${state.paused ? ' · PAUSED' : state.speed > 1 ? ` · x${state.speed}` : ''}`;
  $('pausedBanner').hidden = !state.paused;
  $('trendBox').hidden = !state.showTrend;
  if (state.showTrend) drawTrend($('trend'), state.history, state.trendShow);
}

const send = connect(onState, (ok) => document.body.classList.toggle('offline', !ok));

// ---------- alarm sound ----------

setInterval(() => {
  if (!soundOn || !state?.pumps.some((p) => p.alarmSounding)) return;
  for (const delay of [0, 0.22, 0.44]) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 2400;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + 0.12);
  }
}, 2500);

// ---------- top bar ----------

const styleSelect = $('style');
styleSelect.innerHTML = Object.entries(STYLE_NAMES).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('');
styleSelect.addEventListener('change', () => send({ type: 'setStyle', style: styleSelect.value }));
$('addPump').addEventListener('click', () => send({ type: 'addPump' }));
$('sound').addEventListener('click', (e) => {
  soundOn = !soundOn;
  if (soundOn) {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
  }
  e.currentTarget.textContent = soundOn ? 'Sound: on' : 'Sound: off';
  e.currentTarget.classList.toggle('on', soundOn);
});
$('home').href = withStation('index.html');
```

<a id="file-public-js-trend-js"></a>

### public/js/trend.js

```javascript
// Trend graph of the patient's drug levels and the pump infusion rates.
//   Ce (effect site)  solid line
//   Cp (plasma)       dashed line
//   Rate              stepped line in its own panel underneath, in mL/h
// Drugs measured in mcg/mL use the left axis, drugs in ng/mL the right axis.

export const DRUG_COLORS = {
  propofol: '#ffd84d',
  remifentanil: '#6cb6ff',
  sufentanil: '#b39bff',
  dexmedetomidine: '#ffab66',
  ketamine: '#7ee0a0',
};
const LEFT_AXIS = ['propofol', 'ketamine'];
const NICE = [0.5, 1, 2, 4, 6, 8, 10, 15, 20, 30, 50, 100, 150, 200, 300, 500, 1000, 1500];
const niceMax = (v) => NICE.find((n) => n >= v * 1.1) ?? Math.ceil(v * 1.1);
const GRID = '#2a3541';
const TEXT = '#9aa7b4';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{t:number, ce:object, cp?:object, rate?:object}[]} history
 * @param {{cp:boolean, ce:boolean, rate:boolean}} show  which lines to draw
 */
export function drawTrend(canvas, history, show = { cp: true, ce: true, rate: true }) {
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.font = '12px system-ui, sans-serif';

  const drugs = [...new Set(history.flatMap((p) => Object.keys(p.ce)))];
  const showConc = show.cp || show.ce;
  const pad = { l: 36, r: 36, t: 24, b: 22 };
  const w = width - pad.l - pad.r;
  const fullH = height - pad.t - pad.b;
  const gap = 26;
  // Concentrations on top; the rate panel takes the lower third when both are shown.
  const rateH = show.rate ? (showConc ? Math.round(fullH * 0.32) : fullH) : 0;
  const concH = showConc ? fullH - (show.rate ? rateH + gap : 0) : 0;
  const rateTop = pad.t + (showConc ? concH + gap : 0);

  const t0 = history[0]?.t ?? 0;
  const t1 = Math.max(t0 + 600, history.at(-1)?.t ?? 0);
  const x = (t) => pad.l + ((t - t0) / (t1 - t0)) * w;

  const gridLines = (top, h, rows, labelLeft, labelRight) => {
    ctx.strokeStyle = GRID;
    ctx.fillStyle = TEXT;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let i = 0; i <= rows; i++) {
      const gy = top + (h * i) / rows;
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(pad.l + w, gy);
      ctx.stroke();
      const frac = (rows - i) / rows;
      if (labelLeft != null) {
        ctx.textAlign = 'right';
        ctx.fillText(String(Number((labelLeft * frac).toFixed(2))), pad.l - 5, gy + 4);
      }
      if (labelRight != null) {
        ctx.textAlign = 'left';
        ctx.fillText(String(Number((labelRight * frac).toFixed(2))), pad.l + w + 5, gy + 4);
      }
    }
  };

  const line = (drug, pick, y, { dashed = false, stepped = false } = {}) => {
    ctx.strokeStyle = DRUG_COLORS[drug] ?? '#fff';
    ctx.lineWidth = dashed ? 1.5 : 2;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    let last = null;
    for (const p of history) {
      const v = pick(p);
      if (v == null) continue;
      const px = x(p.t);
      const py = y(v);
      if (last == null) ctx.moveTo(px, py);
      else {
        if (stepped) ctx.lineTo(px, last);
        ctx.lineTo(px, py);
      }
      last = py;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // ---------- concentrations ----------
  if (showConc) {
    const max = { left: 0, right: 0 };
    for (const p of history) {
      for (const drug of drugs) {
        const side = LEFT_AXIS.includes(drug) ? 'left' : 'right';
        if (show.ce) max[side] = Math.max(max[side], p.ce[drug] ?? 0);
        if (show.cp) max[side] = Math.max(max[side], p.cp?.[drug] ?? 0);
      }
    }
    const top = { left: niceMax(max.left || 4), right: niceMax(max.right || 4) };
    gridLines(pad.t, concH, 4, top.left, top.right);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.fillText('mcg/mL', 2, 12);
    ctx.textAlign = 'right';
    ctx.fillText('ng/mL', width - 2, 12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t - 2, w, concH + 4);
    ctx.clip();
    for (const drug of drugs) {
      const side = LEFT_AXIS.includes(drug) ? 'left' : 'right';
      const y = (v) => pad.t + concH - (v / top[side]) * concH;
      if (show.cp) line(drug, (p) => p.cp?.[drug], y, { dashed: true });
      if (show.ce) line(drug, (p) => p.ce[drug], y);
    }
    ctx.restore();
  }

  // ---------- infusion rate ----------
  if (show.rate) {
    const rates = history.flatMap((p) => Object.values(p.rate ?? {})).filter((v) => v > 0).sort((a, b) => a - b);
    const peak = rates.at(-1) ?? 0;
    const median = rates[Math.floor(rates.length / 2)] ?? 0;
    // Induction boluses are far above the maintenance rate; cut them off so
    // that the maintenance rate stays readable.
    const top = niceMax(Math.min(peak, median * 3) || 100);
    const cut = peak > top;
    gridLines(rateTop, rateH, 2, top, null);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(`Rate mL/h${cut ? ' (bolus peaks cut off)' : ''}`, pad.l + 4, rateTop - 6);
    const y = (v) => rateTop + rateH - (Math.min(v, top) / top) * rateH;
    for (const drug of drugs) line(drug, (p) => p.rate?.[drug], y, { stepped: true });
  }

  // ---------- time axis ----------
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'center';
  const minutes = (t1 - t0) / 60;
  const every = [1, 2, 5, 10, 15, 30, 60].find((m) => minutes / m <= 8) ?? 120;
  for (let m = Math.ceil(t0 / 60 / every) * every; m <= t1 / 60; m += every) {
    ctx.fillText(`${m} min`, Math.min(x(m * 60), width - 20), height - 6);
  }

  // ---------- legend ----------
  let legendX = pad.l + 44;
  ctx.textAlign = 'left';
  for (const drug of drugs) {
    ctx.fillStyle = DRUG_COLORS[drug] ?? '#fff';
    ctx.fillText(drug, legendX, 12);
    legendX += ctx.measureText(drug).width + 14;
  }
  if (drugs.length && showConc) {
    const key = [show.ce && 'solid = Ce', show.cp && 'dashed = Cp'].filter(Boolean).join(', ');
    ctx.fillStyle = TEXT;
    if (legendX + ctx.measureText(key).width < width - 50) ctx.fillText(key, legendX, 12);
  }
  if (!drugs.length || (!showConc && !show.rate)) {
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(drugs.length ? 'Tick Cp, Ce or Rate to show a line' : 'No drug given yet', pad.l + w / 2, pad.t + fullH / 2);
  }
}
```

## Tests (test)

<a id="file-test-engine-test-js"></a>

### test/engine.test.js

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, validatePatient, modelsForDrug, MODELS, DRUGS } from '../src/engine/models.js';
import { buildStepper, advance, timeToPeakEffect, ke0FromTimeToPeak } from '../src/engine/pk.js';
import { Infusion } from '../src/engine/infusion.js';

const near = (actual, expected, relTol, label = '') =>
  assert.ok(
    Math.abs(actual - expected) <= Math.abs(expected) * relTol,
    `${label} expected ${expected} within ${relTol * 100}%, got ${actual}`,
  );

const adult = { age: 40, weight: 70, height: 170, sex: 'male' };
const eleveldRef = { age: 35, weight: 70, height: 170, sex: 'male' };

// ---------- Model parameters against published values ----------

test('Marsh: published volumes for 70 kg', () => {
  const m = buildModel('marsh', adult);
  near(m.v1, 15.96, 0.001, 'V1');
  near(m.v2, 32.4, 0.005, 'V2');
  near(m.v3, 202.5, 0.005, 'V3');
  assert.equal(m.k10, 0.119);
  assert.equal(m.ke0, 0.26);
});

test('Schnider: published values for 40 y, 70 kg, 170 cm male', () => {
  const m = buildModel('schnider', adult);
  assert.equal(m.v1, 4.27);
  near(m.v2, 24.0, 0.002, 'V2');
  near(m.k10, 0.384, 0.003, 'k10');
  near(m.k12, 0.375, 0.003, 'k12');
  near(m.k21, 0.067, 0.01, 'k21');
  near(m.k13, 0.196, 0.003, 'k13');
  near(m.k31, 0.0035, 0.01, 'k31');
});

test('Minto: 40 y, 80 kg, 180 cm male matches the PyTCI reference trace', () => {
  const m = buildModel('minto', { age: 40, weight: 80, height: 180, sex: 'male' });
  assert.equal(m.v3, 5.42);
  near(m.ke0, 0.595, 1e-9, 'ke0');
  const step = buildStepper(m, 1);
  let s = [50, 0, 0, 0];
  near(s[0] / m.v1, 8.84, 0.002, 'Cp at 0 s');
  for (let i = 0; i < 60; i++) s = advance(step, s, 0);
  near(s[0] / m.v1, 3.88, 0.015, 'Cp at 60 s');
});

test('Eleveld propofol: reference individual', () => {
  const m = buildModel('eleveldPropofol', eleveldRef, { opioids: false });
  near(m.v1, 6.28, 0.002, 'V1');
  near(m.v2, 25.5, 0.002, 'V2');
  near(m.v3, 273, 0.002, 'V3');
  near(m.cl1, 1.79, 0.002, 'CL');
  // Q2ref 1.75 is multiplied by the paper's Q3-maturation term, 1.046 in an adult.
  near(m.cl2, 1.83, 0.002, 'Q2');
  near(m.cl3, 1.11, 0.002, 'Q3');
  near(m.ke0, 0.146, 1e-9, 'ke0');
});

test('Eleveld propofol: opioid and female effects', () => {
  const withOpioids = buildModel('eleveldPropofol', eleveldRef);
  near(withOpioids.cl1, 1.6195, 0.001, 'CL with opioids');
  assert.ok(withOpioids.v3 < 273 * 0.7);
  const female = buildModel('eleveldPropofol', { ...eleveldRef, sex: 'female' }, { opioids: false });
  near(female.cl1, 2.1, 0.002, 'female CL');
  near(female.v3, 225, 0.005, 'female V3');
});

test('Eleveld remifentanil: reference individual and female', () => {
  const m = buildModel('eleveldRemifentanil', eleveldRef);
  near(m.v1, 5.81, 0.002, 'V1');
  near(m.v2, 8.82, 0.002, 'V2');
  near(m.v3, 5.03, 0.002, 'V3');
  near(m.cl1, 2.58, 0.002, 'CL');
  near(m.cl2, 1.72, 0.005, 'Q2');
  near(m.cl3, 0.124, 0.005, 'Q3');
  near(m.ke0, 1.09, 1e-9, 'ke0');
  const f = buildModel('eleveldRemifentanil', { ...eleveldRef, sex: 'female' });
  near(f.v1, 4.79, 0.003, 'female V1');
  near(f.v2, 10.06, 0.003, 'female V2');
  near(f.cl1, 3.09, 0.003, 'female CL');
});

test('Paedfusor: 6 y, 20 kg', () => {
  const m = buildModel('paedfusor', { age: 6, weight: 20 });
  near(m.v1, 9.2, 0.005, 'V1');
  near(m.v2, 19.0, 0.005, 'V2');
  near(m.v3, 117, 0.01, 'V3');
  near(m.k10, 0.0624, 0.01, 'k10');
  assert.equal(m.effectSiteTargeting, false);
});

test('Paedfusor at 16 y equals Marsh kinetics', () => {
  const p = buildModel('paedfusor', { age: 16, weight: 50 });
  const m = buildModel('marsh', { age: 16, weight: 50 });
  near(p.v1, m.v1, 0.01, 'V1');
  near(p.k10, 0.119, 1e-9, 'k10');
});

test('Kataria, Hannivoort, Gepts, Domino: basic parameters', () => {
  const k = buildModel('kataria', { age: 6, weight: 20 });
  near(k.v1, 8.2, 1e-9);
  near(k.v2, 18.2, 1e-9);
  near(k.cl1, 0.7, 1e-9);
  const h = buildModel('hannivoort', adult);
  near(h.v1, 1.78, 1e-9);
  near(h.cl1, 0.686, 1e-9);
  near(h.cl2, 2.98, 1e-9);
  const g = buildModel('gepts', adult);
  near(g.cl1, 0.92, 0.005);
  near(g.v2, 63.4, 0.005);
  const d = buildModel('domino', adult);
  near(d.v1, 4.41, 1e-9);
  assert.equal(d.ke0, null);
});

test('every model builds for a suitable patient and belongs to a known drug', () => {
  for (const id of Object.keys(MODELS)) {
    const patient = MODELS[id].limits.age[1] <= 16 ? { age: 6, weight: 20 } : adult;
    const m = buildModel(id, patient);
    for (const key of ['v1', 'v2', 'v3', 'k10', 'k12', 'k13', 'k21', 'k31']) {
      assert.ok(m[key] > 0, `${id}.${key}`);
    }
    assert.ok(DRUGS[m.drug], `${id} drug`);
  }
  assert.deepEqual(modelsForDrug('remifentanil'), ['minto', 'eleveldRemifentanil']);
});

// ---------- Patient limits ----------

test('patient limits are enforced like a pump', () => {
  assert.ok(validatePatient('marsh', { age: 10, weight: 35 }).length > 0);
  assert.ok(validatePatient('kataria', { age: 13, weight: 40 }).length > 0);
  assert.ok(validatePatient('paedfusor', { age: 6, weight: 70 }).length > 0);
  assert.ok(validatePatient('schnider', { age: 40, weight: 70, height: 170 }).length > 0); // no sex
  // James lean body mass fails in severe obesity (BMI over about 42 in men, 35 in women)
  assert.ok(validatePatient('schnider', { age: 40, weight: 130, height: 165, sex: 'male' }).length > 0);
  assert.ok(validatePatient('minto', { age: 40, weight: 100, height: 160, sex: 'female' }).length > 0);
  assert.deepEqual(validatePatient('eleveldPropofol', { age: 40, weight: 130, height: 165, sex: 'male' }), []);
  assert.throws(() => buildModel('marsh', { age: 10, weight: 35 }));
});

// ---------- Kinetics ----------

test('time to peak effect matches published values', () => {
  near(timeToPeakEffect(buildModel('schnider', adult)), 1.6, 0.1, 'Schnider');
  near(timeToPeakEffect(buildModel('marshModified', adult)), 1.6, 0.06, 'modified Marsh');
  const slow = timeToPeakEffect(buildModel('marsh', adult)); // usually quoted as about 4 to 4.5 min
  assert.ok(slow > 3.5 && slow < 5, `Marsh ke0 0.26 peak at ${slow} min`);
  near(ke0FromTimeToPeak(buildModel('marsh', adult), 1.6), 1.2, 0.06, 'ke0 for 1.6 min');
});

test('a constant infusion settles at rate / clearance', () => {
  for (const id of ['marsh', 'schnider', 'minto', 'eleveldPropofol', 'hannivoort']) {
    const m = buildModel(id, adult);
    const hour = buildStepper(m, 3600);
    let s = [0, 0, 0, 0];
    for (let i = 0; i < 24 * 30; i++) s = advance(hour, s, 10);
    near(s[0] / m.v1, 10 / m.cl1, 1e-4, `${id} Cp`);
    if (m.ke0 != null) near(s[3], 10 / m.cl1, 1e-4, `${id} Ce`);
    // at steady state every compartment has the same concentration
    near(s[1] / m.v2, 10 / m.cl1, 1e-4, `${id} C2`);
    near(s[2] / m.v3, 10 / m.cl1, 1e-3, `${id} C3`);
  }
});

test('one 60 s step equals sixty 1 s steps', () => {
  const m = buildModel('minto', adult);
  const one = buildStepper(m, 1);
  const sixty = buildStepper(m, 60);
  let a = [3, 1, 2, 0.5];
  for (let i = 0; i < 60; i++) a = advance(one, a, 7);
  const b = advance(sixty, [3, 1, 2, 0.5], 7);
  for (let i = 0; i < 4; i++) near(a[i], b[i], 1e-7, `state ${i}`);
});

// ---------- Target-controlled infusion ----------

test('plasma TCI, Marsh 4 mcg/mL: loading dose, hold, and maintenance rate', () => {
  const m = buildModel('marsh', adult);
  const pump = new Infusion({ model: m, concentration: 10 });
  pump.setTarget('plasma', 4);
  pump.tick(30);
  near(pump.cp, 4, 0.01, 'Cp at 30 s');
  assert.ok(pump.totalDose > 63.8 && pump.totalDose < 75, `loading dose ${pump.totalDose} mg`);
  let maxCp = 0;
  for (let i = 0; i < 60 * 60; i++) {
    pump.tick();
    maxCp = Math.max(maxCp, pump.cp);
    assert.ok(pump.rateMlH <= 1200 + 1e-9);
    if (pump.timeS % 10 === 0) near(pump.cp, 4, 0.005, `Cp at ${pump.timeS} s`);
  }
  assert.ok(maxCp < 4.02, `no overshoot, max ${maxCp}`);
  near(pump.volumeMl, pump.totalDose / 10, 1e-9, 'volume');
  // After many hours the rate approaches target x clearance.
  pump.tick(48 * 3600);
  near(pump.deliveredRate, 4 * m.cl1, 0.03, 'steady rate');
});

test('effect-site TCI, Schnider 4 mcg/mL: peaks at target without overshoot', () => {
  const m = buildModel('schnider', adult);
  const pump = new Infusion({ model: m, concentration: 10 });
  pump.setTarget('effect', 4);
  let maxCe = 0;
  let maxCp = 0;
  let reached = null;
  for (let i = 0; i < 30 * 60; i++) {
    pump.tick();
    maxCe = Math.max(maxCe, pump.ce);
    maxCp = Math.max(maxCp, pump.cp);
    if (reached == null && pump.ce >= 4 * 0.98) reached = pump.timeS;
    if (reached != null) near(pump.ce, 4, 0.025, `Ce at ${pump.timeS} s`);
  }
  assert.ok(maxCe <= 4 * 1.005, `Ce overshoot ${maxCe}`);
  assert.ok(maxCp > 6, `plasma overshoot expected, got ${maxCp}`);
  assert.ok(reached != null && reached < 4 * 60, `reached target at ${reached} s`);
});

test('effect-site TCI: lowering the target stops the pump until Ce arrives', () => {
  const pump = new Infusion({ model: buildModel('minto', adult), concentration: 50 });
  pump.setTarget('effect', 6);
  pump.tick(15 * 60);
  near(pump.ce, 6, 0.02);
  pump.setTarget('effect', 3);
  pump.tick(10);
  assert.equal(pump.deliveredRate, 0);
  let minCe = Infinity;
  for (let i = 0; i < 20 * 60; i++) {
    pump.tick();
    minCe = Math.min(minCe, pump.ce);
  }
  assert.ok(minCe > 3 * 0.97, `undershoot ${minCe}`);
  near(pump.ce, 3, 0.02);
  assert.ok(pump.deliveredRate > 0);
});

test('effect-site targeting is refused for plasma-only models', () => {
  const pump = new Infusion({ model: buildModel('domino', adult), concentration: 10 });
  assert.throws(() => pump.setTarget('effect', 0.2));
  pump.setTarget('plasma', 0.2);
  pump.tick(120);
  near(pump.cp, 0.2, 0.01);
  assert.equal(pump.ce, null);
});

test('every model holds its default target in plasma mode', () => {
  for (const id of Object.keys(MODELS)) {
    const patient = MODELS[id].limits.age[1] <= 16 ? { age: 6, weight: 20 } : adult;
    const model = buildModel(id, patient);
    const drug = DRUGS[model.drug];
    const pump = new Infusion({ model, concentration: drug.concentrations[0] });
    pump.setTarget('plasma', drug.defaultTarget);
    pump.tick(20 * 60);
    near(pump.cp, drug.defaultTarget, 0.01, id);
    if (model.effectSiteTargeting) {
      const e = new Infusion({ model, concentration: drug.concentrations[0] });
      e.setTarget('effect', drug.defaultTarget);
      let max = 0;
      for (let i = 0; i < 90 * 60; i++) {
        e.tick();
        max = Math.max(max, e.ce);
      }
      assert.ok(max <= drug.defaultTarget * 1.005, `${id} Ce overshoot ${max}`);
      near(e.ce, drug.defaultTarget, 0.03, `${id} Ce`);
    }
  }
});

// ---------- Manual mode, pause, decrement time ----------

test('manual rate and bolus account for dose and volume', () => {
  const pump = new Infusion({ model: buildModel('marsh', adult), concentration: 10 });
  pump.setManualRateMlH(60); // 600 mg/h = 10 mg/min
  pump.tick(600);
  near(pump.totalDose, 100, 1e-9, 'dose');
  near(pump.volumeMl, 10, 1e-9, 'volume');
  pump.bolus(50); // at 1200 mL/h = 200 mg/min, takes 15 s
  pump.tick(15);
  near(pump.totalDose, 150, 1e-9, 'dose after bolus');
  pump.tick(1);
  near(pump.rateMlH, 60, 1e-9, 'returns to the set rate');
});

test('pause stops delivery and the concentration falls', () => {
  const pump = new Infusion({ model: buildModel('schnider', adult), concentration: 10 });
  pump.setTarget('plasma', 3);
  pump.tick(300);
  const dose = pump.totalDose;
  pump.pause();
  pump.tick(120);
  assert.equal(pump.totalDose, dose);
  assert.ok(pump.cp < 2.5);
  pump.resume();
  pump.tick(60);
  near(pump.cp, 3, 0.01);
});

test('decrement time grows with the length of the infusion', () => {
  const pump = new Infusion({ model: buildModel('marsh', adult), concentration: 10 });
  pump.setTarget('effect', 4);
  pump.tick(15 * 60);
  const short = pump.decrementTime(1.5);
  pump.tick(4 * 3600);
  const long = pump.decrementTime(1.5);
  assert.ok(short > 60 && long > short, `short ${short} s, long ${long} s`);
  // Check the prediction by actually stopping the pump.
  pump.stop();
  pump.tick(long - 20);
  assert.ok(pump.ce > 1.5);
  pump.tick(40);
  assert.ok(pump.ce < 1.5);
  assert.equal(pump.decrementTime(10), 0);
});
```

<a id="file-test-sim-test-js"></a>

### test/sim.test.js

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Station } from '../src/sim/station.js';

// Program pump `index` by pressing OK through every step, optionally changing
// the highlighted option at named steps, then press start.
function program(station, index, choices = {}) {
  const id = station.pumps[index].id;
  const key = (k) => station.action({ type: 'pumpKey', pump: id, key: k });
  station.action({ type: 'pumpPower', pump: id });
  for (let i = 0; i < 30; i++) {
    const s = station.pumps[index].unit.screen();
    if (s.type === 'confirm') break;
    for (let n = 0; n < (choices[s.title] ?? 0); n++) key('DOWN');
    key('OK');
  }
  key('START');
}
const run = (station, seconds) => {
  for (let i = 0; i < seconds; i++) station.tick();
};

test('awake patient stays at baseline', () => {
  const s = new Station('t');
  run(s, 300);
  const v = s.vitals();
  assert.ok(v.se > 85 && v.hr > 65 && v.hr < 80 && v.sys > 115 && v.spo2 > 97 && v.rr > 10, JSON.stringify(v));
});

test('propofol and remifentanil TCI: asleep, lower pressure, apnoea, then desaturation', () => {
  const s = new Station('t');
  program(s, 0); // propofol Marsh effect-site 4
  program(s, 1, { 'Select drug': 1 }); // remifentanil Minto effect-site 3
  assert.equal(s.pumps[1].unit.cfg.drug, 'remifentanil');
  run(s, 240);
  let v = s.vitals();
  assert.ok(v.se < 60, `SE ${v.se}`);
  assert.ok(v.sys < 110 && v.sys > 70, `sys ${v.sys}`);
  assert.ok(v.hr < 72, `HR ${v.hr}`);
  assert.equal(v.rr, 0, 'apnoeic');
  assert.ok(v.spo2 > 95, `preoxygenated, SpO2 ${v.spo2}`);
  run(s, 240);
  assert.ok(s.vitals().spo2 < 92, `desaturates without ventilation, SpO2 ${s.vitals().spo2}`);

  s.action({ type: 'event', name: 'ventilation', on: true });
  run(s, 120);
  v = s.vitals();
  assert.ok(v.spo2 > 96 && v.rr > 10 && v.etco2 > 4, JSON.stringify(v));
});

test('stimulation raises heart rate and pressure more without an opioid', () => {
  const respond = (withOpioid) => {
    const s = new Station('t');
    program(s, 0);
    if (withOpioid) program(s, 1, { 'Select drug': 1 });
    s.action({ type: 'event', name: 'ventilation', on: true });
    run(s, 600);
    const before = { ...s.vitals() };
    s.action({ type: 'event', name: 'intubation' });
    run(s, 40);
    const after = s.vitals();
    return { hr: after.hr - before.hr, sys: after.sys - before.sys, se: after.se - before.se };
  };
  const plain = respond(false);
  const covered = respond(true);
  assert.ok(plain.hr > 8 && plain.sys > 10 && plain.se > 3, JSON.stringify(plain));
  assert.ok(covered.hr < plain.hr / 2 && covered.sys < plain.sys / 2, JSON.stringify(covered));
});

test('disconnected line: the pump display rises but the patient gets nothing', () => {
  const s = new Station('t');
  s.action({ type: 'event', name: 'line', connected: false });
  program(s, 0);
  run(s, 300);
  assert.ok(s.pumps[0].unit.infusion.ce > 3.5);
  assert.ok((s.patient.levels().propofol?.ce ?? 0) < 0.01);
  assert.ok(s.vitals().se > 85);
});

test('drug stays in the patient after the pump is switched off', () => {
  const s = new Station('t');
  program(s, 0);
  run(s, 300);
  s.action({ type: 'pumpPower', pump: s.pumps[0].id });
  run(s, 10);
  assert.ok(s.patient.levels().propofol.ce > 3);
});

test('instructor override ramps a value and release returns it to the model', () => {
  const s = new Station('t');
  run(s, 10);
  s.action({ type: 'override', key: 'hr', value: 140, seconds: 60 });
  run(s, 30);
  const mid = s.vitals().hr;
  assert.ok(mid > 95 && mid < 115, `halfway ${mid}`);
  run(s, 60);
  assert.equal(s.vitals().hr, 140);
  s.action({ type: 'release', key: 'hr' });
  assert.ok(s.vitals().hr < 80);
});

test('bleeding lowers pressure and raises heart rate; occlusion alarms the pump', () => {
  const s = new Station('t');
  s.action({ type: 'event', name: 'bleeding', on: true });
  run(s, 300);
  const v = s.vitals();
  assert.ok(v.sys < 105 && v.hr > 90, JSON.stringify(v));

  program(s, 0);
  run(s, 60);
  s.action({ type: 'event', name: 'occlusion', pump: s.pumps[0].id, on: true });
  run(s, 5);
  const screen = s.pumps[0].unit.screen();
  assert.equal(screen.alarm, 'OCCLUSION');
  assert.equal(s.pumps[0].unit.infusion.deliveredRate, 0);
  assert.ok(s.log.some((e) => e.text.includes('OCCLUSION')));
  assert.throws(() => s.action({ type: 'nonsense' }));
});
```

## Tools (tools)

<a id="file-tools-make-code-doc-js"></a>

### tools/make-code-doc.js

```javascript
// Builds docs/SOURCE-CODE.md and docs/SOURCE-CODE.html: every source file of
// the simulator in one document. Run with:  npm run docs:code
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'docs');
const SKIP_DIRS = new Set(['node_modules', '.claude', '.git', 'docs']);
const SKIP_FILES = new Set(['.DS_Store']);
const LANG = { '.js': 'javascript', '.css': 'css', '.html': 'html', '.json': 'json', '.md': 'markdown' };

// Order of sections in the document, then alphabetical within each.
const GROUPS = [
  ['Project files', (p) => !p.includes('/')],
  ['Simulation engine (src/engine)', (p) => p.startsWith('src/engine/')],
  ['Simulation model (src/sim)', (p) => p.startsWith('src/sim/')],
  ['Web pages (public/*.html)', (p) => /^public\/[^/]+\.html$/.test(p)],
  ['Styles (public/css)', (p) => p.startsWith('public/css/')],
  ['Browser code (public/js)', (p) => p.startsWith('public/js/')],
  ['Tests (test)', (p) => p.startsWith('test/')],
  ['Tools (tools)', (p) => p.startsWith('tools/')],
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...(await walk(join(dir, entry.name))));
    } else if (!SKIP_FILES.has(entry.name) && LANG[extname(entry.name)]) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const anchor = (p) => 'file-' + p.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const paths = (await walk(ROOT)).map((f) => relative(ROOT, f).split(sep).join('/')).sort();
const files = [];
for (const path of paths) {
  const text = (await readFile(join(ROOT, path), 'utf8')).replace(/\s+$/, '') + '\n';
  files.push({ path, text, lines: text.split('\n').length - 1, lang: LANG[extname(path)] });
}
const sections = GROUPS.map(([title, test]) => ({ title, files: files.filter((f) => test(f.path)) })).filter((s) => s.files.length);
const missing = files.filter((f) => !sections.some((s) => s.files.includes(f)));
if (missing.length) sections.push({ title: 'Other files', files: missing });
const total = files.reduce((n, f) => n + f.lines, 0);
const date = new Date().toISOString().slice(0, 10);

// ---------- Markdown ----------
const fence = (text) => '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)));
let md = `# TIVA Simulator: Source Code\n\n`;
md += `Version ${pkg.version} · generated ${date} · ${files.length} files · ${total.toLocaleString('en-GB')} lines\n\n`;
md += `> **For education only. Not for clinical use.** This simulator must never be used to guide real drug dosing.\n\n`;
md += `## How to rebuild the project from this document\n\n`;
md += `1. Install Node.js 18 or newer. No other packages are needed.\n`;
md += `2. Create each file below at the path shown in its heading, with exactly the content in its code block.\n`;
md += `3. Run \`npm test\` to check the engine, then \`npm start\` and open http://localhost:8080.\n\n`;
md += `## Contents\n\n`;
for (const s of sections) {
  md += `- **${s.title}**\n`;
  for (const f of s.files) md += `  - [${f.path}](#${anchor(f.path)}) (${f.lines} lines)\n`;
}
md += `\n## File tree\n\n\`\`\`text\n${files.map((f) => f.path.padEnd(34) + String(f.lines).padStart(6) + ' lines').join('\n')}\n\`\`\`\n`;
for (const s of sections) {
  md += `\n## ${s.title}\n`;
  for (const f of s.files) {
    const fc = fence(f.text);
    md += `\n<a id="${anchor(f.path)}"></a>\n\n### ${f.path}\n\n${fc}${f.lang}\n${f.text}${fc}\n`;
  }
}

// ---------- printable HTML ----------
let html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TIVA Simulator Source Code</title>
<style>
  :root { --bg: #fff; --ink: #1b2026; --dim: #5b6670; --line: #d5dbe1; --code: #f5f7f9; --accent: #1d5fa8; }
  @media (prefers-color-scheme: dark) { :root { --bg: #11161c; --ink: #e6edf3; --dim: #9aa7b4; --line: #2b3540; --code: #181f27; --accent: #6cb2ff; } }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 1000px; padding: 24px 16px 64px; background: var(--bg); color: var(--ink);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 28px; margin: 0 0 4px; } h2 { font-size: 20px; margin: 40px 0 8px; border-bottom: 2px solid var(--line); padding-bottom: 4px; }
  h3 { font-size: 15px; margin: 28px 0 6px; font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--accent); }
  .meta { color: var(--dim); margin: 0 0 16px; }
  .warn { border-left: 4px solid #c0392b; padding: 8px 12px; background: var(--code); }
  a { color: var(--accent); }
  ul { padding-left: 20px; } li small { color: var(--dim); }
  pre { margin: 0; padding: 10px 0; background: var(--code); border: 1px solid var(--line); border-radius: 6px;
    overflow-x: auto; font: 12px/1.45 ui-monospace, "SF Mono", Menlo, Consolas, monospace; counter-reset: ln; }
  pre span { display: block; padding: 0 12px 0 0; white-space: pre; }
  pre span::before { counter-increment: ln; content: counter(ln); display: inline-block; width: 3.5em; padding-right: 1em;
    text-align: right; color: var(--dim); opacity: .6; user-select: none; }
  @media print {
    :root { --bg: #fff; --ink: #000; --dim: #555; --line: #bbb; --code: #fff; --accent: #000; }
    body { max-width: none; padding: 0; font-size: 11pt; }
    h2 { break-before: page; } h3 { break-after: avoid; }
    pre { overflow: visible; border: 0; font-size: 8pt; }
    pre span { white-space: pre-wrap; word-break: break-all; break-inside: avoid; }
    a { text-decoration: none; }
  }
</style></head><body>
<h1>TIVA Simulator: Source Code</h1>
<p class="meta">Version ${esc(pkg.version)} · generated ${date} · ${files.length} files · ${total.toLocaleString('en-GB')} lines</p>
<p class="warn"><b>For education only. Not for clinical use.</b> This simulator must never be used to guide real drug dosing.</p>
<h2 style="break-before:auto">How to rebuild the project</h2>
<ol><li>Install Node.js 18 or newer. No other packages are needed.</li>
<li>Create each file below at the path shown in its heading, with exactly the content shown.</li>
<li>Run <code>npm test</code>, then <code>npm start</code> and open http://localhost:8080.</li></ol>
<p>To make a PDF, open this page in a browser and choose Print, then Save as PDF.</p>
<h2 style="break-before:auto">Contents</h2>
${sections.map((s) => `<p><b>${esc(s.title)}</b></p><ul>${s.files.map((f) => `<li><a href="#${anchor(f.path)}">${esc(f.path)}</a> <small>${f.lines} lines</small></li>`).join('')}</ul>`).join('\n')}
`;
for (const s of sections) {
  html += `<h2>${esc(s.title)}</h2>\n`;
  for (const f of s.files) {
    const body = f.text.replace(/\n$/, '').split('\n').map((l) => `<span>${esc(l) || ' '}</span>`).join('');
    html += `<h3 id="${anchor(f.path)}">${esc(f.path)}</h3>\n<pre>${body}</pre>\n`;
  }
}
html += '</body></html>\n';

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'SOURCE-CODE.md'), md);
await writeFile(join(OUT, 'SOURCE-CODE.html'), html);
const kb = async (n) => Math.round((await stat(join(OUT, n))).size / 1024);
console.log(`Wrote docs/SOURCE-CODE.md (${await kb('SOURCE-CODE.md')} KB) and docs/SOURCE-CODE.html (${await kb('SOURCE-CODE.html')} KB)`);
console.log(`${files.length} files, ${total} lines`);
```
