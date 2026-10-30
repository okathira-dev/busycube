// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type {
  StageComponentProps,
  StageModule,
} from "../runtime/stageContract";
import { stage as resizeStage } from "./S-020/stage";
import { stage as selectionStage } from "./S-030/stage";
import { stage as absenceStage } from "./S-040/stage";
import { stage as revisitStage } from "./S-060/stage";
import { stage as timingStage } from "./S-170/stage";
import { stage as historyStage } from "./S-220/stage";
import { stage as foldingStage } from "./S-320/stage";
import { stage as batteryStage } from "./S-370/stage";
import { stage as clockStage } from "./S-400/stage";
import { stage as networkStage } from "./S-630/stage";
import { stage as pressureStage } from "./S-660/stage";

function stageProps(stage: StageModule): StageComponentProps {
  return {
    locale: "ja",
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("observes initial battery values, excludes invalid levels, and releases its change listeners", async () => {
  const battery = Object.assign(new EventTarget(), {
    level: Number.NaN,
    charging: true,
  });
  const previous = Object.getOwnPropertyDescriptor(navigator, "getBattery");
  Object.defineProperty(navigator, "getBattery", {
    configurable: true,
    value: async () => battery,
  });
  try {
    const props = stageProps(batteryStage);
    render(<batteryStage.Component {...props} />);
    await waitFor(() => expect(props.boxes.B01?.solve).toHaveBeenCalledOnce());
    expect(props.boxes.B03?.solve).not.toHaveBeenCalled();
    expect(props.boxes.B04?.solve).not.toHaveBeenCalled();
    battery.level = 0.75;
    act(() => battery.dispatchEvent(new Event("levelchange")));
    expect(props.boxes.B03?.solve).toHaveBeenCalledOnce();
    expect(props.boxes.B04?.solve).not.toHaveBeenCalled();
    battery.charging = false;
    battery.level = 0.749;
    act(() => battery.dispatchEvent(new Event("chargingchange")));
    expect(props.boxes.B02?.solve).toHaveBeenCalledOnce();
    expect(props.boxes.B04?.solve).toHaveBeenCalledOnce();
    cleanup();
    act(() => battery.dispatchEvent(new Event("chargingchange")));
    expect(props.boxes.B02?.solve).toHaveBeenCalledOnce();
  } finally {
    if (previous) Object.defineProperty(navigator, "getBattery", previous);
    else Reflect.deleteProperty(navigator, "getBattery");
  }
});

it("resynchronizes before accepting wall-clock changes and stops networking after restoration", async () => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
      "performance",
    ],
  });
  const utc = Date.UTC(2026, 9, 26, 3);
  vi.setSystemTime(utc);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const request = vi.fn(async (url: RequestInfo | URL) => {
    const now = utc + performance.now();
    return String(url).includes("utctime")
      ? Response.json({ unix_ms: now })
      : Response.json({
          timeZone: "Etc/UTC",
          dateTime: new Date(now).toISOString().replace(/Z$/, ""),
        });
  });
  vi.stubGlobal("fetch", request);
  const props = stageProps(clockStage);
  render(<clockStage.Component {...props} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(props.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(props.boxes.B04?.solve).not.toHaveBeenCalled();
  vi.setSystemTime(utc + performance.now() - 3600000);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(props.boxes.B03?.solve).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(props.boxes.B03?.solve).toHaveBeenCalled();
  expect(props.boxes.B04?.solve).not.toHaveBeenCalled();
  vi.setSystemTime(utc + performance.now());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(props.boxes.B04?.solve).toHaveBeenCalledOnce();
  const count = request.mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(request).toHaveBeenCalledTimes(count);
  expect(vi.getTimerCount()).toBe(0);
});

it("reads the initial network type and later changes without inferring from effectiveType", () => {
  const info = Object.assign(new EventTarget(), {
    type: "wifi",
    effectiveType: "4g",
  });
  const previous = Object.getOwnPropertyDescriptor(navigator, "connection");
  Object.defineProperty(navigator, "connection", {
    configurable: true,
    value: info,
  });
  try {
    const props = stageProps(networkStage);
    render(<networkStage.Component {...props} />);
    expect(props.boxes.B01?.solve).toHaveBeenCalledOnce();
    expect(props.boxes.B02?.solve).not.toHaveBeenCalled();
    info.type = "unknown";
    act(() => info.dispatchEvent(new Event("change")));
    expect(props.boxes.B02?.solve).not.toHaveBeenCalled();
    for (const type of ["cellular", "ethernet", "bluetooth"]) {
      info.type = type;
      act(() => info.dispatchEvent(new Event("change")));
    }
    for (const box of Object.values(props.boxes))
      expect(box.solve).toHaveBeenCalledOnce();
    cleanup();
    act(() => info.dispatchEvent(new Event("change")));
    expect(props.boxes.B04?.solve).toHaveBeenCalledOnce();
  } finally {
    if (previous) Object.defineProperty(navigator, "connection", previous);
    else Reflect.deleteProperty(navigator, "connection");
  }
});

it("separates fair from serious and accepts serious without requiring critical", () => {
  let handler: ((records: Array<{ state: string }>) => void) | undefined;
  const disconnect = vi.fn();
  class Observer {
    static knownSources = ["cpu"];
    constructor(callback: (records: Array<{ state: string }>) => void) {
      handler = callback;
    }
    observe = vi.fn(async () => {});
    disconnect = disconnect;
  }
  vi.stubGlobal("PressureObserver", Observer);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const props = stageProps(pressureStage);
  render(<pressureStage.Component {...props} />);
  act(() => handler?.([{ state: "nominal" }]));
  expect(props.boxes.B01?.solve).toHaveBeenCalledOnce();
  act(() => handler?.([{ state: "serious" }]));
  expect(props.boxes.B03?.solve).toHaveBeenCalledOnce();
  expect(props.boxes.B04?.solve).not.toHaveBeenCalled();
  act(() => handler?.([{ state: "fair" }]));
  expect(props.boxes.B04?.solve).toHaveBeenCalledOnce();
  act(() => handler?.([{ state: "critical" }]));
  expect(props.boxes.B03?.solve).toHaveBeenCalledOnce();
  expect(screen.getByRole("meter").getAttribute("value")).toBe("4");
  cleanup();
  expect(disconnect).toHaveBeenCalled();
  act(() => handler?.([{ state: "nominal" }]));
  expect(props.boxes.B01?.solve).toHaveBeenCalledOnce();
});

it("shows a single monitor-wide gauge and opens only inside the resize target band", () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1000);
  vi.spyOn(window.screen, "width", "get").mockReturnValue(1920);
  const props = stageProps(resizeStage);
  render(<resizeStage.Component {...props} />);
  const meter = screen.getByRole("meter");
  expect(meter.getAttribute("min")).toBe("0");
  expect(meter.getAttribute("max")).toBe("1920");
  expect(meter.getAttribute("low")).toBe("902");
  expect(meter.getAttribute("high")).toBe("938");
  expect(meter.getAttribute("optimum")).toBe("920");
  expect(screen.queryByText(/1000.*920/)).toBeNull();
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(939);
  act(() => window.dispatchEvent(new Event("resize")));
  expect(props.boxes.B01?.solve).not.toHaveBeenCalled();
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(938);
  act(() => window.dispatchEvent(new Event("resize")));
  expect(props.boxes.B01?.solve).toHaveBeenCalledOnce();
});

it("keeps the bracketed sentence as the only visible selection clue", () => {
  render(<selectionStage.Component {...stageProps(selectionStage)} />);
  expect(screen.getByText("ひかりの[あいだ]にしるし。")).toBeTruthy();
  expect(screen.queryByText("あいだ", { exact: true })).toBeNull();
});

it("measures the last absence and opens the two-second and sixty-second boxes independently", () => {
  let now = 0;
  let visibility: DocumentVisibilityState = "visible";
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(document, "visibilityState", "get").mockImplementation(
    () => visibility,
  );
  const props = stageProps(absenceStage);
  render(<absenceStage.Component {...props} />);
  expect(screen.getByText("—")).toBeTruthy();
  const changeVisibility = (state: DocumentVisibilityState) => {
    visibility = state;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
  };
  changeVisibility("hidden");
  now = 1999;
  changeVisibility("visible");
  expect(props.boxes.B01?.solve).not.toHaveBeenCalled();
  changeVisibility("hidden");
  now += 2000;
  changeVisibility("visible");
  expect(screen.getByText("2.0")).toBeTruthy();
  expect(props.boxes.B01?.solve).toHaveBeenCalledOnce();
  expect(props.boxes.B02?.solve).not.toHaveBeenCalled();
  changeVisibility("hidden");
  now += 60_000;
  changeVisibility("visible");
  expect(screen.getByText("60.0")).toBeTruthy();
  expect(props.boxes.B02?.solve).toHaveBeenCalledOnce();
  cleanup();
  changeVisibility("hidden");
  now += 60_000;
  changeVisibility("visible");
  expect(props.boxes.B02?.solve).toHaveBeenCalledOnce();
});

it("opens S-060 only for an observed game-stage revisit, even with old saved markers", () => {
  const props = stageProps(revisitStage);
  props.progress = { hasMarker: () => true, mark: vi.fn() };
  const view = render(
    <revisitStage.Component
      {...props}
      services={{
        arrival: { stageId: "S-060", kind: "reload", revisit: false },
      }}
    />,
  );
  expect(props.boxes.B03?.solve).not.toHaveBeenCalled();
  view.rerender(
    <revisitStage.Component
      {...props}
      services={{
        arrival: { stageId: "S-060", kind: "navigate", revisit: true },
      }}
    />,
  );
  expect(props.boxes.B03?.solve).toHaveBeenCalledOnce();
  expect(props.boxes.B02?.solve).not.toHaveBeenCalled();
});

it.each([
  ["navigate", null],
  ["back", "B05"],
  ["reload", "B03"],
  ["forward", "B06"],
] as const)("maps a %s arrival to only its own S-220 box", (kind, expected) => {
  const props = stageProps(historyStage);
  render(
    <historyStage.Component
      {...props}
      services={{ arrival: { stageId: "S-220", kind, revisit: true } }}
    />,
  );
  for (const [id, box] of Object.entries(props.boxes)) {
    expect(box.solve).toHaveBeenCalledTimes(id === expected ? 1 : 0);
  }
});

it("requires an observed paused animation in the top five percent and allows retry", () => {
  let progress: number | null = null;
  const animation = {
    playState: "running",
    pause: vi.fn(() => {
      animation.playState = "paused";
    }),
    play: vi.fn(() => {
      animation.playState = "running";
    }),
    cancel: vi.fn(),
    effect: { getComputedTiming: () => ({ progress }) },
  };
  const original = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "animate",
  );
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: () => animation,
  });
  try {
    const props = stageProps(timingStage);
    render(<timingStage.Component {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "停止" }));
    expect(props.boxes.B02?.solve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "再開" }));
    progress = 0.949;
    fireEvent.click(screen.getByRole("button", { name: "停止" }));
    expect(props.boxes.B02?.solve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "再開" }));
    progress = 0.95;
    fireEvent.click(screen.getByRole("button", { name: "停止" }));
    expect(props.boxes.B02?.solve).toHaveBeenCalledOnce();
    cleanup();
    expect(animation.cancel).toHaveBeenCalledOnce();
  } finally {
    if (original) Object.defineProperty(Element.prototype, "animate", original);
    else Reflect.deleteProperty(Element.prototype, "animate");
  }
});

it.each(["folded", "continuous"])(
  "requires a posture change from an initial %s state",
  (initial) => {
    const api = Object.assign(new EventTarget(), { type: initial });
    const previous = Object.getOwnPropertyDescriptor(
      navigator,
      "devicePosture",
    );
    Object.defineProperty(navigator, "devicePosture", {
      configurable: true,
      value: api,
    });
    try {
      const props = stageProps(foldingStage);
      render(<foldingStage.Component {...props} />);
      expect(props.boxes.B02?.solve).not.toHaveBeenCalled();
      act(() => api.dispatchEvent(new Event("change")));
      expect(props.boxes.B02?.solve).not.toHaveBeenCalled();
      api.type = initial === "folded" ? "continuous" : "folded";
      act(() => api.dispatchEvent(new Event("change")));
      expect(props.boxes.B02?.solve).toHaveBeenCalledOnce();
      cleanup();
      act(() => api.dispatchEvent(new Event("change")));
      expect(props.boxes.B02?.solve).toHaveBeenCalledOnce();
    } finally {
      if (previous) Object.defineProperty(navigator, "devicePosture", previous);
      else Reflect.deleteProperty(navigator, "devicePosture");
    }
  },
);
