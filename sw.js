/* PROTOCOL service worker — offline + installable */
const CACHE = 'protocol-v12';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180-r2.png',
  './icons/icon-192-r2.png',
  './icons/icon-512-r2.png',
  './icons/icon-maskable-512-r2.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isDoc = req.mode === 'navigate'
    || req.destination === 'document'
    || (req.headers.get('accept') || '').includes('text/html');

  if (isDoc) {
    // network-first for the page so a new deploy reaches installed users immediately
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // cache-first for static assets (icons, manifest)
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => cached)
    )
  );
});
