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
