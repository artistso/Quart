# Building Quart — APK, Pages & Google Play

## Development

```bash
python3 -m http.server 8080     # or: npx serve -l 8080 .
```

Open http://localhost:8080 — works best on Chrome/Chromium for S Pen pressure support.

## Shipping (CI does this for you)

| Trigger | Result |
|---------|--------|
| Push to `main` | **Signed APK** built & attached to the [GitHub Release](https://github.com/artistso/Quart/releases) · **PWA deployed** to [GitHub Pages](https://artistso.github.io/Quart/) |
| Push to `arena/**` | Same builds, used as previews |
| Push a tag `v*` | Release build pinned to that tag |

**Cutting a release:** bump the [`VERSION`](VERSION) file (e.g. `0.3.0`) and push.
CI derives `versionName` and `versionCode` (`major*10000 + minor*100 + patch`)
from it, builds, and publishes release `v0.3.0` automatically.

## The Android APK

The APK in Releases is an **offline-first WebView shell**: the entire web app is
bundled into the APK and served over the secure origin
`https://appassets.androidplatform.net` using
[`WebViewAssetLoader`](https://developer.android.com/reference/androidx/webkit/WebViewAssetLoader).
That means:

- works with **zero network** (Google Fonts degrade gracefully to system fonts)
- service worker, Pointer Events and **S Pen pressure** behave exactly like the web app
- exports are streamed over a chunked JS bridge into the system **Downloads** folder
  (`MediaStore` on Android 10+, app exports dir on 8–9)
- "Open Project…" uses the native document picker (`onShowFileChooser`)

### Building locally

```bash
npm run apk          # stages web assets + gradle assembleRelease
```

Prerequisites: JDK 17, Android SDK (compileSdk 34). Output:
`android/app/build/outputs/apk/release/Quart-<version>-android.apk`.

### Signing

- CI bootstraps a **sideload keystore** on first run and commits it back to
  `android/keystore/quart-release.jks` (password: `quart-quart-4242`, alias
  `quart`). Every CI build after that signs with the same identity, so new
  APKs install as **upgrades** over older ones.
- This keystore is public-by-design for GitHub distribution. **Never use it for
  Google Play** — generate a private one:

```bash
keytool -genkey -v -keystore quart-play.jks -alias quart \
  -keyalg RSA -keysize 2048 -validity 10000
```

## Google Play path ($0.99 one-time purchase)

Quart's Play listing is planned as a **TWA** wrapping the hosted PWA
(`twa-config.json` holds the listing config). Prerequisites: Node 18+, JDK 17+,
Android SDK, `npm i -g @bubblewrap/cli`.

1. Deploy the PWA (done — GitHub Pages serves it)
2. Generate a **private** keystore (see above)
3. `bubblewrap init --manifest=https://artistso.github.io/Quart/manifest.json`
   → package `app.quart.editor`, host `artistso.github.io`
4. `bubblewrap build` → `app-release-bundle.aab` → upload to Play Console
5. Serve `.well-known/assetlinks.json` with the Play SHA-256 fingerprint
   *(note: project pages can't own the domain root — for full TWA verification
   host the PWA on a custom domain, or keep shipping the bundled APK)*
6. Play Console: pricing $0.99 one-time · category Art & Design · Everyone

## Galaxy Tab S10+ Optimizations

- 1752 × 2800 (WQXGA+) at 120 Hz; artboard is 2800 × 2000
- S Pen: 4096 pressure levels, tilt, barrel button (eraser)
- PointerEvents surface pen pressure as `e.pressure`
- Barrel button = `e.buttons === 32` → auto-switch to eraser, restore on lift
- Right-click (two-finger tap) = eyedropper · pinch = zoom · double-tap = fit

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
| Ctrl+Z | Undo (quantum jump back) |
| Ctrl+Shift+Z | Redo (quantum leap forward) |
| Ctrl+S | Save Project (.qpf) |
| Ctrl+O | Open Project |
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

A `.qpf` file is JSON containing base64-encoded PNG layers and animation
frames, plus theme/brush/fps state. **Import** via EXPORT puck → *Open
Project…*, Ctrl+O, or drag & drop the file onto the app.
