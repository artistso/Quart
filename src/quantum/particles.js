/* ================================================
   QUART Quantum Field Particles
   Background field of entangled particles with
   probability-cloud rendering · reacts to pointer
   ================================================ */

const QuantumField = {
  canvas: null,
  ctx: null,
  particles: [],
  mousePos: { x: -1000, y: -1000 },
  mouseVel: { x: 0, y: 0 },
  lastMouse: { x: 0, y: 0 },
  w: 0, h: 0,
  raf: null,

  init() {
    this.canvas = document.getElementById('quantum-field');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Track pointer
    document.addEventListener('pointermove', (e) => {
      this.mouseVel.x = e.clientX - this.lastMouse.x;
      this.mouseVel.y = e.clientY - this.lastMouse.y;
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });

    // Create particles
    const count = Math.min(120, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }

    this.animate();
  },

  createParticle() {
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 0.5 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      freq: 0.005 + Math.random() * 0.015,
      opacity: 0.2 + Math.random() * 0.4,
      // Quantum state
      sigmaX: 1 + Math.random() * 3,
      sigmaY: 1 + Math.random() * 3,
      // Color base hue (used to tint)
      hue: Math.random() < 0.5 ? 260 : 330 // purple or pink
    };
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  animate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // Update and draw connections first
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.phase += p.freq;

      // Quantum motion: drift + oscillation
      p.x += p.vx + Math.sin(p.phase) * 0.15;
      p.y += p.vy + Math.cos(p.phase * 0.7) * 0.15;

      // Mouse attraction/repulsion (field interaction)
      const dx = p.x - this.mousePos.x;
      const dy = p.y - this.mousePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        const force = (200 - dist) / 200;
        p.vx += (dx / dist) * force * 0.08;
        p.vy += (dy / dist) * force * 0.08;
        // Mouse velocity transfers to field
        p.vx += this.mouseVel.x * 0.001;
        p.vy += this.mouseVel.y * 0.001;
      }

      // Damping
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Wrap
      if (p.x < -10) p.x = this.w + 10;
      if (p.x > this.w + 10) p.x = -10;
      if (p.y < -10) p.y = this.h + 10;
      if (p.y > this.h + 10) p.y = -10;

      // Entanglement lines
      for (let j = i + 1; j < this.particles.length; j++) {
        const q = this.particles[j];
        const ddx = p.x - q.x;
        const ddy = p.y - q.y;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < 140) {
          const alpha = (1 - d / 140) * 0.15 * (p.opacity + q.opacity) * 0.5;
          // Quantum entanglement: change hue based on connection
          const gradient = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
          gradient.addColorStop(0, `hsla(${p.hue}, 70%, 60%, ${alpha})`);
          gradient.addColorStop(1, `hsla(${q.hue}, 70%, 60%, ${alpha})`);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    // Draw particles as glowing probability clouds
    for (const p of this.particles) {
      const pulse = 0.8 + 0.2 * Math.sin(p.phase * 2);
      const s = p.size * pulse;

      // Glow
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 6);
      glow.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.opacity * 0.8})`);
      glow.addColorStop(0.3, `hsla(${p.hue}, 80%, 60%, ${p.opacity * 0.2})`);
      glow.addColorStop(1, `hsla(${p.hue}, 80%, 60%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 6, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `hsla(${p.hue}, 90%, 80%, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Decay mouse velocity
    this.mouseVel.x *= 0.9;
    this.mouseVel.y *= 0.9;

    this.raf = requestAnimationFrame(() => this.animate());
  }
};

window.QuantumField = QuantumField;
