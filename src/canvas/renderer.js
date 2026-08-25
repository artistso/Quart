/* ================================================
   QUART Canvas Renderer
   Manages layer canvases · zoom/pan · onion skinning
   Composite with blend modes · DPI-aware
   ================================================ */

const Renderer = {
  mainCanvas: null,
  mainCtx: null,
  overlayCanvas: null,
  overlayCtx: null,
  previewCanvas: null,
  previewCtx: null,

  // Canvas dimensions in CSS pixels and device pixels
  cssW: 0, cssH: 0,
  dpr: 1,

  // Layers
  layers: [],
  activeLayerIndex: 0,

  // View transform
  zoom: 1,
  panX: 0,
  panY: 0,

  // Drawing state
  isDrawing: false,
  lastX: 0, lastY: 0,
  currentColor: '#ff3366',

  // Undo/redo
  undoStack: [],
  redoStack: [],
  maxUndo: 40,

  // Onion skin
  onionSkin: false,
  onionOpacity: 0.3,

  init() {
    this.mainCanvas = document.getElementById('main-canvas');
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.previewCanvas = document.getElementById('preview-canvas');

    this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: false });
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this.previewCtx = this.previewCanvas.getContext('2d');

    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Create initial layer
    this.addLayer('Background');
    this.addLayer('Layer 1');

    this.setupInput();
    this.render();
  },

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.cssW = w;
    this.cssH = h;
    for (const c of [this.mainCanvas, this.overlayCanvas, this.previewCanvas]) {
      c.width = w * this.dpr;
      c.height = h * this.dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    }
    this.mainCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.overlayCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.previewCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.render();
  },

  addLayer(name) {
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = this.cssW * this.dpr;
    layerCanvas.height = this.cssH * this.dpr;
    const ctx = layerCanvas.getContext('2d');
    const layer = {
      name: name || `Layer ${this.layers.length + 1}`,
      canvas: layerCanvas,
      ctx,
      visible: true,
      opacity: 1,
      blendMode: 'source-over'
    };
    // If it's the first layer, fill with bg
    if (this.layers.length === 0) {
      ctx.fillStyle = CopicPalette.themes[CopicPalette.currentTheme].bg;
      ctx.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
      layer.locked = true;
    } else {
      layer.locked = false;
    }
    this.layers.push(layer);
    this.activeLayerIndex = this.layers.length - 1;
    this.updateLayerUI();
    this.render();
    return layer;
  },

  deleteLayer(idx) {
    if (this.layers.length <= 1) return;
    if (idx === 0 && this.layers[0].locked) return; // Don't delete bg
    this.layers.splice(idx, 1);
    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }
    this.updateLayerUI();
    this.render();
  },

  duplicateLayer(idx) {
    const src = this.layers[idx];
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = src.canvas.width;
    layerCanvas.height = src.canvas.height;
    const ctx = layerCanvas.getContext('2d');
    ctx.drawImage(src.canvas, 0, 0);
    const layer = {
      name: src.name + ' copy',
      canvas: layerCanvas,
      ctx,
      visible: src.visible,
      opacity: src.opacity,
      blendMode: src.blendMode,
      locked: false
    };
    this.layers.splice(idx + 1, 0, layer);
    this.activeLayerIndex = idx + 1;
    this.updateLayerUI();
    this.render();
  },

  getActiveLayer() {
    return this.layers[this.activeLayerIndex];
  },

  saveUndo() {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    // Save snapshot of active layer
    const snap = document.createElement('canvas');
    snap.width = layer.canvas.width;
    snap.height = layer.canvas.height;
    snap.getContext('2d').drawImage(layer.canvas, 0, 0);
    this.undoStack.push({ layerIdx: this.activeLayerIndex, snap });
    if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    this.redoStack = [];
  },

  undo() {
    if (!this.undoStack.length) return;
    const entry = this.undoStack.pop();
    const layer = this.layers[entry.layerIdx];
    // Save current to redo
    const snap = document.createElement('canvas');
    snap.width = layer.canvas.width;
    snap.height = layer.canvas.height;
    snap.getContext('2d').drawImage(layer.canvas, 0, 0);
    this.redoStack.push({ layerIdx: entry.layerIdx, snap });
    // Restore
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(entry.snap, 0, 0);
    QuantumAudio.undo();
    this.updateLayerUI();
    this.render();
    this.showToast('Quantum jump back');
  },

  redo() {
    if (!this.redoStack.length) return;
    const entry = this.redoStack.pop();
    const layer = this.layers[entry.layerIdx];
    const snap = document.createElement('canvas');
    snap.width = layer.canvas.width;
    snap.height = layer.canvas.height;
    snap.getContext('2d').drawImage(layer.canvas, 0, 0);
    this.undoStack.push({ layerIdx: entry.layerIdx, snap });
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(entry.snap, 0, 0);
    QuantumAudio.redo();
    this.updateLayerUI();
    this.render();
    this.showToast('Quantum leap forward');
  },

  showToast(msg) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  /** Composite all layers to main canvas */
  render() {
    const ctx = this.mainCtx;
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.save();
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0, this.cssW, this.cssH);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },

  /** Coordinate conversion: screen → canvas */
  screenToCanvas(sx, sy) {
    return { x: sx, y: sy };
  },

  setupInput() {
    const stack = document.getElementById('canvas-stack');
    let pointers = new Map();
    let isPanning = false;
    let panStart = null;
    let pinchDist = null;
    let pinchAngle = null;
    let twoFingerStartDist = null;

    const getPos = (e) => ({
      x: e.clientX,
      y: e.clientY,
      pressure: e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5
    });

    stack.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stack.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      pointers.set(e.pointerId, pos);

      // Two fingers → pan/zoom
      if (pointers.size >= 2) {
        isPanning = true;
        const pts = Array.from(pointers.values());
        twoFingerStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchDist = twoFingerStartDist;
        pinchAngle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        panStart = { x: (pts[0].x + pts[1].x)/2, y: (pts[0].y + pts[1].y)/2 };
        return;
      }

      // If any expanded puck is open, check if click is outside to close
      // But don't interrupt drawing
      const activePuck = document.querySelector('.puck[data-state="expanded"]');
      // Start drawing
      if (Brushes.current === 'select') {
        // Selection mode
        this.selStart = pos;
        this.selCurrent = pos;
        return;
      }
      this.isDrawing = true;
      this.lastX = pos.x;
      this.lastY = pos.y;
      this.saveUndo();
      Brushes.startStroke(pos.x, pos.y, pos.pressure, this.currentColor);
      QuantumAudio.penDown(pos.pressure);

      // Ripple effect
      this.ripple(pos.x, pos.y);
    });

    stack.addEventListener('pointermove', (e) => {
      e.preventDefault();
      const pos = getPos(e);

      if (pointers.has(e.pointerId)) {
        pointers.set(e.pointerId, pos);
      }

      // Two finger gestures
      if (pointers.size >= 2) {
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchDist !== null) {
          const scale = dist / twoFingerStartDist;
          this.zoom = Math.max(0.2, Math.min(5, scale));
        }
        return;
      }

      if (isPanning) return;

      if (Brushes.current === 'select' && this.selStart) {
        this.selCurrent = pos;
        this.drawMarquee();
        return;
      }

      if (!this.isDrawing) return;
      const layer = this.getActiveLayer();
      if (!layer || layer.locked) return;

      const ctx = layer.ctx;
      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      // Draw segment
      const brush = Brushes.settings[Brushes.current];
      if (brush) {
        brush.render(ctx, pos.x, pos.y, pos.pressure, this.lastX, this.lastY, this.currentColor, Brushes.size);
      }

      // Update particles
      Brushes.updateParticles(ctx);

      ctx.restore();
      this.lastX = pos.x;
      this.lastY = pos.y;
      QuantumAudio.drawHum(pos.pressure);
      this.render();
    });

    const endPointer = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        isPanning = false;
        pinchDist = null;
      }
      if (this.isDrawing) {
        this.isDrawing = false;
        Brushes.endStroke();
        this.render();
        this.updateLayerThumbnail(this.activeLayerIndex);
      }
      if (Brushes.current === 'select' && this.selStart) {
        // Commit selection
        this.clearMarquee();
        this.selStart = null;
        this.selCurrent = null;
      }
    };
    stack.addEventListener('pointerup', endPointer);
    stack.addEventListener('pointercancel', endPointer);
    stack.addEventListener('pointerleave', endPointer);
  },

  drawMarquee() {
    this.clearMarquee();
    if (!this.selStart || !this.selCurrent) return;
    const x = Math.min(this.selStart.x, this.selCurrent.x);
    const y = Math.min(this.selStart.y, this.selCurrent.y);
    const w = Math.abs(this.selCurrent.x - this.selStart.x);
    const h = Math.abs(this.selCurrent.y - this.selStart.y);
    const m = document.createElement('div');
    m.className = 'marquee';
    m.id = 'active-marquee';
    m.style.left = x + 'px';
    m.style.top = y + 'px';
    m.style.width = w + 'px';
    m.style.height = h + 'px';
    document.getElementById('canvas-stack').appendChild(m);
  },

  clearMarquee() {
    const m = document.getElementById('active-marquee');
    if (m) m.remove();
  },

  ripple(x, y) {
    const r = document.createElement('div');
    r.className = 'quantum-ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 800);
  },

  updateLayerUI() {
    const list = document.getElementById('layers-list');
    if (!list) return;
    list.innerHTML = '';
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const item = document.createElement('div');
      item.className = 'layer-item' + (i === this.activeLayerIndex ? ' active' : '');
      item.innerHTML = `
        <div class="layer-vis ${layer.visible ? '' : 'hidden'}" data-idx="${i}">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div class="layer-thumb" data-idx="${i}" id="thumb-${i}"></div>
        <div class="layer-name" contenteditable="true" data-idx="${i}">${layer.name}</div>
        <div class="layer-opacity">${Math.round(layer.opacity * 100)}%</div>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.layer-vis') || e.target.closest('.layer-name')) return;
        this.activeLayerIndex = i;
        this.updateLayerUI();
      });
      list.appendChild(item);

      // Visibility toggle
      item.querySelector('.layer-vis').addEventListener('click', (e) => {
        e.stopPropagation();
        layer.visible = !layer.visible;
        this.updateLayerUI();
        this.render();
      });
      // Name edit
      item.querySelector('.layer-name').addEventListener('blur', (e) => {
        layer.name = e.target.textContent || `Layer ${i+1}`;
      });
      // Generate thumbnail
      this.updateLayerThumbnail(i);
    }
  },

  updateLayerThumbnail(idx) {
    const thumb = document.getElementById(`thumb-${idx}`);
    if (!thumb) return;
    const layer = this.layers[idx];
    const tc = document.createElement('canvas');
    tc.width = 56; tc.height = 56;
    const tctx = tc.getContext('2d');
    tctx.fillStyle = CopicPalette.themes[CopicPalette.currentTheme].bg;
    tctx.fillRect(0, 0, 56, 56);
    tctx.drawImage(layer.canvas, 0, 0, 56, 56);
    thumb.style.backgroundImage = `url(${tc.toDataURL()})`;
  },

  setColor(hex) {
    this.currentColor = hex;
    const swatch = document.getElementById('active-color-swatch');
    if (swatch) swatch.style.background = hex;
  },

  setTheme(themeName) {
    const theme = CopicPalette.themes[themeName];
    document.documentElement.style.setProperty('--bg-canvas', theme.bg);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--accent-2', theme.accent2);
    document.documentElement.style.setProperty('--accent-3', theme.accent3);
    document.body.setAttribute('data-theme', themeName);

    // Update background layer if present and locked
    if (this.layers[0] && this.layers[0].locked) {
      const ctx = this.layers[0].ctx;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, this.layers[0].canvas.width, this.layers[0].canvas.height);
      ctx.restore();
      this.render();
      this.updateLayerThumbnail(0);
    }
  },

  exportPNG() {
    // Render to temp canvas at device resolution
    const tc = document.createElement('canvas');
    tc.width = this.cssW * this.dpr;
    tc.height = this.cssH * this.dpr;
    const tctx = tc.getContext('2d');
    tctx.scale(this.dpr, this.dpr);
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      tctx.globalAlpha = layer.opacity;
      tctx.drawImage(layer.canvas, 0, 0, this.cssW, this.cssH);
    }
    const link = document.createElement('a');
    link.download = `quart-${Date.now()}.png`;
    link.href = tc.toDataURL('image/png');
    link.click();
    QuantumAudio.success();
    this.showToast('PNG exported');
  },

  /** Clear active layer */
  clearLayer() {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    this.saveUndo();
    layer.ctx.save();
    layer.ctx.setTransform(1,0,0,1,0,0);
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.restore();
    this.render();
    this.updateLayerThumbnail(this.activeLayerIndex);
  }
};

window.Renderer = Renderer;
