import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const code = readFileSync(
  new URL("../public/background-fetch/download-sw.js", import.meta.url),
  "utf8",
);
const origin = "https://game.example",
  channel = "busycube-download-v1";
type View = {
  id: string | null;
  status: string;
  successId: string | null;
  abortId: string | null;
};
function fixture() {
  const cache = new Map<string, Response>(),
    handlers = new Map<string, (event: Record<string, unknown>) => void>();
  const ids: string[] = [];
  const client = {
    id: "player",
    type: "window",
    url: `${origin}/?stage=S-960`,
    postMessage: vi.fn(),
  };
  runInNewContext(code, {
    self: {
      location: { origin },
      registration: {
        scope: `${origin}/background-fetch/`,
        backgroundFetch: { getIds: async () => ids },
      },
      addEventListener: (
        type: string,
        handler: (event: Record<string, unknown>) => void,
      ) => handlers.set(type, handler),
      clients: {
        matchAll: async () => [
          client,
          { ...client, url: `${origin}/?stage=S-740`, postMessage: vi.fn() },
        ],
      },
    },
    caches: {
      open: async () => ({
        match: async (url: string) => cache.get(url)?.clone(),
        put: async (url: string, value: Response) => {
          cache.set(url, value.clone());
        },
      }),
    },
    crypto,
    Response,
    URL,
    Date,
  });
  const rpc = async (
    action: string,
    id?: string,
    source = client,
    trusted = true,
  ) => {
    let pending: Promise<void> | undefined,
      response: { ok: boolean; value: View } | undefined;
    handlers.get("message")?.({
      isTrusted: trusted,
      data: { channel, action, id, requestId: crypto.randomUUID() },
      source,
      ports: [
        {
          postMessage: (value: { ok: boolean; value: View }) => {
            response = value;
          },
          close: vi.fn(),
        },
      ],
      waitUntil: (value: Promise<void>) => {
        pending = value;
      },
    });
    await pending;
    return response;
  };
  const event = async (
    type: string,
    id: string | null,
    options: {
      trusted?: boolean;
      result?: string;
      failureReason?: string;
      badBytes?: boolean;
      wrongUrl?: boolean;
      count?: number;
    } = {},
  ) => {
    let pending: Promise<void> | undefined;
    const bytes = options.badBytes
      ? new Uint8Array(65536)
      : Uint8Array.from({ length: 65536 }, (_, i) => i % 251);
    const record = {
      request: new Request(
        `${origin}/background-fetch/parcel.bin?trial=${options.wrongUrl ? "old" : id}`,
      ),
      responseReady: Promise.resolve(new Response(bytes)),
    };
    handlers.get(type)?.({
      type,
      isTrusted: options.trusted ?? true,
      registration: {
        id,
        result:
          options.result ??
          (type === "backgroundfetchsuccess" ? "success" : "failure"),
        failureReason:
          options.failureReason ??
          (type === "backgroundfetchabort" ? "aborted" : ""),
        matchAll: async () =>
          Array.from({ length: options.count ?? 1 }, () => record),
      },
      waitUntil: (value: Promise<void>) => {
        pending = value;
      },
    });
    await pending;
  };
  return { rpc, event, client, ids, cache };
}
it("prepares one attempt across competing windows and rejects non-stage/untrusted requests", async () => {
  const f = fixture();
  const [first, second] = await Promise.all([
    f.rpc("prepare"),
    f.rpc("prepare", undefined, { ...f.client, id: "other" }),
  ]);
  expect(first?.ok).toBe(true);
  expect(second?.ok).toBe(false);
  expect(
    await f.rpc("prepare", undefined, {
      ...f.client,
      url: `${origin}/?stage=S-970`,
    }),
  ).toBeUndefined();
  expect(await f.rpc("read", undefined, f.client, false)).toBeUndefined();
  expect(
    (await f.rpc("arm", first?.value.id ?? "", { ...f.client, id: "other" }))
      ?.ok,
  ).toBe(false);
});
it("requires the current native success, exact request and real full-body hash, then keeps its receipt for a closed-page revisit", async () => {
  const f = fixture();
  const id = (await f.rpc("prepare"))?.value.id ?? "";
  await f.rpc("arm", id);
  await f.event("backgroundfetchsuccess", id, { trusted: false });
  expect((await f.rpc("read"))?.value.successId).toBeNull();
  await f.event(
    "backgroundfetchsuccess",
    `busycube-s960-${crypto.randomUUID()}`,
  );
  expect((await f.rpc("read"))?.value.successId).toBeNull();
  await f.event("backgroundfetchsuccess", id);
  expect((await f.rpc("read"))?.value).toMatchObject({
    status: "success",
    successId: id,
    abortId: null,
  });
  expect(f.client.postMessage).toHaveBeenCalledWith({
    channel,
    type: "changed",
  });
  const next = (await f.rpc("prepare"))?.value.id;
  expect(next).not.toBe(id);
  await f.event("backgroundfetchabort", id);
  expect((await f.rpc("read"))?.value).toMatchObject({
    id: next,
    status: "prepared",
    successId: id,
    abortId: null,
  });
});
it.each([
  { badBytes: true },
  { wrongUrl: true },
  { count: 0 },
  { count: 2 },
  { result: "failure" },
])("does not credit an invalid success %j", async (options) => {
  const f = fixture(),
    id = (await f.rpc("prepare"))?.value.id ?? "";
  await f.event("backgroundfetchsuccess", id, options);
  expect((await f.rpc("read"))?.value).toMatchObject({
    status: "failed",
    successId: null,
    abortId: null,
  });
});
it("separates native abort from network failure or merchant failure and leaves unrelated active downloads alone", async () => {
  const f = fixture();
  let id = (await f.rpc("prepare"))?.value.id ?? "";
  await f.event("backgroundfetchfail", id, { failureReason: "fetch-error" });
  expect((await f.rpc("read"))?.value.abortId).toBeNull();
  id = (await f.rpc("prepare"))?.value.id ?? "";
  await f.rpc("failed", id);
  await f.event("backgroundfetchabort", id);
  expect((await f.rpc("read"))?.value.abortId).toBeNull();
  id = (await f.rpc("prepare"))?.value.id ?? "";
  await f.event("backgroundfetchabort", id, { failureReason: "fetch-error" });
  expect((await f.rpc("read"))?.value.abortId).toBeNull();
  id = (await f.rpc("prepare"))?.value.id ?? "";
  await f.rpc("arm", id);
  await f.event("backgroundfetchabort", id);
  expect((await f.rpc("read"))?.value).toMatchObject({
    status: "aborted",
    abortId: id,
    successId: null,
  });
  f.ids.push(`busycube-s960-${crypto.randomUUID()}`);
  expect((await f.rpc("prepare"))?.ok).toBe(false);
});
