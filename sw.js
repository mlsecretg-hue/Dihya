// Cache-first service worker so the app opens with no network in the field.
const CACHE = 'dihya-v10';
const ASSETS = ['./', 'index.html', 'styles.css', 'i18n.js', 'landing.js', 'auth.js', 'app.js', 'assistant.js', 'localize.js', 'config.js', 'vendor/qrcode.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // weather API goes to the network
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
