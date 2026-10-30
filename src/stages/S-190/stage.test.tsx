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

const previousMedia = Object.getOwnPropertyDescriptor(
  navigator,
  "mediaDevices",
);
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
function install(getDisplayMedia: () => Promise<unknown>) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getDisplayMedia },
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (previousMedia)
    Object.defineProperty(navigator, "mediaDevices", previousMedia);
  else Reflect.deleteProperty(navigator, "mediaDevices");
});
it.each([undefined, "monitor", "window"])(
  "does not scan or solve for surface %s",
  async (surface) => {
    const stop = vi.fn();
    const track = Object.assign(new EventTarget(), {
      stop,
      readyState: "live",
      getSettings: () => ({ displaySurface: surface }),
    });
    install(async () => ({
      getTracks: () => [track],
      getVideoTracks: () => [track],
    }));
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
    const p = props();
    const view = render(<stage.Component {...p} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share a screen" }));
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Browser tab sharing could not be confirmed",
    );
    expect(canvas).not.toHaveBeenCalled();
    for (const box of Object.values(p.boxes))
      expect(box.solve).not.toHaveBeenCalled();
    act(() => {
      track.dispatchEvent(new Event("ended"));
    });
    expect(stop).toHaveBeenCalled();
    view.unmount();
  },
);
it.each([
  ["NotSupportedError", "Unavailable"],
  ["NotAllowedError", "Denied"],
  ["AbortError", "Cancelled"],
])("keeps %s distinct from success", async (name, message) => {
  install(async () => {
    throw new DOMException("fixture", name);
  });
  const p = props();
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Share a screen" }));
  });
  expect(screen.getByRole("status").textContent).toBe(message);
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});
it("stops a stream granted after departure without starting playback", async () => {
  let grant: ((stream: unknown) => void) | undefined;
  install(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  fireEvent.click(screen.getByRole("button", { name: "Share a screen" }));
  view.unmount();
  const stop = vi.fn();
  await act(async () => {
    grant?.({ getTracks: () => [{ stop }] });
  });
  expect(stop).toHaveBeenCalledOnce();
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
});
