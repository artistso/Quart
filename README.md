<p align="center">
  <img src="assets/icon-512.png" width="128" alt="Quart">
</p>

<h1 align="center">◈ QUART</h1>
<p align="center"><em>Quantum Drawing Engine</em></p>

<p align="center">
A next-generation drawing & animation app for the Galaxy Tab S10+, built on a quantum-mechanical core. $0.99 on Google Play.
</p>

---

## Core Philosophy

Quart treats every brush stroke as a quantum wavefunction. Particles have position uncertainty, colors exist in superposition until observed, and undo/redo are literal "quantum jumps" through state space. Nothing is generic.

## Key Features

### 🎨 Quantum Brush Engine
- **Path-integral Pen** — strokes follow the principle of least action, with quantum smoothness
- **Wavefunction Brush** — each bristle is a particle in a probability cloud
- **Probability Airbrush** — Gaussian spray following quantum measurement distributions
- **Graphite Pencil** — grain particles with Heisenberg uncertainty
- **Quantum Vacuum Eraser** — not just removing, but tunneling through pixels
- **Wavefunction Smudge** — collapses neighbor colors into your stroke
- **Entangled Fill** — quantum flood fill with tunneling through near-matching edges

### ⏱️ Circular Chronos Timeline
- No more left-to-right linear timeline — Chronos is an expanding circular puck
- Scrub frames by rotating the ring
- Expand to reveal frame thumbnails along the orbital ring
- Playback, onion skinning, add/duplicate frames
- Configurable FPS (6/8/12/15/24/30)

### 🎯 Floating Round Pucks
Every tool is a draggable, glassmorphic circular puck you can position anywhere:
- **CHRONOS** — timeline (bottom center)
- **FORGE** — brushes & properties (left side)
- **SPECTRUM** — color wheel + quantum-entangled Copic palette (right side)
- **ORBITS** — layers with live thumbnails (right bottom)
- **QUANTUM** — themes & engine settings (left bottom)
- **EXPORT** — PNG, PSD, MP4, GIF, WebP, QPF (left top)
- **◈ Central Orb** — double-tap for new canvas, single-tap for quantum color jump

### 🌈 Entangled Themes & Copic Palette
Changing the canvas theme *physically shifts the Copic marker palette* through HSL entanglement. Seven built-in themes:
- **Void** (deep space black/purple)
- **Nebula** (violet cosmic clouds)
- **Plasma** (hot red/orange)
- **Quantum** (cool blue/cyan)
- **Aurora** (green northern lights)
- **Cream** (warm off-white paper)
- **Paper** (bright natural white)

### 🎬 Animation Features (from Procreate Dreams, ToonSquid, ToonBoom)
- Frame-by-frame animation with onion skinning (previous + next frame with different blend)
- Live frame thumbnails on circular timeline
- Layer-based compositing
- Playback scrubbing by rotating the Chronos puck
- Export to GIF, WebM/MP4, WebP stickers, layered PNGs, and native QPF project files

### ✨ UX Details
- **Transparent glassmorphic UI** — all panels are frosted-glass circles
- **Magnetic edge snapping** for pucks
- **S Pen pressure support** — pressure maps to both size and opacity
- **Two-finger pinch zoom & pan**
- **Tap outside any puck** to instantly collapse all panels
- **Keyboard shortcuts** (B=brush, P=pen, E=eraser, F=fill, space=play, N=onion, Ctrl+Z=undo)
- **Pentatonic quantum UI sounds** via Web Audio
- **Animated quantum field background** with entangled particles that react to touch

### 💾 Export
- **PNG** — flattened current frame
- **PSD-style** — each layer as separate PNG
- **MP4/WebM** — animated loop
- **GIF** — animated loop
- **WebP** — sticker with transparency (no background)
- **QPF** — native Quart Project File (JSON + PNG layers, fully reimportable)

## Project Structure

```
Quart/
├── index.html              # App entry
├── manifest.json           # PWA manifest (relative URLs, base-path independent)
├── sw.js                   # Offline cache, scope-relative precache
├── assets/                 # Icons / splash (npm run icons)
├── .well-known/            # assetlinks.json template for TWA verification
├── android/                # Committed Bubblewrap TWA project (generated)
│   └── twa-manifest.json   #   ← source of truth for the APK
├── scripts/
│   ├── build.js            # dist/ builder for GitHub Pages
│   ├── validate.js         # artifact validator (npm test)
│   ├── generate-android.mjs# deterministic TWA regeneration
│   └── build-icons.sh      # icon artwork renderer
├── ci/github-actions/      # ready-made pages.yml · android.yml · ci.yml
│                           # (move to .github/workflows/ to activate)
└── src/
    ├── styles/
    │   └── main.css        # Full transparent/glassmorphic theme
    ├── quantum/
    │   ├── engine.js       # Quantum mechanics core (wavefunctions, HBAR, path integrals)
    │   ├── particles.js    # Background quantum field
    │   └── audio.js        # Pentatonic quantum UI sounds
    ├── themes/
    │   └── copic.js        # Copic palette + quantum theme entanglement
    ├── canvas/
    │   ├── brushes.js      # All 8 quantum brush types
    │   ├── renderer.js     # Layer compositing, undo/redo, input
    │   └── animation.js    # Frame timeline + onion skinning
    └── ui/
        ├── puck.js         # Draggable/expandable puck system
        ├── timeline-puck.js
        ├── palette-puck.js
        ├── tool-puck.js
        ├── layer-puck.js
        ├── export-puck.js
        └── central-orb.js
```

## Building for Google Play

The `android/` directory is a committed Bubblewrap TWA project driven by
`android/twa-manifest.json`:

- **Local build:** `npm run twa` (needs JDK 17 + Android SDK) → signed APK + AAB.
- **CI build:** the ready-made `ci/github-actions/android.yml` workflow builds
  it on GitHub runners for every release once moved into `.github/workflows/`
  (one human push — the CI app token can't add workflow files; details in
  [BUILD.md](BUILD.md)).

1. `Actions → Android APK / AAB → Run workflow` (or cut a release)
2. Download `quart-android` — `app-release-signed.apk` (sideload with `adb install`) and `app-release-bundle.aab` (Play Console upload)
3. Price: $0.99 one-time purchase (no subscriptions, no IAP)

Add the `PLAY_KEYSTORE_B64` / `PLAY_KEYSTORE_PASSWORD` / `PLAY_KEY_PASSWORD`
secrets to sign with your stable Play upload key; without them an ephemeral
key is generated per run. Local build: `npm run twa` (needs JDK 17 + Android
SDK). Full details in [BUILD.md](BUILD.md).

## GitHub Pages

Fastest: Settings → Pages → Source: *Deploy from a branch* → `main`, `/ (root)` —
the repo root is directly servable (`.nojekyll` included).
Automated: move `ci/github-actions/pages.yml` into `.github/workflows/`
(one human push) and set Pages source to *GitHub Actions*; every push to
`main` then builds and deploys `dist/`. The app is base-path independent, so
it runs at `https://artistso.github.io/Quart/` or any custom domain.

## Local Development

Serve the directory with any static server:

```bash
npm install
npm start
# or
python3 -m http.server 8080
```

Open in Chrome on a tablet/desktop for the full experience. Optimized for Galaxy Tab S10+ (1752×2800, 120Hz, S Pen pressure support).

## Physics Easter Eggs

- The quantum constant `HBAR = 2.4` controls brush jitter magnitude
- Color superposition shifts hues with a Doppler-like effect based on stroke velocity
- The central orb's rings rotate at different angular velocities (like electron orbitals)
- Undo is literally "collapsing the wavefunction" to a previous state
- Fill uses quantum tunneling — there's a 0.5% chance paint leaks through edges

## License

© 2026 Quart. All rights reserved.
