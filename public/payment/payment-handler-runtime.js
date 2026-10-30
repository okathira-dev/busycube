// @ts-nocheck
// Self-hosted fictional BCU only. No money, payer data or credentials.
const wallet = self.BUSYCUBE_WALLET;
const pending = new Map();
const contexts = new Map();
const method = new URL("../method", self.registration.scope).href;
const handlerWindow = new URL("./payment-handler-window.html", self.registration.scope).href;
function clearContext(id) { const context = contexts.get(id); if (context) clearTimeout(context.timer); contexts.delete(id); }
function closeWindow(context) {
  void context?.window?.then((client) => client?.postMessage({ channel: "busycube-payment", type: "handler-close", requestId: context.id, eventId: context.eventId })).catch(() => {});
}
function rejectPending(id, error) {
  const entry = pending.get(id);
  if (entry) { pending.delete(id); clearTimeout(entry.timer); entry.active = false; entry.reject(error); closeWindow(entry.context); }
  clearContext(id);
}
function finishPending(id, value) {
  const entry = pending.get(id); if (!entry) return;
  pending.delete(id); clearTimeout(entry.timer); entry.active = false; entry.resolve(value);
  entry.context.timer = setTimeout(() => { closeWindow(entry.context); clearContext(id); }, 120_000);
}
function merchant(client) {
  try { const url = new URL(client.url); return client.type === "window" && url.origin === self.location.origin && ["/", "/index.html"].includes(url.pathname) && url.searchParams.get("stage") === "S-780"; }
  catch { return false; }
}
const supported = (event) => event.paymentRequestOrigin === self.location.origin && event.methodData?.[0]?.supportedMethods === method && event.methodData[0].data?.busycube === true;
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("canmakepayment", (event) => { if (event.isTrusted) event.respondWith(Promise.resolve(supported(event))); });
self.addEventListener("abortpayment", (event) => {
  if (!event.isTrusted) return;
  event.respondWith(Promise.resolve().then(() => {
    if (pending.size > 1) return false;
    for (const id of pending.keys()) rejectPending(id, new DOMException("Aborted", "AbortError"));
    return true;
  }));
});
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!event.isTrusted || data?.channel !== "busycube-payment") return;
  const context = contexts.get(data.requestId);
  if (!context) return;
  const source = event.source;
  if (data.type === "merchant-stop") {
    if (!source || !context.merchants.has(source.id)) return;
    rejectPending(context.id, new DOMException("Merchant left", "AbortError"));
    closeWindow(context); clearContext(context.id); return;
  }
  const entry = pending.get(context.id);
  if (!entry || !source || data.eventId !== context.eventId) return;
  event.waitUntil((async () => {
    try {
      const client = await context.window;
      if (!entry.active || pending.get(context.id) !== entry || !client || client.id !== source.id || source.url !== context.url) return;
      if (data.type === "handler-ready") {
        client.postMessage({ channel: "busycube-payment", type: "payment-context", requestId: context.id, eventId: context.eventId, attempt: context.attempt, wallet: wallet.id, walletName: wallet.name, locale: context.locale });
      } else if (data.type === "handler-closed") {
        rejectPending(context.id, new DOMException("Wallet closed", "AbortError"));
      } else if (data.type === "handler-action") {
        const outcome = data.action === "approve" ? "approved" : data.action === "decline" ? "declined" : data.action === "retry" ? "needs-retry" : null;
        if (!outcome) return;
        finishPending(context.id, { methodName: method, details: { accepted: outcome === "approved", outcome, attempt: context.attempt, wallet: wallet.id } });
      }
    } catch { rejectPending(context.id, new DOMException("Wallet unavailable", "AbortError")); }
  })());
});
self.addEventListener("paymentrequest", (event) => {
  if (!event.isTrusted) return;
  event.respondWith((async () => {
    const id = event.paymentRequestId;
    const total = event.total?.amount ?? event.total;
    if (!supported(event) || typeof id !== "string" || !/^busycube-[0-9a-f-]{36}$/i.test(id) || total?.currency !== "BCU" || total.value !== "1.00") throw new DOMException("Unsupported fictional request", "NotSupportedError");
    if (pending.has(id)) throw new DOMException("Already active", "InvalidStateError");
    const clients = (await self.clients.matchAll({ type: "window", includeUncontrolled: true })).filter(merchant);
    if (!clients.length) throw new DOMException("Merchant left", "AbortError");
    const prior = contexts.get(id); const attempt = (prior?.attempt ?? 0) + 1;
    clearContext(id);
    const eventId = crypto.randomUUID();
    const locale = event.methodData[0].data.locale === "ja" ? "ja" : "en";
    const url = new URL(handlerWindow); url.searchParams.set("requestId", id); url.searchParams.set("eventId", eventId); url.searchParams.set("locale", locale);
    const context = { id, eventId, attempt, merchants: new Set(clients.map((client) => client.id)), locale, url: url.href, window: null, timer: null };
    context.timer = setTimeout(() => { rejectPending(id, new DOMException("Wallet timed out", "AbortError")); closeWindow(context); }, 120_000);
    contexts.set(id, context);
    const result = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, active: true, context, timer: context.timer });
    });
    void result.catch(() => {});
    for (const client of clients) client.postMessage({ channel: "busycube-payment", type: "handler-event", requestId: id, eventId, methodName: method, trusted: true, attempt, wallet: wallet.id });
    try {
      context.window = event.openWindow(context.url).then((client) => {
        if (!client) throw new Error("No wallet window");
        if (contexts.get(id) !== context || !pending.has(id)) client.postMessage({ channel: "busycube-payment", type: "handler-close", requestId: id, eventId });
        return client;
      });
      void context.window.catch((error) => rejectPending(id, error));
      return await result;
    } catch (error) { rejectPending(id, error); throw error; }
  })());
});
