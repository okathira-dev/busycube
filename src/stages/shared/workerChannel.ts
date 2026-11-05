export function stageWorker(
  script: string,
  scope: string,
  signal: AbortSignal,
): Promise<{ registration: ServiceWorkerRegistration; worker: ServiceWorker }> {
  return new Promise((resolve, reject) => {
    const url = new URL(script, location.origin).href;
    let registration: ServiceWorkerRegistration | undefined,
      worker: ServiceWorker | undefined,
      settled = false;
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
      ].find((value) => value?.scriptURL === url);
      if (!candidate) return;
      worker?.removeEventListener("statechange", inspect);
      worker = candidate;
      worker.addEventListener("statechange", inspect);
      inspect();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Worker timed out"));
    }, 10000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    try {
      navigator.serviceWorker
        .register(url, { scope, updateViaCache: "none" })
        .then(
          (value) => {
            if (settled || signal.aborted) return;
            registration = value;
            registration.addEventListener("updatefound", select);
            select();
          },
          (error) => {
            cleanup();
            reject(error);
          },
        );
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
export function workerRequest<T>(
  worker: ServiceWorker,
  channel: string,
  data: Record<string, unknown>,
  signal: AbortSignal,
  validate: (value: unknown) => value is T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const ports = new MessageChannel(),
      requestId = crypto.randomUUID();
    const cleanup = () => {
      clearTimeout(timer);
      ports.port1.close();
      ports.port2.close();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Worker did not reply"));
    }, 10000);
    signal.addEventListener("abort", abort, { once: true });
    ports.port1.onmessage = (event: MessageEvent<unknown>) => {
      cleanup();
      const reply = event.data as {
        channel?: unknown;
        requestId?: unknown;
        ok?: unknown;
        value?: unknown;
      } | null;
      if (
        reply?.channel === channel &&
        reply.requestId === requestId &&
        reply.ok === true &&
        validate(reply.value)
      )
        resolve(reply.value);
      else reject(new Error("Invalid Worker reply"));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    try {
      worker.postMessage({ ...data, channel, requestId }, [ports.port2]);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
