// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type {
  StageComponentProps,
  StageModule,
} from "../../runtime/stageContract";
import { stage as wakeStage } from "../S-330/stage";
import { stage as idleStage } from "./stage";

const previousWake = Object.getOwnPropertyDescriptor(navigator, "wakeLock");
const previousVisibility = Object.getOwnPropertyDescriptor(
  document,
  "visibilityState",
);
class Sentinel extends EventTarget implements WakeLockSentinel {
  released = false;
  type = "screen" as const;
  onrelease: WakeLockSentinel["onrelease"] = null;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}
function props(stage: StageModule): StageComponentProps {
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
  if (previousWake) Object.defineProperty(navigator, "wakeLock", previousWake);
  else Reflect.deleteProperty(navigator, "wakeLock");
  if (previousVisibility)
    Object.defineProperty(document, "visibilityState", previousVisibility);
  else Reflect.deleteProperty(document, "visibilityState");
});
it("releases S-330's existing Wake Lock when departing before entering the independent idle stage", async () => {
  const sentinel = new Sentinel();
  const request = vi.fn(async () => sentinel);
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  const view = render(<wakeStage.Component {...props(wakeStage)} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Sun rays:/ }));
  });
  expect(sentinel.released).toBe(false);
  view.unmount();
  expect(sentinel.release).toHaveBeenCalledOnce();
  render(<idleStage.Component {...props(idleStage)} />);
  expect(request).toHaveBeenCalledOnce();
  expect(sentinel.released).toBe(true);
});
it("releases a late S-330 sentinel after the stage has already been left", async () => {
  const sentinel = new Sentinel();
  let complete: ((sentinel: WakeLockSentinel) => void) | undefined;
  const request = vi.fn(
    () =>
      new Promise<WakeLockSentinel>((resolve) => {
        complete = resolve;
      }),
  );
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  const view = render(<wakeStage.Component {...props(wakeStage)} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Sun rays:/ }));
  });
  view.unmount();
  await act(async () => {
    complete?.(sentinel);
  });
  expect(sentinel.release).toHaveBeenCalledOnce();
});
