/* ================================================
   QUART Color/Spectrum Puck
   HSV color wheel · Copic palette that shifts with theme
   Quantum-entangled colors
   ================================================ */

const PalettePuck = {
  puck: null,
  wheel: null,
  ctx: null,
  picking: false,
  hue: 330, sat: 80, val: 100,

  init() {
    this.puck = document.getElementById('color-puck');
    this.wheel = document.getElementById('color-wheel');
    this.ctx = this.wheel.getContext('2d');

    this.renderWheel();
    this.renderCopicPalette();
    this.setupInputs();
    this.setColor(330, 80, 100);
  },

  renderWheel() {
    const ctx = this.ctx;
    const w = this.wheel.width, h = this.wheel.height;
    const cx = w/2, cy = h/2;
    const radius = Math.min(cx, cy) - 10;
    ctx.clearRect(0,0,w,h);

    // Draw hue ring
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const idx = (y * w + x) * 4;
        if (dist > radius - 25 && dist < radius) {
          const angle = Math.atan2(dy, dx);
          let hue = (angle * 180 / Math.PI + 360) % 360;
          // Hue ring - full saturation, full value
          const rgb = this.hsvToRgb(hue, 100, 100);
          img.data[idx] = rgb.r;
          img.data[idx+1] = rgb.g;
          img.data[idx+2] = rgb.b;
          img.data[idx+3] = 255;
        } else if (dist <= radius - 25) {
          // Saturation/Value square mapped to circle
          const angle = Math.atan2(dy, dx);
          let hue = (angle * 180 / Math.PI + 360) % 360;
          const sat = Math.min(100, dist / (radius - 25) * 100);
          const val = 100 - (dist / (radius - 25) * 20);
          const rgb = this.hsvToRgb(this.hue, sat, val);
          img.data[idx] = rgb.r;
          img.data[idx+1] = rgb.g;
          img.data[idx+2] = rgb.b;
          img.data[idx+3] = 255;
        } else {
          img.data[idx+3] = 0;
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    // Draw selector
    const selAngle = (this.hue / 360) * Math.PI * 2 - Math.PI/2;
    const selDist = (this.sat / 100) * (radius - 25);
    const sx = cx + Math.cos(selAngle) * selDist;
    const sy = cy + Math.sin(selAngle) * selDist;

    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fillStyle = this.hsvToHex(this.hue, this.sat, this.val);
    ctx.fill();

    // Center shows current color
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = this.hsvToHex(this.hue, this.sat, this.val);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  renderCopicPalette() {
    const container = document.getElementById('copic-palette');
    container.innerHTML = '';
    const colors = CopicPalette.shiftedColors;
    // Show 24 most commonly used colors (curated)
    const display = colors.slice(0, 24);
    display.forEach((c, i) => {
      const sw = document.createElement('div');
      sw.className = 'copic-swatch';
      sw.style.background = c.hex;
      sw.title = c.name;
      sw.addEventListener('click', () => {
        const hsl = CopicPalette.hexToHsl(c.hex);
        this.setColor(hsl.h, hsl.s, hsl.l, true); // lightness treated as value approx
        QuantumAudio.colorShift();
        document.querySelectorAll('.copic-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
      });
      container.appendChild(sw);
    });
  },

  setupInputs() {
    this.wheel.addEventListener('pointerdown', (e) => this.startPick(e));
    this.wheel.addEventListener('pointermove', (e) => { if (this.picking) this.pick(e); });
    this.wheel.addEventListener('pointerup', () => this.picking = false);
    this.wheel.addEventListener('pointercancel', () => this.picking = false);

    // Numeric inputs
    ['h','s','v'].forEach(comp => {
      const input = document.getElementById(`color-${comp}`);
      input.addEventListener('input', () => {
        this.hue = parseFloat(document.getElementById('color-h').value) || 0;
        this.sat = parseFloat(document.getElementById('color-s').value) || 0;
        this.val = parseFloat(document.getElementById('color-v').value) || 0;
        this.updateColor();
      });
    });
    const hexInput = document.getElementById('color-hex');
    hexInput.addEventListener('change', () => {
      let hex = hexInput.value.trim();
      if (!hex.startsWith('#')) hex = '#' + hex;
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        const hsl = CopicPalette.hexToHsl(hex);
        this.hue = hsl.h;
        this.sat = hsl.s;
        this.val = hsl.l;
        this.updateColor();
      }
    });
  },

  startPick(e) {
    this.picking = true;
    this.wheel.setPointerCapture(e.pointerId);
    this.pick(e);
  },

  pick(e) {
    const rect = this.wheel.getBoundingClientRect();
    const scaleX = this.wheel.width / rect.width;
    const scaleY = this.wheel.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const cx = this.wheel.width/2, cy = this.wheel.height/2;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const radius = Math.min(cx, cy) - 10;
    if (dist > radius) return;
    const angle = Math.atan2(dy, dx);
    this.hue = (angle * 180 / Math.PI + 360) % 360;
    if (dist > radius - 25) {
      // On hue ring - keep sat/val
    } else {
      this.sat = Math.min(100, (dist / (radius - 25)) * 100);
      this.val = 100;
    }
    this.updateColor();
  },

  setColor(h, s, v, skipRender) {
    this.hue = h; this.sat = s; this.val = v;
    this.updateColor(skipRender);
  },

  updateColor(skipRender) {
    const hex = this.hsvToHex(this.hue, this.sat, this.val);
    Renderer.setColor(hex);
    document.getElementById('color-h').value = Math.round(this.hue);
    document.getElementById('color-s').value = Math.round(this.sat);
    document.getElementById('color-v').value = Math.round(this.val);
    document.getElementById('color-hex').value = hex.toUpperCase();
    if (!skipRender) this.renderWheel();
    else this.renderWheel();
  },

  hsvToRgb(h, s, v) {
    s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r=0, g=0, b=0;
    if (h < 60) { r=c; g=x; }
    else if (h < 120) { r=x; g=c; }
    else if (h < 180) { g=c; b=x; }
    else if (h < 240) { g=x; b=c; }
    else if (h < 300) { r=x; b=c; }
    else { r=c; b=x; }
    return {
      r: Math.round((r+m)*255),
      g: Math.round((g+m)*255),
      b: Math.round((b+m)*255)
    };
  },

  hsvToHex(h, s, v) {
    const {r,g,b} = this.hsvToRgb(h,s,v);
    return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
  },

  /** Called when theme changes to refresh the palette */
  refreshPalette() {
    CopicPalette.applyTheme(CopicPalette.currentTheme);
    this.renderCopicPalette();
  }
};

window.PalettePuck = PalettePuck;
