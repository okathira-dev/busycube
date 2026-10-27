const channel = "busycube-content-v1";
const stateCache = "busycube-s970-state-v1", contentCache = "busycube-s970-content-v1";
const scope = self.registration.scope, stateUrl = new URL("./state.json", scope).href;
const prefix = "busycube-s970-";
const idValid = (id) => typeof id === "string" && /^busycube-s970-[0-9a-f-]{36}$/i.test(id);
const assetUrls = ["./saved.js", "./saved.css", "/icon.svg", "/icon-192.png"].map((path) => new URL(path, scope).href);
let tail = Promise.resolve();
function serial(action) { const next = tail.catch(() => {}).then(action); tail = next; return next; }
function empty() { return { version: 1, id: null, url: null, status: "idle", saved: false, openId: null, deleteId: null, cleanupPending: false }; }
async function read() {
  const cache = await caches.open(stateCache), response = await cache.match(stateUrl);
  if (!response) return empty();
  const state = await response.json();
  if (state?.version !== 1 || !["idle", "preparing", "saved", "deleted", "failed"].includes(state.status) || (state.id !== null && !idValid(state.id)) || (state.openId !== null && !idValid(state.openId)) || (state.deleteId !== null && !idValid(state.deleteId)) || typeof state.saved !== "boolean" || typeof state.cleanupPending !== "boolean") throw new Error("Invalid content state");
  return state;
}
async function write(state) {
  const cache = await caches.open(stateCache);
  await cache.put(stateUrl, new Response(JSON.stringify(state), { headers: { "Content-Type": "application/json" } }));
}
function source(client) {
  try { const url = new URL(client.url); if (client.type !== "window" || url.origin !== self.location.origin) return null;
    if (["/", "/index.html"].includes(url.pathname) && url.searchParams.get("stage") === "S-970") return "stage";
    if (url.pathname === new URL("./saved.html", scope).pathname) return "saved";
  } catch {}
  return null;
}
async function notify() {
  for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) if (source(client) === "stage") client.postMessage({ channel, type: "changed" });
}
async function cleanupEntries(currentId) {
  const entries = await self.registration.index.getAll();
  for (const entry of entries) if (idValid(entry.id) && entry.id !== currentId) await self.registration.index.delete(entry.id);
}
async function save(locale) {
  const manager = self.registration.index;
  if (!manager) throw new Error("Content Index unavailable");
  const state = await read(), id = prefix + crypto.randomUUID();
  const url = new URL("./saved.html", scope); url.searchParams.set("entry", id.slice(prefix.length)); url.searchParams.set("locale", locale);
  const priorUrl = state.url;
  state.id = id; state.url = url.href; state.status = "preparing"; state.saved = false;
  await write(state);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let assets;
    try { assets = await Promise.all([url.href, ...assetUrls].map(async (href) => {
      const response = await fetch(href, { cache: "no-store", signal: controller.signal });
      if (!response.ok || response.type === "opaque") throw new Error("Offline content unavailable");
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 256 * 1024) throw new Error("Invalid offline content");
      return [href, new Response(bytes, { status: response.status, headers: response.headers })];
    })); } finally { clearTimeout(timer); controller.abort(); }
    const cache = await caches.open(contentCache);
    for (const [href, response] of assets) await cache.put(href, response);
    await manager.add({ id, title: locale === "ja" ? "Busycube — オフラインコンテンツ" : "Busycube — Offline content", description: "Busycube", category: "article", icons: [{ src: new URL("/icon-192.png", scope).href, sizes: "192x192", type: "image/png" }], url: url.href });
    state.saved = true; state.status = "saved"; state.cleanupPending = false;
    await write(state);
    try { await cleanupEntries(id); if (priorUrl && priorUrl !== url.href) await cache.delete(priorUrl); }
    catch { state.cleanupPending = true; await write(state); }
    await notify(); return state;
  } catch (error) { state.status = "failed"; await write(state); throw error; }
}
async function removeContent(id) {
  const state = await read();
  if (!state.saved || state.id !== id) return;
  state.status = "deleted"; state.deleteId = id;
  // Keep the real-event receipt outside the content cache being removed.
  await write(state); await caches.delete(contentCache); await notify();
}
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url), savedPath = new URL("./saved.html", scope).pathname;
  if (url.origin !== self.location.origin || (url.pathname !== savedPath && !assetUrls.includes(url.href))) return;
  event.respondWith((async () => { const cache = await caches.open(contentCache), response = await cache.match(event.request, { ignoreVary: true }); return response ?? fetch(event.request); })());
});
self.addEventListener("contentdelete", (event) => {
  if (!event.isTrusted || !idValid(event.id)) return;
  event.waitUntil(serial(() => removeContent(event.id)));
});
self.addEventListener("message", (event) => {
  const data = event.data, port = event.ports?.[0], from = source(event.source);
  if (!event.isTrusted || !from || data?.channel !== channel || typeof data.requestId !== "string" || !port) return;
  event.waitUntil(serial(async () => {
    try {
      let state;
      if (data.action === "save" && from === "stage") state = await save(data.locale === "ja" ? "ja" : "en");
      else if (data.action === "read") state = await read();
      else if (data.action === "open" && from === "saved") {
        state = await read();
        if (!state.saved || !state.id || event.source.url !== state.url) throw new Error("Unregistered content page");
        state.openId = state.id; await write(state); await notify();
      } else throw new Error("Unknown content action");
      port.postMessage({ channel, requestId: data.requestId, ok: true, value: state });
    } catch { port.postMessage({ channel, requestId: data.requestId, ok: false }); }
    finally { port.close(); }
  }));
});
