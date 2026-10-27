// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { observeMeasurement } from "./gatt";
import { manifest } from "./manifest";
import { stage } from "./stage";

vi.mock("./gatt", () => ({ observeMeasurement: vi.fn() }));
const previous = Object.getOwnPropertyDescriptor(navigator, "bluetooth");
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
beforeEach(() => {
  Object.defineProperty(navigator, "bluetooth", {
    configurable: true,
    value: { requestDevice() {} },
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  if (previous) Object.defineProperty(navigator, "bluetooth", previous);
  else Reflect.deleteProperty(navigator, "bluetooth");
});
it("offers exactly four box controls, cancels a superseded group and solves only its observed group", async () => {
  const signals: AbortSignal[] = [];
  const complete: (() => void)[] = [];
  vi.mocked(observeMeasurement).mockImplementation(
    (_bluetooth, _group, signal) =>
      new Promise<void>((resolve, reject) => {
        signals.push(signal);
        complete.push(resolve);
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }),
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  expect(screen.getAllByRole("button")).toHaveLength(4);
  const battery = screen.getByRole("button", { name: /^Battery:/ });
  fireEvent.click(battery);
  fireEvent.click(battery);
  expect(observeMeasurement).toHaveBeenCalledOnce();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Information:/ }));
  });
  expect(signals[0]?.aborted).toBe(true);
  expect(
    view.container.querySelector(".s280-problem .interaction-status")
      ?.textContent,
  ).toBe("Cancelled");
  await act(async () => {
    complete[1]?.();
  });
  expect(p.boxes[manifest.box.B03]?.solve).toHaveBeenCalledOnce();
  for (const id of [manifest.box.B02, manifest.box.B04, manifest.box.B05])
    expect(p.boxes[id]?.solve).not.toHaveBeenCalled();
});
it("aborts on departure and ignores a late transport result", async () => {
  let signal: AbortSignal | undefined;
  let complete: (() => void) | undefined;
  vi.mocked(observeMeasurement).mockImplementation(
    (_bluetooth, _group, current) => {
      signal = current;
      return new Promise<void>((resolve) => {
        complete = resolve;
      });
    },
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  fireEvent.click(screen.getByRole("button", { name: /^Dumbbell:/ }));
  view.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => {
    complete?.();
  });
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});
it("keeps a denied service distinct from an absent API and never solves either", async () => {
  vi.mocked(observeMeasurement).mockRejectedValue(
    new DOMException("Denied", "SecurityError"),
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Battery:/ }));
  });
  expect(view.container.querySelector(".interaction-status")?.textContent).toBe(
    "Denied",
  );
  Object.defineProperty(navigator, "bluetooth", {
    configurable: true,
    value: undefined,
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Battery:/ }));
  });
  expect(view.container.querySelector(".interaction-status")?.textContent).toBe(
    "Unavailable",
  );
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});
