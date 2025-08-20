const RUNTIME_CACHE = 'skriptio-runtime-v4';

const isPreviewHost = self.location.origin.includes('preview.emergentagent.com');

self.addEventListener('install', (event) => {
  // On preview, do not keep a SW around. Clear caches and exit.
  if (isPreviewHost) {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.skipWaiting();
    })());
    return;
  }
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Always drop old caches
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== RUNTIME_CACHE ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
    if (isPreviewHost) {
      // In preview, unregister immediately so future loads are not SW-controlled
      try { await self.registration.unregister(); } catch (e) {}
    }
  })());
});

// Preview: pass-through network only; Production: lightweight runtime cache for same-origin GET (no HTML)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (isPreviewHost) {
    // Never cache on preview, just fetch
    return; // default browser fetch
  }
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