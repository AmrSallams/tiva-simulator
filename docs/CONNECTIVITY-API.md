# TIVA Simulator: Connectivity and API

> **For education only. Not for clinical use.**

---

## 1. Network set-up

### 1.1 Local network (recommended for workshops)

1. Connect one laptop (the **server**) to the venue Wi-Fi, or to a phone hotspot. Internet access is not needed. The devices only need to share a network.
2. Run `npm start`. The terminal prints the addresses, for example:
   ```
   TIVA simulator running at http://localhost:8080
   Other devices on this network: http://192.168.1.20:8080
   ```
3. Each tablet or laptop opens that address, enters the station code and chooses a screen. The start page and the instructor remote also show the address (from `/api/info`).
4. Keep the laptop plugged in and stop it from sleeping.

**Troubleshooting**

| Problem | Cause | Fix |
|---|---|---|
| Devices cannot open the address | Guest or hospital Wi-Fi blocks traffic between devices ("client isolation") | Use a phone hotspot or a travel router |
| Works on the laptop but not on other devices | The laptop's firewall blocks incoming connections | Allow Node.js through the firewall (macOS: allow when asked; Windows: tick Private networks) |
| "already running on port 8080" | A copy is already running | Use the running copy, or `PORT=8081 npm start` |
| Red "connection lost" bar | Wi-Fi dropped, or the laptop is asleep | The screen reconnects by itself when the network returns |
| Everything reset | The server was restarted | State lives in memory only. Start the cases again. |

**Capacity.** One laptop runs 12 stations. A workshop of 4 stations with 3 screens each needs about 12 SSE connections. Each state message is about 5 to 30 kB (it grows with the trend history), sent up to 4 times a second. That is well within a normal Wi-Fi network.

### 1.2 Hosted (internet)

The same server can run on any host that supports Node.js (for example a small cloud VM, Render, Railway or Fly.io).

- Set `PORT` from the host's environment.
- Serve over HTTPS through the host's proxy.
- Turn off response buffering for `/api/events`, or SSE messages will be delayed. On nginx, use `proxy_buffering off;`.
- The simulator has **no authentication**. Anyone who knows the address and a station code can control that station. Before hosting publicly, add at least a shared password, or use hard-to-guess station codes.
- State is kept in memory. Run a single instance. Do not load-balance across several instances.

### 1.3 Station codes

- Case-insensitive. The letters A–Z and digits 0–9 are kept, everything else is removed, and the code is cut to 8 characters. An empty code becomes `1`.
- A station is created the first time any screen or API call uses its code. There is a maximum of 12. Stations are never deleted while the server runs.
- Screens pass the code as `?s=CODE` on the page address. All API calls take the same `s` parameter.

---

## 2. HTTP endpoints

| Method | Path | Response |
|---|---|---|
| GET | `/`, `/index.html`, `/monitor.html`, `/pump.html`, `/instructor.html`, `/css/*`, `/js/*` | Static files from `public/` |
| GET | `/engine/*.js` | Engine modules from `src/engine/` |
| GET | `/api/info` | `{"addresses": ["http://192.168.1.20:8080"], "stations": ["1","2"]}` |
| GET | `/api/events?s=CODE` | `text/event-stream`. The first message is the full state immediately, then a new message after every change. |
| POST | `/api/action?s=CODE` | Body: one action as JSON. `204` on success, `400` with a plain-text reason if refused. |
| GET | `/api/log?s=CODE` | `text/csv` download, `tiva-case-log-station-CODE.csv`, with the columns `time,event` |

All responses use `Cache-Control: no-store`. Unknown paths return `404 Not found`.

### 2.1 Server-sent events

```
GET /api/events?s=1
Accept: text/event-stream

data: {"station":"1","simTime":0,"clock":"00:00:00", ... }

data: {"station":"1","simTime":1, ... }
```

- Each message is one line of `data:` with the complete state as JSON. There are no partial updates.
- The browser's `EventSource` reconnects by itself after a network drop. The first message after reconnecting brings the screen fully up to date.
- Messages are sent after every action (at once), and after simulated time advances (at most once per 240 ms). Nothing is sent while the station is paused unless an action arrives.

### 2.2 Example with curl

```bash
curl -N "http://localhost:8080/api/events?s=1"
```

```bash
curl -X POST "http://localhost:8080/api/action?s=1" -H "Content-Type: application/json" -d '{"type":"pumpPower","pump":1}'
```

```bash
curl -X POST "http://localhost:8080/api/action?s=1" -H "Content-Type: application/json" -d '{"type":"event","name":"intubation"}'
```

---

## 3. The state message

Sent to every screen in a station. This is the object returned by `Station.state()`.

```jsonc
{
  "station": "1",
  "simTime": 754,                 // simulated seconds since the case started
  "clock": "00:12:34",
  "speed": 1,                     // 1, 2, 5 or 10
  "paused": false,
  "vitals": {                     // what the monitor shows (model + overrides)
    "hr": 64.2, "sys": 98.1, "dia": 61.0, "spo2": 98.7, "rr": 0, "etco2": 0,
    "temp": 36.6, "se": 42.3, "re": 45.9, "cvp": 8, "tofCount": 4, "tofRatio": 100
  },
  "modules": ["ecg","spo2","co2","art","resp","entropy","temp","nibp"],
  "styleId": "generic",           // generic | alaris | agilia | space
  "showTrend": false,             // show the trend graph on the pump page
  "monitorLocked": false,
  "trendShow": { "cp": true, "ce": true, "rate": true },
  "history": [                    // one point every 15 s, at most 480
    { "t": 750, "cp": {"propofol": 3.95}, "ce": {"propofol": 3.71}, "rate": {"propofol": 41.2}, "se": 43 }
  ],
  "pumps": [
    {
      "id": 1,
      "styleId": "generic",
      "styleName": "Generic TCI pump",
      "keys": [[["BIGDOWN","− −"],["DOWN","−"],["UP","+"],["BIGUP","+ +"]],
               [["START","Start","go"],["STOP","Stop","stop"],["BOLUS","Bolus"],["MENU","Menu"]]],
      "tapToSelect": true,
      "screen": { "type": "run", "...": "see PUMP-FLOWS.md §5" },
      "alarmSounding": false,
      "occluded": false,
      "infusing": true,
      "drug": "propofol",
      "pumpCe": 3.71              // the pump's predicted Ce (or Cp for plasma-only models)
    }
  ],
  "instructor": {                 // used by the instructor page only
    "preset": "adult",
    "model": { "hr": 64.2, "...": "the patient model's values before overrides" },
    "overridden": ["spo2"],
    "levels": { "propofol": { "cp": 3.95, "ce": 3.71 } },  // in the PATIENT
    "stimLevel": "none",          // none | light | moderate | strong
    "stimNow": 0,                 // 0 to 10, before analgesia
    "ventilated": true,
    "bleeding": false,
    "bloodLoss": 0,               // % of blood volume
    "lineConnected": true,
    "log": [ { "t": 12, "time": "00:00:12", "text": "Pump 1: Started Propofol 10 mg/mL, ..." } ]  // last 80
  }
}
```

**Units.** Vital signs: HR /min; BP and CVP mmHg; SpO2 %; RR /min; EtCO2 kPa; temperature °C; SE 0–91; RE 0–100; TOF count 0–4; TOF ratio %. Drug levels: mcg/mL for propofol and ketamine, ng/mL for remifentanil, sufentanil and dexmedetomidine. Rates in `history`: mL/h.

---

## 4. Actions

POST one JSON object to `/api/action?s=CODE`. Unknown types or invalid values return `400` with a readable message, for example `Unknown vital sign or value`.

### 4.1 Pumps

| Action | Fields | Effect |
|---|---|---|
| `pumpKey` | `pump` (id), `key` | Presses a key. Keys: `UP` `DOWN` `BIGUP` `BIGDOWN` `LEFT` `RIGHT` `OK` `BACK` `START` `STOP` `STARTSTOP` `BOLUS` `MENU` |
| `pumpSelect` | `pump`, `index` | Taps a list option. Works only on styles with `tapToSelect`. |
| `pumpPower` | `pump` | Switches the pump on or off. Switching off ends any infusion. |
| `addPump` | none | Adds a pump, up to 4 |
| `removePump` | `pump` | Removes the pump |
| `setStyle` | `style` | `generic`, `alaris`, `agilia` or `space`. Pumps that are not infusing restart programming in the new order. |

### 4.2 Monitor and vital signs

| Action | Fields | Effect |
|---|---|---|
| `setModules` | `modules: string[]`, `from?` | Sets the monitor modules. Refused when `from: "monitor"` and the monitor is locked. |
| `override` | `key`, `value`, `seconds`, `from?` | Ramps a vital sign from its current value to `value` over `seconds`, then holds it. Refused from the monitor when locked. Logged. |
| `release` | `key?` | Returns one value to the model, or all values if `key` is omitted |

`key` is one of: `hr sys dia spo2 rr etco2 temp se re cvp tofCount tofRatio`. Values use the units in §3.

### 4.3 Time and case

| Action | Fields | Effect |
|---|---|---|
| `setSpeed` | `speed` | 1, 2, 5 or 10 |
| `setPaused` | `paused: boolean` | Pauses or resumes. Logged. |
| `reset` | `preset` | `adult`, `elderly`, `obese`, `child` or `anxious`. Starts a new case. |
| `lockMonitor` | `on` | Locks or unlocks value editing on the monitor |
| `showTrend` | `on` | Shows or hides the trend graph on the pump page |
| `trendShow` | `line` (`cp`, `ce` or `rate`), `on` | Shows or hides one line type on all trend graphs |

### 4.4 Events (`{"type":"event","name":...}`)

| `name` | Extra fields | Effect |
|---|---|---|
| `intubation` | none | Short stimulation pulse of 8, which decays over about 2 min |
| `incision` | none | Pulse of 6. Sustained stimulation rises to at least moderate. |
| `stim` | `level` | Sustained stimulation: `none` 0, `light` 2, `moderate` 4, `strong` 7 |
| `ventilation` | `on` | Ventilated (controlled rate, SpO2 recovers) or spontaneous breathing |
| `bleeding` | `on` | Loses about 10% of blood volume per minute while on, up to 80% |
| `fluid` | none | Restores 20% of blood volume |
| `pressor` | none | Vasopressor effect +1, up to 1.5; decays with a 4 min time constant |
| `anticholinergic` | none | Heart-rate effect +1, up to 1.5; decays with a 5 min time constant |
| `line` | `connected` | Disconnects or reconnects the IV line. Pumps keep running, but no drug reaches the patient. |
| `occlusion` | `pump`, `on` | Blocks a pump: it stops and alarms OCCLUSION. Clearing it lets the user restart the pump. |

### 4.5 Example session

```http
POST /api/action?s=1   {"type":"reset","preset":"elderly"}
POST /api/action?s=1   {"type":"pumpPower","pump":1}
POST /api/action?s=1   {"type":"pumpKey","pump":1,"key":"OK"}        // propofol
POST /api/action?s=1   {"type":"pumpKey","pump":1,"key":"OK"}        // 10 mg/mL
...
POST /api/action?s=1   {"type":"pumpKey","pump":1,"key":"START"}
POST /api/action?s=1   {"type":"setSpeed","speed":5}
POST /api/action?s=1   {"type":"event","name":"intubation"}
POST /api/action?s=1   {"type":"override","key":"spo2","value":88,"seconds":60}
GET  /api/log?s=1
```

---

## 5. Security notes

- Only use the simulator on a trusted network. There are no logins, and any device can control any station.
- Request bodies over 20 kB are refused. Strings in actions are converted and checked before use. Module lists are limited to 20 entries.
- The static file server rejects paths that leave its folder, for example `/../server.js`.
- Pages escape every string before putting it into HTML (`esc()`), including log text and pump labels.
