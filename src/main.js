/* ================================================
   QUART — Quantum Drawing Engine
   Main entry point · initializes all subsystems
   ================================================ */

const Quart = {
  init() {
    console.log('%c◈ QUART', 'font-size:24px; font-weight:bold; color:#7c5cff; text-shadow:0 0 10px #7c5cff;');
    console.log('%cQuantum Drawing Engine v0.1 — Tab S10+ Edition', 'color:#ff3366; font-size:11px;');
    console.log('%c"Everything is a superposition until observed."', 'color:#00e5ff; font-style:italic;');

    // Initialize quantum field background
    QuantumField.init();

    // Apply default theme (entangles palette)
    CopicPalette.applyTheme('void');

    // Renderer (canvas + layers)
    Renderer.init();

    // Animation / timeline
    Animation.init();

    // UI Pucks
    PuckSystem.init();
    ToolPuckUI.init();
    PalettePuck.init();
    LayerPuckUI.init();
    ExportPuckUI.init();
    TimelinePuckUI.init();
    CentralOrb.init();

    // Top bar buttons
    document.getElementById('undo-btn').addEventListener('click', () => Renderer.undo());
    document.getElementById('redo-btn').addEventListener('click', () => Renderer.redo());
    document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());

    // Theme presets
    document.querySelectorAll('.theme-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.setTheme(theme);
        document.querySelectorAll('.theme-preset').forEach(b => b.classList.toggle('active', b === btn));
        QuantumAudio.colorShift();
      });
    });

    // Quantum controls
    document.getElementById('quantum-jitter').addEventListener('change', (e) => {
      Brushes.jitter = e.target.checked;
    });
    document.getElementById('particle-trail').addEventListener('change', (e) => {
      Brushes.particleTrails = e.target.checked;
    });
    document.getElementById('pressure-size').addEventListener('change', (e) => {
      Brushes.pressureSize = e.target.checked;
    });
    document.getElementById('pressure-opacity').addEventListener('change', (e) => {
      Brushes.pressureOpacity = e.target.checked;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, [contenteditable]')) return;
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) Renderer.redo(); else Renderer.undo();
      }
      if (e.key === ' ') { e.preventDefault(); Animation.playing ? Animation.stop() : Animation.play(); }
      if (e.key === '[') { this.cycleBrush(-1); }
      if (e.key === ']') { this.cycleBrush(1); }
      if (e.key === 'b') { ToolPuckUI.selectTool('quantum-brush'); }
      if (e.key === 'p') { ToolPuckUI.selectTool('quantum-pen'); }
      if (e.key === 'e') { ToolPuckUI.selectTool('eraser'); }
      if (e.key === 'f') { ToolPuckUI.selectTool('fill'); }
      if (e.key === 'n') { Animation.toggleOnion(); }
      if (e.key === 'Escape') { PuckSystem.collapseAll(); }
    });

    // Hide gesture hint after a few seconds
    setTimeout(() => {
      const hint = document.getElementById('gesture-hint');
      if (hint) hint.classList.add('hidden');
    }, 6000);

    // Initial render cycle
    this.frameLoop();

    // Welcome toast
    setTimeout(() => {
      Renderer.showToast('Welcome to Quart — tap the orb to begin');
    }, 800);
  },

  setTheme(themeName) {
    CopicPalette.applyTheme(themeName);
    Renderer.setTheme(themeName);
    PalettePuck.refreshPalette();
    const t = CopicPalette.themes[themeName];
    document.getElementById('active-color-swatch').style.background = `linear-gradient(135deg, ${t.accent}, ${t.accent2})`;
    Renderer.showToast(`Theme: ${t.name}`);
  },

  cycleBrush(dir) {
    const tools = Object.keys(Brushes.settings);
    const idx = tools.indexOf(Brushes.current);
    const next = tools[(idx + dir + tools.length) % tools.length];
    ToolPuckUI.selectTool(next);
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  },

  /** Main render loop for animation and particle updates */
  frameLoop() {
    // Update brush particles even if not drawing (for residual trails)
    const layer = Renderer.getActiveLayer();
    if (layer) {
      Brushes.updateParticles(layer.ctx);
    }
    requestAnimationFrame(() => this.frameLoop());
  }
};

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Quart.init());
} else {
  Quart.init();
}

window.Quart = Quart;
