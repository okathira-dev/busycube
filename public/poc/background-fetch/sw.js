const CACHE_NAME = "poc-background-fetch-s960-v1";
const PREFIX = "busycube-poc-s960-";
const logUrl = new URL("./events.json", self.registration.scope).href;
const EXPECTED_BYTES = 65536;
const EXPECTED_SHA256 = "4b640d85ab3ba30fd02c9fc9db4a8928f416322ad27022ea58a65aaee68a4df2";
let queue = Promise.resolve();

self.addEventListener("install", (event) => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

function persist(record) {
  console.info(`[S960 SW] ${JSON.stringify(record)}`);
  queue = queue.catch(() => undefined).then(async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(logUrl);
    const records = response ? await response.json() : [];
    records.push(record);
    await cache.put(logUrl, new Response(JSON.stringify(records.slice(-32)), {
      headers: { "Content-Type": "application/json" },
    }));
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (client.url.startsWith(self.registration.scope)) client.postMessage({ type: "s960-event-recorded" });
    }
  });
  return queue;
}

async function observe(event) {
  const record = {
    at: new Date().toISOString(),
    event: event.type,
    isTrusted: event.isTrusted,
    id: event.registration.id,
    downloaded: event.registration.downloaded,
    downloadTotal: event.registration.downloadTotal,
    result: event.registration.result,
    failureReason: event.registration.failureReason,
    verified: false,
  };
  if (event.type === "backgroundfetchsuccess") {
    try {
      const entries = await event.registration.matchAll();
      if (entries.length !== 1) throw new Error(`Unexpected response count: ${entries.length}`);
      const response = await entries[0].responseReady;
      if (!response?.ok) throw new Error(`HTTP ${response?.status ?? "missing response"}`);
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      record.byteLength = bytes.byteLength;
      record.sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
      record.verified = bytes.byteLength === EXPECTED_BYTES && record.sha256 === EXPECTED_SHA256;
    } catch (error) {
      record.validationError = String(error);
    }
  }
  await persist(record);
}

for (const name of ["backgroundfetchsuccess", "backgroundfetchabort", "backgroundfetchfail"]) {
  self.addEventListener(name, (event) => {
    if (!event.isTrusted || !event.registration.id.startsWith(PREFIX)) return;
    event.waitUntil(observe(event));
  });
}

self.addEventListener("backgroundfetchclick", (event) => {
  if (!event.isTrusted || !event.registration.id.startsWith(PREFIX)) return;
  event.waitUntil((async () => {
    await persist({ at: new Date().toISOString(), event: event.type, isTrusted: event.isTrusted, id: event.registration.id });
    const url = new URL("./index.html", self.registration.scope).href;
    const clients = await self.clients.matchAll({ type: "window" });
    const current = clients.find((client) => client.url.startsWith(self.registration.scope));
    if (current) await current.focus();
    else await self.clients.openWindow(url);
  })());
});
