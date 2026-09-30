const CACHE_NAME = 'lifeos-app-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: NEVER cache API responses or POST/PUT/PATCH/DELETE mutations
  if (url.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return;
  }

  // Network first with fallback to cache for app shell
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
