import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

describe("S-090 notification click fixtures", () => {
  const nonce = "12345678-1234-4321-8765-123456789abc";
  it("waits for the matching trusted click receipt transaction before navigating", async () => {
    const worker = createWorker("https://example.test/service-worker.js", {
      nonce,
      state: "pending",
    });
    let completion: Promise<unknown> | undefined;
    const close = vi.fn();
    worker.listeners.get("notificationclick")?.({
      isTrusted: true,
      notification: { close, data: { stage: "S-090", nonce, locale: "en" } },
      waitUntil: (promise: Promise<unknown>) => {
        completion = promise;
      },
    });
    await worker.notificationReady;
    expect(worker.clients.openWindow).not.toHaveBeenCalled();
    expect(worker.notificationRecord()).toEqual({ nonce, state: "pending" });
    worker.commitNotification();
    await completion;
    expect(worker.notificationRecord()).toEqual({ nonce, state: "clicked" });
    expect(worker.clients.openWindow).toHaveBeenCalledOnce();
    const target = new URL(worker.clients.openWindow.mock.calls[0]?.[0] ?? "");
    expect(target.searchParams.get("notification-receipt")).toBe(nonce);
    expect(target.searchParams.get("stage")).toBe("S-090");
    expect(target.searchParams.get("locale")).toBe("en");
    expect(close).toHaveBeenCalledOnce();
  });
  it.each([
    { nonce: "other", state: "pending" },
    { nonce, state: "clicked" },
  ])("does not navigate for a mismatch or replay: %j", async (record) => {
    const worker = createWorker(
      "https://example.test/service-worker.js",
      record,
    );
    let completion: Promise<unknown> | undefined;
    worker.listeners.get("notificationclick")?.({
      isTrusted: true,
      notification: { close: vi.fn(), data: { stage: "S-090", nonce } },
      waitUntil: (promise: Promise<unknown>) => {
        completion = promise;
      },
    });
    await worker.notificationReady;
    worker.commitNotification();
    await completion;
    expect(worker.clients.openWindow).not.toHaveBeenCalled();
    expect(worker.notificationRecord()).toEqual(record);
  });
  it("ignores synthetic or unrelated notifications instead of sending them to a fixed success URL", () => {
    const worker = createWorker("https://example.test/service-worker.js");
    const waitUntil = vi.fn();
    worker.listeners.get("notificationclick")?.({
      isTrusted: false,
      notification: { close: vi.fn(), data: { stage: "S-090", nonce } },
      waitUntil,
    });
    worker.listeners.get("notificationclick")?.({
      isTrusted: true,
      notification: { close: vi.fn(), data: {} },
      waitUntil,
    });
    expect(waitUntil).not.toHaveBeenCalled();
    expect(worker.clients.openWindow).not.toHaveBeenCalled();
  });
});

type WorkerEventHandler = (event: Record<string, unknown>) => void;

const workerSource = readFileSync(
  new URL("../public/service-worker.js", import.meta.url),
  "utf8",
);

function createWorker(scriptUrl: string, initialNotificationRecord?: unknown) {
  let notificationRecord = initialNotificationRecord;
  let pendingWrite: unknown;
  let notificationTransaction: { oncomplete?: () => void } | undefined;
  let resolveNotificationReady = () => {};
  const notificationReady = new Promise<void>((resolve) => {
    resolveNotificationReady = resolve;
  });
  const notificationStore = {
    get: () => {
      const request: { result?: unknown; onsuccess?: () => void } = {};
      queueMicrotask(() => {
        request.result = notificationRecord;
        request.onsuccess?.();
        resolveNotificationReady();
      });
      return request;
    },
    put: (value: unknown) => {
      pendingWrite = value;
    },
  };
  const notificationDatabase = {
    transaction: () => {
      const transaction: {
        oncomplete?: () => void;
        objectStore: () => typeof notificationStore;
      } = { objectStore: () => notificationStore };
      notificationTransaction = transaction;
      return transaction;
    },
    close: vi.fn(),
  };
  const indexedDB = {
    open: () => {
      const request: {
        result: typeof notificationDatabase;
        onsuccess?: () => void;
      } = { result: notificationDatabase };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  };
  const listeners = new Map<string, WorkerEventHandler>();
  const shellHtml = `
    <script type="module" src="../assets/busycube-AbCdEf12.js"></script>
    <link rel="modulepreload" href="../assets/client-ZyXwVu98.js">
    <link rel="stylesheet" href="../assets/busycube-QwErTy76.css">
    <link rel="manifest" href="./manifest.webmanifest">
  `;
  const shellCache = {
    addAll: vi.fn(async () => undefined),
    match: vi.fn(async () => new Response(shellHtml)),
    put: vi.fn(async () => undefined),
  };
  const assetCache = {
    addAll: vi.fn(async () => undefined),
    match: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
  };
  const caches = {
    open: vi.fn(async (name: string) =>
      name.includes("shell") ? shellCache : assetCache,
    ),
    keys: vi.fn(async () => ["busycube-shell-v1"]),
    delete: vi.fn(async (_name: string) => true),
  };
  const skipWaiting = vi.fn(async () => undefined);
  const claim = vi.fn(async () => undefined);
  const fetcher = vi.fn(async () => new Response("network"));
  const showNotification = vi.fn(async () => undefined);
  const self = {
    location: new URL(scriptUrl),
    registration: {
      scope: "https://example.test/",
      showNotification,
    },
    clients: {
      claim,
      matchAll: vi.fn(async () => []),
      openWindow: vi.fn(async (_url: string) => undefined),
    },
    skipWaiting,
    addEventListener: (type: string, handler: WorkerEventHandler) => {
      listeners.set(type, handler);
    },
  };

  runInNewContext(workerSource, {
    Array,
    Error,
    Promise,
    Response,
    Set,
    URL,
    caches,
    fetch: fetcher,
    indexedDB,
    self,
  });

  return {
    assetCache,
    caches,
    fetcher,
    listeners,
    shellCache,
    showNotification,
    skipWaiting,
    clients: self.clients,
    notificationReady,
    notificationRecord: () => notificationRecord,
    commitNotification: () => {
      if (pendingWrite !== undefined) notificationRecord = pendingWrite;
      notificationTransaction?.oncomplete?.();
    },
  };
}

describe("Busycube service worker strategy", () => {
  it("leaves every fetch on the network in development mode", () => {
    const worker = createWorker(
      "https://example.test/service-worker.js?mode=development",
    );
    const respondWith = vi.fn();

    worker.listeners.get("fetch")?.({
      request: {
        method: "GET",
        mode: "cors",
        url: "https://example.test/repo/busycube/main.tsx",
      },
      respondWith,
    });

    expect(respondWith).not.toHaveBeenCalled();
  });

  it("activates the development worker immediately without precaching", async () => {
    const worker = createWorker(
      "https://example.test/service-worker.js?mode=development",
    );
    let installation: Promise<unknown> | undefined;

    worker.listeners.get("install")?.({
      waitUntil: (promise: Promise<unknown>) => {
        installation = promise;
      },
    });
    await installation;

    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
    expect(worker.caches.open).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "activation preserves stage and other caches while deleting only owned shell/assets generations (development=%s)",
    async (development) => {
      const worker = createWorker(
        `https://example.test/service-worker.js${development ? "?mode=development" : ""}`,
      );
      worker.caches.keys.mockResolvedValue([
        "busycube-shell-v1",
        "busycube-assets-v2",
        "busycube-shell-v7",
        "busycube-assets-v7",
        "busycube-s960-download-v1",
        "busycube-s740-bloom-v2",
        "busycube-s970-state-v1",
        "other-app",
      ]);
      let activation: Promise<unknown> | undefined;
      worker.listeners.get("activate")?.({
        waitUntil: (value: Promise<unknown>) => {
          activation = value;
        },
      });
      await activation;
      expect(
        worker.caches.delete.mock.calls.map(([name]) => name).sort(),
      ).toEqual(
        (development
          ? [
              "busycube-shell-v1",
              "busycube-assets-v2",
              "busycube-shell-v7",
              "busycube-assets-v7",
            ]
          : ["busycube-shell-v1", "busycube-assets-v2"]
        ).sort(),
      );
    },
  );

  it("precaches only the production shell and its hashed entry assets", async () => {
    const worker = createWorker("https://example.test/service-worker.js");
    let installation: Promise<unknown> | undefined;

    worker.listeners.get("install")?.({
      waitUntil: (promise: Promise<unknown>) => {
        installation = promise;
      },
    });
    await installation;

    expect(worker.shellCache.addAll).toHaveBeenCalledWith([
      "./",
      "./manifest.webmanifest",
      "./icon.svg",
      "./icon-192.png",
      "./icon-512.png",
      "./icon-maskable-192.png",
      "./icon-maskable-512.png",
      "./apple-touch-icon.png",
      "./licenses/index.html",
      "./licenses/localize.js",
      "./licenses/jsqr-Apache-2.0.txt",
      "./licenses/mediabunny-MPL-2.0.txt",
      "./licenses/unifont-OFL-1.1.txt",
    ]);
    expect(worker.assetCache.addAll).toHaveBeenCalledWith([
      "https://example.test/assets/busycube-AbCdEf12.js",
      "https://example.test/assets/client-ZyXwVu98.js",
      "https://example.test/assets/busycube-QwErTy76.css",
    ]);
  });

  it("handles mutable navigation and hashed assets but ignores Vite source", () => {
    const worker = createWorker("https://example.test/service-worker.js");
    const navigationResponse = vi.fn();
    const assetResponse = vi.fn();
    const sourceResponse = vi.fn();
    const fetchHandler = worker.listeners.get("fetch");

    fetchHandler?.({
      request: {
        method: "GET",
        mode: "navigate",
        url: "https://example.test/index.html?stage=S-070",
      },
      respondWith: navigationResponse,
    });
    fetchHandler?.({
      request: {
        method: "GET",
        mode: "cors",
        url: "https://example.test/assets/S-000-AbCdEf12.js",
      },
      respondWith: assetResponse,
    });
    fetchHandler?.({
      request: {
        method: "GET",
        mode: "cors",
        url: "https://example.test/stages/S-000.tsx",
      },
      respondWith: sourceResponse,
    });

    expect(navigationResponse).toHaveBeenCalledTimes(1);
    expect(assetResponse).toHaveBeenCalledTimes(1);
    expect(sourceResponse).not.toHaveBeenCalled();
  });

  it("ignores legacy maze notifications instead of continuing a fixed-answer flow", async () => {
    const worker = createWorker("https://example.test/service-worker.js");
    let completion: Promise<unknown> | undefined;
    worker.listeners.get("notificationclick")?.({
      action: "left",
      notification: {
        body: "arrows",
        close: vi.fn(),
        data: { stage: "S-410", sequence: "", target: "LRRL" },
        tag: "busycube-S-410",
        title: "Busycube",
      },
      waitUntil: (promise: Promise<unknown>) => {
        completion = promise;
      },
    });
    await completion;
    expect(worker.showNotification).not.toHaveBeenCalled();
    expect(worker.clients.openWindow).not.toHaveBeenCalled();
  });
});
