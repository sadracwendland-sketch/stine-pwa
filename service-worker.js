const CACHE_NAME = "stine-pwa-v3";

const FILES_TO_CACHE = [
  "/stine-pwa/",
  "/stine-pwa/index.html",
  "/stine-pwa/app.js",
  "/stine-pwa/style.css",
  "/stine-pwa/manifest.json",
  "/stine-pwa/logo-stine.png",
  "/stine-pwa/show_rural_coopavel.png",
  "/stine-pwa/instagram.png"
];

// INSTALAÇÃO
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// ATIVAÇÃO
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH — OFFLINE FIRST
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
