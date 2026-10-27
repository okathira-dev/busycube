export const S740_TAG = "busycube-greenhouse-v2";
export const greenhouseChannel = "busycube-greenhouse-v2";
export interface GreenhouseView {
  nonce: string | null;
  phase: "empty" | "seed" | "armed" | "bloom";
  image: Blob | null;
  cleanupPending: boolean;
}
export type PeriodicRegistration = ServiceWorkerRegistration & {
  periodicSync?: {
    register(tag: string, options: { minInterval: number }): Promise<void>;
    unregister(tag: string): Promise<void>;
  };
};
export const periodicUrl = (name: string) =>
  new URL(`/periodic/${name}`, location.origin).href;
export function greenhouse(
  signal: AbortSignal,
): Promise<{ registration: PeriodicRegistration; worker: ServiceWorker }> {
  return new Promise((resolve, reject) => {
    const url = periodicUrl("periodic-sync-sw.js?v=2");
    let worker: ServiceWorker | undefined;
    let registration: PeriodicRegistration | undefined;
    let settled = false;
    const cleanup = () => {
      settled = true;
      clearTimeout(timer);
      worker?.removeEventListener("statechange", inspect);
      registration?.removeEventListener("updatefound", select);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const inspect = () => {
      if (settled) return;
      if (signal.aborted) {
        abort();
        return;
      }
      if (worker?.state === "activated" && registration) {
        cleanup();
        resolve({ registration, worker });
      } else if (worker?.state === "redundant") {
        cleanup();
        reject(new Error("Worker unavailable"));
      }
    };
    const select = () => {
      if (settled) return;
      const candidate = [
        registration?.installing,
        registration?.waiting,
        registration?.active,
      ].find((item) => item?.scriptURL === url);
      if (!candidate) return;
      worker?.removeEventListener("statechange", inspect);
      worker = candidate;
      worker.addEventListener("statechange", inspect);
      inspect();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Worker unavailable"));
    }, 10_000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    let starting: Promise<ServiceWorkerRegistration>;
    try {
      starting = navigator.serviceWorker.register(url, { scope: "/periodic/" });
    } catch (error) {
      cleanup();
      reject(error);
      return;
    }
    starting.then(
      (value) => {
        if (settled || signal.aborted) return;
        registration = value as PeriodicRegistration;
        registration.addEventListener("updatefound", select);
        select();
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}
function isView(value: unknown): value is GreenhouseView {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<GreenhouseView>;
  const nonce = typeof v.nonce === "string" && /^[0-9a-f-]{36}$/i.test(v.nonce);
  return (
    typeof v.cleanupPending === "boolean" &&
    ((v.phase === "empty" && v.nonce === null && v.image === null) ||
      ((v.phase === "seed" || v.phase === "armed") &&
        nonce &&
        v.image === null) ||
      (v.phase === "bloom" &&
        nonce &&
        (v.image === null ||
          (v.image instanceof Blob &&
            v.image.type.includes("image/svg+xml") &&
            v.image.size > 0 &&
            v.image.size <= 128 * 1024))))
  );
}
export function greenhouseRequest(
  worker: ServiceWorker,
  action: "read" | "prepare" | "arm",
  signal: AbortSignal,
  nonce?: string,
): Promise<GreenhouseView> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const cleanup = () => {
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Worker did not reply"));
    }, 10_000);
    signal.addEventListener("abort", abort, { once: true });
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data as {
        channel?: unknown;
        ok?: unknown;
        value?: unknown;
      } | null;
      cleanup();
      if (
        data?.channel === greenhouseChannel &&
        data.ok === true &&
        isView(data.value)
      )
        resolve(data.value);
      else reject(new Error("Invalid greenhouse response"));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    try {
      worker.postMessage({ channel: greenhouseChannel, action, nonce }, [
        channel.port2,
      ]);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
