// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { useStageSensor } from "./sensorStage";

class FixtureSensor extends EventTarget implements Sensor {
  activated = false;
  hasReading = false;
  timestamp: number | null = null;
  readonly listeners = new Map<
    string,
    Set<EventListenerOrEventListenerObject>
  >();
  start = vi.fn(() => {
    this.activated = true;
  });
  stop = vi.fn(() => {
    this.activated = false;
    this.hasReading = false;
  });
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    super.addEventListener(type, listener, options);
    if (listener) {
      const listeners = this.listeners.get(type) ?? new Set();
      listeners.add(listener);
      this.listeners.set(type, listeners);
    }
  }
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    super.removeEventListener(type, listener, options);
    if (listener) this.listeners.get(type)?.delete(listener);
  }
  emit(type: string, error?: DOMException) {
    // Controlled event fixture, not an actual Generic Sensor observation.
    const source = new Event(type);
    const event = new Proxy(source, {
      get(target, key) {
        if (key === "isTrusted") return true;
        if (key === "error") return error;
        return Reflect.get(target, key, target);
      },
    });
    for (const listener of this.listeners.get(type) ?? [])
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
  }
}
function props(signal: AbortSignal): StageComponentProps {
  return {
    locale: "en",
    signal,
    boxes: {},
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
}
function Harness({
  signal,
  create,
  reading,
}: {
  signal: AbortSignal;
  create(): Sensor;
  reading(sensor: Sensor): void;
}) {
  const sensor = useStageSensor(props(signal), create, reading);
  return (
    <>
      <button type="button" onClick={sensor.start}>
        Start
      </button>
      <p role="status">{sensor.status}</p>
    </>
  );
}
beforeEach(() => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("ignores synthetic/missing readings, avoids duplicate starts and cleans both listeners on abort", () => {
  const sensor = new FixtureSensor();
  const create = vi.fn(() => sensor);
  const reading = vi.fn();
  const controller = new AbortController();
  render(
    <Harness signal={controller.signal} create={create} reading={reading} />,
  );
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(screen.getByRole("button"));
  expect(create).toHaveBeenCalledOnce();
  act(() => {
    sensor.emit("reading");
  });
  expect(reading).not.toHaveBeenCalled();
  sensor.hasReading = true;
  sensor.timestamp = 0;
  act(() => {
    sensor.dispatchEvent(new Event("reading"));
  });
  expect(reading).not.toHaveBeenCalled();
  act(() => {
    sensor.emit("reading");
  });
  expect(reading).toHaveBeenCalledOnce();
  act(() => {
    controller.abort();
    sensor.emit("reading");
  });
  expect(sensor.stop).toHaveBeenCalledOnce();
  expect(
    [...sensor.listeners.values()].every((listeners) => listeners.size === 0),
  ).toBe(true);
  expect(reading).toHaveBeenCalledOnce();
});
it("uses the latest reading callback without restarting and releases on failure/retry/departure", () => {
  const first = new FixtureSensor();
  const second = new FixtureSensor();
  const create = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
  const old = vi.fn();
  const next = vi.fn();
  const controller = new AbortController();
  const view = render(
    <Harness signal={controller.signal} create={create} reading={old} />,
  );
  fireEvent.click(screen.getByRole("button"));
  view.rerender(
    <Harness signal={controller.signal} create={create} reading={next} />,
  );
  first.hasReading = true;
  first.timestamp = 1;
  act(() => {
    first.emit("reading");
  });
  expect(old).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledOnce();
  act(() => {
    first.emit("error", new DOMException("Denied", "NotAllowedError"));
  });
  expect(screen.getByRole("status").textContent).toBe("denied");
  expect(first.stop).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button"));
  expect(create).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(second.stop).toHaveBeenCalledOnce();
  expect(
    [...second.listeners.values()].every((listeners) => listeners.size === 0),
  ).toBe(true);
});
