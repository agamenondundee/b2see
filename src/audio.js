// Procedural audio via the Web Audio API — all synthesized, no asset files.
// SFX are short oscillator blips; music is a looping arpeggio bassline that
// can be muted. Must be unlocked by a user gesture (browsers require it).

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.enabled = true;
    this.musicTimer = null;
    this.step = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.master);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.6 : 0;
    return this.enabled;
  }

  blip(freq, dur, type = "square", gain = 0.3, target = this.master) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(target ?? this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  sweep(from, to, dur, type = "sawtooth", gain = 0.3) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  throw() {
    this.sweep(420, 760, 0.16, "triangle", 0.25);
  }
  deliver() {
    this.blip(660, 0.09, "square", 0.3);
    setTimeout(() => this.blip(990, 0.12, "square", 0.3), 80);
  }
  smash() {
    this.sweep(300, 90, 0.22, "square", 0.28);
  }
  pickup() {
    this.blip(523, 0.08, "triangle", 0.28);
    setTimeout(() => this.blip(784, 0.1, "triangle", 0.28), 70);
  }
  crash() {
    this.sweep(200, 40, 0.4, "sawtooth", 0.4);
  }
  gate() {
    this.blip(880, 0.08, "square", 0.25);
  }
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.18, "square", 0.3), i * 120),
    );
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const notes = [196, 196, 233, 196, 261, 196, 233, 174];
    const tick = () => {
      const f = notes[this.step % notes.length];
      this.blip(f, 0.18, "triangle", 0.5, this.musicGain);
      this.blip(f / 2, 0.22, "square", 0.35, this.musicGain);
      this.step++;
    };
    this.musicTimer = setInterval(tick, 260);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioEngine();
