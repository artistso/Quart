/* ================================================
   QUART Animation / Timeline System
   Circular expanding timeline puck
   Frame-based animation · onion skinning
   ================================================ */

const Animation = {
  frames: [],
  currentFrame: 0,
  fps: 12,
  playing: false,
  playInterval: null,
  timelineCanvas: null,
  timelineCtx: null,
  _frameIdCounter: 0,

  init() {
    this.timelineCanvas = document.getElementById('timeline-canvas');
    this.timelineCtx = this.timelineCanvas.getContext('2d');

    // Initialize first frame from current canvas
    this.captureFrame(true);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.drawTimeline();

    document.querySelectorAll('.tl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleAction(action);
      });
    });

    const fpsDisplay = document.getElementById('fps-display');
    fpsDisplay.addEventListener('click', () => {
      const fpsOptions = [4, 6, 8, 12, 15, 24, 30];
      const idx = fpsOptions.indexOf(this.fps);
      this.fps = fpsOptions[(idx + 1) % fpsOptions.length];
      fpsDisplay.textContent = this.fps + 'fps';
      if (this.playing) { this.stop(); this.play(); }
      QuantumAudio.tick();
    });

    this.updateUI();
  },

  resize() {
    const size = 500;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.timelineCanvas.width = size * dpr;
    this.timelineCanvas.height = size * dpr;
    this.timelineCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawTimeline();
  },

  /** Save current canvas composite as a frame */
  captureFrame(isFirst = false) {
    const flat = Renderer.flattenToCanvas();
    this.frames.push({
      id: this._frameIdCounter++,
      canvas: flat,
      keyframe: isFirst,
      label: this.frames.length + 1
    });
    if (!isFirst) {
      this.currentFrame = this.frames.length - 1;
    }
    this.updateUI();
    this.drawTimeline();
  },

  /** Save current drawing back into the current frame's canvas */
  updateCurrentFrame() {
    if (!this.frames[this.currentFrame]) return;
    this.frames[this.currentFrame].canvas = Renderer.flattenToCanvas();
  },

  gotoFrame(idx) {
    if (idx < 0 || idx >= this.frames.length) return;
    // Save current frame first
    this.updateCurrentFrame();
    this.currentFrame = idx;
    // Load frame into layers? For now onion skin draws on overlay.
    // In full mode, we'd restore layers from saved state. For v0.1, onion is visual only.
    this.updateUI();
    this.drawTimeline();
    Renderer.updateTransform();
  },

  addBlankFrame() {
    // Save current
    this.updateCurrentFrame();
    // Create blank frame (just bg layer)
    const tc = document.createElement('canvas');
    tc.width = Renderer.artW * Renderer.dpr;
    tc.height = Renderer.artH * Renderer.dpr;
    const tctx = tc.getContext('2d');
    tctx.scale(Renderer.dpr, Renderer.dpr);
    if (Renderer.layers[0]) {
      tctx.drawImage(Renderer.layers[0].canvas, 0, 0, Renderer.artW, Renderer.artH);
    }
    tctx.setTransform(1,0,0,1,0,0);
    this.frames.push({
      id: this._frameIdCounter++,
      canvas: tc,
      keyframe: false,
      label: this.frames.length + 1
    });
    this.currentFrame = this.frames.length - 1;
    // Also clear current drawing layer
    if (Renderer.getActiveLayer() && !Renderer.getActiveLayer().locked) {
      const layer = Renderer.getActiveLayer();
      layer.ctx.save();
      layer.ctx.setTransform(1,0,0,1,0,0);
      layer.ctx.clearRect(0,0,layer.canvas.width, layer.canvas.height);
      // Re-fill bg only if it's the bg layer
      layer.ctx.restore();
    }
    this.updateUI();
    this.drawTimeline();
    Renderer.updateTransform();
  },

  duplicateFrame() {
    this.updateCurrentFrame();
    const src = this.frames[this.currentFrame];
    if (!src) return;
    const tc = document.createElement('canvas');
    tc.width = src.canvas.width;
    tc.height = src.canvas.height;
    tc.getContext('2d').drawImage(src.canvas, 0, 0);
    this.frames.splice(this.currentFrame + 1, 0, {
      id: this._frameIdCounter++,
      canvas: tc,
      keyframe: false,
      label: this.frames.length + 1
    });
    this.currentFrame++;
    this.updateUI();
    this.drawTimeline();
  },

  nextFrame() {
    if (this.currentFrame < this.frames.length - 1) {
      this.gotoFrame(this.currentFrame + 1);
    } else {
      this.addBlankFrame();
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
    if (playBtn) {
      playBtn.querySelector('.play-icon').style.display = 'none';
      playBtn.querySelector('.pause-icon').style.display = 'block';
    }
    this.playInterval = setInterval(() => {
      this.updateCurrentFrame();
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      // Draw frame to overlay for playback preview
      this.showPlaybackFrame();
      this.updateUI();
      this.drawTimeline();
    }, 1000 / this.fps);
  },

  stop() {
    this.playing = false;
    const playBtn = document.querySelector('.tl-btn.tl-play');
    if (playBtn) {
      playBtn.querySelector('.play-icon').style.display = 'block';
      playBtn.querySelector('.pause-icon').style.display = 'none';
    }
    if (this.playInterval) clearInterval(this.playInterval);
    // Clear playback overlay
    Renderer.overlayCtx.save();
    Renderer.overlayCtx.setTransform(Renderer.dpr,0,0,Renderer.dpr,0,0);
    Renderer.overlayCtx.clearRect(0,0,Renderer.cssW,Renderer.cssH);
    Renderer.overlayCtx.restore();
    Renderer.updateTransform();
  },

  showPlaybackFrame() {
    const frame = this.frames[this.currentFrame];
    if (!frame) return;
    const ctx = Renderer.mainCtx;
    ctx.save();
    ctx.setTransform(Renderer.dpr,0,0,Renderer.dpr,0,0);
    ctx.clearRect(0,0,Renderer.cssW,Renderer.cssH);
    ctx.translate(Renderer.panX, Renderer.panY);
    ctx.scale(Renderer.zoom, Renderer.zoom);
    ctx.drawImage(frame.canvas, 0, 0, Renderer.artW, Renderer.artH);
    ctx.restore();
  },

  toggleOnion() {
    Renderer.onionSkin = !Renderer.onionSkin;
    let ind = document.getElementById('onion-indicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.id = 'onion-indicator';
      ind.className = 'onion-indicator';
      ind.textContent = '◈ ONION';
      document.body.appendChild(ind);
    }
    ind.classList.toggle('active', Renderer.onionSkin);
    Renderer.currentFrame = this.currentFrame;
    if (!Renderer.onionSkin) {
      Renderer.overlayCtx.save();
      Renderer.overlayCtx.setTransform(Renderer.dpr,0,0,Renderer.dpr,0,0);
      Renderer.overlayCtx.clearRect(0,0,Renderer.cssW,Renderer.cssH);
      Renderer.overlayCtx.restore();
    }
    Renderer.updateTransform();
    Renderer.showToast(Renderer.onionSkin ? 'Onion skin enabled' : 'Onion skin disabled');
  },

  handleAction(action) {
    switch(action) {
      case 'play': if (this.playing) this.stop(); else this.play(); break;
      case 'next': this.nextFrame(); break;
      case 'prev': this.prevFrame(); break;
      case 'add': this.duplicateFrame(); Renderer.showToast('Frame duplicated'); break;
      case 'onion': this.toggleOnion(); break;
    }
  },

  updateUI() {
    document.getElementById('current-frame').textContent = this.currentFrame + 1;
    document.getElementById('total-frames').textContent = this.frames.length;
  },

  drawTimeline() {
    const ctx = this.timelineCtx;
    const w = 500, h = 500;
    const cx = w/2, cy = h/2;
    ctx.clearRect(0,0,w,h);

    const frameCount = this.frames.length;
    const radius = 200;
    const innerR = 160;

    // Background ring glow
    const ringGrad = ctx.createRadialGradient(cx,cy,innerR-20, cx,cy,radius+20);
    ringGrad.addColorStop(0, 'rgba(124,92,255,0)');
    ringGrad.addColorStop(0.8, 'rgba(124,92,255,0.08)');
    ringGrad.addColorStop(1, 'rgba(124,92,255,0)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath(); ctx.arc(cx,cy,radius+20,0,Math.PI*2); ctx.fill();

    // Outer ring
    ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,innerR,0,Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();

    // Second markers
    const secInterval = this.fps;
    for (let s = 0; s <= Math.ceil(frameCount/secInterval); s++) {
      const f = s * secInterval;
      if (f > frameCount) break;
      const angle = (f/frameCount) * Math.PI*2 - Math.PI/2;
      const x1 = cx + Math.cos(angle)*(innerR);
      const y1 = cy + Math.sin(angle)*(innerR);
      const x2 = cx + Math.cos(angle)*(radius+8);
      const y2 = cy + Math.sin(angle)*(radius+8);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      ctx.strokeStyle = f === 0 ? 'rgba(124,92,255,0.6)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = f === 0 ? 2 : 1;
      ctx.stroke();
      if (f > 0) {
        const lx = cx + Math.cos(angle)*(radius+22);
        const ly = cy + Math.sin(angle)*(radius+22);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s+'s', lx, ly);
      }
    }

    // Frame segments & dots
    for (let i = 0; i < frameCount; i++) {
      const a1 = (i/frameCount) * Math.PI*2 - Math.PI/2;
      const a2 = ((i+1)/frameCount) * Math.PI*2 - Math.PI/2;
      const midA = (a1+a2)/2;
      const isCurrent = i === this.currentFrame;
      const isKey = this.frames[i].keyframe;

      // Segment arc
      ctx.beginPath(); ctx.arc(cx,cy,radius-14, a1, a2);
      ctx.strokeStyle = isCurrent ? '#7c5cff' : (isKey ? 'rgba(255,51,102,0.5)' : 'rgba(255,255,255,0.15)');
      ctx.lineWidth = isCurrent ? 8 : 4;
      ctx.lineCap = 'butt'; ctx.stroke();

      // Dot
      const dx = cx + Math.cos(midA)*radius;
      const dy = cy + Math.sin(midA)*radius;
      if (isCurrent) {
        const glow = ctx.createRadialGradient(dx,dy,0,dx,dy,20);
        glow.addColorStop(0,'rgba(124,92,255,0.7)');
        glow.addColorStop(1,'rgba(124,92,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(dx,dy,20,0,Math.PI*2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(dx,dy,isCurrent?7:(isKey?5:3),0,Math.PI*2);
      ctx.fillStyle = isCurrent ? '#7c5cff' : (isKey ? '#ff3366' : 'rgba(255,255,255,0.4)');
      ctx.fill();

      // Mini thumbnail for each frame (small)
      const thumbR = radius - 30;
      const tx = cx + Math.cos(midA)*thumbR;
      const ty = cy + Math.sin(midA)*thumbR;
      if (frameCount <= 60) {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(midA + Math.PI/2);
        try {
          ctx.drawImage(this.frames[i].canvas, -6, -5, 12, 10);
        } catch(e){}
        ctx.strokeStyle = isCurrent ? 'rgba(124,92,255,0.8)' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-6,-5,12,10);
        ctx.restore();
      }
    }

    // Playhead
    const playA = (this.currentFrame/frameCount)*Math.PI*2 - Math.PI/2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(playA)*(innerR-40), cy + Math.sin(playA)*(innerR-40));
    ctx.lineTo(cx + Math.cos(playA)*(radius+12), cy + Math.sin(playA)*(radius+12));
    ctx.strokeStyle = '#7c5cff';
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.shadowColor = '#7c5cff'; ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  showToast(msg) { Renderer.showToast(msg); }
};

window.Animation = Animation;
