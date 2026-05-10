const CACHE_NAME = "party-hall-v1";
const IMAGE_CACHE = "party-hall-images";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只缓存图片
  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
  }
});
