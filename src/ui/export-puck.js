/* ================================================
   QUART Export Puck
   Handles PNG/PSD/MP4/GIF/WEBP/QPF export
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
      case 'png':
        Renderer.exportPNG();
        break;
      case 'gif':
        this.exportGIF();
        break;
      case 'mp4':
        this.exportMP4();
        break;
      case 'webp':
        this.exportWEBP();
        break;
      case 'psd':
        this.exportPSD();
        break;
      case 'qpf':
        this.exportQPF();
        break;
    }
  },

  exportGIF() {
    // Simple animated GIF export using MediaRecorder on canvas
    Renderer.showToast('Recording GIF loop...');
    const canvas = document.createElement('canvas');
    canvas.width = Renderer.cssW * Renderer.dpr;
    canvas.height = Renderer.cssH * Renderer.dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(Renderer.dpr, Renderer.dpr);

    // Use MediaRecorder
    const stream = canvas.captureStream(Animation.fps);
    let chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: 'image/gif' in window ? 'image/gif' : 'video/webm' });
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quart-animation-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      QuantumAudio.success();
    };
    rec.start();

    // Play animation into canvas
    let frame = 0;
    const drawFrame = () => {
      if (frame >= Animation.frames.length) {
        rec.stop();
        return;
      }
      ctx.clearRect(0,0,Renderer.cssW, Renderer.cssH);
      ctx.drawImage(Animation.frames[frame].canvas, 0, 0, Renderer.cssW, Renderer.cssH);
      frame++;
      setTimeout(drawFrame, 1000 / Animation.fps);
    };
    drawFrame();
  },

  exportMP4() {
    this.exportGIF(); // Reuse same pipeline, marked as MP4 (in full version would use mp4 muxer)
    Renderer.showToast('Exporting as video (webm)...');
  },

  exportWEBP() {
    // Sticker: just current frame as webp with transparency (skip bg layer)
    const tc = document.createElement('canvas');
    tc.width = Renderer.cssW * Renderer.dpr;
    tc.height = Renderer.cssH * Renderer.dpr;
    const tctx = tc.getContext('2d');
    tctx.scale(Renderer.dpr, Renderer.dpr);
    for (let i = 1; i < Renderer.layers.length; i++) {
      const layer = Renderer.layers[i];
      if (!layer.visible) continue;
      tctx.globalAlpha = layer.opacity;
      tctx.drawImage(layer.canvas, 0, 0, Renderer.cssW, Renderer.cssH);
    }
    tc.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quart-sticker-${Date.now()}.webp`;
      a.click();
      URL.revokeObjectURL(url);
      QuantumAudio.success();
      Renderer.showToast('Sticker exported');
    }, 'image/webp');
  },

  exportPSD() {
    // Simplified PSD-like export (JSON of layers + flattened PNG)
    // A full PSD writer is out of scope; export layers as separate PNGs
    Renderer.showToast('Exporting layers...');
    Renderer.layers.forEach((layer, i) => {
      if (layer.locked) return;
      const a = document.createElement('a');
      a.href = layer.canvas.toDataURL('image/png');
      a.download = `quart-${layer.name.replace(/\s+/g, '-')}-${i}.png`;
      setTimeout(() => a.click(), i * 150);
    });
    setTimeout(() => {
      QuantumAudio.success();
      Renderer.showToast(`${Renderer.layers.filter(l => !l.locked).length} layers exported`);
    }, Renderer.layers.length * 150 + 200);
  },

  exportQPF() {
    // Quart Project File — JSON + embedded PNG layers
    const project = {
      app: 'Quart',
      version: '0.1.0',
      name: document.getElementById('doc-name').value || 'Untitled',
      created: new Date().toISOString(),
      canvas: { width: Renderer.cssW * Renderer.dpr, height: Renderer.cssH * Renderer.dpr },
      theme: CopicPalette.currentTheme,
      fps: Animation.fps,
      layers: Renderer.layers.map(l => ({
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        locked: l.locked,
        data: l.locked ? null : l.canvas.toDataURL('image/png')
      })),
      frames: Animation.frames.map(f => ({ keyframe: f.keyframe, label: f.label, data: f.canvas.toDataURL('image/png') }))
    };
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-')}.qpf.json`;
    a.click();
    URL.revokeObjectURL(url);
    QuantumAudio.success();
    Renderer.showToast('Project saved');
  }
};

window.ExportPuckUI = ExportPuckUI;
