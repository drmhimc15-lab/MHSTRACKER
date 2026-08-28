const CACHE_NAME = "mhs-tracker-cache-v2";
const PRECACHE_URLS = [
  "./", "./index.html", "./manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly if we have it, and in the
// background fetch the network copy to refresh the cache for next time.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch((err) => {
        // No network AND nothing cached for this request -- let it fail as a
        // real network error instead of resolving to `undefined`, which the
        // Fetch API can't turn into a Response and used to break the request.
        if (cached) return cached;
        throw err;
      });

      return cached || fetchPromise;
    })
  );
});
