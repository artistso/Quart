/* ================================================
   QUART Export Puck
   ================================================ */

const ExportPuckUI = {
  init() {
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        this.export(format);
      });
    });
  },

  export(format) {
    PuckSystem.collapseAll();
    switch(format) {
      case 'png': this.exportPNG(); break;
      case 'gif': this.exportAnimated('gif'); break;
      case 'mp4': this.exportAnimated('mp4'); break;
      case 'webp': this.exportSticker(); break;
      case 'psd': this.exportLayers(); break;
      case 'qpf': this.exportQPF(); break;
      case 'qpf-open': QuartIO.openProject(); break;
    }
  },

  exportPNG() {
    // Make sure we capture the current state first
    Animation.updateCurrentFrame();
    const tc = Renderer.flattenToCanvas();
    const name = (document.getElementById('doc-name')?.value || 'quart').replace(/\s+/g, '-');
    tc.toBlob((blob) => {
      QuartIO.download(blob, `${name}-frame${Animation.currentFrame+1}-${Date.now()}.png`, 'image/png');
    }, 'image/png');
    QuantumAudio.success();
    Renderer.showToast('PNG exported (full 2800×2000)');
  },

  exportSticker() {
    // Sticker: flatten non-bg layers with transparency
    Animation.updateCurrentFrame();
    const tc = document.createElement('canvas');
    tc.width = Renderer.artW * Renderer.dpr;
    tc.height = Renderer.artH * Renderer.dpr;
    const tctx = tc.getContext('2d');
    tctx.scale(Renderer.dpr, Renderer.dpr);
    for (let i = 1; i < Renderer.layers.length; i++) {
      const layer = Renderer.layers[i];
      if (!layer.visible) continue;
      tctx.globalAlpha = layer.opacity;
      tctx.drawImage(layer.canvas, 0, 0, Renderer.artW, Renderer.artH);
    }
    tctx.setTransform(1,0,0,1,0,0);
    const name = (document.getElementById('doc-name')?.value || 'quart').replace(/\s+/g, '-');
    tc.toBlob((blob) => {
      if (!blob) { Renderer.showToast('WebP not supported, falling back to PNG'); return this._stickerFallback(tc, name); }
      QuartIO.download(blob, `${name}-sticker-${Date.now()}.webp`, 'image/webp');
    }, 'image/webp');
    QuantumAudio.success();
    Renderer.showToast('Sticker exported (transparent)');
  },

  async _stickerFallback(tc, name) {
    const blob = await QuartIO.dataURLToBlob(tc.toDataURL('image/png'));
    QuartIO.download(blob, `${name}-sticker-${Date.now()}.png`, 'image/png');
  },

  async exportLayers() {
    Animation.updateCurrentFrame();
    Renderer.showToast('Exporting layers...');
    let exported = 0;
    const delay = 200;
    for (let i = 0; i < Renderer.layers.length; i++) {
      const layer = Renderer.layers[i];
      await new Promise(r => setTimeout(r, i === 0 ? 0 : delay));
      const blob = await QuartIO.dataURLToBlob(layer.canvas.toDataURL('image/png'));
      await QuartIO.download(blob, `quart-${layer.name.replace(/\s+/g,'-')}-${String(i).padStart(2,'0')}.png`, 'image/png');
      exported++;
    }
    QuantumAudio.success();
    Renderer.showToast(`${exported} layers exported`);
  },

  async exportAnimated(type) {
    Animation.updateCurrentFrame();
    if (Animation.frames.length < 2) {
      Renderer.showToast('Add more frames first');
      return;
    }
    Renderer.showToast(`Recording ${Animation.frames.length} frames...`);

    // Try MediaRecorder with webm (universal support)
    const recCanvas = document.createElement('canvas');
    recCanvas.width = Renderer.artW * Renderer.dpr;
    recCanvas.height = Renderer.artH * Renderer.dpr;
    const rctx = recCanvas.getContext('2d');
    rctx.scale(Renderer.dpr, Renderer.dpr);

    const stream = recCanvas.captureStream(Animation.fps);
    const chunks = [];
    const mime = 'video/webm;codecs=vp9';
    let rec;
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
    } catch(e) {
      rec = new MediaRecorder(stream, { videoBitsPerSecond: 8000000 });
    }
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    const name = (document.getElementById('doc-name')?.value || 'quart').replace(/\s+/g, '-');
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType });
      QuartIO.download(blob, `${name}-anim-${Date.now()}.webm`, rec.mimeType || 'video/webm');
      QuantumAudio.success();
      Renderer.showToast('Animation exported');
    };

    rec.start();
    // Draw each frame
    for (let i = 0; i < Animation.frames.length; i++) {
      await new Promise(requestAnimationFrame);
      rctx.clearRect(0, 0, Renderer.artW, Renderer.artH);
      rctx.drawImage(Animation.frames[i].canvas, 0, 0, Renderer.artW, Renderer.artH);
      await new Promise(r => setTimeout(r, 1000 / Animation.fps));
    }
    // Hold last frame briefly
    await new Promise(r => setTimeout(r, 300));
    rec.stop();
  },

  async exportQPF() {
    Animation.updateCurrentFrame();
    const project = {
      app: 'Quart',
      version: '0.2.0',
      quantumEngine: '1.0',
      name: document.getElementById('doc-name')?.value || 'Untitled',
      created: new Date().toISOString(),
      canvas: { width: Renderer.artW, height: Renderer.artH, dpr: Renderer.dpr },
      theme: CopicPalette.currentTheme,
      fps: Animation.fps,
      currentFrame: Animation.currentFrame,
      onionSkin: Renderer.onionSkin,
      brush: {
        tool: Brushes.current,
        size: Brushes.size,
        flow: Brushes.flow,
        opacity: Brushes.opacity
      },
      layers: Renderer.layers.map(l => ({
        name: l.name, visible: l.visible, opacity: l.opacity,
        blendMode: l.blendMode, locked: l.locked,
        data: l.canvas.toDataURL('image/png')
      })),
      frames: Animation.frames.map(f => ({
        keyframe: f.keyframe, label: f.label,
        data: f.canvas.toDataURL('image/png')
      }))
    };
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    await QuartIO.download(blob, `${project.name.replace(/\s+/g,'-')}.qpf`, 'application/json');
    QuantumAudio.success();
    Renderer.showToast('Quart Project saved');
  }
};

window.ExportPuckUI = ExportPuckUI;
