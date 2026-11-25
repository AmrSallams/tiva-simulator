# TIVA Simulator: Documentation

> **For education only. Not for clinical use.**

These documents describe the simulator fully enough for a developer to maintain it, extend it, or build it again.

| Read | If you want to know |
|---|---|
| [SPECIFICATION.md](SPECIFICATION.md) | What the simulator does: every screen, feature and requirement, with IDs |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How it is built: components, data flow, timing, rendering rules, how to extend it |
| [CONNECTIVITY-API.md](CONNECTIVITY-API.md) | How devices connect: network set-up, HTTP endpoints, the state message, every action |
| [PK-MODELS.md](PK-MODELS.md) | The drugs, every PK model with its constants and references, and the TCI controller |
| [PUMP-FLOWS.md](PUMP-FLOWS.md) | The four pump styles, programming steps, keys, running screen and alarms |
| [PHYSIOLOGY.md](PHYSIOLOGY.md) | The patient model equations, presets, instructor events, monitor waveforms and alarms, teaching scenarios |
| [TESTING.md](TESTING.md) | Automated tests, manual browser checks, the workshop checklist, and what is still unverified |
| [SOURCE-CODE.md](SOURCE-CODE.md) / [SOURCE-CODE.html](SOURCE-CODE.html) | The complete source code in one document (rebuild with `npm run docs:code`) |

**Suggested reading order for a new developer:**

1. Specification
2. Architecture
3. Connectivity and API
4. Either PK models and pump flows (for the pump side), or physiology (for the patient and monitor)
5. Testing

To run it:

```bash
npm test
```

```bash
npm start
```

Then open http://localhost:8080.
