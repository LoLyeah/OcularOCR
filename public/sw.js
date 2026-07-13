const APP_CACHE_PREFIX = 'ocular-app-cache-';
const APP_CACHE_NAME = `${APP_CACHE_PREFIX}v3`;
const LANGUAGE_CACHE_NAME = 'ocular-language-cache-v1';
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/pdf.worker.min.mjs',
  '/tesseract/worker.min.js',
  '/tesseract-core/tesseract-core-lstm.wasm.js',
  '/tesseract-core/tesseract-core-simd-lstm.wasm.js',
  '/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  '/tessdata/eng.traineddata.gz',
  '/tessdata/ind.traineddata.gz',
];

async function cacheResponse(cache, request, options) {
  try {
    const response = await fetch(request, options);
    if (response?.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return undefined;
  }
}

async function cacheOfflineShell() {
  const cache = await caches.open(APP_CACHE_NAME);
  const rootResponse = await cacheResponse(cache, '/', { cache: 'reload' });
  const discoveredChunks = [];
  if (rootResponse?.ok) {
    const html = await rootResponse.clone().text();
    const matches = html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g);
    for (const match of matches) discoveredChunks.push(new URL(match[1], self.location.origin).pathname);
  }

  const assets = [...new Set([...CORE_ASSETS.filter((asset) => asset !== '/'), ...discoveredChunks])];
  await Promise.allSettled(assets.map((asset) => cacheResponse(cache, asset, { cache: 'reload' })));
  return assets;
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheOfflineShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(APP_CACHE_PREFIX) && key !== APP_CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_OFFLINE_ASSETS') {
    event.waitUntil(cacheOfflineShell().then(async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.postMessage({ type: 'OFFLINE_CACHE_UPDATED' }));
    }));
  }
});

async function cacheFirst(request, cacheName = APP_CACHE_NAME) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(cacheName);
  const response = await fetch(request);
  if (response?.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(APP_CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response?.ok) await cache.put('/', response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match('/')) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const cache = await caches.open(APP_CACHE_NAME);
  const network = fetch(request).then((response) => {
    if (response?.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  }).catch(() => undefined);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.includes('webpack') || url.pathname.includes('hot-reloader')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
  } else if (url.pathname.startsWith('/tessdata-dynamic/')) {
    const bundledMatch = /^\/tessdata-dynamic\/(eng|ind)\.traineddata\.gz$/.exec(url.pathname);
    event.respondWith(
      bundledMatch
        ? caches.match(`/tessdata/${bundledMatch[1]}.traineddata.gz`).then((cached) => cached || cacheFirst(event.request, LANGUAGE_CACHE_NAME))
        : cacheFirst(event.request, LANGUAGE_CACHE_NAME),
    );
  } else if (url.pathname.startsWith('/_next/static/') || CORE_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
  } else {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
