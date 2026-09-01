// Minimal service worker — just needs to exist and handle fetch for installability.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  // Network-first, no caching — keeps live data fresh (balances, ads, etc.)
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
