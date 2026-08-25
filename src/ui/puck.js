/* ================================================
   QUART Puck System
   Draggable, expandable circular floating windows
   Magnetic snapping · boundary awareness
   ================================================ */

const PuckSystem = {
  pucks: [],

  init() {
    // Initialize all pucks with drag + tap to expand
    document.querySelectorAll('.puck').forEach(puck => {
      const handle = puck.querySelector('.puck-handle');
      if (!handle) return;

      this.pucks.push(puck);

      let startX, startY, origX, origY;
      let moved = false;
      let longPressTimer = null;

      const getPuckPos = () => {
        const rect = puck.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
      };

      const setPosition = (x, y) => {
        // Convert to fixed position relative to viewport
        // Use inline style for draggable pucks (those not using CSS transforms for initial placement)
        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        const pw = puck.offsetWidth;
        const ph = puck.offsetHeight;
        // Clamp to viewport
        x = Math.max(10, Math.min(vpW - pw - 10, x));
        y = Math.max(10, Math.min(vpH - ph - 10, y));

        // Store position
        puck.style.left = x + 'px';
        puck.style.top = y + 'px';
        puck.style.right = 'auto';
        puck.style.bottom = 'auto';
        puck.style.transform = 'none';
      };

      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        const pos = getPuckPos();
        startX = e.clientX;
        startY = e.clientY;
        origX = pos.x;
        origY = pos.y;
        moved = false;

        // Haptic-like subtle scale
        handle.style.transition = 'transform 0.1s';
        handle.style.transform = 'scale(0.92)';
      });

      handle.addEventListener('pointermove', (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          moved = true;
          setPosition(origX + dx, origY + dy);
        }
      });

      handle.addEventListener('pointerup', (e) => {
        handle.releasePointerCapture(e.pointerId);
        handle.style.transform = '';
        if (!moved) {
          // Tap - toggle expand
          this.togglePuck(puck);
        } else {
          // Magnetic snap to edges
          this.snapToEdge(puck);
        }
      });

      handle.addEventListener('pointercancel', () => {
        handle.style.transform = '';
      });
    });

    // Click outside expanded puck to collapse
    document.addEventListener('pointerdown', (e) => {
      const expanded = document.querySelector('.puck[data-state="expanded"]');
      if (!expanded) return;
      if (!expanded.contains(e.target) && !e.target.closest('.puck')) {
        this.collapseAll();
      }
    });
  },

  togglePuck(puck) {
    const state = puck.dataset.state;
    if (state === 'expanded') {
      this.collapsePuck(puck);
    } else {
      // Collapse others
      this.collapseAll();
      this.expandPuck(puck);
    }
  },

  expandPuck(puck) {
    puck.dataset.state = 'expanded';
    QuantumAudio.puckOpen();
    // Bring to front
    this.pucks.forEach(p => p.style.zIndex = 40);
    puck.style.zIndex = 45;
  },

  collapsePuck(puck) {
    puck.dataset.state = 'collapsed';
    QuantumAudio.puckClose();
  },

  collapseAll() {
    this.pucks.forEach(p => this.collapsePuck(p));
  },

  snapToEdge(puck) {
    const rect = puck.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newX = rect.left, newY = rect.top;
    const margin = 16;
    const snap = 60;

    // Horizontal snap
    if (cx < vw / 2) {
      if (rect.left < snap) newX = margin;
    } else {
      if (vw - rect.right < snap) newX = vw - rect.width - margin;
    }
    // Vertical snap
    if (cy < vh / 2) {
      if (rect.top < snap) newY = margin;
    } else {
      if (vh - rect.bottom < snap) newY = vh - rect.height - margin;
    }

    puck.style.transition = 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), top 0.3s cubic-bezier(0.34,1.56,0.64,1)';
    puck.style.left = newX + 'px';
    puck.style.top = newY + 'px';
    setTimeout(() => { puck.style.transition = ''; }, 300);
  }
};

window.PuckSystem = PuckSystem;
