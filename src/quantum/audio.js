/* ================================================
   QUART Quantum Audio Engine
   Subtle UI sounds using Web Audio API
   Quantized frequency tones · pentatonic scale
   No samples - pure oscillators for lightweight feel
   ================================================ */

const QuantumAudio = {
  ctx: null,
  masterGain: null,
  initialized: false,
  muted: false,
  // Pentatonic scale in A (root 440Hz) - pleasant, "cosmic" feel
  scale: [0, 2, 4, 7, 9, 12, 16, 19, 21, 24],

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0;
      this.masterGain.connect(this.ctx.destination);
      // Fade in master
      this.masterGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.5);
      this.initialized = true;
    } catch(e) {
      console.log('Audio unavailable');
    }
  },

  note(degree, octave = 4, duration = 0.15, type = 'sine', vol = 0.5) {
    if (!this.initialized || this.muted) return;
    const semitone = this.scale[degree % this.scale.length] + (octave - 4) * 12;
    const freq = 440 * Math.pow(2, semitone / 12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // Quantum slight detune
    osc.detune.setValueAtTime((Math.random() - 0.5) * 8, this.ctx.currentTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration + 0.05);
  },

  // Chime when opening a puck
  puckOpen() {
    this.note(0, 5, 0.3, 'sine', 0.3);
    setTimeout(() => this.note(2, 5, 0.4, 'sine', 0.2), 60);
    setTimeout(() => this.note(4, 5, 0.5, 'sine', 0.15), 120);
  },

  puckClose() {
    this.note(4, 4, 0.2, 'sine', 0.2);
    setTimeout(() => this.note(2, 4, 0.25, 'sine', 0.15), 50);
  },

  // Pen down
  penDown(pressure = 0.5) {
    this.note(0, 3, 0.08, 'triangle', 0.15 * pressure);
  },

  // Drawing hum (very subtle)
  drawHum(pressure) {
    // Occasional subtle warble
    if (Math.random() < 0.03) {
      this.note(Math.floor(Math.random() * 5), 3 + Math.floor(Math.random()*2), 0.1, 'sine', 0.05 * pressure);
    }
  },

  // Tool select
  toolSelect() {
    this.note(2, 5, 0.1, 'square', 0.12);
    setTimeout(() => this.note(4, 5, 0.15, 'sine', 0.1), 40);
  },

  // Frame advance
  tick() {
    this.note(0, 6, 0.04, 'sine', 0.08);
  },

  // Color change
  colorShift() {
    this.note(Math.floor(Math.random() * 7), 5, 0.2, 'sine', 0.1);
  },

  // Export success
  success() {
    this.note(0, 5, 0.15, 'sine', 0.2);
    setTimeout(() => this.note(2, 5, 0.15, 'sine', 0.2), 100);
    setTimeout(() => this.note(4, 5, 0.3, 'sine', 0.2), 200);
    setTimeout(() => this.note(7, 5, 0.5, 'sine', 0.2), 300);
  },

  // Undo/redo
  undo() { this.note(7, 4, 0.2, 'triangle', 0.15); },
  redo() { this.note(9, 4, 0.2, 'triangle', 0.15); },

  // Quantum jump (orb tap)
  quantumJump() {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => this.note(Math.floor(Math.random() * 10), 3 + Math.floor(Math.random()*3), 0.4, 'sine', 0.12), i * 40);
    }
  }
};

window.QuantumAudio = QuantumAudio;

// Init on first user interaction (required by browsers)
document.addEventListener('pointerdown', () => QuantumAudio.init(), { once: true });
