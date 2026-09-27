const CACHE = "myrqo-shell-v1";
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/", "/icons/icon-192.png", "/icons/icon-512.png"]))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.url.includes("/_next/data") || request.url.includes("/api/") || request.url.includes("supabase")) return;
  event.respondWith(fetch(request).catch(() => caches.match(request).then(response => response || caches.match("/"))));
});
