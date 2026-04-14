const VER = '3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([caches.keys().then(k => Promise.all(k.map(caches.delete))), self.clients.claim()]));
});
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
