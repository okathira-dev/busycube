import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

type RecordValue = {
  nonce: string;
  input: string;
  phase: string;
  installationId: string;
  verdict?: boolean[];
  won?: boolean;
  credited?: boolean;
};
type Snapshot = {
  nonce: string;
  input: string;
  phase: string;
  verdict: boolean[] | null;
  won: boolean;
} | null;
type Client = {
  id: string;
  type: string;
  url: string;
  navigate: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
};
const source = readFileSync(
  new URL("../public/service-worker.js", import.meta.url),
  "utf8",
);
const nonceA = "12345678-1234-4321-8765-123456789abc";
const nonceB = "87654321-4321-4321-8765-123456789abc";
function database(state: { value?: RecordValue }) {
  return {
    open: () => {
      const request: {
        result?: unknown;
        onsuccess?: () => void;
        onupgradeneeded?: () => void;
      } = {};
      queueMicrotask(() => {
        request.result = {
          objectStoreNames: { contains: () => true },
          close() {},
          transaction: () => {
            const tx: {
              oncomplete?: () => void;
              onerror?: () => void;
              onabort?: () => void;
              objectStore: () => unknown;
            } = {
              objectStore: () => ({
                get: () => {
                  const read: { result?: RecordValue; onsuccess?: () => void } =
                    {};
                  queueMicrotask(() => {
                    read.result = state.value
                      ? structuredClone(state.value)
                      : undefined;
                    read.onsuccess?.();
                    tx.oncomplete?.();
                  });
                  return read;
                },
                put: (value: RecordValue) => {
                  const copy = structuredClone(value);
                  queueMicrotask(() => {
                    state.value = copy;
                    tx.oncomplete?.();
                  });
                },
              }),
            };
            return tx;
          },
        };
        request.onsuccess?.();
      });
      return request;
    },
  };
}
function fixture(state: { value?: RecordValue } = {}) {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const shown: {
    title: string;
    data: { kind: string; stage: string; nonce: string; step: number };
    body: string;
    actions: unknown[];
  }[] = [];
  const notifications: { close: ReturnType<typeof vi.fn> }[] = [];
  const clients = new Map<string, Client>();
  const client = (id: string, url = "https://example.test/?stage=S-420") => {
    const value = {
      id,
      type: "window",
      url,
      navigate: vi.fn(),
      focus: vi.fn(async () => {}),
      postMessage: vi.fn(),
    };
    value.navigate.mockResolvedValue(value);
    clients.set(id, value);
    return value;
  };
  const owner = client("owner");
  const showNotification = vi.fn(
    async (
      title: string,
      options: {
        data: (typeof shown)[number]["data"];
        body: string;
        actions: unknown[];
      },
    ) => {
      shown.push(structuredClone({ title, ...options }));
      notifications.push({ close: vi.fn() });
    },
  );
  const openWindow = vi.fn(async () => {});
  const scope = {
    self: {
      location: new URL("https://example.test/service-worker.js"),
      registration: {
        scope: "https://example.test/",
        showNotification,
        getNotifications: vi.fn(async () => notifications),
      },
      clients: {
        get: async (id: string) => clients.get(id),
        matchAll: async () => [...clients.values()],
        openWindow,
        claim: async () => {},
      },
      addEventListener: (
        type: string,
        handler: (event: Record<string, unknown>) => void,
      ) => listeners.set(type, handler),
    },
    indexedDB: database(state),
    URL,
    crypto: webcrypto,
    TextEncoder,
    Promise,
    Array,
    Set,
    Number,
    Error,
  };
  runInNewContext(source, scope);
  async function message(
    action: string,
    nonce = nonceA,
    who = owner,
    installationId = "installation-one",
  ) {
    let completion: Promise<unknown> | undefined;
    let reply: { snapshot?: Snapshot; error?: boolean } | undefined;
    listeners.get("message")?.({
      isTrusted: true,
      data: {
        type: "busycube-vault-v1",
        action,
        nonce,
        installationId,
        locale: "en",
      },
      source: who,
      ports: [
        {
          postMessage: (value: typeof reply) => {
            reply = value;
          },
        },
      ],
      waitUntil: (promise: Promise<unknown>) => {
        completion = promise;
      },
    });
    await completion;
    return reply;
  }
  async function click(
    action: string,
    data = shown.at(-1)?.data,
    trusted = true,
  ) {
    let completion: Promise<unknown> | undefined;
    const close = vi.fn();
    listeners.get("notificationclick")?.({
      isTrusted: trusted,
      action,
      notification: { data, close },
      waitUntil: (promise: Promise<unknown>) => {
        completion = promise;
      },
    });
    await completion;
    return close;
  }
  return {
    state,
    shown,
    owner,
    clients,
    client,
    showNotification,
    openWindow,
    listeners,
    message,
    click,
  };
}
async function answer(installationId = "installation-one") {
  const bytes = new Uint8Array(
    await webcrypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        `busycube:notification-vault:S-420:1\0${installationId}`,
      ),
    ),
  );
  return Array.from({ length: 5 }, (_, index) =>
    (bytes[0] ?? 0) & (1 << index) ? "R" : "L",
  ).join("");
}
async function enter(f: ReturnType<typeof fixture>, input: string) {
  for (const direction of input)
    await f.click(direction === "L" ? "left" : "right");
}

it("starts without saving the answer or putting it in notification data, and only appends before Try", async () => {
  const f = fixture();
  expect((await f.message("start"))?.snapshot).toMatchObject({
    input: "",
    phase: "active",
    verdict: null,
    won: false,
  });
  expect(f.shown[0]?.data).toEqual({
    kind: "busycube-vault-v1",
    stage: "S-420",
    nonce: nonceA,
    step: 0,
  });
  expect(f.shown[0]?.body).toBe("Try");
  expect(f.shown[0]?.actions).toHaveLength(2);
  await enter(f, "LRLRLRL");
  expect((await f.message("read"))?.snapshot).toMatchObject({
    input: "LRLRLRL",
    verdict: null,
    won: false,
  });
  expect(f.shown).toHaveLength(8);
  expect(Object.keys(f.state.value ?? {})).not.toContain("target");
  expect(Object.keys(f.state.value ?? {})).not.toContain("answer");
  await f.click("");
  const target = await answer();
  expect((await f.message("consume"))?.snapshot).toMatchObject({
    input: "LRLRLRL",
    phase: "ended",
    verdict: Array.from("LRLRLRL", (value, index) => value === target[index]),
    won: false,
  });
  expect(f.state.value?.verdict?.slice(5)).toEqual([false, false]);
  const count = f.shown.length;
  await f.click("left");
  expect(f.shown).toHaveLength(count);
});

it("waits for Try even on the exact five inputs and credits its committed receipt only once", async () => {
  const f = fixture();
  await f.message("start");
  await enter(f, await answer());
  expect((await f.message("read"))?.snapshot?.won).toBe(false);
  expect(f.state.value?.phase).toBe("active");
  await f.click("");
  expect(f.owner.navigate).toHaveBeenCalledOnce();
  const url = new URL(f.owner.navigate.mock.calls[0]?.[0]);
  expect(url.searchParams.get("vault-receipt")).toBe(nonceA);
  expect(url.searchParams.has("vault-attempt")).toBe(false);
  expect(
    (await f.message("consume", nonceA, f.client("return")))?.snapshot?.won,
  ).toBe(true);
  expect((await f.message("consume"))?.snapshot?.won).toBe(false);
});

it("judges only the submitted positions, including zero or short input, and resets the result on retry", async () => {
  const f = fixture();
  await f.message("start");
  await f.click("");
  expect(f.state.value?.verdict).toEqual([]);
  expect(f.state.value?.won).toBe(false);
  await f.message("start", nonceB);
  await enter(f, (await answer()).slice(0, 2));
  await f.click("");
  expect(f.state.value?.verdict).toEqual([true, true]);
  expect(f.state.value?.won).toBe(false);
  await f.message("start");
  expect(f.state.value?.input).toBe("");
  expect(f.state.value?.verdict).toBeUndefined();
});

it("ignores duplicate steps, stale nonces and legacy/synthetic notifications", async () => {
  const f = fixture();
  await f.message("start");
  const old = f.shown[0]?.data;
  await f.click("left", old);
  await f.click("right", old);
  expect(f.state.value?.input).toBe("L");
  await f.message("start", nonceB);
  await f.click("right", old);
  expect(f.state.value?.input).toBe("");
  await f.click("left", f.shown.at(-1)?.data, false);
  expect(f.state.value?.input).toBe("");
  await f.click("left", {
    kind: "legacy",
    stage: "S-410",
    nonce: nonceA,
    step: 0,
  });
  expect(f.state.value?.input).toBe("");
  expect(f.owner.navigate).not.toHaveBeenCalled();
});

it("isolates the newest owner across tabs and uses a new window only if that owner has disappeared", async () => {
  const f = fixture();
  const other = f.client("other");
  await f.message("start");
  await f.message("start", nonceB, other);
  expect((await f.message("read", nonceB))?.snapshot).toBeNull();
  await f.message("cancel", nonceB);
  expect(f.state.value?.phase).toBe("active");
  expect((await f.message("consume", nonceA))?.snapshot).toBeNull();
  expect(
    (await f.message("read", nonceB, other, "reset-installation"))?.snapshot,
  ).toBeNull();
  expect(
    (
      await f.message(
        "start",
        nonceA,
        f.client("foreign", "https://other.test/"),
      )
    )?.error,
  ).toBe(true);
  f.clients.delete("other");
  await f.click("");
  expect(f.openWindow).toHaveBeenCalledOnce();
  expect(f.owner.navigate).not.toHaveBeenCalled();
});

it("keeps the answer stable after worker restart without storing its plaintext or per-position hashes", async () => {
  const state: { value?: RecordValue } = {};
  const first = fixture(state);
  await first.message("start");
  await enter(first, (await answer()).slice(0, 3));
  const second = fixture(state);
  second.shown.push(...first.shown.slice(-1));
  await enter(second, (await answer()).slice(3));
  await second.click("");
  expect((await second.message("consume"))?.snapshot?.won).toBe(true);
  const keys = Object.keys(state.value ?? {});
  expect(keys).not.toContain("target");
  expect(keys).not.toContain("hashes");
});

it("treats notification failure as an error and never as an action or submission", async () => {
  const f = fixture();
  f.showNotification.mockRejectedValueOnce(new Error("Unavailable"));
  expect((await f.message("start"))?.snapshot?.phase).toBe("error");
  await f.click("");
  expect(f.owner.navigate).not.toHaveBeenCalled();
  await f.message("start", nonceB);
  f.showNotification.mockRejectedValueOnce(new Error("Unavailable"));
  await f.click("left");
  expect(f.state.value?.input).toBe("L");
  expect(f.state.value?.phase).toBe("error");
  await f.click("");
  expect(f.state.value?.won).toBeUndefined();
});

it("cancels input on departure but preserves a submitted receipt during the return navigation", async () => {
  const f = fixture();
  await f.message("start");
  await f.message("cancel");
  expect(f.state.value?.phase).toBe("cancelled");
  await f.click("");
  expect(f.owner.navigate).not.toHaveBeenCalled();
  await f.message("start", nonceB);
  await enter(f, await answer());
  await f.click("");
  await f.message("cancel", nonceB);
  expect((await f.message("consume", nonceB))?.snapshot?.won).toBe(true);
});
