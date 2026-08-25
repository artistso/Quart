/* ================================================
   QUART Layer Puck (Orbits)
   Layer list with thumbnails · add/delete/duplicate
   ================================================ */

const LayerPuckUI = {
  init() {
    document.getElementById('add-layer').addEventListener('click', () => {
      const n = Renderer.layers.length;
      // Name layers based on how many non-bg layers
      const drawLayers = Renderer.layers.filter((_, i) => !Renderer.layers[i].locked).length;
      Renderer.addLayer(`Layer ${drawLayers + 1}`);
      QuantumAudio.toolSelect();
      Renderer.showToast('Orbit added');
    });
    document.getElementById('delete-layer').addEventListener('click', () => {
      if (Renderer.layers.length <= 1) return;
      if (Renderer.layers[Renderer.activeLayerIndex].locked) {
        Renderer.showToast('Cannot delete background');
        return;
      }
      Renderer.deleteLayer(Renderer.activeLayerIndex);
      QuantumAudio.undo();
      Renderer.showToast('Orbit collapsed');
    });
    document.getElementById('duplicate-layer').addEventListener('click', () => {
      Renderer.duplicateLayer(Renderer.activeLayerIndex);
      QuantumAudio.toolSelect();
      Renderer.showToast('Orbit duplicated');
    });
    document.getElementById('merge-down').addEventListener('click', () => {
      if (Renderer.activeLayerIndex <= 0) return;
      this.mergeDown();
      Renderer.showToast('Orbits entangled');
    });
  },

  mergeDown() {
    const idx = Renderer.activeLayerIndex;
    const upper = Renderer.layers[idx];
    const lower = Renderer.layers[idx - 1];
    if (lower.locked) {
      Renderer.showToast('Cannot merge onto background');
      return;
    }
    Renderer.saveUndo();
    // Draw upper onto lower
    lower.ctx.save();
    lower.ctx.setTransform(1,0,0,1,0,0);
    lower.ctx.globalAlpha = upper.opacity;
    lower.ctx.globalCompositeOperation = upper.blendMode;
    lower.ctx.drawImage(upper.canvas, 0, 0);
    lower.ctx.restore();
    // Remove upper
    Renderer.layers.splice(idx, 1);
    Renderer.activeLayerIndex = idx - 1;
    Renderer.updateLayerUI();
    Renderer.render();
    QuantumAudio.undo();
  }
};

window.LayerPuckUI = LayerPuckUI;
