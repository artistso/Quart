<p align="center">
  <img src="assets/icon-512.png" width="140" alt="Quart" />
</p>

<h1 align="center">◈ QUART</h1>
<p align="center"><em>Quantum Drawing Engine</em></p>

<p align="center">
  A next-generation drawing & animation app for the Galaxy Tab S10+, built on a
  quantum-mechanical core. $0.99 on Google Play · free on GitHub.
</p>

<p align="center">
  <a href="https://github.com/artistso/Quart/releases/latest"><img src="https://img.shields.io/github/v/release/artistso/Quart?style=flat-square&label=release&color=7c5cff" alt="release"></a>
  <a href="https://github.com/artistso/Quart/actions/workflows/build-apk.yml"><img src="https://img.shields.io/github/actions/workflow/status/artistso/Quart/build-apk.yml?style=flat-square&label=APK%20build&color=ff3366" alt="APK build"></a>
  <a href="https://artistso.github.io/Quart/"><img src="https://img.shields.io/badge/live-GitHub%20Pages-00e5ff?style=flat-square" alt="GitHub Pages"></a>
  <img src="https://img.shields.io/badge/platform-Android%20·%20Web%20PWA-34d399?style=flat-square" alt="platform">
</p>

<p align="center">
  <a href="https://github.com/artistso/Quart/releases/latest">
    <img src="https://img.shields.io/badge/⬇%20DOWNLOAD%20APK-latest%20release-7c5cff?style=for-the-badge" alt="Download APK">
  </a>
  &nbsp;
  <a href="https://artistso.github.io/Quart/">
    <img src="https://img.shields.io/badge/◈%20OPEN%20WEB%20APP-GitHub%20Pages-ff3366?style=for-the-badge" alt="Open Web App">
  </a>
</p>

---

## Core Philosophy

Quart treats every brush stroke as a quantum wavefunction. Particles have position uncertainty, colors exist in superposition until observed, and undo/redo are literal "quantum jumps" through state space. Nothing is generic.

## ✨ New in v0.2

- **Android APK** — the full app bundled into an offline-first installable shell
  (built & signed automatically by CI, published to [Releases](https://github.com/artistso/Quart/releases))
- **GitHub Pages deployment** — the PWA is live at
  [artistso.github.io/Quart](https://artistso.github.io/Quart/)
- **Project import** — open/drag-drop `.qpf` files back into Quart (layers,
  frames, theme & brush state all restored)
- **App icons & installability** — full PWA icon set (any + maskable), favicon, shortcuts
- **Relative-path PWA** — service worker + manifest now work at any hosting depth

## Key Features

### 🎨 Quantum Brush Engine
- **Path-integral Pen** — strokes follow the principle of least action, with quantum smoothness
- **Wavefunction Brush** — each bristle is a particle in a probability cloud
- **Probability Airbrush** — Gaussian spray following quantum measurement distributions
- **Graphite Pencil** — grain particles with Heisenberg uncertainty
- **Quantum Vacuum Eraser** — not just removing, but tunneling through pixels
- **Wavefunction Smudge** — collapses neighbor colors into your stroke
- **Entangled Fill** — quantum flood fill with tunneling through near-matching edges
- **Neon, Marker, Watercolor** — with full pressure→size/opacity mapping

### ⏱️ Circular Chronos Timeline
- Expanding circular puck — scrub frames by rotating the ring
- Onion skinning, add/duplicate frames, configurable FPS (4–30)

### 🎯 Floating Round Pucks
Every tool is a draggable glassmorphic puck: **CHRONOS** (timeline) · **FORGE**
(brushes) · **SPECTRUM** (color wheel + quantum-entangled Copic palette) ·
**ORBITS** (layers) · **QUANTUM** (themes) · **EXPORT** · **◈ Central Orb**

### 🌈 Entangled Themes & Copic Palette
Changing the canvas theme *physically shifts the Copic marker palette* through
HSL entanglement. Seven themes: Void · Nebula · Plasma · Quantum · Aurora ·
Cream · Paper

## 📦 Install

### Android (APK — recommended for Tab S10+)

1. Grab the latest `Quart-x.y.z-android.apk` from
   [Releases](https://github.com/artistso/Quart/releases/latest)
2. Allow *Install unknown apps* for your browser or file manager
3. Install & draw. The app is **fully offline**; exports (PNG / WebP / WebM / `.qpf`)
   are saved straight into your **Downloads** folder
4. S Pen pressure, tilt and barrel-button erase all work

### Web (PWA)

Open [artistso.github.io/Quart](https://artistso.github.io/Quart/) — best in
Chrome. *Add to Home screen* for the fullscreen PWA experience.

### Local development

```bash
python3 -m http.server 8080    # or: npx serve -l 8080 .
# → http://localhost:8080
```

## 🚀 How shipping works (CI)

| Workflow | What it does |
|----------|--------------|
| `Build Android APK` | Stages the web app into `android/`, builds a **signed release APK**, publishes it to a GitHub Release on the repo front page |
| `Deploy GitHub Pages` | Ships the PWA to **GitHub Pages** on every push to `main` |

- **Versioning** — bump the [`VERSION`](VERSION) file; CI derives `versionName`
  (`0.2.0`) and `versionCode` (`00200`) from it and tags the release
- **Signing** — the first CI run bootstraps a sideload keystore
  (`android/keystore/quart-release.jks`) and commits it back, so every build
  afterwards upgrades cleanly over the previous one. *(Sideload key only —
  Google Play releases get their own private key, see [BUILD.md](BUILD.md).)*
- **Offline shell** — the APK serves the bundled web app over
  `https://appassets.androidplatform.net` via `WebViewAssetLoader`, so service
  workers, pointer events and pressure all behave like the real web app

## 📁 Project Structure

```
├── index.html            # App shell (pucks, canvases, topbar)
├── manifest.json         # PWA manifest (relative paths → Pages-friendly)
├── sw.js                 # Quantum offline cache
├── src/
│   ├── canvas/           # brushes · renderer · animation
│   ├── quantum/          # engine · particles · audio
│   ├── ui/               # puck framework + tool/color/layer/timeline/export pucks
│   ├── themes/           # entangled Copic palette
│   ├── platform/         # io.js — downloads + .qpf import (web & Android bridge)
│   └── styles/           # glassmorphic UI
├── assets/               # PWA + maskable icons, favicon
├── android/              # Offline WebView shell (Gradle project)
│   └── app/src/main/java/app/quart/editor/
│       ├── MainActivity.java     # asset loader · file chooser · immersive
│       └── AndroidSaver.java     # JS bridge → MediaStore Downloads
├── scripts/stage-android.sh      # web → android assets
└── .github/workflows/    # build-apk.yml · deploy-pages.yml
```

## 📋 Documentation

- **[BUILD.md](BUILD.md)** — local builds, APK packaging, signing, Play Store path
- **Keyboard shortcuts & S Pen gestures** — see BUILD.md

## Roadmap

- [ ] PSD export (real layered file)
- [ ] MP4/GIF direct encode (WebCodecs)
- [ ] Google Play listing ($0.99, TWA + billing)
- [ ] Cloud sync of `.qpf` projects
- [ ] Pressure curve editor

---

<p align="center"><em>◈ Everything is a superposition until observed.</em></p>
