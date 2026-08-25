/* ================================================
   QUART Quantum Brushes
   Each brush uses quantum mechanics at its core.
   Uses distance-based stamping along interpolated path
   for smooth, high-quality strokes even with fast movement.
   ================================================ */

const Brushes = {
  current: 'quantum-pen',
  size: 8,
  flow: 80,
  opacity: 100,
  jitter: true,
  particleTrails: true,
  pressureSize: true,
  pressureOpacity: true,

  // Stroke state
  _points: [],
  _lastStampX: 0,
  _lastStampY: 0,
  _lastPressure: 0.5,
  particles: [],
  _color: '#000',
  _angle: 0,

  setTool(name) {
    this.current = name;
    const s = this.settings[name];
    if (s && s.defaultSize != null) {
      this.size = s.defaultSize;
      const szSlider = document.getElementById('brush-size');
      if (szSlider) {
        szSlider.min = s.minSize || 1;
        szSlider.max = s.maxSize || 200;
        szSlider.value = s.defaultSize;
        document.getElementById('size-val').textContent = s.defaultSize;
      }
    }
  },

  beginStroke(x, y, pressure, color, tiltMag = 0, tiltAngle = 0) {
    this._points = [{x, y, pressure, t: performance.now(), tiltMag, tiltAngle}];
    this._lastStampX = x;
    this._lastStampY = y;
    this._lastPressure = pressure;
    this._color = color;
    this._angle = 0;
    this.particles = [];
    this._stamp(x, y, pressure, x, y, tiltMag, tiltAngle);
  },

  strokeTo(ctx, x, y, pressure, px, py, color, size, tiltMag = 0, tiltAngle = 0) {
    this._color = color;
    this._points.push({x, y, pressure, t: performance.now(), tiltMag, tiltAngle});
    if (this._points.length > 20) this._points.shift();

    const dx = x - px, dy = y - py;
    const dist = Math.hypot(dx, dy);
    this._angle = Math.atan2(dy, dx);

    const effSize = size * (this.pressureSize ? (0.3 + pressure * 0.9) : 1);
    const spacing = Math.max(0.5, effSize * 0.15);
    const steps = Math.max(1, Math.ceil(dist / spacing));

    const pressureSlope = pressure - this._lastPressure;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ix = px + dx * t;
      const iy = py + dy * t;
      const ip = this._lastPressure + pressureSlope * t;
      this._stamp(ctx, ix, iy, ip, this._lastStampX, this._lastStampY, tiltMag, tiltAngle);
      this._lastStampX = ix;
      this._lastStampY = iy;
    }
    this._lastPressure = pressure;
  },

  endStroke() {
    this._points = [];
    // Let particles finish naturally in updateParticles
  },

  _parseColor(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
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
  },

  _hsvToRgb(h, s, v) {
    s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h/60) % 2) - 1));
    const m = v - c;
    let r=0,g=0,b=0;
    if (h < 60) { r=c; g=x; }
    else if (h < 120) { r=x; g=c; }
    else if (h < 180) { g=c; b=x; }
    else if (h < 240) { g=x; b=c; }
    else if (h < 300) { r=x; b=c; }
    else { r=c; b=x; }
    return {r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255)};
  },

  /** Get effective color for a stamp, applying quantum superposition */
  _effectiveColor(baseHex, pressure, speed) {
    const base = this._parseColor(baseHex);
    if (!this.jitter) return base;
    // Quantum color uncertainty - small shifts based on speed & random
    const hShift = Quantum.gaussian(0, 3 + speed * 2);
    const sShift = Quantum.gaussian(0, 3);
    const lShift = Quantum.gaussian(0, 3);
    return {
      r: base.r, g: base.g, b: base.b,
      h: (base.h + hShift + 360) % 360,
      s: Math.max(0, Math.min(100, base.s + sShift)),
      l: Math.max(0, Math.min(100, base.l + lShift))
    };
  },

  _stamp(ctx, x, y, pressure, lx, ly, tiltMag = 0, tiltAngle = 0) {
    const brush = this.settings[this.current];
    if (!brush || !brush.render) return;
    const rgb = this._parseColor(this._color);
    const dx = x - lx, dy = y - ly;
    const speed = Math.min(1, Math.hypot(dx, dy) / 20);
    const col = this.jitter ? this._effectiveColor(this._color, pressure, speed) : rgb;
    // Pass tilt info to brush; brushes that don't support it just ignore extra args
    brush.render(ctx, x, y, pressure, lx, ly, col, this.size, speed, tiltMag, tiltAngle);
  },

  updateParticles(ctx, dpr) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.vy += 0.05; // slight gravity
      p.life -= p.decay;
      p.size *= 0.985;
      if (p.life <= 0 || p.size < 0.3) {
        this.particles.splice(i,1);
        continue;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.globalAlpha = p.life * 0.6;
      ctx.fillStyle = `hsl(${p.h}, ${p.s}%, ${p.l}%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },

  /* ===================== BRUSH DEFINITIONS ===================== */

  settings: {
    // -------- QUANTUM PEN - smooth vector-like stroke --------
    'quantum-pen': {
      minSize: 1, maxSize: 50, defaultSize: 4,
      render(ctx, x, y, pressure, lx, ly, col, size, speed) {
        const s = size * (Brushes.pressureSize ? (0.3 + pressure * 0.9) : 1);
        const op = (Brushes.opacity/100) * (Brushes.pressureOpacity ? (0.3 + pressure*0.7) : 1) * (Brushes.flow/100);
        // Draw segment with round caps for buttery strokes
        ctx.globalAlpha = op;
        ctx.strokeStyle = `rgb(${col.r},${col.g},${col.b})`;
        ctx.lineWidth = s;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },

    // -------- WAVE BRUSH - bristle particle cloud --------
    'quantum-brush': {
      minSize: 4, maxSize: 200, defaultSize: 20,
      render(ctx, x, y, pressure, lx, ly, col, size, speed) {
        const s = size * (Brushes.pressureSize ? (0.2 + pressure) : 1);
        const op = (Brushes.opacity/100) * (Brushes.pressureOpacity ? (0.15 + pressure*0.85) : 0.9) * (Brushes.flow/100);
        ctx.globalCompositeOperation = 'source-over';

        const rgb = Brushes._parseColor(Brushes._color);
        const bristleCount = Math.floor(8 + pressure * 15 + speed * 3);
        for (let i = 0; i < bristleCount; i++) {
          // Bristle position in a Gaussian cloud around (x,y)
          const a = Math.random() * Math.PI * 2;
          const r = Quantum.gaussian(0, s * 0.4);
          const bx = x + Math.cos(a) * r;
          const by = y + Math.sin(a) * r;
          const bs = (0.3 + Math.random() * 1.2) * (0.5 + pressure * 0.8);
          const bo = op * (0.1 + Math.random() * 0.4) * Math.exp(-(r*r)/(2*s*s*0.16));
          if (bo <= 0) continue;

          const c = Brushes.jitter ? Quantum.colorSuperposition(rgb.h, {vx:x-lx, vy:y-ly}, 0.4) : rgb;
          ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${bo})`;
          ctx.beginPath();
          ctx.arc(bx, by, bs, 0, Math.PI*2);
          ctx.fill();

          if (Brushes.particleTrails && Math.random() < 0.15 * pressure) {
            Brushes.particles.push({
              x: bx, y: by,
              vx: (Math.random()-0.5)*1.2 + (x-lx)*0.05,
              vy: (Math.random()-0.5)*1.2 + (y-ly)*0.05 - 0.3,
              size: bs * 0.6,
              h: c.h, s: c.s, l: c.l,
              life: 1, decay: 0.02 + Math.random()*0.03
            });
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    // -------- AIRBRUSH - Gaussian probability cloud --------
    'airbrush': {
      minSize: 10, maxSize: 300, defaultSize: 60,
      render(ctx, x, y, pressure, lx, ly, col, size, speed) {
        const s = size * (Brushes.pressureSize ? (0.5 + pressure*0.7) : 1);
        const op = (Brushes.opacity/100) * (Brushes.pressureOpacity ? pressure : 0.7) * (Brushes.flow/100) * 0.12;
        ctx.globalCompositeOperation = 'source-over';
        const rgb = Brushes._parseColor(Brushes._color);
        const count = Math.floor(15 + pressure * 50);
        for (let i = 0; i < count; i++) {
          // Box-Muller for proper Gaussian distribution
          const u1 = Math.random() || 1e-9;
          const u2 = Math.random();
          const r = Math.sqrt(-2*Math.log(u1)) * s * 0.35;
          const a = 2*Math.PI*u2;
          const bx = x + Math.cos(a)*r;
          const by = y + Math.sin(a)*r;
          const bs = 0.4 + Math.random()*1.5;
          const bo = op * Math.exp(-(r*r)/(2*s*s*0.15));
          const c = Brushes.jitter ? Quantum.colorSuperposition(rgb.h, {vx:0,vy:0}, 0.15) : rgb;
          ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${bo})`;
          ctx.beginPath();
          ctx.arc(bx, by, bs, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },

    // -------- PENCIL - graphite grain with paper texture feel --------
    'pencil': {
      minSize: 0.5, maxSize: 20, defaultSize: 2,
      render(ctx, x, y, pressure, lx, ly, col, size, speed) {
        const s = size * (Brushes.pressureSize ? (0.4 + pressure*0.7) : 1);
        const op = (Brushes.opacity/100) * (Brushes.pressureOpacity ? (0.1 + pressure*0.9) : 1) * (Brushes.flow/100);
        ctx.globalCompositeOperation = 'source-over';
        const rgb = Brushes._parseColor(Brushes._color);

        // Pencil texture: elongated grains in stroke direction
        const dx = x - lx, dy = y - ly;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / Math.max(0.5, s*0.3)));
        for (let step = 0; step <= steps; step++) {
          const t = step/steps;
          const ix = lx + dx*t;
          const iy = ly + dy*t;
          const grains = Math.floor(2 + pressure*6);
          for (let i = 0; i < grains; i++) {
            const a = Math.random()*Math.PI*2;
            const rr = Quantum.gaussian(0, s*0.7);
            const bx = ix + Math.cos(a)*rr;
            const by = iy + Math.sin(a)*rr;
            const grain = 0.2 + Math.random()*0.7;
            // Slight darken at center, graphite effect
            const darkness = Math.random() < 0.2 ? 20 : (Math.random()<0.4 ? 10 : 0);
            const bo = op * grain * (1 - Math.abs(rr)/(s*1.2));
            if (bo <= 0) continue;
            ctx.fillStyle = `hsla(${rgb.h}, ${rgb.s*0.4}%, ${Math.max(5, rgb.l-darkness)}%, ${bo})`;
            // Elongated grain in stroke direction
            ctx.fillRect(bx, by, 0.6 + Math.random()*0.8, 0.6 + Math.random()*0.8);
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    // -------- ERASER - quantum vacuum --------
    'eraser': {
      minSize: 5, maxSize: 200, defaultSize: 30,
      render(ctx, x, y, pressure, lx, ly, col, size, speed) {
        const s = size * (Brushes.pressureSize ? (0.3 + pressure*0.9) : 1);
        const op = (Brushes.opacity/100) * (Brushes.pressureOpacity ? (0.2+pressure*0.8) : 1) * (Brushes.flow/100);
        ctx.globalCompositeOperation = 'destination-out';
        // Soft circular eraser stamps
        const grad = ctx.createRadialGradient(x, y, 0, x, y, s*0.7);
        grad.addColorStop(0, `rgba(0,0,0,${op})`);
        grad.addColorStop(0.7, `rgba(0,0,0,${op*0.7})`);
        grad.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, s*0.7, 0, Math.PI*2);
        ctx.fill();

        // Connect to previous point with a stroke for gaps
        ctx.strokeStyle = `rgba(0,0,0,${op*0.6})`;
        ctx.lineWidth = s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    },

    // -------- SMUDGE - picks up and moves color --------
    'smudge': {
      minSize: 5, maxSize: 150, defaultSize: 25,
      _bufferCanvas: null,
      _bufferCtx: null,
      render(ctx, x, y, pressure, lx, ly, col, size, speed) {
        const s = size * (Brushes.pressureSize ? (0.3 + pressure*0.8) : 1);
        const op = (Brushes.opacity/100) * pressure * (Brushes.flow/100) * 0.4;
        if (op <= 0) return;

        // Lazy-init buffer
        if (!this._bufferCanvas) {
          this._bufferCanvas = document.createElement('canvas');
          this._bufferCanvas.width = 200;
          this._bufferCanvas.height = 200;
          this._bufferCtx = this._bufferCanvas.getContext('2d');
        }
        const bctx = this._bufferCtx;
        const bw = 200, bh = 200;
        const rs = Math.ceil(s*1.5);
        // Sample a patch around last point and smear toward current
        try {
          const img = ctx.getImageData(
            Math.max(0, Math.floor(lx) - rs),
            Math.max(0, Math.floor(ly) - rs),
            Math.min(bw, rs*2),
            Math.min(bh, rs*2)
          );
          bctx.clearRect(0,0,bw,bh);
          // Dim buffer (smudge decay)
          bctx.globalAlpha = 0.92;
          bctx.drawImage(this._bufferCanvas, -1, -1);
          bctx.globalAlpha = 1;
          // Stamp sampled patch
          const tmp = document.createElement('canvas');
          tmp.width = img.width; tmp.height = img.height;
          tmp.getContext('2d').putImageData(img, 0, 0);
          bctx.globalAlpha = 0.3;
          bctx.drawImage(tmp, rs - Math.floor(lx) + Math.floor(lx) - rs,
                              rs - Math.floor(ly) + Math.floor(ly) - rs);
          bctx.globalAlpha = 1;
          // Draw buffer at new position
          ctx.globalAlpha = op;
          ctx.drawImage(this._bufferCanvas, Math.floor(x)-rs, Math.floor(y)-rs);
          ctx.globalAlpha = 1;
          // Slight erase at source
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = `rgba(0,0,0,${op*0.15})`;
          ctx.beginPath();
          ctx.arc(lx, ly, s*0.3, 0, Math.PI*2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        } catch(e) {}
      }
    },

    // -------- FILL - quantum flood fill --------
    'fill': {
      minSize: 1, maxSize: 1, defaultSize: 1,
      render() { /* handled directly via doFill */ }
    },

    doFill(ctx, x, y, fillHex, w, h, dpr) {
      // Work in art pixels (pre-DPR)
      const ax = Math.floor(x), ay = Math.floor(y);
      const imgW = w, imgH = h;
      const img = ctx.getImageData(0, 0, w*dpr, h*dpr);
      const data = img.data;
      const dprScale = dpr;
      const sx = Math.floor(ax * dprScale);
      const sy = Math.floor(ay * dprScale);
      const idx0 = (sy * w * dprScale + sx) * 4;
      const tr = data[idx0], tg = data[idx0+1], tb = data[idx0+2], ta = data[idx0+3];
      const fr = parseInt(fillHex.slice(1,3),16);
      const fg = parseInt(fillHex.slice(3,5),16);
      const fb = parseInt(fillHex.slice(5,7),16);
      if (tr === fr && tg === fg && tb === fb && ta === 255) return;

      const tol = 22 * 22 * 4; // tolerance squared
      const stack = [[sx, sy]];
      const visited = new Uint8Array(w*dprScale * h*dprScale);
      const wScaled = w*dprScale;
      let filled = 0;
      const maxFill = 2000000;

      while (stack.length && filled < maxFill) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cx >= wScaled || cy < 0 || cy >= hScaled*dprScale) continue;
        const vi = cy * wScaled + cx;
        if (visited[vi]) continue;
        const ci = vi * 4;
        const dr = data[ci]-tr, dg = data[ci+1]-tg, db = data[ci+2]-tb, da = data[ci+3]-ta;
        if (dr*dr + dg*dg + db*db + da*da > tol) {
          if (!Quantum.tunnel(0.002)) continue;
        }
        visited[vi] = 1;
        data[ci] = fr; data[ci+1] = fg; data[ci+2] = fb; data[ci+3] = 255;
        filled++;
        stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
      }
      ctx.putImageData(img, 0, 0);
    },

    // -------- SELECT --------
    'select': { render() {} },

    // -------- EYEDROPPER --------
    'eyedropper': { render() {} },

    // -------- MARKER - Copic-style alcohol marker with tilt chisel --------
    'marker': {
      minSize: 3, maxSize: 80, defaultSize: 14,
      render(ctx, x, y, pressure, lx, ly, col, size, speed, tiltMag = 0, tiltAngle = 0) {
        const s = size * (Brushes.pressureSize ? (0.4 + pressure*0.8) : 1);
        const op = (Brushes.opacity/100) * (0.2 + pressure*0.2) * (Brushes.flow/100);
        ctx.globalCompositeOperation = 'multiply';
        // Tilt widens the chisel; at high tilt the chisel is broad, flat
        const chisel = 0.25 + tiltMag * 0.6;
        // Use tilt direction for chisel angle when tilting; otherwise follow stroke
        let angle;
        if (tiltMag > 0.15) angle = tiltAngle;
        else angle = Math.atan2(y-ly, x-lx) || 0;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const segLen = Math.hypot(x-lx, y-ly);
        const len = Math.max(segLen + s*0.3, s*0.5);
        // Draw overlapping chisel-shaped dabs (soft-edged rects)
        const grad = ctx.createLinearGradient(0, -s*chisel, 0, s*chisel);
        grad.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0)`);
        grad.addColorStop(0.2, `rgba(${col.r},${col.g},${col.b},${op})`);
        grad.addColorStop(0.8, `rgba(${col.r},${col.g},${col.b},${op})`);
        grad.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.6, s*chisel, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    // -------- NEON - glowing quantum emitter --------
    'neon': {
      minSize: 2, maxSize: 60, defaultSize: 8,
      render(ctx, x, y, pressure, lx, ly, col, size, speed) {
        const s = size * (Brushes.pressureSize ? (0.3 + pressure*0.9) : 1);
        const op = (Brushes.opacity/100) * (Brushes.pressureOpacity ? (0.4 + pressure*0.6) : 1) * (Brushes.flow/100);
        ctx.globalCompositeOperation = 'source-over';
        const rgb = Brushes._parseColor(Brushes._color);

        // Outer glow (large, soft)
        const g1 = ctx.createRadialGradient(x,y,0, x,y,s*4);
        g1.addColorStop(0, `hsla(${rgb.h}, 100%, 70%, ${op*0.4})`);
        g1.addColorStop(0.3, `hsla(${rgb.h}, 100%, 60%, ${op*0.2})`);
        g1.addColorStop(1, `hsla(${rgb.h}, 100%, 60%, 0)`);
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(x,y,s*4,0,Math.PI*2);
        ctx.fill();

        // Core
        ctx.strokeStyle = `hsla(${rgb.h}, 100%, 85%, ${op})`;
        ctx.lineWidth = s;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = `hsl(${rgb.h}, 100%, 60%)`;
        ctx.shadowBlur = s*2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Bright core
        ctx.strokeStyle = `hsla(${rgb.h}, 100%, 95%, ${op})`;
        ctx.lineWidth = s*0.4;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },

    // -------- WATERCOLOR - wet bleeding edge --------
    'watercolor': {
      minSize: 5, maxSize: 150, defaultSize: 30,
      render(ctx, x, y, pressure, lx, ly, col, size, speed) {
        const s = size * (Brushes.pressureSize ? (0.3 + pressure*0.9) : 1);
        const op = (Brushes.opacity/100) * 0.18 * (Brushes.flow/100);
        ctx.globalCompositeOperation = 'multiply';
        const rgb = Brushes._parseColor(Brushes._color);
        const count = Math.floor(3 + pressure*8);
        for (let i = 0; i < count; i++) {
          const a = Math.random()*Math.PI*2;
          const r = Quantum.gaussian(0, s*0.6);
          const bx = x + Math.cos(a)*r;
          const by = y + Math.sin(a)*r;
          const bs = s*(0.15 + Math.random()*0.4);
          const bo = op * (0.3 + Math.random()*0.7) * Math.exp(-r*r/(2*s*s*0.4));
          const edge = Math.random() < 0.2;
          ctx.fillStyle = `hsla(${rgb.h + (edge?5:0)}, ${rgb.s*0.8}%, ${rgb.l + (edge?5:-5)}%, ${bo})`;
          ctx.beginPath();
          // Irregular blobs
          const segs = 7;
          for (let k = 0; k <= segs; k++) {
            const aa = (k/segs)*Math.PI*2;
            const rr = bs * (0.7 + Math.random()*0.6);
            const px = bx + Math.cos(aa)*rr;
            const py = by + Math.sin(aa)*rr;
            if (k===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
  }
};

window.Brushes = Brushes;
