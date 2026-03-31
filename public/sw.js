const CACHE = 'mc-v1';

// Install: activate immediately
self.addEventListener('install', () => self.skipWaiting());

// Activate: claim all clients immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))),
      self.clients.claim(),
    ])
  );
});

// Fetch: network-first, never serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
