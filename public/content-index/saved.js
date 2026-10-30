const channel = "busycube-content-v1";
const locale = new URLSearchParams(location.search).get("locale") === "ja" ? "ja" : "en";
const copy = locale === "ja" ? { title: "オフラインコンテンツ", box: "箱", back: "Busycubeへ戻る", success: "成功", unavailable: "利用できません", waiting: "確認中" } : { title: "Offline content", box: "Box", back: "Back to Busycube", success: "Success", unavailable: "Unavailable", waiting: "Checking" };
document.documentElement.lang = locale; document.title = `Busycube — ${copy.title}`;
document.querySelector("#title").textContent = copy.title;
const box = document.querySelector("#box"), status = document.querySelector("#status"), back = document.querySelector("#return");
box.setAttribute("aria-label", copy.box); back.textContent = copy.back; back.href = `/?stage=S-970&locale=${locale}`;
let alive = true, busy = false;
const pending = new Set();
async function request(action) {
  const registration = await navigator.serviceWorker?.getRegistration(location.href);
  const expected = new URL("./content-sw.js", location.href).href;
  if (!alive || !registration?.active || registration.active.scriptURL !== expected) throw new Error("Content Worker unavailable");
  return new Promise((resolve, reject) => {
    const ports = new MessageChannel(), requestId = crypto.randomUUID();
    const cleanup = () => { clearTimeout(timer); ports.port1.close(); ports.port2.close(); pending.delete(abort); };
    const abort = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { cleanup(); reject(new Error("Content Worker timed out")); }, 10000);
    pending.add(abort);
    ports.port1.onmessage = (event) => {
      cleanup(); const data = event.data;
      if (data?.channel === channel && data.requestId === requestId && data.ok === true && data.value?.saved === true) resolve(data.value);
      else reject(new Error("Invalid content receipt"));
    };
    try { registration.active.postMessage({ channel, requestId, action }, [ports.port2]); } catch (error) { cleanup(); reject(error); }
  });
}
box.addEventListener("click", async (event) => {
  if (!event.isTrusted || !alive || busy) return;
  busy = true; box.disabled = true; status.textContent = copy.waiting;
  try { await request("open"); if (alive) { box.dataset.state = "open"; status.textContent = copy.success; } }
  catch { if (alive) status.textContent = copy.unavailable; }
  finally { busy = false; if (alive) box.disabled = false; }
});
window.addEventListener("pagehide", () => { alive = false; for (const abort of [...pending]) abort(); }, { once: true });
void request("read").then((state) => { if (alive && state.openId === state.id) box.dataset.state = "closed"; }).catch(() => { if (alive) status.textContent = copy.unavailable; });
