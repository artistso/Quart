/* ==================================================
   QUART Platform I/O (v0.2)
   - Unified downloads: web anchor / Android JS bridge
   - .QPF project import (file picker + drag & drop)
   ================================================== */

const QuartIO = {

  _fileInput: null,

  init() {
    // Hidden file input for "Open Project"
    this._fileInput = document.createElement('input');
    this._fileInput.type = 'file';
    this._fileInput.accept = '.qpf,.json,application/json';
    this._fileInput.style.display = 'none';
    this._fileInput.addEventListener('change', () => {
      const f = this._fileInput.files && this._fileInput.files[0];
      if (f) this.loadFile(f);
      this._fileInput.value = '';
    });
    document.body.appendChild(this._fileInput);

    // Drag & drop a .qpf anywhere
    window.addEventListener('dragover', (e) => { e.preventDefault(); });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) this.loadFile(f);
    });
  },

  /** True inside the Quart Android app (JS bridge injected) */
  isAndroid() {
    return !!(window.QuartAndroid && typeof window.QuartAndroid.beginFile === 'function');
  },

  /** Unified blob download — works on web and in the Android shell */
  async download(blob, filename, mime) {
    if (!blob) return;
    if (this.isAndroid()) {
      try {
        await this._androidDownload(blob, filename, mime || blob.type || 'application/octet-stream');
        return;
      } catch (err) {
        console.warn('QuartIO: bridge download failed, falling back to anchor', err);
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },

  /** dataURL → blob (used by legacy export paths) */
  async dataURLToBlob(dataURL) {
    try {
      return await (await fetch(dataURL)).blob();
    } catch (e) {
      // Manual fallback
      const [head, body] = dataURL.split(',');
      const mime = (head.match(/data:(.*?)(;|$)/) || [])[1] || 'image/png';
      const bin = atob(body);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return new Blob([buf], { type: mime });
    }
  },

  /** Stream a blob to the Android bridge in base64 chunks (Binder-safe) */
  async _androidDownload(blob, filename, mime) {
    const CHUNK = 384 * 1024; // stay well under the 1 MB Binder transaction limit
    const total = Math.max(1, Math.ceil(blob.size / CHUNK));
    window.QuartAndroid.beginFile(filename, mime, total);
    for (let i = 0; i < total; i++) {
      const buf = new Uint8Array(await blob.slice(i * CHUNK, (i + 1) * CHUNK).arrayBuffer());
      // Build binary string in safe slices (avoid spread stack overflow)
      let bin = '';
      const STEP = 0x8000;
      for (let j = 0; j < buf.length; j += STEP) {
        bin += String.fromCharCode.apply(null, buf.subarray(j, j + STEP));
      }
      window.QuartAndroid.chunk(btoa(bin));
      // Yield to the UI thread between chunks
      await new Promise(r => setTimeout(r, 0));
    }
    window.QuartAndroid.endFile();
  },

  /** Open the "Open Project" picker */
  openProject() {
    PuckSystem.collapseAll();
    this._fileInput && this._fileInput.click();
  },

  /** Read + validate a picked/dropped file, then restore the project */
  loadFile(file) {
    const name = file.name || '';
    if (!/\.(qpf|json)$/i.test(name)) {
      Renderer.showToast('Not a Quart project (.qpf)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let project;
      try { project = JSON.parse(reader.result); }
      catch (e) { Renderer.showToast('Corrupted project file'); return; }
      this.importQPF(project, name.replace(/\.(qpf|json)$/i, ''));
    };
    reader.onerror = () => Renderer.showToast('Could not read file');
    reader.readAsText(file);
  },

  /** Restore layers, frames, theme, brush + doc state from a QPF object */
  async importQPF(project, filename) {
    if (!project || project.app !== 'Quart' || !Array.isArray(project.layers)) {
      Renderer.showToast('Not a Quart project (.qpf)');
      return;
    }

    Renderer.showToast('Decollapsing wavefunction…');

    const loadImg = (dataURL) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = dataURL;
    });

    // -- meta ------------------------------------------------------------
    const docName = document.getElementById('doc-name');
    if (docName) docName.value = project.name || filename || 'Untitled Quantum Frame';

    if (project.theme && CopicPalette.themes[project.theme]) {
      Quart.setTheme(project.theme);
      document.querySelectorAll('.theme-preset').forEach(b =>
        b.classList.toggle('active', b.dataset.theme === project.theme));
    }

    // -- brush -------------------------------------------------------------
    if (project.brush) {
      if (typeof project.brush.size === 'number') {
        Brushes.size = project.brush.size;
        const el = document.getElementById('brush-size');
        if (el) { el.value = Brushes.size; }
        const val = document.getElementById('size-val');
        if (val) val.textContent = Brushes.size;
      }
      if (typeof project.brush.flow === 'number') {
        Brushes.flow = project.brush.flow;
        const el = document.getElementById('brush-flow');
        if (el) el.value = Brushes.flow;
        const val = document.getElementById('flow-val');
        if (val) val.textContent = Brushes.flow;
      }
      if (typeof project.brush.opacity === 'number') {
        Brushes.opacity = project.brush.opacity;
        const el = document.getElementById('brush-opacity');
        if (el) el.value = Brushes.opacity;
        const val = document.getElementById('opacity-val');
        if (val) val.textContent = Brushes.opacity;
      }
      if (project.brush.tool && typeof ToolPuckUI.selectTool === 'function') {
        ToolPuckUI.selectTool(project.brush.tool);
      }
    }

    // -- layers ------------------------------------------------------------
    const dpr = Renderer.dpr;
    const physW = Renderer.artW * dpr;
    const physH = Renderer.artH * dpr;
    const newLayers = [];
    for (let i = 0; i < project.layers.length; i++) {
      const sl = project.layers[i];
      const canvas = document.createElement('canvas');
      canvas.width = physW;
      canvas.height = physH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (sl.data) {
        try {
          const img = await loadImg(sl.data);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } catch (e) { console.warn('QuartIO: layer image failed', i); }
      }
      newLayers.push({
        name: sl.name || `Layer ${i + 1}`,
        canvas, ctx,
        visible: sl.visible !== false,
        opacity: typeof sl.opacity === 'number' ? sl.opacity : 1,
        blendMode: sl.blendMode || 'source-over',
        locked: sl.locked === true || i === 0
      });
    }

    // -- frames ------------------------------------------------------------
    const newFrames = [];
    if (Array.isArray(project.frames) && project.frames.length) {
      for (let i = 0; i < project.frames.length; i++) {
        const sf = project.frames[i];
        const canvas = document.createElement('canvas');
        canvas.width = physW;
        canvas.height = physH;
        const ctx = canvas.getContext('2d');
        if (sf.data) {
          try {
            const img = await loadImg(sf.data);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } catch (e) { console.warn('QuartIO: frame image failed', i); }
        }
        newFrames.push({
          id: Animation._frameIdCounter++,
          canvas,
          keyframe: sf.keyframe === true,
          label: sf.label || (i + 1)
        });
      }
    }

    // -- commit atomically ---------------------------------------------------
    Renderer.layers = newLayers;
    Renderer.activeLayerIndex = 0;
    Renderer.undoStack = [];
    Renderer.redoStack = [];

    Animation.frames = newFrames;
    Animation.currentFrame = Math.min(
      typeof project.currentFrame === 'number' ? project.currentFrame : 0,
      Math.max(0, newFrames.length - 1));
    if (typeof project.fps === 'number' && project.fps > 0) {
      Animation.fps = project.fps;
      const fpsDisplay = document.getElementById('fps-display');
      if (fpsDisplay) fpsDisplay.textContent = Animation.fps + 'fps';
    }
    if (typeof project.onionSkin === 'boolean') Renderer.onionSkin = project.onionSkin;

    Renderer.fitToScreen();
    Renderer.updateLayerUI();
    Renderer.updateTransform();
    Animation.updateUI();
    Animation.drawTimeline();

    QuantumAudio.success();
    Renderer.showToast(`Project observed: ${newLayers.length} orbits · ${newFrames.length} frames`);
  }
};

window.QuartIO = QuartIO;
