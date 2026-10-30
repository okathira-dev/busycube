const CACHE_NAME = "poc-content-index-s970-v1";
const ITEM_ID = "busycube-poc-s970";
const scope = self.registration.scope;
const articleUrl = new URL("./article.html", scope).href;
const iconUrl = new URL("/icon-192.png", scope).href;
const eventUrl = new URL("./observed-contentdelete.json", scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll([articleUrl, iconUrl]);
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url !== articleUrl) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const saved = await cache.match(articleUrl);
      return saved ?? fetch(event.request);
    }),
  );
});

self.addEventListener("contentdelete", (event) => {
  if (!event.isTrusted || event.id !== ITEM_ID) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const record = {
        event: "contentdelete",
        isTrusted: event.isTrusted,
        id: event.id,
        observedAt: new Date().toISOString(),
        scope,
      };
      // Persist the real event before notifying pages; it survives closed tabs.
      await cache.put(eventUrl, new Response(JSON.stringify(record), {
        headers: { "Content-Type": "application/json" },
      }));
      await cache.delete(articleUrl);
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if (client.url.startsWith(scope)) client.postMessage({ type: "s970-event-recorded" });
      }
    })(),
  );
});
