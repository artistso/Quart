#!/usr/bin/env node
/* ============================================================================
   Quart — static site builder (GitHub Pages / any static host)

   The app itself is fully base-path independent (all URLs relative, service
   worker resolves its precache against its own scope), so "building" is:

     1. copy the servable file set into dist/
     2. stamp the service-worker cache name with the package version
     3. emit .well-known/assetlinks.json (TWA digital asset links)
     4. emit a 404.html fallback
     5. run scripts/validate.js against the output

   Env:
     QUART_SHA256_FINGERPRINT  upload-key cert fingerprint for assetlinks.json
                               (colon-separated hex, as printed by keytool)
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const COPY_FILES = ['index.html', 'manifest.json', 'sw.js', '.nojekyll'];
const COPY_DIRS = ['src', 'assets', '.well-known'];

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function cpdir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) cpdir(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}

console.log(`◈ building dist/ (quart v${pkg.version})`);
rmrf(dist);
fs.mkdirSync(dist, { recursive: true });

for (const f of COPY_FILES) {
  fs.copyFileSync(path.join(root, f), path.join(dist, f));
  console.log(`  + ${f}`);
}
for (const d of COPY_DIRS) {
  const src = path.join(root, d);
  if (!fs.existsSync(src)) continue;
  cpdir(src, path.join(dist, d));
  console.log(`  + ${d}/`);
}

/* stamp service worker cache with package version -------------------------- */
const swPath = path.join(dist, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE = 'quart-v[\w.-]+'/, `const CACHE = 'quart-v${pkg.version}'`);
fs.writeFileSync(swPath, sw);

/* digital asset links for the TWA ------------------------------------------ */
const fingerprint = process.env.QUART_SHA256_FINGERPRINT ||
  'REPLACE_WITH_UPLOAD_KEY_SHA256_FINGERPRINT';
const wellKnown = path.join(dist, '.well-known');
fs.mkdirSync(wellKnown, { recursive: true });
fs.writeFileSync(path.join(wellKnown, 'assetlinks.json'), JSON.stringify([
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'app.quart.editor',
      sha256_cert_fingerprints: [fingerprint],
    },
  },
], null, 2) + '\n');
console.log('  + .well-known/assetlinks.json');

/* 404 fallback -------------------------------------------------------------- */
fs.writeFileSync(path.join(dist, '404.html'), `<!DOCTYPE html>
<meta charset="utf-8">
<title>Quart — page not found</title>
<meta http-equiv="refresh" content="0; url=./">
<a href="./">Back to Quart</a>
`);
console.log('  + 404.html');

/* validate ------------------------------------------------------------------ */
const { spawnSync } = require('child_process');
const v = spawnSync(process.execPath, [path.join(__dirname, 'validate.js'), dist], {
  stdio: 'inherit',
});
if (v.status !== 0) {
  console.error('✗ dist/ failed validation');
  process.exit(v.status || 1);
}
console.log('◈ dist/ ready');
