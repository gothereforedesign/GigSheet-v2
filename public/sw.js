// Safe cleanup service worker: Immediately unregisters and clears all caches
// to ensure zero fetch hijacking or upload/rendering interference.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((clients) => {
        // Release all controlled clients
        for (const client of clients) {
          // Do not force reload, just release
        }
      })
      .catch((err) => {
        console.warn('SW cleanup error:', err);
      })
  );
});

// Pass-through: Do not intercept or block any network requests
self.addEventListener('fetch', () => {
  // Let the browser handle all network & worker requests naturally
});
