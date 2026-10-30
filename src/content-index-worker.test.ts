import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const code = readFileSync(
  new URL("../public/content-index/content-sw.js", import.meta.url),
  "utf8",
);
const origin = "https://game.example",
  channel = "busycube-content-v1";
type State = {
  id: string | null;
  url: string | null;
  saved: boolean;
  openId: string | null;
  deleteId: string | null;
  status: string;
  cleanupPending: boolean;
};
function fixture() {
  const caches = new Map<string, Map<string, Response>>(),
    handlers = new Map<string, (event: Record<string, unknown>) => void>();
  const entries = new Map<string, Record<string, string>>();
  const add = vi.fn(async (description: Record<string, string>) => {
    if (!description.url || "launchUrl" in description)
      throw new Error("Invalid ContentDescription");
    entries.set(description.id ?? "", description);
  });
  const remove = vi.fn(async (id: string) => {
    entries.delete(id);
  });
  const client = {
    id: "player",
    type: "window",
    url: `${origin}/?stage=S-970`,
    postMessage: vi.fn(),
  };
  const fetch = vi.fn(async () => new Response("owned asset"));
  runInNewContext(code, {
    self: {
      location: { origin },
      registration: {
        scope: `${origin}/content-index/`,
        index: {
          add,
          delete: remove,
          getAll: async () => [...entries.values()],
        },
      },
      clients: { matchAll: async () => [client] },
      addEventListener: (
        type: string,
        handler: (event: Record<string, unknown>) => void,
      ) => handlers.set(type, handler),
    },
    caches: {
      open: async (name: string) => {
        let cache = caches.get(name);
        if (!cache) {
          cache = new Map();
          caches.set(name, cache);
        }
        const own = cache;
        return {
          match: async (request: string | Request) =>
            own
              .get(typeof request === "string" ? request : request.url)
              ?.clone(),
          put: async (url: string, response: Response) => {
            own.set(url, response.clone());
          },
          delete: async (url: string) => own.delete(url),
        };
      },
      delete: async (name: string) => caches.delete(name),
    },
    crypto,
    Response,
    URL,
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  const rpc = async (action: string, source = client, trusted = true) => {
    let pending: Promise<void> | undefined,
      reply: { ok: boolean; value: State } | undefined;
    handlers.get("message")?.({
      isTrusted: trusted,
      source,
      data: { channel, requestId: crypto.randomUUID(), action, locale: "en" },
      ports: [
        {
          postMessage: (value: { ok: boolean; value: State }) => {
            reply = value;
          },
          close: vi.fn(),
        },
      ],
      waitUntil: (work: Promise<void>) => {
        pending = work;
      },
    });
    await pending;
    return reply;
  };
  const deleted = async (id: string | null, trusted = true) => {
    let pending: Promise<void> | undefined;
    handlers.get("contentdelete")?.({
      id,
      isTrusted: trusted,
      waitUntil: (work: Promise<void>) => {
        pending = work;
      },
    });
    await pending;
  };
  const offline = async (url: string) => {
    let response: Promise<Response> | undefined;
    handlers.get("fetch")?.({
      request: new Request(url),
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });
    return response;
  };
  return { rpc, deleted, offline, caches, entries, client, add, remove, fetch };
}
it("caches all five assets and registers a valid real-API description, but save/read alone cannot open either box", async () => {
  const f = fixture();
  const result = await f.rpc("save");
  expect(result?.ok).toBe(true);
  expect(result?.value).toMatchObject({
    status: "saved",
    saved: true,
    openId: null,
    deleteId: null,
  });
  expect(f.fetch).toHaveBeenCalledTimes(5);
  expect(f.add).toHaveBeenCalledOnce();
  const description = f.add.mock.calls[0]?.[0];
  expect(description?.url).toBe(result?.value.url);
  expect(description?.url).toMatch(/\/content-index\/saved.html\?entry=/);
  expect(f.caches.get("busycube-s970-content-v1")?.size).toBe(5);
  expect((await f.rpc("read"))?.value.openId).toBeNull();
});
it("accepts only the actual registered page URL for its box receipt and allows direct navigation to that same URL", async () => {
  const f = fixture(),
    state = (await f.rpc("save"))?.value;
  if (!state?.url) throw new Error("No saved page");
  expect((await f.rpc("open"))?.ok).toBe(false);
  expect(
    (
      await f.rpc("open", {
        ...f.client,
        url: state.url.replace("entry=", "old="),
      })
    )?.ok,
  ).toBe(false);
  expect(
    await f.rpc("open", { ...f.client, url: state.url }, false),
  ).toBeUndefined();
  expect(
    (await f.rpc("open", { ...f.client, url: state.url }))?.value,
  ).toMatchObject({ openId: state.id, deleteId: null });
});
it("needs a current trusted contentdelete and keeps its receipt outside the cache it removes", async () => {
  const f = fixture(),
    state = (await f.rpc("save"))?.value;
  if (!state) throw new Error("No saved state");
  await f.deleted(state.id, false);
  await f.deleted(`busycube-s970-${crypto.randomUUID()}`);
  expect((await f.rpc("read"))?.value.deleteId).toBeNull();
  expect((await f.rpc("delete"))?.ok).toBe(false);
  await f.deleted(state.id);
  expect((await f.rpc("read"))?.value).toMatchObject({
    status: "deleted",
    deleteId: state.id,
    openId: null,
  });
  expect(f.caches.has("busycube-s970-content-v1")).toBe(false);
  expect(f.caches.has("busycube-s970-state-v1")).toBe(true);
});
it("keeps cache loss/empty index/failure uncompleted and cannot turn an unsuccessful save into a page win", async () => {
  const f = fixture();
  f.add.mockRejectedValueOnce(new Error("Denied"));
  expect((await f.rpc("save"))?.ok).toBe(false);
  let state = (await f.rpc("read"))?.value;
  expect(state?.saved).toBe(false);
  if (state?.url)
    expect((await f.rpc("open", { ...f.client, url: state.url }))?.ok).toBe(
      false,
    );
  state = (await f.rpc("save"))?.value;
  f.entries.clear();
  f.caches.delete("busycube-s970-content-v1");
  expect((await f.rpc("read"))?.value.deleteId).toBeNull();
});
it("new save retires only own older entries and ignores an old page/deletion without clearing shared receipts", async () => {
  const f = fixture(),
    old = (await f.rpc("save"))?.value;
  if (!old?.url) throw new Error("No old save");
  await f.rpc("open", { ...f.client, url: old.url });
  f.entries.set("unrelated-entry", {
    id: "unrelated-entry",
    url: "https://game.example/elsewhere",
  });
  const current = (await f.rpc("save"))?.value;
  expect(current?.id).not.toBe(old.id);
  expect(current?.openId).toBe(old.id);
  expect(f.entries.has("unrelated-entry")).toBe(true);
  expect(f.remove).toHaveBeenCalledWith(old.id);
  await f.deleted(old.id);
  expect((await f.rpc("read"))?.value.deleteId).toBeNull();
  expect((await f.rpc("open", { ...f.client, url: old.url }))?.ok).toBe(false);
});
it("serves saved HTML/JS/CSS/icon offline without substituting a different answer or network version", async () => {
  const f = fixture(),
    state = (await f.rpc("save"))?.value;
  if (!state?.url) throw new Error("No save");
  f.fetch.mockRejectedValue(new Error("Offline"));
  for (const url of [
    state.url,
    `${origin}/content-index/saved.js`,
    `${origin}/content-index/saved.css`,
    `${origin}/icon.svg`,
    `${origin}/icon-192.png`,
  ])
    expect(await (await f.offline(url))?.text()).toBe("owned asset");
});
