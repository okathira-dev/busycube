// @vitest-environment jsdom
import { type PaymentReply, paymentSession, wallets } from "./payment";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const method = new URL("/payment/method", location.origin).href;
let listener: ((event: unknown) => void) | undefined;
let details: { id: string };
let show: ReturnType<typeof deferred<PaymentReply>>;
let abort: ReturnType<typeof vi.fn<() => Promise<void>>>;
let register: ReturnType<typeof vi.fn<(url: URL) => Promise<unknown>>>;
let posts: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>[];
let controller: AbortController;
let solve: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
let change: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
let session: ReturnType<typeof paymentSession>;
beforeEach(() => {
  show = deferred();
  abort = vi.fn().mockResolvedValue(undefined);
  posts = [];
  register = vi.fn(async (url: URL) => {
    const postMessage = vi.fn();
    posts.push(postMessage);
    return {
      active: {
        state: "activated",
        scriptURL: url.href,
        postMessage,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      paymentManager: { userHint: "" },
    };
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register,
      addEventListener: (_: string, fn: typeof listener) => {
        listener = fn;
      },
      removeEventListener: () => {
        listener = undefined;
      },
    },
  });
  Reflect.set(
    window,
    "PaymentRequest",
    class {
      constructor(_methods: unknown, value: { id: string }) {
        details = value;
      }
      show() {
        return show.promise;
      }
      abort() {
        return abort();
      }
    },
  );
  controller = new AbortController();
  solve = vi.fn();
  change = vi.fn();
  session = paymentSession(controller.signal, "ja", change, solve);
});
afterEach(() => {
  session.dispose();
  Reflect.deleteProperty(window, "PaymentRequest");
  Reflect.deleteProperty(navigator, "serviceWorker");
});
async function start() {
  const running = session.begin();
  await vi.waitFor(() => expect(register).toHaveBeenCalledTimes(2));
  await Promise.resolve();
  await Promise.resolve();
  return { running };
}
function reply(
  outcome: string,
  accepted: boolean,
  wallet = "circle",
): PaymentReply {
  return {
    requestId: details.id,
    methodName: method,
    details: { outcome, accepted, wallet },
    complete: vi.fn().mockResolvedValue(undefined),
  };
}
function event(wallet: "circle" | "diamond" = "circle", extra = {}, data = {}) {
  listener?.({
    isTrusted: true,
    origin: location.origin,
    source: {
      scriptURL: new URL(
        `${wallets.find((w) => w.id === wallet)?.path}payment-handler-sw.js`,
        location.origin,
      ).href,
    },
    data: {
      channel: "busycube-payment",
      type: "handler-event",
      requestId: details.id,
      eventId: crypto.randomUUID(),
      methodName: method,
      trusted: true,
      wallet,
      ...data,
    },
    ...extra,
  });
}
it("starts only on demand, uses fictional BCU, and gates approval on complete success", async () => {
  expect(register).not.toHaveBeenCalled();
  const { running } = await start();
  const completion = deferred<void>();
  const response = reply("approved", true);
  response.complete = vi.fn(() => completion.promise);
  show.resolve(response);
  await Promise.resolve();
  expect(response.complete).toHaveBeenCalledWith("success");
  expect(solve).not.toHaveBeenCalled();
  completion.resolve();
  await running;
  expect(solve).toHaveBeenCalledExactlyOnceWith("B01");
  expect(abort).not.toHaveBeenCalled();
  expect(posts.every((post) => post.mock.calls.length === 1)).toBe(true);
});
it("accepts actual declined false but rejects wrong identity, outcome and failed completion", async () => {
  const { running } = await start();
  const response = reply("declined", false);
  show.resolve(response);
  await running;
  expect(response.complete).toHaveBeenCalledWith("fail");
  expect(solve).toHaveBeenCalledExactlyOnceWith("B02");
});
it.each(["request", "method", "completion"])(
  "does not credit an invalid %s",
  async (kind) => {
    const { running } = await start();
    const response = reply("approved", true);
    if (kind === "request") response.requestId = "old";
    if (kind === "method") response.methodName = "https://other.example/method";
    if (kind === "completion")
      response.complete = vi.fn().mockRejectedValue(new Error("closed"));
    show.resolve(response);
    await running;
    expect(solve).not.toHaveBeenCalled();
  },
);
it("credits retry on the next authenticated handler event before retry settlement, never the retry call alone", async () => {
  const { running } = await start();
  event();
  const retry = deferred<void>();
  const response = reply("needs-retry", false);
  response.retry = vi.fn(() => retry.promise);
  show.resolve(response);
  await vi.waitFor(() => expect(response.retry).toHaveBeenCalledOnce());
  expect(solve).not.toHaveBeenCalled();
  event("diamond", { isTrusted: false });
  event("circle", {}, { requestId: "old" });
  event("circle", {
    source: { scriptURL: `${location.origin}/service-worker.js` },
  });
  expect(solve).not.toHaveBeenCalled();
  event();
  expect(solve).toHaveBeenCalledExactlyOnceWith("B03");
  expect(response.complete).not.toHaveBeenCalled();
  retry.resolve();
  await running;
  expect(solve).toHaveBeenCalledTimes(1);
});
it("does not credit retry promise settlement or an event without a previous native event", async () => {
  const { running } = await start();
  const retry = deferred<void>();
  const response = reply("needs-retry", false);
  response.retry = vi.fn(() => retry.promise);
  show.resolve(response);
  await vi.waitFor(() => expect(response.retry).toHaveBeenCalledOnce());
  event();
  expect(solve).not.toHaveBeenCalled();
  retry.resolve();
  await running;
  expect(solve).not.toHaveBeenCalled();
});
it("credits the target wallet event without approval, rejects synthetic/duplicate events, and ignores old visits", async () => {
  const { running } = await start();
  event("diamond", { isTrusted: false });
  event("diamond", { origin: "https://other.example" });
  expect(solve).not.toHaveBeenCalled();
  event("diamond");
  event("diamond");
  expect(solve).toHaveBeenCalledExactlyOnceWith("B04");
  session.cancel();
  event("diamond");
  show.resolve(reply("approved", true));
  await running;
  expect(solve).toHaveBeenCalledTimes(1);
  expect(abort).toHaveBeenCalledOnce();
  expect(posts.every((post) => post.mock.calls.length === 1)).toBe(true);
});
it("aborts on leave and completes a late response only once, without changing status or opening a box", async () => {
  const { running } = await start();
  controller.abort();
  const response = reply("approved", true);
  show.resolve(response);
  await running;
  expect(response.complete).toHaveBeenCalledExactlyOnceWith("unknown");
  expect(abort).toHaveBeenCalledOnce();
  expect(solve).not.toHaveBeenCalled();
  expect(change).toHaveBeenCalledTimes(1);
  expect(listener).toBeUndefined();
});
