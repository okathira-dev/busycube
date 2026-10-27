export const vaultChannel = "busycube-vault-v1";
export interface VaultSnapshot {
  nonce: string;
  revision: number;
  input: string;
  phase: "starting" | "active" | "updating" | "ended" | "error" | "cancelled";
  verdict: boolean[] | null;
  won: boolean;
}
export type VaultAction = "start" | "read" | "consume";
export function validNonce(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
function snapshot(value: unknown, nonce: string): value is VaultSnapshot {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<VaultSnapshot>;
  return (
    state.nonce === nonce &&
    Number.isSafeInteger(state.revision) &&
    typeof state.revision === "number" &&
    state.revision >= 0 &&
    typeof state.input === "string" &&
    /^[LR]*$/.test(state.input) &&
    typeof state.won === "boolean" &&
    ["starting", "active", "updating", "ended", "error", "cancelled"].some(
      (phase) => phase === state.phase,
    ) &&
    (state.phase === "ended"
      ? Array.isArray(state.verdict) &&
        state.verdict.length === state.input.length &&
        state.verdict.every((item) => typeof item === "boolean")
      : state.verdict === null) &&
    (!state.won || state.phase === "ended")
  );
}
export async function vaultWorker(signal: AbortSignal) {
  return new Promise<ServiceWorker>((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      stop();
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      stop();
      reject(new Error("Service Worker unavailable"));
    }, 10_000);
    signal.addEventListener("abort", abort, { once: true });
    navigator.serviceWorker.ready.then(
      (registration) => {
        stop();
        if (signal.aborted) {
          abort();
          return;
        }
        if (registration.active) resolve(registration.active);
        else reject(new Error("No active worker"));
      },
      (error) => {
        stop();
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}
export function vaultRequest(
  worker: ServiceWorker,
  action: VaultAction,
  nonce: string,
  installationId: string,
  locale: string,
  signal: AbortSignal,
) {
  return new Promise<VaultSnapshot | null>((resolve, reject) => {
    const channel = new MessageChannel();
    const stop = () => {
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      stop();
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      stop();
      reject(new Error("Vault worker did not reply"));
    }, 10_000);
    signal.addEventListener("abort", abort, { once: true });
    channel.port1.onmessage = (event) => {
      const data: unknown = event.data;
      stop();
      if (
        data &&
        typeof data === "object" &&
        "type" in data &&
        data.type === vaultChannel &&
        "nonce" in data &&
        data.nonce === nonce &&
        "snapshot" in data &&
        (data.snapshot === null || snapshot(data.snapshot, nonce))
      )
        resolve(data.snapshot);
      else reject(new Error("Invalid vault worker reply"));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    try {
      worker.postMessage(
        { type: vaultChannel, action, nonce, installationId, locale },
        [channel.port2],
      );
    } catch (error) {
      stop();
      reject(error);
    }
  });
}
