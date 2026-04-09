// ============================================================
//  PopDulce Service Worker – v3
//  Solo caché PWA. Sin FCM (notificaciones internas vía Firestore).
// ============================================================

const CACHE    = "popdulce-v3";
const PRECACHE = ["/", "/index.html", "/css/main.css", "/css/catalog.css", "/assets/logo.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});