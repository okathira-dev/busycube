import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const code = readFileSync(
  new URL("../public/payment/payment-handler-runtime.js", import.meta.url),
  "utf8",
);
const origin = "https://game.example";
const method = `${origin}/payment/method`;
const id = "busycube-11111111-1111-4111-8111-111111111111";
async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
function fixture() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const merchant = {
    id: "merchant",
    type: "window",
    url: `${origin}/?stage=S-780`,
    postMessage: vi.fn(),
  };
  const other = {
    id: "other",
    type: "window",
    url: `${origin}/?stage=S-770`,
    postMessage: vi.fn(),
  };
  const client = { id: "native-wallet", url: "", postMessage: vi.fn() };
  const openWindow = vi.fn(async (url: string) => {
    client.url = url;
    return client;
  });
  runInNewContext(code, {
    self: {
      BUSYCUBE_WALLET: { id: "diamond", name: "Busycube Wallet" },
      location: { origin },
      registration: { scope: `${origin}/payment/wallet-diamond/` },
      clients: { matchAll: async () => [merchant, other] },
      addEventListener: (
        type: string,
        fn: (event: Record<string, unknown>) => void,
      ) => listeners.set(type, fn),
    },
    URL,
    DOMException,
    crypto,
    setTimeout,
    clearTimeout,
  });
  const request = (extra = {}) => {
    let response: Promise<unknown> | undefined;
    listeners.get("paymentrequest")?.({
      isTrusted: true,
      paymentRequestOrigin: origin,
      paymentRequestId: id,
      methodData: [
        { supportedMethods: method, data: { busycube: true, locale: "ja" } },
      ],
      total: { currency: "BCU", value: "1.00" },
      openWindow,
      respondWith: (promise: Promise<unknown>) => {
        response = promise;
      },
      ...extra,
    });
    return response;
  };
  const message = async (type: string, source = client, extra = {}) => {
    const url = new URL(client.url);
    let work: Promise<void> | undefined;
    listeners.get("message")?.({
      isTrusted: true,
      source,
      data: {
        channel: "busycube-payment",
        type,
        requestId: id,
        eventId: url.searchParams.get("eventId"),
        ...extra,
      },
      waitUntil: (promise: Promise<void>) => {
        work = promise;
      },
    });
    await work;
  };
  return { request, message, client, merchant, other, openWindow };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it("rejects synthetic, external-origin and non-BCU requests without opening a wallet", async () => {
  const f = fixture();
  expect(f.request({ isTrusted: false })).toBeUndefined();
  await expect(
    f.request({ paymentRequestOrigin: "https://other.example" }),
  ).rejects.toMatchObject({ name: "NotSupportedError" });
  await expect(
    f.request({ total: { currency: "USD", value: "1.00" } }),
  ).rejects.toMatchObject({ name: "NotSupportedError" });
  expect(f.openWindow).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it("announces a native handler only to stage merchants and accepts only its owned window's current event", async () => {
  const f = fixture();
  const result = f.request();
  await flush();
  expect(f.merchant.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "handler-event",
      wallet: "diamond",
      trusted: true,
      requestId: id,
    }),
  );
  expect(f.other.postMessage).not.toHaveBeenCalled();
  await f.message("handler-ready");
  expect(f.client.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      walletName: "Busycube Wallet",
      type: "payment-context",
      attempt: 1,
    }),
  );
  await f.message(
    "handler-action",
    { ...f.client, id: "forged" },
    { action: "approve" },
  );
  await f.message("handler-action", f.client, {
    eventId: "old",
    action: "approve",
  });
  expect(vi.getTimerCount()).toBe(1);
  await f.message("handler-action", f.client, { action: "approve" });
  await expect(result).resolves.toMatchObject({
    methodName: method,
    details: { outcome: "approved", accepted: true, wallet: "diamond" },
  });
  await f.message("merchant-stop", f.merchant);
  expect(vi.getTimerCount()).toBe(0);
  expect(f.client.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({ type: "handler-close" }),
  );
});
it("issues a new event ID on real retry entry and accepts a decline without approval", async () => {
  const f = fixture();
  const first = f.request();
  await flush();
  await f.message("handler-action", f.client, { action: "retry" });
  await expect(first).resolves.toMatchObject({
    details: { outcome: "needs-retry", accepted: false },
  });
  const second = f.request();
  await flush();
  const messages = f.merchant.postMessage.mock.calls.map(([value]) => value);
  expect(messages[1].eventId).not.toBe(messages[0].eventId);
  await f.message("handler-ready");
  expect(f.client.postMessage).toHaveBeenLastCalledWith(
    expect.objectContaining({ attempt: 2 }),
  );
  await f.message("handler-action", f.client, { action: "decline" });
  await expect(second).resolves.toMatchObject({
    details: { outcome: "declined", accepted: false, attempt: 2 },
  });
  await f.message("merchant-stop", f.merchant);
  expect(vi.getTimerCount()).toBe(0);
});
it.each(["handler-closed", "merchant-stop", "timeout"])(
  "rejects %s without returning a successful payment and clears timers",
  async (reason) => {
    const f = fixture();
    const result = f.request();
    const rejected = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    await flush();
    if (reason === "timeout") await vi.advanceTimersByTimeAsync(120_000);
    else
      await f.message(
        reason,
        reason === "merchant-stop" ? f.merchant : f.client,
      );
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  },
);
