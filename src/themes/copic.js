/* ================================================
   QUART Copic Color Palette System
   72 Copic-marker inspired colors that quantum-shift
   when canvas theme changes (entanglement)
   ================================================ */

const CopicPalette = {
  // Base Copic colors (real Copic Sketch marker hex approximations)
  // Organized by color family, like Copic's color system
  baseColors: [
    // Cool Gray / Neutral
    { name: 'Cool Gray 0', hex: '#e8eaec', family: 'gray' },
    { name: 'Cool Gray 2', hex: '#c9ccd1', family: 'gray' },
    { name: 'Cool Gray 4', hex: '#a6acb3', family: 'gray' },
    { name: 'Cool Gray 6', hex: '#838a93', family: 'gray' },
    { name: 'Cool Gray 8', hex: '#616872', family: 'gray' },
    { name: 'Black 100', hex: '#1a1a1f', family: 'gray' },

    // Warm Gray
    { name: 'Warm Gray 1', hex: '#e9e4df', family: 'warmgray' },
    { name: 'Warm Gray 3', hex: '#c9bdb3', family: 'warmgray' },
    { name: 'Warm Gray 5', hex: '#a8988c', family: 'warmgray' },

    // Red / Pink family (R)
    { name: 'Lipstick Red', hex: '#d62338', family: 'red' },
    { name: 'Crimson', hex: '#b31b2a', family: 'red' },
    { name: 'Wine', hex: '#7a1622', family: 'red' },
    { name: 'Coral Pink', hex: '#f47373', family: 'red' },
    { name: 'Pale Pink', hex: '#f9c6c9', family: 'red' },
    { name: 'Blush', hex: '#f7a8a0', family: 'red' },

    // Orange / Yellow family (Y/YR)
    { name: 'Cadmium Orange', hex: '#f17a2e', family: 'orange' },
    { name: 'Apricot', hex: '#f4a261', family: 'orange' },
    { name: 'Deep Orange', hex: '#d85c2a', family: 'orange' },
    { name: 'Canary Yellow', hex: '#fdd835', family: 'yellow' },
    { name: 'Lemon Yellow', hex: '#f0e442', family: 'yellow' },
    { name: 'Golden Yellow', hex: '#e8c028', family: 'yellow' },
    { name: 'Sand', hex: '#e0c995', family: 'yellow' },
    { name: 'Cream', hex: '#f0e6c8', family: 'yellow' },

    // Green family (G/YG/BG)
    { name: 'Forest Green', hex: '#1f7a3a', family: 'green' },
    { name: 'Moss Green', hex: '#5a8a3e', family: 'green' },
    { name: 'Grass Green', hex: '#5ca93a', family: 'green' },
    { name: 'Mint Green', hex: '#8dd69c', family: 'green' },
    { name: 'Pale Green', hex: '#bde0a3', family: 'green' },
    { name: 'Sea Green', hex: '#2ab7a9', family: 'green' },
    { name: 'Teal Blue', hex: '#1a8a8e', family: 'green' },
    { name: 'Evergreen', hex: '#0d4f3c', family: 'green' },

    // Blue family (B)
    { name: 'Cobalt Blue', hex: '#1a4fb3', family: 'blue' },
    { name: 'Ultramarine', hex: '#2a3bc9', family: 'blue' },
    { name: 'Cerulean Blue', hex: '#3a8ad6', family: 'blue' },
    { name: 'Sky Blue', hex: '#7ab8e8', family: 'blue' },
    { name: 'Pale Blue', hex: '#b8d8f0', family: 'blue' },
    { name: 'Prussian Blue', hex: '#0d2f5a', family: 'blue' },
    { name: 'Indigo', hex: '#3a2a8a', family: 'blue' },
    { name: 'Ice Blue', hex: '#cfe4f5', family: 'blue' },

    // Violet / Purple family (V/BV/RV)
    { name: 'Violet', hex: '#7b4ab3', family: 'purple' },
    { name: 'Lavender', hex: '#b39ddb', family: 'purple' },
    { name: 'Deep Purple', hex: '#4a2a7a', family: 'purple' },
    { name: 'Orchid', hex: '#c678c7', family: 'purple' },
    { name: 'Magenta', hex: '#d63384', family: 'purple' },
    { name: 'Fuchsia', hex: '#e85aa8', family: 'purple' },
    { name: 'Pale Lilac', hex: '#dec4e8', family: 'purple' },

    // Earth tones (E)
    { name: 'Burnt Sienna', hex: '#b35c2e', family: 'earth' },
    { name: 'Raw Sienna', hex: '#c08448', family: 'earth' },
    { name: 'Ochre', hex: '#b8860b', family: 'earth' },
    { name: 'Umber', hex: '#8a6339', family: 'earth' },
    { name: 'Sepia', hex: '#6e4a2f', family: 'earth' },
    { name: 'Chocolate', hex: '#4e2e1a', family: 'earth' },
    { name: 'Brick', hex: '#a0423a', family: 'earth' },
    { name: 'Terracotta', hex: '#c9694a', family: 'earth' },
    { name: 'Beige', hex: '#d9c8a9', family: 'earth' },
    { name: 'Tan', hex: '#c9a96e', family: 'earth' },

    // Skin tones (E/R)
    { name: 'Skin 00', hex: '#fde5d0', family: 'skin' },
    { name: 'Skin 0', hex: '#f6ccaf', family: 'skin' },
    { name: 'Skin 1', hex: '#f0b088', family: 'skin' },
    { name: 'Skin 2', hex: '#d9906a', family: 'skin' },
    { name: 'Skin Shadow', hex: '#8e5a3e', family: 'skin' },

    // Pure colors
    { name: 'Pure Red', hex: '#ff0033', family: 'pure' },
    { name: 'Pure Yellow', hex: '#ffff00', family: 'pure' },
    { name: 'Pure Blue', hex: '#0044ff', family: 'pure' },
    { name: 'Pure Green', hex: '#00cc33', family: 'pure' },
    { name: 'Pure Violet', hex: '#8833ff', family: 'pure' },
    { name: 'Pure Orange', hex: '#ff8800', family: 'pure' },
    { name: 'White', hex: '#ffffff', family: 'pure' },
  ],

  // Theme quantum shifts (HSL offsets + filtering)
  themes: {
    void: {
      name: 'Void',
      bg: '#0a0a12',
      hueShift: 0,
      satMult: 1.0,
      lightnessBias: 0,
      accent: '#7c5cff',
      accent2: '#ff3366',
      accent3: '#00e5ff',
      filter: 'none'
    },
    nebula: {
      name: 'Nebula',
      bg: '#1a0a2e',
      hueShift: 20,
      satMult: 1.2,
      lightnessBias: -5,
      accent: '#c77dff',
      accent2: '#ff6b9d',
      accent3: '#9d4edd',
      filter: 'none'
    },
    plasma: {
      name: 'Plasma',
      bg: '#1a0000',
      hueShift: -10,
      satMult: 1.3,
      lightnessBias: -3,
      accent: '#ff4444',
      accent2: '#ff8800',
      accent3: '#ffaa00',
      filter: 'none'
    },
    quantum: {
      name: 'Quantum',
      bg: '#000a1a',
      hueShift: 180,
      satMult: 0.9,
      lightnessBias: -8,
      accent: '#00e5ff',
      accent2: '#0088ff',
      accent3: '#00ffcc',
      filter: 'none'
    },
    aurora: {
      name: 'Aurora',
      bg: '#0a1a0a',
      hueShift: 100,
      satMult: 1.1,
      lightnessBias: -5,
      accent: '#44ff88',
      accent2: '#88ff44',
      accent3: '#00ffcc',
      filter: 'none'
    },
    cream: {
      name: 'Cream',
      bg: '#f5f0e8',
      hueShift: 5,
      satMult: 0.85,
      lightnessBias: 12,
      accent: '#6d42c7',
      accent2: '#d6336c',
      accent3: '#1a8cd8',
      filter: 'none'
    },
    paper: {
      name: 'Paper',
      bg: '#faf8f0',
      hueShift: 8,
      satMult: 0.75,
      lightnessBias: 15,
      accent: '#53389e',
      accent2: '#c02655',
      accent3: '#0d6eaf',
      filter: 'none'
    }
  },

  currentTheme: 'void',
  shiftedColors: [],

  /** Convert hex to HSL */
  hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  },

  /** Convert HSL to hex */
  hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  },

  /** Apply theme shift to colors */
  applyTheme(themeName) {
    const theme = this.themes[themeName] || this.themes.void;
    this.currentTheme = themeName;
    this.shiftedColors = this.baseColors.map(c => {
      const hsl = this.hexToHsl(c.hex);
      return {
        ...c,
        originalHex: c.hex,
        hex: this.hslToHex(
          hsl.h + theme.hueShift + (Quantum.gaussian(0, 2)),
          Math.min(100, Math.max(0, hsl.s * theme.satMult + Quantum.gaussian(0, 2))),
          Math.min(98, Math.max(5, hsl.l + theme.lightnessBias + Quantum.gaussian(0, 1)))
        )
      };
    });
    return { colors: this.shiftedColors, theme };
  },

  /** Get Copic color by approximate closest match */
  closestCopic(r, g, b) {
    let best = this.shiftedColors[0];
    let bestDist = Infinity;
    for (const c of this.shiftedColors) {
      const cr = parseInt(c.hex.slice(1,3),16);
      const cg = parseInt(c.hex.slice(3,5),16);
      const cb = parseInt(c.hex.slice(5,7),16);
      const d = (r-cr)**2 + (g-cg)**2 + (b-cb)**2;
      if (d < bestDist) { bestDist = d; best = c; }
    }
    return best;
  }
};

window.CopicPalette = CopicPalette;
