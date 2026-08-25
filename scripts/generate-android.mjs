#!/usr/bin/env node
/* ============================================================================
   Quart — deterministic TWA project generator

   Regenerates the whole `android/` Bubblewrap project from the canonical
   config committed at `android/twa-manifest.json`.  No prompts, no network
   calls except fetching the icon artwork, which can be redirected to any
   reachable mirror with --icon-base (used for offline/CI generation):

     node scripts/generate-android.mjs                          # production icon URLs
     node scripts/generate-android.mjs --icon-base http://127.0.0.1:8080/

   After generation the production `twa-manifest.json` is written back
   verbatim (normalized by @bubblewrap/core) and `manifest-checksum.txt` is
   refreshed so `bubblewrap build` considers the project up to date and never
   prompts.

   Requires: npm install   (devDependency @bubblewrap/cli brings in core)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(root, 'android');
const manifestPath = path.join(androidDir, 'twa-manifest.json');

const argv = process.argv.slice(2);
const flag = argv.indexOf('--icon-base');
const iconBase = flag >= 0 ? argv[flag + 1] : null;

const require = createRequire(import.meta.url);
const core = require('@bubblewrap/core');
const { TwaManifest, TwaGenerator, ConsoleLog } = core;

/* --- load the canonical manifest (before we wipe the directory) ----------- */
if (!fs.existsSync(manifestPath)) {
  console.error('✗ android/twa-manifest.json not found');
  process.exit(1);
}
const prodData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

/* --- redirect icon raster sources when requested -------------------------- */
/* The production origin serves the app under startUrl (e.g. /Quart/); a local
   mirror serves the repo root. Strip the production base before rebasing.   */
const prodBase = new URL(prodData.startUrl, `https://${prodData.host}`).pathname;
const rebase = (u) => {
  if (!u) return u;
  const pathname = new URL(u, 'https://origin.invalid').pathname;
  const rel = pathname.startsWith(prodBase) ? pathname.slice(prodBase.length) : pathname.replace(/^\/+/, '');
  return new URL(rel, iconBase).toString();
};
const genData = { ...prodData };
if (iconBase) {
  genData.iconUrl = rebase(prodData.iconUrl);
  genData.maskableIconUrl = rebase(prodData.maskableIconUrl);
  if (prodData.monochromeIconUrl) genData.monochromeIconUrl = rebase(prodData.monochromeIconUrl);
  if (prodData.webManifestUrl) genData.webManifestUrl = rebase(prodData.webManifestUrl);
  for (const sc of genData.shortcuts || []) {
    if (sc.chosenIconUrl) sc.chosenIconUrl = rebase(sc.chosenIconUrl);
    if (sc.chosenMaskableIconUrl) sc.chosenMaskableIconUrl = rebase(sc.chosenMaskableIconUrl);
  }
  console.log(`◈ raster/manifest sources redirected to ${iconBase}`);
}

/* --- wipe & regenerate ----------------------------------------------------- */
const log = new ConsoleLog('generate-android');
log.setVerbose && log.setVerbose(false);

/* Wipe everything except the canonical manifest so a failed run never
   destroys the source of truth. */
for (const entry of fs.readdirSync(androidDir)) {
  if (entry === 'twa-manifest.json' || entry === 'manifest-checksum.txt') continue;
  fs.rmSync(path.join(androidDir, entry), { recursive: true, force: true });
}

const genManifest = new TwaManifest(genData);
await new TwaGenerator().createTwaProject(androidDir, genManifest, log);

/* --- post-generation: restore production URLs ------------------------------
   The generator both FETCHES webManifestUrl (needs the redirected source) and
   EMBEDS it (app/build.gradle resValue + res/raw/web_app_manifest.json), where
   production values must win. Rewrite both deterministically. */
const base = new URL(prodData.startUrl, `https://${prodData.host}`);
const abs = (u) => new URL(u, base).toString();
const webManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
if (webManifest.start_url) webManifest.start_url = abs(webManifest.start_url);
if (webManifest.scope) webManifest.scope = abs(webManifest.scope);
if (webManifest.id) webManifest.id = abs(webManifest.id);
webManifest.icons = (webManifest.icons || []).map(i => ({ ...i, src: abs(i.src) }));
webManifest.screenshots = (webManifest.screenshots || []).map(s => ({ ...s, src: abs(s.src) }));
webManifest.shortcuts = (webManifest.shortcuts || []).map(s => ({ ...s, url: abs(s.url) }));
fs.writeFileSync(
  path.join(androidDir, 'app/src/main/res/raw/web_app_manifest.json'),
  JSON.stringify(webManifest, null, 2) + '\n');

if (iconBase && genData.webManifestUrl !== prodData.webManifestUrl) {
  const gradlePath = path.join(androidDir, 'app/build.gradle');
  const gradle = fs.readFileSync(gradlePath, 'utf8');
  fs.writeFileSync(gradlePath, gradle.split(genData.webManifestUrl).join(prodData.webManifestUrl));
}

/* --- persist production manifest + checksum ------------------------------- */
await new TwaManifest(prodData).saveToFile(manifestPath);
const checksum = crypto
  .createHash('sha1')
  .update(fs.readFileSync(manifestPath))
  .digest('hex');
fs.writeFileSync(path.join(androidDir, 'manifest-checksum.txt'), checksum);

console.log('◈ android/ TWA project generated');
console.log(`  package   ${prodData.packageId}  (v${prodData.appVersionCode} / ${prodData.appVersion})`);
console.log(`  origin    https://${prodData.host}${prodData.startUrl}`);
console.log(`  checksum  ${checksum}`);
