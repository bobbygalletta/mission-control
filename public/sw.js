const CACHE_NAME = 'mc-static-v2';

// Install: activate immediately, don't wait
self.addEventListener('install', () => self.skipWaiting());

// Activate: claim all clients and force refresh
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      // Delete all old caches so stale assets are not used
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
      self.clients.claim(),
      // Force refresh ALL open tabs when this worker activates
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      }),
    ])
  );
});

// Fetch: network-first for HTML (always fresh), cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML: always go network, never cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
