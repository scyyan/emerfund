// Offline support: keeps a copy of the app's files so it opens without internet.
// VERSION changes automatically whenever the app files change, so phones pick up updates.
const VERSION = 'efund-a7d22ad1ab';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's own HTTP cache so a new version never stores old files
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Network first so updates arrive, but after 2.5 seconds (weak signal) show the saved copy;
// the network request still finishes in the background and refreshes the saved copy.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // A fresh Request (not e.request) because page loads can't be given a cache option directly.
  const key = new URL(e.request.url); key.search = '';   // one saved entry per file
  const network = fetch(new Request(e.request.url, {cache: 'no-cache'})).then(res => {
    if (res.status === 200) {
      const copy = res.clone();
      e.waitUntil(caches.open(VERSION).then(c => c.put(key.href, copy)).catch(() => {}));
    }
    return res;
  });
  const saved = () => caches.match(key.href).then(r => r || (e.request.mode === 'navigate' ? caches.match('./') : undefined));
  const slow = new Promise((_, reject) => setTimeout(reject, 2500));
  e.respondWith(Promise.race([network, slow]).catch(() => saved().then(r => r || network)));
  e.waitUntil(network.catch(() => {}));
});
