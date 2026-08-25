/* ================================================
   QUART Canvas Renderer
   Manages layer canvases · zoom/pan · onion skinning
   Composite with blend modes · DPI-aware · high-quality
   ================================================ */

const Renderer = {
  mainCanvas: null,
  mainCtx: null,
  overlayCanvas: null,
  overlayCtx: null,
  previewCanvas: null,
  previewCtx: null,

  // Canvas dimensions in CSS pixels
  cssW: 0,
  cssH: 0,
  dpr: 1,

  // Canvas document size (artboard — higher res than screen for crisp final output)
  artW: 2800,
  artH: 2000,

  // Layers
  layers: [],
  activeLayerIndex: 0,

  // View transform
  zoom: 1,
  panX: 0,
  panY: 0,

  // Drawing state
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  currentColor: '#ff3366',

  // Stroke buffer (for perfect stroke rendering before commit)
  strokeCanvas: null,
  strokeCtx: null,

  // Undo/redo
  undoStack: [],
  redoStack: [],
  maxUndo: 40,

  // Onion skin
  onionSkin: false,
  onionOpacity: 0.3,

  // Transform state for two-finger gestures
  _gestureMode: null, // 'pan' | 'zoom' | null
  _gestureStart: null,

  init() {
    this.mainCanvas = document.getElementById('main-canvas');
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.previewCanvas = document.getElementById('preview-canvas');

    this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: false, desynchronized: true });
    this.overlayCtx = this.overlayCanvas.getContext('2d', { desynchronized: true });
    this.previewCtx = this.previewCanvas.getContext('2d', { desynchronized: true });

    // Create offscreen stroke buffer for high-DPI rendering
    this.strokeCanvas = document.createElement('canvas');
    this.strokeCtx = this.strokeCanvas.getContext('2d', { willReadFrequently: false, desynchronized: true });

    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5); // Cap for perf on tablet
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Fit artboard to view on first load
    this.fitToScreen();

    // Create initial layer stack
    this.addLayer('Background', true);
    this.addLayer('Layer 1');

    this.setupInput();
    this.render();
    this.updateTransform();
  },

  fitToScreen() {
    const sx = window.innerWidth / this.artW;
    const sy = window.innerHeight / this.artH;
    this.zoom = Math.min(sx, sy) * 0.95;
    this.panX = (window.innerWidth - this.artW * this.zoom) / 2;
    this.panY = (window.innerHeight - this.artH * this.zoom) / 2;
    this.updateTransform();
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

    // Resize layer canvases if needed
    for (const layer of this.layers) {
      if (layer.locked) {
        layer.canvas.width = this.artW * this.dpr;
        layer.canvas.height = this.artH * this.dpr;
        const ctx = layer.ctx;
        ctx.fillStyle = CopicPalette.themes[CopicPalette.currentTheme].bg;
        ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
      }
    }

    this.updateTransform();
    this.render();
  },

  /**
   * Update the canvas transform for zoom/pan.
   * All drawing goes through this transform; screen↔art coords must convert.
   */
  updateTransform() {
    // Update zoom indicator
    const zEl = document.getElementById('doc-zoom');
    if (zEl) zEl.textContent = Math.round(this.zoom * 100) + '%';
    const sEl = document.getElementById('doc-size');
    if (sEl) sEl.textContent = `${this.artW} × ${this.artH}`;
    const ctx = this.mainCtx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Draw artboard paper tint (chequered background for transparent layers)
    if (this.isThemeDark()) {
      // Inset border glow
      ctx.shadowColor = 'rgba(124,92,255,0.2)';
      ctx.shadowBlur = 40;
      ctx.fillStyle = CopicPalette.themes[CopicPalette.currentTheme].bg;
      ctx.fillRect(0, 0, this.artW, this.artH);
      ctx.shadowBlur = 0;
    }

    // Composite layers in art space
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode || 'source-over';
      ctx.drawImage(layer.canvas, 0, 0, this.artW, this.artH);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Draw stroke preview on top of main canvas? No — draw on preview canvas
    // Reset preview
    this.previewCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.previewCtx.clearRect(0, 0, this.cssW, this.cssH);

    // Overlay: onion skin, guides, brush cursor
    this.overlayCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.overlayCtx.clearRect(0, 0, this.cssW, this.cssH);
    this.overlayCtx.translate(this.panX, this.panY);
    this.overlayCtx.scale(this.zoom, this.zoom);

    // Onion skin
    this.drawOnionSkin();

    // Brush cursor ring
    if (this._cursorX != null && Brushes.current !== 'select' && Brushes.current !== 'fill') {
      const s = Brushes.size;
      this.overlayCtx.strokeStyle = 'rgba(255,255,255,0.6)';
      this.overlayCtx.lineWidth = 1 / this.zoom;
      this.overlayCtx.beginPath();
      this.overlayCtx.arc(this._cursorX, this._cursorY, s, 0, Math.PI * 2);
      this.overlayCtx.stroke();
      this.overlayCtx.strokeStyle = 'rgba(0,0,0,0.4)';
      this.overlayCtx.lineWidth = 1 / this.zoom;
      this.overlayCtx.beginPath();
      this.overlayCtx.arc(this._cursorX, this._cursorY, s + 1.5/this.zoom, 0, Math.PI * 2);
      this.overlayCtx.stroke();
    }
  },

  drawOnionSkin() {
    if (!this.onionSkin || Animation.frames.length < 2) return;
    const ctx = this.overlayCtx;
    // Previous frame - tint red
    const prevIdx = Animation.currentFrame - 1;
    if (prevIdx >= 0 && Animation.frames[prevIdx]) {
      ctx.globalAlpha = this.onionOpacity * 0.35;
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.filter = 'sepia(0.4) hue-rotate(-30deg) saturate(0.7)';
      ctx.drawImage(Animation.frames[prevIdx].canvas, 0, 0, this.artW, this.artH);
      ctx.restore();
    }
    // Next frame - tint green/blue
    const nextIdx = Animation.currentFrame + 1;
    if (nextIdx < Animation.frames.length && Animation.frames[nextIdx]) {
      ctx.globalAlpha = this.onionOpacity * 0.25;
      ctx.save();
      ctx.filter = 'sepia(0.3) hue-rotate(150deg) saturate(0.7)';
      ctx.drawImage(Animation.frames[nextIdx].canvas, 0, 0, this.artW, this.artH);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
  },

  isThemeDark() {
    return ['void','nebula','plasma','quantum','aurora'].includes(CopicPalette.currentTheme);
  },

  addLayer(name, isBackground = false) {
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = this.artW * this.dpr;
    layerCanvas.height = this.artH * this.dpr;
    const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
    const layer = {
      name: name || `Layer ${this.layers.length + 1}`,
      canvas: layerCanvas,
      ctx,
      visible: true,
      opacity: 1,
      blendMode: 'source-over',
      locked: isBackground
    };
    if (isBackground) {
      ctx.fillStyle = CopicPalette.themes[CopicPalette.currentTheme].bg;
      ctx.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
    }
    this.layers.push(layer);
    this.activeLayerIndex = this.layers.length - 1;
    this.updateLayerUI();
    this.updateTransform();
    return layer;
  },

  deleteLayer(idx) {
    if (this.layers.length <= 1) return;
    if (this.layers[idx].locked) return;
    this.layers.splice(idx, 1);
    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }
    this.updateLayerUI();
    this.updateTransform();
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
    this.updateTransform();
  },

  getActiveLayer() {
    return this.layers[this.activeLayerIndex];
  },

  saveUndo() {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
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
    if (!layer) return;
    const snap = document.createElement('canvas');
    snap.width = layer.canvas.width;
    snap.height = layer.canvas.height;
    snap.getContext('2d').drawImage(layer.canvas, 0, 0);
    this.redoStack.push({ layerIdx: entry.layerIdx, snap });
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(entry.snap, 0, 0);
    QuantumAudio.undo();
    this.updateLayerThumbnail(entry.layerIdx);
    this.updateTransform();
    this.showToast('Quantum jump back');
  },

  redo() {
    if (!this.redoStack.length) return;
    const entry = this.redoStack.pop();
    const layer = this.layers[entry.layerIdx];
    if (!layer) return;
    const snap = document.createElement('canvas');
    snap.width = layer.canvas.width;
    snap.height = layer.canvas.height;
    snap.getContext('2d').drawImage(layer.canvas, 0, 0);
    this.undoStack.push({ layerIdx: entry.layerIdx, snap });
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(entry.snap, 0, 0);
    QuantumAudio.redo();
    this.updateLayerThumbnail(entry.layerIdx);
    this.updateTransform();
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

  /** Render composite to main canvas */
  render() {
    this.updateTransform();
  },

  /* ------------------- Coordinate transforms ------------------- */

  screenToArt(sx, sy) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom
    };
  },

  artToScreen(ax, ay) {
    return {
      x: ax * this.zoom + this.panX,
      y: ay * this.zoom + this.panY
    };
  },

  /* ------------------- Input Handling ------------------- */

  setupInput() {
    const stack = document.getElementById('canvas-stack');
    const pointers = new Map();
    let prevTool = 'quantum-pen'; // For S Pen button toggle back
    let lastTapTime = 0;
    let lastTapPos = {x:0, y:0};

    const getPos = (e) => {
      const art = this.screenToArt(e.clientX, e.clientY);
      // S Pen provides tiltX/tiltY (degrees)
      const tiltX = e.tiltX || 0;
      const tiltY = e.tiltY || 0;
      const tiltMag = Math.min(1, Math.hypot(tiltX, tiltY) / 60);
      const tiltAngle = Math.atan2(tiltY, tiltX);
      return {
        sx: e.clientX,
        sy: e.clientY,
        x: art.x,
        y: art.y,
        pressure: (e.pressure != null && e.pressure > 0 && e.pointerType === 'pen') ? e.pressure :
                   (e.pointerType === 'touch' ? 0.7 : 0.8),
        pointerType: e.pointerType,
        button: e.button,
        tiltX, tiltY, tiltMag, tiltAngle
      };
    };

    stack.addEventListener('pointerdown', (e) => {
      // Ignore if on a UI element (puck handle)
      if (e.target.closest('.puck')) return;
      e.preventDefault();
      stack.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      pointers.set(e.pointerId, pos);

      QuantumAudio.init();

      // Double-tap with finger = fit to screen
      if (pos.pointerType !== 'pen') {
        const now = performance.now();
        if (now - lastTapTime < 300 && Math.hypot(pos.sx - lastTapPos.x, pos.sy - lastTapPos.y) < 40) {
          this.fitToScreen();
          this.showToast('Fit to screen');
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;
        lastTapPos = {x: pos.sx, y: pos.sy};
      }

      // S Pen button: barrel button = eraser, right-click = eyedropper
      if (pos.pointerType === 'pen' && (e.buttons === 32 || e.button === 5 || e.button === 2)) {
        if (Brushes.current !== 'eraser') {
          prevTool = Brushes.current;
          ToolPuckUI.selectTool('eraser');
        }
      }
      // Right-click = eyedropper
      if (e.button === 2) {
        e.preventDefault();
        if (pos.x >= 0 && pos.x <= this.artW && pos.y >= 0 && pos.y <= this.artH) {
          this.pickColor(pos.x, pos.y);
        }
        return;
      }

      // Two+ fingers = pan/zoom
      if (pointers.size >= 2) {
        this.isDrawing = false;
        this._gestureMode = 'transform';
        const pts = Array.from(pointers.values());
        this._gestureStart = {
          panX: this.panX, panY: this.panY,
          zoom: this.zoom,
          cx: (pts[0].sx + pts[1].sx) / 2,
          cy: (pts[0].sy + pts[1].sy) / 2,
          dist: Math.hypot(pts[0].sx - pts[1].sx, pts[0].sy - pts[1].sy)
        };
        return;
      }

      // Single finger/stylus = draw
      this._gestureMode = 'draw';
      this.isDrawing = true;
      this.lastX = pos.x;
      this.lastY = pos.y;

      // Don't draw outside artboard
      if (pos.x < 0 || pos.x > this.artW || pos.y < 0 || pos.y > this.artH) {
        this.isDrawing = false;
        return;
      }
      if (Brushes.current === 'select') {
        this._selStart = pos;
        this._selCurrent = pos;
        this.isDrawing = false;
        return;
      }
      if (Brushes.current === 'fill') {
        this.saveUndo();
        Brushes.doFill(this.getActiveLayer().ctx, pos.x, pos.y, this.currentColor, this.artW, this.artH, this.dpr);
        QuantumAudio.penDown(pos.pressure);
        this.updateTransform();
        this.updateLayerThumbnail(this.activeLayerIndex);
        this.ripple(pos.sx, pos.sy);
        return;
      }

      // Eyedropper
      if (Brushes.current === 'eyedropper') {
        this.pickColor(pos.x, pos.y);
        ToolPuckUI.selectTool('quantum-pen');
        return;
      }

      this.saveUndo();
      Brushes.beginStroke(pos.x, pos.y, pos.pressure, this.currentColor, pos.tiltMag, pos.tiltAngle);
      QuantumAudio.penDown(pos.pressure);
      this.ripple(pos.sx, pos.sy);
    });

    stack.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      const pos = getPos(e);
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, pos);

      // Track cursor for brush preview
      this._cursorX = pos.x;
      this._cursorY = pos.y;

      // Multi-touch transform
      if (pointers.size >= 2 && this._gestureMode === 'transform') {
        const pts = Array.from(pointers.values());
        const cx = (pts[0].sx + pts[1].sx) / 2;
        const cy = (pts[0].sy + pts[1].sy) / 2;
        const dist = Math.hypot(pts[0].sx - pts[1].sx, pts[0].sy - pts[1].sy);
        const g = this._gestureStart;
        // Zoom around gesture center
        const scale = dist / g.dist;
        const newZoom = Math.max(0.1, Math.min(8, g.zoom * scale));
        // Keep gesture center stationary in art space
        const artCx = (g.cx - g.panX) / g.zoom;
        const artCy = (g.cy - g.panY) / g.zoom;
        this.zoom = newZoom;
        this.panX = cx - artCx * newZoom;
        this.panY = cy - artCy * newZoom;
        // Allow panning while zooming
        this.panX += pos.sx - g.cx;
        this.panY += pos.sy - g.cy;
        this.updateTransform();
        return;
      }

      if (this._gestureMode !== 'draw') {
        // Still update cursor overlay
        this.updateTransform();
        return;
      }

      if (!this.isDrawing) {
        this.updateTransform();
        return;
      }

      // Clamp to artboard
      const x = Math.max(0, Math.min(this.artW, pos.x));
      const y = Math.max(0, Math.min(this.artH, pos.y));

      const layer = this.getActiveLayer();
      if (!layer || layer.locked) return;
      const ctx = layer.ctx;

      ctx.save();
      ctx.scale(this.dpr, this.dpr);
      Brushes.strokeTo(ctx, x, y, pos.pressure, this.lastX, this.lastY, this.currentColor, Brushes.size, pos.tiltMag, pos.tiltAngle);
      ctx.restore();

      // Particle updates
      Brushes.updateParticles(ctx, this.dpr);

      this.lastX = x;
      this.lastY = y;
      this.updateTransform();
    });

    const endPointer = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        this._gestureMode = null;
      }
      if (this.isDrawing) {
        this.isDrawing = false;
        Brushes.endStroke();
        this.updateTransform();
        this.updateLayerThumbnail(this.activeLayerIndex);
        // Restore tool if S Pen eraser was active via button
        if (Brushes.current === 'eraser' && e.pointerType === 'pen' && prevTool && prevTool !== 'eraser') {
          ToolPuckUI.selectTool(prevTool);
        }
      }
    };
    // Prevent context menu for right-click = eyedropper
    stack.addEventListener('contextmenu', e => e.preventDefault());
    stack.addEventListener('pointerup', endPointer);
    stack.addEventListener('pointercancel', endPointer);
    stack.addEventListener('pointerleave', (e) => {
      if (e.pointerId != null) endPointer(e);
    });

    // Wheel zoom (desktop testing)
    stack.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const mx = e.clientX, my = e.clientY;
      const artX = (mx - this.panX) / this.zoom;
      const artY = (my - this.panY) / this.zoom;
      this.zoom = Math.max(0.1, Math.min(8, this.zoom * delta));
      this.panX = mx - artX * this.zoom;
      this.panY = my - artY * this.zoom;
      this.updateTransform();
    }, { passive: false });
  },

  ripple(sx, sy) {
    const r = document.createElement('div');
    r.className = 'quantum-ripple';
    r.style.left = sx + 'px';
    r.style.top = sy + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 800);
  },

  pickColor(ax, ay) {
    const layer = this.getActiveLayer();
    if (!layer) return;
    const px = Math.floor(ax * this.dpr);
    const py = Math.floor(ay * this.dpr);
    try {
      const data = layer.ctx.getImageData(px, py, 1, 1).data;
      const hex = '#' + [data[0],data[1],data[2]].map(c => c.toString(16).padStart(2,'0')).join('');
      if (data[3] > 10) {
        this.setColor(hex);
        const hsl = CopicPalette.hexToHsl(hex);
        PalettePuck.setColor(hsl.h, hsl.s, hsl.l);
        this.showToast(`Picked ${hex.toUpperCase()}`);
      }
    } catch(e) {}
  },

  updateLayerUI() {
    const list = document.getElementById('layers-list');
    if (!list) return;
    list.innerHTML = '';
    // Render top-to-bottom
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const item = document.createElement('div');
      item.className = 'layer-item' + (i === this.activeLayerIndex ? ' active' : '');
      item.innerHTML = `
        <div class="layer-vis ${layer.visible ? '' : 'hidden'}" data-idx="${i}" title="Visibility">
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

      item.querySelector('.layer-vis').addEventListener('click', (e) => {
        e.stopPropagation();
        layer.visible = !layer.visible;
        this.updateLayerUI();
        this.updateTransform();
      });
      item.querySelector('.layer-name').addEventListener('blur', (e) => {
        layer.name = e.target.textContent || `Layer ${i+1}`;
      });
      item.querySelector('.layer-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
      });
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
    // Checker for transparent
    tctx.fillStyle = '#333';
    tctx.fillRect(0,0,56,56);
    for (let yy = 0; yy < 56; yy += 8) {
      for (let xx = 0; xx < 56; xx += 8) {
        if ((xx+yy)/8 % 2 === 0) { tctx.fillStyle = '#444'; tctx.fillRect(xx,yy,8,8); }
      }
    }
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
    if (this.layers[0] && this.layers[0].locked) {
      const ctx = this.layers[0].ctx;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, this.layers[0].canvas.width, this.layers[0].canvas.height);
      ctx.restore();
      this.updateTransform();
      this.updateLayerThumbnail(0);
    }
  },

  exportPNG() {
    const tc = document.createElement('canvas');
    tc.width = this.artW * this.dpr;
    tc.height = this.artH * this.dpr;
    const tctx = tc.getContext('2d');
    tctx.scale(this.dpr, this.dpr);
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      tctx.globalAlpha = layer.opacity;
      tctx.globalCompositeOperation = layer.blendMode || 'source-over';
      tctx.drawImage(layer.canvas, 0, 0, this.artW, this.artH);
    }
    tctx.setTransform(1,0,0,1,0,0);
    const name = (document.getElementById('doc-name')?.value || 'quart-drawing').replace(/\s+/g, '-');
    tc.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
    QuantumAudio.success();
    this.showToast('PNG exported');
  },

  clearLayer() {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    this.saveUndo();
    layer.ctx.save();
    layer.ctx.setTransform(1,0,0,1,0,0);
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.restore();
    this.updateTransform();
    this.updateLayerThumbnail(this.activeLayerIndex);
  },

  /** Get flattened composite as canvas (for animation frames) */
  flattenToCanvas() {
    const tc = document.createElement('canvas');
    tc.width = this.artW * this.dpr;
    tc.height = this.artH * this.dpr;
    const tctx = tc.getContext('2d');
    tctx.scale(this.dpr, this.dpr);
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      tctx.globalAlpha = layer.opacity;
      tctx.drawImage(layer.canvas, 0, 0, this.artW, this.artH);
    }
    tctx.setTransform(1,0,0,1,0,0);
    return tc;
  }
};

window.Renderer = Renderer;
