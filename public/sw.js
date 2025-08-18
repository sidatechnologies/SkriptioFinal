const RUNTIME_CACHE = 'skriptio-runtime-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== RUNTIME_CACHE ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

// Lightweight runtime cache for same-origin GET requests (never cache HTML)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (!res || res.status !== 200) return res;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) return res; // don't cache HTML
      cache.put(req, res.clone());
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});