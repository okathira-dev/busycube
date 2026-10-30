const CACHE_NAME = "poc-background-fetch-s960-v1";
const PREFIX = "busycube-poc-s960-";
const base = new URL("./", location.href);
const workerUrl = new URL("./sw.js", base);
const eventsUrl = new URL("./events.json", base).href;
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const progress = document.querySelector("#progress");
const log = document.querySelector("#log");
const startButton = document.querySelector("#start");
const inspectButton = document.querySelector("#inspect");
const records = [];
const watchers = new Map();
let workerEvents = [];
let busy = false;
let hasActive = false;
const environment = {
  startedAt: new Date().toISOString(), browser: navigator.userAgent, origin: location.origin,
  secureContext: isSecureContext, serviceWorker: "serviceWorker" in navigator,
  backgroundFetchPrototype: typeof ServiceWorkerRegistration !== "undefined" && "backgroundFetch" in ServiceWorkerRegistration.prototype,
  displayMode: matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser", scope: base.href,
};

function renderLog() {
  log.value = JSON.stringify({ schema: "busycube-s960-background-fetch-v1", environment, records, workerEvents }, null, 2);
}
function append(record) {
  const entry = { at: new Date().toISOString(), ...record };
  records.push(entry);
  if (records.length > 60) records.shift();
  console.info(`[S960 page] ${JSON.stringify(entry)}`);
  renderLog();
}
async function ownRegistration() {
  if (!isSecureContext || !("serviceWorker" in navigator)) return undefined;
  const registration = await navigator.serviceWorker.getRegistration(base.href);
  return registration?.scope === base.href ? registration : undefined;
}
function waitForActivation(registration) {
  if (registration.active?.state === "activated") return Promise.resolve();
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  return new Promise((resolve, reject) => {
    if (!worker) { reject(new Error("Service Workerが見つかりません")); return; }
    const finish = (error) => {
      clearTimeout(timer); worker.removeEventListener("statechange", changed);
      if (error) reject(error); else resolve();
    };
    const changed = () => {
      if (worker.state === "activated") finish();
      else if (worker.state === "redundant") finish(new Error("Service Workerの起動に失敗しました"));
    };
    const timer = setTimeout(() => finish(new Error("Service Workerの準備がタイムアウトしました")), 15000);
    worker.addEventListener("statechange", changed); changed();
  });
}
function snapshot(fetch) {
  return { id: fetch.id, downloaded: fetch.downloaded, downloadTotal: fetch.downloadTotal, result: fetch.result, failureReason: fetch.failureReason, recordsAvailable: fetch.recordsAvailable };
}
function watch(fetch) {
  if (watchers.has(fetch.id)) return;
  let lastBucket = -1;
  const changed = () => {
    progress.value = fetch.downloaded;
    const bucket = Math.floor(fetch.downloaded / 8192);
    if (bucket !== lastBucket || fetch.result) { lastBucket = bucket; append({ event: "progress", ...snapshot(fetch) }); }
    status.value = `実進捗: ${fetch.downloaded} / ${fetch.downloadTotal} bytes`;
  };
  fetch.addEventListener("progress", changed);
  watchers.set(fetch.id, () => fetch.removeEventListener("progress", changed));
  changed();
}
async function inspect() {
  const cache = await caches.open(CACHE_NAME);
  const saved = await cache.match(eventsUrl);
  workerEvents = saved ? await saved.json() : [];
  const registration = await ownRegistration();
  const supported = Boolean(registration && "backgroundFetch" in registration);
  const ids = supported ? (await registration.backgroundFetch.getIds()).filter((id) => id.startsWith(PREFIX)) : [];
  const active = [];
  for (const id of ids) {
    const fetch = await registration.backgroundFetch.get(id);
    if (fetch && !fetch.result) { active.push(snapshot(fetch)); watch(fetch); }
  }
  for (const [id, dispose] of watchers) {
    if (!active.some((entry) => entry.id === id)) { dispose(); watchers.delete(id); }
  }
  hasActive = active.length > 0;
  const completed = workerEvents.some((event) => event.event === "backgroundfetchsuccess" && event.isTrusted && event.verified);
  const cancelled = workerEvents.some((event) => event.event === "backgroundfetchabort" && event.isTrusted);
  result.value = `完走: ${completed ? "実イベント＋内容一致を確認済み" : "未確認"}\nキャンセル: ${cancelled ? "実backgroundfetchabortを確認済み" : "未確認"}`;
  append({ event: "snapshot", registered: Boolean(registration), apiSupported: supported, active, workerEvents });
  if (!registration) status.value = "未開始です。ダウンロード開始を押してください。";
  else if (!supported) status.value = "このブラウザはBackground Fetchを公開していません。";
  else if (!hasActive) status.value = "実行中のダウンロードはありません。結果とログを確認できます。";
}
async function start() {
  if (!isSecureContext || !("serviceWorker" in navigator)) throw new Error("USB転送のhttp://localhostなどsecure contextが必要です。");
  status.value = "専用Service Workerを準備しています…";
  const registration = await navigator.serviceWorker.register(workerUrl.href, { scope: base.href, updateViaCache: "none" });
  await waitForActivation(registration);
  if (!("backgroundFetch" in registration)) { await inspect(); return; }
  const pending = (await registration.backgroundFetch.getIds()).filter((id) => id.startsWith(PREFIX));
  if (pending.length) { await inspect(); return; }
  const id = PREFIX + crypto.randomUUID();
  const url = new URL("./slow.bin", base);
  url.searchParams.set("trial", id);
  append({ event: "start-request", id, url: url.href, expectedBytes: 65536, approximateSeconds: 90 });
  const fetch = await registration.backgroundFetch.fetch(id, [url.href], {
    title: "Busycube PoC S-960 — ダウンロード",
    downloadTotal: 65536,
    icons: [{ src: new URL("/icon-192.png", base).href, sizes: "192x192", type: "image/png" }],
  });
  append({ event: "fetch-started", ...snapshot(fetch) });
  hasActive = true;
  watch(fetch);
}
async function run(action) {
  if (busy) return;
  busy = true; startButton.disabled = true; inspectButton.disabled = true;
  try { await action(); }
  catch (error) { append({ event: "error", name: error?.name, message: String(error) }); status.value = `確認失敗: ${String(error)}`; }
  finally { busy = false; startButton.disabled = hasActive; inspectButton.disabled = false; }
}
async function dump() {
  await run(inspect);
  console.info(`[S960 dump]\n${log.value}`);
}
startButton.addEventListener("click", () => { void run(start); });
inspectButton.addEventListener("click", () => { void run(inspect); });
document.querySelector("#dump").addEventListener("click", () => { void dump(); });
document.querySelector("#copy").addEventListener("click", async () => {
  await dump();
  const copyStatus = document.querySelector("#copy-status");
  try { await navigator.clipboard.writeText(log.value); copyStatus.textContent = "コピーしました。Consoleにも全ログを出しました。"; }
  catch { log.focus(); log.select(); copyStatus.textContent = "ログを選択しました。コピーしてください。Consoleにも出力済みです。"; }
});
window.addEventListener("focus", () => { void run(inspect); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) void run(inspect); });
window.addEventListener("pagehide", () => { for (const dispose of watchers.values()) dispose(); watchers.clear(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", (event) => {
  if (event.source?.scriptURL === workerUrl.href && event.data?.type === "s960-event-recorded") void run(inspect);
});
append({ event: "page-open" });
if (isSecureContext && "serviceWorker" in navigator) void run(inspect);
else status.value = "USB転送のhttp://localhostなどsecure contextで開いてください。";
