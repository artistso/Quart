/* ================================================
   QUART Quantum Engine
   Models brush particles as quantum wavefunctions.
   Probability-cloud rendering · superposition trails
   Uncertainty-based jitter · entanglement of strokes
   ================================================ */

const Quantum = {
  // Planck-like constant for jitter (scaled to pixels)
  HBAR: 2.4,
  // Wavefunction collapse threshold
  COLLAPSE: 0.72,
  // Entanglement correlation factor
  ENTANGLE: 0.3,

  /**
   * Quantum state of a brush particle.
   * Each "quantum pen" stroke is a superposition of possible paths;
   * rendering samples the probability density |ψ|².
   */
  Particle: class {
    constructor(x, y, vx = 0, vy = 0) {
      this.x = x;
      this.y = y;
      // Position uncertainty (gaussian sigma)
      this.sigmaX = Quantum.HBAR * (0.5 + Math.random());
      this.sigmaY = Quantum.HBAR * (0.5 + Math.random());
      // Wavefunction phase
      this.phase = Math.random() * Math.PI * 2;
      this.frequency = 0.1 + Math.random() * 0.3;
      // Velocity (group velocity of wave packet)
      this.vx = vx;
      this.vy = vy;
      // Spin (affects color rotation)
      this.spin = Math.random() < 0.5 ? 1 : -1;
      // Quantum number (affects opacity oscillation)
      this.n = Math.floor(Math.random() * 4) + 1;
      // Decay
      this.lifetime = 1.0;
      this.decay = 0.01 + Math.random() * 0.03;
      // Entangled partner id
      this.partner = null;
      // Color (HSL)
      this.h = 0; this.s = 80; this.l = 60;
      this.size = 3;
    }

    /** Sample position from wavefunction probability density */
    sample() {
      // Gaussian sample centered at (x, y) with sigma uncertainty
      const u1 = Math.random(), u2 = Math.random();
      const randStdNormal = Math.sqrt(-2 * Math.log(u1 + 1e-9)) * Math.cos(2 * Math.PI * u2);
      const u3 = Math.random(), u4 = Math.random();
      const randStdNormalY = Math.sqrt(-2 * Math.log(u3 + 1e-9)) * Math.sin(2 * Math.PI * u4);
      return {
        x: this.x + randStdNormal * this.sigmaX,
        y: this.y + randStdNormalY * this.sigmaY
      };
    }

    /** Evolve wavefunction one step */
    evolve(dt = 1) {
      this.phase += this.frequency * dt;
      // Wave packet spreads slightly
      this.sigmaX += 0.02 * dt;
      this.sigmaY += 0.02 * dt;
      // Group velocity moves center
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // Decay
      this.lifetime -= this.decay * dt;
      // Entanglement correlation - if partner exists, oscillate together
      if (this.partner) {
        this.vx += (this.partner.x - this.x) * Quantum.ENTANGLE * 0.01;
        this.vy += (this.partner.y - this.y) * Quantum.ENTANGLE * 0.01;
      }
      return this.lifetime > 0;
    }

    /** Get opacity based on quantum interference and decay */
    getOpacity() {
      const interference = 0.7 + 0.3 * Math.sin(this.phase * this.n);
      return this.lifetime * interference;
    }
  },

  /**
   * Quantum random number generator using Box-Muller + quantum entropy
   * Approximates true quantum randomness via crypto APIs when available
   */
  random() {
    if (window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return buf[0] / 0xffffffff;
    }
    return Math.random();
  },

  gaussian(mean = 0, sigma = 1) {
    const u1 = this.random() || 1e-9;
    const u2 = this.random();
    return mean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  },

  /**
   * Quantum tunneling effect - small chance a stroke "jumps" through barriers
   */
  tunnel(probability = 0.02) {
    return this.random() < probability;
  },

  /**
   * Produces a superposition of color states (HSL shift)
   * based on velocity uncertainty
   */
  colorSuperposition(baseH, velocity, speedFactor = 1) {
    // Doppler-like shift based on velocity
    const doppler = Math.atan2(velocity.vy, velocity.vx) * 180 / Math.PI;
    const shift = this.gaussian(0, 8 * speedFactor);
    return {
      h: (baseH + doppler * 0.1 + shift + 360) % 360,
      s: 70 + this.gaussian(0, 10),
      l: 50 + this.gaussian(0, 8) * speedFactor
    };
  },

  /**
   * Quantum path integral - computes the probability of a path between two points
   * Returns intermediate points weighted by exp(-S/hbar) where S is action
   */
  pathIntegral(x0, y0, x1, y1, steps = 10) {
    const points = [{x: x0, y: y0}];
    const dx = (x1 - x0) / steps;
    const dy = (y1 - y0) / steps;
    for (let i = 1; i < steps; i++) {
      // Classical path plus quantum fluctuation weighted by hbar
      const fluct = Quantum.HBAR * Math.exp(-i * (steps - i) / (steps * steps) * 2);
      points.push({
        x: x0 + dx * i + this.gaussian(0, fluct),
        y: y0 + dy * i + this.gaussian(0, fluct),
        weight: Math.exp(-fluct / Quantum.HBAR)
      });
    }
    points.push({x: x1, y: y1});
    return points;
  },

  /**
   * Observable state collapse - when user lifts pen, the wavefunction
   * collapses to a deterministic final stroke (commits pixels to canvas)
   */
  collapse(wavefunction) {
    return wavefunction.map(p => ({
      x: p.x + this.gaussian(0, p.sigmaX * 0.3),
      y: p.y + this.gaussian(0, p.sigmaY * 0.3),
      opacity: p.getOpacity()
    }));
  },

  /**
   * Quantum harmonics - brush size oscillates like a particle in a potential well
   */
  harmonicSize(baseSize, time, level = 1) {
    return baseSize * (1 + 0.15 * Math.sin(time * 0.1 * level)) *
           (1 + 0.08 * Math.sin(time * 0.23 * level + 1));
  },

  /** Observable: position expectation value */
  expectation(particles) {
    if (!particles.length) return {x: 0, y: 0};
    let sx = 0, sy = 0, sw = 0;
    for (const p of particles) {
      const w = p.getOpacity();
      sx += p.x * w; sy += p.y * w; sw += w;
    }
    return {x: sx / sw, y: sy / sw};
  }
};

window.Quantum = Quantum;
