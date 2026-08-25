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
  cssSize: 200,

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
    const size = this.cssSize;
    const dpr = window.devicePixelRatio || 1;
    this.wheel.width = size * dpr;
    this.wheel.height = size * dpr;
    this.wheel.style.width = size + 'px';
    this.wheel.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size/2, cy = size/2;
    const outerR = size/2 - 8;
    const ringWidth = 22;
    const innerR = outerR - ringWidth;

    // Draw saturation/value disk (inner area) — we lock V=1, S varies with radius
    // Draw hue ring
    for (let a = 0; a < 360; a += 0.5) {
      const rad = (a - 90) * Math.PI/180;
      const grad = ctx.createLinearGradient(
        cx + Math.cos(rad)*innerR, cy + Math.sin(rad)*innerR,
        cx + Math.cos(rad)*outerR, cy + Math.sin(rad)*outerR
      );
      grad.addColorStop(0, `hsl(${a}, 100%, 50%)`);
      grad.addColorStop(1, `hsl(${a}, 100%, 50%)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, (innerR+outerR)/2, rad-0.01, rad+0.01);
      ctx.stroke();
    }

    // Inner disk: saturation varies with radius, value fixed at current (rough)
    const diskGrad = ctx.createRadialGradient(cx,cy,0, cx,cy,innerR);
    diskGrad.addColorStop(0, `hsl(${this.hue}, 100%, 100%)`);
    diskGrad.addColorStop(0.6, `hsl(${this.hue}, 100%, 60%)`);
    diskGrad.addColorStop(1, `hsl(${this.hue}, 100%, 50%)`);
    ctx.beginPath(); ctx.arc(cx,cy,innerR,0,Math.PI*2);
    ctx.fillStyle = diskGrad; ctx.fill();

    // Saturation overlay: white at center fading out (saturation decreases toward center)
    const whiteGrad = ctx.createRadialGradient(cx,cy,0, cx,cy,innerR);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.beginPath(); ctx.arc(cx,cy,innerR,0,Math.PI*2); ctx.fill();

    // Outer ring border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx,cy,outerR,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,innerR,0,Math.PI*2); ctx.stroke();

    // Current color indicator: dot on the hue ring at selected hue
    const hRad = (this.hue - 90) * Math.PI/180;
    const hx = cx + Math.cos(hRad)*((innerR+outerR)/2);
    const hy = cy + Math.sin(hRad)*((innerR+outerR)/2);
    // Dot on disk for saturation
    const sRad = (this.sat/100) * innerR;
    const sAngle = hRad; // saturation sits along same hue direction
    const sx = cx + Math.cos(sAngle)*sRad;
    const sy = cy + Math.sin(sAngle)*sRad;

    ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI*2);
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI*2);
    ctx.fillStyle = this.hsvToHex(this.hue, this.sat, this.val); ctx.fill();

    // Hue marker
    ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2);
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();

    // Center shows current color (clean fill)
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2);
    ctx.fillStyle = this.hsvToHex(this.hue, this.sat, this.val); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  },

  renderCopicPalette() {
    const container = document.getElementById('copic-palette');
    container.innerHTML = '';
    const colors = CopicPalette.shiftedColors;
    // Curate to 28 most useful colors
    const display = colors.slice(0, 28);
    display.forEach((c, i) => {
      const sw = document.createElement('div');
      sw.className = 'copic-swatch';
      sw.style.background = c.hex;
      sw.title = c.name;
      sw.addEventListener('click', () => {
        const hsl = CopicPalette.hexToHsl(c.hex);
        this.setColor(hsl.h, Math.min(100,hsl.s), Math.min(100, hsl.l));
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
    this.wheel.addEventListener('pointerleave', () => this.picking = false);

    ['h','s','v'].forEach(comp => {
      const input = document.getElementById(`color-${comp}`);
      input.addEventListener('input', () => {
        this.hue = Math.max(0,Math.min(360,parseFloat(document.getElementById('color-h').value) || 0));
        this.sat = Math.max(0,Math.min(100,parseFloat(document.getElementById('color-s').value) || 0));
        this.val = Math.max(0,Math.min(100,parseFloat(document.getElementById('color-v').value) || 0));
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
    try { this.wheel.setPointerCapture(e.pointerId); } catch(_){}
    this.pick(e);
  },

  pick(e) {
    const rect = this.wheel.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = this.cssSize;
    const cx = size/2, cy = size/2;
    const outerR = size/2 - 8;
    const ringWidth = 22;
    const innerR = outerR - ringWidth;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > outerR + 4) return;

    let angle = Math.atan2(dy, dx) * 180/Math.PI + 90;
    angle = (angle + 360) % 360;

    if (dist > innerR) {
      // On hue ring
      this.hue = angle;
    } else {
      // On disk - set saturation
      this.hue = angle;
      this.sat = Math.min(100, Math.max(0, (dist / innerR) * 100));
    }
    this.val = 100;
    this.updateColor();
  },

  setColor(h, s, v) {
    this.hue = h; this.sat = s; this.val = v;
    this.updateColor();
  },

  updateColor() {
    const hex = this.hsvToHex(this.hue, this.sat, this.val);
    Renderer.setColor(hex);
    document.getElementById('color-h').value = Math.round(this.hue);
    document.getElementById('color-s').value = Math.round(this.sat);
    document.getElementById('color-v').value = Math.round(this.val);
    document.getElementById('color-hex').value = hex.toUpperCase();
    this.renderWheel();
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

  refreshPalette() {
    CopicPalette.applyTheme(CopicPalette.currentTheme);
    this.renderCopicPalette();
  }
};

window.PalettePuck = PalettePuck;
