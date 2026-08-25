/* ================================================
   QUART Circular Timeline Puck
   Handles rotation gestures on the circular timeline
   Scrub frames by dragging the ring
   ================================================ */

const TimelinePuckUI = {
  puck: null,
  canvas: null,
  scrubbing: false,

  init() {
    this.puck = document.getElementById('timeline-puck');
    this.canvas = document.getElementById('timeline-canvas');

    // Click on timeline canvas to jump to frame
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', () => this.scrubbing = false);
    this.canvas.addEventListener('pointercancel', () => this.scrubbing = false);
  },

  getAngle(e) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx);
  },

  onPointerDown(e) {
    this.scrubbing = true;
    this.scrubToAngle(this.getAngle(e));
  },

  onPointerMove(e) {
    if (!this.scrubbing) return;
    this.scrubToAngle(this.getAngle(e));
  },

  scrubToAngle(angle) {
    // Convert angle (from center, where 0 = right, -PI/2 = top) to frame index
    // Top position (-PI/2) is frame 0, going clockwise
    let normalized = angle + Math.PI / 2; // shift so 0 = top
    if (normalized < 0) normalized += Math.PI * 2;
    const frame = Math.floor((normalized / (Math.PI * 2)) * Animation.frames.length) % Animation.frames.length;
    if (frame !== Animation.currentFrame) {
      Animation.gotoFrame(frame);
    }
  }
};

window.TimelinePuckUI = TimelinePuckUI;
