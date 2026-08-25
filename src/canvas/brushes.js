/* ================================================
   QUART Quantum Brushes
   Each brush uses quantum mechanics at its core:
   - Pen: path-integral stroke
   - Brush: wavefunction bristle particles
   - Pencil: graphite uncertainty grain
   - Airbrush: Gaussian probability cloud spray
   - Eraser: quantum vacuum
   - Smudge: wavefunction collapse to neighbor colors
   - Fill: quantum flood with tunneling
   ================================================ */

const Brushes = {
  current: 'quantum-pen',
  size: 12,
  flow: 80,
  opacity: 100,
  // Quantum brush settings
  jitter: true,
  particleTrails: true,
  pressureSize: true,
  pressureOpacity: true,

  // Active stroke state
  stroke: null,
  particles: [],

  settings: {
    'quantum-pen': {
      minSize: 1, maxSize: 50, defaultSize: 4,
      bristleCount: 0, // vector
      grain: 0,
      description: 'Path-integral pen with quantum smoothness',
      render(ctx, x, y, pressure, px, py, color, size) {
        const s = size * (Brushes.pressureSize ? 0.3 + pressure * 0.9 : 1);
        const op = (Brushes.opacity / 100) * (Brushes.pressureOpacity ? 0.2 + pressure * 0.8 : 1) * (Brushes.flow / 100);

        // Draw main vector stroke using path-integral smooth points
        ctx.strokeStyle = color;
        ctx.lineWidth = s;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = op;
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(px, py);
        // Add slight quantum jitter
        const jx = Brushes.jitter ? Quantum.gaussian(0, s * 0.08) : 0;
        const jy = Brushes.jitter ? Quantum.gaussian(0, s * 0.08) : 0;
        ctx.lineTo(x + jx, y + jy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },

    'quantum-brush': {
      minSize: 4, maxSize: 200, defaultSize: 24,
      bristleCount: 30,
      render(ctx, x, y, pressure, px, py, color, size) {
        const s = size * (Brushes.pressureSize ? 0.2 + pressure : 1);
        const op = (Brushes.opacity / 100) * (Brushes.pressureOpacity ? 0.1 + pressure * 0.9 : 1) * (Brushes.flow / 100);
        ctx.globalCompositeOperation = 'source-over';

        // Parse color
        const rgb = Brushes._parseColor(color);

        // Bristle particles
        const count = Math.floor(8 + pressure * 20);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Quantum.gaussian(0, s * 0.35);
          const bx = x + Math.cos(angle) * dist;
          const by = y + Math.sin(angle) * dist;
          const bs = (0.5 + Math.random() * 2) * (1 + pressure);
          const bo = op * (0.1 + Math.random() * 0.4) * (1 - dist / (s * 0.7));
          if (bo <= 0) continue;

          // Color superposition for each bristle
          const c = Brushes.jitter ? Quantum.colorSuperposition(rgb.h, {vx: x-px, vy: y-py}, 0.4) : rgb;
          ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${bo})`;
          ctx.beginPath();
          ctx.arc(bx, by, bs, 0, Math.PI * 2);
          ctx.fill();

          // Particle trail emission
          if (Brushes.particleTrails && Math.random() < 0.3) {
            Brushes.particles.push({
              x: bx, y: by,
              vx: (Math.random()-0.5) * 0.5 + (x-px) * 0.02,
              vy: (Math.random()-0.5) * 0.5 + (y-py) * 0.02,
              size: bs * 0.5,
              color: `hsla(${c.h}, ${c.s}%, ${c.l}%, `,
              life: 1,
              decay: 0.03 + Math.random() * 0.04
            });
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    'airbrush': {
      minSize: 10, maxSize: 300, defaultSize: 60,
      render(ctx, x, y, pressure, px, py, color, size) {
        const s = size * (Brushes.pressureSize ? 0.5 + pressure * 0.8 : 1);
        const op = (Brushes.opacity / 100) * (Brushes.pressureOpacity ? pressure : 0.8) * (Brushes.flow / 100) * 0.15;
        ctx.globalCompositeOperation = 'source-over';
        const rgb = Brushes._parseColor(color);

        // Gaussian spray
        const count = Math.floor(20 + pressure * 60);
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * s * 0.4;
          const bx = x + Math.cos(a) * r;
          const by = y + Math.sin(a) * r;
          const bo = op * Math.exp(-r * r / (2 * s * s * 0.16));
          const bs = 0.5 + Math.random() * 2;
          const c = Brushes.jitter ? Quantum.colorSuperposition(rgb.h, {vx:0,vy:0}, 0.2) : rgb;
          ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${bo})`;
          ctx.beginPath();
          ctx.arc(bx, by, bs, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },

    'pencil': {
      minSize: 0.5, maxSize: 20, defaultSize: 2,
      render(ctx, x, y, pressure, px, py, color, size) {
        const s = size * (Brushes.pressureSize ? 0.4 + pressure * 0.8 : 1);
        const op = (Brushes.opacity / 100) * (Brushes.pressureOpacity ? 0.15 + pressure * 0.85 : 1) * (Brushes.flow / 100);
        ctx.globalCompositeOperation = 'source-over';
        const rgb = Brushes._parseColor(color);

        // Graphite grain particles
        const count = Math.floor(3 + pressure * 12);
        const dx = x - px, dy = y - py;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const steps = Math.max(1, Math.floor(dist / 0.8));
        for (let step = 0; step < steps; step++) {
          const t = step / steps;
          const ix = px + dx * t;
          const iy = py + dy * t;
          for (let i = 0; i < count / steps + 1; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Quantum.gaussian(0, s);
            const bx = ix + Math.cos(a) * r;
            const by = iy + Math.sin(a) * r;
            const grain = 0.3 + Math.random() * 0.7;
            // Pencil: darker near center, lighter particles at edges (graphite flake texture)
            const bo = op * grain * (1 - Math.abs(r) / (s * 2));
            if (bo <= 0) continue;
            const lshift = Math.random() < 0.1 ? 20 : (Math.random() < 0.3 ? 10 : 0);
            ctx.fillStyle = `hsla(${rgb.h}, ${rgb.s * 0.6}%, ${Math.max(10, rgb.l - lshift)}%, ${bo})`;
            ctx.fillRect(bx, by, 0.8 + Math.random() * 0.8, 0.8 + Math.random() * 0.8);
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    'eraser': {
      minSize: 5, maxSize: 200, defaultSize: 30,
      render(ctx, x, y, pressure, px, py, color, size) {
        const s = size * (Brushes.pressureSize ? 0.3 + pressure * 0.9 : 1);
        const op = (Brushes.opacity / 100) * (Brushes.pressureOpacity ? 0.2 + pressure * 0.8 : 1) * (Brushes.flow / 100);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = `rgba(0,0,0,${op})`;
        ctx.lineWidth = s;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Soft edge particles (eraser "crumbs")
        const count = Math.floor(3 + pressure * 8);
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * s * 0.5;
          const bx = x + Math.cos(a) * r;
          const by = y + Math.sin(a) * r;
          ctx.fillStyle = `rgba(0,0,0,${op * 0.3 * Math.random()})`;
          ctx.beginPath();
          ctx.arc(bx, by, 1 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    },

    'smudge': {
      minSize: 5, maxSize: 150, defaultSize: 25,
      render(ctx, x, y, pressure, px, py, color, size) {
        const s = size * (Brushes.pressureSize ? 0.3 + pressure * 0.9 : 1);
        const op = (Brushes.opacity / 100) * (Brushes.pressureOpacity ? 0.1 + pressure * 0.6 : 0.5) * (Brushes.flow / 100);

        // Smudge: pick up pixels from canvas and "push" them
        // For performance we use a soft dab that reveals and displaces
        try {
          const sampleSize = Math.ceil(s);
          const imgData = ctx.getImageData(Math.max(0, x-sampleSize), Math.max(0, y-sampleSize), sampleSize*2, sampleSize*2);
          const data = imgData.data;

          ctx.globalCompositeOperation = 'source-over';
          const count = Math.floor(15 + pressure * 30);
          for (let i = 0; i < count; i++) {
            const sx = Math.floor(Math.random() * sampleSize * 2);
            const sy = Math.floor(Math.random() * sampleSize * 2);
            const idx = (sy * sampleSize * 2 + sx) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
            if (a < 10) continue;
            // Push in direction of movement
            const dx = x - px, dy = y - py;
            const push = (0.3 + Math.random() * 0.7) * s * 0.3;
            const aNorm = Math.atan2(dy, dx);
            const bx = x - sampleSize + sx + Math.cos(aNorm) * push;
            const by = y - sampleSize + sy + Math.sin(aNorm) * push;
            ctx.fillStyle = `rgba(${r},${g},${b},${(a/255) * op * 0.6})`;
            ctx.beginPath();
            ctx.arc(bx, by, 1 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          // Erase original slightly
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = `rgba(0,0,0,${op * 0.15})`;
          ctx.beginPath();
          ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } catch(e) { /* off canvas */ }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    },

    'fill': {
      minSize: 1, maxSize: 1, defaultSize: 1,
      render(ctx, x, y, pressure, px, py, color, size) {
        // Quantum flood fill with tunneling
        Brushes.floodFill(ctx, Math.floor(x), Math.floor(y), color);
      }
    },

    'select': {
      render() { /* Marquee drawn on overlay */ }
    },

    floodFill(ctx, x, y, fillColor) {
      const canvas = ctx.canvas;
      const w = canvas.width, h = canvas.height;
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const idx = (y * w + x) * 4;
      const tr = data[idx], tg = data[idx+1], tb = data[idx+2], ta = data[idx+3];
      const fr = parseInt(fillColor.slice(1,3),16);
      const fg = parseInt(fillColor.slice(3,5),16);
      const fb = parseInt(fillColor.slice(5,7),16);
      if (tr === fr && tg === fg && tb === fb) return;
      const tolerance = 45;
      const stack = [[x,y]];
      const visited = new Uint8Array(w * h);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
        const vi = cy * w + cx;
        if (visited[vi]) continue;
        const ci = vi * 4;
        const dr = data[ci] - tr;
        const dg = data[ci+1] - tg;
        const db = data[ci+2] - tb;
        const da = data[ci+3] - ta;
        if (dr*dr + dg*dg + db*db + da*da > tolerance*tolerance) {
          // Quantum tunneling: small chance to leak through edges
          if (!Quantum.tunnel(0.005)) continue;
        }
        visited[vi] = 1;
        data[ci] = fr; data[ci+1] = fg; data[ci+2] = fb; data[ci+3] = 255;
        stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
      }
      ctx.putImageData(imgData, 0, 0);
    }
  },

  /** Parse hex/hsl color to RGB+HSL */
  _parseColor(color) {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1,3),16);
      const g = parseInt(color.slice(3,5),16);
      const b = parseInt(color.slice(5,7),16);
      const rf = r/255, gf = g/255, bf = b/255;
      const max = Math.max(rf,gf,bf), min = Math.min(rf,gf,bf);
      let h = 0, s = 0, l = (max+min)/2;
      if (max !== min) {
        const d = max-min;
        s = l > 0.5 ? d/(2-max-min) : d/(max+min);
        switch (max) {
          case rf: h = ((gf-bf)/d + (gf < bf ? 6 : 0))/6; break;
          case gf: h = ((bf-rf)/d + 2)/6; break;
          case bf: h = ((rf-gf)/d + 4)/6; break;
        }
      }
      return {r,g,b, h: h*360, s:s*100, l:l*100};
    }
    // hsl() format
    return {h:0,s:80,l:60,r:255,g:100,b:100};
  },

  /** Update and draw particle trails (called each frame) */
  updateParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= p.decay;
      p.size *= 0.98;
      if (p.life <= 0 || p.size < 0.2) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.color + (p.life * 0.6) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  startStroke(x, y, pressure, color) {
    this.stroke = {
      points: [{x, y, pressure}],
      color,
      startTime: performance.now()
    };
    this.particles = [];
  },

  endStroke() {
    // Collapse quantum state to final stroke (commit)
    const finalPoints = Quantum.collapse(
      this.stroke ? this.stroke.points.map(p => {
        const qp = new Quantum.Particle(p.x, p.y);
        qp.sigmaX = 0.5; qp.sigmaY = 0.5;
        qp.lifetime = 1; qp.decay = 0;
        return qp;
      }) : []
    );
    this.stroke = null;
    this.particles = [];
    return finalPoints;
  },

  setTool(name) {
    this.current = name;
    const s = this.settings[name];
    if (s) {
      this.size = s.defaultSize;
      // Update UI sliders
      const szSlider = document.getElementById('brush-size');
      if (szSlider) {
        szSlider.min = s.minSize;
        szSlider.max = s.maxSize;
        szSlider.value = s.defaultSize;
        document.getElementById('size-val').textContent = s.defaultSize;
      }
    }
  }
};

window.Brushes = Brushes;
