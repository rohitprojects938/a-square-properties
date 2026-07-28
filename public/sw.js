const CACHE_NAME = 'houserenter-pwa-cache-v132';
const ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/css/style.v132.css',
  '/js/main.v132.js',
  '/uploads/profile/default-avatar.png'
];

// Install Lifecycle
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching critical app shell assets.');
      return cache.addAll(ASSETS).catch(err => console.warn('Pre-cache warning: ', err.message));
    })
  );
  self.skipWaiting();
});

// Activate Lifecycle
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('🧹 Purging outdated cache: ', k);
            return caches.delete(k);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Interceptor
self.addEventListener('fetch', (e) => {
  // Only handle local GET requests, excluding API endpoints
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin) || e.request.url.includes('/api/')) {
    return;
  }

  // Network-First strategy for HTML documents to ensure user gets latest edits and query-params versions
  if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache-First strategy for static assets (images, CSS, JS, etc.)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback if offline
        });
    })
  );
});
