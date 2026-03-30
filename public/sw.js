// Service worker — network-first, no caching during debug
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
