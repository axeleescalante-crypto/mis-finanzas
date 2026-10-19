// Guarda la app en el teléfono para que abra al instante y funcione sin internet.
// Cambia CACHE (y VERSION en js/version.js) cada vez que publiques cambios.
const CACHE = 'mis-finanzas-1.7.2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/actions.js',
  './js/calc.js',
  './js/charts.js',
  './js/components.js',
  './js/format.js',
  './js/store.js',
  './js/version.js',
  './js/xlsx-export.js',
  './js/views/common.js',
  './js/views/debts.js',
  './js/views/home.js',
  './js/views/month.js',
  './js/views/settings.js',
  './js/views/sheets.js',
  './js/views/tour.js',
  './js/views/welcome.js',
  './js/views/year.js',
  './vendor/fflate.js',
  './vendor/preact-htm.js',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

// La versión nueva se activa sola (en iPhone el aviso de actualizar no siempre aparece).
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mis-finanzas-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((res) => res || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((res) => res || fetch(req)));
});
