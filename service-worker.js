// Service Worker for caching app resources and proxied real brand logos.
const CACHE_NAME = 'wardrobe-cache-v8';
const LOGO_CACHE = 'wardrobe-logos-v8';

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/mobile-optimization.css',
  '/manifest.webmanifest?v=3',
  '/apple-touch-icon-v3.png',
  '/favicon-v3.png',
  '/assets/MyWardrobe-ico.png',
  '/brand_logos_cdn.js',
  '/cropper.min.js',
  '/cropper.min.css',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        URLS_TO_CACHE.map((url) =>
          fetch(url)
            .then((response) => {
              if (!response || !response.ok) {
                throw new Error(`cache-failed:${url}`);
              }
              return cache.put(url, response);
            })
            .catch(() => {
              // Ignore individual failures so one missing file does not break SW install.
            })
        )
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Strategy: Cache first for proxied logo API, Network first for app files
  if (url.pathname.startsWith('/api/logo')) {
    event.respondWith(
      caches.open(LOGO_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }

        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => caches.match(request))
    );
  } else {
    // App resources: Network first, fallback to cache
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          if (request.mode === 'navigate') {
            const cachedIndex = await caches.match('/index.html');
            if (cachedIndex) {
              return cachedIndex;
            }
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== LOGO_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
