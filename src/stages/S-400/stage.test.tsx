// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { stage } from "./stage";

const utc = Date.UTC(2026, 10, 2, 3, 24, 30);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(utc);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("silently retries unavailable time and then shows one hour before the server time", async () => {
  const request = vi.fn(async () => new Response(null, { status: 503 }));
  vi.stubGlobal("fetch", request);
  const props: StageComponentProps = {
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
  const { container } = render(<stage.Component {...props} />);
  const clock = screen.getByRole("img", { name: "時計" });
  expect(screen.queryByRole("status")).toBeNull();
  expect(container.textContent).not.toContain("時刻を確認しています。");
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(clock.getAttribute("datetime")).toBeNull();
  expect(clock.getAttribute("data-ready")).toBe("false");
  expect(props.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(props.boxes.B04?.solve).not.toHaveBeenCalled();

  request.mockImplementation(async () =>
    Response.json({ unix_ms: utc + performance.now() }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  const target = utc + performance.now() - 3_600_000;
  expect(clock.getAttribute("datetime")).toBe(new Date(target).toISOString());
  expect(clock.getAttribute("data-ready")).toBe("true");
  const display = new Date(target);
  const second = display.getSeconds() + display.getMilliseconds() / 1000;
  const minute = display.getMinutes() + second / 60;
  const hour = (display.getHours() % 12) + minute / 60;
  expect(
    container.querySelector<HTMLElement>(".analog-clock__hour")?.style
      .transform,
  ).toBe(`rotate(${hour * 30}deg)`);
  expect(props.boxes.B03?.solve).not.toHaveBeenCalled();
  expect(props.boxes.B04?.solve).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).toBeNull();
});
