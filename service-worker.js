// Service Worker for caching brand logos and resources for offline access
const CACHE_NAME = 'wardrobe-cache-v7';
const LOGO_CACHE = 'wardrobe-logos-v7';

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

// Local static brand logo files to pre-cache
const BRAND_LOGOS_TO_CACHE = [
  '/assets/brand-logos/uniqlo.svg',
  '/assets/brand-logos/muji.svg',
  '/assets/brand-logos/zara.svg',
  '/assets/brand-logos/h-m.svg',
  '/assets/brand-logos/gap.svg',
  '/assets/brand-logos/levi-s.svg',
  '/assets/brand-logos/nike.svg',
  '/assets/brand-logos/adidas.svg',
  '/assets/brand-logos/puma.svg',
  '/assets/brand-logos/new-balance.svg',
  '/assets/brand-logos/converse.svg',
  '/assets/brand-logos/vans.svg',
  '/assets/brand-logos/skechers.svg',
  '/assets/brand-logos/anta.svg',
  '/assets/brand-logos/li-ning.svg',
  '/assets/brand-logos/fila.svg',
  '/assets/brand-logos/the-north-face.svg',
  '/assets/brand-logos/columbia.svg',
  '/assets/brand-logos/lululemon.svg',
  '/assets/brand-logos/massimo-dutti.svg',
  '/assets/brand-logos/mont-bell.svg',
  '/assets/brand-logos/arc-teryx.svg',
  '/assets/brand-logos/keen.svg',
  '/assets/brand-logos/nanamica.svg',
  '/assets/brand-logos/patagonia.svg',
  '/assets/brand-logos/mammut.svg',
  '/assets/brand-logos/salomon.svg',
  '/assets/brand-logos/merrell.svg',
  '/assets/brand-logos/hoka.svg',
  '/assets/brand-logos/on.svg',
  '/assets/brand-logos/black-diamond.svg',
  '/assets/brand-logos/snow-peak.svg',
  '/assets/brand-logos/deuter.svg',
  '/assets/brand-logos/osprey.svg',
  '/assets/brand-logos/jack-wolfskin.svg',
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
    }).then(() => {
      // Pre-cache local logos (do not fail install if some files are missing)
      return caches.open(LOGO_CACHE).then((cache) => {
        return Promise.allSettled(
          BRAND_LOGOS_TO_CACHE.map(url =>
            fetch(url)
              .then(response => cache.put(url, response))
              .catch(() => {/* Silent fail, logo will be fetched on demand */})
          )
        );
      });
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

  // Strategy: Cache first for local logos, Network first for app files
  if (url.pathname.startsWith('/assets/brand-logos/')) {
    // Logo caching: Cache first, fallback to network
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
        .then(response => {
          // Cache successful responses for future offline use
          if (response && response.status === 200 && response.type !== 'error') {
            const responseToCache = response.clone();
            caches.open(LOGO_CACHE).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return a placeholder if logo fetch fails
          return caches.match(request);
        })
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
