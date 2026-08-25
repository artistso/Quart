# Building Quart — GitHub Pages + Google Play APK ($0.99 one-time)

Two release pipelines ship from this repo. Their GitHub Actions definitions
live in `ci/github-actions/` and activate the moment they are moved into
`.github/workflows/` (the CI app token is not allowed to push workflow files,
so a human push is required for that one step — see "Activating the
workflows" below):

| Pipeline | Definition | Output |
|----------|------------|--------|
| Web / PWA | `ci/github-actions/pages.yml` | https://artistso.github.io/Quart/ |
| Android TWA | `ci/github-actions/android.yml` | `app-release-signed.apk` + `app-release-bundle.aab` |
| Sanity gate | `ci/github-actions/ci.yml` | validates + builds on every push/PR |

### Zero-config GitHub Pages (no Actions needed)

The repo root is directly servable, so Pages works **right now** with branch
deployment: Settings → Pages → Source: *Deploy from a branch* → `main`, `/ (root)`.

### Activating the workflows

```bash
git mv ci/github-actions/*.yml .github/workflows/
git commit -m "Enable Pages + Android pipelines"
git push                      # from a human account
```

After that, every push to `main` deploys Pages and every release builds the
APK/AAB. Also set Settings → Pages → Source: *GitHub Actions*.

## Local development

```bash
npm install
npm start            # npx serve -l 8080 .
```

Open http://localhost:8080 — works best on Chrome/Chromium for S Pen pressure support.

The app is **base-path independent** (relative URLs everywhere, the service
worker resolves its precache against its own scope), so the same tree runs
from `/`, `/Quart/`, or any custom domain.

## GitHub Pages

One-time repo setup (admin):

```bash
gh api repos/artistso/Quart/pages -X POST -f build_type=workflow   # or Settings → Pages → Source: GitHub Actions
```

After that, every push to `main` runs `node scripts/build.js` and deploys
`dist/` (once the workflow is activated; until then use the branch-deployment
mode above, which serves the repo root directly). The build:

1. copies the servable set (`index.html`, `manifest.json`, `sw.js`, `src/`, `assets/`, `.well-known/`, `.nojekyll`),
2. stamps the service-worker cache name with the package version,
3. emits `.well-known/assetlinks.json` (uses the `QUART_SHA256_FINGERPRINT` secret when set),
4. emits `404.html`, then runs `scripts/validate.js` over the output.

`npm run build` / `npm test` do the same locally.

## Android APK / AAB (Bubblewrap TWA)

The `android/` directory is a **generated, committed** Bubblewrap project.
The source of truth is `android/twa-manifest.json`; regeneration is
deterministic:

```bash
npm install
npm run android:generate                              # needs reachable icon URLs (production)
# offline / from a local mirror:
npx serve -l 8080 . &
npm run android:generate -- --icon-base http://127.0.0.1:8080/
```

`scripts/generate-android.mjs` regenerates the whole Gradle project, writes
back the production `twa-manifest.json` and refreshes `manifest-checksum.txt`
so `bubblewrap build` never prompts.

### Building the APK

Requirements: Node 18+, JDK 17, Android SDK (or just run the workflow).

```bash
npm run twa          # cd android && bubblewrap build   → signed APK + AAB
```

Passwords come from `BUBBLEWRAP_KEYSTORE_PASSWORD` / `BUBBLEWRAP_KEY_PASSWORD`
(or you are prompted). The keystore path is `android/keystore/quart-release.jks`
(ignored by git).

The `Android APK / AAB` workflow does this on GitHub runners for every
release (or manual dispatch): it uses the repo secrets
`PLAY_KEYSTORE_B64` / `PLAY_KEYSTORE_PASSWORD` / `PLAY_KEY_PASSWORD` when
present, otherwise generates an ephemeral key, then uploads
`quart-android` artifacts and attaches the APK/AAB to the release. The
SHA-256 upload-key fingerprint is printed in the log.

### Install on the Galaxy Tab S10+

1. Run the workflow (or `npm run twa` locally with a JDK 17 + Android SDK).
2. `adb install app-release-signed.apk`.
3. The APK opens `https://artistso.github.io/Quart/` in a Trusted Web
   Activity; without a verified asset link it runs in fallback mode with the
   browser chrome hidden as much as the platform allows.

### Digital Asset Links (verified TWA)

GitHub Pages project sites live under `artistso.github.io/Quart/`, but Android
requires `/.well-known/assetlinks.json` at the **domain root**, which a project
repo cannot control. Options:

- Serve Quart from your own domain (custom domain for Pages or any static
  host), put the fingerprint from the build log into
  `.well-known/assetlinks.json` + the `QUART_SHA256_FINGERPRINT` secret, and
  the APK verifies.
- Stay on `github.io`: the APK still works (unverified fallback).

### Google Play Console

1. Create app "Quart", category Art & Design, rating Everyone.
2. Pricing $0.99 USD one-time purchase.
3. Upload `app-release-bundle.aab` (signed with your **stable** upload key —
   configure the `PLAY_KEYSTORE_*` secrets).
4. Internal testing → Closed → Production.

## Regenerating icons

```bash
npm run icons        # ImageMagick; renders assets/icon-*.png, favicons, splash
```

## Galaxy Tab S10+ optimizations

- 1752 × 2800 (WQXGA+) at 120 Hz; S Pen 4096 pressure levels, tilt, barrel button.
- PointerEvents surface pen pressure as `e.pressure`.
- Barrel button (`e.buttons === 32` / `e.button === 5`) → auto eraser while held.
- Right-click (two-finger tap) = eyedropper; pinch = zoom; double-tap = fit.
- Artboard 2800 × 2000 scales to the Tab aspect ratio.

## Keyboard shortcuts

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| B | Wave Brush | E | Eraser |
| P | Quantum Pen | I | Eyedropper |
| M | Copic Marker | F | Fill |
| A | Airbrush | N | Toggle Onion Skin |
| W | Watercolor | [ / ] | Prev/Next Brush |
| Shift+N | Neon | Space | Play/Pause |
| Ctrl+Z | Undo | Ctrl+Shift+Z | Redo |
| Esc | Close all pucks | | |

## S Pen gestures

| Gesture | Action |
|---------|--------|
| Draw | Paint with current brush |
| Hold barrel + draw | Erase (tool restored on lift) |
| Tap with barrel (right-click) | Eyedropper |
| Two-finger pinch | Zoom |
| Double-tap (finger) | Fit artboard |
| Tap orb center | Quantum color jump |
| Double-tap orb | New drawing (with confirm) |

## Project file format (.QPF)

`.qpf` = JSON with base64 PNG layers + animation frames. Import by dragging a
`.qpf.json` onto the app (v0.2+).
