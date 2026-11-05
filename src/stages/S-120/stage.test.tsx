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

it("closes the gesture-created context and stops microphone permission granted after departure", async () => {
  class Audio {
    static current: Audio | undefined;
    state = "running";
    constructor() {
      Audio.current = this;
    }
    resume = vi.fn(async () => {});
    close = vi.fn(async () => {
      this.state = "closed";
    });
  }
  vi.stubGlobal("AudioContext", Audio);
  let release: ((value: unknown) => void) | undefined;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const previous = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: () => pending },
  });
  const controller = new AbortController();
  const solve = vi.fn();
  const props: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  try {
    render(<stage.Component {...props} />);
    fireEvent.click(
      screen.getByRole("button", { name: /^Speaker with sound waves:/ }),
    );
    act(() => controller.abort());
    expect(Audio.current?.close).toHaveBeenCalledOnce();
    const stop = vi.fn();
    await act(async () => {
      release?.({ getTracks: () => [{ stop }] });
      await pending;
    });
    expect(stop).toHaveBeenCalledOnce();
    expect(solve).not.toHaveBeenCalled();
  } finally {
    cleanup();
    vi.unstubAllGlobals();
    if (previous) Object.defineProperty(navigator, "mediaDevices", previous);
    else Reflect.deleteProperty(navigator, "mediaDevices");
  }
});
