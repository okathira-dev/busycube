// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  deriveStageAccessKind,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { manifest } from "./manifest";
import { stage } from "./stage";

const instances: IdleFixture[] = [];
let initialUser: IdleDetectorUserState | null = "active";
let initialScreen: IdleDetectorScreenState | null = "unlocked";
const starting = vi.fn<(detector: IdleFixture) => Promise<void>>(
  async () => {},
);
class IdleFixture extends EventTarget {
  static requestPermission = vi.fn(
    async (): Promise<PermissionState> => "granted",
  );
  userState = initialUser;
  screenState = initialScreen;
  options?: IdleDetectorStartOptions;
  listeners = new Set<EventListenerOrEventListenerObject>();
  start = vi.fn(async (options?: IdleDetectorStartOptions) => {
    this.options = options;
    await starting(this);
  });
  constructor() {
    super();
    instances.push(this);
  }
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    super.addEventListener(type, listener, options);
    if (type === "change" && listener) this.listeners.add(listener);
  }
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    super.removeEventListener(type, listener, options);
    if (type === "change" && listener) this.listeners.delete(listener);
  }
  emit() {
    const event = new Proxy(new Event("change"), {
      get: (target, key) =>
        key === "isTrusted" ? true : Reflect.get(target, key, target),
    });
    for (const listener of this.listeners) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
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
const wakeDescriptor = Object.getOwnPropertyDescriptor(navigator, "wakeLock");
const wakeAccess = vi.fn(() => {
  throw new Error("Idle stage must not acquire Wake Lock");
});
beforeEach(() => {
  vi.stubGlobal("IdleDetector", IdleFixture);
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    get: wakeAccess,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (wakeDescriptor)
    Object.defineProperty(navigator, "wakeLock", wakeDescriptor);
  else Reflect.deleteProperty(navigator, "wakeLock");
  instances.length = 0;
  initialUser = "active";
  initialScreen = "unlocked";
  starting.mockReset().mockResolvedValue();
  IdleFixture.requestPermission.mockReset().mockResolvedValue("granted");
  expect(wakeAccess).not.toHaveBeenCalled();
  wakeAccess.mockClear();
  vi.useRealTimers();
});

it("uses the limited category, starts from either box once, and never solves from estimated elapsed time", async () => {
  vi.useFakeTimers();
  const p = props();
  render(<stage.Component {...p} />);
  expect(deriveStageAccessKind(manifest.platform)).toBe("limited");
  expect(screen.getAllByRole("button")).toHaveLength(2);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Hourglass:/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Padlock:/ }));
  });
  expect(IdleFixture.requestPermission).toHaveBeenCalledOnce();
  const detector = instances[0];
  if (!detector) throw new Error("No detector");
  expect(detector.options?.threshold).toBe(62_000);
  await act(async () => {
    vi.advanceTimersByTime(100_000);
  });
  const remaining = Number(
    document.querySelector(".s830-estimate")?.getAttribute("stroke-dashoffset"),
  );
  expect(remaining).toBeGreaterThan(0);
  expect(remaining).toBeLessThan(100);
  expect(p.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(p.boxes.B02?.solve).not.toHaveBeenCalled();
  detector.userState = "idle";
  await act(async () => {
    detector.dispatchEvent(new Event("change"));
  });
  expect(p.boxes.B03?.solve).not.toHaveBeenCalled();
  await act(async () => {
    detector.emit();
  });
  expect(p.boxes.B03?.solve).toHaveBeenCalledOnce();
  expect(
    document.querySelector(".s830-estimate")?.getAttribute("stroke-dashoffset"),
  ).toBe("0");
  await act(async () => {
    detector.screenState = "locked";
    detector.emit();
  });
  expect(p.boxes.B02?.solve).toHaveBeenCalledOnce();
  expect(detector.options?.signal?.aborted).toBe(true);
  expect(detector.listeners.size).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

it("accepts an initially locked screen without waiting and then an actual idle/unlocked observation", async () => {
  initialUser = "idle";
  initialScreen = "locked";
  const p = props();
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Padlock:/ }));
  });
  expect(p.boxes.B02?.solve).toHaveBeenCalledOnce();
  expect(p.boxes.B03?.solve).not.toHaveBeenCalled();
  const detector = instances[0];
  if (!detector) throw new Error("No detector");
  await act(async () => {
    detector.userState = "idle";
    detector.screenState = "unlocked";
    detector.emit();
  });
  expect(p.boxes.B03?.solve).toHaveBeenCalledOnce();
});

it("accepts an initial idle/unlocked state from successful start, independent of the ring", async () => {
  initialUser = "idle";
  const p = props();
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Hourglass:/ }));
  });
  expect(p.boxes.B03?.solve).toHaveBeenCalledOnce();
  expect(p.boxes.B02?.solve).not.toHaveBeenCalled();
});

it("does not act on early changes if start fails and removes its listener", async () => {
  starting.mockImplementation(async (detector) => {
    detector.userState = "idle";
    detector.screenState = "locked";
    detector.emit();
    throw new DOMException("Failed", "NotReadableError");
  });
  const p = props();
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Hourglass:/ }));
  });
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
  expect(instances[0]?.listeners.size).toBe(0);
  expect(instances[0]?.options?.signal?.aborted).toBe(true);
  expect(screen.getByRole("status").textContent).toBe("Error");
});

it("ignores permission arriving after unmount without constructing a detector", async () => {
  let grant: ((permission: PermissionState) => void) | undefined;
  IdleFixture.requestPermission.mockImplementation(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Hourglass:/ }));
  });
  view.unmount();
  await act(async () => {
    grant?.("granted");
  });
  expect(instances).toHaveLength(0);
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});

it("aborts active detection and the estimate timer on departure, while denial remains unachieved", async () => {
  const p = props();
  const view = render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Hourglass:/ }));
  });
  const detector = instances[0];
  view.unmount();
  expect(detector?.options?.signal?.aborted).toBe(true);
  expect(detector?.listeners.size).toBe(0);
  IdleFixture.requestPermission.mockResolvedValue("denied");
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Hourglass:/ }));
  });
  expect(screen.getByRole("status").textContent).toBe("Denied");
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});
