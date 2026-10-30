// @ts-nocheck
const DATABASE = "busycube-periodic-stage-v1";
const STORE = "plants-v2";
const TAG = "busycube-greenhouse-v2";
const LEGACY_TAG = "busycube-greenhouse-v1";
const CHANNEL = "busycube-greenhouse-v2";
const CACHE = "busycube-s740-bloom-v2";
const IMAGE = new URL("blossom.svg", self.location.href).href;
let tail = Promise.resolve();
const serial = (action) => { const result = tail.then(action); tail = result.catch(() => undefined); return result; };
const validNonce = (nonce) => typeof nonce === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce);
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Database unavailable"));
    request.onblocked = () => reject(new Error("Database upgrade blocked"));
  });
}
async function readState() {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE); const request = tx.objectStore(STORE).get("plant");
      let value = null;
      request.onsuccess = () => { const item = request.result; value = item && validNonce(item.nonce) && ["seed", "armed", "bloom"].includes(item.phase) ? item : null; };
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Read failed"));
    });
  } finally { db.close(); }
}
async function writeState(value) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(value);
      tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Write failed"));
    });
  } finally { db.close(); }
}
async function unregister() {
  try {
    if (!self.registration.periodicSync) return false;
    await self.registration.periodicSync.unregister(TAG);
    return true;
  } catch { return false; }
}
async function view() {
  const state = await readState();
  if (state?.phase !== "bloom") {
    if (state?.phase === "seed") await unregister();
    return { nonce: state?.nonce ?? null, phase: state?.phase ?? "empty", image: null, cleanupPending: false };
  }
  const cache = await caches.open(CACHE);
  const image = await cache.match(IMAGE);
  const cleanupPending = !(await unregister());
  return { nonce: state.nonce, phase: "bloom", image: image?.ok ? await image.blob() : null, cleanupPending };
}
async function grow() {
  const state = await readState();
  if (state?.phase === "bloom") { await unregister(); return; }
  if (state?.phase !== "armed") return;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (windows.length !== 0) return;
  const response = await fetch(IMAGE, { cache: "no-store" });
  if (!response.ok || !response.headers.get("content-type")?.includes("image/svg+xml")) throw new Error("Bloom image unavailable");
  const blob = await response.clone().blob();
  if (!blob.size || blob.size > 128 * 1024) throw new Error("Invalid bloom image");
  if ((await self.clients.matchAll({ type: "window", includeUncontrolled: true })).length !== 0) return;
  const cache = await caches.open(CACHE);
  await cache.put(IMAGE, response);
  // A persisted image precedes the durable completion record. Neither alone is
  // accepted by the page, and registration cleanup comes only after both.
  await writeState({ key: "plant", nonce: state.nonce, phase: "bloom" });
  await unregister();
}
self.addEventListener("install", (event) => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    try { await self.registration.periodicSync?.unregister(LEGACY_TAG); } catch {}
  })());
});
self.addEventListener("periodicsync", (event) => {
  if (!event.isTrusted || event.tag !== TAG) return;
  event.waitUntil(serial(grow));
});
self.addEventListener("message", (event) => {
  if (!event.isTrusted || event.data?.channel !== CHANNEL || !event.ports[0]) return;
  const data = event.data, port = event.ports[0];
  event.waitUntil(serial(async () => {
    try {
      const source = event.source;
      const url = new URL(source?.url ?? "");
      if (source?.type !== "window" || url.origin !== self.location.origin || url.pathname !== "/" || url.searchParams.get("stage") !== "S-740") throw new Error("Invalid client");
      if (data.action === "prepare") {
        if (!validNonce(data.nonce)) throw new Error("Invalid trial");
        await writeState({ key: "plant", nonce: data.nonce, phase: "seed" });
        await caches.delete(CACHE);
      } else if (data.action === "arm") {
        const current = await readState();
        if (!current || current.nonce !== data.nonce || current.phase !== "seed") throw new Error("Trial replaced");
        await writeState({ ...current, phase: "armed" });
      } else if (data.action !== "read") throw new Error("Unknown action");
      port.postMessage({ channel: CHANNEL, ok: true, value: await view() });
    } catch { port.postMessage({ channel: CHANNEL, ok: false }); }
    finally { port.close(); }
  }));
});
