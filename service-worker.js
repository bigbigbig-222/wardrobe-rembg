// Service Worker for caching brand logos and resources for offline access
const CACHE_NAME = 'wardrobe-cache-v1';
const LOGO_CACHE = 'wardrobe-logos-v1';

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/brand_logos_cdn.js',
  '/backgroundremoval.min.js',
];

// List of brand logo URLs to pre-cache
const BRAND_LOGOS_TO_CACHE = [
  'https://logo.clearbit.com/uniqlo.com',
  'https://logo.clearbit.com/muji.com',
  'https://logo.clearbit.com/zara.com',
  'https://logo.clearbit.com/hm.com',
  'https://logo.clearbit.com/gap.com',
  'https://logo.clearbit.com/levi.com',
  'https://logo.clearbit.com/nike.com',
  'https://logo.clearbit.com/adidas.com',
  'https://logo.clearbit.com/puma.com',
  'https://logo.clearbit.com/newbalance.com',
  'https://logo.clearbit.com/converse.com',
  'https://logo.clearbit.com/vans.com',
  'https://logo.clearbit.com/skechers.com',
  'https://logo.clearbit.com/antasports.com',
  'https://logo.clearbit.com/lining.com',
  'https://logo.clearbit.com/fila.com',
  'https://logo.clearbit.com/thenorthface.com',
  'https://logo.clearbit.com/columbia.com',
  'https://logo.clearbit.com/lululemon.com',
  'https://logo.clearbit.com/massimodutti.com',
  'https://logo.clearbit.com/montbell.jp',
  'https://logo.clearbit.com/arcteryx.com',
  'https://logo.clearbit.com/keenfootwear.com',
  'https://logo.clearbit.com/nanamica.com',
  'https://logo.clearbit.com/patagonia.com',
  'https://logo.clearbit.com/mammut.com',
  'https://logo.clearbit.com/salomon.com',
  'https://logo.clearbit.com/merrell.com',
  'https://logo.clearbit.com/hoka.com',
  'https://logo.clearbit.com/on.com',
  'https://logo.clearbit.com/blackdiamondequipment.com',
  'https://logo.clearbit.com/snowpeak.com',
  'https://logo.clearbit.com/deuter.com',
  'https://logo.clearbit.com/osprey.com',
  'https://logo.clearbit.com/jack-wolfskin.com',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => {
      // Try to pre-cache logos (but don't fail if network is unavailable)
      return caches.open(LOGO_CACHE).then((cache) => {
        return Promise.allSettled(
          BRAND_LOGOS_TO_CACHE.map(url =>
            fetch(url, { mode: 'no-cors' })
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

  // Only handle our domain
  if (url.origin !== self.location.origin && !url.href.includes('clearbit.com')) {
    return;
  }

  // Strategy: Cache first for logos, Network first for app files
  if (url.href.includes('logo.clearbit.com')) {
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
        .catch(() => caches.match(request))
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
