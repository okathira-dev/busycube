import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const code = readFileSync(
  new URL("../public/periodic/periodic-sync-sw.js", import.meta.url),
  "utf8",
);
const nonce = "11111111-1111-4111-8111-111111111111";
const tag = "busycube-greenhouse-v2";
const channel = "busycube-greenhouse-v2";
type Plant = { key: string; nonce: string; phase: string };
function fixture() {
  const records = new Map<string, Plant>();
  const cache = new Map<string, Response>();
  const order: string[] = [];
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  let windows: unknown[] = [];
  let unregisterFails = false;
  let writeFails = false;
  const db = {
    objectStoreNames: { contains: () => true },
    close: vi.fn(),
    transaction: () => {
      const tx: {
        error?: Error;
        oncomplete?: () => void;
        onerror?: () => void;
        onabort?: () => void;
        objectStore: () => unknown;
      } = {
        objectStore: () => ({
          get: (key: string) => {
            const request: { result?: Plant; onsuccess?: () => void } = {};
            queueMicrotask(() => {
              request.result = records.get(key);
              request.onsuccess?.();
              tx.oncomplete?.();
            });
            return request;
          },
          put: (value: Plant) => {
            queueMicrotask(() => {
              if (writeFails) {
                tx.error = new Error("Write failed");
                tx.onerror?.();
                return;
              }
              records.set(value.key, structuredClone(value));
              order.push(`state:${value.phase}`);
              tx.oncomplete?.();
            });
          },
        }),
      };
      return tx;
    },
  };
  const indexedDB = {
    open: vi.fn(() => {
      const request: { result?: typeof db; onsuccess?: () => void } = {};
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    }),
  };
  const unregister = vi.fn(async (value: string) => {
    order.push(`unregister:${value}`);
    if (unregisterFails) throw new Error("Unavailable");
  });
  const fetch = vi.fn(
    async () =>
      new Response(
        "<svg xmlns='http://www.w3.org/2000/svg'><path d='M0 0'/></svg>",
        { headers: { "content-type": "image/svg+xml" } },
      ),
  );
  const caches = {
    open: vi.fn(async () => ({
      match: async (key: string) => cache.get(key)?.clone(),
      put: async (key: string, response: Response) => {
        cache.set(key, response.clone());
        order.push("cache:put");
      },
    })),
    delete: vi.fn(async () => {
      cache.clear();
      return true;
    }),
  };
  const matchAll = vi.fn(async () => windows);
  const self = {
    location: new URL("https://game.test/periodic/periodic-sync-sw.js?v=2"),
    registration: { periodicSync: { unregister } },
    clients: { matchAll, claim: vi.fn(async () => {}) },
    skipWaiting: vi.fn(async () => {}),
    addEventListener: (
      name: string,
      callback: (event: Record<string, unknown>) => void,
    ) => listeners.set(name, callback),
  };
  runInNewContext(code, {
    self,
    indexedDB,
    caches,
    fetch,
    URL,
    Promise,
    Error,
  });
  const dispatch = async (type: string, input: Record<string, unknown>) => {
    const waits: Promise<unknown>[] = [];
    listeners.get(type)?.({
      ...input,
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);
  };
  const request = async (
    action: string,
    trial = nonce,
    trusted = true,
    origin = "https://game.test",
  ) => {
    let response:
      | {
          ok: boolean;
          value?: {
            nonce: string;
            phase: string;
            image: Blob | null;
            cleanupPending: boolean;
          };
        }
      | undefined;
    const close = vi.fn();
    await dispatch("message", {
      isTrusted: trusted,
      source: { type: "window", url: `${origin}/?stage=S-740` },
      ports: [
        {
          postMessage: (data: typeof response) => {
            response = data;
          },
          close,
        },
      ],
      data: { channel, action, nonce: trial },
    });
    return response;
  };
  const prepare = async () => {
    await request("prepare");
    await request("arm");
    order.length = 0;
  };
  const tick = (isTrusted = true, eventTag = tag) =>
    dispatch("periodicsync", { isTrusted, tag: eventTag });
  return {
    request,
    prepare,
    tick,
    records,
    cache,
    order,
    fetch,
    matchAll,
    unregister,
    indexedDB,
    windows: (value: unknown[]) => {
      windows = value;
    },
    failUnregister: (value: boolean) => {
      unregisterFails = value;
    },
    failWrite: (value: boolean) => {
      writeFails = value;
    },
  };
}

it("requires an armed trial, a trusted event and zero same-origin windows; ordinary waiting and messages cannot grow", async () => {
  const f = fixture();
  await f.tick();
  expect(f.fetch).not.toHaveBeenCalled();
  await f.request("prepare");
  await f.tick();
  expect(f.fetch).not.toHaveBeenCalled();
  await f.request("arm");
  await f.tick(false);
  await f.tick(true, "another-tag");
  await f.request("grow");
  expect(f.fetch).not.toHaveBeenCalled();
  f.windows([{ visibilityState: "hidden" }]);
  await f.tick();
  expect(f.fetch).not.toHaveBeenCalled();
  expect(f.matchAll).toHaveBeenCalledWith({
    type: "window",
    includeUncontrolled: true,
  });
  expect((await f.request("read"))?.value?.phase).toBe("armed");
});

it("one actual event commits the image then completion before unregistering only this tag, and re-reading retains the image", async () => {
  const f = fixture();
  await f.prepare();
  await f.tick();
  expect(f.fetch).toHaveBeenCalledOnce();
  expect(f.order).toEqual(["cache:put", "state:bloom", `unregister:${tag}`]);
  const result = await f.request("read");
  expect(result?.value?.phase).toBe("bloom");
  expect(result?.value?.image?.size).toBeGreaterThan(0);
  expect(result?.value?.cleanupPending).toBe(false);
  await f.tick();
  expect(f.fetch).toHaveBeenCalledOnce();
  expect(f.unregister.mock.calls.every(([value]) => value === tag)).toBe(true);
});

it("never completes on fetch, image validation or completion-write failure, or if a window reopens during fetch", async () => {
  const f = fixture();
  await f.prepare();
  f.fetch.mockResolvedValueOnce(new Response("No", { status: 503 }));
  await expect(f.tick()).rejects.toThrow("Bloom image unavailable");
  expect(f.records.get("plant")?.phase).toBe("armed");
  f.fetch.mockResolvedValueOnce(
    new Response("text", { headers: { "content-type": "text/plain" } }),
  );
  await expect(f.tick()).rejects.toThrow("Bloom image unavailable");
  f.fetch.mockImplementationOnce(async () => {
    f.windows([{}]);
    return new Response("<svg/>", {
      headers: { "content-type": "image/svg+xml" },
    });
  });
  await f.tick();
  expect(f.records.get("plant")?.phase).toBe("armed");
  expect(f.cache.size).toBe(0);
  f.windows([]);
  f.failWrite(true);
  await expect(f.tick()).rejects.toThrow("Write failed");
  expect((await f.request("read"))?.value?.phase).toBe("armed");
});

it("preserves a committed bloom when unregister fails, retries cleanup without growing again, and reports a missing image separately", async () => {
  const f = fixture();
  await f.prepare();
  f.failUnregister(true);
  await f.tick();
  expect(f.records.get("plant")?.phase).toBe("bloom");
  expect((await f.request("read"))?.value?.cleanupPending).toBe(true);
  f.failUnregister(false);
  expect((await f.request("read"))?.value?.cleanupPending).toBe(false);
  expect(f.fetch).toHaveBeenCalledOnce();
  f.cache.clear();
  const result = await f.request("read");
  expect(result?.value?.phase).toBe("bloom");
  expect(result?.value?.image).toBeNull();
});

it("replant replaces only the plant trial/cache, rejects stale arm and untrusted or unrelated clients, and does not use legacy phase as completion", async () => {
  const f = fixture();
  await f.prepare();
  await f.tick();
  const other = "22222222-2222-4222-8222-222222222222";
  await f.request("prepare", other);
  expect(f.cache.size).toBe(0);
  expect(f.records.get("plant")?.nonce).toBe(other);
  expect((await f.request("arm", nonce))?.ok).toBe(false);
  expect(await f.request("prepare", nonce, false)).toBeUndefined();
  expect(
    (await f.request("prepare", nonce, true, "https://other.test"))?.ok,
  ).toBe(false);
  expect(f.records.get("plant")?.nonce).toBe(other);
  f.records.delete("plant");
  expect((await f.request("read"))?.value?.phase).toBe("empty");
  expect(f.indexedDB.open).toHaveBeenCalledWith(
    "busycube-periodic-stage-v1",
    2,
  );
});
