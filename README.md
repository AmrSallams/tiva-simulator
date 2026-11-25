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
