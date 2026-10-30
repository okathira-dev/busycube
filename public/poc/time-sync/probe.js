const providers = [
  { id: "utctime", url: "https://utctime.app/api/now" },
  {
    id: "timeapi",
    url: "https://timeapi.io/api/Time/current/zone?timeZone=Etc%2FUTC",
  },
];
const startButton = document.querySelector("#start");
const stopButton = document.querySelector("#stop");
const providerSelect = document.querySelector("#provider");
const failureInput = document.querySelector("#failure");
const status = document.querySelector("#status");
const clock = document.querySelector("#clock");
const logOutput = document.querySelector("#log");
const records = [];
const cooldowns = new Map();
const environment = {
  origin: location.origin,
  userAgent: navigator.userAgent,
  secureContext: isSecureContext,
};
let enabled = false;
let order = [];
let reference = null;
let controller = null;
let timer = null;
let displayTimer = null;
let endTimer = null;
let started = 0;
let nextAttempt = 0;
let failures = 0;
let localFailure = false;
let previousPerf = performance.now();
let previousWall = Date.now();

function serialized() {
  return JSON.stringify(
    { schema: "busycube-s400-time-sync-v1", environment, records },
    null,
    2,
  );
}

function record(type, detail = {}) {
  const entry = {
    type,
    wallIso: new Date().toISOString(),
    monotonicMs: Math.round(performance.now()),
    ...detail,
  };
  records.push(entry);
  if (records.length > 160) records.shift();
  console.log(`[S400 page] ${JSON.stringify(entry)}`);
  logOutput.value = serialized();
}

function render() {
  const now = performance.now();
  const wall = Date.now();
  const perfStep = now - previousPerf;
  const wallStep = wall - previousWall;
  previousPerf = now;
  previousWall = wall;
  if (enabled && reference && (perfStep > 5000 || Math.abs(wallStep - perfStep) > 2000)) {
    record("clock-discontinuity", { perfStep, wallStep });
    reference = null;
    nextAttempt = 0;
    schedule();
  }
  const age = reference ? now - reference.receivedPerf : null;
  if (!reference || age > 45000) {
    clock.textContent = `基準時刻は${reference ? "古いため判定不可" : "未取得・再同期待ち"}です。\n端末: ${new Date(wall).toISOString()}`;
    return;
  }
  const estimate = reference.utcMs + age;
  const offset = wall - estimate;
  clock.textContent = [
    `外部基準（UTC）: ${new Date(estimate).toISOString()}`,
    `端末（UTC）:     ${new Date(wall).toISOString()}`,
    `差: ${(offset / 1000).toFixed(1)}秒 / ${(offset / 60000).toFixed(2)}分`,
    `取得先: ${reference.provider} / 取得から${(age / 1000).toFixed(1)}秒 / 往復${reference.rttMs.toFixed(0)}ms`,
    `条件プレビュー: 一時間戻す=${offset >= -65 * 60000 && offset <= -55 * 60000} / 現在時刻=${Math.abs(offset) <= 5 * 60000}`,
  ].join("\n");
}

function parseUtc(provider, body) {
  if (provider === "utctime") {
    if (typeof body.unix_ms !== "number" || !Number.isFinite(body.unix_ms)) {
      throw new Error("unix_msが不正です");
    }
    return body.unix_ms;
  }
  // UTCを明示して要求する。ゾーンなしのdateTimeを端末のローカル時刻として解析しない。
  if (body.timeZone !== "Etc/UTC" || typeof body.dateTime !== "string") {
    throw new Error("UTCのdateTimeがありません");
  }
  const dateTime = body.dateTime;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateTime)) {
    throw new Error("dateTimeの形式が不正です");
  }
  return Date.parse(`${dateTime}Z`);
}

async function request(provider) {
  const began = performance.now();
  const active = new AbortController();
  controller = active;
  const timeout = setTimeout(() => active.abort("timeout"), 8000);
  record("request", { provider: provider.id, url: provider.url });
  try {
    const response = await fetch(provider.url, {
      signal: active.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    const received = performance.now();
    const retryAfter = response.headers.get("Retry-After");
    const age = response.headers.get("Age");
    record("response", {
      provider: provider.id,
      status: response.status,
      rttMs: received - began,
      age,
      retryAfter,
      cacheControl: response.headers.get("Cache-Control"),
      dateHeader: response.headers.get("Date"),
    });
    if (response.status === 429) {
      // HTTP-date形式は外部基準が未取得の段階で端末時刻を信用できないため、今回は再試行しない。
      const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null;
      cooldowns.set(provider.id, seconds === null ? Infinity : received + Math.max(30000, seconds * 1000));
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (age !== null && (!Number.isFinite(Number(age)) || Number(age) > 2)) {
      throw new Error("古いキャッシュ応答です");
    }
    const utc = parseUtc(provider.id, await response.json());
    const finished = performance.now();
    if (!enabled || document.hidden || active.signal.aborted) throw new Error("停止済み");
    if (!Number.isFinite(utc) || utc < 1577836800000 || utc > 4102444800000) {
      throw new Error("時刻が有効範囲外です");
    }
    const rttMs = finished - began;
    reference = { provider: provider.id, utcMs: utc + rttMs / 2, receivedPerf: finished, rttMs };
    record("synchronized", { ...reference, serverUtcIso: new Date(utc).toISOString() });
    return true;
  } catch (error) {
    record("request-failed", { provider: provider.id, error: String(error), abortReason: active.signal.reason ? String(active.signal.reason) : null });
    return false;
  } finally {
    clearTimeout(timeout);
    if (controller === active) controller = null;
  }
}

function schedule() {
  clearTimeout(timer);
  if (!enabled || document.hidden || controller) return;
  const now = performance.now();
  const ready = providers.filter((provider) => (cooldowns.get(provider.id) ?? 0) !== Infinity);
  if (ready.length === 0) {
    stop("全候補が利用制限中です。このページでは再試行しません。");
    return;
  }
  const firstAvailable = Math.min(...ready.map((provider) => cooldowns.get(provider.id) ?? 0));
  timer = setTimeout(sync, Math.max(0, nextAttempt - now, firstAvailable - now));
}

async function sync() {
  if (!enabled || document.hidden || controller) return;
  if (performance.now() - started > 600000) {
    stop("10分経過したため停止しました。");
    return;
  }
  reference = null;
  status.textContent = "外部時刻を取得中…";
  if (localFailure) {
    localFailure = false;
    await request({ id: "local-html-failure-test", url: new URL("./index.html", location.href).href });
  }
  let success = false;
  for (const provider of order) {
    if (!enabled || document.hidden) break;
    const now = performance.now();
    if (now < (cooldowns.get(provider.id) ?? 0)) continue;
    // 停止・再開やフォールバック試験でも同じサービスへ短時間に連続要求しない。
    cooldowns.set(provider.id, now + 30000);
    success = await request(provider);
    if (success) {
      order = [provider, ...order.filter((candidate) => candidate !== provider)];
      break;
    }
  }
  if (!enabled || document.hidden) return;
  failures = success ? 0 : failures + 1;
  const delay = success ? 30000 : Math.min(240000, 30000 * 2 ** Math.min(failures, 3));
  nextAttempt = performance.now() + delay;
  status.textContent = success ? "同期成功・30秒後に再取得" : `全候補で未取得・${delay / 1000}秒後に再試行`;
  record("cycle-end", { success, nextDelayMs: delay });
  render();
  schedule();
}

function stop(message = "停止しました。") {
  enabled = false;
  reference = null;
  clearTimeout(timer);
  clearInterval(displayTimer);
  clearTimeout(endTimer);
  controller?.abort("stop");
  startButton.disabled = false;
  stopButton.disabled = true;
  providerSelect.disabled = false;
  failureInput.disabled = false;
  status.textContent = message;
  record("stopped", { message });
  render();
}

startButton.addEventListener("click", () => {
  if (controller) return;
  enabled = true;
  started = performance.now();
  failures = 0;
  nextAttempt = 0;
  localFailure = failureInput.checked;
  const preferred = providerSelect.value === "random"
    ? providers[crypto.getRandomValues(new Uint32Array(1))[0] % providers.length].id
    : providerSelect.value;
  order = [...providers].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
  startButton.disabled = true;
  stopButton.disabled = false;
  providerSelect.disabled = true;
  failureInput.disabled = true;
  status.textContent = "同期開始（取得先の待機時間があれば待ちます）";
  previousPerf = performance.now();
  previousWall = Date.now();
  displayTimer = setInterval(render, 1000);
  endTimer = setTimeout(() => stop("10分経過したため停止しました。"), 600000);
  record("started", { order: order.map((provider) => provider.id), localFailure });
  schedule();
});
stopButton.addEventListener("click", () => stop());
document.addEventListener("visibilitychange", () => {
  record("visibility", { state: document.visibilityState });
  reference = null;
  clearTimeout(timer);
  if (document.hidden) controller?.abort("hidden");
  else if (enabled) {
    nextAttempt = 0;
    schedule();
  }
});
window.addEventListener("pagehide", () => stop("ページを離れたため停止しました。"));
document.querySelector("#dump").addEventListener("click", () => {
  console.log(`[S400 dump]\n${serialized()}`);
});
document.querySelector("#copy").addEventListener("click", async () => {
  console.log(`[S400 dump]\n${serialized()}`);
  try {
    await navigator.clipboard.writeText(serialized());
    document.querySelector("#copy-status").textContent = "コピーしました。";
  } catch {
    logOutput.focus();
    logOutput.select();
    document.querySelector("#copy-status").textContent = "ログを選択しました。手動でコピーしてください。";
  }
});
record("ready", environment);
