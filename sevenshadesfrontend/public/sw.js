const CACHE = 'doordrape-assets-v1';
const eligible = request => {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin &&
    request.mode !== 'navigate' && /^\/assets\/[^?]+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|webp|avif|svg)$/.test(url.pathname);
};
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('doordrape-assets-') && key !== CACHE).map(key => caches.delete(key))))
));
self.addEventListener('fetch', event => {
  if (!eligible(event.request)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && response.type === 'basic' && !/no-store|private/i.test(response.headers.get('cache-control') || '')) {
      const copy = response.clone();
      event.waitUntil((async () => {
        await cache.put(event.request, copy);
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - 80)).map(key => cache.delete(key)));
      })().catch(() => {}));
    }
    return response;
  })());
});
