/* ================================================
   QUART Central Quantum Orb
   Tap for quantum jump (randomize everything slightly)
   Double-tap for canvas clear + new drawing
   ================================================ */

const CentralOrb = {
  orb: null,
  tapCount: 0,
  tapTimer: null,

  init() {
    this.orb = document.getElementById('central-orb');
    this.orb.style.pointerEvents = 'all';

    this.orb.addEventListener('click', (e) => {
      this.tapCount++;
      clearTimeout(this.tapTimer);
      if (this.tapCount === 2) {
        this.doubleTap();
        this.tapCount = 0;
      } else {
        this.tapTimer = setTimeout(() => {
          this.singleTap();
          this.tapCount = 0;
        }, 300);
      }
    });
  },

  singleTap() {
    // Quantum jump - randomize brush color with quantum probability
    const newHue = Math.random() * 360;
    PalettePuck.setColor(newHue, 70 + Math.random() * 30, 90 + Math.random() * 10);
    QuantumAudio.quantumJump();

    // Flash effect on orb
    this.orb.style.opacity = '1';
    setTimeout(() => this.orb.style.opacity = '', 800);

    Renderer.showToast('Quantum jump - color shifted');
  },

  doubleTap() {
    // New canvas with quantum transition
    if (confirm('Collapse all wavefunctions and start fresh?')) {
      // Clear non-background layers
      for (let i = Renderer.layers.length - 1; i > 1; i--) {
        Renderer.deleteLayer(i);
      }
      const layer = Renderer.getActiveLayer();
      if (layer && !layer.locked) {
        Renderer.saveUndo();
        layer.ctx.save();
        layer.ctx.setTransform(1,0,0,1,0,0);
        layer.ctx.clearRect(0,0,layer.canvas.width, layer.canvas.height);
        layer.ctx.restore();
      }
      // Reset frames
      Animation.frames = [];
      Animation.addFrame(true);
      Animation.currentFrame = 0;
      Animation.gotoFrame(0);
      Animation.drawTimeline();
      Renderer.render();
      Renderer.updateLayerUI();
      QuantumAudio.quantumJump();
      Renderer.showToast('New quantum state prepared');
    }
  }
};

window.CentralOrb = CentralOrb;
