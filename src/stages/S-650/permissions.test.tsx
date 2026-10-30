// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { keys, type PermissionKey, requestPermission } from "./permissions";
import { stage } from "./stage";

const navigatorDescriptors = new Map<string, PropertyDescriptor | undefined>();
function navigatorValue(name: string, value: unknown) {
  if (!navigatorDescriptors.has(name))
    navigatorDescriptors.set(
      name,
      Object.getOwnPropertyDescriptor(navigator, name),
    );
  Object.defineProperty(navigator, name, { configurable: true, value });
}
class PermissionFixture extends EventTarget implements PermissionStatus {
  name = "fixture";
  onchange: PermissionStatus["onchange"] = null;
  constructor(public state: PermissionState = "prompt") {
    super();
  }
}
class SensorFixture extends EventTarget {
  start = vi.fn();
  stop = vi.fn();
  constructor() {
    super();
    sensors.push(this);
  }
}
const sensors: SensorFixture[] = [];
function fixture(state: PermissionState = "prompt") {
  const statuses = Object.fromEntries(
    keys.map((key) => [key, new PermissionFixture(state)]),
  ) as Record<PermissionKey, PermissionFixture>;
  const query = vi.fn(async (descriptor: PermissionDescriptor) => {
    const key = keys.find((key) => key === descriptor.name);
    if (!key) throw new TypeError("Unsupported permission");
    return statuses[key];
  });
  navigatorValue("permissions", { query });
  const stop = vi.fn();
  const getUserMedia = vi.fn(
    async (): Promise<{ getTracks(): { stop(): void }[] }> => ({
      getTracks: () => [{ stop }],
    }),
  );
  navigatorValue("mediaDevices", { getUserMedia });
  const readText = vi.fn(async () => "private clipboard fixture");
  const writeText = vi.fn();
  navigatorValue("clipboard", { readText, writeText });
  const watchPosition = vi.fn();
  const clearWatch = vi.fn();
  navigatorValue("geolocation", { watchPosition, clearWatch });
  const notification = vi.fn(async () => "granted");
  vi.stubGlobal("Notification", { requestPermission: notification });
  vi.stubGlobal("Accelerometer", SensorFixture);
  vi.stubGlobal("Gyroscope", SensorFixture);
  const fonts = vi.fn(async () => ["private font fixture"]);
  vi.stubGlobal("queryLocalFonts", fonts);
  const idle = vi.fn(async () => "granted");
  const startIdle = vi.fn();
  vi.stubGlobal(
    "IdleDetector",
    class {
      static requestPermission = idle;
      start = startIdle;
    },
  );
  return {
    statuses,
    query,
    stop,
    getUserMedia,
    readText,
    writeText,
    watchPosition,
    clearWatch,
    notification,
    fonts,
    idle,
    startIdle,
  };
}
function props(): StageComponentProps {
  return {
    locale: "en",
    signal: new AbortController().signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const [name, descriptor] of navigatorDescriptors) {
    if (descriptor) Object.defineProperty(navigator, name, descriptor);
    else Reflect.deleteProperty(navigator, name);
  }
  navigatorDescriptors.clear();
  sensors.length = 0;
  vi.useRealTimers();
});

it("opens ten initially granted permissions without acquiring data or starting monitors", async () => {
  const f = fixture("granted");
  const p = props();
  const removals = Object.values(f.statuses).map((status) =>
    vi.spyOn(status, "removeEventListener"),
  );
  let unmount = () => {};
  await act(async () => {
    ({ unmount } = render(<stage.Component {...p} />));
  });
  expect(screen.getAllByRole("region")).toHaveLength(10);
  for (const box of Object.values(p.boxes))
    expect(box.solve).toHaveBeenCalledOnce();
  for (const request of [
    f.getUserMedia,
    f.readText,
    f.writeText,
    f.fonts,
    f.idle,
    f.notification,
    f.watchPosition,
  ])
    expect(request).not.toHaveBeenCalled();
  expect(sensors).toHaveLength(0);
  unmount();
  for (const remove of removals)
    expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
});

it("never substitutes acquisition or request results for granted, and discards acquired data", async () => {
  const f = fixture();
  const p = props();
  await act(async () => {
    render(<stage.Component {...p} />);
  });
  for (const name of [
    "Camera",
    "Local fonts",
    "Clipboard reading",
    "Idle detection",
    "Notifications",
    "Clipboard writing",
  ]) {
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`^${name}:`) }),
      );
    });
  }
  expect(f.stop).toHaveBeenCalledOnce();
  expect(f.fonts).toHaveBeenCalledOnce();
  expect(f.readText).toHaveBeenCalledOnce();
  expect(f.writeText).not.toHaveBeenCalled();
  expect(f.idle).toHaveBeenCalledOnce();
  expect(f.startIdle).not.toHaveBeenCalled();
  expect(document.body.textContent).not.toContain("private clipboard fixture");
  expect(document.body.textContent).not.toContain("private font fixture");
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
  await act(async () => {
    for (const permission of Object.values(f.statuses)) {
      permission.state = "granted";
      permission.dispatchEvent(new Event("change"));
    }
  });
  for (const box of Object.values(p.boxes))
    expect(box.solve).toHaveBeenCalledOnce();
  await act(async () => {
    f.statuses.camera.state = "denied";
    f.statuses.camera.dispatchEvent(new Event("change"));
  });
  expect(screen.getByRole("region", { name: "Camera" }).textContent).toContain(
    "Denied",
  );
  expect(p.boxes.B03?.solve).toHaveBeenCalledOnce();
});

it("keeps unsupported query and absent API unachieved instead of treating them as granted", async () => {
  const f = fixture("granted");
  f.query.mockImplementation(async (descriptor) => {
    if (descriptor.name === "camera") throw new TypeError("Unsupported query");
    const key = keys.find((key) => key === descriptor.name);
    if (!key) throw new TypeError("Unsupported query");
    return f.statuses[key];
  });
  vi.stubGlobal("queryLocalFonts", undefined);
  const p = props();
  await act(async () => {
    render(<stage.Component {...p} />);
  });
  expect(p.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(p.boxes.B07?.solve).not.toHaveBeenCalled();
  expect(screen.getByRole("region", { name: "Camera" }).textContent).toContain(
    "Cannot confirm",
  );
  expect(
    screen.getByRole("region", { name: "Local fonts" }).textContent,
  ).toContain("Unavailable");
});

it("stops every late media track after leaving and ignores permission changes after cleanup", async () => {
  const f = fixture();
  const p = props();
  let resolve:
    | ((stream: { getTracks(): { stop(): void }[] }) => void)
    | undefined;
  f.getUserMedia.mockImplementation(
    () =>
      new Promise((complete) => {
        resolve = complete;
      }),
  );
  const view = render(<stage.Component {...p} />);
  await act(async () => {});
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Camera:/ }));
  });
  view.unmount();
  const first = vi.fn(() => {
    throw new Error("Already ended");
  });
  const second = vi.fn();
  await act(async () => {
    resolve?.({ getTracks: () => [{ stop: first }, { stop: second }] });
  });
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledOnce();
  f.statuses.camera.state = "granted";
  f.statuses.camera.dispatchEvent(new Event("change"));
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});

it("stops sensors on activation, abort, error and timeout without reading a value", async () => {
  fixture();
  for (const mode of ["activate", "abort", "error", "timeout"]) {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = requestPermission("accelerometer", controller.signal);
    const sensor = sensors.at(-1);
    if (!sensor) throw new Error("Sensor was not constructed");
    for (const axis of ["x", "y", "z"])
      Object.defineProperty(sensor, axis, {
        get: () => {
          throw new Error("No raw sensor reads");
        },
      });
    if (mode === "activate") {
      sensor.dispatchEvent(new Event("activate"));
      await promise;
    } else {
      const rejected = expect(promise).rejects.toBeInstanceOf(DOMException);
      if (mode === "abort") controller.abort();
      else if (mode === "error") sensor.dispatchEvent(new Event("error"));
      else await vi.advanceTimersByTimeAsync(10_000);
      await rejected;
    }
    expect(sensor.stop).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  }
});

it("cancels location observation including watch id zero without reading coordinates", async () => {
  const f = fixture();
  f.watchPosition.mockReturnValue(0);
  const controller = new AbortController();
  const promise = requestPermission("geolocation", controller.signal);
  const rejected = expect(promise).rejects.toMatchObject({
    name: "AbortError",
  });
  controller.abort();
  await rejected;
  expect(f.clearWatch).toHaveBeenCalledWith(0);
});
