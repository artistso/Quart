#!/usr/bin/env node
/* ============================================================================
   Quart — artifact validator

   Usage:  node scripts/validate.js [targetDir]     (default: repo root)

   Verifies, for the given servable directory:
     • every JS file parses            (node --check)
     • every local asset referenced from index.html exists
     • every service-worker precache entry exists
     • manifest.json is sane and its icons exist
     • the committed android/ TWA project is consistent
       (checksum matches twa-manifest.json, gradle project files present,
        AndroidManifest/strings XML well-formed, host baked in correctly)
   Exits non-zero on the first class of failure.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const target = path.resolve(process.argv[2] || root);
let failures = 0;
const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);

const inTarget = (p) => path.join(target, p);
const exists = (p) => fs.existsSync(p) && fs.statSync(p).isFile();

console.log(`◈ validating ${path.relative(root, target) || 'repo root'}`);

/* 1 — JS syntax ------------------------------------------------------------- */
const jsFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'android'].includes(e.name)) continue;
      walk(p);
    } else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) jsFiles.push(p);
  }
})(path.join(root, 'src'));
jsFiles.push(path.join(root, 'sw.js'));
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', f]);
  if (r.status !== 0) fail(`syntax: ${path.relative(root, f)}\n${r.stderr}`);
}
ok(`${jsFiles.length} JS files parse`);

/* 2 — index.html local references ------------------------------------------ */
const html = fs.readFileSync(inTarget('index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(m => m[1])
  .filter(u => !/^(https?:|#|mailto:|data:)/.test(u));
for (const r of refs) {
  if (!exists(inTarget(r.split(/[?#]/)[0]))) fail(`index.html references missing file: ${r}`);
}
ok(`${refs.length} local references in index.html resolve`);

/* 3 — service worker precache ------------------------------------------------ */
const sw = fs.readFileSync(inTarget('sw.js'), 'utf8');
const pre = sw.match(/const PRECACHE = \[([\s\S]*?)\]/);
if (!pre) fail('sw.js: PRECACHE list not found');
else {
  const entries = pre[1].split('\n')
    .map(l => (l.trim().match(/^'([^']*)'/) || [])[1])
    .filter(e => e !== undefined);
  for (const e of entries) {
    const p = e === '' ? 'index.html' : e;
    if (!exists(inTarget(p))) fail(`sw.js precaches missing file: ${e}`);
  }
  ok(`sw.js precache list (${entries.length} entries) resolves`);
}
if (!/quart-v[\w.-]+/.test(sw)) fail('sw.js: cache version constant missing');

/* 4 — web manifest ------------------------------------------------------------ */
const manifest = JSON.parse(fs.readFileSync(inTarget('manifest.json'), 'utf8'));
for (const field of ['start_url', 'scope']) {
  if (manifest[field] && manifest[field].startsWith('/')) {
    fail(`manifest.json ${field} must be relative for base-path independence`);
  }
}
for (const icon of manifest.icons || []) {
  if (!exists(inTarget(icon.src))) fail(`manifest icon missing: ${icon.src}`);
}
ok(`manifest.json valid (${(manifest.icons || []).length} icons)`);

/* 5 — android TWA project (repo root only) ------------------------------------ */
if (target === root) {
  const ad = path.join(root, 'android');
  const tm = path.join(ad, 'twa-manifest.json');
  if (!exists(tm)) fail('android/twa-manifest.json missing — run npm run android:generate');
  else {
    const twa = JSON.parse(fs.readFileSync(tm, 'utf8'));
    const sum = crypto.createHash('sha1').update(fs.readFileSync(tm)).digest('hex');
    const recorded = exists(path.join(ad, 'manifest-checksum.txt'))
      ? fs.readFileSync(path.join(ad, 'manifest-checksum.txt'), 'utf8').trim()
      : '';
    if (sum !== recorded) fail('android/manifest-checksum.txt is stale — run npm run android:generate');
    else ok('android checksum matches twa-manifest.json');

    for (const f of ['settings.gradle', 'build.gradle', 'gradlew', 'app/build.gradle',
      'app/src/main/AndroidManifest.xml', 'app/src/main/res/values/strings.xml']) {
      if (!exists(path.join(ad, f))) fail(`android/${f} missing — run npm run android:generate`);
    }

    const strings = fs.readFileSync(path.join(ad, 'app/src/main/res/values/strings.xml'), 'utf8');
    if (!strings.includes(`https://${twa.host}`)) fail('strings.xml assetStatements site does not match twa-manifest.json host');
    const gradle = fs.readFileSync(path.join(ad, 'app/build.gradle'), 'utf8');
    if (!gradle.includes(`hostName: '${twa.host}'`)) fail('app/build.gradle hostName does not match twa-manifest.json host');
    if (!gradle.includes(`launchUrl: '${twa.startUrl}'`)) fail('app/build.gradle launchUrl does not match twa-manifest.json startUrl');
    const am = fs.readFileSync(path.join(ad, 'app/src/main/AndroidManifest.xml'), 'utf8');
    if (!am.includes(twa.packageId)) fail('AndroidManifest.xml package mismatch');

    // well-formedness of the generated XML via python3 (present locally & in CI)
    const py = spawnSync('python3', ['-c', `
import sys, xml.etree.ElementTree as ET, glob
bad = []
for f in glob.glob(${JSON.stringify(ad)} + '/app/src/main/res/**/*.xml', recursive=True) + \
        glob.glob(${JSON.stringify(ad)} + '/app/src/main/*.xml'):
    try: ET.parse(f)
    except Exception as e: bad.append(f"{f}: {e}")
sys.exit(1 if bad else 0)
`]);
    if (py.status !== 0) fail(`android XML not well-formed:\n${py.stderr}`);
    else ok('android project files present, XML well-formed');
  }
}

if (failures) {
  console.error(`✗ ${failures} validation failure(s)`);
  process.exit(1);
}
console.log('◈ validation passed');
