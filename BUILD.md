# Building Quart for Google Play — $0.99 One-Time Purchase

## Development

```bash
# Serve locally
python3 -m http.server 8080
# or
npx serve -l 8080 .
```

Open http://localhost:8080 — works best on Chrome/Chromium for S Pen pressure support.

## Testing on Galaxy Tab S10+

1. Deploy to a static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages)
2. On the Tab S10+, open in Chrome
3. Tap "Add to Home screen" for PWA experience
4. For full S Pen testing, use Chrome DevTools remote debugging

## Packaging for Google Play as TWA

Quart is distributed as a Trusted Web Activity wrapping the PWA. This is the same approach used by many drawing apps (e.g., Infinite Painter, Sketchable).

### Prerequisites
- Node.js 18+
- JDK 17+
- Android SDK (command line tools)
- Bubblewrap CLI: `npm install -g @bubblewrap/cli`

### Step 1 — Host the PWA

Deploy the `index.html` + `src/` + `assets/` to a production HTTPS origin.
The origin MUST serve `assetlinks.json` for TWA verification.

### Step 2 — Generate keystore

```bash
keytool -genkey -v -keystore keystore/quart-release.jks \
  -alias quart -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass QUART_STORE_PASS -keypass QUART_KEY_PASS
```

### Step 3 — Initialize TWA

```bash
bubblewrap init --manifest=https://YOUR-ORIGIN/manifest.json
```

Answer prompts:
- Package name: `app.quart.editor`
- App name: `Quart`
- Launcher name: `Quart`
- Host: your origin
- Signing key path: `./keystore/quart-release.jks`

### Step 4 — Build AAB (Android App Bundle)

```bash
bubblewrap build
```

This produces `app-release-bundle.aab` — upload this to Google Play Console.

### Step 5 — Google Play Console Setup

1. Create app: "Quart"
2. Pricing: $0.99 USD, one-time purchase (not subscription, not free)
3. Category: Art & Design
4. Content rating: Everyone
5. Upload AAB to Internal testing → Closed → Production
6. Add `.well-known/assetlinks.json` to your web origin for TWA verification

### Step 6 — Asset Links

After first upload, Play Console provides the SHA-256 fingerprint. Create:

```
https://YOUR-ORIGIN/.well-known/assetlinks.json
```
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.quart.editor",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

## Galaxy Tab S10+ Optimizations

- 1752 × 2800 resolution (WQXGA+) at 120 Hz
- S Pen has 4096 pressure levels, tilt, barrel button (eraser), air actions
- Our app uses PointerEvents which surface pen pressure as `e.pressure`
- Barrel button is detected via `e.buttons === 32` / `e.button === 5` → auto-switches to eraser
- Right-click (two-finger tap) = eyedropper
- Two-finger pinch = zoom, double-tap = fit to screen
- The canvas artboard is 2800 × 2000 (4:3-ish), which scales nicely to the Tab's aspect ratio

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| B | Wave Brush |
| P | Quantum Pen |
| M | Copic Marker |
| A | Airbrush |
| W | Watercolor |
| Shift+N | Neon |
| E | Eraser |
| I | Eyedropper |
| F | Fill |
| N | Toggle Onion Skin |
| [ ] | Prev/Next Brush |
| Space | Play/Pause |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Esc | Close all pucks |

## S Pen Gestures

| Gesture | Action |
|---------|--------|
| Draw | Paint with current brush |
| Hold barrel button + draw | Erase (auto-restore tool on lift) |
| Tap with button (right-click) | Eyedropper |
| Two-finger pinch | Zoom |
| Double-tap (finger) | Fit artboard to screen |
| Tap orb center | Quantum color jump |
| Double-tap orb | New drawing (with confirmation) |

## Project File Format (.QPF)

Quart uses `.qpf` — a JSON file containing base64-encoded PNG layers and animation frames.
Import: drag a `.qpf.json` file onto the app (v0.2+ feature — loader coming next).
