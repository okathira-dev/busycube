// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { stage } from "./stage";

class Sentinel extends EventTarget implements WakeLockSentinel {
  released = false;
  type = "screen" as const;
  onrelease: WakeLockSentinel["onrelease"] = null;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}
const descriptor = Object.getOwnPropertyDescriptor(navigator, "wakeLock");
let visible = true;
function fixture() {
  const sentinel = new Sentinel();
  const request = vi.fn(async () => sentinel);
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
  const controller = new AbortController();
  const p: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  return { sentinel, request, controller, p };
}
beforeEach(() => {
  visible = true;
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (visible ? "visible" : "hidden"),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(document, "visibilityState");
  if (descriptor) Object.defineProperty(navigator, "wakeLock", descriptor);
  else Reflect.deleteProperty(navigator, "wakeLock");
});
async function start() {
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: /^Sun rays:/ })),
  );
}
async function time(ms: number) {
  await act(async () => vi.advanceTimersByTime(ms));
}

it("requires a live sentinel throughout the visible hold and releases it after a single solve", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  expect(f.request).not.toHaveBeenCalled();
  await start();
  await start();
  expect(f.request).toHaveBeenCalledExactlyOnceWith("screen");
  expect(screen.getByRole("status").textContent).toBe("Holding");
  await time(61_000);
  expect(f.p.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(f.sentinel.released).toBe(false);
  await time(1_000);
  expect(f.p.boxes.B03?.solve).toHaveBeenCalledOnce();
  expect(f.sentinel.release).toHaveBeenCalledOnce();
  expect(
    document.querySelector(".s330-progress")?.getAttribute("stroke-dashoffset"),
  ).toBe("0");
  expect(vi.getTimerCount()).toBe(0);
  await start();
  expect(f.request).toHaveBeenCalledOnce();
});

it("starts timing only after acquisition and rejects already released sentinels", async () => {
  const f = fixture();
  let finish: (s: Sentinel) => void = () => {};
  f.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<stage.Component {...f.p} />);
  await start();
  await time(100_000);
  expect(f.p.boxes.B03?.solve).not.toHaveBeenCalled();
  await act(async () => finish(f.sentinel));
  await time(61_000);
  expect(f.p.boxes.B03?.solve).not.toHaveBeenCalled();
  await time(1_000);
  expect(f.p.boxes.B03?.solve).toHaveBeenCalledOnce();
  cleanup();
  const closed = fixture();
  closed.sentinel.released = true;
  render(<stage.Component {...closed.p} />);
  await start();
  await time(100_000);
  expect(closed.p.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("loses elapsed progress on native release or visibility loss and requires a new box attempt", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await start();
  await time(50_000);
  await act(async () => f.sentinel.release());
  expect(vi.getTimerCount()).toBe(0);
  expect(
    document.querySelector(".s330-progress")?.getAttribute("stroke-dashoffset"),
  ).toBe("100");
  const fresh = new Sentinel();
  f.request.mockResolvedValueOnce(fresh);
  await start();
  await time(50_000);
  act(() => {
    visible = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(fresh.release).toHaveBeenCalledOnce();
  act(() => {
    visible = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await time(100_000);
  expect(f.request).toHaveBeenCalledTimes(2);
  expect(f.p.boxes.B03?.solve).not.toHaveBeenCalled();
});

it("resets long unobserved gaps instead of awarding a timer jump", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await start();
  await time(50_000);
  let now = 130_000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  await time(1_000);
  expect(f.p.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(
    document.querySelector(".s330-progress")?.getAttribute("stroke-dashoffset"),
  ).toBe("100");
  for (let n = 0; n < 61; n++) {
    now += 1_000;
    await time(1_000);
  }
  expect(f.p.boxes.B03?.solve).not.toHaveBeenCalled();
  now += 1_000;
  await time(1_000);
  expect(f.p.boxes.B03?.solve).toHaveBeenCalledOnce();
  vi.restoreAllMocks();
});

it("offers release while acquiring and releases a late result without starting the timer", async () => {
  const f = fixture();
  let finish: (s: Sentinel) => void = () => {};
  f.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<stage.Component {...f.p} />);
  await start();
  fireEvent.click(screen.getByRole("button", { name: /^Release$/ }));
  await act(async () => finish(f.sentinel));
  expect(f.sentinel.release).toHaveBeenCalledOnce();
  expect(f.p.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("cleans up on abort and never counts denial or missing APIs as holding", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await start();
  act(() => f.controller.abort());
  expect(f.sentinel.release).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
  cleanup();
  const denied = fixture();
  denied.request.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  render(<stage.Component {...denied.p} />);
  await start();
  await time(100_000);
  expect(screen.getByRole("status").textContent).toBe("Denied");
  expect(denied.p.boxes.B03?.solve).not.toHaveBeenCalled();
  cleanup();
  Reflect.deleteProperty(navigator, "wakeLock");
  render(<stage.Component {...denied.p} />);
  await start();
  await time(100_000);
  expect(screen.getByRole("status").textContent).toBe("Unavailable");
  expect(denied.p.boxes.B03?.solve).not.toHaveBeenCalled();
});
