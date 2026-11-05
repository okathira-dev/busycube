// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { isBusycube, launchSource, type RelatedApp } from "./pwa";
import { stage } from "./stage";

class Mode extends EventTarget {
  matches = false;
  change(value: boolean) {
    this.matches = value;
    this.dispatchEvent(new Event("change"));
  }
}
function fixture() {
  const standalone = new Mode();
  const browser = new Mode();
  browser.matches = true;
  const overlayMode = new Mode();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) =>
      query.includes("standalone")
        ? standalone
        : query.includes("window-controls-overlay")
          ? overlayMode
          : browser,
    ),
  );
  const set = vi.fn(async (_number: number) => {});
  const clear = vi.fn(async () => {});
  const related = vi.fn(async (): Promise<RelatedApp[]> => []);
  const overlay = Object.assign(new EventTarget(), {
    visible: false,
    getTitlebarAreaRect: vi.fn(() => new DOMRect(10, 0, 200, 32)),
  });
  for (const [key, value] of Object.entries({
    setAppBadge: set,
    clearAppBadge: clear,
    getInstalledRelatedApps: related,
    windowControlsOverlay: overlay,
  }))
    Object.defineProperty(navigator, key, { configurable: true, value });
  let consumer: ((params: LaunchParams) => void) | undefined;
  const queue = {
    setConsumer: vi.fn((fn: (params: LaunchParams) => void) => {
      consumer = fn;
    }),
  };
  Object.defineProperty(window, "launchQueue", {
    configurable: true,
    value: queue,
  });
  const requestPermission = vi.fn(
    async (): Promise<NotificationPermission> => "granted",
  );
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  const abort = new AbortController();
  const p: StageComponentProps = {
    locale: "en",
    signal: abort.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  return {
    p,
    abort,
    standalone,
    browser,
    overlayMode,
    set,
    clear,
    related,
    overlay,
    queue,
    requestPermission,
    launch: (url: string) => consumer?.({ targetURL: url, files: [] }),
  };
}
const original = Object.fromEntries(
  [
    "setAppBadge",
    "clearAppBadge",
    "getInstalledRelatedApps",
    "windowControlsOverlay",
  ].map((key) => [key, Object.getOwnPropertyDescriptor(navigator, key)]),
);
const originalQueue = Object.getOwnPropertyDescriptor(window, "launchQueue");
afterEach(async () => {
  cleanup();
  await act(async () => {});
  vi.unstubAllGlobals();
  for (const [key, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(navigator, key, descriptor);
    else Reflect.deleteProperty(navigator, key);
  }
  if (originalQueue)
    Object.defineProperty(window, "launchQueue", originalQueue);
  else Reflect.deleteProperty(window, "launchQueue");
  history.replaceState(null, "", "/");
});
const self = (): RelatedApp => ({
  platform: "webapp",
  id: "/",
  url: "/manifest.webmanifest",
});

it("matches only this related PWA and exact dedicated launch URLs", () => {
  expect(isBusycube(self(), location.origin)).toBe(true);
  expect(
    isBusycube(
      { platform: "webapp", url: "/manifest.webmanifest" },
      location.origin,
    ),
  ).toBe(true);
  for (const app of [
    { platform: "play", id: "/", url: "/manifest.webmanifest" },
    { ...self(), id: "/other" },
    { ...self(), url: "https://other.invalid/manifest.webmanifest" },
    { ...self(), url: undefined },
  ])
    expect(isBusycube(app, location.origin)).toBe(false);
  expect(
    launchSource(
      `${location.origin}/?stage=S-080&source=note`,
      location.origin,
    ),
  ).toBe("note");
  for (const target of [
    "garbage",
    `${location.origin}/?stage=S-310&source=shortcut`,
    `${location.origin}/?stage=S-080&source=note&source=shortcut`,
    `${location.origin}/other?stage=S-080&source=note`,
    "https://other.invalid/?stage=S-080&source=note",
  ])
    expect(launchSource(target, location.origin)).toBeNull();
});

it("keeps unsupported badge/launch/related APIs independent of the real standalone predicate", async () => {
  const f = fixture();
  for (const key of ["setAppBadge", "clearAppBadge", "getInstalledRelatedApps"])
    Reflect.deleteProperty(navigator, key);
  Reflect.deleteProperty(window, "launchQueue");
  f.standalone.matches = true;
  f.browser.matches = false;
  render(<stage.Component {...f.p} />);
  await act(async () => {});
  expect(f.p.boxes.B01?.solve).toHaveBeenCalledOnce();
  for (const id of ["B02", "B03", "B04", "B05", "B06"])
    expect(f.p.boxes[id]?.solve).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /Busycube with badge/ }));
  expect(f.requestPermission).not.toHaveBeenCalled();
  act(() => {
    f.standalone.change(false);
    f.standalone.change(true);
  });
  expect(f.p.boxes.B01?.solve).toHaveBeenCalledOnce();
});

it("rechecks related apps on return and requires browser mode at result time", async () => {
  const f = fixture();
  let finish: (apps: RelatedApp[]) => void = () => {};
  f.related.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<stage.Component {...f.p} />);
  await act(async () => {
    f.browser.change(false);
    finish([self()]);
  });
  expect(f.p.boxes.B05?.solve).not.toHaveBeenCalled();
  f.related.mockResolvedValue([self()]);
  await act(async () => {
    f.browser.change(true);
    window.dispatchEvent(new Event("focus"));
  });
  expect(f.p.boxes.B05?.solve).toHaveBeenCalledOnce();
  await act(async () => f.abort.abort());
  const calls = f.related.mock.calls.length;
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(f.related).toHaveBeenCalledTimes(calls);
});

it("accepts initial and queued launch URLs only in supported app display, without page shortcuts", async () => {
  const f = fixture();
  history.replaceState(null, "", "/?stage=S-080&source=shortcut");
  f.standalone.matches = true;
  f.browser.matches = false;
  const view = render(<stage.Component {...f.p} />);
  await act(async () => {});
  expect(f.p.boxes.B03?.solve).toHaveBeenCalledOnce();
  expect(location.search).not.toContain("source");
  act(() => {
    f.launch("https://other.invalid/?stage=S-080&source=note");
    f.launch(`${location.origin}/?stage=S-080&source=note`);
  });
  expect(f.p.boxes.B04?.solve).toHaveBeenCalledOnce();
  expect(view.container.querySelector("a")).toBeNull();
  await act(async () => f.abort.abort());
  act(() => f.launch(`${location.origin}/?stage=S-080&source=note`));
  expect(f.p.boxes.B04?.solve).toHaveBeenCalledOnce();
  view.unmount();
  const tab = fixture();
  history.replaceState(null, "", "/?stage=S-080&source=note");
  render(<stage.Component {...tab.p} />);
  await act(async () =>
    tab.launch(`${location.origin}/?stage=S-080&source=shortcut`),
  );
  expect(tab.p.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(tab.p.boxes.B04?.solve).not.toHaveBeenCalled();
});

it("never reveals the badge answer and requires both an accepted write and exact manual input", async () => {
  const f = fixture();
  let finish = () => {};
  f.set.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<stage.Component {...f.p} />);
  await act(async () => {});
  const value = f.set.mock.calls[0]?.[0];
  expect(value).toBeGreaterThanOrEqual(1);
  expect(value).toBeLessThanOrEqual(99);
  expect(view.container.textContent).not.toContain(String(value));
  const input = screen.getByLabelText("Number");
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  await act(async () => finish());
  fireEvent.change(input, { target: { value: `0${value}` } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  expect(f.p.boxes.B02?.solve).toHaveBeenCalledOnce();
  expect(f.requestPermission).not.toHaveBeenCalled();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(f.clear).not.toHaveBeenCalled();
  Reflect.deleteProperty(document, "hidden");
  await act(async () => f.abort.abort());
  expect(f.clear).toHaveBeenCalledOnce();
});

it("requests permission from the badge box only, ignores late grants, and serializes cleanup after late writes", async () => {
  const f = fixture();
  let finishWrite = () => {};
  f.set.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishWrite = resolve;
      }),
  );
  let finishPermission: (permission: NotificationPermission) => void = () => {};
  f.requestPermission.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishPermission = resolve;
      }),
  );
  render(<stage.Component {...f.p} />);
  await act(async () => {});
  const box = screen.getByRole("button", { name: /Busycube with badge/ });
  fireEvent.click(box);
  fireEvent.click(box);
  expect(f.requestPermission).toHaveBeenCalledOnce();
  await act(async () => f.abort.abort());
  expect(f.clear).not.toHaveBeenCalled();
  await act(async () => {
    finishPermission("granted");
    finishWrite();
  });
  expect(f.set).toHaveBeenCalledOnce();
  expect(f.clear).toHaveBeenCalledOnce();
  for (const problem of Object.values(f.p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
});

it("keeps the titlebar box within a valid native rectangle and rejects synthetic or hidden-overlay clicks", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  await act(async () => {});
  fireEvent.click(
    screen.getByRole("button", { name: /Window \(in title bar\)/ }),
  );
  expect(f.p.boxes.B06?.solve).not.toHaveBeenCalled();
  f.overlay.visible = true;
  act(() => f.overlay.dispatchEvent(new Event("geometrychange")));
  expect(view.container.querySelector(".s080-titlebar")).toBeNull();
  const bar = document.querySelector<HTMLElement>(".s080-titlebar");
  expect(bar?.style.left).toBe("10px");
  expect(bar?.style.width).toBe("80px");
  expect(bar?.style.height).toBe("32px");
  fireEvent.click(
    screen.getByRole("button", { name: /Window \(in title bar\)/ }),
    { clientX: 30, clientY: 15 },
  );
  expect(f.p.boxes.B06?.solve).not.toHaveBeenCalled();
  f.overlay.getTitlebarAreaRect.mockReturnValue(new DOMRect(0, 0, 10, 10));
  act(() => f.overlay.dispatchEvent(new Event("geometrychange")));
  expect(document.querySelector(".s080-titlebar")).toBeNull();
});
