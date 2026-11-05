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

function props(signal: AbortSignal): StageComponentProps {
  return {
    locale: "en",
    signal,
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
const previousMediaDevices = Object.getOwnPropertyDescriptor(
  navigator,
  "mediaDevices",
);
const previousCanvasContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  "getContext",
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  if (previousMediaDevices)
    Object.defineProperty(navigator, "mediaDevices", previousMediaDevices);
  else Reflect.deleteProperty(navigator, "mediaDevices");
  if (previousCanvasContext)
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "getContext",
      previousCanvasContext,
    );
});
it.each([34, 204, 128])(
  "uses first observed RGB %s without a dark-to-bright sequence and stops capture",
  async (mean) => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const track = Object.assign(new EventTarget(), {
      stop,
      readyState: "live",
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [track],
          getVideoTracks: () => [track],
        }),
      },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(
      2,
    );
    // The fixture supplies only the two Canvas methods used by this capture pipeline.
    const drawImage = vi.fn();
    const context = {
      drawImage,
      getImageData: () => ({
        data: new Uint8ClampedArray([mean, mean, mean, 255]),
        width: 1,
        height: 1,
        colorSpace: "srgb",
      }),
    };
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => context,
    });
    const controller = new AbortController();
    const stageProps = props(controller.signal);
    const view = render(
      <section className="stage-view">
        <stage.Component {...stageProps} />
      </section>,
    );
    const host = view.container.querySelector<HTMLElement>(".stage-view");
    expect(stageProps.boxes.B02?.solve).not.toHaveBeenCalled();
    expect(stageProps.boxes.B03?.solve).not.toHaveBeenCalled();
    expect(host?.style.getPropertyValue("--s110-light")).toBe("");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Moon:/ }));
    });
    expect(stageProps.boxes.B02?.solve).toHaveBeenCalledTimes(
      mean <= 34 ? 1 : 0,
    );
    expect(stageProps.boxes.B03?.solve).toHaveBeenCalledTimes(
      mean >= 204 ? 1 : 0,
    );
    expect(host?.style.getPropertyValue("--s110-light")).toBe(
      `rgb(${mean}, ${mean}, ${mean})`,
    );
    act(() => controller.abort());
    expect(stop).toHaveBeenCalledOnce();
    const draws = drawImage.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(drawImage).toHaveBeenCalledTimes(draws);
    cleanup();
    expect(host?.classList.contains("s110-camera-host")).toBe(false);
    expect(host?.style.getPropertyValue("--s110-light")).toBe("");
  },
);
it("stops a camera granted after departure and never uses an unobserved zero as success", async () => {
  let release: ((value: unknown) => void) | undefined;
  const permission = new Promise((resolve) => {
    release = resolve;
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: () => permission },
  });
  const controller = new AbortController();
  const stageProps = props(controller.signal);
  render(<stage.Component {...stageProps} />);
  fireEvent.click(screen.getByRole("button", { name: /^Sun:/ }));
  act(() => controller.abort());
  const stop = vi.fn();
  await act(async () => {
    release?.({ getTracks: () => [{ stop }] });
    await permission;
  });
  expect(stop).toHaveBeenCalledOnce();
  expect(stageProps.boxes.B02?.solve).not.toHaveBeenCalled();
  expect(stageProps.boxes.B03?.solve).not.toHaveBeenCalled();
});
