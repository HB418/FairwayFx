// Network first, so a new push to GitHub shows up right away.
// Cached copies are only used when offline (or the network is very slow).
const CACHE = 'st-cache';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) {
    if (k !== CACHE) await caches.delete(k);
  }
  await self.clients.claim();
  const wins = await self.clients.matchAll({ type: 'window' });
  wins.forEach(w => { try { w.navigate(w.url); } catch (err) {} });
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isSound = url.pathname.indexOf('/sounds/') !== -1;
    if (isSound) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
    }
    try {
      const net = await Promise.race([
        fetch(req),
        new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))
      ]);
      if (net && net.ok && net.status === 200) cache.put(req, net.clone());
      return net;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const page = await cache.match('index.html') || await cache.match('./');
        if (page) return page;
      }
      throw err;
    }
  })());
});
