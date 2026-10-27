// @vitest-environment jsdom
import { MessageChannel, MessagePort } from "node:worker_threads";
import { stageWorker, workerRequest } from "./workerChannel";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("MessageChannel", MessageChannel);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "serviceWorker");
});
function registrationFixture() {
  const worker = Object.assign(new EventTarget(), {
    state: "installing",
    scriptURL: new URL("/owned/sw.js", location.origin).href,
  });
  const registration = Object.assign(new EventTarget(), {
    installing: worker,
    active: null,
  });
  const register = vi.fn(async () => registration);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });
  return { worker, registration, register };
}
it("waits for the exact worker activation, requests fresh imports, and cleans activation timers/listeners", async () => {
  const f = registrationFixture(),
    controller = new AbortController();
  const result = stageWorker("/owned/sw.js", "/owned/", controller.signal);
  await Promise.resolve();
  f.worker.state = "activated";
  f.worker.dispatchEvent(new Event("statechange"));
  expect((await result).worker).toBe(f.worker);
  expect(f.register).toHaveBeenCalledWith(
    new URL("/owned/sw.js", location.origin).href,
    { scope: "/owned/", updateViaCache: "none" },
  );
  expect(vi.getTimerCount()).toBe(0);
});
it("rejects pre-aborted and timed-out activation without registering or leaving a timer", async () => {
  const f = registrationFixture(),
    controller = new AbortController();
  controller.abort();
  await expect(
    stageWorker("/owned/sw.js", "/owned/", controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(f.register).not.toHaveBeenCalled();
  const result = stageWorker(
      "/owned/sw.js",
      "/owned/",
      new AbortController().signal,
    ),
    rejected = expect(result).rejects.toThrow("Worker timed out");
  await vi.advanceTimersByTimeAsync(10000);
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});
const valid = (value: unknown): value is { n: number } =>
  !!value &&
  typeof value === "object" &&
  "n" in value &&
  typeof value.n === "number";
it.each(["ok", "old-request", "invalid-value", "wrong-channel"])(
  "correlates real MessagePort replies and rejects %s",
  async (kind) => {
    const close = vi.spyOn(MessagePort.prototype, "close");
    const worker = {
      postMessage: (
        message: { channel: string; requestId: string },
        ports: MessagePort[],
      ) => {
        ports[0]?.postMessage({
          channel: kind === "wrong-channel" ? "other" : message.channel,
          requestId: kind === "old-request" ? "old" : message.requestId,
          ok: true,
          value: kind === "invalid-value" ? { n: "bad" } : { n: 1 },
        });
      },
    };
    const result = workerRequest(
      worker as unknown as ServiceWorker,
      "owned",
      { action: "read" },
      new AbortController().signal,
      valid,
    );
    if (kind === "ok") {
      const value = await result;
      expect(value).toEqual({ n: 1 });
    } else await expect(result).rejects.toThrow("Invalid Worker reply");
    expect(close).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  },
);
it("closes both RPC ports on abort and timeout without accepting late replies", async () => {
  const close = vi.spyOn(MessagePort.prototype, "close"),
    controller = new AbortController(),
    worker = { postMessage: vi.fn() };
  const result = workerRequest(
      worker as unknown as ServiceWorker,
      "owned",
      {},
      controller.signal,
      valid,
    ),
    rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
  controller.abort();
  await rejected;
  expect(close).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
  const next = workerRequest(
      worker as unknown as ServiceWorker,
      "owned",
      {},
      new AbortController().signal,
      valid,
    ),
    timeout = expect(next).rejects.toThrow("Worker did not reply");
  await vi.advanceTimersByTimeAsync(10000);
  await timeout;
  expect(close).toHaveBeenCalledTimes(4);
  expect(vi.getTimerCount()).toBe(0);
});
