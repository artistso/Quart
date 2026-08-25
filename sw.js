// Quart Service Worker - Quantum offline cache
const CACHE = 'quart-v0.1.0';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/styles/main.css',
  '/src/quantum/engine.js',
  '/src/quantum/particles.js',
  '/src/quantum/audio.js',
  '/src/themes/copic.js',
  '/src/canvas/brushes.js',
  '/src/canvas/renderer.js',
  '/src/canvas/animation.js',
  '/src/ui/puck.js',
  '/src/ui/timeline-puck.js',
  '/src/ui/palette-puck.js',
  '/src/ui/tool-puck.js',
  '/src/ui/layer-puck.js',
  '/src/ui/export-puck.js',
  '/src/ui/central-orb.js',
  '/src/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
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
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      // Cache new assets dynamically
      if (resp.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('/index.html')))
  );
});
