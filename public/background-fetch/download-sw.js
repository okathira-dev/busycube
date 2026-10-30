const channel = "busycube-download-v1";
const cacheName = "busycube-s960-download-v1";
const stateUrl = new URL("./state.json", self.registration.scope).href;
const parcel = new URL("./parcel.bin", self.registration.scope).href;
const prefix = "busycube-s960-";
const bytesExpected = 65536;
const digestExpected = "4b640d85ab3ba30fd02c9fc9db4a8928f416322ad27022ea58a65aaee68a4df2";
const ownId = (id) => typeof id === "string" && /^busycube-s960-[0-9a-f-]{36}$/i.test(id);
const empty = () => ({ version: 1, id: null, status: "idle", owner: null, preparedAt: 0, successId: null, abortId: null });
let queue = Promise.resolve();
function serial(action) { const next = queue.catch(() => {}).then(action); queue = next; return next; }
async function read() {
  const cache = await caches.open(cacheName), response = await cache.match(stateUrl);
  if (!response) return empty();
  const value = await response.json();
  if (value?.version !== 1 || !["idle", "prepared", "active", "success", "aborted", "failed"].includes(value.status) || (value.id !== null && !ownId(value.id)) || (value.successId !== null && !ownId(value.successId)) || (value.abortId !== null && !ownId(value.abortId))) throw new Error("Invalid download state");
  return value;
}
async function save(value) {
  const cache = await caches.open(cacheName);
  await cache.put(stateUrl, new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } }));
}
const view = (value) => ({ id: value.id, status: value.status, successId: value.successId, abortId: value.abortId });
function stage(client) {
  try { const url = new URL(client.url); return client.type === "window" && url.origin === self.location.origin && ["/", "/index.html"].includes(url.pathname) && url.searchParams.get("stage") === "S-960"; } catch { return false; }
}
async function notify() {
  for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) if (stage(client)) client.postMessage({ channel, type: "changed" });
}
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  const data = event.data, port = event.ports?.[0];
  if (!event.isTrusted || data?.channel !== channel || typeof data.requestId !== "string" || !port || !stage(event.source)) return;
  event.waitUntil(serial(async () => {
    try {
      const state = await read();
      if (data.action === "prepare") {
        const manager = self.registration.backgroundFetch;
        if (!manager) throw new Error("Background Fetch unavailable");
        const ids = await manager.getIds();
        const age = Date.now() - state.preparedAt;
        if (ids.some(ownId) || (state.status === "prepared" && age >= 0 && age < 15000)) throw new Error("Download busy");
        state.id = prefix + crypto.randomUUID(); state.status = "prepared"; state.owner = event.source.id; state.preparedAt = Date.now();
        await save(state);
      } else if (data.action === "arm" || data.action === "failed") {
        if (data.id !== state.id || state.owner !== event.source.id) throw new Error("Wrong download attempt");
        if (state.status === "prepared") { state.status = data.action === "arm" ? "active" : "failed"; await save(state); }
      } else if (data.action !== "read") throw new Error("Unknown download action");
      port.postMessage({ channel, requestId: data.requestId, ok: true, value: view(state) });
      if (data.action !== "read") await notify();
    } catch { port.postMessage({ channel, requestId: data.requestId, ok: false }); }
    finally { port.close(); }
  }));
});
async function verify(registration, id) {
  const records = await registration.matchAll();
  if (records.length !== 1) return false;
  const record = records[0], expected = new URL(parcel); expected.searchParams.set("trial", id);
  if (record.request.method !== "GET" || record.request.url !== expected.href) return false;
  const response = await record.responseReady;
  if (!response?.ok || !response.body) return false;
  const reader = response.body.getReader(), result = new Uint8Array(bytesExpected);
  let count = 0;
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      if (count + next.value.length > bytesExpected) { await reader.cancel(); return false; }
      result.set(next.value, count); count += next.value.length;
    }
  } finally { reader.releaseLock(); }
  if (count !== bytesExpected) return false;
  const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", result))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return digest === digestExpected;
}
async function observe(event) {
  const state = await read(), registration = event.registration;
  if (state.id !== registration.id || !["prepared", "active"].includes(state.status)) return;
  if (event.type === "backgroundfetchsuccess") {
    let verified = false;
    try { verified = registration.result === "success" && registration.failureReason === "" && await verify(registration, state.id); } catch {}
    state.status = verified ? "success" : "failed";
    if (verified) state.successId = state.id;
  } else if (event.type === "backgroundfetchabort" && registration.result === "failure" && registration.failureReason === "aborted") {
    state.status = "aborted"; state.abortId = state.id;
  } else state.status = "failed";
  await save(state); await notify();
}
for (const name of ["backgroundfetchsuccess", "backgroundfetchabort", "backgroundfetchfail"]) self.addEventListener(name, (event) => {
  if (!event.isTrusted || !ownId(event.registration?.id)) return;
  event.waitUntil(serial(() => observe(event)));
});
self.addEventListener("backgroundfetchclick", (event) => {
  if (!event.isTrusted || !ownId(event.registration?.id)) return;
  event.waitUntil((async () => {
    const state = await serial(read);
    if (state.id !== event.registration.id) return;
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const current = clients.find(stage);
    if (current) await current.focus(); else await self.clients.openWindow(new URL("/?stage=S-960", self.location.origin).href);
  })());
});
