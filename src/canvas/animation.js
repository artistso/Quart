/* ================================================
   QUART Animation / Timeline System
   Circular timeline puck · frame-based animation
   Onion skinning · keyframe tracks · playback
   Inspired by Procreate Dreams / ToonSquid
   ================================================ */

const Animation = {
  frames: [],
  currentFrame: 0,
  fps: 12,
  playing: false,
  playInterval: null,
  timelineCanvas: null,
  timelineCtx: null,
  animRAF: null,

  init() {
    this.timelineCanvas = document.getElementById('timeline-canvas');
    this.timelineCtx = this.timelineCanvas.getContext('2d');

    // Initialize with one frame
    this.addFrame(true);

    // Setup timeline drawing
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.drawTimeline();

    // Controls
    document.querySelectorAll('.tl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleAction(action);
      });
    });

    document.getElementById('fps-display').addEventListener('click', () => {
      const fpsOptions = [6, 8, 12, 15, 24, 30];
      const idx = fpsOptions.indexOf(this.fps);
      this.fps = fpsOptions[(idx + 1) % fpsOptions.length];
      document.getElementById('fps-display').textContent = this.fps + 'fps';
      if (this.playing) this.stop(), this.play();
      QuantumAudio.tick();
    });

    // Update frame counter
    this.updateUI();
  },

  resize() {
    const size = 500;
    const dpr = window.devicePixelRatio || 1;
    this.timelineCanvas.width = size * dpr;
    this.timelineCanvas.height = size * dpr;
    this.timelineCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawTimeline();
  },

  /** Add a new frame - saves current layer state as a frame */
  addFrame(initial = false) {
    // Save current main canvas composite as frame data
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = Renderer.cssW * Renderer.dpr;
    frameCanvas.height = Renderer.cssH * Renderer.dpr;
    const fctx = frameCanvas.getContext('2d');
    // Composite visible layers
    for (const layer of Renderer.layers) {
      if (!layer.visible) continue;
      fctx.globalAlpha = layer.opacity;
      fctx.drawImage(layer.canvas, 0, 0);
    }
    this.frames.push({
      canvas: frameCanvas,
      keyframe: initial,
      label: this.frames.length + 1
    });
    if (!initial) {
      this.currentFrame = this.frames.length - 1;
    }
    this.updateUI();
    this.drawTimeline();
  },

  /** Duplicate current frame */
  duplicateFrame() {
    const src = this.frames[this.currentFrame];
    if (!src) return;
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = src.canvas.width;
    frameCanvas.height = src.canvas.height;
    frameCanvas.getContext('2d').drawImage(src.canvas, 0, 0);
    const newFrame = {
      canvas: frameCanvas,
      keyframe: false,
      label: this.frames.length + 1
    };
    this.frames.splice(this.currentFrame + 1, 0, newFrame);
    this.currentFrame++;
    this.gotoFrame(this.currentFrame);
    this.updateUI();
    this.drawTimeline();
  },

  gotoFrame(idx) {
    if (idx < 0 || idx >= this.frames.length) return;
    this.currentFrame = idx;
    this.updateUI();
    this.drawTimeline();
    // Load frame into layers? For simplicity show on preview canvas
    this.showFrame(idx);
  },

  showFrame(idx) {
    // Draw frame on main canvas as preview (onion skin support)
    if (!this.frames[idx]) return;
    const frame = this.frames[idx];

    // Clear active drawing layer non-background? We don't want to destroy current work
    // Instead, onion skin draws on overlay
    this.drawOnionSkin();
  },

  drawOnionSkin() {
    const ctx = Renderer.overlayCtx;
    ctx.clearRect(0, 0, Renderer.cssW, Renderer.cssH);
    if (!Renderer.onionSkin) return;

    // Previous frame
    if (this.currentFrame > 0) {
      const prev = this.frames[this.currentFrame - 1];
      ctx.globalAlpha = Renderer.onionOpacity * 0.5;
      ctx.drawImage(prev.canvas, 0, 0, Renderer.cssW, Renderer.cssH);
    }
    // Next frame
    if (this.currentFrame < this.frames.length - 1) {
      const next = this.frames[this.currentFrame + 1];
      ctx.globalAlpha = Renderer.onionOpacity * 0.3;
      ctx.globalCompositeOperation = 'difference';
      ctx.drawImage(next.canvas, 0, 0, Renderer.cssW, Renderer.cssH);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  },

  nextFrame() {
    if (this.currentFrame < this.frames.length - 1) {
      this.gotoFrame(this.currentFrame + 1);
    } else {
      // Auto-add frame at end
      this.addFrame();
    }
    QuantumAudio.tick();
  },

  prevFrame() {
    if (this.currentFrame > 0) {
      this.gotoFrame(this.currentFrame - 1);
      QuantumAudio.tick();
    }
  },

  play() {
    this.playing = true;
    const playBtn = document.querySelector('.tl-btn.tl-play');
    playBtn.querySelector('.play-icon').style.display = 'none';
    playBtn.querySelector('.pause-icon').style.display = 'block';
    const interval = 1000 / this.fps;
    this.playInterval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.gotoFrame(this.currentFrame);
    }, interval);
  },

  stop() {
    this.playing = false;
    const playBtn = document.querySelector('.tl-btn.tl-play');
    if (playBtn) {
      playBtn.querySelector('.play-icon').style.display = 'block';
      playBtn.querySelector('.pause-icon').style.display = 'none';
    }
    if (this.playInterval) clearInterval(this.playInterval);
  },

  toggleOnion() {
    Renderer.onionSkin = !Renderer.onionSkin;
    const indicator = document.getElementById('onion-indicator');
    if (indicator) {
      indicator.classList.toggle('active', Renderer.onionSkin);
    } else {
      // Create indicator
      const ind = document.createElement('div');
      ind.id = 'onion-indicator';
      ind.className = 'onion-indicator active';
      ind.textContent = '◈ ONION';
      document.body.appendChild(ind);
    }
    if (!Renderer.onionSkin) {
      Renderer.overlayCtx.clearRect(0, 0, Renderer.cssW, Renderer.cssH);
    } else {
      this.drawOnionSkin();
    }
    this.showToast(Renderer.onionSkin ? 'Onion skin enabled' : 'Onion skin disabled');
  },

  handleAction(action) {
    switch(action) {
      case 'play':
        if (this.playing) this.stop(); else this.play();
        break;
      case 'next': this.nextFrame(); break;
      case 'prev': this.prevFrame(); break;
      case 'add': this.duplicateFrame(); this.showToast('Frame added'); break;
      case 'onion': this.toggleOnion(); break;
    }
  },

  updateUI() {
    document.getElementById('current-frame').textContent = this.currentFrame + 1;
    document.getElementById('total-frames').textContent = this.frames.length;
  },

  /** Draw circular timeline */
  drawTimeline() {
    const ctx = this.timelineCtx;
    const w = 500, h = 500;
    const cx = w/2, cy = h/2;
    ctx.clearRect(0, 0, w, h);

    const frameCount = this.frames.length;
    const radius = 190;
    const innerRadius = 160;

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.stroke();

    // Tick marks for seconds
    const secInterval = this.fps;
    for (let s = 0; s <= Math.ceil(frameCount / secInterval); s++) {
      const f = s * secInterval;
      if (f > frameCount) break;
      const angle = (f / Math.max(frameCount, 1)) * Math.PI * 2 - Math.PI/2;
      const x1 = cx + Math.cos(angle) * (radius - 15);
      const y1 = cy + Math.sin(angle) * (radius - 15);
      const x2 = cx + Math.cos(angle) * (radius + 5);
      const y2 = cy + Math.sin(angle) * (radius + 5);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Second label
      const lx = cx + Math.cos(angle) * (radius + 20);
      const ly = cy + Math.sin(angle) * (radius + 20);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s + 's', lx, ly);
    }

    // Frame dots
    for (let i = 0; i < frameCount; i++) {
      const angle = (i / frameCount) * Math.PI * 2 - Math.PI/2;
      const isCurrent = i === this.currentFrame;
      const isKey = this.frames[i].keyframe;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      // Glow for current
      if (isCurrent) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 20);
        glow.addColorStop(0, 'rgba(124,92,255,0.6)');
        glow.addColorStop(1, 'rgba(124,92,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Frame dot
      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 7 : (isKey ? 5 : 3), 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? '#7c5cff' : (isKey ? '#ff3366' : 'rgba(255,255,255,0.4)');
      ctx.fill();

      // Thumbnail preview arc (drawn as arc segment)
      const segStart = angle - (Math.PI * 2 / frameCount) * 0.45;
      const segEnd = angle + (Math.PI * 2 / frameCount) * 0.45;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 12, segStart, segEnd);
      ctx.strokeStyle = isCurrent ? 'rgba(124,92,255,0.5)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = isCurrent ? 6 : 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Click handler data
      ctx.canvas.dataset.lastFrame = frameCount;
    }

    // Playhead line
    const playAngle = (this.currentFrame / frameCount) * Math.PI * 2 - Math.PI/2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(playAngle) * (innerRadius - 30), cy + Math.sin(playAngle) * (innerRadius - 30));
    ctx.lineTo(cx + Math.cos(playAngle) * (radius + 10), cy + Math.sin(playAngle) * (radius + 10));
    ctx.strokeStyle = '#7c5cff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#7c5cff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  showToast(msg) {
    Renderer.showToast(msg);
  }
};

window.Animation = Animation;
