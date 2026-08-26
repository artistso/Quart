// Quart Service Worker — Quantum offline cache (v0.2.0)
// All paths are resolved relative to the SW scope, so this works at any
// hosting depth (GitHub Pages project sites, subdirectories, APK shell).
const CACHE = 'quart-v0.2.0';
const BASE = new URL(self.registration.scope);

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/styles/main.css',
  './src/platform/io.js',
  './src/quantum/engine.js',
  './src/quantum/particles.js',
  './src/quantum/audio.js',
  './src/themes/copic.js',
  './src/canvas/brushes.js',
  './src/canvas/renderer.js',
  './src/canvas/animation.js',
  './src/ui/puck.js',
  './src/ui/timeline-puck.js',
  './src/ui/palette-puck.js',
  './src/ui/tool-puck.js',
  './src/ui/layer-puck.js',
  './src/ui/export-puck.js',
  './src/ui/central-orb.js',
  './src/main.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ASSETS.map(p => c.add(new URL(p, BASE).href).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  if (!sameOrigin) return; // let CDN fonts etc. hit the network directly

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r =>
      r || fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Navigation fallback → cached shell
        if (e.request.mode === 'navigate') {
          return caches.match(new URL('./index.html', BASE).href);
        }
        return Response.error();
      })
    )
  );
});
