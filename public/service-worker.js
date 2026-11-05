// @ts-nocheck -- This standalone file executes in ServiceWorkerGlobalScope, while
// the repository TypeScript project intentionally targets the Window DOM library.
const workerUrl = new URL(self.location.href);
const developmentMode = workerUrl.searchParams.get("mode") === "development";
const cachePrefix = "busycube-";
const cacheVersion = "v7";
const shellCacheName = `${cachePrefix}shell-${cacheVersion}`;
const assetCacheName = `${cachePrefix}assets-${cacheVersion}`;
const scopeUrl = new URL(self.registration.scope);
const shellUrl = new URL("./", scopeUrl).href;
const assetPath = new URL("./assets/", scopeUrl).pathname;
const shellFiles = [
  "./",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./licenses/index.html",
  "./licenses/localize.js",
  "./licenses/jsqr-Apache-2.0.txt",
  "./licenses/mediabunny-MPL-2.0.txt",
  "./licenses/unifont-OFL-1.1.txt",
];
const mutableShellUrls = new Set(
  shellFiles.map((path) => new URL(path, scopeUrl).href),
);
const immutableAssetPattern =
  /\/[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,}\.(?:css|js|json|wasm)$/;

function isImmutableBuildAsset(url) {
  return (
    url.origin === self.location.origin &&
    url.pathname.startsWith(assetPath) &&
    immutableAssetPattern.test(url.pathname)
  );
}

function canStore(response) {
  return response.ok && response.type !== "opaque";
}

async function networkFirst(request, cacheName, fallbackUrl = request.url) {
  try {
    const response = await fetch(request);
    if (canStore(response)) {
      const cache = await caches.open(cacheName);
      await cache.put(fallbackUrl, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(fallbackUrl);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(assetCacheName);
  // Content hash付き同一origin assetは同じ内容。precacheとmodule requestの
  // Origin差（Vite previewのVary: Origin等）でoffline hitを失わない。
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (canStore(response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function precacheProductionShell() {
  const shellCache = await caches.open(shellCacheName);
  await shellCache.addAll(shellFiles);

  // Vite writes content-hashed entry scripts, modulepreloads, and styles into
  // index.html. Discovering them at install time keeps the first offline reload
  // usable without coupling this static worker to a particular build hash.
  const shellResponse = await shellCache.match(shellUrl);
  if (!shellResponse) throw new Error("Busycube shell was not cached");
  const html = await shellResponse.text();
  const references = Array.from(
    html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g),
    (match) => new URL(match[1], shellUrl),
  );
  const entryAssets = [
    ...new Set(
      references
        .filter((url) => isImmutableBuildAsset(url))
        .map((url) => url.href),
    ),
  ];
  const assetCache = await caches.open(assetCacheName);
  if (entryAssets.length > 0) await assetCache.addAll(entryAssets);
}

self.addEventListener("install", (event) => {
  if (developmentMode) {
    // The development worker exists for notification/PWA stage APIs, but it must
    // replace an old cache-first worker immediately and never precache Vite source.
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(precacheProductionShell());
});

self.addEventListener("activate", (event) => {
  const currentCaches = new Set([shellCacheName, assetCacheName]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                /^busycube-(?:shell|assets)-v\d+$/.test(key) &&
                (developmentMode || !currentCaches.has(key)),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const offlineBeaconDatabase = "busycube-offline-beacon";
const offlineBeaconStore = "receipts";

function openOfflineBeaconDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(offlineBeaconDatabase, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(offlineBeaconStore, { keyPath: "nonce" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeOfflineBeaconReceipt(nonce) {
  const database = await openOfflineBeaconDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(offlineBeaconStore, "readwrite");
    transaction.objectStore(offlineBeaconStore).put({ nonce });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function receiveOfflineBeacon(request) {
  const payloadRequest = request.clone();
  const probeUrl = new URL(
    `./offline-beacon/network-probe?nonce=${crypto.randomUUID()}`,
    self.location.href,
  );
  try {
    await fetch(probeUrl.href, { cache: "no-store", credentials: "omit" });
    return new Response("network reachable", { status: 409 });
  } catch {
    // A failed network-only fetch is the worker-side offline gate. Continue
    // with the Beacon body only after the origin is unreachable.
  }
  let payload;
  try {
    payload = await payloadRequest.json();
  } catch {
    return new Response("invalid receipt", { status: 400 });
  }
  if (typeof payload?.nonce !== "string" || payload.nonce.length < 16) {
    return new Response("invalid receipt", { status: 400 });
  }
  await storeOfflineBeaconReceipt(payload.nonce);
  return new Response(null, { status: 204 });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method === "POST" &&
    url.origin === self.location.origin &&
    url.pathname.endsWith("/offline-beacon/receipt")
  ) {
    event.respondWith(receiveOfflineBeacon(request));
    return;
  }

  // Vite still needs a worker for notification flows during development. Leaving
  // fetch unhandled makes every module/HMR request use the network normally.
  if (developmentMode) return;

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  const isBusycubeNavigation =
    request.mode === "navigate" &&
    (url.pathname === scopeUrl.pathname ||
      url.pathname === new URL("./index.html", scopeUrl).pathname);
  if (isBusycubeNavigation) {
    // HTML is mutable: prefer the deployed version, then fall back to the one
    // canonical shell response. Query-string stage routes share that fallback.
    event.respondWith(networkFirst(request, shellCacheName, shellUrl));
    return;
  }

  if (mutableShellUrls.has(url.href)) {
    event.respondWith(networkFirst(request, shellCacheName));
    return;
  }

  if (isImmutableBuildAsset(url)) {
    // Vite content-hashed assets are immutable, so cache-first is safe and lets
    // previously loaded lazy stage chunks work offline.
    event.respondWith(cacheFirst(request));
  }
});

async function markS090NotificationClicked(nonce) {
  const database = await new Promise((resolve, reject) => {
    let abandoned = false;
    const request = indexedDB.open("busycube-notification-receipts", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("attempts")) request.result.createObjectStore("attempts");
    };
    request.onsuccess = () => { if (abandoned) request.result.close(); else resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { abandoned = true; reject(new Error("Notification storage blocked")); };
  });
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("attempts", "readwrite");
    const store = transaction.objectStore("attempts");
    let accepted = false;
    const request = store.get("S-090");
    request.onsuccess = () => {
      const value = request.result;
      if (value?.nonce !== nonce || value.state !== "pending") return;
      store.put({ nonce, state: "clicked" }, "S-090");
      accepted = true;
    };
    transaction.oncomplete = () => { database.close(); resolve(accepted); };
    transaction.onerror = transaction.onabort = () => { database.close(); reject(transaction.error); };
  });
}

const vaultChannel = "busycube-vault-v1";
const vaultTag = "busycube-S-420-v1";
let vaultQueue = Promise.resolve();
function queueVault(action) {
  const pending = vaultQueue.then(action);
  vaultQueue = pending.catch(() => {});
  return pending;
}
function validVaultNonce(value) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
async function vaultDatabase() {
  return new Promise((resolve, reject) => {
    let abandoned = false;
    const request = indexedDB.open("busycube-notification-vault-v1", 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("attempts")) request.result.createObjectStore("attempts"); };
    request.onsuccess = () => { if (abandoned) request.result.close(); else resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { abandoned = true; reject(new Error("Vault storage blocked")); };
  });
}
async function vaultStore(value) {
  const database = await vaultDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("attempts", "readwrite");
    const store = transaction.objectStore("attempts");
    let result;
    if (value !== undefined) { store.put(value, "current"); result = value; }
    else { const read = store.get("current"); read.onsuccess = () => { result = read.result; }; }
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = transaction.onabort = () => { database.close(); reject(transaction.error); };
  });
}
async function vaultTarget(installationId) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`busycube:notification-vault:S-420:1\0${installationId}`)));
  return Array.from({ length: 5 }, (_, index) => (digest[0] & (1 << index)) ? "R" : "L").join("");
}
function vaultSnapshot(record, claim = false) {
  if (!record) return null;
  return { nonce: record.nonce, revision: record.revision, input: record.input, phase: record.phase, verdict: record.phase === "ended" ? record.verdict : null, won: claim && record.won === true && record.credited !== true };
}
async function closeVaultNotifications() {
  for (const tag of [vaultTag, "busycube-S-410", "busycube-S-420"]) {
    for (const notification of await self.registration.getNotifications({ tag })) notification.close();
  }
}
async function showVaultNotification(record) {
  await self.registration.showNotification("Busycube · 🔒", {
    body: record.locale === "en" ? "Try" : "試す",
    tag: vaultTag,
    renotify: true,
    actions: [{ action: "left", title: "←" }, { action: "right", title: "→" }],
    data: { kind: vaultChannel, stage: "S-420", nonce: record.nonce, step: record.input.length },
  });
}
async function hintVaultOwner(record) {
  const owner = await self.clients.get(record.owner);
  owner?.postMessage({ type: vaultChannel, nonce: record.nonce });
}
function vaultOwnedSource(source) {
  if (source?.type !== "window" || typeof source.id !== "string") return false;
  try { const url = new URL(source.url); return url.origin === scopeUrl.origin && url.href.startsWith(self.registration.scope); } catch { return false; }
}
async function vaultMessage(data, source) {
  if (!validVaultNonce(data.nonce) || !vaultOwnedSource(source) || typeof data.installationId !== "string" || !data.installationId.trim()) throw new Error("Invalid vault request");
  let record = await vaultStore();
  if (data.action === "start") {
    record = { nonce: data.nonce, installationId: data.installationId, owner: source.id, locale: data.locale === "en" ? "en" : "ja", input: "", revision: 0, phase: "starting" };
    await vaultStore(record);
    try { await closeVaultNotifications(); await showVaultNotification(record); record.phase = "active"; }
    catch { record.phase = "error"; }
    record.revision++;
    await vaultStore(record);
    return vaultSnapshot(record);
  }
  if (!record || record.nonce !== data.nonce || record.installationId !== data.installationId) return null;
  if (data.action === "consume") {
    if (record.phase !== "ended") return null;
    const snapshot = vaultSnapshot(record, true);
    record.credited = true;
    await vaultStore(record);
    return snapshot;
  }
  if (record.owner !== source.id) return null;
  if (data.action === "cancel") {
    if (["starting", "updating", "active"].includes(record.phase)) {
      record.phase = "cancelled"; record.revision++; await vaultStore(record); await closeVaultNotifications();
    }
    return vaultSnapshot(record);
  }
  return data.action === "read" ? vaultSnapshot(record) : null;
}
async function vaultNotificationClick(data, action) {
  if (!validVaultNonce(data.nonce) || !Number.isSafeInteger(data.step) || data.step < 0 || !["left", "right", ""].includes(action)) return;
  const record = await vaultStore();
  if (!record || record.nonce !== data.nonce || record.phase !== "active" || record.input.length !== data.step) return;
  if (action === "left" || action === "right") {
    record.input += action === "left" ? "L" : "R";
    record.phase = "updating";
    record.revision++;
    await vaultStore(record);
    try { await showVaultNotification(record); record.phase = "active"; }
    catch { record.phase = "error"; }
    record.revision++;
    await vaultStore(record);
    await hintVaultOwner(record);
    return;
  }
  const target = await vaultTarget(record.installationId);
  record.verdict = Array.from(record.input, (value, index) => value === target[index]);
  record.won = record.input === target;
  record.phase = "ended";
  record.revision++;
  record.credited = false;
  await vaultStore(record);
  const url = new URL("./", self.registration.scope);
  url.searchParams.set("stage", "S-420");
  url.searchParams.set("locale", record.locale);
  url.searchParams.set("vault-receipt", record.nonce);
  const owner = await self.clients.get(record.owner);
  if (owner && vaultOwnedSource(owner)) { const navigated = await owner.navigate(url.href); if (navigated) await navigated.focus(); }
  else await self.clients.openWindow(url.href);
}
self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data;
  if (data?.stage === "S-090") {
    event.notification.close();
    if (event.isTrusted !== true || typeof data.nonce !== "string" || !/^[0-9a-f-]{36}$/i.test(data.nonce)) return;
    event.waitUntil((async () => {
      if (!await markS090NotificationClicked(data.nonce)) return;
      const target = new URL("./", self.registration.scope);
      target.searchParams.set("stage", "S-090");
      target.searchParams.set("locale", data.locale === "en" ? "en" : "ja");
      target.searchParams.set("notification-receipt", data.nonce);
      await openOrFocus(target.href);
    })().catch(() => {}));
    return;
  }
  if (data?.kind === vaultChannel && data.stage === "S-420") {
    event.notification.close();
    if (event.isTrusted !== true) return;
    event.waitUntil(queueVault(() => vaultNotificationClick(data, event.action)).catch(() => {}));
    return;
  }
  if (data?.stage === "S-410" || data?.stage === "S-420") { event.notification.close(); return; }
  event.notification.close();
});

async function openOrFocus(target) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = clients.find((client) => client.url.startsWith(self.registration.scope));
  if (existing) { await existing.navigate(target); return existing.focus(); }
  return self.clients.openWindow(target);
}

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") { void self.skipWaiting(); return; }
  if (event.data?.type !== vaultChannel || event.isTrusted !== true) return;
  const port = event.ports?.[0];
  event.waitUntil(queueVault(() => vaultMessage(event.data, event.source)).then(snapshot => {
    port?.postMessage({ type: vaultChannel, nonce: event.data.nonce, snapshot });
  }).catch(() => {
    port?.postMessage({ type: vaultChannel, nonce: event.data.nonce, error: true });
  }));
});
