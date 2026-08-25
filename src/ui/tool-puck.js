/* ================================================
   QUART Tool Puck (Forge)
   Radial tool menu · brush property sliders
   ================================================ */

const ToolPuckUI = {
  puck: null,

  init() {
    this.puck = document.getElementById('tools-puck');

    // Tool selection
    document.querySelectorAll('.tool-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const tool = item.dataset.tool;
        this.selectTool(tool);
      });
    });

    // Brush size slider
    const sizeSlider = document.getElementById('brush-size');
    sizeSlider.addEventListener('input', () => {
      Brushes.size = parseFloat(sizeSlider.value);
      document.getElementById('size-val').textContent = Math.round(Brushes.size);
    });

    const flowSlider = document.getElementById('brush-flow');
    flowSlider.addEventListener('input', () => {
      Brushes.flow = parseFloat(flowSlider.value);
      document.getElementById('flow-val').textContent = Math.round(Brushes.flow);
    });

    const opacitySlider = document.getElementById('brush-opacity');
    opacitySlider.addEventListener('input', () => {
      Brushes.opacity = parseFloat(opacitySlider.value);
      document.getElementById('opacity-val').textContent = Math.round(Brushes.opacity);
    });

    // Initialize with default tool
    this.selectTool('quantum-pen');
  },

  selectTool(tool) {
    Brushes.setTool(tool);
    document.querySelectorAll('.tool-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tool === tool);
    });
    QuantumAudio.toolSelect();
    Renderer.showToast(`Tool: ${this.getToolName(tool)}`);
  },

  getToolName(tool) {
    const names = {
      'quantum-pen': 'Quantum Pen',
      'quantum-brush': 'Wave Brush',
      'airbrush': 'Probability Spray',
      'pencil': 'Graphite Pencil',
      'eraser': 'Quantum Vacuum',
      'smudge': 'Wavefunction Smudge',
      'fill': 'Entangled Fill',
      'select': 'Observer Select'
    };
    return names[tool] || tool;
  }
};

window.ToolPuckUI = ToolPuckUI;
