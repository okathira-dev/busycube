// @vitest-environment jsdom
import { loadIdentity } from "./identity";

const old = Object.getOwnPropertyDescriptor(window, "google");
const url = "https://accounts.google.com/gsi/client";
beforeEach(() => {
  vi.useFakeTimers();
  Reflect.deleteProperty(window, "google");
});
afterEach(() => {
  document.querySelectorAll(`script[src="${url}"]`).forEach((script) => {
    script.remove();
  });
  if (old) Object.defineProperty(window, "google", old);
  else Reflect.deleteProperty(window, "google");
  vi.useRealTimers();
});
it("reuses a complete ID SDK without loading or prompting and rejects an already aborted visit", async () => {
  const id = { initialize: vi.fn(), prompt: vi.fn(), cancel: vi.fn() };
  Reflect.set(window, "google", { accounts: { id } });
  const controller = new AbortController();
  expect(await loadIdentity(controller.signal)).toBe(id);
  expect(id.prompt).not.toHaveBeenCalled();
  expect(document.querySelector(`script[src="${url}"]`)).toBeNull();
  controller.abort();
  await expect(loadIdentity(controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
});
it("removes an owned pending script/listeners/timer on abort and can retry after network failure", async () => {
  const controller = new AbortController();
  const promise = loadIdentity(controller.signal);
  const rejected = expect(promise).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(document.querySelector(`script[src="${url}"]`)).not.toBeNull();
  controller.abort();
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
  expect(document.querySelector(`script[src="${url}"]`)).toBeNull();
  const next = loadIdentity(new AbortController().signal);
  const failed = expect(next).rejects.toThrow("Identity provider unavailable");
  document
    .querySelector(`script[src="${url}"]`)
    ?.dispatchEvent(new Event("error"));
  await failed;
  expect(document.querySelector(`script[src="${url}"]`)).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
it("keeps another feature's pending script and accepts only the actual ID namespace after load", async () => {
  const script = document.createElement("script");
  script.src = url;
  document.head.append(script);
  Reflect.set(window, "google", { accounts: { oauth2: {} } });
  const controller = new AbortController();
  const pending = loadIdentity(controller.signal);
  expect(document.querySelectorAll(`script[src="${url}"]`)).toHaveLength(1);
  const id = { initialize: vi.fn(), prompt: vi.fn(), cancel: vi.fn() };
  Reflect.set(window, "google", { accounts: { oauth2: {}, id } });
  script.dispatchEvent(new Event("load"));
  expect(await pending).toBe(id);
  expect(script.isConnected).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it("bounds a never-loading script and never removes an existing script on timeout", async () => {
  const script = document.createElement("script");
  script.src = url;
  document.head.append(script);
  const pending = loadIdentity(new AbortController().signal);
  const failed = expect(pending).rejects.toThrow(
    "Identity provider unavailable",
  );
  await vi.advanceTimersByTimeAsync(10_000);
  await failed;
  expect(script.isConnected).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
