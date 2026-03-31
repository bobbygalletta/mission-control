// Service worker — network-first, no caching
// Reloads page ONLY when a new version is detected (after a rebuild)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([
    caches.keys().then(k => Promise.all(k.map(caches.delete))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
