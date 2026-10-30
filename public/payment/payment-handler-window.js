// @ts-nocheck
const parameters = new URLSearchParams(location.search);
const requestId = parameters.get("requestId");
const eventId = parameters.get("eventId");
const locale = parameters.get("locale") === "ja" ? "ja" : "en";
const copy = locale === "ja" ? { pending: "接続中", select: "BCU 1.00", sent: "送信済み", approve: "承認", decline: "拒否", retry: "再試行" } : { pending: "Connecting", select: "BCU 1.00", sent: "Sent", approve: "Approve", decline: "Decline", retry: "Retry" };
document.documentElement.lang = locale;
const amount = document.querySelector("#amount");
const state = document.querySelector("#state");
const actions = document.querySelector("#actions");
const walletName = document.querySelector("#wallet-name");
const worker = new URL("./payment-handler-sw.js", location.href).href;
let ready = false;
const send = (message) => navigator.serviceWorker.controller?.postMessage({ channel: "busycube-payment", requestId, eventId, ...message });
state.textContent = copy.pending;
for (const button of actions.querySelectorAll("button")) { button.setAttribute("aria-label", copy[button.dataset.action]); button.textContent = copy[button.dataset.action]; }
navigator.serviceWorker.addEventListener("message", (event) => {
  const data = event.data;
  if (!event.isTrusted || event.source?.scriptURL !== worker || data?.channel !== "busycube-payment" || data.requestId !== requestId || data.eventId !== eventId) return;
  if (data.type === "handler-close") { ready = false; window.close(); return; }
  if (data.type !== "payment-context") return;
  walletName.textContent = data.walletName; document.title = data.walletName;
  amount.textContent = copy.select; actions.hidden = false; ready = true;
  actions.querySelector('[data-action="retry"]').hidden = data.attempt !== 1;
  state.textContent = "";
});
for (const button of actions.querySelectorAll("button")) button.addEventListener("click", () => {
  if (!ready) return; ready = false; state.textContent = copy.sent; actions.hidden = true;
  send({ type: "handler-action", action: button.dataset.action });
});
window.addEventListener("pagehide", () => send({ type: "handler-closed" }));
void navigator.serviceWorker.ready.then(() => send({ type: "handler-ready" }));
