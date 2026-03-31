// Service worker — network-first, no caching
// Auto-reloads all tabs when a new version is deployed
const VER = '2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Check for new SW version every 5 seconds
let lastVer = VER;
const checkVersion = () => {
  fetch('/sw.js?v=' + Date.now(), { cache: 'no-store' })
    .then(r => r.text())
    .then(text => {
      const m = text.match(/const VER = '(\d+)'/);
      if (m && m[1] !== lastVer) {
        lastVer = m[1];
        self.clients.matchAll().then(clients => clients.forEach(c => c.navigate(c.url)));
      }
    })
    .catch(() => {});
};
setInterval(checkVersion, 5000);
