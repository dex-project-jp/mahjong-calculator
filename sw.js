const CACHE = 'mahjong-calculator-mahjong-lab-2';
const TILE_ASSETS = ['Pin','Sou'].flatMap(suit =>
  Array.from({length:9},(_,i) => './tiles/' + suit + (i+1) + '.svg'));
const ASSETS = ['./','./index.html','./style.css?v=mahjong-lab-1','./app.mjs?v=1.0.10','./score.mjs','./yaku.mjs','./yaku.mjs?v=1.0.10','./yaku-guide.html','./yaku-guide.mjs','./yaku-guide.mjs?v=1.0.10','./manifest.webmanifest','./icon-192.png?v=mahjong-lab-1','./icon-512.png?v=mahjong-lab-1','./apple-touch-icon.png?v=mahjong-lab-1','./favicon-32.png?v=mahjong-lab-1','./favicon.ico?v=mahjong-lab-1',...TILE_ASSETS];
self.addEventListener('install',event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new Request(path,{cache:'reload'}))))));
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
