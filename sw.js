// Quart Service Worker — Quantum offline cache.
//
// Base-path independent: every precache entry is resolved against the
// service worker's own scope, so the same file works from
// https://example.com/ and https://user.github.io/Quart/ alike.
const CACHE = 'quart-v1.0.0';

const PRECACHE = [
  '',                 // the scope URL itself (dir landing page)
  'index.html',
  'manifest.json',
  'assets/favicon.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'src/styles/main.css',
  'src/quantum/engine.js',
  'src/quantum/particles.js',
  'src/quantum/audio.js',
  'src/themes/copic.js',
  'src/canvas/brushes.js',
  'src/canvas/renderer.js',
  'src/canvas/animation.js',
  'src/ui/puck.js',
  'src/ui/timeline-puck.js',
  'src/ui/palette-puck.js',
  'src/ui/tool-puck.js',
  'src/ui/layer-puck.js',
  'src/ui/export-puck.js',
  'src/ui/central-orb.js',
  'src/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(PRECACHE.map(p => new URL(p, self.registration.scope).href))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Only serve/cache http(s) requests for our own origin.
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      // Cache new same-origin assets dynamically.
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match(new URL('index.html', self.registration.scope).href)))
  );
});
