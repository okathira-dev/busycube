const CACHE_NAME = "poc-content-index-s970-v1";
const ITEM_ID = "busycube-poc-s970";
const base = new URL("./", location.href);
const workerUrl = new URL("./sw.js", base);
const articleUrl = new URL("./article.html", base).href;
const eventUrl = new URL("./observed-contentdelete.json", base).href;
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const log = document.querySelector("#log");
const registerButton = document.querySelector("#register");
const inspectButton = document.querySelector("#inspect");
const copyButton = document.querySelector("#copy");
const copyStatus = document.querySelector("#copy-status");
const records = [];
const environment = {
  startedAt: new Date().toISOString(),
  browser: navigator.userAgent,
  origin: location.origin,
  secureContext: isSecureContext,
  serviceWorker: "serviceWorker" in navigator,
  contentIndexPrototype: typeof ServiceWorkerRegistration !== "undefined" && "index" in ServiceWorkerRegistration.prototype,
  displayMode: matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
  scope: base.href,
};
let busy = false;

function append(entry) {
  records.push({ at: new Date().toISOString(), ...entry });
  if (records.length > 40) records.shift();
  log.value = JSON.stringify({ schema: "busycube-s970-content-index-v1", environment, records }, null, 2);
}

function errorRecord(error) {
  return error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
}

async function ownRegistration() {
  if (!isSecureContext || !("serviceWorker" in navigator)) return undefined;
  const registration = await navigator.serviceWorker.getRegistration(base.href);
  // Do not operate on the game's root service worker.
  return registration?.scope === base.href ? registration : undefined;
}

function waitForActivation(registration) {
  if (registration.active?.state === "activated") return Promise.resolve();
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  return new Promise((resolve, reject) => {
    if (!worker) { reject(new Error("Service Workerが見つかりません")); return; }
    const finish = (error) => {
      clearTimeout(timer);
      worker.removeEventListener("statechange", changed);
      if (error) reject(error); else resolve();
    };
    const changed = () => {
      if (worker.state === "activated") finish();
      else if (worker.state === "redundant") finish(new Error("Service Workerの準備に失敗しました"));
    };
    const timer = setTimeout(() => finish(new Error("Service Workerの準備がタイムアウトしました")), 15000);
    worker.addEventListener("statechange", changed);
    changed();
  });
}

async function inspect() {
  const registration = await ownRegistration();
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(eventUrl);
  const deletion = response ? await response.json() : null;
  const supported = Boolean(registration && "index" in registration);
  const entries = supported ? await registration.index.getAll() : [];
  const articleCached = Boolean(await cache.match(articleUrl));
  append({ event: "snapshot", registered: Boolean(registration), apiSupported: supported, workerState: registration?.active?.state ?? null, entries, articleCached, deletion });
  if (deletion?.event === "contentdelete" && deletion.isTrusted === true && deletion.id === ITEM_ID && deletion.scope === base.href) {
    result.value = `実contentdeleteを受信しました。\n対象: ${deletion.id}\n受信: ${deletion.observedAt}`;
  } else result.value = "削除イベントは未確認です。一覧から項目が消えただけでは成功にしません。";
  if (!registration) status.value = "未登録です。「検証ページを登録」から開始してください。";
  else if (!supported) status.value = "このブラウザはContent Index APIを公開していません。未対応として記録しました。";
  else status.value = `APIあり／現在の登録件数: ${entries.length}／オフライン用ページ: ${articleCached ? "保存済み" : "なし"}`;
}

async function register() {
  if (!isSecureContext || !("serviceWorker" in navigator)) throw new Error("secure contextとService Workerが必要です。USB転送したhttp://localhostで開いてください。");
  status.value = "専用Service Workerを準備しています…";
  const registration = await navigator.serviceWorker.register(workerUrl.href, { scope: base.href, updateViaCache: "none" });
  await waitForActivation(registration);
  append({ event: "worker-ready", scope: registration.scope, scriptURL: registration.active?.scriptURL, apiSupported: "index" in registration });
  if (!("index" in registration)) { await inspect(); return; }
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll([articleUrl, new URL("/icon-192.png", base).href]);
  await registration.index.add({
    id: ITEM_ID,
    title: "Busycube PoC S-970",
    description: "ブラウザの一覧から削除する検証専用ページ",
    category: "article",
    icons: [{ src: new URL("/icon-192.png", base).href, sizes: "192x192", type: "image/png" }],
    url: articleUrl,
  });
  // Only reset the previous event after a new registration actually succeeds.
  await cache.delete(eventUrl);
  append({ event: "index-added", id: ITEM_ID, url: articleUrl });
  await inspect();
}

async function run(action) {
  if (busy) return;
  busy = true;
  registerButton.disabled = true;
  inspectButton.disabled = true;
  try { await action(); }
  catch (error) {
    const detail = errorRecord(error);
    append({ event: "error", ...detail });
    status.value = `確認できませんでした: ${detail.name ?? "Error"}: ${detail.message}`;
  } finally {
    busy = false;
    registerButton.disabled = false;
    inspectButton.disabled = false;
  }
}

registerButton.addEventListener("click", () => { void run(register); });
inspectButton.addEventListener("click", () => { void run(inspect); });
copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(log.value);
    copyStatus.textContent = "コピーしました。";
  } catch {
    log.focus(); log.select();
    copyStatus.textContent = "ログを選択しました。コピーして貼り付けてください。";
  }
});
window.addEventListener("focus", () => { void run(inspect); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) void run(inspect); });
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", (event) => {
  if (event.source?.scriptURL === workerUrl.href && event.data?.type === "s970-event-recorded") void run(inspect);
});
append({ event: "page-open" });
if (isSecureContext && "serviceWorker" in navigator) void run(inspect);
else status.value = "HTTPのLANアドレスでは検証できません。USB転送のhttp://localhostで開いてください。";
