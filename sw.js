const CACHE = 'mahjong-calculator-v1.0.0';
const ASSETS = ['./','./index.html','./style.css','./app.mjs','./score.mjs','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('message',event => { if (event.data === 'activate') event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate',event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (key.startsWith('mahjong-calculator-') && key !== CACHE) await caches.delete(key);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch',event => {
  if (event.request.method !== 'GET' || !ASSETS.some(path => new URL(path,self.registration.scope).href === event.request.url)) return;
  event.respondWith(caches.open(CACHE).then(async cache => await cache.match(event.request) || fetch(event.request)));
});
